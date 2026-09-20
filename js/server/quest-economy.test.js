import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listQuestEconomyFiles,
  listQuestEconomyCatalog,
  resolveQuestEconomyPath,
  writeQuestEconomyPatch,
} from "./quest-economy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("resolveQuestEconomyPath", () => {
  it("allows quests/ and output/quests/ json", () => {
    const a = resolveQuestEconomyPath(ROOT, "quests/spotlight-gene-seq.json");
    assert.equal(a.ok, true);
    assert.ok(a.abs.endsWith(`${path.sep}spotlight-gene-seq.json`));
    const b = resolveQuestEconomyPath(ROOT, "output/quests/x/quest.json");
    assert.equal(b.ok, true);
  });

  it("rejects traversal and other trees", () => {
    assert.equal(resolveQuestEconomyPath(ROOT, "../secrets.json").ok, false);
    assert.equal(resolveQuestEconomyPath(ROOT, "js/data.js").ok, false);
    assert.equal(resolveQuestEconomyPath(ROOT, "quests/../package.json").ok, false);
    assert.equal(resolveQuestEconomyPath(ROOT, "quests/foo.md").ok, false);
  });
});

describe("listQuestEconomyFiles", () => {
  it("lists the gene-seq library tile", async () => {
    const rows = await listQuestEconomyFiles(ROOT);
    const hit = rows.find((r) => r.rel === "quests/spotlight-gene-seq.json");
    assert.ok(hit);
    assert.equal(hit.kind, "quest");
    assert.ok(hit.title);
  });
});

describe("listQuestEconomyCatalog", () => {
  it("includes built-in theme missions and local library", async () => {
    const cat = await listQuestEconomyCatalog(ROOT);
    assert.ok(cat.themes.length > 0);
    assert.ok(cat.themes.some((t) => t.id === "portside-floods"));
    assert.ok(cat.local.some((t) => t.id.includes("gene-seq") || t.rel?.includes("gene-seq")));
    assert.equal(typeof cat.remoteOk, "boolean");
  });
});

describe("writeQuestEconomyPatch", () => {
  it("patches a copy under output/quests and validates", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-econ-"));
    const relDir = path.join("output", "quests", "tmp-econ-lab");
    const absDir = path.join(ROOT, relDir);
    fs.mkdirSync(absDir, { recursive: true });
    const src = fs.readFileSync(
      path.join(ROOT, "quests/spotlight-gene-seq.json"),
      "utf8"
    );
    const rel = `${relDir.replace(/\\/g, "/")}/quest.json`;
    const abs = path.join(ROOT, ...rel.split("/"));
    fs.writeFileSync(abs, src);
    try {
      const w = await writeQuestEconomyPatch(ROOT, rel, {
        resources: { apMax: 3 },
      });
      assert.equal(w.ok, true, w.error);
      const written = JSON.parse(fs.readFileSync(abs, "utf8"));
      assert.equal(written.resources.apMax, 3);
      assert.equal(written.mission.pressure.local.pressure, 3);
    } finally {
      fs.rmSync(absDir, { recursive: true, force: true });
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });
});
