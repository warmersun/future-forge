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
  it("composes one plain paragraph over the 12-char mint minimum", () => {
    const f = {
      ...scaffoldFields(mission, tech),
      scarce: "Power after dusk.",
      mechanism: "Rooftop panels charge a battery that runs the vaccine fridge and the delivery room lights at night",
    };
    const how = composeHow(f);
    assert.equal(
      how,
      "In Riverbend Health Post, power after dusk is scarce. Solar Power makes it more abundant by rooftop panels charge a battery that runs the vaccine fridge and the delivery room lights at night — for Nurse Amara, this year."
    );
    assert.ok(how.length >= 12);
  });
  it("omits the stakeholder clause when unknown", () => {
    const f = { ...scaffoldFields({ place: "Here" }, tech), scarce: "cold storage", mechanism: "panels run a fridge" };
    assert.equal(composeHow(f), "In Here, cold storage is scarce. Solar Power makes it more abundant by panels run a fridge, this year.");
  });
});

describe("parseHow", () => {
  it("round-trips a composed how-text back into the blanks", () => {
    const f = { ...scaffoldFields(mission, tech), scarce: "power after dusk", mechanism: "panels charge a battery" };
    const back = parseHow(composeHow(f));
    assert.deepEqual(back, { scarce: "power after dusk", mechanism: "panels charge a battery" });
  });
  it("returns null for free text", () => {
    assert.equal(parseHow("A drone drops medicine at the clinic door."), null);
  });
});
