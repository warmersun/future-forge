import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "./rate-limit.mjs";
import { CostPolicy } from "./cost-policy.mjs";
import { clientIp, isLoopbackSocket } from "./client-ip.mjs";
import { canSeeAdmin, timingSafeEqualStr } from "./admin-gate.mjs";
import { checkApiSecret } from "./cost-policy.mjs";

describe("RateLimiter", () => {
  it("allows up to limit then blocks", () => {
    let now = 1_000_000;
    const rl = new RateLimiter({ now: () => now, gcEveryMs: 1 });
    assert.equal(rl.check("a", 2, 1000), true);
    assert.equal(rl.check("a", 2, 1000), true);
    assert.equal(rl.check("a", 2, 1000), false);
    now += 1001;
    assert.equal(rl.check("a", 2, 1000), true);
  });

  it("GCs expired buckets", () => {
    let now = 0;
    const rl = new RateLimiter({ now: () => now, gcEveryMs: 10 });
    rl.check("x", 1, 50);
    assert.equal(rl.size(), 1);
    now = 100;
    rl.check("y", 1, 50);
    assert.equal(rl.size(), 1);
  });
});

describe("CostPolicy", () => {
  it("rate-limits idea-image like other image routes", () => {
    const policy = new CostPolicy({
      windows: {
        "idea-image": { limit: 2, windowMs: 60_000 },
        "ai-global": { limit: 10, windowMs: 60_000 },
      },
    });
    assert.equal(policy.allowExpensive("idea-image", "2.2.2.2").ok, true);
    assert.equal(policy.allowExpensive("idea-image", "2.2.2.2").ok, true);
    assert.equal(policy.allowExpensive("idea-image", "2.2.2.2").ok, false);
  });

  it("rate-limits expensive routes and global budget", () => {
    const policy = new CostPolicy({
      windows: {
        "co-invent": { limit: 2, windowMs: 60_000 },
        "ai-global": { limit: 3, windowMs: 60_000 },
        vision: { limit: 10, windowMs: 60_000 },
      },
    });
    assert.equal(policy.allowExpensive("co-invent", "1.1.1.1").ok, true);
    assert.equal(policy.allowExpensive("co-invent", "1.1.1.1").ok, true);
    assert.equal(policy.allowExpensive("co-invent", "1.1.1.1").ok, false);
    assert.equal(policy.allowExpensive("vision", "1.1.1.1").ok, true);
    // global already at 3 after 2 co-invent + 1 vision? actually 2 co-invent + fail doesn't count global for third co-invent
    // sequence: co ok (g1), co ok (g2), co fail route, vision ok (g3), vision fail global
    assert.equal(policy.allowExpensive("vision", "1.1.1.1").ok, false);
  });
});

describe("clientIp", () => {
  it("ignores X-Forwarded-For unless trust proxy", () => {
    const req = {
      headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" },
      socket: { remoteAddress: "10.0.0.5" },
    };
    assert.equal(clientIp(req, { trustProxy: false }), "10.0.0.5");
    assert.equal(clientIp(req, { trustProxy: true }), "9.9.9.9");
  });

  it("detects loopback sockets", () => {
    assert.equal(isLoopbackSocket({ socket: { remoteAddress: "127.0.0.1" } }), true);
    assert.equal(isLoopbackSocket({ socket: { remoteAddress: "::1" } }), true);
    assert.equal(
      isLoopbackSocket({ socket: { remoteAddress: "::ffff:127.0.0.1" } }),
      true
    );
    assert.equal(isLoopbackSocket({ socket: { remoteAddress: "10.0.0.2" } }), false);
  });
});

describe("admin gate", () => {
  it("allows loopback without token", () => {
    const req = { socket: { remoteAddress: "127.0.0.1" }, headers: {} };
    assert.equal(canSeeAdmin(req, { token: "" }).ok, true);
  });

  it("requires token for non-loopback", () => {
    const req = {
      socket: { remoteAddress: "10.0.0.2" },
      headers: {},
    };
    assert.equal(canSeeAdmin(req, { token: "" }).ok, false);
    assert.equal(canSeeAdmin(req, { token: "secret" }).ok, false);
    const authed = {
      socket: { remoteAddress: "10.0.0.2" },
      headers: { authorization: "Bearer secret" },
    };
    assert.equal(canSeeAdmin(authed, { token: "secret" }).ok, true);
  });

  it("timingSafeEqualStr compares", () => {
    assert.equal(timingSafeEqualStr("abc", "abc"), true);
    assert.equal(timingSafeEqualStr("abc", "abd"), false);
    assert.equal(timingSafeEqualStr("ab", "abc"), false);
  });
});

describe("checkApiSecret", () => {
  it("noop when secret unset", () => {
    assert.equal(checkApiSecret({ headers: {} }, null, { secret: "" }).ok, true);
  });

  it("allows loopback even with secret", () => {
    assert.equal(
      checkApiSecret({ headers: {} }, null, { secret: "s", isLoopback: true }).ok,
      true
    );
  });

  it("requires header or body when secret set", () => {
    const req = { headers: {} };
    assert.equal(checkApiSecret(req, null, { secret: "s", isLoopback: false }).ok, false);
    assert.equal(
      checkApiSecret(
        { headers: { "x-ff-secret": "s" } },
        null,
        { secret: "s", isLoopback: false }
      ).ok,
      true
    );
    assert.equal(
      checkApiSecret(req, { apiSecret: "s" }, { secret: "s", isLoopback: false }).ok,
      true
    );
  });
});
