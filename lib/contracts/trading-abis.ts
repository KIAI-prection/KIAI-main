import { keccak256, parseAbi, toBytes } from "viem";

export const KIAI_VAULT_TRADE_ABI = parseAbi([
  "function deposit(bytes32 marketId, bytes32 outcomeId, string calldata outcomeSlug, uint256 usdcAmount, uint256 shares) external",
]);

export const ERC20_TRADE_ABI = parseAbi([
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

export function marketIdToBytes32(marketId: string): `0x${string}` {
  return keccak256(toBytes(marketId));
}

export function outcomeSlugToBytes32(outcomeSlug: string): `0x${string}` {
  return keccak256(toBytes(outcomeSlug));
}
