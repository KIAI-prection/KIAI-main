export type OperatorConsoleOutcome = {
  slug: string;
  name: string;
};

export type OperatorConsoleMarket = {
  id: string;
  titleEn: string;
  slug?: string;
  outcomes?: OperatorConsoleOutcome[];
};

function firstOutcomeSlug(market?: OperatorConsoleMarket | null) {
  return market?.outcomes?.[0]?.slug ?? "winning-outcome";
}

function outcomeSlugByNameOrIndex(
  market: OperatorConsoleMarket | null | undefined,
  matcher: RegExp,
  index: number,
  fallback: string
) {
  return (
    market?.outcomes?.find((outcome) => matcher.test(outcome.slug))?.slug ??
    market?.outcomes?.[index]?.slug ??
    fallback
  );
}

export function buildResolutionPolicyDraft(market?: OperatorConsoleMarket | null) {
  const outcomeMapping = Object.fromEntries(
    (market?.outcomes ?? []).map((outcome) => [outcome.slug, outcome.slug])
  );

  return {
    resolutionRule: {
      ruleVersion: "v1",
      question:
        market?.titleEn ??
        "Which listed outcome wins this prediction market?",
      primarySource: "Official source named in the market rules",
      sourcePriority: [
        "Official source named in the market rules",
        "Operator archived source snapshot",
      ],
      outcomeMapping,
      edgeCases: {
        drawNoContest:
          "If no official winner exists, use the market's unresolvable policy.",
        postponement:
          "If the event is postponed, keep the market unresolved until the official source confirms a result or cancellation.",
        cancellation:
          "If the event is cancelled with no replacement result, use the market's refund policy.",
        forfeit:
          "If the official source records a forfeit winner, treat that outcome as the winner.",
        tooEarly:
          "Do not propose or finalize from provisional data before the official source is available.",
      },
      unresolvablePolicy: "void_refund",
      provisionalDataPolicy: "ui_only",
    },
    resolverMode: "operator_snapshot",
    payoutMode: "winner_take_all",
    refundPolicy: "none",
  };
}

export function buildEvidenceSnapshotDraft(market?: OperatorConsoleMarket | null) {
  return {
    kind: "OFFICIAL_SOURCE",
    sourceName: "Official result source",
    sourceUrl: "https://example.com/official-result",
    rawPayload: {
      marketId: market?.id ?? "market-id",
      observedOutcome: firstOutcomeSlug(market),
      status: "official_confirmed",
    },
    observedOutcome: firstOutcomeSlug(market),
    providerEventStatus: "official_confirmed",
    sourceCertainty: "official_confirmed",
  };
}

export function buildOracleAssertionDraft(market?: OperatorConsoleMarket | null) {
  return {
    provider: "uma_oo_v3",
    status: "REQUESTED",
    assertionId: market?.id ? "assertion-" + market.id : "assertion-id",
    bond: "100 USDC",
    livenessSeconds: 7200,
    assertedOutcome: firstOutcomeSlug(market),
    payload: {
      question:
        market?.titleEn ??
        "Which listed outcome wins this prediction market?",
    },
  };
}

export function buildDisputeDraft() {
  return {
    reason: "SOURCE_DISAGREEMENT",
    summary:
      "Official source and proposed resolution need operator review before settlement.",
    evidence: {
      note: "Attach source URLs, archived payload references, or oracle challenge metadata.",
    },
  };
}

export function buildDisputeResolutionDraft() {
  return {
    status: "RESOLVED",
    resolutionNote:
      "Operator adjudication complete; the resolution evidence is accepted.",
  };
}

export function buildSumoJsaObservationDraft(
  market?: OperatorConsoleMarket | null
) {
  return {
    tournament: "Nagoya Basho",
    sourceUrl: "https://www.sumo.or.jp/EnHonbashoMain/",
    sourceName: "Nihon Sumo Kyokai official result page",
    fetchedAt: new Date(0).toISOString(),
    providerEventStatus: "official_confirmed",
    observedOutcomeSlug: firstOutcomeSlug(market),
    notes: "Operator reviewed official source snapshot.",
  };
}

export function buildApiFootballFixtureDraft(
  market?: OperatorConsoleMarket | null
) {
  return {
    fixtureId: 1553093,
    sourceCertainty: "provisional" as const,
    marketQuestion:
      market?.titleEn ??
      "Thailand U19 vs Australia U19 — ASEAN Championship match result",
    expectedHomeTeam: "Thailand U19",
    expectedAwayTeam: "Australia U19",
    expectedLeagueName: "ASEAN Championship U19",
    outcomeSlugMap: {
      home: outcomeSlugByNameOrIndex(market, /home|thailand/i, 0, "home-win"),
      draw: outcomeSlugByNameOrIndex(market, /draw/i, 1, "draw"),
      away: outcomeSlugByNameOrIndex(market, /away|australia/i, 2, "away-win"),
    },
    notes:
      "Live API-FOOTBALL demo fixture. Treat this as evidence prefill only; settlement still requires the written resolution policy and operator review.",
  };
}
