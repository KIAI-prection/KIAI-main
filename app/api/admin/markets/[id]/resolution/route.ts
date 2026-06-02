/**
 * POST /api/admin/markets/[id]/resolution
 * Propose or finalize a market outcome.
 *
 * Body:
 *   action: "propose" | "finalize"
 *   proposedOutcome?: string    — slug or name of the winning outcome
 *   finalOutcome?: string       — slug or name (finalize only)
 *   sourceSnapshot?: object     — evidence object: { url, screenshot, description, verifiedAt }
 *
 * Workflow:
 *   1. Operator closes market (lifecycle: CLOSED) via PATCH /api/admin/markets/[id]
 *   2. Operator attaches official source snapshot and proposes outcome
 *   3. 48-hour dispute window opens (modeled — not enforced in Phase 1)
 *   4. Operator finalizes outcome → market moves to RESOLVED
 *   5. Settlement jobs run (Phase 8)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  proposeResolution,
  finalizeResolution,
} from "@/lib/domain/operator-service";

const ResolutionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("propose"),
    proposedOutcome: z.string().min(1).max(200),
    sourceSnapshot: z.record(z.unknown()).default({}),
  }),
  z.object({
    action: z.literal("finalize"),
    finalOutcome: z.string().min(1).max(200),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = ResolutionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const opId = operatorId(request);

    if (parsed.data.action === "propose") {
      await proposeResolution(
        id,
        parsed.data.proposedOutcome,
        parsed.data.sourceSnapshot,
        opId
      );
      return NextResponse.json({
        message: "Resolution proposed. 48-hour dispute window started.",
        proposedOutcome: parsed.data.proposedOutcome,
      });
    } else {
      await finalizeResolution(id, parsed.data.finalOutcome, opId);
      return NextResponse.json({
        message: "Outcome finalized. Market is now RESOLVED.",
        finalOutcome: parsed.data.finalOutcome,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets/[id]/resolution]", err);

    if (
      message.includes("must be") ||
      message.includes("Cannot transition")
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
