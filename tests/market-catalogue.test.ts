import assert from "node:assert/strict";
import {
  DEMO_MARKETS,
  DEMO_MARKET_SLUGS,
  SUPERSEDED_DEMO_MARKET_SLUGS,
} from "@/lib/market-catalogue/demo-markets";
import { assertMarketResolutionPolicyReady } from "@/lib/domain/market-resolution-policy";

const phase9Start = new Date("2026-06-05T00:00:00Z");
const expectedSlugs = [
  "nagoya-basho-2026-winner",
  "yokozuna-terunofuji-nagoya-2026-record",
  "summer-koshien-2026-winner",
  "npb-central-league-pennant-2026",
  "japan-house-councillors-2028-coalition-majority",
  "epl-2026-27-opening-weekend-featured-match",
  "f1-abu-dhabi-gp-2026-winner",
  "akutagawa-prize-2026-second-half",
];

assert.deepEqual(DEMO_MARKET_SLUGS, expectedSlugs);
assert.equal(DEMO_MARKETS.length, 8);
assert.equal(new Set(DEMO_MARKET_SLUGS).size, DEMO_MARKET_SLUGS.length);
for (const supersededSlug of SUPERSEDED_DEMO_MARKET_SLUGS) {
  assert.equal(
    DEMO_MARKET_SLUGS.includes(supersededSlug),
    false,
    supersededSlug
  );
}

for (const market of DEMO_MARKETS) {
  assert.equal(market.outcomes.length >= 2, true, market.slug);
  assert.equal(market.sourcePolicyEn.length > 20, true, market.slug);
  assert.equal(market.closeAt > phase9Start, true, market.slug);
  assert.deepEqual(
    market.chainDeploymentPlan.map((deployment) => deployment.chain).sort(),
    ["BASE", "SUI"],
    market.slug
  );
  assert.deepEqual(
    market.chainDeploymentPlan.map((deployment) => deployment.collateral).sort(),
    ["USDC_BASE_SEPOLIA", "USDC_SUI_TESTNET"],
    market.slug
  );

  const policy = assertMarketResolutionPolicyReady(market.resolutionPolicy);
  assert.equal(policy.resolutionRule.question, market.titleEn, market.slug);
  assert.equal(policy.resolutionRule.primarySource.length > 5, true, market.slug);
  assert.equal(policy.resolutionRule.sourcePriority.length >= 1, true, market.slug);
  assert.equal(policy.resolutionRule.unresolvablePolicy, "void_refund", market.slug);
  assert.equal(policy.sourceCertaintyPolicy, "official_only", market.slug);
  assert.equal(policy.resolverMode, "operator_snapshot", market.slug);

  const outcomeMapping = policy.resolutionRule.outcomeMapping ?? {};
  for (const outcome of market.outcomes) {
    assert.equal(outcomeMapping[outcome.slug], outcome.slug, market.slug);
  }
}

console.log("market-catalogue tests passed");
