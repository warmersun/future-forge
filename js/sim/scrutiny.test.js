import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickChallengeAngles,
  encounterCountForFeasibility,
  buildEncounters,
  applyArgueResult,
  applyPatchResult,
  applyPivotResult,
  allEncountersCleared,
  activeEncounter,
  localArgueQuality,
  MISS_BUDGET,
} from "./scrutiny.js";

const ANGLES = [
  { id: "moloch", label: "Moloch" },
  { id: "ethicist", label: "Ethicist" },
  { id: "stakeholder", label: "Stakeholder" },
  { id: "nature", label: "Nature" },
];

describe("scrutiny", () => {
  it("picks distinct angles", () => {
    const picked = pickChallengeAngles(ANGLES, 3);
    assert.equal(picked.length, 3);
    const ids = new Set(picked.map((a) => a.id));
    assert.equal(ids.size, 3);
  });

  it("encounter count by feasibility", () => {
    assert.equal(encounterCountForFeasibility("green"), 2);
    assert.equal(encounterCountForFeasibility("yellow"), 3);
  });

  it("argue hit clears 2 HP encounter", () => {
    let s = { missCount: 0, pivotUsed: false, encounters: buildEncounters([ANGLES[0]], 2) };
    const id = s.encounters[0].id;
    let r = applyArgueResult(s, id, "hit");
    assert.equal(r.damage, 2);
    assert.equal(r.cleared, true);
    assert.equal(allEncountersCleared(r.scrutiny), true);
  });

  it("miss increments budget", () => {
    let s = { missCount: 0, pivotUsed: false, encounters: buildEncounters([ANGLES[0]], 2) };
    const id = s.encounters[0].id;
    const r = applyArgueResult(s, id, "miss");
    assert.equal(r.miss, true);
    assert.equal(r.scrutiny.missCount, 1);
    assert.ok(r.scrutiny.missCount < MISS_BUDGET);
  });

  it("pivot clears once", () => {
    let s = { missCount: 0, pivotUsed: false, encounters: buildEncounters(ANGLES.slice(0, 2), 2) };
    const id = s.encounters[0].id;
    const r = applyPivotResult(s, id);
    assert.equal(r.ok, true);
    assert.equal(r.scrutiny.pivotUsed, true);
    assert.equal(r.scrutiny.encounters[0].cleared, true);
    const r2 = applyPivotResult(r.scrutiny, r.scrutiny.encounters[1].id);
    assert.equal(r2.ok, false);
  });

  it("patch deals 1 or 2", () => {
    let s = { missCount: 0, pivotUsed: false, encounters: buildEncounters([ANGLES[0]], 2) };
    const id = s.encounters[0].id;
    const r = applyPatchResult(s, id, false);
    assert.equal(r.damage, 1);
    assert.equal(r.scrutiny.encounters[0].hp, 1);
  });

  it("local argue quality", () => {
    assert.equal(localArgueQuality("short").quality, "miss");
    assert.equal(
      localArgueQuality(
        "The clinic board will pay year-1 costs and we meter use so freeriders cannot skip the fee limit."
      ).quality,
      "hit"
    );
  });

  it("active encounter advances", () => {
    const s = {
      missCount: 0,
      encounters: buildEncounters(ANGLES.slice(0, 2), 2),
    };
    assert.equal(activeEncounter(s).angleId, s.encounters[0].angleId);
    s.encounters[0].cleared = true;
    assert.equal(activeEncounter(s).angleId, s.encounters[1].angleId);
  });
});
