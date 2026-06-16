/**
 * KIAI Database Seed Script
 *
 * Creates or syncs the 8 first demo markets from PLAN.md Phase 9.
 * New markets start in DRAFT state — operators must review and deploy them.
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
import {
  DEMO_MARKETS,
  SUPERSEDED_DEMO_MARKET_SLUGS,
} from "@/lib/market-catalogue/demo-markets";
import { toPrismaJson } from "@/lib/server/json";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting KIAI database seed...");
  console.log(`   Seeding ${DEMO_MARKETS.length} demo markets...\n`);

  let created = 0;
  let synced = 0;
  let archived = 0;
  let skippedArchive = 0;

  for (const m of DEMO_MARKETS) {
    const existing = await db.market.findUnique({
      where: { slug: m.slug },
      select: { id: true, lifecycle: true },
    });

    const market = existing
      ? await db.market.update({
          where: { id: existing.id },
          data: {
            titleEn: m.titleEn,
            titleJa: m.titleJa,
            subtitleEn: m.subtitleEn,
            subtitleJa: m.subtitleJa,
            category: m.category,
            categoryLabelEn: m.categoryLabelEn,
            categoryLabelJa: m.categoryLabelJa,
            closeAt: m.closeAt,
            resolutionPolicy: toPrismaJson(m.resolutionPolicy),
            lmsrB: m.lmsrB,
          },
        })
      : await db.market.create({
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
            resolutionPolicy: toPrismaJson(m.resolutionPolicy),
            lmsrB: m.lmsrB,
            qYes: 0,
            qNo: 0,
          },
        });

    for (const [i, outcome] of m.outcomes.entries()) {
      await db.outcome.upsert({
        where: {
          marketId_slug: {
            marketId: market.id,
            slug: outcome.slug,
          },
        },
        update: {
          name: outcome.name,
          flag: outcome.flag,
          sortOrder: i,
        },
        create: {
          marketId: market.id,
          slug: outcome.slug,
          name: outcome.name,
          flag: outcome.flag,
          chance: Math.round(100 / m.outcomes.length),
          priceYes: 50,
          priceNo: 50,
          sortOrder: i,
        },
      });
    }

    await db.compliancePolicy.upsert({
      where: { marketId: market.id },
      update: {
        blockedRegions: [],
        kycTierRequired: 0,
      },
      create: {
        marketId: market.id,
        blockedRegions: [],
        kycTierRequired: 0,
      },
    });

    await db.resolution.upsert({
      where: { marketId: market.id },
      update: {},
      create: { marketId: market.id, status: "PENDING" },
    });

    for (const deployment of m.chainDeploymentPlan) {
      await db.chainDeployment.upsert({
        where: {
          marketId_chain: {
            marketId: market.id,
            chain: Chain[deployment.chain],
          },
        },
        update: {
          collateral: CollateralAsset[deployment.collateral],
        },
        create: {
          marketId: market.id,
          chain: Chain[deployment.chain],
          collateral: CollateralAsset[deployment.collateral],
          deployStatus: deployment.deployStatus,
        },
      });
    }

    await db.operatorAction.create({
      data: {
        operatorId: "op:seed-script",
        action: existing ? "sync_demo_market" : "create_market",
        marketId: market.id,
        details: {
          source: "prisma/seed.ts",
          slug: market.slug,
          sourcePolicyEn: m.sourcePolicyEn,
          resolutionRuleVersion: m.resolutionPolicy.resolutionRule.ruleVersion,
        },
      },
    });

    const result = existing ? "synced" : "created";

    if (result === "created") {
      console.log(`  ✅ Created "${m.slug}" (${m.category})`);
      created++;
    } else {
      console.log(`  🔁 Synced "${m.slug}" (${m.category})`);
      synced++;
    }
  }

  for (const slug of SUPERSEDED_DEMO_MARKET_SLUGS) {
    const market = await db.market.findUnique({
      where: { slug },
      select: {
        id: true,
        lifecycle: true,
        _count: { select: { orderIntents: true } },
      },
    });

    if (!market) continue;

    const canArchive =
      ["DRAFT", "REVIEWED"].includes(market.lifecycle) &&
      market._count.orderIntents === 0;

    if (!canArchive) {
      console.log(
        `  ⚠️  Kept superseded demo "${slug}" (${market.lifecycle}, ${market._count.orderIntents} orders)`
      );
      skippedArchive++;
      continue;
    }

    await db.market.update({
      where: { id: market.id },
      data: {
        lifecycle: "ARCHIVED",
        statusInfoEn: "Superseded by Phase 9 catalogue refresh on 2026-06-05.",
        statusInfoJa: "Superseded by Phase 9 catalogue refresh on 2026-06-05.",
      },
    });

    await db.operatorAction.create({
      data: {
        operatorId: "op:seed-script",
        action: "archive_superseded_demo_market",
        marketId: market.id,
        details: {
          source: "prisma/seed.ts",
          slug,
          previousLifecycle: market.lifecycle,
          reason: "phase9_catalogue_refresh",
        },
      },
    });

    console.log(`  🗄️  Archived superseded demo "${slug}"`);
    archived++;
  }

  console.log(
    `\n🎯 Seed complete: ${created} created, ${synced} synced, ${archived} archived, ${skippedArchive} archive skipped.`
  );
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
