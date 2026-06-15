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
import { injected } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { suiDAppKit } from "@/lib/providers/sui-dapp-kit";

// ---------------------------------------------------------------------------
// wagmi config — Base Sepolia testnet
// ---------------------------------------------------------------------------

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DAppKitProvider dAppKit={suiDAppKit}>{children}</DAppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
