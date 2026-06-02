/**
 * KIAI Database Seed Script
 *
 * Creates the 8 first demo markets from PLAN.md Phase 9.
 * These markets start in DRAFT state — operators must review and deploy them.
 *
 * Architecture: one pool, two payment rails.
 * Each market gets ChainDeployment records for both BASE and SUI.
 * Pricing is LMSR backend-managed; on-chain contracts are custody only.
 *
 * Run: pnpm exec tsx prisma/seed.ts
 * Or:  pnpm exec prisma db seed
 */

import "dotenv/config";
import { PrismaClient, Chain, CollateralAsset } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Market seed data
// ---------------------------------------------------------------------------

interface SeedMarket {
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
  outcomes: Array<{ slug: string; name: string; flag?: string }>;
  sourcePolicyEn: string;
}

const DEMO_MARKETS: SeedMarket[] = [
  // 1. Nagoya basho — sumo (recommended first vertical slice)
  {
    slug: "nagoya-basho-2026-winner",
    titleEn: "Nagoya Basho 2026 — Tournament Winner",
    titleJa: "名古屋場所2026 — 優勝力士",
    subtitleEn: "Who will win the July Grand Sumo Tournament?",
    subtitleJa: "7月の大相撲名古屋場所で誰が優勝するか？",
    category: "sports",
    categoryLabelEn: "Sumo",
    categoryLabelJa: "相撲",
    closeAt: new Date("2026-07-25T06:00:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "terunofuji", name: "Terunofuji", flag: "🇲🇳" },
      { slug: "hoshoryu", name: "Hoshoryu", flag: "🇲🇳" },
      { slug: "kirishima", name: "Kirishima", flag: "🇲🇳" },
      { slug: "other", name: "Other Rikishi" },
    ],
    sourcePolicyEn: "Official NHK broadcast and Japan Sumo Association results page",
  },

  // 2. Daily Yokozuna bout prop
  {
    slug: "yokozuna-terunofuji-nagoya-2026-record",
    titleEn: "Terunofuji — Nagoya 2026 Final Record",
    titleJa: "照ノ富士 — 名古屋2026最終成績",
    subtitleEn: "Will Terunofuji finish with 13+ wins?",
    subtitleJa: "照ノ富士は13勝以上で終えるか？",
    category: "sports",
    categoryLabelEn: "Sumo",
    categoryLabelJa: "相撲",
    closeAt: new Date("2026-07-26T00:00:00Z"),
    lmsrB: 100,
    outcomes: [
      { slug: "yes", name: "Yes — 13 or more wins" },
      { slug: "no", name: "No — 12 or fewer wins" },
    ],
    sourcePolicyEn: "Japan Sumo Association official results",
  },

  // 3. Summer Koshien
  {
    slug: "summer-koshien-2026-winner",
    titleEn: "Summer Koshien 2026 — National Champion",
    titleJa: "夏の甲子園2026 — 優勝校",
    subtitleEn: "Which high school will win the 108th National High School Baseball Tournament?",
    subtitleJa: "第108回全国高等学校野球選手権大会で優勝する学校は？",
    category: "sports",
    categoryLabelEn: "Koshien",
    categoryLabelJa: "甲子園",
    closeAt: new Date("2026-08-25T12:00:00Z"),
    lmsrB: 150,
    outcomes: [
      { slug: "osaka-team", name: "Osaka Representative", flag: "🇯🇵" },
      { slug: "aichi-team", name: "Aichi Representative", flag: "🇯🇵" },
      { slug: "tokyo-team", name: "Tokyo Representative", flag: "🇯🇵" },
      { slug: "other", name: "Other Prefectural Representative" },
    ],
    sourcePolicyEn: "Japan High School Baseball Federation official results",
  },

  // 4. NPB Central League pennant
  {
    slug: "npb-central-league-pennant-2026",
    titleEn: "NPB 2026 — Central League Pennant Winner",
    titleJa: "プロ野球2026 — セントラル・リーグ優勝",
    subtitleEn: "Which team will win the 2026 Central League pennant?",
    subtitleJa: "2026年のセ・リーグを制するチームは？",
    category: "sports",
    categoryLabelEn: "NPB",
    categoryLabelJa: "プロ野球",
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
    sourcePolicyEn: "NPB official standings and Nippon Professional Baseball results",
  },

  // 5. Japan Diet party seat threshold
  {
    slug: "japan-house-councillors-2025-ldp-seats",
    titleEn: "2025 Japan Upper House — LDP + Komeito Coalition Majority?",
    titleJa: "2025年参院選 — 自公連立、過半数獲得か？",
    subtitleEn:
      "Will the LDP–Komeito coalition win a majority in the 2025 House of Councillors election?",
    subtitleJa: "自民・公明の連立与党は参院選で過半数を獲得するか？",
    category: "politics",
    categoryLabelEn: "Politics",
    categoryLabelJa: "政治",
    closeAt: new Date("2025-07-28T00:00:00Z"),
    lmsrB: 250,
    outcomes: [
      { slug: "yes", name: "Yes — Coalition wins majority" },
      { slug: "no", name: "No — Coalition falls short" },
    ],
    sourcePolicyEn:
      "NHK Election results and Ministry of Internal Affairs and Communications official count",
  },

  // 6. EPL match outcome
  {
    slug: "epl-man-city-vs-arsenal-2026-aug",
    titleEn: "EPL 2026/27 — Man City vs Arsenal (Aug Opener)",
    titleJa: "プレミアリーグ26/27 — マンC対アーセナル（開幕節）",
    subtitleEn: "Result of the Premier League season opener",
    subtitleJa: "プレミアリーグ開幕節の試合結果",
    category: "sports",
    categoryLabelEn: "Football",
    categoryLabelJa: "サッカー",
    closeAt: new Date("2026-08-16T14:00:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "man-city", name: "Man City Win", flag: "🔵" },
      { slug: "draw", name: "Draw" },
      { slug: "arsenal", name: "Arsenal Win", flag: "🔴" },
    ],
    sourcePolicyEn: "Premier League official results at premierleague.com",
  },

  // 7. F1 race winner
  {
    slug: "f1-japanese-gp-2026-winner",
    titleEn: "F1 2026 — Japanese Grand Prix Winner",
    titleJa: "F1 2026 — 日本グランプリ 優勝ドライバー",
    subtitleEn: "Who will win the Formula 1 Japanese Grand Prix at Suzuka?",
    subtitleJa: "鈴鹿サーキットで開催されるF1日本GPで優勝するのは誰か？",
    category: "sports",
    categoryLabelEn: "F1",
    categoryLabelJa: "F1",
    closeAt: new Date("2026-04-05T08:00:00Z"),
    lmsrB: 200,
    outcomes: [
      { slug: "verstappen", name: "Max Verstappen", flag: "🇳🇱" },
      { slug: "hamilton", name: "Lewis Hamilton", flag: "🇬🇧" },
      { slug: "norris", name: "Lando Norris", flag: "🇬🇧" },
      { slug: "leclerc", name: "Charles Leclerc", flag: "🇲🇨" },
      { slug: "other", name: "Other Driver" },
    ],
    sourcePolicyEn: "Formula 1 official results at formula1.com",
  },

  // 8. Akutagawa Prize winner
  {
    slug: "akutagawa-prize-2026-second-half",
    titleEn: "Akutagawa Prize 2026 (2nd Half) — Will a debut author win?",
    titleJa: "第176回芥川賞 — 新人作家が受賞するか？",
    subtitleEn:
      "Will the second-half 2026 Akutagawa Prize go to a debut author (first novel)?",
    subtitleJa: "2026年下半期の芥川賞は、デビュー作家（初小説）に贈られるか？",
    category: "culture",
    categoryLabelEn: "Culture",
    categoryLabelJa: "文化",
    closeAt: new Date("2027-01-20T10:00:00Z"),
    lmsrB: 100,
    outcomes: [
      { slug: "yes", name: "Yes — debut author wins" },
      { slug: "no", name: "No — established author wins" },
    ],
    sourcePolicyEn: "Bungei Shunju official Akutagawa Prize announcement",
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting KIAI database seed...");
  console.log(`   Seeding ${DEMO_MARKETS.length} demo markets...\n`);

  let created = 0;
  let skipped = 0;

  for (const m of DEMO_MARKETS) {
    const existing = await db.market.findUnique({ where: { slug: m.slug } });

    if (existing) {
      console.log(`  ⏭  Skipping "${m.slug}" — already exists (${existing.lifecycle})`);
      skipped++;
      continue;
    }

    await db.$transaction(async (tx) => {
      const market = await tx.market.create({
        data: {
          slug: m.slug,
          titleEn: m.titleEn,
          titleJa: m.titleJa,
          subtitleEn: m.subtitleEn,
          subtitleJa: m.subtitleJa,
          category: m.category,
          categoryLabelEn: m.categoryLabelEn,
          categoryLabelJa: m.categoryLabelJa,
          lifecycle: "DRAFT",
          closeAt: m.closeAt,
          lmsrB: m.lmsrB,
          qYes: 0,
          qNo: 0,
          outcomes: {
            create: m.outcomes.map((o, i) => ({
              slug: o.slug,
              name: o.name,
              flag: o.flag,
              chance: Math.round(100 / m.outcomes.length),
              priceYes: 50,
              priceNo: 50,
              sortOrder: i,
            })),
          },
          compliancePolicy: {
            create: {
              blockedRegions: [],
              kycTierRequired: 0,
            },
          },
          resolution: {
            create: { status: "PENDING" },
          },
        },
      });

      await tx.chainDeployment.createMany({
        data: [
          {
            marketId: market.id,
            chain: Chain.BASE,
            collateral: CollateralAsset.USDC_BASE_SEPOLIA,
            deployStatus: "not_deployed",
          },
          {
            marketId: market.id,
            chain: Chain.SUI,
            collateral: CollateralAsset.USDC_SUI_TESTNET,
            deployStatus: "not_deployed",
          },
        ],
      });

      await tx.operatorAction.create({
        data: {
          operatorId: "op:seed-script",
          action: "create_market",
          marketId: market.id,
          details: { source: "prisma/seed.ts", slug: market.slug },
        },
      });
    });

    console.log(`  ✅ Created "${m.slug}" (${m.category})`);
    created++;
  }

  console.log(`\n🎯 Seed complete: ${created} created, ${skipped} skipped.`);
  console.log(
    "\nNext steps:\n" +
      "  1. Run the dev server: pnpm dev\n" +
      "  2. Set OPERATOR_SECRET in .env\n" +
      "  3. Use POST /api/admin/markets/[id] to transition markets to REVIEWED\n" +
      "  4. Use POST /api/admin/markets/[id]/deploy after Phase 4/5 contracts are deployed\n"
  );
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
