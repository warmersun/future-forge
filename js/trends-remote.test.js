import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  fetchRemoteTrendCatalog,
  resolveTrendTileUrl,
  resolveTrendsRemoteUrl,
  DEFAULT_TRENDS_REMOTE_URL,
  withCacheBust,
  _resetRemoteTrendCache,
} from "./trends-remote.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(
  __dirname,
  "../test/fixtures/trends/gene-seq-cost-per-genome.json"
);

describe("trends-remote", () => {
  let tmp;
  let catalogPath;
  let trendId;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-remote-trends-"));
    const tile = path.join(tmp, "gene.json");
    fs.copyFileSync(FIXTURE, tile);
    const raw = JSON.parse(fs.readFileSync(tile, "utf8"));
    trendId = raw.id;
    catalogPath = path.join(tmp, "catalog.json");
    fs.writeFileSync(
      catalogPath,
      JSON.stringify({
        schema: "future-forge.capability-trend-catalog/v1",
        updated: "2026-08-21",
        trends: [{ id: trendId, techId: "gene-sequencing", file: "gene.json" }],
      }),
      "utf8"
    );
  });

  after(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  beforeEach(() => {
    _resetRemoteTrendCache();
  });

  it("resolveTrendsRemoteUrl defaults and disables", () => {
    const prev = process.env.FF_TRENDS_REMOTE_URL;
    try {
      delete process.env.FF_TRENDS_REMOTE_URL;
      const resolved = resolveTrendsRemoteUrl();
      assert.ok(
        resolved === DEFAULT_TRENDS_REMOTE_URL ||
          (typeof resolved === "string" && resolved.endsWith("catalog.json"))
      );
      process.env.FF_TRENDS_REMOTE_URL = "off";
      assert.equal(resolveTrendsRemoteUrl(), null);
      process.env.FF_TRENDS_REMOTE_URL = "0";
      assert.equal(resolveTrendsRemoteUrl(), null);
      process.env.FF_TRENDS_REMOTE_URL = "https://example.com/t.json";
      assert.equal(resolveTrendsRemoteUrl(), "https://example.com/t.json");
    } finally {
      if (prev === undefined) delete process.env.FF_TRENDS_REMOTE_URL;
      else process.env.FF_TRENDS_REMOTE_URL = prev;
    }
  });

  it("resolveTrendTileUrl joins relative files for http and local", () => {
    assert.equal(
      resolveTrendTileUrl(
        "https://warmersun.com/future-forge/trends/catalog.json",
        "a.json"
      ),
      "https://warmersun.com/future-forge/trends/a.json"
    );
    const local = resolveTrendTileUrl(catalogPath, "gene.json");
    assert.equal(local, path.join(tmp, "gene.json"));
  });

  it("withCacheBust appends timestamp query", () => {
    assert.match(withCacheBust("https://example.com/c.json", 42), /\?_=42$/);
    assert.match(withCacheBust("https://example.com/c.json?x=1", 99), /&_=99$/);
  });

  it("loads local filesystem catalog and validates tiles", async () => {
    const r = await fetchRemoteTrendCatalog(catalogPath, { force: true });
    assert.equal(r.ok, true);
    assert.equal(r.trends.length, 1);
    assert.equal(r.trends[0].source, "catalog");
    assert.equal(r.trends[0].id, trendId);
  });

  it("returns empty when url is null", async () => {
    const r = await fetchRemoteTrendCatalog(null);
    assert.equal(r.ok, true);
    assert.equal(r.trends.length, 0);
  });

  it("uses cache on second call", async () => {
    const a = await fetchRemoteTrendCatalog(catalogPath, { force: true });
    assert.equal(a.cached, false);
    const b = await fetchRemoteTrendCatalog(catalogPath);
    assert.equal(b.cached, true);
    assert.equal(b.trends.length, a.trends.length);
  });

  it("force:true after local edit returns new content", async () => {
    const a = await fetchRemoteTrendCatalog(catalogPath, { force: true });
    assert.equal(a.cached, false);
    const tilePath = path.join(tmp, "gene.json");
    const raw = JSON.parse(fs.readFileSync(tilePath, "utf8"));
    const newName = `Refreshed name ${Date.now()}`;
    raw.name = newName;
    fs.writeFileSync(tilePath, JSON.stringify(raw), "utf8");
    const later = new Date(Date.now() + 2000);
    fs.utimesSync(tilePath, later, later);
    fs.utimesSync(catalogPath, later, later);

    const b = await fetchRemoteTrendCatalog(catalogPath, { force: true });
    assert.equal(b.cached, false);
    assert.equal(b.trends[0].name, newName);
  });

  it("force HTTP fetch cache-busts request URLs", async () => {
    const tileRaw = fs.readFileSync(path.join(tmp, "gene.json"), "utf8");
    const catalogBody = JSON.stringify({
      schema: "future-forge.capability-trend-catalog/v1",
      updated: "2026-08-21",
      trends: [{ id: trendId, techId: "gene-sequencing", file: "gene.json" }],
    });
    /** @type {string[]} */
    const requested = [];
    /** @type {typeof fetch} */
    const fetchImpl = async (input) => {
      const u = String(input);
      requested.push(u);
      const body = u.includes("catalog.json") ? catalogBody : tileRaw;
      return {
        ok: true,
        status: 200,
        text: async () => body,
      };
    };
    const base = "https://example.com/future-forge/trends/catalog.json";
    const r = await fetchRemoteTrendCatalog(base, {
      force: true,
      tryFallbacks: false,
      fetchImpl,
    });
    assert.equal(r.ok, true);
    assert.equal(r.trends.length, 1);
    assert.ok(requested.length >= 2);
    for (const u of requested) {
      assert.match(u, /[?&]_=\d+/);
    }
  });
});
