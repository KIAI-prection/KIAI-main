/**
 * POST /api/admin/reconcile
 * Trigger a manual reconciliation run.
 * Processes all unprocessed ChainEvents → Trades → UserPositions.
 *
 * GET /api/admin/reconcile
 * Returns reconciliation status:
 *   - unprocessed ChainEvents count
 *   - last processed block/checkpoint per chain
 *   - pending OrderIntents count
 *   - reconciled positions count
 *
 * Both require OPERATOR_SECRET bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/operator-auth";
import { runReconciliation } from "@/lib/server/reconcile";
import { pollBaseEvents } from "@/lib/indexer/base-poller";
import { pollSuiEvents } from "@/lib/indexer/sui-poller";
import { db } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// POST — trigger reconciliation
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const includePoll = searchParams.get("poll") !== "false"; // default: true

    const startMs = Date.now();
    let basePollResult = {
      processed: 0,
      fromBlock: BigInt(0),
      toBlock: BigInt(0),
    };
    let suiPollResult = { processed: 0, eventTypesChecked: 0 };

    // 1. Poll for new events first (unless ?poll=false)
    if (includePoll) {
      try {
        basePollResult = await pollBaseEvents();
      } catch (err) {
        console.error("[reconcile API] Base poll error:", err);
      }

      try {
        suiPollResult = await pollSuiEvents();
      } catch (err) {
        console.error("[reconcile API] Sui poll error:", err);
      }
    }

    // 2. Run reconciliation on all unprocessed events
    const reconcileResult = await runReconciliation();

    const elapsedMs = Date.now() - startMs;

    return NextResponse.json({
      ok: true,
      elapsedMs,
      poll: {
        base: {
          newEvents: basePollResult.processed,
          fromBlock: basePollResult.fromBlock.toString(),
          toBlock: basePollResult.toBlock.toString(),
        },
        sui: {
          newEvents: suiPollResult.processed,
          eventTypesChecked: suiPollResult.eventTypesChecked,
        },
      },
      reconcile: {
        processed: reconcileResult.processed,
        positionsUpdated: reconcileResult.positions,
        errors: reconcileResult.errors,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/reconcile]", err);
    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET — reconciliation status
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    // Unprocessed ChainEvents (not yet reconciled)
    const [unprocessedCount, totalEvents] = await Promise.all([
      db.chainEvent.count({ where: { processedAt: null } }),
      db.chainEvent.count(),
    ]);

    // Events by chain
    const [baseEvents, suiEvents] = await Promise.all([
      db.chainEvent.count({ where: { chain: "BASE" } }),
      db.chainEvent.count({ where: { chain: "SUI" } }),
    ]);

    // Last indexed block per chain
    const deployments = await db.chainDeployment.findMany({
      where: { deployStatus: "deployed" },
      select: {
        chain: true,
        lastIndexedBlock: true,
        contractAddress: true,
        updatedAt: true,
      },
    });

    // Pending OrderIntents (submitted but not yet reconciled)
    const pendingOrders = await db.orderIntent.count({
      where: {
        status: {
          in: [
            "SUBMITTED_TO_CHAIN",
            "CHAIN_CONFIRMED",
            "INDEXING_PENDING",
            "INDEXING_LAGGED",
          ],
        },
      },
    });

    // Reconciled portfolio state
    const [trades, positions, finalOrders] = await Promise.all([
      db.trade.count(),
      db.userPosition.count(),
      db.orderIntent.count({ where: { status: "PORTFOLIO_FINAL" } }),
    ]);

    // Event type breakdown
    const eventTypeCounts = await db.chainEvent.groupBy({
      by: ["eventType", "chain"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return NextResponse.json({
      indexer: {
        totalChainEvents: totalEvents,
        unprocessedEvents: unprocessedCount,
        base: {
          events: baseEvents,
          lastIndexedBlock: deployments
            .find((d) => d.chain === "BASE")
            ?.lastIndexedBlock?.toString() ?? null,
          contractAddress: deployments.find((d) => d.chain === "BASE")
            ?.contractAddress,
        },
        sui: {
          events: suiEvents,
          lastCheckpoint: deployments
            .find((d) => d.chain === "SUI")
            ?.lastIndexedBlock?.toString() ?? null,
        },
      },
      reconciliation: {
        trades,
        positions,
        pendingOrders,
        finalOrders,
        lag: pendingOrders > 0 ? "indexing_pending" : "up_to_date",
      },
      eventTypes: eventTypeCounts.map((e) => ({
        chain: e.chain,
        eventType: e.eventType,
        count: e._count.id,
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/reconcile]", err);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to get reconcile status." },
      { status: 500 }
    );
  }
}
