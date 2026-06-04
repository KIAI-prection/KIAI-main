/**
 * KIAI Sui Event Poller
 *
 * Queries Sui Testnet GraphQL for kiai_vault events.
 * Uses @mysten/sui gRPC client — JSON-RPC is deprecated (July 2026).
 *
 * Architecture: Sui is a custody/settlement rail only.
 * Events are stored in the same ChainEvent table as Base events.
 * The reconciliation service treats both chains identically.
 *
 * Events indexed:
 *   - PositionOpenedEvent  → user deposited USDC
 *   - WingsClaimedEvent    → user claimed winnings
 *   - RefundedEvent        → user got refund
 *   - MarketResolvedEvent  → operator resolved market
 *   - MarketCreatedEvent, MarketClosedEvent, MarketCancelledEvent
 */

import { db } from "@/lib/server/db";
import { toPrismaJson } from "@/lib/server/json";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PACKAGE_ID =
  process.env.SUI_TESTNET_KIAI_VAULT_PACKAGE_ID ??
  "0x1064637e3fb717e89b13de02b6c8babc9aa26a77bea9acdeb9d0cbf30ddaa089";

// Sui GraphQL RPC endpoint (NOT the same as the fullnode gRPC endpoint)
// Official public-good testnet endpoint: https://graphql.testnet.sui.io/graphql
// Source: https://docs.sui.io/develop/accessing-data/graphql/query-with-graphql (verified 2026-06-03)
// Note: SUI_TESTNET_RPC_URL is the gRPC/fullnode endpoint (different from GraphQL)
const GRAPHQL_URL =
  process.env.SUI_TESTNET_GRAPHQL_URL ?? "https://graphql.testnet.sui.io/graphql";

// Deployment checkpoint sequence — start indexing from here
const DEPLOYMENT_CHECKPOINT = BigInt(837464313);

const POLL_INTERVAL_MS = 8_000; // slightly slower than Base (Sui checkpoints ~1-2s)
let _isRunning = false;

// Event types to poll (fully qualified Sui event types)
const SUI_EVENT_TYPES = [
  `${PACKAGE_ID}::kiai_vault::MarketCreatedEvent`,
  `${PACKAGE_ID}::kiai_vault::MarketClosedEvent`,
  `${PACKAGE_ID}::kiai_vault::MarketResolvedEvent`,
  `${PACKAGE_ID}::kiai_vault::MarketCancelledEvent`,
  `${PACKAGE_ID}::kiai_vault::PositionOpenedEvent`,
  `${PACKAGE_ID}::kiai_vault::WingsClaimedEvent`,
  `${PACKAGE_ID}::kiai_vault::RefundedEvent`,
];

// ---------------------------------------------------------------------------
// gRPC client
// ---------------------------------------------------------------------------

// No gRPC client needed for event polling — use GraphQL HTTP fetch directly

// ---------------------------------------------------------------------------
// Resolve Move market_id_bytes to backend market.id
// market_id_bytes = SHA-256 hash of market.id (from sui-execution.ts)
// We store a reverse mapping by hashing all market IDs at poll time.
// ---------------------------------------------------------------------------

const _suiMarketIdCache = new Map<string, string | null>();

async function resolveMarketIdFromBytes(
  marketIdBytesBase64: string
): Promise<string | null> {
  const key = marketIdBytesBase64;
  if (_suiMarketIdCache.has(key)) return _suiMarketIdCache.get(key)!;

  const markets = await db.market.findMany({ select: { id: true } });
  const { createHash } = await import("crypto");

  for (const m of markets) {
    const hashBuf = createHash("sha256").update(m.id).digest();
    const base64 = Buffer.from(hashBuf).toString("base64");
    if (base64 === key) {
      _suiMarketIdCache.set(key, m.id);
      return m.id;
    }
  }

  _suiMarketIdCache.set(key, null);
  return null;
}

// ---------------------------------------------------------------------------
// Core poll: query Sui events by type for each event type
// ---------------------------------------------------------------------------

export async function pollSuiEvents(): Promise<{
  processed: number;
  eventTypesChecked: number;
}> {
  let processed = 0;

  // Get last indexed checkpoint from DB
  const deployed = await db.chainDeployment.findFirst({
    where: { chain: "SUI", deployStatus: "deployed" },
    orderBy: { updatedAt: "desc" },
    select: { lastIndexedBlock: true },
  });

  const lastCheckpoint = deployed?.lastIndexedBlock
    ? BigInt(deployed.lastIndexedBlock.toString())
    : DEPLOYMENT_CHECKPOINT;

  for (const eventType of SUI_EVENT_TYPES) {
    try {
      const result = await pollSuiEventType(eventType, lastCheckpoint);
      processed += result;
    } catch (err) {
      console.error(`[sui-poller] Error polling ${eventType}:`, err);
    }
  }

  return { processed, eventTypesChecked: SUI_EVENT_TYPES.length };
}

async function pollSuiEventType(
  eventType: string,
  afterCheckpoint: bigint
): Promise<number> {
  let processed = 0;
  let cursor: string | null = null;
  let latestCheckpoint = afterCheckpoint;

  // Query events using Sui GraphQL — paginated
  do {
    const query = buildEventsQuery(eventType, cursor);
      const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) break;

    const data = await response.json() as {
      data?: {
        events?: {
          nodes?: Array<{
            contents?: { json?: unknown };
            timestamp?: string;
            transaction?: { digest?: string; checkpoint?: { sequenceNumber?: string } };
            transactionModule?: { package?: { address?: string }; name?: string };
            sender?: { address?: string };
            sequenceNumber?: string;
          }>;
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
        };
      };
      errors?: unknown[];
    };

    if ((data as { errors?: unknown[] }).errors?.length) {
      console.error("[sui-poller] GraphQL errors:", data.errors);
      break;
    }

    const events = data?.data?.events;
    if (!events?.nodes?.length) break;

    for (const event of events.nodes) {
      const digest = event.transaction?.digest;
      const checkpointSeq = event.transaction?.checkpoint?.sequenceNumber;
      if (!digest) continue;

      const checkpoint = checkpointSeq ? BigInt(checkpointSeq) : afterCheckpoint;
      if (checkpoint <= afterCheckpoint) continue; // already indexed

      if (checkpoint > latestCheckpoint) latestCheckpoint = checkpoint;

      // Extract sender / wallet address
      const senderAddress = event.sender?.address?.toLowerCase() ?? null;

      // Extract market_id_bytes from event contents.json
      const eventJson = event.contents?.json as Record<string, unknown> | null;
      const marketIdBytesBase64 = eventJson?.market_id_bytes as string | undefined;
      const backendMarketId = marketIdBytesBase64
        ? await resolveMarketIdFromBytes(marketIdBytesBase64)
        : null;

      // Short event type name for storage
      const shortType = eventType.split("::").pop() ?? eventType;

      const raw = {
        eventType,
        contentsJson: eventJson,
        timestamp: event.timestamp,
        checkpointSequence: checkpointSeq,
        digest,
        module: event.transactionModule?.name,
      };

      try {
        await db.chainEvent.upsert({
          where: {
            chain_txHash_eventType: {
              chain: "SUI",
              txHash: digest,
              eventType: shortType,
            },
          },
          update: {},
          create: {
            chain: "SUI",
            blockOrCheckpoint: checkpoint,
            txHash: digest,
            eventType: shortType,
            marketId: backendMarketId,
            walletAddress: senderAddress,
            raw: toPrismaJson(raw),
          },
        });
        processed++;
      } catch (err) {
        const e = err as { code?: string };
        if (e?.code !== "P2002") {
          console.error("[sui-poller] ChainEvent upsert error:", err);
        }
      }
    }

    cursor = events.pageInfo?.hasNextPage ? (events.pageInfo.endCursor ?? null) : null;
  } while (cursor);

  // Advance checkpoint
  if (latestCheckpoint > afterCheckpoint) {
    await db.chainDeployment.updateMany({
      where: { chain: "SUI", deployStatus: "deployed" },
      data: { lastIndexedBlock: latestCheckpoint },
    });
  }

  return processed;
}

// ---------------------------------------------------------------------------
// Sui GraphQL query for events by type
// ---------------------------------------------------------------------------

function buildEventsQuery(eventType: string, after: string | null): string {
  const afterClause = after ? `, after: "${after}"` : "";
  // Field names confirmed against Sui testnet GraphQL schema 2026-06-03:
  // filter.type (not eventType), transaction.digest, contents.json, sender.address
  // EventFilter fields: afterCheckpoint, atCheckpoint, beforeCheckpoint, sender, module, type
  // Event fields: contents, eventBcs, sender, sequenceNumber, timestamp, transaction, transactionModule
  return `
    query {
      events(
        filter: { type: "${eventType}" }
        first: 50
        ${afterClause}
      ) {
        nodes {
          timestamp
          sender { address }
          contents { json }
          transactionModule { package { address } name }
          transaction {
            digest
            checkpoint { sequenceNumber }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
}

// ---------------------------------------------------------------------------
// Background poller loop
// ---------------------------------------------------------------------------

export async function startSuiPoller(): Promise<void> {
  if (_isRunning) return;
  _isRunning = true;
  console.log(`[sui-poller] Starting. Package: ${PACKAGE_ID}`);

  while (_isRunning) {
    try {
      const result = await pollSuiEvents();
      if (result.processed > 0) {
        console.log(`[sui-poller] +${result.processed} events`);
      }
    } catch (err) {
      console.error("[sui-poller] Error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export function stopSuiPoller(): void {
  _isRunning = false;
}
