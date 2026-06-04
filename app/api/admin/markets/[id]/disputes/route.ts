/**
 * GET/POST /api/admin/markets/[id]/disputes
 *
 * Opens explicit dispute/manual-review records for source disagreement,
 * oracle challenge, evidence tampering, too-early proposals, and safety review.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  listResolutionDisputes,
  openResolutionDispute,
  OpenResolutionDisputeInputSchema,
} from "@/lib/domain/resolution-governance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  const { id } = await params;
  const disputes = await listResolutionDisputes(id);
  return NextResponse.json({ disputes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = OpenResolutionDisputeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const dispute = await openResolutionDispute(
      id,
      parsed.data,
      operatorId(request)
    );
    return NextResponse.json({ dispute }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown dispute error";
    console.error("[POST /api/admin/markets/[id]/disputes]", err);

    if (
      message.includes("resolution record not found") ||
      message.includes("before a dispute can be opened")
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
