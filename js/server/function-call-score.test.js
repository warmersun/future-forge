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
});
