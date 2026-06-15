import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { db } from "@/lib/server/db";
import {
  getOperatorKeypair,
  getSuiClient,
  marketIdToBytes,
  SUI_OPERATOR_CAP_ID,
  SUI_PACKAGE_ID,
  USDC_TYPE,
} from "@/lib/server/sui-execution";

const marketId = process.argv[2];

if (!marketId) {
  console.error("Usage: pnpm exec tsx -r dotenv/config scripts/deploy-sui-market.ts <market-id>");
  process.exit(1);
}

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

async function main() {
  const market = await db.market.findUnique({
    where: { id: marketId },
    include: { chainDeployments: true },
  });

  if (!market) throw new Error("Market " + marketId + " not found.");
  if (market.lifecycle !== "LIVE") {
    throw new Error("Market must be LIVE for demo trading. Current lifecycle: " + market.lifecycle);
  }

  const suiDeployment = market.chainDeployments.find((deployment) => deployment.chain === "SUI");
  if (!suiDeployment) throw new Error("Sui deployment record missing for " + marketId + ".");

  if (suiDeployment.deployStatus === "deployed" && suiDeployment.poolAddress) {
    console.log(
      JSON.stringify(
        {
          action: "already_deployed",
          marketId,
          poolAddress: suiDeployment.poolAddress,
        },
        null,
        2
      )
    );
    return;
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
    throw new Error(
      "Sui create_market failed: " + JSON.stringify(result.FailedTransaction?.status.error)
    );
  }

  const digest = result.Transaction?.digest;
  if (!digest) throw new Error("Sui create_market did not return a digest.");
  await client.core.waitForTransaction({ digest });

  const marketObject = findCreatedMarketObject(result);
  if (!marketObject) {
    throw new Error("Sui create_market succeeded (" + digest + ") but Market object id was not found.");
  }

  await db.chainDeployment.update({
    where: { marketId_chain: { marketId, chain: "SUI" } },
    data: {
      deployStatus: "deployed",
      contractAddress: SUI_PACKAGE_ID,
      poolAddress: marketObject.objectId,
      failureReason: null,
    },
  });

  await db.operatorAction.create({
    data: {
      operatorId: "local-demo-deploy",
      action: "deploy_result_recorded",
      marketId,
      details: {
        chain: "SUI",
        digest,
        poolAddress: marketObject.objectId,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        action: "deployed",
        marketId,
        digest,
        poolAddress: marketObject.objectId,
        operatorAddress,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
