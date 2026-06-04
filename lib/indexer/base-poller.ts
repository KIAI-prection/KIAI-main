/**
 * KIAI Base Event Poller
 *
 * Watches KIAIVault on Base Sepolia for on-chain events using viem getLogs.
 * No external services required — uses the same viem client as base-execution.ts.
 *
 * Architecture: Base is a custody/settlement rail only.
 * We index events to reconcile OrderIntents → Trades → UserPositions.
 *
 * Events indexed:
 *   - PositionOpened  → user deposited USDC, opened a position
 *   - WinningsClaimed → user claimed winnings after resolution
 *   - Refunded        → user got refund on cancelled market
 *   - MarketResolved  → operator resolved market on-chain
 *   - MarketCreated, MarketClosed, MarketCancelled → lifecycle events
 *
 * Production upgrade path: swap this viem poller for Envio HyperIndex.
 * The ChainEvent schema and reconciliation service stay the same.
 */

import {
  createPublicClient,
  http,
  parseAbi,
  parseEventLogs,
  keccak256,
  toBytes,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";

// ---------------------------------------------------------------------------
// KIAIVault event ABI
// ---------------------------------------------------------------------------

export const VAULT_EVENTS_ABI = parseAbi([
  "event PositionOpened(bytes32 indexed marketId, address indexed user, bytes32 indexed outcomeId, string outcomeSlug, uint256 usdcDeposited, uint256 shares)",
  "event WinningsClaimed(bytes32 indexed marketId, address indexed user, uint256 usdcClaimed)",
  "event Refunded(bytes32 indexed marketId, address indexed user, uint256 usdcRefunded)",
  "event MarketResolved(bytes32 indexed marketId, bytes32 winningOutcomeId, string winningOutcomeSlug)",
  "event MarketCreated(bytes32 indexed marketId)",
  "event MarketClosed(bytes32 indexed marketId)",
  "event MarketCancelled(bytes32 indexed marketId)",
]);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VAULT_ADDRESS = (process.env.BASE_SEPOLIA_KIAI_VAULT_ADDRESS ??
  "0x3d1E1993fD3f30c64e884E5B777c7B4e55C458A8") as Address;

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

// KIAIVault deployment block — start indexing from here
const DEPLOYMENT_BLOCK = BigInt(42308800);

// Max blocks to fetch per poll (avoid viem getLogs limits)
const MAX_BLOCKS_PER_POLL = BigInt(2000);

const POLL_INTERVAL_MS = 5_000;
let _isRunning = false;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ---------------------------------------------------------------------------
// Resolve on-chain keccak256(marketId) → backend market.id
// We compute keccak256(market.id) for each market and match.
// ---------------------------------------------------------------------------

const _marketIdCache = new Map<string, string | null>();

async function resolveMarketId(bytes32: string): Promise<string | null> {
  const key = bytes32.toLowerCase();
  if (_marketIdCache.has(key)) return _marketIdCache.get(key)!;

  const markets = await db.market.findMany({ select: { id: true } });
  for (const m of markets) {
    const hash = keccak256(toBytes(m.id));
    if (hash.toLowerCase() === key) {
      _marketIdCache.set(key, m.id);
      return m.id;
    }
  }
  _marketIdCache.set(key, null);
  return null;
}

// ---------------------------------------------------------------------------
// Core poll: fetch logs for one block range and store as ChainEvents
// ---------------------------------------------------------------------------

export async function pollBaseEvents(): Promise<{
  processed: number;
  fromBlock: bigint;
  toBlock: bigint;
}> {
  const client = getClient();

  // Get last indexed block from DB (stored in ChainDeployment.lastIndexedBlock)
  const deployed = await db.chainDeployment.findFirst({
    where: { chain: "BASE", deployStatus: "deployed" },
    orderBy: { updatedAt: "desc" },
    select: { lastIndexedBlock: true },
  });

  const fromBlock = deployed?.lastIndexedBlock
    ? BigInt(deployed.lastIndexedBlock.toString()) + BigInt(1)
    : DEPLOYMENT_BLOCK;

  const latestBlock = await client.getBlockNumber();
  if (fromBlock > latestBlock) {
    return { processed: 0, fromBlock, toBlock: latestBlock };
  }

  const toBlock =
    latestBlock - fromBlock > MAX_BLOCKS_PER_POLL
      ? fromBlock + MAX_BLOCKS_PER_POLL
      : latestBlock;

  // Fetch raw logs for the vault address
  const rawLogs = await client.getLogs({
    address: VAULT_ADDRESS,
    fromBlock,
    toBlock,
  });

  // Parse using ABI to get decoded events
  const parsedLogs = parseEventLogs({
    abi: VAULT_EVENTS_ABI,
    logs: rawLogs,
    strict: false, // don't throw on unknown events
  });

  let processed = 0;

  for (const log of parsedLogs) {
    if (!log.transactionHash || !log.blockNumber) continue;

    const txHash = log.transactionHash;
    const eventType = log.eventName;

    // Resolve the on-chain marketId bytes32 to our backend market.id
    const marketIdBytes32 =
      "marketId" in log.args ? (log.args as { marketId?: string }).marketId : null;
    const backendMarketId = marketIdBytes32
      ? await resolveMarketId(marketIdBytes32)
      : null;

    // Extract wallet address from event (user field in most events)
    const walletAddress =
      "user" in log.args
        ? ((log.args as { user?: string }).user?.toLowerCase() ?? null)
        : null;

    // Build raw payload for storage
    const raw = {
      eventName: log.eventName,
      args: Object.fromEntries(
        Object.entries(log.args as Record<string, unknown>).map(([k, v]) => [
          k,
          typeof v === "bigint" ? v.toString() : v,
        ])
      ),
      address: log.address,
      blockNumber: log.blockNumber.toString(),
      transactionHash: txHash,
      logIndex: log.logIndex ?? 0,
    };

    try {
      await db.chainEvent.upsert({
        where: {
          chain_txHash_eventType: {
            chain: "BASE",
            txHash,
            eventType,
          },
        },
        update: {}, // idempotent — skip if already stored
        create: {
          chain: "BASE",
          blockOrCheckpoint: log.blockNumber,
          txHash,
          eventType,
          marketId: backendMarketId,
          walletAddress,
          raw: toPrismaJson(raw),
        },
      });
      processed++;
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code !== "P2002") {
        console.error("[base-poller] ChainEvent upsert error:", err);
      }
    }
  }

  // Advance the checkpoint
  await db.chainDeployment.updateMany({
    where: { chain: "BASE", deployStatus: "deployed" },
    data: { lastIndexedBlock: toBlock },
  });

  return { processed, fromBlock, toBlock };
}

// ---------------------------------------------------------------------------
// Background poller loop
// ---------------------------------------------------------------------------

export async function startBasePoller(): Promise<void> {
  if (_isRunning) return;
  _isRunning = true;
  console.log(`[base-poller] Starting. Vault: ${VAULT_ADDRESS}`);

  while (_isRunning) {
    try {
      const result = await pollBaseEvents();
      if (result.processed > 0) {
        console.log(
          `[base-poller] +${result.processed} events (blocks ${result.fromBlock}–${result.toBlock})`
        );
      }
    } catch (err) {
      console.error("[base-poller] Error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export function stopBasePoller(): void {
  _isRunning = false;
}
