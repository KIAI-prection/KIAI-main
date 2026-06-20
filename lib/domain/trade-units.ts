import type { Chain } from "@prisma/client";

const USDC_DECIMALS = 6;
const BASE_SHARE_DECIMALS = 18;
const SUI_SHARE_DECIMALS = 6;

function decimalToUnits(value: number | string, decimals: number): bigint {
  const normalized =
    typeof value === "number" ? value.toFixed(decimals + 4) : value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Expected a positive decimal value.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const scale = BigInt("1" + "0".repeat(decimals));
  return BigInt(whole) * scale + BigInt(padded || "0");
}

function unitsToDecimal(value: bigint | string, decimals: number): number {
  return Number(BigInt(value)) / 10 ** decimals;
}

export function usdToUsdcUnits(amountUsd: number | string): bigint {
  return decimalToUnits(amountUsd, USDC_DECIMALS);
}

export function sharesToBaseUnits(shares: number | string): bigint {
  return decimalToUnits(shares, BASE_SHARE_DECIMALS);
}

export function sharesToSuiUnits(shares: number | string): bigint {
  return decimalToUnits(shares, SUI_SHARE_DECIMALS);
}

export function sharesToChainUnits(
  chain: Chain | "BASE" | "SUI",
  shares: number | string
): bigint {
  return chain === "SUI" ? sharesToSuiUnits(shares) : sharesToBaseUnits(shares);
}

export function chainShareUnitsToDecimal(
  chain: Chain | "BASE" | "SUI",
  raw: bigint | string
): number {
  return unitsToDecimal(
    raw,
    chain === "SUI" ? SUI_SHARE_DECIMALS : BASE_SHARE_DECIMALS
  );
}

export function usdcUnitsToUsd(raw: bigint | string): number {
  return unitsToDecimal(raw, USDC_DECIMALS);
}
