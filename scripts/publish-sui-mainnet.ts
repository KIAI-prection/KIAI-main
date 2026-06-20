/**
 * Sui Mainnet Package Publish Script
 *
 * Bypasses `sui client publish` CLI which depends on suix_getOwnedObjects indexer.
 * Uses @mysten/sui SDK (v2.x) with explicit gas coin ref (objectId + version + digest).
 *
 * Gas coin confirmed via suix_getCoins + sui_getObject — exists on-chain but
 * suix_getOwnedObjects indexer hasn't caught up (validator accumulator_settlement coin).
 *
 * Run: tsx -r dotenv/config scripts/publish-sui-mainnet.ts
 */

import { execFileSync } from "child_process";
import { join } from "path";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiGrpcClient } from "@mysten/sui/grpc";

const RPC = "https://fullnode.mainnet.sui.io:443";

// Confirmed via suix_getCoins + sui_getObject — indexer lag on suix_getOwnedObjects
const GAS_COIN = {
  objectId: "0x10d5f31284c36afe6a021abe2348414e9c9fc0cbfc70ef14329276701fe3c82c",
  version: "720392309",
  digest: "14fi5uC6efMETRxoFuQqE8v9Fp4UWE23F3guTXHemkz7",
} as const;

const OPERATOR_ADDRESS =
  "0x73e478cb66dd91fbc37d19f625f24a6d4b9846f86b5952dff04c1f843ac1b331";

const GAS_BUDGET = 500_000_000n;
// Confirmed mainnet gas price from RPC (suix_getReferenceGasPrice)
const GAS_PRICE = 1000n;

const PACKAGE_PATH = join(__dirname, "../contracts/sui");

async function main() {
  const privKey = process.env.SUI_OPERATOR_PRIVATE_KEY;
  if (!privKey) {
    throw new Error("SUI_OPERATOR_PRIVATE_KEY not set in .env");
  }

  const keypair = Ed25519Keypair.fromSecretKey(privKey);
  const address = keypair.getPublicKey().toSuiAddress();

  if (address !== OPERATOR_ADDRESS) {
    throw new Error(
      `Key mismatch: derived ${address}, expected ${OPERATOR_ADDRESS}`
    );
  }

  console.log("Operator address:", address);
  console.log("Gas coin:", GAS_COIN.objectId);

  // Use sui CLI to compile and dump bytecode as base64 (handles dep IDs correctly)
  console.log("Compiling Move package...");
  const buildOutput = execFileSync(
    "sui",
    ["move", "build", "--dump-bytecode-as-base64", "--path", PACKAGE_PATH],
    { encoding: "utf-8" }
  );

  // The output includes compilation logs; extract the JSON blob at the end
  const jsonMatch = buildOutput.match(/\{[\s\S]*"modules"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in build output:\n" + buildOutput);
  }

  const { modules, dependencies } = JSON.parse(jsonMatch[0]) as {
    modules: string[];
    dependencies: string[];
  };

  console.log(`Modules: ${modules.length}, Dependencies: ${dependencies.length}`);
  console.log("Dependencies:", dependencies);

  const client = new SuiGrpcClient({
    network: "mainnet",
    baseUrl: RPC,
  });

  const tx = new Transaction();
  tx.setSender(OPERATOR_ADDRESS);
  tx.setGasBudget(GAS_BUDGET);
  tx.setGasPrice(GAS_PRICE);

  // Explicit gas coin — bypasses suix_getOwnedObjects indexer
  tx.setGasPayment([GAS_COIN]);

  const [upgradeCap] = tx.publish({ modules, dependencies });

  // Transfer upgrade cap to operator (required — publish returns it)
  tx.transferObjects([upgradeCap], OPERATOR_ADDRESS);

  console.log("Signing and executing transaction on Sui Mainnet...");

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log("\n=== PUBLISH RESULT ===");

  if (result.$kind === "FailedTransaction") {
    const err = result.FailedTransaction;
    console.error("Transaction FAILED:", err.status?.error);
    console.error("Digest:", err.digest);
    process.exit(1);
  }

  const tx2 = result.Transaction!;
  const digest = tx2.digest;
  console.log("Status: SUCCESS");
  console.log("Digest:", digest);

  let packageId = "";
  let registryId = "";
  let operatorCapId = "";

  const objectChanges = tx2.effects?.objectChanges ?? [];
  for (const change of objectChanges) {
    if ("idOperation" in change && change.idOperation === "Created") {
      const objId = change.objectId;
      const objType = ("outputType" in change ? change.outputType : "") ?? "";
      console.log("Created:", objId, "type:", objType);

      if (objType.includes("::kiai_vault::Registry")) registryId = objId;
      if (objType.includes("::kiai_vault::OperatorCap")) operatorCapId = objId;
    }
    if ("packageId" in change && "type" in change && (change as { type: string }).type === "published") {
      packageId = (change as { packageId: string }).packageId;
      console.log("Package ID:", packageId);
    }
  }

  // Wait for indexing
  console.log("Waiting for transaction to be indexed...");
  await client.core.waitForTransaction({ digest });

  // Get checkpoint
  let checkpoint = "";
  try {
    const txData = await client.core.getTransactionBlock({
      digest,
      options: {},
    });
    checkpoint = String((txData as { checkpoint?: string | number }).checkpoint ?? "");
  } catch {
    console.log("Could not fetch checkpoint (non-fatal)");
  }

  console.log("\n=== ENV VARS TO SET IN .env ===");
  console.log(`SUI_MAINNET_KIAI_VAULT_PACKAGE_ID="${packageId}"`);
  console.log(`SUI_MAINNET_KIAI_VAULT_REGISTRY_ID="${registryId}"`);
  console.log(`SUI_MAINNET_KIAI_OPERATOR_CAP_ID="${operatorCapId}"`);
  console.log(`SUI_MAINNET_DEPLOYMENT_CHECKPOINT="${checkpoint}"`);

  console.log("\nNext steps:");
  console.log("1. Update .env with the values above");
  console.log("2. Update docs/DEPLOYMENTS.md");
  console.log("3. Run: pnpm deploy:mainnet-markets -- --sui-only");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
