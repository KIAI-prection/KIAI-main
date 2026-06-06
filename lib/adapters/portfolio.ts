/**
 * Server-side portfolio adapter.
 * Fetches reconciled position data from Neon for a given wallet address.
 * Returns only RECONCILED/PORTFOLIO_FINAL positions — never optimistic state.
 */

import { db } from "@/lib/server/db";
import type { Position } from "@/lib/mock-data";

export interface PortfolioData {
  totalValueUsd: number;
  totalPnlUsd: number;
  totalClaimableUsd: number;
  positions: Position[];
  pendingOrdersCount: number;
}

export async function getPortfolioForWallet(
  walletAddress: string
): Promise<PortfolioData> {
  const [positions, pendingOrders, markets] = await Promise.all([
    db.userPosition.findMany({
      where: { userId: walletAddress.toLowerCase() },
      orderBy: { updatedAt: "desc" },
    }),
    db.orderIntent.count({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        status: {
          in: [
            "SUBMITTED_TO_CHAIN",
            "CHAIN_CONFIRMED",
            "INDEXING_PENDING",
            "INDEXING_LAGGED",
          ],
        },
      },
    }),
    db.market.findMany({
      where: {
        id: {
          in: await db.userPosition
            .findMany({
              where: { userId: walletAddress.toLowerCase() },
              select: { marketId: true },
            })
            .then((p) => [...new Set(p.map((x) => x.marketId))]),
        },
      },
      select: {
        id: true,
        titleEn: true,
        titleJa: true,
        outcomes: { select: { slug: true, priceYes: true, priceNo: true } },
      },
    }),
  ]);

  const marketMap = new Map(markets.map((m) => [m.id, m]));

  let totalValueUsd = 0;
  let totalPnlUsd = 0;
  let totalClaimableUsd = 0;

  // Map to UI Position shape (compatible with mock-data.ts Position type)
  const uiPositions: Position[] = positions.map((p) => {
    const market = marketMap.get(p.marketId);
    const outcome = market?.outcomes.find((o) => o.slug === p.outcomeSlug);
    const currentPrice =
      (p.side === "yes" ? outcome?.priceYes : outcome?.priceNo) ??
      Number(p.currentPrice);

    const shares = Number(p.shares);
    const avgEntry = Number(p.avgEntry);
    const posValue = shares * (currentPrice / 100); // priceYes is 0-100
    const cost = shares * avgEntry;
    const pnl = posValue - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

    totalValueUsd += posValue;
    totalPnlUsd += pnl;
    totalClaimableUsd += Number(p.claimableUsd);

    return {
      id: p.id,
      marketId: p.marketId,
      marketTitle: {
        en: market?.titleEn ?? "Unknown Market",
        ja: market?.titleJa ?? "",
      },
      type: p.side as "yes" | "no",
      candidate: p.outcomeSlug,
      shares,
      avgPrice: avgEntry,
      currentPrice: currentPrice / 100,
      pnl,
      pnlPercent,
    };
  });

  return {
    totalValueUsd,
    totalPnlUsd,
    totalClaimableUsd,
    positions: uiPositions,
    pendingOrdersCount: pendingOrders,
  };
}
