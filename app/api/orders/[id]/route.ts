/**
 * PATCH /api/orders/[id]
 * Called by the frontend after the user's wallet submits a transaction.
 * Updates the order with the tx hash and advances the lifecycle.
 *
 * PATCH body:
 *   txHash: string       — Base tx hash or Sui digest from the connected wallet
 *   status: "SUBMITTED_TO_CHAIN" | "WALLET_REJECTED" | "CHAIN_FAILED"
 *   failureReason?: string
 *
 * GET /api/orders/[id]
 * Returns the current status of a single order (for polling).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";

const PatchOrderSchema = z.object({
  status: z.enum([
    "WALLET_PENDING",
    "WALLET_REJECTED",
    "SUBMITTED_TO_CHAIN",
    "CHAIN_FAILED",
  ]),
  txHash: z.string().optional(),
  failureReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PatchOrderSchema.safeParse(body);

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

    const { status, txHash, failureReason } = parsed.data;

    const order = await db.orderIntent.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "Order not found." },
        { status: 404 }
      );
    }

    // Guard against invalid state transitions
    const terminalStatuses = [
      "PORTFOLIO_FINAL",
      "RECONCILED",
      "WALLET_REJECTED",
      "CHAIN_FAILED",
    ];
    if (terminalStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: "invalid_transition",
          message: `Order is already in terminal status: ${order.status}.`,
        },
        { status: 422 }
      );
    }

    const updated = await db.orderIntent.update({
      where: { id },
      data: {
        status,
        ...(txHash ? { txHash } : {}),
        ...(failureReason ? { failureReason } : {}),
      },
    });

    return NextResponse.json({
      order: {
        id: updated.id,
        status: updated.status,
        txHash: updated.txHash,
        failureReason: updated.failureReason,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to update order." },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.orderIntent.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        marketId: order.marketId,
        chain: order.chain,
        side: order.side,
        amountUsd: Number(order.amountUsd),
        txHash: order.txHash,
        failureReason: order.failureReason,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch order." },
      { status: 500 }
    );
  }
}
