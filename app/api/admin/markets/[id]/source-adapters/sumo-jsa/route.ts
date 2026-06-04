/**
 * POST /api/admin/markets/[id]/source-adapters/sumo-jsa
 *
 * Builds a structured resolution evidence payload from an operator-reviewed
 * Nihon Sumo Kyokai official-source observation.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/operator-auth";
import { db } from "@/lib/server/db";
import {
  buildSumoJsaEvidence,
  SumoJsaObservationSchema,
  suggestedSettlementForJsaStatus,
} from "@/lib/domain/source-adapters/sumo-jsa";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = SumoJsaObservationSchema.safeParse(body);

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

    const observedOutcome = parsed.data.observedOutcomeSlug ?? parsed.data.observedOutcome;
    const normalizedOutcome = observedOutcome
      ? normalizeOutcome(observedOutcome, market.outcomes)
      : null;

    const sourceSnapshot = buildSumoJsaEvidence({
      ...parsed.data,
      observedOutcomeSlug: normalizedOutcome ?? undefined,
    });
    const settlement = suggestedSettlementForJsaStatus(
      parsed.data.providerEventStatus
    );

    return NextResponse.json({
      market: { id: market.id, titleEn: market.titleEn },
      sourceSnapshot,
      suggestedResolution: {
        action: "propose",
        proposedOutcome: normalizedOutcome,
        settlement,
        sourceSnapshot,
      },
      canProposeOutcome: Boolean(normalizedOutcome),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown source adapter error";
    console.error("[POST /api/admin/markets/[id]/source-adapters/sumo-jsa]", err);

    if (message.includes("Invalid adapter outcome")) {
      return NextResponse.json(
        { error: "invalid_outcome", message },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}

function normalizeOutcome(
  input: string,
  outcomes: Array<{ slug: string; name: string }>
) {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const match = outcomes.find(
    (outcome) =>
      outcome.slug === trimmed ||
      outcome.slug.toLowerCase() === lower ||
      outcome.name.toLowerCase() === lower
  );

  if (!match) {
    const valid = outcomes
      .map((outcome) => `${outcome.slug} (${outcome.name})`)
      .join(", ");
    throw new Error(
      `Invalid adapter outcome "${input}". Valid outcomes: ${valid}`
    );
  }

  return match.slug;
}
