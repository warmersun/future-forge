import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scaffoldFields,
  scaffoldLabels,
  isScaffoldComplete,
  composeHow,
  parseHow,
} from "./invent-scaffold.js";

const mission = { place: "Riverbend Health Post", stakeholder: "Nurse Amara, night shift" };
const tech = { id: "solar", name: "Solar Power" };

describe("scaffoldFields / labels", () => {
  it("prefills place, tech, first name of the stakeholder", () => {
    const f = scaffoldFields(mission, tech);
    assert.equal(f.place, "Riverbend Health Post");
    assert.equal(f.tech, "Solar Power");
    assert.equal(f.stakeholder, "Nurse Amara");
    assert.equal(f.scarce, "");
    assert.equal(f.mechanism, "");
  });
  it("falls back when mission or tech are missing", () => {
    const f = scaffoldFields(null, null);
    assert.equal(f.place, "this place");
    assert.equal(f.tech, "this emTech");
    assert.equal(f.stakeholder, "");
  });
  it("labels name the place and the tech", () => {
    const l = scaffoldLabels(scaffoldFields(mission, tech));
    assert.match(l.scarce, /Riverbend Health Post/);
    assert.match(l.mechanism, /Solar Power/);
  });
});

describe("composeHow", () => {
  it("returns empty until both blanks have substance", () => {
    const f = { ...scaffoldFields(mission, tech), scarce: "power", mechanism: "" };
    assert.equal(isScaffoldComplete(f), false);
    assert.equal(composeHow(f), "");
  });
  it("composes grammatical sentences over the 12-char mint minimum", () => {
    const f = {
      ...scaffoldFields(mission, tech),
      scarce: "Power after dusk.",
      mechanism: "Rooftop panels charge a battery that runs the vaccine fridge and the delivery room lights at night",
    };
    const how = composeHow(f);
    assert.equal(
      how,
      "In Riverbend Health Post, power after dusk is scarce. Solar Power makes it more abundant: rooftop panels charge a battery that runs the vaccine fridge and the delivery room lights at night. For Nurse Amara, this year."
    );
    assert.ok(how.length >= 12);
  });
  it("omits the stakeholder sentence when unknown", () => {
    const f = { ...scaffoldFields({ place: "Here" }, tech), scarce: "cold storage", mechanism: "panels run a fridge" };
    assert.equal(composeHow(f), "In Here, cold storage is scarce. Solar Power makes it more abundant: panels run a fridge, this year.");
  });
});

describe("parseHow", () => {
  it("round-trips a composed how-text back into the blanks", () => {
    const f = { ...scaffoldFields(mission, tech), scarce: "power after dusk", mechanism: "panels charge a battery" };
    const back = parseHow(composeHow(f), f);
    assert.deepEqual(back, { scarce: "power after dusk", mechanism: "panels charge a battery" });
  });
  it("survives a place with commas and a mechanism with an em-dash 'for' clause", () => {
    const tideglass = { place: "Tideglass High, Kettle Reach (fictive)", stakeholder: "Ms. Idris, biology club" };
    const synbio = { id: "synbio", name: "Synthetic Biology" };
    const f = {
      ...scaffoldFields(tideglass, synbio),
      scarce: "trust in the water",
      mechanism: "a screening kit flags mirror parts — for the club, before anything grows",
    };
    const how = composeHow(f);
    assert.deepEqual(parseHow(how, f), { scarce: f.scarce, mechanism: f.mechanism });
    // Without the known fields the best-effort parse still gets it right when the blanks hold no commas
    assert.deepEqual(parseHow(how), { scarce: f.scarce, mechanism: f.mechanism });
  });
  it("round-trips when no stakeholder is known", () => {
    const f = { ...scaffoldFields({ place: "Here, there" }, tech), scarce: "cold storage", mechanism: "panels run a fridge" };
    assert.deepEqual(parseHow(composeHow(f), f), { scarce: "cold storage", mechanism: "panels run a fridge" });
  });
  it("returns null for free text or empty input", () => {
    assert.equal(parseHow("A drone drops medicine at the clinic door."), null);
    assert.equal(parseHow("", { place: "x", tech: "y" }), null);
  });
});
