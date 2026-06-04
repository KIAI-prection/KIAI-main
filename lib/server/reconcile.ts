/**
 * KIAI Reconciliation Service
 *
 * Reads unprocessed ChainEvents and transitions them into:
 *   OrderIntent → RECONCILED → PORTFOLIO_FINAL
 *   Trade records created
 *   UserPosition updated
 *   Market.qYes / Market.qNo updated (LMSR pool state)
 *
 * Architecture: one pool, two payment rails.
 * PositionOpened events from BOTH Base and Sui update the SAME Market row.
 * The LMSR pool state is chain-agnostic.
 *
 * Idempotency: safe to run multiple times. Each ChainEvent is processed once
 * (processedAt is set after first reconciliation). Duplicate events
 * (same chain+txHash+eventType) are deduplicated at the ChainEvent level.
 *
 * Never finalizes portfolio from optimistic UI state — only from indexed events.
 */

import { db } from "@/lib/server/db";
import type { Chain } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PositionOpenedArgs {
  marketId?: string;        // on-chain bytes32 (hex)
  user?: string;            // wallet address (hex) — Base
  sender?: string;          // wallet address — Sui
  outcomeSlug?: string;
  usdcDeposited?: string;   // bigint as string (6 decimals)
  shares?: string;          // bigint as string
  // Sui event fields
  outcome_id?: number[];
  outcome_slug?: string;
  usdc_deposited?: string;
  // Parsed from raw.json on Sui
  json?: {
    outcomeSlug?: string;
    usdc_deposited?: string;
    shares?: string;
  };
}

// ---------------------------------------------------------------------------
// Main reconcile runner
// ---------------------------------------------------------------------------

export interface ReconcileResult {
  processed: number;
  errors: number;
  positions: number;
}

export async function runReconciliation(): Promise<ReconcileResult> {
  let processed = 0;
  let errors = 0;
  let positions = 0;

  // Fetch unprocessed ChainEvents in block/checkpoint order
  const events = await db.chainEvent.findMany({
    where: { processedAt: null },
    orderBy: [{ blockOrCheckpoint: "asc" }, { createdAt: "asc" }],
    take: 100, // process in batches
  });

  for (const event of events) {
    try {
      const result = await reconcileEvent(event);
      if (result.positionUpdated) positions++;
      processed++;

      // Mark event as processed
      await db.chainEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    } catch (err) {
      console.error(
        `[reconcile] Error processing ChainEvent ${event.id}:`,
        err
      );
      errors++;
    }
  }

  return { processed, errors, positions };
}

// ---------------------------------------------------------------------------
// Reconcile a single ChainEvent
// ---------------------------------------------------------------------------

async function reconcileEvent(
  event: Awaited<ReturnType<typeof db.chainEvent.findMany>>[0]
): Promise<{ positionUpdated: boolean }> {
  switch (event.eventType) {
    case "PositionOpened":
    case "PositionOpenedEvent":
      return reconcilePositionOpened(event);

    case "WinningsClaimed":
    case "WingsClaimedEvent":
      return reconcileWinningsClaimed(event);

    case "Refunded":
    case "RefundedEvent":
      return reconcileRefunded(event);

    case "MarketResolved":
    case "MarketResolvedEvent":
      return reconcileMarketResolved(event);

    default:
      // Lifecycle events (MarketCreated, MarketClosed etc.) — no position changes needed
      return { positionUpdated: false };
  }
}

// ---------------------------------------------------------------------------
// PositionOpened reconciliation
// Updates: OrderIntent status, Trade, UserPosition, Market.qYes/qNo
// ---------------------------------------------------------------------------

async function reconcilePositionOpened(
  event: Awaited<ReturnType<typeof db.chainEvent.findMany>>[0]
): Promise<{ positionUpdated: boolean }> {
  const raw = event.raw as Record<string, unknown>;

  // Extract args — handle both Base (camelCase) and Sui (snake_case) formats
  const args = (raw.args ?? raw.json ?? {}) as PositionOpenedArgs;
  const chain = event.chain as Chain;

  const walletAddress = (
    event.walletAddress ??
    args.user ??
    args.sender ??
    ""
  ).toLowerCase();

  const outcomeSlug =
    args.outcomeSlug ??
    args.outcome_slug ??
    args.json?.outcomeSlug ??
    "unknown";

  // Parse shares and amount (bigint strings, 18 and 6 decimals respectively)
  const sharesRaw = BigInt(args.shares ?? args.json?.shares ?? "0");
  const usdcRaw = BigInt(
    args.usdcDeposited ?? args.usdc_deposited ?? args.json?.usdc_deposited ?? "0"
  );

  // Convert to decimal (USDC has 6 decimals, shares use 18 decimals)
  const sharesDecimal = Number(sharesRaw) / 1e18;
  const usdcDecimal = Number(usdcRaw) / 1e6;

  if (!event.marketId || !walletAddress || sharesDecimal <= 0) {
    return { positionUpdated: false };
  }

  // Find matching OrderIntent for this wallet + market + chain + SUBMITTED status
  const matchingOrder = await db.orderIntent.findFirst({
    where: {
      marketId: event.marketId,
      walletAddress,
      chain,
      status: {
        in: [
          "SUBMITTED_TO_CHAIN",
          "CHAIN_CONFIRMED",
          "INDEXING_PENDING",
          "WALLET_PENDING",
        ],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Create Trade record
  const trade = await db.trade.create({
    data: {
      orderIntentId: matchingOrder?.id ?? "orphan", // handle events without matching order
      chain,
      txHash: event.txHash,
      sharesAmt: sharesDecimal,
      avgPrice: sharesDecimal > 0 ? usdcDecimal / sharesDecimal : 0,
      feesUsd: 0,
      status: "reconciled",
    },
  }).catch((e) => {
    // If orderIntentId is "orphan" and there's a FK constraint, handle gracefully
    console.warn("[reconcile] Could not create trade:", e.message);
    return null;
  });

  // Determine position side from order intent or fallback to "yes"
  const side = matchingOrder?.side ?? "yes";

  // Upsert UserPosition — merge shares if user added to same position
  await db.userPosition.upsert({
    where: {
      userId_marketId_outcomeSlug_chain_side: {
        userId: walletAddress,
        marketId: event.marketId,
        outcomeSlug,
        chain,
        side,
      },
    },
    update: {
      shares: { increment: sharesDecimal },
      reconciledAt: new Date(),
      txHash: event.txHash,
    },
    create: {
      userId: walletAddress,
      marketId: event.marketId,
      outcomeSlug,
      chain,
      side,
      shares: sharesDecimal,
      avgEntry: sharesDecimal > 0 ? usdcDecimal / sharesDecimal : 0,
      reconciledAt: new Date(),
      txHash: event.txHash,
    },
  });

  // Update LMSR pool state — qYes or qNo increments with shares
  // This is the "one pool" update — both Base and Sui trades update the same Market row
  if (side === "yes") {
    await db.market.update({
      where: { id: event.marketId },
      data: {
        qYes: { increment: sharesDecimal },
        volumeUsd: { increment: usdcDecimal },
      },
    });
  } else {
    await db.market.update({
      where: { id: event.marketId },
      data: {
        qNo: { increment: sharesDecimal },
        volumeUsd: { increment: usdcDecimal },
      },
    });
  }

  // Advance OrderIntent to PORTFOLIO_FINAL
  if (matchingOrder) {
    await db.orderIntent.update({
      where: { id: matchingOrder.id },
      data: {
        status: "PORTFOLIO_FINAL",
        txHash: event.txHash,
      },
    });
  }

  return { positionUpdated: true };
}

// ---------------------------------------------------------------------------
// WinningsClaimed reconciliation — mark position as claimed, update claimable
// ---------------------------------------------------------------------------

async function reconcileWinningsClaimed(
  event: Awaited<ReturnType<typeof db.chainEvent.findMany>>[0]
): Promise<{ positionUpdated: boolean }> {
  if (!event.marketId || !event.walletAddress) return { positionUpdated: false };

  const raw = event.raw as Record<string, unknown>;
  const args = (raw.args ?? raw.json ?? {}) as Record<string, unknown>;
  const usdcClaimed = Number(BigInt(String(args.usdcClaimed ?? args.usdc_claimed ?? "0"))) / 1e6;

  // Mark all positions for this wallet+market as having zero claimable (settled)
  await db.userPosition.updateMany({
    where: {
      userId: event.walletAddress,
      marketId: event.marketId,
    },
    data: {
      claimableUsd: 0,
      realizedPnlUsd: { increment: usdcClaimed },
      reconciledAt: new Date(),
    },
  });

  return { positionUpdated: true };
}

// ---------------------------------------------------------------------------
// Refunded reconciliation — position cleared
// ---------------------------------------------------------------------------

async function reconcileRefunded(
  event: Awaited<ReturnType<typeof db.chainEvent.findMany>>[0]
): Promise<{ positionUpdated: boolean }> {
  if (!event.marketId || !event.walletAddress) return { positionUpdated: false };

  await db.userPosition.updateMany({
    where: {
      userId: event.walletAddress,
      marketId: event.marketId,
    },
    data: {
      claimableUsd: 0,
      shares: 0,
      reconciledAt: new Date(),
    },
  });

  return { positionUpdated: true };
}

// ---------------------------------------------------------------------------
// MarketResolved reconciliation — mark claimable for winners
// ---------------------------------------------------------------------------

async function reconcileMarketResolved(
  event: Awaited<ReturnType<typeof db.chainEvent.findMany>>[0]
): Promise<{ positionUpdated: boolean }> {
  if (!event.marketId) return { positionUpdated: false };

  const raw = event.raw as Record<string, unknown>;
  const args = (raw.args ?? raw.json ?? {}) as Record<string, unknown>;
  const winningOutcomeSlug = String(args.winningOutcomeSlug ?? args.winning_outcome_slug ?? "");

  if (!winningOutcomeSlug) return { positionUpdated: false };

  // Get market for LMSR calculations
  const market = await db.market.findUnique({
    where: { id: event.marketId },
    select: { qYes: true, qNo: true, lmsrB: true },
  });

  if (!market) return { positionUpdated: false };

  // Get all winner positions for this outcome
  const winnerPositions = await db.userPosition.findMany({
    where: {
      marketId: event.marketId,
      outcomeSlug: winningOutcomeSlug,
    },
  });

  // Total winning shares across both chains
  const totalWinningShares = winnerPositions.reduce(
    (sum, p) => sum + Number(p.shares),
    0
  );

  // Get total collateral from the market (qYes + qNo shares × avg price ≈ volume)
  const totalCollateral = await db.market
    .findUnique({
      where: { id: event.marketId },
      select: { volumeUsd: true },
    })
    .then((m) => Number(m?.volumeUsd ?? 0));

  if (totalWinningShares <= 0) return { positionUpdated: false };

  // Update claimable for each winner (proportional to their shares)
  for (const pos of winnerPositions) {
    const claimable =
      (Number(pos.shares) / totalWinningShares) * totalCollateral;

    await db.userPosition.update({
      where: { id: pos.id },
      data: {
        claimableUsd: claimable,
        reconciledAt: new Date(),
      },
    });
  }

  return { positionUpdated: true };
}
