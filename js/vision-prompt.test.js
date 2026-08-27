import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decideShot,
  visionFingerprint,
  visionHowNarrative,
  visionPathwaysOf,
  visionPathwaysKey,
  techNames,
} from "./vision-prompt.mjs";

const placeBody = {
  place: "Portside Ward",
  year: 2026,
  challenge: {
    id: "portside-floods",
    title: "Portside floods",
    scene: "Low streets flood after storms; pump houses struggle.",
    problem: "Low streets flood after storms; pump houses struggle.",
  },
  stage: { id: "prototype" },
};

describe("vision pathways signature", () => {
  it("reads inventHow per island and ignores inventionName", () => {
    const body = {
      ...placeBody,
      inventionName: "Should Never Appear",
      inventionHow: "legacy leftover",
      pathways: [
        {
          techs: [{ id: "ai", name: "AI" }],
          howText: "Sensors radio the crest to the firehouse.",
        },
        {
          techs: [{ id: "iot", name: "IoT" }],
          inventHow: "Street boards drop before the tide peaks.",
        },
      ],
    };
    const paths = visionPathwaysOf(body);
    assert.equal(paths.length, 2);
    assert.match(visionHowNarrative(body), /Sensors radio/);
    assert.match(visionHowNarrative(body), /Street boards/);
    assert.ok(!/Should Never Appear/.test(visionHowNarrative(body)));
    assert.ok(!/legacy leftover/.test(visionHowNarrative(body)));
    assert.deepEqual(techNames(body).sort(), ["AI", "IoT"]);

    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.match(shot.happening, /Sensors radio/);
    assert.match(shot.happening, /Street boards/);
    assert.ok(!/Should Never Appear/.test(shot.happening));
  });

  it("fingerprint changes when one island inventHow changes, not when a name is set", () => {
    const a = {
      ...placeBody,
      inventionName: "Alpha",
      pathways: [
        { techs: [{ id: "ai", name: "AI" }], howText: "Mesh alerts crews." },
      ],
    };
    const named = { ...a, inventionName: "Beta" };
    assert.equal(visionFingerprint(a), visionFingerprint(named));
    const b = {
      ...a,
      pathways: [
        { techs: [{ id: "ai", name: "AI" }], howText: "Mesh pages the quay." },
      ],
    };
    assert.notEqual(visionFingerprint(a), visionFingerprint(b));
    assert.notEqual(visionPathwaysKey(a), visionPathwaysKey(b));
  });

  it("legacy inventionHow still works when pathways is omitted", () => {
    const body = {
      ...placeBody,
      techs: [{ id: "drones", name: "Drones" }],
      inventionHow:
        "Neighbors share a mesh of cheap water sensors that trigger street-level diversion boards before the tide peaks.",
    };
    assert.match(visionHowNarrative(body), /water sensors/);
    const world = {
      place: body.place,
      title: body.challenge.title,
      scene: body.challenge.scene,
      visualSetting: body.challenge.scene,
    };
    const shot = decideShot(body, { dataUrl: "data:image/jpeg;base64,xx" }, world);
    assert.equal(shot.reason, "Learner story frames the shot");
  });
});
