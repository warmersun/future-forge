import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cloudAiEnabled,
  quotaKindForRoute,
  reserveCloudQuota,
  reserveCloudQuotaForUser,
  settleCloudQuotaReliable,
  withCloudQuota,
} from "./cloud-quota-client.mjs";

describe("cloud quota client", () => {
  it("stays off unless FF_CLOUD_AI is set", () => {
    assert.equal(cloudAiEnabled({}), false);
    assert.equal(cloudAiEnabled({ FF_CLOUD_AI: "1" }), true);
  });

  it("maps expensive routes onto quota kinds", () => {
    assert.equal(quotaKindForRoute("co-invent"), "text");
    assert.equal(quotaKindForRoute("vision"), "image");
    assert.equal(quotaKindForRoute("idea-image"), "image");
    assert.equal(quotaKindForRoute("market-image"), "image");
    assert.equal(quotaKindForRoute("tts"), "tts");
    assert.equal(quotaKindForRoute("voice"), "voice");
  });

  it("does not call the provider when reserve is 402 or the portal is down", async () => {
    let calls = 0;
    const denied = await withCloudQuota({
      reserve: async () => ({ ok: false, status: 402, error: "subscription_required" }),
      call: async () => {
        calls += 1;
        return { ok: true };
      },
      settle: async () => ({ ok: true }),
    });
    assert.equal(denied.ok, false);
    assert.equal(calls, 0);

    const fetchImpl = async () => {
      throw new Error("offline");
    };
    const down = await reserveCloudQuota({
      kind: "text",
      authorization: "Bearer jwt",
      env: { FF_CLOUD_AI: "1", FF_PORTAL_URL: "https://portal.example", FF_API_SECRET: "s" },
      fetchImpl,
    });
    assert.equal(down.ok, false);
    assert.equal(down.status, 503);
    assert.equal(calls, 0);
  });

  it("fails closed when the hosted game has no portal or secret", async () => {
    const missing = await reserveCloudQuota({
      kind: "text",
      authorization: "Bearer jwt",
      env: { FF_CLOUD_AI: "1" },
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "quota_unavailable");
  });

  it("unsigned hosted play is subscription_required before fetch", async () => {
    const d = await reserveCloudQuota({
      kind: "image",
      authorization: "",
      env: { FF_CLOUD_AI: "1", FF_PORTAL_URL: "https://portal.example", FF_API_SECRET: "s" },
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    assert.equal(d.status, 402);
    assert.equal(d.error, "subscription_required");
    assert.equal(d.subscribeUrl, "https://portal.example/subscribe");
  });

  it("leaves the hold when settle fails after the provider call", async () => {
    const settles = [];
    const out = await withCloudQuota({
      reserve: async () => ({
        ok: true,
        reservationId: "r1",
        userId: "user_1",
        settleToken: "tok",
      }),
      call: async () => ({ ok: true }),
      measure: () => ({ inputTokens: 4, outputTokens: 2 }),
      settle: async (_id, measure) => {
        settles.push(measure);
        return { ok: false, status: 503 };
      },
    });
    assert.equal(out.ok, true);
    assert.equal(out.result.ok, true);
    assert.equal(settles.length, 1);
    assert.ok(!settles[0].release);
    assert.equal(settles[0].userId, "user_1");
    assert.equal(settles[0].settleToken, "tok");
    assert.equal(settles[0].inputTokens, 4);
  });

  it("releases the hold when the provider throws", async () => {
    const settles = [];
    await assert.rejects(
      () =>
        withCloudQuota({
          reserve: async () => ({
            ok: true,
            reservationId: "r1",
            userId: "user_1",
            settleToken: "tok",
          }),
          call: async () => {
            throw new Error("xai");
          },
          settle: async (_id, measure) => {
            settles.push(measure);
            return { ok: true };
          },
        }),
      /xai/
    );
    assert.equal(settles.length, 1);
    assert.equal(settles[0].release, true);
  });

  it("retries a failed settle and then succeeds", async () => {
    let n = 0;
    const env = { FF_CLOUD_AI: "1", FF_PORTAL_URL: "https://portal.example", FF_API_SECRET: "s" };
    const result = await settleCloudQuotaReliable({
      reservationId: "r1",
      userId: "user_1",
      settleToken: "tok",
      inputTokens: 3,
      outputTokens: 1,
      env,
      fetchImpl: async () => {
        n += 1;
        if (n < 3) {
          return { ok: false, status: 503, json: async () => ({ ok: false, error: "quota_unavailable" }) };
        }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(n, 3);
  });

  it("room reserve without a grant does not call portal", async () => {
    const d = await reserveCloudQuotaForUser({
      userId: "user_1",
      kind: "text",
      env: { FF_CLOUD_AI: "1", FF_PORTAL_URL: "https://portal.example", FF_API_SECRET: "s" },
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    assert.equal(d.status, 503);
    assert.equal(d.error, "quota_unavailable");
  });
});
