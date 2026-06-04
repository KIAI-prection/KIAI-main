import { z } from "zod";
import {
  PayoutModeSchema,
  RefundPolicySchema,
  ResolutionRuleSchema,
} from "@/lib/domain/resolution-policy";

export const MarketResolutionPolicySchema = z
  .object({
    resolutionRule: ResolutionRuleSchema,
    resolverMode: z.enum([
      "operator_snapshot",
      "api_prefill",
      "uma_optimistic_oracle",
      "manual_safety",
    ]),
    payoutMode: PayoutModeSchema,
    refundPolicy: RefundPolicySchema,
    sourceCertaintyPolicy: z
      .enum(["official_only", "oracle_final", "manual_adjudicated"])
      .default("official_only"),
  })
  .strict();

export type MarketResolutionPolicy = z.infer<
  typeof MarketResolutionPolicySchema
>;

export function assertMarketResolutionPolicyReady(value: unknown) {
  const parsed = MarketResolutionPolicySchema.parse(value);
  if (parsed.resolutionRule.sourcePriority.length === 0) {
    throw new Error("Resolution policy requires at least one source priority.");
  }

  return parsed;
}
