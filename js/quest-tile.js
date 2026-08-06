/**
 * Quest tile schema: parse, validate, normalize to runtime mission.
 * Spotlight tiles teach one emTech advance via a fictive local Quest.
 */

import { GAME, GLOBALS, allTechIds } from "./data.js";

export const QUEST_TILE_SCHEMA = "future-forge.quest-tile/v1";

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
};

const PLACEMENT_MODES = new Set(["replace-daily", "alongside", "library-only"]);

/** Known starting-resource override keys (match GAME / startMission). */
export const RESOURCE_OVERRIDE_KEYS = ["apMax", "startingBudget", "startingWill"];

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

  if (details.length) {
    return { ok: false, error: "validation_failed", details };
  }

  const pressure = normalizePressure(missionIn.pressure);
  const keys = Object.keys(pressure);
  const pressureRise = normalizeMeterMap(missionIn.pressureRise, keys, (i) =>
    i === keys.length - 1 ? 0 : 1
  );
  const winMax = normalizeMeterMap(missionIn.winMax, keys, () => 1);

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

  return { ok: true, tile: normalizedTile, mission };
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

function slugId(s) {
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
