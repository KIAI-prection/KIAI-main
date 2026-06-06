# KIAI Architecture

## Goal

Build the backend, web3/contracts, APIs, indexers, and business logic for the existing KIAI UI.

The visible UI is frozen. The backend must preserve one market identity while allowing chain-specific custody and settlement on Sui and Base. Phase 1 execution is testnet, but it must still be real chain execution, not a simulated trade path.

Architecture standard: every runtime path must be real. Contracts must compile, test, deploy, and execute on testnet. APIs must persist state. Indexers must read real chain events. Portfolio state must reconcile from recorded execution and indexed data. Runtime mocks, fake receipts, fake transaction hashes, and placeholder contracts are not valid implementation.

Engineering standard: use Karpathy-style build discipline. Surface assumptions before implementation, keep the architecture direct, avoid speculative abstractions, make surgical changes, and define verifiable goals for every phase.

## One Pool, Two Payment Rails — Architectural Principle (Locked 2026-06-02)

**Base and Sui are payment options only. The market pool, pricing, and trading logic are unified in the KIAI backend.**

This is the locked architecture:

- There is **one market** with **one set of outcome probabilities and one liquidity pool**.
- Sui and Base are **settlement rails** — they determine how a user deposits collateral and receives winnings, not which market they trade on.
- On-chain contracts are **custody and settlement contracts only**: accept USDC deposit, record position on-chain, allow winner to claim USDC on resolution. They do not contain AMM logic or manage pricing.
- The KIAI backend API is the **canonical market state authority**: it holds prices, probabilities, order flow, LMSR pool state, and position records.
- A user choosing "trade on Base" and a user choosing "trade on Sui" are trading in the **same market** at the **same price**. Their collateral just lives in different chain vaults.
- The `ChainDeployment` database record tracks the per-chain custody contract addresses, deposit state, and indexed event state for each chain rail.

**Why this is the right architecture:**
- Avoids cross-chain price divergence (no need for a bridge or price oracle between chains).
- On-chain contracts stay simple and safe (custody + settlement, not AMM math).
- Supports the user promise: "Pick the market. KIAI handles the rails."

**What this means for contracts:**
- Base contract: `KIAIVault.sol` — accepts USDC deposit, issues position record on-chain, pays out on operator-confirmed resolution.
- Sui contract: `kiai_vault.move` — same pattern with Sui USDC.
- Neither contract manages market pricing or pool state.

**What this means for the backend:**
- The backend LMSR or pricing engine is the source of truth for prices and probabilities.
- The backend records all position changes.
- Contracts emit events; the indexer reads them; the backend reconciles positions.

## Mechanism — LMSR Backend AMM (Locked 2026-06-02)

Market pricing uses **LMSR (Logarithmic Market Scoring Rule)**, the standard mechanism for prediction market AMMs used by Gnosis, Augur, and production prediction markets.

LMSR properties relevant to KIAI:
- Automatic market making — any trade at any size has a guaranteed price.
- Prices are always bounded between 0 and 1 (represent probability).
- The cost function is convex, meaning buying YES raises YES price and lowers NO price automatically.
- Maximum loss for the house is bounded by the liquidity parameter `b`.

Phase 1 implementation:
- LMSR is computed in the backend API (TypeScript) — not in on-chain contracts.
- On-chain contracts hold collateral and track that a user has a position. The exact price/shares math lives in the API.
- This is the same pattern used by real centralized prediction markets with on-chain settlement.
- The LMSR `b` parameter (liquidity depth) is set per market by the operator.

Formulas:
```
cost(q) = b * ln(sum(exp(q_i / b))) for outcomes i
price(i) = exp(q_i / b) / sum(exp(q_j / b)) for outcome j
shares_acquired = cost(q_new) - cost(q_old) for a given USDC amount
```

These are computed in `lib/domain/market-service.ts`.

## Indexer — Custom viem Log Poller (Base) + Custom Sui GraphQL Poller (Updated 2026-06-03)

**Base events**: Custom TypeScript viem log poller — uses `getLogs` / `watchContractEvent` with the existing viem public client. Zero external services, zero cost, zero API tokens. Works for testnet Phase 6. Upgrade to Envio HyperIndex for production mainnet (same `ChainEvent` schema, just swap the ingestion layer).

**Sui events**: Custom TypeScript GraphQL poller — no commercial indexer supports Sui. Queries Sui GraphQL RPC for `transactionBlocks` and `events` by package/module/event type. Deduplicates by checkpoint + transaction digest. JSON-RPC is deprecated (migration deadline July 2026).

Both write to the normalized `ChainEvent` table in Postgres, feeding the reconciliation pipeline.

**Production upgrade path:** Envio HyperIndex (Base) when approaching mainnet — HyperSync speed, auto-reorg handling, hosted service. Requires ENVIO_API_TOKEN. The reconciliation layer is unchanged.

## Base/Sui/DeFi Runtime Boundary — Refreshed 2026-06-04

Base and Sui remain execution/custody rails underneath one KIAI market identity. They are not independent liquidity pools, independent AMMs, or DeFi routing choices.

Runtime rules:

- Base path: quote/order intent -> viem simulation -> wallet write -> transaction receipt -> emitted vault event -> Base indexer observation -> reconciliation -> portfolio finalization.
- Sui path: quote/order intent -> dApp Kit / Wallet Standard transaction -> failed-transaction/effects check -> digest visibility -> Sui event observation -> reconciliation -> portfolio finalization.
- Phase 1 Base and Sui testnet collateral remains Circle USDC only. USDT must stay unsupported until Tether/Base/Sui/current authoritative docs confirm rail support.
- DeFi protocols, bridges, lending markets, DeepBook routing, yield, and liquidity aggregation are out of runtime scope until a dedicated DeFi product/risk spike is approved.
- Smart Wallet, Base Account, OnchainKit, MiniKit, paymasters, Enoki, zkLogin, and sponsored transactions are UX upgrade candidates only after the normal wallet paths pass browser QA.
- Chain execution state is never inferred from optimistic UI state. A portfolio position becomes final only after chain receipt/effects and indexer or confirmed chain observation.

Fallback rules:

| Failure | System behavior |
|---|---|
| Wallet reject | Keep the order intent retryable; do not create a trade. |
| Wrong chain | Block or request switch before submit; never broadcast to the wrong rail. |
| Base reverted receipt | Store receipt/error, mark chain failed, do not reconcile shares. |
| Base tx replaced/cancelled | Preserve replacement metadata and map to replaced/cancelled status. |
| Sui FailedTransaction or failed effects | Store digest/effects/error, mark chain failed, do not reconcile shares. |
| Receipt/effects available but expected event missing | Mark reconciliation blocked and require retry/backfill/operator review. |
| RPC/indexer lag | Expose indexing_pending; resume from cursor/checkpoint; dedupe before writes. |
| Unsupported USDT or stale collateral address | Block trading/deploy until source-pack refresh and config validation pass. |
| DeFi/bridge/swap requested | Defer to separate spike covering custody, slippage, approvals, oracle, liquidity, and compliance risk. |

## System Diagram

```text
                 Frozen Current UI
        Existing pages, cards, trade ticket
                        |
                        v
                  KIAI API Layer
                        |
      ------------------------------------------------
      |          |          |            |            |
   Markets    Quotes     Orders     Compliance   Portfolio
      |          |          |            |            |
      ------------          |            --------------
             |              |                  |
             v              v                  v
       Market Database   Router          Indexer Database
                            |
             ---------------------------------
             |                               |
             v                               v
       Sui Settlement Rail             Base Settlement Rail
       kiai_vault.move ✅ deployed     KIAIVault.sol ✅ deployed
       Wallet Standard / dApp Kit      EVM wallet + viem/wagmi
       USDC (Circle official Sui)      USDC (Circle official Base Sepolia)
       — USDT not supported on Sui     — USDT not on Base Sepolia (Tether)
             |                               |
             ---------------------------------
                            |
                            v
             Resolver: official feeds + UMA backstop
```

## Deployment Status (Updated 2026-06-02)

Both chains are live on testnet. Full deployment details in `docs/DEPLOYMENTS.md`.

| Chain | Contract | Address / Package ID | Status |
|---|---|---|---|
| Base Sepolia | `KIAIVault.sol` | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` | ✅ Deployed |
| Sui Testnet | `kiai_vault.move` | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` | ✅ Deployed |

**Market vaults created on-chain (Nagoya Basho 2026):**
- Base Sepolia: `createMarket()` tx `0xe2d6bd6e...` — block 42310207 ✅
- Sui Testnet: `create_market` digest `7oJwPTWT...` — Market object `0x09b7dccd...` ✅

**Pending before full end-to-end trading flow:**
- Testnet USDC funded in a trader wallet for founder manual acceptance test
- Envio HyperIndex API token + Base event indexer setup (Phase 6)
- Sui GraphQL event poller setup (Phase 6)

## UI Contract

The current UI is the reference surface and must not change during backend implementation.

Backend work must:

- keep existing pages, layouts, components, styling, and visible copy unchanged,
- replace frontend-only and mock data state with API-backed state,
- preserve existing UI data shapes through adapters where needed,
- expose real loading, error, blocked, submitted, executed, failed, settling, and settled states using fields the current UI can already display or consume,
- keep all user-visible trade success claims tied to real testnet execution and recorded backend state,
- support founder-led manual browser testing with connected wallets on Sui and Base.

Frontend edits are allowed only when they are invisible integration wiring or runtime fixes required to connect the frozen UI to the backend.

## External Correctness Notes

These points were checked against current public documentation:

- Sui implementation has a required source gate. Before touching Sui contracts, wallet code, transaction execution, indexers, collateral validation, or deployment scripts, directly use the required resources in [Sui Official Source Pack](./RESEARCH.md#sui-official-source-pack). That section explains which resources are mandatory, what each source is for, and how future agents should use them.
- Treat docs.sui.io as the implementation authority for Sui architecture, object model, Move packages, deployments/upgrades, testing/debugging, programmable transaction blocks, transaction payment, data access, cryptography, CLI/RPC/API, SDKs, and Move framework behavior.
- Treat Awesome Sui as discovery only. Any SDK, indexer, faucet, security tool, IDE, wallet, RPC provider, or DeFi component found there must be verified against its upstream repo and current official docs before adoption.
- Sui DeFi and Launch on Sui identify useful ecosystem surfaces for KIAI research: DeepBook, stablecoins, PTBs, dApp Kit, Slush Wallet, zkLogin, Enoki, Kiosk, audit partners, RPC providers, analytics providers, testnet faucets, and testnet USDC. None of these become default dependencies without a focused spike.
- Sui zkLogin is not just social login. It requires an ephemeral key pair, OAuth JWT, user salt, zero-knowledge proof, address derivation, transaction signing with the ephemeral key, and submission with the zkLogin signature.
- Sui Wallet Standard and Sui dApp Kit are the first implementation target for wallet connection. zkLogin is important but should follow the standard wallet proof because it needs a proof/salt backend and more moving parts.
- Sui sponsored transactions require a sponsor/gas-owner flow. KIAI is not using gas sponsorship in Phase 1, so users must hold required testnet gas.
- Sui TypeScript SDK transaction builders create programmable transaction blocks. Sponsored flows require sender and sponsor signatures over transaction data with sponsor gas payment configured.
- Sui transaction effects may not be immediately reflected by later object/balance queries, so the backend/indexer must wait for transaction indexing before updating portfolio state.
- Base implementation has a required source gate. Before touching Base contracts, wallet code, transaction execution, indexers, collateral validation, deployment scripts, or AI-agent instructions, directly use the required resources in [Base Official Source Pack](./RESEARCH.md#base-official-source-pack). That section explains the required Base docs discovery order and how each Base resource should be used.
- Base docs MCP and https://docs.base.org/llms.txt are the preferred discovery path for current Base documentation. Static llms-full.txt is only a fallback snapshot when MCP is unavailable.
- The Base docs index points future agents to Base network/RPC docs, Base Sepolia, block explorers, data indexers, deploy-smart-contracts, network faucets, transaction finality, troubleshooting transactions, contract addresses, Smart Wallet, OnchainKit, MiniKit, paymaster/sponsor resources, and CDP/wallet resources. Adopt only the parts proven necessary for the real Base testnet rail.
- Base contracts and execution must also use [Base Execution Pack](./RESEARCH.md#base-execution-pack): Foundry for Solidity build/test/deploy/verify, OpenZeppelin for audited Solidity primitives, viem for type-safe EVM execution, wagmi only if React wallet hooks are needed, CDP for Coinbase wallet/server-wallet tooling, OnchainKit/Base Account only after a spike, and base/skills as an optional AI-agent skill pack.
- Market mechanism decisions must use [Market Mechanism Pack](./RESEARCH.md#market-mechanism-pack). Gnosis CTF, Polymarket docs, and UMA docs are references for mechanism/oracle design; they are not permission to clone another market structure without a KIAI-specific mechanism spike.
- Collateral and indexing decisions must use [Collateral + Indexer Pack](./RESEARCH.md#collateral--indexer-pack). Circle, Tether, Ponder, Envio, Goldsky, and Sui data access docs must be refreshed before wiring token addresses, indexer services, RPC assumptions, or Sui data APIs.
- Base/EVM contract writes must use preflight validation before broadcast where supported. With viem, the expected backend shape is public client simulateContract, wallet client writeContract, then waiting for the transaction receipt before marking execution as final.
- Base official docs use Foundry for smart contract deployment and Base Sepolia as the development/test network. Deployment output must include a real transaction hash and deployed contract address.
- Base onboarding includes both normal EVM wallet connection and a Coinbase CDP embedded/non-custodial wallet path. Normal EVM wallet connection is the first proof path; CDP follows once the contract/write path is correct.
- Coinbase CDP non-custodial wallets support embedded user wallets with email, SMS, or social login while users retain custody. This is a better current wording than casually saying "Coinbase Smart Wallet" for all Base onboarding.
- UMA docs position Optimistic Oracle V2 as the natural fit for prediction markets and sports betting style event settlement, while OOv3 is more assertion/escalation-manager oriented.
- UMA is not assumed to be free. A technical spike must verify the exact testnet deployment, collateral/bond/final-fee requirements, and operational flow before making UMA a required v1 dependency.
- Farcaster Frames v2 are now framed in docs as Farcaster Mini Apps. KIAI uses "Farcaster Mini App" in planning and only mentions Frames as legacy/deck wording.
- LINE Mini App work must follow LINE's Mini App/LIFF development, authorization, submission, and policy flow. It is a later distribution surface, not a Stage 1 dependency.

## Domain Model

### Market

One product-level prediction market.

Required fields:

- id
- slug
- English title
- English description
- category
- status
- open time
- close time
- outcomes
- resolution rules
- source policy
- oracle policy
- compliance policy
- fee policy
- chain deployments

### Outcome

One possible result.

Required fields:

- id
- market id
- label
- description
- current probability
- yes price
- no price
- resolved flag

### Chain Deployment

One chain-specific deployment of a product market.

Required fields:

- market id
- chain: sui or base
- deployment status
- contract/package address
- collateral asset
- settlement asset
- liquidity state
- last indexed block/checkpoint
- failure reason

### User

Required fields:

- id
- language preference, currently fixed to English
- region, optional during Phase 1 development
- account status
- KYC tier, modeled but no vendor integration in Phase 1
- wallet links

### Wallet Link

Required fields:

- user id
- chain
- address/account id
- provider
- verification status

### Order Intent

Pre-execution trade request.

Required fields:

- user id
- market id
- outcome id
- action: buy or sell
- side: yes or no
- amount
- currency
- preferred chain
- collateral asset
- quote
- compliance result
- status

### Trade

Executed trade.

Required fields:

- order intent id
- chain
- tx hash if chain-backed
- shares
- average price
- fees
- status

### Position

User exposure.

Required fields:

- user id
- market id
- outcome id
- chain
- shares
- average entry
- realized PnL
- unrealized PnL
- claimable amount

### Resolution

Market outcome process.

Required fields:

- market id
- proposed outcome
- source snapshot
- proposer
- dispute deadline
- status
- final outcome
- finalization tx hash if chain-backed

### Compliance Policy

Required fields:

- market id
- allowed regions
- blocked regions
- required KYC tier, modeled for future production but not enforced through a vendor in Phase 1
- max position size
- max daily volume
- legal notes

During Phase 1 development, politics and Japan testnet usage are not gated. Keep the policy fields so production controls can be added later, but do not block development-stage testnet trading by geography or politics category.

## State Machines

### Market

```text
draft -> review -> scheduled -> live -> closed -> resolving -> resolved
                         |        |         |          |
                         |        |         |          -> cancelled
                         |        |         -> paused
                         |        -> paused
                         -> rejected
```

### Order Intent

```text
created -> quoted -> compliance_checked -> submitted -> executed
                          |                 |            |
                          |                 |            -> failed
                          |                 -> expired
                          -> blocked
```

### Resolution

```text
pending -> proposed -> dispute_window -> finalizing -> final
              |              |
              |              -> disputed -> adjudicating -> final
              -> failed
```

## API Contracts

These are backend contracts that the frozen UI consumes through existing pages and data adapters.

### Markets

- `GET /api/markets`
- `GET /api/markets/:id`
- `POST /api/admin/markets`

Market responses must include chain deployments, resolver summary, eligibility summary, status, volume/liquidity, close time, and English content.

V1 market creation is KIAI internal-operator only. Admin/operator UI should be built cleanly as a separate management surface and must not disturb the existing public UI.

### Quotes

- `POST /api/quotes`

Quote response:

- quote id
- selected chain
- available chains
- collateral asset
- price
- shares
- fees
- estimated payout
- expires at
- compliance result
- route explanation

### Orders

- `POST /api/orders`

Order response:

- order id
- status
- trade id if executed
- tx hash if chain-backed
- chain and network
- execution receipt/digest state
- reconciliation state
- structured failure if failed

### Portfolio

- `GET /api/portfolio`

Portfolio response:

- total value
- PnL
- open positions
- claimable winnings
- trade history

### Compliance

- `POST /api/compliance/check`

Known result codes:

- allowed
- blocked_region
- kyc_required
- kyc_limit_exceeded
- market_paused
- market_closed
- chain_unavailable
- insufficient_balance
- quote_expired

Every blocked response must include a user-readable cause and next action.

### Resolution

- `POST /api/admin/markets/:id/resolution/propose`
- `POST /api/admin/markets/:id/resolution/finalize`

Resolution responses must include source snapshot, dispute deadline, final outcome, settlement jobs, and audit event id.

## Services

### Market Service

Owns catalogue, lifecycle, outcomes, English copy, source policy, and market validation.

### Quote/Router Service

Owns price aggregation, route selection, liquidity view, fees, quote expiry, and slippage.

Stage 1 must route to real Sui/Base testnet execution before claiming a trade succeeded. Deterministic fixtures are allowed only inside automated tests; runtime product code must not use fixtures as a substitute for trading, settlement, receipts, balances, positions, or resolution.

The first mechanism is not founder-locked yet. The engineering default for a working end-to-end blockchain product is a simple per-chain AMM-style design, because it can be tested and deployed directly on Sui and Base without a full off-chain matching engine. A CLOB or hybrid can be selected only after the mechanism spike proves the tradeoff is worth the added execution, indexing, and reconciliation complexity.

### Order Execution Service

Owns idempotent order submission, chain transaction construction, signing handoff, transaction broadcast, receipt/digest capture, and structured failure mapping.

Rules:

- never mark an order executed before chain confirmation,
- never update finalized portfolio state from client optimism alone,
- persist every execution attempt,
- make retry behavior idempotent by order id and quote id,
- reject or keep pending any order whose transaction digest/hash, receipt/effects, or indexer reconciliation is missing.

Manual browser wallet acceptance requires this service to expose enough state for the frozen UI to show submitted, failed, executed, settling, and settled without guessing. Pending rows are allowed only as pending transaction/order state; finalized exposure comes from backend/indexer reconciliation.

### Compliance Service

Owns region, KYC, limits, sanctions/account status, market eligibility, and structured block reasons.

Phase 1 has no KYC vendor and no Japan/politics guardrails during development. The service still returns structured policy state so production restrictions can be added later without inventing a new API.

### Portfolio Service

Owns positions, PnL, claimable balances, and trade history.

### Indexer

Owns Sui/Base event ingestion and normalized chain event state.

The indexer is the source of portfolio reconciliation. UI-visible positions must come from indexed or explicitly reconciled execution state, not from the initial client click.

### Resolver Service

Owns written resolution rules, source adapters, evidence snapshots, optional API evidence ingestion, UMA proposal/dispute/finalization state, and resolution audit trail.

## Contract Direction

### Sui

Contracts to build:

- Market.
- Vault.
- Resolver.
- Position/outcome representation.
- Spirit reputation NFT.

Sui onboarding needs:

- standard Sui wallet connection through Wallet Standard / Sui dApp Kit first,
- zkLogin proof/salt flow after the standard wallet path is proven,
- no sponsored gas service in Phase 1.

Sui backend execution requirements:

- build programmable transaction blocks with the Sui TypeScript SDK,
- support package/module/function calls for market trade and resolution entry points,
- use USDsui or the closest verified real Sui testnet stablecoin equivalent as collateral,
- store package id, object ids, digest, effects status, checkpoint, and indexing status,
- require user signatures through the connected wallet,
- wait for transaction indexing before portfolio finalization,
- prove the path with real Sui testnet package/object ids and transaction digests.

### Base

Contracts to build:

- Market factory.
- conditional outcome token or CTF-style market.
- collateral vault.
- resolver adapter.

Base onboarding is documented as:

- normal EVM wallet connection,
- embedded/non-custodial wallet path through CDP or equivalent,
- USDC and USDT collateral rails,
- no paymaster or gas sponsorship in Phase 1.

Base backend execution requirements:

- use viem public clients for reads and preflight validation,
- use wallet/signing clients for writes,
- call simulateContract before broadcasting when supported,
- call writeContract for execution,
- wait for receipts before marking execution final,
- store contract address, chain id, tx hash, block number, log index, receipt status, and revert/failure reason,
- support Base Sepolia USDC and USDT testnet collateral contracts after verifying real addresses,
- prove the path with real Base Sepolia contract addresses, transaction hashes, and receipts.

## Resolution Model

Resolution decides which outcome is real after an off-chain event concludes. It is separate from live market pricing and separate from portfolio reconciliation.

Resolution source priority:

1. Written market rule: exact question, outcome mapping, end condition, and edge cases.
2. Official public source snapshot: league/federation/event/government/source named before trading opens.
3. Operator-reviewed evidence bundle: URL, fetched payload, timestamp, screenshot/archive reference where practical, operator id, and evidence hash.
4. Paid or public result API evidence, once provider licensing/API-key/source-quality checks are complete. API data can prefill evidence, but cannot silently finalize a market by itself.
5. UMA Optimistic Oracle backstop, only after technical spike confirms practical network, cost, collateral, bond, liveness, dispute, and callback requirements.
6. Emergency cancellation/refund path when the market is invalid, unresolvable, cancelled, or outside its written rules.

For sports, this means the app does not simply ask "who won?" at runtime. Each market must define how draws, postponements, cancellations, forfeits, no-contests, overtime, and too-early resolution are handled before trading opens. The resolver service then proposes the outcome from evidence and waits through the configured dispute path before Base/Sui settlement is finalized.

Current implementation baseline after the 2026-06-04 open-source prediction-market audit:

- Admin resolution proposals require a structured `sourceSnapshot` evidence object with description, at least one source, edge-case notes, resolver mode, optional evidence hash, and optional oracle metadata.
- `sourceSnapshot` now also supports source certainty, provider event status, raw payload hash, source priority rank, and an optional resolution-rule JSON contract.
- The first source adapter is `sumo-jsa`: it converts an operator-reviewed Nihon Sumo Kyokai official-source observation into KIAI resolution evidence for tournament-winner markets.
- Proposed and final outcomes are normalized to existing market outcome slugs before storage. A typo or unknown outcome cannot be used for resolution.
- Non-outcome proposals such as official cancellation/refund can enter the dispute window without assigning a fake winning outcome, as long as the proposed settlement mode is not `winner_take_all`.
- A proposal puts the resolution into `DISPUTE_WINDOW` and writes a 48-hour deadline. Finalization is blocked until that deadline unless `KIAI_ALLOW_EARLY_RESOLUTION_FINALIZE=true` is set for controlled local testing.
- Finalization builds and stores a settlement instruction with payout mode, payout vector, refund policy, source certainty, rule version, evidence bundle hash, and finalized-by metadata.
- Settlement jobs are now durable per-chain records keyed by resolution and chain. The runner consumes only the finalized settlement instruction and records action, status, attempts, last error, and tx hash/digest.
- Market-level `resolutionPolicy` is now the pre-trade rule contract. Future transitions toward `REVIEWED`, `DEPLOY_PENDING`, or `LIVE` require a valid policy with source priority, edge cases, resolver mode, payout mode, refund policy, and source-certainty policy.
- Evidence snapshots, resolution disputes, and optional oracle assertions are now first-class records. Resolution proposals also archive their primary source evidence automatically.
- Raw source/API payloads are archived as JSON artifacts keyed by payload hash. The default local root is `.kiai/evidence-archive`, overrideable by `RESOLUTION_EVIDENCE_ARCHIVE_DIR`; operators retrieve artifacts through `GET /api/admin/evidence-archive/:hash` using the same admin bearer-token gate.
- `/en/operator` is now the first internal browser console over these records and APIs. It is intentionally a thin operator workflow surface: bearer token entry stays session-local in the browser, actions call `/api/admin/*` routes rather than bypassing API validation, and internal evidence archive artifacts can be fetched back into the console for manual review.
- Phase 9 catalogue data now lives in `lib/market-catalogue/demo-markets.ts`, with pure policy generation in `lib/market-catalogue/policies.ts`. `prisma/seed.ts` syncs the eight demo markets into real database rows with outcomes, resolution policies, compliance records, pending resolution records, and Base/Sui chain deployment plans.
- Normal public market queries still expose only reviewed/deploy-pending/live markets. Catalogue QA uses explicit preview mode (`/api/markets?preview=catalogue` or `/en/markets?preview=catalogue`) scoped to the eight known demo slugs so draft breadth can be browser-tested without changing trading eligibility.
- Superseded demo catalogue records are archived through lifecycle state plus operator audit actions when safe; they are not deleted from the database.
- Phase 10 adds a read-only operator status boundary at `GET /api/admin/ops/status`. It reports beta-readiness issues from env presence, source-refresh freshness, deployment/indexer state, order failures, settlement-job state, disputes, oracle assertions, and recent operator audit actions without returning raw secret values.
- The operator console can display this status JSON, but the server remains the authority for readiness classification. UI rendering does not make a blocked beta ready.
- Current deployed Base and Sui vaults execute only winner-take-all resolution and full-refund cancellation. Phase 1 keeps split, fractional, manual, partial-refund, and no-winning-share cases backend-represented but chain-blocked with explicit job errors; contract upgrades are deferred until after founder acceptance unless product explicitly changes scope.
- This is still the operator-reviewed official-source baseline. It is not a full UMA integration and does not replace the Phase 8 need for broader source adapters, refunds/claims UX, hosted evidence storage, and oracle/dispute operations.

### Resolution Semantics

The resolver must output a **settlement instruction**, not just a winning label.

Required settlement instruction fields:

- `resolutionId`
- `marketId`
- `ruleVersion`
- `sourceCertainty`: `provisional`, `official_confirmed`, `oracle_final`, or `manual_adjudicated`
- `status`: `awaiting_evidence`, `proposed`, `dispute_window`, `disputed`, `adjudicating`, `final`, `cancelled`, `failed`
- `payoutMode`: `winner_take_all`, `split_50_50`, `fractional`, `void_refund`, or `manual`
- `payoutVector`: outcome slug -> decimal payout factor, with all factors validated against the selected payout mode
- `refundPolicy`: `none`, `full_refund`, `partial_refund`, or `manual_review`
- `evidenceBundleHash`
- `finalizedAt`
- `finalizedBy`: operator id, oracle assertion id, or adjudication id

Examples:

| Scenario | `payoutMode` | `payoutVector` | `refundPolicy` |
|---|---|---|---|
| Team A wins binary market | `winner_take_all` | `{ "team-a": 1, "team-b": 0 }` | `none` |
| Unknown/50-50 binary market | `split_50_50` | `{ "yes": 0.5, "no": 0.5 }` | `none` |
| Cancelled event with refund rule | `void_refund` | `{ "yes": 0, "no": 0 }` | `full_refund` |
| Dead heat/shared placing | `fractional` | Market-specific fractional factors | `none` or `partial_refund` |

Settlement contracts should not interpret sports rules, API payloads, screenshots, or oracle debate context. They should receive only the final settlement instruction or a compact hash/reference to the already-finalized instruction. The backend resolver remains the single source of resolution truth for both Base and Sui rails.

### Settlement Job Execution

Settlement execution is per rail:

1. Operator finalizes resolution after the dispute window.
2. The admin settlement endpoint prepares one `SettlementJob` per deployed chain rail.
3. The job planner maps the settlement instruction to a chain action:
   - `winner_take_all` with a final outcome -> `RESOLVE`
   - `void_refund` with `full_refund` -> `CANCEL`
   - split, fractional, manual, partial refund, or missing winner -> `BLOCKED`
4. A runnable job calculates total winning YES shares for that rail from reconciled `UserPosition` rows.
5. Base uses `resolveMarket` or `cancelMarket`; Sui uses `resolve_market` or `cancel_market`.
6. Success stores the Base tx hash or Sui digest on the job. Failure stores the error without changing the finalized outcome.

Important contract limitation: both deployed vaults require positive total winning shares for `resolve`. If nobody on a rail holds the winning outcome, the runner blocks the job instead of sending a transaction that would revert. Phase 1 treats this as blocked/manual remediation rather than a contract upgrade.

### Source Adapter States

Every source adapter must normalize provider/event states into KIAI states:

| Adapter observation | KIAI state | Settlement allowed? |
|---|---|---|
| Not started, live, suspended | `awaiting_evidence` | No |
| Delayed or postponed | `delayed` | No, unless rules declare expiry/refund |
| Ended but not confirmed | `provisional_result` | No by default |
| Officially confirmed/closed | `official_confirmed` | Yes, after proposal/dispute rules |
| Cancelled, abandoned, no result assignable | `manual_review` or `cancelled` | Only after rule/refund decision |
| Provider/API error | `evidence_unavailable` | No |
| Provider result conflicts with official source | `disputed` | No |

The JSA/sumo adapter intentionally does not auto-settle from live page content. It returns a structured evidence payload and suggested proposal body for operator review. Direct shell fetches of the JSA page may hit site URL guards; Exa/browser fetch can read indexed content, so the resolver archives the reviewed raw payload locally by hash. Production should replace or extend this with hosted object storage and screenshot/archive capture for externally durable artifacts.

User-visible states:

- open,
- paused,
- closed,
- awaiting official result,
- proposed,
- in dispute window,
- disputed,
- finalized,
- settling,
- settled,
- cancelled/refunded.

## Technical Open Decisions

1. Orderbook, AMM, or hybrid? Engineering recommendation is per-chain AMM first unless research proves otherwise.
2. Dual-chain liquidity semantics: separate per-chain liquidity under one market, or genuinely unified cross-chain orderbook/router.
3. Exact verified testnet collateral contracts for USDsui, Base USDC, and Base USDT.
4. UMA backstop feasibility: supported networks, collateral, bonds/final fees, dispute operations, and cost.
5. Which official source/feed mix is available later for all first-release verticals?
