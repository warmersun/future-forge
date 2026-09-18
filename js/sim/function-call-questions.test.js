/**
 * Function-call compose helpers — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  composeAddTechIds,
  composeChatIntent,
  composeLobbyEffects,
  composeLobbyKind,
  mentionTechCandidates,
} from "./function-call-questions.js";

describe("mentionTechCandidates", () => {
  const techs = [
    { id: "robots", name: "Robots" },
    { id: "ai", name: "Artificial Intelligence" },
    { id: "self-driving", name: "Self-Driving Cars" },
  ];
  it("over-finds catalog names and hyphenated ids", () => {
    const ids = mentionTechCandidates(
      "Add robots and self-driving on the corridor.",
      techs
    );
    assert.ok(ids.includes("robots"));
    assert.ok(ids.includes("self-driving"));
    assert.equal(ids.includes("ai"), false);
  });
});

describe("composeAddTechIds / intent / lobby", () => {
  it("keeps only TypeSafe-yes tech ids", () => {
    assert.deepEqual(
      composeAddTechIds(["robots", "ai", "iot"], {
        robots: true,
        ai: false,
        iot: null,
      }),
      ["robots"]
    );
  });

  it("treats low-confidence intent as uncertain", () => {
    const r = composeChatIntent("add_tech", 0.2);
    assert.equal(r.intent, "add_tech");
    assert.equal(r.uncertain, true);
  });

  it("tags only certain lobby effects and falls back kind", () => {
    assert.deepEqual(
      composeLobbyEffects({
        "share-required": true,
        "eval-required": null,
        backlash: false,
      }),
      ["share-required"]
    );
    assert.equal(composeLobbyKind("ban", 0.9, "policy"), "ban");
    assert.equal(composeLobbyKind("ban", 0.2, "policy"), "policy");
  });
});
