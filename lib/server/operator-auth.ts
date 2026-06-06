/**
 * Operator authentication for KIAI admin API routes.
 *
 * Phase 1: Simple bearer token using OPERATOR_SECRET env var.
 * The operator sends `Authorization: Bearer <OPERATOR_SECRET>` on every request.
 *
 * This is intentionally minimal for Phase 3 — no JWT, no session, no user model.
 * Production Phase will replace this with a proper auth layer (wallet-signed
 * challenges or a dedicated auth service) once the operator workflow is proven.
 *
 * Usage in route handlers:
 *   const auth = requireOperator(request);
 *   if (auth !== null) return auth;  // returns 401 if not authorised
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

/**
 * Returns null if the request is authorised.
 * Returns a 401 NextResponse if the request is not authorised.
 *
 * Call at the top of every /api/admin/* route handler.
 */
export function requireOperator(
  request: NextRequest
): NextResponse | null {
  const secret = process.env.OPERATOR_SECRET;

  if (!secret) {
    // OPERATOR_SECRET not set — block all admin access rather than open it up
    console.error(
      "[operator-auth] OPERATOR_SECRET env var is not set. " +
        "Admin routes are locked until it is configured."
    );
    return NextResponse.json(
      {
        error: "service_unavailable",
        message: "Operator auth is not configured.",
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token || token !== secret) {
    return NextResponse.json(
      { error: "unauthorized", message: "Invalid or missing operator token." },
      { status: 401 }
    );
  }

  return null; // authorised
}

/**
 * Extracts a safe operator ID from the request for audit logs.
 * Uses a hash prefix of the token — never logs the full secret.
 */
export function operatorId(request: NextRequest): string {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "unknown";
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 12);
  return `op:${digest}`;
}
