import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planXaiClose } from "./voice-proxy.mjs";

describe("planXaiClose", () => {
  it("reconnects once, then hangs up", () => {
    assert.equal(planXaiClose({ closed: false, drops: 0 }), "reconnect");
    assert.equal(planXaiClose({ closed: false, drops: 1 }), "hangup");
  });

  it("ignores a close after the call has already ended", () => {
    assert.equal(planXaiClose({ closed: true, drops: 0 }), "ignore");
  });
});
