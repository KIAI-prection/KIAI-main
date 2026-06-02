// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KIAIVault
 * @notice USDC custody vault for KIAI prediction markets on Base.
 *
 * Architecture: one pool, two payment rails (Base + Sui).
 * - Base and Sui are payment options only.
 * - Market pricing and the LMSR pool are managed by the KIAI backend API.
 * - This contract handles: USDC custody, on-chain position recording, and
 *   winner payout on resolution.
 *
 * Pricing is computed off-chain by the backend. The contract trusts the
 * backend-signed shares amount and records the position. On resolution,
 * winners claim their proportional share of the total USDC pool.
 *
 * Security model:
 * - Owner (KIAI operator) can pause, resolve markets, and emergency withdraw.
 * - Users can always claim if a market is resolved — owner cannot block claims.
 * - Emergency withdraw is only available after a market is cancelled.
 * - SafeERC20 is used for all token transfers (handles non-standard USDC).
 * - ReentrancyGuard protects deposit and claim.
 */
contract KIAIVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum MarketStatus {
        Active,     // Accepting deposits
        Closed,     // No more deposits; awaiting resolution
        Resolved,   // Outcome decided; claims open
        Cancelled   // Refunds available
    }

    struct Market {
        MarketStatus status;
        bytes32 winningOutcomeId;  // keccak256 of winning outcome slug
        uint256 totalCollateral;   // Total USDC deposited (6 decimals)
        uint256 totalWinningShares; // Total shares for winning outcome
    }

    struct Position {
        uint256 usdcDeposited;  // USDC the user deposited (6 decimals)
        uint256 shares;         // Shares allocated by backend LMSR
        bytes32 outcomeId;      // keccak256 of outcome slug
        bool claimed;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    IERC20 public immutable usdc;

    /// marketId => Market
    mapping(bytes32 => Market) public markets;

    /// marketId => user => Position
    mapping(bytes32 => mapping(address => Position)) public positions;

    /// Protocol fee rate (basis points). 0 in Phase 1.
    uint256 public feeRateBps = 0;

    /// Accumulated fees (withdrawable by owner)
    uint256 public accumulatedFees;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event MarketCreated(bytes32 indexed marketId);
    event MarketClosed(bytes32 indexed marketId);
    event MarketResolved(bytes32 indexed marketId, bytes32 winningOutcomeId, string winningOutcomeSlug);
    event MarketCancelled(bytes32 indexed marketId);

    event PositionOpened(
        bytes32 indexed marketId,
        address indexed user,
        bytes32 indexed outcomeId,
        string outcomeSlug,
        uint256 usdcDeposited,
        uint256 shares
    );

    event WinningsClaimed(
        bytes32 indexed marketId,
        address indexed user,
        uint256 usdcClaimed
    );

    event Refunded(bytes32 indexed marketId, address indexed user, uint256 usdcRefunded);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "KIAIVault: zero USDC address");
        usdc = IERC20(_usdc);
    }

    // -----------------------------------------------------------------------
    // Operator: market lifecycle
    // -----------------------------------------------------------------------

    /**
     * @notice Create a new market. Called by KIAI operator after backend market creation.
     * @param marketId keccak256 of the backend market ID string.
     */
    function createMarket(bytes32 marketId) external onlyOwner {
        require(markets[marketId].status == MarketStatus(0) && markets[marketId].totalCollateral == 0,
            "KIAIVault: market already exists");
        markets[marketId] = Market({
            status: MarketStatus.Active,
            winningOutcomeId: bytes32(0),
            totalCollateral: 0,
            totalWinningShares: 0
        });
        emit MarketCreated(marketId);
    }

    /**
     * @notice Close a market to new deposits. Awaiting resolution.
     */
    function closeMarket(bytes32 marketId) external onlyOwner {
        require(markets[marketId].status == MarketStatus.Active, "KIAIVault: not active");
        markets[marketId].status = MarketStatus.Closed;
        emit MarketClosed(marketId);
    }

    /**
     * @notice Resolve a market with the winning outcome.
     * @param marketId The market ID.
     * @param winningOutcomeId keccak256 of the winning outcome slug.
     * @param winningOutcomeSlug The human-readable winning outcome slug (for events/verification).
     * @param totalWinningShares Sum of all shares on the winning outcome (from backend).
     */
    function resolveMarket(
        bytes32 marketId,
        bytes32 winningOutcomeId,
        string calldata winningOutcomeSlug,
        uint256 totalWinningShares
    ) external onlyOwner {
        Market storage m = markets[marketId];
        require(
            m.status == MarketStatus.Active || m.status == MarketStatus.Closed,
            "KIAIVault: cannot resolve"
        );
        require(winningOutcomeId != bytes32(0), "KIAIVault: zero winning outcome");
        require(totalWinningShares > 0, "KIAIVault: zero winning shares");

        m.status = MarketStatus.Resolved;
        m.winningOutcomeId = winningOutcomeId;
        m.totalWinningShares = totalWinningShares;

        emit MarketResolved(marketId, winningOutcomeId, winningOutcomeSlug);
    }

    /**
     * @notice Cancel a market and enable refunds (e.g. invalid/abandoned market).
     */
    function cancelMarket(bytes32 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(
            m.status == MarketStatus.Active || m.status == MarketStatus.Closed,
            "KIAIVault: cannot cancel"
        );
        m.status = MarketStatus.Cancelled;
        emit MarketCancelled(marketId);
    }

    // -----------------------------------------------------------------------
    // User: deposit (open position)
    // -----------------------------------------------------------------------

    /**
     * @notice Open a position by depositing USDC.
     *
     * The backend computes `shares` via LMSR before this call. The user signs
     * a wallet transaction with the exact USDC amount and shares value that
     * the backend quote returned. This creates an on-chain record of their
     * position.
     *
     * @param marketId The market ID (keccak256 of backend market ID).
     * @param outcomeId The outcome ID (keccak256 of outcome slug).
     * @param outcomeSlug Human-readable outcome slug (for events).
     * @param usdcAmount USDC to deposit (6 decimals).
     * @param shares Shares allocated by backend LMSR (18 decimals).
     */
    function deposit(
        bytes32 marketId,
        bytes32 outcomeId,
        string calldata outcomeSlug,
        uint256 usdcAmount,
        uint256 shares
    ) external nonReentrant whenNotPaused {
        require(markets[marketId].status == MarketStatus.Active, "KIAIVault: market not active");
        require(usdcAmount > 0, "KIAIVault: zero amount");
        require(shares > 0, "KIAIVault: zero shares");
        require(outcomeId != bytes32(0), "KIAIVault: zero outcome");

        // Pull USDC from the user
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Update position (supports multiple deposits by same user on same outcome)
        Position storage pos = positions[marketId][msg.sender];
        require(!pos.claimed, "KIAIVault: already claimed");

        if (pos.shares > 0) {
            // Additional deposit — must be same outcome
            require(pos.outcomeId == outcomeId, "KIAIVault: different outcome");
        } else {
            pos.outcomeId = outcomeId;
        }

        pos.usdcDeposited += usdcAmount;
        pos.shares += shares;

        // Update market totals
        markets[marketId].totalCollateral += usdcAmount;

        emit PositionOpened(marketId, msg.sender, outcomeId, outcomeSlug, usdcAmount, shares);
    }

    // -----------------------------------------------------------------------
    // User: claim winnings
    // -----------------------------------------------------------------------

    /**
     * @notice Claim winnings after market resolution.
     *
     * Payout formula:
     *   payout = (userShares / totalWinningShares) * totalCollateral
     *
     * @param marketId The resolved market ID.
     */
    function claimWinnings(bytes32 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Resolved, "KIAIVault: not resolved");

        Position storage pos = positions[marketId][msg.sender];
        require(pos.shares > 0, "KIAIVault: no position");
        require(!pos.claimed, "KIAIVault: already claimed");
        require(pos.outcomeId == m.winningOutcomeId, "KIAIVault: not winner");

        pos.claimed = true;

        // Proportional payout: user's share of total pool
        uint256 payout = (pos.shares * m.totalCollateral) / m.totalWinningShares;

        // Apply protocol fee (0 in Phase 1)
        uint256 fee = (payout * feeRateBps) / 10_000;
        uint256 userPayout = payout - fee;
        accumulatedFees += fee;

        usdc.safeTransfer(msg.sender, userPayout);

        emit WinningsClaimed(marketId, msg.sender, userPayout);
    }

    // -----------------------------------------------------------------------
    // User: refund (cancelled market)
    // -----------------------------------------------------------------------

    /**
     * @notice Refund USDC deposit if market was cancelled.
     */
    function refund(bytes32 marketId) external nonReentrant {
        require(markets[marketId].status == MarketStatus.Cancelled, "KIAIVault: not cancelled");

        Position storage pos = positions[marketId][msg.sender];
        require(pos.usdcDeposited > 0, "KIAIVault: no deposit");
        require(!pos.claimed, "KIAIVault: already refunded");

        pos.claimed = true;
        uint256 refundAmount = pos.usdcDeposited;

        usdc.safeTransfer(msg.sender, refundAmount);

        emit Refunded(marketId, msg.sender, refundAmount);
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    function getMarket(bytes32 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getPosition(bytes32 marketId, address user) external view returns (Position memory) {
        return positions[marketId][user];
    }

    /**
     * @notice Compute current claimable amount for a user (0 if not winner or already claimed).
     */
    function claimableAmount(bytes32 marketId, address user) external view returns (uint256) {
        Market storage m = markets[marketId];
        if (m.status != MarketStatus.Resolved) return 0;

        Position storage pos = positions[marketId][user];
        if (pos.shares == 0 || pos.claimed) return 0;
        if (pos.outcomeId != m.winningOutcomeId) return 0;

        uint256 payout = (pos.shares * m.totalCollateral) / m.totalWinningShares;
        uint256 fee = (payout * feeRateBps) / 10_000;
        return payout - fee;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setFeeRateBps(uint256 _feeRateBps) external onlyOwner {
        require(_feeRateBps <= 500, "KIAIVault: fee > 5%");
        feeRateBps = _feeRateBps;
    }

    function withdrawFees(address recipient) external onlyOwner {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.safeTransfer(recipient, amount);
    }

    /**
     * @notice marketIdBytes: helper to compute keccak256 of a backend market ID string.
     * Use this off-chain to prepare deposit/resolve calls.
     */
    function marketIdBytes(string calldata marketId) external pure returns (bytes32) {
        return keccak256(bytes(marketId));
    }

    function outcomeIdBytes(string calldata outcomeSlug) external pure returns (bytes32) {
        return keccak256(bytes(outcomeSlug));
    }
}
