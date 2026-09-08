/**
 * Quest resource-economy lab (DOM-free).
 * Closed-form tile/AP/clock math plus a scripted applyAction path.
 * Market news and frontier-risk ticks are stripped so authoring is deterministic.
 */

import { GAME, TECHS, techById } from "../data.js";
import {
  CRISIS_ROLES,
  isStructuredPressure,
  normalizeMissionPressure,
  parseResourceOverrides,
} from "../quest-tile.js";
import { polarityForTech } from "../hex/polarity.js";
import { clampCrisisDelta } from "../hex/crisis-delta.js";
import { crisisMeterLevel, isCollapsed, isWin } from "./collapse.js";
import { clonePressure, maxPressure, applyPressureRiseYears } from "./pressure.js";
import { techCost } from "./economy.js";
import { applyAction } from "./actions.js";
import { createSimState } from "./state.js";
import { isAiSeasonTaxMode } from "./ai-tax.js";

export const ARCHETYPES = [
  {
    id: "solo-no-ai",
    mode: "solo",
    ai: false,
    label: "Solo, no AI",
    blurb: "Hand-pick techs and write How it works. Typical pathway yield.",
  },
  {
    id: "solo-ai",
    mode: "solo",
    ai: true,
    label: "Solo, AI every step",
    blurb: "Asks AI at every step. First ask of a turn is 1 AP; more thinking that turn is free. Strong yield.",
  },
  {
    id: "friends-no-ai",
    mode: "friends",
    ai: false,
    seats: 3,
    label: "Friends, no AI",
    blurb: "Personal wallet. Wait does not raise shared meters. Calendar ticks on table wrap.",
  },
  {
    id: "friends-ai",
    mode: "friends",
    ai: true,
    seats: 3,
    label: "Friends, AI every step",
    blurb: "Same Friends rules, plus AI at every invent and challenge step (season tax, not per message).",
  },
];

/** Per-role yield for one reaching pathway. Negative eases the meter. */
export const YIELD_BANDS = {
  weak: { local: -1, global: 0, support: 0 },
  typical: { local: -1, global: 0, support: -1 },
  /** Strong still does not finish the global/root-cause meter on the first island. */
  strong: { local: -2, global: 0, support: -1 },
};

const VERDICT_RANK = {
  impossible: 0,
  too_hard: 1,
  challenging: 2,
  too_easy: 3,
};

const PATCH_BOUNDS = {
  apMax: { min: 2, max: 6 },
  startingBudget: { min: 0, max: GAME.maxBudget ?? 10 },
  startingWill: { min: 0, max: GAME.maxWill ?? 5 },
  pressure: { min: 0, max: 5 },
  pressureRise: { min: 0, max: 3 },
  winMax: { min: 0, max: 5 },
};

/**
 * @param {object} archetype
 */
export function yieldBandFor(archetype) {
  return archetype?.ai ? "strong" : "typical";
}

/**
 * @param {string} band
 * @param {string} role
 */
export function yieldForRole(band, role) {
  const row = YIELD_BANDS[band] || YIELD_BANDS.typical;
  return clampCrisisDelta(row[role] ?? 0);
}

/**
 * Flatten a quest tile, validated {tile,mission}, or runtime mission into knobs.
 * @param {object} input
 * @param {object} [overrides]
 */
export function extractKnobs(input, overrides = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("extractKnobs: expected an object");
  }
  const tile =
    input.tile && input.mission && input.tile.schema
      ? input.tile
      : input.schema
        ? input
        : null;
  const missionRaw =
    input.mission ||
    tile?.mission ||
    (input.pressure != null ? input : null);
  if (!missionRaw) {
    throw new Error("extractKnobs: no mission");
  }

  const parsed = normalizeMissionPressure(
    missionRaw.pressure,
    missionRaw.pressureRise,
    missionRaw.winMax
  );
  if (!parsed.ok) {
    throw new Error(`extractKnobs: bad pressure (${(parsed.details || []).join(", ")})`);
  }

  const meters = metersFromPressure(missionRaw.pressure, {
    ...parsed,
    crisisRoles:
      Array.isArray(missionRaw.crisisRoles) && missionRaw.crisisRoles.length
        ? missionRaw.crisisRoles.map(String)
        : parsed.crisisRoles,
  });
  const resRaw =
    overrides.resources ||
    tile?.resources ||
    missionRaw.resources ||
    {};
  const resParsed = parseResourceOverrides(resRaw);
  const res = resParsed.ok && resParsed.value ? resParsed.value : {};

  let apMax = res.apMax ?? GAME.apMax ?? 3;
  let budget = res.startingBudget ?? GAME.startingBudget ?? 5;
  let will = res.startingWill ?? GAME.startingWill ?? 3;
  let collapseYear =
    Number(missionRaw.collapseYear) || (GAME.startYear || 2026) + 8;
  let startYear = Number(missionRaw.startYear) || GAME.startYear || 2026;
  let yearsPerTurn = Number(missionRaw.yearsPerTurn) || GAME.yearsPerTurn || 2;

  if (overrides.apMax != null) apMax = Number(overrides.apMax);
  if (overrides.startingBudget != null) budget = Number(overrides.startingBudget);
  if (overrides.startingWill != null) will = Number(overrides.startingWill);
  if (overrides.collapseYear != null) collapseYear = Number(overrides.collapseYear);
  if (overrides.startYear != null) startYear = Number(overrides.startYear);
  if (overrides.yearsPerTurn != null) yearsPerTurn = Number(overrides.yearsPerTurn);

  if (overrides.pressure && typeof overrides.pressure === "object") {
    for (const m of meters) {
      const o = overrides.pressure[m.role] || overrides.pressure[m.key];
      if (!o || typeof o !== "object") continue;
      if (o.pressure != null) m.start = clampInt(o.pressure, 0, 5);
      if (o.pressureRise != null) m.rise = clampInt(o.pressureRise, 0, 3);
      if (o.winMax != null) m.winMax = clampInt(o.winMax, 0, 5);
    }
  }

  const pressure = {};
  const pressureRise = {};
  const winMax = {};
  for (const m of meters) {
    pressure[m.key] = m.start;
    pressureRise[m.key] = m.rise;
    winMax[m.key] = m.winMax;
  }

  const suggested = Array.isArray(missionRaw.suggested)
    ? missionRaw.suggested.map(String)
    : tile?.spotlight?.techId
      ? [String(tile.spotlight.techId)]
      : [];

  return {
    id: String(missionRaw.id || tile?.id || "quest"),
    title: String(missionRaw.title || tile?.title || ""),
    place: String(missionRaw.place || ""),
    startYear,
    collapseYear,
    yearsPerTurn,
    apMax: Math.max(0, Math.round(Number(apMax) || 0)),
    budget: Math.max(0, Math.round(Number(budget) || 0)),
    will: Math.max(0, Math.round(Number(will) || 0)),
    suggested,
    isLearningModule: Boolean(
      missionRaw.isLearningModule || tile?.isLearningModule
    ),
    meters,
    pressure,
    pressureRise,
    winMax,
    crisisRoles: meters.map((m) => m.role),
  };
}

function metersFromPressure(raw, parsed) {
  if (isStructuredPressure(raw)) {
    return CRISIS_ROLES.filter((role) => raw[role]).map((role) => {
      const entry = raw[role];
      const label =
        String(entry.label || "").trim() ||
        role.charAt(0).toUpperCase() + role.slice(1);
      const key = Object.keys(parsed.pressure).find(
        (k) => k.toLowerCase() === label.toLowerCase()
      ) || label;
      return {
        role,
        key,
        label: key,
        start: parsed.pressure[key] ?? 0,
        rise: parsed.pressureRise[key] ?? 1,
        winMax: parsed.winMax[key] ?? 1,
      };
    });
  }
  const keys = Object.keys(parsed.pressure);
  const roles = Array.isArray(parsed.crisisRoles) && parsed.crisisRoles.length
    ? parsed.crisisRoles
    : CRISIS_ROLES;
  return keys.map((key, i) => ({
    role: roles[i] || CRISIS_ROLES[i] || "local",
    key,
    label: key,
    start: parsed.pressure[key] ?? 0,
    rise: parsed.pressureRise[key] ?? 1,
    winMax: parsed.winMax[key] ?? 1,
  }));
}

function clampInt(n, lo, hi) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function worldsCompatible(a, b) {
  if (!a || !b) return true;
  if (a === "split" || b === "split") return true;
  return a === b;
}

/**
 * Choose n catalog techs: suggested first, then a dockable synergy pair.
 * @param {string[]} suggested
 * @param {number} n
 */
export function pickTechs(suggested, n) {
  const want = Math.max(1, Math.min(4, Math.round(Number(n) || 1)));
  const out = [];
  const seen = new Set();
  const add = (t) => {
    if (!t || seen.has(t.id)) return false;
    seen.add(t.id);
    out.push(t);
    return true;
  };
  for (const id of suggested || []) {
    if (out.length >= want) break;
    add(techById(id));
  }
  if (!out.length) add(techById("ai") || techById("iot"));
  const first = out[0];
  const world = polarityForTech(first?.id);
  const pairIds = first?.pairs || [];
  for (const id of pairIds) {
    if (out.length >= want) break;
    const t = techById(id);
    if (t && worldsCompatible(world, polarityForTech(t.id))) add(t);
  }
  if (out.length < want) {
    for (const t of TECHS) {
      if (out.length >= want) break;
      if (worldsCompatible(world, polarityForTech(t.id))) add(t);
    }
  }
  return out.slice(0, want);
}

function yieldForReaches(band, reaches) {
  const set = new Set(reaches || []);
  const y = { local: 0, global: 0, support: 0 };
  if (set.has("local")) y.local = yieldForRole(band, "local");
  if (set.has("support")) y.support = yieldForRole(band, "support");
  if (set.has("global")) {
    // A global-aimed island actually eases the root cause (typical −1, strong −2).
    y.global = band === "strong" ? -2 : -1;
  }
  return y;
}

/**
 * Two-act invent: local island this year, global island after the calendar ticks.
 * 1 meter, or local+support only → 1 pathway.
 * Local+global (with or without support) → 2 pathways, 1 tile each.
 *
 * @param {object} knobs
 * @param {object} archetype
 */
export function planPath(knobs, archetype) {
  const meters = knobs.meters || [];
  const band = yieldBandFor(archetype);
  const roles = meters.map((m) => m.role);
  const hasLocal = roles.includes("local");
  const hasGlobal = roles.includes("global");
  const hasSupport = roles.includes("support");
  const pathways = [];
  if (hasLocal && hasGlobal) {
    const localReaches = ["local", ...(hasSupport ? ["support"] : [])];
    pathways.push({
      id: "p1",
      tileCount: 1,
      reaches: localReaches,
      yield: yieldForReaches(band, localReaches),
    });
    pathways.push({
      id: "p2",
      tileCount: 1,
      reaches: ["global"],
      yield: yieldForReaches(band, ["global"]),
    });
  } else {
    pathways.push({
      id: "p1",
      tileCount: 1,
      reaches: [...roles],
      yield: yieldForReaches(band, roles),
    });
  }
  const tileCount = pathways.reduce((n, p) => n + p.tileCount, 0);
  const leftoverDebt = meters
    .filter((m) => {
      let v = m.start;
      for (const p of pathways) {
        if (p.reaches.includes(m.role)) v += p.yield[m.role] || 0;
      }
      return v > m.winMax;
    })
    .map((m) => m.role);
  return {
    count: tileCount,
    tileCount,
    pathwayCount: pathways.length,
    coverage: tileCount,
    leftoverDebt,
    band,
    canFullSolve: leftoverDebt.length === 0,
    twoAct: pathways.length > 1,
    pathways,
  };
}

/** @deprecated use planPath — kept as the tile-count slice of the same plan. */
export function planTiles(knobs, archetype) {
  return planPath(knobs, archetype);
}

/**
 * Heavy-AI Attention bill. First thinking row of the path is 1 AP; further thinking is free.
 * Judge/submit stays 1 AP. Tutor chat on learning modules is free and does not pay the tax.
 * @param {{ tileCount: number, pathwayCount: number, isLearningModule?: boolean, tileNames?: string[] }} opts
 */
export function heavyAiBill(opts = {}) {
  const tileCount = Math.max(0, Math.round(Number(opts.tileCount) || 0));
  const pathwayCount = Math.max(0, Math.round(Number(opts.pathwayCount) || 0));
  const tutor = Boolean(opts.isLearningModule);
  const names = Array.isArray(opts.tileNames) ? opts.tileNames : [];
  /** @type {{ step: string, mode: string, ap: number }[]} */
  const bill = [];
  let taxPaid = false;
  const push = (step, mode, ap = 1) => {
    let cost = ap;
    if (tutor && mode === "chat") cost = 0;
    else if (isAiSeasonTaxMode(mode)) {
      if (taxPaid) cost = 0;
      else {
        cost = 1;
        taxPaid = true;
      }
    }
    bill.push({ step, mode, ap: cost });
  };
  for (let i = 0; i < tileCount; i++) {
    const name = names[i] ? ` (${names[i]})` : "";
    push(`Which emTech?${name}`, "chat");
    push(`Ask for ideas${name}`, "idea-sparks");
    push(`Write How it works${name}`, "chat");
  }
  for (let i = 0; i < pathwayCount; i++) {
    push(`Pathway ${i + 1} essay`, "chat");
  }
  push("Coach the challenge", "coach-challenge");
  push("Draft the answer", "draft-challenge");
  push("Submit / judge", "judge-challenge");
  return bill;
}

function bindPathwaysToTechs(plan, techs) {
  let i = 0;
  const pathways = (plan.pathways || []).map((p, idx) => {
    const n = Math.max(1, p.tileCount || 1);
    const slice = techs.slice(i, i + n);
    i += slice.length;
    return {
      id: p.id || `p${idx + 1}`,
      tileCount: slice.length,
      reaches: [...(p.reaches || [])],
      yield: { ...p.yield },
      tiles: slice.map((t) => ({ id: t.id, name: t.name })),
    };
  });
  if (i < techs.length && pathways[0]) {
    for (const t of techs.slice(i)) {
      pathways[0].tiles.push({ id: t.id, name: t.name });
      pathways[0].tileCount = pathways[0].tiles.length;
    }
  }
  return {
    ...plan,
    pathways,
    tileCount: techs.length,
    pathwayCount: pathways.length,
    count: techs.length,
  };
}

/**
 * Closed-form clock facts (independent of the scripted path).
 * @param {object} knobs
 */
function waitsToThreshold(start, rise, threshold) {
  if (start >= threshold) return 0;
  if (!rise) return Infinity;
  return Math.ceil((threshold - start) / rise);
}

export function clockFacts(knobs) {
  const start = knobs.startYear;
  const fail = knobs.collapseYear;
  const step = knobs.yearsPerTurn || 2;
  const yearTicksSafe = Math.max(0, fail - start - 1);
  const maxEndTurns = yearTicksSafe;
  const maxWaits = Math.floor(yearTicksSafe / step);
  const meters = (knobs.meters || []).map((m) => ({
    key: m.key,
    label: m.label,
    role: m.role,
    waitsUntilRed: waitsToThreshold(m.start, m.rise, 4),
    waitsUntilCollapse: waitsToThreshold(m.start, m.rise, 5),
  }));
  const waitsUntilRed = meters.length
    ? Math.min(...meters.map((m) => m.waitsUntilRed))
    : Infinity;
  const waitsUntilCollapseMeter = meters.length
    ? Math.min(...meters.map((m) => m.waitsUntilCollapse))
    : Infinity;
  return {
    yearTicksSafe,
    maxEndTurns,
    maxWaits,
    waitsUntilRed,
    waitsUntilCollapseMeter,
    meters,
    startingRed: knobs.meters.some((m) => m.start >= 4),
    startingAllGreen: knobs.meters.every((m) => m.start <= m.winMax),
  };
}

const UNTREATED_WAIT_CAP = 12;

/**
 * Solo Wait-only clock: meters climb until collapse (any meter at 5) or fail year.
 * Each Wait jumps `yearsPerTurn` and applies rise once per year (usually ×2).
 * Use yearlyCrisisClock for the End-turn (+1 year, +rise once) axis.
 * @param {object} knobs
 * @returns {{ waits: number, year: number, pressure: object, collapsed: boolean, reason: string|null }[]}
 */
export function untreatedWaitTimeline(knobs) {
  const startYear = knobs.startYear;
  const fail = knobs.collapseYear;
  const step = knobs.yearsPerTurn || 2;
  const pressure = {};
  for (const m of knobs.meters || []) pressure[m.key] = m.start;
  const points = [];
  let waits = 0;
  let year = startYear;
  for (;;) {
    const collapsed = isCollapsed({
      year,
      collapseYear: fail,
      pressure,
    });
    let reason = null;
    if (collapsed) {
      reason = maxPressure(pressure) >= 5 ? "meter" : "calendar";
    }
    points.push({
      waits,
      year,
      pressure: clonePressure(pressure),
      collapsed,
      reason,
      bands: bandsFor(pressure, knobs),
    });
    if (collapsed || waits >= UNTREATED_WAIT_CAP) break;
    waits += 1;
    year += step;
    for (const m of knobs.meters || []) {
      pressure[m.key] = Math.min(
        5,
        (pressure[m.key] ?? 0) + (m.rise || 0) * step
      );
    }
  }
  return points;
}

/**
 * One sentence: which meter / year loses if they only Wait.
 * @param {object} knobs
 * @param {object[]} [timeline]
 */
/**
 * One row per calendar year until lose or fail year.
 * Each year applies `rise` once (End turn). Wait is the same rise twice.
 * Whole numbers only — never +0.5.
 * @param {object} knobs
 */
export function yearlyCrisisClock(knobs) {
  const startYear = Number(knobs.startYear) || 2026;
  const fail = Number(knobs.collapseYear) || startYear + 8;
  const rows = [];
  const cap = Math.min(fail, startYear + 16);
  for (let year = startYear; year <= cap; year++) {
    const elapsed = year - startYear;
    const pressure = {};
    for (const m of knobs.meters || []) {
      const jumped = (m.start || 0) + elapsed * (m.rise || 0);
      pressure[m.key] = Math.min(5, Math.round(jumped));
    }
    const collapsed = isCollapsed({
      year,
      collapseYear: fail,
      pressure,
    });
    const event = year === startYear ? "start" : "tick";
    let reason = null;
    if (collapsed) reason = maxPressure(pressure) >= 5 ? "meter" : "calendar";
    rows.push({
      year,
      waits: elapsed,
      waitLands: false,
      event,
      pressure,
      collapsed,
      reason,
      bands: bandsFor(pressure, knobs),
    });
    if (collapsed) break;
  }
  return rows;
}

export function untreatedClockBlurb(knobs, timeline) {
  const tl = timeline || untreatedWaitTimeline(knobs);
  const lose = tl.find((p) => p.collapsed);
  if (!lose) {
    return "No solo Wait in this window collapses the place.";
  }
  if (lose.reason === "calendar") {
    return `The fail year ${lose.year} ends the Quest on Wait ${lose.waits}, before any meter hits 5.`;
  }
  const killers = (knobs.meters || []).filter((m) => (lose.pressure[m.key] ?? 0) >= 5);
  const names = killers.map((m) => m.label).join(" and ") || "A meter";
  const nth =
    lose.waits === 0
      ? "already at the start"
      : `on Wait ${lose.waits} (${lose.year})`;
  return `${names} hit 5 ${nth} — the Quest is lost unless they invent before that.`;
}

function bandsFor(pressure, knobs) {
  const out = {};
  for (const m of knobs.meters) {
    out[m.key] = crisisMeterLevel(pressure[m.key], m.winMax);
  }
  return out;
}

function anyRed(bands) {
  return Object.values(bands).some((b) => b === "hot");
}

function allGreen(pressure, knobs) {
  const winMax = {};
  for (const m of knobs.meters) winMax[m.key] = m.winMax;
  return isWin(pressure, winMax);
}

function toRuntimeMission(knobs) {
  return {
    id: knobs.id,
    title: knobs.title,
    place: knobs.place,
    startYear: knobs.startYear,
    collapseYear: knobs.collapseYear,
    yearsPerTurn: knobs.yearsPerTurn,
    pressure: { ...knobs.pressure },
    pressureRise: { ...knobs.pressureRise },
    winMax: { ...knobs.winMax },
    suggested: [...(knobs.suggested || [])],
    apMax: knobs.apMax,
    startingBudget: knobs.budget,
    startingWill: knobs.will,
    resources: {
      apMax: knobs.apMax,
      startingBudget: knobs.budget,
      startingWill: knobs.will,
    },
    isLearningModule: knobs.isLearningModule,
  };
}

function labAction(sim, action, opts) {
  const r = applyAction(sim, action, opts);
  if (r.ok && r.sim) {
    r.sim.marketNews = null;
  }
  return r;
}

function applyPathwayRelief(pressure, knobs, pathways) {
  const next = clonePressure(pressure);
  for (const p of pathways || []) {
    for (const m of knobs.meters) {
      if (!(p.reaches || []).includes(m.role)) continue;
      const y = Number(p.yield?.[m.role]) || 0;
      next[m.key] = Math.max(0, Math.min(5, (next[m.key] ?? 0) + y));
    }
  }
  return { pressure: next };
}

/**
 * Lab Wait on display meters: keep pathway relief, apply rise × years jumped.
 * Friends personal Wait does not raise shared meters.
 * @param {Record<string, number>} displayPressure
 * @param {object} knobs
 * @param {{ friends?: boolean }} [opts]
 */
export function pressureAfterLabWait(displayPressure, knobs, opts = {}) {
  if (opts.friends) return clonePressure(displayPressure);
  return applyPressureRiseYears(
    displayPressure,
    knobs.pressureRise || {},
    knobs.yearsPerTurn || 2
  );
}

/**
 * Scripted competent path through applyAction + analytical hex relief.
 * @param {object} knobs
 * @param {object} archetype
 */
export function simulateArchetype(knobs, archetype) {
  const clock = clockFacts(knobs);
  const rawPlan = planPath(knobs, archetype);
  const techs = pickTechs(knobs.suggested, rawPlan.tileCount);
  const plan = bindPathwaysToTechs(rawPlan, techs);
  const features = {
    actionPoints: true,
    budgetWill: true,
    multiplayer: archetype.mode === "friends",
  };
  const mission = toRuntimeMission(knobs);
  let sim = createSimState(mission, null, {
    apMax: knobs.apMax,
    startingBudget: knobs.budget,
    startingWill: knobs.will,
    features,
  });
  const actionOpts = {
    features,
    apMax: knobs.apMax,
    techById: (id) => techById(id),
  };

  /** @type {object[]} */
  const timeline = [];
  /** @type {object[]} */
  const actions = [];
  let displayPressure = clonePressure(knobs.pressure);
  let blocked = null;
  let waits = 0;
  let endTurns = 0;
  let sparkAp = 0;
  let chatAp = 0;
  let lobbyCount = 0;
  let writePaid = 0;
  /** @type {{ step: string, mode: string, ap: number }[]} */
  const aiBill = [];
  let aiAp = 0;

  const payAi = (step, mode, apCost = 1) => {
    const tutor = knobs.isLearningModule && mode === "chat";
    const requested = tutor ? 0 : apCost;
    const row = { step, mode, ap: 0 };
    aiBill.push(row);
    const tryReserve = () =>
      labAction(
        sim,
        { type: "reserve_ai", payload: { reservedAp: requested, mode, tutor } },
        actionOpts
      );
    let r = tryReserve();
    if (!r.ok && r.error === "no_ap") {
      if (!ensureAp(1)) return false;
      r = tryReserve();
    }
    if (!r.ok) {
      blocked = { error: r.error || "no_ap", resource: "ap" };
      return false;
    }
    const before = r.sim ? (sim.ap ?? 0) : 0;
    sim = r.sim;
    const spent = Math.max(0, before - (sim.ap ?? 0));
    row.ap = spent;
    const done = labAction(sim, { type: "resolve_ai" }, actionOpts);
    if (done.ok) sim = done.sim;
    aiAp += spent;
    if (mode === "idea-sparks") sparkAp += spent;
    else chatAp += spent;
    actions.push({ type: "ai", step, mode, ap: spent });
    snap(`ai:${mode}`, { step, mode, ap: spent });
    return true;
  };

  const snap = (note, extra = {}) => {
    timeline.push({
      note,
      year: sim.year,
      turn: sim.turn,
      waits: sim.waits || waits,
      ap: sim.ap,
      budget: sim.budget,
      will: sim.will,
      pressure: clonePressure(displayPressure),
      bands: bandsFor(displayPressure, knobs),
      ...extra,
    });
  };

  snap("start");

  const yearAfter = (delta) => (sim.year || knobs.startYear) + delta;

  const collapsedNow = (year) =>
    isCollapsed({
      year,
      collapseYear: knobs.collapseYear,
      pressure: displayPressure,
    }) || maxPressure(displayPressure) >= 5;

  const wouldCollapseAfter = (nextYear, riseYears) => {
    const preview = applyPressureRiseYears(
      displayPressure,
      knobs.pressureRise,
      riseYears
    );
    return (
      isCollapsed({
        year: nextYear,
        collapseYear: knobs.collapseYear,
        pressure: preview,
      }) || maxPressure(preview) >= 5
    );
  };

  const refill = () => {
    const r = labAction(sim, { type: "end_turn", payload: { missionId: knobs.id } }, actionOpts);
    if (!r.ok) {
      blocked = { error: r.error || "end_turn", resource: "ap" };
      return false;
    }
    sim = r.sim;
    endTurns += 1;
    displayPressure = applyPressureRiseYears(
      displayPressure,
      knobs.pressureRise,
      1
    );
    actions.push({ type: "end_turn" });
    snap("end_turn");
    if (collapsedNow(sim.year)) {
      blocked = { error: "collapsed", resource: "calendar" };
      return false;
    }
    return true;
  };

  const waitOnce = () => {
    const step = knobs.yearsPerTurn || 2;
    if (archetype.mode === "friends") {
      // Personal Wait: calendar jump + AP refill; shared meters unchanged (wrap is refill()).
      sim = {
        ...sim,
        year: (sim.year || knobs.startYear) + step,
        waits: (sim.waits || 0) + 1,
        ap: knobs.apMax,
        apSpentThisTurn: 0,
        writeCommitsThisTurn: 0,
        learnOpenedThisTurn: false,
        aiTaxThisTurn: false,
        techAddedThisTurn: {},
      };
      waits += 1;
      actions.push({ type: "wait" });
      snap("wait");
      if (collapsedNow(sim.year)) {
        blocked = { error: "collapsed", resource: "calendar" };
        return false;
      }
      return true;
    }
    const r = labAction(
      sim,
      {
        type: "wait",
        payload: {
          mission: {
            id: knobs.id,
            yearsPerTurn: knobs.yearsPerTurn,
            pressureRise: knobs.pressureRise,
            collapseYear: knobs.collapseYear,
            startYear: knobs.startYear,
          },
        },
      },
      actionOpts
    );
    if (!r.ok) {
      blocked = { error: r.error || "wait", resource: "calendar" };
      return false;
    }
    sim = r.sim;
    waits += 1;
    displayPressure = pressureAfterLabWait(displayPressure, knobs, { friends: false });
    actions.push({ type: "wait" });
    snap("wait");
    if (collapsedNow(sim.year)) {
      blocked = { error: "collapsed", resource: "calendar" };
      return false;
    }
    return true;
  };

  const ensureAp = (n) => {
    while ((sim.ap ?? 0) < n) {
      const nextEnd = yearAfter(1);
      if (!wouldCollapseAfter(nextEnd, 1)) {
        if (!refill()) return false;
        continue;
      }
      // Calendar too tight for End turn / wrap — Wait only if meters stay off red/collapse.
      const step = knobs.yearsPerTurn || 2;
      const riseYears = archetype.mode === "friends" ? 0 : step;
      const preview = applyPressureRiseYears(
        displayPressure,
        knobs.pressureRise,
        riseYears
      );
      const waitYear = yearAfter(step);
      const waitCollapse =
        waitYear >= knobs.collapseYear || maxPressure(preview) >= 5;
      const waitRed = knobs.meters.some(
        (m) => crisisMeterLevel(preview[m.key], m.winMax) === "hot"
      );
      if (!waitCollapse && !waitRed) {
        if (!waitOnce()) return false;
        continue;
      }
      blocked = { error: "no_ap", resource: "calendar" };
      return false;
    }
    return true;
  };

  const ensureWill = (need) => {
    while ((sim.will ?? 0) < need) {
      if ((sim.budget ?? 0) < 1) {
        blocked = { error: "no_budget", resource: "will" };
        return false;
      }
      if (!ensureAp(1)) return false;
      const r = labAction(sim, { type: "lobby" }, actionOpts);
      if (!r.ok) {
        blocked = { error: r.error || "lobby", resource: r.error === "no_ap" ? "ap" : "budget" };
        return false;
      }
      sim = r.sim;
      lobbyCount += 1;
      actions.push({ type: "lobby" });
      snap("lobby");
    }
    return true;
  };

  const techByPlanId = Object.fromEntries((techs || []).map((t) => [t.id, t]));
  const islands = plan.pathways || [];

  for (let p = 0; p < islands.length; p++) {
    if (blocked) break;
    if (p > 0) {
      // Act two: calendar ticks so later tech is honest and unsolved meters rise.
      if ((sim.apSpentThisTurn || 0) < 1) {
        // end_turn requires engagement; a free 0-AP write counts if needed
        const wr = labAction(sim, { type: "write_commit", payload: { changed: true } }, actionOpts);
        if (wr.ok) sim = wr.sim;
      }
      if (!refill()) break;
    }
    const island = islands[p];
    const islandTechs = (island.tiles || [])
      .map((t) => techByPlanId[t.id])
      .filter(Boolean);
    for (const tech of islandTechs) {
      const cost = techCost(tech);
      if (!ensureWill(cost.will || 0)) break;
      if ((sim.budget ?? 0) < (cost.budget || 0)) {
        blocked = { error: "no_budget", resource: "budget" };
        break;
      }
      if (archetype.ai) {
        const name = tech.name || tech.id;
        if (!payAi(`Which emTech? (${name})`, "chat")) break;
        if (!payAi(`Ask for ideas (${name})`, "idea-sparks")) break;
        if (!payAi(`Write How it works (${name})`, "chat")) break;
      }
      if (!ensureAp(1)) break;
      const sel = labAction(
        sim,
        { type: "select_tech", payload: { techId: tech.id, tech } },
        actionOpts
      );
      if (!sel.ok) {
        blocked = {
          error: sel.error || "select_tech",
          resource:
            sel.error === "no_ap" ? "ap" : sel.error === "no_will" ? "will" : "budget",
        };
        break;
      }
      sim = sel.sim;
      actions.push({ type: "select_tech", techId: tech.id, cost });
      for (let w = 0; w < 2; w++) {
        const wr = labAction(
          sim,
          { type: "write_commit", payload: { changed: true } },
          actionOpts
        );
        if (wr.ok) {
          sim = wr.sim;
          if ((sim.writeCommitsThisTurn || 0) > 2) writePaid += 1;
        }
      }
      snap(`tile:${tech.id}`, {
        techId: tech.id,
        name: tech.name,
        cost,
      });
    }
    if (blocked) break;
    if (archetype.ai && !payAi(`Pathway ${p + 1} essay`, "chat")) break;
    const relief = applyPathwayRelief(displayPressure, knobs, [island]);
    displayPressure = relief.pressure;
    snap(p === 0 ? "relief" : "relief-global");
  }

  if (!blocked && archetype.ai) {
    if (!payAi("Coach the challenge", "coach-challenge")) {
      /* blocked set */
    }
    if (!blocked && !payAi("Draft the answer", "draft-challenge")) {
      /* blocked set */
    }
    if (!blocked && !payAi("Submit / judge", "judge-challenge")) {
      /* blocked set */
    }
  }

  const collapsed = isCollapsed({
    year: sim.year,
    collapseYear: knobs.collapseYear,
    pressure: displayPressure,
  });
  const bands = bandsFor(displayPressure, knobs);
  const survive = !blocked && !collapsed && !anyRed(bands) && maxPressure(displayPressure) < 5;
  const fullSolve = survive && allGreen(displayPressure, knobs);
  const hold = survive; // yellow+ is hex-hold for crises; concerns are free-AP after refund

  const apSpent =
    techs.length + aiAp + lobbyCount + writePaid;
  const slackYears = Math.max(0, knobs.collapseYear - 1 - (sim.year || knobs.startYear));
  const slackAp = sim.ap ?? 0;
  const slackBudget = sim.budget ?? 0;
  const slackWill = sim.will ?? 0;

  const result = {
    archetype: archetype.id,
    label: archetype.label,
    mode: archetype.mode,
    ai: Boolean(archetype.ai),
    tiles: techs.map((t) => ({
      id: t.id,
      name: t.name,
      cost: techCost(t),
      polarity: polarityForTech(t.id),
    })),
    tileCount: plan.tileCount,
    pathwayCount: plan.pathwayCount,
    pathways: plan.pathways,
    plan,
    clock,
    apSpent,
    aiAp,
    aiBill,
    sparkAp,
    chatAp,
    lobbyCount,
    endTurns,
    /** Opening turn plus each End turn / Wait refill. */
    turnsUsed: endTurns + 1,
    waits,
    actions,
    timeline,
    year: sim.year,
    ap: sim.ap,
    budget: sim.budget,
    will: sim.will,
    pressure: displayPressure,
    bands,
    survive,
    hold,
    fullSolve,
    collapsed,
    blocked,
    slack: { years: slackYears, ap: slackAp, budget: slackBudget, will: slackWill },
  };
  result.verdict = verdictFor(result, knobs, archetype);
  result.notes = notesFor(result, knobs, archetype);
  return result;
}

function verdictFor(result, knobs, archetype) {
  if (result.clock.startingRed && !result.survive) return "impossible";
  if (result.blocked || result.collapsed || !result.survive) {
    if (result.blocked?.resource === "budget" || result.blocked?.resource === "will") {
      return result.tileCount <= 1 ? "impossible" : "too_hard";
    }
    if (result.blocked?.resource === "calendar") return "too_hard";
    return "too_hard";
  }
  const cheap =
    result.tileCount <= 1 &&
    result.endTurns === 0 &&
    result.waits === 0 &&
    result.slack.years >= 3 &&
    result.slack.budget >= 3;
  if (result.clock.startingAllGreen && result.fullSolve && cheap) return "too_easy";
  if (archetype.ai) {
    if (result.fullSolve && cheap && result.slack.ap >= knobs.apMax) return "too_easy";
    if (result.survive) return "challenging";
    return "too_hard";
  }
  // no-AI: survive on a tight path is the target; full green may be out of reach (global yield 0)
  if (result.fullSolve && cheap) return "too_easy";
  if (result.survive) return "challenging";
  return "too_hard";
}

function notesFor(result, knobs, archetype) {
  const notes = [];
  if (archetype.mode === "friends") {
    notes.push(
      "Friends Wait does not raise shared meters. Shared crises rise when the table wraps (+1 year)."
    );
  } else {
    notes.push(
      "Each calendar year raises crises (End turn +1 year and +rise; Wait +2 years and +rise twice). Inventing eases meters. First pathway is local; a second pathway after a year tick is the global/root cause."
    );
  }
  if (archetype.ai) {
    notes.push(
      "First AI request of a turn costs 1 Attention; further thinking that turn is free. Judge/submit still costs 1 AP."
    );
  }
  notes.push(
    `This path uses ${result.tileCount} invention tile${
      result.tileCount === 1 ? "" : "s"
    } in ${result.pathwayCount} pathway${
      result.pathwayCount === 1 ? "" : "s"
    }. A pathway is one connected island — that is what gets scored, not each tile.`
  );
  if (result.plan.leftoverDebt?.length) {
    notes.push(
      `Typical/strong yield cannot finish green on: ${result.plan.leftoverDebt.join(", ")} (heuristic global is often 0 without AI).`
    );
  }
  if (result.clock.waitsUntilRed !== Infinity && result.clock.waitsUntilRed <= 2) {
    notes.push(
      `Solo: ${result.clock.waitsUntilRed} Wait(s) until a meter turns red (hot ≥ 4).`
    );
  }
  if (result.blocked) {
    notes.push(`Path blocked: ${result.blocked.error} (${result.blocked.resource}).`);
  }
  const early = result.tiles.filter((t) => (t.cost?.will || 0) > 0);
  if (early.length) {
    notes.push(
      `Will-gated techs: ${early.map((t) => `${t.name} (will ${t.cost.will})`).join(", ")}.`
    );
  }
  return notes;
}

function defaultArchetypes(opts = {}) {
  const seats = opts.friendsSeats ?? 3;
  return ARCHETYPES.map((a) => ({
    ...a,
    seats: a.mode === "friends" ? seats : undefined,
  }));
}

/**
 * @param {object} input — tile | {tile,mission} | knobs-capable mission
 * @param {object} [opts]
 */
export function evaluateQuestEconomy(input, opts = {}) {
  const knobs =
    input?.meters && input?.pressure && input?.apMax != null
      ? { ...input, ...knobOverrides(input, opts.overrides) }
      : extractKnobs(input, opts.overrides || {});
  const archetypes = opts.archetypes || defaultArchetypes(opts);
  /** @type {Record<string, object>} */
  const byId = {};
  for (const a of archetypes) {
    byId[a.id] = simulateArchetype(knobs, a);
  }
  const soloNo = byId["solo-no-ai"];
  const soloAi = byId["solo-ai"];
  const worstSolo = worseVerdict(soloNo?.verdict, soloAi?.verdict);
  const friendsEasier =
    Boolean(byId["friends-no-ai"]?.survive) &&
    soloNo &&
    VERDICT_RANK[byId["friends-no-ai"].verdict] > VERDICT_RANK[soloNo.verdict];
  const aiYearGap =
    soloNo && soloAi ? (soloAi.year || 0) - (soloNo.year || 0) : 0;

  const clock = clockFacts(knobs);
  const untreated = untreatedWaitTimeline(knobs);
  const yearlyClock = yearlyCrisisClock(knobs);
  const report = {
    knobs,
    clock,
    untreated,
    yearlyClock,
    untreatedBlurb: untreatedClockBlurb(knobs, untreated),
    archetypes: byId,
    questVerdict: worstSolo || "challenging",
    friendsEasier,
    aiYearGap,
    notes: [
      friendsEasier
        ? "Friends is easier on meters than solo (Wait does not raise shared crisis). Do not lower starting pressure only to nerf Friends."
        : null,
      aiYearGap >= 2
        ? `AI path finishes ${aiYearGap} years later than no-AI — the Attention tax is spilling extra seasons. Tune apMax or tile count.`
        : null,
    ].filter(Boolean),
  };
  if (opts.recommend !== false) {
    report.recommendation = recommendQuestEconomy(knobs, {
      ...opts,
      archetypes,
    });
  }
  return report;
}

function knobOverrides(knobs, overrides) {
  if (!overrides) return knobs;
  return extractKnobs(knobsToPseudoMission(knobs), overrides);
}

function knobsToPseudoMission(knobs) {
  const pressure = {};
  for (const m of knobs.meters) {
    pressure[m.role] = {
      label: m.label,
      pressure: m.start,
      pressureRise: m.rise,
      winMax: m.winMax,
    };
  }
  return {
    id: knobs.id,
    title: knobs.title,
    place: knobs.place,
    startYear: knobs.startYear,
    collapseYear: knobs.collapseYear,
    yearsPerTurn: knobs.yearsPerTurn,
    pressure,
    suggested: knobs.suggested,
    resources: {
      apMax: knobs.apMax,
      startingBudget: knobs.budget,
      startingWill: knobs.will,
    },
    isLearningModule: knobs.isLearningModule,
  };
}

function worseVerdict(a, b) {
  const ra = VERDICT_RANK[a] ?? 2;
  const rb = VERDICT_RANK[b] ?? 2;
  return ra <= rb ? a : b;
}

function reportScore(report) {
  const sna = report.archetypes["solo-no-ai"]?.verdict;
  const sa = report.archetypes["solo-ai"]?.verdict;
  const fn = report.archetypes["friends-no-ai"]?.verdict;
  let s = 0;
  const add = (v, challenging, tooHard, tooEasy, impossible) => {
    if (v === "challenging") s += challenging;
    else if (v === "too_hard") s += tooHard;
    else if (v === "too_easy") s += tooEasy;
    else s += impossible;
  };
  add(sna, 12, 3, 5, 0);
  add(sa, 9, 2, 6, 0);
  add(fn, 3, 1, 2, 0);
  if (sna === "challenging" && sa === "challenging") s += 4;
  if (sna === "impossible" || sa === "impossible") s -= 8;
  const k = report.knobs;
  // Tie-break while still failing so budget/will/AP can climb one point at a time.
  if (sna === "impossible" || sna === "too_hard" || sa === "impossible" || sa === "too_hard") {
    s += Math.min(k.budget, 10) * 0.25;
    s += Math.min(k.will, 5) * 0.2;
    s += Math.min(k.apMax, 6) * 0.1;
    const solo = report.archetypes["solo-no-ai"];
    if (solo?.survive) s += 2;
    if (solo?.fullSolve) s += 1;
  }
  // Tie-break while too easy: spend down leftover wallet / raise a meter one notch.
  if (sna === "too_easy" || sa === "too_easy") {
    s -= Math.min(k.budget, 10) * 0.08;
    s -= Math.min(k.apMax, 6) * 0.05;
    s += k.meters.reduce((n, m) => n + m.start, 0) * 0.12;
  }
  return s;
}

function cloneKnobs(knobs) {
  return extractKnobs(knobsToPseudoMission(knobs));
}

function patchFromKnobs(before, after) {
  /** @type {object} */
  const patch = {};
  const res = {};
  if (after.apMax !== before.apMax) res.apMax = after.apMax;
  if (after.budget !== before.budget) res.startingBudget = after.budget;
  if (after.will !== before.will) res.startingWill = after.will;
  if (Object.keys(res).length) patch.resources = res;
  /** @type {Record<string, object>} */
  const pressure = {};
  for (const m of after.meters) {
    const prev = before.meters.find((x) => x.role === m.role);
    if (!prev) continue;
    const row = {};
    if (m.start !== prev.start) row.pressure = m.start;
    if (m.rise !== prev.rise) row.pressureRise = m.rise;
    if (m.winMax !== prev.winMax) row.winMax = m.winMax;
    if (Object.keys(row).length) pressure[m.role] = row;
  }
  if (Object.keys(pressure).length) patch.pressure = pressure;
  if (after.collapseYear !== before.collapseYear) {
    patch.collapseYear = after.collapseYear;
  }
  return patch;
}

const EASE_MOVES = [
  { id: "budget+", apply: (k) => bumpResource(k, "budget", 1, PATCH_BOUNDS.startingBudget) },
  { id: "will+", apply: (k) => bumpResource(k, "will", 1, PATCH_BOUNDS.startingWill) },
  { id: "apMax+", apply: (k) => bumpResource(k, "apMax", 1, PATCH_BOUNDS.apMax) },
  { id: "pressure-", apply: (k) => bumpHottestPressure(k, -1) },
  { id: "rise-", apply: (k) => bumpHottestRise(k, -1) },
  { id: "collapse+", apply: (k) => bumpCollapse(k, 2) },
];

const HARDEN_MOVES = [
  { id: "budget-", apply: (k) => bumpResource(k, "budget", -1, PATCH_BOUNDS.startingBudget) },
  { id: "apMax-", apply: (k) => bumpResource(k, "apMax", -1, PATCH_BOUNDS.apMax) },
  { id: "pressure+", apply: (k) => bumpHottestPressure(k, 1) },
  { id: "rise+", apply: (k) => bumpHottestRise(k, 1) },
  { id: "will-", apply: (k) => bumpResource(k, "will", -1, PATCH_BOUNDS.startingWill) },
];

function bumpResource(k, field, delta, bound) {
  const next = cloneKnobs(k);
  const v = next[field] + delta;
  if (v < bound.min || v > bound.max) return null;
  next[field] = v;
  return next;
}

function bumpHottestPressure(k, delta) {
  const next = cloneKnobs(k);
  const meters = [...next.meters].sort((a, b) =>
    delta < 0 ? b.start - a.start : a.start - b.start
  );
  const m = meters[0];
  if (!m) return null;
  const v = m.start + delta;
  if (v < PATCH_BOUNDS.pressure.min || v > PATCH_BOUNDS.pressure.max) return null;
  // Don't start already red when raising; don't hide the meter when lowering to 0 unless needed
  if (delta > 0 && v >= 4) return null;
  m.start = v;
  next.pressure[m.key] = v;
  return next;
}

function bumpHottestRise(k, delta) {
  const next = cloneKnobs(k);
  const meters = [...next.meters].sort((a, b) =>
    delta < 0 ? b.rise - a.rise : a.rise - b.rise
  );
  const m = meters[0];
  if (!m) return null;
  const v = m.rise + delta;
  if (v < PATCH_BOUNDS.pressureRise.min || v > PATCH_BOUNDS.pressureRise.max) {
    return null;
  }
  m.rise = v;
  next.pressureRise[m.key] = v;
  return next;
}

function bumpCollapse(k, delta) {
  const next = cloneKnobs(k);
  const v = next.collapseYear + delta;
  if (v <= next.startYear + 2) return null;
  if (v > next.startYear + 16) return null;
  next.collapseYear = v;
  return next;
}

/**
 * Greedy search for a small patch that makes solo-no-ai challenging and
 * solo-ai possible (prefer challenging). Never drops a crisis role.
 * @param {object} knobsOrInput
 * @param {object} [opts]
 */
export function recommendQuestEconomy(knobsOrInput, opts = {}) {
  const startKnobs =
    knobsOrInput?.meters && knobsOrInput?.apMax != null
      ? cloneKnobs(knobsOrInput)
      : extractKnobs(knobsOrInput, opts.overrides || {});
  const archetypes = opts.archetypes || defaultArchetypes(opts);
  const evalOf = (knobs) =>
    evaluateQuestEconomy(knobs, { ...opts, archetypes, recommend: false });

  let bestKnobs = startKnobs;
  let best = evalOf(bestKnobs);
  let bestScore = reportScore(best);
  const steps = [];

  const tryMoves = (moves) => {
    let improved = true;
    let guard = 0;
    while (improved && guard < 12) {
      improved = false;
      guard += 1;
      for (const move of moves) {
        const cand = move.apply(bestKnobs);
        if (!cand) continue;
        const rep = evalOf(cand);
        const sc = reportScore(rep);
        if (sc > bestScore) {
          bestKnobs = cand;
          best = rep;
          bestScore = sc;
          steps.push(move.id);
          improved = true;
          break;
        }
      }
    }
  };

  const sna = best.archetypes["solo-no-ai"]?.verdict;
  const sa = best.archetypes["solo-ai"]?.verdict;
  if (sna === "impossible" || sna === "too_hard" || sa === "impossible" || sa === "too_hard") {
    tryMoves(EASE_MOVES);
  }
  if (
    best.archetypes["solo-no-ai"]?.verdict === "too_easy" ||
    best.archetypes["solo-ai"]?.verdict === "too_easy"
  ) {
    tryMoves(HARDEN_MOVES);
  }

  const patch = patchFromKnobs(startKnobs, bestKnobs);
  const changed = Object.keys(patch).length > 0;
  return {
    needed: changed,
    patch,
    steps,
    beforeVerdict: {
      quest: evalOf(startKnobs).questVerdict,
      soloNoAi: sna,
      soloAi: sa,
    },
    afterVerdict: {
      quest: best.questVerdict,
      soloNoAi: best.archetypes["solo-no-ai"]?.verdict,
      soloAi: best.archetypes["solo-ai"]?.verdict,
    },
    afterKnobs: bestKnobs,
    reason: changed
      ? `Moves: ${steps.join(" → ") || "none"}. Solo no-AI ${
          best.archetypes["solo-no-ai"]?.verdict
        }; solo AI ${best.archetypes["solo-ai"]?.verdict}.`
      : "Current knobs already sit on the challenging/possible band.",
  };
}

/**
 * Merge an economy patch into a quest tile JSON object (prose untouched).
 * @param {object} tile
 * @param {object} patch
 */
export function applyEconomyPatchToTile(tile, patch) {
  if (!tile || typeof tile !== "object") return tile;
  const next = structuredClone(tile);
  const p = patch || {};
  if (p.resources && typeof p.resources === "object") {
    if (next.resources && typeof next.resources === "object") {
      next.resources = { ...next.resources, ...p.resources };
      if (next.mission?.resources && typeof next.mission.resources === "object") {
        next.mission.resources = { ...next.resources };
      }
    } else if (next.mission?.resources && typeof next.mission.resources === "object") {
      next.mission.resources = { ...next.mission.resources, ...p.resources };
    } else {
      next.resources = { ...p.resources };
    }
  }
  if (p.pressure && next.mission?.pressure && typeof next.mission.pressure === "object") {
    for (const role of CRISIS_ROLES) {
      if (!p.pressure[role] || !next.mission.pressure[role]) continue;
      next.mission.pressure[role] = {
        ...next.mission.pressure[role],
        ...p.pressure[role],
      };
    }
  }
  if (p.collapseYear != null && next.mission) {
    next.mission.collapseYear = Number(p.collapseYear);
  }
  if (p.yearsPerTurn != null && next.mission) {
    next.mission.yearsPerTurn = Number(p.yearsPerTurn);
  }
  return next;
}

export function knobsToPseudoTile(knobs) {
  return knobsToPseudoMission(knobs);
}

export { PATCH_BOUNDS, VERDICT_RANK };
