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
