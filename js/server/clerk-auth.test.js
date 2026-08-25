import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isJwtShaped,
  extractBearerToken,
  clerkKeysFromEnv,
  authorizedPartiesFromEnv,
  publicClerkConfig,
  normalizeClerkUserId,
  authenticateClerkRequest,
  runWithClerkIdentity,
  clerkUserIdFromContext,
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

describe("authorizedPartiesFromEnv", () => {
  it("defaults include local and warmersun.com", () => {
    const parties = authorizedPartiesFromEnv({});
    assert.ok(parties.includes("http://127.0.0.1:8765"));
    assert.ok(parties.includes("https://warmersun.com"));
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
