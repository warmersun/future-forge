import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLOUD_PORTAL_ORIGIN,
  GAME_DEVICE_ORIGINS,
  allowGameDeviceOrigin,
  gameDeviceOriginsFromEnv,
  isAllowedGameReturnUrl,
  normalizeGameDeviceOrigin,
  portalPublicOrigin,
  signInUrlWithReturn,
} from "./portal-origin.js";

const EMPTY = {};

describe("portalPublicOrigin", () => {
  it("defaults to cloud.warmersun.com", () => {
    assert.equal(portalPublicOrigin({}), CLOUD_PORTAL_ORIGIN);
    assert.equal(CLOUD_PORTAL_ORIGIN, "https://cloud.warmersun.com");
  });

  it("honors FF_PUBLIC_ORIGIN without a trailing slash", () => {
    assert.equal(
      portalPublicOrigin({ FF_PUBLIC_ORIGIN: "http://127.0.0.1:9000/" }),
      "http://127.0.0.1:9000"
    );
  });
});

describe("normalizeGameDeviceOrigin", () => {
  it("keeps scheme+host+port and strips a trailing slash", () => {
    assert.equal(
      normalizeGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net/"),
      "https://futureforge.xantu-chickadee.ts.net"
    );
    assert.equal(
      normalizeGameDeviceOrigin("http://127.0.0.1:8765"),
      "http://127.0.0.1:8765"
    );
  });

  it("rejects paths, credentials, and non-http", () => {
    assert.equal(normalizeGameDeviceOrigin("https://evil.example/forge"), "");
    assert.equal(normalizeGameDeviceOrigin("https://user:pass@evil.example"), "");
    assert.equal(normalizeGameDeviceOrigin("javascript:alert(1)"), "");
    assert.equal(normalizeGameDeviceOrigin(""), "");
  });
});

describe("gameDeviceOriginsFromEnv", () => {
  it("defaults to loopback only", () => {
    assert.deepEqual(gameDeviceOriginsFromEnv(EMPTY), [...GAME_DEVICE_ORIGINS]);
  });

  it("appends extras without replacing loopback", () => {
    assert.deepEqual(
      gameDeviceOriginsFromEnv({
        FF_GAME_DEVICE_ORIGINS:
          "https://futureforge.xantu-chickadee.ts.net/, https://evil.example/path, http://localhost:8765",
      }),
      [
        "http://127.0.0.1:8765",
        "http://localhost:8765",
        "https://futureforge.xantu-chickadee.ts.net",
      ]
    );
  });
});

describe("allowGameDeviceOrigin", () => {
  it("allows loopback game origins only by default", () => {
    assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765", EMPTY), true);
    assert.equal(allowGameDeviceOrigin("http://localhost:8765", EMPTY), true);
    assert.equal(allowGameDeviceOrigin("https://cloud.warmersun.com", EMPTY), false);
    assert.equal(allowGameDeviceOrigin("https://evil.example", EMPTY), false);
    assert.equal(allowGameDeviceOrigin("", EMPTY), false);
  });

  it("allows Funnel extras from FF_GAME_DEVICE_ORIGINS", () => {
    const env = {
      FF_GAME_DEVICE_ORIGINS: "https://futureforge.xantu-chickadee.ts.net",
    };
    assert.equal(
      allowGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net", env),
      true
    );
    assert.equal(
      allowGameDeviceOrigin("https://futureforge.xantu-chickadee.ts.net/", env),
      true
    );
    assert.equal(allowGameDeviceOrigin("https://other.ts.net", env), false);
    assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765", env), true);
  });
});

describe("isAllowedGameReturnUrl", () => {
  it("allows loopback, Funnel, and warmersun hop", () => {
    assert.equal(isAllowedGameReturnUrl("http://127.0.0.1:8765/?q=lesson-1", EMPTY), true);
    assert.equal(
      isAllowedGameReturnUrl("https://futureforge.xantu-chickadee.ts.net/?q=lesson-1"),
      true
    );
    assert.equal(isAllowedGameReturnUrl("https://warmersun.com/forge/?q=lesson-1"), true);
    assert.equal(isAllowedGameReturnUrl("https://cloud.warmersun.com/signin"), true);
  });

  it("rejects open redirects", () => {
    assert.equal(isAllowedGameReturnUrl("https://evil.example/?q=x"), false);
    assert.equal(isAllowedGameReturnUrl("javascript:alert(1)"), false);
    assert.equal(isAllowedGameReturnUrl(""), false);
    assert.equal(isAllowedGameReturnUrl("https://user:pass@127.0.0.1:8765/"), false);
  });
});

describe("signInUrlWithReturn", () => {
  it("appends return only when the bounce is allowed", () => {
    const base = "https://cloud.warmersun.com/signin?device=abc";
    const back = "https://futureforge.xantu-chickadee.ts.net/?q=lesson-1";
    assert.equal(
      signInUrlWithReturn(base, back),
      `${base}&return=${encodeURIComponent(back)}`
    );
    assert.equal(signInUrlWithReturn(base, "https://evil.example/"), base);
  });
});
