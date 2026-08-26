import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clerkFrontendApiHost,
  isCloudApiPath,
  accountChipLabel,
  formatClerkLoginLine,
  setCloudProfileCache,
  getCloudProfileCache,
} from "./auth.js";

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
  it("routes Cloud save/health/board/device to portal", () => {
    assert.equal(isCloudApiPath("/api/me"), true);
    assert.equal(isCloudApiPath("/api/me/runs?kind=lesson"), true);
    assert.equal(isCloudApiPath("/api/daily"), false);
    assert.equal(isCloudApiPath("/api/board"), true);
    assert.equal(isCloudApiPath("/api/board/lesson-1"), true);
    assert.equal(isCloudApiPath("/api/board/lesson-1/still/user_abc"), true);
    assert.equal(isCloudApiPath("/api/me/quests/lesson-1/score"), true);
    assert.equal(isCloudApiPath("/api/health"), true);
    assert.equal(isCloudApiPath("/api/device/start"), true);
    assert.equal(isCloudApiPath("/api/device/status?code=abc"), true);
    assert.equal(isCloudApiPath("/api/co-invent"), false);
    assert.equal(isCloudApiPath("/api/quests"), false);
    assert.equal(isCloudApiPath("/api/rooms"), false);
  });
});

describe("accountChipLabel", () => {
  it("prefers display name, then username, never email", () => {
    assert.equal(accountChipLabel({ displayName: "Ada", username: "ada" }), "Ada");
    assert.equal(accountChipLabel({ displayName: "", username: "ada_lovelace" }), "ada_lovelace");
    assert.equal(accountChipLabel({ displayName: "me@x.com", username: "ada" }), "ada");
    assert.equal(accountChipLabel({ displayName: "", username: "me@x.com" }), "Account");
    assert.equal(accountChipLabel(null), "Account");
    assert.equal(
      accountChipLabel({
        displayName: "Ada",
        login: { email: "you@example.com", providers: ["Google"] },
      }),
      "Ada"
    );
  });
});

describe("formatClerkLoginLine", () => {
  it("paints email and providers, or email only", () => {
    assert.equal(
      formatClerkLoginLine({ email: "you@example.com", providers: ["Google"] }),
      "Signed in as you@example.com · Google"
    );
    assert.equal(
      formatClerkLoginLine({ email: "you@example.com", providers: [] }),
      "Signed in as you@example.com"
    );
    assert.equal(formatClerkLoginLine(null), "");
  });
});

describe("setCloudProfileCache", () => {
  it("does not keep login or email for the title chip", () => {
    setCloudProfileCache({
      displayName: "Ada",
      username: "ada",
      login: { email: "you@example.com", providers: ["Google"] },
      email: "you@example.com",
    });
    const cached = getCloudProfileCache();
    assert.equal("login" in cached, false);
    assert.equal("email" in cached, false);
    assert.equal(accountChipLabel(), "Ada");
    setCloudProfileCache(null);
  });
});
