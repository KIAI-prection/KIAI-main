/**
 * POST /api/orders/[id]/sui-deposit-transaction
 *
 * Builds a Sui Transaction JSON payload for a user's connected Sui wallet.
 * This route does not submit or fake a transaction. The frontend must ask the
 * wallet to sign/execute, then PATCH /api/orders/[id] with the real digest.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { buildDepositTransaction } from "@/lib/server/sui-execution";
import { prepareSuiDepositTransaction } from "@/lib/server/sui-deposit-prep";

const SuiDepositTransactionSchema = z.object({
  walletAddress: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = SuiDepositTransactionSchema.safeParse(body);

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

    const result = await prepareSuiDepositTransaction(
      { id, walletAddress: parsed.data.walletAddress },
      {
        findOrder: (orderId) =>
          db.orderIntent.findUnique({
            where: { id: orderId },
            include: {
              quote: true,
              market: {
                include: {
                  outcomes: true,
                  chainDeployments: { where: { chain: "SUI" } },
                },
              },
            },
          }),
        markWalletPending: (orderId) =>
          db.orderIntent.update({
            where: { id: orderId },
            data: { status: "WALLET_PENDING" },
          }),
        buildTransaction: buildDepositTransaction,
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[POST /api/orders/[id]/sui-deposit-transaction]", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to build Sui transaction." },
      { status: 500 }
    );
  }
}
