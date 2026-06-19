# Current Mainnet Note

As of 2026-06-19, the current deployment source of truth is docs/DEPLOYMENTS.md: Base Mainnet is deployed for the shared vault and all non-archived markets; Sui Mainnet publish is blocked until the operator address receives an owned SUI gas coin object. Older testnet readiness notes below are historical implementation context.

# KIAI Controlled Beta Readiness Report

Updated: 2026-06-06

## Current Status

Status: `needs_review`

KIAI is not blocked by missing Phase 10 infrastructure, but it is not ready to claim beta readiness until the remaining operator/founder review items below are signed off. The source of truth is the live ops status endpoint, `GET /api/admin/ops/status`, backed by `lib/server/ops-status.ts`.

## Implemented Readiness Controls

- Admin-only ops status endpoint: `GET /api/admin/ops/status`.
- Operator console access to the ops status JSON from `/en/operator`.
- Required-env detection without returning raw secret values.
- Operator audit IDs are hash-derived and do not include bearer-token prefixes.
- Source-refresh tracking through `KIAI_SOURCE_REFRESHED_AT`.
- Deployment visibility for Base and Sui chain rails.
- Indexer backlog visibility through unprocessed chain-event counts.
- Order failure and pending-reconciliation visibility.
- Settlement-job failure, blocked, and retry visibility.
- Open dispute and oracle assertion status visibility.
- Recent operator-action audit visibility.
- Runbooks for beta readiness, Base deploy, Sui deploy, indexer restart, market pause, failed settlement, incident response, rollback, and explicit non-fallbacks.

## Current Runtime Evidence

- Local source refresh timestamp is recorded in `.env` through `KIAI_SOURCE_REFRESHED_AT`.
- Local `OPERATOR_SECRET` was rotated during the Phase 10 audit because the previous local token was shorter than the controlled-beta recommendation. The value is not documented or committed.
- The previous pending Base order `cmpwbv9w30002eismg4eo8z0y` was reviewed against its transaction receipt and marked `CHAIN_FAILED` because its `txHash` was the Base vault deployment transaction, not a user trade `PositionOpened` event.
- That order failure is intentionally visible through ops status as `failed_or_blocked_orders_present`; it is not hidden as a successful reconciliation.
- Pending reconciliation count was reduced to zero after the stale order was moved out of `SUBMITTED_TO_CHAIN`.
- A Phase 10 operator audit action was recorded for the failed-order classification.
- Base Sepolia smoke evidence: deployed vault address `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` had bytecode present at latest observed block `42444083`.
- Sui Testnet smoke evidence: the configured registry object and Nagoya market object were readable through the Sui SDK path used by the app.
- 2026-06-06 security follow-up: new operator audit actions use `op:<sha256-prefix>` instead of the first characters of the bearer token.

## Automated QA Evidence — 2026-06-06

- Focused tests passed:
  - `pnpm exec tsx tests/operator-auth.test.ts`
  - `pnpm exec tsx tests/ops-status.test.ts`
  - `pnpm exec tsx tests/market-catalogue.test.ts`
  - `pnpm exec tsx tests/market-resolution-policy.test.ts`
  - `pnpm exec tsx tests/resolution-policy.test.ts`
  - `pnpm exec tsx tests/settlement-plan.test.ts`
  - `pnpm exec tsx tests/sumo-jsa-source-adapter.test.ts`
  - `pnpm exec tsx tests/resolution-governance.test.ts`
  - `pnpm exec tsx tests/operator-console-defaults.test.ts`
  - `pnpm exec tsx tests/operator-console-archive-records.test.ts`
  - `pnpm exec tsx tests/evidence-archive.test.ts`
- `pnpm test` now runs the focused suite above.
- `pnpm exec tsc --noEmit` passed.
- `pnpm typecheck` now runs `tsc --noEmit`.
- `pnpm lint` passed with no warnings or errors after cleanup of unused imports/locals and social attachment image rendering.
- `pnpm build` passed with the existing middleware deprecation, next-intl cache dependency parsing, and viem/ox dynamic dependency warning classes.
- `pnpm verify` now runs `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.
- `pnpm verify` passed end to end on 2026-06-06.
- Live API smoke on `http://localhost:3001`:
  - unauthenticated `GET /api/admin/ops/status` returned `401`
  - authenticated `GET /api/admin/ops/status` returned `200`
  - ops response did not include the bearer secret
  - readiness remained `needs_review`
  - only issue code was `failed_or_blocked_orders_present`
  - pending reconciliation was `0`
  - failed/blocked orders was `1`
  - `/api/markets?preview=catalogue` returned `8` catalogue markets
  - normal `/api/markets` returned `1` public eligible market
- Browser smoke on `http://localhost:3001`:
  - `/en/operator` rendered the Operator Console and Ops control
  - `/en/markets?preview=catalogue` showed catalogue markets
  - normal `/en/markets` did not show draft catalogue markets
  - `/en/social` rendered after social attachment images were moved to `next/image`
  - browser console errors were empty

## Remaining Review Items

- Review and accept the visible `CHAIN_FAILED` order as a historical failed test order, or decide whether to archive/reset local beta data before founder QA.
- Record browser wallet QA evidence for both Base and Sui using actual wallets and the current deployed testnet rails.
- Re-run `GET /api/admin/ops/status` with the production-like beta env immediately before any beta claim.
- Founder/operator must sign off on the readiness JSON and this report before calling the controlled beta ready.

## Non-Claims

This report does not approve:

- Mainnet launch.
- Real-money use.
- Production-grade auth/roles.
- UMA integration.
- Hosted evidence storage.
- Sponsored gas or paymasters.
- DeFi, bridge, swap, lending, or yield fallbacks.
- USDT support on Base or Sui.
- Split/fractional/manual payout execution on current vault contracts.

## Manual QA Checklist

- Load `/en/markets?preview=catalogue` and confirm only the eight Phase 9 catalogue markets appear in preview mode.
- Load normal `/en/markets` and confirm draft catalogue markets do not appear as live tradeable markets.
- Load `/en/operator`, enter the bearer token locally, and refresh ops status.
- Confirm no raw secret values appear in the ops status JSON or browser console.
- Confirm new operator audit rows do not contain the raw bearer token or a bearer-token prefix.
- Confirm the visible readiness state is understood before founder review.
- Execute one Base wallet-path test on Base Sepolia and record tx hash, receipt status, emitted event, and reconciliation result.
- Execute one Sui wallet-path test on Sui Testnet and record digest, effects status, event/object update, and reconciliation result.
- Confirm failed, rejected, or blocked wallet paths appear as failed/blocked/pending states instead of being treated as successful positions.
