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

**Nagoya Basho 2026 market created on Sui Testnet:**

| Field | Value |
|---|---|
| **Market Object ID** | `0x09b7dccd64037e3c5fcef36dc43bd5f62fecfbe62f59a0431ec9c3b2a8205522` (Shared) |
| **Object type** | `kiai_vault::Market<...usdc::USDC>` |
| **create_market digest** | `7oJwPTWTyYMchw6uvJddHctroNigXdnby9Xhtj28NNxo` |
| **Epoch** | `1118` |
| **Event** | `MarketCreatedEvent` — market_id_bytes = `Y21wd2E1bWJ5MDAwMHNqc21oYm52cXl1dA==` (base64 of `cmpwa5mby0000sjsmhbnvqyut`) |
| **Gas cost** | `~3.37 MIST` |
| **Status** | ✅ Created — Shared object, ready for user deposits |

**Explorer:** https://suiscan.xyz/testnet/tx/7oJwPTWTyYMchw6uvJddHctroNigXdnby9Xhtj28NNxo

**To create a market on Sui Testnet (template for future markets):**
```bash
sui client call \
  --package 0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089 \
  --module kiai_vault \
  --function create_market \
  --type-args "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC" \
  --args \
    0x583b904cc0837d44b16d6dd17df133938c8d0202a75c9d73358c9b3d9b393ace \
    "[<market_id_bytes_as_u8_array>]" \
  --gas-budget 10000000
```

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

---

## Environment Variable Reference

| Var | Value |
|---|---|
| `BASE_SEPOLIA_KIAI_VAULT_ADDRESS` | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` |
| `BASE_SEPOLIA_USDC_ADDRESS` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `SUI_TESTNET_KIAI_VAULT_PACKAGE_ID` | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` |
| `SUI_TESTNET_KIAI_VAULT_REGISTRY_ID` | `0xa522ecb86041af442dddc00db3a24e107918443cc6d5fd486adc90bc65784754` |
| `SUI_TESTNET_KIAI_OPERATOR_CAP_ID` | `0x583b904cc0837d44b16d6dd17df133938c8d0202a75c9d73358c9b3d9b393ace` |
| `SUI_TESTNET_NAGOYA_MARKET_OBJECT_ID` | `0x09b7dccd64037e3c5fcef36dc43bd5f62fecfbe62f59a0431ec9c3b2a8205522` |
| `SUI_TESTNET_USDC_TYPE` | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |
| `DEPLOYER_PRIVATE_KEY` | In `.env` — Base Sepolia deployer — never commit |
| `SUI_OPERATOR_PRIVATE_KEY` | In `.env` — Sui testnet operator — never commit |
| `OPERATOR_SECRET` | In `.env` — KIAI admin API bearer token |
| `BASE_SEPOLIA_RPC_URL` | `https://sepolia.base.org` |
| `SUI_TESTNET_RPC_URL` | `https://fullnode.testnet.sui.io:443` |

---

## Upgrade History

| Date | Network | Action | Address | Notes |
|---|---|---|---|---|
| 2026-06-02 | Base Sepolia | Initial deploy | `0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8` | Phase 4 — KIAIVault v1 |
| 2026-06-02 | Sui Testnet | Initial publish | `0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089` | Phase 5 — kiai_vault v1 |
| 2026-06-02 | Base Sepolia | createMarket (Nagoya Basho) | tx `0xe2d6bd6e...` block 42310207 | Phase 5 — first market vault created |
| 2026-06-02 | Sui Testnet | create_market (Nagoya Basho) | digest `7oJwPTWT...` object `0x09b7dccd...` | Phase 5 — first market vault created |
