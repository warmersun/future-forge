import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeUsername,
  parseProfilePatch,
  publicInventorPage,
  parseShareBody,
  parseReportBody,
} from "./profile.mjs";

describe("sanitizeUsername", () => {
  it("accepts lowercase slugs", () => {
    assert.equal(sanitizeUsername("Sic"), "sic");
    assert.equal(sanitizeUsername("ab"), null);
    assert.equal(sanitizeUsername("Has Space"), null);
  });
});

describe("parseProfilePatch", () => {
  it("defaults stay private unless public true", () => {
    const p = parseProfilePatch({ username: "tamas", bio: "hi", public: true });
    assert.equal(p.ok, true);
    assert.equal(p.patch.isPublic, true);
  });
  it("rejects email as display name", () => {
    assert.equal(parseProfilePatch({ displayName: "a@b.com" }).ok, false);
  });
});

describe("publicInventorPage", () => {
  it("null when private", () => {
    assert.equal(publicInventorPage({ username: "sic", isPublic: false }), null);
  });
  it("never includes email", () => {
    const page = publicInventorPage(
      { username: "sic", isPublic: true, displayName: "Tamas", bio: "yo", email: "x@y.z" },
      [{ questId: "q1", place: "Accra", yearReached: 2034 }]
    );
    assert.equal(page.username, "sic");
    assert.equal("email" in page, false);
    assert.equal(page.holds[0].place, "Accra");
  });
});

describe("parseReportBody", () => {
  it("requires a reason and never stores email", () => {
    assert.equal(parseReportBody({ username: "sic" }).ok, false);
    const r = parseReportBody({ username: "sic", reason: "off-topic", email: "x@y.z" });
    assert.equal(r.ok, true);
    assert.equal("email" in r, false);
  });
});

describe("parseShareBody", () => {
  it("requires uuid", () => {
    assert.equal(parseShareBody({ runId: "nope" }).ok, false);
    assert.equal(
      parseShareBody({ runId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", share: true }).ok,
      true
    );
  });
});
