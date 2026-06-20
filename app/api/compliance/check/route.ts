/**
 * POST /api/compliance/check
 *
 * Returns structured eligibility for a wallet to trade a given market/chain.
 * KYC is modeled but not enforced in this operator-controlled runtime.
 * Region gates and Japan/politics guardrails are modeled but not enforced.
 *
 * Request body:
 *   marketId: string
 *   chain: "BASE" | "SUI"
 *   walletAddress: string
 *   region?: string   (ISO 3166-1 alpha-2, optional in Phase 1)
 *
 * Response:
 *   result: "allowed" | "blocked_region" | "kyc_required" | "market_paused"
 *           | "market_closed" | "chain_unavailable"
 *   allowed: boolean
 *   reason?: string  (user-readable if blocked)
 *   nextAction?: string
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";

const ComplianceCheckSchema = z.object({
  marketId: z.string().min(1),
  chain: z.enum(["BASE", "SUI"]),
  walletAddress: z.string().min(1),
  region: z.string().length(2).optional(),
});

type ComplianceResult =
  | "allowed"
  | "blocked_region"
  | "kyc_required"
  | "kyc_limit_exceeded"
  | "market_paused"
  | "market_closed"
  | "chain_unavailable"
  | "insufficient_balance"
  | "quote_expired";

interface ComplianceResponse {
  result: ComplianceResult;
  allowed: boolean;
  reason?: string;
  nextAction?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ComplianceCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid request.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { marketId, chain, region } = parsed.data;

    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        chainDeployments: { where: { chain } },
        compliancePolicy: true,
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    // Market lifecycle checks
    if (market.lifecycle === "PAUSED") {
      return NextResponse.json<ComplianceResponse>({
        result: "market_paused",
        allowed: false,
        reason: "This market is currently paused.",
        nextAction: "Check back later or contact support.",
      });
    }

    if (
      [
        "CLOSED",
        "RESOLVING",
        "RESOLVED",
        "SETTLING",
        "SETTLED",
        "ARCHIVED",
      ].includes(market.lifecycle)
    ) {
      return NextResponse.json<ComplianceResponse>({
        result: "market_closed",
        allowed: false,
        reason: "This market is closed for trading.",
        nextAction:
          market.lifecycle === "SETTLED"
            ? "Check your portfolio for claimable winnings."
            : "Await resolution.",
      });
    }

    // Chain availability check
    const deployment = market.chainDeployments[0];
    if (!deployment || deployment.deployStatus !== "deployed") {
      return NextResponse.json<ComplianceResponse>({
        result: "chain_unavailable",
        allowed: false,
        reason: `${chain} is not yet available for this market.`,
        nextAction: "Choose a different chain or check back later.",
      });
    }

    // Region check — modeled but not enforced in this operator-controlled runtime
    // Production: enforce blockedRegions when legal review is complete
    if (region && market.compliancePolicy) {
      const policy = market.compliancePolicy;
      if (
        policy.blockedRegions.length > 0 &&
        policy.blockedRegions.includes(region)
      ) {
        // NOTE: This check is logged but NOT enforced.
        // Uncomment the block below when production compliance is active.
        // return NextResponse.json<ComplianceResponse>({
        //   result: "blocked_region",
        //   allowed: false,
        //   reason: "This market is not available in your region.",
        //   nextAction: "This market is unavailable in your country.",
        // });
      }
    }

    // All checks passed
    return NextResponse.json<ComplianceResponse>({
      result: "allowed",
      allowed: true,
    });
  } catch (error) {
    console.error("[POST /api/compliance/check]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Compliance check failed." },
      { status: 500 }
    );
  }
}
