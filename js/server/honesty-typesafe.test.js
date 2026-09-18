/**
 * TypeSafe honesty question builders — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  flagsFromNouls,
  honestyTypeSafeQuestions,
  honestyTypeSafeState,
  parsePathwayTypeSafeAnswers,
  pathwayDeltaQuestions,
  pathwayTypeSafeState,
} from "./honesty-typesafe.mjs";

describe("honestyTypeSafeQuestions", () => {
  it("builds four noul questions", () => {
    const q = honestyTypeSafeQuestions();
    assert.equal(q.mechanism.type, "noul");
    assert.equal(q.purePolicy.type, "noul");
    assert.equal(q.shareBridge.type, "noul");
    assert.equal(q.evalOverride.type, "noul");
  });
});

describe("flagsFromNouls", () => {
  it("marks the uncertain band as null flags", () => {
    const flags = flagsFromNouls({
      mechanism: 0.9,
      purePolicy: 0.1,
      shareBridge: 0.5,
      evalOverride: 0.2,
    });
    assert.equal(flags.source, "typesafe");
    assert.equal(flags.mechanism, true);
    assert.equal(flags.purePolicy, false);
    assert.equal(flags.shareBridge, null);
    assert.equal(flags.evalOverride, false);
    assert.equal(flags.uncertain.shareBridge, true);
    assert.equal(flags.uncertain.mechanism, undefined);
  });
});

describe("parsePathwayTypeSafeAnswers", () => {
  it("reads Choices, zeros an uncertain ease, and forces unanswered critics red", () => {
    const judged = parsePathwayTypeSafeAnswers(
      {
        model: "jev-test",
        usage: { input_tokens: 1, output_tokens: 0 },
        answers: {
          mechanism: { noul: 0.9 },
          purePolicy: { noul: 0.05 },
          shareBridge: { noul: 0.9 },
          evalOverride: { noul: 0.05 },
          delta_local: { choice: "ease1", confidence: 0.9 },
          delta_global: { choice: "ease1", confidence: 0.2 },
          delta_support: { choice: "none", confidence: 0.8 },
          concern_moloch: { choice: "green", confidence: 0.9 },
        },
      },
      {
        concerns: [
          { angle: "moloch", inventChanged: false, playerAnswer: "" },
          { angle: "nature", inventChanged: true, playerAnswer: "A cap." },
        ],
      }
    );
    assert.equal(judged.crisisDelta.local, -1);
    assert.equal(judged.crisisDelta.global, 0);
    assert.equal(judged.scoreUncertain, true);
    assert.equal(judged.concerns.moloch.level, "red");
    assert.equal(judged.concerns.nature, undefined);
  });
});

describe("pathwayDeltaQuestions", () => {
  it("builds three crisis Choices", () => {
    const q = pathwayDeltaQuestions();
    assert.equal(q.delta_local.type, "choice");
    assert.equal(q.delta_global.type, "choice");
    assert.equal(q.delta_support.type, "choice");
    assert.ok(q.delta_local.criteria.ease1);
  });
});

describe("honestyTypeSafeState", () => {
  it("clips how-text and slims rules", () => {
    const state = honestyTypeSafeState({
      howText: "Aisle robots finish the easy shelves.",
      techIds: [{ techId: "robots" }, "ai"],
      globalId: "automation",
      year: 2026,
      rules: [{ id: "piece-rate", kind: "policy", label: "Piece-rate", status: "active" }],
    });
    assert.equal(state.pathway.howText.includes("Aisle robots"), true);
    assert.deepEqual(state.pathway.techIds, ["robots", "ai"]);
    assert.equal(state.mission.globalId, "automation");
    assert.equal(state.rules[0].id, "piece-rate");
  });
});

describe("pathwayTypeSafeState", () => {
  it("adds inventions, crisis roles, and concerns", () => {
    const state = pathwayTypeSafeState({
      howText: "Sensors page the pump crew.",
      inventions: [{ techId: "iot", howText: "Sensors page the pump crew." }],
      crisisRoles: [{ role: "local", name: "Floods", description: "The quay goes under." }],
      concerns: [{ angle: "moloch", challengeQuestion: "Who defects?" }],
    });
    assert.equal(state.pathway.inventions[0].techId, "iot");
    assert.equal(state.crisisRoles[0].role, "local");
    assert.equal(state.concerns[0].angle, "moloch");
  });
});
