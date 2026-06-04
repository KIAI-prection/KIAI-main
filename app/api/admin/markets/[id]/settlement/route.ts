/**
 * GET/POST /api/admin/markets/[id]/settlement
 *
 * Durable Phase 8 settlement runner.
 *
 * GET lists per-chain settlement jobs.
 * POST action="prepare" creates idempotent jobs from the finalized settlement instruction.
 * POST action="run" prepares jobs and runs pending/retryable jobs for this market.
 * POST action="run_job" runs one explicit job ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator } from "@/lib/server/operator-auth";
import {
  ensureSettlementJobs,
  listSettlementJobs,
  runSettlementForMarket,
  runSettlementJob,
} from "@/lib/server/settlement";

const SettlementRequestSchema = z
  .object({
    action: z.enum(["prepare", "run", "run_job"]).default("prepare"),
    jobId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "run_job" && !value.jobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jobId"],
        message: "jobId is required when action is run_job.",
      });
    }
  });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  const { id } = await params;
  const jobs = await listSettlementJobs(id);
  return NextResponse.json({ jobs });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = SettlementRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.action === "prepare") {
      const jobs = await ensureSettlementJobs(id);
      return NextResponse.json({ jobs });
    }

    if (parsed.data.action === "run_job") {
      const result = await runSettlementJob(parsed.data.jobId!, id);
      return NextResponse.json({ result });
    }

    const results = await runSettlementForMarket(id);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown settlement error";
    console.error("[POST /api/admin/markets/[id]/settlement]", err);

    if (
      message.includes("must be FINAL") ||
      message.includes("not found") ||
      message.includes("settlement instruction")
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
