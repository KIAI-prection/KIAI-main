import { createHash } from "node:crypto";
import { z } from "zod";
import {
  EvidenceSnapshotKind,
  EvidenceSnapshotStatus,
  OracleAssertionStatus,
  ResolutionDisputeReason,
  ResolutionDisputeStatus,
  ResolutionStatus,
} from "@prisma/client";
import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";

const Hash32Schema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Hash must be a 32-byte hex string");

export const EvidenceSnapshotInputSchema = z
  .object({
    kind: z.nativeEnum(EvidenceSnapshotKind),
    status: z.nativeEnum(EvidenceSnapshotStatus).default("CAPTURED"),
    sourceName: z.string().min(2).max(160),
    sourceUrl: z.string().url().max(2_000).optional(),
    archiveUrl: z.string().url().max(2_000).optional(),
    screenshotUrl: z.string().url().max(2_000).optional(),
    payloadHash: Hash32Schema.optional(),
    rawPayload: z.unknown().optional(),
    observedOutcome: z.string().min(1).max(200).optional(),
    providerEventStatus: z.string().min(1).max(80).optional(),
    sourceCertainty: z.string().min(1).max(80).optional(),
    capturedAt: z.string().datetime().optional(),
    notes: z.string().max(1_000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.payloadHash && value.rawPayload === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payloadHash"],
        message: "Evidence snapshot requires payloadHash or rawPayload.",
      });
    }
  });

export const OpenResolutionDisputeInputSchema = z
  .object({
    reason: z.nativeEnum(ResolutionDisputeReason),
    summary: z.string().min(10).max(2_000),
    evidence: z.unknown().optional(),
  })
  .strict();

export const ResolveResolutionDisputeInputSchema = z
  .object({
    status: z.enum(["RESOLVED", "REJECTED"]),
    resolutionNote: z.string().min(10).max(2_000),
  })
  .strict();

export const OracleAssertionInputSchema = z
  .object({
    provider: z.enum(["uma_oo_v2", "uma_oo_v3", "chainlink_functions", "reality_eth", "custom_api"]),
    status: z.nativeEnum(OracleAssertionStatus).default("REQUESTED"),
    assertionId: z.string().min(1).max(200).optional(),
    requestId: z.string().min(1).max(200).optional(),
    bond: z.string().min(1).max(120).optional(),
    livenessSeconds: z.number().int().positive().max(30 * 24 * 60 * 60).optional(),
    assertedOutcome: z.string().min(1).max(200).optional(),
    payload: z.unknown().optional(),
    settledAt: z.string().datetime().optional(),
  })
  .strict();

export type EvidenceSnapshotInput = z.infer<typeof EvidenceSnapshotInputSchema>;
export type OpenResolutionDisputeInput = z.infer<
  typeof OpenResolutionDisputeInputSchema
>;
export type ResolveResolutionDisputeInput = z.infer<
  typeof ResolveResolutionDisputeInputSchema
>;
export type OracleAssertionInput = z.infer<typeof OracleAssertionInputSchema>;

export function createSnapshotHash(value: unknown) {
  return `0x${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

export function canOpenResolutionDispute(status: ResolutionStatus) {
  return (
    status === ResolutionStatus.DISPUTE_WINDOW ||
    status === ResolutionStatus.DISPUTED ||
    status === ResolutionStatus.ADJUDICATING
  );
}

export async function createEvidenceSnapshot(
  marketId: string,
  input: EvidenceSnapshotInput,
  capturedBy: string
) {
  const parsed = EvidenceSnapshotInputSchema.parse(input);
  const resolution = await getResolutionForMarket(marketId);
  const payloadHash = parsed.payloadHash ?? createSnapshotHash(parsed.rawPayload);

  return db.$transaction(async (tx) => {
    const snapshot = await tx.evidenceSnapshot.create({
      data: {
        marketId,
        resolutionId: resolution.id,
        kind: parsed.kind,
        status: parsed.status,
        sourceName: parsed.sourceName,
        sourceUrl: parsed.sourceUrl,
        archiveUrl: parsed.archiveUrl,
        screenshotUrl: parsed.screenshotUrl,
        payloadHash,
        rawPayload:
          parsed.rawPayload === undefined
            ? undefined
            : toPrismaJson(parsed.rawPayload),
        observedOutcome: parsed.observedOutcome,
        providerEventStatus: parsed.providerEventStatus,
        sourceCertainty: parsed.sourceCertainty,
        capturedAt: parsed.capturedAt ? new Date(parsed.capturedAt) : undefined,
        capturedBy,
        notes: parsed.notes,
      },
    });

    await tx.operatorAction.create({
      data: {
        operatorId: capturedBy,
        action: "evidence_snapshot_created",
        marketId,
        details: {
          evidenceSnapshotId: snapshot.id,
          kind: snapshot.kind,
          payloadHash: snapshot.payloadHash,
          sourceName: snapshot.sourceName,
        },
      },
    });

    return snapshot;
  });
}

export async function listEvidenceSnapshots(marketId: string) {
  return db.evidenceSnapshot.findMany({
    where: { marketId },
    orderBy: { capturedAt: "desc" },
  });
}

export async function openResolutionDispute(
  marketId: string,
  input: OpenResolutionDisputeInput,
  openedBy: string
) {
  const parsed = OpenResolutionDisputeInputSchema.parse(input);
  const resolution = await getResolutionForMarket(marketId);
  if (!canOpenResolutionDispute(resolution.status)) {
    throw new Error(
      "Resolution must be proposed or adjudicating before a dispute can be opened."
    );
  }

  return db.$transaction(async (tx) => {
    const dispute = await tx.resolutionDispute.create({
      data: {
        marketId,
        resolutionId: resolution.id,
        reason: parsed.reason,
        summary: parsed.summary,
        evidence:
          parsed.evidence === undefined
            ? undefined
            : toPrismaJson(parsed.evidence),
        openedBy,
      },
    });

    await tx.resolution.update({
      where: { id: resolution.id },
      data: { status: ResolutionStatus.DISPUTED },
    });

    await tx.market.update({
      where: { id: marketId },
      data: { lifecycle: "DISPUTED" },
    });

    await tx.operatorAction.create({
      data: {
        operatorId: openedBy,
        action: "resolution_dispute_opened",
        marketId,
        details: {
          resolutionDisputeId: dispute.id,
          reason: dispute.reason,
          summary: dispute.summary,
        },
      },
    });

    return dispute;
  });
}

export async function listResolutionDisputes(marketId: string) {
  return db.resolutionDispute.findMany({
    where: { marketId },
    orderBy: { openedAt: "desc" },
  });
}

export async function resolveResolutionDispute(
  marketId: string,
  disputeId: string,
  input: ResolveResolutionDisputeInput,
  resolvedBy: string
) {
  const parsed = ResolveResolutionDisputeInputSchema.parse(input);

  return db.$transaction(async (tx) => {
    const dispute = await tx.resolutionDispute.findFirst({
      where: { id: disputeId, marketId },
    });
    if (!dispute) {
      throw new Error("Resolution dispute not found.");
    }
    if (
      dispute.status !== ResolutionDisputeStatus.OPEN &&
      dispute.status !== ResolutionDisputeStatus.ADJUDICATING
    ) {
      throw new Error("Resolution dispute is already closed.");
    }

    const updated = await tx.resolutionDispute.update({
      where: { id: disputeId },
      data: {
        status: parsed.status as ResolutionDisputeStatus,
        resolutionNote: parsed.resolutionNote,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });

    const openCount = await tx.resolutionDispute.count({
      where: {
        marketId,
        resolutionId: dispute.resolutionId,
        status: {
          in: [
            ResolutionDisputeStatus.OPEN,
            ResolutionDisputeStatus.ADJUDICATING,
          ],
        },
      },
    });

    if (openCount === 0) {
      await tx.resolution.update({
        where: { id: dispute.resolutionId },
        data: { status: ResolutionStatus.DISPUTE_WINDOW },
      });
      await tx.market.update({
        where: { id: marketId },
        data: { lifecycle: "RESOLVING" },
      });
    }

    await tx.operatorAction.create({
      data: {
        operatorId: resolvedBy,
        action: "resolution_dispute_closed",
        marketId,
        details: {
          resolutionDisputeId: disputeId,
          status: updated.status,
          resolutionNote: updated.resolutionNote,
        },
      },
    });

    return updated;
  });
}

export async function createOracleAssertion(
  marketId: string,
  input: OracleAssertionInput,
  createdBy: string
) {
  const parsed = OracleAssertionInputSchema.parse(input);
  const resolution = await getResolutionForMarket(marketId);

  return db.$transaction(async (tx) => {
    const assertion = await tx.oracleAssertion.create({
      data: {
        marketId,
        resolutionId: resolution.id,
        provider: parsed.provider,
        status: parsed.status,
        assertionId: parsed.assertionId,
        requestId: parsed.requestId,
        bond: parsed.bond,
        livenessSeconds: parsed.livenessSeconds,
        assertedOutcome: parsed.assertedOutcome,
        payload:
          parsed.payload === undefined ? undefined : toPrismaJson(parsed.payload),
        createdBy,
        settledAt: parsed.settledAt ? new Date(parsed.settledAt) : undefined,
      },
    });

    if (parsed.status === OracleAssertionStatus.DISPUTED) {
      await tx.resolution.update({
        where: { id: resolution.id },
        data: { status: ResolutionStatus.ADJUDICATING },
      });
      await tx.market.update({
        where: { id: marketId },
        data: { lifecycle: "DISPUTED" },
      });
    }

    await tx.operatorAction.create({
      data: {
        operatorId: createdBy,
        action: "oracle_assertion_recorded",
        marketId,
        details: {
          oracleAssertionId: assertion.id,
          provider: assertion.provider,
          status: assertion.status,
          assertionId: assertion.assertionId,
          requestId: assertion.requestId,
        },
      },
    });

    return assertion;
  });
}

export async function listOracleAssertions(marketId: string) {
  return db.oracleAssertion.findMany({
    where: { marketId },
    orderBy: { createdAt: "desc" },
  });
}

async function getResolutionForMarket(marketId: string) {
  const resolution = await db.resolution.findUnique({
    where: { marketId },
  });

  if (!resolution) {
    throw new Error("Market resolution record not found.");
  }

  return resolution;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
