import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dailySeedString,
  hashSeed,
  pickDailyMission,
  kindLabelForOutcome,
  MAX_PINS,
} from "./meta.js";

describe("meta dailies", () => {
  it("formats daily seed YYYY-MM-DD", () => {
    const s = dailySeedString(new Date("2026-07-24T12:00:00"));
    assert.equal(s, "2026-07-24");
  });

  it("hashSeed is stable", () => {
    assert.equal(hashSeed("abc"), hashSeed("abc"));
    assert.notEqual(hashSeed("abc"), hashSeed("abd"));
  });

  it("pickDailyMission is deterministic for a seed", () => {
    const globals = [
      { id: "a", title: "A", blurb: "", kind: "now" },
      { id: "b", title: "B", blurb: "", kind: "now" },
    ];
    const pack = (g, { salt }) => [
      {
        id: `${g.id}-m0-${salt}`,
        globalId: g.id,
        title: `${g.title} mission`,
        place: "Place",
        scene: "Scene",
      },
    ];
    const d1 = pickDailyMission(globals, pack, "2026-07-24");
    const d2 = pickDailyMission(globals, pack, "2026-07-24");
    assert.equal(d1.mission.id, d2.mission.id);
    assert.equal(d1.global.id, d2.global.id);
    assert.equal(d1.seed, "2026-07-24");
  });

  it("kind labels and pin cap", () => {
    assert.equal(kindLabelForOutcome("win"), "Crisis eased");
    assert.equal(kindLabelForOutcome("collapse", { bankrupt: true }), "Out of capital");
    assert.equal(MAX_PINS, 3);
  });
});
