import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { packRulesForMission } from "../data.js";
import {
  parseQuestRules,
  seedLiveRules,
  writeLobbyRule,
  setRuleStatus,
  removeLobbyRule,
  honestyNeeds,
  effectSet,
  activeRules,
  rulesWeatherKey,
  liveRulesOrSeed,
  MAX_QUEST_RULES,
  MAX_LIVE_RULES,
} from "./policy-rules.js";

describe("rulesWeatherKey", () => {
  it("is order-independent and includes status", () => {
    assert.equal(rulesWeatherKey(undefined), "");
    assert.equal(
      rulesWeatherKey([{ id: "b", status: "active" }, { id: "a" }]),
      "a:active|b:active"
    );
    assert.notEqual(
      rulesWeatherKey([{ id: "a", status: "active" }]),
      rulesWeatherKey([{ id: "a", status: "suspended" }])
    );
  });
});

describe("parseQuestRules", () => {
  it("omits unused", () => {
    assert.deepEqual(parseQuestRules(undefined), { ok: true, value: null });
    assert.deepEqual(parseQuestRules(null), { ok: true, value: null });
  });

  it("rejects empty or too many", () => {
    assert.equal(parseQuestRules([]).ok, false);
    const many = Array.from({ length: MAX_QUEST_RULES + 1 }, (_, i) => ({
      id: `r-${i}`,
      kind: "policy",
      label: `Rule ${i}`,
    }));
    assert.equal(parseQuestRules(many).ok, false);
  });

  it("accepts 1–3 named rules and aliases contract → policy", () => {
    const r = parseQuestRules([
      {
        id: "piece-rate-follows-robots",
        kind: "contract",
        label: "Piece-rate follows robot pace",
        body: "The unit rate learns from robot clean runs.",
        effects: ["share-required", "backlash"],
      },
    ]);
    assert.equal(r.ok, true);
    assert.equal(r.value[0].kind, "policy");
    assert.deepEqual(r.value[0].effects, ["share-required", "backlash"]);
  });

  it("rejects unknown effects and duplicate ids", () => {
    assert.equal(
      parseQuestRules([
        { id: "a", kind: "ban", label: "Pause", effects: ["tax-holiday"] },
      ]).ok,
      false
    );
    assert.equal(
      parseQuestRules([
        { id: "same", kind: "law", label: "One" },
        { id: "same", kind: "law", label: "Two" },
      ]).ok,
      false
    );
  });
});

describe("lobby write / suspend", () => {
  it("adds a player-written rule without effects or meter math", () => {
    const seeded = seedLiveRules(
      [
        {
          id: "override-lock",
          kind: "policy",
          label: "Override lock",
          effects: ["eval-required", "backlash"],
        },
      ],
      2026
    );
    const w = writeLobbyRule(seeded, {
      kind: "regulation",
      label: "Logged override in the trauma bay",
      body: "Ramirez can still fire a two-finger override when the belly is tight.",
      year: 2026,
    });
    assert.equal(w.ok, true);
    assert.equal(w.rule.source, "lobby");
    assert.equal(w.rule.kind, "regulation");
    assert.equal(w.rules.length, 2);
    assert.equal(w.rule.effects, undefined);
  });

  it("suspends backlash without dropping share honesty on automation", () => {
    const live = seedLiveRules(
      [
        {
          id: "piece-rate",
          kind: "policy",
          label: "Piece-rate follows robot pace",
          effects: ["share-required", "backlash"],
        },
      ],
      2026
    );
    const s = setRuleStatus(live, "piece-rate", "suspended");
    assert.equal(s.ok, true);
    assert.equal(activeRules(s.rules).length, 0);
    assert.equal(effectSet(s.rules).has("backlash"), false);
    const needs = honestyNeeds({ globalId: "automation", rules: s.rules });
    assert.equal(needs.share, true);
    assert.equal(needs.backlash, false);
  });

  it("removes a quest or lobby rule from the books", () => {
    const live = seedLiveRules(
      [
        {
          id: "override-lock",
          kind: "policy",
          label: "Override lock",
          body: "Risk office grayed human overrides.",
          effects: ["eval-required"],
        },
      ],
      2026
    );
    const gone = removeLobbyRule(live, "override-lock");
    assert.equal(gone.ok, true);
    assert.equal(gone.rules.length, 0);
    assert.equal(gone.rule.id, "override-lock");
    const miss = removeLobbyRule(gone.rules, "override-lock");
    assert.equal(miss.ok, false);
    assert.equal(miss.error, "rule_missing");
  });

  it("write-then-remove of a quest lock restores theme backlash", () => {
    const live = seedLiveRules(
      [
        {
          id: "piece-rate",
          kind: "policy",
          label: "Piece-rate follows robot pace",
          effects: ["share-required", "backlash"],
        },
      ],
      2026
    );
    const w = writeLobbyRule(live, {
      kind: "policy",
      label: "Harbor curfew",
      year: 2026,
    });
    const gone = removeLobbyRule(w.rules, "piece-rate");
    assert.equal(gone.ok, true);
    const needs = honestyNeeds({ globalId: "automation", rules: gone.rules });
    assert.equal(needs.share, true);
    assert.equal(needs.backlash, true);
    assert.equal(
      gone.rules.some((row) => row.source === "lobby"),
      true
    );
  });

  it("caps live rules", () => {
    let rules = [];
    for (let i = 0; i < MAX_LIVE_RULES; i++) {
      const w = writeLobbyRule(rules, { kind: "ban", label: `Ban ${i}`, year: 2026 });
      assert.equal(w.ok, true);
      rules = w.rules;
    }
    const full = writeLobbyRule(rules, { kind: "law", label: "One more", year: 2026 });
    assert.equal(full.ok, false);
    assert.equal(full.error, "rules_full");
  });
});

describe("packRulesForMission", () => {
  it("restores the Cedar Junction piece-rate lock by title", () => {
    const r = packRulesForMission({
      globalId: "automation",
      title: "Aisles that pick themselves",
    });
    assert.equal(r?.[0]?.id, "piece-rate-follows-robots");
  });
});

describe("honestyNeeds", () => {
  it("keeps theme honesty when no rules", () => {
    const a = honestyNeeds({ globalId: "automation", rules: [] });
    assert.equal(a.share, true);
    assert.equal(a.backlash, true);
    const w = honestyNeeds({ globalId: "water", rules: [] });
    assert.equal(w.share, false);
    assert.equal(w.eval, false);
  });
});

describe("liveRulesOrSeed", () => {
  it("seeds when missing and keeps an empty live list", () => {
    const quest = [
      { id: "override-lock", kind: "policy", label: "Override lock" },
    ];
    const seeded = liveRulesOrSeed(undefined, quest, 2026);
    assert.equal(seeded[0].id, "override-lock");
    assert.equal(seeded[0].source, "quest");
    assert.deepEqual(liveRulesOrSeed([], quest, 2026), []);
  });
});
