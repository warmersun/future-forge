import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VOICE_CHOICES, VOICE_DEFAULT_ID, knownVoiceId } from "./voice-choices.js";

describe("knownVoiceId", () => {
  it("accepts the Grok Voice roster and ignores case", () => {
    assert.deepEqual(
      VOICE_CHOICES.map((v) => v.id),
      ["eve", "ara", "rex", "sal", "leo"]
    );
    assert.equal(VOICE_DEFAULT_ID, "eve");
    assert.equal(knownVoiceId("eve"), "eve");
    assert.equal(knownVoiceId("ARA"), "ara");
    assert.equal(knownVoiceId(" Leo "), "leo");
  });

  it("rejects an unknown or empty id", () => {
    assert.equal(knownVoiceId("nope"), "");
    assert.equal(knownVoiceId(""), "");
    assert.equal(knownVoiceId(null), "");
    assert.equal(knownVoiceId(undefined), "");
  });
});
