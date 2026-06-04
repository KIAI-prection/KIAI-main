/**
 * Server-side market data adapter.
 * Used by server components (page.tsx files) to fetch real market data from Neon.
 * Bypasses HTTP — calls Prisma directly for better performance in server components.
 *
 * Returns the same UIMarket shape as lib/mock-data.ts so components
 * don't need any changes.
 */

import { db } from "@/lib/server/db";
import { marketToUI, type UIMarket } from "@/lib/domain/market-service";

// Lifecycle states visible to the public
const PUBLIC_LIFECYCLES = ["LIVE", "REVIEWED", "DEPLOY_PENDING"] as const;

// ---------------------------------------------------------------------------
// Fetch all public markets (equivalent to getTrendingMarkets / mockMarkets)
// ---------------------------------------------------------------------------

export async function getPublicMarkets(
  category?: string
): Promise<UIMarket[]> {
  const markets = await db.market.findMany({
    where: {
      lifecycle: { in: [...PUBLIC_LIFECYCLES] as never[] },
      ...(category ? { category } : {}),
    },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      chartPoints: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { openAt: "desc" },
  });

  return markets.map(marketToUI);
}

// ---------------------------------------------------------------------------
// Fetch trending markets (highest volume, live only)
// ---------------------------------------------------------------------------

export async function getTrendingMarkets(): Promise<UIMarket[]> {
  const markets = await db.market.findMany({
    where: { lifecycle: "LIVE" },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      chartPoints: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { volumeUsd: "desc" },
    take: 10,
  });

  // Fall back to REVIEWED if no LIVE markets yet
  if (markets.length === 0) {
    const reviewed = await db.market.findMany({
      where: {
        lifecycle: { in: ["REVIEWED", "LIVE"] as never[] },
      },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        chartPoints: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return reviewed.map(marketToUI);
  }

  return markets.map(marketToUI);
}

// ---------------------------------------------------------------------------
// Fetch market by slug (for detail page)
// ---------------------------------------------------------------------------

export async function getMarketBySlug(
  slug: string
): Promise<UIMarket | null> {
  const market = await db.market.findUnique({
    where: { slug },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      chartPoints: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!market) return null;
  if (!PUBLIC_LIFECYCLES.includes(market.lifecycle as never)) return null;

  return marketToUI(market);
}

// ---------------------------------------------------------------------------
// Fetch market by ID (legacy — used by market-detail page.tsx via [id] route)
// The route uses [id] which could be either the CUID or slug.
// Try slug first, then ID.
// ---------------------------------------------------------------------------

export async function getMarketByIdOrSlug(
  idOrSlug: string
): Promise<UIMarket | null> {
  // Try slug first
  const bySlug = await getMarketBySlug(idOrSlug);
  if (bySlug) return bySlug;

  // Fall back to CUID lookup
  const market = await db.market.findUnique({
    where: { id: idOrSlug },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      chartPoints: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!market) return null;
  if (!PUBLIC_LIFECYCLES.includes(market.lifecycle as never)) return null;

  return marketToUI(market);
}

// ---------------------------------------------------------------------------
// Fetch markets by category
// ---------------------------------------------------------------------------

export async function getMarketsByCategory(
  category: string
): Promise<UIMarket[]> {
  return getPublicMarkets(category);
}

// ---------------------------------------------------------------------------
// Live markets only
// ---------------------------------------------------------------------------

export async function getLiveMarkets(): Promise<UIMarket[]> {
  const markets = await db.market.findMany({
    where: { lifecycle: "LIVE" },
    include: {
      outcomes: { orderBy: { sortOrder: "asc" } },
      chartPoints: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { volumeUsd: "desc" },
  });

  return markets.map(marketToUI);
}
