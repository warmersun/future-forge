import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resampleFloat32,
  float32ToPcm16Base64,
  base64Pcm16ToFloat32,
} from "./voice-pcm.js";
import { isRecoverableVoiceError } from "./voice-errors.js";

describe("voice PCM helpers", () => {
  it("round-trips PCM16 through base64", () => {
    const src = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const b64 = float32ToPcm16Base64(src);
    const back = base64Pcm16ToFloat32(b64);
    assert.equal(back.length, src.length);
    assert.ok(Math.abs(back[0]) < 0.001);
    assert.ok(Math.abs(back[1] - 0.5) < 0.01);
    assert.ok(Math.abs(back[2] + 0.5) < 0.01);
  });

  it("resamples 48k to 24k by half", () => {
    const src = new Float32Array(8);
    for (let i = 0; i < 8; i++) src[i] = i;
    const out = resampleFloat32(src, 48000, 24000);
    assert.equal(out.length, 4);
    assert.equal(out[0], 0);
  });
});

describe("isRecoverableVoiceError", () => {
  it("treats xAI cancel-with-no-response as recoverable", () => {
    assert.equal(
      isRecoverableVoiceError("Cancellation failed: no active response found"),
      true
    );
    assert.equal(isRecoverableVoiceError("xai_connect_failed"), false);
    assert.equal(isRecoverableVoiceError(""), false);
  });
});
