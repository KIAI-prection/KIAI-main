/**
 * POST /api/admin/markets/[id]/deploy/result
 *
 * Called by deployment scripts (Phase 4 Foundry scripts, Phase 5 Sui CLI)
 * to report the result of a chain deployment.
 *
 * On success, records the contract address and if both chains are deployed,
 * automatically transitions the market to LIVE.
 *
 * Body: {
 *   chain: "BASE" | "SUI",
 *   success: boolean,
 *   contractAddress?: string,   — Base: deployed contract address
 *   poolAddress?: string,       — Sui: vault object ID
 *   txHash?: string,            — deployment transaction hash/digest
 *   failureReason?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Chain } from "@prisma/client";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import { recordDeployResult } from "@/lib/domain/operator-service";

const DeployResultSchema = z.object({
  chain: z.enum(["BASE", "SUI"]),
  success: z.boolean(),
  contractAddress: z.string().optional(),
  poolAddress: z.string().optional(),
  txHash: z.string().optional(),
  failureReason: z.string().optional(),
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
    const parsed = DeployResultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { chain, success, contractAddress, poolAddress, failureReason, txHash } =
      parsed.data;
    const opId = operatorId(request);

    await recordDeployResult(
      id,
      chain as Chain,
      { success, contractAddress, poolAddress, failureReason },
      opId
    );

    return NextResponse.json({
      message: success
        ? `${chain} deployment recorded. Market may now be LIVE if all chains deployed.`
        : `${chain} deployment failure recorded.`,
      chain,
      success,
      contractAddress,
      txHash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets/[id]/deploy/result]", err);
    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
