import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { scanQuestsFolder, ensureQuestsDir } from "./quests-folder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "../test/fixtures/quests/spotlight-gene-seq.json");

describe("scanQuestsFolder", () => {
  let tmp;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-quests-"));
    ensureQuestsDir(tmp);
    fs.copyFileSync(FIXTURE, path.join(tmp, "demo.json"));
    fs.writeFileSync(path.join(tmp, "bad.json"), "{ not valid tile }", "utf8");
  });

  after(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("loads valid tiles and reports bad files", async () => {
    const r = await scanQuestsFolder(tmp);
    assert.equal(r.quests.length, 1);
    assert.equal(r.quests[0].mission.source, "hosted");
    assert.equal(r.quests[0].spotlightTechId, "gene-sequencing");
    assert.ok(r.errors.some((e) => e.file === "bad.json"));
  });
});
