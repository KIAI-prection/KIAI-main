import assert from "node:assert/strict";
import {
  buildSettlementInstruction,
  createEvidenceBundleHash,
} from "@/lib/domain/resolution-policy";

const outcomes = [{ slug: "yes" }, { slug: "no" }];

const officialEvidence = {
  description: "Official source confirms the event has a final result.",
  sources: [
    {
      type: "official",
      name: "Official league result",
      url: "https://example.com/result",
      fetchedAt: "2026-06-04T00:00:00.000Z",
      observedOutcome: "yes",
      providerEventStatus: "official_confirmed",
      sourcePriorityRank: 1,
    },
  ],
  edgeCases: ["Cancellation uses void refund."],
  resolverMode: "operator_snapshot",
  sourceCertainty: "official_confirmed",
  resolutionRule: {
    ruleVersion: "sumo-v1",
    question: "Will the named rikishi win the official tournament?",
    primarySource: "Japan Sumo Association",
    sourcePriority: ["Japan Sumo Association", "NHK"],
    edgeCases: {
      drawNoContest: "If no official winner exists, use void refund.",
      postponement: "Wait until the official tournament result is available.",
      cancellation: "Void and refund if the tournament is cancelled.",
      forfeit: "Use the official tournament result.",
      tooEarly: "Reject proposals before official confirmation.",
    },
    unresolvablePolicy: "void_refund",
    provisionalDataPolicy: "ui_only",
  },
} as const;

const baseInput = {
  resolutionId: "res_1",
  marketId: "market_1",
  outcomes,
  evidence: officialEvidence,
  finalizedBy: "operator_1",
  finalizedAt: new Date("2026-06-04T01:00:00.000Z"),
};

const winner = buildSettlementInstruction({
  ...baseInput,
  finalOutcome: "yes",
});

assert.equal(winner.payoutMode, "winner_take_all");
assert.deepEqual(winner.payoutVector, { yes: 1, no: 0 });
assert.equal(winner.finalOutcome, "yes");
assert.equal(winner.ruleVersion, "sumo-v1");
assert.equal(winner.sourceCertainty, "official_confirmed");

const split = buildSettlementInstruction({
  ...baseInput,
  settlement: {
    payoutMode: "split_50_50",
    refundPolicy: "none",
  },
});

assert.equal(split.finalOutcome, null);
assert.deepEqual(split.payoutVector, { yes: 0.5, no: 0.5 });

const refund = buildSettlementInstruction({
  ...baseInput,
  settlement: {
    payoutMode: "void_refund",
    refundPolicy: "full_refund",
  },
});

assert.deepEqual(refund.payoutVector, { yes: 0, no: 0 });
assert.equal(refund.refundPolicy, "full_refund");

assert.throws(
  () =>
    buildSettlementInstruction({
      ...baseInput,
      evidence: {
        ...officialEvidence,
        sourceCertainty: "provisional",
      },
      finalOutcome: "yes",
    }),
  /Provisional evidence cannot finalize settlement/
);

assert.throws(
  () =>
    buildSettlementInstruction({
      ...baseInput,
      settlement: {
        payoutMode: "fractional",
        payoutVector: { yes: 0.5 },
        refundPolicy: "none",
      },
    }),
  /Payout vector must include every market outcome/
);

assert.equal(
  createEvidenceBundleHash({ b: 1, a: 2 }),
  createEvidenceBundleHash({ a: 2, b: 1 })
);

console.log("resolution-policy tests passed");
