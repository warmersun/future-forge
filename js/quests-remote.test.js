import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  fetchRemoteQuestCatalog,
  resolveTileUrl,
  resolveQuestsRemoteUrl,
  DEFAULT_QUESTS_REMOTE_URL,
  _resetRemoteQuestCache,
} from "./quests-remote.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "../test/fixtures/quests/spotlight-gene-seq.json");
const WARMERSUN_KIMI = path.join(
  os.homedir(),
  "dev/warmersun/future-forge/quests/kimi-k3.json"
);

describe("quests-remote", () => {
  let tmp;
  let catalogPath;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-remote-quests-"));
    const tile = path.join(tmp, "demo.json");
    fs.copyFileSync(FIXTURE, tile);
    // Patch fixture so it has a stable id for catalog
    const raw = JSON.parse(fs.readFileSync(tile, "utf8"));
    const id = raw.id || raw.mission?.id || "spotlight-gene-seq-border-clinic-2026";
    catalogPath = path.join(tmp, "catalog.json");
    fs.writeFileSync(
      catalogPath,
      JSON.stringify({
        schema: "future-forge.quest-catalog/v1",
        updated: "2026-08-06",
        quests: [{ id, file: "demo.json" }],
      }),
      "utf8"
    );
    fs.writeFileSync(path.join(tmp, "bad.json"), "{nope}", "utf8");
  });

  after(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  beforeEach(() => {
    _resetRemoteQuestCache();
  });

  it("resolveQuestsRemoteUrl defaults and disables", () => {
    const prev = process.env.FF_QUESTS_REMOTE_URL;
    try {
      delete process.env.FF_QUESTS_REMOTE_URL;
      const resolved = resolveQuestsRemoteUrl();
      // Local warmersun checkout if present, else public CDN URL
      assert.ok(
        resolved === DEFAULT_QUESTS_REMOTE_URL ||
          (typeof resolved === "string" && resolved.endsWith("catalog.json"))
      );
      process.env.FF_QUESTS_REMOTE_URL = "off";
      assert.equal(resolveQuestsRemoteUrl(), null);
      process.env.FF_QUESTS_REMOTE_URL = "0";
      assert.equal(resolveQuestsRemoteUrl(), null);
      process.env.FF_QUESTS_REMOTE_URL = "https://example.com/c.json";
      assert.equal(resolveQuestsRemoteUrl(), "https://example.com/c.json");
    } finally {
      if (prev === undefined) delete process.env.FF_QUESTS_REMOTE_URL;
      else process.env.FF_QUESTS_REMOTE_URL = prev;
    }
  });

  it("resolveTileUrl joins relative files for http and local", () => {
    assert.equal(
      resolveTileUrl("https://warmersun.com/future-forge/quests/catalog.json", "a.json"),
      "https://warmersun.com/future-forge/quests/a.json"
    );
    const local = resolveTileUrl(catalogPath, "demo.json");
    assert.equal(local, path.join(tmp, "demo.json"));
  });

  it("loads local filesystem catalog and validates tiles", async () => {
    const r = await fetchRemoteQuestCatalog(catalogPath, { force: true });
    assert.equal(r.ok, true);
    assert.equal(r.quests.length, 1);
    assert.equal(r.quests[0].mission.source, "remote");
    assert.ok(r.quests[0].id);
  });

  it("returns empty when url is null", async () => {
    const r = await fetchRemoteQuestCatalog(null);
    assert.equal(r.ok, true);
    assert.equal(r.quests.length, 0);
  });

  it("uses cache on second call", async () => {
    const a = await fetchRemoteQuestCatalog(catalogPath, { force: true });
    assert.equal(a.cached, false);
    const b = await fetchRemoteQuestCatalog(catalogPath);
    assert.equal(b.cached, true);
    assert.equal(b.quests.length, a.quests.length);
  });

  it("loads a real warmersun tile when present on disk", async () => {
    if (!fs.existsSync(WARMERSUN_KIMI)) {
      // skip when warmersun checkout missing
      return;
    }
    const cat = path.join(path.dirname(WARMERSUN_KIMI), "catalog.json");
    if (!fs.existsSync(cat)) return;
    const r = await fetchRemoteQuestCatalog(cat, { force: true });
    assert.equal(r.ok, true);
    assert.ok(r.quests.length >= 1);
    assert.ok(r.quests.some((q) => q.mission?.sponsorName || q.mission?.isLearningModule));
  });
});
