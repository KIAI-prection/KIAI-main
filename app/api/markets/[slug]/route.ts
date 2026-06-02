/**
 * GET /api/markets/[slug]
 * Returns a single market with chain deployment state, compliance summary,
 * and resolution state. This is what the trade ticket and market detail page consume.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { marketToUI } from "@/lib/domain/market-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const market = await db.market.findUnique({
      where: { slug },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        chartPoints: { orderBy: { sortOrder: "asc" } },
        chainDeployments: true,
        compliancePolicy: true,
        resolution: true,
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    const base = marketToUI(market);

    // Attach chain availability and deployment state
    const chains = market.chainDeployments.map((d) => ({
      chain: d.chain,
      collateral: d.collateral,
      deployStatus: d.deployStatus,
      contractAddress: d.contractAddress,
      liquidityUsd: Number(d.liquidityUsd),
      available: d.deployStatus === "deployed" && market.lifecycle === "LIVE",
    }));

    // Compliance summary (public-safe version — no internal block reasons)
    const compliance = market.compliancePolicy
      ? {
          allowedRegions: market.compliancePolicy.allowedRegions,
          blockedRegions: market.compliancePolicy.blockedRegions,
          kycRequired: market.compliancePolicy.kycTierRequired > 0,
          legalNotesEn: market.compliancePolicy.legalNotesEn,
        }
      : null;

    // Resolution summary
    const resolution = market.resolution
      ? {
          status: market.resolution.status,
          proposedOutcome: market.resolution.proposedOutcome,
          finalOutcome: market.resolution.finalOutcome,
          disputeDeadline: market.resolution.disputeDeadline,
        }
      : null;

    return NextResponse.json({
      market: {
        ...base,
        lifecycle: market.lifecycle,
        closeAt: market.closeAt,
        openAt: market.openAt,
        chains,
        compliance,
        resolution,
        lmsrB: market.lmsrB,
        totalLiquidityUsd: Number(market.totalLiquidityUsd),
      },
    });
  } catch (error) {
    console.error("[GET /api/markets/[slug]]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch market." },
      { status: 500 }
    );
  }
}
