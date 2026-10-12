import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hostedSessionAllowed } from "./hosted-plan.js";

describe("hostedSessionAllowed", () => {
  it("leaves self-host and unsigned visitors alone", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: false, signedIn: true, entitled: false }), true);
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: false, entitled: false }), true);
  });

  it("sends a signed-in player without a plan to subscribe", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: false }), false);
  });

  it("keeps a subscriber and a signed-in lesson", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: true }), true);
    assert.equal(
      hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: false, lesson: true }),
      true
    );
  });
});
