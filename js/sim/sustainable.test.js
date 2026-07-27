import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessSustainable, themeDepthFor } from "./sustainable.js";
import { worseLevel, worstLevel, scaleRollLevel } from "./deploy.js";

describe("worseLevel / scaleRollLevel", () => {
  it("picks the redder level", () => {
    assert.equal(worseLevel("green", "yellow"), "yellow");
    assert.equal(worseLevel("red", "green"), "red");
    assert.equal(worstLevel(["green", "yellow", "green"]), "yellow");
    assert.equal(scaleRollLevel("green", "red"), "red");
    assert.equal(scaleRollLevel("yellow", "green"), "yellow");
  });
});

describe("themeDepthFor", () => {
  it("marks air as source", () => {
    assert.equal(themeDepthFor("air").depthCharacter, "source");
  });
  it("marks portside-floods acute", () => {
    assert.equal(
      themeDepthFor("climate", { id: "portside-floods", globalId: "climate" }).depthCharacter,
      "acute"
    );
  });
});

describe("assessSustainable", () => {
  const air = { id: "air", title: "Air Pollution", kind: "now" };
  const mission = {
    id: "smog",
    globalId: "air",
    scene:
      "Asthma days close schools along the truck corridor. The corridor still runs at rush hour.",
  };

  it("red/yellow for filtration-only invent on air", () => {
    const r = assessSustainable({
      global: air,
      mission,
      techs: [{ id: "materials" }, { id: "iot" }],
      inventionHow:
        "We seal school windows and install HEPA filters and indoor air purifiers so kids do not inhale smoke.",
      inventionImpact: "Children stay in sealed classrooms with clean indoor air.",
    });
    assert.ok(r.level === "red" || r.level === "yellow", r.level + " " + r.note);
    assert.equal(r.depthCharacter, "source");
  });

  it("green/yellow for dual invent that cuts corridor pollution", () => {
    const r = assessSustainable({
      global: air,
      mission,
      techs: [{ id: "battery" }, { id: "solar" }, { id: "ai" }, { id: "materials" }],
      inventionHow:
        "School filtration protects kids now. At the corridor, battery shore power and AI idle scheduling cut truck exhaust at the school gate.",
      inventionImpact: "Less particulate on the route; fewer asthma days as exhaust drops.",
    });
    assert.ok(r.level === "green" || r.level === "yellow", r.level + " " + r.note);
    assert.notEqual(r.level, "red");
  });

  it("acute themes stay green for protection invents", () => {
    const r = assessSustainable({
      global: { id: "climate", kind: "now" },
      mission: { id: "portside-floods", globalId: "climate", scene: "Floods again." },
      techs: [{ id: "iot" }, { id: "materials" }],
      inventionHow: "Sensors and raised thresholds keep water out of homes this season.",
      inventionImpact: "Families stay dry during the surge.",
    });
    assert.equal(r.level, "green");
  });
});
