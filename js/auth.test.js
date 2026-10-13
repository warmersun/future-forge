import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clerkFrontendApiHost,
  accountPortalHost,
  accountPortalSignInUrl,
  accountPortalUserUrl,
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

describe("account portal urls", () => {
  function pk(prefix, host) {
    return `${prefix}_${Buffer.from(`${host}$`, "utf8").toString("base64")}`;
  }

  it("maps a development Frontend API host to accounts.dev", () => {
    const key = pk("pk_test", "foo-12.clerk.accounts.dev");
    assert.equal(accountPortalHost(key), "foo-12.accounts.dev");
  });

  it("maps clerk.warmersun.com to the production Account Portal", () => {
    const key = pk("pk_live", "clerk.warmersun.com");
    assert.equal(accountPortalHost(key), "accounts.warmersun.com");
    const signIn = new URL(accountPortalSignInUrl(key, "https://ff.warmersun.com/?q=a"));
    assert.equal(signIn.origin + signIn.pathname, "https://accounts.warmersun.com/sign-in");
    assert.equal(signIn.searchParams.get("redirect_url"), "https://ff.warmersun.com/?q=a");
    assert.equal(accountPortalUserUrl(key), "https://accounts.warmersun.com/user");
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
    assert.equal(isCloudApiPath("/api/co-invent-voice/session"), false);
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
