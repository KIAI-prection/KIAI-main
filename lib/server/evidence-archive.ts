import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { toPrismaJson } from "@/lib/server/json";

const HASH_REGEX = /^(0x)?[a-f0-9]{64}$/i;
const ARCHIVE_SCHEMA_VERSION = 1;

export type EvidenceArchiveMetadata = {
  marketId: string;
  resolutionId: string;
  kind: string;
  sourceName: string;
  sourceUrl?: string;
  capturedBy: string;
};

export type EvidenceArchiveArtifact = {
  schemaVersion: number;
  payloadHash: string;
  archivedAt: string;
  metadata: EvidenceArchiveMetadata;
  rawPayload: unknown;
};

export type EvidenceArchiveRecord = {
  payloadHash: string;
  archiveUrl: string;
  storagePath: string;
  relativePath: string;
};

export function evidenceArchiveRoot() {
  return (
    process.env.RESOLUTION_EVIDENCE_ARCHIVE_DIR ??
    path.join(process.cwd(), ".kiai", "evidence-archive")
  );
}

export function normalizeEvidenceHash(payloadHash: string) {
  if (!HASH_REGEX.test(payloadHash)) {
    throw new Error("Evidence archive hash must be a 32-byte hex string.");
  }

  return payloadHash.toLowerCase();
}

export function evidenceArchiveUrl(payloadHash: string) {
  return `/api/admin/evidence-archive/${normalizeEvidenceHash(payloadHash)}`;
}

export function evidenceArchivePath(payloadHash: string) {
  const normalizedHash = normalizeEvidenceHash(payloadHash);
  const hashWithoutPrefix = normalizedHash.startsWith("0x")
    ? normalizedHash.slice(2)
    : normalizedHash;
  const relativePath = path.join(
    hashWithoutPrefix.slice(0, 2),
    `${hashWithoutPrefix}.json`
  );

  return {
    payloadHash: normalizedHash,
    relativePath,
    storagePath: path.join(evidenceArchiveRoot(), relativePath),
  };
}

export async function archiveEvidencePayload(input: {
  payloadHash: string;
  rawPayload: unknown;
  metadata: EvidenceArchiveMetadata;
}): Promise<EvidenceArchiveRecord> {
  const archivePath = evidenceArchivePath(input.payloadHash);
  const artifact: EvidenceArchiveArtifact = {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    payloadHash: archivePath.payloadHash,
    archivedAt: new Date().toISOString(),
    metadata: input.metadata,
    rawPayload: toPrismaJson(input.rawPayload),
  };

  await mkdir(path.dirname(archivePath.storagePath), { recursive: true });
  await writeFile(
    archivePath.storagePath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );

  return {
    ...archivePath,
    archiveUrl: evidenceArchiveUrl(archivePath.payloadHash),
  };
}

export async function readEvidenceArchive(payloadHash: string) {
  const archivePath = evidenceArchivePath(payloadHash);
  const contents = await readFile(archivePath.storagePath, "utf8");

  return {
    ...archivePath,
    artifact: JSON.parse(contents) as EvidenceArchiveArtifact,
  };
}
