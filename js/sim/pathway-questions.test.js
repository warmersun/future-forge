/**
 * Pathway Choice helpers — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHOICE_CONFIDENCE_FLOOR,
  cannedConcernReason,
  cannedDeltaReason,
  choiceIsUncertain,
  concernForcedRed,
  concernQuestionId,
  deltaFromChoiceLabel,
} from "./pathway-questions.js";

describe("pathway Choice helpers", () => {
  it("maps labels to crisis deltas", () => {
    assert.equal(deltaFromChoiceLabel("ease2"), -2);
    assert.equal(deltaFromChoiceLabel("ease1"), -1);
    assert.equal(deltaFromChoiceLabel("none"), 0);
    assert.equal(deltaFromChoiceLabel("worsen"), 1);
    assert.equal(deltaFromChoiceLabel("nope"), null);
  });

  it("treats confidence below the floor as uncertain", () => {
    assert.equal(choiceIsUncertain(0.9), false);
    assert.equal(choiceIsUncertain(CHOICE_CONFIDENCE_FLOOR), false);
    assert.equal(choiceIsUncertain(CHOICE_CONFIDENCE_FLOOR - 0.01), true);
    assert.equal(choiceIsUncertain(NaN), true);
  });

  it("forces red when the critic is unanswered and the invent did not change", () => {
    assert.equal(concernForcedRed({ inventChanged: false, playerAnswer: "" }), true);
    assert.equal(
      concernForcedRed({ inventChanged: false, playerAnswer: "A named cap." }),
      false
    );
    assert.equal(concernForcedRed({ inventChanged: true, playerAnswer: "" }), false);
  });

  it("slugs concern question ids", () => {
    assert.equal(concernQuestionId("moloch"), "concern_moloch");
    assert.equal(concernQuestionId(""), "");
  });

  it("returns canned reasons for locked deltas and lamps", () => {
    assert.match(cannedDeltaReason("local", -1), /local mechanism/i);
    assert.match(cannedDeltaReason("global", 0), /driver/i);
    assert.match(cannedConcernReason("red"), /docking/i);
  });
});
