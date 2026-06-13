import assert from "node:assert/strict";
import {
  buildApiFootballFixtureEvidence,
  fetchApiFootballFixtureEvidence,
  normalizeApiFootballStatus,
} from "@/lib/domain/source-adapters/api-football";

const finalHomeWinPayload = {
  get: "fixtures",
  parameters: { id: "12345" },
  errors: [],
  results: 1,
  response: [
    {
      fixture: {
        id: 12345,
        status: { long: "Match Finished", short: "FT", elapsed: 90 },
      },
      league: { name: "Premier League", country: "England", season: 2026 },
      teams: {
        home: { name: "Team A", winner: true },
        away: { name: "Team B", winner: false },
      },
      goals: { home: 2, away: 1 },
    },
  ],
};

const finalEvidence = buildApiFootballFixtureEvidence({
  fixtureId: 12345,
  fetchedAt: new Date(0).toISOString(),
  marketQuestion: "Will Team A beat Team B in the listed fixture?",
  expectedHomeTeam: "Team A",
  expectedAwayTeam: "Team B",
  outcomeSlugMap: { home: "team-a", away: "team-b", draw: "draw" },
  rawPayload: finalHomeWinPayload,
});

assert.equal(finalEvidence.fixture.resultSide, "home");
assert.equal(finalEvidence.fixture.statusShort, "FT");
assert.equal(finalEvidence.sourceSnapshot.providerEventStatus, "official_confirmed");
assert.equal(finalEvidence.sourceSnapshot.sourceCertainty, "provisional");
assert.equal(finalEvidence.suggestedResolution.proposedOutcome, "team-a");
assert.equal(finalEvidence.suggestedResolution.settlement.payoutMode, "winner_take_all");
assert.equal(finalEvidence.canProposeOutcome, true);
assert.match(finalEvidence.sourceSnapshot.rawPayloadHash ?? "", /^0x[a-f0-9]{64}$/);
assert.ok(
  finalEvidence.warnings.some((warning) =>
    warning.includes("settlement finalization will reject")
  )
);

const liveEvidence = buildApiFootballFixtureEvidence({
  fixtureId: 12345,
  outcomeSlugMap: { home: "team-a", away: "team-b" },
  rawPayload: {
    response: [
      {
        fixture: {
          id: 12345,
          status: { long: "First Half, Kick Off", short: "1H", elapsed: 30 },
        },
        league: { name: "Premier League" },
        teams: {
          home: { name: "Team A", winner: null },
          away: { name: "Team B", winner: null },
        },
        goals: { home: 1, away: 0 },
      },
    ],
  },
});

assert.equal(liveEvidence.sourceSnapshot.providerEventStatus, "live");
assert.equal(liveEvidence.suggestedResolution.proposedOutcome, null);
assert.equal(liveEvidence.suggestedResolution.settlement.payoutMode, "manual");
assert.ok(
  liveEvidence.warnings.some((warning) => warning.includes("not final"))
);

const cancelledEvidence = buildApiFootballFixtureEvidence({
  fixtureId: 12345,
  rawPayload: {
    response: [
      {
        fixture: {
          id: 12345,
          status: { long: "Match Cancelled", short: "CANC", elapsed: null },
        },
        league: { name: "Premier League" },
        teams: {
          home: { name: "Team A", winner: null },
          away: { name: "Team B", winner: null },
        },
        goals: { home: null, away: null },
      },
    ],
  },
});

assert.equal(cancelledEvidence.sourceSnapshot.providerEventStatus, "cancelled");
assert.equal(cancelledEvidence.suggestedResolution.proposedOutcome, null);
assert.equal(cancelledEvidence.suggestedResolution.settlement.payoutMode, "void_refund");
assert.equal(cancelledEvidence.suggestedResolution.settlement.refundPolicy, "full_refund");

assert.equal(normalizeApiFootballStatus("PST"), "postponed");
assert.equal(normalizeApiFootballStatus("ABD"), "abandoned");
assert.equal(normalizeApiFootballStatus("WO"), "official_confirmed");
assert.equal(normalizeApiFootballStatus("unexpected"), "provider_error");

async function assertFetchAdapter() {
  const fetchResult = await fetchApiFootballFixtureEvidence(
    {
      fixtureId: 12345,
      apiKey: "test-key",
      apiBaseUrl: "https://example.test",
      outcomeSlugMap: { home: "team-a", away: "team-b" },
    },
    async (input, init) => {
      const url = String(input);
      assert.equal(url, "https://example.test/fixtures?id=12345");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers["x-apisports-key"], "test-key");
      return Response.json(finalHomeWinPayload);
    }
  );

  assert.equal(fetchResult.suggestedResolution.proposedOutcome, "team-a");
}

assertFetchAdapter().catch((err) => {
  console.error(err);
  process.exit(1);
});
