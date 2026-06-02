/**
 * POST /api/admin/markets/[id]/deploy
 * Triggers chain deployment for a specific rail (BASE or SUI).
 *
 * In Phase 3, this marks the deployment as "deploy_pending" in the database.
 * The actual contract deployment (Foundry for Base, Sui CLI for Sui) happens
 * in Phase 4/5 and reports back via PATCH /api/admin/markets/[id]/deploy/result.
 *
 * Body: { chain: "BASE" | "SUI" }
 *
 * POST /api/admin/markets/[id]/deploy/result
 * Called by deployment scripts to record the result.
 * Body: { chain, success, contractAddress?, poolAddress?, failureReason? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Chain } from "@prisma/client";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  markDeployPending,
  recordDeployResult,
} from "@/lib/domain/operator-service";

const DeploySchema = z.object({
  chain: z.enum(["BASE", "SUI"]),
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
    const parsed = DeploySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const opId = operatorId(request);
    await markDeployPending(id, parsed.data.chain as Chain, opId);

    return NextResponse.json({
      message: `${parsed.data.chain} deployment queued for market ${id}.`,
      status: "deploy_pending",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets/[id]/deploy]", err);
    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
