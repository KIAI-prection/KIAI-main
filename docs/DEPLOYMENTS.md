# KIAI Deployments

All contract deployment records for KIAI. This file is factual deployment state, not a roadmap.

## Mainnet Status — 2026-06-20

| Rail | Network | Status | Notes |
| --- | --- | --- | --- |
| Base | Base Mainnet, chain ID `8453` | Deployed | `KIAIVault.sol` deployed and all non-archived markets created on-chain. |
| Sui | Sui Mainnet | Deployed | Package + all 8 markets deployed. Poller indexed 8 `MarketCreatedEvent`s at checkpoints 289186230–289186286. |

## Base Mainnet

| Field | Value |
| --- | --- |
| Network | Base Mainnet |
| Chain ID | `8453` |
| RPC | `https://mainnet.base.org` |
| Vault | `0xb1Df6Ae8C267E07BCc0B1d83dF878089E1F5bc94` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Owner | `0xb5cE86e2d09841351627112aB955857CFF739CA4` |
| Deploy tx | `0x16d36063ff5107572b7ae47eaf349ebed0ef24a60668118560ef94fb43c06cd7` |
| Deploy block | `47534586` |

Verification performed:

- `cast code` returned deployed bytecode for the vault.
- `owner()` returned `0xb5cE86e2d09841351627112aB955857CFF739CA4`.
- `usdc()` returned Circle Base Mainnet USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- `cast receipt` for the deploy tx returned `status 1 (success)`.

### Base Market Creation

All non-archived markets were created on Base Mainnet through the shared vault.

| Market | Lifecycle | Tx | Block |
| --- | --- | --- | --- |
| `nagoya-basho-2026-winner` | LIVE | `0x485c4e90be8380f0a4ee3491af661de128992358652fe7a4f34b87b9de9a63d0` | `47534647` |
| `yokozuna-terunofuji-nagoya-2026-record` | DRAFT | `0x0fbac6da99df7ac4751d670b5c758ef3e05bb4a2a00e6be11fc72ea7dba9c71f` | `47534648` |
| `summer-koshien-2026-winner` | DRAFT | `0x6c4abfd27787d234cc72e6711e2764472ae189ca43c2bb79b6c00c823576c74b` | `47534649` |
| `npb-central-league-pennant-2026` | DRAFT | `0x98d8994041fe62bd358ed89078e97df6a7f2ee219d2222986b0da5fe181e56da` | `47534651` |
| `akutagawa-prize-2026-second-half` | DRAFT | `0x2dde62cd4e04987e1afef3a9000a0f4231411af58b918895dfc72399fdf680bf` | `47534652` |
| `japan-house-councillors-2028-coalition-majority` | DRAFT | `0x18b2e7666761276c7fa23f9087b9a1307736e15e240fb75e5e402e5ae39a4d34` | `47534653` |
| `f1-abu-dhabi-gp-2026-winner` | DRAFT | `0x750b027eaeaa1b0b7e2fba5addf143e62e06da5d567f2518dec398829cd73910` | `47534655` |
| `thailand-u19-vs-australia-u19-asean-2026` | REVIEWED | `0xdb28db475ee3824588395e3b1224c5676fd81481bffe2e21051540a3db51361d` | `47534656` |

DB verification after indexing:

- All 8 non-archived Base deployment rows use `USDC_BASE_MAINNET`.
- All 8 non-archived Base deployment rows point to `0xb1Df6Ae8C267E07BCc0B1d83dF878089E1F5bc94`.
- Base poller advanced `lastIndexedBlock` to `47534667`.

## Sui Mainnet

| Field | Value |
| --- | --- |
| Network | Sui Mainnet |
| RPC | `https://fullnode.mainnet.sui.io:443` |
| GraphQL | `https://graphql.mainnet.sui.io/graphql` |
| USDC type | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |
| Operator address | `0x73e478cb66dd91fbc37d19f625f24a6d4b9846f86b5952dff04c1f843ac1b331` |
| Package ID | `0x298f714144788755ad494a2238c6972189bf610c03794d4ee964dceef7a51d2b` |
| Registry ID | `0x61f5136fd78bc202ae83abbe7a1aa5aa95c7af537e622dcdafb62f584f6a3005` |
| OperatorCap ID | `0x05fa49d932332a4d91f07215d0f36ed52d96fe20e9c46126abfe39a6fe019039` |
| UpgradeCap ID | `0x68cc4b8251adbb4f1499d298a85ef08ac24d81c83f15f159bb72d43a258c5d22` |
| Deploy tx digest | `C3pZZY98bLScVQt3EDRHTBNYeapPMHAHWvegsfbETSSb` |
| Deploy checkpoint | `289185782` |
| Status | Deployed |

Publish notes:

- `sui client publish` CLI was blocked because `suix_getOwnedObjects` indexer had not caught up with
  the operator address gas coin (received via `accumulator_settlement` validator reward).
- `suix_getCoins` and `sui_getObject` both confirmed 24 SUI gas coin existed:
  `0x10d5f31284c36afe6a021abe2348414e9c9fc0cbfc70ef14329276701fe3c82c`.
- Published via `scripts/publish-sui-mainnet.ts` using `@mysten/sui` SDK v2.x with
  `tx.setGasPayment([{ objectId, version, digest }])` to bypass the CLI indexer dependency.
- Gas used: 37,016,400 MIST (1,000,000 computation + 36,016,400 storage).

Verification:

- `objectChanges` confirmed `published` type with `kiai_vault` module.
- `KIAIVaultRegistry` created as shared object at version 1.
- `OperatorCap` created as address-owned object at version 1.
- `UpgradeCap` (0x2::package::UpgradeCap) created and held by operator.

### Sui Market Creation

All 8 non-archived markets created on Sui Mainnet.

| Market | Lifecycle | Pool Object ID | Tx Digest |
| --- | --- | --- | --- |
| `nagoya-basho-2026-winner` | LIVE | `0x377eca888ccaa932644f8ca93f32315c627ab61a9b605e92beef550c0a6f8a7b` | `3yyiyxV5gaS88XhbMQuSpot6oCqUKc6hHSSZEytrGjV7` |
| `yokozuna-terunofuji-nagoya-2026-record` | DRAFT | `0x20b19f619ebbeda9c33c65bef42ee8eb77624f7861d11328fa31fb526e4f3209` | `65YTcVdcEe4TEG7nxup7mKyDA2PWY36f9epTzvDRkKSb` |
| `summer-koshien-2026-winner` | DRAFT | `0x580b279781e94719dbedfd51b8da1946ec65fe2108a706059b79c8e1c3736f06` | `DvPwAQDZ5Z4XdfCQDti9sEA7vS7EhExc4QgfuDfGhTsg` |
| `npb-central-league-pennant-2026` | DRAFT | `0x7ea159286f6ce351f23ce2f17788c2e5fb1c65ca4e6c312cc9175f20d418f05c` | `4BBGDnzR3qK8jZDcFGLyJCLBtHbpcY6ekZCN6NEHSDgx` |
| `akutagawa-prize-2026-second-half` | DRAFT | `0xb91d0d481a4728b9b0b1aa8b4c8a6ca66fed33be50f2d21f7d899c025d0d53f3` | `ZSHQ8R7bUNuxmt3rJT2s9yT4M65SmVskMnUWSLQWpHL` |
| `japan-house-councillors-2028-coalition-majority` | DRAFT | `0x104d1f280bfaa9028fe8d3c5586abbb371b878ad033ce2816f169b743ac023d1` | `8MPkQbXZsmHGDyKeut9hxr23Mh5bj319cJMdN3S36quL` |
| `f1-abu-dhabi-gp-2026-winner` | DRAFT | `0x1b3e633398b69030299b42c2acb72488ca3cb6b579922f8f57aeb67e0bd7a2c8` | `BQkx2hXBwWfXC3JTHkuTTkYp5CTqMTYGQoVr3c8KYcf7` |
| `thailand-u19-vs-australia-u19-asean-2026` | REVIEWED | `0x1b8406d78a6667eec55a71cac578f3abaa8782b4737bf26f9cdbe56d7711b07f` | `AmcwbLhK7NogsZhMhaCV83NK3kW9B7VcDaNWzbzCpMUx` |

## Env Keys

Required mainnet chain keys:

~~~env
BASE_MAINNET_RPC_URL="https://mainnet.base.org"
BASE_MAINNET_USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BASE_MAINNET_KIAI_VAULT_ADDRESS="0xb1Df6Ae8C267E07BCc0B1d83dF878089E1F5bc94"
BASE_MAINNET_DEPLOYMENT_BLOCK="47534586"

SUI_MAINNET_RPC_URL="https://fullnode.mainnet.sui.io:443"
SUI_MAINNET_GRAPHQL_URL="https://graphql.mainnet.sui.io/graphql"
SUI_MAINNET_USDC_TYPE="0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
SUI_MAINNET_KIAI_VAULT_PACKAGE_ID="0x298f714144788755ad494a2238c6972189bf610c03794d4ee964dceef7a51d2b"
SUI_MAINNET_KIAI_VAULT_REGISTRY_ID="0x61f5136fd78bc202ae83abbe7a1aa5aa95c7af537e622dcdafb62f584f6a3005"
SUI_MAINNET_KIAI_OPERATOR_CAP_ID="0x05fa49d932332a4d91f07215d0f36ed52d96fe20e9c46126abfe39a6fe019039"
SUI_MAINNET_DEPLOYMENT_CHECKPOINT="289185782"
~~~

Never commit private keys or `.env`.
