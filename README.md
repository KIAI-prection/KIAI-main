# KIAI — The Spirit Engine

**Prediction markets for Japan-relevant and global events.**  
Sports · Politics · Culture · Esports · Special Events

> *Pick the market. KIAI handles the rails.*

---

## What is KIAI?

KIAI is a dual-chain prediction market platform targeting Japan-first, globally relevant events. Users trade on outcomes across sumo, baseball, football, F1, elections, culture awards, and more — with real USDC settlement on both **Base** and **Sui** testnets.

**Architecture in one line:** One unified market pool (LMSR pricing in the backend), two payment rails (Base + Sui). Users pick which chain to deposit on. The market price is always the same.

---

## Current Status — Testnet

| Phase | Status | Evidence |
|---|---|---|
| Phase 0 — Planning | ✅ Complete | `docs/PLAN.md` |
| Phase 1 — Source Audit | ✅ Complete | `docs/RESEARCH.md` |
| Phase 2 — Backend + APIs | ✅ Complete | 15 API routes, Neon DB |
| Phase 3 — Operator Admin | ✅ Complete | 8 markets seeded |
| Phase 4 — Base Rail | ✅ Complete | Contract live, 24/24 tests |
| Phase 5 — Sui Rail | ✅ Complete | Package live, 8/8 tests |
| Phase 6 — Indexer | ⏳ Next | Envio + Sui gRPC poller |
| Phase 7 — UI Integration | ⏳ Upcoming | Wire frozen UI to APIs |
| Phase 8 — Resolution | ⏳ Upcoming | Settlement + refunds |

---

## Live Contracts (Testnet)

| Chain | Contract | Address |
|---|---|---|
| **Base Sepolia** | `KIAIVault.sol` | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` |
| **Sui Testnet** | `kiai_vault` package | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` |

USDC collateral (Circle official, verified 2026-06-02):
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Sui Testnet: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`

Full deployment details → [`docs/DEPLOYMENTS.md`](docs/DEPLOYMENTS.md)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind 4, Radix UI |
| Backend | Next.js API routes, Node.js |
| Database | PostgreSQL + Prisma 7 (hosted on Neon) |
| Base contracts | Solidity 0.8.24, Foundry, OpenZeppelin, viem |
| Sui contracts | Move 2024, Sui CLI 1.72.1, `@mysten/sui` gRPC |
| Indexer (Phase 6) | Envio HyperIndex (Base) + custom Sui GraphQL poller |
| Pricing | LMSR backend AMM (TypeScript) |
| i18n | next-intl (English only for now) |

---

## Local Development

### Prerequisites

- Node.js 22+, pnpm 8+
- [Foundry](https://book.getfoundry.sh/) (`foundryup`)
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) 1.72+
- A [Neon](https://neon.tech) PostgreSQL project

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd KIAI-main
pnpm install

# 2. Install Foundry dependencies (if contracts/lib/ is missing)
cd contracts && forge install && cd ..

# 3. Rebuild Sui Move artifacts (if contracts/sui/build/ is missing)
cd contracts/sui && sui move build && cd ../..

# 4. Configure environment
cp .env.example .env
# Edit .env — add your DATABASE_URL from Neon console

# 5. Run database migrations
pnpm exec prisma migrate deploy

# 6. Seed demo markets
pnpm exec tsx prisma/seed.ts

# 7. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/chains` | Available chains + verified USDC addresses |
| `GET` | `/api/markets` | Public market list (LIVE/REVIEWED) |
| `GET` | `/api/markets/[slug]` | Market detail with chain deployments |
| `POST` | `/api/compliance/check` | Eligibility check before trade |
| `POST` | `/api/quotes` | LMSR price quote |
| `POST` | `/api/orders` | Create order from quote |
| `PATCH` | `/api/orders/[id]` | Update order with tx hash |
| `GET` | `/api/portfolio` | Reconciled positions + pending orders |
| `POST` | `/api/admin/markets` | Create market (operator only) |
| `PATCH` | `/api/admin/markets/[id]` | Lifecycle transition (operator only) |
| `POST` | `/api/admin/markets/[id]/deploy` | Trigger chain deployment |
| `POST` | `/api/admin/markets/[id]/deploy/result` | Record deployment result |
| `POST` | `/api/admin/markets/[id]/pause` | Pause / unpause market |
| `POST` | `/api/admin/markets/[id]/resolution` | Propose / finalize outcome |
| `GET` | `/api/admin/audit` | Operator action audit log |

All `/api/admin/*` routes require `Authorization: Bearer <OPERATOR_SECRET>`.

---

## Contract Tests

```bash
# Base (Solidity) — 24 tests
cd contracts && forge test --summary

# Sui (Move) — 8 tests
cd contracts/sui && sui move test
```

---

## Architecture

**One pool, two payment rails** — locked architectural principle:

- Market pricing (LMSR) and the pool live in the KIAI backend
- Base and Sui are custody/settlement rails only — users choose how to deposit
- On-chain contracts are pure custody vaults: accept USDC → record position → pay winner
- A user on Base and a user on Sui trade the same market at the same price

```
Frozen UI
    │
    ▼
KIAI API (Markets · Quotes · Orders · Portfolio · Compliance)
    │
    ├── Domain Database (Neon PostgreSQL)
    │       LMSR pool state · Positions · Quotes · Orders · Audit log
    │
    ├── Base Settlement Rail                Sui Settlement Rail
    │   KIAIVault.sol                       kiai_vault.move
    │   0x3d1E1993...                       0x1064637e...
    │   USDC_BASE_SEPOLIA                   USDC_SUI_TESTNET
    │
    └── Indexer (Phase 6)
        Envio HyperIndex (Base)
        Custom Sui GraphQL poller
```

Full architecture details → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Markets

8 demo markets seeded for testnet (all start in DRAFT, operator promotes to LIVE):

- Nagoya Basho 2026 — Sumo tournament winner
- Yokozuna Terunofuji — Final record prop
- Summer Koshien 2026 — National high school baseball champion
- NPB Central League pennant 2026
- Japan House of Councillors 2025 — LDP coalition majority
- EPL Man City vs Arsenal (August 2026 opener)
- F1 Japanese Grand Prix 2026 — Race winner
- Akutagawa Prize 2026 (2nd half) — Debut author wins?

---

## Docs

| Doc | Contents |
|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | Master implementation plan, phase definitions, acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, LMSR mechanism, API contracts, state machines |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Source audits, collateral verification, indexer decisions |
| [`docs/DEPLOYMENTS.md`](docs/DEPLOYMENTS.md) | Live contract addresses, tx hashes, upgrade history |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product spec, user segments, market categories |

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Market mechanism | LMSR backend AMM | Standard for prediction markets; avoids cross-chain price divergence |
| Chain architecture | One pool, two rails | Users trade same market; chain = payment method only |
| USDC only (Phase 1) | No USDT | Tether does not support Base Sepolia |
| Sui data access | gRPC (`@mysten/sui/grpc`) | JSON-RPC deprecated July 2026 |
| Base indexer | Envio HyperIndex | Production-grade, HyperSync, hosted |
| Sui indexer | Custom GraphQL poller | No commercial indexer supports Sui |
| Database | Neon + Prisma 7 | Serverless-compatible, TypeScript-first |
| Resolution (Phase 1) | Official source snapshots | UMA deferred to Phase 8 |

---

## License

Private — KIAI / Navsi AI. All rights reserved.
