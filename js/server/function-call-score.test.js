/**
 * Chat / lobby TypeSafe overlay — mocked client, no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyChatJudgment,
  applyTypeSafeFunctionCall,
} from "./function-call-score.mjs";

describe("applyChatJudgment", () => {
  it("clears stack applies on a none intent", () => {
    const out = applyChatJudgment(
      {
        message: "What is a sensor?",
        proposals: {
          addTechIds: ["iot"],
          inventionHow: "Should not apply.",
          inventionImpact: null,
          removeTechIds: [],
          inventionName: null,
          scrutiny: null,
        },
        endTutoring: true,
      },
      { intent: "none", intentUncertain: false, addTechIds: ["iot"], endTutoring: false },
      { tutorMode: true }
    );
    assert.deepEqual(out.proposals.addTechIds, []);
    assert.equal(out.proposals.inventionHow, null);
    assert.equal(out.endTutoring, undefined);
  });

  it("keeps filtered addTechIds on add_tech", () => {
    const out = applyChatJudgment(
      {
        proposals: {
          addTechIds: ["robots", "ai"],
          inventionHow: "A leftover draft.",
          removeTechIds: [],
          inventionName: null,
          inventionImpact: null,
          scrutiny: null,
        },
      },
      { intent: "add_tech", intentUncertain: false, addTechIds: ["robots"] },
      {}
    );
    assert.deepEqual(out.proposals.addTechIds, ["robots"]);
    assert.equal(out.proposals.inventionHow, null);
  });

  it("clears leftover how-drafts when intent is uncertain", () => {
    const out = applyChatJudgment(
      {
        proposals: {
          addTechIds: ["iot"],
          inventionHow: "Should not apply.",
          inventionImpact: "Leftover life.",
          inventionName: "Leftover name",
          removeTechIds: [],
          scrutiny: null,
        },
      },
      {
        intent: "none",
        intentUncertain: true,
        addTechIds: ["iot"],
      },
      {}
    );
    assert.deepEqual(out.proposals.addTechIds, []);
    assert.equal(out.proposals.inventionHow, null);
    assert.equal(out.proposals.inventionImpact, null);
    assert.equal(out.proposals.inventionName, null);
  });

  it("does not apply addTechIds when add_tech is uncertain", () => {
    const out = applyChatJudgment(
      {
        proposals: {
          addTechIds: ["robots"],
          inventionHow: "Leftover.",
          inventionImpact: null,
          inventionName: null,
          removeTechIds: [],
          scrutiny: null,
        },
      },
      { intent: "add_tech", intentUncertain: true, addTechIds: ["robots"] },
      {}
    );
    assert.deepEqual(out.proposals.addTechIds, []);
    assert.equal(out.proposals.inventionHow, null);
  });
});

describe("applyTypeSafeFunctionCall", () => {
  it("tags lobby effects from Nouls", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 4, output_tokens: 0 },
          answers: {
            kind: { choice: "policy", confidence: 0.9 },
            "share-required": { noul: 0.94 },
            "eval-required": { noul: 0.05 },
            backlash: { noul: 0.8 },
          },
        };
      },
    };
    const out = await applyTypeSafeFunctionCall(
      { source: "local", kind: "regulation", effects: [] },
      {
        mode: "tag-lobby-rule",
        context: {
          kind: "regulation",
          label: "Crew cut",
          body: "Sorter surplus hits the crew wallet every Friday.",
        },
      },
      { client }
    );
    assert.equal(out.kind, "policy");
    assert.deepEqual(out.effects, ["share-required", "backlash"]);
  });

  it("filters chat addTechIds and can end tutoring", async () => {
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 5, output_tokens: 0 },
          answers: {
            intent: { choice: "end_tutoring", confidence: 0.88 },
            endTutoring: { noul: 0.91 },
            add_robots: { noul: 0.2 },
          },
        };
      },
    };
    const out = await applyTypeSafeFunctionCall(
      {
        message: "You're ready — go invent.",
        proposals: { addTechIds: ["robots"], inventionHow: null },
        endTutoring: false,
      },
      {
        mode: "chat",
        messages: [{ role: "user", content: "I get it, I will invent now." }],
        context: {
          tutorMode: true,
          availableTechs: [{ id: "robots", name: "Robots" }],
        },
      },
      { client }
    );
    assert.equal(out.endTutoring, true);
    assert.deepEqual(out.proposals.addTechIds, []);
  });

  it("leaves chat alone without a client", async () => {
    const src = { proposals: { addTechIds: ["iot"] } };
    const out = await applyTypeSafeFunctionCall(
      src,
      { mode: "chat" },
      { client: null }
    );
    assert.equal(out, src);
  });

  it("does not attach a trace when suggest-stack has no questions", async () => {
    let called = 0;
    let usage = 0;
    const client = {
      async systemOne() {
        called += 1;
        return { model: "jev-test", usage: {}, answers: {} };
      },
    };
    const out = await applyTypeSafeFunctionCall(
      { proposals: { addTechIds: [] } },
      { mode: "suggest-stack", context: { availableTechs: [] } },
      { client, onUsage: () => { usage += 1; } }
    );
    assert.equal(called, 0);
    assert.equal(usage, 0);
    assert.equal(out.typesafeTrace, undefined);
  });

  it("does not ask endTutoring after the tutor session ended", async () => {
    let questions;
    const client = {
      async systemOne(req) {
        questions = req.questions;
        return {
          model: "jev-test",
          usage: { input_tokens: 1, output_tokens: 0 },
          answers: { intent: { choice: "none", confidence: 0.9 } },
        };
      },
    };
    await applyTypeSafeFunctionCall(
      { message: "ok", proposals: {} },
      {
        mode: "chat",
        messages: [{ role: "user", content: "What next?" }],
        context: { tutorMode: false, isLearningModule: true },
      },
      { client }
    );
    assert.equal(questions.endTutoring, undefined);
    assert.ok(questions.intent);
  });

  it("stamps typesafeError when the overlay throws", async () => {
    let usage = null;
    const out = await applyTypeSafeFunctionCall(
      { source: "local", kind: "policy", effects: [] },
      { mode: "tag-lobby-rule", context: { kind: "policy", label: "x", body: "y" } },
      {
        client: {
          async systemOne() {
            throw new Error("timeout");
          },
        },
        warn: () => {},
        onUsage: (info) => {
          usage = info;
        },
      }
    );
    assert.equal(out.kind, "policy");
    assert.equal(out.typesafeError.message, "timeout");
    assert.equal(out.typesafeError.mode, "tag-lobby-rule");
    assert.equal(usage.ok, false);
    assert.equal(out.typesafeTrace, undefined);
  });

  it("forwards requestOptions.signal to systemOne", async () => {
    const ac = new AbortController();
    let got;
    const client = {
      async systemOne(_req, options) {
        got = options;
        return {
          model: "jev-test",
          usage: { input_tokens: 1, output_tokens: 0 },
          answers: {
            kind: { choice: "policy", confidence: 0.9 },
            "share-required": { noul: 0.1 },
            "eval-required": { noul: 0.1 },
            backlash: { noul: 0.1 },
          },
        };
      },
    };
    await applyTypeSafeFunctionCall(
      { kind: "policy", effects: [] },
      { mode: "tag-lobby-rule", context: { kind: "policy", label: "x", body: "y" } },
      { client, requestOptions: { signal: ac.signal } }
    );
    assert.equal(got.signal, ac.signal);
  });
});
