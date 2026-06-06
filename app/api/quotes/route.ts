/**
 * POST /api/quotes
 * Creates a price quote for a given market/outcome/side/amount.
 *
 * Uses the LMSR backend AMM. Quotes expire in 60 seconds.
 * The frontend must refresh the quote before wallet submission.
 *
 * Request body:
 *   marketId: string
 *   outcomeId: string
 *   chain: "BASE" | "SUI"
 *   side: "yes" | "no"
 *   amountUsd: number (USD amount the user wants to spend)
 *   walletAddress?: string
 *
 * Response:
 *   quote: { id, status, pricePerShare, sharesOut, totalCostUsd, feesUsd,
 *            yesProb, noProb, expiresAt, chain, collateral }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { lmsrQuote, lmsrPrices } from "@/lib/domain/market-service";

const QuoteRequestSchema = z.object({
  marketId: z.string().min(1),
  outcomeId: z.string().min(1),
  chain: z.enum(["BASE", "SUI"]),
  side: z.enum(["yes", "no"]),
  amountUsd: z.number().positive().max(100_000),
  walletAddress: z.string().optional(),
});

const QUOTE_TTL_SECONDS = 60;
// Protocol fee: 0% in Phase 1 (modeled for future)
const FEE_RATE = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = QuoteRequestSchema.safeParse(body);

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

    const { marketId, outcomeId, chain, side, amountUsd, walletAddress } =
      parsed.data;

    // Load market with its current LMSR state
    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        outcomes: true,
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

    if (market.lifecycle !== "LIVE") {
      return NextResponse.json(
        {
          error: "market_not_live",
          message: `Market is ${market.lifecycle.toLowerCase()}, not live.`,
        },
        { status: 422 }
      );
    }

    const outcome = market.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
      return NextResponse.json(
        { error: "not_found", message: "Outcome not found." },
        { status: 404 }
      );
    }

    const deployment = market.chainDeployments[0];
    if (!deployment || deployment.deployStatus !== "deployed") {
      return NextResponse.json(
        {
          error: "chain_unavailable",
          message: `${chain} chain is not yet deployed for this market.`,
        },
        { status: 422 }
      );
    }

    // Compute LMSR quote
    const lmsrState = {
      b: market.lmsrB,
      qYes: market.qYes,
      qNo: market.qNo,
    };

    const currentPrices = lmsrPrices(lmsrState);
    let quote;

    try {
      quote = lmsrQuote(lmsrState, side, amountUsd);
    } catch {
      return NextResponse.json(
        {
          error: "quote_failed",
          message: "Unable to compute quote for the given amount.",
        },
        { status: 422 }
      );
    }

    const feesUsd = amountUsd * FEE_RATE;
    const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000);

    // Persist the quote
    const savedQuote = await db.quote.create({
      data: {
        marketId,
        outcomeId,
        chain,
        side,
        amountUsd,
        pricePerShare: quote.pricePerShare,
        sharesOut: quote.sharesOut,
        totalCostUsd: quote.totalCostUsd,
        feesUsd,
        yesProb: Math.round(currentPrices.priceYes * 100),
        noProb: Math.round(currentPrices.priceNo * 100),
        status: "ready",
        expiresAt,
        walletAddress,
      },
    });

    return NextResponse.json({
      quote: {
        id: savedQuote.id,
        status: "ready",
        chain,
        collateral: deployment.collateral,
        marketId,
        outcomeId,
        side,
        amountUsd: Number(savedQuote.amountUsd),
        pricePerShare: Number(savedQuote.pricePerShare),
        sharesOut: Number(savedQuote.sharesOut),
        totalCostUsd: Number(savedQuote.totalCostUsd),
        feesUsd: Number(savedQuote.feesUsd),
        // Probabilities at quote time (snapshot)
        yesProb: savedQuote.yesProb,
        noProb: savedQuote.noProb,
        // Probabilities after trade (projection)
        yesProbAfter: Math.round(quote.yesProbAfter * 100),
        noProbAfter: Math.round(quote.noProbAfter * 100),
        expiresAt: expiresAt.toISOString(),
        walletAddress,
      },
    });
  } catch (error) {
    console.error("[POST /api/quotes]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to create quote." },
      { status: 500 }
    );
  }
}
