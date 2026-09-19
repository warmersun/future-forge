import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WHY_MAX,
  DO_NOT_SAY,
  clipLine,
  capabilityLine,
  metersByHeat,
  suggestedIds,
  whyHere,
  pickTechsForCrisis,
  splitTray,
  sanitizeSuggestedWhy,
} from "./tech-why.js";

const iot = { id: "iot", name: "IoT", summary: "Sensors that make the physical world measurable.", inventionHint: "Early warning and continuous monitoring.", useCasesNow: ["Air sensors on lamp posts"] };
const solar = { id: "solar", name: "Solar Power", summary: "Electricity from sunlight.", inventionHint: "Roofs, pumps, microgrids." };
const ai = { id: "ai", name: "AI", summary: "Systems that decide from data.", useCasesNow: ["Triage queues"] };
const vr = { id: "vr", name: "VR", summary: "Shared views.", maturity: { now: "Headsets in training rooms" } };
const TECHS = [iot, solar, ai, vr];

const mission = {
  id: "smog",
  place: "East Industrial Corridor",
  pressure: { AsthmaDays: 3, ParentTrust: 2, CorridorPM: 3 },
  winMax: { AsthmaDays: 1, ParentTrust: 1, CorridorPM: 1 },
  crisisRoles: ["local", "global", "support"],
  suggested: ["iot", "ai", "solar"],
};

describe("clipLine / capabilityLine", () => {
  it("clips long text at a word boundary with an ellipsis", () => {
    const s = clipLine("a".repeat(50) + " word ".repeat(30), 60);
    assert.ok(s.length <= 60);
    assert.ok(s.endsWith("…"));
  });
  it("prefers inventionHint, then useCasesNow, then maturity.now, then summary", () => {
    assert.equal(capabilityLine(iot), "Early warning and continuous monitoring.");
    assert.equal(capabilityLine(ai), "Triage queues");
    assert.equal(capabilityLine(vr), "Headsets in training rooms");
    assert.equal(capabilityLine({ summary: "Just a summary." }), "Just a summary.");
    assert.equal(capabilityLine(null), "");
  });
});

describe("metersByHeat", () => {
  it("orders by distance above the win goal, hottest first, with roles", () => {
    const m = metersByHeat(mission);
    assert.deepEqual(m.map((x) => x.label), ["AsthmaDays", "CorridorPM", "ParentTrust"]);
    assert.equal(m[0].role, "local");
    assert.equal(m[1].role, "support");
  });
  it("tolerates missing pressure", () => {
    assert.deepEqual(metersByHeat({}), []);
  });
});

describe("suggestedIds / splitTray", () => {
  it("puts the spotlight first and dedupes", () => {
    assert.deepEqual(suggestedIds({ suggested: ["ai", "iot"], spotlight: { techId: "iot" } }), ["iot", "ai"]);
  });
  it("splits the catalog and keeps authored order on the shelf", () => {
    const { place, rest } = splitTray(mission, TECHS);
    assert.deepEqual(place.map((t) => t.id), ["iot", "ai", "solar"]);
    assert.deepEqual(rest.map((t) => t.id), ["vr"]);
  });
  it("empty suggested → everything is rest", () => {
    const { place, rest } = splitTray({}, TECHS);
    assert.equal(place.length, 0);
    assert.equal(rest.length, 4);
  });
});

describe("whyHere", () => {
  it("uses the authored reason when present", () => {
    const m = { ...mission, suggestedWhy: { iot: "Cheap sensors can prove which hour the haze peaks." } };
    assert.equal(whyHere(iot, m), "Cheap sensors can prove which hour the haze peaks.");
  });
  it("falls back to capability + hottest meter", () => {
    assert.equal(whyHere(iot, mission), "Early warning and continuous monitoring — for AsthmaDays.");
  });
  it("uses the spotlight advance for the spotlight tech", () => {
    const m = { ...mission, spotlight: { techId: "iot", advanceSummary: "Sensors got cheap. Second sentence ignored." } };
    assert.equal(whyHere(iot, m), "Sensors got cheap.");
  });
  it("stays within WHY_MAX and avoids banned words", () => {
    const m = { ...mission, suggestedWhy: { iot: "x".repeat(300) } };
    assert.ok(whyHere(iot, m).length <= WHY_MAX);
    for (const t of TECHS) assert.ok(!DO_NOT_SAY.test(whyHere(t, mission)), t.id);
  });
});

describe("pickTechsForCrisis", () => {
  it("prefers authored reasons naming the meter, then shelf order, capped at n", () => {
    const m = { ...mission, suggestedWhy: { solar: "Clean power cuts CorridorPM at the depot." } };
    const picks = pickTechsForCrisis(m, TECHS, { meterLabel: "CorridorPM" }, 2);
    assert.deepEqual(picks.map((p) => p.tech.id), ["solar", "iot"]);
    assert.equal(picks[0].why, "Clean power cuts CorridorPM at the depot.");
  });
  it("returns [] when nothing is suggested", () => {
    assert.deepEqual(pickTechsForCrisis({}, TECHS, { meterLabel: "X" }), []);
  });
});

describe("sanitizeSuggestedWhy", () => {
  it("keeps known ids with string reasons only", () => {
    const out = sanitizeSuggestedWhy({ iot: " ok ", nope: "x", ai: 5, solar: "" }, ["iot", "ai", "solar"]);
    assert.deepEqual(out, { iot: "ok" });
  });
  it("returns null for junk", () => {
    assert.equal(sanitizeSuggestedWhy("str", ["iot"]), null);
    assert.equal(sanitizeSuggestedWhy({ zzz: "x" }, ["iot"]), null);
  });
});
