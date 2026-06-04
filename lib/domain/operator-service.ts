/**
 * Operator domain service.
 *
 * Owns: market lifecycle transitions, chain deployment state, operator audit logging.
 * All state changes go through this service — never direct DB writes in route handlers.
 *
 * Architecture note: Base and Sui are payment rails only. The market pool (LMSR state,
 * prices, probabilities) is unified in this backend. Lifecycle changes affect the single
 * market record, not separate per-chain markets.
 */

import {
  MarketLifecycle,
  Chain,
  CollateralAsset,
  EvidenceSnapshotKind,
  EvidenceSnapshotStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";
import {
  buildSettlementInstruction,
  SettlementInstructionRequest,
  SettlementInstructionRequestSchema,
} from "@/lib/domain/resolution-policy";
import { ResolutionEvidenceSchema } from "@/lib/domain/resolution-evidence";
import { createSnapshotHash } from "@/lib/domain/resolution-governance";
import { assertMarketResolutionPolicyReady } from "@/lib/domain/market-resolution-policy";

// ---------------------------------------------------------------------------
// Allowed lifecycle transitions
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<MarketLifecycle, MarketLifecycle[]> = {
  DRAFT: ["REVIEWED"],
  REVIEWED: ["DRAFT", "DEPLOY_PENDING"],
  DEPLOY_PENDING: ["LIVE", "DEPLOY_FAILED", "DRAFT"],
  DEPLOY_FAILED: ["DRAFT", "DEPLOY_PENDING"],
  LIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["LIVE", "CLOSED"],
  CLOSED: ["RESOLVING"],
  RESOLVING: ["DISPUTED", "RESOLVED"],
  DISPUTED: ["RESOLVING"],
  RESOLVED: ["SETTLING"],
  SETTLING: ["SETTLED", "SETTLEMENT_FAILED"],
  SETTLEMENT_FAILED: ["SETTLING"],
  SETTLED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(
  from: MarketLifecycle,
  to: MarketLifecycle
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Create market
// ---------------------------------------------------------------------------

export interface CreateOutcomeInput {
  slug: string;
  name: string;
  flag?: string;
  sortOrder?: number;
}

export interface CreateMarketInput {
  slug: string;
  titleEn: string;
  titleJa?: string;
  subtitleEn?: string;
  subtitleJa?: string;
  category: string;
  categoryLabelEn: string;
  categoryLabelJa?: string;
  openAt?: Date;
  closeAt?: Date;
  outcomes: CreateOutcomeInput[];
  /** LMSR liquidity parameter. Default 100. Higher = more liquidity. */
  lmsrB?: number;
  /** Source policy description (e.g. "Official NHK result page") */
  sourcePolicyEn?: string;
  /** Compliance: blocked regions */
  blockedRegions?: string[];
  /** Whether to create chain deployments for both rails */
  createChainDeployments?: boolean;
}

export async function createMarket(
  input: CreateMarketInput,
  operatorId: string
) {
  const {
    outcomes,
    lmsrB = 100,
    blockedRegions = [],
    createChainDeployments = true,
    sourcePolicyEn: _sourcePolicyEn,
    ...marketData
  } = input;

  if (outcomes.length < 2) {
    throw new Error("A market must have at least 2 outcomes.");
  }

  // Check slug uniqueness
  const existing = await db.market.findUnique({
    where: { slug: marketData.slug },
  });
  if (existing) {
    throw new Error(`Slug "${marketData.slug}" is already taken.`);
  }

  const market = await db.$transaction(async (tx) => {
    // Create core market
    const m = await tx.market.create({
      data: {
        ...marketData,
        titleJa: marketData.titleJa ?? "",
        subtitleEn: marketData.subtitleEn ?? "",
        subtitleJa: marketData.subtitleJa ?? "",
        categoryLabelJa: marketData.categoryLabelJa ?? "",
        lifecycle: "DRAFT",
        lmsrB,
        qYes: 0,
        qNo: 0,
        // Create outcomes
        outcomes: {
          create: outcomes.map((o, i) => ({
            slug: o.slug,
            name: o.name,
            flag: o.flag,
            chance: Math.round(100 / outcomes.length),
            priceYes: 50,
            priceNo: 50,
            sortOrder: o.sortOrder ?? i,
          })),
        },
        // Create compliance policy
        compliancePolicy: {
          create: {
            blockedRegions,
            kycTierRequired: 0,
          },
        },
        // Create resolution record
        resolution: {
          create: { status: "PENDING" },
        },
      },
      include: {
        outcomes: true,
        compliancePolicy: true,
        resolution: true,
      },
    });

    // Create chain deployments for both rails
    if (createChainDeployments) {
      await tx.chainDeployment.createMany({
        data: [
          {
            marketId: m.id,
            chain: Chain.BASE,
            collateral: CollateralAsset.USDC_BASE_SEPOLIA,
            deployStatus: "not_deployed",
          },
          {
            marketId: m.id,
            chain: Chain.SUI,
            collateral: CollateralAsset.USDC_SUI_TESTNET,
            deployStatus: "not_deployed",
          },
        ],
      });
    }

    // Record audit
    await tx.operatorAction.create({
      data: {
        operatorId,
        action: "create_market",
        marketId: m.id,
        details: { slug: m.slug, titleEn: m.titleEn, category: m.category },
      },
    });

    return m;
  });

  return market;
}

// ---------------------------------------------------------------------------
// Lifecycle transition
// ---------------------------------------------------------------------------

export async function transitionLifecycle(
  marketId: string,
  to: MarketLifecycle,
  operatorId: string,
  reason?: string
) {
  const market = await db.market.findUnique({
    where: { id: marketId },
    select: { lifecycle: true, slug: true, resolutionPolicy: true },
  });

  if (!market) throw new Error(`Market ${marketId} not found.`);
  if (["REVIEWED", "DEPLOY_PENDING", "LIVE"].includes(to)) {
    try {
      assertMarketResolutionPolicyReady(market.resolutionPolicy);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid policy";
      throw new Error(
        "Market must have a valid resolution policy before " + to + ". " + message
      );
    }
  }

  if (!canTransition(market.lifecycle, to)) {
    throw new Error(
      `Cannot transition from ${market.lifecycle} → ${to}.`
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const m = await tx.market.update({
      where: { id: marketId },
      data: { lifecycle: to },
    });

    await tx.operatorAction.create({
      data: {
        operatorId,
        action: "lifecycle_transition",
        marketId,
        details: { from: market.lifecycle, to, reason },
      },
    });

    return m;
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Chain deployment controls
// ---------------------------------------------------------------------------

export async function markDeployPending(
  marketId: string,
  chain: Chain,
  operatorId: string
) {
  const market = await db.market.findUnique({
    where: { id: marketId },
    select: { lifecycle: true },
  });

  if (!market) throw new Error(`Market ${marketId} not found.`);
  if (market.lifecycle !== "REVIEWED") {
    throw new Error(
      `Market must be REVIEWED before deploy. Current: ${market.lifecycle}`
    );
  }

  await db.$transaction(async (tx) => {
    await tx.chainDeployment.update({
      where: { marketId_chain: { marketId, chain } },
      data: { deployStatus: "deploy_pending" },
    });

    // If both chains are now pending or deployed, transition market
    await tx.operatorAction.create({
      data: {
        operatorId,
        action: "deploy_triggered",
        marketId,
        details: { chain },
      },
    });
  });
}

export async function recordDeployResult(
  marketId: string,
  chain: Chain,
  result: {
    success: boolean;
    contractAddress?: string;
    poolAddress?: string;
    failureReason?: string;
  },
  operatorId: string
) {
  await db.$transaction(async (tx) => {
    await tx.chainDeployment.update({
      where: { marketId_chain: { marketId, chain } },
      data: {
        deployStatus: result.success ? "deployed" : "failed",
        contractAddress: result.contractAddress,
        poolAddress: result.poolAddress,
        failureReason: result.failureReason,
      },
    });

    // Check if all deployments are done → transition market to LIVE
    if (result.success) {
      const deployments = await tx.chainDeployment.findMany({
        where: { marketId },
        select: { deployStatus: true },
      });

      const allDeployed = deployments.every(
        (d) => d.deployStatus === "deployed"
      );

      if (allDeployed) {
        await tx.market.update({
          where: { id: marketId },
          data: { lifecycle: "LIVE" },
        });
      }
    }

    await tx.operatorAction.create({
      data: {
        operatorId,
        action: result.success ? "deploy_success" : "deploy_failed",
        marketId,
        details: { chain, ...result },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Pause / unpause
// ---------------------------------------------------------------------------

export async function pauseMarket(
  marketId: string,
  operatorId: string,
  reason: string
) {
  await transitionLifecycle(marketId, "PAUSED", operatorId, reason);
}

export async function unpauseMarket(
  marketId: string,
  operatorId: string,
  reason?: string
) {
  await transitionLifecycle(marketId, "LIVE", operatorId, reason);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

type ResolutionOutcomeCandidate = {
  slug: string;
  name: string;
};

function normalizeResolutionOutcome(
  input: string,
  outcomes: ResolutionOutcomeCandidate[]
): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const match = outcomes.find(
    (outcome) =>
      outcome.slug === trimmed ||
      outcome.slug.toLowerCase() === lower ||
      outcome.name.toLowerCase() === lower
  );

  if (!match) {
    const valid = outcomes
      .map((outcome) => `${outcome.slug} (${outcome.name})`)
      .join(", ");
    throw new Error(
      `Invalid resolution outcome "${input}". Valid outcomes: ${valid}`
    );
  }

  return match.slug;
}

export interface ProposeResolutionInput {
  proposedOutcome?: string | null;
  proposedSettlement?: SettlementInstructionRequest;
}

export async function proposeResolution(
  marketId: string,
  input: string | ProposeResolutionInput,
  sourceSnapshot: Record<string, unknown>,
  operatorId: string
) {
  const proposal =
    typeof input === "string" ? { proposedOutcome: input } : input;
  const market = await db.market.findUnique({
    where: { id: marketId },
    select: {
      lifecycle: true,
      outcomes: { select: { slug: true, name: true } },
    },
  });

  if (!market) throw new Error(`Market ${marketId} not found.`);
  if (!["CLOSED", "RESOLVING"].includes(market.lifecycle)) {
    throw new Error(
      `Market must be CLOSED or RESOLVING to propose resolution. Current: ${market.lifecycle}`
    );
  }

  const evidence = ResolutionEvidenceSchema.parse(sourceSnapshot);
  const proposedSettlement = proposal.proposedSettlement
    ? SettlementInstructionRequestSchema.parse(proposal.proposedSettlement)
    : undefined;
  const normalizedOutcome = proposal.proposedOutcome
    ? normalizeResolutionOutcome(proposal.proposedOutcome, market.outcomes)
    : null;

  if (!normalizedOutcome && !isNonOutcomeResolutionProposal(proposedSettlement)) {
    throw new Error(
      "Resolution proposal requires proposedOutcome unless proposing a non-outcome settlement such as full refund, split, fractional, or manual review."
    );
  }

  const resolutionSnapshot = toPrismaJson(
    evidence
  ) as Prisma.InputJsonObject;
  const disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    // Close market first if needed
    if (market.lifecycle === "CLOSED") {
      await tx.market.update({
        where: { id: marketId },
        data: { lifecycle: "RESOLVING" },
      });
    }

    const resolutionRecord = await tx.resolution.upsert({
      where: { marketId },
      update: {
        proposedOutcome: normalizedOutcome,
        sourceSnapshot: resolutionSnapshot,
        proposer: operatorId,
        status: "DISPUTE_WINDOW",
        disputeDeadline,
      },
      create: {
        marketId,
        proposedOutcome: normalizedOutcome,
        sourceSnapshot: resolutionSnapshot,
        proposer: operatorId,
        status: "DISPUTE_WINDOW",
        disputeDeadline,
      },
    });

    const primarySource = evidence.sources[0];
    await tx.evidenceSnapshot.create({
      data: {
        marketId,
        resolutionId: resolutionRecord.id,
        kind: evidenceSourceTypeToSnapshotKind(primarySource.type),
        status:
          evidence.sourceCertainty === "provisional"
            ? EvidenceSnapshotStatus.CAPTURED
            : EvidenceSnapshotStatus.VERIFIED,
        sourceName: primarySource.name,
        sourceUrl: primarySource.url,
        payloadHash:
          evidence.evidenceHash ??
          evidence.rawPayloadHash ??
          createSnapshotHash(evidence),
        rawPayload: resolutionSnapshot,
        observedOutcome: primarySource.observedOutcome ?? normalizedOutcome ?? undefined,
        providerEventStatus:
          primarySource.providerEventStatus ?? evidence.providerEventStatus,
        sourceCertainty: evidence.sourceCertainty,
        capturedAt: primarySource.fetchedAt
          ? new Date(primarySource.fetchedAt)
          : undefined,
        capturedBy: operatorId,
        notes: primarySource.notes,
      },
    });

    await tx.operatorAction.create({
      data: {
        operatorId,
        action: "resolution_proposed",
        marketId,
        details: {
          proposedOutcome: normalizedOutcome,
          proposedPayoutMode: proposedSettlement?.payoutMode ?? "winner_take_all",
          proposedRefundPolicy: proposedSettlement?.refundPolicy ?? "none",
          sourceCertainty: evidence.sourceCertainty,
          sourceSnapshotKeys: Object.keys(evidence),
          disputeDeadline: disputeDeadline.toISOString(),
        },
      },
    });
  });

  return { proposedOutcome: normalizedOutcome, disputeDeadline };
}

function evidenceSourceTypeToSnapshotKind(
  type: "official" | "api" | "archive" | "screenshot" | "operator_note"
) {
  if (type === "official") return EvidenceSnapshotKind.OFFICIAL_SOURCE;
  if (type === "api") return EvidenceSnapshotKind.API_PAYLOAD;
  if (type === "archive") return EvidenceSnapshotKind.ARCHIVE;
  if (type === "screenshot") return EvidenceSnapshotKind.SCREENSHOT;
  return EvidenceSnapshotKind.OPERATOR_NOTE;
}

function isNonOutcomeResolutionProposal(
  settlement?: SettlementInstructionRequest
) {
  if (!settlement) return false;
  return settlement.payoutMode !== "winner_take_all";
}

export interface FinalizeResolutionInput {
  finalOutcome?: string;
  settlement?: SettlementInstructionRequest;
}

export async function finalizeResolution(
  marketId: string,
  input: string | FinalizeResolutionInput,
  operatorId: string
) {
  const finalization =
    typeof input === "string" ? { finalOutcome: input } : input;
  const market = await db.market.findUnique({
    where: { id: marketId },
    include: {
      resolution: true,
      outcomes: { select: { slug: true, name: true } },
    },
  });

  if (!market) throw new Error(`Market ${marketId} not found.`);
  if (market.lifecycle !== "RESOLVING") {
    throw new Error(
      `Market must be RESOLVING to finalize. Current: ${market.lifecycle}`
    );
  }
  if (
    !market.resolution ||
    !["DISPUTE_WINDOW", "DISPUTED", "ADJUDICATING"].includes(
      market.resolution.status
    )
  ) {
    throw new Error("Market must have a proposed resolution before finalization.");
  }

  const normalizedOutcome = finalization.finalOutcome
    ? normalizeResolutionOutcome(finalization.finalOutcome, market.outcomes)
    : undefined;
  const allowEarlyFinalize =
    process.env.KIAI_ALLOW_EARLY_RESOLUTION_FINALIZE === "true";
  if (
    market.resolution.disputeDeadline &&
    market.resolution.disputeDeadline > new Date() &&
    !allowEarlyFinalize
  ) {
    throw new Error(
      `Resolution dispute window is still open until ${market.resolution.disputeDeadline.toISOString()}.`
    );
  }

  const evidence = ResolutionEvidenceSchema.parse(
    market.resolution.sourceSnapshot ?? {}
  );
  const settlementInstruction = buildSettlementInstruction({
    resolutionId: market.resolution.id,
    marketId,
    outcomes: market.outcomes,
    finalOutcome: normalizedOutcome,
    evidence,
    settlement: finalization.settlement,
    finalizedBy: operatorId,
  });
  const finalSourceSnapshot = toPrismaJson({
    ...evidence,
    settlementInstruction,
  }) as Prisma.InputJsonObject;

  await db.$transaction(async (tx) => {
    await tx.resolution.update({
      where: { marketId },
      data: {
        finalOutcome: normalizedOutcome ?? null,
        sourceSnapshot: finalSourceSnapshot,
        status: "FINAL",
      },
    });

    await tx.market.update({
      where: { id: marketId },
      data: { lifecycle: "RESOLVED" },
    });

    await tx.operatorAction.create({
      data: {
        operatorId,
        action: "resolution_finalized",
        marketId,
        details: {
          finalOutcome: normalizedOutcome ?? null,
          payoutMode: settlementInstruction.payoutMode,
          refundPolicy: settlementInstruction.refundPolicy,
          sourceCertainty: settlementInstruction.sourceCertainty,
          evidenceBundleHash: settlementInstruction.evidenceBundleHash,
        },
      },
    });
  });

  return {
    finalOutcome: normalizedOutcome ?? null,
    settlementInstruction,
  };
}
