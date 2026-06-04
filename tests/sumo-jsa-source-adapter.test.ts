import assert from "node:assert/strict";
import {
  buildSumoJsaEvidence,
  sourceCertaintyForJsaStatus,
  suggestedSettlementForJsaStatus,
} from "@/lib/domain/source-adapters/sumo-jsa";

const officialEvidence = buildSumoJsaEvidence({
  tournamentName: "2026 Nagoya Grand Sumo Tournament",
  providerEventStatus: "official_confirmed",
  observedOutcomeSlug: "hakuho",
  fetchedAt: "2026-07-26T10:00:00.000Z",
  rawPayload: {
    tournament: "2026 Nagoya Grand Sumo Tournament",
    winner: "hakuho",
    source: "JSA official result snapshot",
  },
});

assert.equal(officialEvidence.sourceCertainty, "official_confirmed");
assert.equal(officialEvidence.providerEventStatus, "official_confirmed");
assert.equal(officialEvidence.sources[0].observedOutcome, "hakuho");
assert.equal(officialEvidence.sources[0].sourcePriorityRank, 1);
assert.equal(officialEvidence.resolutionRule?.ruleVersion, "sumo-jsa-tournament-winner-v1");
assert.equal(officialEvidence.resolutionRule?.unresolvablePolicy, "void_refund");
assert.match(officialEvidence.rawPayloadHash ?? "", /^0x[a-f0-9]{64}$/);

const liveEvidence = buildSumoJsaEvidence({
  tournamentName: "2026 Nagoya Grand Sumo Tournament",
  providerEventStatus: "live",
  observedOutcomeSlug: "hakuho",
});

assert.equal(liveEvidence.sourceCertainty, "provisional");
assert.equal(sourceCertaintyForJsaStatus("ended_unconfirmed"), "provisional");
assert.equal(sourceCertaintyForJsaStatus("cancelled"), "official_confirmed");

assert.deepEqual(suggestedSettlementForJsaStatus("cancelled"), {
  payoutMode: "void_refund",
  refundPolicy: "full_refund",
});

assert.deepEqual(suggestedSettlementForJsaStatus("official_confirmed"), {
  payoutMode: "winner_take_all",
  refundPolicy: "none",
});

console.log("sumo-jsa-source-adapter tests passed");
