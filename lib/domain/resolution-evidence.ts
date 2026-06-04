import { z } from "zod";
import {
  ProviderEventStatusSchema,
  ResolutionRuleSchema,
  SourceCertaintySchema,
} from "@/lib/domain/resolution-policy";

const EvidenceUrlSchema = z
  .string()
  .url()
  .max(2_000);

export const ResolutionEvidenceSourceSchema = z
  .object({
    type: z.enum(["official", "api", "archive", "screenshot", "operator_note"]),
    name: z.string().min(2).max(160),
    url: EvidenceUrlSchema.optional(),
    fetchedAt: z.string().datetime().optional(),
    observedOutcome: z.string().min(1).max(200).optional(),
    providerEventStatus: ProviderEventStatusSchema.optional(),
    sourcePriorityRank: z.number().int().positive().max(20).optional(),
    notes: z.string().max(1_000).optional(),
  })
  .strict();

export const ResolutionOracleSnapshotSchema = z
  .object({
    provider: z.enum(["none", "uma_oo_v2", "uma_oo_v3", "custom_api"]),
    assertionId: z.string().min(1).max(200).optional(),
    requestId: z.string().min(1).max(200).optional(),
    bond: z.string().min(1).max(120).optional(),
    livenessSeconds: z.number().int().positive().max(30 * 24 * 60 * 60).optional(),
    status: z
      .enum(["not_requested", "requested", "proposed", "disputed", "settled"])
      .optional(),
  })
  .strict();

export const ResolutionEvidenceSchema = z
  .object({
    description: z.string().min(10).max(2_000),
    ruleSummary: z.string().min(10).max(2_000).optional(),
    resolutionRule: ResolutionRuleSchema.optional(),
    sourceCertainty: SourceCertaintySchema.default("provisional"),
    providerEventStatus: ProviderEventStatusSchema.optional(),
    rawPayloadHash: z
      .string()
      .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Raw payload hash must be a 32-byte hex string")
      .optional(),
    sources: z.array(ResolutionEvidenceSourceSchema).min(1).max(10),
    edgeCases: z.array(z.string().min(1).max(500)).max(20).default([]),
    resolverMode: z
      .enum([
        "operator_snapshot",
        "api_prefill",
        "uma_optimistic_oracle",
        "manual_safety",
      ])
      .default("operator_snapshot"),
    proposedAt: z.string().datetime().optional(),
    evidenceHash: z
      .string()
      .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Evidence hash must be a 32-byte hex string")
      .optional(),
    oracle: ResolutionOracleSnapshotSchema.optional(),
  })
  .strict();

export type ResolutionEvidence = z.infer<typeof ResolutionEvidenceSchema>;
