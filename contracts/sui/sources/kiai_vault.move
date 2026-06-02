/// KIAI Vault — Sui Move custody contract for prediction market positions.
///
/// Architecture: one pool, two payment rails (Base + Sui).
/// Base and Sui are payment options only.
/// Market pricing and the LMSR pool are managed by the KIAI backend API.
/// This module handles: USDC custody, on-chain position recording, and
/// winner payout on resolution.
///
/// Mirrors KIAIVault.sol on Base. Both contracts serve the same market
/// with the same pool — users just choose which chain to pay on.
///
/// USDC type on Sui Testnet (Circle official, verified 2026-06-02):
///   0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
///
/// Data access: Sui gRPC (SuiGrpcClient from @mysten/sui/grpc).
/// JSON-RPC is deprecated — do NOT use for new indexing code.
module kiai_vault::kiai_vault {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::object_table::{Self, ObjectTable};

    // -----------------------------------------------------------------------
    // Error codes
    // -----------------------------------------------------------------------

    const EMarketNotActive: u64 = 1;
    const EMarketNotResolved: u64 = 3;
    const EMarketNotCancelled: u64 = 4;
    const ENotWinner: u64 = 5;
    const EAlreadyClaimed: u64 = 6;
    const ENoPosition: u64 = 7;
    const EZeroAmount: u64 = 8;
    const EZeroShares: u64 = 9;
    const EDifferentOutcome: u64 = 11;
    const EInvalidResolution: u64 = 12;

    // -----------------------------------------------------------------------
    // Market status constants
    // -----------------------------------------------------------------------

    const STATUS_ACTIVE: u8 = 0;
    const STATUS_CLOSED: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // -----------------------------------------------------------------------
    // Capability object — operator-only actions
    // -----------------------------------------------------------------------

    /// Shared capability owned by the deployer. Required for all operator calls.
    public struct OperatorCap has key, store {
        id: UID,
    }

    // -----------------------------------------------------------------------
    // Core objects
    // -----------------------------------------------------------------------

    /// Top-level vault registry — shared object, one per deployment.
    public struct KIAIVaultRegistry has key, store {
        id: UID,
        /// operator address (who can create/resolve markets)
        operator: address,
        /// fee rate in basis points (0 in Phase 1)
        fee_rate_bps: u64,
        /// accumulated fees
        accumulated_fees: u64,
    }

    /// One per prediction market. Shared object.
    public struct Market<phantom USDC> has key {
        id: UID,
        /// keccak256 of the backend market ID string (as bytes)
        market_id_bytes: vector<u8>,
        status: u8,
        /// keccak256 of the winning outcome slug (set on resolution)
        winning_outcome_id: vector<u8>,
        /// total winning shares (set on resolution by operator)
        total_winning_shares: u64,
        /// snapshot of total collateral at resolution time — used for payout math
        /// Must NOT use live balance::value() for payouts — it shrinks as users claim
        total_collateral_snapshot: u64,
        /// USDC held in custody
        collateral: Balance<USDC>,
        /// user positions: address -> Position
        positions: ObjectTable<address, Position>,
    }

    /// One per user per market. Stored inside Market.positions.
    public struct Position has key, store {
        id: UID,
        /// USDC deposited (in USDC's base units, 6 decimals)
        usdc_deposited: u64,
        /// shares allocated by backend LMSR (18 decimal equivalent scaled as u64)
        shares: u64,
        /// keccak256 of the outcome slug
        outcome_id: vector<u8>,
        /// true after winnings or refund claimed
        claimed: bool,
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    public struct MarketCreatedEvent has copy, drop {
        market_id_bytes: vector<u8>,
    }

    public struct MarketClosedEvent has copy, drop {
        market_id_bytes: vector<u8>,
    }

    public struct MarketResolvedEvent has copy, drop {
        market_id_bytes: vector<u8>,
        winning_outcome_id: vector<u8>,
        winning_outcome_slug: vector<u8>,
    }

    public struct MarketCancelledEvent has copy, drop {
        market_id_bytes: vector<u8>,
    }

    public struct PositionOpenedEvent has copy, drop {
        market_id_bytes: vector<u8>,
        user: address,
        outcome_id: vector<u8>,
        outcome_slug: vector<u8>,
        usdc_deposited: u64,
        shares: u64,
    }

    public struct WingsClaimedEvent has copy, drop {
        market_id_bytes: vector<u8>,
        user: address,
        usdc_claimed: u64,
    }

    public struct RefundedEvent has copy, drop {
        market_id_bytes: vector<u8>,
        user: address,
        usdc_refunded: u64,
    }

    // -----------------------------------------------------------------------
    // Init — called once on package publish
    // -----------------------------------------------------------------------

    fun init(ctx: &mut TxContext) {
        let operator_cap = OperatorCap { id: object::new(ctx) };
        let registry = KIAIVaultRegistry {
            id: object::new(ctx),
            operator: tx_context::sender(ctx),
            fee_rate_bps: 0,
            accumulated_fees: 0,
        };
        transfer::transfer(operator_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // -----------------------------------------------------------------------
    // Operator: create market
    // -----------------------------------------------------------------------

    /// Create a new prediction market vault.
    /// Called by KIAI operator after backend market creation.
    /// `market_id_bytes`: keccak256(backend_market_id_string) as a 32-byte vector.
    public fun create_market<USDC>(
        _cap: &OperatorCap,
        market_id_bytes: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let market = Market<USDC> {
            id: object::new(ctx),
            market_id_bytes,
            status: STATUS_ACTIVE,
            winning_outcome_id: vector[],
            total_winning_shares: 0,
            total_collateral_snapshot: 0,
            collateral: balance::zero(),
            positions: object_table::new(ctx),
        };
        event::emit(MarketCreatedEvent { market_id_bytes: market.market_id_bytes });
        transfer::share_object(market);
    }

    /// Close a market to new deposits. Awaiting resolution.
    public fun close_market<USDC>(
        _cap: &OperatorCap,
        market: &mut Market<USDC>,
    ) {
        assert!(market.status == STATUS_ACTIVE, EMarketNotActive);
        market.status = STATUS_CLOSED;
        event::emit(MarketClosedEvent { market_id_bytes: market.market_id_bytes });
    }

    /// Resolve the market with the winning outcome.
    /// `winning_outcome_id`: keccak256(winning_outcome_slug)
    /// `total_winning_shares`: sum of all shares on the winning outcome (from backend)
    public fun resolve_market<USDC>(
        _cap: &OperatorCap,
        market: &mut Market<USDC>,
        winning_outcome_id: vector<u8>,
        winning_outcome_slug: vector<u8>,
        total_winning_shares: u64,
    ) {
        assert!(
            market.status == STATUS_ACTIVE || market.status == STATUS_CLOSED,
            EInvalidResolution
        );
        assert!(!vector::is_empty(&winning_outcome_id), EInvalidResolution);
        assert!(total_winning_shares > 0, EZeroShares);

        market.status = STATUS_RESOLVED;
        market.winning_outcome_id = winning_outcome_id;
        market.total_winning_shares = total_winning_shares;
        // Snapshot total collateral at resolution — payout math uses this fixed value
        market.total_collateral_snapshot = balance::value(&market.collateral);

        event::emit(MarketResolvedEvent {
            market_id_bytes: market.market_id_bytes,
            winning_outcome_id: market.winning_outcome_id,
            winning_outcome_slug,
        });
    }

    /// Cancel market and enable refunds.
    public fun cancel_market<USDC>(
        _cap: &OperatorCap,
        market: &mut Market<USDC>,
    ) {
        assert!(
            market.status == STATUS_ACTIVE || market.status == STATUS_CLOSED,
            EMarketNotActive
        );
        market.status = STATUS_CANCELLED;
        event::emit(MarketCancelledEvent { market_id_bytes: market.market_id_bytes });
    }

    // -----------------------------------------------------------------------
    // User: deposit (open position)
    // -----------------------------------------------------------------------

    /// Open a position by depositing USDC.
    ///
    /// The backend computes `shares` via LMSR before this call.
    /// The user submits a Programmable Transaction Block (PTB) with:
    ///   - splitCoin to extract the exact USDC amount
    ///   - this deposit call with the shares value from the backend quote
    ///
    /// `outcome_id`: keccak256(outcome_slug) as bytes vector
    /// `outcome_slug`: human-readable outcome slug (for events)
    /// `usdc_coin`: the exact USDC coin object to deposit
    /// `shares`: shares allocated by backend LMSR
    public fun deposit<USDC>(
        market: &mut Market<USDC>,
        outcome_id: vector<u8>,
        outcome_slug: vector<u8>,
        usdc_coin: Coin<USDC>,
        shares: u64,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_ACTIVE, EMarketNotActive);
        let amount = coin::value(&usdc_coin);
        assert!(amount > 0, EZeroAmount);
        assert!(shares > 0, EZeroShares);
        assert!(!vector::is_empty(&outcome_id), EZeroAmount);

        let sender = tx_context::sender(ctx);
        let usdc_balance = coin::into_balance(usdc_coin);

        // Add collateral to market vault
        balance::join(&mut market.collateral, usdc_balance);

        // Update or create position
        if (object_table::contains(&market.positions, sender)) {
            let pos = object_table::borrow_mut(&mut market.positions, sender);
            assert!(!pos.claimed, EAlreadyClaimed);
            assert!(pos.outcome_id == outcome_id, EDifferentOutcome);
            pos.usdc_deposited = pos.usdc_deposited + amount;
            pos.shares = pos.shares + shares;
        } else {
            let pos = Position {
                id: object::new(ctx),
                usdc_deposited: amount,
                shares,
                outcome_id,
                claimed: false,
            };
            object_table::add(&mut market.positions, sender, pos);
        };

        event::emit(PositionOpenedEvent {
            market_id_bytes: market.market_id_bytes,
            user: sender,
            outcome_id,
            outcome_slug,
            usdc_deposited: amount,
            shares,
        });
    }

    // -----------------------------------------------------------------------
    // User: claim winnings
    // -----------------------------------------------------------------------

    /// Claim winnings after market resolution.
    ///
    /// Payout = (userShares / totalWinningShares) * totalCollateral
    public fun claim_winnings<USDC>(
        market: &mut Market<USDC>,
        registry: &mut KIAIVaultRegistry,
        ctx: &mut TxContext,
    ): Coin<USDC> {
        assert!(market.status == STATUS_RESOLVED, EMarketNotResolved);

        let sender = tx_context::sender(ctx);
        assert!(object_table::contains(&market.positions, sender), ENoPosition);

        let pos = object_table::borrow_mut(&mut market.positions, sender);
        assert!(!pos.claimed, EAlreadyClaimed);
        assert!(pos.outcome_id == market.winning_outcome_id, ENotWinner);

        pos.claimed = true;

        // Use snapshotted total collateral — NOT live balance (which shrinks as others claim)
        let payout = (pos.shares as u128) * (market.total_collateral_snapshot as u128) / (market.total_winning_shares as u128);
        let payout = payout as u64;

        // Apply protocol fee (0% in Phase 1)
        let fee = payout * registry.fee_rate_bps / 10_000;
        let user_payout = payout - fee;
        registry.accumulated_fees = registry.accumulated_fees + fee;

        let payout_balance = balance::split(&mut market.collateral, user_payout);

        event::emit(WingsClaimedEvent {
            market_id_bytes: market.market_id_bytes,
            user: sender,
            usdc_claimed: user_payout,
        });

        coin::from_balance(payout_balance, ctx)
    }

    // -----------------------------------------------------------------------
    // User: refund (cancelled market)
    // -----------------------------------------------------------------------

    /// Refund USDC deposit if market was cancelled.
    public fun refund<USDC>(
        market: &mut Market<USDC>,
        ctx: &mut TxContext,
    ): Coin<USDC> {
        assert!(market.status == STATUS_CANCELLED, EMarketNotCancelled);

        let sender = tx_context::sender(ctx);
        assert!(object_table::contains(&market.positions, sender), ENoPosition);

        let pos = object_table::borrow_mut(&mut market.positions, sender);
        assert!(!pos.claimed, EAlreadyClaimed);
        assert!(pos.usdc_deposited > 0, ENoPosition);

        pos.claimed = true;
        let refund_amount = pos.usdc_deposited;
        let refund_balance = balance::split(&mut market.collateral, refund_amount);

        event::emit(RefundedEvent {
            market_id_bytes: market.market_id_bytes,
            user: sender,
            usdc_refunded: refund_amount,
        });

        coin::from_balance(refund_balance, ctx)
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    public fun get_market_status<USDC>(market: &Market<USDC>): u8 {
        market.status
    }

    public fun get_total_collateral<USDC>(market: &Market<USDC>): u64 {
        balance::value(&market.collateral)
    }

    public fun get_winning_outcome<USDC>(market: &Market<USDC>): vector<u8> {
        market.winning_outcome_id
    }

    public fun get_position_shares<USDC>(market: &Market<USDC>, user: address): u64 {
        if (!object_table::contains(&market.positions, user)) return 0;
        let pos = object_table::borrow(&market.positions, user);
        pos.shares
    }

    public fun get_position_deposited<USDC>(market: &Market<USDC>, user: address): u64 {
        if (!object_table::contains(&market.positions, user)) return 0;
        let pos = object_table::borrow(&market.positions, user);
        pos.usdc_deposited
    }

    public fun is_claimed<USDC>(market: &Market<USDC>, user: address): bool {
        if (!object_table::contains(&market.positions, user)) return false;
        let pos = object_table::borrow(&market.positions, user);
        pos.claimed
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Test-only helpers
    // -----------------------------------------------------------------------

    #[test_only]
    public fun test_create_operator_cap(ctx: &mut TxContext): OperatorCap {
        OperatorCap { id: object::new(ctx) }
    }

    #[test_only]
    public fun test_create_registry(operator: address, ctx: &mut TxContext): KIAIVaultRegistry {
        KIAIVaultRegistry {
            id: object::new(ctx),
            operator,
            fee_rate_bps: 0,
            accumulated_fees: 0,
        }
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    public fun set_fee_rate(
        _cap: &OperatorCap,
        registry: &mut KIAIVaultRegistry,
        fee_rate_bps: u64,
    ) {
        assert!(fee_rate_bps <= 500, 0); // max 5%
        registry.fee_rate_bps = fee_rate_bps;
    }

    public fun withdraw_fees<USDC>(
        _cap: &OperatorCap,
        _registry: &mut KIAIVaultRegistry,
        _market: &mut Market<USDC>,
        _recipient: address,
        _ctx: &mut TxContext,
    ) {
        // Phase 1: fees are 0%, so nothing to withdraw yet
        // This will be implemented when fee_rate_bps > 0
    }
}
