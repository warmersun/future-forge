import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDeviceAuthStore } from "./device-auth.mjs";

describe("deviceAuth", () => {
  it("starts pending then yields the token once", () => {
    const store = createDeviceAuthStore({ now: () => 1_000 });
    const code = store.start();
    assert.equal(typeof code, "string");
    assert.ok(code.length >= 16);
    assert.deepEqual(store.takeStatus(code), { ok: true, pending: true });
    assert.deepEqual(store.complete(code, "eyJ.a.b"), { ok: true });
    assert.deepEqual(store.takeStatus(code), {
      ok: true,
      pending: false,
      token: "eyJ.a.b",
    });
    assert.deepEqual(store.takeStatus(code), { ok: false, error: "unknown" });
  });

  it("rejects unknown and expired codes", () => {
    let t = 0;
    const store = createDeviceAuthStore({ ttlMs: 10, now: () => t });
    const code = store.start();
    t = 11;
    assert.deepEqual(store.complete(code, "eyJ.a.b"), { ok: false, error: "unknown" });
    assert.deepEqual(store.takeStatus("nope"), { ok: false, error: "unknown" });
  });

  it("rejects a second bind and empty codes", () => {
    const store = createDeviceAuthStore({ now: () => 1 });
    const code = store.start();
    assert.deepEqual(store.complete(code, "eyJ.a.b"), { ok: true });
    assert.deepEqual(store.complete(code, "eyJ.c.d"), { ok: false, error: "already_bound" });
    assert.deepEqual(store.complete("", "eyJ.a.b"), { ok: false, error: "invalid" });
    assert.deepEqual(store.takeStatus(""), { ok: false, error: "invalid" });
  });
});
