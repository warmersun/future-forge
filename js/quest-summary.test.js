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
