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

/**
 * Unit tests for developer-mode CLI / env resolution.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDeveloperEnabled } from "./developer-mode.mjs";

describe("resolveDeveloperEnabled", () => {
  it("defaults to off", () => {
    assert.equal(resolveDeveloperEnabled([], {}), false);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "" }), false);
  });

  it("enables with --developer or --dev CLI flag", () => {
    assert.equal(resolveDeveloperEnabled(["--developer"], {}), true);
    assert.equal(resolveDeveloperEnabled(["--dev"], {}), true);
  });

  it("--no-developer wins over env and --developer", () => {
    assert.equal(
      resolveDeveloperEnabled(["--developer", "--no-developer"], {
        FF_DEVELOPER: "1",
      }),
      false
    );
  });

  it("enables with FF_DEVELOPER=1 when no CLI", () => {
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "1" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "true" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "on" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "0" }), false);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "off" }), false);
  });
});
