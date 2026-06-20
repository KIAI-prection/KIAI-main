import { z } from "zod";
import {
  type ProviderEventStatus,
  SourceCertaintySchema,
  createEvidenceBundleHash,
} from "@/lib/domain/resolution-policy";
import {
  type ResolutionEvidence,
  ResolutionEvidenceSchema,
} from "@/lib/domain/resolution-evidence";

const API_FOOTBALL_DOCS_URL = "https://api-sports.io/documentation/football/v3";
const API_FOOTBALL_DEFAULT_BASE_URL = "https://v3.football.api-sports.io";

export const ApiFootballFixtureObservationSchema = z
  .object({
    fixtureId: z.number().int().positive(),
    sourceUrl: z.string().url().optional(),
    fetchedAt: z.string().datetime().optional(),
    sourceCertainty: SourceCertaintySchema.default("provisional"),
    marketQuestion: z.string().min(10).max(1_000).optional(),
    expectedHomeTeam: z.string().min(1).max(160).optional(),
    expectedAwayTeam: z.string().min(1).max(160).optional(),
    expectedLeagueName: z.string().min(1).max(160).optional(),
    outcomeSlugMap: z
      .object({
        home: z.string().min(1).max(200).optional(),
        away: z.string().min(1).max(200).optional(),
        draw: z.string().min(1).max(200).optional(),
      })
      .strict()
      .default({}),
    rawPayload: z.unknown(),
    notes: z.string().max(1_000).optional(),
  })
  .strict();

const ApiFootballFetchRequestSchema = ApiFootballFixtureObservationSchema.omit({
  rawPayload: true,
}).extend({
  apiKey: z.string().min(1),
  apiBaseUrl: z.string().url().default(API_FOOTBALL_DEFAULT_BASE_URL),
});

type ApiFootballFixtureObservation = z.input<
  typeof ApiFootballFixtureObservationSchema
>;
type ParsedApiFootballFixtureObservation = z.infer<
  typeof ApiFootballFixtureObservationSchema
>;
export type ApiFootballFetchRequest = z.input<typeof ApiFootballFetchRequestSchema>;

export interface ApiFootballFixtureEvidenceResult {
  sourceSnapshot: ResolutionEvidence;
  fixture: {
    id?: number;
    leagueName?: string;
    homeTeam?: string;
    awayTeam?: string;
    statusShort?: string;
    statusLong?: string;
    homeGoals?: number | null;
    awayGoals?: number | null;
    resultSide: "home" | "away" | "draw" | null;
  };
  suggestedResolution: {
    action: "propose";
    proposedOutcome: string | null;
    settlement: {
      payoutMode: "winner_take_all" | "void_refund" | "manual";
      refundPolicy: "none" | "full_refund" | "manual_review";
    };
    sourceSnapshot: ResolutionEvidence;
  };
  canProposeOutcome: boolean;
  warnings: string[];
}

export async function fetchApiFootballFixtureEvidence(
  input: ApiFootballFetchRequest,
  fetchImpl: typeof fetch = fetch
) {
  const request = ApiFootballFetchRequestSchema.parse(input);
  const url = new URL("/fixtures", request.apiBaseUrl);
  url.searchParams.set("id", String(request.fixtureId));

  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "x-apisports-key": request.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      "API-FOOTBALL fixture fetch failed with HTTP " + response.status + "."
    );
  }

  const rawPayload = await response.json();

  return buildApiFootballFixtureEvidence({
    fixtureId: request.fixtureId,
    sourceUrl: request.sourceUrl ?? url.toString(),
    fetchedAt: request.fetchedAt,
    sourceCertainty: request.sourceCertainty,
    marketQuestion: request.marketQuestion,
    expectedHomeTeam: request.expectedHomeTeam,
    expectedAwayTeam: request.expectedAwayTeam,
    expectedLeagueName: request.expectedLeagueName,
    outcomeSlugMap: request.outcomeSlugMap,
    notes: request.notes,
    rawPayload,
  });
}

export function buildApiFootballFixtureEvidence(
  input: ApiFootballFixtureObservation
): ApiFootballFixtureEvidenceResult {
  const observation = ApiFootballFixtureObservationSchema.parse(input);
  const fixture = extractFixture(observation);
  const status = normalizeApiFootballStatus(fixture.statusShort);
  const resultSide = determineResultSide(fixture);
  const proposedOutcome = status === "official_confirmed" && resultSide
    ? observation.outcomeSlugMap[resultSide] ?? null
    : null;
  const settlement = suggestedSettlementForApiFootballStatus(status, resultSide);
  const warnings = buildWarnings(observation, fixture, status, resultSide);

  const sourceSnapshot = ResolutionEvidenceSchema.parse({
    description: buildDescription(observation, fixture, status, resultSide),
    ruleSummary:
      "API-FOOTBALL fixture data can prefill resolution evidence for operator review; KIAI must still respect the written market rule, source-certainty policy, and dispute window before settlement.",
    resolutionRule: buildFootballFixtureWinnerRule(observation, fixture),
    sourceCertainty: observation.sourceCertainty,
    providerEventStatus: status,
    rawPayloadHash: createEvidenceBundleHash(observation.rawPayload),
    sources: [
      {
        type: "api",
        name: "API-FOOTBALL fixture endpoint",
        url: observation.sourceUrl ?? API_FOOTBALL_DOCS_URL,
        fetchedAt: observation.fetchedAt,
        observedOutcome: proposedOutcome ?? resultSide ?? undefined,
        providerEventStatus: status,
        sourcePriorityRank: 2,
        notes: observation.notes,
      },
    ],
    edgeCases: [
      "If the fixture is not started, live, suspended, interrupted, delayed, or postponed, do not finalize settlement.",
      "If the fixture is cancelled or abandoned with no assignable winner, use the market refund policy.",
      "If a draw occurs and the market has no draw outcome, use the market's written unresolvable policy instead of inventing a winner.",
      "If API-FOOTBALL conflicts with the official league/event source, pause resolution and require manual review.",
      "If the provider returns no fixture or a payload shape KIAI cannot parse, keep the market unresolved until operator evidence is available.",
    ],
    resolverMode: "api_prefill",
  });

  return {
    sourceSnapshot,
    fixture: {
      id: fixture.id,
      leagueName: fixture.leagueName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      statusShort: fixture.statusShort,
      statusLong: fixture.statusLong,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
      resultSide,
    },
    suggestedResolution: {
      action: "propose",
      proposedOutcome,
      settlement,
      sourceSnapshot,
    },
    canProposeOutcome: Boolean(proposedOutcome),
    warnings,
  };
}

export function normalizeApiFootballStatus(
  statusShort?: string | null
): ProviderEventStatus {
  const status = (statusShort ?? "").toUpperCase();
  if (status === "TBD" || status === "NS") return "not_started";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(status)) {
    return "live";
  }
  if (status === "SUSP") return "suspended";
  if (status === "INT") return "interrupted";
  if (status === "PST") return "postponed";
  if (status === "CANC") return "cancelled";
  if (status === "ABD") return "abandoned";
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(status)) {
    return "official_confirmed";
  }

  return "provider_error";
}

function extractFixture(observation: ParsedApiFootballFixtureObservation) {
  const payload = asRecord(observation.rawPayload);
  const response = Array.isArray(payload.response) ? payload.response : [];
  const first = asRecord(response[0]);
  const fixture = asRecord(first.fixture);
  const status = asRecord(fixture.status);
  const league = asRecord(first.league);
  const teams = asRecord(first.teams);
  const home = asRecord(teams.home);
  const away = asRecord(teams.away);
  const goals = asRecord(first.goals);

  if (!response.length || !first) {
    throw new Error("API-FOOTBALL response did not include a fixture result.");
  }

  return {
    id: numberOrUndefined(fixture.id),
    leagueName: stringOrUndefined(league.name),
    homeTeam: stringOrUndefined(home.name),
    awayTeam: stringOrUndefined(away.name),
    homeWinner: booleanOrNull(home.winner),
    awayWinner: booleanOrNull(away.winner),
    statusShort: stringOrUndefined(status.short),
    statusLong: stringOrUndefined(status.long),
    homeGoals: numberOrNull(goals.home),
    awayGoals: numberOrNull(goals.away),
  };
}

function determineResultSide(fixture: ReturnType<typeof extractFixture>) {
  if (fixture.homeWinner === true && fixture.awayWinner !== true) return "home";
  if (fixture.awayWinner === true && fixture.homeWinner !== true) return "away";

  if (fixture.homeGoals === null || fixture.awayGoals === null) {
    return null;
  }

  if (fixture.homeGoals > fixture.awayGoals) return "home";
  if (fixture.awayGoals > fixture.homeGoals) return "away";
  return "draw";
}

function suggestedSettlementForApiFootballStatus(
  status: ProviderEventStatus,
  resultSide: "home" | "away" | "draw" | null
) {
  if (status === "cancelled" || status === "abandoned") {
    return {
      payoutMode: "void_refund" as const,
      refundPolicy: "full_refund" as const,
    };
  }

  if (status === "official_confirmed" && resultSide) {
    return {
      payoutMode: "winner_take_all" as const,
      refundPolicy: "none" as const,
    };
  }

  return {
    payoutMode: "manual" as const,
    refundPolicy: "manual_review" as const,
  };
}

function buildDescription(
  observation: ParsedApiFootballFixtureObservation,
  fixture: ReturnType<typeof extractFixture>,
  status: ProviderEventStatus,
  resultSide: "home" | "away" | "draw" | null
) {
  const teams =
    fixture.homeTeam && fixture.awayTeam
      ? fixture.homeTeam + " vs " + fixture.awayTeam
      : "fixture " + observation.fixtureId;
  const score =
    fixture.homeGoals === null || fixture.awayGoals === null
      ? "score unavailable"
      : String(fixture.homeGoals) + "-" + String(fixture.awayGoals);
  const result = resultSide ? " Result side: " + resultSide + "." : "";

  return (
    "API-FOOTBALL observation for " +
    teams +
    ". Provider status: " +
    status +
    " (" +
    (fixture.statusShort ?? "unknown") +
    "). Score: " +
    score +
    "." +
    result
  );
}

function buildFootballFixtureWinnerRule(
  observation: ParsedApiFootballFixtureObservation,
  fixture: ReturnType<typeof extractFixture>
) {
  const teams =
    fixture.homeTeam && fixture.awayTeam
      ? fixture.homeTeam + " vs " + fixture.awayTeam
      : "fixture " + observation.fixtureId;
  const outcomeMapping = Object.fromEntries(
    Object.entries(observation.outcomeSlugMap).filter((entry): entry is [
      string,
      string,
    ] => Boolean(entry[1]))
  );

  return {
    ruleVersion: "api-football-fixture-winner-v1",
    question:
      observation.marketQuestion ??
      "Which listed outcome wins " +
        teams +
        " according to the market's written rule?",
    primarySource: "Official league/event source named in the market rules",
    sourcePriority: [
      "Official league/event source named in the market rules",
      "API-FOOTBALL fixture endpoint",
      "Operator archived official-source snapshot",
    ],
    outcomeMapping,
    edgeCases: {
      drawNoContest:
        "If the fixture is a draw and no draw outcome exists, use the market's unresolvable policy.",
      postponement:
        "If the fixture is postponed or delayed, keep the market unresolved until the fixture is played or the written expiry/refund rule applies.",
      cancellation:
        "If the fixture is cancelled or abandoned with no official assignable winner, void and refund unless the market-specific rule states otherwise.",
      forfeit:
        "If the official source records a walkover, awarded result, or technical loss, use that official result only after operator review.",
      tooEarly:
        "Reject settlement while the source is not started, live, suspended, interrupted, or ended without confirmation.",
    },
    unresolvablePolicy: "void_refund" as const,
    provisionalDataPolicy:
      observation.sourceCertainty === "provisional"
        ? ("ui_only" as const)
        : ("settlement_eligible" as const),
  };
}

function buildWarnings(
  observation: ParsedApiFootballFixtureObservation,
  fixture: ReturnType<typeof extractFixture>,
  status: ProviderEventStatus,
  resultSide: "home" | "away" | "draw" | null
) {
  const warnings: string[] = [];

  if (observation.expectedHomeTeam && observation.expectedHomeTeam !== fixture.homeTeam) {
    warnings.push(
      'Expected home team "' +
        observation.expectedHomeTeam +
        '" but API returned "' +
        (fixture.homeTeam ?? "unknown") +
        '".'
    );
  }

  if (observation.expectedAwayTeam && observation.expectedAwayTeam !== fixture.awayTeam) {
    warnings.push(
      'Expected away team "' +
        observation.expectedAwayTeam +
        '" but API returned "' +
        (fixture.awayTeam ?? "unknown") +
        '".'
    );
  }

  if (
    observation.expectedLeagueName &&
    observation.expectedLeagueName !== fixture.leagueName
  ) {
    warnings.push(
      'Expected league "' +
        observation.expectedLeagueName +
        '" but API returned "' +
        (fixture.leagueName ?? "unknown") +
        '".'
    );
  }

  if (status !== "official_confirmed" && status !== "cancelled" && status !== "abandoned") {
    warnings.push("Provider status is not final; evidence is prefill-only.");
  }

  if (resultSide === "draw" && !observation.outcomeSlugMap.draw) {
    warnings.push("Fixture is a draw, but no draw outcome mapping was provided.");
  }

  if (observation.sourceCertainty === "provisional") {
    warnings.push(
      "Source certainty is provisional; KIAI settlement finalization will reject this evidence."
    );
  }

  return warnings;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}
