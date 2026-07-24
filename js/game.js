/**
 * Future Forge — solo polymath timing game with AI co-inventor
 */

import {
  GAME,
  GLOBALS,
  MISSIONS,
  TECHS,
  DOMAINS,
  VISION_STAGES,
  YEAR_NEWS,
  CHALLENGE_ANGLES,
  foresightForStack,
  globalById,
  missionsForGlobal,
  localScenariosForGlobal,
  allTechIds,
  techById,
  domainsInStack,
  detectClaimStretch,
  techHorizonYear,
  techForAi,
} from "./data.js";
import { briefForGlobal } from "./problem-briefs.js";
import { VisionRenderer, narrativesFromTechs } from "./vision.js";
import { CoInventor } from "./coinventor.js";
import {
  clonePressure as simClonePressure,
  previewPressureAfterWait,
  applyPressureDrop,
  maxPressure as simMaxPressure,
  totalPressure as simTotalPressure,
} from "./sim/pressure.js";
import {
  computeDeployDrop,
  freezeStagedDropPool,
  applyStagedDropStep,
  visionStageIdForDeployStage,
} from "./sim/deploy.js";
import { isWin as simIsWin, isCollapsed as simIsCollapsed } from "./sim/collapse.js";
import { scoreRun, starLabel } from "./sim/scoring.js";
import {
  applyAction,
  simSliceFromState,
  applySimSliceToState,
} from "./sim/actions.js";
import { techCost, deployActionCost } from "./sim/economy.js";
import {
  pickChallengeAngles,
  encounterCountForFeasibility,
  resolveForFeasibility,
  buildEncounters,
  activeEncounter,
  allEncountersCleared,
  applyArgueResult,
  applyPatchResult,
  applyPivotResult,
  localArgueQuality,
  MISS_BUDGET,
  cloneScrutiny,
} from "./sim/scrutiny.js";

const state = {
  screen: "title",
  global: null,
  mission: null,
  year: GAME.startYear,
  turn: 0,
  waits: 0,
  pressure: {},
  selectedTechIds: [],
  inventionName: "",
  inventionHow: "",
  inventionImpact: "",
  storyFace: "how", // focus: which face "Fill other side" attaches to (AI drafts the other)
  challengePassed: false,
  challengeAngle: null,
  challengeText: "",
  challengeQuestion: "",
  challengeAnswer: "",
  challengeFeedback: "",
  challengeVerdict: null,
  challengeFails: 0,
  hadChallengeAttempt: false,
  lastChallengeVerdict: null,
  domainFilter: "all",
  vision: null,
  coInventor: null,
  sideTab: "vision",
  lastNews: "",
  waitReport: "",
  outcome: null,
  runReport: null,
  aiBusy: false,
  /** @type {{ level: string, reason: string, forKey: string } | null} */
  aiTiming: null,
  /** Timing snapshot at deploy click for scoring */
  timingLevelAtDeploy: null,
  /** @type {Record<string, object[]>} last generated scenarios per theme (max SCENARIO_COUNT) */
  scenarioCache: {},
  /** @type {object[]} scenarios currently shown on mission screen */
  missionChoices: [],
  scenariosLoading: false,
  /** Mission ids the player has already deployed/solved (still replayable) */
  solvedMissionIds: new Set(),
  /**
   * Learn stack: selected tech ids, most recently selected first.
   * Push on select, remove on deselect; Learn modal shows this order.
   */
  learnOrder: [],
  // G1 action economy
  ap: GAME.apMax ?? 3,
  apMax: GAME.apMax ?? 3,
  apSpentThisTurn: 0,
  writeCommitsThisTurn: 0,
  learnOpenedThisTurn: false,
  turnPhase: "act",
  pendingAi: null,
  lastWriteSnapshot: { name: "", how: "", impact: "" },
  // G2 budget + political will (never state.trust)
  budget: GAME.startingBudget ?? 5,
  will: GAME.startingWill ?? 3,
  techAddedThisTurn: {},
  /** G3 multi-encounter scrutiny (null when essay mode) */
  scrutiny: null,
  elegancePivotPenalty: false,
  /** @type {"defend"|"fix"|"sidestep"|null} selected challenge response mode */
  scrutinyMoveMode: null,
  // PR7 staged deploy (pilot → scale → new normal)
  deployUnlocked: false,
  /** @type {"none"|"pilot"|"scale"|"new_normal"} last completed stage */
  deployStage: "none",
  stagedDropPool: 0,
  stagedDropRemaining: 0,
  dropPilotApplied: 0,
  dropScaleApplied: 0,
  dropNewNormalApplied: 0,
  stagedDropParts: null,
  deployFieldPaid: false,
};

const STORAGE_SCENARIOS = "future-forge:scenarioCache";
const STORAGE_SOLVED = "future-forge:solvedMissions";
const STORAGE_RUNS = "future-forge:runReports";

function features() {
  return GAME.features || {};
}

function apEnabled() {
  return Boolean(features().actionPoints);
}

function budgetWillEnabled() {
  return Boolean(features().budgetWill);
}

function scrutinyCombatEnabled() {
  return Boolean(features().scrutinyCombat);
}

function deployStagesEnabled() {
  return Boolean(features().deployStages);
}

function dispatchSim(type, payload = {}) {
  const result = applyAction(simSliceFromState(state), { type, payload }, {
    features: features(),
    apMax: state.apMax ?? GAME.apMax,
    techById,
  });
  if (result.ok) applySimSliceToState(state, result.sim);
  return result;
}

function loadPersistedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_SCENARIOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [gid, list] of Object.entries(parsed)) {
          if (!Array.isArray(list)) continue;
          state.scenarioCache[gid] = list
            .slice(0, SCENARIO_COUNT)
            .map((m) => normalizeMission(m, gid));
        }
      }
    }
  } catch {
    /* ignore corrupt cache */
  }
  try {
    const raw = localStorage.getItem(STORAGE_SOLVED);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) state.solvedMissionIds = new Set(ids.map(String));
    }
  } catch {
    /* ignore */
  }
}

function persistScenarioCache() {
  try {
    const slim = {};
    for (const [gid, list] of Object.entries(state.scenarioCache)) {
      if (!Array.isArray(list) || !list.length) continue;
      slim[gid] = list.slice(0, SCENARIO_COUNT).map((m) => ({
        id: m.id,
        globalId: m.globalId,
        title: m.title,
        place: m.place,
        startYear: m.startYear,
        collapseYear: m.collapseYear,
        yearsPerTurn: m.yearsPerTurn,
        pressure: m.pressure,
        pressureRise: m.pressureRise,
        winMax: m.winMax,
        scene: m.scene,
        stakeholder: m.stakeholder,
        suggested: m.suggested,
        visionTheme: m.visionTheme,
        source: m.source,
      }));
    }
    localStorage.setItem(STORAGE_SCENARIOS, JSON.stringify(slim));
  } catch {
    /* quota / private mode */
  }
}

function persistSolvedMissions() {
  try {
    localStorage.setItem(STORAGE_SOLVED, JSON.stringify([...state.solvedMissionIds]));
  } catch {
    /* ignore */
  }
}

function isMissionSolved(missionId) {
  return Boolean(missionId && state.solvedMissionIds.has(String(missionId)));
}

function markMissionSolved(mission) {
  if (!mission?.id) return;
  state.solvedMissionIds.add(String(mission.id));
  persistSolvedMissions();
}

function cacheScenariosForGlobal(globalId, list) {
  const capped = (list || []).slice(0, SCENARIO_COUNT);
  state.scenarioCache[globalId] = capped;
  state.missionChoices = capped;
  persistScenarioCache();
  return capped;
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function selectedTechs() {
  return state.selectedTechIds.map(techById).filter(Boolean);
}

function currentStage() {
  if (deployStagesEnabled() && state.deployUnlocked) {
    const id = visionStageIdForDeployStage(state.deployStage || "none");
    return VISION_STAGES.find((s) => s.id === id) || VISION_STAGES[0];
  }
  const n = state.selectedTechIds.length;
  let stage = VISION_STAGES[0];
  for (const s of VISION_STAGES) {
    if (n >= s.minTechs) stage = s;
  }
  return stage;
}

function clonePressure(p) {
  return simClonePressure(p);
}

function totalPressure(p = state.pressure) {
  return simTotalPressure(p);
}

function maxPressure(p = state.pressure) {
  return simMaxPressure(p);
}

function wonMission() {
  return simIsWin(state.pressure, state.mission?.winMax || {});
}

function collapsed() {
  if (!state.mission) return false;
  return simIsCollapsed({
    year: state.year,
    collapseYear: state.mission.collapseYear,
    pressure: state.pressure,
  });
}

function computeSynergies(techs) {
  const ids = new Set(techs.map((t) => t.id));
  const pairs = [];
  for (const t of techs) {
    for (const p of t.pairs || []) {
      if (ids.has(p) && t.id < p) pairs.push([t.id, p]);
    }
  }
  return pairs;
}

/** Soft signal only — never a hard deploy gate */
function isCrossDomain(techs) {
  return techs.length >= 2 && domainsInStack(techs).length >= 2;
}

/** @deprecated soft only — categories are always pickable */
function readinessIssues(techs, year) {
  return []; // no hard locks; timing is feasibility's job
}

function newsForYear(year) {
  const opts = YEAR_NEWS.filter((n) => year >= n.minYear);
  if (!opts.length) return "";
  return opts[Math.floor(Math.random() * opts.length)].text;
}

function tips() {
  return [
    "Mixing domains often helps — but only when the problem needs it, not as a rule.",
    "Any emTech category is pickable. Feasibility judges whether your how-it-works over-claims this year.",
    "Wait advances world conditions and raises crisis — not a card unlock.",
    "Local inventing: name who benefits on *this* street, clinic, or quay.",
    "Art of the possible on the co-inventor: milestones, capabilities, unlocked use cases.",
  ];
}

/* —— Screens —— */
function showScreen(id) {
  state.screen = id;
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === `screen-${id}`));
  if (id === "global") renderGlobals();
  if (id === "mission") renderMissions();
  if (id === "workshop") {
    renderWorkshop();
    ensureCoInventor();
    setSideTab(state.sideTab || "vision");
    requestAnimationFrame(() => {
      ensureVision();
      updateVision({ immediate: true });
    });
  }
  if (id === "challenge-step") {
    renderChallengeStep();
    ensureCoInventor();
  }
  if (id === "outcome") renderOutcome();
}

/* —— Global / mission select —— */
const SCENARIO_COUNT = 4;

function problemVisualUrl(globalId) {
  return `assets/problems/${globalId}.jpg`;
}

function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderGlobals() {
  const grid = $("#global-grid");
  // Fresh random order each time the Themes screen is painted
  const themes = shuffleCopy(GLOBALS);
  grid.innerHTML = themes
    .map((g) => {
      const tag = g.kind === "before" ? "Before it hits" : "Now";
      const cls = g.kind === "before" ? "flag-prevention" : "flag-problem";
      const cachedList = state.scenarioCache[g.id] || [];
      const cached = cachedList.length;
      const solvedOnTheme = cachedList.filter((m) => isMissionSolved(m.id)).length;
      const hint = cached
        ? solvedOnTheme
          ? `${cached} cached · ${solvedOnTheme} solved →`
          : `${cached} cached scenarios →`
        : "Generate local scenarios →";
      const img = problemVisualUrl(g.id);
      return `
      <button type="button" class="challenge-card challenge-card-visual" data-id="${g.id}">
        <span class="card-visual" aria-hidden="true">
          <img src="${escapeHtml(img)}" alt="" loading="lazy" width="640" height="360" />
        </span>
        <span class="card-body">
          <span class="num"><span class="flag ${cls}">${tag}</span></span>
          <h3>${escapeHtml(g.title)}</h3>
          <p>${escapeHtml(g.blurb)}</p>
          <span class="cta">${hint}</span>
        </span>
      </button>`;
    })
    .join("");
  grid.querySelectorAll(".challenge-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.global = globalById(btn.dataset.id);
      showScreen("mission");
    });
  });
}

function setMissionStatus(text, { loading = false } = {}) {
  const el = $("#mission-status");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("loading");
    return;
  }
  el.hidden = false;
  el.classList.toggle("loading", loading);
  el.innerHTML = loading
    ? `<span class="co-dots" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(text)}`
    : escapeHtml(text);
}

/**
 * Theme brief on the mission screen — readable while scenarios draft (static data).
 * @param {object | null} global
 * @param {{ drafting?: boolean }} [opts]
 */
function renderProblemBrief(global, { drafting = false } = {}) {
  const root = $("#problem-brief");
  if (!root) return;
  const brief = global ? briefForGlobal(global) : null;
  if (!brief) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  root.classList.toggle("is-drafting", drafting);
  const title = $("#problem-brief-title");
  const sub = $("#problem-brief-sub");
  const stateEl = $("#problem-brief-state");
  const causesEl = $("#problem-brief-causes");
  const warnEl = $("#problem-brief-warnings");
  if (title) title.textContent = global.title || "About this problem";
  if (sub) {
    sub.textContent = drafting
      ? "Read this while local scenarios draft — then pick a place to invent."
      : "Context for this theme. Pick a local scenario below to invent.";
  }
  if (stateEl) stateEl.textContent = brief.currentState;
  if (causesEl) causesEl.textContent = brief.rootCauses;
  if (warnEl) warnEl.textContent = brief.warnings;
}

/** Neutral loading shells — no draft titles that get replaced when AI finishes */
function paintMissionSkeletons(count = SCENARIO_COUNT) {
  const grid = $("#mission-grid");
  if (!grid) return;
  grid.classList.add("mission-grid-loading");
  grid.innerHTML = Array.from({ length: count }, (_, i) => {
    return `
    <div class="challenge-card mission-skeleton" aria-hidden="true">
      <span class="skel skel-line skel-short"></span>
      <span class="skel skel-line skel-title"></span>
      <span class="skel skel-line"></span>
      <span class="skel skel-line"></span>
      <span class="skel skel-line skel-mid"></span>
      <span class="skel skel-cta">Scenario ${i + 1}</span>
    </div>`;
  }).join("");
}

function paintMissionCards(list, { disabled = false } = {}) {
  const grid = $("#mission-grid");
  if (!grid) return;
  grid.classList.toggle("mission-grid-loading", disabled);
  if (!list.length) {
    grid.innerHTML = `<p class="empty-hint">No scenarios yet — try Generate new scenarios.</p>`;
    return;
  }
  grid.innerHTML = list
    .map((m) => {
      const tag = m.source === "curated" ? "curated" : "generated";
      const tagLabel = m.source === "curated" ? "Curated" : "Scenario";
      const solved = isMissionSolved(m.id);
      const scene = (m.scene || "").slice(0, 180);
      const ellipsis = (m.scene || "").length > 180 ? "…" : "";
      return `
    <button type="button" class="challenge-card ${disabled ? "disabled" : ""} ${
      solved ? "solved" : ""
    }" data-id="${escapeHtml(m.id)}" ${disabled ? "disabled aria-disabled=\"true\"" : ""}>
      <span class="num">${escapeHtml(m.place)} · ${m.startYear || GAME.startYear}
        <span class="scenario-tag ${tag}">${tagLabel}</span>
        ${solved ? `<span class="scenario-tag solved-tag" title="You already deployed a solution here">Solved</span>` : ""}
      </span>
      <h3>${escapeHtml(m.title)}</h3>
      <p>${escapeHtml(scene)}${ellipsis}</p>
      ${
        m.stakeholder
          ? `<p class="stakeholder-line">Stakeholder: ${escapeHtml(m.stakeholder)}</p>`
          : ""
      }
      <span class="cta">${
        disabled ? "Preparing…" : solved ? "Play again →" : "Invent here →"
      }</span>
    </button>`;
    })
    .join("");
  if (disabled) return;
  grid.querySelectorAll(".challenge-card:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.scenariosLoading) return;
      const mission = state.missionChoices.find((m) => m.id === btn.dataset.id);
      if (mission) startMission(mission);
    });
  });
}

async function ensureScenarios(global, { force = false } = {}) {
  if (!global) return [];
  // Prefer last cached set of up to 4 (unless user asked for a fresh generation)
  if (!force && state.scenarioCache[global.id]?.length) {
    return state.scenarioCache[global.id].slice(0, SCENARIO_COUNT);
  }

  try {
    const res = await fetch("/api/co-invent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "generate-scenarios",
        messages: [{ role: "user", content: "[Generate local scenarios]" }],
        context: {
          globalTheme: {
            id: global.id,
            title: global.title,
            blurb: global.blurb,
            kind: global.kind,
          },
          scenarioCount: SCENARIO_COUNT,
          seedMissions: missionsForGlobal(global.id).map((m) => ({
            id: m.id,
            title: m.title,
            place: m.place,
            scene: m.scene,
            stakeholder: m.stakeholder,
            suggested: m.suggested,
            visionTheme: m.visionTheme,
            pressure: m.pressure,
            collapseYear: m.collapseYear,
          })),
          forceRegen: force,
          availableTechs: TECHS.map((t) => techForAi(t, GAME.startYear)),
          year: GAME.startYear,
        },
      }),
    });
    const data = await res.json();
    const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
    if (scenarios.length >= 2) {
      const normalized = scenarios
        .map((m) => normalizeMission(m, global.id))
        .slice(0, SCENARIO_COUNT);
      return cacheScenariosForGlobal(global.id, normalized);
    }
  } catch {
    /* fall through to local pack */
  }

  // Offline / AI failure only — not shown during the loading wait
  const localPack = localScenariosForGlobal(global, {
    count: SCENARIO_COUNT,
    salt: force ? Date.now() % 10000 : 0,
  }).slice(0, SCENARIO_COUNT);
  return cacheScenariosForGlobal(global.id, localPack);
}

function normalizeMission(raw, globalId) {
  const id =
    String(raw.id || "").trim() ||
    `gen-${globalId}-${Math.random().toString(36).slice(2, 8)}`;
  const pressure =
    raw.pressure && typeof raw.pressure === "object" && Object.keys(raw.pressure).length
      ? Object.fromEntries(
          Object.entries(raw.pressure)
            .slice(0, 4)
            .map(([k, v]) => [String(k).slice(0, 24), Math.min(5, Math.max(0, Number(v) || 2))])
        )
      : { Pressure: 2, Capacity: 2, Trust: 1 };
  const keys = Object.keys(pressure);
  const pressureRise =
    raw.pressureRise && typeof raw.pressureRise === "object"
      ? Object.fromEntries(keys.map((k) => [k, Math.min(2, Math.max(0, Number(raw.pressureRise[k]) || 1))]))
      : Object.fromEntries(keys.map((k, i) => [k, i === keys.length - 1 ? 0 : 1]));
  const winMax =
    raw.winMax && typeof raw.winMax === "object"
      ? Object.fromEntries(keys.map((k) => [k, Math.min(3, Math.max(0, Number(raw.winMax[k]) ?? 1))]))
      : Object.fromEntries(keys.map((k) => [k, 1]));
  const validTech = new Set(allTechIds());
  const suggested = (Array.isArray(raw.suggested) ? raw.suggested : [])
    .map(String)
    .filter((t) => validTech.has(t))
    .slice(0, 8);
  return {
    id,
    globalId,
    title: String(raw.title || "Local scenario").slice(0, 100),
    place: String(raw.place || "Local place").slice(0, 80),
    startYear: Number(raw.startYear) || GAME.startYear,
    collapseYear: Number(raw.collapseYear) || GAME.startYear + 8,
    yearsPerTurn: Number(raw.yearsPerTurn) || GAME.yearsPerTurn,
    pressure,
    pressureRise,
    winMax,
    scene: String(raw.scene || "").slice(0, 800),
    stakeholder: String(raw.stakeholder || "").slice(0, 120),
    suggested: suggested.length ? suggested : ["ai", "iot", "networks"],
    visionTheme: String(raw.visionTheme || "rebuild-city").slice(0, 40),
    source: raw.source === "curated" ? "curated" : "generated",
  };
}

async function renderMissions({ force = false } = {}) {
  const g = state.global;
  $("#mission-global-title").textContent = g ? g.title : "Local scenarios";
  $("#mission-global-blurb").textContent = g
    ? `${g.blurb} — several concrete places living a piece of this. Pick one to invent for.`
    : "Pick a concrete place.";
  const regenBtn = $("#btn-regen-scenarios");
  if (regenBtn) regenBtn.hidden = !g;

  if (!g) {
    state.missionChoices = [];
    paintMissionCards([]);
    setMissionStatus("");
    renderProblemBrief(null);
    return;
  }

  // Brief is static — show immediately so the learner can read during drafting
  renderProblemBrief(g, { drafting: true });

  const cached = !force && state.scenarioCache[g.id];
  const needsGenerate = force || !cached?.length;

  // Ready cache (last 4): clickable immediately — no network wait
  if (!needsGenerate) {
    const list = cached.slice(0, SCENARIO_COUNT);
    state.missionChoices = list;
    state.scenariosLoading = false;
    paintMissionCards(list, { disabled: false });
    renderProblemBrief(g, { drafting: false });
    const solvedN = list.filter((m) => isMissionSolved(m.id)).length;
    setMissionStatus(
      solvedN
        ? `${list.length} cached scenarios (${solvedN} solved — still playable). Generate new to replace the set.`
        : `${list.length} cached scenarios. Pick one, or generate a new set.`
    );
    if (regenBtn) {
      regenBtn.disabled = false;
      regenBtn.textContent = "Generate new scenarios";
    }
    return;
  }

  // Skeletons only while generating — avoid flashing placeholder plot lines
  // (e.g. "A deadline arrives in East Works") that get replaced by the AI set.
  state.missionChoices = [];
  state.scenariosLoading = true;
  paintMissionSkeletons(SCENARIO_COUNT);
  setMissionStatus(
    force ? "Generating a fresh set of local scenarios…" : "Drafting local scenarios…",
    { loading: true }
  );
  if (regenBtn) regenBtn.disabled = true;

  try {
    const list = await ensureScenarios(g, { force });
    if (state.global?.id !== g.id) return;
    state.missionChoices = list;
    paintMissionCards(list, { disabled: false });
    renderProblemBrief(g, { drafting: false });
    const curated = list.filter((m) => m.source === "curated").length;
    const gen = list.length - curated;
    const solvedN = list.filter((m) => isMissionSolved(m.id)).length;
    let msg = curated
      ? `${list.length} scenarios (${curated} curated · ${gen} generated). Pick a place to invent.`
      : `${list.length} local scenarios. Pick a place to invent.`;
    if (solvedN) msg += ` ${solvedN} already solved — you can play them again.`;
    if (force) msg = `New set ready (${list.length}). ` + msg;
    setMissionStatus(msg);
  } finally {
    if (state.global?.id === g.id) {
      state.scenariosLoading = false;
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.textContent = "Generate new scenarios";
      }
    }
  }
}

function startMission(mission) {
  if (state.scenariosLoading) {
    flashToast("Scenarios still drafting — wait a moment.");
    return;
  }
  if (!mission) return;
  state.mission = mission;
  state.global = globalById(mission.globalId) || state.global;
  state.year = mission.startYear;
  state.turn = 0;
  state.waits = 0;
  state.pressure = clonePressure(mission.pressure);
  state.selectedTechIds = [];
  state.learnOrder = [];
  state.inventionName = "";
  state.inventionHow = "";
  state.inventionImpact = "";
  state.storyFace = "how";
  state.challengePassed = false;
  state.challengeAngle = null;
  state.challengeText = "";
  state.challengeQuestion = "";
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVerdict = null;
  state.challengeFails = 0;
  state.hadChallengeAttempt = false;
  state.lastChallengeVerdict = null;
  state.domainFilter = "all";
  state.sideTab = "vision";
  state.lastNews = "";
  state.waitReport = "";
  state.outcome = null;
  state.runReport = null;
  state.aiTiming = null;
  state.timingLevelAtDeploy = null;
  state.apMax = GAME.apMax ?? 3;
  state.ap = state.apMax;
  state.apSpentThisTurn = 0;
  state.writeCommitsThisTurn = 0;
  state.learnOpenedThisTurn = false;
  state.turnPhase = "act";
  state.pendingAi = null;
  state.lastWriteSnapshot = { name: "", how: "", impact: "" };
  state.budget = GAME.startingBudget ?? 5;
  state.will = GAME.startingWill ?? 3;
  state.techAddedThisTurn = {};
  state.scrutiny = null;
  state.elegancePivotPenalty = false;
  state.scrutinyMoveMode = null;
  resetDeployBayState();
  if (state.vision) state.vision.newSession();
  showScreen("workshop");
  state.coInventor?.onChallengeStart?.();
  // Seed co-inventor welcome with mission context
  if (state.coInventor) {
    state.coInventor.reset(false);
    state.coInventor.pushAssistant(
      {
        message:
          `**${mission.place}**, ${mission.startYear}. ${mission.scene}\n\n` +
          `I'm your co-inventor. Pick any tech stack that fits **this place** — categories are never locked by year. ` +
          `Feasibility (red/yellow/green) judges whether your *how it works* over-claims what is possible this year.\n\n` +
          `Use **Art of the possible** for milestones, current capabilities, and use cases. ` +
          `**Wait** advances the world (+${mission.yearsPerTurn || GAME.yearsPerTurn} years) and raises crisis — not to unlock cards.\n\n` +
          `What's the first constraint you care about — cost, trust, speed, or who's left out?`,
        proposals: emptyProps(),
        teaching: [],
      },
      { local: true }
    );
  }
}

function emptyProps() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };
}

/* —— Workshop —— */
function renderWorkshop() {
  const m = state.mission;
  const g = state.global || globalById(m.globalId);
  $("#ws-global-label").textContent = g ? `Global · ${g.title}` : "Mission";
  $("#ws-mission-title").textContent = m.title;
  $("#ws-mission-place").textContent = `${m.place}`;
  $("#ws-mission-scene").textContent = m.scene;
  $("#ws-stakeholder").textContent = m.stakeholder ? `Stakeholder: ${m.stakeholder}` : "";

  // Compact crisis HUD: full copy lives on title + Help (?)
  const crisisWrap = $("#hud-crisis-wrap");
  if (crisisWrap) {
    crisisWrap.title =
      `Crisis meters 0–5: how bad things are. Wait raises them; Deploy after a challenge lowers them. ` +
      `Hit 5 on any meter or year ${m.collapseYear} and the mission ends. Open ? for more.`;
  }

  const wr = $("#wait-report");
  if (wr) {
    if (state.waitReport) {
      wr.hidden = false;
      wr.innerHTML = state.waitReport;
    } else wr.hidden = true;
  }

  $("#invention-name").value = state.inventionName;
  $("#prompt-tip").textContent = tips()[state.turn % tips().length];

  renderHud();
  renderFilters();
  renderTechList();
  renderSelectedChips();
  renderSynergy();
  renderTiming();
  renderStoryFaceUI();
  syncHiddenStoryFields();
  renderFeasibility();
  updateLearnButton();
  updateChallengeButton();
  renderWorkshopDeployBay();
  ensureCoInventor();
}

/** Banner on invent when deploy is unlocked (return to invent is cosmetic). */
function renderWorkshopDeployBay() {
  const el = $("#deploy-bay-workshop");
  const status = $("#deploy-bay-workshop-status");
  if (!el) return;
  if (!deployStagesEnabled() || !state.deployUnlocked) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const next = nextDeployStageAction();
  if (status) {
    status.textContent = next
      ? `Deploy bay open · next: ${next.replace("_", " ")}. Crisis pool −${state.stagedDropRemaining}/${state.stagedDropPool} left. Wait is blocked.`
      : "Deploy stages finished.";
  }
  // Challenge entry becomes "back to deploy" once unlocked
  const btn = $("#btn-to-challenge");
  if (btn && state.challengePassed) {
    btn.disabled = false;
    btn.textContent = "Back to deploy bay →";
    btn.title = "Deploy is unlocked — no re-challenge needed";
  }
}

function playerStoryText() {
  return state.storyFace === "life" ? state.inventionImpact : state.inventionHow;
}

function companionStoryText() {
  return state.storyFace === "life" ? state.inventionHow : state.inventionImpact;
}

function setPlayerStoryText(text) {
  if (state.storyFace === "life") state.inventionImpact = text;
  else state.inventionHow = text;
}

function setCompanionStoryText(text) {
  if (state.storyFace === "life") state.inventionHow = text;
  else state.inventionImpact = text;
}

function syncStoryFieldsFromDom() {
  const howEl = $("#invention-how");
  const impEl = $("#invention-impact");
  if (howEl) state.inventionHow = howEl.value;
  if (impEl) state.inventionImpact = impEl.value;
}

function syncStoryFieldsToDom() {
  const howEl = $("#invention-how");
  const impEl = $("#invention-impact");
  if (howEl && howEl.value !== state.inventionHow) howEl.value = state.inventionHow;
  if (impEl && impEl.value !== state.inventionImpact) impEl.value = state.inventionImpact;
}

/** @deprecated alias — keep callers working */
function syncHiddenStoryFields() {
  syncStoryFieldsToDom();
}

/**
 * How it works + Everyday life — both always editable.
 * One "Fill other side" button is moved into the focused face header;
 * AI drafts the opposite face from that focus.
 */
function placeFillOtherButton(face) {
  const btn = $("#btn-fill-other");
  const header = face === "life" ? $("#header-life") : $("#header-how");
  if (!btn || !header) return;
  header.appendChild(btn);
  btn.hidden = false;
}

/**
 * How it works + Everyday life — both always editable.
 * Focus toggle (exclusive) marks which face owns the single "Fill other side" button;
 * AI drafts the opposite face from that focus.
 */
function renderStoryFaceUI() {
  const face = state.storyFace === "life" ? "life" : "how";
  state.storyFace = face;

  $$(".story-mode-btn").forEach((btn) => {
    const on = btn.dataset.face === face;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });

  const fieldHow = $("#field-how");
  const fieldLife = $("#field-life");
  const labelHow = $("#label-how");
  const labelLife = $("#label-life");
  const howArea = $("#invention-how");
  const lifeArea = $("#invention-impact");
  const noteHow = $("#note-how");
  const noteLife = $("#note-life");
  const hint = $("#story-mode-hint");

  if (howArea) {
    howArea.value = state.inventionHow;
    howArea.readOnly = false;
    howArea.placeholder = "What acts, what decides, how the pieces connect for *this* place…";
  }
  if (lifeArea) {
    lifeArea.value = state.inventionImpact;
    lifeArea.readOnly = false;
    lifeArea.placeholder = "A Tuesday here after your invention lands…";
  }
  if (labelHow) labelHow.textContent = "How does it work?";
  if (labelLife) labelLife.textContent = "Everyday life if it works";

  const setRole = (field, role) => {
    if (!field) return;
    const pending = field.classList.contains("is-ai-pending");
    field.classList.remove("is-focus", "is-other", "is-player", "is-companion", "is-both");
    field.classList.add(`is-${role}`);
    if (pending) field.classList.add("is-ai-pending");
  };

  // Single button lives on the focused header only
  placeFillOtherButton(face);

  if (face === "how") {
    setRole(fieldHow, "focus");
    setRole(fieldLife, "other");
    if (noteHow) {
      noteHow.hidden = false;
      noteHow.textContent = "Focus: write the mechanism. Fill other side drafts everyday life.";
    }
    if (noteLife) {
      noteLife.hidden = !state.inventionImpact.trim();
      noteLife.textContent = state.inventionImpact.trim()
        ? "Editable anytime — can be AI draft or your own words."
        : "";
    }
    if (hint) {
      hint.innerHTML =
        "Both boxes stay editable. <strong>Fill other side</strong> is on How it works and drafts Everyday life.";
    }
  } else {
    setRole(fieldHow, "other");
    setRole(fieldLife, "focus");
    if (noteLife) {
      noteLife.hidden = false;
      noteLife.textContent = "Focus: write everyday life. Fill other side drafts how it works.";
    }
    if (noteHow) {
      noteHow.hidden = !state.inventionHow.trim();
      noteHow.textContent = state.inventionHow.trim()
        ? "Editable anytime — can be AI draft or your own words."
        : "";
    }
    if (hint) {
      hint.innerHTML =
        "Both boxes stay editable. <strong>Fill other side</strong> is on Everyday life and drafts How it works.";
    }
  }
}

function hasPlayerFace() {
  return playerStoryText().trim().length >= 20;
}

function hasCompanionFace() {
  return companionStoryText().trim().length >= 20;
}

function timingCacheKey() {
  const how = state.inventionHow.trim().slice(0, 240);
  return `${state.year}|${state.selectedTechIds.join(",")}|${how}`;
}

/**
 * Feasibility assessment (traffic light) — timing scores CLAIMS, not card locks.
 * red = cannot go to challenge; yellow = risky but allowed; green = solid.
 */
function assessFeasibility() {
  const techs = selectedTechs();
  const year = state.year;
  const dims = [];

  // Timing — how-it-works vs year (AI override when fresh)
  let timingLevel = "red";
  let timingNote = "Add technologies, then write how it works — timing judges claims, not category cards.";
  if (techs.length) {
    const key = timingCacheKey();
    if (state.aiTiming?.forKey === key && state.aiTiming.level) {
      timingLevel = state.aiTiming.level;
      timingNote = state.aiTiming.reason || "AI timing assess.";
    } else {
      const how = state.inventionHow.trim() || state.inventionImpact.trim();
      const stretch = detectClaimStretch(how, techs, year);
      timingLevel = stretch.level;
      timingNote = stretch.reason;
    }
    if (timingLevel === "green") {
      const yearsWaited = year - (state.mission?.startYear || GAME.startYear);
      if (yearsWaited >= 6 && maxPressure() >= 3) {
        timingLevel = "yellow";
        timingNote = `Claims look near-term, but you've waited until ${year} with rising crisis. Timing is tight.`;
      }
    }
  }
  dims.push({ id: "timing", name: "Timing", level: timingLevel, note: timingNote });

  // Story completeness
  let storyLevel = "red";
  let storyNote = "Need a name plus both story faces (write them, or fill one and use Fill other side).";
  const named = state.inventionName.trim().length >= 2;
  const howOk = state.inventionHow.trim().length >= 20;
  const lifeOk = state.inventionImpact.trim().length >= 20;
  if (named && howOk && lifeOk) {
    const len = (state.inventionHow + state.inventionImpact).trim().length;
    storyLevel = len >= 120 ? "green" : "yellow";
    storyNote =
      storyLevel === "green"
        ? "Story faces are filled with enough detail to challenge."
        : "Both faces exist but are thin — a clearer mechanism will help under attack.";
  } else if (named && (howOk || lifeOk)) {
    storyLevel = "yellow";
    storyNote = "One face is started — still need the other (write it or Fill other side).";
  } else if (howOk || lifeOk || named) {
    storyLevel = "red";
    storyNote = "Incomplete: name + how it works + everyday life.";
  }
  dims.push({ id: "story", name: "Story", level: storyLevel, note: storyNote });

  // Local fit — suggested techs for this mission
  let fitLevel = "yellow";
  let fitNote = "No stack yet — mission suggestions appear with a gold edge.";
  if (techs.length) {
    const suggested = new Set(state.mission?.suggested || []);
    const hits = techs.filter((t) => suggested.has(t.id)).length;
    if (hits === 0 && suggested.size) {
      fitLevel = "yellow";
      fitNote = "None of the mission's suggested techs are in your stack — can still work, but check local fit.";
    } else if (hits >= 2 || (hits >= 1 && techs.length === 1)) {
      fitLevel = "green";
      fitNote = `Local fit: ${hits} suggested tech${hits === 1 ? "" : "s"} for this place.`;
    } else {
      fitLevel = "green";
      fitNote = "Stack may fit — gold-edge techs are hints, not requirements.";
    }
  } else {
    fitLevel = "red";
  }
  dims.push({ id: "fit", name: "Local fit", level: fitLevel, note: fitNote });

  // Resources (G2) — at most yellow, never hard-blocks challenge alone
  if (budgetWillEnabled()) {
    const b = state.budget ?? 0;
    const w = state.will ?? 0;
    let resLevel = "green";
    let resNote = `Budget ${b} · political will ${w}.`;
    if (b === 0 && w === 0) {
      resLevel = "yellow";
      resNote = "Out of Budget and will — stack is fixed unless you Wait/End turn and lobby later.";
    } else if (b <= 1 || w <= 1) {
      resLevel = "yellow";
      resNote = `Thin capital (Budget ${b}, will ${w}) — lobby or clear a challenge for more.`;
    }
    dims.push({ id: "resources", name: "Resources", level: resLevel, note: resNote });
  }

  // Stack shape (soft — never a hard red unless empty)
  let stackLevel = "red";
  let stackNote = "Add at least one technology.";
  if (techs.length === 1) {
    stackLevel = "yellow";
    stackNote = "Single-tech focus is fine if the mechanism is clear for this crisis.";
  } else if (techs.length >= 2) {
    const domains = domainsInStack(techs);
    stackLevel = "green";
    stackNote =
      domains.length >= 2
        ? `Cross-domain mix (${domains.map((d) => DOMAINS[d]?.label || d).join(" + ")}).`
        : `${techs.length} techs in ${DOMAINS[domains[0]]?.label || "one"} domain.`;
  }
  dims.push({ id: "stack", name: "Stack", level: stackLevel, note: stackNote });

  // Overall: any critical red → red; else any yellow → yellow; else green
  const levels = dims.map((d) => d.level);
  // Timing red or no techs or incomplete story that blocks = red
  let overall = "green";
  if (levels.includes("red")) overall = "red";
  else if (levels.includes("yellow")) overall = "yellow";

  const summaries = {
    red: "Not ready for the challenge yet — fix red items (story, stack, or over-claim timing).",
    yellow: "Risky but challengeable — you can proceed; strengthen weak spots if you can.",
    green: "Looks feasible for this year and place — face the challenge when you're ready.",
  };

  return {
    overall,
    summary: summaries[overall],
    dims,
    canChallenge: overall !== "red" && !collapsed(),
  };
}

function inventReadyForChallenge() {
  return assessFeasibility().canChallenge;
}

function renderFeasibility() {
  const box = $("#feasibility");
  if (!box) return;
  const f = assessFeasibility();
  const light = $("#feasibility-light");
  const label = $("#feasibility-level-label");
  const summary = $("#feasibility-summary");
  const dims = $("#feasibility-dims");
  const foot = $("#feasibility-foot");
  if (light) light.dataset.level = f.overall;
  if (label) label.textContent = f.overall;
  if (summary) summary.textContent = f.summary;
  if (dims) {
    dims.innerHTML = f.dims
      .map(
        (d) =>
          `<li><span class="dot ${d.level}"></span><span class="dim-name">${escapeHtml(
            d.name
          )}</span><span>${escapeHtml(d.note)}</span></li>`
      )
      .join("");
  }
  if (foot) {
    foot.textContent =
      f.overall === "red"
        ? "Green or yellow to face the challenge. Timing red usually means the how-it-works over-claims what is possible this year — revise claims or use Art of the possible."
        : "Any emTech category is pickable. Timing judges whether your how-it-works over-claims the present.";
  }
}

function renderHud() {
  $("#hud-year").textContent = String(state.year);
  const waitsBit = state.waits ? ` · waits ${state.waits}` : "";
  $("#hud-turn").textContent = `Turn ${state.turn}${waitsBit} · fail at ${state.mission.collapseYear}`;
  const apEl = $("#hud-ap");
  if (apEl) {
    if (apEnabled()) {
      apEl.hidden = false;
      apEl.textContent = `AP ${state.ap ?? 0}/${state.apMax ?? GAME.apMax ?? 3}`;
      apEl.title = "Action points this invent turn. Wait burns leftover AP; End Turn refills.";
    } else {
      apEl.hidden = true;
    }
  }
  const budgetEl = $("#hud-budget");
  if (budgetEl) {
    if (budgetWillEnabled()) {
      budgetEl.hidden = false;
      budgetEl.textContent = `Budget ${state.budget ?? 0}`;
      budgetEl.title = "Capital to add technologies. Lobby spends 1 for political will.";
    } else {
      budgetEl.hidden = true;
    }
  }
  const willEl = $("#hud-will");
  if (willEl) {
    if (budgetWillEnabled()) {
      willEl.hidden = false;
      willEl.textContent = `Will ${state.will ?? 0}`;
      willEl.title =
        "Political will (not a crisis meter). ≥4 boosts deploy drop; 0 hurts it. Lobby raises will.";
    } else {
      willEl.hidden = true;
    }
  }
  const lobbyBtn = $("#btn-lobby");
  if (lobbyBtn) {
    lobbyBtn.hidden = !budgetWillEnabled();
    if (budgetWillEnabled()) {
      const can =
        (!apEnabled() || (state.ap ?? 0) >= 1) && (state.budget ?? 0) >= 1;
      lobbyBtn.disabled = !can;
    }
  }
  const box = $("#hud-pressure");
  box.innerHTML = Object.entries(state.pressure)
    .map(([k, v]) => {
      const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
      return `<span class="meter ${level}" title="${escapeHtml(k)}: how bad this part of the local crisis is (0–5). Wait raises it; Deploy lowers it."><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(Math.max(0, 5 - v))}</span>`;
    })
    .join("");
  // step pills
  $$(".invent-steps .pill").forEach((p) => {
    const step = p.dataset.step;
    p.classList.toggle("active", step === "invent" && state.screen === "workshop");
    p.classList.toggle("done", step === "invent" && state.screen !== "workshop");
  });
  updateWaitPreview();
  updateEndTurnButton();
}

function renderFilters() {
  const row = $("#filter-row");
  const keys = ["all", ...Object.keys(DOMAINS)];
  row.innerHTML = keys
    .map((d) => {
      const label = d === "all" ? "All" : DOMAINS[d].label;
      const active = state.domainFilter === d ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-domain="${d}">${label}</button>`;
    })
    .join("");
  row.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.domainFilter = btn.dataset.domain;
      renderFilters();
      renderTechList();
    });
  });
}

function renderTechList() {
  const suggested = new Set(state.mission?.suggested || []);
  let list = [...TECHS];
  if (state.domainFilter !== "all") list = list.filter((t) => t.domain === state.domainFilter);
  list.sort((a, b) => {
    const ar = suggested.has(a.id) ? 0 : 1;
    const br = suggested.has(b.id) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });

  const el = $("#tech-list");
  el.innerHTML = list
    .map((t) => {
      const sel = state.selectedTechIds.includes(t.id);
      const sug = suggested.has(t.id);
      const color = DOMAINS[t.domain]?.color || "#94a3b8";
      const nowCap = t.useCasesNow?.[0] || t.maturity?.now || t.summary;
      const cost = budgetWillEnabled() ? techCost(t) : null;
      const costBit =
        cost && !sel
          ? ` · ¤${cost.budget}${cost.will ? ` · will ${cost.will}` : ""}`
          : "";
      const costTitle = cost
        ? ` | Cost: Budget ${cost.budget}${cost.will ? `, Will ${cost.will}` : ""}${
            cost.frontierRisk ? `, frontier risk ${cost.frontierRisk}` : ""
          }`
        : "";
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${sug ? "recommended" : ""}"
          data-id="${t.id}" style="--domain:${color}" title="${escapeHtml(nowCap)}${escapeHtml(costTitle)}">
          <span class="tech-icon">${t.icon}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${DOMAINS[t.domain]?.label || t.domain}${
              sug ? " · suggested" : ""
            }${costBit}</span>
          </span>
          <span class="tech-add">${sel ? "✓" : "+"}</span>
        </button>`;
    })
    .join("");

  el.querySelectorAll(".tech-card").forEach((btn) => {
    btn.addEventListener("click", () => onTechClick(btn.dataset.id));
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openTechModal(btn.dataset.id);
    });
  });
}

function pushLearnOrder(id) {
  state.learnOrder = state.learnOrder.filter((x) => x !== id);
  state.learnOrder.unshift(id);
}

function removeFromLearnOrder(id) {
  state.learnOrder = state.learnOrder.filter((x) => x !== id);
}

/** Keep learnOrder in sync if stack changes from elsewhere (e.g. co-inventor) */
function syncLearnOrderWithSelection() {
  const selected = new Set(state.selectedTechIds);
  state.learnOrder = state.learnOrder.filter((id) => selected.has(id));
  for (const id of state.selectedTechIds) {
    if (!state.learnOrder.includes(id)) state.learnOrder.push(id);
  }
}

function updateLearnButton() {
  const btn = $("#btn-learn-tech");
  if (!btn) return;
  const n = state.selectedTechIds.length;
  btn.disabled = n === 0;
  btn.title =
    n === 0
      ? "Select techs in your stack to learn about them"
      : n === 1
        ? "Learn about the selected tech"
        : `Learn about ${n} selected techs (newest first)`;
  btn.textContent = n > 1 ? `Learn (${n})` : "Learn";
}

function onTechClick(id) {
  const idx = state.selectedTechIds.indexOf(id);
  if (idx >= 0) {
    const r = dispatchSim("deselect_tech", { techId: id });
    if (!r.ok) return;
    removeFromLearnOrder(id);
  } else {
    if (state.selectedTechIds.length >= 8) {
      flashToast("Stack full (8). Remove one first.");
      return;
    }
    const r = dispatchSim("select_tech", { techId: id, tech: techById(id) });
    if (!r.ok) {
      if (r.error === "no_ap") flashToast("No AP left — End Turn or Wait.");
      else if (r.error === "no_budget") flashToast("Not enough Budget for that tech.");
      else if (r.error === "no_will") flashToast("Not enough Political will for that tech.");
      else if (r.error === "stack full") flashToast("Stack full.");
      return;
    }
    // dispatch already pushed id via slice — ensure learn order
    if (!state.learnOrder.includes(id)) pushLearnOrder(id);
  }
  state.aiTiming = null;
  renderTechList();
  renderSelectedChips();
  renderSynergy();
  renderTiming();
  renderFeasibility();
  updateLearnButton();
  updateChallengeButton();
  updateVision();
  renderHud();
  scheduleAiTimingAssess();
}

function renderSelectedChips() {
  const box = $("#selected-techs");
  const techs = selectedTechs();
  if (!techs.length) {
    box.innerHTML = `<span class="empty-hint">Click technologies to add them to your invention.</span>`;
    return;
  }
  box.innerHTML = techs
    .map(
      (t) =>
        `<span class="tech-chip">${t.icon} ${escapeHtml(t.name)}<button type="button" data-remove="${t.id}">×</button></span>`
    )
    .join("");
  box.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => onTechClick(b.dataset.remove))
  );
}

function renderSynergy() {
  const box = $("#synergy-box");
  const techs = selectedTechs();
  const domains = domainsInStack(techs);
  const pairs = computeSynergies(techs);
  if (!techs.length) {
    box.innerHTML = `Pick tech that fits the local problem. Crossing domains can strengthen a solution — only when it makes sense.`;
    return;
  }
  const dropInfo = computeDeployDrop({
    techs,
    domains,
    pairs,
    inventionHow: state.inventionHow,
    inventionImpact: state.inventionImpact,
    challengeVerdict: state.challengeVerdict,
    challengeAnswer: state.challengeAnswer,
    suggested: state.mission?.suggested || [],
    will: state.will,
    budgetWill: budgetWillEnabled(),
  });
  const dropNote = `<div class="deploy-drop-preview muted">Deploy crisis drop preview: <strong>−${dropInfo.drop}</strong>${
    pairs.length
      ? " · elegance scores each synergy pair; drop only needs one pair for +1"
      : ""
  }${
    budgetWillEnabled()
      ? ` · will ${state.will ?? 0}${(state.will ?? 0) >= 4 ? " (mandate +1)" : (state.will ?? 0) === 0 ? " (no mandate −1)" : ""}`
      : ""
  }</div>`;
  if (techs.length === 1) {
    box.innerHTML = `Stack: <strong>${escapeHtml(techs[0].name)}</strong> (${DOMAINS[domains[0]]?.label || domains[0]}). A single tool can be enough if the mechanism is clear.${dropNote}`;
    return;
  }
  const pairText = pairs.length
    ? ` Synergies: ${pairs.map(([a, b]) => `${techById(a).name} × ${techById(b).name}`).join(" · ")}.`
    : "";
  if (domains.length >= 2) {
    box.innerHTML = `<strong>Cross-domain mix:</strong> ${domains
      .map((d) => DOMAINS[d]?.label || d)
      .join(" + ")}.${pairText}${dropNote}`;
  } else {
    box.innerHTML = `Stack in <strong>${DOMAINS[domains[0]]?.label}</strong> (${techs.length} techs).${pairText} Fine to deploy — add another domain only if you need it.${dropNote}`;
  }
}

function renderTiming() {
  const box = $("#timing-box");
  const techs = selectedTechs();
  const step = state.mission?.yearsPerTurn || GAME.yearsPerTurn;
  const nextYear = state.year + step;
  if (!techs.length) {
    box.innerHTML = `Year <strong>${state.year}</strong>. Pick any emTech category. Feasibility judges whether your <em>how it works</em> over-claims this year. <strong>Wait</strong> advances the world (and crisis) if you want later conditions.`;
    return;
  }
  const stretch = detectClaimStretch(
    state.inventionHow.trim() || state.inventionImpact.trim(),
    techs,
    state.year
  );
  box.innerHTML = `Year <strong>${state.year}</strong> · timing signal: <strong>${stretch.level}</strong> — ${escapeHtml(
    stretch.reason
  )} Use <strong>Art of the possible</strong> on the co-inventor for milestones & capabilities. Wait → ${nextYear} raises crisis.`;
}

function challengeBlockReason() {
  const f = assessFeasibility();
  if (collapsed()) return "Too late — mission collapsed.";
  if (f.overall === "red") {
    const reds = f.dims.filter((d) => d.level === "red");
    if (reds.length) return `Feasibility red: ${reds.map((d) => d.note).join(" · ")}`;
    return f.summary;
  }
  return "";
}

function updateChallengeButton() {
  const btn = $("#btn-to-challenge");
  if (!btn) return;
  // Deploy bay open — no re-scrutiny; button is a return path
  if (deployStagesEnabled() && state.deployUnlocked) {
    btn.disabled = false;
    btn.textContent = "Back to deploy bay →";
    btn.title = "Deploy is unlocked — no re-challenge needed";
    const hint = $("#challenge-ready-hint");
    if (hint) {
      const next = nextDeployStageAction();
      hint.textContent = next
        ? `Deploy bay open · next stage: ${next.replace("_", " ")}.`
        : "Deploy stages finished.";
      hint.className = "challenge-ready-hint ready";
    }
    return;
  }
  btn.textContent = "Face the challenge →";
  renderFeasibility();
  const f = assessFeasibility();
  const reason = challengeBlockReason();
  const ok = f.canChallenge;
  btn.disabled = !ok;
  btn.title = ok
    ? f.overall === "yellow"
      ? "Feasibility yellow — you can still face the challenge"
      : "Feasibility green — face a random challenge next"
    : reason;
  const hint = $("#challenge-ready-hint");
  if (hint) {
    if (ok) {
      hint.textContent =
        f.overall === "green"
          ? "Feasibility green — face the challenge when ready."
          : "Feasibility yellow — risky but allowed. Challenge next.";
      hint.className = "challenge-ready-hint ready";
    } else {
      hint.textContent = reason;
      hint.className = "challenge-ready-hint blocked";
    }
  }
}

/* —— Wait / Challenge / Deploy —— */
function updateWaitPreview() {
  const el = $("#wait-preview");
  if (!el || !state.mission) return;
  const m = state.mission;
  const rise = m.pressureRise || {};
  const next = previewPressureAfterWait(state.pressure, rise);
  const step = m.yearsPerTurn || GAME.yearsPerTurn;
  const nextYear = state.year + step;
  const yearsLeft = Math.max(0, m.collapseYear - nextYear);
  const line = Object.keys(state.pressure)
    .map((k) => {
      const a = state.pressure[k] ?? 0;
      const b = next[k] ?? 0;
      const hot = b >= 4 ? " class=\"bad\"" : "";
      return `<span${hot}>${escapeHtml(k)} ${a}→${b}</span>`;
    })
    .join(" · ");
  el.hidden = false;
  el.innerHTML = `<strong>If you Wait</strong> → year <strong>${nextYear}</strong> · crisis ${line}. ${
    yearsLeft === 0 ? "Next Wait may hit fail year." : `${yearsLeft} year(s) of buffer after that Wait.`
  } Unspent AP are burned.`;
}

function updateEndTurnButton() {
  const btn = $("#btn-end-turn");
  if (!btn) return;
  if (!apEnabled()) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  const can =
    (state.apSpentThisTurn || 0) >= 1 ||
    state.turnPhase === "scrutiny" ||
    state.turnPhase === "between_stages";
  btn.disabled = !can;
  btn.title = can
    ? "Refill AP without advancing the calendar or crisis"
    : "Spend AP on an action first, or Wait";
}

function endTurn() {
  // Allow end turn on challenge if AP was spent (scrutiny/AI) even with full bar edge cases
  if (apEnabled() && (state.apSpentThisTurn || 0) < 1 && (state.ap ?? 0) >= (state.apMax ?? 3)) {
    // force allow if phase is scrutiny (player may have entered with AP spend already counted)
    if (state.turnPhase !== "scrutiny" && state.screen !== "challenge-step") {
      flashToast("Do something this turn, or Wait.");
      return;
    }
  }
  // If on challenge with spent AP, patch spent counter so sim accepts end_turn
  if (
    apEnabled() &&
    (state.apSpentThisTurn || 0) < 1 &&
    state.screen === "challenge-step" &&
    (state.ap ?? 0) < (state.apMax ?? 3)
  ) {
    state.apSpentThisTurn = 1;
  }
  const r = dispatchSim("end_turn");
  if (!r.ok) {
    if (r.error === "end_turn_noop") {
      // On challenge, allow refill after any partial spend
      if (state.screen === "challenge-step" && (state.ap ?? 0) < (state.apMax ?? 3)) {
        state.ap = state.apMax ?? 3;
        state.apSpentThisTurn = 0;
        state.writeCommitsThisTurn = 0;
        flashToast(`End turn · AP refilled (${state.ap})`);
        renderChallengeHud();
        return;
      }
      flashToast("Do something this turn, or Wait.");
    }
    return;
  }
  flashToast(`End turn · AP refilled (${state.ap})`);
  if (state.screen === "challenge-step") {
    renderChallengeHud();
    return;
  }
  renderWorkshop();
}

function lobbyAction() {
  if (!budgetWillEnabled()) return;
  const r = dispatchSim("lobby");
  if (!r.ok) {
    if (r.error === "no_ap") flashToast("No AP — End Turn or Wait.");
    else if (r.error === "no_budget") flashToast("Need 1 Budget to lobby.");
    else flashToast("Cannot lobby now.");
    return;
  }
  flashToast(`Lobbied · Budget ${state.budget} · Will ${state.will}`);
  renderWorkshop();
}

function waitTurn() {
  if (collapsed()) {
    finishOutcome("collapse");
    return;
  }
  if (state.turnPhase === "scrutiny" || state.turnPhase === "between_stages") {
    flashToast(
      state.deployUnlocked
        ? "Wait is blocked while the deploy bay is open — finish stages or hold the line."
        : "Finish or abandon the challenge before Waiting."
    );
    return;
  }
  const m = state.mission;
  const prevYear = state.year;
  const prevPressure = clonePressure(state.pressure);

  const techsNow = selectedTechs();
  const stretch = detectClaimStretch(
    state.inventionHow.trim() || state.inventionImpact.trim(),
    techsNow,
    state.year
  );
  const r = dispatchSim("wait", {
    mission: m,
    techs: techsNow,
    stretchLevel: stretch.level,
    riskSeed: `${m.id}:${(state.waits || 0) + 1}:${(state.turn || 0) + 1}`,
  });
  if (!r.ok) {
    flashToast(r.error || "Cannot Wait now.");
    return;
  }

  // Soft horizon: categories whose "near" use cases often get more common
  const horizonShift = TECHS.filter((t) => t.readyYear > prevYear && t.readyYear <= state.year);
  const news = newsForYear(state.year);
  const horizon =
    horizonShift.length > 0
      ? `Near-scale use cases get more common for: ${horizonShift.map((t) => t.name).join(", ")} (still always pickable)`
      : "World conditions moved; categories stay pickable — re-check claim timing";
  const crisisLine = Object.keys(state.pressure)
    .map((k) => `${k} ${prevPressure[k]}→${state.pressure[k]}`)
    .join(" · ");

  const riskEv = (r.events || []).find((e) => e.type === "frontier_risk");
  const riskLine = riskEv
    ? `<br/><span class="bad">Frontier risk:</span> hype spiked <strong>${escapeHtml(riskEv.meter)}</strong> +1.`
    : "";

  state.waitReport = `<strong>→ ${state.year}</strong> (Wait from ${prevYear}; waits ${state.waits})<br/>
    <span class="ok">Capability horizon:</span> ${escapeHtml(horizon)}<br/>
    <span class="bad">Crisis rose:</span> ${escapeHtml(crisisLine)}${riskLine}<br/>
    <span class="muted">${escapeHtml(news)}</span>`;
  state.lastNews = `→ ${state.year}. ${horizon}. Crisis tightened. ${news}`.trim();
  state.aiTiming = null; // re-evaluate claims in new year

  if (collapsed()) {
    renderWorkshop();
    finishOutcome("collapse");
    return;
  }

  flashToast(`Clock → ${state.year} · crisis rose · AP refilled`);
  renderWorkshop();
  updateVision({ immediate: true });
  scheduleAiTimingAssess();
  state.coInventor?.pushAssistant?.(
    {
      message:
        state.lastNews +
        "\n\nYou waited for later world conditions. Crisis meters went up. Refine claims or face the challenge when ready.",
      proposals: emptyProps(),
      teaching: horizonShift.slice(0, 2).map((t) => ({
        techId: t.id,
        blurb: t.maturity?.near || t.summary,
      })),
    },
    { local: true }
  );
}

function pickChallengeAngle() {
  const used = state.challengeAngle;
  const pool = CHALLENGE_ANGLES.filter((a) => a.id !== used);
  const list = pool.length ? pool : CHALLENGE_ANGLES;
  return list[Math.floor(Math.random() * list.length)];
}

function localPose(angle) {
  const place = state.mission?.place || "here";
  const name = state.inventionName || "this invention";
  if (angle.id === "nature") {
    return {
      speech: `Mother Nature, ${place}: “${name} still runs on energy, materials, and waste. Storms, heat, and scarcity do not negotiate with your pitch.”`,
      question: "What breaks first when the natural world pushes back — and how does the design absorb a bad week?",
    };
  }
  if (angle.id === "ethicist") {
    return {
      speech: `The Ethicist, ${place}: “${name} forces a choice you cannot optimize away. Someone’s dignity, privacy, or opportunity is on the line — and both sides have a point.”`,
      question: "Name the hardest ethical tradeoff. Who is harmed either way — and what constraint do you refuse to cross?",
    };
  }
  if (angle.id === "stakeholder") {
    return {
      speech: `The Stakeholder, ${place}: “I am the mayor, the clinic board, and the neighborhood meeting. Someone must sign, fund, and defend ${name} in public — or it dies as a pilot photo.”`,
      question: "Who must say yes, who pays year 1 and year 5, and how do you win public support without pricing people out?",
    };
  }
  return {
    speech: `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design — that is how the system plays.”`,
    question: "What stops defection when neighbors or vendors can freeride — name the game mechanic you change?",
  };
}

function setChallengerVisual(angle) {
  const wrap = $("#challenger-visual");
  const img = $("#challenger-portrait");
  const nameEl = $("#challenger-name");
  if (!wrap || !img) return;
  const a = angle || CHALLENGE_ANGLES.find((x) => x.id === state.challengeAngle);
  if (!a) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  wrap.dataset.challenger = a.id;
  img.src = a.visual || `assets/challengers/${a.id}.jpg`;
  img.alt = `${a.label}, challenger`;
  if (nameEl) nameEl.textContent = a.label;
}

async function apiCoInvent(mode, userContent, extra = {}) {
  const res = await fetch("/api/co-invent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      messages: [{ role: "user", content: userContent }],
      context: {
        challenge: state.mission
          ? {
              id: state.mission.id,
              title: state.mission.title,
              problem: state.mission.scene,
              recommended: state.mission.suggested,
            }
          : null,
        selectedTechIds: [...state.selectedTechIds],
        inventionName: state.inventionName,
        inventionHow: state.inventionHow,
        inventionImpact: state.inventionImpact,
        storyFace: state.storyFace,
        year: state.year,
        place: state.mission?.place,
        pressure: state.pressure,
        availableTechs: TECHS.map((t) => techForAi(t, state.year)),
        ...extra,
      },
    }),
  });
  return res.json();
}

/** Debounced AI timing assess — feeds state.aiTiming into feasibility light */
let _aiTimingTimer = null;
function scheduleAiTimingAssess() {
  clearTimeout(_aiTimingTimer);
  _aiTimingTimer = setTimeout(() => {
    runAiTimingAssess().catch(() => {});
  }, 1600);
}

async function runAiTimingAssess() {
  const techs = selectedTechs();
  if (!techs.length) return;
  const how = state.inventionHow.trim();
  if (how.length < 40) return;
  const key = timingCacheKey();
  if (state.aiTiming?.forKey === key) return;
  try {
    const data = await apiCoInvent("assess-feasibility", "[Assess claim timing]", {});
    const level = data.timing?.level || data.timingLevel;
    const reason = data.timing?.reason || data.timingNote || data.message;
    if (level && ["red", "yellow", "green"].includes(level)) {
      state.aiTiming = {
        level,
        reason: String(reason || "").slice(0, 400),
        forKey: key,
      };
      renderFeasibility();
      renderTiming();
      updateChallengeButton();
    }
  } catch {
    /* client heuristic remains */
  }
}

async function enterChallenge() {
  if (!inventReadyForChallenge()) {
    flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
    return;
  }
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVerdict = null;
  state.challengePassed = false;
  if (state.challengeFails >= 2) state.challengeFails = 0;

  if (scrutinyCombatEnabled()) {
    const feas = assessFeasibility();
    // One critic only — Defend / Fix / Sidestep vs their resolve (no gauntlet).
    const angles = pickChallengeAngles(
      CHALLENGE_ANGLES,
      encounterCountForFeasibility(feas.overall),
      null
    );
    state.scrutiny = {
      missCount: 0,
      pivotUsed: false,
      coachFreeUsed: false,
      encounters: buildEncounters(angles, resolveForFeasibility(feas.overall)),
    };
    state.challengeAngle = angles[0]?.id || null;
    showScreen("challenge-step");
    await poseScrutinyEncounters();
    return;
  }

  state.scrutiny = null;
  const angle = pickChallengeAngle();
  state.challengeAngle = angle.id;
  showScreen("challenge-step");
  await poseChallenge(angle);
}

async function poseScrutinyEncounters() {
  const box = $("#scrutiny-encounters");
  const status = $("#scrutiny-status");
  const moves = $("#scrutiny-moves");
  const essayBtn = $("#btn-challenge-submit");
  // Multi-critic strip retired — resolve lives on the banner
  if (box) {
    box.hidden = true;
    box.innerHTML = "";
  }
  if (status) {
    status.hidden = false;
    status.textContent =
      "One critic. Empty their resolve (hearts) with Defend or Fix — or Sidestep once. Two misses fail.";
  }
  if (moves) moves.hidden = false;
  if (essayBtn) essayBtn.hidden = true;

  $("#challenge-speech").innerHTML = aiPendingHtml("Posing the challenger…");
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#btn-challenge-deploy").hidden = true;
  const bay = $("#deploy-bay");
  if (bay) bay.hidden = true;
  renderChallengeHud();
  renderScrutinyEncounters();

  // Single critic — one pose, not a gauntlet of speeches
  const enc = state.scrutiny?.encounters?.[0];
  if (enc) {
    const meta = CHALLENGE_ANGLES.find((a) => a.id === enc.angleId);
    try {
      const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
        challengeAngle: enc.angleId,
      });
      enc.speech = data.challengeSpeech || data.message || "";
      enc.question =
        data.challengeQuestion || "How does your invention survive this attack?";
    } catch {
      const fb = localPose(meta || { id: enc.angleId, label: enc.label });
      enc.speech = fb.speech;
      enc.question = fb.question;
    }
  }

  state.scrutinyMoveMode = null;
  paintActiveEncounter();
  renderScrutinyEncounters();
  renderChallengeHud();
}

function paintActiveEncounter() {
  const enc = activeEncounter(state.scrutiny);
  if (!enc) {
    $("#challenge-speech").innerHTML = deployStagesEnabled()
      ? "<p><strong>Challenge cleared.</strong> Field a <strong>Pilot</strong>, then Scale, then declare the new normal — or hold the line after Pilot.</p>"
      : "<p><strong>Challenge cleared.</strong> You may deploy when ready.</p>";
    $("#challenge-question").textContent = "";
    state.challengeVerdict = state.challengeVerdict || "pass";
    state.hadChallengeAttempt = true;
    if (!state.lastChallengeVerdict) state.lastChallengeVerdict = "pass";
    const moves = $("#scrutiny-moves");
    if (moves) moves.hidden = true;
    hideAllModePanels();
    if (!state.deployUnlocked) unlockDeployBay();
    else state.challengePassed = true;
    updateDeployButtonCost();
    renderDeployBay();
    paintChallengerResolve(state.scrutiny?.encounters?.[0] || null);
    renderChallengeHud();
    return;
  }
  const meta = CHALLENGE_ANGLES.find((a) => a.id === enc.angleId) || {
    id: enc.angleId,
    label: enc.label,
    subtitle: enc.subtitle,
    blurb: enc.blurb,
    visual: enc.visual,
  };
  state.challengeAngle = enc.angleId;
  state.challengeText = enc.speech;
  state.challengeQuestion = enc.question;
  setChallengerVisual(meta);
  $("#challenge-angle-label").textContent = "Your idea is under attack";
  $("#challenge-angle-title").textContent = meta.label;
  $("#challenge-angle-sub").textContent = `${meta.subtitle || ""} — ${meta.blurb || ""}`;
  $("#challenge-speech").innerHTML = `<p>${escapeHtml(enc.speech || "").replace(/\n/g, "<br>")}</p>`;
  $("#challenge-question").textContent = enc.question || "";
  paintChallengerResolve(enc);
  const moves = $("#scrutiny-moves");
  if (moves) moves.hidden = false;
  // Restore or default to defend mode so the player always has a next step
  let mode = state.scrutinyMoveMode || "defend";
  if (mode === "sidestep" && state.scrutiny?.pivotUsed) mode = "defend";
  setScrutinyMoveMode(mode);
  updateSidestepAvailability();
  updateDeployButtonCost();
  renderChallengeHud();
}

/** Resolve hearts on the challenger banner (single critic). */
function paintChallengerResolve(enc) {
  const el = $("#challenger-resolve");
  if (!el) return;
  if (!enc) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  if (enc.cleared) {
    el.innerHTML = enc.pivoted
      ? `<span class="challenger-resolve-label">Sidestepped</span>`
      : `<span class="challenger-resolve-label">Resolve broken</span>`;
    return;
  }
  const filled = "♥".repeat(enc.hp);
  const empty = "♡".repeat(Math.max(0, enc.maxHp - enc.hp));
  el.innerHTML = `<span class="challenger-resolve-label">Their resolve</span>
    <span class="challenger-resolve-hearts" aria-label="${enc.hp} of ${enc.maxHp}">${filled}${empty}</span>`;
}

function renderScrutinyEncounters() {
  // Strip retired — keep status line only
  const box = $("#scrutiny-encounters");
  const status = $("#scrutiny-status");
  if (box) {
    box.hidden = true;
    box.innerHTML = "";
  }
  if (!status) return;
  if (!scrutinyCombatEnabled() || !state.scrutiny) {
    status.hidden = true;
    return;
  }
  status.hidden = false;
  const misses = state.scrutiny.missCount || 0;
  const enc = activeEncounter(state.scrutiny);
  if (!enc) {
    status.textContent = "Critic cleared — deploy when ready.";
    paintChallengerResolve(state.scrutiny.encounters?.[0] || null);
    return;
  }
  status.textContent = `Your misses ${misses}/${MISS_BUDGET} · Sidestep ${
    state.scrutiny.pivotUsed ? "used" : "available once"
  } · Empty their resolve to deploy`;
  paintChallengerResolve(enc);
}

async function poseChallenge(angleMeta) {
  const angle = angleMeta || CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle);
  const box = $("#scrutiny-encounters");
  const status = $("#scrutiny-status");
  const moves = $("#scrutiny-moves");
  if (box) box.hidden = true;
  if (status) status.hidden = true;
  if (moves) moves.hidden = true;
  const essayBtn = $("#btn-challenge-submit");
  if (essayBtn) essayBtn.hidden = false;

  $("#challenge-angle-label").textContent = "Your idea is under attack";
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  setChallengerVisual(angle);
  $("#challenge-speech").innerHTML = aiPendingHtml("Posing challenge…");
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#challenge-feedback")?.classList.remove("is-pending", "pass", "partial", "fail");
  $("#btn-challenge-deploy").hidden = true;
  $("#btn-challenge-submit").disabled = true;

  // Lock challenger before AI returns — never swap portrait/angle mid-load.
  state.challengeAngle = angle.id;
  setChallengerVisual(angle);
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  renderChallengeHud();

  try {
    const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
      challengeAngle: angle.id,
    });
    state.challengeText = data.challengeSpeech || data.message || "";
    state.challengeQuestion =
      data.challengeQuestion || "How does your invention survive this attack?";
    state.challengeAngle = angle.id;
    setChallengerVisual(angle);
    $("#challenge-angle-title").textContent = angle.label;
    $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(/\n/g, "<br>")}</p>`;
    $("#challenge-question").textContent = state.challengeQuestion;
  } catch {
    const fb = localPose(angle);
    state.challengeText = fb.speech;
    state.challengeQuestion = fb.question;
    state.challengeAngle = angle.id;
    setChallengerVisual(angle);
    $("#challenge-angle-title").textContent = angle.label;
    $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(fb.speech)}</p>`;
    $("#challenge-question").textContent = fb.question;
  }
  $("#btn-challenge-submit").disabled = false;
  renderChallengeHud();
}

function renderChallengeHud() {
  const yearEl = $("#ch-hud-year");
  if (!yearEl) return;
  yearEl.textContent = String(state.year);
  const waitsBit = state.waits ? ` · waits ${state.waits}` : "";
  const turnEl = $("#ch-hud-turn");
  if (turnEl) turnEl.textContent = `Turn ${state.turn}${waitsBit}`;

  const apEl = $("#ch-hud-ap");
  if (apEl) {
    if (apEnabled()) {
      apEl.hidden = false;
      apEl.textContent = `AP ${state.ap ?? 0}/${state.apMax ?? GAME.apMax ?? 3}`;
      apEl.title = "Action points. Defense, fix, sidestep, AI help, and deploy cost AP.";
    } else {
      apEl.hidden = true;
    }
  }
  const budgetEl = $("#ch-hud-budget");
  if (budgetEl) {
    if (budgetWillEnabled()) {
      budgetEl.hidden = false;
      budgetEl.textContent = `Budget ${state.budget ?? 0}`;
      budgetEl.title = "Capital (same as invent). Challenge success can raise Budget.";
    } else {
      budgetEl.hidden = true;
    }
  }
  const willEl = $("#ch-hud-will");
  if (willEl) {
    if (budgetWillEnabled()) {
      willEl.hidden = false;
      willEl.textContent = `Will ${state.will ?? 0}`;
      willEl.title = "Political will (same as invent). Sidestep costs 1 Will.";
    } else {
      willEl.hidden = true;
    }
  }
  const endBtn = $("#btn-challenge-end-turn");
  if (endBtn) {
    if (apEnabled()) {
      endBtn.hidden = false;
      const can =
        (state.apSpentThisTurn || 0) >= 1 ||
        state.turnPhase === "scrutiny" ||
        state.turnPhase === "between_stages";
      // On challenge, allow End turn if any AP spent this turn OR always allow to refill after spends
      endBtn.disabled = !can && (state.apSpentThisTurn || 0) < 1 && (state.ap ?? 0) >= (state.apMax ?? 3);
      // If AP not full, allow end turn to refill after spending
      if ((state.ap ?? 0) < (state.apMax ?? 3) || (state.apSpentThisTurn || 0) >= 1) {
        endBtn.disabled = false;
      }
      if ((state.apSpentThisTurn || 0) < 1 && (state.ap ?? 0) >= (state.apMax ?? 3)) {
        endBtn.disabled = true;
        endBtn.title = "Spend AP first (or you already have a full bar)";
      } else {
        endBtn.title = "Refill AP without advancing the calendar or crisis";
      }
    } else {
      endBtn.hidden = true;
    }
  }
}

/** Grey out Sidestep after the one-per-run use (does not change mode). */
function updateSidestepAvailability() {
  const used = Boolean(state.scrutiny?.pivotUsed);
  const pivotBtn = $("#btn-scrutiny-pivot");
  const confirmBtn = $("#btn-challenge-confirm-sidestep");
  const blurb = pivotBtn?.querySelector(".scrutiny-move-blurb");
  const cost = pivotBtn?.querySelector(".scrutiny-move-cost");
  if (pivotBtn) {
    pivotBtn.disabled = used;
    pivotBtn.setAttribute("aria-disabled", used ? "true" : "false");
    pivotBtn.title = used ? "Sidestep already used this run" : "";
  }
  if (cost) cost.textContent = used ? "used this run" : "then 1 AP · 1 Will";
  if (blurb) {
    blurb.textContent = used
      ? "You already sidestepped once — Defend or Fix from here."
      : "Skip this challenger without winning the argument — once per run. Confirm below.";
  }
  if (confirmBtn) {
    confirmBtn.disabled = used;
    confirmBtn.textContent = used
      ? "Sidestep already used"
      : "Confirm sidestep (1 AP · 1 Will)";
  }
}

/** Select Defend / Fix / Sidestep — toggle only; does not spend AP until confirm */
function setScrutinyMoveMode(mode) {
  if (mode === "sidestep" && state.scrutiny?.pivotUsed) {
    flashToast("Sidestep already used this run.");
    mode = "defend";
  }
  state.scrutinyMoveMode = mode;
  $$(".scrutiny-move-btn").forEach((btn) => {
    const on = btn.dataset.mode === mode;
    btn.classList.toggle("is-selected", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
  const defend = $("#mode-panel-defend");
  const fix = $("#mode-panel-fix");
  const side = $("#mode-panel-sidestep");
  if (defend) defend.hidden = mode !== "defend";
  if (fix) fix.hidden = mode !== "fix";
  if (side) side.hidden = mode !== "sidestep";
  if (mode === "fix") {
    const howEdit = $("#challenge-how-edit");
    if (howEdit) howEdit.value = state.inventionHow || "";
  }
  if (mode === "defend") {
    const label = $("#challenge-answer-label");
    const enc = activeEncounter(state.scrutiny);
    const name = enc?.label || "this challenger";
    if (label) label.textContent = `Write your defense against ${name}`;
  }
  updateSidestepAvailability();
}

function hideAllModePanels() {
  state.scrutinyMoveMode = null;
  $$(".scrutiny-move-btn").forEach((btn) => {
    btn.classList.remove("is-selected");
    btn.setAttribute("aria-checked", "false");
  });
  ["#mode-panel-defend", "#mode-panel-fix", "#mode-panel-sidestep"].forEach((sel) => {
    const el = $(sel);
    if (el) el.hidden = true;
  });
}

function renderChallengeStep() {
  renderChallengeHud();
  if (scrutinyCombatEnabled() && state.scrutiny) {
    renderScrutinyEncounters();
    paintActiveEncounter();
    if (state.challengeFeedback) {
      const fb = $("#challenge-feedback");
      if (fb) {
        fb.hidden = false;
        fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
        fb.innerHTML = state.challengeFeedback;
      }
    }
    if (state.challengePassed) {
      const dep = $("#btn-challenge-deploy");
      if (dep) {
        dep.hidden = false;
        dep.disabled = false;
      }
      updateDeployButtonCost();
      hideAllModePanels();
      const moves = $("#scrutiny-moves");
      if (moves) moves.hidden = true;
    }
    renderChallengeHud();
    return;
  }
  // Essay fallback mode
  const moves = $("#scrutiny-moves");
  if (moves) moves.hidden = true;
  const box = $("#scrutiny-encounters");
  if (box) box.hidden = true;
  const status = $("#scrutiny-status");
  if (status) status.hidden = true;
  setScrutinyMoveMode("defend");
  const angle = CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle);
  if (angle) {
    $("#challenge-angle-title").textContent = angle.label;
    $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
    setChallengerVisual(angle);
  }
  if (state.challengeText) {
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(/\n/g, "<br>")}</p>`;
  }
  $("#challenge-question").textContent = state.challengeQuestion || "";
  if ($("#challenge-answer") && state.challengeAnswer != null) {
    $("#challenge-answer").value = state.challengeAnswer || "";
  }
  const fb = $("#challenge-feedback");
  const dep = $("#btn-challenge-deploy");
  if (state.challengeFeedback && fb) {
    fb.hidden = false;
    fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
    fb.innerHTML = state.challengeFeedback;
  } else if (fb) fb.hidden = true;
  if (state.challengePassed) {
    if (deployStagesEnabled()) {
      if (dep) dep.hidden = true;
      if (!state.deployUnlocked) unlockDeployBay();
      renderDeployBay();
    } else if (dep) {
      dep.hidden = false;
      dep.disabled = false;
      updateDeployButtonCost();
    }
  } else if (dep) {
    dep.hidden = true;
    dep.disabled = true;
    const bay = $("#deploy-bay");
    if (bay) bay.hidden = true;
  }
  renderChallengeHud();
}

async function scrutinyArgue() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (state.scrutinyMoveMode !== "defend") {
    setScrutinyMoveMode("defend");
    flashToast("Write your defense, then click Submit defense.");
    return;
  }
  const enc = activeEncounter(state.scrutiny);
  if (!enc) {
    flashToast("Challenge cleared.");
    return;
  }
  const answer = ($("#challenge-answer")?.value || "").trim();
  if (answer.length < 20) {
    flashToast("Write at least a short paragraph for your defense.");
    return;
  }
  if (apEnabled()) {
    const r = dispatchSim("reserve_ai", {
      mode: "judge-scrutiny-move",
      reservedAp: 1,
      clientActionId: `argue-${Date.now()}`,
    });
    if (!r.ok) {
      flashToast("No AP to Argue — End turn on Invent first.");
      return;
    }
    renderChallengeHud();
  }
  state.challengeAnswer = answer;
  const fb = $("#challenge-feedback");
  fb.hidden = false;
  fb.className = "challenge-feedback is-pending";
  fb.innerHTML = aiPendingHtml("Judging your argument…");
  let quality = "miss";
  let message = "";
  try {
    const data = await apiCoInvent("judge-scrutiny-move", answer, {
      challengeAngle: enc.angleId,
      challengeSpeech: enc.speech,
      challengeQuestion: enc.question,
      playerAnswer: answer,
    });
    quality = ["hit", "glance", "miss"].includes(data.quality) ? data.quality : "miss";
    message = data.message || "";
    if (apEnabled()) dispatchSim("resolve_ai");
  } catch {
    const local = localArgueQuality(answer);
    quality = local.quality;
    message = local.message;
    if (apEnabled()) dispatchSim("resolve_ai");
  }
  const result = applyArgueResult(state.scrutiny, enc.id, quality);
  state.scrutiny = result.scrutiny;
  state.hadChallengeAttempt = true;
  const verdictMap = { hit: "pass", glance: "partial", miss: "fail" };
  state.lastChallengeVerdict = verdictMap[quality] || "partial";
  fb.className = `challenge-feedback ${quality === "hit" ? "pass" : quality === "glance" ? "partial" : "fail"}`;
  fb.innerHTML = `<strong>${quality.toUpperCase()}</strong> (−${result.damage} resolve) — ${escapeHtml(
    message || "Judged."
  )}`;

  if ((state.scrutiny.missCount || 0) >= MISS_BUDGET) {
    state.challengeFails += 1;
    state.challengePassed = false;
    state.challengeVerdict = "fail";
    fb.innerHTML += `<br/>Two misses — scrutiny fails. Return to Invent and strengthen the idea.`;
    const moves = $("#scrutiny-moves");
    if (moves) moves.hidden = true;
    flashToast("Scrutiny failed (2 misses).");
    renderScrutinyEncounters();
    renderChallengeHud();
    return;
  }

  if (budgetWillEnabled() && quality === "hit") {
    dispatchSim("challenge_income", { verdict: "pass" });
  } else if (budgetWillEnabled() && quality === "miss") {
    dispatchSim("challenge_income", { verdict: "fail" });
  }

  $("#challenge-answer").value = "";
  state.challengeAnswer = "";
  renderScrutinyEncounters();
  paintActiveEncounter();
  renderChallengeHud();
  if (allEncountersCleared(state.scrutiny)) {
    state.challengeVerdict = "pass";
    // Hit already paid challenge income; glance-clear still counts as a win
    if (budgetWillEnabled() && quality === "glance") {
      dispatchSim("challenge_income", { verdict: "pass" });
    }
    flashToast(
      deployStagesEnabled()
        ? "Challenge cleared — open the deploy bay (Pilot → Scale → New normal)."
        : "Challenge cleared — deploy when ready."
    );
  }
}

function scrutinyPatch() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (state.scrutinyMoveMode !== "fix") {
    setScrutinyMoveMode("fix");
    flashToast("Edit how-it-works below, then click Apply fix.");
    return;
  }
  const enc = activeEncounter(state.scrutiny);
  if (!enc) return;
  const howEdit = $("#challenge-how-edit");
  const how = (howEdit?.value || state.inventionHow || "").trim();
  if (how.length < 20) {
    flashToast("Write a clearer how-it-works (at least a short paragraph) before applying the fix.");
    return;
  }
  if (how === (state.inventionHow || "").trim()) {
    flashToast("Change how-it-works to address this attack, then apply the fix.");
    return;
  }
  if (apEnabled()) {
    if ((state.ap ?? 0) < 1) {
      flashToast("No AP to apply the fix — End turn first.");
      return;
    }
    state.ap -= 1;
    state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
  }
  let funded = Boolean($("#challenge-fund-patch")?.checked);
  if (funded && budgetWillEnabled()) {
    if ((state.budget ?? 0) < 1) {
      flashToast("Not enough Budget for a funded fix — uncheck it or free up Budget.");
      funded = false;
    } else {
      state.budget -= 1;
    }
  }
  state.inventionHow = how;
  const inventHow = $("#invention-how");
  if (inventHow) inventHow.value = how;
  const result = applyPatchResult(state.scrutiny, enc.id, funded);
  state.scrutiny = result.scrutiny;
  state.hadChallengeAttempt = true;
  const fb = $("#challenge-feedback");
  fb.hidden = false;
  fb.className = "challenge-feedback partial";
  fb.innerHTML = `<strong>FIX APPLIED</strong> (−${result.damage} resolve) — Your how-it-works was updated under fire.`;
  if ($("#challenge-fund-patch")) $("#challenge-fund-patch").checked = false;
  renderScrutinyEncounters();
  paintActiveEncounter();
  renderChallengeHud();
  if (allEncountersCleared(state.scrutiny)) {
    state.challengeVerdict = "pass";
    flashToast(
      deployStagesEnabled()
        ? "Challenge cleared — open the deploy bay (Pilot → Scale → New normal)."
        : "Challenge cleared — deploy when ready."
    );
  }
}

function scrutinyPivot() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (state.scrutinyMoveMode !== "sidestep") {
    setScrutinyMoveMode("sidestep");
    flashToast("Confirm sidestep below if you want to dodge this challenger.");
    return;
  }
  const enc = activeEncounter(state.scrutiny);
  if (!enc) return;
  if (state.scrutiny.pivotUsed) {
    flashToast("Sidestep already used this run.");
    return;
  }
  if (apEnabled() && (state.ap ?? 0) < 1) {
    flashToast("No AP to sidestep — End turn first.");
    return;
  }
  if (budgetWillEnabled() && (state.will ?? 0) < 1) {
    flashToast("Sidestep needs 1 Political will.");
    return;
  }
  if (apEnabled()) {
    state.ap -= 1;
    state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
  }
  if (budgetWillEnabled()) state.will = Math.max(0, (state.will ?? 0) - 1);
  const result = applyPivotResult(state.scrutiny, enc.id);
  if (!result.ok) {
    flashToast(result.error || "Cannot sidestep.");
    return;
  }
  state.scrutiny = result.scrutiny;
  state.elegancePivotPenalty = true;
  state.hadChallengeAttempt = true;
  const fb = $("#challenge-feedback");
  fb.hidden = false;
  fb.className = "challenge-feedback pass";
  fb.innerHTML = `<strong>SIDESTEP</strong> — You skipped ${escapeHtml(enc.label)} (once per run).`;
  // Drop off sidestep mode — button is now spent
  setScrutinyMoveMode("defend");
  renderScrutinyEncounters();
  paintActiveEncounter();
  renderChallengeHud();
  if (allEncountersCleared(state.scrutiny)) {
    state.challengeVerdict = "pass";
    flashToast(
      deployStagesEnabled()
        ? "Challenge cleared — open the deploy bay (Pilot → Scale → New normal)."
        : "Challenge cleared — deploy when ready."
    );
  }
}

function showChallengeCoach(html) {
  const panel = $("#challenge-coach-panel");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = html;
  panel.querySelector("#btn-apply-draft")?.addEventListener("click", () => {
    const draft = panel.dataset.draft || "";
    if (!draft) return;
    state.challengeAnswer = draft;
    $("#challenge-answer").value = draft;
    flashToast("Draft copied — edit it, then submit");
  });
}

function setChallengeHelpBusy(busy) {
  ["#btn-challenge-coach", "#btn-challenge-draft", "#btn-challenge-ask"].forEach((sel) => {
    const el = $(sel);
    if (el) el.disabled = busy;
  });
}

async function coachChallenge(mode, userText) {
  if (state.aiBusy) return;
  if (!state.challengeQuestion && !state.challengeText) {
    flashToast("Wait for the challenge to load first.");
    return;
  }
  // First coach/draft/ask in a scrutiny combat run is free
  let freeCoach = false;
  if (scrutinyCombatEnabled() && state.scrutiny && !state.scrutiny.coachFreeUsed) {
    freeCoach = true;
    state.scrutiny.coachFreeUsed = true;
  }
  if (apEnabled() && !freeCoach) {
    const reserve = dispatchSim("reserve_ai", {
      mode,
      reservedAp: 1,
      clientActionId: `ch-ai-${Date.now()}`,
    });
    if (!reserve.ok) {
      flashToast("No AP left for AI help — End turn on Invent, or submit without coaching.");
      return;
    }
    renderChallengeHud();
  }
  state.aiBusy = true;
  setChallengeHelpBusy(true);
  const pendingLabel =
    mode === "draft-challenge" ? "Drafting an answer…" : "Coaching…";
  showChallengeCoach(aiPendingHtml(pendingLabel));
  let requestOk = false;
  try {
    const data = await apiCoInvent(mode, userText || "[Help with challenge]", {
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
      playerAnswer: $("#challenge-answer")?.value || "",
    });
    const msg = escapeHtml(data.message || "Here's help.").replace(/\n/g, "<br>");
    let html = `<div>${msg}</div>`;
    if (data.draftAnswer) {
      const draft = String(data.draftAnswer).trim();
      html += `<div class="draft-block"><strong>Draft answer</strong><p>${escapeHtml(draft).replace(
        /\n/g,
        "<br>"
      )}</p><div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" id="btn-apply-draft">Use this draft</button></div></div>`;
      const panel = $("#challenge-coach-panel");
      if (panel) panel.dataset.draft = draft;
    }
    showChallengeCoach(html);
    requestOk = true;
  } catch (e) {
    // local fallback — still counts as a used AI attempt (AP spent)
    requestOk = true;
    const angle = CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle) || CHALLENGE_ANGLES[0];
    const place = state.mission?.place || "this place";
    const name = state.inventionName || "your invention";
    if (mode === "draft-challenge") {
      const draft =
        angle.id === "nature"
          ? `In ${place}, ${name} fails first on overload or waste without caps. We meter energy/materials, monitor, and degrade safely in extremes.`
          : angle.id === "ethicist"
            ? `In ${place}, ${name} creates a real ethical tension about who is exposed or left out. We name both sides, refuse one hard line (e.g. no coercive enrollment), and keep a human review path.`
            : angle.id === "stakeholder"
              ? `In ${place}, adoption needs a named official and payer for year-1 and year-5 costs, a permit path, and a free tier so low-income users aren't priced out.`
              : `In ${place}, freeriders would skip ${name}. We make participation default for covered blocks, publish compliance, and tie a small shared fee/reward to verified use.`;
      const panel = $("#challenge-coach-panel");
      if (panel) panel.dataset.draft = draft;
      showChallengeCoach(
        `<div>Draft for this ${angle.label} attack — edit before submit.</div><div class="draft-block"><strong>Draft answer</strong><p>${escapeHtml(
          draft
        )}</p><div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" id="btn-apply-draft">Use this draft</button></div></div>`
      );
    } else {
      showChallengeCoach(
        `<div><strong>${angle.label} coaching</strong><br/>${escapeHtml(
          angle.blurb
        )}<br/><br/>• Answer the exact question asked.<br/>• Name a concrete actor, cost, or physical limit in ${escapeHtml(
          place
        )}.<br/>• Tie the fix to your stack and invention name.<br/>• One clear safeguard beats vague hope.</div>`
      );
    }
  } finally {
    if (apEnabled() && !freeCoach) {
      if (requestOk) dispatchSim("resolve_ai");
      else dispatchSim("reject_ai");
    }
    state.aiBusy = false;
    setChallengeHelpBusy(false);
    renderChallengeHud();
  }
}

async function submitChallengeAnswer() {
  if (scrutinyCombatEnabled() && state.scrutiny) {
    await scrutinyArgue();
    return;
  }
  const answer = $("#challenge-answer").value.trim();
  state.challengeAnswer = answer;
  if (answer.length < 20) {
    flashToast("Give a real answer — a short paragraph.");
    return;
  }
  if (apEnabled()) {
    const reserve = dispatchSim("reserve_ai", {
      mode: "judge-challenge",
      reservedAp: 1,
      clientActionId: `judge-${Date.now()}`,
    });
    if (!reserve.ok) {
      flashToast("No AP left to submit for judgment — return to Invent and End turn first.");
      return;
    }
    renderChallengeHud();
  }
  $("#btn-challenge-submit").disabled = true;
  const fbPending = $("#challenge-feedback");
  if (fbPending) {
    fbPending.hidden = false;
    fbPending.className = "challenge-feedback is-pending";
    fbPending.innerHTML = aiPendingHtml("Judging your answer…");
  }
  let requestOk = false;
  try {
    const data = await apiCoInvent("judge-challenge", answer, {
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
      playerAnswer: answer,
    });
    const verdict = (data.verdict || "partial").toLowerCase();
    state.challengeVerdict = ["pass", "partial", "fail"].includes(verdict) ? verdict : "partial";
    state.hadChallengeAttempt = true;
    state.lastChallengeVerdict = state.challengeVerdict;
    state.challengeFeedback = `<strong>${state.challengeVerdict.toUpperCase()}</strong> — ${escapeHtml(
      data.message || data.lesson || "Judged."
    )}${data.lesson ? `<br/><em>${escapeHtml(data.lesson)}</em>` : ""}`;
    if (state.challengeVerdict === "fail") {
      state.challengeFails += 1;
      state.challengePassed = false;
      state.challengeFeedback +=
        state.challengeFails >= 2
          ? "<br/>Two fails — go back to Invent, strengthen the idea, then try again."
          : "<br/>Not enough. Revise your answer, or return to Invent. Next challenge may use a different angle.";
    } else {
      state.challengePassed = true;
      if (deployStagesEnabled() && !state.deployUnlocked) unlockDeployBay();
    }
    if (budgetWillEnabled()) {
      dispatchSim("challenge_income", { verdict: state.challengeVerdict });
    }
    requestOk = true;
  } catch {
    requestOk = true;
    const ok = answer.length >= 40;
    state.challengeVerdict = ok ? "partial" : "fail";
    state.challengePassed = ok;
    if (ok && deployStagesEnabled() && !state.deployUnlocked) unlockDeployBay();
    state.hadChallengeAttempt = true;
    state.lastChallengeVerdict = state.challengeVerdict;
    state.challengeFeedback = ok
      ? "<strong>PARTIAL</strong> — Concrete enough to try a deploy."
      : "<strong>FAIL</strong> — Too vague. Name who acts, who pays, or what limit you respect.";
    if (!ok) state.challengeFails += 1;
    if (budgetWillEnabled()) {
      dispatchSim("challenge_income", { verdict: state.challengeVerdict });
    }
  }
  if (apEnabled()) {
    if (requestOk) dispatchSim("resolve_ai");
    else dispatchSim("reject_ai");
  }
  $("#btn-challenge-submit").disabled = false;
  renderChallengeStep();
}

function currentDeployFieldCost(techs = selectedTechs()) {
  return deployActionCost(techs, { will: state.will ?? 0 });
}

function resetDeployBayState() {
  state.deployUnlocked = false;
  state.deployStage = "none";
  state.stagedDropPool = 0;
  state.stagedDropRemaining = 0;
  state.dropPilotApplied = 0;
  state.dropScaleApplied = 0;
  state.dropNewNormalApplied = 0;
  state.stagedDropParts = null;
  state.deployFieldPaid = false;
}

function computeCurrentDropInfo() {
  const techs = selectedTechs();
  const domains = domainsInStack(techs);
  const pairs = computeSynergies(techs);
  return {
    techs,
    domains,
    pairs,
    dropInfo: computeDeployDrop({
      techs,
      domains,
      pairs,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
      challengeVerdict: state.challengeVerdict,
      challengeAnswer: state.challengeAnswer,
      suggested: state.mission?.suggested || [],
      will: state.will,
      budgetWill: budgetWillEnabled(),
    }),
  };
}

/** Freeze crisis relief pool and open deploy bay after challenge clear. */
function unlockDeployBay() {
  state.challengePassed = true;
  if (!deployStagesEnabled()) return;
  // Sticky unlock — do not re-freeze mid-bay
  if (state.deployUnlocked) {
    state.turnPhase = "between_stages";
    return;
  }
  state.deployUnlocked = true;
  state.turnPhase = "between_stages";

  const { dropInfo } = computeCurrentDropInfo();
  const frozen = freezeStagedDropPool(dropInfo.drop);
  state.stagedDropPool = frozen.stagedDropPool;
  state.stagedDropRemaining = frozen.stagedDropRemaining;
  state.dropPilotApplied = 0;
  state.dropScaleApplied = 0;
  state.dropNewNormalApplied = 0;
  state.deployStage = "none";
  state.deployFieldPaid = false;
  state.stagedDropParts = dropInfo.parts;
  state.lastNews = `Challenge cleared · deploy bay open. Crisis relief pool frozen at −${state.stagedDropPool} (Pilot → Scale → New normal).`;
}

function nextDeployStageAction() {
  if (!state.deployUnlocked) return null;
  if (state.deployStage === "none") return "pilot";
  if (state.deployStage === "pilot") return "scale";
  if (state.deployStage === "scale") return "new_normal";
  return null;
}

function updateDeployButtonCost() {
  const dep = $("#btn-challenge-deploy");
  if (deployStagesEnabled()) {
    if (dep) dep.hidden = true;
    renderDeployBay();
    return;
  }
  if (!dep || dep.hidden) return;
  const techs = selectedTechs();
  if (!techs.length) {
    dep.textContent = "Deploy invention →";
    return;
  }
  const cost = currentDeployFieldCost(techs);
  const bits = [];
  if (apEnabled()) bits.push(`${cost.ap} AP`);
  if (budgetWillEnabled()) bits.push(`¤${cost.budget}`);
  dep.textContent = bits.length
    ? `Deploy invention (${bits.join(" · ")}) →`
    : "Deploy invention →";
  dep.title = budgetWillEnabled()
    ? `Field the invention: costs attention and capital to roll out on the ground. ${cost.parts
        .map((p) => `${p.label}: ${p.amount > 0 ? "+" : ""}${p.amount} Budget`)
        .join("; ")}`
    : "Deploy after a successful challenge.";
}

function renderDeployBay() {
  const bay = $("#deploy-bay");
  if (!bay) return;
  if (!deployStagesEnabled() || !state.deployUnlocked || !state.challengePassed) {
    bay.hidden = true;
    return;
  }
  bay.hidden = false;

  const next = nextDeployStageAction();
  $$(".deploy-stage-pill", bay).forEach((pill) => {
    const id = pill.dataset.stage;
    const done =
      (id === "pilot" && ["pilot", "scale", "new_normal"].includes(state.deployStage)) ||
      (id === "scale" && ["scale", "new_normal"].includes(state.deployStage)) ||
      (id === "new_normal" && state.deployStage === "new_normal");
    const active = next === id;
    pill.classList.toggle("is-done", done);
    pill.classList.toggle("is-active", active);
  });

  const status = $("#deploy-bay-status");
  const primary = $("#btn-deploy-stage-primary");
  const hold = $("#btn-deploy-hold");
  const remaining = state.stagedDropRemaining ?? 0;
  const pool = state.stagedDropPool ?? 0;
  const fieldCost = currentDeployFieldCost();
  const costBits = [];
  if (!state.deployFieldPaid) {
    if (apEnabled()) costBits.push(`${fieldCost.ap} AP`);
    if (budgetWillEnabled()) costBits.push(`¤${fieldCost.budget}`);
  }
  const costSuffix = costBits.length ? ` · fielding ${costBits.join(" · ")}` : "";

  if (status) {
    if (next === "pilot") {
      const pilotAmt = Math.min(remaining, Math.max(1, Math.ceil(pool / 2)) || 0);
      status.textContent = `Pool −${pool} frozen at unlock. Pilot drops −${pilotAmt} crisis (then Scale).${costSuffix}`;
    } else if (next === "scale") {
      status.textContent = `Pilot landed (−${state.dropPilotApplied}). Scale spends remaining −${remaining}. Wait is blocked until you finish or hold.`;
    } else if (next === "new_normal") {
      const extra =
        (state.will ?? 0) >= 4 && pool >= 4 ? " Optional +1 if Will ≥ 4." : " Win check only (no extra drop).";
      status.textContent = `Scale done (−${state.dropScaleApplied}). Declare new normal or hold the line.${extra}`;
    } else {
      status.textContent = "Deploy complete.";
    }
  }

  if (primary) {
    if (next === "pilot") {
      primary.hidden = false;
      primary.disabled = assessFeasibility().overall === "red";
      primary.textContent = costBits.length
        ? `Deploy Pilot (${costBits.join(" · ")}) →`
        : "Deploy Pilot →";
    } else if (next === "scale") {
      primary.hidden = false;
      primary.disabled = assessFeasibility().overall === "red";
      primary.textContent =
        remaining > 0 ? `Deploy Scale (−${remaining} crisis) →` : "Deploy Scale (narrative) →";
    } else if (next === "new_normal") {
      primary.hidden = false;
      primary.disabled = assessFeasibility().overall === "red";
      primary.textContent = "Declare new normal →";
    } else {
      primary.hidden = true;
    }
  }

  if (hold) {
    const canHold = next === "scale" || next === "new_normal";
    hold.hidden = !canHold;
    hold.disabled = !canHold;
  }

  // Hide legacy single deploy when bay is active
  const legacy = $("#btn-challenge-deploy");
  if (legacy) legacy.hidden = true;
}

function payDeployFieldingOnce() {
  if (state.deployFieldPaid) return { ok: true, fieldCost: null };
  const techs = selectedTechs();
  const fieldCost = currentDeployFieldCost(techs);
  if (!apEnabled() && !budgetWillEnabled()) {
    state.deployFieldPaid = true;
    return { ok: true, fieldCost };
  }
  const pay = dispatchSim("deploy", {
    apCost: apEnabled() ? fieldCost.ap : 0,
    budgetCost: budgetWillEnabled() ? fieldCost.budget : 0,
  });
  if (!pay.ok) {
    if (pay.error === "no_ap") {
      flashToast("No AP to field the pilot — End turn, then deploy.");
    } else if (pay.error === "no_budget") {
      flashToast(
        `Need ¤${fieldCost.budget} Budget to field this (you have ${state.budget ?? 0}).`
      );
    } else {
      flashToast("Cannot deploy right now.");
    }
    return { ok: false, fieldCost };
  }
  state.deployFieldPaid = true;
  renderChallengeHud();
  return { ok: true, fieldCost };
}

function snapshotTimingAtDeploy() {
  const techs = selectedTechs();
  const timingSnap =
    state.aiTiming?.level && state.aiTiming?.forKey === timingCacheKey()
      ? state.aiTiming.level
      : detectClaimStretch(state.inventionHow, techs, state.year).level;
  state.timingLevelAtDeploy = timingSnap;
  return timingSnap;
}

function attemptDeployStage(stage) {
  if (!deployStagesEnabled()) {
    attemptDeployLegacy();
    return;
  }
  if (!state.challengePassed || !state.deployUnlocked) {
    flashToast("Clear the challenge first.");
    return;
  }
  const expected = nextDeployStageAction();
  if (stage !== expected) {
    flashToast(expected ? `Next step is ${expected}.` : "Deploy already finished.");
    return;
  }
  const techs = selectedTechs();
  if (!techs.length) {
    flashToast("Add at least one technology.");
    return;
  }
  if (state.inventionHow.trim().length < 20 || state.inventionImpact.trim().length < 20) {
    flashToast("Need both story faces.");
    return;
  }
  if (assessFeasibility().overall === "red") {
    flashToast("Feasibility is red — revise how-it-works timing claims first.");
    return;
  }

  // Fielding cost once at Pilot
  let fieldCost = null;
  if (stage === "pilot") {
    const pay = payDeployFieldingOnce();
    if (!pay.ok) {
      renderDeployBay();
      return;
    }
    fieldCost = pay.fieldCost;
  }

  const step = applyStagedDropStep(
    stage,
    {
      stagedDropPool: state.stagedDropPool,
      stagedDropRemaining: state.stagedDropRemaining,
      dropPilotApplied: state.dropPilotApplied,
      dropScaleApplied: state.dropScaleApplied,
      dropNewNormalApplied: state.dropNewNormalApplied,
    },
    { will: state.will ?? 0 }
  );
  if (!step.ok) {
    flashToast("Cannot advance deploy stage.");
    return;
  }

  if (step.drop > 0) {
    state.pressure = applyPressureDrop(state.pressure, step.drop);
  }
  state.stagedDropPool = step.frozen.stagedDropPool;
  state.stagedDropRemaining = step.frozen.stagedDropRemaining;
  state.dropPilotApplied = step.frozen.dropPilotApplied;
  state.dropScaleApplied = step.frozen.dropScaleApplied;
  state.dropNewNormalApplied = step.frozen.dropNewNormalApplied;
  state.deployStage = stage;

  const timingSnap = snapshotTimingAtDeploy();
  const { domains, pairs, dropInfo } = computeCurrentDropInfo();

  if (stage === "pilot") {
    markMissionSolved(state.mission);
    state.lastNews = `Pilot fielded in ${state.year}. Crisis −${step.drop}. Scale ready (remaining pool −${state.stagedDropRemaining}).`;
    flashToast(`Pilot landed · crisis −${step.drop}`);
    renderDeployBay();
    renderChallengeHud();
    if (state.screen === "workshop") renderWorkshop();
    return;
  }

  if (stage === "scale") {
    state.lastNews = `Scale rollout. Crisis −${step.drop}. Declare new normal or hold the line.`;
    flashToast(step.drop ? `Scale landed · crisis −${step.drop}` : "Scale advanced (no further crisis drop)");
    renderDeployBay();
    renderChallengeHud();
    if (state.screen === "workshop") renderWorkshop();
    return;
  }

  // new_normal — win check
  if (step.drop > 0) {
    state.lastNews = `New normal declared. Mandate encore −${step.drop}.`;
  } else {
    state.lastNews = `New normal declared in ${state.year}.`;
  }
  state.waitReport = "";
  const kind = wonMission() ? "win" : "partial";
  finishOutcome(kind, {
    drop:
      (state.dropPilotApplied || 0) +
      (state.dropScaleApplied || 0) +
      (state.dropNewNormalApplied || 0),
    dropParts: [
      ...(state.stagedDropParts || []),
      ...step.parts,
      { id: "pilot_applied", label: "Pilot drop", amount: state.dropPilotApplied || 0 },
      { id: "scale_applied", label: "Scale drop", amount: state.dropScaleApplied || 0 },
    ],
    deployCost: fieldCost || currentDeployFieldCost(techs),
    domains,
    pairs,
    verdict: state.challengeVerdict,
    angle: state.challengeAngle,
    timingLevel: timingSnap,
    deployStage: "new_normal",
    stagedPool: state.stagedDropPool,
  });
}

function holdTheLine() {
  if (!deployStagesEnabled() || !state.deployUnlocked) return;
  const next = nextDeployStageAction();
  if (next !== "scale" && next !== "new_normal") {
    flashToast("Hold the line after Pilot or Scale.");
    return;
  }
  const timingSnap = snapshotTimingAtDeploy();
  const { domains, pairs } = computeCurrentDropInfo();
  const totalDrop =
    (state.dropPilotApplied || 0) +
    (state.dropScaleApplied || 0) +
    (state.dropNewNormalApplied || 0);
  state.lastNews = `Held the line after ${state.deployStage} in ${state.year}. Crisis relief −${totalDrop}.`;
  state.waitReport = "";
  finishOutcome("partial", {
    drop: totalDrop,
    dropParts: [
      { id: "pilot_applied", label: "Pilot drop", amount: state.dropPilotApplied || 0 },
      { id: "scale_applied", label: "Scale drop", amount: state.dropScaleApplied || 0 },
      { id: "hold", label: "Held the line", amount: 0 },
    ],
    domains,
    pairs,
    verdict: state.challengeVerdict,
    angle: state.challengeAngle,
    timingLevel: timingSnap,
    deployStage: state.deployStage,
    held: true,
    stagedPool: state.stagedDropPool,
  });
}

function attemptDeploy() {
  if (deployStagesEnabled()) {
    const next = nextDeployStageAction();
    if (next) attemptDeployStage(next);
    else flashToast("Deploy stages finished — declare new normal or hold.");
    return;
  }
  attemptDeployLegacy();
}

function attemptDeployLegacy() {
  if (!state.challengePassed) {
    flashToast("Pass the challenge step first.");
    showScreen("challenge-step");
    return;
  }
  const techs = selectedTechs();
  if (!techs.length) {
    flashToast("Add at least one technology.");
    return;
  }
  if (state.inventionHow.trim().length < 20 || state.inventionImpact.trim().length < 20) {
    flashToast("Need both story faces.");
    return;
  }
  if (assessFeasibility().overall === "red") {
    flashToast("Feasibility is red — revise how-it-works timing claims first.");
    return;
  }

  const fieldCost = currentDeployFieldCost(techs);
  if (apEnabled() || budgetWillEnabled()) {
    const pay = dispatchSim("deploy", {
      apCost: apEnabled() ? fieldCost.ap : 0,
      budgetCost: budgetWillEnabled() ? fieldCost.budget : 0,
    });
    if (!pay.ok) {
      if (pay.error === "no_ap") {
        flashToast("No AP to deploy — return to Invent and End turn, then come back.");
      } else if (pay.error === "no_budget") {
        flashToast(
          `Need ¤${fieldCost.budget} Budget to field this (you have ${state.budget ?? 0}). Lobby less, win challenge income, or simplify the stack.`
        );
      } else {
        flashToast("Cannot deploy right now.");
      }
      renderChallengeHud();
      updateDeployButtonCost();
      return;
    }
    renderChallengeHud();
  }

  const { domains, pairs, dropInfo } = computeCurrentDropInfo();
  const drop = dropInfo.drop;
  const timingSnap = snapshotTimingAtDeploy();

  state.pressure = applyPressureDrop(state.pressure, drop);

  const costBits = [];
  if (apEnabled()) costBits.push(`${fieldCost.ap} AP`);
  if (budgetWillEnabled()) costBits.push(`¤${fieldCost.budget}`);
  const costNote = costBits.length ? ` Cost: ${costBits.join(" · ")}.` : "";

  state.lastNews = `Deployed in ${state.year} after ${state.challengeAngle} challenge. Crisis −${drop}.${costNote}`;
  state.waitReport = "";
  markMissionSolved(state.mission);
  finishOutcome(wonMission() ? "win" : "partial", {
    drop,
    dropParts: dropInfo.parts,
    deployCost: fieldCost,
    domains,
    pairs,
    verdict: state.challengeVerdict,
    angle: state.challengeAngle,
    timingLevel: timingSnap,
  });
}

function buildRunReport(kind, meta = {}) {
  const techs = selectedTechs();
  const pairs = computeSynergies(techs);
  const domains = domainsInStack(techs);
  const suggested = new Set(state.mission?.suggested || []);
  const answerWords = (state.challengeAnswer || "").trim().split(/\s+/).filter(Boolean).length;
  const report = scoreRun({
    kind,
    year: state.year,
    startYear: state.mission?.startYear || GAME.startYear,
    yearsPerTurn: state.mission?.yearsPerTurn || GAME.yearsPerTurn,
    waits: state.waits || 0,
    turn: state.turn,
    challengeVerdict: state.challengeVerdict || state.lastChallengeVerdict,
    hadChallengeAttempt: state.hadChallengeAttempt,
    lastChallengeVerdict: state.lastChallengeVerdict,
    timingLevel:
      meta.timingLevel ||
      state.timingLevelAtDeploy ||
      state.aiTiming?.level ||
      detectClaimStretch(state.inventionHow, techs, state.year).level,
    inventionHow: state.inventionHow,
    synergyPairCount: pairs.length,
    domainCount: domains.length,
    suggestedHitCount: techs.filter((t) => suggested.has(t.id)).length,
    challengeAnswerWords: answerWords,
    drop: meta.drop || 0,
  });
  if (state.elegancePivotPenalty) {
    report.eleganceScore = Math.max(0, (report.eleganceScore || 0) - 15);
    report.highlights = [...(report.highlights || []), "Pivot used (−15 elegance)."];
  }
  return report;
}

function persistRunReport(missionId, report) {
  if (!features().runReport || !missionId) return;
  try {
    const raw = localStorage.getItem(STORAGE_RUNS);
    const all = raw ? JSON.parse(raw) : {};
    const prev = all[missionId] || { bestStars: 0, count: 0 };
    all[missionId] = {
      bestStars: Math.max(prev.bestStars || 0, report.stars || 0),
      lastReport: report,
      count: (prev.count || 0) + 1,
    };
    localStorage.setItem(STORAGE_RUNS, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function finishOutcome(kind, meta = {}) {
  const techs = selectedTechs();
  const report = features().runReport ? buildRunReport(kind, meta) : null;
  state.runReport = report;
  if (report && state.mission?.id) persistRunReport(state.mission.id, report);
  // Collapse / abandon does not mark solved — only deploy paths above do
  state.outcome = {
    kind,
    meta,
    techs,
    year: state.year,
    turn: state.turn,
    waits: state.waits || 0,
    pressure: clonePressure(state.pressure),
    runReport: report,
  };
  showScreen("outcome");
}

function renderOutcome() {
  const o = state.outcome;
  const m = state.mission;
  const name = state.inventionName.trim() || "Untitled invention";
  $("#outcome-name").textContent = name;
  $("#outcome-meta").textContent = `${m.place} · ${o.year} · Turn ${o.turn} · waits ${
    o.waits ?? state.waits ?? 0
  } · ${state.global?.title || ""}`;

  const starsEl = $("#outcome-stars");
  const report = o.runReport || state.runReport;
  if (starsEl) {
    if (report && features().runReport) {
      starsEl.hidden = false;
      starsEl.innerHTML = `<div class="run-stars" aria-label="${report.stars} stars">${starLabel(
        report.stars
      )}</div>
        <div class="run-scores muted">Speed ${report.speedScore} · Honesty ${report.honestyScore} · Elegance ${
        report.eleganceScore
      }</div>
        <ul class="run-highlights">${(report.highlights || [])
          .map((h) => `<li>${escapeHtml(h)}</li>`)
          .join("")}</ul>`;
    } else {
      starsEl.hidden = true;
      starsEl.innerHTML = "";
    }
  }

  const img = $("#outcome-vision-image");
  if (state.vision?.currentUrl && img) {
    img.hidden = false;
    img.src = state.vision.currentUrl;
    $("#outcome-vision-status").textContent = `Vision of ${m.place}, ${o.year}`;
  }

  let headline = "Holding the line";
  let story = "";
  const lessons = [];

  if (o.kind === "win") {
    headline = "Crisis eased";
    story =
      `In ${o.year}, ${name} landed in ${m.place}. Crisis meters fell enough for people to breathe. ` +
      `You survived a ${o.meta?.angle || "challenge"} attack, then deployed. ` +
      (state.inventionImpact.trim()
        ? `Everyday life: ${state.inventionImpact.trim()}`
        : "A local face of a global problem got smaller.");
    lessons.push({
      type: "good",
      text: `Challenge (${o.meta?.angle || "stress-test"}): ${state.challengeVerdict || "passed"}.`,
    });
    lessons.push({
      type: "good",
      text: `Timing: deployed with feasible claims in ${o.year}, before fail year ${m.collapseYear}.`,
    });
    lessons.push({
      type: "good",
      text: `Local → global: ${m.place} is one face of “${state.global?.title || "the larger problem"}”.`,
    });
  } else if (o.kind === "partial") {
    headline = "Deployed — crisis still hot";
    story =
      `In ${o.year}, ${name} went live in ${m.place} and eased pressure (−${o.meta?.drop || "?"} on the meters), but not enough to fully win. ` +
      `You can keep inventing (meters stay as they are) or take what you learned to a new mission.`;
    lessons.push({
      type: "grow",
      text: "Partial win: strengthen the mechanism, wait for better tech (crisis rises), or accept the lesson and try another place.",
    });
    if (o.meta?.angle) {
      lessons.push({
        type: "good",
        text: `You answered a ${o.meta.angle} challenge before deploying — that discipline matters.`,
      });
    }
  } else if (o.kind === "collapse") {
    headline = "Too late";
    story =
      `By ${o.year}, crisis in ${m.place} broke past what a late invention could fix. ` +
      `Waiting can improve world conditions for your claims — but crisis meters rise. The clock cuts both ways.`;
    lessons.push({ type: "grow", text: "Problems escalate on a clock. Waiting is never free." });
    lessons.push({
      type: "grow",
      text: "Categories were always pickable — the skill is matching how-it-works claims to the year.",
    });
  } else {
    headline = "Mission paused";
    story = "You left the forge. The calendar in that place keeps moving without you.";
  }

  $("#outcome-headline").textContent = headline;
  $("#outcome-story").textContent = story;
  $("#outcome-lessons").innerHTML = lessons
    .map((l) => `<li class="${l.type}">${escapeHtml(l.text)}</li>`)
    .join("");

  // Foresight: milestones, trends, predictions
  const fs = foresightForStack(
    (o.techs || []).map((t) => t.id),
    state.global?.id || state.mission?.globalId,
    o.year
  );
  const fg = $("#outcome-foresight");
  if (fg) {
    const card = (kind, label, item) => {
      if (!item) return "";
      return `<article class="foresight-card foresight-${kind}">
        <div class="foresight-kind">${label}</div>
        <p>${escapeHtml(item.text)}</p>
      </article>`;
    };
    const html =
      card("milestone", "Milestone (already real)", fs.milestone) +
      card("trend", "Trend", fs.trend) +
      card("prediction", "Prediction", fs.prediction);
    fg.innerHTML = html || "<p class='empty-hint'>No foresight cards matched this stack.</p>";
  }

  $("#outcome-techs").innerHTML = (o.techs || [])
    .map(
      (t) => `
      <article class="learn-card">
        <h4><span>${t.icon}</span> ${escapeHtml(t.name)}</h4>
        <p>${escapeHtml(t.learn)}</p>
        <p style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-mute)"><strong>Now:</strong> ${escapeHtml(
          t.maturity?.now || ""
        )}</p>
      </article>`
    )
    .join("") || "<p class='empty-hint'>No technologies were locked in.</p>";
}

/* —— Vision —— */
function ensureVision() {
  const root = $("#vision-root");
  if (!root) return;
  if (!state.vision) state.vision = new VisionRenderer(root);
}

function updateVision(opts = {}) {
  if (!state.mission) return;
  ensureVision();
  const techs = selectedTechs();
  const stage = currentStage();
  $("#vision-stage-name").textContent = `${stage.name} · ${state.year}`;
  $("#vision-stage-blurb").textContent = stage.blurb;

  const box = $("#vision-narratives");
  if (box) {
    const narratives = narrativesFromTechs(techs);
    const pressureLine = Object.entries(state.pressure)
      .map(([k, v]) => `${k} ${v}/5`)
      .join(" · ");
    const head = `<div class="narrative-card"><div class="src">${state.year}</div>Pressure: ${escapeHtml(pressureLine)}</div>`;
    box.innerHTML =
      head +
      (narratives.length
        ? narratives
            .map(
              (n) =>
                `<div class="narrative-card"><div class="src">${escapeHtml(n.name)}</div>${escapeHtml(n.text)}</div>`
            )
            .join("")
        : `<div class="narrative-card"><div class="src">Place</div>${escapeHtml(state.mission.scene.slice(0, 180))}</div>`);
  }

  if (!state.vision) return;
  state.vision.setState({
    stageId: stage.id,
    stage,
    challenge: {
      id: state.mission.id,
      title: state.mission.title,
      // Full scenario text — locked geography for every vision regenerate
      problem: state.mission.scene,
      scene: state.mission.scene,
      place: state.mission.place,
      visionTheme: state.mission.visionTheme,
    },
    techs,
    inventionName: state.inventionName,
    inventionHow: state.inventionHow,
    inventionImpact: state.inventionImpact,
    year: state.year,
    place: state.mission.place,
    pressure: state.pressure,
    immediate: Boolean(opts.immediate),
    force: Boolean(opts.force),
    debounceMs: opts.debounceMs,
  });
}

function setSideTab(tab) {
  state.sideTab = tab;
  $$(".side-tab").forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  const vision = $("#side-vision");
  const co = $("#side-coinventor");
  if (vision) vision.hidden = tab !== "vision";
  if (co) co.hidden = tab !== "coinventor";
  if (tab === "vision") {
    requestAnimationFrame(() => {
      ensureVision();
      updateVision();
    });
  }
  if (tab === "coinventor") ensureCoInventor();
}

/* —— Co-inventor —— */
function coInventorRootEl() {
  if (state.screen === "challenge-step") return $("#ch-co-inventor-root");
  return $("#co-inventor-root");
}

function ensureCoInventor() {
  const root = coInventorRootEl();
  if (!root) return state.coInventor;
  // Remount when switching Invent ↔ Challenge so the panel lives on the active screen
  if (state.coInventor && state.coInventor.root === root) return state.coInventor;

  const messages = state.coInventor?.messages || [];
  const onChallenge = state.screen === "challenge-step";
  state.coInventor = new CoInventor({
    getContext: () => ({
      challenge: state.mission
        ? {
            id: state.mission.id,
            title: state.mission.title,
            problem: state.mission.scene,
            stakes: state.mission.place,
            prompt: `Invent a local solution for ${state.mission.place} in ${state.year}.`,
            recommended: state.mission.suggested,
            successLens: "Local fit + timing + clear mechanism",
            flag: state.global?.kind === "before" ? "prevention" : "present",
          }
        : null,
      selectedTechIds: [...state.selectedTechIds],
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
      storyFace: state.storyFace,
      year: state.year,
      turn: state.turn,
      pressure: state.pressure,
      place: state.mission?.place,
      availableTechs: TECHS.map((t) => techForAi(t, state.year)),
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
    }),
    applyProposals: applyCoInventorProposals,
    techById,
    // Invent chips (Spark, stack, Art of the possible, …) only on Invent — not Challenge
    showQuickActions: !onChallenge,
    subtitle: onChallenge
      ? "Help with this challenger — you still own Defend / Fix / Sidestep"
      : "Your creative partner for this challenge",
    placeholder: onChallenge
      ? "Ask about this attack… e.g. “What would a solid Moloch answer name?”"
      : undefined,
    beforeRequest: (mode) => {
      if (!apEnabled()) return true;
      // First free coach already handled in coachChallenge; co-inventor chat always costs
      const r = dispatchSim("reserve_ai", {
        mode,
        reservedAp: 1,
        clientActionId: `co-${Date.now()}`,
      });
      if (!r.ok) {
        flashToast("No AP left for co-inventor — End Turn or Wait.");
        return false;
      }
      renderHud();
      renderChallengeHud();
      return true;
    },
    afterRequest: (_mode, ok) => {
      if (!apEnabled()) return;
      if (ok) dispatchSim("resolve_ai");
      else dispatchSim("reject_ai");
      renderHud();
      renderChallengeHud();
    },
  });
  state.coInventor.mount(root);
  if (messages.length) {
    state.coInventor.messages = messages;
    state.coInventor.renderMessages();
  }
  return state.coInventor;
}

function applyCoInventorProposals(proposals) {
  if (!proposals) return;
  let changed = false;
  for (const id of proposals.removeTechIds || []) {
    const i = state.selectedTechIds.indexOf(id);
    if (i >= 0) {
      state.selectedTechIds.splice(i, 1);
      changed = true;
    }
  }
  for (const id of proposals.addTechIds || []) {
    if (!techById(id) || state.selectedTechIds.includes(id)) continue;
    if (state.selectedTechIds.length >= 8) break;
    if (budgetWillEnabled()) {
      const cost = techCost(techById(id));
      if ((state.budget ?? 0) < cost.budget || (state.will ?? 0) < cost.will) {
        flashToast(`AI suggested ${techById(id).name} but you cannot afford it (Budget/will).`);
        continue;
      }
      state.budget -= cost.budget;
      state.will -= cost.will;
    }
    state.selectedTechIds.push(id);
    changed = true;
  }
  if (proposals.inventionName) {
    state.inventionName = proposals.inventionName;
    $("#invention-name").value = state.inventionName;
    changed = true;
  }
  if (proposals.inventionHow) {
    state.inventionHow = proposals.inventionHow;
    changed = true;
  }
  if (proposals.inventionImpact) {
    state.inventionImpact = proposals.inventionImpact;
    changed = true;
  }
  if (changed) {
    state.aiTiming = null;
    syncLearnOrderWithSelection();
    // Newly added techs from AI go to the front of Learn (most recent)
    for (const id of proposals.addTechIds || []) {
      if (state.selectedTechIds.includes(id)) pushLearnOrder(id);
    }
    renderTechList();
    renderSelectedChips();
    renderSynergy();
    renderTiming();
    renderStoryFaceUI();
    updateLearnButton();
    updateChallengeButton();
    updateVision();
    scheduleAiTimingAssess();
    flashToast("Co-inventor ideas applied");
  }
}

function setFillButtonsDisabled(disabled) {
  const btn = $("#btn-fill-other");
  if (btn) btn.disabled = disabled;
}

/** Face that complete-picture will fill (opposite of current focus). */
function completePictureTargetFace() {
  return state.storyFace === "life" ? "how" : "life";
}

async function callCoInventMode(mode, userLabel) {
  if (state.aiBusy) return;
  if (apEnabled()) {
    const reserve = dispatchSim("reserve_ai", {
      mode,
      reservedAp: 1,
      clientActionId: `ai-${Date.now()}`,
    });
    if (!reserve.ok) {
      flashToast("No AP left for AI — End Turn or Wait.");
      return;
    }
    renderHud();
  }
  state.aiBusy = true;
  setFillButtonsDisabled(true);

  const fillOther = mode === "complete-picture";
  if (fillOther) {
    const target = completePictureTargetFace();
    showStoryFacePending(
      target,
      target === "life" ? "Drafting everyday life…" : "Drafting how it works…"
    );
  }

  try {
    const ctx = {
      challenge: state.mission
        ? {
            id: state.mission.id,
            title: state.mission.title,
            problem: state.mission.scene,
            recommended: state.mission.suggested,
          }
        : null,
      selectedTechIds: [...state.selectedTechIds],
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
      storyFace: state.storyFace,
      year: state.year,
      turn: state.turn,
      place: state.mission?.place,
      pressure: state.pressure,
      availableTechs: TECHS.map((t) => techForAi(t, state.year)),
    };

    const res = await fetch("/api/co-invent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        messages: [{ role: "user", content: userLabel }],
        context: ctx,
      }),
    });
    const data = await res.json();
    // Drop the field spinner before writing text so it never overlaps the draft.
    if (fillOther) clearStoryFacePending();
    if (data.proposals) applyCoInventorProposals(data.proposals);
    if (data.message) {
      ensureCoInventor();
      state.coInventor?.pushAssistant?.(
        {
          message: data.message,
          proposals: data.proposals || emptyProps(),
          teaching: data.teaching || [],
        },
        { local: data.source === "local" }
      );
    }
    if (fillOther) {
      flashToast("Other story face filled");
      scheduleAiTimingAssess();
    }
  } catch (e) {
    if (apEnabled()) dispatchSim("reject_ai");
    flashToast(e.message || "AI request failed");
  } finally {
    if (apEnabled() && state.pendingAi) dispatchSim("resolve_ai");
    if (fillOther) clearStoryFacePending();
    state.aiBusy = false;
    setFillButtonsDisabled(false);
    updateChallengeButton();
    renderHud();
    if (fillOther) renderStoryFaceUI();
  }
}

function commitWriteIfNeeded() {
  const snap = {
    name: state.inventionName,
    how: state.inventionHow,
    impact: state.inventionImpact,
  };
  const prev = state.lastWriteSnapshot || { name: "", how: "", impact: "" };
  const changed =
    snap.name !== prev.name || snap.how !== prev.how || snap.impact !== prev.impact;
  if (!changed) return;
  const r = dispatchSim("write_commit", { changed: true });
  if (!r.ok && r.error === "no_ap_buffer") {
    flashToast("No AP for more edits — End Turn or Wait (changes kept).");
    state.lastWriteSnapshot = snap;
    return;
  }
  if (r.ok) state.lastWriteSnapshot = snap;
  renderHud();
}

/* —— Modal —— */
function learnSection(title, bodyHtml) {
  if (!bodyHtml) return "";
  return `<section class="learn-sec"><h5>${title}</h5><div class="learn-sec-body">${bodyHtml}</div></section>`;
}

function techLearnCardHtml(t, { newest = false } = {}) {
  if (!t) return "";
  const mat = t.maturity || {};
  const soft = techHorizonYear(t);
  const domain = DOMAINS[t.domain]?.label || t.domain;
  const primer =
    t.primer ||
    t.learn ||
    `${t.name} is an emerging-technology family you can invent with for this local mission.`;
  const inventWith =
    t.inventionHint ||
    `Ask how ${t.name} could change what is scarce in this place — then write a concrete local mechanism.`;
  const useNow = (t.useCasesNow || []).filter(Boolean);
  const milestones = (t.milestones || []).filter(Boolean);
  const risks = (t.risk || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const horizonNote =
    soft > state.year
      ? `Broader “near” use cases often become more common around <strong>${soft}</strong> — a soft horizon, not a lock. You may invent with this category in <strong>${state.year}</strong>; feasibility judges whether your <em>how it works</em> over-claims what is possible now.`
      : `Near-scale applications of this family are already in the toolkit in many places by <strong>${state.year}</strong>. Feasibility still judges your specific claims, not the card.`;

  const badge = newest ? `<span class="learn-newest">Latest select</span>` : "";
  const useList = useNow.length
    ? `<ul class="learn-list">${useNow.map((u) => `<li>${escapeHtml(u)}</li>`).join("")}</ul>`
    : `<p class="learn-muted">Look for pilots and products that already ship under human oversight.</p>`;
  const mileList = milestones.length
    ? `<ul class="learn-list">${milestones.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
    : "";
  const riskList = risks.length
    ? `<ul class="learn-list learn-list-warn">${risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : `<p class="learn-muted">Every tool has failure modes — name them in your design.</p>`;

  return `
    <article class="learn-tech-card ${newest ? "is-newest" : ""}" data-tech-id="${escapeHtml(t.id)}">
      <header class="learn-tech-head">
        <div>
          <h4><span class="learn-tech-icon">${t.icon}</span> ${escapeHtml(t.name)}</h4>
          <p class="learn-tech-meta">${escapeHtml(domain)} · ${escapeHtml(t.curve || "emerging")} curve</p>
        </div>
        ${badge}
      </header>
      <p class="learn-tech-summary">${escapeHtml(t.summary)}</p>
      ${learnSection("What is this family?", `<p>${escapeHtml(primer)}</p>`)}
      ${learnSection(
        "What already works",
        `<p><strong>Now:</strong> ${escapeHtml(mat.now || "Real deployments exist in some form today.")}</p>
         <p class="learn-subhead">Use cases you can honestly claim this decade</p>
         ${useList}
         ${mileList ? `<p class="learn-subhead">Recent milestones</p>${mileList}` : ""}`
      )}
      ${learnSection(
        "Where the curve is heading",
        `<p><strong>Near:</strong> ${escapeHtml(mat.near || "Broader, cheaper, more reliable applications.")}</p>
         <p><strong>Frontier (stretch if claimed as routine):</strong> ${escapeHtml(
           mat.frontier || "Transformative default infrastructure everywhere."
         )}</p>
         <p class="learn-horizon">${horizonNote}</p>`
      )}
      ${learnSection("How to invent with it here", `<p>${escapeHtml(inventWith)}</p>
         <p class="learn-muted">Pair with other domains when the local problem needs sensing, power, logistics, or care — not as a checklist.</p>`)}
      ${learnSection("Watch-outs", riskList)}
    </article>`;
}

/** Right-click / single-tech learn peek */
function openTechModal(id) {
  const t = techById(id);
  if (!t) return;
  const title = $("#modal-title");
  const lead = $("#modal-lead");
  const body = $("#modal-body");
  if (title) title.innerHTML = `${t.icon} ${escapeHtml(t.name)}`;
  if (lead) {
    lead.hidden = false;
    lead.textContent =
      "A deeper look at this emerging-tech family — what is real now, what is still stretch, and how to invent with it locally.";
  }
  if (body) body.innerHTML = techLearnCardHtml(t, { newest: true });
  $("#modal-backdrop").classList.add("open");
}

/**
 * Learn from the selection stack — newest selection first, older ones underneath.
 * Disabled when nothing is selected.
 */
function openLearnStack() {
  syncLearnOrderWithSelection();
  const ids = state.learnOrder.filter((id) => state.selectedTechIds.includes(id));
  if (!ids.length) {
    flashToast("Select at least one tech to learn about.");
    updateLearnButton();
    return;
  }
  const title = $("#modal-title");
  const lead = $("#modal-lead");
  const body = $("#modal-body");
  if (title) {
    title.textContent =
      ids.length === 1 ? "Learn · your selection" : `Learn · ${ids.length} techs (newest first)`;
  }
  if (lead) {
    lead.hidden = false;
    lead.textContent =
      ids.length === 1
        ? "What this family can do, where the curve is going, and how to invent with it in this place."
        : "Most recently selected on top. Scroll for earlier picks — same depth for each.";
  }
  if (body) {
    body.innerHTML = ids
      .map((id, i) => techLearnCardHtml(techById(id), { newest: i === 0 }))
      .join("");
  }
  $("#modal-backdrop").classList.add("open");
}

function closeModal() {
  $("#modal-backdrop").classList.remove("open");
}

/* —— Utils —— */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared AI “still working” markup — snake spinner + label */
function aiPendingHtml(label, { field = false } = {}) {
  const cls = field ? "ai-pending ai-pending--field" : "ai-pending";
  return `<div class="${cls}" role="status" aria-live="polite">
    <span class="ai-snake" aria-hidden="true"></span>
    <span class="ai-pending-label">${escapeHtml(label)}</span>
  </div>`;
}

/**
 * Show a pending indicator inside a story-face field (Fill other side).
 * @param {"how"|"life"} targetFace — face that will receive AI text
 * @param {string} label
 */
function showStoryFacePending(targetFace, label) {
  const field = targetFace === "life" ? $("#field-life") : $("#field-how");
  const note = targetFace === "life" ? $("#note-life") : $("#note-how");
  if (!field) return;
  field.classList.add("is-ai-pending");
  let el = field.querySelector(".ai-pending--field");
  if (!el) {
    el = document.createElement("div");
    el.className = "ai-pending ai-pending--field";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const header = field.querySelector(".story-face-header");
    if (header?.nextSibling) field.insertBefore(el, header.nextSibling);
    else field.prepend(el);
  }
  el.innerHTML = `<span class="ai-snake" aria-hidden="true"></span><span class="ai-pending-label">${escapeHtml(
    label
  )}</span>`;
  el.hidden = false;
  if (note) note.hidden = true;
}

function clearStoryFacePending() {
  ["#field-how", "#field-life"].forEach((sel) => {
    const field = $(sel);
    if (!field) return;
    field.classList.remove("is-ai-pending");
    field.querySelector(".ai-pending--field")?.remove();
  });
}

function flashToast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText =
      "position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(148,163,184,.3);padding:.65rem 1rem;border-radius:999px;font-size:.85rem;z-index:200;color:#e2e8f0;box-shadow:0 8px 30px rgba(0,0,0,.4);transition:opacity .3s;max-width:90vw;text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = "0";
  }, 2800);
}

async function surpriseMission() {
  const g = GLOBALS[Math.floor(Math.random() * GLOBALS.length)];
  state.global = g;
  const list = await ensureScenarios(g, { force: false });
  const m = list[Math.floor(Math.random() * list.length)] || MISSIONS[0];
  startMission(m);
}

/* —— Bind —— */
function bind() {
  $("#btn-start").addEventListener("click", () => showScreen("global"));
  $("#btn-surprise").addEventListener("click", () => {
    surpriseMission().catch(() => flashToast("Could not start a surprise mission"));
  });
  $("#btn-global-back").addEventListener("click", () => showScreen("title"));
  $("#btn-mission-back").addEventListener("click", () => showScreen("global"));
  $("#btn-regen-scenarios")?.addEventListener("click", () => {
    if (!state.global || state.scenariosLoading) return;
    renderMissions({ force: true });
  });
  $("#btn-abandon").addEventListener("click", () => {
    if (confirm("Leave this mission? The local clock resets.")) showScreen("title");
  });

  $("#invention-name").addEventListener("input", (e) => {
    state.inventionName = e.target.value;
    updateChallengeButton();
  });
  let narrativeTimer;
  const bumpNarrative = () => {
    clearTimeout(narrativeTimer);
    narrativeTimer = setTimeout(() => updateVision({ debounceMs: 200 }), 2200);
  };
  const bumpClaimTiming = () => {
    state.aiTiming = null;
    renderTiming();
    renderFeasibility();
    updateChallengeButton();
    scheduleAiTimingAssess();
  };

  $$(".story-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.storyFace = btn.dataset.face === "life" ? "life" : "how";
      renderStoryFaceUI();
      updateChallengeButton();
    });
  });

  let writeCommitTimer = null;
  const scheduleWriteCommit = () => {
    clearTimeout(writeCommitTimer);
    writeCommitTimer = setTimeout(() => commitWriteIfNeeded(), 1500);
  };
  $("#invention-how")?.addEventListener("input", (e) => {
    state.inventionHow = e.target.value;
    bumpClaimTiming();
    bumpNarrative();
    scheduleWriteCommit();
  });
  $("#invention-impact")?.addEventListener("input", (e) => {
    state.inventionImpact = e.target.value;
    bumpClaimTiming();
    bumpNarrative();
    scheduleWriteCommit();
  });
  $("#invention-name")?.addEventListener("input", (e) => {
    state.inventionName = e.target.value;
    scheduleWriteCommit();
  });
  ["#invention-how", "#invention-impact", "#invention-name"].forEach((sel) => {
    $(sel)?.addEventListener("blur", () => commitWriteIfNeeded());
  });

  $("#btn-fill-other")?.addEventListener("click", () => {
    const face = state.storyFace === "life" ? "life" : "how";
    if (!hasPlayerFace()) {
      flashToast(
        face === "how"
          ? "Write how it works first (a short paragraph), then Fill other side."
          : "Write everyday life first (a short paragraph), then Fill other side."
      );
      return;
    }
    if (!selectedTechs().length) {
      flashToast("Add at least one technology first.");
      return;
    }
    callCoInventMode("complete-picture", "[Fill other story face]");
  });

  $("#btn-wait").addEventListener("click", () => waitTurn());
  $("#btn-end-turn")?.addEventListener("click", () => endTurn());
  $("#btn-lobby")?.addEventListener("click", () => lobbyAction());
  $("#btn-to-challenge")?.addEventListener("click", () => {
    // Return to deploy bay without re-posing challenge
    if (deployStagesEnabled() && state.deployUnlocked) {
      state.turnPhase = "between_stages";
      showScreen("challenge-step");
      renderChallengeStep();
      renderDeployBay();
      return;
    }
    if (!inventReadyForChallenge()) {
      flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
      return;
    }
    if (apEnabled()) {
      const r = dispatchSim("enter_challenge");
      if (!r.ok) {
        if (r.error === "no_ap") flashToast("No AP — End Turn or Wait first.");
        return;
      }
      renderHud();
    } else {
      state.turnPhase = "scrutiny";
    }
    enterChallenge();
  });
  $("#btn-challenge-back")?.addEventListener("click", () => {
    // Leaving mid-scrutiny abandons; leaving deploy bay is cosmetic only
    if (state.deployUnlocked) {
      state.turnPhase = "between_stages";
      showScreen("workshop");
      renderWorkshop();
      return;
    }
    if (apEnabled()) dispatchSim("abandon_scrutiny");
    else state.turnPhase = "act";
    showScreen("workshop");
  });
  $("#btn-challenge-submit")?.addEventListener("click", () => submitChallengeAnswer());
  $("#btn-challenge-deploy")?.addEventListener("click", () => attemptDeploy());
  $("#btn-deploy-stage-primary")?.addEventListener("click", () => {
    const next = nextDeployStageAction();
    if (next) attemptDeployStage(next);
  });
  $("#btn-deploy-hold")?.addEventListener("click", () => holdTheLine());
  $("#btn-workshop-to-deploy")?.addEventListener("click", () => {
    if (!state.deployUnlocked) return;
    showScreen("challenge-step");
    renderChallengeStep();
    renderDeployBay();
  });
  $("#btn-challenge-coach")?.addEventListener("click", () => coachChallenge("coach-challenge"));
  $("#btn-challenge-draft")?.addEventListener("click", () => coachChallenge("draft-challenge"));
  // Mode toggles (select only)
  $("#btn-scrutiny-argue")?.addEventListener("click", () => setScrutinyMoveMode("defend"));
  $("#btn-scrutiny-patch")?.addEventListener("click", () => setScrutinyMoveMode("fix"));
  $("#btn-scrutiny-pivot")?.addEventListener("click", () => {
    if (state.scrutiny?.pivotUsed || $("#btn-scrutiny-pivot")?.disabled) {
      flashToast("Sidestep already used this run.");
      return;
    }
    setScrutinyMoveMode("sidestep");
  });
  // Confirm actions
  $("#btn-challenge-apply-fix")?.addEventListener("click", () => scrutinyPatch());
  $("#btn-challenge-confirm-sidestep")?.addEventListener("click", () => scrutinyPivot());
  $("#btn-challenge-end-turn")?.addEventListener("click", () => {
    endTurn();
    renderChallengeHud();
    renderChallengeStep();
  });
  $("#challenge-help-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#challenge-help-input")?.value?.trim();
    if (!q) {
      flashToast("Type a question for the co-inventor.");
      return;
    }
    coachChallenge("coach-challenge", q);
    $("#challenge-help-input").value = "";
  });
  $("#btn-open-coinventor").addEventListener("click", () => setSideTab("coinventor"));
  $("#btn-learn-tech").addEventListener("click", () => openLearnStack());
  $("#btn-regen-vision").addEventListener("click", () => updateVision({ immediate: true, force: true }));

  $$(".side-tab").forEach((btn) => btn.addEventListener("click", () => setSideTab(btn.dataset.tab)));

  $("#btn-outcome-new").addEventListener("click", () => showScreen("global"));
  $("#btn-outcome-retry").addEventListener("click", () => {
    if (state.mission) showScreen("workshop");
    else showScreen("global");
  });

  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });

  const openHelp = () => $("#help-backdrop")?.classList.add("open");
  const closeHelp = () => $("#help-backdrop")?.classList.remove("open");
  $("#btn-help")?.addEventListener("click", openHelp);
  $("#btn-challenge-help")?.addEventListener("click", openHelp);
  $("#help-close")?.addEventListener("click", closeHelp);
  $("#help-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "help-backdrop") closeHelp();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeHelp();
    }
  });

  $("#game-title").textContent = GAME.title;
  $("#game-tagline").textContent = GAME.tagline;
  $$(".brand-name").forEach((el) => {
    el.textContent = GAME.title;
  });
}

export function init() {
  loadPersistedProgress();
  bind();
  showScreen("title");
}
