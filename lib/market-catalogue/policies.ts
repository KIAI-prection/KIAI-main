import {
  assertMarketResolutionPolicyReady,
  type MarketResolutionPolicy,
} from "@/lib/domain/market-resolution-policy";

export type CatalogueOutcome = {
  slug: string;
  name: string;
  flag?: string;
};

export type CatalogueResolutionPolicyInput = {
  ruleVersion: string;
  question: string;
  primarySource: string;
  sourcePriority?: string[];
  outcomes: CatalogueOutcome[];
  edgeCases?: Partial<MarketResolutionPolicy["resolutionRule"]["edgeCases"]>;
  unresolvablePolicy?: MarketResolutionPolicy["resolutionRule"]["unresolvablePolicy"];
  resolverMode?: MarketResolutionPolicy["resolverMode"];
  payoutMode?: MarketResolutionPolicy["payoutMode"];
  refundPolicy?: MarketResolutionPolicy["refundPolicy"];
  sourceCertaintyPolicy?: MarketResolutionPolicy["sourceCertaintyPolicy"];
};

const DEFAULT_EDGE_CASES: MarketResolutionPolicy["resolutionRule"]["edgeCases"] = {
  drawNoContest:
    "If the official source cannot assign one listed outcome, use the market's unresolvable policy.",
  postponement:
    "If the event is postponed, keep the market unresolved until the official source confirms a result or the market rule expiry is reached.",
  cancellation:
    "If the event is cancelled with no replacement result, use the market's refund or unresolvable policy.",
  forfeit:
    "If the official source records a forfeit or walkover winner, treat that official winner as the result unless this market explicitly excludes forfeits.",
  tooEarly:
    "Reject resolution attempts before the named official source has an official-confirmed result.",
};

export function buildCatalogueResolutionPolicy(
  input: CatalogueResolutionPolicyInput
): MarketResolutionPolicy {
  return assertMarketResolutionPolicyReady({
    resolutionRule: {
      ruleVersion: input.ruleVersion,
      question: input.question,
      primarySource: input.primarySource,
      sourcePriority: input.sourcePriority ?? [input.primarySource],
      outcomeMapping: Object.fromEntries(
        input.outcomes.map((outcome) => [outcome.slug, outcome.slug])
      ),
      edgeCases: {
        ...DEFAULT_EDGE_CASES,
        ...(input.edgeCases ?? {}),
      },
      unresolvablePolicy: input.unresolvablePolicy ?? "void_refund",
      provisionalDataPolicy: "ui_only",
    },
    resolverMode: input.resolverMode ?? "operator_snapshot",
    payoutMode: input.payoutMode ?? "winner_take_all",
    refundPolicy: input.refundPolicy ?? "none",
    sourceCertaintyPolicy: input.sourceCertaintyPolicy ?? "official_only",
  });
}
