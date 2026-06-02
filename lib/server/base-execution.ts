/**
 * KIAI Base Execution Service
 *
 * Handles all EVM interactions for Base Sepolia using viem.
 * Architecture: Base is a payment/custody rail only.
 * Market pricing and LMSR pool logic live in the KIAI backend.
 * This service executes on-chain operations:
 *   - simulateContract (preflight validation before broadcast)
 *   - writeContract (broadcast transaction via connected wallet)
 *   - waitForTransactionReceipt (confirm before marking final)
 *   - Read: getPosition, claimableAmount
 *
 * Reference: Base docs https://docs.base.org/llms.txt (fetched 2026-06-02)
 * Viem docs: https://viem.sh/
 *
 * CRITICAL: Never mark an order RECONCILED or portfolio FINAL until:
 *   1. simulateContract passes
 *   2. writeContract succeeds (returns txHash)
 *   3. waitForTransactionReceipt confirms (status: "success")
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toBytes,
  type Hash,
  type Address,
  type PublicClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ---------------------------------------------------------------------------
// KIAIVault ABI (subset needed for backend operations)
// ---------------------------------------------------------------------------

export const KIAI_VAULT_ABI = parseAbi([
  // Write
  "function createMarket(bytes32 marketId) external",
  "function closeMarket(bytes32 marketId) external",
  "function resolveMarket(bytes32 marketId, bytes32 winningOutcomeId, string calldata winningOutcomeSlug, uint256 totalWinningShares) external",
  "function cancelMarket(bytes32 marketId) external",
  "function deposit(bytes32 marketId, bytes32 outcomeId, string calldata outcomeSlug, uint256 usdcAmount, uint256 shares) external",
  "function claimWinnings(bytes32 marketId) external",
  "function refund(bytes32 marketId) external",
  // Read
  "function getMarket(bytes32 marketId) external view returns (tuple(uint8 status, bytes32 winningOutcomeId, uint256 totalCollateral, uint256 totalWinningShares))",
  "function getPosition(bytes32 marketId, address user) external view returns (tuple(uint256 usdcDeposited, uint256 shares, bytes32 outcomeId, bool claimed))",
  "function claimableAmount(bytes32 marketId, address user) external view returns (uint256)",
  "function marketIdBytes(string calldata marketId) external pure returns (bytes32)",
  "function outcomeIdBytes(string calldata outcomeSlug) external pure returns (bytes32)",
  // Events
  "event PositionOpened(bytes32 indexed marketId, address indexed user, bytes32 indexed outcomeId, string outcomeSlug, uint256 usdcDeposited, uint256 shares)",
  "event MarketResolved(bytes32 indexed marketId, bytes32 winningOutcomeId, string winningOutcomeSlug)",
  "event WinningsClaimed(bytes32 indexed marketId, address indexed user, uint256 usdcClaimed)",
]);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

/**
 * Public client for read-only operations and preflight simulation.
 * Uses Base Sepolia RPC from environment (falls back to public endpoint).
 */
export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(
      process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"
    ),
  });
}

/**
 * Wallet client for operator-initiated writes (market creation, resolution).
 * Requires DEPLOYER_PRIVATE_KEY env var.
 * NEVER log or expose the private key.
 */
export function getOperatorWalletClient() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY not set. " +
        "Required for Base Sepolia contract operations."
    );
  }
  const account = privateKeyToAccount(privateKey as Hash);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(
      process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"
    ),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a backend market ID string to bytes32 for the contract. */
export function marketIdToBytes32(marketId: string): `0x${string}` {
  return keccak256(toBytes(marketId));
}

/** Convert an outcome slug to bytes32 for the contract. */
export function outcomeSlugToBytes32(slug: string): `0x${string}` {
  return keccak256(toBytes(slug));
}

// ---------------------------------------------------------------------------
// On-chain read operations
// ---------------------------------------------------------------------------

export async function getOnChainMarket(
  vaultAddress: Address,
  marketId: string
) {
  const client = getPublicClient();
  return client.readContract({
    address: vaultAddress,
    abi: KIAI_VAULT_ABI,
    functionName: "getMarket",
    args: [marketIdToBytes32(marketId)],
  });
}

export async function getOnChainPosition(
  vaultAddress: Address,
  marketId: string,
  userAddress: Address
) {
  const client = getPublicClient();
  return client.readContract({
    address: vaultAddress,
    abi: KIAI_VAULT_ABI,
    functionName: "getPosition",
    args: [marketIdToBytes32(marketId), userAddress],
  });
}

export async function getClaimableAmount(
  vaultAddress: Address,
  marketId: string,
  userAddress: Address
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: vaultAddress,
    abi: KIAI_VAULT_ABI,
    functionName: "claimableAmount",
    args: [marketIdToBytes32(marketId), userAddress],
  });
}

// ---------------------------------------------------------------------------
// Structured error types
// ---------------------------------------------------------------------------

export type ExecutionError =
  | { kind: "simulation_failed"; message: string; data?: string }
  | { kind: "wallet_rejected"; message: string }
  | { kind: "chain_failed"; txHash: Hash; message: string }
  | { kind: "receipt_timeout"; txHash: Hash }
  | { kind: "rpc_error"; message: string };

export type ExecutionResult =
  | { ok: true; txHash: Hash; blockNumber: bigint; gasUsed: bigint }
  | { ok: false; error: ExecutionError };

// ---------------------------------------------------------------------------
// Operator write: create market on-chain
// ---------------------------------------------------------------------------

/**
 * Creates a market on the KIAIVault contract.
 * Requires operator wallet (DEPLOYER_PRIVATE_KEY).
 *
 * @param vaultAddress The deployed KIAIVault address
 * @param marketId Backend market ID string (will be keccak256'd)
 */
export async function createMarketOnChain(
  vaultAddress: Address,
  marketId: string
): Promise<ExecutionResult> {
  const marketIdBytes32 = marketIdToBytes32(marketId);
  const client = getPublicClient();

  try {
    // Preflight: simulate before broadcast
    const walletClient = getOperatorWalletClient();
    await client.simulateContract({
      address: vaultAddress,
      abi: KIAI_VAULT_ABI,
      functionName: "createMarket",
      args: [marketIdBytes32],
      account: walletClient.account,
    });

    // Broadcast
    const txHash = await walletClient.writeContract({
      address: vaultAddress,
      abi: KIAI_VAULT_ABI,
      functionName: "createMarket",
      args: [marketIdBytes32],
    });

    // Wait for receipt
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status !== "success") {
      return {
        ok: false,
        error: {
          kind: "chain_failed",
          txHash,
          message: "Transaction reverted on-chain",
        },
      };
    }

    return {
      ok: true,
      txHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (err) {
    return mapError(err);
  }
}

// ---------------------------------------------------------------------------
// Operator write: resolve market on-chain
// ---------------------------------------------------------------------------

export async function resolveMarketOnChain(
  vaultAddress: Address,
  marketId: string,
  winningOutcomeSlug: string,
  totalWinningShares: bigint
): Promise<ExecutionResult> {
  const marketIdBytes32 = marketIdToBytes32(marketId);
  const winningOutcomeId = outcomeSlugToBytes32(winningOutcomeSlug);
  const client = getPublicClient();

  try {
    const walletClient = getOperatorWalletClient();

    await client.simulateContract({
      address: vaultAddress,
      abi: KIAI_VAULT_ABI,
      functionName: "resolveMarket",
      args: [marketIdBytes32, winningOutcomeId, winningOutcomeSlug, totalWinningShares],
      account: walletClient.account,
    });

    const txHash = await walletClient.writeContract({
      address: vaultAddress,
      abi: KIAI_VAULT_ABI,
      functionName: "resolveMarket",
      args: [marketIdBytes32, winningOutcomeId, winningOutcomeSlug, totalWinningShares],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status !== "success") {
      return {
        ok: false,
        error: { kind: "chain_failed", txHash, message: "Resolve reverted" },
      };
    }

    return {
      ok: true,
      txHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (err) {
    return mapError(err);
  }
}

// ---------------------------------------------------------------------------
// Error mapper
// ---------------------------------------------------------------------------

function mapError(err: unknown): { ok: false; error: ExecutionError } {
  const message =
    err instanceof Error ? err.message : "Unknown execution error";

  // Viem ContractFunctionExecutionError (simulation failed)
  if (message.includes("ContractFunctionExecutionError") || message.includes("reverted")) {
    return {
      ok: false,
      error: { kind: "simulation_failed", message },
    };
  }

  // User rejection
  if (
    message.includes("UserRejected") ||
    message.includes("User rejected") ||
    message.includes("denied")
  ) {
    return { ok: false, error: { kind: "wallet_rejected", message } };
  }

  // RPC / network errors
  return { ok: false, error: { kind: "rpc_error", message } };
}
