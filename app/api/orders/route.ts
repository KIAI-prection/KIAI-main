/**
 * POST /api/orders
 * Creates a durable OrderIntent from a valid quote.
 *
 * This does NOT execute the trade. It records intent and returns the order ID.
 * The frontend then submits the real transaction via the connected wallet.
 * After wallet submission, PATCH /api/orders/[id] updates txHash and status.
 *
 * Request body:
 *   quoteId: string
 *   walletAddress: string
 *
 * Response:
 *   order: { id, status, marketId, outcomeId, chain, side, amountUsd, quoteId }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";

const CreateOrderSchema = z.object({
  quoteId: z.string().min(1),
  walletAddress: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);

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

    const { quoteId, walletAddress } = parsed.data;

    // Load and validate the quote
    const quote = await db.quote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      return NextResponse.json(
        { error: "not_found", message: "Quote not found." },
        { status: 404 }
      );
    }

    if (quote.status !== "ready") {
      return NextResponse.json(
        {
          error: "quote_not_ready",
          message: `Quote is ${quote.status}. Please request a new quote.`,
        },
        { status: 422 }
      );
    }

    if (quote.expiresAt < new Date()) {
      // Mark the quote expired
      await db.quote.update({
        where: { id: quoteId },
        data: { status: "expired" },
      });
      return NextResponse.json(
        {
          error: "quote_expired",
          message: "Quote has expired. Please request a new quote.",
        },
        { status: 422 }
      );
    }

    // Verify the market is still live
    const market = await db.market.findUnique({
      where: { id: quote.marketId },
      select: { lifecycle: true },
    });

    if (!market || market.lifecycle !== "LIVE") {
      return NextResponse.json(
        {
          error: "market_not_live",
          message: "Market is no longer live.",
        },
        { status: 422 }
      );
    }

    // Create the durable intent
    const order = await db.orderIntent.create({
      data: {
        marketId: quote.marketId,
        outcomeId: quote.outcomeId,
        chain: quote.chain,
        side: quote.side,
        amountUsd: quote.amountUsd,
        status: "QUOTE_READY",
        walletAddress,
        quoteId,
      },
    });

    // Mark quote as consumed (one quote → one order)
    await db.quote.update({
      where: { id: quoteId },
      data: { status: "consumed" } as never,
    });

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          marketId: order.marketId,
          outcomeId: order.outcomeId,
          chain: order.chain,
          side: order.side,
          amountUsd: Number(order.amountUsd),
          quoteId,
          walletAddress,
          createdAt: order.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to create order." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders?walletAddress=...
 * Returns recent orders for a wallet (for order status polling).
 */
export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "validation_error", message: "walletAddress is required." },
      { status: 400 }
    );
  }

  try {
    const orders = await db.orderIntent.findMany({
      where: { walletAddress },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        marketId: o.marketId,
        chain: o.chain,
        side: o.side,
        amountUsd: Number(o.amountUsd),
        txHash: o.txHash,
        failureReason: o.failureReason,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
