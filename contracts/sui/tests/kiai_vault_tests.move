#[test_only]
module kiai_vault::kiai_vault_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::test_utils;
    use kiai_vault::kiai_vault::{
        Self,
        KIAIVaultRegistry,
        Market,
        OperatorCap,
    };

    // -----------------------------------------------------------------------
    // Fake USDC type for testing
    // -----------------------------------------------------------------------

    public struct USDC has drop {}

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    const OPERATOR: address = @0xABCD;
    const ALICE:    address = @0x1111;
    const BOB:      address = @0x2222;
    const CAROL:    address = @0x3333;

    // Outcome IDs — simulating keccak256 of slug (just bytes for tests)
    fun outcome_terunofuji(): vector<u8> { b"terunofuji" }
    fun outcome_hoshoryu(): vector<u8>   { b"hoshoryu" }
    fun market_id(): vector<u8>          { b"nagoya-basho-2026-winner" }

    /// Mint fake USDC for testing
    fun mint_usdc(amount: u64, ctx: &mut sui::tx_context::TxContext): Coin<USDC> {
        coin::mint_for_testing<USDC>(amount, ctx)
    }

    /// Setup: publish package, get OperatorCap and Registry
    fun setup(scenario: &mut Scenario) {
        ts::next_tx(scenario, OPERATOR);
        {
            // Simulate init by creating the shared objects
            let ctx = ts::ctx(scenario);
            let op_cap = kiai_vault::test_create_operator_cap(ctx);
            transfer::public_transfer(op_cap, OPERATOR);
            let registry = kiai_vault::test_create_registry(OPERATOR, ctx);
            transfer::public_share_object(registry);
        };
    }

    // -----------------------------------------------------------------------
    // Test 1: Create market
    // -----------------------------------------------------------------------

    #[test]
    fun test_create_market() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ctx);
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let market = ts::take_shared<Market<USDC>>(&scenario);
            assert!(kiai_vault::get_market_status(&market) == 0, 0); // STATUS_ACTIVE
            assert!(kiai_vault::get_total_collateral(&market) == 0, 0);
            ts::return_shared(market);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 2: Deposit
    // -----------------------------------------------------------------------

    #[test]
    fun test_deposit_happy_path() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario)); // 10 USDC
            kiai_vault::deposit(
                &mut market,
                outcome_terunofuji(),
                b"terunofuji",
                usdc,
                16_000_000, // 16 shares
                ts::ctx(&mut scenario),
            );

            assert!(kiai_vault::get_total_collateral(&market) == 10_000_000, 0);
            assert!(kiai_vault::get_position_shares(&market, ALICE) == 16_000_000, 0);
            assert!(kiai_vault::get_position_deposited(&market, ALICE) == 10_000_000, 0);
            ts::return_shared(market);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 3: Cannot deposit on closed market
    // -----------------------------------------------------------------------

    #[test]
    #[expected_failure(abort_code = 1)]  // EMarketNotActive
    fun test_deposit_on_closed_market_fails() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::close_market(&cap, &mut market);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(
                &mut market,
                outcome_terunofuji(),
                b"terunofuji",
                usdc,
                16_000_000,
                ts::ctx(&mut scenario),
            ); // should abort
            ts::return_shared(market);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 4: Resolve and claim winnings
    // -----------------------------------------------------------------------

    #[test]
    fun test_resolve_and_claim() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        // Alice deposits $10 on Terunofuji → 16 shares
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 16_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        // Bob deposits $8 on Hoshoryu → 20 shares (loser)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(8_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_hoshoryu(), b"hoshoryu", usdc, 20_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        // Operator resolves — Terunofuji wins with 16 total winning shares
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::resolve_market(
                &cap, &mut market,
                outcome_terunofuji(), b"terunofuji",
                16_000_000,
            );
            assert!(kiai_vault::get_market_status(&market) == 2, 0); // STATUS_RESOLVED
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        // Alice claims — should get $18 (100% of $18 pool since she has all winning shares)
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            assert!(coin::value(&payout) == 18_000_000, 0); // $18 USDC
            assert!(kiai_vault::is_claimed(&market, ALICE), 0);
            transfer::public_transfer(payout, ALICE);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 5: Loser cannot claim
    // -----------------------------------------------------------------------

    #[test]
    #[expected_failure(abort_code = 5)]  // ENotWinner
    fun test_loser_cannot_claim() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 16_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, BOB);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(8_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_hoshoryu(), b"hoshoryu", usdc, 20_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::resolve_market(&cap, &mut market, outcome_terunofuji(), b"terunofuji", 16_000_000);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        // Bob tries to claim — should abort ENotWinner
        ts::next_tx(&mut scenario, BOB);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            transfer::public_transfer(payout, BOB);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 6: Double claim blocked
    // -----------------------------------------------------------------------

    #[test]
    #[expected_failure(abort_code = 6)]  // EAlreadyClaimed
    fun test_double_claim_blocked() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 16_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::resolve_market(&cap, &mut market, outcome_terunofuji(), b"terunofuji", 16_000_000);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            transfer::public_transfer(payout, ALICE);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        // Second claim — should abort EAlreadyClaimed
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            transfer::public_transfer(payout, ALICE);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 7: Refund on cancelled market
    // -----------------------------------------------------------------------

    #[test]
    fun test_refund_on_cancelled() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 16_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::cancel_market(&cap, &mut market);
            assert!(kiai_vault::get_market_status(&market) == 3, 0); // STATUS_CANCELLED
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let refund = kiai_vault::refund<USDC>(&mut market, ts::ctx(&mut scenario));
            assert!(coin::value(&refund) == 10_000_000, 0); // full $10 back
            transfer::public_transfer(refund, ALICE);
            ts::return_shared(market);
        };

        ts::end(scenario);
    }

    // -----------------------------------------------------------------------
    // Test 8: Multiple winners proportional payout
    // -----------------------------------------------------------------------

    #[test]
    fun test_proportional_payout() {
        let mut scenario = ts::begin(OPERATOR);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            kiai_vault::create_market<USDC>(&cap, market_id(), ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };

        // Alice: $10 → 40 shares on Terunofuji
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 40_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        // Bob: $10 → 40 shares on Terunofuji
        ts::next_tx(&mut scenario, BOB);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_terunofuji(), b"terunofuji", usdc, 40_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        // Carol: $10 on Hoshoryu (loser)
        ts::next_tx(&mut scenario, CAROL);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let usdc = mint_usdc(10_000_000, ts::ctx(&mut scenario));
            kiai_vault::deposit(&mut market, outcome_hoshoryu(), b"hoshoryu", usdc, 50_000_000, ts::ctx(&mut scenario));
            ts::return_shared(market);
        };

        // Resolve: Terunofuji wins with 80 total winning shares
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let cap = ts::take_from_sender<OperatorCap>(&scenario);
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            kiai_vault::resolve_market(&cap, &mut market, outcome_terunofuji(), b"terunofuji", 80_000_000);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(market);
        };

        // Alice claims: 40/80 of $30 = $15
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            assert!(coin::value(&payout) == 15_000_000, 0); // $15
            transfer::public_transfer(payout, ALICE);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        // Bob claims: 40/80 of $30 = $15
        ts::next_tx(&mut scenario, BOB);
        {
            let mut market = ts::take_shared<Market<USDC>>(&scenario);
            let mut registry = ts::take_shared<KIAIVaultRegistry>(&scenario);
            let payout = kiai_vault::claim_winnings<USDC>(&mut market, &mut registry, ts::ctx(&mut scenario));
            assert!(coin::value(&payout) == 15_000_000, 0); // $15
            transfer::public_transfer(payout, BOB);
            ts::return_shared(market);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
