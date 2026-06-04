import assert from "node:assert/strict";
import "dotenv/config";
import {
  canOpenResolutionDispute,
  createSnapshotHash,
  EvidenceSnapshotInputSchema,
  OpenResolutionDisputeInputSchema,
  OracleAssertionInputSchema,
} from "@/lib/domain/resolution-governance";

assert.equal(
  createSnapshotHash({ b: 2, a: 1 }),
  createSnapshotHash({ a: 1, b: 2 })
);

assert.equal(canOpenResolutionDispute("PENDING"), false);
assert.equal(canOpenResolutionDispute("PROPOSED"), false);
assert.equal(canOpenResolutionDispute("DISPUTE_WINDOW"), true);
assert.equal(canOpenResolutionDispute("DISPUTED"), true);
assert.equal(canOpenResolutionDispute("ADJUDICATING"), true);
assert.equal(canOpenResolutionDispute("FINAL"), false);

assert.throws(
  () =>
    EvidenceSnapshotInputSchema.parse({
      kind: "OFFICIAL_SOURCE",
      sourceName: "JSA official result",
    }),
  /payloadHash or rawPayload/
);

const snapshot = EvidenceSnapshotInputSchema.parse({
  kind: "OFFICIAL_SOURCE",
  sourceName: "JSA official result",
  sourceUrl: "https://www.sumo.or.jp/EnHonbashoMain/",
  rawPayload: { winner: "Terunofuji", status: "official_confirmed" },
  observedOutcome: "terunofuji",
  providerEventStatus: "official_confirmed",
  sourceCertainty: "official_confirmed",
});

assert.equal(snapshot.status, "CAPTURED");
assert.equal(snapshot.kind, "OFFICIAL_SOURCE");

const dispute = OpenResolutionDisputeInputSchema.parse({
  reason: "SOURCE_DISAGREEMENT",
  summary:
    "Official source and API prefill disagree; operator review is required.",
  evidence: { official: "terunofuji", api: "hoshoryu" },
});

assert.equal(dispute.reason, "SOURCE_DISAGREEMENT");

const oracleAssertion = OracleAssertionInputSchema.parse({
  provider: "uma_oo_v3",
  status: "DISPUTED",
  assertionId: "0xassertion",
  bond: "100 USDC",
  livenessSeconds: 7200,
  assertedOutcome: "terunofuji",
});

assert.equal(oracleAssertion.status, "DISPUTED");
assert.equal(oracleAssertion.livenessSeconds, 7200);

console.log("resolution-governance tests passed");
