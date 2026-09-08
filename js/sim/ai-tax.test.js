import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyThinkingAiCharge,
  isAiSeasonTaxMode,
  thinkingAiApCost,
} from "./ai-tax.js";

describe("AI season tax", () => {
  it("treats chat / sparks / coach / draft as thinking", () => {
    assert.equal(isAiSeasonTaxMode("chat"), true);
    assert.equal(isAiSeasonTaxMode("idea-sparks"), true);
    assert.equal(isAiSeasonTaxMode("coach-challenge"), true);
    assert.equal(isAiSeasonTaxMode("draft-challenge"), true);
    assert.equal(isAiSeasonTaxMode("complete-picture"), true);
  });

  it("treats judge / pose / vision as always-charge", () => {
    assert.equal(isAiSeasonTaxMode("judge-challenge"), false);
    assert.equal(isAiSeasonTaxMode("judge-scrutiny-move"), false);
    assert.equal(isAiSeasonTaxMode("pose-challenge"), false);
    assert.equal(isAiSeasonTaxMode("vision"), false);
  });

  it("first thinking ask of the turn is 1 AP; further thinking is free", () => {
    const sim = { aiTaxThisTurn: false, ap: 3 };
    const first = applyThinkingAiCharge(sim, "chat", 1);
    assert.equal(first.cost, 1);
    assert.equal(first.markPaid, true);
    const taxed = { ...sim, aiTaxThisTurn: true };
    assert.equal(thinkingAiApCost(taxed, "idea-sparks", 1), 0);
    assert.equal(thinkingAiApCost(taxed, "coach-challenge", 1), 0);
    assert.equal(thinkingAiApCost(taxed, "judge-challenge", 1), 1);
  });

  it("explicit tutor flag does not pay the tax", () => {
    const sim = { aiTaxThisTurn: false };
    const r = applyThinkingAiCharge(sim, "chat", 0, { tutor: true });
    assert.equal(r.cost, 0);
    assert.equal(r.markPaid, false);
    assert.equal(thinkingAiApCost(sim, "chat", 0, { tutor: true }), 0);
  });

  it("client reservedAp 0 still costs 1 AP for thinking unless tutor", () => {
    const sim = { aiTaxThisTurn: false };
    const sneak = applyThinkingAiCharge(sim, "chat", 0);
    assert.equal(sneak.cost, 1);
    assert.equal(sneak.markPaid, true);
    const judgeZero = applyThinkingAiCharge(sim, "judge-challenge", 0);
    assert.equal(judgeZero.cost, 1);
    assert.equal(judgeZero.markPaid, false);
  });
});
