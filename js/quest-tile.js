/**
 * Quest tile schema: parse, validate, normalize to runtime mission.
 * Spotlight tiles teach one emTech advance via a fictive local Quest.
 */

import { GAME, GLOBALS, allTechIds } from "./data.js";
import {
  TREND_CAPS,
  validateCapabilityTrend,
} from "./capability-trend.js";
import { isSafeBriefImageUrl, normalizeBriefBeats } from "./brief-beats.js";

export const QUEST_TILE_SCHEMA = "future-forge.quest-tile/v1";

/** Cloud catalog gate: open | account | paid (paid ≡ account until Billing). */
export const TILE_ACCESS = new Set(["open", "account", "paid"]);

export const CAPS = {
  title: 100,
  place: 80,
  scene: 500,
  briefMd: 12_000,
  stakeholder: 120,
  summary: 160,
  advanceTitle: 200,
  advanceSummary: 600,
  encourageCopy: 280,
  researchTotal: 8_000,
  meterKey: 40,
  /** Soft safety ceiling for optional AI grounding (not a product length limit). */
  grounding: 50_000,
  /** Soft safety ceiling for hidden AI tutor context. */
  aiTutorContext: 50_000,
  sponsorName: 120,
  sponsorBanner: 200,
  /** Learning-module title (display + catalog group key). */
  moduleTitle: 80,
  /** Module wrapper overview (player-facing path summary). */
  overviewMd: 8_000,
  maxModuleLessons: 24,
  maxQuestTrends: TREND_CAPS.maxQuestTrends,
};

/**
 * Pick tile- or mission-level optional field (tile wins when set).
 * @param {object} tile
 * @param {object} missionIn
 * @param {string} key
 */
function pickTileOrMissionField(tile, missionIn, key) {
  if (tile && tile[key] !== undefined && tile[key] !== null) return tile[key];
  if (missionIn && missionIn[key] !== undefined && missionIn[key] !== null) {
    return missionIn[key];
  }
  return undefined;
}

/**
 * Optional Cloud access. Invalid strings fail validation.
 * Omitted → "account" when learning module, else "open".
 * @returns {{ ok: true, value: string } | { ok: false, details: string[] }}
 */
export function parseAccessField(tile, missionIn = {}, opts = {}) {
  const raw = pickTileOrMissionField(tile, missionIn, "access");
  if (raw === undefined) {
    const learning = Boolean(opts.isLearningModule);
    return { ok: true, value: learning ? "account" : "open" };
  }
  if (typeof raw !== "string") {
    return { ok: false, details: ["access_not_string"] };
  }
  const v = raw.trim().toLowerCase();
  if (!TILE_ACCESS.has(v)) {
    return { ok: false, details: ["access_invalid"] };
  }
  return { ok: true, value: v };
}

/**
 * Optional quest-embedded capability trends + spotlight trend ids.
 * @param {object} tile
 * @param {object} [missionIn]
 * @param {{ techIds?: string[] }} [opts]
 * @returns {{ ok: true, value: { trends?: object[], spotlightTrends?: string[] } } | { ok: false, details: string[] }}
 */
export function parseQuestTrendFields(tile, missionIn = {}, opts = {}) {
  const details = [];
  /** @type {{ trends?: object[], spotlightTrends?: string[] }} */
  const out = {};

  const trendsRaw = pickTileOrMissionField(tile, missionIn, "trends");
  /** @type {object[]} */
  const trends = [];
  if (trendsRaw !== undefined) {
    if (!Array.isArray(trendsRaw)) {
      details.push("trends_not_array");
    } else if (trendsRaw.length > CAPS.maxQuestTrends) {
      details.push("too_many_trends");
    } else {
      for (let i = 0; i < trendsRaw.length; i++) {
        const raw = trendsRaw[i];
        const v = validateCapabilityTrend(raw, {
          techIds: opts.techIds || allTechIds(),
        });
        if (!v.ok) {
          details.push(`trend_${i}_${v.error || "invalid"}`);
          if (v.details?.length) {
            for (const d of v.details.slice(0, 6)) {
              details.push(`trend_${i}_${d}`);
            }
          }
          continue;
        }
        trends.push(v.trend);
      }
    }
  }

  const spotRaw = pickTileOrMissionField(tile, missionIn, "spotlightTrends");
  /** @type {string[]} */
  const spotlightTrends = [];
  if (spotRaw !== undefined) {
    if (!Array.isArray(spotRaw)) {
      details.push("spotlightTrends_not_array");
    } else {
      for (const id of spotRaw.slice(0, CAPS.maxQuestTrends)) {
        const s = String(id || "").trim();
        if (s) spotlightTrends.push(s.slice(0, TREND_CAPS.id));
      }
    }
  }

  if (details.length) return { ok: false, details };
  if (trends.length) out.trends = trends;
  if (spotlightTrends.length) out.spotlightTrends = spotlightTrends;
  return { ok: true, value: out };
}

/**
 * Validate optional learning-module fields.
 * @returns {{ ok: true, value: object } | { ok: false, details: string[] }}
 *   value keys only set when present/valid: isLearningModule, aiTutorContext, module, lesson, totalLessons
 */
export function parseLearningModuleFields(tile, missionIn = {}) {
  const details = [];
  /** @type {Record<string, unknown>} */
  const out = {};

  const isLm = pickTileOrMissionField(tile, missionIn, "isLearningModule");
  if (isLm !== undefined) {
    if (typeof isLm !== "boolean") {
      details.push("isLearningModule_not_boolean");
    } else if (isLm === true) {
      out.isLearningModule = true;
    }
  }

  const tutorRaw = pickTileOrMissionField(tile, missionIn, "aiTutorContext");
  if (tutorRaw !== undefined) {
    if (typeof tutorRaw !== "string") {
      details.push("aiTutorContext_not_string");
    } else {
      const t = tutorRaw.trim();
      if (t) out.aiTutorContext = t.slice(0, CAPS.aiTutorContext);
    }
  }

  const moduleRaw = pickTileOrMissionField(tile, missionIn, "module");
  if (moduleRaw !== undefined) {
    if (typeof moduleRaw !== "string") {
      details.push("learning_module_not_nonempty_string");
    } else {
      const title = moduleRaw.trim();
      if (!title) {
        details.push("learning_module_not_nonempty_string");
      } else {
        out.module = title.slice(0, CAPS.moduleTitle);
      }
    }
  }

  for (const key of ["lesson", "totalLessons"]) {
    const raw = pickTileOrMissionField(tile, missionIn, key);
    if (raw === undefined) continue;
    if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1) {
      details.push(`learning_${key}_not_positive_integer`);
      continue;
    }
    out[key] = raw;
  }

  if (details.length) return { ok: false, details };
  return { ok: true, value: out };
}

function escapeLearningHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Player-facing progress label (a11y / chips), or null if nothing to show.
 * Module title first; lesson details only when needed for text contexts.
 * @param {{ module?: string, lesson?: number, totalLessons?: number }|null|undefined} m
 */
export function learningProgressLabel(m) {
  if (!m || typeof m !== "object") return null;
  const parts = [];
  const title = typeof m.module === "string" ? m.module.trim() : "";
  if (title) parts.push(title);
  if (m.lesson != null && m.totalLessons != null) {
    parts.push(`Lesson ${m.lesson}/${m.totalLessons}`);
  } else if (m.lesson != null) {
    parts.push(`Lesson ${m.lesson}`);
  } else if (m.totalLessons != null) {
    parts.push(`${m.totalLessons} lessons`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Visual module progress: title + segmented bar (one segment per lesson).
 * Prefer this over plain "Title · Lesson n/m" text in UI.
 *
 * @param {{
 *   module?: string,
 *   lesson?: number,
 *   totalLessons?: number,
 *   completedCount?: number,
 *   currentLesson?: number,
 *   compact?: boolean,
 *   className?: string,
 * }|null|undefined} opts
 * @returns {string} HTML or ""
 */
export function learningProgressBarHtml(opts) {
  if (!opts || typeof opts !== "object") return "";
  const title = typeof opts.module === "string" ? opts.module.trim() : "";
  const totalRaw = Number(opts.totalLessons);
  const lessonRaw = Number(opts.currentLesson ?? opts.lesson);
  // Segment count requires explicit totalLessons (or catalog completedCount path
  // that already computed total). Do not invent total from lesson index alone —
  // that paints a fake "1 of 1" bar on non-module quests with stray lesson: 1.
  let total =
    Number.isFinite(totalRaw) && totalRaw >= 1 ? Math.min(Math.floor(totalRaw), 24) : 0;
  if (!title && !total) return "";

  let completed = Number(opts.completedCount);
  if (!Number.isFinite(completed) || completed < 0) {
    // Without an explicit count, treat prior lessons as done when we know current index.
    completed =
      Number.isFinite(lessonRaw) && lessonRaw >= 1 ? Math.max(0, Math.floor(lessonRaw) - 1) : 0;
  }
  completed = Math.max(0, Math.min(Math.floor(completed), total || 0));

  const current =
    Number.isFinite(lessonRaw) && lessonRaw >= 1 ? Math.floor(lessonRaw) : null;
  const allDone = total > 0 && completed >= total;

  let aria = title || "Learning module";
  if (total > 0) {
    aria = allDone
      ? `${title || "Module"}: all ${total} lessons completed`
      : `${title || "Module"}: ${completed} of ${total} lessons completed${
          current != null && !allDone ? `, on lesson ${current}` : ""
        }`;
  }

  const segs = [];
  for (let i = 1; i <= total; i++) {
    let cls = "lesson-progress-seg";
    if (i <= completed) cls += " is-filled";
    else if (current != null && i === current && !allDone) cls += " is-current";
    segs.push(`<span class="${cls}"></span>`);
  }

  const classes = ["lesson-progress"];
  if (opts.compact) classes.push("lesson-progress--compact");
  if (allDone) classes.push("is-complete");
  if (opts.className) classes.push(String(opts.className));

  const titleHtml = title
    ? `<div class="lesson-progress-title">${escapeLearningHtml(title)}</div>`
    : "";
  const barHtml = total
    ? `<div class="lesson-progress-bar" aria-hidden="true">${segs.join("")}</div>`
    : "";

  return `<div class="${classes.join(" ")}" role="img" aria-label="${escapeLearningHtml(
    aria
  )}">${titleHtml}${barHtml}</div>`;
}

const PLACEMENT_MODES = new Set(["replace-daily", "alongside", "library-only"]);

/** Known starting-resource override keys (match GAME / startMission). */
export const RESOURCE_OVERRIDE_KEYS = ["apMax", "startingBudget", "startingWill"];

/**
 * Structured crisis meters on a quest tile: optional perspectives.
 * Only keys present are active on the HUD and in win/collapse checks.
 */
export const CRISIS_ROLES = ["local", "global", "support"];
const CRISIS_ROLE_SET = new Set(CRISIS_ROLES);

/** Player-facing names for selection chips. */
export const CRISIS_ROLE_LABELS = {
  local: "Local",
  global: "Global",
  support: "Support",
};

/** Soft cap for optional per-meter description (popup + AI clip). */
export const PRESSURE_DESC_MAX = 400;

function clipPressureDesc(s) {
  return String(s || "").trim().slice(0, PRESSURE_DESC_MAX);
}

/**
 * True when `pressure` uses role keys with object entries
 * (`local` / `global` / `support` → { label, pressure, pressureRise, winMax, description? }).
 * @param {unknown} raw
 */
export function isStructuredPressure(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const keys = Object.keys(raw);
  if (!keys.length) return false;
  // Prefer structured when every present key is a known role with an object value
  return keys.every(
    (k) =>
      CRISIS_ROLE_SET.has(k) &&
      raw[k] != null &&
      typeof raw[k] === "object" &&
      !Array.isArray(raw[k])
  );
}

/**
 * Expand structured or legacy-flat pressure into runtime maps.
 * Structured: only listed roles become meters (omit a role = inactive).
 * Legacy flat: numeric values keyed by label (existing missions / seeds).
 *
 * @param {unknown} pressureRaw
 * @param {unknown} [riseRaw] — legacy flat pressureRise
 * @param {unknown} [winRaw] — legacy flat winMax
 * @returns {{
 *   ok: true,
 *   pressure: Record<string, number>,
 *   pressureRise: Record<string, number>,
 *   winMax: Record<string, number>,
 *   pressureDesc: Record<string, string>,
 *   crisisRoles: string[]|null,
 * } | { ok: false, details: string[] }}
 */
export function normalizeMissionPressure(pressureRaw, riseRaw = null, winRaw = null) {
  if (isStructuredPressure(pressureRaw)) {
    /** @type {Record<string, number>} */
    const pressure = {};
    /** @type {Record<string, number>} */
    const pressureRise = {};
    /** @type {Record<string, number>} */
    const winMax = {};
    /** @type {Record<string, string>} */
    const pressureDesc = {};
    /** @type {string[]} */
    const crisisRoles = [];
    const details = [];
    const usedLabels = new Set();

    for (const role of CRISIS_ROLES) {
      if (!(role in pressureRaw) || pressureRaw[role] == null) continue;
      const entry = pressureRaw[role];
      if (typeof entry !== "object" || Array.isArray(entry)) {
        details.push(`pressure_${role}_not_object`);
        continue;
      }
      const labelRaw = entry.label != null ? String(entry.label).trim() : "";
      const label =
        humanizeMeterKey(labelRaw) ||
        humanizeMeterKey(role) ||
        role;
      if (!label) {
        details.push(`pressure_${role}_missing_label`);
        continue;
      }
      if (usedLabels.has(label.toLowerCase())) {
        details.push(`pressure_duplicate_label:${label}`);
        continue;
      }
      usedLabels.add(label.toLowerCase());

      const p = Number(entry.pressure);
      const r =
        entry.pressureRise !== undefined && entry.pressureRise !== null
          ? Number(entry.pressureRise)
          : 1;
      const w =
        entry.winMax !== undefined && entry.winMax !== null
          ? Number(entry.winMax)
          : 1;

      if (!Number.isFinite(p) || p < 0 || p > 5) {
        details.push(`pressure_${role}_bad_pressure`);
        continue;
      }
      if (!Number.isFinite(r) || r < 0 || r > 3) {
        details.push(`pressure_${role}_bad_pressureRise`);
        continue;
      }
      if (!Number.isFinite(w) || w < 0 || w > 5) {
        details.push(`pressure_${role}_bad_winMax`);
        continue;
      }

      let desc = "";
      if (entry.description != null && entry.description !== "") {
        if (typeof entry.description !== "string") {
          details.push(`pressure_${role}_bad_description`);
          continue;
        }
        desc = clipPressureDesc(entry.description);
      }

      pressure[label] = Math.min(5, Math.max(0, Math.round(p)));
      pressureRise[label] = Math.min(3, Math.max(0, Math.round(r)));
      winMax[label] = Math.min(5, Math.max(0, Math.round(w)));
      pressureDesc[label] = desc;
      crisisRoles.push(role);
    }

    if (details.length) return { ok: false, details };
    if (!crisisRoles.length) {
      return { ok: false, details: ["pressure_no_active_roles"] };
    }
    return { ok: true, pressure, pressureRise, winMax, pressureDesc, crisisRoles };
  }

  // Legacy flat maps: { "Outbreak": 2, ... } + optional pressureRise / winMax
  const pressure = normalizePressure(pressureRaw);
  const keys = Object.keys(pressure);
  const pressureRise = normalizeMeterMap(riseRaw, keys, (i) =>
    i === keys.length - 1 ? 0 : 1
  );
  const winMax = normalizeMeterMap(winRaw, keys, () => 1);
  /** @type {Record<string, string>} */
  const pressureDesc = Object.fromEntries(keys.map((k) => [k, ""]));
  return {
    ok: true,
    pressure,
    pressureRise,
    winMax,
    pressureDesc,
    crisisRoles: null, // unknown roles in legacy shape
  };
}

/**
 * Selection-UI label when only a subset of crisis roles is active.
 * @param {string[]|null|undefined} crisisRoles
 * @returns {string|null}
 */
export function crisisRolesLabel(crisisRoles) {
  if (!Array.isArray(crisisRoles) || !crisisRoles.length) return null;
  const roles = CRISIS_ROLES.filter((r) => crisisRoles.includes(r));
  if (!roles.length || roles.length === CRISIS_ROLES.length) return null;
  return roles.map((id) => CRISIS_ROLE_LABELS[id] || id).join(" · ");
}

/**
 * Pick valid resource override fields from a raw object.
 * @param {unknown} raw
 * @returns {{ ok: true, value: object|null } | { ok: false, details: string[] }}
 */
export function parseResourceOverrides(raw) {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, details: ["resources_not_object"] };
  }
  const details = [];
  /** @type {Record<string, number>} */
  const out = {};
  for (const key of RESOURCE_OVERRIDE_KEYS) {
    if (!(key in raw) || raw[key] === undefined) continue;
    const n = raw[key];
    if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      details.push(`bad_resource_${key}`);
      continue;
    }
    out[key] = n;
  }
  if (details.length) return { ok: false, details };
  return { ok: true, value: Object.keys(out).length ? out : null };
}

/**
 * Short label for non-default resource overrides (selection UI).
 * @param {object|null|undefined} resources
 * @param {{ apMax?: number, startingBudget?: number, startingWill?: number }} [defaults]
 * @returns {string|null}
 */
export function resourceOverrideLabel(resources, defaults = GAME) {
  if (!resources || typeof resources !== "object") return null;
  const parts = [];
  if (
    resources.apMax != null &&
    Number.isFinite(resources.apMax) &&
    resources.apMax !== (defaults.apMax ?? 3)
  ) {
    parts.push(`AP ${resources.apMax}`);
  }
  if (
    resources.startingBudget != null &&
    Number.isFinite(resources.startingBudget) &&
    resources.startingBudget !== (defaults.startingBudget ?? 5)
  ) {
    parts.push(`Budget ${resources.startingBudget}`);
  }
  if (
    resources.startingWill != null &&
    Number.isFinite(resources.startingWill) &&
    resources.startingWill !== (defaults.startingWill ?? 3)
  ) {
    parts.push(`Will ${resources.startingWill}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/**
 * @param {string} key
 */
export function humanizeMeterKey(key) {
  const s = String(key || "").trim();
  if (!s) return "";
  if (/\s/.test(s)) return s;
  let spaced = s.replace(/[_-]+/g, " ");
  spaced = spaced.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  spaced = spaced.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseQuestTileJson(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, error: "not_object" };
  }
  return { ok: true, value: obj };
}

/**
 * Catalog container for a multi-lesson path. Not playable — no mission/pressure.
 * @param {object} tile
 * @param {{ techIds?: string[], globalIds?: string[] }} [opts]
 * @returns {{ ok: true, tile: object, mission: null, kind: "module" } | { ok: false, error: string, details?: string[] }}
 */
export function validateQuestModule(tile, opts = {}) {
  const details = [];
  if (!tile || typeof tile !== "object") {
    return { ok: false, error: "not_object" };
  }

  const schema = String(tile.schema || "");
  if (schema !== QUEST_TILE_SCHEMA) {
    return { ok: false, error: "bad_schema", details: [`expected ${QUEST_TILE_SCHEMA}`] };
  }

  const kind = String(tile.kind || "");
  if (kind !== "module") {
    return { ok: false, error: "bad_kind", details: [kind || "(empty)"] };
  }

  const techIds = new Set(opts.techIds || allTechIds());
  const globalIds = new Set(opts.globalIds || GLOBALS.map((g) => g.id));

  const id = slugId(tile.id || tile.title);
  if (!id) details.push("missing_id");

  const title = String(tile.title || "").trim();
  if (!title) details.push("missing_title");

  const summary = String(tile.summary || "").trim();
  if (!summary) details.push("missing_summary");
  if (summary.length > CAPS.summary) details.push("summary_too_long");

  const moduleRaw = tile.module != null ? String(tile.module).trim() : title;
  const moduleTitle = moduleRaw.slice(0, CAPS.moduleTitle);
  if (!moduleTitle) details.push("learning_module_not_nonempty_string");

  const globalId = String(tile.globalId || "").trim();
  if (!globalId || !globalIds.has(globalId)) {
    details.push(`bad_global_id:${globalId || "(empty)"}`);
  }

  /** @type {string[]} */
  const lessons = [];
  if (tile.lessons === undefined || tile.lessons === null) {
    details.push("lessons_not_array");
  } else if (!Array.isArray(tile.lessons)) {
    details.push("lessons_not_array");
  } else if (tile.lessons.length < 1) {
    details.push("lessons_empty");
  } else if (tile.lessons.length > CAPS.maxModuleLessons) {
    details.push("too_many_lessons");
  } else {
    const seen = new Set();
    for (let i = 0; i < tile.lessons.length; i++) {
      const lid = String(tile.lessons[i] || "").trim();
      if (!lid) {
        details.push(`lesson_${i}_empty_id`);
        continue;
      }
      const sliced = slugId(lid);
      if (!sliced) {
        details.push(`lesson_${i}_bad_id`);
        continue;
      }
      if (seen.has(sliced)) {
        details.push(`lesson_${i}_duplicate_id`);
        continue;
      }
      seen.add(sliced);
      lessons.push(sliced);
    }
    if (!lessons.length) details.push("lessons_empty");
  }

  let totalLessons = Number(tile.totalLessons);
  if (tile.totalLessons === undefined || tile.totalLessons === null) {
    totalLessons = lessons.length || 1;
  } else if (
    typeof tile.totalLessons !== "number" ||
    !Number.isFinite(tile.totalLessons) ||
    !Number.isInteger(tile.totalLessons) ||
    tile.totalLessons < 1
  ) {
    details.push("learning_totalLessons_not_positive_integer");
    totalLessons = lessons.length || 1;
  }

  /** @type {object|null} */
  let spotlight = null;
  const spotlightIn = tile.spotlight;
  if (spotlightIn !== undefined && spotlightIn !== null) {
    if (typeof spotlightIn !== "object" || Array.isArray(spotlightIn)) {
      details.push("missing_spotlight");
    } else {
      const techId = String(spotlightIn.techId || "").trim();
      if (!techId || !techIds.has(techId)) {
        details.push(`bad_spotlight_tech:${techId || "(empty)"}`);
      } else {
        spotlight = {
          techId,
          advanceTitle: String(spotlightIn.advanceTitle || "").slice(0, CAPS.advanceTitle),
          advanceSummary: String(spotlightIn.advanceSummary || "").slice(
            0,
            CAPS.advanceSummary
          ),
          asOf: String(spotlightIn.asOf || "").slice(0, 32),
          encourageCopy: String(spotlightIn.encourageCopy || "").slice(
            0,
            CAPS.encourageCopy
          ),
        };
      }
    }
  }

  let overviewMd = "";
  if (tile.overviewMd !== undefined && tile.overviewMd !== null) {
    if (typeof tile.overviewMd !== "string") {
      details.push("overviewMd_not_string");
    } else {
      overviewMd = tile.overviewMd.trim();
      if (overviewMd.length > CAPS.overviewMd) details.push("overviewMd_too_long");
      if (/<script/i.test(overviewMd) || /javascript\s*:/i.test(overviewMd)) {
        details.push("overviewMd_unsafe");
      }
    }
  }

  let coverImageUrl = "";
  if (tile.coverImageUrl !== undefined && tile.coverImageUrl !== null) {
    if (typeof tile.coverImageUrl !== "string") {
      details.push("coverImageUrl_not_string");
    } else {
      const url = tile.coverImageUrl.trim();
      if (url && !isSafeBriefImageUrl(url)) {
        details.push("coverImageUrl_unsafe");
      } else {
        coverImageUrl = url;
      }
    }
  }

  let sponsorName = null;
  let sponsorBanner = null;
  if (tile.sponsorName !== undefined) {
    if (typeof tile.sponsorName !== "string") {
      details.push("sponsorName_not_string");
    } else {
      const s = tile.sponsorName.trim();
      if (s) sponsorName = s.slice(0, CAPS.sponsorName);
    }
  }
  if (tile.sponsorBanner !== undefined) {
    if (typeof tile.sponsorBanner !== "string") {
      details.push("sponsorBanner_not_string");
    } else {
      const s = tile.sponsorBanner.trim();
      if (s) sponsorBanner = s.slice(0, CAPS.sponsorBanner);
    }
  }

  const accessParsed = parseAccessField(tile, {}, { isLearningModule: true });
  if (!accessParsed.ok) details.push(...accessParsed.details);

  if (details.length) {
    return { ok: false, error: "validation_failed", details };
  }

  const placementMode = String(tile.placement?.mode || "replace-daily");
  const placement = {
    mode: PLACEMENT_MODES.has(placementMode) ? placementMode : "replace-daily",
    activeFrom: tile.placement?.activeFrom ?? null,
    activeTo: tile.placement?.activeTo ?? null,
    priority: Number(tile.placement?.priority) || 0,
  };

  /** @type {Record<string, unknown>} */
  const normalized = {
    schema: QUEST_TILE_SCHEMA,
    kind: "module",
    id,
    version: Number(tile.version) || 1,
    title: title.slice(0, CAPS.title),
    summary: summary.slice(0, CAPS.summary),
    module: moduleTitle,
    globalId,
    lessons,
    totalLessons,
    placement,
    author: tile.author && typeof tile.author === "object" ? tile.author : null,
    createdAt: String(tile.createdAt || new Date().toISOString()),
    tags: Array.isArray(tile.tags) ? tile.tags.map(String).slice(0, 20) : [],
    license: String(tile.license || "").slice(0, 80),
  };
  if (spotlight) normalized.spotlight = spotlight;
  if (overviewMd) normalized.overviewMd = overviewMd.slice(0, CAPS.overviewMd);
  if (coverImageUrl) normalized.coverImageUrl = coverImageUrl;
  if (sponsorName) normalized.sponsorName = sponsorName;
  if (sponsorBanner) normalized.sponsorBanner = sponsorBanner;
  if (accessParsed.ok) normalized.access = accessParsed.value;

  return { ok: true, tile: normalized, mission: null, kind: "module" };
}

/**
 * Validate a quest tile or a module wrapper.
 * @param {object} tile
 * @param {{ techIds?: string[], globalIds?: string[] }} [opts]
 */
export function validateQuestDocument(tile, opts = {}) {
  const kind = String(tile?.kind || "quest");
  if (kind === "module") return validateQuestModule(tile, opts);
  return validateQuestTile(tile, opts);
}

/**
 * Catalog API/list record from a successful validateQuestDocument result.
 * @param {{ ok: true, tile: object, mission?: object|null }} v
 * @param {Record<string, unknown>} [extra]
 */
export function catalogRecordFromValidated(v, extra = {}) {
  if (!v?.ok || !v.tile) return null;
  const extraSource = extra.source != null ? String(extra.source) : "";
  if (v.tile.kind === "module" || v.kind === "module") {
    const t = v.tile;
    return {
      id: t.id,
      kind: "module",
      title: t.title,
      summary: t.summary || "",
      globalId: t.globalId,
      place: "",
      spotlightTechId: t.spotlight?.techId || null,
      placement: t.placement || { mode: "replace-daily" },
      mission: null,
      tile: t,
      lessons: Array.isArray(t.lessons) ? t.lessons : [],
      module: t.module,
      totalLessons: t.totalLessons,
      overviewMd: t.overviewMd || "",
      coverImageUrl: t.coverImageUrl || "",
      sponsorName: t.sponsorName || "",
      sponsorBanner: t.sponsorBanner || "",
      isLearningModule: true,
      access: t.access,
      ...extra,
    };
  }
  const mission = extraSource
    ? { ...v.mission, source: extraSource }
    : { ...v.mission };
  return {
    id: mission.id,
    kind: "quest",
    title: mission.title,
    summary: v.tile.summary || "",
    globalId: mission.globalId,
    place: mission.place,
    spotlightTechId: mission.spotlight?.techId || null,
    placement: v.tile.placement || { mode: "replace-daily" },
    mission,
    tile: { ...v.tile, mission },
    ...extra,
  };
}

/**
 * @param {object} tile
 * @param {{ techIds?: string[], globalIds?: string[] }} [opts]
 * @returns {{ ok: true, tile: object, mission: object } | { ok: false, error: string, details?: string[] }}
 */
export function validateQuestTile(tile, opts = {}) {
  const details = [];
  if (!tile || typeof tile !== "object") {
    return { ok: false, error: "not_object" };
  }

  const schema = String(tile.schema || "");
  if (schema !== QUEST_TILE_SCHEMA) {
    return { ok: false, error: "bad_schema", details: [`expected ${QUEST_TILE_SCHEMA}`] };
  }

  const kind = String(tile.kind || "quest");
  if (kind === "quest-pack") {
    return { ok: false, error: "packs_not_supported" };
  }
  if (kind !== "quest") {
    return { ok: false, error: "bad_kind", details: [kind] };
  }

  const techIds = new Set(opts.techIds || allTechIds());
  const globalIds = new Set(
    opts.globalIds || GLOBALS.map((g) => g.id)
  );

  const globalId = String(tile.globalId || tile.mission?.globalId || "").trim();
  if (!globalId || !globalIds.has(globalId)) {
    return { ok: false, error: "bad_global_id", details: [globalId || "(empty)"] };
  }

  const missionIn = tile.mission;
  if (!missionIn || typeof missionIn !== "object") {
    return { ok: false, error: "missing_mission" };
  }

  const title = String(tile.title || missionIn.title || "").trim();
  const place = String(missionIn.place || "").trim();
  if (!title) details.push("missing_title");
  if (!place) details.push("missing_place");

  const scene = String(missionIn.scene || "").trim();
  const briefMd = String(missionIn.briefMd || tile.briefMd || "").trim();
  if (!briefMd) details.push("missing_brief_md");
  if (briefMd.length > CAPS.briefMd) details.push("brief_md_too_long");
  if (/<script/i.test(briefMd) || /javascript\s*:/i.test(briefMd)) {
    details.push("brief_md_unsafe");
  }
  if (scene.length > CAPS.scene) details.push("scene_too_long");

  const spotlightIn = tile.spotlight || missionIn.spotlight;
  if (!spotlightIn || typeof spotlightIn !== "object") {
    details.push("missing_spotlight");
  }

  const techId = String(spotlightIn?.techId || "").trim();
  if (!techId || !techIds.has(techId)) {
    details.push(`bad_spotlight_tech:${techId || "(empty)"}`);
  }

  let suggested = (Array.isArray(missionIn.suggested) ? missionIn.suggested : [])
    .map(String)
    .filter((id) => techIds.has(id));
  if (techId && techIds.has(techId)) {
    if (suggested.length === 0) suggested = [techId];
    if (suggested.length !== 1 || suggested[0] !== techId) {
      details.push("suggested_must_be_spotlight_only");
    }
  }

  const resourcesRaw =
    tile.resources !== undefined && tile.resources !== null
      ? tile.resources
      : missionIn.resources;
  const resourcesParsed = parseResourceOverrides(resourcesRaw);
  if (!resourcesParsed.ok) {
    details.push(...resourcesParsed.details);
  }

  const groundingRaw =
    tile.grounding !== undefined && tile.grounding !== null
      ? tile.grounding
      : missionIn.grounding;
  let grounding = null;
  if (groundingRaw !== undefined && groundingRaw !== null) {
    if (typeof groundingRaw !== "string") {
      details.push("grounding_not_string");
    } else {
      const g = groundingRaw.trim();
      if (g) {
        grounding = g.slice(0, CAPS.grounding);
      }
    }
  }

  const learningParsed = parseLearningModuleFields(tile, missionIn);
  if (!learningParsed.ok) {
    details.push(...learningParsed.details);
  }
  const accessParsed = parseAccessField(tile, missionIn, {
    isLearningModule: Boolean(learningParsed.ok && learningParsed.value.isLearningModule),
  });
  if (!accessParsed.ok) {
    details.push(...accessParsed.details);
  }

  const trendsParsed = parseQuestTrendFields(tile, missionIn, {
    techIds: [...techIds],
  });
  if (!trendsParsed.ok) {
    details.push(...trendsParsed.details);
  }

  const briefBeatsRaw = pickTileOrMissionField(tile, missionIn, "briefBeats");
  let briefBeats = null;
  if (briefBeatsRaw !== undefined && briefBeatsRaw !== null) {
    const beatsParsed = normalizeBriefBeats(briefBeatsRaw);
    if (!beatsParsed.ok) {
      details.push(...(beatsParsed.details || ["briefBeats_invalid"]));
    } else {
      briefBeats = beatsParsed.beats;
    }
  }

  /** @type {string|null} */
  let sponsorName = null;
  /** @type {string|null} */
  let sponsorBanner = null;
  const sponsorNameRaw = pickTileOrMissionField(tile, missionIn, "sponsorName");
  if (sponsorNameRaw !== undefined) {
    if (typeof sponsorNameRaw !== "string") {
      details.push("sponsorName_not_string");
    } else {
      const s = sponsorNameRaw.trim();
      if (s) sponsorName = s.slice(0, CAPS.sponsorName);
    }
  }
  const sponsorBannerRaw = pickTileOrMissionField(tile, missionIn, "sponsorBanner");
  if (sponsorBannerRaw !== undefined) {
    if (typeof sponsorBannerRaw !== "string") {
      details.push("sponsorBanner_not_string");
    } else {
      const s = sponsorBannerRaw.trim();
      if (s) sponsorBanner = s.slice(0, CAPS.sponsorBanner);
    }
  }

  // Breaking: quest tiles must use structured pressure (local|global|support entries).
  // Legacy flat maps are no longer accepted on imported/hosted tiles.
  if (!isStructuredPressure(missionIn.pressure)) {
    details.push("pressure_must_be_structured");
  }
  const metersParsed = normalizeMissionPressure(
    missionIn.pressure,
    missionIn.pressureRise,
    missionIn.winMax
  );
  if (!metersParsed.ok) {
    details.push(...metersParsed.details);
  }

  if (details.length) {
    return { ok: false, error: "validation_failed", details };
  }

  const { pressure, pressureRise, winMax, crisisRoles, pressureDesc } =
    metersParsed;

  const id =
    slugId(tile.id || missionIn.id || title) ||
    `imp-${globalId}-${Date.now().toString(36)}`;

  const placementMode = String(tile.placement?.mode || "replace-daily");
  const placement = {
    mode: PLACEMENT_MODES.has(placementMode) ? placementMode : "replace-daily",
    activeFrom: tile.placement?.activeFrom ?? null,
    activeTo: tile.placement?.activeTo ?? null,
    priority: Number(tile.placement?.priority) || 0,
  };

  const spotlight = {
    techId,
    advanceTitle: String(spotlightIn.advanceTitle || "").slice(0, CAPS.advanceTitle),
    advanceSummary: String(spotlightIn.advanceSummary || "").slice(0, CAPS.advanceSummary),
    asOf: String(spotlightIn.asOf || "").slice(0, 32),
    encourageCopy: String(
      spotlightIn.encourageCopy ||
        `Build your invention around this Quest's spotlight technology.`
    ).slice(0, CAPS.encourageCopy),
  };

  const research = sanitizeResearch(tile.research);

  const mission = {
    id,
    globalId,
    title: title.slice(0, CAPS.title),
    place: place.slice(0, CAPS.place),
    startYear: Number(missionIn.startYear) || GAME.startYear || 2026,
    collapseYear: Number(missionIn.collapseYear) || (GAME.startYear || 2026) + 8,
    yearsPerTurn: Number(missionIn.yearsPerTurn) || GAME.yearsPerTurn || 2,
    pressure,
    pressureRise,
    winMax,
    pressureDesc: pressureDesc || {},
    scene: (scene || plainLedeFromBrief(briefMd)).slice(0, CAPS.scene),
    briefMd: briefMd.slice(0, CAPS.briefMd),
    stakeholder: String(missionIn.stakeholder || "").slice(0, CAPS.stakeholder),
    suggested: [techId],
    visionTheme: String(missionIn.visionTheme || "rebuild-city").slice(0, 40),
    source: "imported",
    spotlight,
  };
  if (resourcesParsed.value) {
    mission.resources = resourcesParsed.value;
  }
  if (crisisRoles?.length) {
    mission.crisisRoles = crisisRoles;
  }
  if (grounding) {
    mission.grounding = grounding;
  }
  const learning = learningParsed.ok ? learningParsed.value : {};
  if (learning.isLearningModule) mission.isLearningModule = true;
  if (learning.aiTutorContext) mission.aiTutorContext = learning.aiTutorContext;
  if (learning.module != null) mission.module = learning.module;
  if (learning.lesson != null) mission.lesson = learning.lesson;
  if (learning.totalLessons != null) mission.totalLessons = learning.totalLessons;
  if (sponsorName) mission.sponsorName = sponsorName;
  if (sponsorBanner) mission.sponsorBanner = sponsorBanner;
  if (accessParsed.ok) mission.access = accessParsed.value;
  const trendFields = trendsParsed.ok ? trendsParsed.value : {};
  if (trendFields.trends?.length) mission.trends = trendFields.trends;
  if (trendFields.spotlightTrends?.length) {
    mission.spotlightTrends = trendFields.spotlightTrends;
  }
  const summary = String(tile.summary || missionIn.summary || "")
    .trim()
    .slice(0, CAPS.summary);
  if (summary) mission.summary = summary;
  if (briefBeats?.length) {
    mission.briefBeats = briefBeats;
  }

  const normalizedTile = {
    schema: QUEST_TILE_SCHEMA,
    kind: "quest",
    id,
    version: Number(tile.version) || 1,
    title: mission.title,
    summary: String(tile.summary || "").slice(0, CAPS.summary),
    author: tile.author && typeof tile.author === "object" ? tile.author : null,
    createdAt: String(tile.createdAt || new Date().toISOString()),
    tags: Array.isArray(tile.tags) ? tile.tags.map(String).slice(0, 20) : [],
    license: String(tile.license || "").slice(0, 80),
    placement,
    spotlight,
    research,
    globalId,
    mission,
  };
  if (grounding) {
    normalizedTile.grounding = grounding;
  }
  if (learning.isLearningModule) normalizedTile.isLearningModule = true;
  if (learning.aiTutorContext) normalizedTile.aiTutorContext = learning.aiTutorContext;
  if (learning.module != null) normalizedTile.module = learning.module;
  if (learning.lesson != null) normalizedTile.lesson = learning.lesson;
  if (learning.totalLessons != null) normalizedTile.totalLessons = learning.totalLessons;
  if (sponsorName) normalizedTile.sponsorName = sponsorName;
  if (sponsorBanner) normalizedTile.sponsorBanner = sponsorBanner;
  if (accessParsed.ok) normalizedTile.access = accessParsed.value;
  if (trendFields.trends?.length) normalizedTile.trends = trendFields.trends;
  if (trendFields.spotlightTrends?.length) {
    normalizedTile.spotlightTrends = trendFields.spotlightTrends;
  }
  if (briefBeats?.length) {
    normalizedTile.briefBeats = briefBeats;
  }

  return { ok: true, tile: normalizedTile, mission, kind: "quest" };
}

/**
 * @param {object} tile
 * @param {{ techIds?: string[], globalIds?: string[] }} [opts]
 */
export function tileToMission(tile, opts = {}) {
  const r = validateQuestTile(tile, opts);
  if (!r.ok) return r;
  return { ok: true, mission: r.mission, tile: r.tile };
}

export function slugId(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalizePressure(raw) {
  const pressure = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw).slice(0, 4)) {
      const label = humanizeMeterKey(k) || String(k).slice(0, CAPS.meterKey);
      if (!label || pressure[label] != null) continue;
      pressure[label] = Math.min(5, Math.max(0, Math.round(Number(v) || 2)));
    }
  }
  if (!Object.keys(pressure).length) {
    return { Pressure: 2, Capacity: 2, Trust: 1 };
  }
  return pressure;
}

function normalizeMeterMap(raw, keys, defaultFn) {
  const src =
    raw && typeof raw === "object"
      ? Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [humanizeMeterKey(k) || k, v])
        )
      : {};
  return Object.fromEntries(
    keys.map((k, i) => {
      const n = Number(src[k]);
      const d = defaultFn(i);
      if (Number.isFinite(n)) return [k, Math.min(3, Math.max(0, Math.round(n)))];
      return [k, d];
    })
  );
}

function sanitizeResearch(raw) {
  if (!raw || typeof raw !== "object") {
    return { topic: "", bullets: [], sources: [], showToPlayer: false };
  }
  const json = JSON.stringify(raw);
  if (json.length > CAPS.researchTotal) {
    return {
      topic: String(raw.topic || "").slice(0, 200),
      bullets: [],
      sources: [],
      showToPlayer: Boolean(raw.showToPlayer),
    };
  }
  const sources = (Array.isArray(raw.sources) ? raw.sources : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      title: String(s.title || "").slice(0, 200),
      url: /^https?:\/\//i.test(String(s.url || "")) ? String(s.url).slice(0, 500) : "",
      accessed: String(s.accessed || "").slice(0, 32),
    }))
    .filter((s) => s.title || s.url)
    .slice(0, 20);
  return {
    topic: String(raw.topic || "").slice(0, 300),
    bullets: (Array.isArray(raw.bullets) ? raw.bullets : [])
      .map(String)
      .slice(0, 20)
      .map((b) => b.slice(0, 400)),
    sources,
    showToPlayer: Boolean(raw.showToPlayer),
  };
}

function plainLedeFromBrief(md) {
  return String(md || "")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CAPS.scene);
}
