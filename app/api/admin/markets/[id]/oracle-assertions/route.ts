/**
 * GET/POST /api/admin/markets/[id]/oracle-assertions
 *
 * Records optional UMA/Chainlink/Reality/custom oracle assertion metadata.
 * These records do not replace KIAI's finalized settlement instruction.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  createOracleAssertion,
  listOracleAssertions,
  OracleAssertionInputSchema,
} from "@/lib/domain/resolution-governance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  const { id } = await params;
  const oracleAssertions = await listOracleAssertions(id);
  return NextResponse.json({ oracleAssertions });
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
    const parsed = OracleAssertionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const oracleAssertion = await createOracleAssertion(
      id,
      parsed.data,
      operatorId(request)
    );
    return NextResponse.json({ oracleAssertion }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown oracle error";
    console.error("[POST /api/admin/markets/[id]/oracle-assertions]", err);

    if (message.includes("resolution record not found")) {
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
