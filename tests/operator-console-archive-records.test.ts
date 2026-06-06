import assert from "node:assert/strict";
import {
  getInspectableArchiveUrl,
  hasInspectableArchive,
} from "@/lib/operator-console/archive-records";

const internalArchive = {
  archiveUrl:
    "/api/admin/evidence-archive/0x1111111111111111111111111111111111111111111111111111111111111111",
};

assert.equal(
  getInspectableArchiveUrl(internalArchive),
  internalArchive.archiveUrl
);
assert.equal(hasInspectableArchive(internalArchive), true);

assert.equal(
  getInspectableArchiveUrl({
    archiveUrl: "https://example.com/archive.json",
  }),
  null
);
assert.equal(hasInspectableArchive({ archiveUrl: null }), false);
assert.equal(hasInspectableArchive({}), false);

console.log("operator-console-archive-records tests passed");
