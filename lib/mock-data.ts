type LocaleText = {
  en: string;
};

export type MarketStatus = "live" | "upcoming" | "closed";
export type MarketCategory =
  | "sports"
  | "politics"
  | "culture"
  | "esports"
  | "specials";

export type ChartPoint = {
  time: string;
  value: number;
};

export type Contestant = {
  id: string;
  name: string;
  flag?: string;
  chance: number;
  priceYes: number;
  priceNo: number;
  change?: number;
  odds?: string;
  secondary?: string;
};

export type Market = {
  id: string;
  title: LocaleText;
  subtitle: LocaleText;
  category: MarketCategory;
  categoryLabel: LocaleText;
  status: MarketStatus;
  statusInfo?: LocaleText;
  volume: number;
  marketCount: number;
  contestants: Contestant[];
  chartData: ChartPoint[];
};

export type Position = {
  id: string;
  marketId: string;
  marketTitle: LocaleText;
  type: "yes" | "no";
  candidate: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
};

export type Article = {
  id: string;
  category: string;
  readTime: number;
  date: string;
  title: LocaleText;
  excerpt: LocaleText;
  author: string;
};

export type SocialPost = {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  content: string;
  position?: {
    type: "yes" | "no";
    candidate: string;
    market: string;
  };
  image?: string;
  likes: number;
  replies: number;
  liked?: boolean;
  saved?: boolean;
};

const enOnly = (text: string): LocaleText => ({ en: text });

export const mockChartData: ChartPoint[] = [
  { time: "09:00", value: 42 },
  { time: "10:00", value: 46 },
  { time: "11:00", value: 45 },
  { time: "12:00", value: 49 },
  { time: "13:00", value: 53 },
  { time: "14:00", value: 51 },
  { time: "15:00", value: 56 },
  { time: "16:00", value: 58 },
];

const chart = (start: number, moves: number[]): ChartPoint[] =>
  moves.map((move, index) => ({
    time: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"][index],
    value: Math.max(1, Math.min(99, start + move)),
  }));

export const mockMarkets: Market[] = [
  {
    id: "nagoya-basho-winner",
    title: enOnly("Who will win the Nagoya basho?"),
    subtitle: enOnly("Grand Sumo"),
    category: "sports",
    categoryLabel: enOnly("Sports"),
    status: "live",
    statusInfo: enOnly("Live until Day 12"),
    volume: 1280000,
    marketCount: 18,
    chartData: chart(45, [-3, 0, 2, 5, 7, 6, 9, 11]),
    contestants: [
      {
        id: "hakuoho",
        name: "Hakuoho",
        chance: 56,
        priceYes: 56,
        priceNo: 44,
        change: 5,
        odds: "12-2",
      },
      {
        id: "kotozakura",
        name: "Kotozakura",
        chance: 24,
        priceYes: 24,
        priceNo: 76,
        change: -2,
        odds: "10-4",
      },
      {
        id: "hoshoryu",
        name: "Hoshoryu",
        chance: 14,
        priceYes: 14,
        priceNo: 86,
        change: 1,
        odds: "9-5",
      },
      {
        id: "field",
        name: "Any other rikishi",
        chance: 6,
        priceYes: 6,
        priceNo: 94,
        change: -1,
      },
    ],
  },
  {
    id: "koshien-summer-champion",
    title: enOnly("Which school wins Summer Koshien?"),
    subtitle: enOnly("High school baseball"),
    category: "sports",
    categoryLabel: enOnly("Sports"),
    status: "upcoming",
    statusInfo: enOnly("Opens after regional finals"),
    volume: 740000,
    marketCount: 47,
    chartData: chart(30, [0, 3, 4, 6, 7, 8, 10, 11]),
    contestants: [
      {
        id: "osaka-toin",
        name: "Osaka Toin",
        chance: 41,
        priceYes: 41,
        priceNo: 59,
        change: 3,
        odds: "Seed",
      },
      {
        id: "sendai-ikuei",
        name: "Sendai Ikuei",
        chance: 28,
        priceYes: 28,
        priceNo: 72,
        change: 2,
      },
      {
        id: "keio",
        name: "Keio",
        chance: 18,
        priceYes: 18,
        priceNo: 82,
        change: -1,
      },
      {
        id: "field-schools",
        name: "Field",
        chance: 13,
        priceYes: 13,
        priceNo: 87,
      },
    ],
  },
  {
    id: "npb-central-league-pennant",
    title: enOnly("Who wins the NPB Central League pennant?"),
    subtitle: enOnly("NPB"),
    category: "sports",
    categoryLabel: enOnly("Sports"),
    status: "live",
    statusInfo: enOnly("Regular season market"),
    volume: 930000,
    marketCount: 9,
    chartData: chart(38, [-2, 1, 4, 4, 6, 8, 7, 10]),
    contestants: [
      {
        id: "hanshin",
        name: "Hanshin Tigers",
        chance: 48,
        priceYes: 48,
        priceNo: 52,
        change: 4,
      },
      {
        id: "giants",
        name: "Yomiuri Giants",
        chance: 29,
        priceYes: 29,
        priceNo: 71,
        change: -3,
      },
      {
        id: "baystars",
        name: "Yokohama BayStars",
        chance: 15,
        priceYes: 15,
        priceNo: 85,
      },
      {
        id: "dragons",
        name: "Chunichi Dragons",
        chance: 8,
        priceYes: 8,
        priceNo: 92,
      },
    ],
  },
  {
    id: "diet-seat-threshold",
    title: enOnly("Will the LDP coalition win at least 240 lower-house seats?"),
    subtitle: enOnly("Japan Diet"),
    category: "politics",
    categoryLabel: enOnly("Politics"),
    status: "live",
    statusInfo: enOnly("Resolves from official election data"),
    volume: 1610000,
    marketCount: 31,
    chartData: chart(52, [1, -1, 0, 3, 4, 2, 5, 6]),
    contestants: [
      {
        id: "yes-240",
        name: "Yes, 240 or more",
        chance: 58,
        priceYes: 58,
        priceNo: 42,
        change: 2,
      },
      {
        id: "no-240",
        name: "No, under 240",
        chance: 42,
        priceYes: 42,
        priceNo: 58,
        change: -2,
      },
    ],
  },
  {
    id: "us-presidential-popular-vote",
    title: enOnly("Which party wins the next US presidential popular vote?"),
    subtitle: enOnly("US politics"),
    category: "politics",
    categoryLabel: enOnly("Politics"),
    status: "upcoming",
    statusInfo: enOnly("Research-only until market opens"),
    volume: 2200000,
    marketCount: 26,
    chartData: chart(49, [0, 1, -1, 2, 3, 4, 3, 5]),
    contestants: [
      {
        id: "democratic",
        name: "Democratic nominee",
        chance: 54,
        priceYes: 54,
        priceNo: 46,
        change: 1,
      },
      {
        id: "republican",
        name: "Republican nominee",
        chance: 46,
        priceYes: 46,
        priceNo: 54,
        change: -1,
      },
    ],
  },
  {
    id: "epl-title-winner",
    title: enOnly("Who wins the English Premier League title?"),
    subtitle: enOnly("Global football"),
    category: "sports",
    categoryLabel: enOnly("Sports"),
    status: "live",
    statusInfo: enOnly("Season market"),
    volume: 1840000,
    marketCount: 22,
    chartData: chart(40, [1, 2, 5, 3, 8, 9, 11, 13]),
    contestants: [
      {
        id: "man-city",
        name: "Manchester City",
        chance: 53,
        priceYes: 53,
        priceNo: 47,
        change: 3,
      },
      {
        id: "arsenal",
        name: "Arsenal",
        chance: 31,
        priceYes: 31,
        priceNo: 69,
        change: -1,
      },
      {
        id: "liverpool",
        name: "Liverpool",
        chance: 16,
        priceYes: 16,
        priceNo: 84,
        change: -2,
      },
    ],
  },
  {
    id: "valorant-masters-winner",
    title: enOnly("Who wins the next Valorant Masters?"),
    subtitle: enOnly("Esports"),
    category: "esports",
    categoryLabel: enOnly("Esports"),
    status: "upcoming",
    statusInfo: enOnly("Opens after group draw"),
    volume: 510000,
    marketCount: 16,
    chartData: chart(33, [0, 1, 3, 2, 5, 5, 7, 8]),
    contestants: [
      {
        id: "gen-g",
        name: "Gen.G",
        chance: 41,
        priceYes: 41,
        priceNo: 59,
        change: 2,
      },
      {
        id: "fnatic",
        name: "Fnatic",
        chance: 27,
        priceYes: 27,
        priceNo: 73,
        change: 1,
      },
      {
        id: "paper-rex",
        name: "Paper Rex",
        chance: 19,
        priceYes: 19,
        priceNo: 81,
      },
      {
        id: "field-valorant",
        name: "Field",
        chance: 13,
        priceYes: 13,
        priceNo: 87,
      },
    ],
  },
  {
    id: "akutagawa-prize-winner",
    title: enOnly("Which shortlisted author wins the Akutagawa Prize?"),
    subtitle: enOnly("Culture"),
    category: "culture",
    categoryLabel: enOnly("Culture"),
    status: "upcoming",
    statusInfo: enOnly("Awaiting shortlist"),
    volume: 260000,
    marketCount: 8,
    chartData: chart(25, [0, 2, 2, 3, 4, 5, 5, 7]),
    contestants: [
      {
        id: "author-a",
        name: "Author A",
        chance: 32,
        priceYes: 32,
        priceNo: 68,
      },
      {
        id: "author-b",
        name: "Author B",
        chance: 29,
        priceYes: 29,
        priceNo: 71,
      },
      {
        id: "author-c",
        name: "Author C",
        chance: 21,
        priceYes: 21,
        priceNo: 79,
      },
      {
        id: "field-authors",
        name: "Field",
        chance: 18,
        priceYes: 18,
        priceNo: 82,
      },
    ],
  },
  {
    id: "boj-rate-decision",
    title: enOnly("Will the Bank of Japan raise rates at the next meeting?"),
    subtitle: enOnly("Macro special"),
    category: "specials",
    categoryLabel: enOnly("Specials"),
    status: "live",
    statusInfo: enOnly("Resolves from BOJ statement"),
    volume: 870000,
    marketCount: 11,
    chartData: chart(44, [-1, 0, 2, 4, 3, 6, 8, 9]),
    contestants: [
      {
        id: "boj-raise-yes",
        name: "Yes, raise",
        chance: 53,
        priceYes: 53,
        priceNo: 47,
        change: 4,
      },
      {
        id: "boj-raise-no",
        name: "No raise",
        chance: 47,
        priceYes: 47,
        priceNo: 53,
        change: -4,
      },
    ],
  },
];

export const mockPositions: Position[] = [
  {
    id: "pos-1",
    marketId: "nagoya-basho-winner",
    marketTitle: enOnly("Who will win the Nagoya basho?"),
    type: "yes",
    candidate: "Hakuoho",
    shares: 180,
    avgPrice: 49,
    currentPrice: 56,
    pnl: 1260,
    pnlPercent: 14.29,
  },
  {
    id: "pos-2",
    marketId: "diet-seat-threshold",
    marketTitle: enOnly("Will the LDP coalition win at least 240 lower-house seats?"),
    type: "no",
    candidate: "No, under 240",
    shares: 95,
    avgPrice: 46,
    currentPrice: 42,
    pnl: -380,
    pnlPercent: -8.7,
  },
  {
    id: "pos-3",
    marketId: "epl-title-winner",
    marketTitle: enOnly("Who wins the English Premier League title?"),
    type: "yes",
    candidate: "Manchester City",
    shares: 120,
    avgPrice: 50,
    currentPrice: 53,
    pnl: 360,
    pnlPercent: 6,
  },
];

export const mockArticles: Article[] = [
  {
    id: "article-1",
    category: "Market Guide",
    readTime: 4,
    date: "May 25, 2026",
    title: enOnly("How KIAI resolves sumo markets"),
    excerpt: enOnly(
      "A practical guide to official sources, dispute windows, and how a testnet position moves from open to settled."
    ),
    author: "KIAI Research",
  },
  {
    id: "article-2",
    category: "Politics",
    readTime: 6,
    date: "May 24, 2026",
    title: enOnly("What makes an election market resolvable"),
    excerpt: enOnly(
      "Clear thresholds, official result sources, and cancellation rules are more important than clever wording."
    ),
    author: "KIAI Policy Desk",
  },
  {
    id: "article-3",
    category: "Chains",
    readTime: 5,
    date: "May 23, 2026",
    title: enOnly("Why KIAI tracks Sui and Base separately"),
    excerpt: enOnly(
      "One product market can have two chain deployments, each with its own indexing, failure, and settlement state."
    ),
    author: "KIAI Engineering",
  },
];

export const mockSocialPosts: SocialPost[] = [
  {
    id: "post-1",
    user: {
      name: "Mika Tan",
      username: "mika_trades",
    },
    timestamp: "12m",
    content:
      "Nagoya basho odds moved fast after Day 10. The interesting question is whether the leader can hold through the final weekend.",
    position: {
      type: "yes",
      candidate: "Hakuoho",
      market: "Nagoya basho",
    },
    likes: 42,
    replies: 8,
    liked: true,
  },
  {
    id: "post-2",
    user: {
      name: "Kenji Markets",
      username: "kenji_odds",
    },
    timestamp: "34m",
    content:
      "For election markets, source policy matters as much as price. I want the official result snapshot visible before I trade.",
    position: {
      type: "no",
      candidate: "No, under 240",
      market: "Diet seat threshold",
    },
    likes: 28,
    replies: 5,
    saved: true,
  },
  {
    id: "post-3",
    user: {
      name: "Ava Chain",
      username: "ava_base_sui",
    },
    timestamp: "1h",
    content:
      "Dual-rail markets are useful only if portfolio state is honest about which chain actually executed. Explorer links are not optional.",
    likes: 63,
    replies: 11,
  },
];

export function getTrendingMarkets(): Market[] {
  return [...mockMarkets].sort((a, b) => b.volume - a.volume);
}

export function getMarketsByCategory(category: MarketCategory): Market[] {
  return mockMarkets.filter((market) => market.category === category);
}

export function getLiveMarkets(): Market[] {
  return mockMarkets.filter((market) => market.status === "live");
}

export function getMarketById(id: string): Market | undefined {
  return mockMarkets.find((market) => market.id === id);
}
