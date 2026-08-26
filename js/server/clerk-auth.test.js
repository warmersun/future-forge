import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isJwtShaped,
  extractBearerToken,
  clerkKeysFromEnv,
  clerkWebhookSecretFromEnv,
  authorizedPartiesFromEnv,
  publicClerkConfig,
  normalizeClerkUserId,
  authenticateClerkRequest,
  runWithClerkIdentity,
  clerkUserIdFromContext,
  clerkProviderLabel,
  summarizeClerkLogin,
  fetchClerkLoginSummary,
} from "./clerk-auth.mjs";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsInNpZCI6InNlc3NfYWJjIn0.sig";

describe("isJwtShaped", () => {
  it("accepts compact JWTs", () => {
    assert.equal(isJwtShaped(SAMPLE_JWT), true);
  });

  it("rejects api secrets and empty", () => {
    assert.equal(isJwtShaped("s"), false);
    assert.equal(isJwtShaped("not-a-jwt"), false);
    assert.equal(isJwtShaped(""), false);
    assert.equal(isJwtShaped(null), false);
  });
});

describe("extractBearerToken", () => {
  it("reads Authorization Bearer", () => {
    assert.equal(
      extractBearerToken({ headers: { authorization: `Bearer ${SAMPLE_JWT}` } }),
      SAMPLE_JWT
    );
    assert.equal(extractBearerToken({ headers: {} }), "");
  });
});

describe("clerkKeysFromEnv", () => {
  it("disabled without both keys", () => {
    assert.equal(clerkKeysFromEnv({}).enabled, false);
    assert.equal(
      clerkKeysFromEnv({ CLERK_PUBLISHABLE_KEY: "pk_test_x" }).enabled,
      false
    );
    assert.equal(
      clerkKeysFromEnv({ CLERK_SECRET_KEY: "sk_test_x" }).enabled,
      false
    );
  });

  it("enabled with standard or FF_ aliases", () => {
    const a = clerkKeysFromEnv({
      CLERK_PUBLISHABLE_KEY: "pk_test_a",
      CLERK_SECRET_KEY: "sk_test_a",
    });
    assert.equal(a.enabled, true);
    assert.equal(a.publishableKey, "pk_test_a");
    const b = clerkKeysFromEnv({
      FF_CLERK_PUBLISHABLE_KEY: "pk_test_b",
      FF_CLERK_SECRET_KEY: "sk_test_b",
    });
    assert.equal(b.enabled, true);
    assert.equal(b.publishableKey, "pk_test_b");
  });
});

describe("clerkWebhookSecretFromEnv", () => {
  it("reads CLERK_WEBHOOK_SECRET or Clerk's SIGNING_SECRET name", () => {
    assert.equal(clerkWebhookSecretFromEnv({}), "");
    assert.equal(
      clerkWebhookSecretFromEnv({ CLERK_WEBHOOK_SECRET: "whsec_a" }),
      "whsec_a"
    );
    assert.equal(
      clerkWebhookSecretFromEnv({ CLERK_WEBHOOK_SIGNING_SECRET: "whsec_b" }),
      "whsec_b"
    );
    assert.equal(
      clerkWebhookSecretFromEnv({
        CLERK_WEBHOOK_SECRET: "whsec_a",
        CLERK_WEBHOOK_SIGNING_SECRET: "whsec_b",
      }),
      "whsec_a"
    );
  });
});

describe("authorizedPartiesFromEnv", () => {
  it("defaults include local and warmersun.com", () => {
    const parties = authorizedPartiesFromEnv({});
    assert.ok(parties.includes("http://127.0.0.1:8765"));
    assert.ok(parties.includes("https://warmersun.com"));
    assert.ok(parties.includes("https://cloud.warmersun.com"));
    assert.equal(parties.includes("https://local.warmersun.com"), false);
  });

  it("parses comma list", () => {
    assert.deepEqual(
      authorizedPartiesFromEnv({
        CLERK_AUTHORIZED_PARTIES: "https://play.example, http://localhost:8765",
      }),
      ["https://play.example", "http://localhost:8765"]
    );
  });
});

describe("publicClerkConfig", () => {
  it("omits secret", () => {
    const cfg = publicClerkConfig({
      CLERK_PUBLISHABLE_KEY: "pk_test_pub",
      CLERK_SECRET_KEY: "sk_test_secret",
    });
    assert.deepEqual(cfg, { enabled: true, publishableKey: "pk_test_pub" });
    assert.equal(JSON.stringify(cfg).includes("sk_"), false);
  });
});

describe("normalizeClerkUserId", () => {
  it("keeps Clerk user ids", () => {
    assert.equal(normalizeClerkUserId("user_2abcDEF"), "user_2abcDEF");
    assert.equal(normalizeClerkUserId(""), null);
    assert.equal(normalizeClerkUserId("bad id"), null);
  });
});

describe("authenticateClerkRequest", () => {
  const env = {
    CLERK_PUBLISHABLE_KEY: "pk_test_x",
    CLERK_SECRET_KEY: "sk_test_x",
  };

  it("unsigned when Clerk off", async () => {
    const ident = await authenticateClerkRequest(
      { headers: { authorization: `Bearer ${SAMPLE_JWT}` } },
      { env: {} }
    );
    assert.equal(ident.enabled, false);
    assert.equal(ident.signedIn, false);
  });

  it("missing token is signed out, not invalid", async () => {
    const ident = await authenticateClerkRequest({ headers: {} }, { env });
    assert.equal(ident.enabled, true);
    assert.equal(ident.signedIn, false);
    assert.equal(ident.missingToken, true);
    assert.equal(ident.invalidToken, undefined);
  });

  it("non-jwt bearer is invalid", async () => {
    const ident = await authenticateClerkRequest(
      { headers: { authorization: "Bearer s3cret" } },
      { env }
    );
    assert.equal(ident.signedIn, false);
    assert.equal(ident.invalidToken, true);
  });

  it("valid verify payload signs in", async () => {
    const ident = await authenticateClerkRequest(
      { headers: { authorization: `Bearer ${SAMPLE_JWT}` } },
      {
        env,
        verify: async () => ({ sub: "user_2abc", sid: "sess_9" }),
      }
    );
    assert.equal(ident.signedIn, true);
    assert.equal(ident.userId, "user_2abc");
    assert.equal(ident.sessionId, "sess_9");
  });

  it("verify throw → invalid token", async () => {
    const ident = await authenticateClerkRequest(
      { headers: { authorization: `Bearer ${SAMPLE_JWT}` } },
      {
        env,
        verify: async () => {
          throw new Error("bad");
        },
      }
    );
    assert.equal(ident.signedIn, false);
    assert.equal(ident.invalidToken, true);
  });
});

describe("runWithClerkIdentity", () => {
  it("exposes user id inside the store", async () => {
    assert.equal(clerkUserIdFromContext(), null);
    await runWithClerkIdentity({ userId: "user_1" }, async () => {
      assert.equal(clerkUserIdFromContext(), "user_1");
    });
    assert.equal(clerkUserIdFromContext(), null);
  });
});

describe("clerkProviderLabel", () => {
  it("maps oauth ids to short labels", () => {
    assert.equal(clerkProviderLabel("oauth_google"), "Google");
    assert.equal(clerkProviderLabel("oauth_x"), "X");
    assert.equal(clerkProviderLabel("twitter"), "X");
    assert.equal(clerkProviderLabel(""), "");
  });
});

describe("summarizeClerkLogin", () => {
  const user = {
    primaryEmailAddressId: "idn_2",
    emailAddresses: [
      { id: "idn_1", emailAddress: "alt@example.com" },
      { id: "idn_2", emailAddress: "you@example.com" },
    ],
    firstName: "Legal",
    lastName: "Name",
    externalAccounts: [{ provider: "oauth_google" }, { provider: "oauth_google" }],
  };

  it("uses primary email and unique provider labels, never names", () => {
    const login = summarizeClerkLogin(user);
    assert.deepEqual(login, { email: "you@example.com", providers: ["Google"] });
    assert.equal("firstName" in login, false);
  });

  it("falls back to first email and omits providers when email-only", () => {
    assert.deepEqual(
      summarizeClerkLogin({
        emailAddresses: [{ emailAddress: "solo@example.com" }],
        externalAccounts: [],
      }),
      { email: "solo@example.com", providers: [] }
    );
  });

  it("returns null without a usable email", () => {
    assert.equal(summarizeClerkLogin(null), null);
    assert.equal(summarizeClerkLogin({ emailAddresses: [] }), null);
    assert.equal(summarizeClerkLogin({ firstName: "Ada" }), null);
  });
});

describe("fetchClerkLoginSummary", () => {
  const env = {
    CLERK_PUBLISHABLE_KEY: "pk_test_xx",
    CLERK_SECRET_KEY: "sk_test_xx",
  };

  it("returns the summary when getUser succeeds", async () => {
    const login = await fetchClerkLoginSummary("user_abc", {
      env,
      getUser: async () => ({
        emailAddresses: [{ emailAddress: "you@example.com" }],
        externalAccounts: [{ provider: "oauth_x" }],
      }),
    });
    assert.deepEqual(login, { email: "you@example.com", providers: ["X"] });
  });

  it("omits login when Clerk is off or lookup fails", async () => {
    assert.equal(await fetchClerkLoginSummary("user_abc", { env: {} }), null);
    assert.equal(
      await fetchClerkLoginSummary("user_abc", {
        env,
        getUser: async () => {
          throw new Error("clerk down");
        },
      }),
      null
    );
  });
});
