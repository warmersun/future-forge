/**
 * Fast-eval TypeSafe compose helpers — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimTimingFingerprint } from "./deploy.js";
import {
  composeChallengeVerdict,
  composeContributionAdditive,
  composeFeasibilityTiming,
  composeScrutinyQuality,
  convergeQuestionId,
} from "./fast-judge-questions.js";

describe("composeFeasibilityTiming", () => {
  it("reds an explicit grounding forbid", () => {
    const r = composeFeasibilityTiming(
      { groundingForbid: 0.9, sciFiRoutine: 0.05, demonstratedByYear: 0.8 },
      { choice: "green", confidence: 0.9 },
      { inventionHow: "Sensors page the pump crew before the crest.", techIds: ["iot"] }
    );
    assert.equal(r.level, "red");
    assert.match(r.reason, /Grounding/i);
  });

  it("does not treat an uncertain forbid as red", () => {
    const r = composeFeasibilityTiming(
      { groundingForbid: 0.5, sciFiRoutine: 0.05, demonstratedByYear: 0.9 },
      null,
      { inventionHow: "Sensors page the pump crew before the crest.", techIds: ["iot"] }
    );
    assert.equal(r.level, "green");
  });

  it("greens a demonstrated claim and yellows a short how-text", () => {
    const long = composeFeasibilityTiming(
      { groundingForbid: 0.05, sciFiRoutine: 0.05, demonstratedByYear: 0.9 },
      null,
      { inventionHow: "Leak sensors radio the pump crew before the tank runs dry.", techIds: ["iot"] }
    );
    assert.equal(long.level, "green");
    const short = composeFeasibilityTiming(
      { groundingForbid: 0.05, sciFiRoutine: 0.05, demonstratedByYear: 0.9 },
      null,
      { inventionHow: "Sensors.", techIds: ["iot"] }
    );
    assert.equal(short.level, "yellow");
  });

  it("reds an empty stack", () => {
    const r = composeFeasibilityTiming(
      { groundingForbid: 0.05, sciFiRoutine: 0.05, demonstratedByYear: 0.9 },
      null,
      { inventionHow: "A long enough how-text that would otherwise go green.", techIds: [] }
    );
    assert.equal(r.level, "red");
  });

  it("will not score harsher later in the year for the same claims", () => {
    const how = "Leak sensors radio the pump crew before the tank runs dry.";
    const ids = ["iot"];
    const fp = claimTimingFingerprint(how, ids);
    const r = composeFeasibilityTiming(
      { groundingForbid: 0.9, sciFiRoutine: 0.05, demonstratedByYear: 0.1 },
      null,
      {
        inventionHow: how,
        techIds: ids,
        year: 2027,
        priorTiming: { level: "green", year: 2026, fingerprint: fp },
      }
    );
    assert.equal(r.level, "green");
  });
});

describe("composeScrutinyQuality / composeChallengeVerdict", () => {
  it("maps damage in code and downgrades an uncertain hit/pass", () => {
    assert.equal(composeScrutinyQuality("hit", 0.9).damage, 2);
    assert.equal(composeScrutinyQuality("hit", 0.2).quality, "glance");
    assert.equal(composeScrutinyQuality("hit", 0.2).damage, 1);
    assert.equal(composeChallengeVerdict("pass", 0.2).verdict, "partial");
    assert.equal(composeChallengeVerdict("fail", 0.9).verdict, "fail");
  });
});

describe("composeContributionAdditive", () => {
  it("treats uncertain as additive fallback", () => {
    assert.equal(composeContributionAdditive(0.9).additive, true);
    assert.equal(composeContributionAdditive(0.1).additive, false);
    const u = composeContributionAdditive(0.5, true);
    assert.equal(u.additive, true);
    assert.equal(u.uncertain, true);
    const gut = composeContributionAdditive(0.5, true, {
      beforeText: "Sensors page the pump crew before the tank runs dry along the corridor.",
      afterText: "Magic.",
    });
    assert.equal(gut.additive, false);
  });
});

describe("convergeQuestionId", () => {
  it("slugs neighbor ids", () => {
    assert.equal(convergeQuestionId("tile-1"), "converge_tile-1");
    assert.equal(convergeQuestionId(""), "");
  });
});
