/**
 * GET /api/chains
 * Returns available chains and their verified collateral assets.
 * Used by the trade ticket to populate the chain selector.
 *
 * These addresses are sourced from docs/RESEARCH.md mainnet source audit.
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
    network: "base-mainnet",
    rpcUrl: process.env.BASE_MAINNET_RPC_URL ?? "https://mainnet.base.org",
    collateral: {
      symbol: "USDC",
      // Circle official Base Mainnet USDC.
      address:
        process.env.BASE_MAINNET_USDC_ADDRESS ??
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
    available: true,
  },
  {
    chain: "SUI",
    name: "Sui",
    network: "sui-mainnet",
    rpcUrl:
      process.env.SUI_MAINNET_RPC_URL ?? "https://fullnode.mainnet.sui.io:443",
    collateral: {
      symbol: "USDC",
      // Circle official Sui Mainnet USDC.
      address:
        process.env.SUI_MAINNET_USDC_TYPE ??
        "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      decimals: 6,
    },
    available: true,
  },
];

export async function GET() {
  return NextResponse.json({ chains: CHAINS });
}
