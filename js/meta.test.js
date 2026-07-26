import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dailySeedString,
  hashSeed,
  pickDailyMission,
  kindLabelForOutcome,
  normalizeCrisisMeters,
  normalizeShareTechs,
  isUsableVisionUrl,
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

  it("normalizeCrisisMeters clamps 0–5", () => {
    const m = normalizeCrisisMeters({ Floods: 3, Trust: 9, Empty: -1 });
    assert.deepEqual(
      m.map((x) => [x.key, x.value]),
      [
        ["Floods", 3],
        ["Trust", 5],
        ["Empty", 0],
      ]
    );
  });

  it("normalizeShareTechs keeps icons", () => {
    const t = normalizeShareTechs([
      { id: "solar", name: "Solar Power", icon: "☀" },
      "raw-string",
    ]);
    assert.equal(t[0].icon, "☀");
    assert.equal(t[0].name, "Solar Power");
    assert.equal(t[1].name, "raw-string");
  });

  it("isUsableVisionUrl accepts image data/blob/http and rejects empty page URLs", () => {
    assert.equal(isUsableVisionUrl("data:image/png;base64,abc"), true);
    assert.equal(isUsableVisionUrl("blob:http://localhost/uuid"), true);
    assert.equal(isUsableVisionUrl("https://cdn.example/vision.png"), true);
    assert.equal(isUsableVisionUrl(""), false);
    assert.equal(isUsableVisionUrl("not-a-url"), false);
  });
});
