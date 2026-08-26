import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clerkFrontendApiHost, isCloudApiPath } from "./auth.js";

describe("clerkFrontendApiHost", () => {
  it("decodes the FAPI host from a publishable key", () => {
    const host = "foo-12.clerk.accounts.dev";
    const pk = `pk_test_${Buffer.from(`${host}$`, "utf8").toString("base64")}`;
    assert.equal(clerkFrontendApiHost(pk), host);
  });

  it("rejects junk keys", () => {
    assert.throws(() => clerkFrontendApiHost("pk_test"), /Invalid/);
    assert.throws(() => clerkFrontendApiHost(""), /Invalid/);
  });
});

describe("isCloudApiPath", () => {
  it("routes Cloud save/Daily/health to portal", () => {
    assert.equal(isCloudApiPath("/api/me"), true);
    assert.equal(isCloudApiPath("/api/me/runs?kind=daily"), true);
    assert.equal(isCloudApiPath("/api/daily"), true);
    assert.equal(isCloudApiPath("/api/health"), true);
    assert.equal(isCloudApiPath("/api/co-invent"), false);
    assert.equal(isCloudApiPath("/api/quests"), false);
    assert.equal(isCloudApiPath("/api/rooms"), false);
  });
});
