/**
 * World foresight — one predictions bank for year bulletins, outcome cards,
 * and the AI world clock. DOM-free.
 *
 * The bank is module state: the server loads it at boot (default file or
 * FF_PREDICTIONS_FILE) and the browser sets it from GET /api/predictions.
 */

import { hashSeed, mulberry32 } from "./economy.js";

export const PREDICTIONS_SCHEMA = "future-forge.predictions/v1";

export const PREDICTION_YEAR_MIN = 2024;
export const PREDICTION_YEAR_MAX = 2040;

const KINDS = ["milestone", "prediction", "trend"];
const CLAIM_BANDS = ["now", "near", "frontier"];

const CAPS = {
  id: 80,
  title: 120,
  headline: 120,
  detail: 600,
  sourceNote: 200,
  attributionName: 80,
  attributionDate: 20,
  attributionQuote: 400,
  attributionUrl: 400,
  listItem: 40,
  rows: 500,
};

const DOC_KEYS = new Set(["schema", "id", "title", "attribution", "predictions"]);
const ROW_KEYS = new Set([
  "id",
  "year",
  "kind",
  "headline",
  "detail",
  "claimBand",
  "techIds",
  "globalIds",
  "sourceNote",
  "attribution",
]);
const ATTRIBUTION_KEYS = new Set(["name", "url", "date", "quote"]);

/**
 * @typedef {object} PredictionAttribution
 * @property {string} name
 * @property {string} [url]
 * @property {string} [date]
 * @property {string} [quote]
 */

/**
 * @typedef {object} WorldCapabilityEvent
 * @property {string} id
 * @property {number} year
 * @property {"milestone"|"prediction"|"trend"} kind
 * @property {string[]} [techIds]
 * @property {string[]} [globalIds]
 * @property {string} headline
 * @property {string} detail
 * @property {"now"|"near"|"frontier"} claimBand
 * @property {string} [sourceNote]
 * @property {PredictionAttribution} [attribution] — row value, else the bank default
 */

/**
 * @typedef {object} PredictionsBank
 * @property {string} schema
 * @property {string} id
 * @property {string} title
 * @property {PredictionAttribution} [attribution]
 * @property {WorldCapabilityEvent[]} predictions
 */

/** @type {PredictionsBank} */
let activeBank = {
  schema: PREDICTIONS_SCHEMA,
  id: "empty",
  title: "",
  predictions: [],
};

/**
 * @param {string} text
 * @returns {{ ok: true, value: unknown } | { ok: false, error: string }}
 */
export function parsePredictionsJson(text) {
  try {
    return { ok: true, value: JSON.parse(String(text || "")) };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}

function str(v, cap) {
  return typeof v === "string" ? v.trim().slice(0, cap) : "";
}

/**
 * @param {unknown} raw
 * @param {string} where
 * @param {string[]} errors
 * @param {string[]} warnings
 * @returns {PredictionAttribution|null}
 */
function normalizeAttribution(raw, where, errors, warnings) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    const name = str(raw, CAPS.attributionName);
    if (!name) {
      errors.push(`${where}: empty attribution`);
      return null;
    }
    return { name };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${where}: attribution must be an object`);
    return null;
  }
  for (const k of Object.keys(raw)) {
    if (!ATTRIBUTION_KEYS.has(k)) warnings.push(`${where}: unknown attribution key ${k}`);
  }
  const name = str(raw.name, CAPS.attributionName);
  if (!name) {
    errors.push(`${where}: attribution.name required`);
    return null;
  }
  /** @type {PredictionAttribution} */
  const out = { name };
  const url = str(raw.url, CAPS.attributionUrl);
  if (url) {
    if (!/^https:\/\//i.test(url)) errors.push(`${where}: attribution.url must be https`);
    else out.url = url;
  }
  const date = raw.date == null ? "" : str(String(raw.date), CAPS.attributionDate);
  if (date) out.date = date;
  const quote = str(raw.quote, CAPS.attributionQuote);
  if (quote) out.quote = quote;
  return out;
}

function normalizeIdList(raw, where, field, errors) {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${where}: ${field} must be an array`);
    return undefined;
  }
  const out = [
    ...new Set(raw.map((x) => str(x, CAPS.listItem)).filter(Boolean)),
  ];
  return out.length ? out : undefined;
}

/**
 * Validate and normalize a predictions bank document.
 * Row attribution falls back to the bank-wide attribution.
 * @param {unknown} doc
 * @param {string[]|null} [techIds] — when given, unknown tech ids are errors
 * @returns {{ ok: boolean, error?: string, errors: string[], warnings: string[], bank: PredictionsBank|null, count: number }}
 */
export function validatePredictionsBank(doc, techIds = null) {
  const errors = [];
  const warnings = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return {
      ok: false,
      error: "not_an_object",
      errors: ["document must be a JSON object"],
      warnings,
      bank: null,
      count: 0,
    };
  }
  const d = /** @type {Record<string, unknown>} */ (doc);
  if (d.schema !== PREDICTIONS_SCHEMA) {
    errors.push(`schema must be "${PREDICTIONS_SCHEMA}"`);
  }
  for (const k of Object.keys(d)) {
    if (!DOC_KEYS.has(k)) warnings.push(`unknown top-level key ${k}`);
  }
  const id = str(d.id, CAPS.id);
  if (!id) errors.push("id required");
  const title = str(d.title, CAPS.title);
  if (!title) errors.push("title required");
  const bankAttribution = normalizeAttribution(d.attribution, "attribution", errors, warnings);

  const rawRows = Array.isArray(d.predictions) ? d.predictions : null;
  if (!rawRows) errors.push("predictions must be an array");
  else if (!rawRows.length) errors.push("predictions is empty");
  else if (rawRows.length > CAPS.rows) errors.push(`more than ${CAPS.rows} predictions`);

  const known = Array.isArray(techIds) ? new Set(techIds) : null;
  const ids = new Set();
  /** @type {WorldCapabilityEvent[]} */
  const predictions = [];

  (rawRows || []).slice(0, CAPS.rows).forEach((raw, i) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`predictions[${i}]: must be an object`);
      return;
    }
    const r = /** @type {Record<string, unknown>} */ (raw);
    const rowId = str(r.id, CAPS.id);
    const where = rowId || `predictions[${i}]`;
    for (const k of Object.keys(r)) {
      if (!ROW_KEYS.has(k)) warnings.push(`${where}: unknown key ${k}`);
    }
    let rowOk = true;
    const fail = (msg) => {
      errors.push(`${where}: ${msg}`);
      rowOk = false;
    };
    if (!rowId) fail("id required");
    else if (ids.has(rowId)) fail("duplicate id");
    else ids.add(rowId);

    const year = Number(r.year);
    if (!Number.isInteger(year) || year < PREDICTION_YEAR_MIN || year > PREDICTION_YEAR_MAX) {
      fail(`year must be an integer ${PREDICTION_YEAR_MIN}–${PREDICTION_YEAR_MAX}`);
    }
    if (!KINDS.includes(/** @type {string} */ (r.kind))) fail(`kind must be one of ${KINDS.join("|")}`);
    if (!CLAIM_BANDS.includes(/** @type {string} */ (r.claimBand))) {
      fail(`claimBand must be one of ${CLAIM_BANDS.join("|")}`);
    }
    const headline = str(r.headline, CAPS.headline);
    if (!headline) fail("headline required");
    const detail = str(r.detail, CAPS.detail);
    if (!detail) fail("detail required");

    const rowTechIds = normalizeIdList(r.techIds, where, "techIds", errors);
    if (known && rowTechIds) {
      for (const t of rowTechIds) {
        if (!known.has(t)) fail(`unknown tech ${t}`);
      }
    }
    const globalIds = normalizeIdList(r.globalIds, where, "globalIds", errors);
    const sourceNote = str(r.sourceNote, CAPS.sourceNote);
    const rowAttribution = normalizeAttribution(r.attribution, where, errors, warnings);
    const attribution = rowAttribution || bankAttribution;

    if (!rowOk) return;
    /** @type {WorldCapabilityEvent} */
    const row = {
      id: rowId,
      year,
      kind: /** @type {WorldCapabilityEvent["kind"]} */ (r.kind),
      headline,
      detail,
      claimBand: /** @type {WorldCapabilityEvent["claimBand"]} */ (r.claimBand),
    };
    if (rowTechIds) row.techIds = rowTechIds;
    if (globalIds) row.globalIds = globalIds;
    if (sourceNote) row.sourceNote = sourceNote;
    if (attribution) row.attribution = { ...attribution };
    predictions.push(row);
  });

  const ok = errors.length === 0;
  /** @type {PredictionsBank} */
  const bank = {
    schema: PREDICTIONS_SCHEMA,
    id,
    title,
    ...(bankAttribution ? { attribution: bankAttribution } : {}),
    predictions,
  };
  return {
    ok,
    ...(ok ? {} : { error: "validation_failed" }),
    errors,
    warnings,
    bank: ok ? bank : null,
    count: predictions.length,
  };
}

/**
 * Replace the active bank. Accepts a raw document or an already-validated bank.
 * @param {unknown} doc
 * @returns {{ ok: boolean, errors: string[], count: number }}
 */
export function setWorldForesightBank(doc) {
  const v = validatePredictionsBank(doc);
  if (!v.ok || !v.bank) return { ok: false, errors: v.errors, count: 0 };
  activeBank = v.bank;
  return { ok: true, errors: [], count: v.bank.predictions.length };
}

/** @returns {PredictionsBank} */
export function getWorldForesightBank() {
  return activeBank;
}

/** @returns {WorldCapabilityEvent[]} */
export function getWorldForesightEvents() {
  return activeBank.predictions;
}

/**
 * Events that are "active" by calendar year (year ≤ Y).
 * @param {number} year
 * @param {WorldCapabilityEvent[]} [pool]
 */
export function foresightActiveByYear(year, pool = activeBank.predictions) {
  const y = Number(year) || 2026;
  return (pool || []).filter((e) => e && Number(e.year) <= y);
}

/**
 * Events that become newly salient this year (exact year match).
 * @param {number} year
 * @param {WorldCapabilityEvent[]} [pool]
 */
export function foresightNewInYear(year, pool = activeBank.predictions) {
  const y = Number(year) || 2026;
  return (pool || []).filter((e) => e && Number(e.year) === y);
}

/**
 * Pick 3–6 highlights for the year bulletin.
 * @param {number} year
 * @param {object} [opts]
 * @param {string[]} [opts.techIds]
 * @param {string|null} [opts.globalId]
 * @param {number} [opts.limit]
 * @param {string|number} [opts.seed]
 * @param {WorldCapabilityEvent[]} [opts.pool]
 * @returns {WorldCapabilityEvent[]}
 */
export function foresightForYear(year, opts = {}) {
  const y = Number(year) || 2026;
  const limit = Math.max(3, Math.min(6, opts.limit ?? 5));
  const pool = opts.pool || activeBank.predictions;
  const techSet = new Set(opts.techIds || []);
  const globalId = opts.globalId || null;
  const rng = mulberry32(hashSeed(`${opts.seed ?? "foresight"}:${y}:${globalId || ""}`));

  const score = (e) => {
    let s = 0;
    if (Number(e.year) === y) s += 10;
    else if (Number(e.year) === y - 1) s += 4;
    if ((e.techIds || []).some((id) => techSet.has(id))) s += 6;
    if (globalId && (e.globalIds || []).includes(globalId)) s += 5;
    if (e.kind === "prediction") s += 2;
    if (e.kind === "milestone") s += 1;
    s += rng() * 0.5;
    return s;
  };

  const active = foresightActiveByYear(y, pool);
  const fresh = foresightNewInYear(y, pool);
  const ranked = [
    ...fresh.sort((a, b) => score(b) - score(a)),
    ...active
      .filter((e) => !fresh.some((f) => f.id === e.id))
      .sort((a, b) => score(b) - score(a)),
  ];

  const picked = [];
  const domainsSeen = new Set();
  for (const e of ranked) {
    if (picked.length >= limit) break;
    const tech0 = (e.techIds || [])[0];
    // light diversity: skip if we already have one from the same first tech
    if (tech0 && domainsSeen.has(tech0) && picked.length >= 3) continue;
    picked.push(e);
    if (tech0) domainsSeen.add(tech0);
  }

  while (picked.length < Math.min(3, ranked.length)) {
    const next = ranked.find((e) => !picked.some((p) => p.id === e.id));
    if (!next) break;
    picked.push(next);
  }
  return picked;
}

/**
 * Slim highlight row for bulletins (sim state + MP snapshots).
 * @param {WorldCapabilityEvent} e
 */
export function bulletinHighlight(e) {
  return {
    id: e.id,
    kind: e.kind,
    headline: e.headline,
    detail: e.detail,
    claimBand: e.claimBand,
    ...(e.attribution?.name ? { attribution: e.attribution.name } : {}),
  };
}

/**
 * Foresight rows touching a tech stack.
 * @param {string[]} techIds
 * @param {number} year
 * @param {object} [opts]
 */
export function foresightForTechs(techIds, year, opts = {}) {
  const set = new Set(techIds || []);
  const y = Number(year) || 2026;
  const pool = opts.pool || activeBank.predictions;
  return foresightActiveByYear(y, pool).filter((e) =>
    (e.techIds || []).some((id) => set.has(id))
  );
}

/**
 * @typedef {object} WorldClockRow
 * @property {string} id
 * @property {number} year
 * @property {string} kind
 * @property {string} headline
 * @property {string} detail
 * @property {string} claimBand
 * @property {"due"|"not_yet"} status
 * @property {string} [attribution]
 */

/**
 * Year slice of the bank for AI context: rows already due by `year`
 * (stack/theme first, then due frontier claims, newest first), plus the
 * nearest not-yet rows that are frontier or touch the stack.
 * @param {number} year
 * @param {object} [opts]
 * @param {string[]} [opts.techIds]
 * @param {string|null} [opts.globalId]
 * @param {number} [opts.limit]
 * @param {WorldCapabilityEvent[]} [opts.pool]
 * @returns {WorldClockRow[]}
 */
export function worldClockForYear(year, opts = {}) {
  const y = Number(year) || 2026;
  const limit = Math.max(1, Math.min(40, opts.limit ?? 12));
  const pool = opts.pool || activeBank.predictions;
  const techSet = new Set(opts.techIds || []);
  const globalId = opts.globalId || null;

  const relevance = (e) => {
    let s = 0;
    if ((e.techIds || []).some((id) => techSet.has(id))) s += 4;
    if (globalId && (e.globalIds || []).includes(globalId)) s += 3;
    return s;
  };

  const due = (pool || [])
    .filter((e) => e && Number(e.year) <= y)
    .map((e) => ({
      e,
      s: relevance(e) + (e.claimBand === "frontier" ? 2 : 0) + (Number(e.year) >= y - 1 ? 1 : 0),
    }))
    .sort((a, b) => b.s - a.s || Number(b.e.year) - Number(a.e.year))
    .map((x) => x.e);

  const future = (pool || [])
    .filter((e) => e && Number(e.year) > y && (e.claimBand === "frontier" || relevance(e) > 0))
    .sort(
      (a, b) =>
        Number(a.year) - Number(b.year) ||
        relevance(b) - relevance(a) ||
        (b.claimBand === "frontier" ? 1 : 0) - (a.claimBand === "frontier" ? 1 : 0)
    );

  const notYetReserve = Math.min(future.length, limit, Math.max(2, Math.round(limit / 3)));
  const dueTake = due.slice(0, limit - notYetReserve);
  const notYetTake = future.slice(0, limit - dueTake.length);

  /** @param {WorldCapabilityEvent} e @param {"due"|"not_yet"} status */
  const slim = (e, status) => ({
    id: e.id,
    year: e.year,
    kind: e.kind,
    headline: e.headline,
    detail: e.detail,
    claimBand: e.claimBand,
    status,
    ...(e.attribution?.name ? { attribution: e.attribution.name } : {}),
  });

  return [
    ...dueTake.map((e) => slim(e, "due")),
    ...notYetTake.map((e) => slim(e, "not_yet")),
  ];
}

/**
 * One milestone, trend, and prediction for the outcome screen.
 * Milestones and trends must be due by `year`; the prediction prefers a row
 * still ahead of `year`. Stack hits beat theme hits beat any row of that kind.
 * @param {string[]} techIds
 * @param {string|null} globalId
 * @param {number} [year]
 * @param {{ pool?: WorldCapabilityEvent[], seed?: string|number }} [opts]
 */
export function foresightForStack(techIds, globalId, year = 2026, opts = {}) {
  const y = Number(year) || 2026;
  const pool = opts.pool || activeBank.predictions;
  const set = new Set(techIds || []);
  const rng = mulberry32(
    hashSeed(`${opts.seed ?? "stack"}:${y}:${globalId || ""}:${[...set].sort().join(",")}`)
  );
  const pickFrom = (rows) => (rows.length ? rows[Math.floor(rng() * rows.length)] : null);
  const techHit = (e) => (e.techIds || []).some((id) => set.has(id));
  const globalHit = (e) => Boolean(globalId && (e.globalIds || []).includes(globalId));

  const pick = (kind) => {
    let rows = pool.filter((e) => e && e.kind === kind);
    if (kind === "prediction") {
      const ahead = rows.filter((e) => Number(e.year) > y);
      if (ahead.length) rows = ahead;
    } else {
      rows = rows.filter((e) => Number(e.year) <= y);
    }
    if (!rows.length) return null;
    const tech = rows.filter(techHit);
    if (tech.length) return pickFrom(tech);
    const theme = rows.filter(globalHit);
    if (theme.length) return pickFrom(theme);
    return pickFrom(rows);
  };

  return {
    year: y,
    milestone: pick("milestone"),
    trend: pick("trend"),
    prediction: pick("prediction"),
  };
}
