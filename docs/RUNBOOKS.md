# KIAI Phase 10 Runbooks

Updated: 2026-06-05

These runbooks are for the controlled testnet beta. They do not authorize mainnet launch, real-money marketing claims, DeFi fallbacks, bridges, swaps, yield routing, sponsored gas, or unsupported collateral.

## Beta Readiness Check

Use this before any beta readiness claim.

1. Refresh official sources:
   - Base RPC/network docs.
   - Sui RPC/GraphQL/data-access docs.
   - Circle USDC contract-address docs.
   - Tether supported-protocol docs.
   - Current indexer docs for any hosted indexer being used.
2. Set `KIAI_SOURCE_REFRESHED_AT` in `.env` to the ISO timestamp of that refresh.
3. Confirm required env is configured with no raw secret exposure:
   - `DATABASE_URL`
   - `OPERATOR_SECRET`
   - Base/Sui RPC URLs
   - Base/Sui vault/package/object IDs
   - Base/Sui USDC collateral identifiers
   - hashed operator audit IDs in newly created `OperatorAction` records
4. Run:
   - `pnpm verify`
   - Or, for the expanded sequence: `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
5. Start the app and call `GET /api/admin/ops/status` with `Authorization: Bearer $OPERATOR_SECRET`.
6. Update `docs/BETA_READINESS.md` with the current status, evidence, remaining risks, and manual QA notes.
7. Treat `readiness: "blocked"` as a stop sign. Treat `needs_review` as founder/operator review required before beta claims.

Do not mark beta ready if:

- Admin auth is missing.
- Required chain/env config is missing or placeholder.
- Chain events are stuck unreconciled.
- Settlement jobs are failed, blocked, or retrying.
- Deployed rails are missing contract/package or pool addresses.
- Unsupported collateral is present.
- Source refresh is stale or absent.

## Base Deploy Runbook

1. Refresh Base and Circle source docs before changing addresses or deployment config.
2. Confirm `BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `BASE_SEPOLIA_USDC_ADDRESS`, and `BASE_SEPOLIA_KIAI_VAULT_ADDRESS` are configured.
3. Run Foundry build/test from `contracts/`.
4. Deploy only to Base Sepolia for Phase 1.
5. Record contract address, transaction hash, block number, operator address, and timestamp in `docs/DEPLOYMENTS.md`.
6. Create/update `ChainDeployment` records through the admin workflow.
7. Run `GET /api/admin/ops/status` and confirm the Base rail is observable.

Rollback:

- Do not edit finalized trades.
- Pause the affected market from the operator API.
- Mark deployment failure reason on the chain deployment.
- Keep failed tx hashes and operator actions for audit.

## Sui Deploy Runbook

1. Refresh Sui docs before changing Move package, object, or GraphQL config.
2. Confirm `SUI_TESTNET_RPC_URL`, `SUI_TESTNET_GRAPHQL_URL`, `SUI_OPERATOR_PRIVATE_KEY`, `SUI_TESTNET_KIAI_VAULT_PACKAGE_ID`, `SUI_TESTNET_KIAI_VAULT_REGISTRY_ID`, and `SUI_TESTNET_KIAI_OPERATOR_CAP_ID`.
3. Run Sui Move tests from `contracts/sui`.
4. Publish or call only on Sui Testnet for Phase 1.
5. For backend market objects, run `pnpm deploy:sui-market <backend-market-id>`. The script signs `create_market`, waits for Sui visibility, extracts the shared `Market<USDC>` object ID, and writes it to `ChainDeployment.poolAddress`.
6. Record package ID, registry object, operator cap, market object IDs, digest, and timestamp in `docs/DEPLOYMENTS.md`.
7. Re-run `GET /api/admin/ops/status` and verify the Sui rail is `deployed` before demo trading.

Rollback:

- Pause the affected market.
- Preserve failed effects/digests and package/object IDs.
- Do not infer portfolio finality from UI or wallet submission alone.

## Indexer Restart Runbook

1. Check `GET /api/admin/ops/status`.
2. Check `GET /api/admin/reconcile`.
3. If events are missing after a successful receipt/effects:
   - Run `POST /api/admin/reconcile?poll=true`.
   - Verify `unprocessedChainEvents` drops or failure details become visible.
   - Inspect Base transaction receipt or Sui effects/digest manually.
4. If RPC/indexer is unavailable:
   - Keep affected orders in retryable/indexing-pending state.
   - Do not create trades or final portfolio positions from optimistic UI state.
   - Backfill from the last stored block/checkpoint cursor after RPC recovers.

## Market Pause Runbook

Pause a market when trading or settlement truth is unsafe.

Triggers:

- Wrong source policy.
- Stale or unsupported collateral.
- RPC/indexer outage affecting finality.
- Bad deployment address.
- Resolution dispute or evidence-tampering concern.
- Settlement job failure requiring operator review.

Steps:

1. Use the operator API/UI to move the market to `PAUSED` where the lifecycle state machine allows it.
2. Record an operator action with reason and evidence.
3. Confirm quotes/orders reject non-live markets.
4. Re-run `GET /api/admin/ops/status`.
5. Resume only after the blocker is cleared and documented.

## Failed Settlement Runbook

1. Do not change the final resolution outcome just because a chain settlement failed.
2. Inspect `GET /api/admin/markets/:id/settlement`.
3. If status is `FAILED`, record the chain error and retry only after config/deployment/funds are corrected.
4. If status is `BLOCKED`, inspect `lastError`; current Phase 1 vaults support only winner-take-all resolve and full-refund cancel.
5. If one rail fails and another succeeds, keep per-rail job state separate.
6. Re-run `POST /api/admin/markets/:id/settlement` only after the blocker is understood.

## Incident Response

1. Stop user-visible claims first: pause affected markets or block trading.
2. Preserve evidence: tx hashes, Sui digests/effects, API payload hashes, screenshots/archive URLs, operator actions, and logs.
3. Classify impact:
   - Trade submission.
   - Chain confirmation.
   - Indexer/reconciliation.
   - Resolution evidence.
   - Settlement job.
   - Env/source/config.
4. Use official source of truth for the affected layer.
5. Write the remediation and residual risk into the beta readiness report before resuming.

## Explicit Non-Fallbacks

The following are not emergency workarounds in Phase 1:

- DeFi protocols.
- Bridges.
- Swaps.
- Yield routing.
- Sponsored gas/paymasters.
- USDT on Base or Sui.
- Manually editing portfolio finality.
- Settling from provisional/live API data.

Each requires a separate source-gated product and security spike.
