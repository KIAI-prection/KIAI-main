import assert from "node:assert/strict";
import {
  classifyOpsReadiness,
  evaluateEnvReadiness,
  evaluateSourceRefresh,
  isConfiguredEnvValue,
  type OpsIssue,
} from "@/lib/server/ops-status";

assert.equal(isConfiguredEnvValue(""), false);
assert.equal(isConfiguredEnvValue("  "), false);
assert.equal(isConfiguredEnvValue("postgresql://user:password@example/db"), false);
assert.equal(isConfiguredEnvValue("0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8", 42), true);

const env = evaluateEnvReadiness({
  DATABASE_URL: "postgresql://real-user:real-pass@db.kiai.internal/kiai?sslmode=require",
  OPERATOR_SECRET: "0123456789abcdef0123456789abcdef",
  BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org",
  SUI_TESTNET_RPC_URL: "https://fullnode.testnet.sui.io:443",
  SUI_TESTNET_GRAPHQL_URL: "https://graphql.testnet.sui.io/graphql",
  BASE_SEPOLIA_USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  SUI_TESTNET_USDC_TYPE:
    "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  BASE_SEPOLIA_KIAI_VAULT_ADDRESS: "0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8",
  SUI_TESTNET_KIAI_VAULT_PACKAGE_ID:
    "0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089",
  SUI_TESTNET_KIAI_VAULT_REGISTRY_ID:
    "0xa522ecb86041af442dddc00db3a24e107918443cc6d5fd486adc90bc65784754",
  SUI_TESTNET_KIAI_OPERATOR_CAP_ID:
    "0x583b904cc0837d44b16d6dd17df133938c8d0202a75c9d73358c9b3d9b393ace",
  DEPLOYER_PRIVATE_KEY: "",
  SUI_OPERATOR_PRIVATE_KEY: "",
});

assert.equal(env.issues.length, 2);
assert.deepEqual(
  env.issues.map((issue) => issue.code).sort(),
  ["missing_env_deployer_private_key", "missing_env_sui_operator_private_key"]
);
assert.equal(classifyOpsReadiness(env.issues), "needs_review");

const missingCore = evaluateEnvReadiness({
  OPERATOR_SECRET: "",
});
assert.equal(
  missingCore.issues.some((issue) => issue.severity === "blocker"),
  true
);
assert.equal(classifyOpsReadiness(missingCore.issues), "blocked");

const weakOperatorSecret = evaluateEnvReadiness({
  DATABASE_URL: "postgresql://real-user:real-pass@db.kiai.internal/kiai?sslmode=require",
  OPERATOR_SECRET: "dev-secret",
});
assert.equal(
  weakOperatorSecret.issues.some((issue) => issue.code === "missing_env_operator_secret"),
  false
);
assert.equal(
  weakOperatorSecret.issues.some((issue) => issue.code === "weak_env_operator_secret"),
  true
);

const fresh = evaluateSourceRefresh(
  { KIAI_SOURCE_REFRESHED_AT: "2026-06-03T00:00:00.000Z" },
  new Date("2026-06-05T00:00:00.000Z")
);
assert.equal(fresh.issues.length, 0);

const stale = evaluateSourceRefresh(
  { KIAI_SOURCE_REFRESHED_AT: "2026-05-20T00:00:00.000Z" },
  new Date("2026-06-05T00:00:00.000Z")
);
assert.equal(stale.issues[0]?.code, "source_refresh_stale");

const warning: OpsIssue = {
  severity: "warning",
  area: "orders",
  code: "orders_waiting_for_reconciliation",
  message: "Orders are waiting.",
};
const blocker: OpsIssue = {
  severity: "blocker",
  area: "settlement",
  code: "settlement_jobs_need_operator_action",
  message: "Settlement job failed.",
};

assert.equal(classifyOpsReadiness([]), "ready_for_founder_qa");
assert.equal(classifyOpsReadiness([warning]), "needs_review");
assert.equal(classifyOpsReadiness([warning, blocker]), "blocked");

console.log("ops-status tests passed");
