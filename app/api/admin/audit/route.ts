/**
 * GET /api/admin/audit
 * Returns the operator audit log with pagination.
 *
 * Query params:
 *   marketId?: string    — filter by market
 *   action?: string      — filter by action type
 *   limit?: number       — max 100, default 50
 *   cursor?: string      — pagination cursor (createdAt ISO timestamp)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/operator-auth";
import { db } from "@/lib/server/db";

export async function GET(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const marketId = searchParams.get("marketId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10),
      100
    );
    const cursor = searchParams.get("cursor");

    const actions = await db.operatorAction.findMany({
      where: {
        ...(marketId ? { marketId } : {}),
        ...(action ? { action } : {}),
        ...(cursor
          ? { createdAt: { lt: new Date(cursor) } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to detect if there's a next page
    });

    const hasMore = actions.length > limit;
    const results = hasMore ? actions.slice(0, limit) : actions;
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      actions: results.map((a) => ({
        id: a.id,
        operatorId: a.operatorId,
        action: a.action,
        marketId: a.marketId,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
      hasMore,
      nextCursor,
    });
  } catch (err) {
    console.error("[GET /api/admin/audit]", err);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch audit log." },
      { status: 500 }
    );
  }
}
