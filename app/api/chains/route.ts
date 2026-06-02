/**
 * GET /api/chains
 * Returns available chains and their verified collateral assets.
 * Used by the trade ticket to populate the chain selector.
 *
 * These addresses are sourced from docs/RESEARCH.md Phase 1 Source Audit (2026-06-02).
 * Any address change requires a new source audit entry before deploying.
 */

import { NextResponse } from "next/server";

export interface ChainInfo {
  chain: "BASE" | "SUI";
  name: string;
  network: string;
  rpcUrl: string;
  collateral: {
    symbol: string;
    address: string;
    decimals: number;
  };
  available: boolean;
}

const CHAINS: ChainInfo[] = [
  {
    chain: "BASE",
    name: "Base",
    network: "base-sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    collateral: {
      symbol: "USDC",
      // Circle official Base Sepolia USDC — verified 2026-06-02
      address:
        process.env.BASE_SEPOLIA_USDC_ADDRESS ??
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      decimals: 6,
    },
    available: true,
  },
  {
    chain: "SUI",
    name: "Sui",
    network: "sui-testnet",
    rpcUrl:
      process.env.SUI_TESTNET_RPC_URL ?? "https://fullnode.testnet.sui.io:443",
    collateral: {
      symbol: "USDC",
      // Circle official Sui Testnet USDC — verified 2026-06-02
      address:
        process.env.SUI_TESTNET_USDC_TYPE ??
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
      decimals: 6,
    },
    available: true,
  },
];

export async function GET() {
  return NextResponse.json({ chains: CHAINS });
}
