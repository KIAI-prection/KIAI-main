import assert from "node:assert/strict";
import {
  prepareSuiDepositTransaction,
  type SuiDepositPrepOrder,
} from "@/lib/server/sui-deposit-prep";

const now = new Date("2026-06-13T00:00:00.000Z");
const walletAddress = "0xabc";

function makeOrder(overrides: Partial<SuiDepositPrepOrder> = {}): SuiDepositPrepOrder {
  return {
    id: "order_1",
    chain: "SUI",
    walletAddress,
    outcomeId: "outcome_1",
    quote: {
      expiresAt: new Date("2026-06-13T00:05:00.000Z"),
      status: "ready",
      totalCostUsd: 12.345678,
      sharesOut: 7.5,
    },
    market: {
      lifecycle: "LIVE",
      outcomes: [{ id: "outcome_1", slug: "home-win" }],
      chainDeployments: [{ deployStatus: "deployed", poolAddress: "0xsui_market" }],
    },
    ...overrides,
  };
}

function makeDeps(order: SuiDepositPrepOrder | null) {
  return {
    findOrder: async () => order,
    markWalletPending: async (id: string) => ({ id, status: "WALLET_PENDING" }),
    buildTransaction: async (
      marketObjectId: string,
      outcomeSlug: string,
      usdcAmount: bigint,
      shares: bigint,
      sender: string
    ) =>
      JSON.stringify({
        marketObjectId,
        outcomeSlug,
        usdcAmount: usdcAmount.toString(),
        shares: shares.toString(),
        sender,
      }),
  };
}

async function main() {
  let result = await prepareSuiDepositTransaction(
    { id: "order_1", walletAddress: "", now },
    makeDeps(makeOrder())
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "validation_error");

  result = await prepareSuiDepositTransaction(
    { id: "order_1", walletAddress, now },
    makeDeps(makeOrder({ chain: "BASE" }))
  );
  assert.equal(result.ok, false);
  assert.equal(result.body.error, "wrong_chain");

  result = await prepareSuiDepositTransaction(
    { id: "order_1", walletAddress, now },
    makeDeps(
      makeOrder({
        market: {
          lifecycle: "LIVE",
          outcomes: [{ id: "outcome_1", slug: "home-win" }],
          chainDeployments: [{ deployStatus: "not_deployed", poolAddress: null }],
        },
      })
    )
  );
  assert.equal(result.ok, false);
  assert.equal(result.body.error, "chain_unavailable");

  result = await prepareSuiDepositTransaction(
    { id: "order_1", walletAddress, now },
    makeDeps(
      makeOrder({
        quote: {
          expiresAt: new Date("2026-06-12T23:59:00.000Z"),
          status: "ready",
          totalCostUsd: 12,
          sharesOut: 7,
        },
      })
    )
  );
  assert.equal(result.ok, false);
  assert.equal(result.body.error, "quote_expired");

  result = await prepareSuiDepositTransaction(
    { id: "order_1", walletAddress: "0xABC", now },
    makeDeps(makeOrder())
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    const transaction = JSON.parse(result.body.transaction);
    assert.equal(transaction.marketObjectId, "0xsui_market");
    assert.equal(transaction.outcomeSlug, "home-win");
    assert.equal(transaction.usdcAmount, "12345678");
    assert.equal(transaction.shares, "7500000");
    assert.equal(transaction.sender, walletAddress);
    assert.equal(result.body.order.status, "WALLET_PENDING");
    assert.deepEqual(result.body.units, { usdcAmount: "12345678", shares: "7500000" });
  }

  console.log("sui-deposit-prep tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
