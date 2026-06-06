import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  archiveEvidencePayload,
  evidenceArchivePath,
  readEvidenceArchive,
} from "@/lib/server/evidence-archive";

async function main() {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "kiai-evidence-archive-")
  );
  process.env.RESOLUTION_EVIDENCE_ARCHIVE_DIR = tempDir;

  try {
    const rawPayload = {
      winner: "terunofuji",
      source: "official",
      status: "official_confirmed",
    };
    const payloadHash = `0x${createHash("sha256")
      .update(JSON.stringify(rawPayload))
      .digest("hex")}`;

    const archived = await archiveEvidencePayload({
      payloadHash,
      rawPayload,
      metadata: {
        marketId: "market_1",
        resolutionId: "resolution_1",
        kind: "OFFICIAL_SOURCE",
        sourceName: "JSA official result",
        sourceUrl: "https://www.sumo.or.jp/EnHonbashoMain/",
        capturedBy: "op:test",
      },
    });

    assert.equal(archived.payloadHash, payloadHash);
    assert.equal(
      archived.archiveUrl,
      `/api/admin/evidence-archive/${payloadHash}`
    );
    assert.equal(archived.storagePath.startsWith(tempDir), true);
    assert.equal(
      archived.relativePath.endsWith(`${payloadHash.slice(2)}.json`),
      true
    );

    const archivePath = evidenceArchivePath(payloadHash.toUpperCase());
    assert.equal(archivePath.storagePath, archived.storagePath);

    const readArchive = await readEvidenceArchive(payloadHash);
    assert.equal(readArchive.artifact.schemaVersion, 1);
    assert.equal(readArchive.artifact.payloadHash, payloadHash);
    assert.deepEqual(readArchive.artifact.rawPayload, rawPayload);
    assert.equal(readArchive.artifact.metadata.marketId, "market_1");
    assert.equal(readArchive.artifact.metadata.capturedBy, "op:test");

    assert.throws(() => evidenceArchivePath("../../bad"), /32-byte hex/);
  } finally {
    delete process.env.RESOLUTION_EVIDENCE_ARCHIVE_DIR;
    await rm(tempDir, { recursive: true, force: true });
  }

  console.log("evidence-archive tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
