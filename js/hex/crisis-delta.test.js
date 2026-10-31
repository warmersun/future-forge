import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { crisisRoleKeys, scopeCrisisScore } from "./crisis-delta.js";
import { seedCrisisTiles, cloneBoard, boardForWire, addTile, mintInventionTile, placeTile } from "./board-state.js";
import { normalizePathwayScore, blendPathwayScore, heuristicPathwayScore, applyPathwayPressure, pathwayContentFingerprint } from "./evaluate.js";
import { clampPathwayScore } from "../sim/policy-honesty.js";
import { formatPathwayScoreLog } from "../captain-log.js?v=crisis-role-2";

const allRoles = ["local", "global", "support"];
const raw = {
  crisisDelta: {
    local: { delta: -1, reason: "Ranking disagreements focuses scarce lab slots on informative T-cell trials." },
    global: { delta: -2, reason: "Unsolicited root-cause assessment." },
    support: { delta: 0, reason: "Unsolicited public-support assessment." },
  },
  concerns: { ethicist: { level: "yellow", reason: "A separate concern remains." } },
};
const inventions = [{ kind: "invention", id: "a", techId: "ai", year: 2026,
  timingLevel: "green", feasibilityPct: 85,
  howText: "Rank frozen-model disagreements against no-change and average-response baselines." }];

function assertRoles(score, roles) {
  assert.deepEqual(Object.keys(score.crisisDelta), roles);
  assert.deepEqual(Object.keys(score.crisisReasons), roles);
}

const subsets = [[], ["local"], ["global"], ["support"], ["local", "global"], ["local", "support"], ["global", "support"], allRoles];
describe("only authored crisis meters are assessed", () => {
  it("rejects unknown roles and deduplicates context rows", () => {
    assert.deepEqual(crisisRoleKeys([{ role: "local" }, "local", null, "imaginary", { role: "support" }]), ["local", "support"]);
    assert.deepEqual(crisisRoleKeys(undefined), []);
    assert.deepEqual(scopeCrisisScore(raw, undefined).crisisDelta, {});
  });

  for (const roles of subsets) {
    it(`scopes normalization, fallback, blending, policy and logs to ${roles.join("/") || "no meters"}`, () => {
      const contextRows = roles.map((role) => ({ role }));
      const scoped = scopeCrisisScore(raw, contextRows);
      const normalized = normalizePathwayScore(raw, contextRows);
      const fallback = heuristicPathwayScore(inventions, 2026, { crisisRoles: contextRows });
      const blended = blendPathwayScore(normalized, fallback, contextRows);
      const emptyResponseFallback = blendPathwayScore({}, fallback, contextRows);
      const policy = clampPathwayScore(blended, inventions, { globalId: "automation", crisisRoles: roles });
      const statute = clampPathwayScore(blended, [{ techId: "ai", howText: "The council passes a law to ban AI." }], { crisisRoles: roles });
      for (const score of [scoped, normalized, fallback, blended, emptyResponseFallback, policy, statute]) {
        assertRoles(score, roles);
      }
      assert.deepEqual(normalized.concerns, raw.concerns);
      assert.deepEqual(policy.concerns, raw.concerns);
      const log = formatPathwayScoreLog(raw, { crisisRoles: contextRows }).detail;
      const labels = { local: "Local", global: "Global", support: "Support" };
      for (const role of allRoles) assert.equal(log.includes(labels[role] + " "), roles.includes(role));
      assert.match(log, /Ethicist yellow/);
      if (roles.includes("support")) assert.match(log, /Support 0 — Unsolicited public-support assessment/);
    });
  }

  it("preserves a sparse score without filling absent roles", () => {
    const score = normalizePathwayScore({ crisisDelta: { local: raw.crisisDelta.local } });
    assertRoles(score, ["local"]);
    assert.doesNotMatch(formatPathwayScoreLog(score).detail, /Global|Support/);
    assertRoles(heuristicPathwayScore(inventions, 2026), []);
  });

  for (const roles of subsets.filter((roles) => roles.length)) {
    it(`cleans legacy cache during clone, wire round-trip and rule invalidation: ${roles.join("/")}`, () => {
      const pressure = Object.fromEntries(roles.map((role) => [role === "local" ? "Uncertain Experiments" : role, 3]));
      let board = seedCrisisTiles({ crisisRoles: roles, pressure });
      board = addTile(board, mintInventionTile(inventions[0]));
      const placed = placeTile(board, "a", -3, -3);
      assert.equal(placed.ok, true);
      board = placed.board;
      const fp = pathwayContentFingerprint([board.tiles.a], board);
      board.pathwayImpacts[fp] = { ...structuredClone(raw), inventionIds: ["a"], pending: false };
      for (const copy of [cloneBoard(board), boardForWire(board), cloneBoard(JSON.parse(JSON.stringify(board)))]) {
        assertRoles(copy.pathwayImpacts[fp], roles);
      }
      // A policy clamp must not recreate absent global/support assessments.
      const applied = applyPathwayPressure(board, {
        globalId: "automation",
        rules: [{ id: "share", status: "active", effects: ["share-required"] }],
      });
      assertRoles(applied.board.pathwayImpacts[fp], roles);
      assert.deepEqual(Object.keys(applied.displayPressure), Object.keys(pressure));
      assert.deepEqual(Object.keys(board.pathwayImpacts[fp].crisisDelta), allRoles);
    });
  }
});
