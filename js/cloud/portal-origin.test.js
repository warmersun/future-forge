import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLOUD_PORTAL_ORIGIN,
  allowGameDeviceOrigin,
  portalPublicOrigin,
} from "./portal-origin.js";

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

describe("allowGameDeviceOrigin", () => {
  it("allows loopback game origins only", () => {
    assert.equal(allowGameDeviceOrigin("http://127.0.0.1:8765"), true);
    assert.equal(allowGameDeviceOrigin("http://localhost:8765"), true);
    assert.equal(allowGameDeviceOrigin("https://cloud.warmersun.com"), false);
    assert.equal(allowGameDeviceOrigin("https://evil.example"), false);
    assert.equal(allowGameDeviceOrigin(""), false);
  });
});
