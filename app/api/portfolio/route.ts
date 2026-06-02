/**
 * GET /api/portfolio?walletAddress=...
 *
 * Returns reconciled portfolio state for a wallet.
 * ONLY returns positions that have been reconciled from chain events.
 * Never returns optimistic UI state as final exposure.
 *
 * If an order is SUBMITTED_TO_CHAIN or INDEXING_PENDING, it appears in
 * pendingOrders, not in positions — because it is not yet final.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "validation_error", message: "walletAddress is required." },
      { status: 400 }
    );
  }

  try {
    // Reconciled positions (final — from indexed chain events)
    const positions = await db.userPosition.findMany({
      where: { userId: walletAddress },
      orderBy: { updatedAt: "desc" },
    });

    // Pending orders (not yet reconciled — honest pending state)
    const pendingOrders = await db.orderIntent.findMany({
      where: {
        walletAddress,
        status: {
          in: [
            "WALLET_PENDING",
            "SUBMITTED_TO_CHAIN",
            "CHAIN_CONFIRMED",
            "INDEXING_PENDING",
            "INDEXING_LAGGED",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Aggregate portfolio totals from reconciled positions only
    let totalValueUsd = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalClaimable = 0;

    for (const p of positions) {
      const posValue = Number(p.shares) * Number(p.currentPrice);
      totalValueUsd += posValue;
      totalRealizedPnl += Number(p.realizedPnlUsd);
      totalUnrealizedPnl += Number(p.unrealizedPnlUsd);
      totalClaimable += Number(p.claimableUsd);
    }

    return NextResponse.json({
      walletAddress,
      // Only reconciled state contributes to totals
      totalValueUsd,
      totalRealizedPnlUsd: totalRealizedPnl,
      totalUnrealizedPnlUsd: totalUnrealizedPnl,
      totalClaimableUsd: totalClaimable,
      positions: positions.map((p) => ({
        id: p.id,
        marketId: p.marketId,
        outcomeSlug: p.outcomeSlug,
        chain: p.chain,
        side: p.side,
        shares: Number(p.shares),
        avgEntry: Number(p.avgEntry),
        currentPrice: Number(p.currentPrice),
        realizedPnlUsd: Number(p.realizedPnlUsd),
        unrealizedPnlUsd: Number(p.unrealizedPnlUsd),
        claimableUsd: Number(p.claimableUsd),
        reconciledAt: p.reconciledAt?.toISOString() ?? null,
      })),
      // Honest pending state — not included in totals
      pendingOrders: pendingOrders.map((o) => ({
        id: o.id,
        status: o.status,
        chain: o.chain,
        side: o.side,
        amountUsd: Number(o.amountUsd),
        txHash: o.txHash,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/portfolio]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch portfolio." },
      { status: 500 }
    );
  }
}
