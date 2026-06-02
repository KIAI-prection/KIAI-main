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

**Decision for Phase 1 (LOCKED 2026-06-02):**
- **Base events**: Use **Envio HyperIndex** — production-grade, hosted, HyperSync, reorg handling built-in, TypeScript handlers, single config.yaml for all Base contracts.
- **Sui events**: Custom TypeScript event poller using **Sui GraphQL RPC** (`/graphql`) — no commercial indexer supports Sui. Query `transactionBlocks` and `events` by package/module/event type. Deduplicate by checkpoint + transaction digest. Write to the same normalized `chain_event` table in Postgres.
- `ENVIO_API_TOKEN` must be provisioned at Stop 6 (indexer phase). Add to `.env.example` as a required but optional-for-Phase-2 variable.

Implementation impact: Envio config and ABI needed for Base (Phase 6). Custom Sui GraphQL poller TypeScript module (Phase 6).

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
