# KIAI Contract Deployments

All testnet and production contract deployments for the KIAI platform.

**Architecture:** Base and Sui are payment rails only. The market pool, pricing, and LMSR logic live in the KIAI backend. On-chain contracts are custody vaults and settlement contracts only.

---

## Base Sepolia (Testnet)

### KIAIVault

| Field | Value |
|---|---|
| **Contract** | `KIAIVault` |
| **Network** | Base Sepolia |
| **Chain ID** | `84532` |
| **Address** | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` |
| **Deploy tx** | `0xd4d4c3d19b85b08a06712ed734195a1e94b71d5ea29dc78aa95384ee69a89025` |
| **Block** | `42308800` |
| **Timestamp** | `2026-06-02T07:38:08Z` |
| **Deployer** | `0x5E6e1424177556b5Cabe397E1714Ee4fB799B14E` |
| **Owner (operator)** | `0x5E6e1424177556b5Cabe397E1714Ee4fB799B14E` |
| **USDC collateral** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **Gas used** | `1,513,094` |
| **Gas price** | `0.006 gwei` |
| **Total cost** | `~0.000009 ETH` |
| **Compiler** | `Solc 0.8.24` |
| **Optimizer** | `200 runs` |
| **Source** | `contracts/src/KIAIVault.sol` |
| **ABI** | `lib/contracts/KIAIVault.abi.json` |
| **Status** | ✅ Live — Nagoya Basho 2026 market active |

**Explorer:** https://sepolia.basescan.org/address/0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8

**Constructor args:**
```
_usdc: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

**Foundry broadcast artifacts:**
```
contracts/broadcast/DeployKIAIVault.s.sol/84532/run-latest.json
```

**USDC source:** Circle official — https://developers.circle.com/stablecoins/usdc-contract-addresses (verified 2026-06-02)

**Source refresh 2026-06-04:** Circle still lists Base/Base Sepolia USDC. Tether support for Base/Base Sepolia USDT was not confirmed from the official Tether protocols page. Keep Base Sepolia deployment USDC-only until a fresh official source says otherwise.

---

## Sui Testnet

### kiai_vault (Move package)

| Field | Value |
|---|---|
| **Contract** | `kiai_vault` (Move package) |
| **Network** | Sui Testnet |
| **Package ID** | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` |
| **KIAIVaultRegistry object** | `0xa522ecb86041af442dddc00db3a24e107918443cc6d5fd486adc90bc65784754` (Shared) |
| **OperatorCap object** | `0x583b904cc0837d44b16d6dd17df133938c8d0202a75c9d73358c9b3d9b393ace` |
| **Deploy digest** | `6TmnAtSZFoqTMbXeMsuUayA2arxtvyo33MJmcsg6bPsa` |
| **Epoch** | `1118` |
| **Timestamp** | `2026-06-02T~07:40 UTC` |
| **Deployer / Owner** | `0x431247f9a7c7de5f39f6947bd8eb04939956265735623b84de3190a463caf1c1` |
| **USDC collateral type** | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |
| **Gas cost** | `~37 MIST (~0.037 SUI)` |
| **Source** | `contracts/sui/sources/kiai_vault.move` |
| **SDK** | `lib/server/sui-execution.ts` |
| **Status** | ✅ Live on Sui Testnet |

**Explorer:** https://suiscan.xyz/testnet/tx/6TmnAtSZFoqTMbXeMsuUayA2arxtvyo33MJmcsg6bPsa

**USDC source:** Circle official Sui Testnet — https://developers.circle.com/stablecoins/usdc-contract-addresses (verified 2026-06-02)

**Source refresh 2026-06-04:** Circle still lists Sui/Sui Testnet USDC. Tether support for Sui/Sui Testnet USDT was not confirmed. Sui settlement remains USDC-only.

**Nagoya Basho 2026 market created on Sui Testnet:**

| Field | Value |
|---|---|
| **Current DB Market Object ID** | `0x3b9ba8a8f3f079ae74f98ba6ff5d4253ff2661df5854d92c065aac785d8caa44` (Shared) |
| **Object type** | `kiai_vault::Market<...usdc::USDC>` |
| **create_market digest** | `5CCYuNr7JJZaTsHf3ETaARzhZKfvrDgjCirkvr9HSLKY` |
| **Operator** | `0x431247f9a7c7de5f39f6947bd8eb04939956265735623b84de3190a463caf1c1` |
| **Backend market ID** | `cmpwa5mby0000sjsmhbnvqyut` |
| **Recorded in DB** | `ChainDeployment(chain=SUI).deployStatus = deployed`, `contractAddress = package ID`, `poolAddress = Market Object ID` |
| **Status** | ✅ Current Sui demo rail — Shared object, ready for user deposits |

**Explorer:** https://suiscan.xyz/testnet/tx/5CCYuNr7JJZaTsHf3ETaARzhZKfvrDgjCirkvr9HSLKY

Historical Sui create_market record: object `0x09b7dccd64037e3c5fcef36dc43bd5f62fecfbe62f59a0431ec9c3b2a8205522`, digest `7oJwPTWTyYMchw6uvJddHctroNigXdnby9Xhtj28NNxo`, epoch `1118`. The current demo flow uses the DB-backed object above.

**To create a market on Sui Testnet (template for future markets):**
```bash
pnpm deploy:sui-market <backend-market-id>
```

The script signs `create_market` with `SUI_OPERATOR_PRIVATE_KEY`, waits for the Sui transaction, extracts the newly shared `Market<USDC>` object from transaction effects/object types, and records that real object ID into `ChainDeployment.poolAddress`.

---

## Base Mainnet

| Field | Value |
|---|---|
| **Status** | 🔒 Not deployed — production legal review required |

---

## Sui Mainnet

| Field | Value |
|---|---|
| **Status** | 🔒 Not deployed — production legal review required |

---

## Markets Deployed Per Contract

### KIAIVault @ Base Sepolia

Markets must be created on-chain via `createMarket(bytes32 marketId)` before users can deposit.
`marketId` = `keccak256(bytes(backendMarketId))`.

| Market | Backend ID | On-chain marketId (bytes32) | createMarket tx | Status |
|---|---|---|---|---|
| Nagoya Basho 2026 | `cmpwa5mby0000sjsmhbnvqyut` | `0x730339a56fc887e2a2c27c3348897e75033daecb1e4b7c8761de21a896dc7121` | [`0xe2d6bd6e...`](https://sepolia.basescan.org/tx/0xe2d6bd6ef70409b364cc62c30bf4914921c871d1329376b8a42b34d5f1e3aab3) | ✅ Created on-chain — block 42310207 |

**createMarket() receipt (Nagoya Basho 2026):**
- Tx hash: `0xe2d6bd6ef70409b364cc62c30bf4914921c871d1329376b8a42b34d5f1e3aab3`
- Block: `42310207` | Timestamp: `0x6a1e935e` (2026-06-02)
- Event: `MarketCreated(0x730339a5...)` — topic `0x08cb70e1...`
- Gas used: `34,649` | Gas price: `0.006 gwei`
- Status: `1 (success)` — ready for user deposits

### kiai_vault @ Sui Testnet

Markets must be created on-chain via `create_market<USDC>(OperatorCap, market_id_bytes)` before users can deposit.
The backend stores the resulting shared `Market<USDC>` object ID in `ChainDeployment.poolAddress`.

| Market | Backend ID | Sui Market Object | create_market digest | Status |
|---|---|---|---|---|
| Nagoya Basho 2026 | `cmpwa5mby0000sjsmhbnvqyut` | `0x3b9ba8a8f3f079ae74f98ba6ff5d4253ff2661df5854d92c065aac785d8caa44` | [`5CCYuNr7...`](https://suiscan.xyz/testnet/tx/5CCYuNr7JJZaTsHf3ETaARzhZKfvrDgjCirkvr9HSLKY) | ✅ Current DB-backed Sui rail — ready for wallet deposits |

**create_market receipt (Nagoya Basho 2026):**
- Digest: `5CCYuNr7JJZaTsHf3ETaARzhZKfvrDgjCirkvr9HSLKY`
- Market object: `0x3b9ba8a8f3f079ae74f98ba6ff5d4253ff2661df5854d92c065aac785d8caa44`
- Package: `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089`
- Operator: `0x431247f9a7c7de5f39f6947bd8eb04939956265735623b84de3190a463caf1c1`
- Status: success — ready for user deposits through Slush/Sui wallet

---

## Environment Variable Reference

| Var | Value |
|---|---|
| `BASE_SEPOLIA_KIAI_VAULT_ADDRESS` | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` |
| `BASE_SEPOLIA_USDC_ADDRESS` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `SUI_TESTNET_KIAI_VAULT_PACKAGE_ID` | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` |
| `SUI_TESTNET_KIAI_VAULT_REGISTRY_ID` | `0xa522ecb86041af442dddc00db3a24e107918443cc6d5fd486adc90bc65784754` |
| `SUI_TESTNET_KIAI_OPERATOR_CAP_ID` | `0x583b904cc0837d44b16d6dd17df133938c8d0202a75c9d73358c9b3d9b393ace` |
| `SUI_TESTNET_USDC_TYPE` | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |
| `DEPLOYER_PRIVATE_KEY` | In `.env` — Base Sepolia deployer — never commit |
| `SUI_OPERATOR_PRIVATE_KEY` | In `.env` — Sui testnet operator — never commit |
| `OPERATOR_SECRET` | In `.env` — KIAI admin API bearer token |
| `KIAI_ALLOW_EARLY_RESOLUTION_FINALIZE` | Optional local/test override. Set to `true` only for controlled tests that need to bypass the dispute deadline. Never enable for production-like settlement runs. |
| `API_FOOTBALL_API_KEY` | Optional API-FOOTBALL key for `POST /api/admin/markets/:id/source-adapters/api-football`. Used for operator evidence prefill only. |
| `API_FOOTBALL_BASE_URL` | Optional override for API-FOOTBALL base URL. Defaults to `https://v3.football.api-sports.io`. |
| `SPORTS_DATA_API_KEY` | Legacy/fallback sports-data secret accepted by the API-FOOTBALL adapter if `API_FOOTBALL_API_KEY` is unset. Prefer `API_FOOTBALL_API_KEY` for new setup. |
| `RESOLUTION_EVIDENCE_ARCHIVE_DIR` | Optional local/test archive root for raw evidence payload JSON artifacts. Defaults to `.kiai/evidence-archive`. |
| `KIAI_SOURCE_REFRESHED_AT` | ISO timestamp for the latest Base/Sui/Circle/Tether/indexer source-pack refresh before beta changes. Exposed as configured/stale status only through `/api/admin/ops/status`. |
| `BASE_SEPOLIA_RPC_URL` | `https://sepolia.base.org` |
| `SUI_TESTNET_RPC_URL` | `https://fullnode.testnet.sui.io:443` |
| `SUI_TESTNET_GRAPHQL_URL` | `https://graphql.testnet.sui.io/graphql` |

Resolution deployment note:

- Base and Sui vaults must consume finalized KIAI settlement instructions only.
- Do not wire chain settlement directly to sports API payloads, screenshots, or provisional source-adapter results.
- Resolution finalization must preserve the evidence bundle hash and payout/refund policy used for the chain settlement run.
- Settlement runs are now represented by per-chain `SettlementJob` records. Operators should prepare/list jobs through `/api/admin/markets/:id/settlement` before running settlement.
- The deployed Base and Sui vaults currently support only winner-take-all `resolve` and full-refund `cancel`. Phase 1 keeps split, fractional, manual, partial-refund, and no-winning-share resolution cases blocked/manual; contract upgrades are deferred until after founder acceptance unless product explicitly changes scope.

Base/Sui/DeFi deployment guardrails, refreshed 2026-06-04:

- Re-fetch Base `llms.txt`, Circle USDC addresses, Tether supported protocols, Sui data access, and Sui GraphQL docs before any new deployment or collateral change.
- Foundry Base deploys should dry-run before broadcast, use keystore or hardware-wallet patterns where possible, preserve broadcast artifacts, and verify on Sepolia Basescan when practical.
- Base execution health checks must distinguish pending, replaced, cancelled, reverted, and event-missing states.
- Sui execution health checks must distinguish wallet rejection, failed transaction/effects, digest-not-yet-visible, event-missing, and checkpoint/indexer lag states.
- DeFi integrations, bridges, DEX routing, lending, yield, and sponsored gas are not deployment requirements for Phase 1 and must not be added without a dedicated source-gated risk spike.

---

## Upgrade History

| Date | Network | Action | Address | Notes |
|---|---|---|---|---|
| 2026-06-02 | Base Sepolia | Initial deploy | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` | Phase 4 — KIAIVault v1 |
| 2026-06-02 | Sui Testnet | Initial publish | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` | Phase 5 — kiai_vault v1 |
| 2026-06-02 | Base Sepolia | createMarket (Nagoya Basho) | tx `0xe2d6bd6e...` block 42310207 | Phase 5 — first market vault created |
| 2026-06-02 | Sui Testnet | create_market (Nagoya Basho) | digest `7oJwPTWT...` object `0x09b7dccd...` | Phase 5 — first market vault created |
| 2026-06-13 | Sui Testnet | create_market (Nagoya Basho demo rail) | digest `5CCYuNr7...` object `0x3b9ba8a8...` | Current DB-backed Sui rail for Slush demo |
