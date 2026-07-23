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

const state = {
  screen: "title",
  global: null,
  mission: null,
  year: GAME.startYear,
  turn: 0,
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
  domainFilter: "all",
  vision: null,
  coInventor: null,
  sideTab: "vision",
  lastNews: "",
  waitReport: "",
  outcome: null,
  aiBusy: false,
  /** @type {{ level: string, reason: string, forKey: string } | null} */
  aiTiming: null,
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
};

const STORAGE_SCENARIOS = "future-forge:scenarioCache";
const STORAGE_SOLVED = "future-forge:solvedMissions";

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
  const n = state.selectedTechIds.length;
  let stage = VISION_STAGES[0];
  for (const s of VISION_STAGES) {
    if (n >= s.minTechs) stage = s;
  }
  return stage;
}

function clonePressure(p) {
  return { ...p };
}

function totalPressure(p = state.pressure) {
  return Object.values(p).reduce((a, b) => a + b, 0);
}

function maxPressure(p = state.pressure) {
  return Math.max(0, ...Object.values(p));
}

function wonMission() {
  const win = state.mission?.winMax || {};
  return Object.entries(win).every(([k, max]) => (state.pressure[k] ?? 0) <= max);
}

function collapsed() {
  return state.year >= state.mission.collapseYear || maxPressure() >= 5;
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
  if (id === "challenge-step") renderChallengeStep();
  if (id === "outcome") renderOutcome();
}

/* —— Global / mission select —— */
const SCENARIO_COUNT = 4;

function problemVisualUrl(globalId) {
  return `assets/problems/${globalId}.jpg`;
}

function renderGlobals() {
  const grid = $("#global-grid");
  grid.innerHTML = GLOBALS.map((g) => {
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
  }).join("");
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
  state.domainFilter = "all";
  state.sideTab = "vision";
  state.lastNews = "";
  state.waitReport = "";
  state.outcome = null;
  state.aiTiming = null;
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
  ensureCoInventor();
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
    field.classList.remove("is-focus", "is-other", "is-player", "is-companion", "is-both");
    field.classList.add(`is-${role}`);
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
  $("#hud-turn").textContent = `Turn ${state.turn} · fail at ${state.mission.collapseYear}`;
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
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${sug ? "recommended" : ""}"
          data-id="${t.id}" style="--domain:${color}" title="${escapeHtml(nowCap)}">
          <span class="tech-icon">${t.icon}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${DOMAINS[t.domain]?.label || t.domain}${
              sug ? " · suggested" : ""
            }</span>
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
    state.selectedTechIds.splice(idx, 1);
    removeFromLearnOrder(id);
  } else {
    if (state.selectedTechIds.length >= 8) {
      flashToast("Stack full (8). Remove one first.");
      return;
    }
    state.selectedTechIds.push(id);
    pushLearnOrder(id);
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
  if (techs.length === 1) {
    box.innerHTML = `Stack: <strong>${escapeHtml(techs[0].name)}</strong> (${DOMAINS[domains[0]]?.label || domains[0]}). A single tool can be enough if the mechanism is clear.`;
    return;
  }
  const pairText = pairs.length
    ? ` Synergies: ${pairs.map(([a, b]) => `${techById(a).name} × ${techById(b).name}`).join(" · ")}.`
    : "";
  if (domains.length >= 2) {
    box.innerHTML = `<strong>Cross-domain mix:</strong> ${domains
      .map((d) => DOMAINS[d]?.label || d)
      .join(" + ")}.${pairText}`;
  } else {
    box.innerHTML = `Stack in <strong>${DOMAINS[domains[0]]?.label}</strong> (${techs.length} techs).${pairText} Fine to deploy — add another domain only if you need it.`;
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
function waitTurn() {
  if (collapsed()) {
    finishOutcome("collapse");
    return;
  }
  const m = state.mission;
  const step = m.yearsPerTurn || GAME.yearsPerTurn;
  const prevYear = state.year;
  const prevPressure = clonePressure(state.pressure);
  state.year += step;
  state.turn += 1;

  const rise = m.pressureRise || {};
  for (const [k, v] of Object.entries(state.pressure)) {
    const delta = rise[k] ?? 1;
    state.pressure[k] = Math.min(5, v + delta);
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

  state.waitReport = `<strong>→ ${state.year}</strong> (Wait from ${prevYear})<br/>
    <span class="ok">Capability horizon:</span> ${escapeHtml(horizon)}<br/>
    <span class="bad">Crisis rose:</span> ${escapeHtml(crisisLine)}<br/>
    <span class="muted">${escapeHtml(news)}</span>`;
  state.lastNews = `→ ${state.year}. ${horizon}. Crisis tightened. ${news}`.trim();
  state.aiTiming = null; // re-evaluate claims in new year
  state.challengePassed = false;
  state.challengeVerdict = null;

  if (collapsed()) {
    renderWorkshop();
    finishOutcome("collapse");
    return;
  }

  flashToast(`Clock → ${state.year} · crisis rose`);
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
  if (state.challengeFails >= 2) state.challengeFails = 0;
  const angle = pickChallengeAngle();
  state.challengeAngle = angle.id;
  showScreen("challenge-step");
  await poseChallenge(angle);
}

async function poseChallenge(angleMeta) {
  const angle = angleMeta || CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle);
  $("#challenge-angle-label").textContent = "Your idea is under attack";
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  setChallengerVisual(angle);
  $("#ch-hud-year").textContent = String(state.year);
  $("#ch-hud-turn").textContent = `Turn ${state.turn}`;
  $("#challenge-speech").innerHTML = `<p class="muted">Posing challenge…</p>`;
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#btn-challenge-deploy").hidden = true;
  $("#btn-challenge-submit").disabled = true;

  try {
    const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
      challengeAngle: angle.id,
    });
    state.challengeText = data.challengeSpeech || data.message || "";
    state.challengeQuestion =
      data.challengeQuestion || "How does your invention survive this attack?";
    if (data.angle) state.challengeAngle = data.angle;
    const meta = CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle) || angle;
    $("#challenge-angle-title").textContent = data.angleLabel || meta.label;
    $("#challenge-angle-sub").textContent = `${meta.subtitle} — ${meta.blurb}`;
    setChallengerVisual(meta);
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(/\n/g, "<br>")}</p>`;
    $("#challenge-question").textContent = state.challengeQuestion;
  } catch {
    const fb = localPose(angle);
    state.challengeText = fb.speech;
    state.challengeQuestion = fb.question;
    setChallengerVisual(angle);
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(fb.speech)}</p>`;
    $("#challenge-question").textContent = fb.question;
  }
  $("#btn-challenge-submit").disabled = false;
}

function renderChallengeStep() {
  $("#ch-hud-year").textContent = String(state.year);
  $("#ch-hud-turn").textContent = `Turn ${state.turn}`;
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
  $("#challenge-answer").value = state.challengeAnswer || "";
  const fb = $("#challenge-feedback");
  const dep = $("#btn-challenge-deploy");
  if (state.challengeFeedback) {
    fb.hidden = false;
    fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
    fb.innerHTML = state.challengeFeedback;
  } else fb.hidden = true;
  if (state.challengePassed) {
    dep.hidden = false;
    dep.disabled = false;
  } else {
    dep.hidden = true;
    dep.disabled = true;
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
  state.aiBusy = true;
  setChallengeHelpBusy(true);
  showChallengeCoach(`<p class="muted">${mode === "draft-challenge" ? "Drafting…" : "Coaching…"}</p>`);
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
  } catch (e) {
    // local fallback
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
    state.aiBusy = false;
    setChallengeHelpBusy(false);
  }
}

async function submitChallengeAnswer() {
  const answer = $("#challenge-answer").value.trim();
  state.challengeAnswer = answer;
  if (answer.length < 20) {
    flashToast("Give a real answer — a short paragraph.");
    return;
  }
  $("#btn-challenge-submit").disabled = true;
  try {
    const data = await apiCoInvent("judge-challenge", answer, {
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
      playerAnswer: answer,
    });
    const verdict = (data.verdict || "partial").toLowerCase();
    state.challengeVerdict = ["pass", "partial", "fail"].includes(verdict) ? verdict : "partial";
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
    }
  } catch {
    const ok = answer.length >= 40;
    state.challengeVerdict = ok ? "partial" : "fail";
    state.challengePassed = ok;
    state.challengeFeedback = ok
      ? "<strong>PARTIAL</strong> — Concrete enough to try a deploy."
      : "<strong>FAIL</strong> — Too vague. Name who acts, who pays, or what limit you respect.";
    if (!ok) state.challengeFails += 1;
  }
  $("#btn-challenge-submit").disabled = false;
  renderChallengeStep();
}

function attemptDeploy() {
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

  const domains = domainsInStack(techs);
  const pairs = computeSynergies(techs);
  const words = (state.inventionHow + " " + state.inventionImpact).trim().split(/\s+/).length;
  let drop = 1 + Math.min(2, techs.length - 1);
  if (domains.length >= 2) drop += 1;
  if (pairs.length) drop += 1;
  if (words >= 40) drop += 1;
  if (state.challengeVerdict === "pass") drop += 1;
  if (state.challengeAnswer.trim().length >= 60) drop += 1;
  const suggested = new Set(state.mission.suggested || []);
  if (techs.filter((t) => suggested.has(t.id)).length >= 2) drop += 1;

  const keys = Object.keys(state.pressure);
  const ordered = [...keys].sort((a, b) => state.pressure[b] - state.pressure[a]);
  let remaining = drop;
  for (const k of ordered) {
    if (remaining <= 0) break;
    const can = state.pressure[k];
    const take = Math.min(can, Math.ceil(remaining / 2) || 1);
    state.pressure[k] = Math.max(0, can - take);
    remaining -= take;
  }
  for (const k of ordered) {
    if (remaining <= 0) break;
    if (state.pressure[k] > 0) {
      state.pressure[k]--;
      remaining--;
    }
  }

  state.lastNews = `Deployed in ${state.year} after ${state.challengeAngle} challenge. Crisis −${drop}.`;
  state.waitReport = "";
  // Deployed = solved (full win or partial relief); still replayable from the mission grid
  markMissionSolved(state.mission);
  finishOutcome(wonMission() ? "win" : "partial", {
    drop,
    domains,
    pairs,
    verdict: state.challengeVerdict,
    angle: state.challengeAngle,
  });
}

function finishOutcome(kind, meta = {}) {
  const techs = selectedTechs();
  // Collapse / abandon does not mark solved — only deploy paths above do
  state.outcome = { kind, meta, techs, year: state.year, turn: state.turn, pressure: clonePressure(state.pressure) };
  showScreen("outcome");
}

function renderOutcome() {
  const o = state.outcome;
  const m = state.mission;
  const name = state.inventionName.trim() || "Untitled invention";
  $("#outcome-name").textContent = name;
  $("#outcome-meta").textContent = `${m.place} · ${o.year} · Turn ${o.turn} · ${
    state.global?.title || ""
  }`;

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
      problem: state.mission.scene,
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
function ensureCoInventor() {
  if (state.coInventor) return state.coInventor;
  const root = $("#co-inventor-root");
  if (!root) return null;
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
    }),
    applyProposals: applyCoInventorProposals,
    techById,
  });
  state.coInventor.mount(root);
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

async function callCoInventMode(mode, userLabel) {
  if (state.aiBusy) return;
  state.aiBusy = true;
  setFillButtonsDisabled(true);

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
    if (mode === "complete-picture") {
      flashToast("Other story face filled");
      scheduleAiTimingAssess();
    }
  } catch (e) {
    flashToast(e.message || "AI request failed");
  } finally {
    state.aiBusy = false;
    setFillButtonsDisabled(false);
    updateChallengeButton();
  }
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

  $("#invention-how")?.addEventListener("input", (e) => {
    state.inventionHow = e.target.value;
    bumpClaimTiming();
    bumpNarrative();
  });
  $("#invention-impact")?.addEventListener("input", (e) => {
    state.inventionImpact = e.target.value;
    bumpClaimTiming();
    bumpNarrative();
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
  $("#btn-to-challenge")?.addEventListener("click", () => enterChallenge());
  $("#btn-challenge-back")?.addEventListener("click", () => showScreen("workshop"));
  $("#btn-challenge-submit")?.addEventListener("click", () => submitChallengeAnswer());
  $("#btn-challenge-deploy")?.addEventListener("click", () => attemptDeploy());
  $("#btn-challenge-coach")?.addEventListener("click", () => coachChallenge("coach-challenge"));
  $("#btn-challenge-draft")?.addEventListener("click", () => coachChallenge("draft-challenge"));
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
