/**
 * GET/POST /api/admin/markets/[id]/evidence
 *
 * Stores durable evidence snapshots for official sources, API payloads,
 * screenshots, archives, and operator notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  createEvidenceSnapshot,
  EvidenceSnapshotInputSchema,
  listEvidenceSnapshots,
} from "@/lib/domain/resolution-governance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  const { id } = await params;
  const snapshots = await listEvidenceSnapshots(id);
  return NextResponse.json({ evidenceSnapshots: snapshots });
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
    const parsed = EvidenceSnapshotInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const snapshot = await createEvidenceSnapshot(id, parsed.data, operatorId(request));
    return NextResponse.json({ evidenceSnapshot: snapshot }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown evidence error";
    console.error("[POST /api/admin/markets/[id]/evidence]", err);

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
