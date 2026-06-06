export type ArchiveRecord = Record<string, unknown>;

const INTERNAL_ARCHIVE_PREFIX = "/api/admin/evidence-archive/";

export function getInspectableArchiveUrl(record: ArchiveRecord) {
  const archiveUrl = record.archiveUrl;

  if (
    typeof archiveUrl === "string" &&
    archiveUrl.startsWith(INTERNAL_ARCHIVE_PREFIX)
  ) {
    return archiveUrl;
  }

  return null;
}

export function hasInspectableArchive(record: ArchiveRecord) {
  return getInspectableArchiveUrl(record) !== null;
}
