import assert from "node:assert/strict";
import {
  chainShareUnitsToDecimal,
  sharesToBaseUnits,
  sharesToSuiUnits,
  usdToUsdcUnits,
  usdcUnitsToUsd,
} from "@/lib/domain/trade-units";

assert.equal(usdToUsdcUnits(10).toString(), "10000000");
assert.equal(usdToUsdcUnits("10.1234567").toString(), "10123456");
assert.equal(usdcUnitsToUsd("10123456"), 10.123456);

assert.equal(
  sharesToBaseUnits("16.666666666666666666").toString(),
  "16666666666666666666"
);
assert.equal(sharesToSuiUnits("16.6666667").toString(), "16666666");

assert.ok(
  Math.abs(chainShareUnitsToDecimal("BASE", "16666666666666666666") - 16.666666666666666) <
    0.00000000000001
);
assert.equal(chainShareUnitsToDecimal("SUI", "16666666"), 16.666666);

console.log("trade-units tests passed");
