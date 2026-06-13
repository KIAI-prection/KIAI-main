/**
 * POST /api/admin/markets/[id]/source-adapters/api-football
 *
 * Fetches API-FOOTBALL fixture data and normalizes it into KIAI resolution
 * evidence for operator review. The adapter does not bypass source certainty,
 * proposal, dispute-window, or finalization rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator } from "@/lib/server/operator-auth";
import { db } from "@/lib/server/db";
import { fetchApiFootballFixtureEvidence } from "@/lib/domain/source-adapters/api-football";

const ApiFootballRouteRequestSchema = z
  .object({
    fixtureId: z.number().int().positive(),
    sourceUrl: z.string().url().optional(),
    fetchedAt: z.string().datetime().optional(),
    sourceCertainty: z
      .enum([
        "provisional",
        "official_confirmed",
        "oracle_final",
        "manual_adjudicated",
      ])
      .default("provisional"),
    marketQuestion: z.string().min(10).max(1_000).optional(),
    expectedHomeTeam: z.string().min(1).max(160).optional(),
    expectedAwayTeam: z.string().min(1).max(160).optional(),
    expectedLeagueName: z.string().min(1).max(160).optional(),
    outcomeSlugMap: z
      .object({
        home: z.string().min(1).max(200).optional(),
        away: z.string().min(1).max(200).optional(),
        draw: z.string().min(1).max(200).optional(),
      })
      .strict()
      .default({}),
    notes: z.string().max(1_000).optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const apiKey = process.env.API_FOOTBALL_API_KEY ?? process.env.SPORTS_DATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "sports_api_not_configured",
          message:
            "Set API_FOOTBALL_API_KEY before using the API-FOOTBALL source adapter.",
        },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = ApiFootballRouteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const market = await db.market.findUnique({
      where: { id },
      select: {
        id: true,
        titleEn: true,
        outcomes: { select: { slug: true, name: true } },
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    const result = await fetchApiFootballFixtureEvidence({
      ...parsed.data,
      apiKey,
      apiBaseUrl: process.env.API_FOOTBALL_BASE_URL,
    });

    const proposedOutcome = result.suggestedResolution.proposedOutcome;
    if (proposedOutcome && !isKnownOutcome(proposedOutcome, market.outcomes)) {
      return NextResponse.json(
        {
          error: "invalid_outcome",
          message:
            'Adapter proposed outcome "' +
            proposedOutcome +
            '", but it is not one of this market\'s outcome slugs.',
          validOutcomes: market.outcomes,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      market: { id: market.id, titleEn: market.titleEn },
      ...result,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown API-FOOTBALL adapter error";
    console.error(
      "[POST /api/admin/markets/[id]/source-adapters/api-football]",
      err
    );

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}

function isKnownOutcome(
  slug: string,
  outcomes: Array<{ slug: string; name: string }>
) {
  return outcomes.some((outcome) => outcome.slug === slug);
}
