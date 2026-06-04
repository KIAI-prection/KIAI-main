/**
 * GET/PUT /api/admin/markets/[id]/resolution-policy
 *
 * Stores the pre-trade resolution contract users rely on before trading:
 * source priority, edge cases, resolver mode, payout mode, and refund policy.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import { MarketResolutionPolicySchema } from "@/lib/domain/market-resolution-policy";
import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  const { id } = await params;
  const market = await db.market.findUnique({
    where: { id },
    select: { id: true, resolutionPolicy: true },
  });

  if (!market) {
    return NextResponse.json(
      { error: "not_found", message: "Market not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ resolutionPolicy: market.resolutionPolicy });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = MarketResolutionPolicySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const market = await db.market.update({
      where: { id },
      data: { resolutionPolicy: toPrismaJson(parsed.data) },
      select: { id: true, resolutionPolicy: true },
    });

    await db.operatorAction.create({
      data: {
        operatorId: operatorId(request),
        action: "market_resolution_policy_updated",
        marketId: id,
        details: {
          ruleVersion: parsed.data.resolutionRule.ruleVersion,
          resolverMode: parsed.data.resolverMode,
          payoutMode: parsed.data.payoutMode,
          refundPolicy: parsed.data.refundPolicy,
        },
      },
    });

    return NextResponse.json({ resolutionPolicy: market.resolutionPolicy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown policy error";
    console.error("[PUT /api/admin/markets/[id]/resolution-policy]", err);

    if (message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
