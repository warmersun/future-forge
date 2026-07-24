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
  successChancePct,
  rollDeploySuccess,
} from "./sim/deploy.js";
import { isWin as simIsWin, isCollapsed as simIsCollapsed } from "./sim/collapse.js";
import { scoreRun, starLabel } from "./sim/scoring.js";
import {
  applyAction,
  simSliceFromState,
  applySimSliceToState,
} from "./sim/actions.js";
import { techCost, deployActionCost, scaleActionCost } from "./sim/economy.js";
import {
  dailySeedString,
  pickDailyMission,
  loadPins,
  togglePin,
  isPinned,
  MAX_PINS,
  renderShareCard,
  downloadDataUrl,
  kindLabelForOutcome,
} from "./meta.js";
import { initFriendsUi } from "./multiplayer/ui.js";
import { createHotseatBridge } from "./multiplayer/hotseat-bridge.js";
import { isWin } from "./sim/collapse.js";
import { rankSurvivors } from "./sim/mp-rank.js";
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

/** Hotseat session bridged into solo workshop / challenge / deploy */
const hotseatBridge = createHotseatBridge();

const state = {
  screen: "title",
  global: null,
  mission: null,
  /** @type {null | object} multiplayer chrome flags (set by hotseatBridge.hydrateSoloState) */
  mp: null,
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
  /** Challenge side panel: vision | coinventor */
  challengeSideTab: "vision",
  /** Last vision beat for challenge (pose / defend / fix / sidestep) */
  challengeVisionBeat: null,
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
  /** True while pose-challenge AI is generating the critic (UI locked) */
  challengePosePending: false,
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
  /** @type {{ stage: string, ok: boolean, pct: number, roll: number, level: string }|null} */
  lastDeployRoll: null,
};

/** v3: curated seed packs for all themes (invalidates old AI/local caches) */
const STORAGE_SCENARIOS = "future-forge:scenarioCache:v3";
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
  if (result.ok) {
    applySimSliceToState(state, result.sim);
    mpSyncFromSolo();
    // Solo: Budget 0 is terminal (after any spend that emptied the wallet)
    // Hotseat: personal budget 0 is not whole-table game over
    if (!hotseatBridge.isHotseat() && type !== "wait" && type !== "end_turn") {
      maybeBudgetGameOver({ from: type });
    }
  }
  return result;
}

function mpActive() {
  return hotseatBridge.isHotseat();
}

function mpSyncFromSolo() {
  if (!hotseatBridge.isHotseat()) return;
  hotseatBridge.syncSoloToSession(state);
}

function mpHydrateAndRender() {
  if (!hotseatBridge.isHotseat()) return;
  hotseatBridge.hydrateSoloState(state, { global: state.global });
  renderMpChrome();
  if (state.screen === "workshop") renderWorkshop();
  else if (state.screen === "challenge-step") renderChallengeStep();
  updateVision({ debounceMs: 400 });
}

function setMpActivePlayerBadges(on, name) {
  const badges = ["#mp-active-player", "#mp-active-player-ch"]
    .map((sel) => $(sel))
    .filter(Boolean);
  for (const badge of badges) {
    if (!on) {
      badge.hidden = true;
      badge.setAttribute("hidden", "");
      badge.innerHTML = "";
      continue;
    }
    badge.hidden = false;
    badge.removeAttribute("hidden");
    // Name first, compact — lives beside Future Forge in the topbar
    badge.innerHTML = `<strong>${escapeHtml(name || "—")}</strong><span class="mp-active-label"> · turn</span>`;
    badge.title = `${name || "Player"}'s turn — pass the device when they finish`;
  }
}

/**
 * While a contribution (AI draft + additive judge) is in flight, lock pass / seat
 * navigation so the player cannot leave mid-evaluation.
 * @type {boolean}
 */
let mpContributionLock = false;
/** @type {string} */
let mpContributionLockReason = "Wait — contribution is being evaluated…";

const MP_LOCK_CONTROL_IDS = [
  "#btn-mp-pass-device",
  "#btn-mp-prev-invent",
  "#btn-mp-next-invent",
  "#btn-end-turn",
  "#btn-challenge-end-turn",
  "#btn-wait",
];

function isMpContributionLocked() {
  return Boolean(mpContributionLock);
}

/**
 * @param {boolean} locked
 * @param {string} [reason]
 */
function setMpContributionLock(locked, reason) {
  mpContributionLock = Boolean(locked);
  if (reason) mpContributionLockReason = reason;
  applyMpContributionLockToDom();
}

function applyMpContributionLockToDom() {
  const locked = isMpContributionLocked();
  const reason = mpContributionLockReason;
  for (const sel of MP_LOCK_CONTROL_IDS) {
    const el = $(sel);
    if (!el) continue;
    el.disabled = locked;
    if (locked) {
      el.dataset.mpLockTitle = el.title || "";
      el.title = reason;
    } else if (el.dataset.mpLockTitle != null) {
      el.title = el.dataset.mpLockTitle;
      delete el.dataset.mpLockTitle;
    }
  }
  $$("#mp-seat-tabs [data-seat], #mp-seat-tabs .mp-seat-tab").forEach((btn) => {
    btn.disabled = locked;
    if (locked) btn.title = reason;
    else btn.removeAttribute("title");
  });
  const bar = $("#mp-workshop-bar");
  if (bar) bar.classList.toggle("is-contrib-locked", locked);
}

function renderMpChrome() {
  const bar = $("#mp-workshop-bar");
  if (!bar) return;
  const on = hotseatBridge.isHotseat();
  bar.hidden = !on;
  document.body.classList.toggle("mp-hotseat", on);
  if (!on) {
    setMpActivePlayerBadges(false);
    setMpContributionLock(false);
    return;
  }

  const active = hotseatBridge.activeSeat();
  setMpActivePlayerBadges(true, active?.displayName || "—");

  const seats = hotseatBridge.seatSummaries();
  const list = $("#mp-seat-tabs");
  if (list) {
    list.innerHTML = seats
      .map((s) => {
        const cls = [
          "mp-seat-tab",
          s.active ? "is-active-turn" : "",
          s.viewing ? "is-viewing" : "",
          s.abandoned ? "is-abandoned" : "",
          s.phase === "challenge" ? "is-challenge" : "",
          s.phase === "deploy" ? "is-deploy" : "",
          s.phase === "scaled" ? "is-scaled" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const label = s.inventionName
          ? `${s.displayName}: ${s.inventionName.slice(0, 18)}`
          : s.displayName;
        const phaseTag =
          s.phase === "challenge"
            ? '<span class="tag">challenge</span>'
            : s.phase === "deploy"
              ? '<span class="tag">deploy</span>'
              : s.phase === "scaled"
                ? '<span class="tag">scaled</span>'
                : "";
        return `<button type="button" class="${cls}" data-seat="${escapeHtml(s.id)}">
          <span class="mp-seat-tab-name">${escapeHtml(label)}</span>
          ${s.active ? '<span class="tag">turn</span>' : ""}
          ${s.viewing ? '<span class="tag">viewing</span>' : ""}
          ${phaseTag}
          <span class="muted sm">${s.stackCount} tech</span>
        </button>`;
      })
      .join("");
    list.querySelectorAll("[data-seat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isMpContributionLocked()) {
          flashToast(mpContributionLockReason);
          return;
        }
        mpSyncFromSolo();
        hotseatBridge.setViewSeat(btn.dataset.seat);
        mpHydrateAndRender();
        const phase = hotseatBridge.viewedPhase?.() || "invent";
        if (!hotseatBridge.viewingOther()) {
          flashToast("Your invention");
        } else if (phase === "invent") {
          flashToast("Viewing their invent — additive story + tech layers (you pay)");
        } else if (phase === "challenge") {
          flashToast("They're in Challenge — watch only. Invention is locked.");
        } else if (phase === "deploy") {
          flashToast("Invent locked after Challenge — you may Pilot/Scale it (you pay).");
        } else {
          flashToast("This invent is locked (scaled or abandoned)");
        }
      });
    });
  }

  const hint = $("#mp-view-hint");
  if (hint) {
    const who = active?.displayName || "Player";
    const phase = hotseatBridge.viewedPhase?.() || "invent";
    if (isMpContributionLocked()) {
      hint.textContent = mpContributionLockReason;
      hint.hidden = false;
    } else if (hotseatBridge.viewingOther()) {
      if (phase === "invent") {
        hint.textContent = `${who}'s turn · helping their invent — additive story & tech layers (you pay). Only the owner faces Challenge.`;
      } else if (phase === "challenge") {
        hint.textContent = `${who}'s turn · their invent is in Challenge — locked. Owner defends alone.`;
      } else if (phase === "deploy") {
        hint.textContent = `${who}'s turn · invent locked after Challenge — open Deploy to Pilot/Scale it (you pay). No more story or tech changes.`;
      } else {
        hint.textContent = `${who}'s turn · this invent is Scaled or abandoned. Work on yours or browse.`;
      }
      hint.hidden = false;
    } else if (phase === "deploy") {
      hint.textContent = `${who}'s turn · your invent is locked after Challenge — Deploy bay for Pilot → Scale. Friends may Pilot/Scale it on their turns too.`;
      hint.hidden = false;
    } else if (hotseatBridge.canContributeStory()) {
      hint.textContent = `${who}'s turn · your invention — invent like solo (How / Everyday life, then Challenge → Pilot → Scale).`;
      hint.hidden = false;
    } else {
      hint.textContent = `${who}'s turn · this invent is locked (abandoned or Scaled). Browse another seat.`;
      hint.hidden = false;
    }
  }

  // Story: invent phase only (own or additive help on others still inventing)
  const canStory = hotseatBridge.canContributeStory() && !isMpContributionLocked();
  ["#invention-name", "#invention-how", "#invention-impact"].forEach((sel) => {
    const el = $(sel);
    if (el) el.readOnly = !canStory;
  });
  const fill = $("#btn-fill-other");
  if (fill) fill.disabled = !canStory;
  $$(".story-mode-btn").forEach((b) => {
    b.disabled = !canStory;
  });
  // Challenge / Deploy bay: owner only
  const chBtn = $("#btn-to-challenge");
  if (chBtn) {
    if (!hotseatBridge.canFaceChallenge() || isMpContributionLocked()) {
      if (!state.deployUnlocked) {
        chBtn.disabled = true;
        chBtn.title = isMpContributionLocked()
          ? mpContributionLockReason
          : hotseatBridge.viewingOther()
            ? "Only the owner can face Challenge on this invent"
            : "Cannot challenge this invent right now";
      }
    }
  }
  const endBtn = $("#btn-end-turn");
  if (endBtn && !endBtn.hidden) {
    endBtn.textContent = "Pass device →";
    endBtn.title = isMpContributionLocked()
      ? mpContributionLockReason
      : "End your seat-turn and pass to the next player";
  }
  const abandon = $("#btn-abandon");
  if (abandon) abandon.textContent = "Leave hotseat";

  // Re-apply after seat tabs rebuild (render would otherwise re-enable them)
  applyMpContributionLockToDom();
}

function mpPassDevice() {
  if (!hotseatBridge.isHotseat()) return;
  if (isMpContributionLocked()) {
    flashToast(mpContributionLockReason);
    return;
  }
  mpSyncFromSolo();
  const r = hotseatBridge.passDevice();
  if (!r.ok) {
    flashToast(
      r.error === "end_turn_noop"
        ? "Do something this turn first (or Wait)."
        : r.error || "Cannot pass"
    );
    return;
  }
  flashToast(`Passed device → ${r.seat?.displayName || "next"}`);
  showScreen("workshop");
  mpHydrateAndRender();
}

function enterHotseatPlay(names, mission, global) {
  const r = hotseatBridge.startFromPick(names, mission, global?.id || mission.globalId);
  if (!r.ok) {
    flashToast(r.error || "Hotseat start failed");
    return false;
  }
  state.global = global || globalById(mission.globalId) || state.global;
  // Reset solo-ish fields then hydrate from bridge
  state.domainFilter = "all";
  state.sideTab = "vision";
  state.outcome = null;
  state.runReport = null;
  state.scrutiny = null;
  state.coInventor?.reset?.(false);
  if (state.vision) state.vision.newSession();
  hotseatBridge.hydrateSoloState(state, { global: state.global });
  // Ensure feature flags match solo workshop
  showScreen("workshop");
  mpHydrateAndRender();
  flashToast(`Hotseat · ${hotseatBridge.activeSeat()?.displayName || "Player"}'s turn`);
  return true;
}

function leaveHotseat() {
  hotseatBridge.clear();
  state.mp = null;
  document.body.classList.remove("mp-hotseat");
  const bar = $("#mp-workshop-bar");
  if (bar) bar.hidden = true;
  setMpContributionLock(false);
  setMpActivePlayerBadges(false);
  const abandon = $("#btn-abandon");
  if (abandon) abandon.textContent = "Abandon";
  const endBtn = $("#btn-end-turn");
  if (endBtn) {
    endBtn.textContent = "End turn";
    endBtn.title = "Refill AP without advancing the calendar or crisis";
  }
  const chEnd = $("#btn-challenge-end-turn");
  if (chEnd) {
    chEnd.textContent = "End turn";
    chEnd.title = "Refill AP without advancing the calendar or crisis";
  }
  ["#invention-name", "#invention-how", "#invention-impact"].forEach((sel) => {
    const el = $(sel);
    if (el) el.readOnly = false;
  });
}

/**
 * Solo rule: running out of Budget ends the mission.
 * @returns {boolean} true if the run just ended
 */
function maybeBudgetGameOver(meta = {}) {
  if (!budgetWillEnabled()) return false;
  if (state.screen === "outcome") return false;
  if (!state.mission) return false;
  if ((state.budget ?? 0) > 0) return false;
  flashToast("Budget hit 0$ — game over. Capital ran out before the idea could field.");
  finishOutcome("collapse", {
    bankrupt: true,
    reason: "budget",
    ...meta,
  });
  return true;
}

function loadPersistedProgress() {
  // Drop pre-v3 scenario caches (weak AI / incomplete theme packs)
  try {
    localStorage.removeItem("future-forge:scenarioCache");
    localStorage.removeItem("future-forge:scenarioCache:v2");
  } catch {
    /* ignore */
  }
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
  if (id === "title") renderTitleMeta();
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
    setChallengeSideTab(state.challengeSideTab || "vision");
    requestAnimationFrame(() => {
      ensureVision();
      // Share invent frame into challenge canvas, then evolve with critic
      const chRoot = $("#challenge-vision-root");
      if (state.vision && chRoot) {
        state.vision.addMirror(chRoot);
        if (state.vision.currentUrl) {
          const img = chRoot.querySelector(".vision-image");
          if (img) {
            img.hidden = false;
            img.src = state.vision.currentUrl;
          }
        }
      }
      updateVision({ immediate: true, context: "challenge" });
    });
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

function renderTitleMeta() {
  renderDailyCard();
  renderPinsPanel();
}

function renderDailyCard() {
  const card = $("#daily-card");
  if (!card) return;
  const daily = pickDailyMission(GLOBALS, localScenariosForGlobal, dailySeedString());
  state.dailyPick = daily;
  if (!daily?.mission) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const seedEl = $("#daily-seed-label");
  const titleEl = $("#daily-title");
  const metaEl = $("#daily-meta");
  const sceneEl = $("#daily-scene");
  const pinBtn = $("#btn-daily-pin");
  if (seedEl) seedEl.textContent = daily.seed;
  if (titleEl) titleEl.textContent = daily.mission.title;
  if (metaEl) {
    metaEl.textContent = `${daily.global.title} · ${daily.mission.place} · ${
      daily.mission.startYear || GAME.startYear
    }`;
  }
  if (sceneEl) {
    const s = daily.mission.scene || "";
    sceneEl.textContent = s.length > 220 ? `${s.slice(0, 220)}…` : s;
  }
  if (pinBtn) {
    const pinned = isPinned(daily.mission.id);
    pinBtn.textContent = pinned ? "Pinned ✓" : "Pin";
    pinBtn.classList.toggle("is-pinned", pinned);
  }
}

function renderPinsPanel() {
  const panel = $("#pins-panel");
  const list = $("#pins-list");
  if (!panel || !list) return;
  const pins = loadPins();
  state.pins = pins;
  if (!pins.length) {
    panel.hidden = true;
    list.innerHTML = "";
    return;
  }
  panel.hidden = false;
  list.innerHTML = pins
    .map(
      (p) => `
    <div class="pin-row" data-mission-id="${escapeHtml(p.missionId)}" data-global-id="${escapeHtml(
        p.globalId
      )}">
      <div class="pin-copy">
        <strong>${escapeHtml(p.title)}</strong>
        <span class="muted">${escapeHtml(p.place)}${
          p.globalTitle ? ` · ${escapeHtml(p.globalTitle)}` : ""
        }</span>
      </div>
      <div class="pin-actions">
        <button type="button" class="btn btn-primary btn-sm pin-play">Play</button>
        <button type="button" class="btn btn-ghost btn-sm pin-remove" title="Unpin">×</button>
      </div>
    </div>`
    )
    .join("");
  list.querySelectorAll(".pin-row").forEach((row) => {
    row.querySelector(".pin-play")?.addEventListener("click", () => playPinnedMission(row));
    row.querySelector(".pin-remove")?.addEventListener("click", () => {
      const missionId = row.dataset.missionId;
      const pin = pins.find((p) => p.missionId === missionId);
      if (!pin) return;
      togglePin(
        { id: pin.missionId, globalId: pin.globalId, title: pin.title, place: pin.place },
        { id: pin.globalId, title: pin.globalTitle }
      );
      renderPinsPanel();
      renderDailyCard();
      flashToast("Unpinned.");
    });
  });
}

async function playPinnedMission(row) {
  const missionId = row?.dataset?.missionId;
  const globalId = row?.dataset?.globalId;
  const g = globalById(globalId);
  if (!g) {
    flashToast("Pinned theme missing.");
    return;
  }
  state.global = g;
  const list = await ensureScenarios(g, { force: false });
  let m = list.find((x) => x.id === missionId);
  if (!m) {
    // Rebuild from seeds with pin metadata
    const pin = loadPins().find((p) => p.missionId === missionId);
    const pack = localScenariosForGlobal(g, { count: 4, salt: 0 });
    m = pack.find((x) => x.id === missionId) || {
      id: missionId,
      globalId,
      title: pin?.title || "Pinned mission",
      place: pin?.place || g.title,
      startYear: GAME.startYear,
      collapseYear: GAME.startYear + 8,
      yearsPerTurn: GAME.yearsPerTurn,
      pressure: { Pressure: 2, Capacity: 2, Trust: 1 },
      pressureRise: { Pressure: 1, Capacity: 1, Trust: 0 },
      winMax: { Pressure: 1, Capacity: 1, Trust: 1 },
      scene: `Pinned local scenario for ${g.title}.`,
      stakeholder: "Local working group",
      suggested: ["ai", "iot", "networks"],
      visionTheme: "rebuild-city",
      source: "curated",
    };
    m = normalizeMission(m, globalId);
  }
  startMission(m);
}

function pinMission(mission, global) {
  const r = togglePin(mission, global || state.global || globalById(mission?.globalId));
  if (!r.ok && r.error === "pins_full") {
    flashToast(`Pin list full (max ${MAX_PINS}). Unpin one first.`);
    return r;
  }
  if (r.added) flashToast("Pinned — find it on the home screen.");
  if (r.removed) flashToast("Unpinned.");
  renderPinsPanel();
  renderDailyCard();
  return r;
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
      const pinned = isPinned(m.id);
      const scene = (m.scene || "").slice(0, 180);
      const ellipsis = (m.scene || "").length > 180 ? "…" : "";
      return `
    <div class="mission-card-wrap">
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
      </button>
      <button
        type="button"
        class="btn-pin ${pinned ? "is-pinned" : ""}"
        data-pin-id="${escapeHtml(m.id)}"
        title="${pinned ? "Unpin" : `Pin (max ${MAX_PINS})`}"
        ${disabled ? "disabled" : ""}
      >${pinned ? "Pinned" : "Pin"}</button>
    </div>`;
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
  grid.querySelectorAll(".btn-pin").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mission = state.missionChoices.find((m) => m.id === btn.dataset.pinId);
      if (!mission) return;
      pinMission(mission, state.global);
      paintMissionCards(state.missionChoices, { disabled: false });
    });
  });
}

async function ensureScenarios(global, { force = false } = {}) {
  if (!global) return [];
  // Prefer last cached set (unless user asked for a fresh generation)
  if (!force && state.scenarioCache[global.id]?.length) {
    return state.scenarioCache[global.id].slice(0, SCENARIO_COUNT);
  }

  // Product default: curated seed packs for every theme (not AI one-shots).
  // "Generate new set" (force) still tries the AI, then falls back to salted seeds.
  const seedLocal = () => {
    const localPack = localScenariosForGlobal(global, {
      count: SCENARIO_COUNT,
      salt: force ? Date.now() % 10000 : 0,
    })
      .map((m) => normalizeMission({ ...m, source: "curated" }, global.id))
      .slice(0, SCENARIO_COUNT);
    return cacheScenariosForGlobal(global.id, localPack);
  };

  if (!force) {
    return seedLocal();
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
          seedMissions: localScenariosForGlobal(global, { count: SCENARIO_COUNT }).map((m) => ({
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
          guidance:
            "Missions must match the theme's true scale. Asteroid = civilization-class NEO / planetary defense, not a village siren. Nuclear = strategic misjudgment risk. Keep each scenario concrete and inventable with emerging tech.",
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

  return seedLocal();
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

/**
 * Multiplayer reuses solo theme → mission screens.
 * When set, picking a mission calls onSelect instead of starting solo workshop.
 * @type {null | { onSelect: (mission: object, global: object|null) => void, onCancel?: () => void }}
 */
let missionPickSession = null;

/**
 * Begin the exact solo crisis → local scenario pick flow for multiplayer.
 * @param {{ onSelect: Function, onCancel?: Function }} handler
 */
function beginMissionPick(handler) {
  missionPickSession = handler || null;
  state.global = null;
  state.missionChoices = [];
  state.scenariosLoading = false;
  showScreen("global");
}

function clearMissionPickSession() {
  missionPickSession = null;
}

function startMission(mission) {
  if (state.scenariosLoading) {
    flashToast("Scenarios still drafting — wait a moment.");
    return;
  }
  if (!mission) return;

  // Multiplayer intercept — same cards, different continue
  if (missionPickSession) {
    const session = missionPickSession;
    missionPickSession = null;
    const global = globalById(mission.globalId) || state.global;
    try {
      session.onSelect(mission, global);
    } catch (e) {
      console.error("[mission pick]", e);
      flashToast(e.message || "Could not start multiplayer mission");
    }
    return;
  }

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
  state.challengeSideTab = "vision";
  state.challengeVisionBeat = null;
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
  if (!m) return;
  const g = state.global || globalById(m.globalId);
  $("#ws-global-label").textContent = g
    ? hotseatBridge.isHotseat()
      ? `Hotseat · ${g.title}`
      : `Global · ${g.title}`
    : "Mission";
  $("#ws-mission-title").textContent = m.title;
  $("#ws-mission-place").textContent = `${m.place}`;
  $("#ws-mission-scene").textContent = m.scene || m.problem || "";
  $("#ws-stakeholder").textContent = m.stakeholder ? `Stakeholder: ${m.stakeholder}` : "";
  renderMpChrome();

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

  const storyLocked = hotseatBridge.isHotseat() && !hotseatBridge.canContributeStory();
  if (howArea) {
    howArea.value = state.inventionHow;
    howArea.readOnly = storyLocked;
    howArea.placeholder = hotseatBridge.viewingOther()
      ? "Add to their how-it-works (additive only — don't gut their idea)…"
      : "What acts, what decides, how the pieces connect for *this* place…";
  }
  if (lifeArea) {
    lifeArea.value = state.inventionImpact;
    lifeArea.readOnly = storyLocked;
    lifeArea.placeholder = hotseatBridge.viewingOther()
      ? "Add to their everyday life (additive only)…"
      : "A Tuesday here after your invention lands…";
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

  // Story completeness — both faces required before Challenge (same gate as Deploy)
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
  } else if (!howOk && !lifeOk) {
    storyLevel = "red";
    storyNote = named
      ? "Still need how it works and everyday life."
      : "Incomplete: name + how it works + everyday life.";
  } else if (!howOk) {
    storyLevel = "red";
    storyNote = "Still need how it works (write it or Fill other side).";
  } else if (!lifeOk) {
    storyLevel = "red";
    storyNote = "Still need everyday life if it works (write it or Fill other side).";
  } else if (!named) {
    storyLevel = "red";
    storyNote = "Name the invention before facing the challenge.";
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

  // Scale — readiness to expand a pilot city-wide / program-wide (also used for Scale roll)
  let scaleLevel = "red";
  let scaleNote = "No stack to scale.";
  if (techs.length) {
    const b = budgetWillEnabled() ? state.budget ?? 0 : 5;
    const w = budgetWillEnabled() ? state.will ?? 0 : 3;
    const howLen = state.inventionHow.trim().length;
    const lifeLen = state.inventionImpact.trim().length;
    const opsReady = howLen >= 40 && lifeLen >= 40;
    const capitalOk = !budgetWillEnabled() || (b >= 2 && w >= 2);
    const capitalThin = budgetWillEnabled() && (b < 1 || w < 1);
    if (timingLevel === "red" || techs.length < 1 || howLen < 20) {
      scaleLevel = "red";
      scaleNote =
        timingLevel === "red"
          ? "Claims look too stretched to scale — pilot may still be honest; city-wide is not."
          : "Need a clear how-it-works before scale is realistic.";
    } else if (
      techs.length >= 2 &&
      opsReady &&
      capitalOk &&
      timingLevel === "green" &&
      storyLevel === "green"
    ) {
      scaleLevel = "green";
      scaleNote = `Scale-ready: multi-tech stack, solid story, capital (Budget ${b}, Will ${w}).`;
    } else if (capitalThin || techs.length === 1 || !opsReady || timingLevel === "yellow") {
      scaleLevel = "yellow";
      scaleNote = capitalThin
        ? `Scale is thin on capital (Budget ${b}, Will ${w}) — expansion may stall.`
        : techs.length === 1
          ? "Single-tech pilot can scale, but ops breadth is limited."
          : "Scale is possible but shaky — strengthen story, capital, or timing claims.";
    } else {
      scaleLevel = "yellow";
      scaleNote = "Scale looks middling — improve stack, story, or Resources before expanding.";
    }
  }
  dims.push({ id: "scale", name: "Scale", level: scaleLevel, note: scaleNote });

  // Overall: any critical red → red; else any yellow → yellow; else green
  // Includes Scale so deploy risk shows on the invent traffic light.
  const levels = dims.map((d) => d.level);
  let overall = "green";
  if (levels.includes("red")) overall = "red";
  else if (levels.includes("yellow")) overall = "yellow";

  const pilotPct = successChancePct(overall);
  const scalePct = successChancePct(scaleLevel);

  const summaries = {
    red: `Not ready for the challenge yet — fix red items. Pilot success ~${pilotPct}% if you forced fielding; Scale ~${scalePct}%.`,
    yellow: `Risky but challengeable. Pilot success ~${pilotPct}% · Scale ~${scalePct}% (Scale dim alone).`,
    green: `Looks feasible — still not certain. Pilot success ~${pilotPct}% · Scale ~${scalePct}%.`,
  };

  return {
    overall,
    summary: summaries[overall],
    dims,
    canChallenge: overall !== "red" && !collapsed(),
    /** Used for Pilot roll */
    pilotLevel: overall,
    pilotChancePct: pilotPct,
    /** Used for Scale roll (Scale dim only, not overall aggregate) */
    scaleLevel,
    scaleChancePct: scalePct,
  };
}

/** Both story faces long enough for Challenge / Deploy (matches Deploy min length). */
function bothStoryFacesReady() {
  return (
    state.inventionHow.trim().length >= 20 && state.inventionImpact.trim().length >= 20
  );
}

function inventReadyForChallenge() {
  // Hard gate: name + both story faces + stack — same floor Deploy uses for story faces
  const named = state.inventionName.trim().length >= 2;
  const hasStack = state.selectedTechIds.length >= 1;
  if (!named || !bothStoryFacesReady() || !hasStack) return false;
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
      budgetEl.textContent = `Budget ${state.budget ?? 0}$`;
      budgetEl.title =
        "Capital for techs, Lobby, Pilot, and Scale. Solo: Budget 0$ is game over. Not refilled by End turn.";
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
  updateMissionStepPills();
  updateWaitPreview();
  updateEndTurnButton();
}

/** Highlight Invent · Challenge · Deploy pills on workshop + challenge top bars */
function updateMissionStepPills() {
  let current = "invent";
  if (state.screen === "outcome" || state.deployStage === "new_normal") {
    current = "deploy";
  } else if (state.deployUnlocked || (state.deployStage && state.deployStage !== "none")) {
    current = "deploy";
  } else if (state.screen === "challenge-step") {
    current = "challenge";
  } else if (state.screen === "workshop") {
    current = "invent";
  }

  const order = ["invent", "challenge", "deploy"];
  const curIdx = order.indexOf(current);

  $$(".invent-steps .pill").forEach((p) => {
    const step = p.dataset.step;
    const si = order.indexOf(step);
    p.classList.toggle("active", step === current);
    p.classList.toggle("done", si >= 0 && si < curIdx);
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
      const cost = budgetWillEnabled() ? techCost(t) : null;
      const costTitle = cost
        ? ` | To add: ${cost.budget} Budget${cost.will ? `, ${cost.will} Will` : ""}${
            apEnabled() ? ", 1 AP" : ""
          }${cost.frontierRisk ? ` · frontier risk ${cost.frontierRisk}` : ""}`
        : apEnabled()
          ? " | To add: 1 AP"
          : "";
      // Visible cost chips — not only in tooltip
      let costHtml = "";
      if (cost && !sel) {
        const bits = [
          `<span class="tech-cost-chip tech-cost-budget" title="Budget to add this to your stack">${cost.budget}$</span>`,
        ];
        if (cost.will > 0) {
          bits.push(
            `<span class="tech-cost-chip tech-cost-will" title="Political will needed to adopt this">Will ${cost.will}</span>`
          );
        }
        if (apEnabled()) {
          bits.push(
            `<span class="tech-cost-chip tech-cost-ap" title="Attention this turn">1 AP</span>`
          );
        }
        costHtml = `<span class="tech-cost-row" aria-label="Cost to add">${bits.join("")}</span>`;
      } else if (sel) {
        costHtml = `<span class="tech-cost-row tech-cost-in-stack"><span class="tech-cost-chip tech-cost-owned">In stack</span></span>`;
      } else if (apEnabled()) {
        costHtml = `<span class="tech-cost-row"><span class="tech-cost-chip tech-cost-ap">1 AP</span></span>`;
      }
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${sug ? "recommended" : ""}"
          data-id="${t.id}" style="--domain:${color}" title="${escapeHtml(nowCap)}${escapeHtml(costTitle)}">
          <span class="tech-icon">${t.icon}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${DOMAINS[t.domain]?.label || t.domain}${
              sug ? " · suggested" : ""
            }</span>
            ${costHtml}
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
  // Hotseat: tech actions go through bridge so layering on others works
  if (hotseatBridge.isHotseat()) {
    if (!hotseatBridge.isMyTurn()) {
      flashToast("Not your turn — Pass device when ready.");
      return;
    }
    if (!hotseatBridge.canEditStack()) {
      const phase = hotseatBridge.viewedPhase?.() || "";
      if (phase === "challenge") {
        flashToast("Can't change the stack during Challenge — help at Pilot/Scale instead.");
      } else if (phase === "scaled" || phase === "locked") {
        flashToast("This invent is locked.");
      } else {
        flashToast("Can't change this stack right now.");
      }
      return;
    }
    mpSyncFromSolo();
    const onStack = state.selectedTechIds.includes(id);
    const r = onStack
      ? hotseatBridge.removeTechFromView(id)
      : hotseatBridge.layerTechOnView(id, techById(id));
    if (!r.ok) {
      if (r.error === "no_ap") flashToast("No AP left — End Turn or Wait.", { resource: "ap" });
      else if (r.error === "no_budget") flashToast("Not enough Budget.", { resource: "budget" });
      else if (r.error === "no_will") flashToast("Not enough Will.", { resource: "will" });
      else if (r.error === "stack_full" || r.error === "stack full") flashToast("Stack full.");
      else if (r.error === "already_on_stack") flashToast("Already on that stack.");
      else if (r.error === "not_your_layer") flashToast("You can only remove techs you layered.");
      else if (r.error === "challenge_locked")
        flashToast("Can't change the stack during Challenge — help at Pilot/Scale instead.");
      else if (r.error === "stack_locked" || r.error === "already_scaled")
        flashToast("This invent's stack is locked.");
      else flashToast(r.error || "Cannot change stack.");
      return;
    }
    hotseatBridge.setSession(r.session);
    hotseatBridge.hydrateSoloState(state, { global: state.global });
    if (onStack) removeFromLearnOrder(id);
    else pushLearnOrder(id);
    renderWorkshop();
    updateVision({ debounceMs: 300 });
    return;
  }

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
      if (r.error === "no_ap") {
        flashToast("No AP left — End Turn or Wait.", { resource: "ap" });
      } else if (r.error === "no_budget") {
        const need = techCost(techById(id))?.budget ?? 1;
        flashToast(`Need ¤${need} Budget to add this (you have ${state.budget ?? 0}).`, {
          resource: "budget",
        });
      } else if (r.error === "no_will") {
        const need = techCost(techById(id))?.will ?? 1;
        flashToast(`Need ${need} Will to add this (you have ${state.will ?? 0}).`, {
          resource: "will",
        });
      } else if (r.error === "stack full") flashToast("Stack full.");
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
  const named = state.inventionName.trim().length >= 2;
  const howOk = state.inventionHow.trim().length >= 20;
  const lifeOk = state.inventionImpact.trim().length >= 20;
  if (!named) return "Name your invention first.";
  if (!howOk && !lifeOk) return "Write both story faces (how it works + everyday life), or fill one and use Fill other side.";
  if (!howOk) return "Write how it works (or focus Everyday life and use Fill other side).";
  if (!lifeOk) return "Write everyday life if it works (or focus How it works and use Fill other side).";
  if (!state.selectedTechIds.length) return "Add at least one technology.";
  // continue with existing body below
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
  // Deploy bay open — invent is locked; any active player may Pilot/Scale (hotseat)
  if (deployStagesEnabled() && state.deployUnlocked) {
    const canDeploy =
      !hotseatBridge.isHotseat() ||
      hotseatBridge.canRunDeploy?.() ||
      hotseatBridge.canFaceChallenge();
    btn.disabled = !canDeploy;
    btn.textContent = "Back to deploy bay →";
    btn.title = canDeploy
      ? hotseatBridge.isHotseat() && hotseatBridge.viewingOther()
        ? "Invent locked — you may Pilot/Scale this idea (you pay)"
        : "Deploy is unlocked — invent locked; Pilot → Scale"
      : "Not your turn, or this invent is not ready to deploy";
    const hint = $("#challenge-ready-hint");
    if (hint) {
      const next = nextDeployStageAction();
      if (canDeploy) {
        hint.textContent = next
          ? `Invent locked after Challenge · next: ${next.replace("_", " ")}.`
          : "Deploy stages finished.";
        hint.className = "challenge-ready-hint ready";
      } else {
        hint.textContent = "Viewing another invent — only the active player fields Pilot/Scale.";
        hint.className = "challenge-ready-hint blocked";
      }
    }
    return;
  }
  btn.textContent = "Face the challenge →";
  renderFeasibility();
  const f = assessFeasibility();
  const reason = challengeBlockReason();
  let ok = f.canChallenge;
  let title = ok
    ? f.overall === "yellow"
      ? "Feasibility yellow — you can still face the challenge"
      : "Feasibility green — face a random challenge next"
    : reason;
  // Hotseat: only owner faces Challenge on their invent
  if (hotseatBridge.isHotseat() && !hotseatBridge.canFaceChallenge()) {
    ok = false;
    title = hotseatBridge.viewingOther()
      ? "Only the owner can face Challenge on this invent"
      : "Cannot challenge right now";
  }
  btn.disabled = !ok;
  btn.title = title;
  const hint = $("#challenge-ready-hint");
  if (hint) {
    if (ok) {
      hint.textContent =
        f.overall === "green"
          ? "Feasibility green — face the challenge when ready."
          : "Feasibility yellow — risky but allowed. Challenge next.";
      hint.className = "challenge-ready-hint ready";
    } else {
      hint.textContent = title;
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
  if (isMpContributionLocked()) {
    flashToast(mpContributionLockReason);
    return;
  }
  // Hotseat (Invent or Challenge): End turn = pass device to next seat
  if (
    hotseatBridge.isHotseat() &&
    (state.screen === "workshop" || state.screen === "challenge-step")
  ) {
    mpPassDevice();
    return;
  }
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
    if (r.error === "no_ap") flashToast("No AP — End Turn or Wait.", { resource: "ap" });
    else if (r.error === "no_budget")
      flashToast("Need 1 Budget to lobby.", { resource: "budget" });
    else flashToast("Cannot lobby now.");
    return;
  }
  flashToast(`Lobbied · Budget ${state.budget} · Will ${state.will}`);
  renderWorkshop();
}

function waitTurn() {
  if (isMpContributionLocked()) {
    flashToast(mpContributionLockReason);
    return;
  }
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

  // Hotseat: shared Wait via session, then pass device
  if (hotseatBridge.isHotseat()) {
    mpSyncFromSolo();
    const m = state.mission;
    const techsNow = selectedTechs();
    const stretch = detectClaimStretch(
      state.inventionHow.trim() || state.inventionImpact.trim(),
      techsNow,
      state.year
    );
    const r = hotseatBridge.waitShared({
      mission: m,
      techs: techsNow,
      stretchLevel: stretch.level,
    });
    if (!r.ok) {
      flashToast(r.error || "Cannot Wait now.");
      return;
    }
    hotseatBridge.setSession(r.session);
    if (r.session.place?.status === "collapsed") {
      const mpOutcome = buildHotseatMpOutcome(r.session, { kind: "collapse" });
      leaveHotseat();
      finishOutcome("collapse", { multiparty: true, mpOutcome });
      return;
    }
    flashToast(`Wait → year ${r.session.place.year} · next player`);
    showScreen("workshop");
    mpHydrateAndRender();
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
  if (hotseatBridge.isHotseat()) {
    if (!hotseatBridge.canFaceChallenge()) {
      flashToast(
        hotseatBridge.viewingOther()
          ? "Only the owner faces Challenge on this invent — use the seat tabs to open yours."
          : "This invent can't enter Challenge right now."
      );
      return;
    }
    // Ensure we're on own invent before spending AP / posing
    if (hotseatBridge.getViewId() !== hotseatBridge.getActiveId()) {
      hotseatBridge.setViewSeat(hotseatBridge.getActiveId());
      hotseatBridge.hydrateSoloState(state, { global: state.global });
    }
    mpSyncFromSolo();
  }
  if (!inventReadyForChallenge()) {
    flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
    return;
  }
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVerdict = null;
  state.challengePassed = false;
  state.challengeVisionBeat = null;
  state.challengeSideTab = "vision";
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
    status.textContent = "Challenger is stepping in… actions unlock when the attack is ready.";
  }
  // Show move strip but lock until pose finishes
  if (moves) moves.hidden = false;
  if (essayBtn) essayBtn.hidden = true;

  $("#challenge-speech").innerHTML = aiPendingHtml("Posing the challenger…");
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  const bayHide = $("#deploy-bay");
  if (bayHide) bayHide.hidden = true;
  hideAllModePanels();
  setChallengePoseBusy(true);
  renderChallengeHud();
  renderScrutinyEncounters();

  try {
    // Single critic — one pose, not a gauntlet of speeches
    const enc = state.scrutiny?.encounters?.[0];
    if (enc) {
      const meta = CHALLENGE_ANGLES.find((a) => a.id === enc.angleId);
      // Lock portrait to the chosen angle while loading
      if (meta) {
        state.challengeAngle = enc.angleId;
        setChallengerVisual(meta);
        $("#challenge-angle-title").textContent = meta.label;
        $("#challenge-angle-sub").textContent = `${meta.subtitle || ""} — ${meta.blurb || ""}`;
      }
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
    setChallengePoseBusy(false);
    paintActiveEncounter();
    renderScrutinyEncounters();
    renderChallengeHud();
    // Pose image: critic on stage in this place
    const enc0 = state.scrutiny?.encounters?.[0];
    if (enc0) {
      refreshChallengeVision(
        {
          angle: enc0.angleId,
          label: enc0.label,
          phase: "posed",
          speech: enc0.speech || "",
          question: enc0.question || "",
          move: "",
          response: "",
          quality: "",
        },
        { immediate: true }
      );
    }
  } catch (e) {
    setChallengePoseBusy(false);
    flashToast(e.message || "Challenge failed to load");
  }
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
    const cleared = state.scrutiny?.encounters?.[0];
    if (cleared) {
      refreshChallengeVision(
        {
          angle: cleared.angleId,
          label: cleared.label,
          phase: "cleared",
          speech: cleared.speech || "",
          question: cleared.question || "",
          move: state.challengeVisionBeat?.move || "",
          response: state.challengeVisionBeat?.response || "",
          quality: state.challengeVisionBeat?.quality || "hit",
        },
        { immediate: true }
      );
    }
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
  // (skip while pose is still loading — setChallengePoseBusy holds the lock)
  if (!isChallengePosePending()) {
    let mode = state.scrutinyMoveMode || "defend";
    if (mode === "sidestep" && state.scrutiny?.pivotUsed) mode = "defend";
    setScrutinyMoveMode(mode);
    updateSidestepAvailability();
  }
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
  if (isChallengePosePending()) {
    status.textContent = "Challenger is stepping in… actions unlock when the attack is ready.";
    return;
  }
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
  setChallengePoseBusy(true);

  $("#challenge-angle-label").textContent = "Your idea is under attack";
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  setChallengerVisual(angle);
  $("#challenge-speech").innerHTML = aiPendingHtml("Posing challenge…");
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#challenge-feedback")?.classList.remove("is-pending", "pass", "partial", "fail");
  const bayEssay = $("#deploy-bay");
  if (bayEssay) bayEssay.hidden = true;
  $("#btn-challenge-submit").disabled = true;

  // Lock challenger before AI returns — never swap portrait/angle mid-load.
  state.challengeAngle = angle.id;
  setChallengerVisual(angle);
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  renderChallengeHud();

  try {
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
    refreshChallengeVision(
      {
        angle: angle.id,
        label: angle.label,
        phase: "posed",
        speech: state.challengeText || "",
        question: state.challengeQuestion || "",
        move: "",
        response: "",
        quality: "",
      },
      { immediate: true }
    );
  } finally {
    setChallengePoseBusy(false);
    $("#btn-challenge-submit").disabled = false;
    renderChallengeHud();
  }
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
      budgetEl.textContent = `Budget ${state.budget ?? 0}$`;
      budgetEl.title =
        "Capital (same as invent). Solo: Budget 0$ is game over. Challenge wins can restore a little.";
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
      const hotseat = hotseatBridge.isHotseat();
      endBtn.textContent = hotseat ? "Pass device →" : "End turn";
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
        endBtn.title = hotseat
          ? "Spend AP first, then pass the device"
          : "Spend AP first (or you already have a full bar)";
      } else {
        endBtn.title = hotseat
          ? "End your seat-turn and pass the device to the next player"
          : "Refill AP without advancing the calendar or crisis";
      }
    } else {
      endBtn.hidden = true;
    }
  }
  updateMissionStepPills();
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
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
  if (mode === "sidestep" && state.scrutiny?.pivotUsed) {
    flashToast("Sidestep already used this run.");
    mode = "defend";
  }
  state.scrutinyMoveMode = mode;
  $$(".scrutiny-move-btn").forEach((btn) => {
    const on = btn.dataset.mode === mode;
    btn.classList.toggle("is-selected", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.disabled = isChallengePosePending();
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
      hideAllModePanels();
      const moves = $("#scrutiny-moves");
      if (moves) moves.hidden = true;
      if (deployStagesEnabled()) {
        if (!state.deployUnlocked) unlockDeployBay();
        renderDeployBay();
      } else {
        updateDeployButtonCost();
      }
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
  if (state.challengeFeedback && fb) {
    fb.hidden = false;
    fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
    fb.innerHTML = state.challengeFeedback;
  } else if (fb) fb.hidden = true;
  if (state.challengePassed) {
    if (deployStagesEnabled()) {
      if (!state.deployUnlocked) unlockDeployBay();
      renderDeployBay();
    } else {
      updateDeployButtonCost();
    }
  } else {
    const bay = $("#deploy-bay");
    if (bay) bay.hidden = true;
  }
  renderChallengeHud();
}

async function scrutinyArgue() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
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
      flashToast("No AP to Argue — End turn on Invent first.", { resource: "ap" });
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
  refreshChallengeVision(
    {
      angle: enc.angleId,
      label: enc.label,
      phase: result.cleared ? "cleared" : "responded",
      speech: enc.speech || "",
      question: enc.question || "",
      move: "defend",
      response: answer,
      quality,
    },
    { immediate: true }
  );
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
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
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
      flashToast("No AP to apply the fix — End turn first.", { resource: "ap" });
      return;
    }
    state.ap -= 1;
    state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
  }
  let funded = Boolean($("#challenge-fund-patch")?.checked);
  if (funded && budgetWillEnabled()) {
    if ((state.budget ?? 0) < 1) {
      flashToast("Not enough Budget for a funded fix — uncheck it or free up Budget.", { resource: "budget" });
      funded = false;
    } else {
      state.budget -= 1;
      if (maybeBudgetGameOver({ from: "funded_fix" })) return;
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
  refreshChallengeVision(
    {
      angle: enc.angleId,
      label: enc.label,
      phase: result.cleared ? "cleared" : "responded",
      speech: enc.speech || "",
      question: enc.question || "",
      move: "fix",
      response: how.slice(0, 400),
      quality: result.cleared ? "hit" : "glance",
    },
    { immediate: true }
  );
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
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
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
    flashToast("No AP to sidestep — End turn first.", { resource: "ap" });
    return;
  }
  if (budgetWillEnabled() && (state.will ?? 0) < 1) {
    flashToast("Sidestep needs 1 Political will.", { resource: "will" });
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
  refreshChallengeVision(
    {
      angle: enc.angleId,
      label: enc.label,
      phase: "cleared",
      speech: enc.speech || "",
      question: enc.question || "",
      move: "sidestep",
      response: "Sidestepped without a full public answer.",
      quality: "pivot",
    },
    { immediate: true }
  );
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
    if (el) el.disabled = busy || state.challengePosePending;
  });
  const helpIn = $("#challenge-help-input");
  if (helpIn) helpIn.disabled = busy || state.challengePosePending;
}

/**
 * Lock / unlock challenge combat UI while the AI poses the challenger.
 * @param {boolean} busy
 */
function setChallengePoseBusy(busy) {
  state.challengePosePending = Boolean(busy);
  document.body.classList.toggle("challenge-pose-pending", state.challengePosePending);
  const locked = state.challengePosePending;
  const ids = [
    "#btn-scrutiny-argue",
    "#btn-scrutiny-patch",
    "#btn-scrutiny-pivot",
    "#challenge-answer",
    "#btn-challenge-submit",
    "#challenge-how-edit",
    "#challenge-fund-patch",
    "#btn-challenge-apply-fix",
    "#btn-challenge-confirm-sidestep",
    "#btn-challenge-coach",
    "#btn-challenge-draft",
    "#btn-challenge-ask",
    "#challenge-help-input",
    "#btn-deploy-stage-primary",
    "#btn-deploy-back-invent",
    "#btn-challenge-end-turn",
  ];
  for (const sel of ids) {
    const el = $(sel);
    if (el) el.disabled = locked;
  }
  $$(".scrutiny-move-btn").forEach((b) => {
    b.disabled = locked;
  });
  const moves = $("#scrutiny-moves");
  if (moves) {
    moves.classList.toggle("is-pose-pending", locked);
    moves.setAttribute("aria-busy", locked ? "true" : "false");
  }
  const status = $("#scrutiny-status");
  if (status && locked) {
    status.hidden = false;
    status.textContent = "Challenger is stepping in… actions unlock when the attack is ready.";
  }
}

function isChallengePosePending() {
  return Boolean(state.challengePosePending);
}

async function coachChallenge(mode, userText) {
  if (state.aiBusy) return;
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
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
      flashToast("No AP left for AI help — End turn on Invent, or submit without coaching.", { resource: "ap" });
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
      flashToast("No AP left to submit for judgment — return to Invent and End turn first.", { resource: "ap" });
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
    } else if (!bothStoryFacesReady()) {
      // Never unlock deploy without both story faces (entry gate should have blocked this)
      state.challengePassed = false;
      state.challengeVerdict = "fail";
      state.challengeFails += 1;
      state.challengeFeedback +=
        "<br/>Both story faces are required (how it works + everyday life). Return to Invent and finish them.";
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
    const ok = answer.length >= 40 && bothStoryFacesReady();
    state.challengeVerdict = ok ? "partial" : "fail";
    state.challengePassed = ok;
    if (ok && deployStagesEnabled() && !state.deployUnlocked) unlockDeployBay();
    state.hadChallengeAttempt = true;
    state.lastChallengeVerdict = state.challengeVerdict;
    state.challengeFeedback = !bothStoryFacesReady()
      ? "<strong>FAIL</strong> — Both story faces are required (how it works + everyday life)."
      : ok
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

function currentScaleCost(techs = selectedTechs()) {
  return scaleActionCost(techs, { will: state.will ?? 0 });
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
  state.lastDeployRoll = null;
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
  if (!bothStoryFacesReady()) {
    state.challengePassed = false;
    state.deployUnlocked = false;
    flashToast("Finish both story faces (how it works + everyday life) before Deploy.");
    return;
  }
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
  // After successful Scale we auto-finish New normal — no separate button
  if (state.deployStage === "none") return "pilot";
  if (state.deployStage === "pilot") return "scale";
  return null;
}

function updateDeployButtonCost() {
  // Legacy single-button deploy removed — staged bay only when feature on
  if (deployStagesEnabled()) {
    renderDeployBay();
  }
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
  const feas = assessFeasibility();
  $$(".deploy-stage-pill", bay).forEach((pill) => {
    const id = pill.dataset.stage;
    const done =
      (id === "pilot" && ["pilot", "scale", "new_normal"].includes(state.deployStage)) ||
      (id === "scale" && ["scale", "new_normal"].includes(state.deployStage)) ||
      (id === "new_normal" && state.deployStage === "new_normal");
    const active =
      (next === "pilot" && id === "pilot") ||
      (next === "scale" && id === "scale") ||
      (state.deployStage === "scale" && id === "new_normal");
    pill.classList.toggle("is-done", done);
    pill.classList.toggle("is-active", Boolean(active && !done));
  });

  const status = $("#deploy-bay-status");
  const primary = $("#btn-deploy-stage-primary");
  const backInvent = $("#btn-deploy-back-invent");
  const remaining = state.stagedDropRemaining ?? 0;
  const pool = state.stagedDropPool ?? 0;
  const fieldCost = currentDeployFieldCost();
  const scaleCost = currentScaleCost();
  const pilotBits = [];
  if (apEnabled()) pilotBits.push(`${fieldCost.ap} AP`);
  if (budgetWillEnabled()) pilotBits.push(`${fieldCost.budget}$`);
  const scaleBits = [];
  if (apEnabled()) scaleBits.push(`${scaleCost.ap} AP`);
  if (budgetWillEnabled()) {
    scaleBits.push(`${scaleCost.budget}$`);
    if (scaleCost.will > 0) scaleBits.push(`${scaleCost.will} Will`);
  }

  if (status) {
    const last = state.lastDeployRoll;
    const lastLine =
      last && last.ok === false
        ? " Last try failed — rework or try again."
        : last && last.ok
          ? " Last try succeeded."
          : "";
    if (next === "pilot") {
      const pilotAmt = Math.min(remaining, Math.max(1, Math.ceil(pool / 2)) || 0);
      status.textContent =
        `Try Pilot (~${feas.pilotChancePct}% chance). Success drops −${pilotAmt} crisis.${
          pilotBits.length ? ` Cost: ${pilotBits.join(" · ")}.` : ""
        }${lastLine}`;
    } else if (next === "scale") {
      status.textContent =
        `Pilot landed (−${state.dropPilotApplied}). Try Scale (~${feas.scaleChancePct}% chance). ` +
        `Success spends remaining −${remaining} and reaches New normal.${
          scaleBits.length ? ` Cost: ${scaleBits.join(" · ")}.` : ""
        }${lastLine}`;
    } else {
      status.textContent = `Deploy complete.${lastLine}`;
    }
  }

  if (primary) {
    if (next === "pilot") {
      primary.hidden = false;
      primary.disabled = false;
      primary.textContent = pilotBits.length
        ? `Try Pilot (${pilotBits.join(" · ")}) →`
        : "Try Pilot →";
      primary.title = `About ${feas.pilotChancePct}% chance. Succeeds or fails.`;
    } else if (next === "scale") {
      primary.hidden = false;
      primary.disabled = false;
      primary.textContent = scaleBits.length
        ? `Try Scale (${scaleBits.join(" · ")}) →`
        : "Try Scale →";
      primary.title = `About ${feas.scaleChancePct}% chance. Success → New normal.`;
    } else {
      primary.hidden = true;
    }
  }

  if (backInvent) {
    backInvent.hidden = false;
    backInvent.disabled = false;
  }
}

/** Pay Pilot fielding each attempt (fail still spends — retry costs again). */
function payPilotAttempt() {
  const techs = selectedTechs();
  const fieldCost = currentDeployFieldCost(techs);
  if (!apEnabled() && !budgetWillEnabled()) {
    return { ok: true, fieldCost };
  }
  const pay = dispatchSim("deploy", {
    apCost: apEnabled() ? fieldCost.ap : 0,
    budgetCost: budgetWillEnabled() ? fieldCost.budget : 0,
  });
  if (!pay.ok) {
    if (pay.error === "no_ap") {
      flashToast("No AP to try Pilot — End turn, then try again.", { resource: "ap" });
    } else if (pay.error === "no_budget") {
      flashToast(`Need ¤${fieldCost.budget} Budget to try Pilot (you have ${state.budget ?? 0}).`, {
        resource: "budget",
      });
    } else {
      flashToast("Cannot field Pilot right now.");
    }
    return { ok: false, fieldCost };
  }
  renderChallengeHud();
  return { ok: true, fieldCost };
}

/** Pay Scale attempt: AP + Budget + optional Will. */
function payScaleAttempt() {
  const techs = selectedTechs();
  const cost = currentScaleCost(techs);
  if (apEnabled() && (state.ap ?? 0) < cost.ap) {
    flashToast("No AP to try Scale — End turn first.", { resource: "ap" });
    return { ok: false, cost };
  }
  if (budgetWillEnabled()) {
    if ((state.budget ?? 0) < cost.budget) {
      flashToast(`Need ¤${cost.budget} Budget to try Scale (you have ${state.budget ?? 0}).`, {
        resource: "budget",
      });
      return { ok: false, cost };
    }
    if ((state.will ?? 0) < cost.will) {
      flashToast(`Need ${cost.will} Will to try Scale (you have ${state.will ?? 0}). Lobby first.`, {
        resource: "will",
      });
      return { ok: false, cost };
    }
  }
  if (apEnabled() || budgetWillEnabled()) {
    const pay = dispatchSim("deploy", {
      apCost: apEnabled() ? cost.ap : 0,
      budgetCost: budgetWillEnabled() ? cost.budget : 0,
    });
    if (!pay.ok) {
      if (pay.error === "no_ap") flashToast("No AP to try Scale.", { resource: "ap" });
      else if (pay.error === "no_budget")
        flashToast("Not enough Budget for Scale.", { resource: "budget" });
      else flashToast("Cannot scale right now.");
      return { ok: false, cost };
    }
    if (budgetWillEnabled() && cost.will > 0) {
      state.will = Math.max(0, (state.will ?? 0) - cost.will);
    }
  }
  renderChallengeHud();
  return { ok: true, cost };
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
  // Hotseat: invent is locked after Challenge; active player may still Pilot/Scale
  if (
    hotseatBridge.isHotseat() &&
    !(hotseatBridge.canRunDeploy?.() || hotseatBridge.canFaceChallenge())
  ) {
    flashToast("Not your turn to Pilot/Scale this invent.");
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

  const feas = assessFeasibility();
  // Pilot/Scale are allowed even on red — red only means ~10% success

  if (stage === "pilot") {
    const pay = payPilotAttempt();
    if (!pay.ok) {
      renderDeployBay();
      return;
    }
    const roll = rollDeploySuccess(feas.pilotLevel);
    state.lastDeployRoll = { stage: "pilot", ok: roll.ok, pct: roll.pct, level: roll.level };
    if (!roll.ok) {
      state.lastNews = `Pilot failed in ${state.year}.`;
      flashToast(
        hotseatBridge.isHotseat()
          ? "Pilot failed. Invention stays locked — retry later or Pass device."
          : "Pilot failed. Try again, or go back to Invent to rework."
      );
      mpSyncFromSolo();
      renderDeployBay();
      renderChallengeHud();
      return;
    }

    // Hotseat: Pilot is personal readiness — does NOT update shared crisis meters
    if (hotseatBridge.isHotseat()) {
      state.deployStage = "pilot";
      state.deployFieldPaid = true;
      state.dropPilotApplied = 0;
      // freeze pool for Scale
      if (!state.stagedDropPool) {
        const dropInfo = computeDeployDrop({
          techs,
          inventionHow: state.inventionHow,
          inventionImpact: state.inventionImpact,
          challengeVerdict: state.challengeVerdict,
          challengeAnswer: state.challengeAnswer,
          suggested: state.mission?.suggested || [],
          domains: domainsInStack(techs),
          pairs: computeSynergies(techs),
          will: state.will,
          budgetWill: budgetWillEnabled(),
        });
        state.stagedDropPool = dropInfo.drop;
        state.stagedDropRemaining = dropInfo.drop;
      }
      snapshotTimingAtDeploy();
      state.lastNews = `Pilot succeeded (personal). Shared crisis unchanged — Scale updates the place.`;
      flashToast("Pilot succeeded · Scale ready (updates the place)");
      mpSyncFromSolo();
      renderDeployBay();
      renderChallengeHud();
      if (state.screen === "workshop") renderWorkshop();
      renderMpChrome();
      return;
    }

    const step = applyStagedDropStep(
      "pilot",
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
      flashToast("Cannot apply Pilot relief.");
      return;
    }
    if (step.drop > 0) state.pressure = applyPressureDrop(state.pressure, step.drop);
    state.stagedDropRemaining = step.frozen.stagedDropRemaining;
    state.dropPilotApplied = step.frozen.dropPilotApplied;
    state.deployStage = "pilot";
    state.deployFieldPaid = true;
    markMissionSolved(state.mission);
    snapshotTimingAtDeploy();
    state.lastNews = `Pilot succeeded. Crisis −${step.drop}. Scale ready.`;
    flashToast(step.drop ? `Pilot succeeded · crisis −${step.drop}` : "Pilot succeeded");
    renderDeployBay();
    renderChallengeHud();
    if (state.screen === "workshop") renderWorkshop();
    return;
  }

  if (stage === "scale") {
    const pay = payScaleAttempt();
    if (!pay.ok) {
      renderDeployBay();
      return;
    }
    const roll = rollDeploySuccess(feas.scaleLevel);
    state.lastDeployRoll = { stage: "scale", ok: roll.ok, pct: roll.pct, level: roll.level };
    if (!roll.ok) {
      state.lastNews = `Scale failed. Pilot still stands — retry Scale or return to Invent.`;
      flashToast("Scale failed. Try again, or go back to Invent to rework.");
      renderDeployBay();
      renderChallengeHud();
      return;
    }

    // Success → apply Scale drop, then auto New normal
    const scaleStep = applyStagedDropStep(
      "scale",
      {
        stagedDropPool: state.stagedDropPool,
        stagedDropRemaining: state.stagedDropRemaining,
        dropPilotApplied: state.dropPilotApplied,
        dropScaleApplied: state.dropScaleApplied,
        dropNewNormalApplied: state.dropNewNormalApplied,
      },
      { will: state.will ?? 0 }
    );
    // Hotseat: apply remaining (or full) pool to shared place on Scale only
    if (hotseatBridge.isHotseat()) {
      const drop = Math.max(
        scaleStep.drop,
        state.stagedDropRemaining || state.stagedDropPool || 1
      );
      if (drop > 0) state.pressure = applyPressureDrop(state.pressure, drop);
      state.stagedDropRemaining = 0;
      state.dropScaleApplied = drop;
      state.deployStage = "scale";
      snapshotTimingAtDeploy();
      state.lastNews = `Scaled! Shared crisis −${drop}.`;
      flashToast(`Scale succeeded · crisis −${drop}`);
      mpSyncFromSolo();
      // Credit the *invention* (viewed forge), not only who paid to field
      const sess = hotseatBridge.getSession();
      const aId = hotseatBridge.getActiveId();
      const vId = hotseatBridge.getViewId() || aId;
      const inventForge = sess?.forges?.[vId];
      if (inventForge) {
        inventForge.impactDropTotal = (inventForge.impactDropTotal || 0) + drop;
        inventForge.successfulScales = (inventForge.successfulScales || 0) + 1;
        inventForge.deployStage = "scaled";
        inventForge.scaledBySeatId = aId;
      }
      if (sess?.place && isWin(sess.place.pressure, sess.place.mission?.winMax || {})) {
        sess.place.status = "won";
        if (inventForge) inventForge.landedSolvingScale = true;
        const ranking = rankSurvivors(sess);
        sess.ranking = ranking;
        hotseatBridge.setSession(sess);
        flashToast("Place essentially solved — race over!");
        const mpOutcome = buildHotseatMpOutcome(sess, {
          kind: "win",
          drop,
          inventSeatId: vId,
          fieldedBySeatId: aId,
        });
        leaveHotseat();
        finishOutcome("win", {
          drop,
          angle: state.challengeAngle,
          verdict: state.challengeVerdict,
          multiparty: true,
          mpOutcome,
        });
        return;
      }
      hotseatBridge.setSession(sess);
      renderDeployBay();
      renderChallengeHud();
      if (state.screen === "workshop") renderWorkshop();
      renderMpChrome();
      return;
    }

    if (scaleStep.drop > 0) state.pressure = applyPressureDrop(state.pressure, scaleStep.drop);
    state.stagedDropRemaining = scaleStep.frozen.stagedDropRemaining;
    state.dropScaleApplied = scaleStep.frozen.dropScaleApplied;
    state.deployStage = "scale";

    const nnStep = applyStagedDropStep(
      "new_normal",
      {
        stagedDropPool: state.stagedDropPool,
        stagedDropRemaining: state.stagedDropRemaining,
        dropPilotApplied: state.dropPilotApplied,
        dropScaleApplied: state.dropScaleApplied,
        dropNewNormalApplied: state.dropNewNormalApplied,
      },
      { will: state.will ?? 0 }
    );
    if (nnStep.drop > 0) state.pressure = applyPressureDrop(state.pressure, nnStep.drop);
    state.dropNewNormalApplied = nnStep.frozen.dropNewNormalApplied;
    state.deployStage = "new_normal";

    const timingSnap = snapshotTimingAtDeploy();
    const { domains, pairs } = computeCurrentDropInfo();
    const totalDrop =
      (state.dropPilotApplied || 0) +
      (state.dropScaleApplied || 0) +
      (state.dropNewNormalApplied || 0);
    state.lastNews = `Scale succeeded · New normal. Crisis −${totalDrop} total.`;
    state.waitReport = "";
    flashToast("Scale succeeded · New normal");
    const kind = wonMission() ? "win" : "partial";
    finishOutcome(kind, {
      drop: totalDrop,
      dropParts: [
        ...(state.stagedDropParts || []),
        ...scaleStep.parts,
        ...nnStep.parts,
        { id: "pilot_applied", label: "Pilot drop", amount: state.dropPilotApplied || 0 },
        { id: "scale_applied", label: "Scale drop", amount: state.dropScaleApplied || 0 },
      ],
      deployCost: pay.cost || currentScaleCost(techs),
      domains,
      pairs,
      verdict: state.challengeVerdict,
      angle: state.challengeAngle,
      timingLevel: timingSnap,
      deployStage: "new_normal",
      stagedPool: state.stagedDropPool,
    });
    return;
  }

  flashToast("Unknown deploy stage.");
}

/** Leave deploy bay for Invent without abandoning unlock (can return). */
function returnToInventFromDeploy() {
  if (state.deployUnlocked) state.turnPhase = "between_stages";
  else if (apEnabled()) dispatchSim("abandon_scrutiny");
  else state.turnPhase = "act";
  showScreen("workshop");
  renderWorkshop();
  flashToast("Back on Invent — rework, then open the deploy bay when ready.");
}

function attemptDeploy() {
  if (deployStagesEnabled()) {
    const next = nextDeployStageAction();
    if (next) attemptDeployStage(next);
    else flashToast("Deploy finished.");
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
        flashToast("No AP to deploy — return to Invent and End turn, then come back.", { resource: "ap" });
      } else if (pay.error === "no_budget") {
        flashToast(`Need ¤${fieldCost.budget} Budget to field this (you have ${state.budget ?? 0}). Lobby less, win challenge income, or simplify the stack.`, { resource: "budget" });
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

/**
 * Snapshot multiplayer standings before leaveHotseat() clears the session.
 * @param {object} sess
 * @param {{ kind: string, drop?: number, inventSeatId?: string, fieldedBySeatId?: string }} opts
 */
function buildHotseatMpOutcome(sess, opts = {}) {
  if (!sess?.place) return null;
  const ranking =
    opts.kind === "collapse" ? null : sess.ranking || rankSurvivors(sess);
  const inventId = opts.inventSeatId || null;
  const fieldedId = opts.fieldedBySeatId || null;
  const seatName = (id) => {
    if (!id) return "";
    const s = sess.seats?.find((x) => x.id === id);
    return s?.displayName || id;
  };
  const inventName =
    (inventId && sess.forges?.[inventId]?.inventionName) ||
    state.inventionName ||
    "Untitled invention";
  return {
    multiparty: true,
    mode: "hotseat",
    kind: opts.kind || ranking?.kind || "partial",
    year: sess.place.year,
    place: sess.place.mission?.place || state.mission?.place || "",
    placeStatus: sess.place.status,
    drop: opts.drop || 0,
    inventSeatId: inventId,
    inventOwnerName: seatName(inventId),
    inventName,
    fieldedBySeatId: fieldedId,
    fieldedByName: seatName(fieldedId),
    ranking,
    seats: (sess.seatOrder || []).map((id) => {
      const f = sess.forges?.[id];
      const s = sess.seats?.find((x) => x.id === id);
      return {
        seatId: id,
        displayName: s?.displayName || id,
        inventionName: f?.inventionName || "",
        abandoned: Boolean(f?.abandoned),
        challengePassed: Boolean(f?.challengePassed),
        deployStage: f?.deployStage || "none",
        successfulScales: f?.successfulScales || 0,
        landedSolvingScale: Boolean(f?.landedSolvingScale),
        scaledBySeatId: f?.scaledBySeatId || null,
      };
    }),
  };
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
    mpOutcome: meta.mpOutcome || state.mpOutcome || null,
  };
  state.mpOutcome = state.outcome.mpOutcome;
  showScreen("outcome");
}

function renderMpOutcomeStandings(mp) {
  const box = $("#outcome-mp");
  if (!box) return;
  if (!mp?.multiparty) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const title = $("#outcome-mp-title");
  const lead = $("#outcome-mp-lead");
  const list = $("#outcome-mp-standings");
  const legend = $("#outcome-mp-legend");

  if (mp.placeStatus === "collapsed" || mp.kind === "collapse") {
    if (title) title.textContent = "Place collapsed — no champion";
    if (lead) {
      lead.textContent = `${mp.place || "The place"} fell. Shared crisis ended the run for everyone — rank only applies when the place holds.`;
    }
    if (list) {
      list.innerHTML = (mp.seats || [])
        .map(
          (s) =>
            `<li class="outcome-mp-row is-collapse">
              <span class="outcome-mp-name">${escapeHtml(s.displayName)}</span>
              <span class="outcome-mp-detail muted">${escapeHtml(
                s.inventionName || "no invent"
              )}${s.abandoned ? " · abandoned" : ""}</span>
            </li>`
        )
        .join("");
    }
    if (legend) {
      legend.textContent = "Everyone lost the place. Try again with tighter timing or earlier Scale.";
    }
    return;
  }

  const rows = mp.ranking?.rows || [];
  const winner = rows[0];
  if (title) title.textContent = "Friends standings";
  if (lead) {
    const whoSolved = mp.inventOwnerName || winner?.displayName || "A player";
    const fielded =
      mp.fieldedByName && mp.fieldedByName !== mp.inventOwnerName
        ? ` Fielded by ${mp.fieldedByName}.`
        : "";
    lead.textContent =
      `${mp.place || "The place"} held · “${mp.inventName || "An invent"}” (${whoSolved}) landed the solving Scale` +
      (mp.drop ? ` (−${mp.drop} crisis)` : "") +
      `.${fielded} Scores among survivors (40% impact · 25% craft · 20% help · 15% race):`;
  }
  if (list) {
    list.innerHTML = rows
      .map((r) => {
        const badges = [];
        if (r.landedSolvingScale) badges.push('<span class="tag tag-win">solved place</span>');
        else if ((r.successfulScales || 0) >= 1) badges.push('<span class="tag">scaled</span>');
        if (r.abandoned) badges.push('<span class="tag">abandoned</span>');
        const medal =
          r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`;
        return `<li class="outcome-mp-row ${r.rank === 1 ? "is-winner" : ""}">
          <span class="outcome-mp-medal">${medal}</span>
          <span class="outcome-mp-name">${escapeHtml(r.displayName)}</span>
          <span class="outcome-mp-score"><strong>${r.score}</strong></span>
          <span class="outcome-mp-badges">${badges.join(" ")}</span>
          <span class="outcome-mp-detail muted">impact ${Math.round(
            (r.impactNorm || 0) * 100
          )}% · craft ${Math.round((r.craftNorm || 0) * 100)}% · help ${Math.round(
            (r.contributionNorm || 0) * 100
          )}% · race ${Math.round((r.raceNorm || 0) * 100)}%</span>
        </li>`;
      })
      .join("");
  }
  if (legend) {
    legend.textContent =
      "Impact = crisis drop from your invents · Craft = challenge quality · Help = resources spent on others · Race = who Scaled (solving Scale tops race).";
  }
}

function renderOutcome() {
  const o = state.outcome;
  const m = state.mission;
  const mp = o.mpOutcome || o.meta?.mpOutcome || state.mpOutcome || null;
  const name =
    (mp?.inventName && String(mp.inventName).trim()) ||
    state.inventionName.trim() ||
    "Untitled invention";
  $("#outcome-name").textContent = name;
  $("#outcome-meta").textContent = `${m.place} · ${o.year} · Turn ${o.turn} · waits ${
    o.waits ?? state.waits ?? 0
  } · ${state.global?.title || ""}${mp?.multiparty ? " · Friends / hotseat" : ""}`;

  const starsEl = $("#outcome-stars");
  const report = o.runReport || state.runReport;
  if (starsEl) {
    if (report && features().runReport && !mp?.multiparty) {
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
    } else if (mp?.multiparty && mp.ranking?.rows?.[0]) {
      starsEl.hidden = false;
      const w = mp.ranking.rows[0];
      starsEl.innerHTML = `<div class="run-stars outcome-mp-winner-line" aria-label="Winner">🥇 ${escapeHtml(
        w.displayName
      )} · ${w.score} pts</div>
        <div class="run-scores muted">Friends ranking when the place held — full table below</div>`;
    } else {
      starsEl.hidden = true;
      starsEl.innerHTML = "";
    }
  }

  renderMpOutcomeStandings(mp);

  const img = $("#outcome-vision-image");
  if (state.vision?.currentUrl && img) {
    img.hidden = false;
    img.src = state.vision.currentUrl;
    $("#outcome-vision-status").textContent = `Vision of ${m.place}, ${o.year}`;
  }

  let headline = "Holding the line";
  let story = "";
  const lessons = [];

  if (o.kind === "win" && mp?.multiparty) {
    const winner = mp.ranking?.rows?.[0];
    headline = winner ? `${winner.displayName} leads — place held` : "Place held";
    story =
      `In ${o.year}, “${name}” (${mp.inventOwnerName || "a player"}) Scaled in ${m.place}` +
      (mp.drop ? ` and cut crisis by ${mp.drop}` : "") +
      `. The place held, so friends are ranked among survivors.` +
      (mp.fieldedByName && mp.fieldedByName !== mp.inventOwnerName
        ? ` ${mp.fieldedByName} paid to field the solving Scale.`
        : "") +
      (winner
        ? ` Top score: ${winner.displayName} (${winner.score}).`
        : "");
    lessons.push({
      type: "good",
      text: `Solving invent: “${name}” · owner ${mp.inventOwnerName || "—"}${
        mp.fieldedByName ? ` · fielded by ${mp.fieldedByName}` : ""
      }.`,
    });
    lessons.push({
      type: "good",
      text: "Rank = 40% crisis impact + 25% craft (challenge) + 20% help given + 15% race to Scale.",
    });
    lessons.push({
      type: "grow",
      text: "If the place had collapsed, there would be no champion — only a shared loss.",
    });
  } else if (o.kind === "win") {
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
  } else if (o.kind === "collapse" && o.meta?.bankrupt) {
    headline = "Out of capital";
    story =
      `In ${o.year}, ${name || "the invention"} never got a real chance in ${m.place}: Budget hit 0$ and the project went broke. ` +
      `Tech cards, Lobby, Pilot, and Scale all spend capital — save enough to field what you invent. ` +
      `Clearing Challenge can restore a little Budget; over-buying the stack often cannot.`;
    lessons.push({
      type: "grow",
      text: "Solo rule: Budget 0$ is game over. Keep cash for Pilot (and Scale), not only for shiny cards.",
    });
    lessons.push({
      type: "grow",
      text: "Lean stacks, half-refunds on same-turn removes, and challenge wins (+1 Budget) are how you stay solvent.",
    });
  } else if (o.kind === "collapse" && mp?.multiparty) {
    headline = "Place collapsed — no champion";
    story =
      `By ${o.year}, crisis in ${m.place} broke the place. In friends play everyone loses when the place falls — ` +
      `there is no winner ranking, only what each invent learned before the end.`;
    lessons.push({
      type: "grow",
      text: "Shared crisis: one late Wait or failed Scale race can sink the table.",
    });
    lessons.push({
      type: "grow",
      text: "Next time: clear Challenge earlier, Scale when the invent is locked, or help field a ready invent on your turn.",
    });
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

  // Cache share payload for the Share card button
  state.sharePayload = {
    kindLabel: kindLabelForOutcome(o.kind, o.meta),
    inventionName: name,
    place: m.place,
    year: o.year,
    globalTitle: state.global?.title || "",
    stars: report?.stars ?? 0,
    speedScore: report?.speedScore,
    honestyScore: report?.honestyScore,
    eleganceScore: report?.eleganceScore,
    blurb: story,
    techs: (o.techs || []).map((t) => t.name || t.id),
  };

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
  const chRoot = $("#challenge-vision-root");
  if (chRoot) state.vision.addMirror(chRoot);
}

/** Build challengeBeat for Imagine from current scrutiny / last response */
function buildChallengeVisionBeat() {
  if (state.screen !== "challenge-step" && !state.challengeVisionBeat) return null;
  if (state.challengeVisionBeat) return state.challengeVisionBeat;
  const enc = activeEncounter(state.scrutiny);
  const angleId = enc?.angleId || state.challengeAngle;
  if (!angleId) return null;
  const meta = CHALLENGE_ANGLES.find((a) => a.id === angleId);
  return {
    angle: angleId,
    label: meta?.label || enc?.label || angleId,
    phase: enc?.cleared ? "cleared" : "posed",
    speech: enc?.speech || state.challengeText || "",
    question: enc?.question || state.challengeQuestion || "",
    move: "",
    response: "",
    quality: "",
  };
}

function setChallengeVisionBeat(partial) {
  const base = buildChallengeVisionBeat() || {};
  state.challengeVisionBeat = { ...base, ...partial };
}

function updateChallengeVisionLabels() {
  const nameEl = $("#challenge-vision-stage-name");
  const blurbEl = $("#challenge-vision-stage-blurb");
  if (!nameEl || !blurbEl) return;
  const beat = state.challengeVisionBeat || buildChallengeVisionBeat();
  if (!beat?.angle) {
    nameEl.textContent = `Under challenge · ${state.year}`;
    blurbEl.textContent = "How this place looks while a critic presses the idea.";
    return;
  }
  const label = beat.label || beat.angle;
  if (beat.phase === "cleared") {
    nameEl.textContent = `Cleared · ${state.year}`;
    blurbEl.textContent = `${label} answered — the place can move toward fielding.`;
  } else if (beat.move === "defend") {
    nameEl.textContent = `Defense · ${label}`;
    blurbEl.textContent =
      beat.quality === "hit"
        ? "Your answer lands in the scene."
        : beat.quality === "glance"
          ? "A partial answer — tension remains."
          : "The room is not yet convinced.";
  } else if (beat.move === "fix") {
    nameEl.textContent = `Fix under fire · ${label}`;
    blurbEl.textContent = "The invention changes while still under pressure.";
  } else if (beat.move === "sidestep") {
    nameEl.textContent = `Sidestep · ${label}`;
    blurbEl.textContent = "You move on without a full public answer.";
  } else {
    nameEl.textContent = `${label} · ${state.year}`;
    blurbEl.textContent = "The critic is on stage — same place, harder questions.";
  }
}

/**
 * @param {{ immediate?: boolean, force?: boolean, debounceMs?: number, context?: "invent"|"challenge" }} opts
 */
function updateVision(opts = {}) {
  if (!state.mission) return;
  ensureVision();
  const techs = selectedTechs();
  const stage = currentStage();
  const inventName = $("#vision-stage-name");
  const inventBlurb = $("#vision-stage-blurb");
  if (inventName) inventName.textContent = `${stage.name} · ${state.year}`;
  if (inventBlurb) inventBlurb.textContent = stage.blurb;
  updateChallengeVisionLabels();

  const box = $("#vision-narratives");
  if (box && state.screen === "workshop") {
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

  const onChallenge =
    opts.context === "challenge" ||
    state.screen === "challenge-step" ||
    Boolean(state.challengeVisionBeat);

  // Attach renderer status/loading to the visible panel
  if (onChallenge && state.screen === "challenge-step") {
    state.vision.attach($("#challenge-vision-root"));
    state.vision.addMirror($("#vision-root"));
  } else if (state.screen === "workshop") {
    state.vision.attach($("#vision-root"));
    state.vision.addMirror($("#challenge-vision-root"));
  }

  const challengeBeat = onChallenge ? buildChallengeVisionBeat() : null;

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
    challengeBeat,
    immediate: Boolean(opts.immediate),
    force: Boolean(opts.force),
    debounceMs: opts.debounceMs,
  });
}

function setSideTab(tab) {
  state.sideTab = tab;
  // Only invent-screen tabs use data-tab (not data-ch-tab)
  $$(".side-tab[data-tab]").forEach((btn) => {
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
      updateVision({ context: "invent" });
    });
  }
  if (tab === "coinventor") ensureCoInventor();
}

function setChallengeSideTab(tab) {
  state.challengeSideTab = tab === "coinventor" ? "coinventor" : "vision";
  $$(".side-tab[data-ch-tab]").forEach((btn) => {
    const on = btn.dataset.chTab === state.challengeSideTab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  const vision = $("#side-challenge-vision");
  const co = $("#side-challenge-coinventor");
  if (vision) vision.hidden = state.challengeSideTab !== "vision";
  if (co) co.hidden = state.challengeSideTab !== "coinventor";
  if (state.challengeSideTab === "vision") {
    requestAnimationFrame(() => {
      ensureVision();
      updateVision({ context: "challenge", immediate: true });
    });
  }
  if (state.challengeSideTab === "coinventor") ensureCoInventor();
}

function refreshChallengeVision(partialBeat, opts = {}) {
  if (partialBeat) setChallengeVisionBeat(partialBeat);
  else if (!state.challengeVisionBeat) setChallengeVisionBeat({ phase: "posed" });
  updateChallengeVisionLabels();
  updateVision({
    context: "challenge",
    immediate: opts.immediate !== false,
    force: Boolean(opts.force),
    debounceMs: opts.debounceMs,
  });
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
        flashToast("No AP left for co-inventor — End Turn or Wait.", { resource: "ap" });
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
      if (maybeBudgetGameOver({ from: "ai_add_tech" })) return;
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
  if (btn) {
    const allow =
      !disabled &&
      (!hotseatBridge.isHotseat() || hotseatBridge.canContributeStory());
    btn.disabled = !allow;
  }
}

/** Face that complete-picture will fill (opposite of current focus). */
function completePictureTargetFace() {
  return state.storyFace === "life" ? "how" : "life";
}

/**
 * Local heuristic: contribution must keep most of the original substance.
 * Lenient by design — false rejects feel broken; only block clear gutting.
 * @returns {{ additive: boolean, reason: string }}
 */
function localAdditiveHeuristic(before, after) {
  const b = String(before || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const a = String(after || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  // Filling an empty / near-empty face is always additive
  if (!b || b.length < 12) {
    return { additive: true, reason: "Original was empty or stub — addition allowed." };
  }
  if (!a) return { additive: false, reason: "Cleared the text — that is destructive." };
  // Clear shorten/gut
  if (a.length < b.length * 0.55) {
    return { additive: false, reason: "Shortened the original too much (destructive)." };
  }
  // Substantial extension or same length with overlap → accept even if rephrased lightly
  if (a.length >= b.length * 0.9 && a.includes(b.slice(0, Math.min(40, b.length)))) {
    return { additive: true, reason: "Keeps the original and builds on it." };
  }
  const bWords = [...new Set(b.split(/\s+/).filter((w) => w.length > 3))];
  if (!bWords.length) return { additive: true, reason: "Little original content to preserve." };
  const aSet = new Set(a.split(/\s+/));
  let kept = 0;
  for (const w of bWords) if (aSet.has(w)) kept++;
  const retention = kept / bWords.length;
  // Soft threshold: only reject when most substance is gone AND text is not longer
  if (retention < 0.35 && a.length < b.length * 1.15) {
    return {
      additive: false,
      reason: `Removed too much of the original wording (${Math.round(retention * 100)}% kept).`,
    };
  }
  // Longer rewrite that still keeps some core words, or any solid extension
  if (a.length > b.length * 1.05 || retention >= 0.35) {
    return { additive: true, reason: "Keeps enough of the original and extends it." };
  }
  return { additive: true, reason: "Treated as additive contribution." };
}

/**
 * Judge multiplayer contributions. Prefers local accept (avoids harsh AI false rejects).
 * AP spent for AI help is NOT refunded when the edit is rejected as destructive.
 * @returns {Promise<{ additive: boolean, reason: string, source: string }>}
 */
async function judgeContributionAdditive({ field, before, after, baseline }) {
  const local = localAdditiveHeuristic(before, after);
  // Empty/stub original or clear local accept → trust local (no AI override)
  if (local.additive) {
    return { ...local, source: "local" };
  }
  // Clear gut (half length or less) → reject without network
  if (String(after || "").length < String(before || "").length * 0.5) {
    return { ...local, source: "local" };
  }
  // Borderline local reject: ask AI, but only accept AI *accept* as override
  // (never let AI reject when we're unsure — wait, local already rejected;
  //  allow AI to rescue a borderline false reject)
  try {
    const res = await fetch("/api/co-invent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "judge-contribution",
        messages: [
          {
            role: "user",
            content: `Is this contribution additive or destructive on field ${field}? Prefer additive if it extends or complements the original rather than gutting it.`,
          },
        ],
        context: {
          field,
          beforeText: before || "",
          afterText: after || "",
          inventionName: baseline?.inventionName || state.inventionName,
          inventionHow: baseline?.inventionHow || state.inventionHow,
          inventionImpact: baseline?.inventionImpact || state.inventionImpact,
          place: state.mission?.place,
          year: state.year,
          challenge: state.mission
            ? { id: state.mission.id, title: state.mission.title, problem: state.mission.scene }
            : null,
        },
      }),
    });
    const data = await res.json();
    if (data.additive === true) {
      return {
        additive: true,
        reason: data.reason || data.message || "AI judged additive.",
        source: data.source || "ai",
      };
    }
    if (typeof data.additive === "boolean") {
      return {
        additive: false,
        reason: data.reason || data.message || local.reason,
        source: data.source || "ai",
      };
    }
    const msg = String(data.message || "").toLowerCase();
    if (msg.includes("additive") && !msg.includes("not additive") && !msg.includes("destructive")) {
      return { additive: true, reason: data.message || local.reason, source: "ai" };
    }
  } catch {
    /* fall through to local reject */
  }
  return { ...local, source: "local" };
}

/** @type {ReturnType<typeof setTimeout> | null} */
let mpContribBannerTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let mpContribBannerLeaveTimer = null;

/**
 * Soft contribution feedback — panel above the story text boxes, auto-dismisses.
 * No modal, no click required.
 * @param {{ ok: boolean, title: string, reason: string, apNote?: string, face?: "how"|"life" }} opts
 */
function showContributionNotice(opts) {
  const { ok, title, reason, apNote = "", face } = opts || {};
  const resolvedTitle = title || (ok ? "Contribution accepted" : "Contribution rejected");
  const resolvedReason = reason || "";
  const resolvedAp = apNote || "";

  let el = document.getElementById("mp-contrib-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "mp-contrib-banner";
    el.className = "mp-contrib-banner";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
  }

  // Cover the textarea that was just written (Fill other = opposite of focus)
  const targetFace = face || (state.storyFace === "how" ? "life" : "how");
  let shell = document.getElementById(
    targetFace === "life" ? "shell-life" : "shell-how"
  );
  // Fallback: wrap textarea if shells missing
  if (!shell) {
    const ta = document.getElementById(
      targetFace === "life" ? "invention-impact" : "invention-how"
    );
    if (ta?.parentElement) {
      if (ta.parentElement.classList.contains("story-textarea-shell")) {
        shell = ta.parentElement;
      } else {
        shell = document.createElement("div");
        shell.className = "story-textarea-shell";
        shell.id = targetFace === "life" ? "shell-life" : "shell-how";
        ta.parentElement.insertBefore(shell, ta);
        shell.appendChild(ta);
      }
    }
  }

  // Reset leave animation / timers
  if (mpContribBannerTimer) clearTimeout(mpContribBannerTimer);
  if (mpContribBannerLeaveTimer) clearTimeout(mpContribBannerLeaveTimer);
  el.classList.remove("is-leaving", "is-visible", "is-accept", "is-reject", "is-over-field");

  if (shell) {
    if (el.parentElement !== shell) shell.appendChild(el);
    el.classList.add("is-over-field");
  } else {
    const hint = document.getElementById("story-mode-hint");
    if (hint?.parentElement) hint.insertAdjacentElement("afterend", el);
  }

  el.classList.toggle("is-accept", Boolean(ok));
  el.classList.toggle("is-reject", !ok);
  el.innerHTML = `
    <span class="mp-contrib-banner-title">${ok ? "✓ " : "✗ "}${escapeHtml(resolvedTitle)}</span>
    ${
      resolvedReason
        ? `<p class="mp-contrib-banner-body">${escapeHtml(resolvedReason)}</p>`
        : ""
    }
    ${
      resolvedAp
        ? `<p class="mp-contrib-banner-ap">${escapeHtml(resolvedAp)}</p>`
        : ""
    }
  `;
  el.hidden = false;
  el.removeAttribute("hidden");

  // Next frame → fade in (opacity only on the overlay — background stays solid colors)
  requestAnimationFrame(() => {
    el.classList.add("is-visible");
  });

  // Auto-dismiss (reject stays a bit longer so the reason is readable)
  const holdMs = ok ? 3200 : 4500;
  mpContribBannerTimer = setTimeout(() => {
    el.classList.add("is-leaving");
    el.classList.remove("is-visible");
    mpContribBannerLeaveTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("is-leaving", "is-accept", "is-reject", "is-over-field");
      el.innerHTML = "";
      // Park beside story hint when idle
      const hint = document.getElementById("story-mode-hint");
      if (hint?.parentElement && el.parentElement !== hint.parentElement) {
        hint.insertAdjacentElement("afterend", el);
      }
    }, 280);
  }, holdMs);
}

/**
 * Snapshot of viewed invent before a contribution AI draft (for additive compare).
 * @type {null | { inventionName: string, inventionHow: string, inventionImpact: string }}
 */
let mpContributionBaseline = null;

async function callCoInventMode(mode, userLabel) {
  if (state.aiBusy) return;
  if (isMpContributionLocked()) {
    flashToast(mpContributionLockReason);
    return;
  }
  if (hotseatBridge.isHotseat() && !hotseatBridge.canContributeStory()) {
    flashToast("Cannot edit this invent right now.");
    return;
  }

  const contributingOther = hotseatBridge.isHotseat() && hotseatBridge.viewingOther();
  if (contributingOther) {
    mpContributionBaseline = {
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
    };
  }

  // Reserve AP — on contribution rejects we deliberately do NOT refund
  let reservedAp = false;
  if (apEnabled()) {
    const reserve = dispatchSim("reserve_ai", {
      mode,
      reservedAp: 1,
      clientActionId: `ai-${Date.now()}`,
    });
    if (!reserve.ok) {
      flashToast("No AP left for AI — End Turn or Wait.", { resource: "ap" });
      return;
    }
    reservedAp = true;
    renderHud();
    mpSyncFromSolo();
  }
  state.aiBusy = true;
  setFillButtonsDisabled(true);
  // Lock pass/seats while contribution draft + additive check run
  if (contributingOther) {
    setMpContributionLock(
      true,
      "Evaluating contribution… Pass device and seat switch disabled until this finishes."
    );
  }

  const fillOther = mode === "complete-picture";
  if (fillOther) {
    const target = completePictureTargetFace();
    showStoryFacePending(
      target,
      target === "life" ? "Drafting everyday life…" : "Drafting how it works…"
    );
  }

  /** @type {null | { ok: boolean, title: string, reason: string, apNote?: string }} */
  let contribNotice = null;

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
      contributingToOther: contributingOther,
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
    if (fillOther) clearStoryFacePending();

    let proposals = data.proposals || null;

    // When helping someone else with Fill other side: only the *missing* face,
    // never a rewrite of the face they already own.
    if (contributingOther && fillOther) {
      if (proposals) {
        const target = completePictureTargetFace();
        const slim = {
          inventionName: null,
          inventionHow: null,
          inventionImpact: null,
          addTechIds: [],
          removeTechIds: [],
          scrutiny: null,
        };
        if (target === "life" && proposals.inventionImpact) {
          slim.inventionImpact = proposals.inventionImpact;
        } else if (target === "how" && proposals.inventionHow) {
          slim.inventionHow = proposals.inventionHow;
        } else if (target === "life" && proposals.inventionHow && !proposals.inventionImpact) {
          // model filled wrong face — still treat as draft for empty target if empty
          if (!(mpContributionBaseline?.inventionImpact || "").trim()) {
            slim.inventionImpact = proposals.inventionHow;
          }
        } else if (target === "how" && proposals.inventionImpact && !proposals.inventionHow) {
          if (!(mpContributionBaseline?.inventionHow || "").trim()) {
            slim.inventionHow = proposals.inventionImpact;
          }
        }
        proposals = slim.inventionHow || slim.inventionImpact ? slim : null;
      }

      if (!proposals) {
        contribNotice = {
          ok: false,
          title: "Contribution failed",
          reason: "The co-inventor did not return a usable draft for the other story face. Try again or type your help.",
          apNote: "AP spent on AI help is not returned.",
        };
        if (reservedAp && state.pendingAi) dispatchSim("resolve_ai");
        reservedAp = false;
      } else {
        const field = proposals.inventionHow != null ? "inventionHow" : "inventionImpact";
        const before =
          field === "inventionHow"
            ? mpContributionBaseline?.inventionHow || ""
            : mpContributionBaseline?.inventionImpact || "";
        const after =
          field === "inventionHow" ? proposals.inventionHow : proposals.inventionImpact;
        // Filling a blank face is always additive — no judge needed
        const blankTarget = !String(before || "").trim() || String(before).trim().length < 12;
        let accepted = true;
        let rejectReason = "";
        if (!blankTarget) {
          const verdict = await judgeContributionAdditive({
            field,
            before,
            after,
            baseline: mpContributionBaseline,
          });
          accepted = Boolean(verdict.additive);
          rejectReason = verdict.reason || "Not additive.";
        }
        if (!accepted) {
          if (reservedAp && state.pendingAi) dispatchSim("resolve_ai");
          reservedAp = false;
          proposals = null;
          contribNotice = {
            ok: false,
            title: "Contribution rejected",
            reason: rejectReason,
            apNote: "AP spent on AI help is not returned.",
          };
          ensureCoInventor();
          state.coInventor?.pushAssistant?.(
            {
              message: `**Rejected contribution** — ${rejectReason}\n\nHelp must *layer on* their idea, not gut it. AP for this AI help stays spent.`,
              proposals: emptyProps(),
              teaching: [],
            },
            { local: true }
          );
        } else {
          contribNotice = {
            ok: true,
            title: "Contribution accepted",
            reason: blankTarget
              ? "Your help was applied to their invent (filled an empty story face)."
              : "Your help was applied to their invent (additive check passed).",
            apNote: "1 AP spent on co-inventor help.",
          };
        }
      }
    }

    if (proposals) {
      applyCoInventorProposals(proposals);
      mpSyncFromSolo();
    }
    if (data.message && proposals) {
      ensureCoInventor();
      state.coInventor?.pushAssistant?.(
        {
          message: data.message,
          proposals: proposals || emptyProps(),
          teaching: data.teaching || [],
        },
        { local: data.source === "local" }
      );
    }
    if (fillOther && proposals && !contributingOther) {
      flashToast("Other story face filled");
      scheduleAiTimingAssess();
    }
    if (fillOther && proposals && contributingOther) {
      scheduleAiTimingAssess();
    }
  } catch (e) {
    // Transport/5xx: refund. Contribution content rejection already handled above without refund.
    if (reservedAp && apEnabled()) dispatchSim("reject_ai");
    reservedAp = false;
    if (contributingOther && fillOther) {
      contribNotice = {
        ok: false,
        title: "Contribution failed",
        reason: e.message || "AI request failed",
        apNote: "AP was refunded because the request failed.",
      };
    } else {
      flashToast(e.message || "AI request failed");
    }
  } finally {
    if (reservedAp && apEnabled() && state.pendingAi) dispatchSim("resolve_ai");
    if (fillOther) clearStoryFacePending();
    state.aiBusy = false;
    mpContributionBaseline = null;
    if (contributingOther) setMpContributionLock(false);
    setFillButtonsDisabled(false);
    updateChallengeButton();
    renderHud();
    renderMpChrome();
    if (fillOther) renderStoryFaceUI();
    mpSyncFromSolo();
    // Always surface contribution outcome after chrome unlock (hard to miss)
    if (contribNotice) {
      showContributionNotice(contribNotice);
    }
  }
}

async function commitWriteIfNeeded() {
  const snap = {
    name: state.inventionName,
    how: state.inventionHow,
    impact: state.inventionImpact,
  };
  const prev = state.lastWriteSnapshot || { name: "", how: "", impact: "" };
  const changed =
    snap.name !== prev.name || snap.how !== prev.how || snap.impact !== prev.impact;
  if (!changed) return;

  // Hotseat contribute-to-other: AI/local additive check (AP spent on check is not refunded)
  if (hotseatBridge.isHotseat() && hotseatBridge.viewingOther()) {
    setMpContributionLock(
      true,
      "Evaluating contribution… Pass device and seat switch disabled until this finishes."
    );
    /** @type {null | { ok: boolean, title: string, reason: string, apNote?: string }} */
    let notice = null;
    try {
      const fields = [
        ["inventionName", prev.name, snap.name],
        ["inventionHow", prev.how, snap.how],
        ["inventionImpact", prev.impact, snap.impact],
      ];
      let changedFields = 0;
      for (const [field, before, after] of fields) {
        if (before === after) continue;
        changedFields++;
        // Spend 1 AP for contribution review — never refund if rejected
        let spent = false;
        if (apEnabled() && (state.ap ?? 0) > 0) {
          const res = dispatchSim("reserve_ai", {
            mode: "judge-contribution",
            reservedAp: 1,
            clientActionId: `contrib-${Date.now()}`,
          });
          if (res.ok) {
            spent = true;
            if (state.pendingAi) dispatchSim("resolve_ai"); // commit spend (no refund)
            mpSyncFromSolo();
            renderHud();
          }
        }
        const verdict = await judgeContributionAdditive({
          field,
          before,
          after,
          baseline: {
            inventionName: prev.name,
            inventionHow: prev.how,
            inventionImpact: prev.impact,
          },
        });
        if (!verdict.additive) {
          // Revert field
          if (field === "inventionName") state.inventionName = before;
          if (field === "inventionHow") state.inventionHow = before;
          if (field === "inventionImpact") state.inventionImpact = before;
          syncStoryFieldsToDom();
          notice = {
            ok: false,
            title: "Edit rejected",
            reason: verdict.reason,
            apNote: spent
              ? "AP spent on the contribution check is not returned."
              : "",
          };
          return;
        }
      }
      if (changedFields > 0) {
        notice = {
          ok: true,
          title: "Contribution accepted",
          reason: "Your edit was applied to their invent (additive check passed).",
          apNote: "",
        };
      }
    } finally {
      setMpContributionLock(false);
      renderMpChrome();
      if (notice) showContributionNotice(notice);
    }
  }

  const r = dispatchSim("write_commit", { changed: true });
  if (!r.ok && r.error === "no_ap_buffer") {
    flashToast("No AP for more edits — End Turn or Wait (changes kept).", { resource: "ap" });
    state.lastWriteSnapshot = snap;
    mpSyncFromSolo();
    return;
  }
  if (r.ok) {
    state.lastWriteSnapshot = snap;
    mpSyncFromSolo();
  }
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

/**
 * Toast near the top HUD (resource counters), not buried at the bottom.
 * @param {string} msg
 * @param {{ resource?: "ap"|"budget"|"will", durationMs?: number }} [opts]
 */
function flashToast(msg, opts = {}) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove("is-resource-ap", "is-resource-budget", "is-resource-will");
  if (opts.resource) el.classList.add(`is-resource-${opts.resource}`);
  el.classList.add("is-visible");
  // Pulse the matching HUD counters (workshop + challenge)
  pulseHudResource(opts.resource);
  clearTimeout(el._t);
  const ms = opts.durationMs ?? 3200;
  el._t = setTimeout(() => {
    el.classList.remove("is-visible");
  }, ms);
}

function pulseHudResource(resource) {
  if (!resource) return;
  const ids =
    resource === "ap"
      ? ["#hud-ap", "#ch-hud-ap"]
      : resource === "budget"
        ? ["#hud-budget", "#ch-hud-budget"]
        : resource === "will"
          ? ["#hud-will", "#ch-hud-will"]
          : [];
  ids.forEach((sel) => {
    const node = $(sel);
    if (!node || node.hidden) return;
    node.classList.remove("hud-pulse");
    // reflow so animation restarts
    void node.offsetWidth;
    node.classList.add("hud-pulse");
    clearTimeout(node._pulseT);
    node._pulseT = setTimeout(() => node.classList.remove("hud-pulse"), 1400);
  });
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
  initFriendsUi({
    showScreen,
    flashToast,
    $,
    $$,
    escapeHtml,
    beginMissionPick,
    clearMissionPickSession,
    enterHotseatPlay,
    leaveHotseat,
  });
  $("#btn-mp-pass-device")?.addEventListener("click", () => mpPassDevice());
  $("#btn-mp-prev-invent")?.addEventListener("click", () => {
    if (!hotseatBridge.isHotseat()) return;
    if (isMpContributionLocked()) {
      flashToast(mpContributionLockReason);
      return;
    }
    mpSyncFromSolo();
    hotseatBridge.cycleView(-1);
    mpHydrateAndRender();
  });
  $("#btn-mp-next-invent")?.addEventListener("click", () => {
    if (!hotseatBridge.isHotseat()) return;
    if (isMpContributionLocked()) {
      flashToast(mpContributionLockReason);
      return;
    }
    mpSyncFromSolo();
    hotseatBridge.cycleView(1);
    mpHydrateAndRender();
  });
  $("#btn-start").addEventListener("click", () => {
    clearMissionPickSession();
    leaveHotseat();
    showScreen("global");
  });
  $("#btn-surprise").addEventListener("click", () => {
    clearMissionPickSession();
    surpriseMission().catch(() => flashToast("Could not start a surprise mission"));
  });
  $("#btn-daily-play")?.addEventListener("click", () => {
    clearMissionPickSession();
    const daily = state.dailyPick || pickDailyMission(GLOBALS, localScenariosForGlobal);
    if (!daily?.mission) {
      flashToast("Daily mission unavailable.");
      return;
    }
    state.global = daily.global;
    startMission(normalizeMission(daily.mission, daily.global.id));
  });
  $("#btn-daily-pin")?.addEventListener("click", () => {
    const daily = state.dailyPick || pickDailyMission(GLOBALS, localScenariosForGlobal);
    if (!daily?.mission) return;
    pinMission(daily.mission, daily.global);
  });
  $("#btn-global-back").addEventListener("click", () => {
    if (missionPickSession) {
      const session = missionPickSession;
      missionPickSession = null;
      session.onCancel?.();
      return;
    }
    showScreen("title");
  });
  $("#btn-mission-back").addEventListener("click", () => showScreen("global"));
  $("#btn-regen-scenarios")?.addEventListener("click", () => {
    if (!state.global || state.scenariosLoading) return;
    renderMissions({ force: true });
  });
  $("#btn-abandon").addEventListener("click", () => {
    if (hotseatBridge.isHotseat()) {
      if (confirm("Leave hotseat? The shared race ends for this device.")) {
        leaveHotseat();
        showScreen("friends");
      }
      return;
    }
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
      if (hotseatBridge.isHotseat() && !hotseatBridge.canContributeStory()) {
        flashToast("Cannot edit this invent right now.");
        return;
      }
      state.storyFace = btn.dataset.face === "life" ? "life" : "how";
      renderStoryFaceUI();
      renderMpChrome();
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
    // Return to deploy bay — any active player may Pilot/Scale a locked invent
    if (deployStagesEnabled() && state.deployUnlocked) {
      if (
        hotseatBridge.isHotseat() &&
        !(hotseatBridge.canRunDeploy?.() || hotseatBridge.canFaceChallenge())
      ) {
        flashToast("Not your turn, or this invent is not ready to deploy.");
        return;
      }
      state.turnPhase = "between_stages";
      showScreen("challenge-step");
      renderChallengeStep();
      renderDeployBay();
      return;
    }
    // Hotseat: only owner faces Challenge
    if (hotseatBridge.isHotseat() && !hotseatBridge.canFaceChallenge()) {
      flashToast(
        hotseatBridge.viewingOther()
          ? "Only the owner can face Challenge on this invent."
          : "Cannot face Challenge on this invent."
      );
      return;
    }
    if (!inventReadyForChallenge()) {
      flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
      return;
    }
    if (apEnabled()) {
      const r = dispatchSim("enter_challenge");
      if (!r.ok) {
        if (r.error === "no_ap") flashToast("No AP — End Turn or Wait first.", { resource: "ap" });
        else flashToast(r.error || "Cannot enter challenge");
        return;
      }
      renderHud();
      mpSyncFromSolo();
    } else {
      state.turnPhase = "scrutiny";
    }
    // enterChallenge is async — must not drop the promise
    enterChallenge().catch((e) => {
      console.error(e);
      flashToast(e.message || "Challenge failed to open");
    });
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
  $("#btn-deploy-stage-primary")?.addEventListener("click", () => {
    const next = nextDeployStageAction();
    if (next) attemptDeployStage(next);
  });
  $("#btn-deploy-back-invent")?.addEventListener("click", () => returnToInventFromDeploy());
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
  $("#btn-regen-vision").addEventListener("click", () =>
    updateVision({ immediate: true, force: true, context: "invent" })
  );
  $("#btn-regen-challenge-vision")?.addEventListener("click", () =>
    refreshChallengeVision(null, { immediate: true, force: true })
  );

  $$(".side-tab[data-tab]").forEach((btn) =>
    btn.addEventListener("click", () => setSideTab(btn.dataset.tab))
  );
  $$(".side-tab[data-ch-tab]").forEach((btn) =>
    btn.addEventListener("click", () => setChallengeSideTab(btn.dataset.chTab))
  );

  $("#btn-outcome-new").addEventListener("click", () => showScreen("global"));
  $("#btn-outcome-retry").addEventListener("click", () => {
    if (state.mission) showScreen("workshop");
    else showScreen("global");
  });
  $("#btn-outcome-share")?.addEventListener("click", () => {
    const payload = state.sharePayload;
    if (!payload) {
      flashToast("Nothing to share yet.");
      return;
    }
    try {
      const url = renderShareCard(payload);
      if (!url) {
        flashToast("Could not build share card.");
        return;
      }
      const slug = String(payload.inventionName || "run")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      downloadDataUrl(url, `future-forge-${slug || "run"}.png`);
      flashToast("Share card downloaded.");
    } catch (e) {
      flashToast("Share card failed.");
    }
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
