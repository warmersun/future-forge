import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_PREDICTIONS_FILE,
  resolvePredictionsSource,
  loadPredictionsBank,
  lastPredictionsLoad,
  predictionsApiResponse,
  displaySource,
  logPredictionsLoad,
} from "./predictions-bank.mjs";
import { getWorldForesightBank } from "./sim/world-foresight.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUSK_REL = "predictions/examples/musk-abundance.json";
const MUSK_ABS = path.join(ROOT, MUSK_REL);
const MUSK_TEXT = fs.readFileSync(MUSK_ABS, "utf8");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-predictions-"));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function writeTmp(name, body) {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body));
  return p;
}

function fakeFetch(status, body) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  });
}

describe("resolvePredictionsSource", () => {
  it("defaults when unset or blank", () => {
    assert.equal(resolvePredictionsSource({}), DEFAULT_PREDICTIONS_FILE);
    assert.equal(resolvePredictionsSource({ FF_PREDICTIONS_FILE: "  " }), DEFAULT_PREDICTIONS_FILE);
  });

  it("resolves repo-relative, absolute, file:, and https", () => {
    assert.equal(resolvePredictionsSource({ FF_PREDICTIONS_FILE: MUSK_REL }), MUSK_ABS);
    assert.equal(resolvePredictionsSource({ FF_PREDICTIONS_FILE: MUSK_ABS }), MUSK_ABS);
    assert.equal(
      resolvePredictionsSource({ FF_PREDICTIONS_FILE: pathToFileURL(MUSK_ABS).href }),
      MUSK_ABS
    );
    const url = "https://example.com/bank.json";
    assert.equal(resolvePredictionsSource({ FF_PREDICTIONS_FILE: url }), url);
  });
});

describe("loadPredictionsBank", () => {
  beforeEach(async () => {
    await loadPredictionsBank({ source: DEFAULT_PREDICTIONS_FILE });
  });

  it("loads the shipped default", async () => {
    const r = await loadPredictionsBank({ source: DEFAULT_PREDICTIONS_FILE });
    assert.equal(r.ok, true);
    assert.equal(r.fallback, false);
    assert.equal(getWorldForesightBank().id, "future-forge-default");
    assert.ok(r.count >= 50);
    assert.equal(lastPredictionsLoad(), r);
  });

  it("side-loads a local file", async () => {
    const r = await loadPredictionsBank({ source: MUSK_ABS });
    assert.equal(r.ok, true);
    assert.equal(r.fallback, false);
    assert.equal(getWorldForesightBank().id, "musk-abundance");
    assert.equal(getWorldForesightBank().predictions[0].attribution.name, "Elon Musk");
  });

  it("side-loads an https URL through fetchImpl", async () => {
    const r = await loadPredictionsBank({
      source: "https://example.com/bank.json",
      fetchImpl: fakeFetch(200, MUSK_TEXT),
    });
    assert.equal(r.ok, true);
    assert.equal(r.source, "https://example.com/bank.json");
    assert.equal(getWorldForesightBank().id, "musk-abundance");
  });

  it("falls back to the default on a missing file", async () => {
    const r = await loadPredictionsBank({ source: path.join(tmp, "nope.json") });
    assert.equal(r.ok, true);
    assert.equal(r.fallback, true);
    assert.equal(r.source, DEFAULT_PREDICTIONS_FILE);
    assert.equal(r.errors[0].error, "file_not_found");
    assert.equal(getWorldForesightBank().id, "future-forge-default");
  });

  it("falls back on invalid JSON, schema errors, unknown techs, and HTTP errors", async () => {
    const cases = [
      [{ source: writeTmp("bad.json", "{not json") }, "invalid_json"],
      [{ source: writeTmp("schema.json", { schema: "nope" }) }, "validation_failed"],
      [
        {
          source: writeTmp("tech.json", {
            schema: "future-forge.predictions/v1",
            id: "x",
            title: "X",
            predictions: [
              {
                id: "a",
                year: 2028,
                kind: "prediction",
                headline: "h",
                detail: "d",
                claimBand: "near",
                techIds: ["warp-drive"],
              },
            ],
          }),
        },
        "validation_failed",
      ],
      [{ source: "https://example.com/x.json", fetchImpl: fakeFetch(404, "") }, "http_404"],
    ];
    for (const [opts, error] of cases) {
      await loadPredictionsBank({ source: MUSK_ABS });
      const r = await loadPredictionsBank(opts);
      assert.equal(r.fallback, true, error);
      assert.equal(r.errors[0].error, error);
      assert.equal(getWorldForesightBank().id, "future-forge-default", error);
    }
  });

  it("reports details for validation failures", async () => {
    const r = await loadPredictionsBank({ source: writeTmp("schema2.json", { schema: "nope" }) });
    assert.ok(r.errors[0].details.some((d) => /schema must be/.test(d)));
  });

  it("keeps the previous bank when the default is broken too", async () => {
    await loadPredictionsBank({ source: MUSK_ABS });
    const r = await loadPredictionsBank({
      source: path.join(tmp, "missing.json"),
      defaultFile: path.join(tmp, "also-missing.json"),
    });
    assert.equal(r.errors.length, 2);
    assert.equal(r.ok, true);
    assert.equal(getWorldForesightBank().id, "musk-abundance");
  });
});

describe("predictionsApiResponse", () => {
  it("returns the active bank with repo-relative sources", async () => {
    await loadPredictionsBank({ source: MUSK_ABS });
    const body = await predictionsApiResponse("/api/predictions");
    assert.equal(body.ok, true);
    assert.equal(body.source, MUSK_REL);
    assert.equal(body.bank.id, "musk-abundance");
    assert.ok(!JSON.stringify(body).includes(ROOT));
  });

  it("displaySource hides absolute paths outside the repo", () => {
    assert.equal(displaySource(path.join(tmp, "x.json")), "x.json");
    assert.equal(displaySource("https://a.test/b.json"), "https://a.test/b.json");
  });
});

describe("logPredictionsLoad", () => {
  it("logs the active bank and each error", async () => {
    const r = await loadPredictionsBank({ source: path.join(tmp, "gone.json") });
    const lines = [];
    const log = { log: (s) => lines.push(s), warn: (s) => lines.push(s) };
    logPredictionsLoad(r, log);
    assert.match(lines[0], /Predictions bank: .* \(fallback\)/);
    assert.match(lines[1], /gone\.json: file_not_found/);
  });
});
