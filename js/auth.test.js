import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clerkFrontendApiHost } from "./auth.js";

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
