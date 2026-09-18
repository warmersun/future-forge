/**
 * Fast-eval TypeSafe overlay — mocked client, no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyTypeSafeFastJudge } from "./fast-judge-score.mjs";
import { parseFeasibilityAnswers, parseConvergenceAnswers } from "./fast-judge-typesafe.mjs";

describe("applyTypeSafeFastJudge", () => {
  it("leaves non-judge modes and missing clients alone", async () => {
    const src = { source: "local", verdict: "pass" };
    const a = await applyTypeSafeFastJudge(src, { mode: "chat" }, { client: {} });
    assert.equal(a, src);
    const b = await applyTypeSafeFastJudge(
      src,
      { mode: "judge-challenge" },
      { client: null }
    );
    assert.equal(b, src);
  });

  it("replaces a Grok green with TypeSafe red on grounding forbid", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 4, output_tokens: 0 },
          answers: {
            groundingForbid: { noul: 0.92 },
            sciFiRoutine: { noul: 0.04 },
            demonstratedByYear: { noul: 0.8 },
            timing: { choice: "green", confidence: 0.9 },
          },
        };
      },
    };
    const out = await applyTypeSafeFastJudge(
      { source: "ai", timing: { level: "green", reason: "Grok said green." } },
      {
        mode: "assess-feasibility",
        context: {
          inventionHow: "Sensors page the pump crew before the crest.",
          selectedTechIds: ["iot"],
          year: 2026,
        },
      },
      { client }
    );
    assert.equal(out.timing.level, "red");
    assert.match(out.timing.reason, /Grounding/i);
  });

  it("keeps a matching Grok reason on challenge pass", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 3, output_tokens: 0 },
          answers: { verdict: { choice: "pass", confidence: 0.88 } },
        };
      },
    };
    const out = await applyTypeSafeFastJudge(
      {
        source: "ai",
        verdict: "pass",
        message: "You named who pays year 1.",
        lesson: "Mechanisms beat hopes.",
      },
      {
        mode: "judge-challenge",
        context: { playerAnswer: "The clinic board pays year 1 from the surplus cut." },
      },
      { client }
    );
    assert.equal(out.verdict, "pass");
    assert.match(out.message, /who pays year 1/);
  });

  it("sets scrutiny damage from quality", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 3, output_tokens: 0 },
          answers: { quality: { choice: "hit", confidence: 0.91 } },
        };
      },
    };
    const out = await applyTypeSafeFastJudge(
      { source: "ai", quality: "miss", damage: 0, message: "Nope." },
      {
        mode: "judge-scrutiny-move",
        context: { playerAnswer: "Ramirez can still refuse; the clinic pays the meter cap." },
      },
      { client }
    );
    assert.equal(out.quality, "hit");
    assert.equal(out.damage, 2);
  });

  it("keeps Grok/local contribution when the noul is uncertain", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 2, output_tokens: 0 },
          answers: { additive: { noul: 0.5 } },
        };
      },
    };
    const out = await applyTypeSafeFastJudge(
      { source: "local", additive: true, reason: "Local accept." },
      {
        mode: "judge-contribution",
        context: { beforeText: "Sensors page crews.", afterText: "Sensors page crews at dusk." },
      },
      { client }
    );
    assert.equal(out.additive, true);
    assert.match(out.reason, /Local accept/);
  });

  it("overrides heuristic convergence with a certain no", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 2, output_tokens: 0 },
          answers: { converge_n1: { noul: 0.05 } },
        };
      },
    };
    const out = await applyTypeSafeFastJudge(
      {
        source: "local",
        convergences: [
          { neighborId: "n1", converges: true, title: "AI × Robots", reason: "loop" },
        ],
      },
      {
        mode: "evaluate-convergence",
        context: {
          placed: { id: "p1", techId: "ai", techName: "AI" },
          neighbors: [{ id: "n1", techId: "robots", techName: "Robots" }],
        },
      },
      { client }
    );
    assert.equal(out.convergences[0].converges, false);
    assert.equal(out.convergences[0].title, "");
  });

  it("falls back to the incoming result when TypeSafe throws", async () => {
    let warned = "";
    const src = { source: "ai", verdict: "partial", message: "Keep me." };
    const out = await applyTypeSafeFastJudge(
      src,
      { mode: "judge-challenge", context: {} },
      {
        client: {
          async systemOne() {
            throw new Error("timeout");
          },
        },
        warn: (m) => {
          warned = m;
        },
      }
    );
    assert.match(warned, /timeout/);
    assert.equal(out.verdict, "partial");
    assert.match(out.message, /Keep me/);
    assert.equal(out.typesafeError.message, "timeout");
    assert.equal(out.typesafeError.mode, "judge-challenge");
  });

  it("does not claim Jev ran when there are no neighbors", async () => {
    let usage = 0;
    const client = {
      async systemOne() {
        throw new Error("should not be called");
      },
    };
    const out = await applyTypeSafeFastJudge(
      { source: "local", convergences: [] },
      {
        mode: "evaluate-convergence",
        context: { placed: { id: "p1" }, neighbors: [] },
      },
      { client, onUsage: () => { usage += 1; } }
    );
    assert.equal(usage, 0);
    assert.equal(out.typesafeTrace, undefined);
    assert.deepEqual(out.convergences, []);
  });
});

describe("parseFeasibilityAnswers", () => {
  it("composes from noul answers", () => {
    const judged = parseFeasibilityAnswers(
      {
        model: "jev-test",
        answers: {
          groundingForbid: { noul: 0.04 },
          sciFiRoutine: { noul: 0.91 },
          demonstratedByYear: { noul: 0.2 },
          timing: { choice: "green", confidence: 0.99 },
        },
      },
      {
        inventionHow: "Upload every mind in town this year as routine transit.",
        selectedTechIds: ["bci"],
        year: 2026,
      }
    );
    assert.equal(judged.level, "red");
    assert.match(judged.reason, /sci-fi/i);
  });
});

describe("parseConvergenceAnswers", () => {
  it("marks a certain demand loop", () => {
    const judged = parseConvergenceAnswers(
      {
        model: "jev-test",
        answers: { converge_bat: { noul: 0.92 } },
      },
      {
        placed: { id: "bat", techId: "battery", techName: "Batteries" },
        neighbors: [{ id: "bat", techId: "drones", techName: "Drones" }],
      }
    );
    // neighbor id "bat" slugs to converge_bat — used as the question id
    assert.equal(judged.convergences[0].converges, true);
    assert.match(judged.convergences[0].reason, /demand/);
  });
});
