# KIAI Research Notes

## Purpose

This file records the external checks used to correct the Stage 0 docs. It is intentionally short. Current direction: the UI is frozen; implementation work is backend, APIs, contracts, indexers, and real testnet logic. The research bar is strict: use current Context7 docs, Base docs, Sui docs, Firecrawl, and web search before implementing chain logic.

Build discipline source: the project follows Karpathy-style implementation practice: surface assumptions, keep changes simple, make surgical edits, and define verifiable goals. Manual founder testing in the browser with connected wallets is part of acceptance, not a substitute for automated tests or testnet proof.

## Pitch Deck Sources

- Original PDF: `/Users/sourabhkapure/Downloads/【Product】KIAI_PitchDeck_v3.pdf`
- LLM-ready folder: `/Users/sourabhkapure/Downloads/LLM-ready-KIAI_PitchDeck_v3/`
- Full Markdown extraction: `ea70012a96474b819ffb584c681f43dd_md_full.md`
- Page OCR JSON: `ea70012a96474b819ffb584c681f43dd_ocr_page*.json`

Deck facts preserved:

- KIAI is The Spirit Engine.
- Multi-chain prediction markets on Sui and Base.
- Japan plus global reach.
- Sports, politics, culture.
- $5M seed ask.
- Product layers: markets, chain, trust.
- Architecture: PWA, LINE Mini App, Farcaster, KIAI router, Sui rail, Base rail, official feeds, UMA.

## Web Research

### Japan Gambling And Sports Betting

Source:

- ICLG Japan Gambling Laws and Regulations 2026: https://iclg.com/practice-areas/gambling-laws-and-regulations/japan

Relevant finding:

- The source describes private-sector digital gambling as generally prohibited in Japan, with narrow permitted public-sector betting/lottery categories. It also notes sports betting legalization discussions and opposition.

Product implication:

- Do not treat Japan real-money prediction markets as available by default.
- Phase 1 uses real testnet trading on Sui and Base unless counsel confirms a compliant real-money path.
- Do not present mock or simulated trading as product behavior.
- Region, KYC, and legal policy states should be modeled for future production controls, but Phase 1 development has no KYC vendor and no Japan or politics testnet guardrails.

### Sui zkLogin And Sponsored Transactions

Sources:

- Sui zkLogin docs: https://docs.sui.io/sui-stack/zklogin-integration/
- Sui sponsored transactions docs: https://docs.sui.io/develop/transaction-payment/sponsor-txn
- Context7: `/mystenlabs/sui` and `/websites/sdk_mystenlabs`
- Sui TypeScript SDK docs: https://sdk.mystenlabs.com/
- Firecrawl/online search: Sui sponsored transaction and programmable transaction block docs.

Relevant finding:

- Sui dApp Kit is the official SDK path for Sui applications and integrates wallets that implement the Wallet Standard.
- Wallet Standard supports connect, events, personal-message signing, transaction signing, and sign-and-execute transaction features.
- zkLogin requires ephemeral key pair, OAuth JWT, user salt, zero-knowledge proof, address derivation, ephemeral transaction signature, and zkLogin signature submission.
- Sponsored transactions require a sponsor/gas-owner flow.
- Sui transaction builders create programmable transaction blocks. Sponsored flows can be built from transaction kind bytes and then configured with sender, gas owner, and sponsor gas payment.
- Sui docs describe waitForTransaction after submission to ensure the transaction has been indexed before querying effects.
- Sui transaction execution can finalize before subsequent object/balance queries reflect indexed effects, so the backend must wait for transaction indexing before updating portfolio-visible state.

Product implication:

- Implement standard Sui wallet connection first through Wallet Standard / Sui dApp Kit.
- Do not describe zkLogin as a simple OAuth login.
- zkLogin remains important but follows the standard wallet proof because it needs proof/salt backend work.
- No gas sponsorship in Phase 1. Users must hold required Sui testnet gas.
- Sui rail implementation needs a real execution service, deployment records, transaction digest/effects capture, and indexer reconciliation.
- Sui collateral target is USDsui or the closest verified real Sui testnet stablecoin equivalent.
- A Sui trade path is not complete until a real package/object id, transaction digest, effects status, event/indexer record, and portfolio reconciliation exist.

### Base / Coinbase Wallet Path

Source:

- Base official smart contract deployment docs: https://docs.base.org/get-started/deploy-smart-contracts
- Coinbase Developer Platform non-custodial wallet docs: https://docs.cdp.coinbase.com/wallets/non-custodial-wallets/overview
- Viem docs through Context7: `/wevm/viem`
- Firecrawl/online search: viem simulateContract, writeContract, and transaction receipt docs.

Relevant finding:

- CDP non-custodial wallets support embedded wallets controlled by users through email, SMS, or social login, while users retain custody.
- Viem supports a backend execution pattern where a public client simulates a contract write, a wallet client broadcasts it, and the system waits for a transaction receipt before marking it final.
- Base official docs use Foundry for contract deployment, Base Sepolia for testnet development, and explorer/RPC verification after deployment.

Product implication:

- Use current wording like CDP non-custodial/embedded wallet path rather than relying only on the deck phrase "Coinbase Smart Wallet."
- Implement normal EVM wallet connection first, then CDP embedded/non-custodial wallet once the contract write path is correct. Both are in scope.
- Base rail implementation must use simulateContract as a preflight validation step before broadcast, persist tx hashes/receipts, and map failed receipts or reverts into structured API errors.
- Base collateral target is USDC and USDT on Base Sepolia or the closest verified real testnet equivalents.
- No Base paymaster or gas sponsorship in Phase 1.
- A Base trade path is not complete until a real Base Sepolia contract address, transaction hash, receipt status, emitted event/indexer record, and portfolio reconciliation exist.

### UMA Optimistic Oracle

Source:

- UMA docs: https://docs.uma.xyz/

Relevant finding:

- UMA positions Optimistic Oracle V2 as a fit for prediction markets and sports betting style use cases; OOv3 is more assertion/escalation-manager oriented.
- UMA is not assumed to be cost-free. The implementation must verify testnet availability, supported collateral, proposer/disputer bonds, final fees, and operational flow before making it a required v1 dependency.

Product implication:

- V1 resolution baseline is official public-source snapshots with operator review.
- Use UMA OOv2 as the first backstop research target only after a technical spike proves practical network/cost/collateral support.

### Farcaster

Source:

- Farcaster Mini Apps docs: https://miniapps.farcaster.xyz/docs/getting-started

Relevant finding:

- Current Farcaster docs describe Mini Apps as web apps discovered and used inside Farcaster clients. They can access native features such as authentication, notifications, and wallet interaction.

Product implication:

- Use "Farcaster Mini App" in current planning. Mention Frames only as deck/legacy wording.

### LINE Mini App

Source:

- LINE Mini App docs: https://developers.line.biz/en/docs/line-mini-app/

Relevant finding:

- LINE Mini Apps have their own development, authorization, design, submission, service-operation, and policy docs.

Product implication:

- LINE is a distribution phase, not a core backend blocker. It reuses core APIs and respects LINE review/policy flow.

## Corrected Planning Assumptions

- The UI is frozen. Do not redesign, relayout, rewrite, or visually change it during backend implementation.
- This is a real implementation. Runtime mocks, fake receipts, fake transaction hashes, placeholder contracts, and simulated success states are not acceptable.
- Real-money Japan launch is legally gated.
- Phase 1 trading is real testnet execution, not simulation.
- Both Sui and Base are in scope as real rails from day one.
- English is the only current product language.
- Sports, politics, culture, esports, and special-event markets are all in first-release scope.
- Sui standard wallet connection is first; zkLogin needs real backend/proof/salt work after that.
- Gasless Sui UX needs sponsored transaction/gas station design later, but Phase 1 has no gas sponsorship.
- Sui execution needs real PTB construction, signatures, digest/effects storage, and indexing waits.
- Base onboarding includes normal EVM wallet connection and current CDP wallet primitives.
- Base execution must use viem-style simulateContract -> writeContract -> wait-for-receipt flow.
- Contract implementation must be sourced from current docs and verified with tests plus real testnet deployments.
- Sui collateral target: USDsui or the closest verified real testnet equivalent.
- Base collateral target: USDC and USDT on Base Sepolia or closest verified real testnet equivalents.
- UMA is treated as a possible resolver/dispute workflow, not magic truth and not assumed free.
- Farcaster is planned as Mini Apps.
- LINE Mini App is staged after the core PWA/API.
- Founder manual browser wallet testing is required after automated validation and before acceptance.
- Wallet-first identity. No KYC vendor and no development-stage Japan/politics guardrails in Phase 1.
- Users manually choose Sui or Base.
- V1 market creation is KIAI internal-operator only.
- Portfolio finalization waits for backend/indexer confirmation; pending state must be labeled as pending.

## Sui Official Source Pack

This is the required Sui resource list for KIAI. Future agents must directly refer to this section before doing any Sui implementation work. These resources are not optional background reading; they are the minimum source pack for contracts, wallet code, Sui execution services, indexers, collateral assumptions, testnet deployment, and Sui ecosystem decisions.

These sources were scraped with Firecrawl and checked with browser tooling on 2026-05-25. Future Sui implementation work must refresh them before touching contracts, wallet code, Sui execution services, indexers, collateral assumptions, or deployment scripts.

Required source pack:

- Sui Founder Starter Pack: https://www.sui.io/founder-starter-pack
- Sui Builder FAQ: https://www.sui.io/faq
- Sui DeFi: https://www.sui.io/defi
- Launch on Sui: https://www.sui.io/launch-on-sui
- Sui Develop docs: https://docs.sui.io/develop
- Sui docs home: https://docs.sui.io/
- Awesome Sui: https://github.com/sui-foundation/awesome-sui/tree/main
- Sui TypeScript SDK / dApp Kit docs through Context7: /websites/sdk_mystenlabs

Source roles:

- docs.sui.io is the implementation authority for Sui architecture, object model, Move packages, package deployment/upgrades, testing/debugging, programmable transaction blocks, transaction payment, data access, cryptography, Sui CLI, Sui RPC/API, SDKs, and Move framework references.
- sdk.mystenlabs.com and Context7 /websites/sdk_mystenlabs are the authority for TypeScript SDK and dApp Kit API shape. The current dApp Kit path centers on building a Transaction, calling signAndExecuteTransaction, handling explicit failed transaction results, and storing the real transaction digest.
- Launch on Sui is the launch checklist. It points to getting started docs, Sui docs, Enoki, Walrus, the Move Book, Awesome Sui, Account.Tech, Sui forums, Developer Relations office hours, dApp Kit, Rust SDK, Slush Wallet, Sui Kiosk, DeepBook, zkLogin, testnet faucet resources, testnet USDC, audit partners, wallets, onramps, RPC providers, analytics, and ecosystem submission paths.
- Founder Starter Pack is an operational support page. It records cloud credits, testnet Sui faucets, testnet USDC on Sui, founder education, events, hackathons, Sui community routes, and support channels.
- Builder FAQ is the builder escalation and support page. It points builders to Sui Docs, Enoki Docs, Walrus Docs, Discord, Developer Relations office hours, RFP grants, academic research awards, hackathons, co-marketing guidelines, Hydropower, and founder resources.
- Sui DeFi is a product/ecosystem signal page for KIAI's Sui rail. It highlights Sui's DeFi positioning around Move, object-centric design, low-latency execution, parallel execution, PTBs, DeepBook, stablecoins, trust-minimized bridges, zkLogin, and sponsored transactions. It informs research but does not replace implementation docs.
- Awesome Sui is a curated discovery index for tooling, SDKs, Move IDEs, faucets, security tools, and dApp development resources. Treat it as a map, not a final authority; verify every adopted package against its upstream repo and current official docs.

Future-agent rules:

- Do not start Sui Move, wallet, transaction, indexer, or deployment work from memory. Re-scrape or re-read the source pack and record the date, URLs, package versions, network names, and any changed assumptions in this file.
- Do not invent Sui collateral availability. Verify USDsui, testnet USDC on Sui, or any equivalent stablecoin against official/current sources before wiring it into contracts or API validation.
- Do not treat zkLogin, Enoki, sponsored gas, DeepBook, Kiosk, or third-party RPC/indexing services as default dependencies. Each needs a small spike with docs, cost/availability, testnet support, failure modes, and integration complexity.
- Prefer the simplest real testnet path first: standard Sui wallet connection through Wallet Standard / dApp Kit, real Move package deployment, real transaction digest/effects capture, event ingestion, and portfolio reconciliation after indexing.
- If Sui implementation blocks on unclear behavior, use the Sui Developer Forum, Discord, and Developer Relations office hours before guessing.
- Keep Firecrawl captures under .firecrawl/; that directory is ignored and should not become project documentation.

## Base Official Source Pack

This is the required Base resource list for KIAI. Future agents must directly refer to this section before doing any Base implementation work. These resources are not optional background reading; they are the minimum source pack for Solidity contracts, Base Sepolia deployment, wallet code, transaction execution services, indexers, collateral assumptions, Base API/RPC usage, and Base ecosystem decisions.

These sources were checked from the user-provided local clippings and refreshed online on 2026-05-25 through the live Base documentation index, Firecrawl, and direct fetches. Future Base implementation work must refresh them before touching contracts, wallet code, Base execution services, indexers, collateral assumptions, or deployment scripts.

Required source pack:

- Base documentation index: https://docs.base.org/llms.txt
- Base docs MCP server: https://docs.base.org/mcp
- Base MCP setup docs: https://docs.base.org/get-started/docs-mcp
- Base static docs files: https://docs.base.org/get-started/docs-llms
- Base full static docs snapshot: https://docs.base.org/llms-full.txt
- Base AI prompting guide: https://docs.base.org/get-started/prompt-library
- Base deploy smart contracts guide: https://docs.base.org/get-started/deploy-smart-contracts
- Local clipping, MCP Server: /Users/sourabhkapure/Downloads/MCP Server.md
- Local clipping, Static Docs Files: /Users/sourabhkapure/Downloads/Static Docs Files.md
- Local clipping, Developer's Guide to Effective AI Prompting: /Users/sourabhkapure/Downloads/Developer's Guide to Effective AI Prompting.md

Source roles:

- https://docs.base.org/llms.txt is the first stop. It is the complete documentation index for AI assistants and must be fetched before exploring Base docs further.
- https://docs.base.org/mcp is the preferred live-docs access path when an AI coding assistant supports MCP. It gives real-time access to search and retrieve current Base documentation.
- docs-mcp explains how to add the Base docs MCP server in Cursor with the base-docs URL https://docs.base.org/mcp and in Claude Code with claude mcp add --transport http base-docs https://docs.base.org/mcp.
- docs-llms explains the fallback static docs path. Use https://docs.base.org/llms-full.txt only when MCP is unavailable; it is a snapshot and may not include the latest updates.
- The Base prompting guide is an AI-agent operating guide. It says to prioritize relevant context, remove unnecessary content, structure requests clearly, reference external resources, break complex work into steps, ask for specific outcomes, and test/validate generated code. Future KIAI Base work should follow this because the project depends on precise AI-agent handoffs.
- The deploy-smart-contracts guide is the Base deployment starting point. It uses Foundry, Base Sepolia RPC at https://sepolia.base.org, Base mainnet RPC at https://mainnet.base.org, Foundry keystore for private keys, forge create for deployment, Sepolia Basescan for verification, and wagmi/viem for frontend contract interaction.
- The live llms.txt index also points to Base network/RPC docs, Base Sepolia connection info, block explorers, data indexers, network faucets, network fees, transaction finality, troubleshooting transactions, contract addresses, node providers, Base Chain specs, Flashblocks, Smart Wallet, OnchainKit, MiniKit, paymaster/sponsorship resources, and security/bug bounty docs. Use the index to find the exact current page before implementing any of those areas.

Future-agent rules:

- Do not start Base Solidity, wallet, transaction, indexer, deployment, collateral, RPC, or AI-agent-instruction work from memory. Fetch https://docs.base.org/llms.txt first, then use Base MCP or Firecrawl to retrieve the exact current pages.
- Prefer Base MCP at https://docs.base.org/mcp when available. Use llms-full.txt only as a fallback snapshot and explicitly note that it may be stale.
- Do not invent Base Sepolia USDC or USDT contract addresses. Verify supported testnet collateral from current official/current sources before wiring it into contracts or API validation.
- Do not treat Smart Wallet, OnchainKit, MiniKit, paymaster/sponsorship, Flashblocks, or third-party RPC/indexing providers as default dependencies. Each needs a small spike with docs, cost/availability, testnet support, failure modes, and integration complexity.
- Prefer the simplest real testnet path first: normal EVM wallet connection, Foundry-deployed Base Sepolia contracts, viem preflight simulation, wallet broadcast, transaction receipt capture, event ingestion, and portfolio reconciliation after indexing.
- Use the Base prompting guide when creating future AI-agent prompts for Base work: include project context, exact problem, current approach, constraints, expected outcome, relevant docs, and validation requirements.
- Keep Base implementation notes in this section instead of creating extra README files.

## Base Execution Pack

This is the required resource pack for Base Solidity contracts, EVM wallet integration, Base Sepolia deployments, execution services, and Coinbase/Base onboarding. Future agents must refresh these resources before changing Base contracts, deployment scripts, wallet code, transaction execution, or Base-related AI-agent tooling.

Required resources:

- Foundry docs: https://book.getfoundry.sh/
- OpenZeppelin Contracts docs: https://docs.openzeppelin.com/contracts/
- Viem docs: https://viem.sh/
- Viem Context7 library: /wevm/viem
- Wagmi docs: https://wagmi.sh/
- Wagmi Context7 libraries: /websites/wagmi_sh and /websites/wagmi_sh_react
- Coinbase Developer Platform docs: https://docs.cdp.coinbase.com/
- Coinbase Developer Platform docs index: https://docs.cdp.coinbase.com/llms.txt
- Coinbase wallets docs: https://docs.cdp.coinbase.com/wallets/
- CDP CLI skill doc: https://docs.cdp.coinbase.com/cdp-cli/skill.md
- Local CDP CLI clipping: /Users/sourabhkapure/Downloads/untitled.md
- Base Smart Wallet / Base Account docs entry point: discover through https://docs.base.org/llms.txt before use. The old smart-wallet URL may redirect to current Base Account SDK pages.
- OnchainKit docs entry point: discover through https://docs.base.org/llms.txt before use. The old OnchainKit getting-started URL may redirect to current app quickstart pages.
- Base skills repo: https://github.com/base/skills

Source roles:

- Foundry is the required Base Solidity toolchain source for compile, test, local development, deployment, keystore/private-key handling, verification, and scripted contract operations.
- OpenZeppelin Contracts is the required source for audited Solidity primitives such as ERC20 interfaces, Ownable, AccessControl, Pausable, ReentrancyGuard, SafeERC20, ERC1155 patterns if needed, and upgradeability decisions if the project ever considers proxies.
- Viem is the required source for backend EVM execution: chain configuration, public clients, wallet clients, simulateContract, writeContract, waitForTransactionReceipt, log/event reads, ABI typing, and structured EVM errors.
- Wagmi is the required source only if the frozen React UI needs EVM wallet hooks. Do not add wagmi merely because it is popular; use it when it cleanly connects the current UI to wallet/account/contract state.
- CDP docs and the local CDP CLI clipping are required for Coinbase wallet/server-wallet tooling. The clipping states that CDP CLI setup requires Node >= 22, cdp env live with API key and wallet secret files, cdp evm accounts list for verification, cdp evm faucet on base-sepolia for eth/usdc/eurc/cbbtc, optional cdp mcp, and optional cdp skills add.
- Base Smart Wallet, Base Account, OnchainKit, MiniKit, paymaster, and sponsorship resources must be discovered from current Base llms.txt before use. They are not default Phase 1 dependencies.
- base/skills is an official Base skills repository. GitHub metadata showed it as public, MIT licensed, default branch master, with install hint npx skills add base/skills. Treat it as optional AI-agent workflow tooling, not as runtime product architecture.

Future-agent rules:

- Do not write Base contracts without checking Foundry and OpenZeppelin current docs.
- Do not write Base execution services without checking viem current docs and the Base docs index.
- Do not wire React wallet hooks without checking wagmi current docs and confirming the frozen UI needs that layer.
- Do not use CDP server wallets, embedded wallets, CDP CLI, or CDP MCP until the CDP docs and local clipping are refreshed and the security model is written down.
- Do not install base/skills into the repo by default. First inspect the repo, confirm the skill is useful for the current task, and document any installation decision.

## Market Mechanism Pack

This is the required resource pack for prediction-market mechanism design. Future agents must refresh these resources before choosing or changing AMM, orderbook, conditional-token, oracle, resolution, or redemption mechanics.

Required resources:

- Gnosis Conditional Tokens current docs: https://conditional-tokens.readthedocs.io/en/latest/
- Gnosis Conditional Tokens developer guide: https://conditional-tokens.readthedocs.io/en/latest/developer-guide.html
- Polymarket docs: https://docs.polymarket.com/
- Polymarket docs index: https://docs.polymarket.com/llms.txt
- Polymarket CTF overview: https://docs.polymarket.com/trading/ctf/overview
- UMA docs: https://docs.uma.xyz/

Source roles:

- Gnosis CTF is the core reference for conditional positions, condition IDs, collection IDs, position IDs, ERC1155 outcome tokens, split/merge/redeem flows, collateral-backed positions, and oracle-reported payouts. The old https://docs.gnosis.io/conditionaltokens/ URL returned a 404 during verification; use the readthedocs URLs unless a newer official location is found.
- Polymarket docs are a product/mechanism reference for real prediction-market API, CLOB, CTF, market data, position, order, and redemption patterns. They are not KIAI's spec and must not be copied blindly.
- UMA docs are the oracle/dispute reference for optimistic truth, OOv2/OOv3 selection, proposal, dispute, bonds, collateral, final fees, and settlement flow.

Future-agent rules:

- Do not lock AMM, CLOB, hybrid, CTF, or oracle architecture from intuition alone. Run a mechanism spike using this pack and record the tradeoffs in this file.
- Do not import Gnosis CTF patterns unless the KIAI collateral, market categories, resolution process, and Sui/Base dual-rail model genuinely benefit from them.
- Do not copy Polymarket's architecture as a shortcut. Use it to understand mature prediction-market mechanics, then design the simplest KIAI-specific real testnet path.
- Do not make UMA required until testnet support, cost, collateral, bonds, dispute timing, and operator workflow are verified.

## Phase 1 Source Audit — 2026-06-02 (IST)

**Date**: 2026-06-02  
**Agent**: Cursor (Sonnet 4.6) executing docs/PLAN.md Phase 1  
**Scope**: Collateral verification, Sui SDK refresh, Base docs refresh, mechanism decision, indexer decision, UMA spike, database decision

### Sources Refreshed

| Resource | URL | Status |
|---|---|---|
| Circle USDC contract addresses | https://developers.circle.com/stablecoins/usdc-contract-addresses | Live, fetched 2026-06-02 |
| Tether supported protocols | https://tether.to/en/supported-protocols/ | Live, fetched 2026-06-02 |
| Sui TypeScript SDK docs | https://sdk.mystenlabs.com/typescript | Live, fetched 2026-06-02 |
| Sui data access docs | https://docs.sui.io/develop/accessing-data | Live, fetched 2026-06-02 |
| Base docs index | https://docs.base.org/llms.txt | Live, fetched 2026-06-02 (54.4KB) |
| UMA docs home | https://docs.uma.xyz/ | Live, fetched 2026-06-02 |
| Envio HyperIndex | https://docs.envio.dev/docs/HyperIndex-LLM/hyperindex-complete | Live, fetched 2026-06-02 |
| Envio llms.txt | https://docs.envio.dev/llms.txt | Live, fetched 2026-06-02 (80.9KB) |
| Ponder indexing overview | https://ponder.sh/docs/indexing/overview | Live, fetched 2026-06-02 |

### Decision: Collateral

**Base Sepolia USDC (CONFIRMED):**  
Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`  
Source: https://developers.circle.com/stablecoins/usdc-contract-addresses — Circle official, fetched 2026-06-02.

**Base Sepolia USDT (NOT AVAILABLE):**  
Tether's supported-protocols page lists: Ethereum, Avalanche, BNB Smart Chain, Cosmos (Kava), Celo, Kaia, Tron, Liquid, Solana, Polkadot AssetHub, Tezos, TON, Near, Aptos.  
**Base and Base Sepolia are absent from this list.**  
Decision: Phase 1 on Base uses USDC only. USDT is deferred until Tether officially supports Base mainnet and Base Sepolia, or until an equivalent official source confirms a testnet path.

**Sui Testnet USDC (CONFIRMED):**  
Address: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`  
Source: https://developers.circle.com/stablecoins/usdc-contract-addresses — Circle official, fetched 2026-06-02.  
Note: This is official Circle USDC on Sui Testnet. This replaces the earlier assumption that USDsui or an unofficial equivalent was needed.

**Sui Mainnet USDC (for reference):**  
Address: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`

**Implementation impact**: Contracts and API collateral validation must use these exact addresses. No address invented from memory.

### Decision: Sui Data Access

JSON-RPC is **deprecated** on Sui. The docs.sui.io/develop/accessing-data page lists: Archival Store, Authenticated Events, Custom Indexing Framework, Data Access Interfaces, **GraphQL**, **gRPC**, and JSON-RPC Migration Guide.

The current Sui TypeScript SDK quick start example (sdk.mystenlabs.com) uses `SuiGrpcClient` from `@mysten/sui/grpc` as the primary data access client. The SDK package is `@mysten/sui`.

**Decision: Use gRPC (`SuiGrpcClient` from `@mysten/sui/grpc`) for all Sui data access.** JSON-RPC must not be used as a long-term dependency. A migration guide exists for teams still on JSON-RPC.

**Sui SDK confirmed facts (2026-06-02):**
- Package: `pnpm add @mysten/sui`
- gRPC client: `import { SuiGrpcClient } from '@mysten/sui/grpc'`
- Transaction builder: `import { Transaction } from '@mysten/sui/transactions'`
- Testnet full node: `https://fullnode.testnet.sui.io:443`
- Testnet faucet: `https://faucet.testnet.sui.io/v2/gas`
- Sign and execute: `keypair.signAndExecuteTransaction({ transaction: tx, client: grpcClient, include: { effects: true } })`
- Failed tx detection: `result.$kind === 'FailedTransaction'` (explicit, not a thrown error)

### Decision: Indexer Architecture

**Envio HyperIndex** (fetched 2026-06-02):
- Supports: EVM (70+ chains via HyperSync), Solana (experimental), Fuel.
- **Does NOT support Sui.**
- Requires `ENVIO_API_TOKEN` from November 2025.
- V3 HyperSync is up to 2000x faster than RPC. Factory contract support. Auto-generated GraphQL API. Hosted service via `pnpx envio init`.

**Decision updated 2026-06-03:**
- **Base events (Phase 6 testnet)**: Custom TypeScript **viem log poller** — uses existing viem client, `getLogs` / `watchContractEvent`. Zero cost, zero external service, zero signup. Same `ChainEvent` schema as Sui poller.
- **Sui events**: Custom TypeScript event poller using **Sui GraphQL RPC** (`/graphql`) — no commercial indexer supports Sui. Query `transactionBlocks` and `events` by package/module/event type. Deduplicate by checkpoint + transaction digest.
- **Production upgrade (mainnet)**: Replace Base viem poller with Envio HyperIndex — HyperSync speed, auto reorg handling, hosted. Requires ENVIO_API_TOKEN. The reconciliation layer (ChainEvent → Trade → UserPosition) does NOT change.
- Rationale for change: Envio requires an API token mandatory since Nov 2025 and has paid tiers. For testnet Phase 6 with low event volume, a viem poller is functionally identical, simpler, and free.

Implementation impact: Two TypeScript pollers in `lib/indexer/` (Base viem poller + Sui GraphQL poller). Reconciliation service in `lib/server/reconcile.ts`. No external services needed for Phase 6.

### Decision: UMA Feasibility

**Status: DEFERRED — Phase 1 baseline uses official public-source snapshots.**

UMA OOv2 is the correct version for prediction markets per docs.uma.xyz.  
Web search synthesis indicates UMA OOv3 is live on Base Sepolia. OOv2 status on Base Sepolia was not confirmed from an authoritative current source during this audit.  
UMA bond requirements, supported collateral (USDC must be whitelisted), proposer/disputer ops flow, liveness period, and final fee cost were not verified for Base Sepolia in this audit.  
Decision: UMA integration requires a dedicated spike in Phase 8. Phase 1 resolution baseline is operator-reviewed official source snapshots. The ARCHITECTURE.md resolution model priority order stands unchanged.

### Decision: Market Mechanism

**Decision: LMSR backend AMM + on-chain custody/settlement contracts. LOCKED 2026-06-02 by founder.**

Architecture: Base and Sui are payment rails only. The market pool and pricing are unified in the KIAI backend. On-chain contracts are custody vaults and settlement contracts only — they do not contain AMM math.

Mechanism: LMSR (Logarithmic Market Scoring Rule) computed in TypeScript in the backend API. This is the standard mechanism used by Gnosis, Augur, and production prediction markets.

LMSR formulas:
- `cost(q) = b * ln(sum(exp(q_i / b)))` for outcomes i
- `price(i) = exp(q_i / b) / sum(exp(q_j / b))`
- `shares_acquired = cost(q_new) - cost(q_old)` for a USDC input amount

The `b` parameter (liquidity depth) is set per market by the operator.

On-chain contracts: `KIAIVault.sol` (Base) and `kiai_vault.move` (Sui) — accept USDC deposit, record position, allow winner to claim collateral on resolution. No on-chain AMM math.

Rationale: Avoids cross-chain price divergence, keeps contracts simple and safe, enables unified pool with two payment rails, matches the founder's confirmed product vision ("the pool remains the same, Base and Sui are payment options only").

### Decision: Database / Runtime

**Decision: PostgreSQL + Prisma + Neon (serverless-managed Postgres). LOCKED 2026-06-02 by founder.**

- **Host**: Neon (serverless Postgres, `@neondatabase/serverless` compatible, works with Prisma's `postgresql` provider).
- **ORM**: Prisma — `zod` is already in `package.json` (v3.24.1); Prisma + Zod is the natural validation pairing.
- **Migration baseline**: `prisma/migrations/20260525183000_init/migration.sql` already exists with the core schema (Market, Outcome, ChainDeployment, CompliancePolicy, Resolution, OrderIntent, UserPosition).

Implementation impact:
- `prisma/schema.prisma` must be created to match the existing migration SQL.
- `lib/server/db.ts` creates the Prisma client singleton.
- `DATABASE_URL` in `.env` points to the Neon Postgres connection string.
- Neon connection string format: `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require`

Note: `prisma/` directory already exists but contains only the migrations folder, no `schema.prisma` file yet. Founder must create the Neon project and provide the `DATABASE_URL` at Stop 1.

### Remaining Open Items After Phase 1

| Item | Status |
|---|---|
| Sui testnet USDC faucet or mint path (can users get testnet USDC?) | Open — needs Sui testnet USDC faucet check |
| UMA OOv2 on Base Sepolia: exact contract address and collateral whitelist | Open — spike deferred to Phase 8 |
| Ponder config for Base Sepolia market contract events | Open — needs contract ABI from Phase 4 |
| Sui custom event poller: event shape from Move contracts | Open — needs contract spec from Phase 5 |
| Test wallet setup for founder browser QA | Open — founder action required at Stop 2 |
| Database host choice (local Docker / Supabase / Neon) | Open — founder preference, Stop 1 |
| ESLint missing from devDependencies | Open — noted in PLAN.md, must be added before lint gate |

---

## Phase 7 Implementation Verification Audit — 2026-06-03 (IST)

**Date**: 2026-06-03
**Agent**: Cursor (Sonnet 4.6) — reading all RESEARCH.md sources and cross-verifying implementation
**Scope**: Verify all Phase 1–7 decisions match actual code

### Verified Correct ✅

| Decision | Implementation | Status |
|---|---|---|
| Base Sepolia USDC `0x036CbD53...` | In `.env`, `app/api/chains/route.ts`, `contracts/src/KIAIVault.sol` | ✅ Matches Circle official |
| Sui Testnet USDC `0xa1ec7fc0...::usdc::USDC` | In `.env`, `app/api/chains/route.ts`, `lib/server/sui-execution.ts`, `contracts/sui/sources/kiai_vault.move` | ✅ Matches Circle official |
| USDT not on Base Sepolia | Not used anywhere in contracts or API | ✅ Correctly excluded |
| Sui gRPC via `SuiGrpcClient` | `lib/server/sui-execution.ts` imports from `@mysten/sui/grpc` | ✅ Non-deprecated |
| LMSR backend AMM | `lib/domain/market-service.ts` — `lmsrCost`, `lmsrPrices`, `lmsrQuote`, `lmsrMaxLoss` | ✅ Correct formulas |
| viem `simulateContract` → `writeContract` → `waitForTransactionReceipt` | `lib/server/base-execution.ts` lines 202–231 | ✅ Correct pattern |
| KIAIVault.sol uses SafeERC20, ReentrancyGuard, Ownable, Pausable | `contracts/src/KIAIVault.sol` imports | ✅ From OpenZeppelin |
| kiai_vault.move uses `phantom USDC` type parameter | `contracts/sui/sources/kiai_vault.move` | ✅ Move 2024 edition |
| Neon + Prisma 7 + `@prisma/adapter-neon` | `lib/server/db.ts`, `prisma.config.ts` | ✅ Correct Prisma 7 pattern |
| No fake runtime / no mock trading | All APIs return honest states; ChainEvent/Trade/Position only from indexed chain data | ✅ |
| Wagmi for EVM wallet, dApp Kit for Sui | `lib/providers/wallet-provider.tsx` | ✅ Minimal, no visible redesign |
| Custom viem poller for Base events | `lib/indexer/base-poller.ts` | ✅ Free, no external service |

### Bug Found and Fixed ✅

**Critical: Wrong Sui GraphQL endpoint**

`sui-poller.ts` was using `${SUI_TESTNET_RPC_URL}/graphql` = `https://fullnode.testnet.sui.io:443/graphql`
This is **wrong** — the fullnode RPC endpoint is for gRPC, not GraphQL.

Correct Sui testnet GraphQL RPC endpoint (confirmed live 2026-06-03):
`https://graphql.testnet.sui.io/graphql`

Source: https://docs.sui.io/develop/accessing-data/graphql/query-with-graphql
Live test confirmed: `{ epoch { referenceGasPrice } }` → returns `1000` ✅
Event query confirmed: `MarketCreatedEvent` for kiai_vault found → digest `7oJwPTWT...` ✅

**Also fixed: Sui GraphQL Event schema field names**
Old (wrong): `eventType`, `json`, `transactionBlock { digest }`, `type { repr }`
Correct: `type`, `contents { json }`, `transaction { digest }`, `sender { address }`
Confirmed against live schema introspection 2026-06-03.

Fix applied: `lib/indexer/sui-poller.ts` updated. `SUI_TESTNET_GRAPHQL_URL` added to `.env` and `.env.example`.

### Open Items Remaining

| Item | Status |
|---|---|
| ESLint in devDependencies | ✅ Fixed 2026-06-03 — `pnpm add -D eslint eslint-config-next` |
| Sui testnet USDC faucet for trader wallets | Open — users need testnet USDC from https://faucet.sui.io before founder browser QA |
| Founder browser QA with connected wallets | Open — Phase 7 checkpoint, requires funded trader wallet |
| UMA OOv2 on Base Sepolia | Open — deferred to Phase 8 |
| Sui checkpoint-based pagination in poller | Note: `Transaction.checkpoint` field name confirmed in GraphQL schema |

---

## Base/Sui/DeFi Source Refresh — 2026-06-04 (IST)

**Scope**: Re-check the Base Official Source Pack, Sui Official Source Pack, Base Execution Pack, Sui DeFi / Launch resources, and Collateral + Indexer Pack before planning the next phases after Phase 7.

**Tools used**: Firecrawl scrape for official pages, Context7 for implementation docs, Exa/direct fetch for source cross-checks, and the local browse skill preamble. Chrome/Playwright browser QA is still required for product flows, but static documentation validation was better served by Firecrawl/Context7 because the task was source refresh rather than UI inspection.

### Sources Refreshed

| Resource | URL / ID | Fresh finding | KIAI impact |
|---|---|---|---|
| Base docs index | https://docs.base.org/llms.txt | The index remains the canonical discovery surface and points to RPCs, Sepolia, faucets, finality, troubleshooting, contract deployment, data indexers, Flashblocks, Smart Wallet/Base Account, OnchainKit, MiniKit, and paymaster/sponsorship pages. | Fetch this first before any Base work. Do not adopt account abstraction, paymasters, Flashblocks, or CDP wallet primitives by default. |
| Base deploy contracts | https://docs.base.org/get-started/deploy-smart-contracts | Base's quickstart still centers Foundry setup, deployment, frontend connection, and Base Sepolia/Mainnet RPC usage. | Phase 4/next Base changes keep Foundry as source of truth for deploy/test/verify scripts. |
| Base finality | https://docs.base.org/base-chain/network-information/transaction-finality | Normal Base L2 transactions do not wait 7 days; L2 finality has staged confidence and 7-day waiting applies to withdrawals to Ethereum L1. | KIAI can show ordinary trade txs as receipt-confirmed after configured confirmations, but must not confuse L2 trade receipts with L1 withdrawal finality. |
| Base troubleshooting | https://docs.base.org/base-chain/network-information/troubleshooting-transactions | Pending txs can be caused by low max fee, nonce issues, network/provider issues, or replacement/cancel behavior. | UI/API must separate pending, replaced, cancelled, reverted, and dropped states instead of a generic failed trade. |
| Base data indexers | https://docs.base.org/get-started/data-indexers | Base lists many hosted data providers. | Phase 6 custom viem poller remains valid for testnet; Envio/Ponder/Goldsky/Allium/etc. are production upgrade candidates, not required now. |
| Sui data access | https://docs.sui.io/develop/accessing-data | Sui data access includes gRPC, GraphQL, archival service, events, checkpoint data, and JSON-RPC migration guidance. | Sui indexing must keep using GraphQL/gRPC, not a new long-lived JSON-RPC dependency. |
| Sui GraphQL reference | https://docs.sui.io/references/sui-graphql | GraphQL exposes chain state and operations such as transaction simulation/dry-run, objects, transactions, checkpoints, and schema references. | Sui poller and diagnostics should use digest/checkpoint/event identity and can use GraphQL simulation/dry-run for diagnostics where appropriate. |
| Sui SDK / dApp Kit | Context7 /websites/sdk_mystenlabs | signAndExecuteTransaction examples explicitly check failed transactions and then wait for transaction/effects availability. | Sui execution is not complete at wallet signature alone. Store digest, check failure kind/effects, wait for transaction visibility, then reconcile. |
| Sui DeFi | https://www.sui.io/defi | Sui positions DeFi around DeepBook, stablecoins, trust-minimized bridges, Move asset safety, parallel execution, PTBs, low fees, and low latency. | Treat as ecosystem context only. Do not add DeepBook, lending, bridging, or DEX routing to Phase 1 trading without a dedicated risk/product spike. |
| Launch on Sui | https://www.sui.io/launch-on-sui | Launch checklist points to Sui docs, Enoki, Walrus, Move Book, Awesome Sui, forums, office hours, dApp Kit, testnet faucet, testnet USDC, audits, wallets, and ecosystem submission. | Keep standard wallet/dApp Kit first; use Enoki/zkLogin/sponsored tx only after normal wallet rail is proven. |
| Circle USDC addresses | https://developers.circle.com/stablecoins/usdc-contract-addresses | Circle lists Base mainnet USDC, Base Sepolia USDC, Sui mainnet USDC, and Sui Testnet USDC. | Existing Base Sepolia and Sui Testnet USDC decisions remain correct; refresh before new deployments. |
| Tether supported protocols | https://tether.to/en/supported-protocols/ | The current Tether protocol page was re-fetched; no official Base/Base Sepolia or Sui/Sui Testnet USDT support was confirmed. | KIAI remains USDC-only for Phase 1 Base/Sui testnet collateral. Do not wire USDT. |
| Foundry | Context7 /foundry-rs/book | Foundry supports dry-run scripts, broadcast, resume, verification, keystore/hardware-wallet deployment, and fork tests. | Deployment scripts should dry-run before broadcast, use keystore/hardware wallet patterns, preserve broadcast artifacts, and verify where possible. |
| OpenZeppelin Contracts 5.x | Context7 /websites/openzeppelin_contracts_5_x | Access control, ownership, pausable behavior, reentrancy guards, and token utilities are current contract safety primitives. | Custody contracts should keep explicit owner/operator controls, pause paths, reentrancy protection, and safe ERC-20 handling. |
| viem | Context7 /wevm/viem | waitForTransactionReceipt tracks confirmation, timeout, retries, and replacement reasons; simulateContract / revert handling remain the correct preflight pattern. | Base execution should simulate before write, wait for receipts, detect replacement/cancel/revert, and persist structured failure state. |
| wagmi React | Context7 /websites/wagmi_sh_react | Contract writes require wallet broadcast/gas and expose mutation/pending/error states through hooks. | Phase 7+ UI must map user rejection, wrong chain, pending, error, and success states honestly. |
| Ponder | https://ponder.sh/docs/indexing/overview | Indexing functions are TypeScript handlers triggered by onchain logs/calls/transactions/transfers/blocks and write normalized tables. | Good EVM production candidate, but Phase 6 custom viem poller remains simpler for testnet. |
| Envio | https://docs.envio.dev/llms.txt | Envio positions HyperIndex for multichain indexing, HyperSync for fast EVM/Fuel data, and documents reorg support. | Production Base upgrade candidate; not required for Sui and not required for current low-volume testnet. |
| Goldsky | https://docs.goldsky.com/llms.txt | Goldsky exposes Turbo/Mirror/Subgraph/Compose/Edge docs and pipeline status/log APIs. | Hosted indexing/RPC candidate for later production operations; not a Phase 1 dependency. |

### Updated Decisions

- Base and Sui remain payment/custody rails, not separate markets. A Base trade and a Sui trade in the same KIAI market must reconcile into the same backend market pool and portfolio model.
- Base Phase 1 collateral is USDC only. Base Sepolia USDT remains unsupported unless Tether/Base/current authoritative docs later prove support.
- Sui Phase 1 collateral is Circle USDC on Sui Testnet. Do not fall back to unofficial stablecoins or wrapped assets while Circle USDC is available.
- DeFi integrations are deferred. Sui DeFi resources validate ecosystem direction, but KIAI should not integrate DeepBook, DEX swaps, lending, bridge routing, yield, or liquidity aggregation in the current product path.
- Normal wallets come first. Base uses standard EVM wallet + wagmi/viem. Sui uses Wallet Standard / dApp Kit. Smart Wallet, Base Account, OnchainKit, MiniKit, paymaster, Enoki, zkLogin, and sponsored transactions are optional later UX upgrades.
- Chain execution is only final after chain evidence. Base requires simulation, wallet broadcast, receipt status, emitted event/indexer observation, and reconciliation. Sui requires transaction construction, signature/execution, failed-transaction/effects check, digest visibility, event observation, and reconciliation.
- Indexers stay simple until scale justifies hosted services. Custom viem log polling for Base and custom Sui GraphQL/gRPC polling remain correct for Phase 6/7 testnet; Envio/Ponder/Goldsky are upgrade candidates.

### Edge Cases And Required Fallbacks

| Area | Edge case | Required behavior |
|---|---|---|
| Base wallet | User rejects signature or wallet write | Keep order intent unexecuted, store rejection reason where safe, show retry path. |
| Base chain | Wrong chain selected | Block execution before quote/submit or request network switch; never submit to the wrong chain. |
| Base gas | Max fee too low, transaction pending too long, nonce conflict, replacement, cancellation | Preserve tx hash/replacement metadata, show submitted_to_chain or chain_pending, then move to chain_failed, chain_cancelled, or chain_replaced only after receipt/provider evidence. |
| Base receipt | Receipt status reverted | Mark execution failed, keep receipt/error payload, do not update final portfolio. |
| Base event | Receipt succeeds but expected event missing | Mark reconciliation_blocked, retry/backfill logs, require operator inspection before portfolio finalization. |
| Sui wallet | User rejects dApp Kit transaction | Keep order intent unexecuted and retryable. |
| Sui execution | FailedTransaction or failed effects | Persist digest/effects/error, mark chain failed, do not reconcile position. |
| Sui visibility | Digest returned but transaction/effects not yet available through GraphQL/gRPC | Show chain_pending / indexing_pending, retry with backoff, do not fake portfolio success. |
| Sui objects | Shared object contention, object-version mismatch, insufficient gas, missing USDC object | Return a specific blocked/failed reason and keep quote/order retryable if safe. |
| Collateral | USDC address mismatch or token decimals mismatch | Block market deployment/trading until source-pack refresh and config validation pass. |
| USDT | User/operator requests USDT on Base or Sui | Reject as unsupported until official Tether/current source confirms the rail. |
| Indexers | RPC timeout/rate limit/indexer restart | Resume from last block/checkpoint cursor, dedupe by chain identity, expose lag. |
| Reorg/log gaps | Base event disappears or backfill changes | Reconcile from durable block cursor and event identity; production hosted indexer must prove reorg handling before adoption. |
| DeFi temptation | Need liquidity, swaps, bridging, or yield | Create a separate DeFi risk spike covering slippage, custody, bridge risk, oracle risk, approvals, compliance, and user disclosure. Do not add silently to trading flow. |
| Resolution/settlement | Outcome finalized but one rail settlement fails | Settlement jobs are per-chain idempotent jobs consuming the same finalized settlement instruction; failed rail remains retryable without changing outcome. |

### Next-Phase Planning Impact

- Phase 6 should add explicit cursor/backfill health checks for Base blocks and Sui checkpoints/digests.
- Phase 7 manual QA should test rejection, wrong-chain, insufficient gas, insufficient USDC, slow receipt/effects, indexer lag, and event-missing states on both rails.
- Phase 8 settlement jobs must consume finalized KIAI settlement instructions only. They must not read raw sports APIs, DeFi protocol state, or provisional source snapshots directly.
- Phase 9/10 should keep a source-refresh checklist for Base/Sui/USDC/indexer pages before adding more markets or publishing beta operations.

---

## Resolution Oracle Source Audit — 2026-06-04 (IST)

**Scope**: How prediction markets decide real-world winners/losers for sports and other off-chain events, and what KIAI must implement before claiming production-grade resolution.

### Sources Refreshed

| Resource | URL | Finding |
|---|---|---|
| Polymarket resolution docs | https://docs.polymarket.com/concepts/resolution.md | Official docs describe predefined resolution rules, resolution source, end date, edge cases, UMA Optimistic Oracle proposal/dispute flow, and redemption after resolution. Direct DNS failed from this shell, so content was fetched through a reader that preserved the official URL source. |
| Polymarket CTF redeem docs | https://docs.polymarket.com/trading/ctf/redeem.md | Winning tokens redeem after oracle-reported payout vector; losing tokens pay zero. |
| Polymarket positions docs | https://docs.polymarket.com/concepts/positions-tokens.md | Outcome tokens represent positions; after resolution, winning side redeems for 1.00, losing side for 0.00. |
| UMA OOV3 quick start | https://docs.uma.xyz/developers/optimistic-oracle-v3/quick-start.md | OOV3 asserts arbitrary off-chain truth, enters a challenge window, settles if undisputed, and escalates if disputed. |
| UMA OOV3 prediction market tutorial | https://docs.uma.xyz/developers/optimistic-oracle-v3/prediction-market.md | UMA provides a prediction-market pattern with outcomes, reward, required bond, assertions, settlement, and an unresolvable/split outcome. |
| UMA data asserter tutorial | https://docs.uma.xyz/developers/optimistic-oracle-v3/data-asserter.md | Arbitrary off-chain data can be asserted with bond/liveness and callback settlement. |
| UMA oracle overview | https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work.md | UMA is an escalation game: bonded assertion, liveness window, dispute, and DVM backstop. |
| UMA Polymarket verification guide | https://docs.uma.xyz/verification-guide/yes_or_no.md | Polymarket-style binary questions use ancillary data with explicit question text, resolution keys, unknown/50-50 value, and too-early value. |
| Chainlink Functions docs | https://docs.chain.link/chainlink-functions.md | Chainlink Functions can fetch APIs and use encrypted secrets, but users remain responsible for source/API quality and provider licensing. |
| Chainlink Automation docs | https://docs.chain.link/chainlink-automation.md | Automation can run scheduled/triggered on-chain jobs on supported networks, but it is a future operational tool, not a truth source by itself. |
| Sportradar sports data page | https://sportradar.com/sports-data/ | Commercial sports-data provider for betting, gaming, prediction markets, media, and teams/leagues; useful candidate for live data/evidence ingestion, not a final settlement authority unless licensed and named in market rules. |

### Decision: KIAI Resolution Realness Model

**Decision: KIAI must implement a resolution pipeline, not a single score API call.**

For a sports market like "Team A beats Team B", the winner is decided by the market's written resolution rules. The implementation must store and enforce:

1. **Market question**: exact claim being traded, e.g. "Will Team A beat Team B in the scheduled match on YYYY-MM-DD?"
2. **Outcome mapping**: which stored outcome slug maps to each possible final result.
3. **Primary source**: official league/federation/event result URL or API.
4. **Secondary source**: fallback official or high-quality data source if primary is unavailable.
5. **API evidence feed**: optional paid or public sports data API used to prefill evidence and monitor results, never silently final by itself.
6. **Edge-case rules**: postponement, cancellation, abandonment, overtime, forfeits, draws, no-contest, changed venue, tournament format changes, unknown/50-50, and too-early resolution.
7. **Evidence snapshot**: fetched source URLs, normalized result payloads, timestamps, screenshots or archived copies where practical, operator id, and hash of the evidence bundle.
8. **Proposal/dispute/finalization**: operator or oracle assertion proposes the winning outcome; a dispute window must pass before final settlement.
9. **On-chain settlement**: only after finalization does KIAI call Base/Sui resolve functions and open claims/settlement.

### Architecture Choice

**Phase 8 baseline**: operator-reviewed official source snapshot plus structured evidence bundle.

**Phase 8 optional upgrade**: UMA Optimistic Oracle on Base if the spike proves:

- supported network/address for the chosen UMA version,
- supported bond currency/collateral,
- required bond/final fee cost,
- liveness period,
- dispute operations,
- callback/finalization path into KIAI contracts,
- how Sui settlement mirrors the finalized Base/UMA outcome.

**Later automation options**:

- Sports data providers such as Sportradar or SportsDataIO can power live score monitoring and evidence prefill, but require API keys, licensing review, and per-sport coverage checks.
- Chainlink Functions can fetch API data for EVM contracts and protect API secrets, but it introduces LINK subscription cost, supported-network constraints, and source-quality responsibility.
- Chainlink Automation can trigger scheduled checks/finalization on supported EVM networks, but it does not decide truth.

### Product Rule

Every KIAI market must show the user the resolution source and edge-case rules before trading. A market without a valid source policy, edge-case policy, and resolver mode must not go live.

### Implementation Impact

- Add first-class resolver concepts in Phase 8: ResolutionSource, ResolutionRule, EvidenceSnapshot, OracleAssertion, and Dispute.
- Extend the admin/operator workflow so operators cannot propose an outcome without attaching a structured evidence bundle.
- For sports markets, build a per-sport source adapter only after the exact league/source is chosen. Example: sumo uses Japan Sumo Association/NHK source policy; Premier League uses Premier League official result source; F1 uses Formula 1 official results.
- Treat paid sports API keys as operational secrets. Do not request them in chat; document required environment variables and validate missing-key behavior.
- Keep UMA optional until the Phase 8 spike closes cost, collateral, network, and dispute-operation questions.

### Open-Source Code Audit — 2026-06-04 (IST)

**Source folder**: `/Users/sourabhkapure/Desktop/prediction_market researhc`

**Cloned audit folder**: `/Users/sourabhkapure/Desktop/prediction_market researhc/clones`

The supplied research documents list many open-source prediction-market repositories. This implementation pass cloned a focused set that covers mature oracle/settlement mechanics, launchable full-stack apps, simple EVM/Solana examples, and data/indexing tooling.

| Repository | Local path | What the code shows | KIAI implication |
|---|---|---|---|
| Polymarket UMA CTF adapter | `clones/polymarket-uma-ctf-adapter` | `src/UmaCtfAdapter.sol` prepares a CTF condition, builds a deterministic question id from ancillary data, requests UMA optimistic oracle price, handles dispute callbacks, can reset after a first dispute, supports flag/manual safety paths, and reports payout vectors. | KIAI should copy the discipline, not the exact CTF design: deterministic rule payload, source/evidence bundle, liveness/dispute metadata, manual safety path, and payout/final-outcome audit trail. |
| Polymarket CTF exchange v2 | `clones/polymarket-ctf-exchange-v2` | `README.md` documents off-chain signed orders, operator matching, complementary/mint/merge settlement types, CTF collateral flow, signature variants, self-pause, and wrapped collateral. | KIAI Phase 7/8 remains a backend LMSR plus custody-vault model. Do not claim Polymarket-like CLOB/CTF behavior unless a later mechanism spike deliberately adopts it. |
| Gnosis conditional token market makers | `clones/gnosis-conditional-tokens-market-makers` | `contracts/LMSRMarketMaker.sol` and `contracts/MarketMaker.sol` show production LMSR math around CTF split/merge/redeem flows. | KIAI's backend LMSR is directionally aligned, but KIAI should add invariant tests before changing pricing or settlement. Moving LMSR on-chain is a separate architecture decision. |
| Simple EVM prediction market | `clones/sivaram-simple-evm` | `src/PredictionMarket.sol` is an educational pot-based contract with owner/admin resolution, active/resolved/cancelled lifecycle, and pro-rata claims. | Useful lifecycle reference only. Admin-only winner selection is not enough for KIAI realness without evidence, source policy, and dispute controls. |
| OpenPredictionMarkets / Sealva full-stack apps | `clones/openpredictionmarkets-prediction-market-web3`, `clones/sealva-prediction-market-web3` | `contracts/WagerContract.sol` uses peer-to-peer escrow, creator/owner resolution, participant signatures, and deadline-based release. | Good cautionary example: visible Web3 escrow can still be centralized truth. KIAI pooled markets need official evidence and dispute path, not creator-selected outcomes. |
| Roswelly Solana prediction market | `clones/roswelly-solana-pm` | `programs/prediction-market/src/lib.rs` requires end time and a resolution authority before setting outcome, then prevents double claims. | Keep lifecycle checks and double-claim protection, but do not treat a single authority as an oracle. |
| 0xagarg EVM/Solana prediction market | `clones/zero-x-agarg-evm-solana` | Frontend market data includes crypto API and sports keyword/source hints. | KIAI can use source adapters and market-type config, but adapters only prefill evidence; they must not silently finalize truth. |
| SocialPredict | `clones/openpredictionmarkets-socialpredict` | `scripts/example_sports_markets.sql` includes detailed sports resolution criteria: official competition, playoff exclusions, overtime/tie wording, and final resolution timestamps. | KIAI should require written edge-case rules before go-live, especially for sports. |
| Jon Becker prediction-market analysis | `clones/jon-becker-prediction-market-analysis` | Indexers pull Polymarket/Kalshi data, chunk files, dedupe records, archive cursors, and join resolved markets with trades. | KIAI should treat evidence/trade/settlement records as append-only audit data with hashes/cursors where practical. |

**Decision from code audit**:

- The production-grade path is not "ask an API who won." It is: prewritten rule -> official/API evidence -> structured evidence snapshot -> proposal -> dispute/liveness -> final outcome -> chain settlement.
- KIAI's current schema can support the first hardening step through `Resolution.sourceSnapshot` JSON, but the API must validate that JSON as a structured evidence bundle.
- Implemented 2026-06-04: admin resolution proposals now require structured source evidence, canonicalize proposed/final outcomes to existing outcome slugs, store `DISPUTE_WINDOW`, and block finalization until the dispute deadline unless `KIAI_ALLOW_EARLY_RESOLUTION_FINALIZE=true` is set for controlled local testing.
- Implemented 2026-06-04: Base/Sui settlement jobs are now durable per-rail records that consume finalized settlement instructions and retry or block independently by chain.
- Implemented 2026-06-04: first sports source adapter `sumo-jsa` builds structured evidence from operator-reviewed Nihon Sumo Kyokai official-source observations for tournament-winner markets.
- Implemented 2026-06-04: market-level `resolutionPolicy` gates future review/deploy/live transitions, and governance tables now record evidence snapshots, resolution disputes, and optional oracle assertions.
- Implemented 2026-06-05: `/en/operator` exposes a browser-testable internal console over the existing admin APIs for resolution policy, evidence snapshots, Sumo/JSA proposal prefill, resolution proposal submission, oracle assertion metadata, disputes, and settlement jobs.
- Implemented 2026-06-05: raw evidence payloads can now be archived as local JSON artifacts keyed by payload hash, retrieved through an authenticated admin route, and inspected from the operator console.
- Implemented 2026-06-05: Phase 9 demo catalogue is now code-backed in `lib/market-catalogue/demo-markets.ts`; every demo market has validated source priority, edge cases, resolver mode, payout/refund policy, close time, outcomes, and Base/Sui deployment plan before seed/runtime use.
- Implemented 2026-06-05: `/api/markets?preview=catalogue` and `/en/markets?preview=catalogue` expose only the eight known Phase 9 demo slugs for catalogue QA while normal public market visibility remains limited to reviewed/deploy-pending/live markets.
- Implemented 2026-06-05: superseded demo slugs from the earlier seed pass are archived through audited lifecycle updates when they have no order intents; they are not deleted.
- Source refresh note 2026-06-05: Formula 1's official 2026 calendar supports Abu Dhabi on 4-6 Dec 2026, and the Premier League official 2026/27 date page supports the season starting on 22 Aug 2026. Keep exact match/team choices source-refreshed before moving EPL/F1 demo markets beyond draft/review.
- Implemented 2026-06-05: Phase 10 controlled-beta ops status now lives at `GET /api/admin/ops/status`; it surfaces env/source-refresh/deployment/indexer/order/settlement/dispute/oracle/audit readiness without exposing secret values.
- Implemented 2026-06-05: `docs/RUNBOOKS.md` documents beta readiness, Base deploy, Sui deploy, indexer restart, market pause, failed settlement, incident response, and explicit non-fallbacks for DeFi/bridges/swaps/yield/sponsored gas/USDT.
- Implemented 2026-06-05: `docs/BETA_READINESS.md` records current controlled-beta readiness as `needs_review`, with evidence for source refresh, local operator-secret rotation, stale-order failure classification, Base/Sui smoke checks, and remaining manual wallet/founder gates.
- Implemented 2026-06-06: future operator audit IDs are derived from a SHA-256 token hash prefix instead of storing the first characters of the bearer token.
- Source refresh note 2026-06-05: Base docs still list Base Sepolia RPC as `https://sepolia.base.org`; Circle docs still list Base Sepolia USDC as `0x036CbD53842c5426634e7929541eC2318f3dCF7e` and Sui Testnet USDC as `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`; Sui docs remain the implementation authority for Sui RPC/data access; Tether supported-protocol docs remain the gate for any USDT support claim.
- Decided 2026-06-05 for Phase 1: do not upgrade Base/Sui vault contracts for split/fractional/manual payouts before founder acceptance. Backend settlement instructions can represent those cases, but chain execution remains blocked/manual until a later contract or operations path is approved.
- Still deferred to Phase 9/production-hardening boundary: production-grade admin auth/roles, UMA network/collateral/bond spike, hosted object storage/screenshot capture integration, and broader contract support for split/fractional/manual payouts if product chooses it.

### Resolution Edge-Case Research Refresh — 2026-06-04 (IST)

**Autoplan finding**: the current resolution plan is directionally correct, but it must be more explicit about payout shape, source certainty, and exceptional sports outcomes before Phase 8 implementation starts.

| Source | Verified finding | KIAI decision |
|---|---|---|
| Polymarket resolution docs | Every market has predefined resolution source, end date, and edge-case rules. UMA proposal requires a bond, opens a 2-hour challenge period, and can resolve through no-dispute, one-dispute/reproposal, or DVM vote. Outcomes include proposer wins, disputer wins, Too Early, and Unknown/50-50. | KIAI must define market rules before go-live, model Too Early separately from final outcome, and support payout vectors, not only winner strings. |
| Polymarket dispute help center | Disputes require counter-bond, evidence discussion, UMA vote, and final outcomes are immutable once resolved. Unknown/50-50 redeems both sides at 0.50. | KIAI should treat finalized resolution as settlement-authoritative and irreversible except through an explicit incident/refund process before chain finalization. |
| UMA OOv2 event-based prediction-market docs | Event-based requests set ancillary data, liveness, proposer bond, event-based mode, and callbacks. Settlement can be 0, 0.5, or 1. Dispute callbacks can restart the request. | UMA spike must capture ancillary/rule payload, assertion/request id, liveness, bond, callback status, and reset/escalation behavior. |
| UMA OOv3 prediction-market docs via Context7 | OOV3 assertion flow supports outcome assertions, required bond, callback recipient, assertion id, and an `unresolvable` outcome in the sample prediction-market pattern. | KIAI can use OOV3 as an assertion/backstop candidate, but must still map the oracle result into KIAI payout/refund semantics. |
| Sportradar UOF sport-event-status docs | Sports events distinguish not started, live, suspended, ended, closed, cancelled, delayed, interrupted, postponed, and abandoned. | KIAI source adapters must not collapse all non-final statuses into NO. These map to awaiting result, delayed, disputed/manual review, void/refund, or too-early. |
| Sportradar UOF bet-settlement docs | Outcomes can win, lose, be undecided, full-void, half-void, or dead-heat. Settlements have certainty levels: live scout result versus officially confirmed result. Results may differ in extraordinary cases. | KIAI should store source certainty and payout vector. Settlement should wait for official confirmation unless the market rule explicitly allows live/provisional results. |
| Chainlink Functions docs via Context7 | Functions can fetch public or authenticated APIs, aggregate multiple APIs, use secrets, and transform data. Users remain responsible for data-source quality, API availability, licensing, and Chainlink terms. | Chainlink Functions are an API-ingestion tool, not a truth oracle. Use only after source/licensing review, and keep secrets in env/subscription config, never docs/chat. |
| Chainlink Automation docs | Automation can trigger scheduled/custom on-chain work and can combine with Functions. | Useful for periodic checks/finalization on EVM rails later. It does not decide winners by itself. |
| Reality.eth + Kleros docs | Reality.eth provides bonded answers and escalation; Kleros can arbitrate disputes and submit final rulings back to Reality.eth. Evidence periods can last days. | Alternative oracle/backstop candidate for subjective markets, but likely slower and more operationally complex than KIAI needs for Phase 8. Keep as later research, not v1 dependency. |

### KIAI Resolution Case Matrix

This matrix is the product and engineering source of truth for Phase 8 planning.

| Case | Example | Resolver behavior | Payout behavior | User-visible state |
|---|---|---|---|---|
| Normal binary YES | Team A wins under written rules | Evidence source confirms Team A. Proposal maps to YES slug. | YES = 1.00, NO = 0.00 | finalized -> settling |
| Normal binary NO | Team B wins, or condition does not happen | Evidence confirms NO under rule. | YES = 0.00, NO = 1.00 | finalized -> settling |
| Multi-outcome winner | F1 race winner, tournament champion | Evidence maps to one outcome slug. | Winning slug = 1.00, all others = 0.00 | finalized -> settling |
| Draw/tie is explicit outcome | Soccer match has Draw outcome | Evidence maps to `draw` slug. | Draw = 1.00, others = 0.00 | finalized -> settling |
| Draw/tie without explicit outcome | Market was Team A vs Team B only | Apply written rule: usually split, void, or no outcome assignable. | Rule-specific: 50/50 or refund | manual review or dispute window |
| Too early proposal | Match still live, official result unavailable | Reject/mark Too Early, preserve market unresolved, penalize proposer if using oracle. | No payout yet | awaiting official result |
| Postponed event | Game rescheduled within rule window | Keep unresolved until new date if rules allow; otherwise void/refund. | No payout yet or refund | delayed |
| Cancelled/no-contest | Event never produces valid official result | Use rule-defined cancellation path. | Default recommendation: refund/void unless market rules explicitly use 50/50 | cancelled/refunded |
| Abandoned/interrupted | Event starts but does not finish normally | Use sport/source rule: official result, restart, void, or manual review. | Rule-specific payout/refund | manual review |
| Forfeit/walkover | Team awarded official win | If official competition records winner, resolve to that winner unless market excludes forfeits. | Winner = 1.00 | finalized -> settling |
| Dead heat/shared placing | Multiple participants share a place | Use rule-defined dead-heat factor. | Fractional payout vector | finalized -> settling |
| Source disagreement | API says A, official site says B | Official named source wins. If named source unavailable or conflicted, manual review/dispute. | No final payout until resolved | disputed/manual review |
| API outage/rate limit | Sports API unavailable | Use fallback source or operator official snapshot. Do not finalize from missing API. | No payout yet | awaiting evidence |
| Evidence tampering concern | Screenshot or payload disputed | Require archived URL/hash/raw payload/operator audit. Enter dispute/manual review. | No payout until adjudicated | disputed |
| Oracle dispute | UMA/Reality/Kleros challenge filed | Freeze finalization until oracle result or escalation completes. | Oracle result maps to payout vector | disputed/adjudicating |
| Unknown/unresolvable | No rule can assign an outcome | Use explicit market policy: 50/50 split or refund. | `split_50_50` or `void_refund` | resolved/refunded |
| Settlement job failure | Final outcome exists, chain write fails | Keep final resolution, mark settlement failed, retry idempotently. | No duplicate payout | settlement_failed |

### Product Defaults From Research

- **Default for sport cancellation/no-contest**: refund/void unless the market rule names a different treatment.
- **Default for binary unresolvable after the event window**: do not guess. Use the market's predeclared `unresolvablePolicy`: `split_50_50`, `void_refund`, or `manual_adjudication`.
- **Default source priority**: official event source > official data provider confirmation > licensed API confirmation > public API prefill > operator note.
- **Default finality rule**: provisional/live source evidence can update UI status, but cannot trigger settlement unless the market rule explicitly says provisional data is final.
- **Default oracle rule**: UMA/Reality/Kleros/Chainlink are optional mechanisms. KIAI's own resolution record remains the single settlement authority consumed by Base and Sui vaults.

### Open Items

| Item | Status |
|---|---|
| Exact source adapter for first sports market | Implemented first slice — Nagoya/sumo uses Nihon Sumo Kyokai official-source observation adapter |
| Paid sports data provider | Open — licensing/API-key decision required before integration |
| UMA version/network/collateral for Base Sepolia | Open — Phase 8 spike |
| Sui oracle mirroring design | Open — if UMA is Base-only, KIAI backend must mirror final outcome to Sui with audit evidence |
| Evidence archiving method | Implemented first slice — raw payload JSON artifacts are stored under `RESOLUTION_EVIDENCE_ARCHIVE_DIR` or `.kiai/evidence-archive` and served through `GET /api/admin/evidence-archive/:hash`; hosted object storage and screenshot capture remain production upgrades |
| Evidence snapshot records | Implemented — `EvidenceSnapshot` stores source URLs, archive/screenshot URLs, hashes, raw payload JSON, observed outcome, status, and certainty |
| Dispute/adjudication records | Implemented — `ResolutionDispute` records source disagreement, oracle challenge, evidence tampering, manual safety, too-early, and other disputes |
| Oracle assertion records | Implemented metadata layer — `OracleAssertion` stores provider, assertion/request IDs, bond, liveness, status, and payload; actual UMA integration remains a spike |
| Browser operator console | Implemented first slice — `/en/operator` lets an internal operator exercise Phase 8 governance APIs from the browser with a session-local bearer token, including archived-evidence inspection |
| Payout vector model | Partially implemented — `lib/domain/resolution-policy.ts` builds settlement instructions for winner-take-all, split, void/refund, fractional, and manual modes |
| Per-rail settlement jobs | Implemented — `SettlementJob` records prepare and run Base/Sui settlement idempotently from finalized settlement instructions |
| First sports source adapter | Implemented — `sumo-jsa` maps JSA official-source observations into structured KIAI evidence; direct shell fetch hit JSA URL guard while Exa/browser fetch returned indexed page content |
| Current vault payout coverage | Phase 1 decision recorded — deployed vaults support winner-take-all resolve and full-refund cancel; split/fractional/manual/partial refund remain backend-represented but chain-blocked/manual until a later approved contract or operations path |
| Source certainty model | Partially implemented — resolution evidence records provisional, official-confirmed, oracle-final, and manual-adjudicated certainty; provisional evidence cannot finalize settlement |

---

## Collateral + Indexer Pack

This is the required resource pack for stablecoin/collateral validation and chain data/indexing. Future agents must refresh these resources before wiring token addresses, collateral metadata, indexers, RPC providers, event schemas, or portfolio reconciliation.

Required resources:

- Circle stablecoins docs: https://developers.circle.com/stablecoins/
- Circle docs index: https://developers.circle.com/llms.txt
- Circle USDC contract addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
- Tether supported protocols and integration guidelines: https://tether.to/en/supported-protocols/
- Ponder docs: https://ponder.sh/
- Ponder indexing overview: https://ponder.sh/docs/indexing/overview
- Ponder chain config docs: https://ponder.sh/docs/config/chains
- Ponder contract config docs: https://ponder.sh/docs/config/contracts
- Envio docs: https://docs.envio.dev/
- Envio docs index: https://docs.envio.dev/llms.txt
- Goldsky docs: https://docs.goldsky.com/
- Goldsky docs index: https://docs.goldsky.com/llms.txt
- Sui data access docs: https://docs.sui.io/develop/accessing-data
- Sui API reference: https://docs.sui.io/references/sui-api
- Sui GraphQL reference: https://docs.sui.io/references/sui-graphql

Source roles:

- Circle is the required source for USDC support and official USDC contract addresses. Verification found the older developers.circle.com/stablecoins/docs/usdc-on-test-networks path returned 404; use the current USDC contract addresses page and Circle llms index instead.
- Circle's current contract-address page lists Base mainnet USDC and Base Sepolia USDC. Future agents must refresh the page before hardcoding or validating any address.
- Tether supported protocols is the required source for official USDT protocol/address support. Do not treat a BaseScan Sepolia token labeled USDT as official Tether testnet support unless Tether, Base, or another authoritative current source confirms it.
- Ponder is a TypeScript EVM indexer candidate. Use the current docs pages for indexing functions, chains, contracts, ABI handling, multi-chain configs, startBlock, factories, and RPC behavior. Verification found https://ponder.sh/docs returned 404; use the specific docs URLs above.
- Envio is an indexer/data candidate. It provides HyperIndex, HyperSync, HyperRPC, hosted-service docs, llms.txt, and markdown-friendly docs pages.
- Goldsky is an indexer/data/RPC candidate. Use its docs index before choosing subgraphs, Mirror, Turbo pipelines, Edge RPC, chains, or hosted indexing.
- Sui data access docs are required for Sui indexing. The Sui API reference notes JSON-RPC is deprecated and says to migrate to gRPC or GraphQL RPC by July 2026, so do not design new long-lived Sui indexer code around deprecated JSON-RPC without an explicit short-term reason.

Future-agent rules:

- Do not invent or trust token addresses from memory. Refresh Circle/Tether/Base docs and record the exact source before adding collateral to contracts or APIs.
- Base Phase 1 targets USDC and USDT, but USDT must be treated as unverified until official/current testnet support is confirmed. If official Base Sepolia USDT is not available, use the closest verified real testnet equivalent and record the decision.
- Do not choose Ponder, Envio, Goldsky, or custom indexing by preference alone. Compare event coverage, Base support, Sui support where relevant, latency, hosted/self-hosted deployment, cost, backfill behavior, RPC requirements, and failure modes.
- Do not update portfolio-visible state from optimistic UI alone. Indexer or receipt/event reconciliation remains the source of truth.
