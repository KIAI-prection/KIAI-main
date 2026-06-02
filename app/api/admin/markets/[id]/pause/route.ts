/**
 * POST /api/admin/markets/[id]/pause    — pause a live market
 * POST /api/admin/markets/[id]/unpause  — unpause (via same route with action field)
 *
 * Body: { action: "pause" | "unpause", reason: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import { pauseMarket, unpauseMarket } from "@/lib/domain/operator-service";

const PauseSchema = z.object({
  action: z.enum(["pause", "unpause"]),
  reason: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PauseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;
    const opId = operatorId(request);

    if (action === "pause") {
      await pauseMarket(id, opId, reason);
    } else {
      await unpauseMarket(id, opId, reason);
    }

    return NextResponse.json({
      message: `Market ${action}d successfully.`,
      action,
      marketId: id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets/[id]/pause]", err);

    if (message.includes("Cannot transition")) {
      return NextResponse.json(
        { error: "invalid_transition", message },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
