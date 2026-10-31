/**
 * Offline co-inventor lives in one module for the game server and the portal.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEX_INVENT_HINT,
  TUTOR_HINT,
  isTutorMode,
  localCoInvent,
  sanitizeHowTechId,
} from "./co-invent-local.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("local score-pathway crisis-role scoping", () => {
  const roleCases = [
    [], ["local"], ["global"], ["support"],
    ["local", "global"], ["local", "support"], ["global", "support"],
    ["local", "global", "support"],
  ];
  const pathway = {
    inventions: [{
      techId: "iot",
      howText: "A sensor alerts the dock crew before flood water reaches the parcel shelf.",
      timingLevel: "green",
    }],
  };
  const concerns = [{ angle: "moloch", playerAnswer: "The crew shares maintenance." }, { angle: "nature" }];
  const score = (context) => localCoInvent({ mode: "score-pathway", context });

  for (const roles of roleCases) {
    it(`keeps exactly ${JSON.stringify(roles)} without leaking fallback support relief`, () => {
      for (const crisisRoles of [roles, roles.map((role) => ({ role }))]) {
        const out = score({ pathway, concerns, crisisRoles });
        const expected = { local: -1, global: 0, support: -1 };
        assert.deepEqual(out.crisisDelta, Object.fromEntries(roles.map((role) => [role, expected[role]])));
        assert.deepEqual(Object.keys(out.crisisReasons), roles);
        for (const role of roles) assert.ok(out.crisisReasons[role].length > 0, role);
        assert.equal(out.source, "local");
        assert.equal(out.concerns.moloch.level, "yellow");
        assert.equal(out.concerns.nature.level, "red");
      }
    });
  }

  it("gives listed zero-delta meters reasons without claiming relief", () => {
    const out = score({
      crisisRoles: ["local", "global", "support"],
      pathway: { inventions: [{ techId: "ai", timingLevel: "yellow", howText: "An idea." }] },
    });
    assert.deepEqual(out.crisisDelta, { local: 0, global: 0, support: 0 });
    for (const reason of Object.values(out.crisisReasons)) {
      assert.ok(reason.length > 0);
      assert.doesNotMatch(reason, /\b(eases|can ease)\b/i);
    }
  });

  it("fails closed for missing or invalid context roles", () => {
    for (const crisisRoles of [undefined, null, "local", {}, [null, {}, "invented"]]) {
      const out = score({ pathway, concerns, crisisRoles });
      assert.deepEqual(out.crisisDelta, {});
      assert.deepEqual(out.crisisReasons, {});
      assert.equal(out.concerns.moloch.level, "yellow");
    }
  });

  it("drops hostile-stack support penalties when support is absent", () => {
    const out = score({
      crisisRoles: [{ role: "local" }],
      pathway: { inventions: [{ techId: "computing", timingLevel: "red", howText: "A reactor powers the dock all day while the crew sorts parcels." }] },
    });
    assert.deepEqual(out.crisisDelta, { local: -1 });
    assert.deepEqual(out.crisisReasons, { local: "The how-text names a possible near-term mechanism, but the result still needs a real test." });
  });

  it("applies pure-policy clamps before removing absent roles and their reasons", () => {
    for (const roles of roleCases) {
      const out = score({
        crisisRoles: roles.map((role) => ({ role })),
        concerns,
        pathway: { inventions: [{ techId: "ai", timingLevel: "green", howText: "Pass a universal basic income bill to pay every resident enough to live." }] },
      });
      assert.deepEqual(out.crisisDelta, Object.fromEntries(roles.map((role) => [role, 0])));
      assert.deepEqual(Object.keys(out.crisisReasons), roles);
      for (const reason of Object.values(out.crisisReasons)) assert.ok(reason.length > 0);
      if (roles.includes("local")) assert.match(out.crisisReasons.local, /law or ban is not an invent/);
      assert.equal(out.concerns.moloch.level, "yellow");
    }
  });

  for (const globalId of ["automation", "rogue-si"]) {
    it(`preserves ${globalId} policy constraints only on listed roles`, () => {
      for (const roles of roleCases) {
        const out = score({
          globalId,
          crisisRoles: roles,
          pathway: { inventions: [{ techId: "ai", timingLevel: "green", howText: "A model schedules every parcel and replaces the crew at the sorting dock." }] },
        });
        const expected = { local: -1, global: 0, support: 1 };
        assert.deepEqual(out.crisisDelta, Object.fromEntries(roles.map((role) => [role, expected[role]])));
        assert.deepEqual(Object.keys(out.crisisReasons), roles);
        if (roles.includes("global")) {
          assert.match(out.crisisReasons.global, globalId === "automation" ? /surplus/ : /last call/);
        }
        if (roles.includes("support")) assert.ok(out.crisisReasons.support.length > 0);
      }
    });
  }
});

describe("co-invent local engine", () => {
  it("is imported by both servers instead of copied", () => {
    for (const rel of ["server.mjs", "portal/server.mjs"]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      assert.equal(src.includes("function localCoInvent"), false, rel);
      assert.equal(src.includes("const HEX_INVENT_HINT"), false, rel);
      assert.match(src, /co-invent-local\.mjs/, rel);
      assert.match(src, /sanitizeHowTechId/, rel);
    }
  });

  it("answers an empty chat from the local fallback", () => {
    const out = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "hello" }],
      context: {},
    });
    assert.equal(out.source, "local");
    assert.match(out.message, /Suggest stack/);
    assert.deepEqual(out.proposals.addTechIds, []);
  });

  it("lets the tutor offer a side-loaded localhost lesson", () => {
    assert.match(TUTOR_HINT, /http on localhost/);
    assert.doesNotMatch(TUTOR_HINT, /https only/);
    for (const rel of ["server.mjs", "portal/server.mjs"]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      assert.match(src, /http on localhost for a side-loaded lesson/, rel);
      assert.doesNotMatch(src, /https only/, rel);
    }
  });

  it("keeps tutoring off when the learner turned it off", () => {
    assert.equal(isTutorMode({ tutorMode: false, isLearningModule: true }), false);
    assert.equal(isTutorMode({ tutorMode: true }), true);
    assert.equal(isTutorMode({ isLearningModule: true }), true);
  });

  it("names convergences in the shared hex hint", () => {
    assert.match(HEX_INVENT_HINT, /hexBoard\.convergences/);
    assert.match(HEX_INVENT_HINT, /Do not claim a convergence that is not listed/);
  });

  it("draft-how names mint unless exactly one pathway is placed", () => {
    assert.match(HEX_INVENT_HINT, /proposals\.howTarget/);
    const several = localCoInvent({
      mode: "draft-how",
      messages: [],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}, {}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(several.proposals.howTarget, "mint");
    assert.equal(several.proposals.howTechId, "ai");
    const one = localCoInvent({
      mode: "draft-how",
      messages: [],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(one.proposals.howTarget, "pathway");
    assert.equal(one.proposals.howTechId, null);
  });

  it("free-chat how drafts use the same hex howTarget rule", () => {
    const several = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "how does this system work" }],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}, {}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(several.proposals.howTarget, "mint");
    assert.equal(several.proposals.howTechId, "ai");
    assert.ok(several.proposals.inventionHow);
    const one = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "how does this system work" }],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(one.proposals.howTarget, "pathway");
  });

  it("drops howTechId that is not in the catalog", () => {
    assert.equal(sanitizeHowTechId("ai", ["ai", "iot"]), "ai");
    assert.equal(sanitizeHowTechId("laser-shark", ["ai", "iot"]), null);
    assert.equal(sanitizeHowTechId("  ", ["ai"]), null);
    assert.equal(sanitizeHowTechId(null, ["ai"]), null);
  });
});
