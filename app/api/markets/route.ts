/**
 * GET /api/markets
 * Returns the list of live and upcoming markets for the public UI.
 * Only LIVE markets (and optionally REVIEWED/upcoming) are returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { marketToUI } from "@/lib/domain/market-service";
import { DEMO_MARKET_SLUGS } from "@/lib/market-catalogue/demo-markets";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.trim();
    const previewCatalogue = searchParams.get("preview") === "catalogue";
    const lifecycles = ["LIVE", "REVIEWED", "DEPLOY_PENDING"];

    const markets = await db.market.findMany({
      where: {
        ...(previewCatalogue
          ? { slug: { in: DEMO_MARKET_SLUGS } }
          : { lifecycle: { in: lifecycles as never[] } }),
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { titleEn: { contains: query, mode: "insensitive" } },
                { titleJa: { contains: query, mode: "insensitive" } },
                { subtitleEn: { contains: query, mode: "insensitive" } },
                { subtitleJa: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
                { categoryLabelEn: { contains: query, mode: "insensitive" } },
                { categoryLabelJa: { contains: query, mode: "insensitive" } },
                {
                  outcomes: {
                    some: {
                      name: { contains: query, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        chartPoints: { orderBy: { sortOrder: "asc" } },
        chainDeployments: true,
      },
      orderBy: { openAt: "desc" },
    });

    return NextResponse.json({
      markets: markets.map(marketToUI),
      total: markets.length,
    });
  } catch (error) {
    console.error("[GET /api/markets]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch markets." },
      { status: 500 }
    );
  }
}
