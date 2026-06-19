import type { MarketResolutionPolicy } from "@/lib/domain/market-resolution-policy";
import {
  buildCatalogueResolutionPolicy,
  type CatalogueOutcome,
} from "@/lib/market-catalogue/policies";

export type DemoMarketChainDeployment = {
  chain: "BASE" | "SUI";
  collateral: "USDC_BASE_MAINNET" | "USDC_SUI_MAINNET";
  deployStatus: "not_deployed";
};

export type DemoMarket = {
  slug: string;
  titleEn: string;
  titleJa: string;
  subtitleEn: string;
  subtitleJa: string;
  category: string;
  categoryLabelEn: string;
  categoryLabelJa: string;
  closeAt: Date;
  lmsrB: number;
  outcomes: CatalogueOutcome[];
  sourcePolicyEn: string;
  resolutionPolicy: MarketResolutionPolicy;
  chainDeploymentPlan: DemoMarketChainDeployment[];
};

const DEFAULT_CHAIN_DEPLOYMENT_PLAN: DemoMarketChainDeployment[] = [
  {
    chain: "BASE",
    collateral: "USDC_BASE_MAINNET",
    deployStatus: "not_deployed",
  },
  {
    chain: "SUI",
    collateral: "USDC_SUI_MAINNET",
    deployStatus: "not_deployed",
  },
];

function withPolicy(
  market: Omit<DemoMarket, "resolutionPolicy" | "chainDeploymentPlan"> & {
    ruleVersion: string;
    primarySource: string;
    sourcePriority?: string[];
    edgeCases?: Partial<MarketResolutionPolicy["resolutionRule"]["edgeCases"]>;
    unresolvablePolicy?: MarketResolutionPolicy["resolutionRule"]["unresolvablePolicy"];
  }
): DemoMarket {
  const {
    ruleVersion,
    primarySource,
    sourcePriority,
    edgeCases,
    unresolvablePolicy,
    ...base
  } = market;

  return {
    ...base,
    resolutionPolicy: buildCatalogueResolutionPolicy({
      ruleVersion,
      question: base.titleEn,
      primarySource,
      sourcePriority,
      outcomes: base.outcomes,
      edgeCases,
      unresolvablePolicy,
    }),
    chainDeploymentPlan: DEFAULT_CHAIN_DEPLOYMENT_PLAN,
  };
}

export const DEMO_MARKETS: DemoMarket[] = [
  withPolicy({
    slug: "nagoya-basho-2026-winner",
    titleEn: "Nagoya Basho 2026 — Tournament Winner",
    titleJa: "Nagoya Basho 2026 — Tournament Winner",
    subtitleEn: "Who will win the July Grand Sumo Tournament?",
    subtitleJa: "Who will win the July Grand Sumo Tournament?",
    category: "sports",
    categoryLabelEn: "Sumo",
    categoryLabelJa: "Sumo",
    closeAt: new Date("2026-07-26T10:00:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "terunofuji", name: "Terunofuji", flag: "🇲🇳" },
      { slug: "hoshoryu", name: "Hoshoryu", flag: "🇲🇳" },
      { slug: "kirishima", name: "Kirishima", flag: "🇲🇳" },
      { slug: "other", name: "Other Rikishi" },
    ],
    sourcePolicyEn: "Official Japan Sumo Association results page, with NHK official report as secondary evidence.",
    ruleVersion: "sumo-jsa-tournament-winner-v1",
    primarySource: "Nihon Sumo Kyokai official matches and results",
    sourcePriority: [
      "Nihon Sumo Kyokai official matches and results",
      "NHK official report",
    ],
    edgeCases: {
      drawNoContest: "Use the official playoff result. If no champion is declared, use void_refund.",
      cancellation: "If the tournament is cancelled before an official champion is declared, use void_refund.",
    },
  }),
  withPolicy({
    slug: "yokozuna-terunofuji-nagoya-2026-record",
    titleEn: "Terunofuji — Nagoya 2026 Final Record",
    titleJa: "Terunofuji — Nagoya 2026 Final Record",
    subtitleEn: "Will Terunofuji finish with 13+ wins?",
    subtitleJa: "Will Terunofuji finish with 13+ wins?",
    category: "sports",
    categoryLabelEn: "Sumo",
    categoryLabelJa: "Sumo",
    closeAt: new Date("2026-07-26T10:00:00Z"),
    lmsrB: 100,
    outcomes: [
      { slug: "yes", name: "Yes — 13 or more wins" },
      { slug: "no", name: "No — 12 or fewer wins" },
    ],
    sourcePolicyEn: "Japan Sumo Association official bout record after the final tournament day.",
    ruleVersion: "sumo-jsa-record-threshold-v1",
    primarySource: "Nihon Sumo Kyokai official wrestler record",
    sourcePriority: [
      "Nihon Sumo Kyokai official wrestler record",
      "NHK official tournament summary",
    ],
    edgeCases: {
      drawNoContest: "Use the official final win-loss record. Absences count only as recorded by the official source.",
      forfeit: "Use the official win/loss/absence treatment recorded by JSA.",
    },
  }),
  withPolicy({
    slug: "summer-koshien-2026-winner",
    titleEn: "Summer Koshien 2026 — National Champion",
    titleJa: "Summer Koshien 2026 — National Champion",
    subtitleEn: "Which high school will win the 108th National High School Baseball Tournament?",
    subtitleJa: "Which high school will win the 108th National High School Baseball Tournament?",
    category: "sports",
    categoryLabelEn: "Koshien",
    categoryLabelJa: "Koshien",
    closeAt: new Date("2026-08-25T12:00:00Z"),
    lmsrB: 150,
    outcomes: [
      { slug: "osaka-team", name: "Osaka Representative", flag: "🇯🇵" },
      { slug: "aichi-team", name: "Aichi Representative", flag: "🇯🇵" },
      { slug: "tokyo-team", name: "Tokyo Representative", flag: "🇯🇵" },
      { slug: "other", name: "Other Prefectural Representative" },
    ],
    sourcePolicyEn: "Japan High School Baseball Federation official tournament result.",
    ruleVersion: "koshien-national-champion-v1",
    primarySource: "Japan High School Baseball Federation official tournament result",
    sourcePriority: [
      "Japan High School Baseball Federation official tournament result",
      "Asahi Shimbun official tournament coverage",
    ],
    edgeCases: {
      drawNoContest: "Use the officially declared champion. If multiple schools are declared co-champions, use manual_adjudication.",
      cancellation: "If no official champion is declared, use void_refund.",
    },
  }),
  withPolicy({
    slug: "npb-central-league-pennant-2026",
    titleEn: "NPB 2026 — Central League Pennant Winner",
    titleJa: "NPB 2026 — Central League Pennant Winner",
    subtitleEn: "Which team will win the 2026 Central League pennant?",
    subtitleJa: "Which team will win the 2026 Central League pennant?",
    category: "sports",
    categoryLabelEn: "NPB",
    categoryLabelJa: "NPB",
    closeAt: new Date("2026-10-05T10:00:00Z"),
    lmsrB: 300,
    outcomes: [
      { slug: "hanshin", name: "Hanshin Tigers", flag: "🐯" },
      { slug: "giants", name: "Yomiuri Giants", flag: "⚾" },
      { slug: "baystars", name: "DeNA BayStars", flag: "⚾" },
      { slug: "carp", name: "Hiroshima Carp", flag: "⚾" },
      { slug: "swallows", name: "Tokyo Yakult Swallows", flag: "⚾" },
      { slug: "dragons", name: "Chunichi Dragons", flag: "⚾" },
    ],
    sourcePolicyEn: "Nippon Professional Baseball official standings and championship announcement.",
    ruleVersion: "npb-central-league-pennant-v1",
    primarySource: "NPB official standings and pennant result",
    sourcePriority: [
      "NPB official standings and pennant result",
      "Central League official announcement",
    ],
    edgeCases: {
      drawNoContest: "Use NPB's official tie-breaker and declared pennant winner.",
      postponement: "Wait until postponed games relevant to the pennant are officially completed or cancelled.",
    },
  }),
  withPolicy({
    slug: "japan-house-councillors-2028-coalition-majority",
    titleEn: "2028 Japan Upper House — LDP + Komeito Coalition Majority?",
    titleJa: "2028 Japan Upper House — LDP + Komeito Coalition Majority?",
    subtitleEn:
      "Will the LDP–Komeito coalition hold a House of Councillors majority after the 2028 election result?",
    subtitleJa:
      "Will the LDP–Komeito coalition hold a House of Councillors majority after the 2028 election result?",
    category: "politics",
    categoryLabelEn: "Politics",
    categoryLabelJa: "Politics",
    closeAt: new Date("2028-07-31T00:00:00Z"),
    lmsrB: 250,
    outcomes: [
      { slug: "yes", name: "Yes — coalition has a majority" },
      { slug: "no", name: "No — coalition does not have a majority" },
    ],
    sourcePolicyEn:
      "Ministry of Internal Affairs and Communications official count, with NHK election result as secondary evidence.",
    ruleVersion: "japan-councillors-coalition-majority-v1",
    primarySource: "Ministry of Internal Affairs and Communications official election count",
    sourcePriority: [
      "Ministry of Internal Affairs and Communications official election count",
      "NHK official election result",
    ],
    edgeCases: {
      drawNoContest: "Resolve from official seat totals after all recounts affecting majority status are complete.",
      postponement: "If the election is postponed, keep unresolved until the official result or market expiry policy applies.",
      tooEarly: "Exit polls, projections, and partial counts are UI-only and cannot finalize settlement.",
    },
  }),
  withPolicy({
    slug: "thailand-u19-vs-australia-u19-asean-2026",
    titleEn: "Thailand U19 vs Australia U19 — ASEAN Championship",
    titleJa: "Thailand U19 vs Australia U19 — ASEAN Championship",
    subtitleEn:
      "Live API-FOOTBALL demo market for fixture 1553093 in the ASEAN Championship U19.",
    subtitleJa:
      "Live API-FOOTBALL demo market for fixture 1553093 in the ASEAN Championship U19.",
    category: "sports",
    categoryLabelEn: "Football",
    categoryLabelJa: "Football",
    closeAt: new Date("2026-06-13T13:15:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "home-win", name: "Thailand U19 win", flag: "🇹🇭" },
      { slug: "draw", name: "Draw" },
      { slug: "away-win", name: "Australia U19 win", flag: "🇦🇺" },
    ],
    sourcePolicyEn:
      "API-FOOTBALL fixture 1553093 prefill, reviewed against the official ASEAN Championship U19 result before settlement.",
    ruleVersion: "api-football-fixture-1553093-match-result-v1",
    primarySource: "Official ASEAN Championship U19 match result",
    sourcePriority: [
      "Official ASEAN Championship U19 match result",
      "API-FOOTBALL fixture 1553093",
    ],
    edgeCases: {
      drawNoContest: "Draw resolves to the draw outcome when the official result is a draw.",
      postponement: "If postponed, keep unresolved until the match is played unless the market expiry rule triggers void_refund.",
      cancellation: "If the match is cancelled and no official result is assigned, use void_refund.",
    },
  }),
  withPolicy({
    slug: "f1-abu-dhabi-gp-2026-winner",
    titleEn: "F1 2026 — Abu Dhabi Grand Prix Winner",
    titleJa: "F1 2026 — Abu Dhabi Grand Prix Winner",
    subtitleEn: "Who will win the Formula 1 Abu Dhabi Grand Prix at Yas Marina?",
    subtitleJa: "Who will win the Formula 1 Abu Dhabi Grand Prix at Yas Marina?",
    category: "sports",
    categoryLabelEn: "F1",
    categoryLabelJa: "F1",
    closeAt: new Date("2026-12-06T16:00:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "verstappen", name: "Max Verstappen", flag: "🇳🇱" },
      { slug: "hamilton", name: "Lewis Hamilton", flag: "🇬🇧" },
      { slug: "norris", name: "Lando Norris", flag: "🇬🇧" },
      { slug: "leclerc", name: "Charles Leclerc", flag: "🇲🇨" },
      { slug: "other", name: "Other Driver" },
    ],
    sourcePolicyEn: "Formula 1 official race classification at formula1.com.",
    ruleVersion: "f1-race-winner-v1",
    primarySource: "Formula 1 official race classification",
    sourcePriority: [
      "Formula 1 official race classification",
      "FIA official classification document",
    ],
    edgeCases: {
      drawNoContest: "Use the official classified race winner. If no winner is classified, use void_refund.",
      cancellation: "If the race is cancelled with no official classification, use void_refund.",
      forfeit: "Use post-race official classification after penalties that affect first place are final.",
    },
  }),
  withPolicy({
    slug: "akutagawa-prize-2026-second-half",
    titleEn: "Akutagawa Prize 2026 (2nd Half) — Will a debut author win?",
    titleJa: "Akutagawa Prize 2026 (2nd Half) — Will a debut author win?",
    subtitleEn:
      "Will the second-half 2026 Akutagawa Prize go to a debut author (first novel)?",
    subtitleJa:
      "Will the second-half 2026 Akutagawa Prize go to a debut author (first novel)?",
    category: "culture",
    categoryLabelEn: "Culture",
    categoryLabelJa: "Culture",
    closeAt: new Date("2027-01-20T10:00:00Z"),
    lmsrB: 100,
    outcomes: [
      { slug: "yes", name: "Yes — debut author wins" },
      { slug: "no", name: "No — established author wins" },
    ],
    sourcePolicyEn: "Bungei Shunju official Akutagawa Prize announcement.",
    ruleVersion: "akutagawa-prize-debut-author-v1",
    primarySource: "Bungei Shunju official Akutagawa Prize announcement",
    sourcePriority: [
      "Bungei Shunju official Akutagawa Prize announcement",
      "Japan Literature Promotion Society announcement",
    ],
    edgeCases: {
      drawNoContest: "If multiple winners are announced, resolve yes if at least one winner meets the debut-author rule.",
      cancellation: "If no prize is awarded for this period, use void_refund.",
      tooEarly: "Nomination lists and media reports are UI-only until the official winner announcement.",
    },
  }),
];

export const DEMO_MARKET_SLUGS = DEMO_MARKETS.map((market) => market.slug);

export const SUPERSEDED_DEMO_MARKET_SLUGS = [
  "japan-house-councillors-2025-ldp-seats",
  "epl-2026-27-opening-weekend-featured-match",
  "epl-man-city-vs-arsenal-2026-aug",
  "f1-japanese-gp-2026-winner",
] as const;
