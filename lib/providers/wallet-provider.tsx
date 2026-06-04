"use client";

/**
 * KIAI Wallet Provider
 *
 * Provides EVM (wagmi) and Sui (dApp Kit) wallet contexts.
 * Invisible to the user — pure state management.
 *
 * EVM: wagmi with Base Sepolia as the default chain.
 * Sui: @mysten/dapp-kit connected to Sui Testnet.
 *
 * Architecture: Base and Sui are payment rails only.
 * The wallet provider just surfaces which wallets are connected;
 * the trade flow calls the backend API for quotes and orders.
 */

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from "@mysten/dapp-kit";

// ---------------------------------------------------------------------------
// wagmi config — Base Sepolia testnet
// ---------------------------------------------------------------------------

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});

const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Sui network config — Testnet (hardcoded — getFullnodeUrl not available in this SDK version)
// ---------------------------------------------------------------------------

const suiNetworks = {
  testnet: {
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
  },
} as const;

// ---------------------------------------------------------------------------
// Combined provider wrapper
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="testnet">
          <SuiWalletProvider autoConnect={false}>
            {children}
          </SuiWalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
