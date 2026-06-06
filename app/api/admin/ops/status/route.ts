/**
 * GET /api/admin/ops/status
 *
 * Operator-only beta readiness and operations status.
 * This route is read-only and intentionally returns configuration presence,
 * health counts, and issue codes without exposing secret values.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/operator-auth";
import { getOpsStatus } from "@/lib/server/ops-status";

export async function GET(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const status = await getOpsStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error("[GET /api/admin/ops/status]", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "Failed to build operations status.",
      },
      { status: 500 }
    );
  }
}
