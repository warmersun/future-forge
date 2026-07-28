/**
 * Localized catalog resolvers — EN modules stay structural source of truth;
 * locale packs under locales/{code}/*.json override player-facing strings by id.
 */

import {
  DOMAINS,
  GLOBALS,
  TECHS,
  CHALLENGE_ANGLES,
  VISION_STAGES,
  YEAR_NEWS,
  FORESIGHT,
  THEME_SHELVES,
  MISSIONS,
  techById as rawTechById,
  globalById as rawGlobalById,
} from "../data.js";
import { tc, getLocale, DEFAULT_LOCALE, contentLookup } from "../i18n.js";

/** Content pack files loaded for non-en locales (see initI18n). */
export const CONTENT_PACK_FILES = [
  "domains.json",
  "shelves.json",
  "globals.json",
  "techs.json",
  "challenge-angles.json",
  "vision-stages.json",
  "year-news.json",
  "foresight.json",
  "missions.json",
  "problem-briefs.json",
  "scenario-seeds.json",
  "market-news.json",
];

/**
 * @param {string} domainId
 * @returns {string}
 */
export function domainLabel(domainId) {
  const d = DOMAINS[domainId];
  const en = d?.label || domainId;
  return tc(`domains.${domainId}.label`, en);
}

/**
 * @param {string} domainId
 */
export function locDomain(domainId) {
  const d = DOMAINS[domainId];
  if (!d) return { label: domainId, color: "#94a3b8" };
  return { ...d, label: domainLabel(domainId) };
}

/**
 * @param {{ id: string, title?: string }} shelf
 */
export function locShelf(shelf) {
  if (!shelf) return shelf;
  return {
    ...shelf,
    title: tc(`shelves.${shelf.id}.title`, shelf.title || shelf.id),
  };
}

/**
 * @param {object|null|undefined} g
 */
export function locGlobal(g) {
  if (!g || !g.id) return g;
  return {
    ...g,
    title: tc(`globals.${g.id}.title`, g.title || g.id),
    blurb: tc(`globals.${g.id}.blurb`, g.blurb || ""),
  };
}

/**
 * @param {string} id
 */
export function locGlobalById(id) {
  return locGlobal(rawGlobalById(id));
}

/**
 * @param {object|null|undefined} t
 */
export function locTech(t) {
  if (!t || !t.id) return t;
  const id = t.id;
  const maturityEn = t.maturity || {};
  const maturity = {
    now: tc(`techs.${id}.maturity.now`, maturityEn.now || ""),
    near: tc(`techs.${id}.maturity.near`, maturityEn.near || ""),
    frontier: tc(`techs.${id}.maturity.frontier`, maturityEn.frontier || ""),
  };
  const milestonesEn = Array.isArray(t.milestones) ? t.milestones : [];
  const useEn = Array.isArray(t.useCasesNow) ? t.useCasesNow : [];
  const milestones = milestonesEn.map((m, i) =>
    tc(`techs.${id}.milestones.${i}`, m)
  );
  const useCasesNow = useEn.map((m, i) => tc(`techs.${id}.useCasesNow.${i}`, m));
  const vision = t.vision
    ? {
        ...t.vision,
        narrative: tc(
          `techs.${id}.narrative`,
          t.vision.narrative || ""
        ),
      }
    : t.vision;
  return {
    ...t,
    name: tc(`techs.${id}.name`, t.name || id),
    summary: tc(`techs.${id}.summary`, t.summary || ""),
    learn: tc(`techs.${id}.learn`, t.learn || ""),
    inventionHint: tc(`techs.${id}.inventionHint`, t.inventionHint || ""),
    risk: tc(`techs.${id}.risk`, t.risk || ""),
    scarcity: tc(`techs.${id}.scarcity`, t.scarcity || ""),
    primer: tc(`techs.${id}.primer`, t.primer || ""),
    maturity,
    milestones,
    useCasesNow,
    vision,
  };
}

/**
 * @param {string} id
 */
export function locTechById(id) {
  return locTech(rawTechById(id));
}

/**
 * @param {object|null|undefined} a
 */
export function locChallengeAngle(a) {
  if (!a || !a.id) return a;
  return {
    ...a,
    label: tc(`challenge-angles.${a.id}.label`, a.label || a.id),
    subtitle: tc(`challenge-angles.${a.id}.subtitle`, a.subtitle || ""),
    blurb: tc(`challenge-angles.${a.id}.blurb`, a.blurb || ""),
  };
}

/**
 * @param {object|null|undefined} s
 */
export function locVisionStage(s) {
  if (!s || !s.id) return s;
  return {
    ...s,
    name: tc(`vision-stages.${s.id}.name`, s.name || s.id),
    blurb: tc(`vision-stages.${s.id}.blurb`, s.blurb || ""),
  };
}

/**
 * @param {object} n year news row
 * @param {number} index
 */
export function locYearNews(n, index = 0) {
  if (!n) return n;
  return {
    ...n,
    text: tc(`year-news.${index}.text`, n.text || ""),
  };
}

/**
 * @param {object} f foresight row
 * @param {number} index
 */
export function locForesight(f, index = 0) {
  if (!f) return f;
  return {
    ...f,
    text: tc(`foresight.${index}.text`, f.text || ""),
  };
}

/**
 * Baked MISSIONS in data.js (tutorial / showcase).
 * @param {object|null|undefined} m
 */
export function locMission(m) {
  if (!m || !m.id) return m;
  const pressure = m.pressure;
  let pressureOut = pressure;
  if (pressure && typeof pressure === "object") {
    pressureOut = {};
    for (const [k, v] of Object.entries(pressure)) {
      const nk = tc(`missions.${m.id}.pressure.${k}`, k);
      pressureOut[nk] = v;
    }
  }
  return {
    ...m,
    title: tc(`missions.${m.id}.title`, m.title || m.id),
    place: tc(`missions.${m.id}.place`, m.place || ""),
    scene: tc(`missions.${m.id}.scene`, m.scene || ""),
    stakeholder: tc(`missions.${m.id}.stakeholder`, m.stakeholder || ""),
    pressure: pressureOut,
  };
}

/**
 * Problem brief for mission screen (while Quests draft).
 * @param {{ currentState?: string, rootCauses?: string, warnings?: string }|null} brief
 * @param {string} globalId
 */
export function locProblemBrief(brief, globalId) {
  if (!brief || !globalId) return brief;
  return {
    currentState: tc(
      `problem-briefs.${globalId}.currentState`,
      brief.currentState || ""
    ),
    rootCauses: tc(
      `problem-briefs.${globalId}.rootCauses`,
      brief.rootCauses || ""
    ),
    warnings: tc(`problem-briefs.${globalId}.warnings`, brief.warnings || ""),
  };
}

/**
 * Localize a mission/scenario built from angle packs (or any mission with seedId).
 * Pressure keys are remapped when the seed overlay provides pressureKeys.
 * @param {object|null|undefined} m
 */
export function locScenario(m) {
  if (!m) return m;
  // Baked MISSIONS (tutorial) use missions.* pack
  if (m.id && !String(m.id).startsWith("gen-") && contentHasMission(m.id)) {
    return locMission(m);
  }
  const seedId = m.seedId || m.id;
  if (!seedId) return m;

  const title = tc(`scenario-seeds.${seedId}.title`, m.title || "");
  const scene = tc(`scenario-seeds.${seedId}.scene`, m.scene || "");
  const stakeholder = tc(
    `scenario-seeds.${seedId}.stakeholder`,
    m.stakeholder || ""
  );
  const placePack = contentLookup(`scenario-seeds.${seedId}.place`);
  const place =
    typeof placePack === "string" && placePack.trim()
      ? placePack.trim()
      : m.place;

  // pressureKeys array in pack → remap pressure object keys in order
  const keysOverlay = contentLookup(`scenario-seeds.${seedId}.pressureKeys`);
  let pressure = m.pressure;
  let pressureRise = m.pressureRise;
  let winMax = m.winMax;
  if (Array.isArray(keysOverlay) && keysOverlay.length && m.pressure) {
    const oldKeys = Object.keys(m.pressure);
    pressure = {};
    pressureRise = {};
    winMax = {};
    oldKeys.forEach((ok, i) => {
      const nk = keysOverlay[i] || ok;
      pressure[nk] = m.pressure[ok];
      if (m.pressureRise) pressureRise[nk] = m.pressureRise[ok] ?? 1;
      if (m.winMax) winMax[nk] = m.winMax[ok] ?? 1;
    });
  }

  return {
    ...m,
    title,
    scene,
    stakeholder,
    place: place || m.place,
    pressure,
    pressureRise: pressureRise || m.pressureRise,
    winMax: winMax || m.winMax,
  };
}

function contentHasMission(id) {
  const t = contentLookup(`missions.${id}.title`);
  return typeof t === "string" && t.length > 0;
}

/** Localized copies of static arrays (new arrays each call — safe for map/filter). */
export function localizedGlobals() {
  return GLOBALS.map(locGlobal);
}

export function localizedTechs() {
  return TECHS.map(locTech);
}

export function localizedShelves() {
  return THEME_SHELVES.map(locShelf);
}

export function localizedChallengeAngles() {
  return CHALLENGE_ANGLES.map(locChallengeAngle);
}

export function localizedVisionStages() {
  return VISION_STAGES.map(locVisionStage);
}

export function localizedYearNews() {
  return YEAR_NEWS.map((n, i) => locYearNews(n, i));
}

/**
 * Resolve foresight pick texts (milestone/trend/prediction objects).
 * @param {{ year?: number, milestone?: object, trend?: object, prediction?: object }} pack
 */
export function locForesightPack(pack) {
  if (!pack) return pack;
  const findIndex = (row) => {
    if (!row) return -1;
    return FORESIGHT.findIndex(
      (f) => f === row || (f.kind === row.kind && f.text === row.text)
    );
  };
  return {
    ...pack,
    milestone: pack.milestone
      ? locForesight(pack.milestone, Math.max(0, findIndex(pack.milestone)))
      : pack.milestone,
    trend: pack.trend
      ? locForesight(pack.trend, Math.max(0, findIndex(pack.trend)))
      : pack.trend,
    prediction: pack.prediction
      ? locForesight(pack.prediction, Math.max(0, findIndex(pack.prediction)))
      : pack.prediction,
  };
}

export function isContentLocaleActive() {
  return getLocale() !== DEFAULT_LOCALE;
}

/**
 * Market news event with localized headline/body when packs loaded.
 * @param {object|null|undefined} event
 */
export function locMarketEvent(event) {
  if (!event || !event.id) return event;
  const id = event.id;
  return {
    ...event,
    headline: tc(`market-news.${id}.headline`, event.headline || ""),
    body: tc(`market-news.${id}.body`, event.body || ""),
  };
}

/**
 * Apply optional quest tile i18n block for active locale.
 * @param {object} tile — normalized or raw quest tile
 * @param {string} [locale]
 */
export function applyQuestLocale(tile, locale = getLocale()) {
  if (!tile || typeof tile !== "object") return tile;
  const loc = String(locale || "").toLowerCase().split("-")[0];
  if (!loc || loc === "en") return tile;
  const pack = tile.i18n && typeof tile.i18n === "object" ? tile.i18n[loc] : null;
  if (!pack || typeof pack !== "object") return tile;

  const mission = tile.mission ? { ...tile.mission } : null;
  if (mission) {
    if (pack.title) mission.title = String(pack.title);
    if (pack.place) mission.place = String(pack.place);
    if (pack.scene) mission.scene = String(pack.scene);
    if (pack.briefMd) mission.briefMd = String(pack.briefMd);
    if (pack.stakeholder) mission.stakeholder = String(pack.stakeholder);
    if (pack.spotlight && mission.spotlight) {
      mission.spotlight = {
        ...mission.spotlight,
        ...Object.fromEntries(
          Object.entries(pack.spotlight).map(([k, v]) => [k, String(v)])
        ),
      };
    }
  }
  return {
    ...tile,
    title: pack.title ? String(pack.title) : tile.title,
    summary: pack.summary != null ? String(pack.summary) : tile.summary,
    mission: mission || tile.mission,
    spotlight: pack.spotlight
      ? { ...(tile.spotlight || {}), ...pack.spotlight }
      : tile.spotlight,
  };
}
