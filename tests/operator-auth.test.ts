import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { operatorId } from "@/lib/server/operator-auth";

const token = "super-secret-operator-token-that-must-not-leak";
const request = new NextRequest("http://localhost/api/admin/markets", {
  headers: { Authorization: `Bearer ${token}` },
});

const expectedDigest = createHash("sha256").update(token).digest("hex").slice(0, 12);
const id = operatorId(request);

assert.equal(id, `op:${expectedDigest}`);
assert.equal(id.includes(token), false);
assert.equal(id.includes(token.slice(0, 8)), false);

const missingTokenId = operatorId(
  new NextRequest("http://localhost/api/admin/markets")
);

assert.match(missingTokenId, /^op:[a-f0-9]{12}$/);
assert.notEqual(missingTokenId, id);

console.log("operator-auth tests passed");
