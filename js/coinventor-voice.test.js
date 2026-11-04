/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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
