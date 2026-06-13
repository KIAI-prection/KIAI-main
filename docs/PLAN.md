# KIAI Master Prompt And Execution Plan

## Read This First

This file is the canonical implementation prompt and execution plan for KIAI.

It is written for future coding agents, PMs, engineers, and reviewers who need to build the backend, contracts, APIs, indexers, operations, and real testnet execution behind the existing KIAI interface.

The current visible UI is frozen. Do not redesign it. Do not rewrite components for taste. Treat the current interface as the product contract and build real systems underneath it.

No runtime fake trading is allowed. If the product says a trade happened, there must be a real Sui or Base testnet transaction, a persisted execution record, an indexed event or confirmed chain observation, and a reconciled portfolio state.

This plan uses the following methods:

- Karpathy guidelines and Karpathy coder: surface assumptions, keep scope simple, make surgical changes, define verifiable success criteria.
- Context engineering: keep active context small, load source docs just in time, put critical constraints at the beginning and end, avoid context poisoning from stale docs.
- Context engineering evaluation: judge outcomes with multi-dimensional quality gates, not vibes.
- Planning and task breakdown: split work into small, ordered, verifiable tasks with explicit dependencies.
- Plan engineering review: challenge architecture, data flow, tests, performance, failure modes, and distribution before coding.
- GSD milestone gap planning: no .planning/v*-MILESTONE-AUDIT.md file exists in this repo at the time this plan was written, so gaps are inferred from docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/RESEARCH.md, package.json, and the founder instructions in this conversation.
- Writing plans: this file is the product and architecture plan. Each implementation phase must produce its own code-level task plan before code changes begin, because the user explicitly asked not to write code in this step.

## Master Prompt For Future Implementation Agents

Copy this prompt into any future coding session before implementing KIAI backend, contracts, indexers, or chain integration work.

    <ROLE>
    You are a senior product-minded full-stack and web3 implementation agent working on KIAI.
    Your job is to build real Sui and Base testnet execution behind the frozen existing UI.
    You must behave like a careful engineer and PM: read the repo first, use official docs, make the smallest correct change, and verify with real evidence.
    </ROLE>

    <PRIMARY_OBJECTIVE>
    Implement KIAI as a real prediction market product with backend APIs, Sui Move contracts, Base Solidity contracts, execution services, indexers, settlement, compliance state, operator workflows, and wallet-connected browser acceptance.
    The product must preserve the existing visible UI while replacing frontend-only or mock runtime behavior with real persisted state and real testnet transactions.
    </PRIMARY_OBJECTIVE>

    <CRITICAL_CONSTRAINTS>
    1. Do not change the visible UI, layout, styling, component hierarchy, or product copy unless a runtime wiring bug makes a tiny invisible integration edit unavoidable.
    2. Do not create mock trading, fake receipts, fake transaction hashes, placeholder contracts, simulated positions, or fake portfolio reconciliation.
    3. Do not mark a trade final until the chain transaction succeeds, the backend stores the result, and indexing or confirmed chain observation reconciles portfolio state.
    4. Do not hardcode collateral addresses, RPC assumptions, contract addresses, package IDs, or indexer behavior unless verified from current official sources.
    5. Do not treat Base USDT testnet support as real until Tether, Base, Circle-equivalent current docs, or another authoritative current source confirms it.
    6. Do not treat Sui JSON-RPC as the long-term data access foundation without explicitly acknowledging Sui's deprecation note and choosing GraphQL, gRPC, or a short-term bridge deliberately.
    7. Do not adopt zkLogin, Enoki, sponsored gas, paymasters, Smart Wallet, OnchainKit, MiniKit, DeepBook, UMA, Ponder, Envio, Goldsky, or any third-party service by default. Each requires a source-gated spike and a recorded reason.
    8. Do not claim tests, deployment, browser QA, contract execution, or indexer proof passed unless actually run.
    9. Do not broaden scope into mainnet launch, real-money Japan availability, production KYC, LINE Mini App, Farcaster Mini App, paid subscriptions, or B2B feeds during Phase 1.
    10. Do not leave ambiguous product behavior hidden in implementation. Surface assumptions, tradeoffs, and unresolved decisions before coding.
    11. Stop at manual phase checkpoints. Do not continue into the next phase until the founder has inspected changes, completed needed config, and approved continuation.
    </CRITICAL_CONSTRAINTS>

    <REQUIRED_DOCS_TO_READ_FIRST>
    1. docs/PRODUCT.md
    2. docs/ARCHITECTURE.md
    3. docs/RESEARCH.md
    4. docs/PLAN.md
    5. package.json
    6. Relevant app, component, lib, API, contract, indexer, and test files discovered from the current repo.
    </REQUIRED_DOCS_TO_READ_FIRST>

    <SOURCE_GATE>
    Before implementing any Sui work, refresh the Sui Official Source Pack in docs/RESEARCH.md.
    Before implementing any Base work, refresh the Base Official Source Pack in docs/RESEARCH.md.
    Before implementing contracts, execution, market mechanics, collateral, or indexers, refresh Base Execution Pack, Market Mechanism Pack, and Collateral + Indexer Pack.
    Use Firecrawl, browser verification, official docs, llms.txt indexes, MCP servers, Context7, and direct GitHub/source inspection where applicable.
    Record the refreshed source audit in docs/RESEARCH.md before code changes.
    </SOURCE_GATE>

    <CONTEXT_PROTOCOL>
    Use progressive disclosure.
    Load only the docs needed for the current decision.
    Prefer official docs and source indexes over memory.
    Keep source audit notes short, factual, and dated.
    If docs conflict, mark the conflict and prefer current official implementation docs over ecosystem blogs, README snippets, or old pages.
    If a tool output is long, summarize the exact finding and link to the source instead of dumping raw output into the working context.
    </CONTEXT_PROTOCOL>

    <WORKFLOW>
    1. Re-ground in the repo and current docs.
    2. State assumptions and open questions.
    3. Produce a phase-specific task plan with acceptance criteria.
    4. Implement the smallest vertical slice that proves a real end-to-end path.
    5. Add tests before or alongside implementation.
    6. Run relevant validation.
    7. Verify with real chain, backend, indexer, and browser evidence before claiming success.
    8. Present the phase checkpoint block and stop for founder review/config.
    9. Update docs/RESEARCH.md and docs/PLAN.md if source decisions or architecture decisions change.
    </WORKFLOW>

    <DEFINITION_OF_DONE>
    A phase is done only when its acceptance criteria are met with evidence:
    contract tests, API tests, indexer tests, real testnet transaction proof, persisted backend records, portfolio reconciliation, and browser wallet flow proof when applicable.
    </DEFINITION_OF_DONE>

    <FINAL_REMINDER>
    The visible UI is frozen.
    The runtime must be real.
    Official sources win.
    If uncertain, say exactly what is uncertain and what source or test will resolve it.
    </FINAL_REMINDER>

## Current Repo Snapshot

Observed from this repo at plan-writing time:

- App framework: Next.js 16.2.6, React 19, TypeScript 5.7.3.
- UI stack: Radix UI packages, Tailwind 4, lucide-react, next-intl, shadcn-style components.
- Scripts: dev, build, start, lint.
- Current lint script is eslint ., but eslint is not listed in devDependencies at the time this plan was written. Future agents must verify before claiming lint passes.
- Current docs are docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/RESEARCH.md, docs/PLAN.md.
- No .planning/v*-MILESTONE-AUDIT.md file was found when this plan was written.
- The repo already has visible pages and components. Backend, contract, indexer, and real trading systems are the major missing pieces.

## Future Agent Intake Checklist

Future LLMs must not start implementation from a vague instruction like "build Phase 1." They must first collect a compact implementation packet. This prevents hidden assumptions, stale source use, and fake progress.

Ask for or verify these items before coding:

| Context Needed | Why It Matters | Acceptable Evidence |
|---|---|---|
| Target phase and exact vertical slice | Prevents broad half-built systems | User instruction, checked task plan, or updated docs/PLAN.md section |
| Current git status and branch | Prevents overwriting unrelated user work | git status output reviewed before edits |
| Current source audit freshness | Web3 docs drift quickly | Dated docs/RESEARCH.md source audit from this session |
| First market to implement | Contracts, resolution, and tests need concrete inputs | Market title, outcomes, close time, source policy, category, chain plan |
| Database/runtime decision | API and indexer need durable storage | Recorded decision with tradeoff note |
| Chain scope for the slice | Determines contract, wallet, indexer, and QA path | Base only, Sui only, or both, with reason |
| Collateral choice | Prevents fake token/address work | Current official source link and exact testnet address or explicit fallback |
| Wallet/test account availability | Real browser QA needs funded wallets | Wallet type, network, faucet path, funded status, never private keys in chat |
| Deployment secret policy | Prevents secret leakage | Env var names and local setup path, never secret values |
| RPC/indexer choice | Prevents non-repeatable chain reads | Source-backed service choice and fallback behavior |
| Acceptance evidence format | Keeps "done" honest | Required screenshots, hashes/digests, logs, test outputs, and docs updates |
| Out-of-scope confirmation | Prevents scope creep | Explicit list in phase task plan |

Future LLMs should ask concise decision-level questions only when a missing item changes architecture or execution. They should not ask the founder to restate information already present in docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/RESEARCH.md, or this file.

Recommended first message for future implementation sessions:

    I will not code yet. I am checking the exact phase, current docs, source freshness, git status, and the first vertical slice. If any architectural decision is missing, I will ask one focused question before editing files.

Minimum implementation packet before code:

    Phase:
    First market:
    Chain scope:
    Collateral:
    Database/runtime:
    Wallet QA path:
    Source audit date:
    Expected evidence:
    Explicit non-goals:

If any item is unknown, record it as unknown and either resolve it through source research or ask the founder. Do not fill blanks with guesses.

## Locked Product Decisions

These are founder decisions until explicitly changed:

1. Stage 0 backend implementation. Build the real backend and web3 systems behind the current UI.
2. The current UI is fixed. No visible redesign, layout change, component rewrite, or copy rewrite is part of this work.
3. Phase 1 uses proper real testnet trading. No mock trading and no simulated runtime execution.
4. Sui and Base are both in scope from day one.
5. Users manually choose Sui or Base.
6. Sui collateral is USDsui or the closest verified real Sui testnet stablecoin equivalent.
7. Base collateral is USDC and USDT on Base Sepolia or the closest verified real testnet equivalents.
8. Base USDT testnet support is unverified until official/current sources prove it.
9. All deck verticals are first-release scope: sumo, Koshien, NPB, politics, global sports, culture, esports, and specials.
10. English is the only current product language.
11. Politics is included during development and testnet trading. Real-money availability remains legally gated.
12. No public real-money Japan launch claim before legal review.
13. Wallet-first identity in Phase 1.
14. No KYC vendor in Phase 1.
15. No gas sponsorship in Phase 1. Users must hold required testnet gas.
16. Protocol fee logic should be modeled, but fees are zero for first testnet implementation unless explicitly changed.
17. Portfolio finalization waits for backend and indexer confirmation. Pending state can be visible but must never masquerade as final exposure.
18. V1 market creation is KIAI internal-operator only.
19. Admin/operator UI is required, but it must be a separate clean surface that does not disturb the public UI.
20. UMA is optional until a spike proves testnet practicality, collateral support, bond/final-fee requirements, cost, and operational flow.
21. The founder manually tests wallet-connected browser flows before acceptance.

## Required Source Packs

The following packs are required resources, not optional inspiration. Future agents must refresh and use them before implementing the related area.

### Sui Official Source Pack

Canonical section: docs/RESEARCH.md, Sui Official Source Pack.

Required resources:

- https://www.sui.io/founder-starter-pack
- https://www.sui.io/faq
- https://www.sui.io/defi
- https://www.sui.io/launch-on-sui
- https://docs.sui.io/develop
- https://docs.sui.io/
- https://github.com/sui-foundation/awesome-sui/tree/main
- Context7 library: /websites/sdk_mystenlabs

How to use:

- Use docs.sui.io and the Sui SDK docs as implementation authority.
- Use Founder Starter Pack, FAQ, Launch on Sui, and Sui DeFi as ecosystem and founder-support context.
- Use Awesome Sui only as discovery. Verify every discovered tool against upstream docs or source before adoption.
- Verify wallet standard, Sui dApp Kit, PTBs, transaction effects, indexing waits, Move package deployment, and data access from current official docs.
- Do not default to zkLogin, Enoki, sponsored gas, DeepBook, Kiosk, third-party RPCs, analytics providers, or third-party indexers.
- For Sui data access, account for the Sui API reference note that JSON-RPC is deprecated and should migrate to gRPC or GraphQL RPC by July 2026.

### Base Official Source Pack

Canonical section: docs/RESEARCH.md, Base Official Source Pack.

Required resources:

- https://docs.base.org/llms.txt
- https://docs.base.org/mcp
- https://docs.base.org/get-started/docs-mcp
- https://docs.base.org/get-started/docs-llms
- https://docs.base.org/llms-full.txt
- https://docs.base.org/get-started/prompt-library
- https://docs.base.org/get-started/deploy-smart-contracts
- /Users/sourabhkapure/Downloads/MCP Server.md
- /Users/sourabhkapure/Downloads/Static Docs Files.md
- /Users/sourabhkapure/Downloads/Developer's Guide to Effective AI Prompting.md

How to use:

- Fetch https://docs.base.org/llms.txt first. It is the documentation index.
- Prefer the Base MCP server at https://docs.base.org/mcp for live docs access.
- Use llms-full.txt only as a fallback snapshot when MCP is unavailable.
- Use the Base prompting guide to keep future AI-agent work specific, context-efficient, and grounded in relevant docs.
- Verify Base Sepolia, faucets, RPCs, explorers, transaction finality, troubleshooting, deployment, and contract verification from current Base docs.
- Do not invent Base Sepolia USDC or USDT addresses.
- Do not default to Base Smart Wallet, Base Account, OnchainKit, MiniKit, paymaster, sponsorship, Flashblocks, or CDP wallet primitives unless a source-gated spike proves they are needed.

### Base Execution Pack

Canonical section: docs/RESEARCH.md, Base Execution Pack.

Required resources:

- Foundry: https://book.getfoundry.sh/
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/
- Viem: https://viem.sh/
- Context7 Viem: /wevm/viem
- Wagmi: https://wagmi.sh/
- Context7 Wagmi: /websites/wagmi_sh and /websites/wagmi_sh_react
- CDP docs: https://docs.cdp.coinbase.com/
- CDP docs index and wallet docs discovered through current CDP docs.
- Base Smart Wallet and Base Account docs discovered through https://docs.base.org/llms.txt.
- OnchainKit docs discovered through https://docs.base.org/llms.txt.
- Base skills repository: https://github.com/base/skills
- Local clipping: /Users/sourabhkapure/Downloads/untitled.md

How to use:

- Foundry is the default Solidity build, test, deploy, and verification path unless a source-gated reason changes it.
- OpenZeppelin is the default source for audited Solidity primitives.
- Viem is the expected EVM execution library for simulateContract, writeContract, receipt waiting, and type-safe client behavior.
- Wagmi is only needed if React wallet hooks are required for the frozen UI wiring.
- CDP, Base Account, Smart Wallet, OnchainKit, MiniKit, and paymaster resources are research surfaces, not default runtime architecture.
- base/skills is optional AI-agent workflow tooling. It is not runtime architecture.

### Market Mechanism Pack

Canonical section: docs/RESEARCH.md, Market Mechanism Pack.

Required resources:

- Gnosis Conditional Tokens current docs: https://conditional-tokens.readthedocs.io/en/latest/
- Gnosis Conditional Tokens developer guide: https://conditional-tokens.readthedocs.io/en/latest/developer-guide.html
- Polymarket docs: https://docs.polymarket.com/
- Polymarket docs index: https://docs.polymarket.com/llms.txt
- Polymarket CTF overview: https://docs.polymarket.com/trading/ctf/overview
- UMA docs: https://docs.uma.xyz/

How to use:

- Use Gnosis CTF for conditional position concepts: conditions, collection IDs, position IDs, ERC1155 outcome tokens, split, merge, redeem, collateral, and payout reports.
- Use Polymarket docs as a mechanism and product reference for CLOB, CTF, market data, orders, positions, and redemption patterns. Do not copy Polymarket blindly.
- Use UMA docs for optimistic truth, proposal, dispute, bonds, collateral, final fees, and settlement.
- Mechanism selection must be a formal spike before contract coding. The current engineering default is simple per-chain AMM first for a working on-chain product, but that is not founder-locked until the spike records evidence.

### Collateral + Indexer Pack

Canonical section: docs/RESEARCH.md, Collateral + Indexer Pack.

Required resources:

- Circle stablecoins docs: https://developers.circle.com/stablecoins/
- Circle docs index: https://developers.circle.com/llms.txt
- Circle USDC contract addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
- Tether supported protocols: https://tether.to/en/supported-protocols/
- Ponder: https://ponder.sh/
- Ponder indexing overview: https://ponder.sh/docs/indexing/overview
- Ponder chain config: https://ponder.sh/docs/config/chains
- Ponder contract config: https://ponder.sh/docs/config/contracts
- Envio docs: https://docs.envio.dev/
- Envio docs index: https://docs.envio.dev/llms.txt
- Goldsky docs: https://docs.goldsky.com/
- Goldsky docs index: https://docs.goldsky.com/llms.txt
- Sui data access: https://docs.sui.io/develop/accessing-data
- Sui API reference: https://docs.sui.io/references/sui-api
- Sui GraphQL reference: https://docs.sui.io/references/sui-graphql

How to use:

- Circle is required for USDC support and contract addresses.
- Tether is required for USDT protocol support. A BaseScan token label is not enough.
- Ponder, Envio, and Goldsky are indexer candidates, not defaults.
- Sui data access docs are required before choosing Sui indexing. Avoid new long-lived JSON-RPC dependency unless deliberately scoped and documented.
- Portfolio truth must come from receipts, effects, events, indexers, or confirmed chain observation. It must not come from optimistic UI state.

### Base/Sui/DeFi Source Refresh Addendum — 2026-06-04

Canonical section: docs/RESEARCH.md, Base/Sui/DeFi Source Refresh — 2026-06-04.

Refreshed with Firecrawl, Context7, Exa/direct fetch, and the local browse skill preamble:

- Base docs index, deployment, finality, troubleshooting, and data-indexer pages.
- Sui data access, Sui GraphQL reference, Sui SDK / dApp Kit, Sui DeFi, and Launch on Sui.
- Circle USDC, Tether supported protocols, Ponder, Envio, Goldsky, Foundry, OpenZeppelin, viem, and wagmi.

Updated planning decisions:

- Base and Sui stay payment/custody rails for one backend market pool.
- Base Phase 1 collateral is Circle USDC on Base Sepolia only. USDT remains unsupported.
- Sui Phase 1 collateral is Circle USDC on Sui Testnet only. USDT remains unsupported.
- DeFi resources are ecosystem/risk context, not Phase 1 runtime dependencies.
- Normal EVM wallet + viem/wagmi and normal Sui Wallet Standard / dApp Kit paths come before smart wallets, account abstraction, paymasters, sponsored gas, Enoki, or zkLogin.
- Base final portfolio state requires simulation, wallet broadcast, receipt, emitted event or confirmed chain observation, and reconciliation.
- Sui final portfolio state requires transaction execution, failed-transaction/effects check, digest visibility, emitted event or confirmed chain observation, and reconciliation.

Required next-phase edge-case coverage:

| Phase | Cases that must be planned/tested |
|---|---|
| Phase 6 | Base block cursor, Sui checkpoint/digest cursor, duplicate event, event missing after successful receipt/effects, RPC timeout, rate limit, restart/backfill, reorg/log gap handling. |
| Phase 7 | Wallet reject, wrong chain, insufficient gas, insufficient USDC, stale quote, pending/replaced/cancelled Base tx, failed Sui effects, slow indexer, event missing, unsupported USDT. |
| Phase 8 | Settlement instruction retry per rail, failed Base settlement, failed Sui settlement, one rail settled while the other retries, source disagreement, refund/cancel payout vectors. |
| Phase 9 | New market source-pack refresh, source policy completeness, rail availability, collateral support, market-specific resolution edge cases. |
| Phase 10 | Source-refresh runbook, RPC/indexer health monitors, deployment artifact audit, settlement retry runbook, incident response for stale collateral or chain data. |

Do not add DeFi protocol execution unless a separate DeFi spike covers custody, approvals, slippage, bridge risk, oracle/liquidity dependencies, compliance implications, user disclosure, and rollback.

### Application Framework Source Pack

This pack is required whenever future agents touch the Next.js app, API routes, React wiring, validation, auth, database, styling, or tests. Chain docs are not enough for app implementation.

Required resources by area:

- Next.js current official docs and Next.js DevTools MCP for Next.js 16 behavior, App Router, route handlers, server actions if used, caching, runtime boundaries, middleware, and build behavior.
- React current official docs for React 19 behavior, hooks, server/client component boundaries, forms, and error boundaries.
- next-intl current docs for locale routing, middleware, message loading, and keeping English-only behavior stable until localization is explicitly reintroduced.
- TypeScript current docs or project compiler output for type behavior.
- Zod current docs if request/response validation uses Zod.
- The selected database/runtime docs after Phase 1 chooses Postgres, Supabase, Neon, Prisma, Drizzle, or another option.
- The selected auth/session docs after the wallet-first identity path is chosen.
- The selected test runner docs after tests are introduced. Current package.json has no working lint dependency and no explicit test runner.
- Tailwind/Radix/shadcn-style docs only if invisible UI wiring requires component changes. Do not use these docs as permission for redesign.

Future-agent rules:

- For any Next.js-related implementation session, initialize the Next.js docs/tooling workflow first when available, then fetch the exact current docs path before changing App Router, route handlers, middleware, caching, or server/client boundaries.
- Do not add a database ORM, auth library, test framework, or validation layer by preference alone. Record the reason, source docs, and migration cost.
- Do not change next-intl routing or locale behavior unless the task explicitly includes localization. English-only remains the current product decision.
- Do not fix the lint setup as drive-by work. If lint is needed as a validation gate, make it an explicit task and add the missing dependency/config deliberately.
- Do not let frontend framework work become a visible redesign. The app/framework source pack exists to keep backend/API wiring correct.

## What Already Exists

The repo already provides:

- A visible KIAI product interface.
- Current market cards, category navigation, hero/trending surfaces, trade panel, portfolio page, research page, social page, trust page, auth-adjacent pages, settings page, and localized routing.
- English product copy and category surfaces that reflect the intended breadth.
- Mock/static data surfaces that act as current UI contract examples.
- Next.js app structure and UI component library.
- Canonical planning docs: PRODUCT, ARCHITECTURE, RESEARCH, PLAN.

The implementation should reuse these as contracts:

- Reuse existing pages and components as the frozen UI shell.
- Reuse the existing visual states where possible.
- Replace mock/static runtime behavior at the data boundary.
- Add compatibility adapters behind the current UI shape rather than redesigning the interface.
- Add backend, contracts, indexers, and admin surfaces around the current app.

## What Is Not In Scope

Explicitly deferred from Phase 1:

- Production real-money launch.
- Japan real-money availability claims.
- Production legal approval.
- Production KYC vendor.
- Mainnet Sui or Base deployment.
- Real-money collateral custody.
- Unified mainnet cross-chain orderbook.
- Sponsored gas or paymaster.
- Production LINE Mini App.
- Production Farcaster Mini App.
- Paid premium tier.
- B2B data feed.
- Public market creator marketplace.
- Approved external creators.
- Full redesign of the current UI.
- Localization beyond English.
- Hidden mock mode that pretends to be real trading.

## Planning Assumptions

These assumptions are active until verified or changed:

- The current UI is treated as the public acceptance target.
- Backend storage will likely need a relational database, probably Postgres or a managed Postgres service, but the exact choice remains open.
- Contracts will need a normalized event vocabulary across Sui and Base even though the chain implementations differ.
- The first implementation should prove one real vertical slice before expanding every category, while keeping the final first release breadth intact.
- The simplest credible mechanism is likely per-chain collateralized markets with clear vault/accounting and event-based reconciliation, but mechanism finalization requires the Market Mechanism Pack spike.
- The first wallet paths are standard Sui wallet and normal EVM wallet. Embedded, smart, or social-login wallet flows follow after real writes work.
- Indexer choice should follow event shape and operational needs, not brand preference.
- Base USDC looks likely because Circle publishes Base Sepolia USDC, but future agents must refresh Circle docs before using any address.
- Base USDT remains unverified until official/current sources prove support.
- Sui collateral remains unresolved until USDsui or closest verified real testnet equivalent is confirmed.

## Open Decisions To Resolve By Spike

These are not questions to guess in code. They must be resolved with evidence and recorded in docs/RESEARCH.md.

1. Market mechanism: AMM, orderbook, hybrid, Gnosis CTF-inspired, Polymarket-like CTF/CLOB, or simpler KIAI-specific contract model.
2. Sui collateral: USDsui, testnet USDC, or closest verified real Sui stablecoin equivalent.
3. Base collateral: exact verified Base Sepolia USDC and USDT or replacement asset if USDT is unavailable.
4. Database/runtime: local Postgres, Supabase, Neon, another managed Postgres, or an existing project-approved option.
5. Sui data access: GraphQL, gRPC, short-term JSON-RPC, third-party indexer, or custom event polling.
6. Base indexer: Ponder, Envio, Goldsky, custom viem logs, or another source-gated indexer.
7. UMA role: required v1 resolver, optional backstop, or later-only dispute mechanism.
8. Dual-chain liquidity semantics: separate per-chain pools under one market identity, or a true unified cross-chain orderbook/router.
9. Admin/operator surface location: Next.js protected routes, separate app namespace, or service-console path.
10. Testnet deployment environment: local scripts only, CI-assisted deploy, or manually approved deploy pipeline.

## Inferred Milestone Gaps

No .planning/v*-MILESTONE-AUDIT.md file was present. The following gaps are inferred from the current docs and user instructions:

| Gap | Why It Matters | Close In Phase |
|---|---|---|
| Source audit needs current refresh before code | Web3 docs drift fast. Wrong docs create broken contracts and bad chain assumptions. | Phase 1 |
| Mechanism not locked | Contracts cannot be designed safely without the market accounting model. | Phase 1 |
| Collateral not verified | Wrong token addresses make the product fake or unsafe. | Phase 1 |
| Database/runtime not selected | API and indexer work need durable state. | Phase 2 |
| Backend API contract missing | Frozen UI needs stable real data boundaries. | Phase 2 |
| Operator workflow missing | V1 markets are internal-operator only. | Phase 3 |
| Base rail missing | Required day-one execution rail. | Phase 4 |
| Sui rail missing | Required day-one execution rail. | Phase 5 |
| Indexer/reconciliation missing | Portfolio truth depends on chain observation. | Phase 6 |
| Wallet-connected UI wiring missing | Founder acceptance requires browser wallet flow. | Phase 7 |
| Resolution and settlement missing | Prediction markets need trustworthy close, resolve, settle, refund. | Phase 8 |
| Test/eval gates missing | Agents must prove real-chain behavior, source obedience, and no mock leakage. | Every phase |
| Deployment/runbooks missing | Controlled beta needs repeatable operations. | Phase 10 |

## Recommended First Implementation Slice

The first implementation should prove one complete real path before broad rollout. Do not start by building every market, every admin feature, and both full rails at once.

Recommended slice:

    One internally created market
        |
        v
    Two outcomes
        |
        v
    One verified collateral per chain where available
        |
        v
    Base Sepolia contract deployment
        |
        v
    Sui testnet package deployment
        |
        v
    Quote -> order intent -> wallet submit
        |
        v
    Real testnet transaction
        |
        v
    Indexed or confirmed chain event
        |
        v
    Reconciled portfolio position
        |
        v
    Browser wallet acceptance

Recommended first market, unless the founder chooses another:

- Title: Nagoya basho winner.
- Category: sumo.
- Outcomes: two clearly named outcomes for the first contract proof, even if the final market later has more outcomes.
- Resolution baseline: official public source snapshot reviewed by operator.
- Chain scope: Base and Sui, but implement one rail to green first if parallel work is not ready.
- Collateral: only source-verified testnet collateral.

Why this slice:

- It touches the full product promise without pretending the whole catalogue is done.
- It exercises market creation, source policy, quote, order, wallet, contract, indexer, portfolio, and resolution state.
- It keeps the blast radius small enough to debug.
- It produces evidence the founder can manually verify.

Do not expand to the full catalogue until this slice proves real execution and reconciliation.

## Completion Evidence Packet

Future agents must attach or record this evidence before claiming a phase is complete.

| Evidence | Required For | Example |
|---|---|---|
| Source audit note | Every implementation phase | Dated docs/RESEARCH.md entry with URLs and decisions |
| Test output | Every phase | Exact command and pass/fail output summary |
| Contract artifact | Chain phases | Contract address, package ID, ABI/module info, deploy tx/digest |
| Chain proof | Chain phases | Base tx hash and receipt, Sui digest and effects |
| Persistence proof | Backend/indexer phases | Database record IDs or logged persisted state |
| Reconciliation proof | Trading/indexer phases | Chain event -> normalized event -> position update |
| Browser proof | User-facing execution | URL, wallet used, action performed, visible final/pending state |
| Failure proof | Execution phases | Wallet reject, failed tx/effects, unsupported collateral, indexer lag |
| Diff review | Every phase | Files changed, why each changed, unrelated changes ignored |
| Remaining risk | Every phase | Open decisions, blockers, unverified assumptions |

Minimum done statement format:

    Phase:
    What changed:
    Source audit:
    Tests run:
    Chain proof:
    Reconciliation proof:
    Browser proof:
    Docs updated:
    Remaining risks:

If a field is not applicable, say not applicable and why. If a field is missing, the phase is not done.

## Manual Phase Gates And Checkpoints

Future agents must use manual stops between phases. KIAI has real chain setup, wallets, secrets, contracts, collateral choices, and deployment config. These cannot be safely guessed or silently skipped.

Hard rule:

- A future agent may complete discovery, planning, local code edits, tests, and docs for a phase.
- A future agent must stop before moving into the next phase.
- The founder must be able to inspect the diff, provide config, fund wallets, verify external accounts, and approve or redirect the next phase.
- If a phase needs secrets, wallet funding, API keys, RPC providers, database URLs, CDP setup, Sui faucet assets, Base Sepolia collateral, contract verification keys, hosted indexer accounts, or deployment decisions, the agent must stop and ask for the missing setup. Never ask for private keys or secret values in chat.

Every phase must end with this checkpoint block:

    PHASE CHECKPOINT
    Phase completed:
    What changed:
    Files changed:
    Tests run:
    Source audit updated:
    Chain/deployment evidence:
    Config needed from founder:
    Secrets needed, names only:
    Wallet/testnet funding needed:
    Manual browser checks needed:
    Risks before next phase:
    Recommended next phase:
    STOP: Waiting for founder review and approval before continuing.

Manual stop points:

| Stop | When | Founder Should Inspect Or Provide |
|---|---|---|
| Stop 0 | After planning/source audit | Approve mechanism, collateral, indexer, DB/runtime decisions |
| Stop 1 | Before database/backend foundation edits | Database choice, local env setup, migration comfort |
| Stop 2 | Before first contract deployment | Test wallets, faucet funding, deployer address, network choices |
| Stop 3 | After Base contract tests before Base Sepolia deploy | Contract diff, Foundry output, deploy config, explorer/verification setup |
| Stop 4 | After Sui Move tests before Sui testnet deploy | Move package diff, Sui wallet/faucet setup, package/deployer config |
| Stop 5 | After each real testnet deployment | Contract/package IDs, tx hashes/digests, explorer/RPC proof |
| Stop 6 | Before indexer service selection or hosted setup | Ponder/Envio/Goldsky/custom choice, account setup, cost/hosting decision |
| Stop 7 | Before frozen UI wallet wiring | Wallet UX expectations, manual chain selector behavior, browser QA path |
| Stop 8 | Before resolution/settlement jobs touch contracts | Source policy, operator workflow, UMA/no-UMA decision |
| Stop 9 | Before beta readiness claim | Founder manual QA, runbooks, env docs, known risks |

Checkpoint approval language for future agents:

    I have reached a phase checkpoint and will not continue into the next phase without approval.
    Please review the changed files and provide any needed config outside chat.
    I will continue only after you confirm the next phase and any required setup is ready.

Config and secret handling:

- Ask only for secret names, setup status, and where the founder wants them stored.
- Never request raw private keys, API keys, wallet seed phrases, or secret values in chat.
- Prefer local .env files, platform secret stores, keystores, or provider CLIs.
- Document required env var names, but do not commit secret values.
- If a command needs a secret that is not configured, stop and report the missing variable name.

Approval rule:

- Approval can be a short message from the founder such as "approved, continue Phase 4" or "Base config ready, deploy."
- If approval is ambiguous, ask one concise question.
- If the founder changes scope at a checkpoint, update docs/PLAN.md or the phase task plan before continuing.

## Architecture Overview

High-level runtime shape:

    Frozen Current UI
        |
        v
    UI Adapter Layer
        |
        v
    KIAI API Layer
        |
        +-------------------+----------------+-----------------+----------------+
        |                   |                |                 |                |
        v                   v                v                 v                v
    Markets API         Quotes API       Orders API       Portfolio API   Operator API
        |                   |                |                 |                |
        +-------------------+----------------+-----------------+----------------+
                            |
                            v
                    Domain State Database
                            |
                            v
                    Execution Router
                            |
            +---------------+---------------+
            |                               |
            v                               v
    Sui Execution Rail              Base Execution Rail
    Move packages                   Solidity contracts
    Sui wallet first                EVM wallet first
    verified Sui collateral         verified Base collateral
            |                               |
            v                               v
    Sui event/data access           Base event indexer
            |                               |
            +---------------+---------------+
                            |
                            v
                Reconciliation + Settlement
                            |
                            v
                    Portfolio Final State

Key rule: API state can say submitted or pending from user intent, but only chain proof plus reconciliation can say executed, settled, or final.

## Core State Machines

### Market Lifecycle

    draft
      |
      v
    reviewed
      |
      v
    deploy_pending
      |
      +--> deploy_failed
      |
      v
    live
      |
      +--> paused
      |
      v
    closed
      |
      v
    resolving
      |
      +--> disputed
      |       |
      |       v
      |   resolving
      |
      v
    resolved
      |
      v
    settling
      |
      +--> settlement_failed
      |
      v
    settled
      |
      v
    archived

Market status must never be inferred from UI alone. It must come from persisted operator action, chain deployment state, close time, and resolution workflow state.

### Order And Trade Lifecycle

    intent_created
      |
      v
    quote_requested
      |
      +--> quote_rejected
      |
      v
    quote_ready
      |
      v
    compliance_checked
      |
      +--> blocked
      |
      v
    wallet_pending
      |
      +--> wallet_rejected
      |
      v
    submitted_to_chain
      |
      +--> chain_failed
      |
      v
    chain_confirmed
      |
      v
    indexing_pending
      |
      +--> indexing_lagged
      |
      v
    reconciled
      |
      v
    portfolio_final

Do not skip indexing_pending. This is the line between honest pending UX and fake final exposure.

### Resolution Lifecycle

    source_snapshot_pending
      |
      v
    source_snapshot_recorded
      |
      v
    outcome_proposed
      |
      +--> uma_assertion_pending
      |       |
      |       +--> disputed
      |       |
      |       v
      |   assertion_resolved
      |
      v
    outcome_finalized
      |
      v
    claims_open
      |
      v
    claims_settled

UMA is optional until proven. Official public-source snapshot resolution is the baseline.

## Data Model Plan

The implementation must define durable models for at least:

- Market
- Outcome
- Market source policy
- Resolution policy
- Compliance policy
- Fee policy
- Chain deployment
- Collateral asset
- User account
- Wallet link
- Order intent
- Quote
- Execution attempt
- Trade
- Position
- Chain event
- Reconciliation job
- Resolution proposal
- Source snapshot
- Settlement job
- Refund or cancellation record
- Operator action
- Audit event

Modeling principle: invalid states should be hard to represent. For example, a portfolio position cannot be final without a reconciled execution or settlement event.

## API Surface Plan

Minimum API groups:

- Public market list and detail.
- Quote creation and refresh.
- Order intent creation.
- Trade submission handoff.
- Execution status polling.
- Portfolio summary and positions.
- Wallet link state.
- Chain availability and collateral support.
- Compliance eligibility check.
- Resolution status and source snapshot.
- Operator market creation and review.
- Operator deployment controls.
- Operator pause/unpause controls.
- Operator resolution controls.
- Operator audit log.

Every API must return honest status. Unknown state must be unknown, pending, or blocked, never magically successful.

## Source Gate Note Template

Before implementation in any phase, update docs/RESEARCH.md with a short source audit note.

Required fields:

| Field | Required Content |
|---|---|
| Date | Current date and timezone |
| Agent | Who performed the refresh |
| Scope | Sui, Base, mechanism, collateral, indexer, UMA, or deployment |
| Sources refreshed | Exact URLs, MCP resources, Context7 library IDs, GitHub repos, local files |
| Versions found | SDK, package, chain, docs, CLI, or contract versions where relevant |
| Decisions confirmed | What is now safe to implement |
| Decisions still open | What remains unresolved |
| Implementation impact | What code or plan changes follow from the source audit |
| Evidence | Short quotes, page names, links, or command outputs, not raw dumps |

## Context Engineering Protocol For Future Agents

Use this protocol for every long-running KIAI implementation session:

1. Start with critical constraints from this plan and docs/PRODUCT.md.
2. Load only the source pack relevant to the phase.
3. Fetch indexes first: Base llms.txt, Circle llms.txt, Polymarket llms.txt, Envio llms.txt, Goldsky llms.txt, current docs indexes where provided.
4. Use Firecrawl for full-page research when needed. Wait for it if slow.
5. Use browser verification for pages where rendered content matters or docs navigation is ambiguous.
6. Use Context7 for SDK/library syntax when available.
7. Summarize source findings into docs/RESEARCH.md, then work from the summary plus exact links.
8. Keep large raw docs out of active context after summarizing.
9. Re-read source docs if implementation starts in a later session.
10. If context becomes noisy or contradictory, stop, restate verified facts, and discard unverified assumptions.

Lost-in-middle mitigation:

- Put non-negotiables at the top of phase prompts.
- Repeat the no-fake-runtime rule at the bottom of phase prompts.
- Keep source URLs grouped by phase.
- Use compact checklists for acceptance criteria.
- Use separate agents or worktrees for independent source audits, but aggregate only verified findings.

Context poisoning prevention:

- Never let an LLM-generated summary override official docs.
- If an agent invented a chain fact, mark it false until verified.
- If a source returns 404, record that and use the current official replacement.
- If two sources conflict, prefer current official implementation docs and note the conflict.

## Evaluation And Quality Gates

Every major phase must pass a multi-dimensional evaluation. A single overall score is not enough.

| Dimension | Weight | Minimum | What Passing Means |
|---|---:|---:|---|
| Source obedience | 20 | 0.90 | Uses required official/current sources and records source audit |
| Product fidelity | 15 | 0.90 | Preserves frozen UI and locked product decisions |
| Real-chain truth | 20 | 0.95 | No fake runtime execution, receipts, positions, or settlements |
| Mechanism correctness | 10 | 0.85 | Market accounting and resolution states are coherent |
| Security and funds safety | 10 | 0.90 | Contracts, permissions, vaults, signatures, and failures are handled safely |
| Test coverage | 10 | 0.85 | Meaningful tests cover happy, edge, and failure paths |
| Error honesty | 10 | 0.90 | User/API states reflect pending, failed, blocked, and unknown honestly |
| Simplicity and scope | 5 | 0.80 | No speculative architecture or avoidable broad rewrites |

Automatic fail conditions:

- Any fake tx hash or digest in runtime product code.
- Any runtime portfolio finalization without chain confirmation and reconciliation.
- Any hardcoded collateral address without current source verification.
- Any visible UI redesign in a backend phase.
- Any claim that tests or chain execution passed without proof.
- Any Base/Sui implementation that skipped the relevant source pack.
- Any unresolved failure mode that would silently show the user a successful trade.

Recommended eval set:

- 10 simple cases: market list, market detail, chain availability, wallet link, quote status.
- 15 medium cases: blocked trades, quote expiry, wallet reject, insufficient gas, collateral unsupported, market paused.
- 15 complex cases: real Base trade, real Sui trade, indexer lag, duplicate submit, failed receipt/effects, operator pause, resolution proposal.
- 10 very complex cases: end-to-end close and settlement, refund/cancel, disputed/ambiguous source, dual-chain portfolio, recovery after indexer outage.

## Test Strategy

Tests should be meaningful behavior tests, not coverage theater.

Required test layers:

| Layer | Required Coverage |
|---|---|
| Contract unit tests | Market creation, vault accounting, buy/sell or position updates, close, resolve, claim/refund, unauthorized calls, invalid state transitions |
| Contract deployment smoke | Testnet deployment with real address/package ID and explorer/RPC verification |
| Execution service tests | Simulation/preflight, wallet handoff, tx submission, receipt/effects parsing, failure mapping |
| API integration tests | Markets, quotes, orders, portfolio, compliance, operator flows, resolution, settlement |
| Indexer tests | Chain event parsing, dedupe, replay, lag handling, reconciliation, failure recovery |
| UI integration tests | Existing UI consumes API-backed data without visible redesign |
| Browser wallet manual QA | Founder verifies real Sui and Base wallet flows |
| Evaluation tests | Source obedience, no fake runtime, prompt/source-pack compliance |

Regression rule:

If future work changes existing visible behavior, add a regression test or explicit visual/browser proof that the existing behavior still works.

## Failure Modes To Cover

| Failure Mode | Must Be Tested | User/API Behavior |
|---|---|---|
| Wallet rejects signature | Yes | order status wallet_rejected, no trade finalization |
| Insufficient gas | Yes | blocked or chain_failed with actionable reason |
| Unsupported collateral | Yes | blocked before wallet handoff |
| Quote expires | Yes | quote_rejected or quote_expired, user must refresh |
| Market paused | Yes | blocked, no order execution |
| Duplicate submit | Yes | idempotent order/execution handling, no double position |
| EVM simulateContract fails | Yes | structured preflight error, no writeContract |
| EVM receipt failed or reverted | Yes | chain_failed, no portfolio finalization |
| Sui transaction effects fail | Yes | chain_failed, effects captured, no final portfolio |
| Indexer lag | Yes | indexing_pending, no fake final exposure |
| Indexer duplicate event | Yes | dedupe by chain identity and event keys |
| Chain outage or RPC timeout | Yes | pending or failed with retry semantics |
| Operator deploy fails | Yes | deployment failure state, no live market |
| Resolution source ambiguous | Yes | resolving or disputed, not silently resolved |
| Settlement job fails | Yes | settlement_failed and retry/audit trail |
| Compliance policy blocks | Yes | exact block reason, no generic failure |
| Region/legal future gate | Later | modeled but not enforced in Phase 1 development |

## Phase Dependency Graph

    Phase 0: Planning consolidation
        |
        v
    Phase 1: Source audits + mechanism/collateral/indexer spikes
        |
        v
    Phase 2: Backend foundation + data model + API contract
        |
        +--------------------+---------------------+
        |                    |                     |
        v                    v                     v
    Phase 3: Operator   Phase 4: Base rail   Phase 5: Sui rail
        |                    |                     |
        +--------------------+----------+----------+
                                      |
                                      v
                          Phase 6: Indexing + reconciliation
                                      |
                                      v
                          Phase 7: Frozen UI integration
                                      |
                                      v
                          Phase 8: Resolution + settlement
                                      |
                                      v
                          Phase 9: Market catalogue rollout
                                      |
                                      v
                          Phase 10: Security, ops, beta readiness

## Phase 0: Planning Consolidation

Status: complete when this plan is committed or accepted.

Goal:

- Convert the conversation, source packs, and existing docs into one durable prompt and execution plan.

Deliverables:

- docs/PLAN.md updated with master prompt, phased plan, source gates, eval gates, and acceptance criteria.
- Existing docs remain canonical and cross-linked.

Acceptance criteria:

- Plan directly references all required Sui and Base resources.
- Plan directly references Base Execution Pack, Market Mechanism Pack, Collateral + Indexer Pack, and base/skills.
- Plan states no code implementation is part of this step.
- Plan preserves the frozen UI and real-runtime constraints.
- Plan names no milestone audit file was found.

Validation:

- docs/PLAN.md exists and includes required sections.
- Type check or docs-safe validation passes where practical.
- Final response reports exactly what was changed and what was not.

## Phase 1: Source Audit And Decision Spikes

Goal:

- Resolve the minimum set of architectural unknowns before contract/API implementation begins.

Workstreams:

1. Sui source refresh.
2. Base source refresh.
3. Base execution source refresh.
4. Market mechanism spike.
5. Collateral verification spike.
6. Indexer/data-access spike.
7. UMA feasibility spike.
8. Database/runtime choice.

Tasks:

- Fetch all Sui Official Source Pack resources.
- Fetch Base llms.txt first, then use Base MCP and Base docs pages.
- Refresh Foundry, OpenZeppelin, Viem, Wagmi, CDP, OnchainKit, Base Account, and base/skills resources as needed.
- Refresh Gnosis CTF, Polymarket, and UMA docs.
- Refresh Circle, Tether, Ponder, Envio, Goldsky, and Sui data access docs.
- Verify old or broken URLs and replace with current official paths.
- Record all source audit findings in docs/RESEARCH.md.
- Write a mechanism decision note in docs/RESEARCH.md.
- Write a collateral decision note in docs/RESEARCH.md.
- Write an indexer decision note in docs/RESEARCH.md.
- Write a database/runtime decision note in docs/ARCHITECTURE.md or docs/RESEARCH.md.

Acceptance criteria:

- No implementation work starts before source audit notes exist.
- Every chain/collateral/indexer decision has a cited current source.
- If Base USDT remains unverified, the plan records the fallback collateral strategy.
- If UMA is not proven practical, official public-source snapshot resolution remains baseline.
- If Sui JSON-RPC is used short-term, the deprecation risk and migration plan are documented.
- Mechanism choice is simple enough to build and test on both chains without inventing a speculative cross-chain router.

Verification:

- docs/RESEARCH.md has dated source audit notes.
- Each source pack has direct URLs and clear implementation impact.
- Each unresolved decision is either closed or explicitly blocked with required evidence.

## Phase 2: Backend Foundation And API Contract

Goal:

- Build durable backend state and API boundaries that match the frozen UI.

Scope:

- Choose and configure database/runtime.
- Define core domain models.
- Define API request/response shapes.
- Replace mock/static runtime dependencies with API-backed data boundaries.
- Implement compatibility adapters that preserve the UI contract.
- Add wallet-first account and wallet-link model.
- Model chain choice, collateral support, compliance state, order intent, execution attempt, and portfolio reconciliation.
- Add integration tests for domain state transitions.

Likely modules:

- app/api or route handlers, depending on the selected backend approach.
- lib/domain or equivalent domain model module.
- lib/server or equivalent backend service module.
- lib/api-client or equivalent UI adapter module.
- database schema/migrations.
- tests for APIs and state transitions.

Acceptance criteria:

- Markets API can serve the current UI shape without visible redesign.
- Market detail API includes outcomes, prices, chain availability, collateral support, source policy, resolution state, and eligibility state.
- Quote API returns honest quote_ready, blocked, expired, or rejected states.
- Order API creates durable intent records without pretending execution happened.
- Portfolio API returns only reconciled positions as final exposure.
- Compliance API returns structured reasons, not generic errors.
- Every record needed for chain execution and reconciliation has durable identity.
- APIs are typed and validated.

Verification:

- API tests cover valid and invalid inputs.
- State-transition tests prove orders cannot jump from intent_created to portfolio_final without chain/reconciliation proof.
- Existing UI can still render with API-backed data in smoke mode.
- No visible UI regression is introduced.

## Phase 3: Operator And Admin Foundation

Goal:

- Enable KIAI internal operators to create, review, deploy, pause, resolve, and audit markets without disturbing public UI.

Scope:

- Protected operator surface.
- Market creation and review workflow.
- Source policy and resolution policy fields.
- Chain deployment readiness fields.
- Pause/unpause controls.
- Resolution proposal controls.
- Operator audit trail.

Acceptance criteria:

- Operators can create draft markets with category, outcomes, close time, source policy, and resolution rule.
- Operators can mark a market reviewed and ready for deployment.
- Operators can see per-chain deployment status.
- Operators can pause a market or one chain rail with audit reason.
- Operator actions are persisted and auditable.
- Public UI does not expose draft or unapproved markets.

Verification:

- Operator API tests.
- Audit log tests.
- Permission tests for unauthorized access.
- Browser smoke of operator surface if UI is added.
- Public UI smoke proves no visible product redesign.

## Phase 4: Base Testnet Rail

Goal:

- Implement real Base Sepolia execution for KIAI markets.

Source gate:

- Complete Base Official Source Pack refresh.
- Complete Base Execution Pack refresh.
- Complete Market Mechanism Pack decision for EVM contracts.
- Complete Collateral + Indexer Pack collateral verification for Base USDC and USDT or fallback.

Scope:

- Solidity contracts for market registry/factory, market/vault/accounting, outcome positions, trading, close, resolve, claim/refund.
- Foundry tests.
- Base Sepolia deployment scripts.
- Contract verification where practical.
- Viem execution service with simulateContract, writeContract, and receipt waiting.
- Normal EVM wallet path first.
- CDP/embedded/Base Account/OnchainKit only after normal wallet write path is proven and a source-gated reason exists.
- Event emission designed for indexers.
- Contract addresses and deployment metadata persisted.

Acceptance criteria:

- Contracts compile.
- Contract tests cover happy paths, invalid state transitions, permissions, vault/accounting, close/resolve/claim/refund.
- Testnet deploy produces real Base Sepolia transaction hash and contract address.
- Execution service does preflight simulation before broadcast.
- Failed simulation, rejected wallet, reverted transaction, failed receipt, and RPC timeout are mapped to structured errors.
- Successful trade records tx hash, receipt, chain ID, contract address, collateral, market, outcome, amount, and reconciliation state.
- No API marks execution final until receipt and reconciliation state are recorded.

Verification:

- Foundry test output.
- Base Sepolia deployment proof.
- Real Base Sepolia trade proof.
- Receipt captured and linked to execution attempt.
- Event visible through chosen indexer or confirmed log query.
- Portfolio reconciles only after event/receipt confirmation.
- Founder browser wallet acceptance for Base path.

## Phase 5: Sui Testnet Rail

Goal:

- Implement real Sui testnet execution for KIAI markets.

Source gate:

- Complete Sui Official Source Pack refresh.
- Complete Sui data access and collateral verification.
- Complete Market Mechanism Pack translation for Move object/accounting design.
- Decide Sui data access strategy with JSON-RPC deprecation risk addressed.

Scope:

- Sui Move package for market registry/factory, market/vault/accounting, outcomes, trading, close, resolve, claim/refund.
- Move unit tests.
- Sui testnet deployment scripts.
- Standard Sui wallet / Sui dApp Kit path first.
- Transaction builders / PTBs.
- Transaction digest and effects capture.
- Explicit failed effects handling.
- waitForTransaction or current equivalent indexing wait before portfolio finalization.
- Event/data model compatible with normalized reconciliation.
- zkLogin only after standard wallet path is proven.

Acceptance criteria:

- Move package compiles.
- Move tests cover happy paths, invalid state transitions, permissions, vault/accounting, close/resolve/claim/refund.
- Testnet deployment produces real package/object IDs and transaction digest.
- Execution service builds real PTBs and captures digest/effects.
- Failed effects are mapped to structured errors.
- Successful trade records digest, effects, package/object IDs, collateral, market, outcome, amount, and reconciliation state.
- No API marks execution final until effects and indexing/reconciliation state are recorded.

Verification:

- Move test output.
- Sui testnet deployment proof.
- Real Sui testnet trade proof.
- Digest/effects captured.
- Event/data access proof.
- Portfolio reconciles only after indexing/confirmed observation.
- Founder browser wallet acceptance for Sui path.

## Phase 6: Indexing And Reconciliation

Goal:

- Convert real chain events and transaction observations into trustworthy portfolio and market state.

Source gate (updated 2026-06-03):

- Base events: **Custom viem log poller** — uses `getLogs` / `watchContractEvent` with the existing viem client. Zero external services, zero cost, zero signup. Swappable to Envio HyperIndex for production mainnet when needed.
- Sui events: **Custom TypeScript GraphQL poller** — no commercial indexer supports Sui; query `transactionBlocks` and `events` by package/module type, dedupe by checkpoint + digest.
- Why NOT Envio for Phase 6: Envio requires an API token (paid after free tier), an external account, and a hosted deployment. For testnet with low event volume, a custom viem poller is identical in behavior, simpler to operate, and free. Envio remains the production upgrade path.
- Indexer upgrade path: Envio HyperIndex → plug in when approaching mainnet. The `ChainEvent` schema and reconciliation logic stay the same — only the event ingestion layer changes.
- Source refresh 2026-06-04 confirms this testnet plan: Base docs list many hosted indexers, but custom viem polling remains simpler for Phase 6; Sui official docs require GraphQL/gRPC instead of new long-lived JSON-RPC dependencies.

Pre-Phase 6 state confirmed (2026-06-02):
- Both KIAIVault.sol (Base Sepolia) and kiai_vault.move (Sui Testnet) are deployed.
- Nagoya Basho 2026 market vault created on both chains (createMarket/create_market called).
- DB has ChainEvent table (0 rows), Trade table (0 rows), UserPosition table (0 rows).
- 1 OrderIntent is SUBMITTED_TO_CHAIN — waiting for indexer to reconcile it.

Architecture reminder: Base and Sui are payment rails only. The LMSR pool lives in the backend (qYes/qNo in the Market table). Indexer reads chain custody events and reconciles positions — it does NOT read pricing data from chain.

One pool, two payment rails means:
- A PositionOpened event on Base and a PositionOpened event on Sui both update the SAME market's portfolio state.
- The reconciliation service must handle events from both chains writing to the same UserPosition rows.
- Dedup key: (chain, txHash, eventType) — already unique in ChainEvent schema.

Scope:

- Normalized chain event schema.
- Base event ingestion.
- Sui event/data ingestion.
- Reconciliation jobs.
- Idempotency and dedupe rules.
- Replay/backfill strategy.
- Lag detection.
- Error and retry handling.
- Portfolio finalization pipeline.

Data flow:

    Chain tx submitted
        |
        v
    Receipt/effects observed
        |
        v
    Raw chain event stored
        |
        v
    Normalized event derived
        |
        v
    Reconciliation job runs
        |
        v
    Trade and position updated
        |
        v
    Portfolio final state visible

Acceptance criteria:

- Indexer can ingest Base and Sui trade events.
- Reconciliation is idempotent.
- Duplicate events do not duplicate positions.
- Lag is visible as indexing_pending.
- Replays are possible from last indexed block/checkpoint.
- Base replays use block/tx/log identity and tolerate RPC timeout, rate limits, replacement, and event-missing cases.
- Sui replays use checkpoint + digest + event identity and tolerate digest visibility lag, failed effects, and GraphQL/gRPC retry.
- Failed reconciliation is visible and retryable.
- Portfolio does not trust optimistic frontend state.

Verification:

- Indexer tests with real or fixture-derived chain event samples.
- Replay tests.
- Duplicate-event tests.
- Lag/error tests.
- Event-missing-after-success tests for both Base receipts and Sui effects.
- Cursor restart/backfill tests for Base blocks and Sui checkpoints.
- Real Base trade reconciles.
- Real Sui trade reconciles.

## Phase 7: Frozen UI Integration

Goal:

- Wire the existing UI to the real backend and execution system without changing the visible product.

Scope:

- Replace mock/static data reads with API client calls.
- Preserve current component props and display shape where practical.
- Add invisible state mapping for loading, blocked, pending, submitted, executed, failed, settling, and settled.
- Connect wallet state for standard EVM and Sui wallet paths.
- Add manual chain selection support using existing UI affordances or minimal invisible wiring.
- Show honest portfolio state from API.
- Preserve English-only product behavior.

Acceptance criteria:

- Existing pages render against API-backed state.
- Trade ticket requests real quotes and creates durable order intents.
- Wallet reject, quote expiry, insufficient gas, unsupported collateral, paused market, and indexer lag are visible as honest statuses.
- Wrong chain, insufficient USDC, Base tx pending/replaced/cancelled/reverted, Sui failed effects, event missing, and unsupported USDT are visible as honest statuses.
- No fake success states remain.
- No visible UI redesign is introduced.
- Manual chain choice works.
- Portfolio final state appears only after reconciliation.

Verification:

- Type check.
- API integration tests.
- Browser smoke on desktop and mobile.
- Wallet-connected manual QA on Base and Sui after contract paths are ready.
- Manual QA must include at least one blocked/failure path per rail: reject signature, wrong network, insufficient gas or collateral, slow indexing, and failed/reverted execution where feasible.
- Visual comparison against frozen UI where practical.

## Phase 8: Resolution, Settlement, Refunds, And Compliance State

Goal:

- Make markets trustworthy from close through settlement.

Scope:

- Written resolution rules for every market: source priority, outcome mapping, close/end condition, and edge cases.
- Resolution policy model: payout mode, payout vector, refund policy, source certainty, unresolvable policy, and rule version.
- Source adapter normalization for the first chosen sport/source pair.
- Official source snapshot workflow with structured evidence bundles.
- Optional sports/result API evidence ingestion after API key, licensing, and source-quality review.
- Resolution proposal.
- Dispute state.
- UMA optional backstop if spike proves practical.
- Settlement jobs.
- Claim/refund handling.
- Compliance policy model.
- Audit trail.
- Incident states.

Acceptance criteria:

- Markets without source policy, edge-case policy, and resolver mode cannot go live.
- Markets without payout/refund policy and unresolvable policy cannot go live.
- Market rules define whether provisional/live source data is UI-only or settlement-eligible.
- Operator can attach source snapshots with URL, fetched payload, timestamp, screenshot/archive reference where practical, and evidence hash.
- Resolution proposal API rejects empty/unstructured evidence snapshots and stores a structured source bundle in `Resolution.sourceSnapshot`.
- Resolution proposal/finalization normalizes to existing outcome slugs and rejects unknown outcome names.
- Resolution finalization cannot bypass the dispute deadline except with the explicit local test override `KIAI_ALLOW_EARLY_RESOLUTION_FINALIZE=true`.
- Final resolution stores a settlement instruction with `sourceCertainty`, `payoutMode`, `payoutVector`, `refundPolicy`, `evidenceBundleHash`, and `ruleVersion`.
- Settlement jobs consume the settlement instruction, not raw API payloads or human-readable market copy.
- Base and Sui settlement jobs are per-rail idempotent and retryable; one rail failing must not change the finalized market outcome or block operator visibility into the other rail.
- Sports markets define postponement, cancellation, draw/no-contest, overtime, forfeit, and too-early handling before trading opens.
- Sports source adapters distinguish not started, live, suspended, delayed, postponed, interrupted, ended-unconfirmed, official-confirmed, cancelled, abandoned, and provider-error states.
- Market can move live -> closed -> resolving -> resolved -> settling -> settled.
- Ambiguous outcomes do not silently resolve.
- Refund/cancel path exists for invalid/cancelled markets.
- Settlement jobs are idempotent and auditable.
- UMA is integrated only if source-gated spike passes. Otherwise it remains documented as later/optional.
- Compliance state is modeled for future production gating without adding KYC vendor in Phase 1.

Verification:

- State-machine tests.
- Settlement tests.
- Refund tests.
- Payout-vector tests: winner-take-all, 50/50 split, fractional/dead-heat, full refund, partial refund.
- Source snapshot and evidence-bundle tests.
- Sports edge-case tests.
- Source-certainty tests: provisional evidence cannot finalize settlement by default; official-confirmed/oracle-final can.
- Source-disagreement tests: official source wins over API prefill, or market enters disputed/manual review if the official source is unavailable/conflicted.
- Audit tests.
- UMA tests only if integrated.
- Browser/API proof of resolution and portfolio settlement.

Implementation tasks:

1. Add `ResolutionRule` data model or JSON contract for rule version, source priority, edge cases, payout/refund policy, and unresolvable policy.
2. Extend resolution evidence schema to include `sourceCertainty`, provider event status, raw payload hash, and source priority rank.
3. Add settlement instruction builder that validates final outcome against market outcomes and produces a payout vector.
4. Add first source adapter for one selected sport/source pair before building a generic sports abstraction.
5. Add operator UI/API gates so markets cannot publish without source, edge-case, payout/refund, and unresolvable policies.
6. Add dispute/adjudication state transitions for source disagreement, oracle challenge, evidence tampering concern, and manual safety override.
7. Add settlement jobs for Base and Sui that are idempotent, retryable, and read only finalized settlement instructions.
8. Add archive/hash path for official source snapshots and API payloads.
9. Add per-rail settlement failure states for Base receipt revert, Sui failed effects, chain RPC outage, and event/indexer lag.
10. Keep DeFi protocol state out of settlement. Settlement consumes KIAI payout vectors only, not DEX, bridge, lending, or liquidity protocol output.

Autoplan review notes, 2026-06-04:

- CEO/product: the user-facing promise is not "we use an oracle"; it is "you can see exactly how this market resolves before trading." Product copy and operator tooling must expose edge cases and payout/refund behavior.
- Engineering: the resolver must produce a settlement instruction with payout vector. This is the clean boundary between ambiguous off-chain evidence and deterministic chain settlement.
- DX/operator: Phase 8 needs a copy-paste-complete operator example for the first sport/source adapter, including sample evidence payload, expected proposal body, and expected settlement instruction.
- Deferred: a generic all-sports resolver is too broad. Build one complete vertical source adapter first, then generalize from real friction.

Phase 8 implementation progress, 2026-06-04:

- Implemented strict resolution evidence extensions for source certainty, provider event status, raw payload hash, source priority rank, and optional resolution rule JSON.
- Implemented `lib/domain/resolution-policy.ts` as the settlement-instruction contract: source certainty validation, payout modes, refund policy, payout vectors, rule version, and deterministic evidence bundle hash.
- Updated admin finalization to store a settlement instruction inside `Resolution.sourceSnapshot` and return it from the resolution API.
- Winner-take-all remains backward compatible with existing `finalOutcome` calls.
- Split, void/refund, fractional, and manual payout modes are represented in the settlement instruction.
- Added durable per-rail `SettlementJob` records with status/action/attempt/error/tx hash fields and a unique `resolutionId + chain` idempotency key.
- Added `GET/POST /api/admin/markets/:id/settlement` for operator settlement visibility, job preparation, full-market runs, and explicit job retry.
- Added Base `cancelMarketOnChain` and Sui `cancelMarketOnSui` helpers for full-refund settlement.
- Added a settlement runner that consumes only finalized settlement instructions. Current deployed vaults can execute `winner_take_all` as resolve and `void_refund + full_refund` as cancel/refund. `split_50_50`, `fractional`, `manual`, partial refund, and no-winning-share winner-take-all cases are blocked with explicit job errors until contracts or off-chain remediation support them.
- Verified this slice with `pnpm exec prisma validate`, `pnpm exec prisma generate`, `pnpm exec tsx tests/resolution-policy.test.ts`, `pnpm exec tsx tests/settlement-plan.test.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.
- Added the first launch source adapter: `lib/domain/source-adapters/sumo-jsa.ts` for Nihon Sumo Kyokai/JSA official tournament-winner evidence.
- Added `POST /api/admin/markets/:id/source-adapters/sumo-jsa` to produce a reviewed `sourceSnapshot` and suggested resolution proposal for Nagoya/sumo markets.
- Added the first generic sports event API adapter: `lib/domain/source-adapters/api-football.ts` plus `POST /api/admin/markets/:id/source-adapters/api-football`. It fetches API-FOOTBALL fixture results with an operator-provided outcome map, normalizes final/live/postponed/cancelled/abandoned statuses, hashes the raw API payload, and returns prefill evidence without bypassing source-certainty or dispute rules.
- Updated resolution proposal flow so non-outcome settlement proposals such as `void_refund` can enter the dispute window without inventing a fake winning outcome.
- Verified adapter behavior with `pnpm exec tsx tests/sumo-jsa-source-adapter.test.ts` and `pnpm exec tsc --noEmit`.
- Added market-level `resolutionPolicy` JSON and `PUT/GET /api/admin/markets/:id/resolution-policy` so markets can store source priority, edge-case rules, resolver mode, payout mode, refund policy, and source-certainty policy before trading.
- Added lifecycle gating: future transitions toward `REVIEWED`, `DEPLOY_PENDING`, or `LIVE` require a valid market resolution policy.
- Added first-class Phase 8 governance records and APIs:
  - `EvidenceSnapshot` plus `GET/POST /api/admin/markets/:id/evidence`
  - `ResolutionDispute` plus `GET/POST /api/admin/markets/:id/disputes` and `PATCH /api/admin/markets/:id/disputes/:disputeId`
  - `OracleAssertion` plus `GET/POST /api/admin/markets/:id/oracle-assertions`
- Resolution proposal now automatically archives its primary source evidence into `EvidenceSnapshot`.
- Added governance tests for market policy, evidence snapshot hashing, dispute inputs, and oracle assertion metadata.
- Added first browser-testable operator console at `/en/operator` for Phase 8 governance operations:
  - session-local bearer-token entry for existing admin APIs without exposing `OPERATOR_SECRET` in rendered HTML
  - admin market selection and lifecycle transition controls
  - resolution policy JSON editor using the market's real outcome slugs
  - evidence snapshot creation, Sumo/JSA adapter prefill, resolution proposal submission, oracle assertion recording, dispute open/resolve, and settlement job prepare/run controls
  - governance record panels for evidence snapshots, disputes, oracle assertions, and settlement jobs
- Added `lib/operator-console/default-payloads.ts` and `tests/operator-console-defaults.test.ts` so operator JSON drafts are deterministic and test-covered.
- Added local authenticated evidence archiving for raw source/API payloads:
  - `lib/server/evidence-archive.ts` writes JSON artifacts under `RESOLUTION_EVIDENCE_ARCHIVE_DIR` or `.kiai/evidence-archive`
  - `createEvidenceSnapshot` automatically archives raw payloads when no explicit archive URL is supplied
  - `GET /api/admin/evidence-archive/:hash` returns the archived artifact behind the existing operator bearer-token gate
  - `tests/evidence-archive.test.ts` covers write/read, URL/path generation, and hash normalization
- Added operator-console archive inspection so evidence rows with internal archive URLs can fetch and preview the exact archived JSON artifact during manual review.
- Phase 1 settlement decision: do not upgrade Base/Sui vault contracts for split/fractional/manual payouts before founder acceptance. Keep those settlement instructions represented in backend policy, but block chain execution with explicit settlement-job errors and handle only approved manual/off-chain remediation if such a market is created.

Phase 8 closure boundary:

1. Automated and operator-browser smoke can cover the implemented governance path.
2. Founder/operator manual acceptance is still required before claiming Phase 8 product acceptance.
3. Hosted object storage/screenshot capture, production role-based admin auth, audit search, safer form widgets, UMA collateral/network spike, and broader payout contract upgrades move to the Phase 9/production-hardening boundary unless the founder explicitly pulls one back into Phase 8.

## Phase 9: Market Catalogue Rollout

Source gate addendum, refreshed 2026-06-04:

- Every new market must confirm rail availability, collateral support, and source/resolution policy before publish.
- Market catalogue expansion must not add USDT, DeFi routing, bridges, yield, or liquidity protocols by category implication. Those require separate source-gated spikes.
- For each first market in a category, include a product/engineering edge-case checklist: cancellation, postponement, draw/no-contest, ambiguous source data, delayed official result, chain rail outage, unsupported collateral, and settlement retry.

Goal:

- Populate the first release with deck-aligned breadth while maintaining real execution constraints.

First demo set:

1. Nagoya basho winner.
2. Daily Yokozuna bout prop.
3. Summer Koshien winner.
4. NPB Central League pennant.
5. Japan Diet party seat threshold.
6. EPL match outcome.
7. F1 race winner.
8. Akutagawa Prize winner.

Deck verticals:

- Sumo.
- Koshien.
- NPB.
- J-League.
- Rizin.
- K-1.
- EPL, La Liga, UCL.
- NBA, NFL, MLB.
- F1.
- UFC.
- Tennis slams.
- Cricket IPL and ICC.
- Japan Diet.
- Prefectural governor races.
- US presidential and midterms.
- UK, EU, Korea elections.
- Olympics.
- Asian Games.
- LoL and Valorant esports.
- Oscars.
- Akutagawa Prize.
- Bank of Japan rate decisions.

Acceptance criteria:

- Market seed/operator data covers all first demo set items.
- Every market has category, outcomes, close time, source policy, resolution rule, and chain deployment plan.
- Markets without valid source policy cannot go live.
- Politics remains included for testnet development.
- Public real-money claims remain absent.
- Existing UI can browse the breadth without visible redesign.

Verification:

- Seed/operator tests.
- Market validation tests.
- Browser smoke across categories.
- Resolution-source checklist for each demo market.

Implementation status, updated 2026-06-05:

- Code-complete baseline:
  - `lib/market-catalogue/demo-markets.ts` is now the Phase 9 source of truth for the eight demo markets.
  - `lib/market-catalogue/policies.ts` builds validated `resolutionPolicy` contracts for every demo market before seed/runtime use.
  - `prisma/seed.ts` idempotently syncs all eight markets, outcomes, compliance records, pending resolution records, and Base/Sui chain deployment plans.
  - Seed now archives superseded old demo slugs only when they are safe drafts/reviewed markets with no order intents; it writes an `OperatorAction` audit record instead of deleting history.
  - Admin-created markets that submit `sourcePolicyEn` now persist an initial `resolutionPolicy` instead of discarding the source-policy input.
  - `/api/markets?preview=catalogue` and `/en/markets?preview=catalogue` provide catalogue QA visibility over the eight Phase 9 demo markets without changing normal public market visibility or making draft markets tradable.
- Current first demo set in code:
  1. `nagoya-basho-2026-winner`
  2. `yokozuna-terunofuji-nagoya-2026-record`
  3. `summer-koshien-2026-winner`
  4. `npb-central-league-pennant-2026`
  5. `japan-house-councillors-2028-coalition-majority`
  6. `epl-2026-27-opening-weekend-featured-match`
  7. `f1-abu-dhabi-gp-2026-winner`
  8. `akutagawa-prize-2026-second-half`
- Manual/founder gate still required before beta/public claims:
  - Review each market's English/Japanese copy and outcome set.
  - Review each written source policy and edge-case rule.
  - Decide which draft markets should transition to `REVIEWED`, then deploy rails before any live trading claim.
  - Politics remains testnet/development-only until compliance/legal approval.
- Verification run 2026-06-05:
  - `pnpm exec tsx tests/market-catalogue.test.ts`
  - `pnpm exec tsx tests/market-resolution-policy.test.ts`
  - `pnpm exec tsx tests/resolution-policy.test.ts`
  - `pnpm exec tsx tests/settlement-plan.test.ts`
  - `pnpm exec tsx tests/sumo-jsa-source-adapter.test.ts`
  - `pnpm exec tsx tests/resolution-governance.test.ts`
  - `pnpm exec tsx tests/operator-console-defaults.test.ts`
  - `pnpm exec tsx tests/operator-console-archive-records.test.ts`
  - `pnpm exec tsx tests/evidence-archive.test.ts`
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm exec tsx prisma/seed.ts`
  - Direct database verification confirmed 8/8 demo markets policy-ready with Base and Sui deployment plans, and confirmed the three superseded demo slugs are `ARCHIVED`.

## Phase 10: Security, Observability, Operations, And Beta Readiness

Goal:

- Make the controlled testnet beta operable and honest.

Scope:

- Contract security review checklist.
- Access control review.
- Secrets/env handling.
- Rate limits and abuse controls where needed.
- Structured logs.
- Metrics for quote/order/tx/indexer/settlement.
- Operator runbooks.
- Deployment runbooks.
- Source-refresh runbook for Base, Sui, Circle, Tether, and indexer docs before beta changes.
- Rail-specific incident response for Base pending/replaced/cancelled/reverted transactions and Sui failed effects/digest/indexer lag.
- Incident response.
- Manual founder QA checklist.
- Beta readiness report.

Acceptance criteria:

- No secret is committed.
- Required env vars are documented.
- Contract admin/operator permissions are reviewed.
- Indexer lag and reconciliation failures are observable.
- Failed trades and blocked trades are visible in logs/audit.
- Unsupported collateral, stale token address, RPC outage, event-missing, and settlement retry states are observable.
- Deployment scripts are repeatable.
- Runbooks cover Base deploy, Sui deploy, indexer restart, market pause, failed settlement, and rollback.
- Runbooks explicitly say DeFi protocols, bridges, swaps, yield, and sponsored-gas paths are not emergency fallbacks unless separately approved and source-gated.
- Founder manual QA checklist is complete.

Verification:

- Security checklist completed.
- Type check passes.
- Relevant tests pass.
- Real-chain smoke tests pass.
- Browser wallet QA evidence recorded.
- Beta readiness report names remaining risks.

Implementation status, updated 2026-06-05:

- Code-complete Phase 10 baseline:
  - `GET /api/admin/ops/status` is the read-only operator status endpoint for controlled beta readiness.
  - `lib/server/ops-status.ts` checks required env presence without exposing secret values, source-refresh freshness, market lifecycle counts, chain deployment state, indexer backlog, failed/blocked orders, settlement job problems, open disputes, oracle assertion status, and recent operator audit actions.
  - `/en/operator` can fetch and display the ops status JSON through the existing bearer-token workflow.
  - `.env.example` and `docs/DEPLOYMENTS.md` document `KIAI_SOURCE_REFRESHED_AT` for source-pack refresh tracking.
  - `docs/RUNBOOKS.md` now covers beta readiness, Base deploy, Sui deploy, indexer restart, market pause, failed settlement, incident response, and explicit non-fallbacks.
  - `docs/BETA_READINESS.md` records the current controlled-beta readiness state and the remaining founder/operator review gates.
  - `tests/ops-status.test.ts` covers placeholder env detection, source-refresh age handling, and readiness classification.
- Phase 10 audit continuation:
  - Local `.env` now records a source-refresh timestamp through `KIAI_SOURCE_REFRESHED_AT`; the actual `.env` file and secrets remain uncommitted.
  - Local `OPERATOR_SECRET` was rotated because the previous local token was shorter than the controlled-beta recommendation. The value must not be printed or committed.
  - New operator audit IDs are hash-derived instead of bearer-token prefixes, so future audit rows stay correlatable without exposing token characters.
  - Stale Base order `cmpwbv9w30002eismg4eo8z0y` was marked `CHAIN_FAILED` after its receipt proved the stored tx hash was the vault deployment transaction, not a user trade event.
  - The failed-order classification is intentionally visible in ops status and was recorded through an operator audit action.
  - Base/Sui real-chain smoke checks confirmed the configured Base vault has bytecode and configured Sui registry/market objects are readable.
  - 2026-06-06 automated QA re-ran focused tests, typecheck, zero-warning lint, build, live admin ops API smoke, market preview API smoke, and browser smoke. `package.json` now exposes `pnpm test`, `pnpm typecheck`, and `pnpm verify` for repeatable readiness checks; `pnpm verify` passed end to end. Readiness remains `needs_review` because one failed/blocked order is still intentionally visible and actual wallet QA is still a founder/operator gate.
- Current readiness semantics:
  - `blocked` means at least one blocker exists, such as missing core env, unsupported collateral, deployed rails missing addresses, stale unreconciled chain events, or failed/blocked/retrying settlement jobs.
  - `needs_review` means warnings remain, such as missing execution private keys in a non-settlement context, stale/missing source refresh, pending reconciliation, failed/blocked orders, deployed rails without index cursors, or open disputes.
  - `ready_for_founder_qa` means no blockers or warnings from the implemented status checks. It is not a mainnet or real-money approval.
- Manual/founder gate still required:
  - Run the runbooks with actual wallets/RPC state.
  - Record browser wallet QA evidence for Base and Sui.
  - Review the beta readiness JSON and `docs/BETA_READINESS.md` before any beta claim.
  - Keep DeFi, bridges, swaps, yield, sponsored gas, and USDT out of emergency fallback scope.

## Worktree Parallelization Strategy

Use parallel work only after Phase 1 closes core decisions. Parallelism before source decisions will create rework.

Dependency table:

| Workstream | Modules Touched | Depends On |
|---|---|---|
| Source audit and decisions | docs | none |
| Backend foundation | app/api, lib/domain, database, tests | source audit |
| Operator surface | app/operator or admin routes, operator APIs, audit models | backend foundation |
| Base rail | contracts/base, scripts/base, lib/execution/base, tests | source audit, mechanism, collateral |
| Sui rail | contracts/sui, scripts/sui, lib/execution/sui, tests | source audit, mechanism, collateral |
| Indexers | indexers, lib/reconciliation, database, tests | backend foundation, rail event specs |
| Frozen UI integration | app, components, lib/api-client | backend API contract |
| Resolution/settlement | lib/resolution, APIs, contracts, jobs, tests | backend foundation, rail contracts |
| Ops/security | docs, scripts, env docs, monitoring | after concrete runtime paths exist |

Parallel lanes:

- Lane A: Backend foundation -> API contract -> domain tests.
- Lane B: Base rail contracts and execution.
- Lane C: Sui rail contracts and execution.
- Lane D: Operator surface after Lane A starts stabilizing.
- Lane E: Indexers after Base and Sui event specs exist.
- Lane F: UI integration after Lane A APIs exist and after at least one rail has an execution path.
- Lane G: Resolution/settlement after contract lifecycle states exist.
- Lane H: Ops/security after real runtime paths exist.

Execution order:

1. Run Phase 1 source audits first.
2. Launch Lane A, Lane B, and Lane C in parallel only after mechanism and collateral decisions are recorded.
3. Merge event schema decisions before Lane E.
4. Run Lane F after API contracts stabilize.
5. Run Lane G after close/resolve/claim contract paths are implemented.
6. Run Lane H throughout but finalize after real end-to-end paths exist.

Conflict flags:

- Backend foundation and indexers both touch database schema. Coordinate migrations.
- UI integration and API contract both touch data shapes. Freeze API schemas before broad wiring.
- Base and Sui rails both influence normalized event schema. Define event vocabulary before independent implementation drifts.
- Operator surface and resolution flows both touch market lifecycle state. Keep one state machine.

## Phase-Specific Task Plan Requirements

Before coding any phase, create a phase task plan with this structure:

- Goal.
- Assumptions.
- Source audit links.
- Dependencies.
- Files likely touched.
- Exact tasks.
- Acceptance criteria.
- Verification commands.
- Manual QA steps.
- Failure modes.
- Rollback plan.
- Documentation updates.
- Done evidence.

Task sizing rules:

- Prefer small and medium tasks.
- Break any task that touches more than 5 files.
- Break any task with more than 3 acceptance criteria.
- Avoid tasks with "and" in the title unless the work is a single inseparable flow.
- Add checkpoints after every 2 or 3 tasks.
- Every task must leave the system in a working or explicitly blocked state.

## Engineering Review Findings To Preserve

Scope challenge:

- Building both chains, indexers, APIs, admin, resolution, and all categories is large. The right implementation order is not to narrow the product, but to prove one real end-to-end vertical slice first, then broaden.
- The first vertical slice should include one market, one outcome model, one collateral per chain where verified, one Sui deployment, one Base deployment, one quote/order path, one indexer path, and portfolio reconciliation.
- A true unified cross-chain router is not Phase 1 unless explicitly re-scoped. Per-chain deployments under one product market are the safer first model.
- UMA should not block baseline resolution unless the spike proves it is practical.

Architecture risks:

| Risk | Impact | Recommendation |
|---|---|---|
| Dual-chain liquidity fragmentation | Users see inconsistent prices and liquidity | Implement one market identity with per-chain deployments first |
| Collateral uncertainty | Wrong assets break trust and tests | Verify via Circle, Tether, Sui sources before coding |
| Indexer lag | Users may see stale portfolio | Expose indexing_pending and reconcile only after confirmed observation |
| Operator mistakes | Bad markets or wrong outcomes can go live | Require draft/review/deploy/resolve audit workflow |
| Over-adoption of ecosystem tools | Too many moving parts before proof | Standard wallets and direct execution first |
| Legal/compliance ambiguity | Real-money claims create risk | Testnet only and no Japan real-money claim |

Performance risks:

- Market list should not query chain live on every page load.
- Portfolio should read reconciled backend state, not fan out to every chain/provider at render time.
- Indexers should process incrementally from last block/checkpoint.
- Quote generation must have expiry and must not rely on stale market state.
- Operator dashboards should paginate audit logs and events.

## Manual Founder Acceptance Checklist

The founder manually validates after automated checks pass.

Base path:

1. Open current KIAI UI.
2. Connect EVM wallet.
3. Choose Base.
4. Open a real API-backed market.
5. Request quote in verified Base collateral.
6. Submit trade.
7. Confirm wallet transaction.
8. Verify Base Sepolia transaction hash and receipt.
9. Wait for indexing/reconciliation.
10. Confirm portfolio reflects reconciled position.
11. Reject a wallet transaction and verify no fake success.
12. Trigger or simulate insufficient gas/collateral and verify honest block.

Sui path:

1. Open current KIAI UI.
2. Connect Sui-compatible wallet.
3. Choose Sui.
4. Open a real API-backed market.
5. Request quote in verified Sui collateral.
6. Submit real Sui testnet transaction.
7. Confirm wallet interaction.
8. Verify digest/effects.
9. Wait for indexing/reconciliation.
10. Confirm portfolio reflects reconciled position.
11. Reject a wallet transaction and verify no fake success.
12. Trigger or simulate failed effects and verify honest failure.

Resolution path:

1. Operator closes market.
2. Operator records structured official source snapshot: rule summary, source URLs/API payload references, fetched timestamps, provider event status, source certainty, edge cases, resolver mode, optional evidence hash, and optional oracle metadata.
3. Operator proposes outcome; backend canonicalizes it to an existing outcome slug.
4. Resolver builds a draft settlement instruction with payout mode, payout vector, refund policy, evidence hash, and rule version.
5. Market enters resolving and resolution enters dispute window.
6. Outcome finalizes only after the dispute window, or dispute/manual adjudication state is visible.
7. Settlement job runs from the finalized settlement instruction.
8. User position becomes claimable or settled.
9. Failed settlement remains visible and retryable.

## Documentation Update Rules

Update docs when any of these change:

- Source pack resource changes.
- Chain/collateral/indexer decision changes.
- Mechanism decision changes.
- API contract changes.
- Market lifecycle state changes.
- Deployment process changes.
- Test command changes.
- Manual QA checklist changes.
- Known limitations or blocked decisions.

Do not create doc sprawl unless the new artifact has a distinct job. Prefer updating the canonical four docs:

- docs/PRODUCT.md for product decisions.
- docs/ARCHITECTURE.md for system and data architecture.
- docs/RESEARCH.md for source audits and resource packs.
- docs/PLAN.md for execution plan and prompts.

## Pre-Implementation Checklist

Before writing code in any future session:

- Read docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/RESEARCH.md, docs/PLAN.md.
- Confirm current git status and do not revert unrelated user changes.
- Identify the phase and exact task.
- Refresh required source pack.
- Record source audit.
- State assumptions.
- State what is not in scope.
- Identify files likely touched.
- Define acceptance criteria.
- Define validation commands.
- Confirm no visible UI redesign is planned.
- Confirm no fake runtime path is planned.

## Completion Checklist

A future implementation phase is not done until:

- Source gate was completed and recorded.
- Tests relevant to the phase passed.
- Contract deploy/execution proof exists if chain work was in scope.
- Backend records are persisted.
- Indexer or confirmed chain observation reconciles portfolio state.
- Browser wallet flow is verified when user-facing execution is in scope.
- docs are updated for any changed decisions.
- Diff is reviewed for unrelated changes.
- Remaining risks are reported honestly.

## GSTACK REVIEW REPORT

Autoplan run: 2026-06-04 IST

Scope reviewed:

- Product resolution promise for sports and other off-chain events.
- Engineering boundary between resolver evidence, payout semantics, and Base/Sui settlement.
- OSS prediction-market references from `/Users/sourabhkapure/Desktop/prediction_market researhc`.
- Live/current references: Polymarket resolution/dispute docs, UMA OOv2/OOv3 docs, Sportradar event/settlement docs, Chainlink Functions/Automation docs, and Reality.eth/Kleros docs.

Decisions made:

| Decision | Classification | Rationale |
|---|---|---|
| Keep KIAI v1 baseline as operator-reviewed official source snapshots, not mandatory UMA. | Product/engineering | UMA remains useful, but cost, collateral, deployment, bond, and Sui mirroring questions are still open. |
| Add payout-vector planning before settlement jobs. | Engineering | Winner-only strings cannot represent 50/50, refund, half-void, dead heat, or fractional outcomes safely. |
| Require source certainty before finalization. | Product/engineering | Sports feeds distinguish provisional/live results from official confirmed results; KIAI settlement should not finalize from provisional data by default. |
| Build one complete sport/source adapter first. | Scope | A generic sports resolver would hide too many sport-specific edge cases. |
| Treat Chainlink Functions as API ingestion, not truth. | Engineering | Functions can fetch and transform data, but source quality/licensing/finality remain KIAI responsibilities. |
| Keep Reality.eth/Kleros as later research. | Scope | It supports subjective oracle arbitration, but likely adds slower dispute operations than Phase 8 needs. |

Cross-phase themes:

- Product: users must know how a market resolves before trading, including cancellation/refund and unresolvable policies.
- Engineering: settlement must consume a finalized settlement instruction, not raw API payloads, screenshots, or market copy.
- Operations: official source snapshots, payload hashes, and audit events are not optional; they are how KIAI defends a final outcome.

Deferred items:

- Exact first sports/source adapter.
- Paid sports API provider and licensing decision.
- UMA version/network/collateral/bond spike.
- Evidence archive storage.
- Dedicated `ResolutionRule`, `ResolutionSource`, `OracleAssertion`, `Dispute`, and settlement-instruction persistence model.

## Final Critical Reminder

The visible UI is frozen.

The runtime must be real.

Official sources win.

No fake trades, no fake receipts, no fake digests, no fake portfolio state.

If a future agent cannot prove a claim from code, tests, docs, runtime, chain data, or browser behavior, it must not claim it.
