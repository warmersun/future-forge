import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverSrc = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const portalSrc = fs.readFileSync(path.join(root, "portal/server.mjs"), "utf8");
const tideglass = JSON.parse(
  fs.readFileSync(path.join(root, "quests/preventing-mirror-life-tideglass.json"), "utf8")
);

describe("tutor prompt contract", () => {
  it("does not tell the model to send a one-breath telegram", () => {
    assert.equal(serverSrc.includes("one-breath"), false);
    assert.equal(serverSrc.includes("one or two full sentences that name the idea"), false);
    assert.equal(serverSrc.includes("One short core idea"), false);
  });

  it("prioritizes learner requests over default pacing and scaffolding in both servers", () => {
    const parts = [];
    for (const [label, src] of [["server.mjs", serverSrc], ["portal/server.mjs", portalSrc]]) {
      const prompt = src.match(/const TUTOR_SYSTEM_PROMPT = `([\s\S]*?)`;\n/);
      const rule = src.match(/\? "\s*(Tutor mode: [^"]+)"/);
      assert.ok(prompt, `${label}: tutor prompt exists`);
      assert.ok(rule, `${label}: tutor payload rule exists`);
      assert.match(prompt[1], /Follow the learner’s explicit request over default pacing/);
      assert.match(prompt[1], /Never require them to suggest ideas or demonstrate understanding/);
      assert.match(prompt[1], /provide a complete solution when asked/);
      assert.match(prompt[1], /cover more when the learner asks/);
      assert.match(prompt[1], /learner decides what to apply/);
      assert.match(prompt[1], /SEQUENCE paces unsolicited next ideas/);
      assert.match(rule[1], /full solutions without requiring ideas first/);
      assert.doesNotMatch(prompt[1], /When they ask for a full solution, give a partial scaffold/);
      assert.doesNotMatch(rule[1], /never rewrite a page/);
      parts.push([prompt[1], rule[1]]);
    }
    assert.deepEqual(parts[0], parts[1]);
  });

  it("names the spotlight advance in tutor mode only", () => {
    for (const [label, src] of [
      ["server.mjs", serverSrc],
      ["portal/server.mjs", portalSrc],
    ]) {
      assert.match(src, /If context\.spotlightAdvance is set/, label);
      assert.match(src, /spotlightAdvance: tutorMode \? resolveSpotlightAdvance\(context\) : null/, label);
      const payloadIdx = src.indexOf("spotlightAdvance: tutorMode ? resolveSpotlightAdvance(context) : null");
      assert.ok(payloadIdx > 0, `${label} payload includes spotlightAdvance`);
      const nearby = src.slice(Math.max(0, payloadIdx - 400), payloadIdx);
      assert.match(nearby, /isLearningModule: tutorMode/, `${label} payload is tutor-gated`);
    }
  });

  it("Tideglass curriculum matches the paragraph contract", () => {
    const ctx = String(tideglass.aiTutorContext || "");
    assert.equal(ctx.includes("one-breath"), false);
    assert.match(ctx, /short paragraph \(analogy \+ one mechanism\)/);
    assert.match(ctx, /SEQUENCE does not block a later idea/);
    assert.match(ctx, /^1\) /m);
    assert.match(ctx, /^2\) /m);
    assert.equal((ctx.match(/^3\) /m) || []).length, 1);
  });
});
