/**
 * GET /api/admin/evidence-archive/[hash]
 *
 * Returns an operator-authenticated archived raw evidence artifact keyed by the
 * same payload hash stored on EvidenceSnapshot.
 */

import { NextRequest, NextResponse } from "next/server";
import { readEvidenceArchive } from "@/lib/server/evidence-archive";
import { requireOperator } from "@/lib/server/operator-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { hash } = await params;
    const archive = await readEvidenceArchive(hash);

    return NextResponse.json(archive.artifact, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown evidence archive error";

    if (message.includes("32-byte hex")) {
      return NextResponse.json(
        { error: "validation_error", message },
        { status: 400 }
      );
    }

    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "not_found", message: "Evidence archive artifact not found." },
        { status: 404 }
      );
    }

    console.error("[GET /api/admin/evidence-archive/[hash]]", err);
    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
