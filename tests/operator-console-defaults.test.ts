import assert from "node:assert/strict";
import {
  buildDisputeDraft,
  buildEvidenceSnapshotDraft,
  buildApiFootballFixtureDraft,
  buildOracleAssertionDraft,
  buildResolutionPolicyDraft,
  buildSumoJsaObservationDraft,
} from "@/lib/operator-console/default-payloads";

const market = {
  id: "market-1",
  slug: "nagoya-basho-2026",
  titleEn: "Nagoya Basho 2026 — Tournament Winner",
  outcomes: [
    { slug: "terunofuji", name: "Terunofuji" },
    { slug: "hoshoryu", name: "Hoshoryu" },
  ],
};

const policy = buildResolutionPolicyDraft(market);
assert.equal(policy.resolutionRule.question, market.titleEn);
assert.equal(policy.resolutionRule.outcomeMapping.terunofuji, "terunofuji");
assert.equal(policy.resolutionRule.unresolvablePolicy, "void_refund");
assert.equal(policy.payoutMode, "winner_take_all");

const evidence = buildEvidenceSnapshotDraft(market);
assert.equal(evidence.rawPayload.marketId, market.id);
assert.equal(evidence.observedOutcome, "terunofuji");
assert.equal(evidence.sourceCertainty, "official_confirmed");

const oracle = buildOracleAssertionDraft(market);
assert.equal(oracle.assertedOutcome, "terunofuji");
assert.equal(oracle.payload.question, market.titleEn);

const dispute = buildDisputeDraft();
assert.equal(dispute.reason, "SOURCE_DISAGREEMENT");

const sumo = buildSumoJsaObservationDraft(market);
assert.equal(sumo.observedOutcomeSlug, "terunofuji");
assert.equal(sumo.providerEventStatus, "official_confirmed");

const footballMarket = {
  id: "market-football",
  slug: "thailand-u19-vs-australia-u19-asean-2026",
  titleEn: "Thailand U19 vs Australia U19 — ASEAN Championship",
  outcomes: [
    { slug: "home-win", name: "Thailand U19 win" },
    { slug: "draw", name: "Draw" },
    { slug: "away-win", name: "Australia U19 win" },
  ],
};
const football = buildApiFootballFixtureDraft(footballMarket);
assert.equal(football.fixtureId, 1553093);
assert.equal(football.expectedHomeTeam, "Thailand U19");
assert.equal(football.expectedAwayTeam, "Australia U19");
assert.equal(football.outcomeSlugMap.home, "home-win");
assert.equal(football.outcomeSlugMap.draw, "draw");
assert.equal(football.outcomeSlugMap.away, "away-win");

console.log("operator-console-defaults tests passed");
