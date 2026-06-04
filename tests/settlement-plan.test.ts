import assert from "node:assert/strict";
import {
  decimalToScaledBigInt,
  planSettlementAction,
} from "@/lib/domain/settlement-plan";

assert.deepEqual(
  planSettlementAction({
    payoutMode: "winner_take_all",
    refundPolicy: "none",
    finalOutcome: "yes",
  }),
  { supported: true, action: "RESOLVE" }
);

assert.deepEqual(
  planSettlementAction({
    payoutMode: "void_refund",
    refundPolicy: "full_refund",
    finalOutcome: null,
  }),
  { supported: true, action: "CANCEL" }
);

assert.equal(
  planSettlementAction({
    payoutMode: "winner_take_all",
    refundPolicy: "none",
    finalOutcome: null,
  }).supported,
  false
);

assert.equal(
  planSettlementAction({
    payoutMode: "split_50_50",
    refundPolicy: "none",
    finalOutcome: null,
  }).supported,
  false
);

assert.equal(decimalToScaledBigInt({ toString: () => "1" }), 1_000_000_000_000_000_000n);
assert.equal(decimalToScaledBigInt({ toString: () => "2.5" }), 2_500_000_000_000_000_000n);
assert.equal(decimalToScaledBigInt({ toString: () => "0.000000000000000001" }), 1n);

assert.throws(
  () => decimalToScaledBigInt({ toString: () => "-1" }),
  /non-negative/
);

console.log("settlement-plan tests passed");
