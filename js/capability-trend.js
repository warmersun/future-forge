/**
 * Capability trend schema: parse, validate, compound curve, merge for stack.
 * Schema: future-forge.capability-trend/v1
 */

import { allTechIds } from "./data.js";

export const CAPABILITY_TREND_SCHEMA = "future-forge.capability-trend/v1";
export const CAPABILITY_TREND_CATALOG_SCHEMA =
  "future-forge.capability-trend-catalog/v1";

export const TREND_CAPS = {
  id: 80,
  name: 80,
  summary: 280,
  capability: 80,
  unit: 40,
  milestoneLabel: 80,
  sourceLabel: 120,
  maxMilestones: 24,
  maxSources: 12,
  maxQuestTrends: 8,
  mergeLimit: 8,
};

const COMPOUNDING_KINDS = new Set(["doubling", "halving", "cagr"]);
const MILESTONE_STATUSES = new Set(["reached", "predicted"]);

/**
 * @param {string} raw
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseTrendJson(raw) {
  try {
    const value = JSON.parse(String(raw || ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "not_object" };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}

/**
 * Fractional year from year string ("2014") or ISO date ("2015-01-01").
 * @param {string|number} date
 * @returns {number|null}
 */
export function yearFromDate(date) {
  if (typeof date === "number" && Number.isFinite(date)) return date;
  const s = String(date || "").trim();
  if (!s) return null;
  if (/^\d{4}$/.test(s)) return Number(s);
  const m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = m[3] ? Number(m[3]) : 1;
    if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
    // Approximate fractional year (month/day)
    return y + (mo - 1) / 12 + (d - 1) / 365.25;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object} compounding
 * @param {number} deltaYears — years after anchor
 * @param {number} v0
 */
export function compoundValue(compounding, deltaYears, v0) {
  const kind = compounding?.kind;
  if (kind === "doubling") {
    const T = Number(compounding.periodYears);
    return v0 * Math.pow(2, deltaYears / T);
  }
  if (kind === "halving") {
    const T = Number(compounding.periodYears);
    return v0 * Math.pow(2, -deltaYears / T);
  }
  if (kind === "cagr") {
    const r = Number(compounding.annualRate);
    return v0 * Math.pow(1 + r, deltaYears);
  }
  return NaN;
}

/**
 * @param {object} trend — normalized or raw with anchor/compounding
 * @param {number} year
 */
export function valueAtYear(trend, year) {
  const y = Number(year);
  const anchorY = yearFromDate(trend?.anchor?.date);
  const v0 = Number(trend?.anchor?.value);
  if (!Number.isFinite(y) || anchorY == null || !(v0 > 0)) return null;
  const v = compoundValue(trend.compounding, y - anchorY, v0);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Sample the curve across domain.
 * @param {object} trend
 * @param {number} [steps]
 * @returns {{ x: number, y: number }[]}
 */
export function sampleCurve(trend, steps = 40) {
  const n = Math.max(2, Math.min(200, Math.round(Number(steps) || 40)));
  const start = Number(trend?.domain?.start);
  const end = Number(trend?.domain?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [];
  }
  /** @type {{ x: number, y: number }[]} */
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = start + ((end - start) * i) / (n - 1);
    const y = valueAtYear(trend, x);
    if (y != null && y > 0) out.push({ x, y });
  }
  return out;
}

/**
 * @param {object} raw
 * @param {{ techIds?: string[] }} [opts]
 * @returns {{ ok: true, trend: object } | { ok: false, error: string, details?: string[] }}
 */
export function validateCapabilityTrend(raw, opts = {}) {
  const details = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "not_object" };
  }

  const schema = String(raw.schema || "");
  // Nested quest trends may omit schema; treat missing as this schema.
  if (schema && schema !== CAPABILITY_TREND_SCHEMA) {
    return {
      ok: false,
      error: "bad_schema",
      details: [`expected ${CAPABILITY_TREND_SCHEMA}`],
    };
  }

  const techIds = new Set(opts.techIds || allTechIds());
  const id = String(raw.id || "")
    .trim()
    .toLowerCase();
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > TREND_CAPS.id) {
    details.push(`bad_id:${id || "(empty)"}`);
  }

  const techId = String(raw.techId || "").trim();
  if (!techId || !techIds.has(techId)) {
    details.push(`bad_techId:${techId || "(empty)"}`);
  }

  const name = String(raw.name || "").trim();
  const summary = String(raw.summary || "").trim();
  const capability = String(raw.capability || "").trim();
  const unit = String(raw.unit || "").trim();
  if (!name) details.push("missing_name");
  if (name.length > TREND_CAPS.name) details.push("name_too_long");
  if (!summary) details.push("missing_summary");
  if (summary.length > TREND_CAPS.summary) details.push("summary_too_long");
  if (!capability) details.push("missing_capability");
  if (capability.length > TREND_CAPS.capability) details.push("capability_too_long");
  if (!unit) details.push("missing_unit");
  if (unit.length > TREND_CAPS.unit) details.push("unit_too_long");

  const compoundingIn = raw.compounding;
  /** @type {{ kind: string, periodYears?: number, annualRate?: number } | null} */
  let compounding = null;
  if (!compoundingIn || typeof compoundingIn !== "object") {
    details.push("missing_compounding");
  } else {
    const kind = String(compoundingIn.kind || "").trim();
    if (!COMPOUNDING_KINDS.has(kind)) {
      details.push(`bad_compounding_kind:${kind || "(empty)"}`);
    } else if (kind === "cagr") {
      const annualRate = Number(compoundingIn.annualRate);
      if (!Number.isFinite(annualRate) || annualRate <= -1) {
        details.push("bad_annualRate");
      } else {
        compounding = { kind, annualRate };
      }
    } else {
      const periodYears = Number(compoundingIn.periodYears);
      if (!Number.isFinite(periodYears) || periodYears <= 0) {
        details.push("bad_periodYears");
      } else {
        compounding = { kind, periodYears };
      }
    }
  }

  const anchorIn = raw.anchor;
  /** @type {{ date: string, value: number, year: number } | null} */
  let anchor = null;
  if (!anchorIn || typeof anchorIn !== "object") {
    details.push("missing_anchor");
  } else {
    const date = String(anchorIn.date || "").trim();
    const value = Number(anchorIn.value);
    const year = yearFromDate(date);
    if (!date || year == null) details.push("bad_anchor_date");
    if (!(value > 0) || !Number.isFinite(value)) details.push("bad_anchor_value");
    if (date && year != null && value > 0) {
      anchor = { date, value, year };
    }
  }

  const milestonesIn = Array.isArray(raw.milestones) ? raw.milestones : null;
  if (!milestonesIn || !milestonesIn.length) {
    details.push("missing_milestones");
  }
  /** @type {object[]} */
  const milestones = [];
  if (milestonesIn) {
    if (milestonesIn.length > TREND_CAPS.maxMilestones) {
      details.push("too_many_milestones");
    }
    for (let i = 0; i < Math.min(milestonesIn.length, TREND_CAPS.maxMilestones); i++) {
      const m = milestonesIn[i];
      if (!m || typeof m !== "object") {
        details.push(`milestone_${i}_not_object`);
        continue;
      }
      const label = String(m.label || "").trim();
      const date = String(m.date || "").trim();
      const value = Number(m.value);
      const status = String(m.status || "").trim();
      const year = yearFromDate(date);
      if (!label) details.push(`milestone_${i}_missing_label`);
      if (label.length > TREND_CAPS.milestoneLabel) {
        details.push(`milestone_${i}_label_too_long`);
      }
      if (!date || year == null) details.push(`milestone_${i}_bad_date`);
      if (!(value > 0) || !Number.isFinite(value)) {
        details.push(`milestone_${i}_bad_value`);
      }
      if (!MILESTONE_STATUSES.has(status)) {
        details.push(`milestone_${i}_bad_status`);
      }
      if (
        label &&
        date &&
        year != null &&
        value > 0 &&
        MILESTONE_STATUSES.has(status)
      ) {
        const row = {
          label: label.slice(0, TREND_CAPS.milestoneLabel),
          date,
          value,
          status,
          year,
        };
        const mid = String(m.id || "").trim();
        if (mid) row.id = mid.slice(0, TREND_CAPS.id);
        milestones.push(row);
      }
    }
  }

  /** @type {{ label: string, url: string }[]} */
  const sources = [];
  if (raw.sources !== undefined && raw.sources !== null) {
    if (!Array.isArray(raw.sources)) {
      details.push("sources_not_array");
    } else {
      for (const s of raw.sources.slice(0, TREND_CAPS.maxSources)) {
        if (!s || typeof s !== "object") continue;
        const label = String(s.label || "").trim().slice(0, TREND_CAPS.sourceLabel);
        const url = String(s.url || "").trim();
        if (!label || !url) continue;
        if (!/^https:\/\//i.test(url)) {
          details.push("source_url_not_https");
          continue;
        }
        sources.push({ label, url });
      }
    }
  }

  // Domain
  let domainStart = null;
  let domainEnd = null;
  if (raw.domain != null) {
    if (typeof raw.domain !== "object") {
      details.push("domain_not_object");
    } else {
      if (raw.domain.start != null) {
        domainStart = yearFromDate(raw.domain.start);
        if (domainStart == null) details.push("bad_domain_start");
      }
      if (raw.domain.end != null) {
        domainEnd = yearFromDate(raw.domain.end);
        if (domainEnd == null) details.push("bad_domain_end");
      }
    }
  }

  if (details.length) {
    return { ok: false, error: "validation_failed", details };
  }

  const years = [
    ...(anchor ? [anchor.year] : []),
    ...milestones.map((m) => m.year),
  ];
  if (domainStart == null) {
    domainStart = Math.floor(Math.min(...years)) - 1;
  }
  if (domainEnd == null) {
    domainEnd = Math.ceil(Math.max(...years)) + 2;
  }
  if (!(domainEnd > domainStart)) {
    return {
      ok: false,
      error: "validation_failed",
      details: ["domain_end_not_after_start"],
    };
  }

  const trend = {
    schema: CAPABILITY_TREND_SCHEMA,
    id,
    techId,
    name: name.slice(0, TREND_CAPS.name),
    summary: summary.slice(0, TREND_CAPS.summary),
    capability: capability.slice(0, TREND_CAPS.capability),
    unit: unit.slice(0, TREND_CAPS.unit),
    compounding,
    anchor: { date: anchor.date, value: anchor.value },
    domain: { start: domainStart, end: domainEnd },
    milestones,
  };
  if (sources.length) trend.sources = sources;

  return { ok: true, trend };
}

/**
 * @param {object} raw
 * @param {{ techIds?: string[] }} [opts]
 */
export function normalizeTrend(raw, opts = {}) {
  const r = validateCapabilityTrend(raw, opts);
  if (!r.ok) return r;
  return { ok: true, trend: r.trend };
}

/**
 * Merge catalog + quest trends for the current tech stack.
 * @param {object} opts
 * @param {object[]} [opts.catalog]
 * @param {object[]} [opts.questTrends]
 * @param {string[]} [opts.spotlightTrendIds]
 * @param {string[]} [opts.selectedTechIds]
 * @param {string|null} [opts.spotlightTechId]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.includeAll] — ignore stack filter and merge cap (developer mode)
 * @returns {object[]}
 */
export function mergeTrendsForStack(opts = {}) {
  const includeAll = Boolean(opts.includeAll);
  const selected = new Set(
    (opts.selectedTechIds || []).map(String).filter(Boolean)
  );
  if (!includeAll && !selected.size) return [];

  const limit = includeAll
    ? Number.POSITIVE_INFINITY
    : Math.max(
        1,
        Math.min(TREND_CAPS.mergeLimit, opts.limit ?? TREND_CAPS.mergeLimit)
      );
  const spotlightIds = new Set(
    (opts.spotlightTrendIds || []).map(String).filter(Boolean)
  );
  const spotlightTechId = opts.spotlightTechId
    ? String(opts.spotlightTechId)
    : null;

  /** @type {Map<string, object>} */
  const byId = new Map();

  for (const t of opts.catalog || []) {
    if (!t || !t.id) continue;
    if (!includeAll && !selected.has(t.techId)) continue;
    byId.set(t.id, { ...t, spotlight: false, source: t.source || "catalog" });
  }

  for (const t of opts.questTrends || []) {
    if (!t || !t.id) continue;
    if (!includeAll && !selected.has(t.techId)) continue;
    byId.set(t.id, {
      ...t,
      spotlight: false,
      source: "quest",
    });
  }

  const rows = [...byId.values()].map((t) => ({
    ...t,
    spotlight: spotlightIds.has(t.id),
  }));

  rows.sort((a, b) => {
    if (a.spotlight !== b.spotlight) return a.spotlight ? -1 : 1;
    const aSpot = spotlightTechId && a.techId === spotlightTechId ? 0 : 1;
    const bSpot = spotlightTechId && b.techId === spotlightTechId ? 0 : 1;
    if (aSpot !== bSpot) return aSpot - bSpot;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return includeAll ? rows : rows.slice(0, limit);
}
