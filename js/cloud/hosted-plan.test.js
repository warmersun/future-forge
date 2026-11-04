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
import { catalogLessonSkipsPlan, hostedSessionAllowed } from "./hosted-plan.js";

describe("hostedSessionAllowed", () => {
  it("leaves self-host open and requires sign-in on the hosted app", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: false, signedIn: true, entitled: false }), true);
    assert.equal(hostedSessionAllowed({ cloudAi: false, signedIn: false, entitled: false }), true);
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: false, entitled: false }), false);
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: false, entitled: false, lesson: true }), false);
  });

  it("sends a signed-in player without a plan to subscribe", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: false }), false);
  });

  it("treats a catalog lesson as the only unpaid exception", () => {
    assert.equal(catalogLessonSkipsPlan({ isLearningModule: true }), true);
    assert.equal(catalogLessonSkipsPlan({ access: "account" }), true);
    assert.equal(catalogLessonSkipsPlan({ kind: "module", id: "module-x" }), true);
    assert.equal(catalogLessonSkipsPlan({ id: "open-quest" }), false);
    assert.equal(catalogLessonSkipsPlan({ access: "paid", isLearningModule: true }), false);
    assert.equal(
      catalogLessonSkipsPlan({ source: "hosted", isLearningModule: true }),
      false
    );
  });

  it("keeps a subscriber and a signed-in lesson", () => {
    assert.equal(hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: true }), true);
    assert.equal(
      hostedSessionAllowed({ cloudAi: true, signedIn: true, entitled: false, lesson: true }),
      true
    );
  });
});
