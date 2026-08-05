import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODULE_PACK_SCHEMA,
  parseModulePackJson,
  validateModulePack,
} from "./module-pack.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "../test/fixtures/modules/sample-free");
const FIXTURE_JSON = path.join(FIXTURE_DIR, "module.json");

const TECHS = ["gene-sequencing", "solar", "ai", "iot", "networks"];
const GLOBALS = ["infectious", "climate", "water"];

function basePack(over = {}) {
  return {
    schema: MODULE_PACK_SCHEMA,
    kind: "module",
    id: "sample-free",
    title: "Sample free module",
    summary: "Minimal pack for tests.",
    access: "free",
    theme: "ai-automators",
    weeks: [
      {
        week: 1,
        title: "Week one",
        questFile: "quests/week-01.json",
      },
    ],
    ...over,
  };
}

describe("module-pack", () => {
  it("parseModulePackJson accepts object and string", () => {
    const p = basePack();
    assert.equal(parseModulePackJson(p).ok, true);
    assert.equal(parseModulePackJson(JSON.stringify(p)).ok, true);
    assert.equal(parseModulePackJson("{").ok, false);
    assert.equal(parseModulePackJson(null).ok, false);
  });

  it("validates a good pack (structure only)", () => {
    const r = validateModulePack(basePack(), { validateQuests: false });
    assert.equal(r.ok, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.pack.schema, MODULE_PACK_SCHEMA);
    assert.equal(r.pack.kind, "module");
    assert.equal(r.pack.access, "free");
    assert.equal(r.pack.theme, "ai-automators");
    assert.equal(r.pack.weeks.length, 1);
    assert.equal(r.pack.weeks[0].week, 1);
    assert.equal(r.pack.estimatedWeeks, 1);
  });

  it("accepts focus as theme alias", () => {
    const p = basePack({ theme: undefined, focus: "gene-editing" });
    delete p.theme;
    p.focus = "gene-editing";
    const r = validateModulePack(p, { validateQuests: false });
    assert.equal(r.ok, true);
    assert.equal(r.pack.theme, "gene-editing");
  });

  it("validates fixture on disk with quest files", () => {
    const raw = fs.readFileSync(FIXTURE_JSON, "utf8");
    const parsed = parseModulePackJson(raw);
    assert.equal(parsed.ok, true);
    const r = validateModulePack(parsed.value, {
      baseDir: FIXTURE_DIR,
      techIds: TECHS,
      globalIds: GLOBALS,
    });
    assert.equal(r.ok, true, r.errors?.join("; "));
    assert.equal(r.pack.id, "sample-free");
    assert.equal(r.pack.weeks[0].quest.spotlight.techId, "ai");
  });

  it("rejects missing weeks", () => {
    const r = validateModulePack(basePack({ weeks: [] }), {
      validateQuests: false,
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("missing_weeks")));
  });

  it("rejects bad access", () => {
    const r = validateModulePack(basePack({ access: "premium" }), {
      validateQuests: false,
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.startsWith("bad_access")));
  });

  it("rejects bad schema", () => {
    const r = validateModulePack(basePack({ schema: "other/v1" }), {
      validateQuests: false,
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.startsWith("bad_schema")));
  });

  it("rejects bad kind and missing required fields", () => {
    const r = validateModulePack(
      basePack({ kind: "quest", title: "", summary: "", id: "" }),
      { validateQuests: false }
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.startsWith("bad_kind")));
    assert.ok(r.errors.some((e) => e === "missing_title"));
    assert.ok(r.errors.some((e) => e === "missing_summary"));
    assert.ok(r.errors.some((e) => e === "missing_id"));
  });

  it("rejects week without quest ref", () => {
    const r = validateModulePack(
      basePack({
        weeks: [{ week: 1, title: "Only title" }],
      }),
      { validateQuests: false }
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("missing_quest_ref")));
  });

  it("accepts inline quest when validateQuests", () => {
    const quest = JSON.parse(
      fs.readFileSync(path.join(FIXTURE_DIR, "quests/week-01.json"), "utf8")
    );
    const r = validateModulePack(
      basePack({
        weeks: [{ week: 1, title: "Inline", quest }],
      }),
      { techIds: TECHS, globalIds: GLOBALS }
    );
    assert.equal(r.ok, true, r.errors?.join("; "));
    assert.equal(r.pack.weeks[0].quest.id, "sample-free-week-01");
  });

  it("rejects path escape in questFile", () => {
    const r = validateModulePack(
      basePack({
        weeks: [
          {
            week: 1,
            title: "Nope",
            questFile: "../outside.json",
          },
        ],
      }),
      { validateQuests: false }
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("quest_file_must_be_relative")));
  });
});
