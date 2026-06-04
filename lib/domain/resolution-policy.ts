import { createHash } from "node:crypto";
import { z } from "zod";

const Hash32Schema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Hash must be a 32-byte hex string");

export const SourceCertaintySchema = z.enum([
  "provisional",
  "official_confirmed",
  "oracle_final",
  "manual_adjudicated",
]);

export const PayoutModeSchema = z.enum([
  "winner_take_all",
  "split_50_50",
  "fractional",
  "void_refund",
  "manual",
]);

export const RefundPolicySchema = z.enum([
  "none",
  "full_refund",
  "partial_refund",
  "manual_review",
]);

export const UnresolvablePolicySchema = z.enum([
  "split_50_50",
  "void_refund",
  "manual_adjudication",
]);

export const ProviderEventStatusSchema = z.enum([
  "not_started",
  "live",
  "suspended",
  "delayed",
  "postponed",
  "interrupted",
  "ended_unconfirmed",
  "official_confirmed",
  "cancelled",
  "abandoned",
  "provider_error",
]);

export const ResolutionRuleSchema = z
  .object({
    ruleVersion: z.string().min(1).max(80),
    question: z.string().min(10).max(1_000),
    primarySource: z.string().min(2).max(300),
    sourcePriority: z.array(z.string().min(2).max(300)).min(1).max(10),
    outcomeMapping: z.record(z.string().min(1), z.string().min(1)).optional(),
    edgeCases: z
      .object({
        drawNoContest: z.string().min(2).max(1_000),
        postponement: z.string().min(2).max(1_000),
        cancellation: z.string().min(2).max(1_000),
        forfeit: z.string().min(2).max(1_000),
        tooEarly: z.string().min(2).max(1_000),
      })
      .strict(),
    unresolvablePolicy: UnresolvablePolicySchema,
    provisionalDataPolicy: z
      .enum(["ui_only", "settlement_eligible"])
      .default("ui_only"),
  })
  .strict();

export const SettlementInstructionRequestSchema = z
  .object({
    ruleVersion: z.string().min(1).max(80).optional(),
    payoutMode: PayoutModeSchema.default("winner_take_all"),
    payoutVector: z.record(z.number().min(0).max(1)).optional(),
    refundPolicy: RefundPolicySchema.default("none"),
    sourceCertainty: SourceCertaintySchema.optional(),
  })
  .strict();

export const SettlementInstructionSchema = z
  .object({
    resolutionId: z.string().min(1),
    marketId: z.string().min(1),
    ruleVersion: z.string().min(1),
    sourceCertainty: SourceCertaintySchema,
    status: z.literal("final"),
    finalOutcome: z.string().min(1).nullable(),
    payoutMode: PayoutModeSchema,
    payoutVector: z.record(z.number().min(0).max(1)),
    refundPolicy: RefundPolicySchema,
    evidenceBundleHash: Hash32Schema,
    finalizedAt: z.string().datetime(),
    finalizedBy: z.string().min(1),
  })
  .strict();

export type SourceCertainty = z.infer<typeof SourceCertaintySchema>;
export type PayoutMode = z.infer<typeof PayoutModeSchema>;
export type RefundPolicy = z.infer<typeof RefundPolicySchema>;
export type ResolutionRule = z.infer<typeof ResolutionRuleSchema>;
export type SettlementInstructionRequest = z.infer<
  typeof SettlementInstructionRequestSchema
>;
export type SettlementInstruction = z.infer<typeof SettlementInstructionSchema>;

const EvidenceForSettlementSchema = z
  .object({
    sourceCertainty: SourceCertaintySchema.default("provisional"),
    evidenceHash: Hash32Schema.optional(),
    resolutionRule: ResolutionRuleSchema.optional(),
  })
  .passthrough();

export interface SettlementOutcome {
  slug: string;
}

export interface BuildSettlementInstructionInput {
  resolutionId: string;
  marketId: string;
  outcomes: SettlementOutcome[];
  finalOutcome?: string;
  evidence: unknown;
  settlement?: SettlementInstructionRequest;
  finalizedBy: string;
  finalizedAt?: Date;
}

export function isSettlementEligibleSourceCertainty(
  sourceCertainty: SourceCertainty
) {
  return sourceCertainty !== "provisional";
}

export function buildSettlementInstruction(
  input: BuildSettlementInstructionInput
): SettlementInstruction {
  const evidence = EvidenceForSettlementSchema.parse(input.evidence);
  const request = SettlementInstructionRequestSchema.parse(input.settlement ?? {});
  const sourceCertainty = request.sourceCertainty ?? evidence.sourceCertainty;

  if (request.sourceCertainty && request.sourceCertainty !== evidence.sourceCertainty) {
    throw new Error(
      "Settlement source certainty cannot differ from the evidence source certainty."
    );
  }

  if (!isSettlementEligibleSourceCertainty(sourceCertainty)) {
    throw new Error(
      "Provisional evidence cannot finalize settlement. Attach official-confirmed, oracle-final, or manual-adjudicated evidence."
    );
  }

  const payoutVector = buildPayoutVector({
    outcomes: input.outcomes,
    finalOutcome: input.finalOutcome,
    payoutMode: request.payoutMode,
    payoutVector: request.payoutVector,
  });

  const instruction = {
    resolutionId: input.resolutionId,
    marketId: input.marketId,
    ruleVersion:
      request.ruleVersion ?? evidence.resolutionRule?.ruleVersion ?? "v1",
    sourceCertainty,
    status: "final" as const,
    finalOutcome: input.finalOutcome ?? null,
    payoutMode: request.payoutMode,
    payoutVector,
    refundPolicy: request.refundPolicy,
    evidenceBundleHash:
      evidence.evidenceHash ?? createEvidenceBundleHash(input.evidence),
    finalizedAt: (input.finalizedAt ?? new Date()).toISOString(),
    finalizedBy: input.finalizedBy,
  };

  return SettlementInstructionSchema.parse(instruction);
}

function buildPayoutVector(input: {
  outcomes: SettlementOutcome[];
  finalOutcome?: string;
  payoutMode: PayoutMode;
  payoutVector?: Record<string, number>;
}) {
  const outcomeSlugs = input.outcomes.map((outcome) => outcome.slug);
  if (outcomeSlugs.length < 2) {
    throw new Error("Settlement requires at least two market outcomes.");
  }

  if (input.payoutMode === "winner_take_all") {
    if (!input.finalOutcome) {
      throw new Error("Winner-take-all settlement requires a final outcome.");
    }

    ensureKnownOutcome(input.finalOutcome, outcomeSlugs);
    return Object.fromEntries(
      outcomeSlugs.map((slug) => [slug, slug === input.finalOutcome ? 1 : 0])
    );
  }

  if (input.payoutMode === "split_50_50") {
    if (input.payoutVector) {
      return validatePayoutVector(input.payoutVector, outcomeSlugs);
    }

    const share = Number((1 / outcomeSlugs.length).toFixed(12));
    return Object.fromEntries(outcomeSlugs.map((slug) => [slug, share]));
  }

  if (input.payoutMode === "void_refund") {
    return Object.fromEntries(outcomeSlugs.map((slug) => [slug, 0]));
  }

  if (!input.payoutVector) {
    throw new Error(
      `${input.payoutMode} settlement requires an explicit payout vector.`
    );
  }

  return validatePayoutVector(input.payoutVector, outcomeSlugs);
}

function ensureKnownOutcome(slug: string, outcomeSlugs: string[]) {
  if (!outcomeSlugs.includes(slug)) {
    throw new Error(
      `Settlement outcome "${slug}" is not one of: ${outcomeSlugs.join(", ")}`
    );
  }
}

function validatePayoutVector(
  payoutVector: Record<string, number>,
  outcomeSlugs: string[]
) {
  const keys = Object.keys(payoutVector).sort();
  const expected = [...outcomeSlugs].sort();
  if (keys.length !== expected.length) {
    throw new Error("Payout vector must include every market outcome exactly once.");
  }

  for (const slug of expected) {
    if (!keys.includes(slug)) {
      throw new Error(`Payout vector is missing outcome "${slug}".`);
    }
  }

  for (const key of keys) {
    ensureKnownOutcome(key, outcomeSlugs);
  }

  return payoutVector;
}

export function createEvidenceBundleHash(value: unknown) {
  return `0x${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
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
