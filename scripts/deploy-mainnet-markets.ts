import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { Chain } from "@prisma/client";
import type { Address } from "viem";
import { db } from "@/lib/server/db";
import { createMarketOnChain, type ExecutionResult } from "@/lib/server/base-execution";
import {
  getOperatorKeypair,
  getSuiClient,
  marketIdToBytes,
  SUI_OPERATOR_CAP_ID,
  SUI_PACKAGE_ID,
  USDC_TYPE,
} from "@/lib/server/sui-execution";

type ChangedObject = {
  objectId: string;
  idOperation: string;
  outputOwner?: { $kind?: string } | null;
};

type SuiCreateMarketResult = {
  $kind: "Transaction" | "FailedTransaction";
  Transaction?: {
    digest: string;
    status: { success: boolean; error: unknown };
    effects?: { changedObjects?: ChangedObject[] };
    objectTypes?: Record<string, string>;
  };
  FailedTransaction?: {
    status: { error: unknown };
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + " is required.");
  return value;
}

function executionErrorMessage(error: ExecutionResult & { ok: false }) {
  switch (error.error.kind) {
    case "simulation_failed":
    case "wallet_rejected":
    case "chain_failed":
    case "rpc_error":
      return error.error.message;
    case "receipt_timeout":
      return "Timed out waiting for receipt.";
  }
}

function findCreatedMarketObject(result: SuiCreateMarketResult) {
  if (result.$kind !== "Transaction") return null;

  const objectTypes = result.Transaction?.objectTypes ?? {};
  const changedObjects = result.Transaction?.effects?.changedObjects ?? [];

  return (
    changedObjects.find((object) => {
      const type = objectTypes[object.objectId];
      return (
        object.idOperation === "Created" &&
        object.outputOwner?.$kind === "Shared" &&
        typeof type === "string" &&
        type.includes(SUI_PACKAGE_ID + "::kiai_vault::Market<")
      );
    }) ?? null
  );
}

async function deployBaseMarket(marketId: string, vaultAddress: Address) {
  const deployment = await db.chainDeployment.findUnique({
    where: { marketId_chain: { marketId, chain: Chain.BASE } },
  });

  if (
    deployment?.deployStatus === "deployed" &&
    deployment.contractAddress?.toLowerCase() === vaultAddress.toLowerCase()
  ) {
    return { action: "skipped", reason: "already_deployed" };
  }

  const result: ExecutionResult = await createMarketOnChain(vaultAddress, marketId);
  if (!result.ok) {
    await db.chainDeployment.update({
      where: { marketId_chain: { marketId, chain: Chain.BASE } },
      data: {
        deployStatus: "deploy_failed",
        failureReason: executionErrorMessage(result),
      },
    });
    return { action: "failed", error: result.error };
  }

  await db.chainDeployment.update({
    where: { marketId_chain: { marketId, chain: Chain.BASE } },
    data: {
      deployStatus: "deployed",
      collateral: "USDC_BASE_MAINNET",
      contractAddress: vaultAddress,
      poolAddress: vaultAddress,
      failureReason: null,
    },
  });

  await db.operatorAction.create({
    data: {
      operatorId: "mainnet-market-deploy",
      action: "deploy_result_recorded",
      marketId,
      details: {
        chain: "BASE",
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
        contractAddress: vaultAddress,
      },
    },
  });

  return { action: "deployed", txHash: result.txHash, blockNumber: result.blockNumber.toString() };
}

async function deploySuiMarket(marketId: string) {
  const deployment = await db.chainDeployment.findUnique({
    where: { marketId_chain: { marketId, chain: Chain.SUI } },
  });

  if (
    deployment?.deployStatus === "deployed" &&
    deployment.contractAddress === SUI_PACKAGE_ID &&
    deployment.poolAddress
  ) {
    return { action: "skipped", reason: "already_deployed" };
  }

  const keypair = getOperatorKeypair();
  const client = getSuiClient();
  const operatorAddress = keypair.toSuiAddress();
  const balance = await client.getBalance({ owner: operatorAddress });
  const gasMist = BigInt(balance.balance.balance);

  if (gasMist < 50_000_000n) {
    throw new Error(
      "Operator Sui balance is too low for deployment. Address: " +
        operatorAddress +
        ", MIST: " +
        balance.balance.balance
    );
  }

  const tx = new Transaction();
  const marketIdBytes = await marketIdToBytes(marketId);

  tx.moveCall({
    target: SUI_PACKAGE_ID + "::kiai_vault::create_market",
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(SUI_OPERATOR_CAP_ID),
      tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(marketIdBytes))),
    ],
  });

  const result = (await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    include: { effects: true, events: true, objectTypes: true },
  })) as SuiCreateMarketResult;

  if (result.$kind === "FailedTransaction") {
    const error = JSON.stringify(result.FailedTransaction?.status.error);
    await db.chainDeployment.update({
      where: { marketId_chain: { marketId, chain: Chain.SUI } },
      data: { deployStatus: "deploy_failed", failureReason: error },
    });
    return { action: "failed", error };
  }

  const digest = result.Transaction?.digest;
  if (!digest) throw new Error("Sui create_market did not return a digest.");
  await client.core.waitForTransaction({ digest });

  const marketObject = findCreatedMarketObject(result);
  if (!marketObject) {
    throw new Error("Sui create_market succeeded (" + digest + ") but Market object id was not found.");
  }

  await db.chainDeployment.update({
    where: { marketId_chain: { marketId, chain: Chain.SUI } },
    data: {
      deployStatus: "deployed",
      collateral: "USDC_SUI_MAINNET",
      contractAddress: SUI_PACKAGE_ID,
      poolAddress: marketObject.objectId,
      failureReason: null,
    },
  });

  await db.operatorAction.create({
    data: {
      operatorId: "mainnet-market-deploy",
      action: "deploy_result_recorded",
      marketId,
      details: {
        chain: "SUI",
        digest,
        poolAddress: marketObject.objectId,
        packageId: SUI_PACKAGE_ID,
      },
    },
  });

  return {
    action: "deployed",
    digest,
    poolAddress: marketObject.objectId,
    operatorAddress,
  };
}

async function main() {
  const baseVaultAddress = requiredEnv("BASE_MAINNET_KIAI_VAULT_ADDRESS") as Address;
  const baseOnly = process.argv.includes("--base-only");
  const suiOnly = process.argv.includes("--sui-only");

  if (baseOnly && suiOnly) {
    throw new Error("Use only one of --base-only or --sui-only.");
  }

  if (!baseOnly) {
    requiredEnv("SUI_MAINNET_KIAI_VAULT_PACKAGE_ID");
    requiredEnv("SUI_MAINNET_KIAI_OPERATOR_CAP_ID");
  }

  const markets = await db.market.findMany({
    where: { lifecycle: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, lifecycle: true },
  });

  const results = [];
  for (const market of markets) {
    const base = suiOnly ? { action: "skipped", reason: "sui_only" } : await deployBaseMarket(market.id, baseVaultAddress);
    const sui = baseOnly ? { action: "skipped", reason: "base_only" } : await deploySuiMarket(market.id);
    results.push({
      marketId: market.id,
      slug: market.slug,
      lifecycle: market.lifecycle,
      base,
      sui,
    });
  }

  console.log(JSON.stringify({ action: "mainnet_markets_deployed", results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
