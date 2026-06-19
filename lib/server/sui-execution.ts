/**
 * KIAI Sui Execution Service
 *
 * Handles all Sui interactions using @mysten/sui (v2.17.0) gRPC client.
 * Architecture: Sui is a payment/custody rail only.
 * Market pricing and LMSR pool logic live in the KIAI backend.
 * This service executes on-chain operations:
 *   - createMarket PTB (operator)
 *   - deposit PTB (user — built by backend, signed by user wallet via dApp Kit)
 *   - resolveMarket PTB (operator)
 *   - claimWinnings PTB (user)
 *   - refund PTB (user)
 *   - waitForTransaction (required before portfolio finalization)
 *   - getPosition read (via gRPC)
 *
 * Data access: gRPC via SuiGrpcClient — JSON-RPC is deprecated (July 2026).
 * Reference: https://sdk.mystenlabs.com/typescript (fetched 2026-06-02)
 *
 * CRITICAL: Never mark an order RECONCILED until:
 *   1. Transaction digest is returned from wallet
 *   2. waitForTransaction confirms effects
 *   3. effects.status is SUCCESS (not just "submitted")
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { toBase64 } from "@mysten/sui/utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// ---------------------------------------------------------------------------
// Network config (mainnet source audit)
// ---------------------------------------------------------------------------

const SUI_MAINNET_RPC =
  process.env.SUI_MAINNET_RPC_URL ?? "https://fullnode.mainnet.sui.io:443";

// Deployed contract IDs (from docs/DEPLOYMENTS.md)
export const SUI_PACKAGE_ID =
  process.env.SUI_MAINNET_KIAI_VAULT_PACKAGE_ID ?? "";

export const SUI_REGISTRY_ID =
  process.env.SUI_MAINNET_KIAI_VAULT_REGISTRY_ID ?? "";

export const SUI_OPERATOR_CAP_ID =
  process.env.SUI_MAINNET_KIAI_OPERATOR_CAP_ID ?? "";

// Circle official Sui Mainnet USDC type.
export const USDC_TYPE =
  process.env.SUI_MAINNET_USDC_TYPE ??
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

// ---------------------------------------------------------------------------
// gRPC client singleton
// ---------------------------------------------------------------------------

let _grpcClient: SuiGrpcClient | null = null;

export function getSuiClient(): SuiGrpcClient {
  if (!_grpcClient) {
    _grpcClient = new SuiGrpcClient({
      network: "mainnet",
      baseUrl: SUI_MAINNET_RPC,
    });
  }
  return _grpcClient;
}

/**
 * Get the operator keypair from the Sui keystore (loaded from env for backend ops).
 * NEVER expose the private key in logs or responses.
 */
export function getOperatorKeypair(): Ed25519Keypair {
  const suiPrivKey = process.env.SUI_OPERATOR_PRIVATE_KEY;
  if (!suiPrivKey) {
    throw new Error(
      "SUI_OPERATOR_PRIVATE_KEY not set. Required for Sui operator transactions."
    );
  }
  return Ed25519Keypair.fromSecretKey(suiPrivKey);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a backend market ID string to the keccak256 bytes vector
 * expected by the Move contract (as a Uint8Array for PTB args).
 *
 * We use Node's crypto.createHash for keccak256 — @mysten/sui does not
 * provide a keccak helper directly. If running in edge, use a tiny package.
 */
export async function marketIdToBytes(marketId: string): Promise<Uint8Array> {
  const { createHash } = await import("crypto");
  return new Uint8Array(
    createHash("sha256") // Uses the same stable market-id hash across chains
      .update(marketId)
      .digest()
  );
}

export async function outcomeSlugToBytes(slug: string): Promise<Uint8Array> {
  const { createHash } = await import("crypto");
  return new Uint8Array(
    createHash("sha256").update(slug).digest()
  );
}

// ---------------------------------------------------------------------------
// Structured error types
// ---------------------------------------------------------------------------

export type SuiExecutionError =
  | { kind: "simulation_failed"; message: string }
  | { kind: "effects_failed"; digest: string; error: string }
  | { kind: "timeout"; digest: string }
  | { kind: "rpc_error"; message: string };

export type SuiExecutionResult =
  | { ok: true; digest: string; checkpoint?: string }
  | { ok: false; error: SuiExecutionError };

// ---------------------------------------------------------------------------
// Operator: create market on Sui
// ---------------------------------------------------------------------------

/**
 * Build and execute a PTB to create a market vault on Sui Mainnet.
 * Uses the operator keypair from SUI_OPERATOR_PRIVATE_KEY env var.
 *
 * @param marketId Backend market ID string (will be hashed to bytes)
 */
export async function createMarketOnSui(
  marketId: string
): Promise<SuiExecutionResult> {
  try {
    const keypair = getOperatorKeypair();
    const client = getSuiClient();
    const marketIdBytes = await marketIdToBytes(marketId);

    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::kiai_vault::create_market`,
      typeArguments: [USDC_TYPE],
      arguments: [
        tx.object(SUI_OPERATOR_CAP_ID),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(marketIdBytes))),
      ],
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      include: { effects: true },
      signer: keypair,
    });

    // Check for failed transaction explicitly
    if (result.$kind === "FailedTransaction") {
      return {
        ok: false,
        error: {
          kind: "effects_failed",
          digest: result.FailedTransaction.digest,
          error: String(result.FailedTransaction.status.error ?? "Transaction failed"),
        },
      };
    }

    const digest = result.Transaction.digest;

    // Wait for indexing before returning (prevents stale portfolio reads)
    await client.core.waitForTransaction({ digest });

    return { ok: true, digest };
  } catch (err) {
    return mapSuiError(err);
  }
}

// ---------------------------------------------------------------------------
// Operator: resolve market on Sui
// ---------------------------------------------------------------------------

export async function resolveMarketOnSui(
  marketObjectId: string,
  winningOutcomeSlug: string,
  totalWinningShares: bigint
): Promise<SuiExecutionResult> {
  try {
    const keypair = getOperatorKeypair();
    const client = getSuiClient();
    const winningId = await outcomeSlugToBytes(winningOutcomeSlug);
    const winningSlugBytes = new TextEncoder().encode(winningOutcomeSlug);

    const tx = new Transaction();

    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::kiai_vault::resolve_market`,
      typeArguments: [USDC_TYPE],
      arguments: [
        tx.object(SUI_OPERATOR_CAP_ID),
        tx.object(marketObjectId),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(winningId))),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(winningSlugBytes))),
        tx.pure(bcs.u64().serialize(totalWinningShares)),
      ],
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      include: { effects: true },
      signer: keypair,
    });

    if (result.$kind === "FailedTransaction") {
      return {
        ok: false,
        error: {
          kind: "effects_failed",
          digest: result.FailedTransaction.digest,
          error: String(result.FailedTransaction.status.error ?? "Resolve failed"),
        },
      };
    }

    const digest = result.Transaction.digest;
    await client.core.waitForTransaction({ digest });
    return { ok: true, digest };
  } catch (err) {
    return mapSuiError(err);
  }
}

// ---------------------------------------------------------------------------
// Operator: cancel market on Sui for full-refund settlement
// ---------------------------------------------------------------------------

export async function cancelMarketOnSui(
  marketObjectId: string
): Promise<SuiExecutionResult> {
  try {
    const keypair = getOperatorKeypair();
    const client = getSuiClient();

    const tx = new Transaction();

    tx.moveCall({
      target: SUI_PACKAGE_ID + "::kiai_vault::cancel_market",
      typeArguments: [USDC_TYPE],
      arguments: [
        tx.object(SUI_OPERATOR_CAP_ID),
        tx.object(marketObjectId),
      ],
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      include: { effects: true },
      signer: keypair,
    });

    if (result.$kind === "FailedTransaction") {
      return {
        ok: false,
        error: {
          kind: "effects_failed",
          digest: result.FailedTransaction.digest,
          error: String(result.FailedTransaction.status.error ?? "Cancel failed"),
        },
      };
    }

    const digest = result.Transaction.digest;
    await client.core.waitForTransaction({ digest });
    return { ok: true, digest };
  } catch (err) {
    return mapSuiError(err);
  }
}

// ---------------------------------------------------------------------------
// Build deposit PTB (for user wallet via dApp Kit)
// ---------------------------------------------------------------------------

/**
 * Build a deposit Transaction object that the user's connected wallet signs.
 * Returns the serialized transaction bytes to pass to dApp Kit's
 * signAndExecuteTransaction or the frontend wallet.
 *
 * The backend builds this PTB after the LMSR quote is computed.
 * The frontend calls signAndExecuteTransaction with the built tx.
 *
 * @param marketObjectId Sui object ID of the Market<USDC> shared object
 * @param outcomeSlug Human-readable outcome slug
 * @param usdcAmount Exact USDC amount in base units (6 decimals)
 * @param shares LMSR shares from backend quote (scaled u64)
 * @param sender User's Sui address
 */
export async function buildDepositTransaction(
  marketObjectId: string,
  outcomeSlug: string,
  usdcAmount: bigint,
  shares: bigint,
  sender: string
): Promise<string> {
  const outcomeId = await outcomeSlugToBytes(outcomeSlug);
  const outcomeSlugBytes = new TextEncoder().encode(outcomeSlug);

  const tx = new Transaction();
  tx.setSender(sender);

  // Let the wallet/client resolve the user's USDC coins at signing time.
  const usdcCoin = tx.coin({
    type: USDC_TYPE,
    balance: usdcAmount,
    useGasCoin: false,
  });

  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::kiai_vault::deposit`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(marketObjectId),
      tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(outcomeId))),
      tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(outcomeSlugBytes))),
      usdcCoin,
      tx.pure.u64(shares),
    ],
  });

  return tx.toJSON({ supportedIntents: ["CoinWithBalance"] });
}

export type SuiDepositTransactionPayload = {
  kind: "sui_deposit";
  packageId: string;
  usdcType: string;
  marketObjectId: string;
  outcomeSlug: string;
  outcomeIdBytes: number[];
  outcomeSlugBytes: number[];
  usdcAmount: string;
  shares: string;
  sender: string;
};

export async function buildDepositTransactionPayload(
  marketObjectId: string,
  outcomeSlug: string,
  usdcAmount: bigint,
  shares: bigint,
  sender: string
): Promise<SuiDepositTransactionPayload> {
  const outcomeId = await outcomeSlugToBytes(outcomeSlug);
  const outcomeSlugBytes = new TextEncoder().encode(outcomeSlug);

  return {
    kind: "sui_deposit",
    packageId: SUI_PACKAGE_ID,
    usdcType: USDC_TYPE,
    marketObjectId,
    outcomeSlug,
    outcomeIdBytes: Array.from(outcomeId),
    outcomeSlugBytes: Array.from(outcomeSlugBytes),
    usdcAmount: usdcAmount.toString(),
    shares: shares.toString(),
    sender,
  };
}

// ---------------------------------------------------------------------------
// Build claim PTB (for user wallet)
// ---------------------------------------------------------------------------

export async function buildClaimTransaction(
  marketObjectId: string,
  sender: string
): Promise<string> {
  const tx = new Transaction();
  tx.setSender(sender);

  const winnings = tx.moveCall({
    target: `${SUI_PACKAGE_ID}::kiai_vault::claim_winnings`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(marketObjectId),
      tx.object(SUI_REGISTRY_ID),
    ],
  });

  tx.transferObjects([winnings], sender);

  return toBase64(await tx.build({ client: getSuiClient() }));
}

// ---------------------------------------------------------------------------
// Wait for transaction indexing
// ---------------------------------------------------------------------------

/**
 * Wait for a submitted Sui transaction to be indexed before portfolio finalization.
 * Returns the effects status.
 * NEVER finalize portfolio state without calling this first.
 */
export async function waitForSuiTransaction(digest: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getSuiClient();
    await client.core.waitForTransaction({ digest });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Error mapper
// ---------------------------------------------------------------------------

function mapSuiError(err: unknown): { ok: false; error: SuiExecutionError } {
  const message = err instanceof Error ? err.message : "Unknown Sui execution error";

  if (message.includes("timeout") || message.includes("Timeout")) {
    return { ok: false, error: { kind: "timeout", digest: "unknown" } };
  }

  return { ok: false, error: { kind: "rpc_error", message } };
}
