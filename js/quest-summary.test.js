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
  SUMMARY_CAP,
  SUMMARY_LOADING_COPY,
  clipSummary,
  paintMissionSummary,
  isThemeWordLede,
} from "./quest-summary.js";

describe("quest-summary", () => {
  it("clips to SUMMARY_CAP", () => {
    assert.equal(clipSummary("  hi  "), "hi");
    assert.equal(clipSummary("x".repeat(SUMMARY_CAP + 10)).length, SUMMARY_CAP);
    assert.equal(clipSummary(null), "");
  });

  it("paints loading then summary", () => {
    const el = {
      hidden: true,
      textContent: "",
      className: "",
      classList: {
        add(c) {
          el.className += ` ${c}`;
        },
        remove(c) {
          el.className = el.className.replace(c, "");
        },
      },
      attrs: {},
      setAttribute(k, v) {
        el.attrs[k] = v;
      },
      removeAttribute(k) {
        delete el.attrs[k];
      },
    };
    paintMissionSummary(el, { loading: true });
    assert.equal(el.hidden, false);
    assert.equal(el.textContent, SUMMARY_LOADING_COPY);
    assert.equal(el.attrs["aria-busy"], "true");
    paintMissionSummary(el, { summary: "Climate crises. It's too hot." });
    assert.equal(el.textContent, "Climate crises. It's too hot.");
    assert.equal(el.attrs["aria-busy"], undefined);
    paintMissionSummary(el, { summary: "" });
    assert.equal(el.hidden, true);
    assert.equal(el.textContent, "");
  });

  it("flags theme-word and outcome ledes", () => {
    assert.equal(
      isThemeWordLede(
        "Infectious diseases. This is about how far gene sequencing has to go."
      ),
      true
    );
    assert.equal(
      isThemeWordLede("Chemical and Biological Weapons. A school lab can now make life."),
      true
    );
    assert.equal(isThemeWordLede("Invent a way to stay safe and still keep up."), true);
    assert.equal(
      isThemeWordLede(
        "Nurse Amina seals another swab at Crossing Clinic 7. The fever sheet does not match."
      ),
      false
    );
  });
});
