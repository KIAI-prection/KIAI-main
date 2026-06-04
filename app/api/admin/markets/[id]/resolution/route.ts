/**
 * POST /api/admin/markets/[id]/resolution
 * Propose or finalize a market outcome.
 *
 * Body:
 *   action: "propose" | "finalize"
 *   proposedOutcome?: string    — slug or name of the winning outcome
 *   finalOutcome?: string       — slug or name (required for winner-take-all)
 *   settlement?: object         — payout mode/vector/refund policy for split/refund/fractional cases
 *   sourceSnapshot: object      — structured evidence: rule summary, sources, edge cases, oracle snapshot
 *
 * Workflow:
 *   1. Operator closes market (lifecycle: CLOSED) via PATCH /api/admin/markets/[id]
 *   2. Operator attaches official source evidence and proposes outcome
 *   3. 48-hour dispute window opens
 *   4. Operator finalizes after the dispute window → market moves to RESOLVED
 *   5. Settlement jobs run (Phase 8)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  proposeResolution,
  finalizeResolution,
} from "@/lib/domain/operator-service";
import { ResolutionEvidenceSchema } from "@/lib/domain/resolution-evidence";
import { SettlementInstructionRequestSchema } from "@/lib/domain/resolution-policy";

const ProposeResolutionSchema = z.object({
    action: z.literal("propose"),
    proposedOutcome: z.string().min(1).max(200).nullish(),
    settlement: SettlementInstructionRequestSchema.optional(),
    sourceSnapshot: ResolutionEvidenceSchema,
}).superRefine((value, ctx) => {
  const payoutMode = value.settlement?.payoutMode ?? "winner_take_all";
  if (payoutMode === "winner_take_all" && !value.proposedOutcome) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["proposedOutcome"],
      message:
        "Winner-take-all resolution proposals require proposedOutcome.",
    });
  }
});

const FinalizeResolutionSchema = z
  .object({
    action: z.literal("finalize"),
    finalOutcome: z.string().min(1).max(200).optional(),
    settlement: SettlementInstructionRequestSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const payoutMode = value.settlement?.payoutMode ?? "winner_take_all";
    if (payoutMode === "winner_take_all" && !value.finalOutcome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalOutcome"],
        message: "Winner-take-all settlement requires finalOutcome.",
      });
    }
  });

const ResolutionSchema = z.union([
  ProposeResolutionSchema,
  FinalizeResolutionSchema,
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
      const resolution = await proposeResolution(
        id,
        {
          proposedOutcome: parsed.data.proposedOutcome,
          proposedSettlement: parsed.data.settlement,
        },
        parsed.data.sourceSnapshot,
        opId
      );
      return NextResponse.json({
        message: "Resolution proposed. 48-hour dispute window started.",
        proposedOutcome: resolution.proposedOutcome,
        proposedSettlement: parsed.data.settlement ?? null,
        disputeDeadline: resolution.disputeDeadline.toISOString(),
      });
    } else {
      const resolution = await finalizeResolution(
        id,
        {
          finalOutcome: parsed.data.finalOutcome,
          settlement: parsed.data.settlement,
        },
        opId
      );
      return NextResponse.json({
        message: "Outcome finalized. Market is now RESOLVED.",
        finalOutcome: resolution.finalOutcome,
        settlementInstruction: resolution.settlementInstruction,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets/[id]/resolution]", err);

    if (
      message.includes("must be") ||
      message.includes("Cannot transition") ||
      message.includes("Invalid resolution outcome") ||
      message.includes("Resolution dispute window") ||
      message.includes("Provisional evidence") ||
      message.includes("Settlement")
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
