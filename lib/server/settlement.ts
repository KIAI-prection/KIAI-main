import {
  Chain,
  SettlementAction,
  SettlementJobStatus,
  type Prisma,
  type SettlementJob,
} from "@prisma/client";
import type { Address } from "viem";
import { SettlementInstructionSchema } from "@/lib/domain/resolution-policy";
import {
  decimalToScaledBigInt,
  planSettlementAction,
} from "@/lib/domain/settlement-plan";
import {
  cancelMarketOnChain,
  resolveMarketOnChain,
} from "@/lib/server/base-execution";
import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";
import {
  cancelMarketOnSui,
  resolveMarketOnSui,
} from "@/lib/server/sui-execution";

const RUNNABLE_STATUSES: SettlementJobStatus[] = [
  SettlementJobStatus.PENDING,
  SettlementJobStatus.FAILED,
  SettlementJobStatus.RETRYING,
];

export async function ensureSettlementJobs(marketId: string) {
  const market = await db.market.findUnique({
    where: { id: marketId },
    include: {
      chainDeployments: true,
      resolution: true,
    },
  });

  if (!market) throw new Error("Market " + marketId + " not found.");
  if (!market.resolution || market.resolution.status !== "FINAL") {
    throw new Error("Market resolution must be FINAL before settlement jobs are created.");
  }
  const resolution = market.resolution;

  const instruction = SettlementInstructionSchema.parse(
    readSettlementInstruction(resolution.sourceSnapshot)
  );
  const plan = planSettlementAction(instruction);
  const instructionJson = toPrismaJson(instruction) as Prisma.InputJsonValue;

  return db.$transaction(async (tx) => {
    const jobs: SettlementJob[] = [];

    for (const deployment of market.chainDeployments) {
      const deploymentReady = deployment.deployStatus === "deployed";
      const lastError = deploymentReady
        ? plan.supported
          ? null
          : plan.reason
        : deployment.chain + " deployment is " + deployment.deployStatus + "; deploy before settlement.";

      jobs.push(
        await tx.settlementJob.upsert({
          where: {
            resolutionId_chain: {
              resolutionId: resolution.id,
              chain: deployment.chain,
            },
          },
          update: {},
          create: {
            marketId,
            resolutionId: resolution.id,
            chain: deployment.chain,
            action: plan.supported && deploymentReady
              ? (plan.action as SettlementAction)
              : SettlementAction.UNSUPPORTED,
            status: plan.supported && deploymentReady
              ? SettlementJobStatus.PENDING
              : SettlementJobStatus.BLOCKED,
            settlementInstruction: instructionJson,
            payoutMode: instruction.payoutMode,
            finalOutcome: instruction.finalOutcome,
            lastError,
          },
        })
      );
    }

    await tx.operatorAction.create({
      data: {
        operatorId: "system",
        action: "settlement_jobs_prepared",
        marketId,
        details: {
          resolutionId: resolution.id,
          jobCount: jobs.length,
          payoutMode: instruction.payoutMode,
          supported: plan.supported,
        },
      },
    });

    return jobs;
  });
}

export async function listSettlementJobs(marketId: string) {
  return db.settlementJob.findMany({
    where: { marketId },
    orderBy: [{ chain: "asc" }, { createdAt: "asc" }],
  });
}

export async function runSettlementForMarket(marketId: string) {
  const jobs = await ensureSettlementJobs(marketId);
  const results = [];

  for (const job of jobs) {
    if (RUNNABLE_STATUSES.includes(job.status)) {
      results.push(await runSettlementJob(job.id));
    } else {
      results.push({ job, skipped: true });
    }
  }

  return results;
}

export async function runSettlementJob(jobId: string, expectedMarketId?: string) {
  const job = await db.settlementJob.findUnique({
    where: { id: jobId },
    include: {
      market: { include: { chainDeployments: true } },
      resolution: true,
    },
  });

  if (!job) throw new Error("Settlement job " + jobId + " not found.");
  if (expectedMarketId && job.marketId !== expectedMarketId) {
    throw new Error("Settlement job does not belong to market " + expectedMarketId + ".");
  }
  if (!RUNNABLE_STATUSES.includes(job.status)) {
    return { job, skipped: true };
  }

  const instruction = SettlementInstructionSchema.parse(job.settlementInstruction);
  const plan = planSettlementAction(instruction);

  if (!plan.supported) {
    const blocked = await markJobBlocked(job.id, plan.reason);
    return { job: blocked, skipped: true };
  }

  const deployment = job.market.chainDeployments.find(
    (candidate) => candidate.chain === job.chain
  );
  if (!deployment) {
    const blocked = await markJobBlocked(
      job.id,
      "No " + job.chain + " deployment exists for this market."
    );
    return { job: blocked, skipped: true };
  }

  try {
    await db.settlementJob.update({
      where: { id: job.id },
      data: {
        status: SettlementJobStatus.SUBMITTED,
        attempts: { increment: 1 },
        submittedAt: new Date(),
        lastError: null,
      },
    });

    const txHash =
      plan.action === "RESOLVE"
        ? await executeResolve(job.marketId, job.chain, deployment, instruction.finalOutcome)
        : await executeCancel(job.marketId, job.chain, deployment);

    const confirmed = await db.settlementJob.update({
      where: { id: job.id },
      data: {
        status: SettlementJobStatus.CONFIRMED,
        txHash,
        confirmedAt: new Date(),
      },
    });

    await db.operatorAction.create({
      data: {
        operatorId: "system",
        action: "settlement_job_confirmed",
        marketId: job.marketId,
        details: {
          settlementJobId: job.id,
          chain: job.chain,
          action: plan.action,
          txHash,
        },
      },
    });

    return { job: confirmed, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown settlement error";
    const failed = await db.settlementJob.update({
      where: { id: job.id },
      data: {
        status: SettlementJobStatus.FAILED,
        lastError: message,
      },
    });
    return { job: failed, skipped: false, error: message };
  }
}

function readSettlementInstruction(sourceSnapshot: Prisma.JsonValue | null) {
  if (
    !sourceSnapshot ||
    typeof sourceSnapshot !== "object" ||
    Array.isArray(sourceSnapshot)
  ) {
    throw new Error("Resolution does not contain a settlement instruction.");
  }

  return (sourceSnapshot as Record<string, unknown>).settlementInstruction;
}

async function executeResolve(
  marketId: string,
  chain: Chain,
  deployment: { contractAddress: string | null; poolAddress: string | null },
  finalOutcome: string | null
) {
  if (!finalOutcome) {
    throw new Error("Resolve settlement requires a final outcome.");
  }

  const totalWinningShares = await getTotalWinningShares(
    marketId,
    chain,
    finalOutcome
  );
  if (totalWinningShares <= 0n) {
    throw new Error(
      "No positive winning shares found for this chain. Current vault contracts require totalWinningShares > 0 to resolve."
    );
  }

  if (chain === Chain.BASE) {
    if (!deployment.contractAddress) {
      throw new Error("Base settlement requires a vault contract address.");
    }

    const result = await resolveMarketOnChain(
      deployment.contractAddress as Address,
      marketId,
      finalOutcome,
      totalWinningShares
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.txHash;
  }

  if (!deployment.poolAddress) {
    throw new Error("Sui settlement requires a market object pool address.");
  }

  const result = await resolveMarketOnSui(
    deployment.poolAddress,
    finalOutcome,
    totalWinningShares
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.digest;
}

async function executeCancel(
  marketId: string,
  chain: Chain,
  deployment: { contractAddress: string | null; poolAddress: string | null }
) {
  if (chain === Chain.BASE) {
    if (!deployment.contractAddress) {
      throw new Error("Base cancellation requires a vault contract address.");
    }

    const result = await cancelMarketOnChain(
      deployment.contractAddress as Address,
      marketId
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.txHash;
  }

  if (!deployment.poolAddress) {
    throw new Error("Sui cancellation requires a market object pool address.");
  }

  const result = await cancelMarketOnSui(deployment.poolAddress);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.digest;
}

async function getTotalWinningShares(
  marketId: string,
  chain: Chain,
  finalOutcome: string
) {
  const positions = await db.userPosition.findMany({
    where: {
      marketId,
      chain,
      outcomeSlug: finalOutcome,
      side: "yes",
    },
    select: { shares: true },
  });

  return positions.reduce(
    (total, position) => total + decimalToScaledBigInt(position.shares),
    0n
  );
}

async function markJobBlocked(jobId: string, reason: string) {
  return db.settlementJob.update({
    where: { id: jobId },
    data: {
      status: SettlementJobStatus.BLOCKED,
      action: SettlementAction.UNSUPPORTED,
      lastError: reason,
    },
  });
}
