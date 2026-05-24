export interface Contestant {
  id: string;
  name: string;
  chance: number;
  flag?: string;
  odds?: string;
  secondary?: string;
}

export interface Market {
  id: string;
  title: {
    ja: string;
    en: string;
  };
  subtitle: {
    ja: string;
    en: string;
  };
  category: string;
  categoryLabel: {
    ja: string;
    en: string;
  };
  status: "live" | "upcoming" | "closed";
  statusInfo?: {
    ja: string;
    en: string;
  };
  contestants: Contestant[];
  volume: number;
  marketCount: number;
  trending?: boolean;
}

const mockMarkets: Market[] = [
  {
    id: "world-cup-2026",
    title: {
      ja: "2026年 FIFAワールドカップ 優勝国",
      en: "2026 FIFA World Cup Winner",
    },
    subtitle: {
      ja: "2026年6月開催",
      en: "June 2026",
    },
    category: "sports",
    categoryLabel: {
      ja: "スポーツ",
      en: "Sports",
    },
    status: "upcoming",
    statusInfo: {
      ja: "開催まであと12ヶ月",
      en: "12 months until event",
    },
    contestants: [
      { id: "france", name: "France", chance: 18, flag: "🇫🇷", odds: "4.5" },
      { id: "brazil", name: "Brazil", chance: 15, flag: "🇧🇷", odds: "5.5" },
      { id: "argentina", name: "Argentina", chance: 14, flag: "🇦🇷", odds: "6.0" },
      { id: "england", name: "England", chance: 12, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", odds: "7.0" },
      { id: "germany", name: "Germany", chance: 10, flag: "🇩🇪", odds: "8.5" },
    ],
    volume: 15420000,
    marketCount: 24,
    trending: true,
  },
  {
    id: "us-president-2028",
    title: {
      ja: "2028年 アメリカ大統領選挙",
      en: "2028 US Presidential Election",
    },
    subtitle: {
      ja: "2028年11月",
      en: "November 2028",
    },
    category: "politics",
    categoryLabel: {
      ja: "政治",
      en: "Politics",
    },
    status: "upcoming",
    statusInfo: {
      ja: "投票日まで2年",
      en: "2 years until election",
    },
    contestants: [
      { id: "harris", name: "Kamala Harris", chance: 28, odds: "2.8" },
      { id: "desantis", name: "Ron DeSantis", chance: 22, odds: "3.5" },
      { id: "newsom", name: "Gavin Newsom", chance: 18, odds: "4.5" },
      { id: "other", name: "Other", chance: 32, odds: "2.2" },
    ],
    volume: 8750000,
    marketCount: 18,
    trending: true,
  },
  {
    id: "nba-finals-2026",
    title: {
      ja: "2026年 NBAファイナル 優勝チーム",
      en: "2026 NBA Finals Champion",
    },
    subtitle: {
      ja: "2026年6月",
      en: "June 2026",
    },
    category: "sports",
    categoryLabel: {
      ja: "スポーツ",
      en: "Sports",
    },
    status: "live",
    statusInfo: {
      ja: "プレーオフ進行中",
      en: "Playoffs in progress",
    },
    contestants: [
      { id: "celtics", name: "Boston Celtics", chance: 24, odds: "3.2" },
      { id: "nuggets", name: "Denver Nuggets", chance: 20, odds: "4.0" },
      { id: "thunder", name: "OKC Thunder", chance: 18, odds: "4.5" },
      { id: "bucks", name: "Milwaukee Bucks", chance: 15, odds: "5.5" },
    ],
    volume: 12300000,
    marketCount: 15,
    trending: true,
  },
  {
    id: "uk-election-2029",
    title: {
      ja: "2029年 イギリス総選挙",
      en: "2029 UK General Election",
    },
    subtitle: {
      ja: "2029年予定",
      en: "Expected 2029",
    },
    category: "politics",
    categoryLabel: {
      ja: "政治",
      en: "Politics",
    },
    status: "upcoming",
    statusInfo: {
      ja: "選挙日未定",
      en: "Election date TBD",
    },
    contestants: [
      { id: "labour", name: "Labour Party", chance: 45, odds: "1.8" },
      { id: "conservative", name: "Conservative Party", chance: 35, odds: "2.4" },
      { id: "libdem", name: "Liberal Democrats", chance: 12, odds: "7.0" },
      { id: "other", name: "Other", chance: 8, odds: "10.0" },
    ],
    volume: 4200000,
    marketCount: 12,
    trending: false,
  },
  {
    id: "champions-league-2026",
    title: {
      ja: "2025-26 UEFAチャンピオンズリーグ",
      en: "2025-26 UEFA Champions League",
    },
    subtitle: {
      ja: "2026年5月決勝",
      en: "Final May 2026",
    },
    category: "sports",
    categoryLabel: {
      ja: "スポーツ",
      en: "Sports",
    },
    status: "live",
    statusInfo: {
      ja: "グループステージ進行中",
      en: "Group stage in progress",
    },
    contestants: [
      { id: "city", name: "Manchester City", chance: 22, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", odds: "3.5" },
      { id: "madrid", name: "Real Madrid", chance: 20, flag: "🇪🇸", odds: "4.0" },
      { id: "bayern", name: "Bayern Munich", chance: 16, flag: "🇩🇪", odds: "5.0" },
      { id: "psg", name: "Paris Saint-Germain", chance: 14, flag: "🇫🇷", odds: "6.0" },
    ],
    volume: 9800000,
    marketCount: 20,
    trending: true,
  },
  {
    id: "japan-pm-2025",
    title: {
      ja: "次期日本国首相",
      en: "Next Prime Minister of Japan",
    },
    subtitle: {
      ja: "次期選挙",
      en: "Next election",
    },
    category: "politics",
    categoryLabel: {
      ja: "政治",
      en: "Politics",
    },
    status: "upcoming",
    statusInfo: {
      ja: "任期満了まで1年",
      en: "1 year until term ends",
    },
    contestants: [
      { id: "ishiba", name: "石破茂", chance: 35, odds: "2.2" },
      { id: "koizumi", name: "小泉進次郎", chance: 25, odds: "3.2" },
      { id: "kono", name: "河野太郎", chance: 20, odds: "4.0" },
      { id: "other", name: "その他", chance: 20, odds: "4.0" },
    ],
    volume: 3500000,
    marketCount: 8,
    trending: true,
  },
  {
    id: "f1-2026",
    title: {
      ja: "2026年 F1ワールドチャンピオン",
      en: "2026 F1 World Champion",
    },
    subtitle: {
      ja: "シーズン開幕3月",
      en: "Season starts March",
    },
    category: "sports",
    categoryLabel: {
      ja: "スポーツ",
      en: "Sports",
    },
    status: "upcoming",
    statusInfo: {
      ja: "新シーズン開幕前",
      en: "Pre-season",
    },
    contestants: [
      { id: "verstappen", name: "Max Verstappen", chance: 35, flag: "🇳🇱", odds: "2.2" },
      { id: "hamilton", name: "Lewis Hamilton", chance: 20, flag: "🇬🇧", odds: "4.0" },
      { id: "leclerc", name: "Charles Leclerc", chance: 18, flag: "🇲🇨", odds: "4.5" },
      { id: "norris", name: "Lando Norris", chance: 15, flag: "🇬🇧", odds: "5.5" },
    ],
    volume: 7600000,
    marketCount: 16,
    trending: false,
  },
  {
    id: "bitcoin-100k",
    title: {
      ja: "ビットコイン 2026年末に$100K超え",
      en: "Bitcoin above $100K by end of 2026",
    },
    subtitle: {
      ja: "2026年12月31日",
      en: "December 31, 2026",
    },
    category: "crypto",
    categoryLabel: {
      ja: "暗号資産",
      en: "Crypto",
    },
    status: "live",
    statusInfo: {
      ja: "現在 $67,500",
      en: "Currently $67,500",
    },
    contestants: [
      { id: "yes", name: "Yes", chance: 62, odds: "1.5" },
      { id: "no", name: "No", chance: 38, odds: "2.2" },
    ],
    volume: 25000000,
    marketCount: 1,
    trending: true,
  },
];

export function getTrendingMarkets(): Market[] {
  return mockMarkets.filter((market) => market.trending);
}

export function getMarketsByCategory(category: string): Market[] {
  return mockMarkets.filter((market) => market.category === category);
}

export function getMarketById(id: string): Market | undefined {
  return mockMarkets.find((market) => market.id === id);
}

export function getAllMarkets(): Market[] {
  return mockMarkets;
}
