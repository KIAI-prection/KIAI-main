import assert from "node:assert/strict";
import {
  assertMarketResolutionPolicyReady,
  MarketResolutionPolicySchema,
} from "@/lib/domain/market-resolution-policy";

const policy = MarketResolutionPolicySchema.parse({
  resolutionRule: {
    ruleVersion: "sumo-jsa-tournament-winner-v1",
    question:
      "Who is the official tournament winner according to Nihon Sumo Kyokai?",
    primarySource: "Nihon Sumo Kyokai official matches and results",
    sourcePriority: [
      "Nihon Sumo Kyokai official matches and results",
      "NHK official report",
    ],
    edgeCases: {
      drawNoContest: "Use official playoff result or unresolvable policy.",
      postponement: "Wait for official completion or cancellation.",
      cancellation: "Void and refund unless market-specific rule differs.",
      forfeit: "Use the official JSA result.",
      tooEarly: "Reject settlement before official confirmation.",
    },
    unresolvablePolicy: "void_refund",
    provisionalDataPolicy: "ui_only",
  },
  resolverMode: "api_prefill",
  payoutMode: "winner_take_all",
  refundPolicy: "none",
});

assert.equal(policy.sourceCertaintyPolicy, "official_only");
assert.equal(
  assertMarketResolutionPolicyReady(policy).resolutionRule.ruleVersion,
  "sumo-jsa-tournament-winner-v1"
);

assert.throws(
  () => assertMarketResolutionPolicyReady(null),
  /Expected object/
);

console.log("market-resolution-policy tests passed");
