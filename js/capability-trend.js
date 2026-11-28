/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Capability trend schema: parse, validate, compound curve, merge for stack.
 * Schema: future-forge.capability-trend/v2
 */

import { allTechIds } from "./data.js";

export const CAPABILITY_TREND_SCHEMA = "future-forge.capability-trend/v2";
export const CAPABILITY_TREND_CATALOG_SCHEMA =
  "future-forge.capability-trend-catalog/v2";
export const CAPABILITY_TREND_BUNDLE_SCHEMA =
  "future-forge.capability-trend-bundle/v2";

export const TREND_CAPS = {
  id: 80,
  name: 80,
  summary: 900,
  capability: 160,
  trendSummary: 180,
  unit: 80,
  milestoneLabel: 80,
  milestoneDetail: 280,
  milestoneAttribution: 160,
  useCaseTitle: 80,
  useCaseBlurb: 280,
  sourceLabel: 120,
  maxMilestones: 24,
  maxUseCases: 8,
  maxSources: 12,
  maxQuestTrends: 8,
  mergeLimit: 8,
  maxStackLimit: 32,
};

const COMPOUNDING_KINDS = new Set(["doubling", "halving", "cagr"]);
const MILESTONE_STATUSES = new Set(["reached", "predicted"]);
const AXIS_KINDS = new Set(["price", "speed", "capacity", "range", "scale", "quality"]);
const USE_CASE_WORLDS = new Set(["bits", "atoms", "split"]);

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
  if (!trend || trend.hasCurve === false || !trend.compounding || !trend.anchor) {
    return null;
  }
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
  if (!trend || trend.hasCurve === false || !trend.compounding || !trend.anchor) {
    return [];
  }
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

function parseUseCaseList(rawList, prefix, details) {
  if (rawList === undefined || rawList === null) return [];
  if (!Array.isArray(rawList)) {
    details.push(`${prefix}_not_array`);
    return [];
  }
  if (rawList.length > TREND_CAPS.maxUseCases) {
    details.push(`${prefix}_too_many`);
  }
  /** @type {object[]} */
  const out = [];
  for (let i = 0; i < Math.min(rawList.length, TREND_CAPS.maxUseCases); i++) {
    const u = rawList[i];
    if (!u || typeof u !== "object" || Array.isArray(u)) {
      details.push(`${prefix}_${i}_not_object`);
      continue;
    }
    const title = String(u.title || "").trim();
    const blurb = String(u.blurb || "").trim();
    const worldRaw = u.world != null ? String(u.world).trim() : "";
    const uid = u.id != null ? String(u.id).trim() : "";
    if (!title) details.push(`${prefix}_${i}_missing_title`);
    if (title.length > TREND_CAPS.useCaseTitle) {
      details.push(`${prefix}_${i}_title_too_long`);
    }
    if (!blurb) details.push(`${prefix}_${i}_missing_blurb`);
    if (blurb.length > TREND_CAPS.useCaseBlurb) {
      details.push(`${prefix}_${i}_blurb_too_long`);
    }
    if (worldRaw && !USE_CASE_WORLDS.has(worldRaw)) {
      details.push(`${prefix}_${i}_bad_world:${worldRaw}`);
    }
    if (
      title &&
      title.length <= TREND_CAPS.useCaseTitle &&
      blurb &&
      blurb.length <= TREND_CAPS.useCaseBlurb &&
      (!worldRaw || USE_CASE_WORLDS.has(worldRaw))
    ) {
      const row = { title, blurb };
      if (uid) row.id = uid.slice(0, TREND_CAPS.id);
      if (worldRaw) row.world = worldRaw;
      out.push(row);
    }
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
  const trendSummary = String(raw.trendSummary || "").trim();
  const axis = raw.axis != null ? String(raw.axis).trim() : "";
  if (!name) details.push("missing_name");
  if (name.length > TREND_CAPS.name) details.push("name_too_long");
  if (!summary) details.push("missing_summary");
  if (summary.length > TREND_CAPS.summary) details.push("summary_too_long");
  if (!capability) details.push("missing_capability");
  if (capability.length > TREND_CAPS.capability) details.push("capability_too_long");
  if (!trendSummary) details.push("missing_trendSummary");
  if (trendSummary.length > TREND_CAPS.trendSummary) {
    details.push("trendSummary_too_long");
  }
  if (axis && !AXIS_KINDS.has(axis)) {
    details.push(`bad_axis:${axis}`);
  }

  const unit = raw.unit != null ? String(raw.unit).trim() : "";
  const hasUnit = Boolean(unit);
  const hasCompounding = raw.compounding != null;
  const hasAnchor = raw.anchor != null;
  const milestonesIn = Array.isArray(raw.milestones) ? raw.milestones : null;
  const anyMilestoneValue = Boolean(
    milestonesIn &&
      milestonesIn.some((m) => m && m.value !== undefined && m.value !== null)
  );
  const hasCurve = hasUnit || hasCompounding || hasAnchor || anyMilestoneValue;

  /** @type {{ kind: string, periodYears?: number, annualRate?: number } | null} */
  let compounding = null;
  /** @type {{ date: string, value: number, year: number } | null} */
  let anchor = null;

  if (hasCurve) {
    if (!hasUnit || !hasCompounding || !hasAnchor) {
      details.push("partial_curve_fields");
    }
    if (!unit) details.push("missing_unit");
    if (unit.length > TREND_CAPS.unit) details.push("unit_too_long");

    const compoundingIn = raw.compounding;
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
  }

  const topUseCases = parseUseCaseList(raw.useCases, "useCases", details);
  let totalUseCases = topUseCases.length;

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
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        details.push(`milestone_${i}_not_object`);
        continue;
      }
      const label = String(m.label || "").trim();
      const date = String(m.date || "").trim();
      const status = String(m.status || "").trim();
      const year = yearFromDate(date);
      const detail = m.detail != null ? String(m.detail).trim() : "";
      const attribution = m.attribution != null ? String(m.attribution).trim() : "";
      const mUseCases = parseUseCaseList(
        m.useCases,
        `milestone_${i}_useCases`,
        details
      );
      totalUseCases += mUseCases.length;

      if (!label) details.push(`milestone_${i}_missing_label`);
      if (label.length > TREND_CAPS.milestoneLabel) {
        details.push(`milestone_${i}_label_too_long`);
      }
      if (detail.length > TREND_CAPS.milestoneDetail) {
        details.push(`milestone_${i}_detail_too_long`);
      }
      if (attribution.length > TREND_CAPS.milestoneAttribution) {
        details.push(`milestone_${i}_attribution_too_long`);
      }
      if (!date || year == null) details.push(`milestone_${i}_bad_date`);
      if (!MILESTONE_STATUSES.has(status)) {
        details.push(`milestone_${i}_bad_status`);
      }

      let valueOk = true;
      let value;
      if (hasCurve) {
        value = Number(m.value);
        if (m.value === undefined || m.value === null || !(value > 0) || !Number.isFinite(value)) {
          details.push(`milestone_${i}_bad_value`);
          valueOk = false;
        }
      }

      if (
        label &&
        label.length <= TREND_CAPS.milestoneLabel &&
        detail.length <= TREND_CAPS.milestoneDetail &&
        attribution.length <= TREND_CAPS.milestoneAttribution &&
        date &&
        year != null &&
        valueOk &&
        MILESTONE_STATUSES.has(status)
      ) {
        const row = {
          label,
          date,
          status,
          year,
        };
        if (hasCurve) row.value = value;
        const mid = String(m.id || "").trim();
        if (mid) row.id = mid.slice(0, TREND_CAPS.id);
        if (detail) row.detail = detail;
        if (attribution) row.attribution = attribution;
        if (mUseCases.length) row.useCases = mUseCases;
        milestones.push(row);
      }
    }
  }

  if (totalUseCases === 0) {
    details.push("missing_use_cases");
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
    trendSummary: trendSummary.slice(0, TREND_CAPS.trendSummary),
    hasCurve,
    domain: { start: domainStart, end: domainEnd },
    milestones,
  };
  if (axis) trend.axis = axis;
  if (hasCurve) {
    trend.unit = unit.slice(0, TREND_CAPS.unit);
    trend.compounding = compounding;
    trend.anchor = { date: anchor.date, value: anchor.value };
  }
  if (topUseCases.length) trend.useCases = topUseCases;
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
 * @param {boolean} [opts.curvesOnly] — filter to capabilities with quantitative curves
 * @param {boolean} [opts.includeAll] — ignore stack filter and merge cap (developer mode)
 * @returns {object[]}
 */
export function mergeTrendsForStack(opts = {}) {
  const includeAll = Boolean(opts.includeAll);
  const curvesOnly = Boolean(opts.curvesOnly);
  const selected = new Set(
    (opts.selectedTechIds || []).map(String).filter(Boolean)
  );
  if (!includeAll && !selected.size) return [];

  const limit = includeAll
    ? Number.POSITIVE_INFINITY
    : Math.max(
        1,
        Math.min(TREND_CAPS.maxStackLimit, opts.limit ?? TREND_CAPS.mergeLimit)
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

  const rows = [...byId.values()]
    .filter((t) => !curvesOnly || (t.hasCurve !== false && Boolean(t.compounding)))
    .map((t) => ({
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
