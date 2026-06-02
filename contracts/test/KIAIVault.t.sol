// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/KIAIVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Minimal ERC20 that behaves like USDC (6 decimals) for tests.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title KIAIVaultTest
 * @notice Tests for the KIAIVault contract.
 *
 * Covers:
 *  - Happy path: create market → deposit → resolve → claim
 *  - Multiple depositors
 *  - Loser cannot claim
 *  - Cannot double claim
 *  - Refund on cancelled market
 *  - Pausing blocks deposits
 *  - Unauthorized access reverts
 *  - Invalid state transitions revert
 *  - Fee accumulation and withdrawal
 */
contract KIAIVaultTest is Test {
    KIAIVault public vault;
    MockUSDC public usdc;

    address public owner = address(0xABCD);
    address public alice = address(0x1111);
    address public bob = address(0x2222);
    address public carol = address(0x3333);
    address public nonOwner = address(0x9999);

    bytes32 public constant MARKET_ID = keccak256("nagoya-basho-2026-winner");
    bytes32 public constant OUTCOME_TERUNOFUJI = keccak256("terunofuji");
    bytes32 public constant OUTCOME_HOSHORYU = keccak256("hoshoryu");

    uint256 constant ONE_USDC = 1e6;    // 1 USDC (6 decimals)
    uint256 constant ONE_SHARE = 1e18;  // 1 share (18 decimals)

    // -----------------------------------------------------------------------
    // Setup
    // -----------------------------------------------------------------------

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        vault = new KIAIVault(address(usdc));
        vm.stopPrank();

        // Mint test USDC
        usdc.mint(alice, 1000 * ONE_USDC);
        usdc.mint(bob, 1000 * ONE_USDC);
        usdc.mint(carol, 1000 * ONE_USDC);

        // Approve vault
        vm.prank(alice); usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);   usdc.approve(address(vault), type(uint256).max);
        vm.prank(carol); usdc.approve(address(vault), type(uint256).max);
    }

    // -----------------------------------------------------------------------
    // Market lifecycle
    // -----------------------------------------------------------------------

    function test_createMarket() public {
        vm.prank(owner);
        vault.createMarket(MARKET_ID);

        KIAIVault.Market memory m = vault.getMarket(MARKET_ID);
        assertEq(uint8(m.status), uint8(KIAIVault.MarketStatus.Active));
        assertEq(m.totalCollateral, 0);
    }

    function test_createMarket_unauthorized() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        vault.createMarket(MARKET_ID);
    }

    function test_createMarket_duplicate_reverts() public {
        vm.startPrank(owner);
        vault.createMarket(MARKET_ID);
        // Deposit to make totalCollateral > 0 so second create reverts
        vm.stopPrank();
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 15 * ONE_SHARE);
        vm.prank(owner);
        vm.expectRevert("KIAIVault: market already exists");
        vault.createMarket(MARKET_ID);
    }

    function test_closeMarket() public {
        vm.startPrank(owner);
        vault.createMarket(MARKET_ID);
        vault.closeMarket(MARKET_ID);
        vm.stopPrank();

        KIAIVault.Market memory m = vault.getMarket(MARKET_ID);
        assertEq(uint8(m.status), uint8(KIAIVault.MarketStatus.Closed));
    }

    function test_closeMarket_nonActive_reverts() public {
        vm.startPrank(owner);
        vault.createMarket(MARKET_ID);
        vault.closeMarket(MARKET_ID);
        vm.expectRevert("KIAIVault: not active");
        vault.closeMarket(MARKET_ID);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // Deposit (open position)
    // -----------------------------------------------------------------------

    function test_deposit_happy_path() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);

        uint256 amount = 10 * ONE_USDC;
        uint256 shares = 16_666_666_666_666_666_666; // ~16.67 shares

        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", amount, shares);

        KIAIVault.Position memory pos = vault.getPosition(MARKET_ID, alice);
        assertEq(pos.usdcDeposited, amount);
        assertEq(pos.shares, shares);
        assertEq(pos.outcomeId, OUTCOME_TERUNOFUJI);
        assertFalse(pos.claimed);

        KIAIVault.Market memory m = vault.getMarket(MARKET_ID);
        assertEq(m.totalCollateral, amount);

        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function test_deposit_emits_event() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        uint256 amount = 10 * ONE_USDC;
        uint256 shares = 16 * ONE_SHARE;

        vm.expectEmit(true, true, true, true);
        emit KIAIVault.PositionOpened(MARKET_ID, alice, OUTCOME_TERUNOFUJI, "terunofuji", amount, shares);

        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", amount, shares);
    }

    function test_deposit_on_closed_market_reverts() public {
        vm.startPrank(owner);
        vault.createMarket(MARKET_ID);
        vault.closeMarket(MARKET_ID);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert("KIAIVault: market not active");
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 10 * ONE_SHARE);
    }

    function test_deposit_zero_amount_reverts() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vm.expectRevert("KIAIVault: zero amount");
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 0, 10 * ONE_SHARE);
    }

    function test_deposit_different_outcome_reverts() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.startPrank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 10 * ONE_SHARE);
        vm.expectRevert("KIAIVault: different outcome");
        vault.deposit(MARKET_ID, OUTCOME_HOSHORYU, "hoshoryu", 5 * ONE_USDC, 5 * ONE_SHARE);
        vm.stopPrank();
    }

    function test_deposit_paused_reverts() public {
        vm.startPrank(owner);
        vault.createMarket(MARKET_ID);
        vault.pause();
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 10 * ONE_SHARE);
    }

    // -----------------------------------------------------------------------
    // Resolution + Claim
    // -----------------------------------------------------------------------

    function _setupResolvedMarket() internal {
        vm.prank(owner); vault.createMarket(MARKET_ID);

        // Alice bets $10 on Terunofuji (YES winner) — gets 16 shares
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);

        // Bob bets $8 on Hoshoryu (loser) — gets 20 shares (higher odds, lower price)
        vm.prank(bob);
        vault.deposit(MARKET_ID, OUTCOME_HOSHORYU, "hoshoryu", 8 * ONE_USDC, 20 * ONE_SHARE);

        // Total collateral: $18 USDC
        // Terunofuji wins with 16 shares total
        vm.prank(owner);
        vault.resolveMarket(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 16 * ONE_SHARE);
    }

    function test_resolve_market() public {
        _setupResolvedMarket();
        KIAIVault.Market memory m = vault.getMarket(MARKET_ID);
        assertEq(uint8(m.status), uint8(KIAIVault.MarketStatus.Resolved));
        assertEq(m.winningOutcomeId, OUTCOME_TERUNOFUJI);
        assertEq(m.totalWinningShares, 16 * ONE_SHARE);
    }

    function test_claim_winnings_happy_path() public {
        _setupResolvedMarket();

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.claimWinnings(MARKET_ID);

        // Alice has 16/16 of winning shares = 100% of $18 = $18
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertEq(aliceBalanceAfter - aliceBalanceBefore, 18 * ONE_USDC);

        // Position marked as claimed
        KIAIVault.Position memory pos = vault.getPosition(MARKET_ID, alice);
        assertTrue(pos.claimed);
    }

    function test_loser_cannot_claim() public {
        _setupResolvedMarket();

        vm.prank(bob);
        vm.expectRevert("KIAIVault: not winner");
        vault.claimWinnings(MARKET_ID);
    }

    function test_cannot_double_claim() public {
        _setupResolvedMarket();

        vm.prank(alice);
        vault.claimWinnings(MARKET_ID);

        vm.prank(alice);
        vm.expectRevert("KIAIVault: already claimed");
        vault.claimWinnings(MARKET_ID);
    }

    function test_claim_on_unresolved_market_reverts() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);

        vm.prank(alice);
        vm.expectRevert("KIAIVault: not resolved");
        vault.claimWinnings(MARKET_ID);
    }

    function test_multiple_winners_proportional_payout() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);

        // Alice: $10 → 40 shares on Terunofuji
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 40 * ONE_SHARE);

        // Bob: $10 → 40 shares on Terunofuji
        vm.prank(bob);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 40 * ONE_SHARE);

        // Carol: $10 on Hoshoryu (loser)
        vm.prank(carol);
        vault.deposit(MARKET_ID, OUTCOME_HOSHORYU, "hoshoryu", 10 * ONE_USDC, 50 * ONE_SHARE);

        // Total: $30; Terunofuji wins with 80 total shares
        vm.prank(owner);
        vault.resolveMarket(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 80 * ONE_SHARE);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(alice); vault.claimWinnings(MARKET_ID);
        vm.prank(bob);   vault.claimWinnings(MARKET_ID);

        // Each has 40/80 = 50% of $30 = $15
        assertEq(usdc.balanceOf(alice) - aliceBefore, 15 * ONE_USDC);
        assertEq(usdc.balanceOf(bob) - bobBefore, 15 * ONE_USDC);
    }

    // -----------------------------------------------------------------------
    // Cancellation and refunds
    // -----------------------------------------------------------------------

    function test_refund_on_cancelled_market() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);

        vm.prank(owner); vault.cancelMarket(MARKET_ID);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice); vault.refund(MARKET_ID);
        assertEq(usdc.balanceOf(alice) - before, 10 * ONE_USDC);
    }

    function test_refund_on_active_market_reverts() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);

        vm.prank(alice);
        vm.expectRevert("KIAIVault: not cancelled");
        vault.refund(MARKET_ID);
    }

    function test_cancel_resolved_market_reverts() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);

        vm.prank(owner);
        vault.resolveMarket(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 16 * ONE_SHARE);

        vm.prank(owner);
        vm.expectRevert("KIAIVault: cannot cancel");
        vault.cancelMarket(MARKET_ID);
    }

    // -----------------------------------------------------------------------
    // Fee mechanics
    // -----------------------------------------------------------------------

    function test_fee_accumulation() public {
        vm.prank(owner); vault.setFeeRateBps(100); // 1% fee

        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 100 * ONE_USDC, 100 * ONE_SHARE);

        vm.prank(owner);
        vault.resolveMarket(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 100 * ONE_SHARE);

        vm.prank(alice); vault.claimWinnings(MARKET_ID);

        // Fee = 1% of $100 = $1
        assertEq(vault.accumulatedFees(), 1 * ONE_USDC);

        // Withdraw fees
        uint256 ownerBefore = usdc.balanceOf(address(0xFEED));
        vm.prank(owner); vault.withdrawFees(address(0xFEED));
        assertEq(usdc.balanceOf(address(0xFEED)) - ownerBefore, 1 * ONE_USDC);
        assertEq(vault.accumulatedFees(), 0);
    }

    function test_fee_rate_too_high_reverts() public {
        vm.prank(owner);
        vm.expectRevert("KIAIVault: fee > 5%");
        vault.setFeeRateBps(501);
    }

    // -----------------------------------------------------------------------
    // Helper views
    // -----------------------------------------------------------------------

    function test_claimable_amount_view() public {
        vm.prank(owner); vault.createMarket(MARKET_ID);
        vm.prank(alice);
        vault.deposit(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 10 * ONE_USDC, 16 * ONE_SHARE);
        vm.prank(bob);
        vault.deposit(MARKET_ID, OUTCOME_HOSHORYU, "hoshoryu", 8 * ONE_USDC, 20 * ONE_SHARE);

        // Before resolution: claimable = 0
        assertEq(vault.claimableAmount(MARKET_ID, alice), 0);

        vm.prank(owner);
        vault.resolveMarket(MARKET_ID, OUTCOME_TERUNOFUJI, "terunofuji", 16 * ONE_SHARE);

        // Alice: 16/16 of $18 = $18
        assertEq(vault.claimableAmount(MARKET_ID, alice), 18 * ONE_USDC);
        // Bob (loser): 0
        assertEq(vault.claimableAmount(MARKET_ID, bob), 0);

        vm.prank(alice); vault.claimWinnings(MARKET_ID);
        // After claim: 0
        assertEq(vault.claimableAmount(MARKET_ID, alice), 0);
    }

    function test_marketId_and_outcomeId_helpers() public {
        bytes32 id = vault.marketIdBytes("nagoya-basho-2026-winner");
        assertEq(id, keccak256("nagoya-basho-2026-winner"));

        bytes32 oid = vault.outcomeIdBytes("terunofuji");
        assertEq(oid, keccak256("terunofuji"));
    }
}
