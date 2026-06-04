import { z } from "zod";
import { ProviderEventStatusSchema } from "@/lib/domain/resolution-policy";
import {
  type ResolutionEvidence,
  ResolutionEvidenceSchema,
} from "@/lib/domain/resolution-evidence";
import { createEvidenceBundleHash } from "@/lib/domain/resolution-policy";

const OFFICIAL_JSA_RESULTS_URL = "https://www.sumo.or.jp/EnHonbashoMain/";

export const SumoJsaObservationSchema = z
  .object({
    tournamentName: z.string().min(4).max(160),
    sourceUrl: z.string().url().default(OFFICIAL_JSA_RESULTS_URL),
    fetchedAt: z.string().datetime().optional(),
    providerEventStatus: ProviderEventStatusSchema,
    observedOutcome: z.string().min(1).max(200).optional(),
    observedOutcomeSlug: z.string().min(1).max(200).optional(),
    day: z.number().int().min(1).max(15).optional(),
    division: z.string().min(2).max(80).optional(),
    rawPayload: z.unknown().optional(),
    notes: z.string().max(1_000).optional(),
  })
  .strict();

type ProviderEventStatus = z.infer<typeof ProviderEventStatusSchema>;
export type SumoJsaObservation = z.input<typeof SumoJsaObservationSchema>;
type ParsedSumoJsaObservation = z.infer<typeof SumoJsaObservationSchema>;

export function buildSumoJsaEvidence(
  input: SumoJsaObservation
): ResolutionEvidence {
  const observation = SumoJsaObservationSchema.parse(input);
  const observedOutcome =
    observation.observedOutcomeSlug ?? observation.observedOutcome;

  const sourceCertainty = sourceCertaintyForJsaStatus(
    observation.providerEventStatus
  );

  return ResolutionEvidenceSchema.parse({
    description: buildDescription(observation, observedOutcome),
    ruleSummary:
      "Resolve from the official Nihon Sumo Kyokai tournament result after the result is official-confirmed; provisional/live pages are UI evidence only.",
    resolutionRule: buildSumoTournamentWinnerRule(observation.tournamentName),
    sourceCertainty,
    providerEventStatus: observation.providerEventStatus,
    rawPayloadHash:
      observation.rawPayload === undefined
        ? undefined
        : createEvidenceBundleHash(observation.rawPayload),
    sources: [
      {
        type: "official",
        name: "Nihon Sumo Kyokai official matches and results",
        url: observation.sourceUrl,
        fetchedAt: observation.fetchedAt,
        observedOutcome,
        providerEventStatus: observation.providerEventStatus,
        sourcePriorityRank: 1,
        notes: observation.notes,
      },
    ],
    edgeCases: [
      "If the tournament has no official champion, use the market's unresolvable policy.",
      "If the tournament is cancelled or abandoned before an official champion exists, default to void refund unless the market rule states otherwise.",
      "If a playoff is required, wait for the official playoff result.",
      "If source data is live, delayed, or ended-unconfirmed, do not finalize settlement.",
    ],
    resolverMode: "api_prefill",
  });
}

export function sourceCertaintyForJsaStatus(
  status: ProviderEventStatus
): "provisional" | "official_confirmed" {
  if (
    status === "official_confirmed" ||
    status === "cancelled" ||
    status === "abandoned"
  ) {
    return "official_confirmed";
  }

  return "provisional";
}

export function suggestedSettlementForJsaStatus(
  status: ProviderEventStatus
) {
  if (status === "cancelled" || status === "abandoned") {
    return {
      payoutMode: "void_refund" as const,
      refundPolicy: "full_refund" as const,
    };
  }

  return {
    payoutMode: "winner_take_all" as const,
    refundPolicy: "none" as const,
  };
}

function buildDescription(
  observation: ParsedSumoJsaObservation,
  observedOutcome?: string
) {
  const day = observation.day ? ` day ${observation.day}` : "";
  const division = observation.division ? ` ${observation.division}` : "";
  const outcome = observedOutcome
    ? ` Observed outcome: ${observedOutcome}.`
    : " No official winner outcome is assigned in this observation.";

  return `JSA official source observation for ${observation.tournamentName}${day}${division}. Provider status: ${observation.providerEventStatus}.${outcome}`;
}

function buildSumoTournamentWinnerRule(tournamentName: string) {
  return {
    ruleVersion: "sumo-jsa-tournament-winner-v1",
    question: `Who is the official tournament winner of ${tournamentName} according to Nihon Sumo Kyokai?`,
    primarySource: "Nihon Sumo Kyokai official matches and results",
    sourcePriority: [
      "Nihon Sumo Kyokai official matches and results",
      "NHK official sumo results or report",
      "Operator archived official-source snapshot",
    ],
    edgeCases: {
      drawNoContest:
        "Grand tournament winner markets must wait for the official champion or playoff result; if no champion can be assigned, use the unresolvable policy.",
      postponement:
        "If the tournament or final result is postponed, keep the market unresolved until the official source confirms completion or cancellation.",
      cancellation:
        "If the tournament is cancelled or abandoned before an official champion exists, void and refund unless the market-specific rule states otherwise.",
      forfeit:
        "If Nihon Sumo Kyokai records a winner through official forfeit or fusen result, treat that official result as valid.",
      tooEarly:
        "Reject settlement while the source is not started, live, delayed, interrupted, or ended-unconfirmed.",
    },
    unresolvablePolicy: "void_refund" as const,
    provisionalDataPolicy: "ui_only" as const,
  };
}
