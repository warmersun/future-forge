import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QUEST_TILE_SCHEMA,
  parseQuestTileJson,
  validateQuestTile,
  humanizeMeterKey,
  resourceOverrideLabel,
  parseResourceOverrides,
} from "./quest-tile.js";

const TECHS = ["gene-sequencing", "solar", "ai", "iot", "networks"];
const GLOBALS = ["infectious", "climate", "water"];

function baseTile(over = {}) {
  return {
    schema: QUEST_TILE_SCHEMA,
    kind: "quest",
    id: "spotlight-gene-seq-test",
    title: "Fever samples waiting",
    summary: "Clinic backlog",
    globalId: "infectious",
    placement: { mode: "replace-daily" },
    spotlight: {
      techId: "gene-sequencing",
      advanceTitle: "Same-shift clinic sequencing",
      advanceSummary: "Rugged sequencers got faster.",
      asOf: "2026-07",
      encourageCopy: "Invent with gene sequencing.",
    },
    research: {
      topic: "portable sequencing",
      bullets: ["note"],
      sources: [{ title: "Example", url: "https://example.com", accessed: "2026-07-27" }],
    },
    mission: {
      id: "spotlight-gene-seq-test",
      globalId: "infectious",
      title: "Fever samples waiting",
      place: "Crossing Clinic 7 (fictive)",
      startYear: 2026,
      collapseYear: 2032,
      yearsPerTurn: 2,
      pressure: { Outbreak: 2, Capacity: 3, Fear: 1 },
      pressureRise: { Outbreak: 1, Capacity: 1, Fear: 1 },
      winMax: { Outbreak: 1, Capacity: 1, Fear: 1 },
      scene: "Samples stack up while fear spreads at the border clinic.",
      briefMd:
        "## The place\n\nA **fictive** clinic waits on samples.\n\n## Your brief\n\nInvent a workflow that uses sequencing *here*.",
      stakeholder: "Dr. Okonkwo",
      suggested: ["gene-sequencing"],
      visionTheme: "care-city",
    },
    ...over,
  };
}

describe("quest-tile", () => {
  it("humanizeMeterKey spaces camelCase", () => {
    assert.equal(humanizeMeterKey("HeatStress"), "Heat Stress");
    assert.equal(humanizeMeterKey("Dirty air"), "Dirty air");
  });

  it("parseQuestTileJson accepts object and string", () => {
    const t = baseTile();
    assert.equal(parseQuestTileJson(t).ok, true);
    assert.equal(parseQuestTileJson(JSON.stringify(t)).ok, true);
    assert.equal(parseQuestTileJson("{").ok, false);
  });

  it("validates a good spotlight tile", () => {
    const r = validateQuestTile(baseTile(), { techIds: TECHS, globalIds: GLOBALS });
    assert.equal(r.ok, true);
    assert.equal(r.mission.source, "imported");
    assert.equal(r.mission.suggested.length, 1);
    assert.equal(r.mission.suggested[0], "gene-sequencing");
    assert.equal(r.mission.spotlight.techId, "gene-sequencing");
    assert.ok(r.mission.briefMd.includes("## The place"));
  });

  it("rejects bad schema and packs", () => {
    assert.equal(
      validateQuestTile(baseTile({ schema: "x" }), { techIds: TECHS, globalIds: GLOBALS }).ok,
      false
    );
    assert.equal(
      validateQuestTile(baseTile({ kind: "quest-pack" }), {
        techIds: TECHS,
        globalIds: GLOBALS,
      }).error,
      "packs_not_supported"
    );
  });

  it("rejects missing brief, bad tech, multi suggested", () => {
    const noBrief = baseTile();
    noBrief.mission.briefMd = "";
    assert.equal(
      validateQuestTile(noBrief, { techIds: TECHS, globalIds: GLOBALS }).ok,
      false
    );

    const badTech = baseTile();
    badTech.spotlight.techId = "nope";
    badTech.mission.suggested = ["nope"];
    assert.equal(
      validateQuestTile(badTech, { techIds: TECHS, globalIds: GLOBALS }).ok,
      false
    );

    const multi = baseTile();
    multi.mission.suggested = ["gene-sequencing", "solar"];
    assert.equal(
      validateQuestTile(multi, { techIds: TECHS, globalIds: GLOBALS }).ok,
      false
    );
  });

  it("rejects unsafe brief content", () => {
    const t = baseTile();
    t.mission.briefMd = "Hello <script>alert(1)</script>";
    assert.equal(validateQuestTile(t, { techIds: TECHS, globalIds: GLOBALS }).ok, false);
  });

  it("defaults placement to replace-daily", () => {
    const t = baseTile({ placement: undefined });
    const r = validateQuestTile(t, { techIds: TECHS, globalIds: GLOBALS });
    assert.equal(r.ok, true);
    assert.equal(r.tile.placement.mode, "replace-daily");
  });

  it("accepts optional resources and copies them onto mission", () => {
    const r = validateQuestTile(
      baseTile({
        resources: { startingBudget: 9, startingWill: 5 },
      }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(r.ok, true);
    assert.deepEqual(r.mission.resources, {
      startingBudget: 9,
      startingWill: 5,
    });
    assert.equal(r.mission.resources.apMax, undefined);
  });

  it("accepts full resources overrides", () => {
    const r = validateQuestTile(
      baseTile({
        resources: { apMax: 4, startingBudget: 8, startingWill: 5 },
      }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(r.ok, true);
    assert.deepEqual(r.mission.resources, {
      apMax: 4,
      startingBudget: 8,
      startingWill: 5,
    });
  });

  it("omits resources when absent or empty", () => {
    const noRes = validateQuestTile(baseTile(), {
      techIds: TECHS,
      globalIds: GLOBALS,
    });
    assert.equal(noRes.ok, true);
    assert.equal(noRes.mission.resources, undefined);

    const empty = validateQuestTile(baseTile({ resources: {} }), {
      techIds: TECHS,
      globalIds: GLOBALS,
    });
    assert.equal(empty.ok, true);
    assert.equal(empty.mission.resources, undefined);
  });

  it("accepts resources nested under mission when top-level absent", () => {
    const t = baseTile();
    t.mission.resources = { apMax: 2 };
    const r = validateQuestTile(t, { techIds: TECHS, globalIds: GLOBALS });
    assert.equal(r.ok, true);
    assert.deepEqual(r.mission.resources, { apMax: 2 });
  });

  it("rejects invalid resource values", () => {
    const neg = validateQuestTile(
      baseTile({ resources: { startingBudget: -1 } }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(neg.ok, false);
    assert.ok(neg.details.some((d) => d.includes("bad_resource_startingBudget")));

    const str = validateQuestTile(
      baseTile({ resources: { apMax: "3" } }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(str.ok, false);

    const float = validateQuestTile(
      baseTile({ resources: { startingWill: 2.5 } }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(float.ok, false);

    const arr = validateQuestTile(baseTile({ resources: [] }), {
      techIds: TECHS,
      globalIds: GLOBALS,
    });
    assert.equal(arr.ok, false);
    assert.ok(arr.details.includes("resources_not_object"));
  });

  it("resourceOverrideLabel shows only non-default fields", () => {
    assert.equal(resourceOverrideLabel(null), null);
    assert.equal(resourceOverrideLabel({}), null);
    assert.equal(
      resourceOverrideLabel({
        apMax: 3,
        startingBudget: 5,
        startingWill: 3,
      }),
      null
    );
    assert.equal(
      resourceOverrideLabel({ startingBudget: 9, startingWill: 5 }),
      "Budget 9 · Will 5"
    );
    assert.equal(
      resourceOverrideLabel({ apMax: 4, startingBudget: 8, startingWill: 5 }),
      "AP 4 · Budget 8 · Will 5"
    );
  });

  it("parseResourceOverrides allows zero", () => {
    const r = parseResourceOverrides({ startingBudget: 0, startingWill: 0 });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { startingBudget: 0, startingWill: 0 });
  });
});
