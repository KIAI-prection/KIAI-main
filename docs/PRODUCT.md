# KIAI Product Spec

## Source

This spec is based on the original KIAI pitch deck, the LLM-ready Markdown extraction, and the page-level OCR JSON in:

- `/Users/sourabhkapure/Downloads/【Product】KIAI_PitchDeck_v3.pdf`
- `/Users/sourabhkapure/Downloads/LLM-ready-KIAI_PitchDeck_v3/`

UI freeze rule: the current UI must not change during this development task. Treat it as the product reference, visual contract, and integration target. The build work is backend, web3/contracts, APIs, indexing, and real business logic underneath the existing interface.

Implementation seriousness rule: this is a real end-to-end web3 product build. No fake trading, no runtime mock execution, no simulated success states, no placeholder contracts, no pretend chain integrations. If the UI says a trade happened, a real Sui or Base testnet transaction must have executed, been recorded, and been reconciled.

Manual acceptance rule: the founder will manually test the product in the browser by connecting wallets and executing the real flows. The product is not accepted until those wallet-connected browser tests prove the UI, APIs, contracts, indexers, and portfolio state work together end to end.

Build discipline rule: follow Karpathy-style engineering discipline. Surface assumptions before coding, keep the implementation as simple as the real product allows, make surgical changes that trace to the frozen UI/backend goal, and define verifiable success criteria before each implementation step.

Sui source rule: before implementing or changing the Sui rail, future agents must directly use the required resources in [Sui Official Source Pack](./RESEARCH.md#sui-official-source-pack). That section is the canonical list of Sui resources for this project. Use Sui docs as implementation authority, Launch on Sui / Founder Starter Pack / Builder FAQ as build-support resources, Sui DeFi as ecosystem research, and Awesome Sui only as a discovery index that requires upstream verification.

Base source rule: before implementing or changing the Base rail, future agents must directly use the required resources in [Base Official Source Pack](./RESEARCH.md#base-official-source-pack). That section is the canonical list of Base resources for this project. Use the Base docs MCP and llms.txt index to discover current pages first, use Base docs as implementation authority, use llms-full.txt only as a fallback snapshot, and use the Base prompting guide to keep future AI-agent work context-efficient and specific.

Implementation source-pack rule: before changing contracts, execution, market mechanics, collateral, or indexers, future agents must also use [Base Execution Pack](./RESEARCH.md#base-execution-pack), [Market Mechanism Pack](./RESEARCH.md#market-mechanism-pack), and [Collateral + Indexer Pack](./RESEARCH.md#collateral--indexer-pack). These are required resource packs, not optional inspiration.

## One-Line Product

KIAI is a prediction market for Japan-relevant and global events where fans trade on sports, politics, culture, and special events through an English-first mainstream UX backed by real Sui and Base settlement rails.

## Product Thesis

Polymarket proved that large-scale prediction markets have demand, but existing products are US/EU-heavy, crypto-native, English-first, and culturally thin for Japanese fans.

KIAI wins by combining:

- Japan-native market coverage.
- Mainstream onboarding.
- Trustworthy resolution.
- Dual-chain settlement.
- Social distribution through LINE and Farcaster.

The user promise:

> Pick the market. KIAI handles the rails.

## Primary Users

### Japan-Market Mainstream Fan

Wants to participate in markets around sports, politics, and culture they already care about without seed phrases, gas handling, or crypto-native workflows.

Primary entry points:

- Mobile PWA.
- LINE Mini App.
- Wallet-first onboarding for the current build.
- Later Google/Apple-style login path through real Sui zkLogin integration after the standard wallet path is proven.
- English market explanations with Japan-native context.

### Crypto-Native Trader

Wants liquid event markets, fast settlement, visible odds, and wallet-native access through Base or Sui.

Primary entry points:

- Web PWA.
- Farcaster Mini Apps.
- Coinbase/CDP-style embedded or non-custodial wallet flow.
- Advanced market and portfolio views.

### Market Operator

Creates, reviews, publishes, pauses, resolves, and audits markets.

Needs:

- Market creation.
- Resolution source attachment.
- Compliance policy setup.
- Chain deployment state.
- Resolution and dispute workflow.
- Audit trail.

V1 creation authority is KIAI internal operators only. Approved creators or partners are a later expansion path, not part of the first backend implementation.

### Partner Or Federation

Wants sponsored or official markets, distribution, data partnership, and reporting.

Needs:

- Sponsored market package.
- Brand-safe market wording.
- Data integration path.
- Reporting and analytics.

## Market Catalogue

### First Demo Set

Use this set for the first complete backend-connected release. Do not narrow the product to only one flagship market; the first release must show the breadth of the product through the frozen current UI.

1. Nagoya basho winner.
2. Daily Yokozuna bout prop.
3. Summer Koshien winner.
4. NPB Central League pennant.
5. Japan Diet party seat threshold.
6. EPL match outcome.
7. F1 race winner.
8. Akutagawa Prize winner.

### Deck Coverage

Japanese sports:

- Grand Sumo.
- Koshien.
- NPB.
- J-League.
- Rizin.
- K-1.

Global sports:

- EPL, La Liga, UCL.
- NBA, NFL, MLB.
- F1.
- UFC.
- Tennis slams.
- Cricket IPL and ICC.

Politics:

- Japan Diet.
- Prefectural governor races.
- US presidential and midterms.
- UK, EU, Korea elections.

Culture and specials:

- Olympics.
- Asian Games.
- LoL and Valorant esports.
- Oscars.
- Akutagawa Prize.
- Bank of Japan rate decisions.

## Real Implementation Scope

### Non-Negotiable Build

- Existing English UI preserved as the fixed product surface.
- Deck-aligned market catalogue.
- Market detail pages.
- Trade ticket with proper testnet execution.
- Portfolio.
- Resolution lifecycle states.
- Trust/compliance explanations.
- Manual chain selection between Sui and Base.
- Structured eligibility blocks.
- Real Sui and Base testnet rails. No fake chain state and no simulated trade success.
- Sui collateral: USDsui or the closest real Sui testnet equivalent after verification.
- Base collateral: USDC and USDT on Base Sepolia or the closest real testnet equivalents after verification.
- Backend APIs that supply the current UI with real market, quote, order, portfolio, compliance, and resolution state.
- Sui Move testnet contracts for markets, vault/accounting, trading, and settlement.
- Base Solidity testnet contracts for the same product market semantics.
- Indexers that reconcile Sui/Base testnet events back into the portfolio and market state shown by the UI.
- Deployment scripts, environment configuration, and explorer-verifiable addresses for both chains.
- Automated tests for contracts, APIs, indexers, execution services, and critical state transitions.
- Clear failure handling for rejected quotes, failed transactions, reverted EVM calls, failed Sui effects, indexer lag, compliance blocks, and resolution disputes.
- Manual browser wallet testing by the founder for Sui and Base flows before acceptance.

### Base/Sui/DeFi Product Boundary — Refreshed 2026-06-04

Base and Sui are user-selectable payment/custody rails for the same KIAI market, not separate markets with separate odds. The user should experience this as: choose a market, choose the supported rail, confirm a real wallet transaction, then wait for chain and reconciliation evidence before final portfolio state appears.

Current product defaults:

- Base testnet trading uses Circle USDC on Base Sepolia only.
- Sui testnet trading uses Circle USDC on Sui Testnet only.
- USDT is not offered on Base or Sui until current official Tether/Base/Sui sources prove support.
- The product does not route through Sui DeFi protocols, DEXs, bridges, lending markets, or yield products in Phase 1.
- Smart wallets, account abstraction, sponsored gas, zkLogin, and embedded wallet flows remain later onboarding improvements. They must not replace the standard wallet paths until those paths pass manual browser QA.

User-visible truth rules:

- A rejected wallet signature is not a trade.
- A pending transaction is not a final position.
- A successful wallet broadcast is not enough; the product waits for receipt/effects and reconciliation.
- If an indexer lags, the product shows pending/reconciling state instead of fake portfolio success.
- If collateral, gas, chain, or market config is unsupported, the product shows the specific block reason.

Product edge cases that every new market or rail must handle:

| Case | Product result |
|---|---|
| Wrong chain selected | Block or ask for chain switch before submit. |
| Insufficient gas | Block with gas-specific reason and keep trade retryable. |
| Insufficient USDC | Block with collateral-specific reason. |
| Wallet rejected | No trade; show retry affordance. |
| Base tx pending/replaced/cancelled/reverted | Preserve exact chain state and avoid final portfolio credit. |
| Sui failed transaction/effects | Preserve digest/effects evidence and avoid final portfolio credit. |
| Indexer lag | Show pending/reconciling until chain observation catches up. |
| Unsupported USDT or DeFi route | Hide or block the option until source-gated support exists. |

### Required After Core Execution Path

- Auth and wallet-linking backend flows.
- Operator market creation data model.
- Clean admin/operator UI that does not disturb the existing public UI.
- Research/explainer data APIs for the existing pages.
- Share/social data APIs for the existing pages.

### Deferred Production Launch Items

- Production real-money launch.
- Production KYC vendor.
- Mainnet Sui and Base real-money contracts.
- Unified mainnet cross-chain orderbook.
- Production LINE Mini App.
- Production Farcaster Mini App.
- Paid premium tier.
- B2B data feed.
- Mock or simulated trading flows presented as product behavior.
- Visible UI redesigns or component rewrites.

## Core User Flows

### Fan Trade Flow

1. User opens KIAI on mobile.
2. User sees sports, politics, culture, and special-event markets immediately.
3. User opens a sumo market.
4. User reads resolution source, eligibility, fees, and risk.
5. User logs in and connects an eligible testnet trading path.
6. User manually chooses Sui or Base.
7. User enters trade amount.
8. Product shows estimated shares, payout, selected chain, collateral asset, and fees.
9. User confirms through the connected wallet.
10. A real testnet transaction settles on Sui or Base before the portfolio finalizes.
11. Resolution state is visible after close.

The visible flow must remain the current UI flow. Backend work may change data sources, state handling, and execution behavior, but not the visible product design.

### Compliance Block Flow

1. User tries to trade.
2. Product checks wallet connection, market status, chain availability, collateral support, balance, quote freshness, and development-stage policy state.
3. If blocked, the product shows the exact reason.
4. User sees the next available action, or a clear no-action block.

For the current development stage, do not add Japan or politics trading guardrails and do not integrate a KYC vendor. Still model structured policy/compliance state so production gating can be added later without rewiring the product.

Never collapse wallet, market, quote, collateral, balance, policy, and chain failures into one generic error.

### Operator Market Flow

1. Operator drafts market.
2. Operator defines outcomes and close time.
3. Operator attaches official source or source policy.
4. Operator defines edge-case policy: draw/tie, postponement, cancellation, no-contest, forfeit, abandoned event, and too-early proposal behavior.
5. Operator defines payout/refund policy: winner-take-all, 50/50 split, fractional/dead-heat, full refund, partial refund, or manual adjudication.
6. Operator defines oracle fallback.
7. Operator sets region and KYC policy.
8. Operator chooses Sui/Base deployment plan.
9. Market passes validation.
10. Market publishes or returns to draft.

## Market Quality Bar

A market cannot publish without:

- clear title and description,
- unambiguous outcomes,
- close time,
- resolution criteria,
- official source or source policy,
- oracle/dispute policy,
- edge-case policy,
- payout/refund policy,
- source certainty policy: whether provisional data can update UI only or can finalize settlement,
- compliance policy,
- chain deployment state,
- fee policy,
- cancellation/refund behavior.

For v1, official public-source snapshots are the required resolution baseline. Paid official feeds such as Sportradar, JSA, NPB, and similar sources are later integrations. UMA may be used as a dispute/backstop path only after a technical spike confirms the specific testnet deployment, required bonds/final fees, supported collateral, and operational cost.

Resolution product rule:

- The market page must show the resolution source, edge-case policy, and payout/refund policy before trading.
- A sports market must not imply that one side simply "wins" and the other "loses" unless the rule also states what happens on draws, postponements, cancellations, forfeits, abandoned matches, and official result changes.
- Provisional/live API data may be shown as status evidence, but final settlement should wait for the named official source or oracle-final state unless the market rule explicitly says otherwise.
- If no outcome is assignable, KIAI should use the market's predeclared unresolvable policy: `split_50_50`, `void_refund`, or `manual_adjudication`.
- Current deployed Base/Sui vaults can execute winner-take-all settlement and full-refund cancellation. For Phase 1, split, fractional, manual, partial-refund, and no-winning-share cases must show a blocked/manual settlement state; contract upgrades are deferred until after founder acceptance unless product explicitly changes scope.
- The first source-adapter path is Nagoya/sumo through an operator-reviewed Nihon Sumo Kyokai official-source observation. The adapter can prefill evidence and suggested proposal shape, but the operator still reviews and submits the proposal before the dispute window.
- New markets must store a pre-trade resolution policy before they can move toward review/deployment. After close, evidence snapshots, dispute records, and oracle assertion metadata preserve why the final outcome was accepted or challenged.
- Raw evidence payloads without an external archive URL are archived by payload hash and retrievable through the authenticated admin evidence-archive route, so an operator can inspect the exact source/API payload behind a resolution.
- Internal operators can now browser-test the first governance workflow at `/en/operator`: policy setup, official evidence capture, archived evidence inspection, Sumo/JSA proposal prefill, proposal submission, oracle assertion metadata, dispute review, and settlement job visibility. This is not yet the final production admin app; role-based auth and hardened form controls remain future work.
- Controlled beta readiness is now a product-visible gate, not a private engineering judgment. Operators use `/api/admin/ops/status` and `docs/RUNBOOKS.md` to see whether missing env, stale sources, deployment/indexer issues, failed orders, settlement jobs, or disputes block beta claims.

## UX Direction

KIAI must feel like a serious live market for fans, not a generic crypto casino. For this development task, the current UI is the reference for that experience and must remain visually unchanged.

Prefer:

- market-first home screen,
- dense but readable market cards,
- clear English copy with Japan-native market context,
- visible resolver and eligibility states,
- low-friction onboarding,
- restrained visual design.

Avoid:

- visible UI changes,
- generic crypto landing page,
- chain jargon before user intent,
- vague odds language,
- hidden fees,
- hype copy,
- implying real-money Japan availability before legal approval.

## Locked Product Decisions

1. Phase 1 must use proper testnet trading. No mock trading and no simulated execution.
2. The first product must include all deck verticals: sumo, Koshien, NPB, politics, global sports, culture, esports, and specials.
3. Sui and Base are both real chains in scope. Do not build a fake chain abstraction that claims execution.
4. English is the only product language for the current build.
5. Politics is included in the first release and must be tradable on testnet during development. No development-stage politics gating.
6. The UI never changes during this task. Build the backend, contracts, APIs, and logic behind the current UI.
7. Test fixtures may exist inside automated tests only. Runtime product code must not depend on mock trading, fake receipts, fake tx hashes, or placeholder contracts.
8. The founder manually validates wallet-connected browser flows before release acceptance.
9. Users manually choose Sui or Base.
10. V1 market creation is KIAI internal-operator only.
11. Wallet-first identity. No email-first account model for the first implementation.
12. No KYC vendor in Phase 1. No Japan or politics testnet guardrails during development.
13. No gas sponsorship in Phase 1. Users must hold the required testnet gas.
14. Protocol fees are modeled but set to zero for the first testnet implementation unless explicitly changed later.
15. Portfolio finalization waits for backend/indexer confirmation. Pending order/transaction state may be shown, but not as finalized exposure.
16. Public product wording should use prediction markets, trading, and testnet trading. Avoid betting language and avoid real-money Japan availability claims.

## Open Product Decisions

1. First market mechanism: AMM, orderbook, or hybrid. Engineering recommendation for the first real end-to-end blockchain product is a simple per-chain AMM-style mechanism unless the mechanism spike proves a different design is safer.
2. Dual-chain liquidity meaning: separate per-chain liquidity under one product market, or a genuinely unified cross-chain book/router. This needs a founder/architecture conversation before Phase 4.
3. Exact Sui USDsui testnet asset and Base Sepolia USDC/USDT contracts must be verified before contract implementation.
4. UMA backstop scope depends on a technical spike proving practical testnet usage, collateral/bond requirements, and operational cost.
5. First sport/source adapter: choose one launch sport and one official source first. Do not build a generic sports resolver before proving one complete sport-specific rule and evidence path.
