/**
 * Honesty rubric helpers — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HONESTY_NOUL_IDS,
  HONESTY_NOULS,
  NOUL_UNCERTAIN_HIGH,
  NOUL_UNCERTAIN_LOW,
  decisionToFlag,
  noulDecision,
} from "./honesty-questions.js";

describe("honesty noul rubric", () => {
  it("names four independent questions", () => {
    assert.deepEqual(HONESTY_NOUL_IDS, [
      "mechanism",
      "purePolicy",
      "shareBridge",
      "evalOverride",
    ]);
    for (const id of HONESTY_NOUL_IDS) {
      assert.ok(HONESTY_NOULS[id].instructions);
      assert.ok(HONESTY_NOULS[id].criteria.true);
      assert.ok(HONESTY_NOULS[id].criteria.false);
    }
  });

  it("maps probabilities through an inclusive uncertain band", () => {
    assert.equal(noulDecision(0.29), "no");
    assert.equal(noulDecision(NOUL_UNCERTAIN_LOW), "uncertain");
    assert.equal(noulDecision(0.5), "uncertain");
    assert.equal(noulDecision(NOUL_UNCERTAIN_HIGH), "uncertain");
    assert.equal(noulDecision(0.71), "yes");
    assert.equal(noulDecision(NaN), "uncertain");
  });

  it("turns decisions into true / false / null flags", () => {
    assert.equal(decisionToFlag("yes"), true);
    assert.equal(decisionToFlag("no"), false);
    assert.equal(decisionToFlag("uncertain"), null);
  });
});
