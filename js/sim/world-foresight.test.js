import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TECHS, detectClaimStretch } from "../data.js";
import {
  PREDICTIONS_SCHEMA,
  validatePredictionsBank,
  setWorldForesightBank,
  getWorldForesightBank,
  getWorldForesightEvents,
  foresightForYear,
  foresightForStack,
  worldClockForYear,
  bulletinHighlight,
} from "./world-foresight.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const TECH_IDS = TECHS.map((t) => t.id);
const DEFAULT = readJson("predictions/default.json");
const MUSK = readJson("predictions/examples/musk-abundance.json");

function row(over = {}) {
  return {
    id: "r1",
    year: 2028,
    kind: "prediction",
    headline: "Headline",
    detail: "Prediction: detail.",
    claimBand: "near",
    ...over,
  };
}

function bank(predictions, over = {}) {
  return { schema: PREDICTIONS_SCHEMA, id: "t", title: "Test bank", predictions, ...over };
}

describe("validatePredictionsBank", () => {
  it("accepts the shipped default and the Musk example against TECHS", () => {
    for (const doc of [DEFAULT, MUSK]) {
      const r = validatePredictionsBank(doc, TECH_IDS);
      assert.equal(r.ok, true, r.errors.slice(0, 5).join("; "));
    }
    assert.ok(validatePredictionsBank(DEFAULT, TECH_IDS).count >= 50);
  });

  it("rejects wrong schema, missing id/title, and empty predictions", () => {
    const r = validatePredictionsBank({ schema: "nope", predictions: [] });
    assert.equal(r.ok, false);
    assert.equal(r.bank, null);
    const msg = r.errors.join(" | ");
    assert.match(msg, /schema must be/);
    assert.match(msg, /id required/);
    assert.match(msg, /title required/);
    assert.match(msg, /predictions is empty/);
  });

  it("rejects bad rows: year range, kind, claimBand, duplicate id, unknown tech", () => {
    const r = validatePredictionsBank(
      bank([
        row({ id: "a", year: 2050 }),
        row({ id: "b", kind: "rumor" }),
        row({ id: "c", claimBand: "soon" }),
        row({ id: "d" }),
        row({ id: "d" }),
        row({ id: "e", techIds: ["not-a-tech"] }),
      ]),
      TECH_IDS
    );
    assert.equal(r.ok, false);
    const msg = r.errors.join(" | ");
    assert.match(msg, /a: year must be an integer 2024–2040/);
    assert.match(msg, /b: kind must be one of/);
    assert.match(msg, /c: claimBand must be one of/);
    assert.match(msg, /d: duplicate id/);
    assert.match(msg, /e: unknown tech not-a-tech/);
  });

  it("skips the tech check when no tech list is given", () => {
    const r = validatePredictionsBank(bank([row({ techIds: ["future-thing"] })]));
    assert.equal(r.ok, true);
  });

  it("warns on unknown keys without failing", () => {
    const r = validatePredictionsBank(bank([row({ claimKeywords: ["x"] })], { extra: 1 }));
    assert.equal(r.ok, true);
    assert.ok(r.warnings.some((w) => /unknown top-level key extra/.test(w)));
    assert.ok(r.warnings.some((w) => /unknown key claimKeywords/.test(w)));
  });
});

describe("attribution", () => {
  it("row attribution overrides the bank default; string shorthand is a name", () => {
    const r = validatePredictionsBank(
      bank(
        [
          row({ id: "a" }),
          row({ id: "b", attribution: "Ray Kurzweil" }),
          row({ id: "c", attribution: { name: "Someone", url: "https://example.com/x", date: 2025 } }),
        ],
        { attribution: { name: "Elon Musk" } }
      )
    );
    assert.equal(r.ok, true, r.errors.join("; "));
    const [a, b, c] = r.bank.predictions;
    assert.deepEqual(a.attribution, { name: "Elon Musk" });
    assert.deepEqual(b.attribution, { name: "Ray Kurzweil" });
    assert.deepEqual(c.attribution, { name: "Someone", url: "https://example.com/x", date: "2025" });
  });

  it("requires a name and an https url", () => {
    const r = validatePredictionsBank(
      bank([
        row({ id: "a", attribution: { url: "https://x.test" } }),
        row({ id: "b", attribution: { name: "X", url: "http://x.test" } }),
      ])
    );
    assert.equal(r.ok, false);
    const msg = r.errors.join(" | ");
    assert.match(msg, /a: attribution.name required/);
    assert.match(msg, /b: attribution.url must be https/);
  });

  it("every Musk row carries the bank attribution into bulletins", () => {
    const r = validatePredictionsBank(MUSK, TECH_IDS);
    for (const p of r.bank.predictions) {
      assert.equal(bulletinHighlight(p).attribution, "Elon Musk");
    }
  });
});

describe("active bank", () => {
  beforeEach(() => {
    setWorldForesightBank(DEFAULT);
  });

  it("setWorldForesightBank swaps the pool and rejects invalid docs", () => {
    assert.equal(getWorldForesightBank().id, "future-forge-default");
    const bad = setWorldForesightBank({ schema: "nope" });
    assert.equal(bad.ok, false);
    assert.equal(getWorldForesightBank().id, "future-forge-default");
    const ok = setWorldForesightBank(MUSK);
    assert.equal(ok.ok, true);
    assert.equal(getWorldForesightEvents().length, MUSK.predictions.length);
  });

  it("re-validating a served bank is idempotent", () => {
    setWorldForesightBank(MUSK);
    const served = JSON.parse(JSON.stringify(getWorldForesightBank()));
    assert.equal(setWorldForesightBank(served).ok, true);
    assert.deepEqual(getWorldForesightBank(), served);
  });

  it("foresightForYear returns 3–6 due items deterministically", () => {
    const a = foresightForYear(2030, { seed: "t", limit: 5 });
    const b = foresightForYear(2030, { seed: "t", limit: 5 });
    assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
    assert.ok(a.length >= 3 && a.length <= 6);
    assert.ok(a.every((x) => x.year <= 2030));
  });

  it("bulletinHighlight omits attribution when the row has none", () => {
    const h = bulletinHighlight(getWorldForesightEvents()[0]);
    assert.deepEqual(Object.keys(h).sort(), ["claimBand", "detail", "headline", "id", "kind"]);
  });
});

describe("worldClockForYear", () => {
  const pool = [
    row({ id: "due-ai", year: 2026, techIds: ["ai"], claimBand: "now" }),
    row({ id: "due-solar", year: 2026, techIds: ["solar"], claimBand: "now" }),
    row({ id: "due-theme", year: 2027, globalIds: ["climate"], claimBand: "near" }),
    row({ id: "ahead-ai", year: 2029, techIds: ["ai"], claimBand: "near" }),
    row({ id: "ahead-frontier", year: 2031, claimBand: "frontier", attribution: { name: "Elon Musk" } }),
    row({ id: "ahead-irrelevant", year: 2030, techIds: ["solar"], claimBand: "near" }),
  ];

  it("splits due vs not_yet by year and ranks stack hits first", () => {
    const rows = worldClockForYear(2027, { techIds: ["ai"], pool, limit: 12 });
    const due = rows.filter((r) => r.status === "due").map((r) => r.id);
    const ahead = rows.filter((r) => r.status === "not_yet").map((r) => r.id);
    assert.equal(due[0], "due-ai");
    assert.deepEqual(new Set(due), new Set(["due-ai", "due-solar", "due-theme"]));
    assert.deepEqual(ahead, ["ahead-ai", "ahead-frontier"]);
  });

  it("theme hits outrank unrelated due rows", () => {
    const rows = worldClockForYear(2027, { globalId: "climate", pool, limit: 12 });
    assert.equal(rows[0].id, "due-theme");
  });

  it("reserves slots for not_yet rows under a tight limit", () => {
    const rows = worldClockForYear(2027, { techIds: ["ai"], pool, limit: 3 });
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.status === "not_yet").length, 2);
  });

  it("rows become due as the year advances", () => {
    const early = worldClockForYear(2027, { techIds: ["ai"], pool });
    const late = worldClockForYear(2029, { techIds: ["ai"], pool });
    assert.equal(early.find((r) => r.id === "ahead-ai")?.status, "not_yet");
    assert.equal(late.find((r) => r.id === "ahead-ai")?.status, "due");
  });

  it("slim rows carry attribution names only", () => {
    const rows = worldClockForYear(2027, { pool });
    const f = rows.find((r) => r.id === "ahead-frontier");
    assert.equal(f.attribution, "Elon Musk");
    assert.equal(f.sourceNote, undefined);
  });

  it("is empty for an empty pool", () => {
    assert.deepEqual(worldClockForYear(2030, { pool: [] }), []);
  });
});

describe("foresightForStack", () => {
  const pool = [
    row({ id: "m-ai", year: 2026, kind: "milestone", techIds: ["ai"] }),
    row({ id: "m-late", year: 2035, kind: "milestone", techIds: ["ai"] }),
    row({ id: "t-theme", year: 2026, kind: "trend", globalIds: ["climate"] }),
    row({ id: "t-any", year: 2026, kind: "trend" }),
    row({ id: "p-past", year: 2026, kind: "prediction", techIds: ["ai"] }),
    row({ id: "p-ahead", year: 2032, kind: "prediction", attribution: { name: "Elon Musk" } }),
  ];

  it("picks due milestone/trend and a prediction still ahead", () => {
    const fs1 = foresightForStack(["ai"], "climate", 2028, { pool, seed: "s" });
    assert.equal(fs1.milestone.id, "m-ai");
    assert.equal(fs1.trend.id, "t-theme");
    assert.equal(fs1.prediction.id, "p-ahead");
    assert.equal(fs1.prediction.attribution.name, "Elon Musk");
  });

  it("is deterministic for the same seed", () => {
    const a = foresightForStack(["ai"], null, 2028, { pool, seed: "x" });
    const b = foresightForStack(["ai"], null, 2028, { pool, seed: "x" });
    assert.deepEqual(a, b);
  });

  it("falls back to a past prediction when none is ahead", () => {
    const fs1 = foresightForStack(["ai"], null, 2040, { pool, seed: "s" });
    assert.ok(["p-past", "p-ahead"].includes(fs1.prediction.id));
  });
});

describe("local timing fallback", () => {
  it("local claim stretch does not worsen for same claims one year later", () => {
    const techs = [TECHS.find((t) => t.id === "ai"), TECHS.find((t) => t.id === "solar")].filter(
      Boolean
    );
    const how =
      "A community solar + supervised AI pilot partnership schedules clinic loads with human oversight.";
    const rank = { red: 0, yellow: 1, green: 2 };
    for (const y of [2026, 2028, 2030]) {
      const a = detectClaimStretch(how, techs, y);
      const b = detectClaimStretch(how, techs, y + 1);
      assert.ok(
        (rank[b.level] ?? 1) >= (rank[a.level] ?? 1),
        `year ${y}→${y + 1}: ${a.level} → ${b.level}`
      );
    }
  });
});
