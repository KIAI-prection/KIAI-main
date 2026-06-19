# KIAI Deployments

All contract deployment records for KIAI. This file is factual deployment state, not a roadmap.

## Mainnet Status — 2026-06-19

| Rail | Network | Status | Notes |
| --- | --- | --- | --- |
| Base | Base Mainnet, chain ID `8453` | Deployed | `KIAIVault.sol` deployed and all non-archived markets created on-chain. |
| Sui | Sui Mainnet | Blocked | Package publish dry-run passed, but actual publish is blocked because the operator address has no owned SUI gas coin object in the Sui CLI. |

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
| Status | Blocked before publish |

Sui dry-run proof:

- `sui client publish --dry-run --json --gas-budget 500000000` succeeded.
- Dry-run produced a candidate package, registry, and operator-cap object.
- Dry-run balance change was `-37104400` MIST.

Actual publish blocker:

- `sui client publish --json --gas-budget 500000000` failed before broadcast.
- Error: the CLI could not find a SUI gas coin for `0x73e478cb66dd91fbc37d19f625f24a6d4b9846f86b5952dff04c1f843ac1b331`.
- `sui client gas --json` returned `[]`.
- The app-side SDK balance probe reported `addressBalance: 4000000000`, but there is no owned gas coin object available to the CLI.

DB state while blocked:

- All 8 non-archived Sui deployment rows use `USDC_SUI_MAINNET`.
- Their Sui contract/pool addresses are cleared.
- Their deploy status is `deploy_failed` with the gas-coin blocker recorded.

Resume steps:

1. Transfer an owned SUI coin object to `0x73e478cb66dd91fbc37d19f625f24a6d4b9846f86b5952dff04c1f843ac1b331`.
2. Confirm `sui client gas --json` lists a usable gas coin.
3. Run `sui client publish --json --gas-budget 500000000` from `contracts/sui`.
4. Fill `SUI_MAINNET_KIAI_VAULT_PACKAGE_ID`, `SUI_MAINNET_KIAI_VAULT_REGISTRY_ID`, `SUI_MAINNET_KIAI_OPERATOR_CAP_ID`, and `SUI_MAINNET_DEPLOYMENT_CHECKPOINT` in `.env`.
5. Run `pnpm deploy:mainnet-markets -- --sui-only`.
6. Run the Sui poller/reconcile path and update this file with final package/object IDs and digests.

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
SUI_MAINNET_KIAI_VAULT_PACKAGE_ID=""
SUI_MAINNET_KIAI_VAULT_REGISTRY_ID=""
SUI_MAINNET_KIAI_OPERATOR_CAP_ID=""
SUI_MAINNET_DEPLOYMENT_CHECKPOINT=""
~~~

Never commit private keys or `.env`.
