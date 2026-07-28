import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  _setContentCatalogForTests,
  _resetI18nForTests,
  _setCatalogForTests,
} from "../i18n.js";
import {
  locGlobal,
  locTech,
  domainLabel,
  locChallengeAngle,
  locShelf,
  locVisionStage,
  locProblemBrief,
  locScenario,
} from "./content.js";
import { GLOBALS, TECHS, CHALLENGE_ANGLES, THEME_SHELVES, VISION_STAGES } from "../data.js";

describe("i18n content resolvers", () => {
  beforeEach(() => {
    _resetI18nForTests();
  });

  it("falls back to English when no pack", () => {
    const g = GLOBALS.find((x) => x.id === "climate");
    assert.equal(locGlobal(g).title, g.title);
    assert.equal(domainLabel("power"), "Power");
    const t = TECHS.find((x) => x.id === "ai");
    assert.equal(locTech(t).name, t.name);
  });

  it("applies Hungarian overlays by id", () => {
    _setCatalogForTests({}, "hu");
    _setContentCatalogForTests({
      domains: { power: { label: "Erő" }, automator: { label: "Automatizáló" } },
      globals: {
        climate: { title: "Klímaválságok", blurb: "Kibocsátás és hőség." },
      },
      techs: {
        ai: {
          name: "Mesterséges intelligencia",
          summary: "Rövid HU összefoglaló.",
          learn: "Tanulj HU",
          inventionHint: "Tipp",
          risk: "kockázat",
          maturity: {
            now: "most",
            near: "közel",
            frontier: "határ",
          },
          milestones: ["m1"],
          useCasesNow: ["u1"],
        },
      },
      "challenge-angles": {
        moloch: {
          label: "Moloch",
          subtitle: "Rendszer",
          blurb: "Csapda.",
        },
      },
      shelves: { health: { title: "Egészség" } },
      "vision-stages": {
        present: { name: "Ma", blurb: "Most." },
      },
    });

    assert.equal(domainLabel("power"), "Erő");
    assert.equal(locGlobal(GLOBALS.find((g) => g.id === "climate")).title, "Klímaválságok");
    const ai = locTech(TECHS.find((t) => t.id === "ai"));
    assert.equal(ai.name, "Mesterséges intelligencia");
    assert.equal(ai.summary, "Rövid HU összefoglaló.");
    assert.equal(ai.maturity.now, "most");
    assert.equal(ai.milestones[0], "m1");
    assert.equal(
      locChallengeAngle(CHALLENGE_ANGLES.find((a) => a.id === "moloch")).subtitle,
      "Rendszer"
    );
    assert.equal(locShelf(THEME_SHELVES.find((s) => s.id === "health")).title, "Egészség");
    assert.equal(locVisionStage(VISION_STAGES[0]).name, "Ma");
  });

  it("localizes problem briefs and scenarios by seedId", () => {
    _setCatalogForTests({}, "hu");
    _setContentCatalogForTests({
      "problem-briefs": {
        climate: {
          currentState: "A klíma már most nyomást tesz a városokra.",
          rootCauses: "Üvegházhatású gázok és kitettség.",
          warnings: "Ne csak a dashboardot építsd.",
        },
      },
      "scenario-seeds": {
        "climate--test-seed": {
          title: "Teszt árvíz",
          scene: "A víz emelkedik a rakparton.",
          stakeholder: "Polgármester",
          pressureKeys: ["Árvíz", "Költség", "Bizalom"],
        },
      },
    });
    const brief = locProblemBrief(
      {
        currentState: "EN state",
        rootCauses: "EN causes",
        warnings: "EN warn",
      },
      "climate"
    );
    assert.equal(brief.currentState, "A klíma már most nyomást tesz a városokra.");
    const m = locScenario({
      id: "gen-climate-0-0-d7",
      seedId: "climate--test-seed",
      title: "EN title",
      scene: "EN scene",
      stakeholder: "EN stake",
      place: "Portside",
      pressure: { Floods: 2, Cost: 2, Trust: 1 },
      pressureRise: { Floods: 1, Cost: 1, Trust: 0 },
      winMax: { Floods: 1, Cost: 1, Trust: 1 },
    });
    assert.equal(m.title, "Teszt árvíz");
    assert.equal(m.scene, "A víz emelkedik a rakparton.");
    assert.deepEqual(Object.keys(m.pressure), ["Árvíz", "Költség", "Bizalom"]);
    assert.equal(m.pressure["Árvíz"], 2);
  });
});
