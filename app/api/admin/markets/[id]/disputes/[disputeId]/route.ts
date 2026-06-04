/**
 * PATCH /api/admin/markets/[id]/disputes/[disputeId]
 *
 * Closes an explicit resolution dispute after operator adjudication.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  ResolveResolutionDisputeInputSchema,
  resolveResolutionDispute,
} from "@/lib/domain/resolution-governance";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id, disputeId } = await params;
    const body = await request.json();
    const parsed = ResolveResolutionDisputeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const dispute = await resolveResolutionDispute(
      id,
      disputeId,
      parsed.data,
      operatorId(request)
    );
    return NextResponse.json({ dispute });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown dispute error";
    console.error("[PATCH /api/admin/markets/[id]/disputes/[disputeId]]", err);

    if (
      message.includes("not found") ||
      message.includes("already closed")
    ) {
      return NextResponse.json(
        { error: "invalid_state", message },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
