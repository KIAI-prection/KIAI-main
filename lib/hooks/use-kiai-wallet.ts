"use client";

/**
 * useKIAIWallet — unified wallet state hook.
 *
 * Returns the connected wallet address and chain for both EVM and Sui.
 * Used by the trade panel and portfolio to know which address to use.
 *
 * Architecture: chain is a payment rail choice.
 * The market is the same regardless of which chain is selected.
 */

import { useAccount } from "wagmi";
import { useCurrentAccount } from "@mysten/dapp-kit";

export interface KIAIWalletState {
  /** Currently selected chain */
  chain: "BASE" | "SUI" | null;
  /** Wallet address for the selected chain */
  walletAddress: string | null;
  /** Whether any wallet is connected */
  isConnected: boolean;
  /** EVM (Base) wallet address if connected */
  baseAddress: string | null;
  /** Sui wallet address if connected */
  suiAddress: string | null;
}

export function useKIAIWallet(
  preferredChain: "BASE" | "SUI" = "BASE"
): KIAIWalletState {
  const { address: baseAddress, isConnected: baseConnected } = useAccount();
  const suiAccount = useCurrentAccount();

  const suiAddress = suiAccount?.address ?? null;
  const suiConnected = !!suiAddress;

  // Determine active chain and address
  let chain: "BASE" | "SUI" | null = null;
  let walletAddress: string | null = null;

  if (preferredChain === "BASE" && baseConnected && baseAddress) {
    chain = "BASE";
    walletAddress = baseAddress.toLowerCase();
  } else if (preferredChain === "SUI" && suiConnected && suiAddress) {
    chain = "SUI";
    walletAddress = suiAddress.toLowerCase();
  } else if (baseConnected && baseAddress) {
    chain = "BASE";
    walletAddress = baseAddress.toLowerCase();
  } else if (suiConnected && suiAddress) {
    chain = "SUI";
    walletAddress = suiAddress.toLowerCase();
  }

  return {
    chain,
    walletAddress,
    isConnected: baseConnected || suiConnected,
    baseAddress: baseAddress?.toLowerCase() ?? null,
    suiAddress: suiAddress?.toLowerCase() ?? null,
  };
}
