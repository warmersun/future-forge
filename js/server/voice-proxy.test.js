import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planXaiClose, takeAudioBudget, VOICE_AUDIO_CHARS_PER_SEC } from "./voice-proxy.mjs";

describe("planXaiClose", () => {
  it("reconnects once, then hangs up", () => {
    assert.equal(planXaiClose({ closed: false, drops: 0 }), "reconnect");
    assert.equal(planXaiClose({ closed: false, drops: 1 }), "hangup");
  });

  it("ignores a close after the call has already ended", () => {
    assert.equal(planXaiClose({ closed: true, drops: 0 }), "ignore");
  });
});

describe("takeAudioBudget", () => {
  it("allows a live mic and drops a flood without hanging up", () => {
    const chunk = 6_400;
    let state = { windowStart: 0, bytes: 0 };
    for (let i = 0; i < 10; i++) {
      const step = takeAudioBudget(state, chunk, 1_000);
      assert.equal(step.allow, true);
      assert.equal(step.hangup, false);
      state = step.state;
    }
    const flood = takeAudioBudget(state, VOICE_AUDIO_CHARS_PER_SEC * 3, 1_000);
    assert.equal(flood.allow, false);
    assert.equal(flood.hangup, false);
    const next = takeAudioBudget(flood.state, chunk, 1_000);
    assert.equal(next.allow, true);
  });

  it("hangs up when one window exceeds the hard cap", () => {
    const step = takeAudioBudget({ windowStart: 0, bytes: 0 }, VOICE_AUDIO_CHARS_PER_SEC * 8 + 1, 5_000);
    assert.equal(step.allow, false);
    assert.equal(step.hangup, true);
  });

  it("starts a fresh window after a second", () => {
    const full = takeAudioBudget(
      { windowStart: 0, bytes: 0 },
      VOICE_AUDIO_CHARS_PER_SEC * 3,
      1_000
    );
    assert.equal(full.allow, true);
    const extra = takeAudioBudget(full.state, 1, 1_000);
    assert.equal(extra.allow, false);
    assert.equal(extra.hangup, false);
    const later = takeAudioBudget(extra.state, 6_400, 2_500);
    assert.equal(later.allow, true);
    assert.equal(later.hangup, false);
  });
});
