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
import {
  isWin as simIsWin,
  isWin,
  isCollapsed as simIsCollapsed,
  isMpPlaceCollapsed,
  crisisMeterLevel,
} from "./sim/collapse.js";
import { inventYear } from "./sim/mp-session.js";
import { scoreRun, starLabel } from "./sim/scoring.js";
import {
  applyAction,
  simSliceFromState,
  applySimSliceToState,
} from "./sim/actions.js";
import { techCost as techCostRaw, deployActionCost, scaleActionCost } from "./sim/economy.js";
import {
  describeMarketEffects,
  marketAffectsTech,
  cloneMarketNews,
  marketNewsImagePath,
} from "./sim/market-news.js";
import {
  foresightCapabilityContext,
  applyForesightToClaimStretch,
  foresightForYear,
} from "./sim/world-foresight.js";
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
  isUsableVisionUrl,
  visionUrlFromImg,
} from "./meta.js";
import { initFriendsUi } from "./multiplayer/ui.js";
import { createHotseatBridge } from "./multiplayer/hotseat-bridge.js";
import { createRoomBridge } from "./multiplayer/room-bridge.js";
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
  sidestepCostForEncounter,
  localArgueQuality,
  MISS_BUDGET,
  cloneScrutiny,
} from "./sim/scrutiny.js";
import { deriveInventPhase } from "./sim/invent-phase.js";
import {
  resolvePlayMode,
  featuresForPlayMode,
  readPlayMode,
  readHasCompletedSpark,
  markSparkCompleted,
} from "./sim/play-mode.js";

/** Hotseat session bridged into solo workshop / challenge / deploy */
const hotseatBridge = createHotseatBridge();
/** Online room bridged into the same solo screens (Challenge is its own screen) */
const roomBridge = createRoomBridge();
/** @type {null | (() => void)} */
let roomUnsub = null;

/** Online friends room (not hotseat / not solo) */
function isOnlineRoomMp() {
  return Boolean(roomBridge.isRoom() || state.mp?.mode === "room");
}

/** Active multiplayer bridge — prefer room over leftover hotseat session */
function mpBridge() {
  if (roomBridge.isRoom()) return roomBridge;
  if (hotseatBridge.isHotseat()) return hotseatBridge;
  return null;
}

/**
 * End-turn button copy: rooms never say "Pass device".
 * @returns {string}
 */
function endTurnButtonLabel() {
  // Prefer body class (set as soon as room play starts) over bridge races
  if (
    isOnlineRoomMp() ||
    document.body.classList.contains("mp-room") ||
    state.mp?.mode === "room"
  ) {
    return "End turn →";
  }
  if (hotseatBridge.isHotseat() || document.body.classList.contains("mp-hotseat")) {
    return "Pass device →";
  }
  return "End turn";
}

/**
 * Keep End turn / Pass device chrome consistent (rooms never show Pass device).
 */
function applyEndTurnChrome() {
  const room = isOnlineRoomMp() || document.body.classList.contains("mp-room");
  const hotseat = !room && (hotseatBridge.isHotseat() || document.body.classList.contains("mp-hotseat"));
  const label = endTurnButtonLabel();
  for (const sel of ["#btn-end-turn", "#btn-challenge-end-turn"]) {
    const el = $(sel);
    if (!el) continue;
    // Always rewrite label so stale "Pass device" cannot stick after room entry
    if (!el.hidden) el.textContent = label;
    else if (room) el.textContent = "End turn →";
  }
  const passDev = $("#btn-mp-pass-device");
  if (passDev) {
    if (room || !hotseat) {
      passDev.hidden = true;
      passDev.setAttribute("hidden", "");
      passDev.style.display = "none";
    } else {
      passDev.hidden = false;
      passDev.removeAttribute("hidden");
      passDev.style.display = "";
      passDev.textContent = "Pass device →";
    }
  }
  // Never leave body in both modes
  if (room) {
    document.body.classList.add("mp-room");
    document.body.classList.remove("mp-hotseat");
  }
}

/**
 * Human-readable multiplayer action errors (never show raw sim codes).
 * @param {string} err
 * @returns {string}
 */
function mpFriendlyError(err) {
  const code = String(err || "rejected");
  const map = {
    pilot_required: "Pilot this invention successfully before Scale.",
    challenge_required: "This invent must pass Challenge before Pilot.",
    pilot_already_done: "Pilot is already done — try Scale.",
    already_scaled: "This invent is already Scaled.",
    retry_next_turn: "Already tried this turn — End turn, then retry.",
    not_active_seat: "Not your turn — wait for the active player.",
    invent_locked: "This invent is locked (Challenge started or finished).",
    owner_only: "Only the invent owner can reopen it for rework.",
    already_past_challenge: "This invent already cleared Challenge — open Deploy or reopen invent.",
    not_in_challenge:
      "Not mid-Challenge — combat actions only while facing a challenger on your invent.",
    cannot_enter_challenge: "Cannot enter Challenge on this invent right now.",
    no_ap: "Not enough AP for that action.",
    no_budget: "Not enough Budget for that action.",
    no_target: "Could not find that invent.",
    target_abandoned: "That invent was abandoned.",
    abandoned: "You abandoned your invent — help others or Wait.",
    race_over: "The race is over.",
    run_over: "This run is over.",
    field_locked: "Someone else is editing that field.",
    player_rate_quota: "AI rate limit — wait a minute.",
    player_session_quota: "Session AI quota reached.",
    room_quota: "Room AI budget exhausted.",
    pose_judge_busy: "Another pose/judge is in flight.",
    end_turn_noop: "Do something this turn first (write, tech, Pilot/Scale, or Wait).",
    not_connected: "Not connected to the room.",
    wait_once: "You already Waited this seat-turn.",
    wait_blocked_phase: "Cannot Wait during Challenge — finish or End turn first.",
    wait_own_invent_only:
      "Wait is only for your own invent — switch to your seat tab first (not while helping someone else).",
  };
  return map[code] || code;
}

/**
 * Multiplayer: Wait advances *your* invent calendar only.
 * Not allowed while viewing / contributing to another seat's invent.
 */
function canWaitOnCurrentInvent() {
  const b = mpBridge();
  if (!b) return { ok: true };
  if (b.isMyTurn && !b.isMyTurn()) {
    return { ok: false, error: "not_active_seat" };
  }
  if (b.viewingOther?.()) {
    return { ok: false, error: "wait_own_invent_only" };
  }
  return { ok: true };
}

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
  /** Room follow-along: active player defense is being AI-judged */
  challengeJudging: false,
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
  /** @type {import("./sim/market-news.js").MarketNews | null} */
  marketNews: null,
  /** Last market news id we already showed in the modal */
  marketNewsShownId: null,
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
  /** How Challenge was cleared: defend | fix | sidestep | essay | null */
  challengeClearMode: null,
  /** @type {"defend"|"fix"|"sidestep"|null} selected challenge response mode */
  scrutinyMoveMode: null,
  /** True while pose-challenge AI is generating the critic (UI locked) */
  challengePosePending: false,
  /** True while the local challenger-draw reel is spinning (block room hydrate) */
  challengeRevealPending: false,
  /** Online room: watching another player on the Challenge screen (read-only) */
  challengeSpectator: false,
  /** Deploy side panel tab: vision | coinventor */
  deploySideTab: "vision",
  /** Last multiplayer active seat id (for turn-start popup) */
  mpLastActiveSeatId: null,
  /** Suppress turn popup once after join */
  mpTurnNoticePrimed: false,
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

/**
 * Friends room / hotseat keep today's full GAME.features (not Spark).
 * Solo resolves Spark (first run) vs Workshop (after first win) via play-mode storage.
 */
function isRoomOrHotseatSession() {
  try {
    if (roomBridge.isRoom()) return true;
    if (hotseatBridge.isHotseat()) return true;
  } catch {
    /* bridges may be mid-teardown */
  }
  const mode = state.mp?.mode;
  return mode === "room" || mode === "hotseat";
}

function features() {
  const base = GAME.features || {};
  if (isRoomOrHotseatSession()) return base;
  const mode = resolvePlayMode({
    storedMode: readPlayMode(),
    hasCompletedSpark: readHasCompletedSpark(),
  });
  return featuresForPlayMode(mode, base);
}

function apEnabled() {
  return Boolean(features().actionPoints);
}

function budgetWillEnabled() {
  return Boolean(features().budgetWill);
}

/**
 * Authoritative spendable AP for the local player.
 * Rooms may skip full hydrate mid-Challenge; still read live invent AP from the snapshot
 * so Challenge HUD / sidestep checks don't use a stale counter.
 */
function getSpendableAp() {
  let raw = state.ap;
  try {
    if (roomBridge.isRoom()) {
      const id = roomBridge.myId?.();
      const f =
        (id && roomBridge.invent?.(id)) ||
        (id && roomBridge.client?.()?.snapshot?.mp?.invents?.[id]) ||
        roomBridge.client?.()?.snapshot?.you?.invent ||
        null;
      if (f && f.ap != null) raw = f.ap;
    } else if (hotseatBridge.isHotseat()) {
      const id = hotseatBridge.getActiveId?.();
      const f = id ? hotseatBridge.invent?.(id) : null;
      if (f && f.ap != null) raw = f.ap;
    }
  } catch {
    /* ignore */
  }
  const n = Number(raw);
  const ap = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  state.ap = ap;
  return ap;
}

/** Authoritative spendable Will for the local player (same sources as AP). */
function getSpendableWill() {
  let raw = state.will;
  try {
    if (roomBridge.isRoom()) {
      const id = roomBridge.myId?.();
      const f =
        (id && roomBridge.invent?.(id)) ||
        (id && roomBridge.client?.()?.snapshot?.mp?.invents?.[id]) ||
        roomBridge.client?.()?.snapshot?.you?.invent ||
        null;
      if (f && f.will != null) raw = f.will;
    } else if (hotseatBridge.isHotseat()) {
      const id = hotseatBridge.getActiveId?.();
      const f = id ? hotseatBridge.invent?.(id) : null;
      if (f && f.will != null) raw = f.will;
    }
  } catch {
    /* ignore */
  }
  const n = Number(raw);
  const will = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  state.will = will;
  return will;
}

/**
 * Pull AP/budget/will from the room snapshot without a full invent hydrate.
 * Used mid-Challenge when full hydrate is paused (selfChallengeBusy).
 */
function syncRoomResourcesFromSnapshot() {
  if (!roomBridge.isRoom()) return;
  try {
    const id = roomBridge.myId?.();
    if (!id) return;
    const f =
      roomBridge.invent?.(id) ||
      roomBridge.client?.()?.snapshot?.mp?.invents?.[id] ||
      roomBridge.client?.()?.snapshot?.you?.invent ||
      null;
    if (!f) return;
    if (f.ap != null) state.ap = Number(f.ap) || 0;
    if (f.apMax != null) state.apMax = Number(f.apMax) || state.apMax;
    if (f.budget != null) state.budget = Number(f.budget) || 0;
    if (f.will != null) state.will = Number(f.will) || 0;
    if (f.apSpentThisTurn != null) state.apSpentThisTurn = Number(f.apSpentThisTurn) || 0;
  } catch {
    /* ignore */
  }
}

/** Paint invent + challenge + deploy resource chips so they never diverge. */
function paintResourceHud() {
  renderHud();
  if (state.screen === "challenge-step") renderChallengeHud();
  if (state.screen === "deploy") renderDeployHud();
}

function scrutinyCombatEnabled() {
  return Boolean(features().scrutinyCombat);
}

function deployStagesEnabled() {
  return Boolean(features().deployStages);
}

/** Max techs on stack — Spark 3, Workshop 6 (from play-mode profile). */
function stackCapLimit() {
  const c = features().stackCap;
  if (typeof c === "number" && c > 0) return Math.floor(c);
  return 6;
}

/** Spark: only starter techs (+ mission.suggested). Workshop: full catalog. */
function starterTechOnlyEnabled() {
  return Boolean(features().starterTechOnly);
}

/** Spark: one story box; Workshop: How it works + Everyday life. */
function singleStoryFaceEnabled() {
  return Boolean(features().singleStoryFace);
}

/**
 * Techs shown in the invent tray for the current mode.
 * Spark: starters plus any mission-suggested ids (even non-starters).
 */
function techsForTray() {
  if (!starterTechOnlyEnabled()) return [...TECHS];
  const suggested = new Set(state.mission?.suggested || []);
  return TECHS.filter((t) => t.starter || suggested.has(t.id));
}

/**
 * Spark keeps both state fields populated so feasibility / deploy min-length still pass.
 * Mirrors how → impact (same text).
 */
function mirrorSparkStoryImpact() {
  if (!singleStoryFaceEnabled()) return;
  state.inventionImpact = String(state.inventionHow || "");
}

/** Active market card (solo state or shared place in multiplayer). */
function currentMarketNews() {
  return state.marketNews || null;
}

/**
 * emTech cost including active market news (Budget/Will only; AP always 1).
 * @param {object} t
 */
function techCost(t) {
  return techCostRaw(t, { market: currentMarketNews() });
}

/**
 * Can the local player pay to add this emTech right now?
 * (AP + Budget + Will — never optimistically select when false.)
 * @param {object|null|undefined} t
 * @returns {{ ok: boolean, error?: "no_ap"|"no_budget"|"no_will" }}
 */
function canAffordTech(t) {
  if (!t) return { ok: false };
  if (apEnabled() && (state.ap ?? 0) < 1) return { ok: false, error: "no_ap" };
  if (budgetWillEnabled()) {
    const cost = techCost(t);
    if ((state.budget ?? 0) < (cost.budget || 0)) return { ok: false, error: "no_budget" };
    if ((state.will ?? 0) < (cost.will || 0)) return { ok: false, error: "no_will" };
  }
  return { ok: true };
}

/** Toast why an emTech can't be added — does not select it. */
function flashUnaffordableTech(id, error) {
  const t = techById(id);
  const cost = techCost(t);
  if (error === "no_ap") {
    flashToast("No AP left — End Turn or Wait.", { resource: "ap" });
  } else if (error === "no_budget") {
    flashToast(
      `Need ${cost.budget ?? 1}$ Budget to add ${t?.name || "this"} (you have ${state.budget ?? 0}$).`,
      { resource: "budget" }
    );
  } else if (error === "no_will") {
    flashToast(
      `Need ${cost.will ?? 1} Will to add ${t?.name || "this"} (you have ${state.will ?? 0}).`,
      { resource: "will" }
    );
  } else {
    flashToast("Not enough resources to add this tech.");
  }
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
    const newsEv = (result.events || []).find((e) => e.type === "market_news");
    if (newsEv?.marketNews) {
      queueMarketNewsModal(newsEv.marketNews, { force: true });
    }
    // Year tick: store bulletin + pulse HUD year (no auto popup — click year to read)
    const yearEv = (result.events || []).find((e) => e.type === "year_tick");
    if (yearEv?.bulletin) {
      noteYearAdvance(yearEv.bulletin);
    }
  }
  return result;
}

function mpActive() {
  return Boolean(mpBridge());
}

function mpSyncFromSolo() {
  const b = mpBridge();
  if (!b) return;
  b.syncSoloToSession?.(state);
}

/** Prevent patch storms from re-entering full hydrate/render (freezes the tab). */
let mpHydrateBusy = false;
let mpHydrateQueued = false;
let mpVisionRefreshTimer = null;
/** Circuit breaker: if hydrate runs too often, skip vision + heavy work */
let mpHydrateCountWindow = { t: 0, n: 0 };

function mpHydrateAndRender(opts = {}) {
  const b = mpBridge();
  if (!b) return;
  if (mpHydrateBusy) {
    mpHydrateQueued = true;
    return;
  }
  const now = Date.now();
  if (now - mpHydrateCountWindow.t > 1000) {
    mpHydrateCountWindow = { t: now, n: 0 };
  }
  mpHydrateCountWindow.n += 1;
  const storm = mpHydrateCountWindow.n > 12;
  if (storm) {
    console.warn("[mp] hydrate storm — skipping heavy render", mpHydrateCountWindow.n);
    try {
      const drafts = captureFocusedInventDrafts();
      b.hydrateSoloState(state, { global: state.global });
      reapplyFocusedInventDrafts(drafts);
      applyEndTurnChrome();
      if (!opts.skipTurnNotice) maybeNotifyMpTurnStart();
    } catch (e) {
      console.error(e);
    }
    return;
  }
  mpHydrateBusy = true;
  try {
    const drafts = captureFocusedInventDrafts();
    const yearBefore = state.year;
    const viewBefore = state.mp?.viewSeatId;
    const marketBeforeId = state.marketNews?.id || null;
    b.hydrateSoloState(state, { global: state.global });
    reapplyFocusedInventDrafts(drafts);
    // Personal invent calendar / seat switch — re-run feasibility timing for this invent year
    if (state.year !== yearBefore || state.mp?.viewSeatId !== viewBefore) {
      state.aiTiming = null;
      if (state.screen === "workshop") scheduleAiTimingAssess();
    }
    // Multiplayer: full seat-round wrap ships new market news on the place
    if (state.marketNews?.id && state.marketNews.id !== marketBeforeId) {
      queueMarketNewsModal(state.marketNews, { force: true });
    }
    renderMpChrome();
    if (state.screen === "workshop") renderWorkshop();
    else if (state.screen === "deploy") {
      renderDeployHud();
      if (state.deployUnlocked) renderDeployBay();
    } else if (state.screen === "challenge-step") {
      // Don't re-pose challenge on every patch — combat HUD only
      if (state.scrutiny || state.challengeText) {
        renderChallengeHud();
      } else {
        renderChallengeStep();
      }
    }
    // Vision: solo/hotseat debounced. Rooms: only via scheduleRoomVisionRefresh
    // on real invent changes (not every hydrate — that cancelled timers forever).
    if (!roomBridge.isRoom()) {
      if (opts.visionImmediate) {
        updateVision({ debounceMs: 200 });
      } else {
        clearTimeout(mpVisionRefreshTimer);
        mpVisionRefreshTimer = setTimeout(() => {
          try {
            updateVision({ debounceMs: 600 });
          } catch (e) {
            console.warn("[vision] deferred refresh", e);
          }
        }, 900);
      }
    }
    if (!opts.skipTurnNotice) maybeNotifyMpTurnStart();
  } finally {
    mpHydrateBusy = false;
    if (mpHydrateQueued) {
      mpHydrateQueued = false;
      // One deferred retry only (not rAF chain — that re-stormed)
      clearTimeout(mpHydrateAndRender._retry);
      mpHydrateAndRender._retry = setTimeout(() => mpHydrateAndRender(opts), 250);
    }
  }
}

/**
 * Upper-left turn indicator only — whose seat-turn it is.
 * Editing/viewing lives on the seat tabs, not here.
 */
function setMpActivePlayerBadges(on, name, _opts = {}) {
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
    badge.innerHTML = `<strong>${escapeHtml(name || "—")}</strong><span class="mp-active-label"> · turn</span>`;
    badge.title = `${name || "Player"}'s turn`;
  }
}

/**
 * While a contribution (AI draft + additive judge) is in flight, lock invent UI
 * so the player cannot leave mid-evaluation (blur → evaluate path).
 * @type {boolean}
 */
let mpContributionLock = false;
/** @type {string} */
let mpContributionLockReason = "Wait — contribution is being evaluated…";
/** Prevents concurrent commitWriteIfNeeded / double-blur races */
let writeCommitInFlight = false;
/** @type {ReturnType<typeof setTimeout> | null} debounced soft-save from invent inputs */
let writeCommitTimer = null;
/** Idle ms after last keystroke before soft-persisting draft (no AI / no AP write_commit) */
const INVENT_SOFT_SAVE_MS = 900;
/** When true, invent blur handlers skip commit (seat switch already flushed / abandoned draft) */
let suppressInventBlurCommit = false;

/**
 * Capture invent fields the local player is actively editing so hydrates/re-renders
 * cannot wipe in-progress typing with a slightly older server/session snapshot.
 * @returns {{ inventionName?: string, inventionHow?: string, inventionImpact?: string }}
 */
function captureFocusedInventDrafts() {
  /** @type {{ inventionName?: string, inventionHow?: string, inventionImpact?: string }} */
  const drafts = {};
  const name = $("#invention-name");
  const how = $("#invention-how");
  const impact = $("#invention-impact");
  if (name && document.activeElement === name) drafts.inventionName = name.value;
  if (how && document.activeElement === how) drafts.inventionHow = how.value;
  if (impact && document.activeElement === impact) drafts.inventionImpact = impact.value;
  return drafts;
}

/**
 * True when local draft looks like an in-progress edit of the hydrated value
 * (prefix extension or deletion), not an unrelated invent after a seat switch.
 */
function isLikelyTypingContinuation(hydrated, draft) {
  const s = String(hydrated ?? "");
  const d = String(draft ?? "");
  if (d === s) return true;
  if (!s) return d.length > 0; // typing into empty field
  if (!d) return true; // user cleared the field
  return d.startsWith(s) || s.startsWith(d);
}

/**
 * Reapply focused drafts over hydrated state only when they look like the same edit
 * (avoids pasting invent A into invent B after a seat-tab switch while still focused).
 * @param {{ inventionName?: string, inventionHow?: string, inventionImpact?: string }} drafts
 */
function reapplyFocusedInventDrafts(drafts) {
  if (!drafts) return;
  if (
    drafts.inventionName !== undefined &&
    isLikelyTypingContinuation(state.inventionName, drafts.inventionName)
  ) {
    state.inventionName = drafts.inventionName;
  }
  if (
    drafts.inventionHow !== undefined &&
    isLikelyTypingContinuation(state.inventionHow, drafts.inventionHow)
  ) {
    state.inventionHow = drafts.inventionHow;
  }
  if (
    drafts.inventionImpact !== undefined &&
    isLikelyTypingContinuation(state.inventionImpact, drafts.inventionImpact)
  ) {
    state.inventionImpact = drafts.inventionImpact;
  }
}

/**
 * Soft-persist invent prose while typing: buffer to room server / hotseat session.
 * Does not run AI contribution checks or spend write_commit AP — those wait for blur.
 * Contributions to *someone else's* invent stay local until blur + additive AI check.
 */
function softPersistInventDrafts() {
  if (writeCommitInFlight || isMpContributionLocked()) return;
  if (isViewedInventStoryLocked()) return;

  const bridge = mpBridge();
  // Helping another seat: keep draft local until commitWriteIfNeeded (blur) judges it
  if (bridge?.viewingOther?.()) return;

  if (roomBridge.isRoom()) {
    if (!roomBridge.canContributeStory?.()) return;
    const targetSeatId = roomBridge.getViewId();
    const prev = state.lastWriteSnapshot || { name: "", how: "", impact: "" };
    const pairs = [
      ["inventionName", prev.name, state.inventionName || ""],
      ["inventionHow", prev.how, state.inventionHow || ""],
      ["inventionImpact", prev.impact, state.inventionImpact || ""],
    ];
    for (const [field, before, after] of pairs) {
      if (before === after) continue;
      try {
        roomBridge.send({
          type: "buffer_write",
          payload: { field, value: after, targetSeatId },
        });
      } catch {
        /* offline / not joined */
      }
    }
    return;
  }

  if (hotseatBridge.isHotseat()) {
    // Push local prose into session invent without write_commit AP metering
    mpSyncFromSolo();
  }
}

const MP_LOCK_CONTROL_IDS = [
  "#btn-mp-pass-device",

  "#btn-end-turn",
  "#btn-challenge-end-turn",
  "#btn-wait",
  "#btn-to-challenge",
  "#btn-fill-other",
  "#btn-lobby",
  "#btn-open-coinventor",
  "#btn-abandon",
];

function isMpContributionLocked() {
  return Boolean(mpContributionLock);
}

/**
 * True while invent AI (Fill other side / co-inventor) or contribution eval is in flight.
 * Challenge pose/judge locks use isChallengeCombatBlocking instead.
 */
function isInventActionBusy() {
  return Boolean(state.aiBusy) || writeCommitInFlight || isMpContributionLocked();
}

/**
 * True while the active player waits on Challenge AI (pose speech or defense judge).
 * Spectators are handled via isChallengeWatchOnly.
 */
function isChallengeCombatBlocking() {
  if (typeof isChallengeWatchOnly === "function" && isChallengeWatchOnly()) return false;
  return (
    Boolean(state.challengePosePending) ||
    Boolean(state.challengeRevealPending) ||
    Boolean(challengeCombatBusy)
  );
}

/**
 * Active room player is mid Face-Challenge local work (draw reel or AI pose/judge).
 * Patches must not full-hydrate invent or they wipe local challenge state → desync.
 */
function isRoomSelfChallengeBusy() {
  return (
    roomBridge.isRoom() &&
    roomBridge.isMyTurn() &&
    !state.challengeSpectator &&
    (state.challengePosePending ||
      state.challengeRevealPending ||
      challengeCombatBusy)
  );
}

function inventActionBusyReason() {
  if (isMpContributionLocked()) return mpContributionLockReason;
  if (writeCommitInFlight) return "Still saving invent… wait a moment.";
  if (isChallengeCombatBlocking()) {
    return challengeCombatBusy
      ? "AI is evaluating your defense — wait for the result."
      : "Challenger is still speaking — wait for the attack.";
  }
  if (state.aiBusy) {
    return "AI is still working — wait until it finishes.";
  }
  return "Wait — an invent action is still running.";
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
  if (locked) {
    for (const sel of MP_LOCK_CONTROL_IDS) {
      const el = $(sel);
      if (!el) continue;
      el.dataset.mpLockTitle = el.title || "";
      el.disabled = true;
      el.title = reason;
    }
    $$("#mp-seat-tabs [data-seat], #mp-seat-tabs .mp-seat-tab").forEach((btn) => {
      btn.disabled = true;
      btn.title = reason;
    });
  } else {
    // Do NOT force-enable action buttons — re-apply real multiplayer/busy gates
    for (const sel of MP_LOCK_CONTROL_IDS) {
      const el = $(sel);
      if (!el) continue;
      if (el.dataset.mpLockTitle != null) {
        el.title = el.dataset.mpLockTitle;
        delete el.dataset.mpLockTitle;
      }
    }
    $$("#mp-seat-tabs [data-seat], #mp-seat-tabs .mp-seat-tab").forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("title");
    });
  }
  // Freeze story fields + focus toggles while evaluating
  applyStoryFieldLocks();
  // Soft block tech cards (clicks still toast via onTechClick if any slip through)
  $$("#tech-list .tech-card, #selected-techs button, #selected-techs .tech-chip").forEach(
    (el) => {
      if (locked) {
        el.dataset.mpContribDisabled = el.disabled ? "1" : "0";
        el.disabled = true;
        el.setAttribute("aria-disabled", "true");
        el.title = reason;
      } else if (el.dataset.mpContribDisabled != null) {
        el.disabled = el.dataset.mpContribDisabled === "1";
        el.removeAttribute("aria-disabled");
        delete el.dataset.mpContribDisabled;
        if (!el.disabled) el.removeAttribute("title");
      }
    }
  );
  document.body.classList.toggle("mp-contrib-evaluating", locked);
  const bar = $("#mp-workshop-bar");
  if (bar) bar.classList.toggle("is-contrib-locked", locked);
  const hint = $("#story-mode-hint");
  if (hint && locked) {
    hint.dataset.mpContribHint = hint.innerHTML;
    hint.innerHTML = `<strong>Evaluating edit…</strong> ${escapeHtml(reason)}`;
    hint.hidden = false;
  } else if (hint && hint.dataset.mpContribHint != null) {
    hint.innerHTML = hint.dataset.mpContribHint;
    delete hint.dataset.mpContribHint;
  }
  // Contribution lock: also freeze co-inventor compose. Unlock: re-apply real gates
  // (do not leave Lobby / Wait / End turn / Face challenge enabled for spectators).
  if (locked) {
    state.coInventor?.setInteractive?.(false, reason);
  } else {
    syncInventActionButtons();
  }
}

/**
 * Multiplayer: not the active seat — browse-only spectator on Invent.
 * @returns {boolean}
 */
function isMpInventSpectator() {
  const b = mpBridge();
  if (!b) return false;
  return Boolean(b.isMyTurn && !b.isMyTurn());
}

/**
 * Sync Invent action row + co-inventor for multiplayer turn gates and busy locks.
 * Call after any path that might re-enable Lobby / Wait / End turn / Face challenge / Co-inventor.
 */
function syncInventActionButtons() {
  const b = mpBridge();
  const spectator = isMpInventSpectator();
  const inventBusy = isInventActionBusy();
  const challengeBusy = isChallengeCombatBlocking();
  const busy = inventBusy || challengeBusy;
  const spectatorReason =
    "Not your turn — you can browse and use Learn, but only the active player acts.";
  const busyReason = busy ? inventActionBusyReason() : "";

  // —— Lobby (Workshop economy only; Spark keeps it hidden) ——
  const lobbyBtn = $("#btn-lobby");
  if (lobbyBtn) {
    if (!budgetWillEnabled()) {
      lobbyBtn.hidden = true;
      lobbyBtn.setAttribute("hidden", "");
    } else {
      lobbyBtn.hidden = false;
      lobbyBtn.removeAttribute("hidden");
      const can =
        !spectator &&
        !busy &&
        (!apEnabled() || (state.ap ?? 0) >= 1) &&
        (state.budget ?? 0) >= 1;
      lobbyBtn.disabled = !can;
      if (spectator) lobbyBtn.title = spectatorReason;
      else if (busy) lobbyBtn.title = busyReason;
      else if ((state.budget ?? 0) < 1) lobbyBtn.title = "Need 1 Budget to lobby";
      else if (apEnabled() && (state.ap ?? 0) < 1)
        lobbyBtn.title = "Need 1 AP to lobby";
      else lobbyBtn.title = "Spend 1 AP + 1 Budget to gain Will";
    }
  }

  // —— Wait +2 years (always available in Spark; crisis clock, not wallets) ——
  const waitBtn = $("#btn-wait");
  if (waitBtn) {
    if (spectator) {
      waitBtn.disabled = true;
      waitBtn.title = spectatorReason;
    } else if (b) {
      const waitGate = canWaitOnCurrentInvent();
      waitBtn.disabled = !waitGate.ok || busy;
      waitBtn.title = busy
        ? busyReason
        : !waitGate.ok
          ? mpFriendlyError(waitGate.error)
          : "Wait +2 years on your invent — confirm to see details (feasibility year; ends seat-turn; others keep their year)";
    } else if (busy) {
      waitBtn.disabled = true;
      waitBtn.title = busyReason;
    } else {
      waitBtn.disabled = false;
      waitBtn.title = apEnabled()
        ? "Wait +2 years — confirm first; advances calendar and raises crisis. Unspent AP are burned."
        : "Wait +2 years — confirm first; advances calendar and raises crisis.";
    }
  }

  // —— End turn (shared invent + challenge chrome; hidden when AP off / Spark) ——
  updateEndTurnButton();
  syncEconomyChromeVisibility();

  // —— Face the challenge ——
  updateChallengeButton();

  // —— Co-inventor open button + side panel ——
  const openCo = $("#btn-open-coinventor");
  if (openCo) {
    openCo.disabled = spectator || busy;
    openCo.title = spectator
      ? spectatorReason
      : busy
        ? busyReason
        : "Open AI co-inventor";
  }
  // Side tab can still be opened to read history, but compose is locked
  if (state.coInventor) {
    state.coInventor.setInteractive?.(!spectator && !busy, spectator ? spectatorReason : busyReason);
  }
}

/**
 * Is this seat *your* invent (ownership), not "whose turn".
 * Room: your player id. Hotseat: the active seat while you hold the device.
 * @param {object} s
 * @param {object|null} b
 */
function mpSeatIsMine(s, b) {
  if (!s?.id || !b) return false;
  if (roomBridge.isRoom()) {
    const me = b.myId?.() || roomBridge.myId?.();
    return Boolean(me && s.id === me);
  }
  if (hotseatBridge.isHotseat()) {
    return s.id === b.getActiveId?.();
  }
  return false;
}

/**
 * Mode for the invent currently on screen (seat tab focus).
 * - editing: you can act on it now (your turn + rights, not pure spectator)
 * - viewing: look-only (not your turn, or locked help / Challenge watch)
 * - null: this seat is not the focused invent
 * @param {object} s — seat summary
 * @param {object|null} b — mp bridge
 * @returns {"editing"|"viewing"|null}
 */
function mpSeatFocusMode(s, b) {
  if (!s?.viewing) return null;
  if (!b?.isMyTurn?.()) return "viewing";
  if (state.challengeSpectator) return "viewing";

  // Looking at someone else's invent
  if (b.viewingOther?.()) {
    if (
      b.canContributeStory?.() ||
      b.canEditStack?.() ||
      b.canRunDeploy?.()
    ) {
      return "editing";
    }
    return "viewing";
  }

  // Your invent, your turn — actively working (even if a step is locked)
  if (s.abandoned) return "viewing";
  return "editing";
}

/**
 * Seat tabs: invent picker only.
 * - Color = ownership (green = yours, neutral = someone else's)
 * - Red = player left / disconnected
 * - Tag on focused tab = editing | viewing
 * Turn lives in the upper-left badge, not here.
 * @param {object[]} seats
 * @param {object|null} [bridge]
 */
function renderMpSeatTabsHtml(seats, bridge) {
  const b = bridge || mpBridge();
  return (seats || [])
    .map((s) => {
      const focus = mpSeatFocusMode(s, b);
      const mine = mpSeatIsMine(s, b);
      // Room presence: false when they disconnected / left
      const left = s.connected === false;
      const cls = [
        "mp-seat-tab",
        left ? "is-left" : mine ? "is-mine" : "is-other",
        s.viewing ? "is-focused" : "",
        focus === "editing" ? "is-editing" : "",
        focus === "viewing" ? "is-look-only" : "",
        s.abandoned ? "is-abandoned" : "",
        s.phase === "challenge" ? "is-challenge" : "",
        s.phase === "challenge_locked" ? "is-challenge-locked" : "",
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
          : s.phase === "challenge_locked"
            ? '<span class="tag">locked</span>'
            : s.phase === "deploy"
              ? '<span class="tag">deploy</span>'
              : s.phase === "scaled"
                ? '<span class="tag">scaled</span>'
                : "";
      // Only the invent on screen gets editing/viewing — not a turn badge
      const focusTag =
        focus === "editing"
          ? '<span class="tag tag-editing">editing</span>'
          : focus === "viewing"
            ? '<span class="tag tag-viewing">viewing</span>'
            : "";
      const leftTag = left ? '<span class="tag tag-left">left</span>' : "";
      const titleParts = left
        ? [`${s.displayName} left the room`, "— invent still on the table"]
        : [
            mine ? "Your invent" : `${s.displayName}'s invent`,
            focus === "editing"
              ? "— editing"
              : focus === "viewing"
                ? "— viewing only"
                : "— click to open",
          ];
      return `<button type="button" class="${cls}" data-seat="${escapeHtml(s.id)}" title="${escapeHtml(titleParts.join(" "))}">
          <span class="mp-seat-tab-name">${escapeHtml(label)}</span>
          ${leftTag}
          ${focusTag}
          ${phaseTag}
          <span class="muted sm">${s.stackCount} tech</span>
        </button>`;
    })
    .join("");
}

/**
 * Leave Quest/Deploy chrome and open the Invent workshop for the *current* view seat.
 * Seat tabs used to only hydrate vision while staying stuck on challenge-step.
 */
function openWorkshopForViewedInvent(bridge) {
  const b = bridge || mpBridge();
  state.challengeSpectator = false;
  state.challengePosePending = false;
  challengeCombatBusy = false;
  document.body.classList.remove("challenge-spectator", "challenge-pose-pending");
  setChallengePoseBusy(false, { judging: false });
  hideAllModePanels();
  lockChallengeCombatChrome({ reason: "On Invent — combat is on the Challenge screen only." });
  // Clear spectator / combat banners that would bleed onto invent
  state.challengeFeedback = "";
  const fb = $("#challenge-feedback");
  if (fb) {
    fb.hidden = true;
    fb.innerHTML = "";
    fb.className = "challenge-feedback";
  }

  state.screen = "workshop";
  $$(".screen").forEach((el) =>
    el.classList.toggle("active", el.id === "screen-workshop")
  );

  try {
    b?.hydrateSoloState?.(state, { global: state.global });
  } catch {
    /* ignore */
  }
  lastHydratedViewSeatId = b?.getViewId?.() || null;
  syncWriteSnapshotFromState();
  lastRoomVisionKey = "";
  roomVisionPendingKey = "";

  renderWorkshop();
  renderMpChrome();
  applyEndTurnChrome();
  updateChallengeButton();
  applyStoryFieldLocks();
  if (roomBridge.isRoom()) {
    scheduleRoomVisionRefresh({ immediate: true });
  } else {
    try {
      updateVision({ debounceMs: 200, immediate: true });
    } catch {
      /* ignore */
    }
  }
}

function bindMpSeatTabClicks(list, b) {
  if (!list) return;
  list.querySelectorAll("[data-seat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isMpContributionLocked()) {
        flashToast(mpContributionLockReason);
        return;
      }
      // In-flight invent AI (co-inventor / contribution eval) still blocks seat switch.
      // Mid own Challenge no longer blocks — players may free-look other invents
      // (spectator Challenge / Deploy) and return; combat state lives on the invent.
      const seatId = btn.dataset.seat;
      const me = b.myId?.() || null;
      // Flush own invent; abandon unvalidated contribution drafts on seat switch.
      // Suppress blur→commit so we don't double-fire AI while changing view.
      if (writeCommitTimer) {
        clearTimeout(writeCommitTimer);
        writeCommitTimer = null;
      }
      if (!b.viewingOther?.()) {
        softPersistInventDrafts();
        void commitWriteIfNeeded();
      }
      suppressInventBlurCommit = true;
      try {
        const active = document.activeElement;
        if (
          active &&
          (active.id === "invention-name" ||
            active.id === "invention-how" ||
            active.id === "invention-impact")
        ) {
          active.blur();
        }
      } finally {
        suppressInventBlurCommit = false;
      }
      mpSyncFromSolo();
      b.setViewSeat?.(seatId);
      const f = b.invent?.(seatId);
      // Fine invent lifecycle (challenge vs challenge_locked) — not coarse UI collapse
      const finePhase =
        b.inventPhaseOf?.(seatId) || deriveInventPhase(f) || "invent";
      const name =
        b.seatSummaries?.()?.find((s) => s.id === seatId)?.displayName || "Player";

      // —— Route by *viewed* invent fine phase (must change screens, not only vision) ——

      // Live Challenge fight on someone else: watch only
      if (finePhase === "challenge" && b.viewingOther?.()) {
        if (roomBridge.isRoom()) {
          // Leaving own fight is OK — invent keeps scrutinyPublic; rehydrate on return
          challengeCombatBusy = false;
          enterChallengeAsSpectator(f || {}, name);
          flashToast(`Watching ${name} on Challenge`);
          renderMpChrome();
          return;
        }
      }

      // Own mid-challenge (live scrutiny only — not fail-locked)
      if (finePhase === "challenge" && !b.viewingOther?.()) {
        try {
          b.hydrateSoloState?.(state, { global: state.global });
        } catch {
          /* ignore */
        }
        state.challengeSpectator = false;
        document.body.classList.remove("challenge-spectator");
        // Drop watch-only lock; only keep busy if a real combat action is in flight
        setChallengePoseBusy(Boolean(challengeCombatBusy), {
          judging: Boolean(challengeCombatBusy),
        });
        state.screen = "challenge-step";
        $$(".screen").forEach((el) =>
          el.classList.toggle("active", el.id === "screen-challenge-step")
        );
        renderChallengeStep();
        // Re-apply interactive combat chrome after any spectator locks
        applyEndTurnChrome();
        renderMpChrome();
        flashToast("Your Challenge");
        scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
        return;
      }

      // challenge_locked: workshop with frozen invent (Face again / Reopen) — not combat
      if (finePhase === "challenge_locked") {
        openWorkshopForViewedInvent(b);
        flashToast(
          b.viewingOther?.()
            ? `${name}'s invent is locked after Challenge — only they can Face again or Reopen.`
            : "Challenge failed — invent locked. Face the challenge again, or Reopen invent to rework."
        );
        return;
      }

      // Deploy-ready invent: active seat may Pilot/Scale (own or helper); others watch
      if (finePhase === "deploy_ready" || finePhase === "scale_ready") {
        try {
          b.hydrateSoloState?.(state, { global: state.global });
        } catch {
          /* ignore */
        }
        lastHydratedViewSeatId = b.getViewId?.() || null;
        syncWriteSnapshotFromState();
        lastRoomVisionKey = "";
        roomVisionPendingKey = "";

        const canField = Boolean(b.isMyTurn?.() && b.canRunDeploy?.());
        if (canField) {
          if (state.challengeSpectator) {
            state.challengeSpectator = false;
            document.body.classList.remove("challenge-spectator", "challenge-pose-pending");
            state.challengePosePending = false;
            setChallengePoseBusy(false);
          }
          enterDeployBayInteractive(f || null, {
            helper: Boolean(b.viewingOther?.()),
            ownerName: b.viewingOther?.() ? name : "your invent",
          });
          flashToast(
            b.viewingOther?.()
              ? `Invent locked after Challenge — you may Pilot/Scale ${name}'s idea (you pay).`
              : "Deploy bay — Pilot → Scale. Invent locked after Challenge."
          );
          scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
          return;
        }
        // Not your turn (or cannot field) → read-only follow of their deploy
        if (b.viewingOther?.()) {
          if (roomBridge.isRoom()) {
            enterDeployAsSpectator(f || {}, name, {});
            flashToast(`Watching ${name}'s deploy bay`);
            renderMpChrome();
            return;
          }
        }
        // Own deploy but not my turn: still show bay (read-only buttons)
        enterDeployBayInteractive(f || null, {
          helper: false,
          ownerName: "your invent",
        });
        flashToast("Your deploy bay (wait for your turn to Pilot/Scale)");
        return;
      }

      // Invent / scaled / locked → always open the Invent workshop for that seat
      // (was the bug: hydrate ran while stuck on Challenge/Deploy screen)
      openWorkshopForViewedInvent(b);
      if (!b.viewingOther?.()) {
        flashToast(phase === "scaled" ? "Your scaled invent" : "Your invention");
      } else if (phase === "invent") {
        flashToast(
          "Viewing their invent — additive story & tech (you pay). Everyday life is theirs."
        );
      } else {
        flashToast("This invent is locked (scaled or abandoned)");
      }
    });
  });
}

function isDeployScreen() {
  return state.screen === "deploy";
}

function isChallengeOrDeployScreen() {
  return state.screen === "challenge-step" || state.screen === "deploy";
}

function renderMpChrome() {
  const bar = $("#mp-workshop-bar");
  const chBar = $("#mp-challenge-bar");
  const depBar = $("#mp-deploy-bar");
  const b = mpBridge();
  const on = Boolean(b);
  if (bar) bar.hidden = !on || isChallengeOrDeployScreen();
  if (chBar) chBar.hidden = !on || state.screen !== "challenge-step";
  if (depBar) depBar.hidden = !on || state.screen !== "deploy";
  document.body.classList.toggle("mp-hotseat", on && hotseatBridge.isHotseat() && !roomBridge.isRoom());
  document.body.classList.toggle("mp-room", on && (roomBridge.isRoom() || state.mp?.mode === "room"));
  if (!on) {
    setMpActivePlayerBadges(false);
    setMpContributionLock(false);
    return;
  }
  applyEndTurnChrome();

  const active = b.activeSeat?.() || null;
  const seats = b.seatSummaries?.() || [];
  // Upper left: whose turn only (no editing/viewing clutter)
  setMpActivePlayerBadges(true, active?.displayName || "—");

  // Room code chip in workshop bar (online only)
  let codeChip = $("#mp-room-code-chip");
  if (roomBridge.isRoom() && bar) {
    if (!codeChip) {
      codeChip = document.createElement("div");
      codeChip.id = "mp-room-code-chip";
      codeChip.className = "room-code-chip sm";
      bar.querySelector(".mp-workshop-bar-row")?.prepend(codeChip);
    }
    const code = state.mp?.code || roomBridge.client?.()?.session?.code || "";
    codeChip.hidden = false;
    codeChip.innerHTML = `Room <strong>${escapeHtml(code)}</strong>`;
  } else if (codeChip) {
    codeChip.hidden = true;
  }

  const seatHtml = renderMpSeatTabsHtml(seats, b);
  const list = $("#mp-seat-tabs");
  if (list) {
    list.innerHTML = seatHtml;
    bindMpSeatTabClicks(list, b);
  }
  const listCh = $("#mp-seat-tabs-ch");
  if (listCh) {
    listCh.innerHTML = seatHtml;
    bindMpSeatTabClicks(listCh, b);
  }
  const listDep = $("#mp-seat-tabs-dep");
  if (listDep) {
    listDep.innerHTML = seatHtml;
    bindMpSeatTabClicks(listDep, b);
  }

  // No status blurb under seat tabs — editing/viewing tags + colors are enough
  for (const sel of ["#mp-view-hint", "#mp-challenge-view-hint", "#mp-deploy-view-hint"]) {
    const hint = $(sel);
    if (!hint) continue;
    hint.textContent = "";
    hint.hidden = true;
    hint.setAttribute("hidden", "");
  }

  // Story: invent phase only (Challenge start freezes prose for everyone)
  applyStoryFieldLocks();
  // Challenge / Deploy bay gates
  const chBtn = $("#btn-to-challenge");
  if (chBtn) {
    if (!b.canFaceChallenge?.() || isInventActionBusy()) {
      if (!state.deployUnlocked) {
        chBtn.disabled = true;
        chBtn.title = isInventActionBusy()
          ? inventActionBusyReason()
          : b.viewingOther?.()
            ? "Only the owner can face Challenge on this invent"
            : "Cannot challenge this invent right now";
      }
    }
  }
  const isHotseatMp = hotseatBridge.isHotseat() && !isOnlineRoomMp();
  const isRoomMp = isOnlineRoomMp();

  applyEndTurnChrome();
  // Enable/disable both invent + Challenge End turn (do not clobber spectator locks)
  updateEndTurnButton();
  if (isChallengeWatchOnly()) applyChallengeWatchOnlyLock();
  const abandon = $("#btn-abandon");
  if (abandon) {
    abandon.textContent = isRoomMp
      ? "Leave room"
      : isHotseatMp
        ? "Leave hotseat"
        : "Leave Quest";
  }

  applyMpContributionLockToDom();
}

function mpPassDevice() {
  // Online rooms never use Pass device — only hotseat
  if (!hotseatBridge.isHotseat()) {
    if (roomBridge.isRoom() || state.mp?.mode === "room") {
      flashToast("Use End turn — this is an online room, not hotseat.");
    }
    return;
  }
  if (isInventActionBusy()) {
    flashToast(inventActionBusyReason());
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
  showScreen("workshop");
  // Reset so maybeNotifyMpTurnStart always fires for the new seat
  state.mpLastActiveSeatId = null;
  state.mpTurnNoticePrimed = true; // avoid double first-join path
  const nextId = hotseatBridge.getActiveId();
  state.mpLastActiveSeatId = null; // force change detection

  // Round wrap → market + year bulletins first (must run before turn popup)
  const marketEv = (r.events || []).find((e) => e?.type === "market_news");
  if (marketEv?.marketNews) {
    queueMarketNewsModal(marketEv.marketNews, { force: true });
  }
  const yearEv = (r.events || []).find((e) => e?.type === "year_tick");
  if (yearEv?.bulletin) {
    noteYearAdvance(yearEv.bulletin);
  }

  mpHydrateAndRender({
    skipTurnNotice: Boolean(marketEv?.marketNews),
  });
  // Turn notice after market (or immediately if no market card)
  const nextName = r.seat?.displayName || hotseatBridge.activeSeat()?.displayName || "next";
  if (nextId) {
    state.mpLastActiveSeatId = nextId;
    showTurnStartNotice({ name: nextName, isYou: true, mode: "hotseat" });
  }
}

function enterHotseatPlay(names, mission, global) {
  leaveRoomPlay({ silent: true });
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
  state.mpLastActiveSeatId = null;
  state.mpTurnNoticePrimed = false;
  showScreen("workshop");
  mpHydrateAndRender();
  return true;
}

/**
 * Detect Quest end from snapshot + patch events.
 * Winning Scale by *any* player (owner or helper) ends the Quest for the whole table.
 * @param {import('./multiplayer/client.js').RoomClient} client
 * @param {object} [evt]
 * @returns {{ ended: boolean, kind?: "win"|"collapse"|"partial", forgeLeftByVote?: boolean, place?: object, events?: object[] }}
 */
function detectRoomQuestEnd(client, evt) {
  const place = client?.snapshot?.place || client?.snapshot?.mp?.place;
  const events = evt?.events || [];
  const raceCollapsed = place?.status === "collapsed";
  const raceAbandoned = place?.status === "abandoned_by_vote";
  // Only hard place status or explicit win events — never sticky phase alone
  // (phase:"outcome" leftovers caused false Quest-end and table desync).
  const raceWon =
    place?.status === "won" ||
    events.some(
      (e) =>
        e?.type === "quest_won" ||
        (e?.type === "scale_ok" && Boolean(e.solved || e.raceOver))
    );
  const forgeLeftByVote =
    raceAbandoned || events.some((e) => e?.type === "quest_abandoned_by_vote");
  if (!raceWon && !raceCollapsed && !forgeLeftByVote) {
    return { ended: false, place, events };
  }
  const kind = raceCollapsed
    ? "collapse"
    : forgeLeftByVote
      ? "partial"
      : "win";
  return { ended: true, kind, forgeLeftByVote, place, events };
}

/**
 * Open multiparty evaluation for the whole table.
 * Solver (who fielded the winning Scale) chooses next Quest — not invent owner alone.
 * @param {import('./multiplayer/client.js').RoomClient} client
 * @param {object} [evt]
 * @returns {boolean} true if outcome opened
 */
function openRoomQuestOutcomeIfEnded(client, evt) {
  const det = detectRoomQuestEnd(client, evt);
  if (!det.ended) return false;
  // Already on outcome for this Quest — don't re-enter / clobber UI
  if (
    state.screen === "outcome" &&
    state.outcome?.mpOutcome?.mode === "room" &&
    state.outcome?.kind === det.kind
  ) {
    return true;
  }
  const place = det.place;
  const events = det.events || [];
  const ranking = client.snapshot?.ranking || client.snapshot?.mp?.ranking;
  const winEv =
    events.find((e) => e?.type === "quest_won") ||
    events.find((e) => e?.type === "scale_ok" && (e.solved || e.raceOver));
  // Prefer server chooser → solver who Scaled (helper OK) → place.solverSeatId → rank #1
  const nextQuestChooserId =
    client.snapshot?.nextQuestChooserId ||
    winEv?.solverSeatId ||
    winEv?.seatId ||
    place?.solverSeatId ||
    (det.kind === "win" ? ranking?.rows?.[0]?.seatId : null) ||
    null;
  // Invent faces for share: prefer the invent that was Scaled (target), not only local seat
  const targetId = winEv?.targetSeatId || winEv?.seatId || null;
  const targetInv =
    (targetId &&
      (client.snapshot?.invents?.[targetId] ||
        client.snapshot?.mp?.invents?.[targetId])) ||
    null;
  const inventName =
    targetInv?.inventionName || state.inventionName || "";
  const inventionHow = String(
    targetInv?.inventionHow || state.inventionHow || ""
  ).trim();
  const inventionImpact = String(
    targetInv?.inventionImpact || state.inventionImpact || ""
  ).trim();
  const inventOwnerName =
    (client.snapshot?.players || []).find((p) => p.id === targetId)?.displayName ||
    "";
  try {
    roomBridge.hydrateSoloState(state, { global: state.global });
  } catch {
    /* ignore */
  }
  // Clear challenge/spectator chrome so outcome is not buried under deploy bay
  state.challengeSpectator = false;
  state.challengePosePending = false;
  state.challengeRevealPending = false;
  document.body.classList.remove(
    "challenge-spectator",
    "challenge-pose-pending",
    "challenge-combat-busy",
    "challenge-reveal-pending"
  );
  finishOutcome(det.kind, {
    multiparty: true,
    leftByVote: Boolean(det.forgeLeftByVote),
    drop: winEv?.drop,
    mpOutcome: {
      multiparty: true,
      mode: "room",
      kind: det.forgeLeftByVote ? "abandoned_by_vote" : det.kind,
      place: place?.mission?.place || place?.place,
      placeStatus:
        place?.status ||
        (det.kind === "win"
          ? "won"
          : det.kind === "collapse"
            ? "collapsed"
            : "abandoned_by_vote"),
      ranking,
      nextQuestChooserId,
      solverSeatId: winEv?.solverSeatId || winEv?.seatId || place?.solverSeatId || null,
      fieldedBySeatId: winEv?.seatId || null,
      inventSeatId: targetId,
      inventName,
      inventionHow,
      inventionImpact,
      inventOwnerName,
      seats: (client.snapshot?.players || []).map((p) => ({
        seatId: p.id,
        displayName: p.displayName,
      })),
    },
  });
  return true;
}

/**
 * Lightweight room patch handler — keep this cheap. Heavy work freezes Chrome.
 * @param {import('./multiplayer/client.js').RoomClient} client
 * @param {object} [evt]
 */
function handleRoomPlayEvent(client, evt) {
  const place = client.snapshot?.place || client.snapshot?.mp?.place;
  const eventsEarly = evt?.events || [];
  // Round market + year bulletins — fire as soon as the seat-wrap event lands
  const marketEv = eventsEarly.find((e) => e?.type === "market_news");
  if (marketEv?.marketNews) {
    queueMarketNewsModal(marketEv.marketNews, { force: true });
  }
  const yearEv = eventsEarly.find((e) => e?.type === "year_tick");
  if (yearEv?.bulletin) {
    noteYearAdvance(yearEv.bulletin);
  }
  // Winner started rematch → everyone leaves outcome together
  if (
    state.screen === "outcome" &&
    (client.snapshot?.phase === "playing" || place?.status === "playing") &&
    place?.status === "playing"
  ) {
    flashToast("Next Quest starting!");
    enterRoomPlay(client);
    return;
  }
  // Full hold / collapse / leave-vote → evaluation for the *whole table*
  // (helper Scale that solves counts — invent owner does not need to act)
  if (openRoomQuestOutcomeIfEnded(client, evt)) {
    return;
  }

  const selfChallengeBusy = isRoomSelfChallengeBusy();

  const events = evt?.events || [];

  // Owner finished Imagine → re-peek shared cache if we're viewing that invent
  const visionEv = events.find((e) => e?.type === "vision_sync");
  if (visionEv?.targetSeatId) {
    if (roomBridge.getViewId() === visionEv.targetSeatId) {
      state.mpVisionRev = visionEv.visionRev || state.mpVisionRev;
      lastRoomVisionKey = "";
      roomVisionPendingKey = "";
      if (state.vision) state.vision.lastFingerprint = "";
      scheduleRoomVisionRefresh({ immediate: true });
    }
  }

  const seatTurnChanged = events.some(
    (e) =>
      e?.type === "end_turn" ||
      e?.type === "seat_turn_start" ||
      e?.type === "wait" // Wait ends the seat-turn and advances the active player
  );

  // Preserve in-progress typing across server patches (buffer_write bounce, etc.)
  // Only reapply when still on the same viewed invent — never paste drafts across seats.
  // CRITICAL: during challenger-draw animation / pose AI, full hydrate wipes local
  // scrutiny + angle and desyncs the active player from the room.
  const viewBeforeHydrate = roomBridge.getViewId();
  const focusedDrafts = captureFocusedInventDrafts();
  if (!selfChallengeBusy) {
    roomBridge.hydrateSoloState(state, { global: state.global });
    if (roomBridge.getViewId() === viewBeforeHydrate) {
      reapplyFocusedInventDrafts(focusedDrafts);
    }
  } else {
    // Mid-Challenge: still sync AP/Will from server so enter_challenge spend is visible
    // and sidestep isn't blocked by a stale "AP 1" chip while state.ap is already 0.
    syncRoomResourcesFromSnapshot();
  }

  // Follow only on meaningful events (not every presence/hello)
  const meaningful = events.some((e) =>
    [
      "enter_challenge",
      "challenge_view_sync",
      "challenge_pass",
      "challenge_fail",
      "pilot_ok",
      "pilot_fail",
      "scale_ok",
      "scale_fail",
      "reopen_invent",
      "wait",
      "end_turn",
      "seat_turn_start",
    ].includes(e?.type)
  );
  if (meaningful || evt?.type === "snapshot" || evt?.type === "hello") {
    roomFollowChallengePresence(evt);
  }

  // Seat-turn start only: park on *your* invent (or Deploy if already locked after Challenge).
  // Never re-snap every patch — that yanked helpers off others' deploy bays mid-Pilot.
  if (seatTurnChanged && roomBridge.isMyTurn() && !selfChallengeBusy) {
    if (state.challengeSpectator) {
      leaveChallengeSpectatorIfNeeded({
        force: true,
        stayOnChallenge: true,
        keepView: false,
        clearFeedback: true,
        forceWorkshop: false,
      });
    }
    openRoomTurnStartScreenForOwnInvent();
  }

  applyStoryFieldLocks();
  applyEndTurnChrome();

  // Detect view-seat change → reset write baseline so we don't bleed prose across invents
  const viewNow = roomBridge.getViewId();
  if (viewNow && viewNow !== lastHydratedViewSeatId) {
    lastHydratedViewSeatId = viewNow;
    syncWriteSnapshotFromState();
    lastRoomVisionKey = "";
    roomVisionPendingKey = "";
  }

  // Cheap path: chrome + turn notice. Full workshop only when not mid-follow.
  if (state.challengeSpectator) {
    renderMpChrome();
    renderChallengeHud();
    applyChallengeWatchOnlyLock();
    maybeNotifyMpTurnStart();
    // Follower's vision of the invent they're watching
    scheduleRoomVisionRefresh({ immediate: false, context: "challenge" });
    return;
  }
  if (selfChallengeBusy) {
    renderChallengeHud();
    maybeNotifyMpTurnStart();
    return;
  }

  // Challenge combat screen: resource chips + crisis meters
  if (state.screen === "challenge-step") {
    renderMpChrome();
    syncPressureHudFromRoom();
    renderChallengeHud();
    applyEndTurnChrome();
    applyChallengeWatchOnlyLock();
    maybeNotifyMpTurnStart();
    return;
  }
  // Deploy screen: meters + bay only (no combat chrome)
  if (state.screen === "deploy") {
    renderMpChrome();
    syncPressureHudFromRoom();
    renderDeployHud();
    applyEndTurnChrome();
    if (state.deployUnlocked || state.challengePassed) renderDeployBay();
    applyDeployWatchOnlyLock();
    maybeNotifyMpTurnStart();
    return;
  }

  // Workshop: update fields without full tech-list rebuild every patch
  const b = roomBridge;
  // Note: hydrate already ran above with focused-draft restore.
  renderMpChrome();
  // Soft-update invent form values.
  // Never clobber a field the local player is actively typing into.
  try {
    const name = $("#invention-name");
    const how = $("#invention-how");
    const impact = $("#invention-impact");
    if (name && document.activeElement !== name) name.value = state.inventionName || "";
    if (how && document.activeElement !== how) how.value = state.inventionHow || "";
    if (impact && document.activeElement !== impact) impact.value = state.inventionImpact || "";
    // Keep story-face UI chrome in sync (locks / placeholders / focus styles)
    // renderStoryFaceUI itself also skips overwriting focused fields.
    renderStoryFaceUI();
    renderHud();
    renderSelectedChips();
    // Stack chips alone is not enough — left tech rail needs ✓ / selected state
    const stackChanged = events.some((e) =>
      ["tech_added", "tech_layered", "tech_removed", "deselect_tech"].includes(e?.type)
    );
    if (stackChanged || evt?.type === "snapshot" || seatTurnChanged) {
      syncLearnOrderWithSelection();
      renderTechList();
      updateLearnButton();
    }
    renderFeasibility();
    updateChallengeButton();
    applyEndTurnChrome();
  } catch (e) {
    console.warn("[room] light workshop paint", e);
  }
  // Vision only on invent-changing events (not every presence)
  if (
    events.some((e) =>
      [
        "tech_added",
        "tech_layered",
        "tech_removed",
        "write_commit",
        "buffer_write",
        "end_turn",
        "seat_turn_start",
        "challenge_pass",
        "pilot_ok",
        "scale_ok",
      ].includes(e?.type)
    ) ||
    evt?.type === "snapshot" ||
    seatTurnChanged
  ) {
    scheduleRoomVisionRefresh({ immediate: seatTurnChanged });
  }
  maybeNotifyMpTurnStart();
}

/** Guard: host was freezing because enterRoomPlay re-ran on every snapshot/presence. */
let roomPlayEnterKey = "";
let roomPlayEntering = false;
/** @type {ReturnType<typeof setTimeout>|null} */
let roomPatchTimer = null;
/** @type {object|null} */
let roomPatchPending = null;

function roomPlaySessionKey(client) {
  const s = client?.snapshot;
  const code = s?.code || client?.session?.code || "";
  const ver = s?.simVersion || s?.mp?.version || 0;
  const placeId = s?.place?.mission?.id || s?.mp?.place?.mission?.id || "";
  return `${code}|${ver}|${placeId}`;
}

/**
 * Online friends room → same workshop + Challenge screen as hotseat.
 * Safe to call many times: full setup once per race; later calls are no-ops / light hydrate.
 * @param {import('./multiplayer/client.js').RoomClient} client
 * @param {{ force?: boolean }} [opts] force=true for rematch restart only
 */
function enterRoomPlay(client, opts = {}) {
  if (!client?.snapshot) {
    flashToast("Room not ready");
    return false;
  }
  if (roomPlayEntering) return false;

  const key = roomPlaySessionKey(client);
  const sameRace =
    !opts.force &&
    roomBridge.isRoom() &&
    roomBridge.client?.() === client &&
    roomPlayEnterKey === key &&
    (state.screen === "workshop" ||
      state.screen === "challenge-step" ||
      state.screen === "deploy" ||
      state.screen === "outcome");

  // Already in this race — do not re-subscribe or full re-render (host freeze on Start race)
  if (sameRace) {
    try {
      roomBridge.hydrateSoloState(state, { global: state.global });
      applyEndTurnChrome();
      applyStoryFieldLocks();
      renderMpChrome();
    } catch (e) {
      console.warn("[room] soft re-enter", e);
    }
    return true;
  }

  roomPlayEntering = true;
  try {
    leaveHotseat();
    roomBridge.attach(client);
    roomPlayEnterKey = key;

    // Drop any prior Imagine payload — multi‑MB data: URLs freeze tabs
    try {
      if (state.vision) {
        state.vision.destroy();
        state.vision = null;
      }
      document.querySelectorAll(".vision-image").forEach((img) => {
        try {
          img.removeAttribute("src");
          img.hidden = true;
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }

    document.body.classList.add("mp-room");
    document.body.classList.remove("mp-hotseat");
    applyEndTurnChrome();

    // One subscription for the whole race
    if (roomUnsub) {
      roomUnsub();
      roomUnsub = null;
    }
    clearTimeout(roomPatchTimer);
    roomPatchTimer = null;
    roomPatchPending = null;

    const flushRoomPatch = () => {
      roomPatchTimer = null;
      const evt = roomPatchPending;
      roomPatchPending = null;
      if (!roomBridge.isRoom()) return;
      try {
        handleRoomPlayEvent(client, evt);
      } catch (e) {
        console.error("[room patch]", e);
      }
    };

    roomUnsub = client.on((evt) => {
      if (!roomBridge.isRoom()) return;
      if (evt.type === "reject") {
        const err = String(evt.error || "Action rejected").trim();
        // Stale combat sync after Challenge cleared / Deploy — never toast raw codes
        if (err === "not_in_challenge" || err === "cannot_enter_challenge") {
          try {
            roomBridge.hydrateSoloState(state, { global: state.global });
            syncPressureHudFromRoom();
          } catch {
            /* ignore */
          }
          if (state.screen === "challenge-step") {
            lockChallengeCombatChrome();
            renderChallengeHud();
            applyChallengeWatchOnlyLock();
          }
          if (state.screen === "deploy") {
            renderDeployHud();
            updateDeployFooterButtons();
            if (state.deployUnlocked || state.challengePassed) renderDeployBay();
          }
          return;
        }
        flashToast(mpFriendlyError(err));
        // Roll back optimistic stack (e.g. select_tech denied for no_budget/no_will/no_ap)
        try {
          roomBridge.hydrateSoloState(state, { global: state.global });
          if (state.screen === "workshop") {
            renderTechList();
            renderSelectedChips();
            renderHud();
            updateLearnButton();
            updateChallengeButton();
            renderFeasibility();
          }
        } catch {
          /* ignore */
        }
        return;
      }
      if (evt.type === "alone") {
        flashToast(
          evt.message ||
            "You're the only one still connected — you can keep playing alone or leave the room."
        );
        renderMpChrome();
        applyEndTurnChrome();
        return;
      }
      if (evt.type === "player_left") {
        if (evt.message) flashToast(evt.message);
        // Presence already updated on snapshot/players — refresh seat tab red "left"
        renderMpChrome();
        return;
      }
      // New race after outcome — force full re-enter once
      if (evt.type === "next_quest_started" || evt.type === "quest_started") {
        const nextKey = roomPlaySessionKey(client);
        if (nextKey !== roomPlayEnterKey) {
          flashToast("Race starting!");
          // Defer so we don't re-enter inside emit()
          setTimeout(() => enterRoomPlay(client, { force: true }), 0);
        }
        return;
      }
      if (
        evt.type === "hello" ||
        evt.type === "snapshot" ||
        evt.type === "patch" ||
        evt.type === "presence" ||
        evt.type === "ai_result" ||
        evt.type === "lobby" ||
        evt.type === "host_ok"
      ) {
        roomPatchPending = evt;
        if (!roomPatchTimer) {
          roomPatchTimer = setTimeout(flushRoomPatch, 80);
        }
      }
    });

    const gid =
      client.snapshot?.place?.globalId ||
      client.snapshot?.mp?.place?.globalId ||
      client.snapshot?.questMeta?.globalId;
    if (gid) state.global = globalById(gid) || state.global || { id: gid };

    state.domainFilter = "all";
    state.sideTab = "vision";
    state.outcome = null;
    state.runReport = null;
    state.scrutiny = null;
    state.challengeSpectator = false;
    state.coInventor?.reset?.(false);

    roomBridge.hydrateSoloState(state, { global: state.global });
    const me = roomBridge.myId();
    if (me) roomBridge.setViewSeat(me);
    roomBridge.hydrateSoloState(state, { global: state.global });

    state.mpLastActiveSeatId = null;
    state.mpTurnNoticePrimed = false;

    const activeId = roomBridge.getActiveId();
    const af = activeId ? roomBridge.invent(activeId) : null;
    if (activePlayerInChallenge(af) && me && activeId && activeId !== me) {
      roomFollowChallengePresence();
      applyStoryFieldLocks();
      return true;
    }

    // Workshop without showScreen vision hooks
    state.screen = "workshop";
    $$(".screen").forEach((el) =>
      el.classList.toggle("active", el.id === "screen-workshop")
    );
    // Defer heavy paint one frame so WS emit stack can unwind (host freeze fix)
    requestAnimationFrame(() => {
      try {
        renderWorkshop();
        ensureCoInventor();
        renderMpChrome();
        applyStoryFieldLocks();
        applyEndTurnChrome();
        maybeNotifyMpTurnStart();
        // First Imagine for this race (debounced; content-gated)
        lastRoomVisionKey = "";
        scheduleRoomVisionRefresh({ immediate: false });
      } catch (e) {
        console.error("[room] workshop paint", e);
      }
    });
    return true;
  } finally {
    roomPlayEntering = false;
  }
}

function leaveRoomPlay(opts = {}) {
  if (roomUnsub) {
    roomUnsub();
    roomUnsub = null;
  }
  clearTimeout(roomPatchTimer);
  roomPatchTimer = null;
  roomPatchPending = null;
  stopRoomFollowVisionPoll();
  roomPlayEnterKey = "";
  roomPlayEntering = false;
  roomBridge.clear();
  state.mpLastActiveSeatId = null;
  state.mpTurnNoticePrimed = false;
  document.body.classList.remove("mp-room");
  try {
    closeMpTurnModal();
  } catch {
    /* ignore */
  }
  if (!hotseatBridge.isHotseat()) {
    state.mp = null;
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
    ["#invention-name", "#invention-how", "#invention-impact"].forEach((sel) => {
      const el = $(sel);
      if (el) el.readOnly = false;
    });
  }
  if (!opts.silent) {
    /* caller shows screen */
  }
}

function leaveHotseat() {
  hotseatBridge.clear();
  state.mpLastActiveSeatId = null;
  state.mpTurnNoticePrimed = false;
  try {
    closeMpTurnModal();
  } catch {
    /* ignore */
  }
  if (!roomBridge.isRoom()) {
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

/**
 * Place collapsed / run over?
 * Solo: invent year ≥ fail year OR any meter ≥ 5.
 * Multiplayer: never treat *one invent's* year as place death — use shared place rules
 * (meters, or every invent calendar past fail year). Personal invent year only drives feasibility.
 */
function collapsed() {
  if (!state.mission) return false;
  const b = mpBridge();
  if (b || state.mp) {
    const sess = b?.getSession?.() || null;
    if (sess?.place) {
      if (sess.place.status === "collapsed") return true;
      if (sess.place.status === "won") return false;
      return isMpPlaceCollapsed(sess, { forgeYear: inventYear });
    }
    // Snapshot without full session: meters only (never invent year alone)
    return maxPressure(state.pressure || {}) >= 5;
  }
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
      if (roomBridge.isRoom()) scheduleRoomVisionRefresh({ immediate: true });
      else updateVision({ immediate: true });
    });
  }
  if (id === "challenge-step") {
    renderChallengeStep();
    ensureCoInventor();
    setChallengeSideTab(state.challengeSideTab || "vision");
    requestAnimationFrame(() => {
      ensureVision();
      const chRoot = $("#challenge-vision-root");
      if (state.vision && chRoot) state.vision.addMirror(chRoot);
      if (roomBridge.isRoom()) {
        scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
      } else {
        updateVision({ immediate: true, context: "challenge" });
      }
    });
  }
  if (id === "deploy") {
    renderDeployScreen();
    ensureCoInventor();
    setDeploySideTab(state.deploySideTab || "vision");
    requestAnimationFrame(() => {
      ensureVision();
      const depRoot = $("#deploy-vision-root");
      if (state.vision && depRoot) state.vision.addMirror(depRoot);
      if (roomBridge.isRoom()) {
        scheduleRoomVisionRefresh({ immediate: true, context: "deploy" });
      } else {
        updateVision({ immediate: true, context: "deploy" });
      }
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

/** Solo play mode from storage (title CTAs; not room/hotseat). */
function currentSoloPlayMode() {
  return resolvePlayMode({
    storedMode: readPlayMode(),
    hasCompletedSpark: readHasCompletedSpark(),
  });
}

/**
 * Spark: primary Play → Portside; secondary Choose a theme.
 * Workshop: primary Choose a theme → (Surprise / Daily unchanged).
 */
function renderTitleCtas() {
  const mode = currentSoloPlayMode();
  const start = $("#btn-start");
  const choose = $("#btn-choose-theme");
  if (!start) return;
  if (mode === "spark") {
    start.textContent = "Play →";
    start.setAttribute("title", "Start Portside Ward floods");
    if (choose) {
      choose.hidden = false;
      choose.textContent = "Choose a theme";
    }
  } else {
    start.textContent = "Choose a theme →";
    start.removeAttribute("title");
    if (choose) choose.hidden = true;
  }
}

function renderTitleMeta() {
  renderTitleCtas();
  renderDailyCard();
  renderPinsPanel();
}

/** One-click Spark starter: Portside Ward floods (climate). */
function startSparkPortsideMission() {
  clearMissionPickSession();
  leaveHotseat();
  const raw = MISSIONS.find((m) => m.id === "portside-floods") || MISSIONS[0];
  const globalId = raw.globalId || "climate";
  const mission = normalizeMission({ ...raw, source: "curated" }, globalId);
  state.global = globalById(globalId) || state.global;
  startMission(mission);
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
      scene: `Pinned Quest for ${g.title}.`,
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
          : `${cached} cached Challenges →`
        : "Generate Quests →";
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
 * Theme brief on the mission screen — readable while Challenges draft (static data).
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
      ? "Read this while Quests draft — then pick one to invent for."
      : "Context for this theme. Pick a Quest below to invent.";
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
      <span class="skel skel-cta">Challenge ${i + 1}</span>
    </div>`;
  }).join("");
}

function paintMissionCards(list, { disabled = false } = {}) {
  const grid = $("#mission-grid");
  if (!grid) return;
  grid.classList.toggle("mission-grid-loading", disabled);
  if (!list.length) {
    grid.innerHTML = `<p class="empty-hint">No Challenges yet — try Generate new Challenges.</p>`;
    return;
  }
  grid.innerHTML = list
    .map((m) => {
      const tag = m.source === "curated" ? "curated" : "generated";
      const tagLabel = m.source === "curated" ? "Curated" : "Challenge";
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
        messages: [{ role: "user", content: "[Generate Quests]" }],
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
            "Challenges must match the theme's true scale. Asteroid = civilization-class NEO / planetary defense, not a village siren. Nuclear = strategic misjudgment risk. Keep each Challenge concrete and inventable with emerging tech.",
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
    title: String(raw.title || "Local Challenge").slice(0, 100),
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
  $("#mission-global-title").textContent = g ? g.title : "Local Challenges";
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
        ? `${list.length} cached Challenges (${solvedN} solved — still playable). Generate new to replace the set.`
        : `${list.length} cached Challenges. Pick one, or generate a new set.`
    );
    if (regenBtn) {
      regenBtn.disabled = false;
      regenBtn.textContent = "Generate new Quests";
    }
    return;
  }

  // Skeletons only while generating — avoid flashing placeholder plot lines
  // (e.g. "A deadline arrives in East Works") that get replaced by the AI set.
  state.missionChoices = [];
  state.scenariosLoading = true;
  paintMissionSkeletons(SCENARIO_COUNT);
  setMissionStatus(
    force ? "Generating a fresh set of Quests…" : "Drafting Quests…",
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
      ? `${list.length} Challenges (${curated} curated · ${gen} generated). Pick one to invent for.`
      : `${list.length} Quests. Pick one to invent for.`;
    if (solvedN) msg += ` ${solvedN} already solved — you can play them again.`;
    if (force) msg = `New set ready (${list.length}). ` + msg;
    setMissionStatus(msg);
  } finally {
    if (state.global?.id === g.id) {
      state.scenariosLoading = false;
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.textContent = "Generate new Quests";
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
 * Begin the exact solo crisis → Quest pick flow for multiplayer.
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
    flashToast("Challenges still drafting — wait a moment.");
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
  state.marketNews = null;
  state.marketNewsShownId = null;
  state.lastYearBulletin = null;
  lastYearPulseKey = null;
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
  state.challengeClearMode = null;
  state.scrutinyMoveMode = null;
  // Solo Spark/Workshop snapshot for debugging (features() re-reads storage live)
  state.playMode = resolvePlayMode({
    storedMode: readPlayMode(),
    hasCompletedSpark: readHasCompletedSpark(),
  });
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
  renderMarketBanner();
  renderMpChrome();

  // Compact crisis HUD: full copy lives on title + Help (?)
  const crisisWrap = $("#hud-crisis-wrap");
  if (crisisWrap) {
    crisisWrap.title =
      `Crisis meters 0–5: how bad things are. Wait raises them; Deploy after a challenge lowers them. ` +
      (mpBridge() || state.mp
        ? `Hit 5 on any shared meter and the place falls. Invent calendars are personal — fail year ${m.collapseYear} only ends the table when every invent has waited that far. Open ? for more.`
        : `Hit 5 on any meter or year ${m.collapseYear} and the mission ends. Open ? for more.`);
  }

  const wr = $("#wait-report");
  if (wr) {
    if (state.waitReport) {
      wr.hidden = false;
      wr.innerHTML = state.waitReport;
    } else wr.hidden = true;
  }

  const nameEl = $("#invention-name");
  // Never wipe the name field while the player is mid-keystroke
  if (nameEl && document.activeElement !== nameEl) {
    nameEl.value = state.inventionName;
  }
  $("#prompt-tip").textContent = tips()[state.turn % tips().length];

  renderHud();
  renderFilters();
  renderTechList();
  renderSelectedChips();
  renderSynergy();
  renderTiming();
  renderStoryFaceUI();
  // syncHiddenStoryFields also skips overwriting focused textareas
  syncHiddenStoryFields();
  renderFeasibility();
  updateLearnButton();
  updateChallengeButton();
  renderWorkshopDeployBay();
  ensureCoInventor();
  // Co-inventor may remount — re-apply spectator / busy locks
  syncInventActionButtons();
}

/**
 * Workshop no longer hosts a second door into Deploy.
 * Phase routing (seat tabs / turn start / Face Challenge) opens Challenge or Deploy.
 * Keep the DOM node hidden always.
 */
function renderWorkshopDeployBay() {
  const el = $("#deploy-bay-workshop");
  if (el) el.hidden = true;
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
  if (singleStoryFaceEnabled()) {
    mirrorSparkStoryImpact();
  } else if (impEl) {
    state.inventionImpact = impEl.value;
  }
}

function syncStoryFieldsToDom(opts = {}) {
  const force = Boolean(opts.force);
  const howEl = $("#invention-how");
  const impEl = $("#invention-impact");
  if (singleStoryFaceEnabled()) mirrorSparkStoryImpact();
  // Default: never yank text out from under a focused caret.
  // Pass { force: true } after a rejected contribution / explicit reset.
  if (
    howEl &&
    howEl.value !== state.inventionHow &&
    (force || document.activeElement !== howEl)
  ) {
    howEl.value = state.inventionHow;
  }
  if (
    impEl &&
    !singleStoryFaceEnabled() &&
    impEl.value !== state.inventionImpact &&
    (force || document.activeElement !== impEl)
  ) {
    impEl.value = state.inventionImpact;
  }
}

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
 * How it works + Everyday life — both always editable (Workshop).
 * Spark (singleStoryFace): one box "What does it do here?" on #invention-how; impact mirrored.
 * Focus toggle (exclusive) marks which face owns the single "Fill other side" button;
 * AI drafts the opposite face from that focus.
 */
function renderStoryFaceUI() {
  const sparkSingle = singleStoryFaceEnabled();
  const face = sparkSingle ? "how" : state.storyFace === "life" ? "life" : "how";
  state.storyFace = face;
  if (sparkSingle) mirrorSparkStoryImpact();

  $$(".story-mode-btn").forEach((btn) => {
    const on = btn.dataset.face === face;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });

  const storyMode = $(".story-mode");
  const fieldHow = $("#field-how");
  const fieldLife = $("#field-life");
  const labelHow = $("#label-how");
  const labelLife = $("#label-life");
  const howArea = $("#invention-how");
  const lifeArea = $("#invention-impact");
  const noteHow = $("#note-how");
  const noteLife = $("#note-life");
  const hint = $("#story-mode-hint");
  const fillBtn = $("#btn-fill-other");

  // Spark: hide dual-face chrome; Workshop: restore
  if (storyMode) {
    storyMode.hidden = sparkSingle;
    if (sparkSingle) storyMode.setAttribute("hidden", "");
    else storyMode.removeAttribute("hidden");
  }
  if (hint) {
    hint.hidden = sparkSingle;
    if (sparkSingle) hint.setAttribute("hidden", "");
    else hint.removeAttribute("hidden");
  }
  if (fieldLife) {
    fieldLife.hidden = sparkSingle;
    if (sparkSingle) fieldLife.setAttribute("hidden", "");
    else fieldLife.removeAttribute("hidden");
  }
  if (fillBtn && sparkSingle) {
    fillBtn.hidden = true;
    fillBtn.setAttribute("hidden", "");
  }

  const b = mpBridge();
  const storyLocked = Boolean(b) && isViewedInventStoryLocked();
  if (howArea) {
    // Don't clobber text while the player is typing (multiplayer patches re-render often)
    if (document.activeElement !== howArea) {
      howArea.value = state.inventionHow;
    }
    howArea.readOnly = storyLocked;
    howArea.classList.toggle("is-locked", storyLocked);
    howArea.placeholder = storyLocked
      ? b?.viewedPhase?.() === "challenge" || b?.invent?.(b.getViewId?.())?.turnPhase === "scrutiny"
        ? "Locked — Challenge started; invent is frozen."
        : "Locked — can't edit this invent right now."
      : sparkSingle
        ? "What does this invention do for people in this place?"
        : b?.viewingOther?.()
          ? "Add to their how-it-works (additive only — don't gut their idea)…"
          : "What acts, what decides, how the pieces connect for *this* place…";
  }
  if (lifeArea && !sparkSingle) {
    if (document.activeElement !== lifeArea) {
      lifeArea.value = state.inventionImpact;
    }
    lifeArea.readOnly = storyLocked;
    lifeArea.classList.toggle("is-locked", storyLocked);
    lifeArea.placeholder = storyLocked
      ? b?.viewedPhase?.() === "challenge" || b?.invent?.(b.getViewId?.())?.turnPhase === "scrutiny"
        ? "Locked — Challenge started; invent is frozen."
        : "Locked — can't edit this invent right now."
      : b?.viewingOther?.()
        ? "Add to their everyday life (additive only)…"
        : "A Tuesday here after your invention lands…";
  }
  applyStoryFieldLocks();
  if (labelHow) {
    labelHow.textContent = sparkSingle ? "What does it do here?" : "How does it work?";
  }
  if (labelLife) labelLife.textContent = "Everyday life if it works";

  const setRole = (field, role) => {
    if (!field) return;
    const pending = field.classList.contains("is-ai-pending");
    field.classList.remove("is-focus", "is-other", "is-player", "is-companion", "is-both");
    field.classList.add(`is-${role}`);
    if (pending) field.classList.add("is-ai-pending");
  };

  if (sparkSingle) {
    setRole(fieldHow, "focus");
    if (noteHow) {
      noteHow.hidden = true;
      noteHow.setAttribute("hidden", "");
    }
    if (noteLife) {
      noteLife.hidden = true;
      noteLife.setAttribute("hidden", "");
    }
    return;
  }

  // Workshop / multiparty: single button lives on the focused header only
  placeFillOtherButton(face);

  if (face === "how") {
    setRole(fieldHow, "focus");
    setRole(fieldLife, "other");
    if (noteHow) {
      noteHow.hidden = false;
      noteHow.removeAttribute("hidden");
      noteHow.textContent = "Focus: write the mechanism. Fill other side drafts everyday life.";
    }
    if (noteLife) {
      noteLife.hidden = !state.inventionImpact.trim();
      if (noteLife.hidden) noteLife.setAttribute("hidden", "");
      else noteLife.removeAttribute("hidden");
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
      noteLife.removeAttribute("hidden");
      noteLife.textContent = "Focus: write everyday life. Fill other side drafts how it works.";
    }
    if (noteHow) {
      noteHow.hidden = !state.inventionHow.trim();
      if (noteHow.hidden) noteHow.setAttribute("hidden", "");
      else noteHow.removeAttribute("hidden");
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
      const fCtx = foresightCapabilityContext(year, techs, {
        globalId: state.global?.id || state.mission?.globalId,
        seed: state.mission?.id,
      });
      const adj = applyForesightToClaimStretch(stretch, how, fCtx);
      timingLevel = adj.level;
      timingNote = adj.reason;
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

function showHudChip(el, on) {
  if (!el) return;
  if (on) {
    el.hidden = false;
    el.removeAttribute("hidden");
  } else {
    el.hidden = true;
    el.setAttribute("hidden", "");
  }
}

/**
 * Hide/show AP · Budget · Will strips and Lobby / End turn from live feature flags.
 * Spark (actionPoints/budgetWill off) keeps crisis+year focus; Workshop + MP keep full chrome.
 */
function syncEconomyChromeVisibility() {
  const apOn = apEnabled();
  const bwOn = budgetWillEnabled();
  const showStrip = apOn || bwOn;

  // Empty resource strips vanish so the clock stays year/turn only
  const strips = new Set();
  const hudRes = $("#hud-resources");
  if (hudRes) strips.add(hudRes);
  for (const sel of ["#hud-ap", "#ch-hud-ap", "#dep-hud-ap"]) {
    const chip = $(sel);
    if (chip?.parentElement?.classList?.contains("hud-resources")) {
      strips.add(chip.parentElement);
    }
  }
  for (const strip of strips) {
    strip.hidden = !showStrip;
    if (!showStrip) strip.setAttribute("hidden", "");
    else strip.removeAttribute("hidden");
  }

  if (!apOn) {
    for (const sel of ["#btn-end-turn", "#btn-challenge-end-turn", "#btn-deploy-end-turn"]) {
      const btn = $(sel);
      if (!btn) continue;
      btn.hidden = true;
      btn.setAttribute("hidden", "");
    }
  }
  if (!bwOn) {
    const lobby = $("#btn-lobby");
    if (lobby) {
      lobby.hidden = true;
      lobby.setAttribute("hidden", "");
    }
  }
}

function paintResourceChips(prefix) {
  // prefix: "" | "ch-" | "dep-"
  const apEl = $(`#${prefix}hud-ap`);
  const budgetEl = $(`#${prefix}hud-budget`);
  const willEl = $(`#${prefix}hud-will`);
  if (apEnabled()) {
    showHudChip(apEl, true);
    if (apEl) {
      apEl.textContent = `AP ${state.ap ?? 0}/${state.apMax ?? GAME.apMax ?? 3}`;
    }
  } else {
    showHudChip(apEl, false);
  }
  if (budgetWillEnabled()) {
    showHudChip(budgetEl, true);
    showHudChip(willEl, true);
    if (budgetEl) budgetEl.textContent = `Budget ${state.budget ?? 0}$`;
    if (willEl) willEl.textContent = `Will ${state.will ?? 0}`;
  } else {
    showHudChip(budgetEl, false);
    showHudChip(willEl, false);
  }
}

function renderHud() {
  const yearEl = $("#hud-year");
  if (yearEl) {
    yearEl.textContent = String(state.year);
    yearEl.title = "Click for year foresight (capabilities & predictions)";
  }
  const waitsBit = state.waits ? ` · waits ${state.waits}` : "";
  const mp = Boolean(mpBridge() || state.mp);
  // Year is already the big number beside this — don't repeat it (keeps HUD one line)
  $("#hud-turn").textContent = mp
    ? `Invent${waitsBit} · R${state.turn || 1} · fail ${state.mission.collapseYear}`
    : `Turn ${state.turn}${waitsBit} · fail at ${state.mission.collapseYear}`;
  paintResourceChips("");
  const apEl = $("#hud-ap");
  if (apEl && apEnabled()) {
    apEl.title = "Action points this invent turn. Wait burns leftover AP; End Turn refills.";
  }
  const budgetEl = $("#hud-budget");
  if (budgetEl && budgetWillEnabled()) {
    budgetEl.title =
      "Capital for techs, Lobby, Pilot, and Scale. Solo: Budget 0$ is game over. Not refilled by End turn.";
  }
  const willEl = $("#hud-will");
  if (willEl && budgetWillEnabled()) {
    willEl.title =
      "Political will (not a crisis meter). ≥4 boosts deploy drop; 0 hurts it. Lobby raises will.";
  }
  syncEconomyChromeVisibility();
  paintHudPressureMeters($("#hud-pressure"));
  paintHudPressureMeters($("#ch-hud-pressure"));
  paintHudPressureMeters($("#dep-hud-pressure"));
  updateMissionStepPills();
  updateWaitPreview();
  // Lobby / Wait / End turn / Face challenge / Co-inventor (mp spectator + busy gates)
  syncInventActionButtons();
}

/** Highlight Invent · Challenge · Deploy pills on workshop + challenge top bars */
function updateMissionStepPills() {
  const b = mpBridge();
  const viewId = b?.getViewId?.();
  const f = (viewId && b?.invent?.(viewId)) || null;
  const fine =
    (viewId && b?.inventPhaseOf?.(viewId)) ||
    deriveInventPhase(
      f || {
        turnPhase: state.turnPhase,
        challengePassed: state.challengePassed,
        challengeLocked: state.challengeLocked,
        deployStage: state.deployStage,
        abandoned: false,
      }
    );

  let current = "invent";
  if (
    state.screen === "outcome" ||
    state.screen === "deploy" ||
    fine === "fielded" ||
    fine === "deploy_ready" ||
    fine === "scale_ready" ||
    state.deployUnlocked ||
    (state.deployStage && state.deployStage !== "none")
  ) {
    current = "deploy";
  } else if (
    fine === "challenge" ||
    fine === "challenge_locked" ||
    state.screen === "challenge-step" ||
    state.turnPhase === "scrutiny"
  ) {
    // Mid-challenge stays "challenge" even if the player is parked on workshop
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
  let list = techsForTray();
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
      const afford = sel ? { ok: true } : canAffordTech(t);
      const unaffordable = !sel && !afford.ok;
      const color = DOMAINS[t.domain]?.color || "#94a3b8";
      const nowCap = t.useCasesNow?.[0] || t.maturity?.now || t.summary;
      const cost = budgetWillEnabled() ? techCost(t) : null;
      const baseCost = budgetWillEnabled() ? techCostRaw(t) : null;
      const marketHit =
        budgetWillEnabled() && marketAffectsTech(currentMarketNews(), t);
      const costTitle = cost
        ? ` | To add: ${cost.budget} Budget${cost.will ? `, ${cost.will} Will` : ""}${
            apEnabled() ? ", 1 AP" : ""
          }${cost.frontierRisk ? ` · frontier risk ${cost.frontierRisk}` : ""}${
            marketHit ? " · market news active" : ""
          }${unaffordable ? " · cannot afford" : ""}`
        : apEnabled()
          ? " | To add: 1 AP"
          : "";
      // Visible cost chips — not only in tooltip
      let costHtml = "";
      if (cost && !sel) {
        const bDelta =
          marketHit && baseCost ? cost.budget - baseCost.budget : 0;
        const wDelta = marketHit && baseCost ? cost.will - baseCost.will : 0;
        const bits = [
          `<span class="tech-cost-chip tech-cost-budget${
            bDelta > 0 ? " tech-cost-up" : bDelta < 0 ? " tech-cost-down" : ""
          }" title="Budget to add this to your stack">${cost.budget}$${
            bDelta ? ` (${bDelta > 0 ? "+" : ""}${bDelta})` : ""
          }</span>`,
        ];
        if (cost.will > 0 || wDelta) {
          bits.push(
            `<span class="tech-cost-chip tech-cost-will${
              wDelta > 0 ? " tech-cost-up" : wDelta < 0 ? " tech-cost-down" : ""
            }" title="Political will needed to adopt this">Will ${cost.will}${
              wDelta ? ` (${wDelta > 0 ? "+" : ""}${wDelta})` : ""
            }</span>`
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
      // Only techs already on the stack get green + ✓. Unaffordable never looks selected.
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${
          sug ? "recommended" : ""
        } ${unaffordable ? "unaffordable" : ""}"
          data-id="${t.id}" style="--domain:${color}" title="${escapeHtml(nowCap)}${escapeHtml(costTitle)}">
          <span class="tech-icon">${t.icon}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${DOMAINS[t.domain]?.label || t.domain}${
              sug ? " · suggested" : ""
            }${unaffordable ? " · can't afford" : ""}</span>
            ${costHtml}
          </span>
          <span class="tech-add">${sel ? "✓" : unaffordable ? "!" : "+"}</span>
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
  if (blockIfMpTurnGate("changing the stack")) return;
  if (isMpContributionLocked() || writeCommitInFlight) {
    flashToast(mpContributionLockReason);
    return;
  }
  // Online room: server-authoritative stack
  if (roomBridge.isRoom()) {
    if (!roomBridge.isMyTurn()) {
      flashToast("Not your turn.");
      return;
    }
    if (!roomBridge.canEditStack()) {
      flashToast("Can't change this stack right now (invent locked or not your turn).");
      return;
    }
    const onStack = state.selectedTechIds.includes(id);
    const targetSeatId = roomBridge.getViewId();
    const me = roomBridge.myId();
    try {
      if (onStack) {
        roomBridge.send({
          type: "deselect_tech",
          payload: { techId: id, targetSeatId },
        });
        // Optimistic UI until patch lands
        state.selectedTechIds = state.selectedTechIds.filter((x) => x !== id);
        removeFromLearnOrder(id);
      } else {
        // Never show green/✓ unless we can actually pay (server will re-check)
        const afford = canAffordTech(techById(id));
        if (!afford.ok) {
          flashUnaffordableTech(id, afford.error);
          return;
        }
        // Online rooms keep table cap (not Spark solo profile)
        if (state.selectedTechIds.length >= 8) {
          flashToast("Stack full (8). Remove one first.");
          return;
        }
        if (targetSeatId === me) {
          roomBridge.send({
            type: "select_tech",
            payload: { techId: id, tech: techById(id) },
          });
        } else {
          roomBridge.send({
            type: "layer_tech",
            payload: { techId: id, targetSeatId, tech: techById(id) },
          });
        }
        // Optimistic only after local afford check — reject handler rehydrates if server denies
        if (!state.selectedTechIds.includes(id)) {
          state.selectedTechIds = [...state.selectedTechIds, id];
        }
        pushLearnOrder(id);
      }
      renderTechList();
      renderSelectedChips();
      updateLearnButton();
      renderFeasibility();
      updateChallengeButton();
    } catch (e) {
      flashToast(e.message || "Not connected");
    }
    return;
  }

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
      if (r.error === "no_ap" || r.error === "no_budget" || r.error === "no_will") {
        flashUnaffordableTech(id, r.error);
      } else if (r.error === "stack_full" || r.error === "stack full") flashToast("Stack full.");
      else if (r.error === "already_on_stack") flashToast("Already on that stack.");
      else if (r.error === "not_your_layer") flashToast("You can only remove techs you layered.");
      else if (r.error === "challenge_locked")
        flashToast("Can't change the stack during Challenge — help at Pilot/Scale instead.");
      else if (r.error === "stack_locked" || r.error === "already_scaled")
        flashToast("This invent's stack is locked.");
      else flashToast(r.error || "Cannot change stack.");
      // Do not mark selected — hydrate stays on last good session
      renderTechList();
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
    const cap = stackCapLimit();
    if (state.selectedTechIds.length >= cap) {
      flashToast(`Stack full (${cap}). Remove one first.`);
      return;
    }
    // Local pre-check so we never paint ✓ then roll back on failed spend
    const afford = canAffordTech(techById(id));
    if (!afford.ok) {
      flashUnaffordableTech(id, afford.error);
      return;
    }
    const r = dispatchSim("select_tech", { techId: id, tech: techById(id) });
    if (!r.ok) {
      if (r.error === "no_ap" || r.error === "no_budget" || r.error === "no_will") {
        flashUnaffordableTech(id, r.error);
      } else if (r.error === "stack full") {
        flashToast(`Stack full (${stackCapLimit()}). Remove one first.`);
      }
      // dispatchSim does not apply slice on failure — selectedTechIds unchanged
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
  const mp = Boolean(mpBridge() || state.mp);
  const waitNote = mp
    ? `Wait → invent year ${nextYear} for <em>this</em> invent only (other players keep their year; shared meters unchanged).`
    : `Wait → ${nextYear} raises crisis.`;
  if (!techs.length) {
    box.innerHTML = `Year <strong>${state.year}</strong>${mp ? " (this invent)" : ""}. Pick any emTech category. Feasibility judges whether your <em>how it works</em> over-claims this year. <strong>Wait</strong> ${
      mp
        ? "advances <em>your invent</em> calendar if you want later conditions for your claims — not the shared place clock."
        : "advances the world (and crisis) if you want later conditions."
    }`;
    return;
  }
  const stretch = detectClaimStretch(
    state.inventionHow.trim() || state.inventionImpact.trim(),
    techs,
    state.year
  );
  box.innerHTML = `Year <strong>${state.year}</strong>${mp ? " (this invent)" : ""} · timing signal: <strong>${stretch.level}</strong> — ${escapeHtml(
    stretch.reason
  )} Use <strong>Art of the possible</strong> on the co-inventor for milestones & capabilities. ${waitNote}`;
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
  const b = mpBridge();
  const spectator = isMpInventSpectator();
  const spectatorReason =
    "Not your turn — you can browse and use Learn, but only the active player acts.";

  // Multiplayer spectator (not your turn): never Face challenge
  if (spectator) {
    btn.disabled = true;
    btn.title = spectatorReason;
    btn.textContent = "Face the challenge →";
    const hint = $("#challenge-ready-hint");
    if (hint) {
      hint.textContent = spectatorReason;
      hint.className = "challenge-ready-hint blocked";
    }
    return;
  }

  // Deploy-ready / scale-ready: do not park on Invent with a "back to bay" dual path.
  // Recovery only — jump straight into Deploy (no permanent Open deploy banner).
  if (deployStagesEnabled() && state.deployUnlocked && state.challengePassed) {
    const inventBusy = isInventActionBusy();
    const canDeploy =
      !inventBusy &&
      (!b || Boolean(b.canRunDeploy?.() || b.canOpenDeployBay?.()));
    const fielded =
      state.deployStage === "new_normal" || state.deployStage === "scale";
    if (fielded) {
      // Invent already scaled — no Face / no deploy re-entry from workshop
      btn.disabled = true;
      btn.textContent = "Face the challenge →";
      btn.title = "This invent already Scaled — Quest continues or is held.";
      const hint = $("#challenge-ready-hint");
      if (hint) {
        hint.textContent = "This invent is fielded (Scaled).";
        hint.className = "challenge-ready-hint blocked";
      }
      return;
    }
    btn.disabled = !canDeploy;
    btn.textContent = "Continue to Deploy →";
    btn.title = inventBusy
      ? inventActionBusyReason()
      : canDeploy
        ? "Open Pilot / Scale for this invent"
        : "Not your turn, or this invent is not ready to deploy";
    const hint = $("#challenge-ready-hint");
    if (hint) {
      if (inventBusy) {
        hint.textContent = inventActionBusyReason();
        hint.className = "challenge-ready-hint blocked";
      } else if (canDeploy) {
        hint.textContent = "Challenge cleared — continue to Deploy (Pilot → Scale).";
        hint.className = "challenge-ready-hint ready";
      } else {
        hint.textContent = "Only the active player can Pilot/Scale this invent.";
        hint.className = "challenge-ready-hint blocked";
      }
    }
    return;
  }
  btn.textContent = "Face the challenge →";
  // Don't re-enable while Fill other side / co-inventor is still drafting
  if (isInventActionBusy()) {
    btn.disabled = true;
    btn.title = inventActionBusyReason();
    const hint = $("#challenge-ready-hint");
    if (hint) {
      hint.textContent = inventActionBusyReason();
      hint.className = "challenge-ready-hint blocked";
    }
    return;
  }
  renderFeasibility();
  const f = assessFeasibility();
  const reason = challengeBlockReason();
  let ok = f.canChallenge;
  let title = ok
    ? f.overall === "yellow"
      ? "Feasibility yellow — you can still face the challenge"
      : "Feasibility green — face a random challenge next"
    : reason;
  // Multiplayer: only owner faces Challenge on their invent
  if (b && !b.canFaceChallenge?.()) {
    ok = false;
    title = b.viewingOther?.()
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
  // Preview lives in the Wait confirmation dialog (not a permanent invent-screen blurb).
  const el = $("#wait-preview");
  if (el) el.hidden = true;
}

/**
 * Build HTML explaining what Wait will do (solo vs multiplayer).
 * @param {{ year?: number, waits?: number, pressure?: object, mission?: object, multiparty?: boolean }} [ctx]
 */
function buildWaitConfirmHtml(ctx = {}) {
  const m = ctx.mission || state.mission;
  if (!m) return "<p>No mission loaded.</p>";
  const mp = ctx.multiparty != null ? ctx.multiparty : Boolean(mpBridge() || state.mp);
  const year = ctx.year != null ? ctx.year : state.year;
  const waits = ctx.waits != null ? ctx.waits : state.waits || 0;
  const pressure = ctx.pressure || state.pressure || {};
  const step = m.yearsPerTurn || GAME.yearsPerTurn || 2;
  const nextYear = year + step;
  const failY = m.collapseYear;
  const yearsLeft = Math.max(0, failY - nextYear);
  const rise = m.pressureRise || {};
  const nextPressure = previewPressureAfterWait(pressure, rise);
  const crisisLine = Object.keys(pressure)
    .map((k) => {
      const a = pressure[k] ?? 0;
      const b = nextPressure[k] ?? 0;
      const hot = b >= 4 ? ' class="bad"' : "";
      return `<span${hot}>${escapeHtml(k)} ${a}→${b}</span>`;
    })
    .join(" · ");

  if (mp) {
    return `
      <p><strong>What happens</strong></p>
      <ul class="wait-confirm-list">
        <li>Your invent calendar moves <strong>${year} → ${nextYear}</strong> (wait #${waits + 1} on this invent).</li>
        <li>Feasibility / timing for <em>your</em> how-it-works is judged against <strong>${nextYear}</strong>.</li>
        <li>Other players keep their invent years — they can still solve in the present.</li>
        <li>Shared crisis meters <strong>do not rise</strong> on Wait.</li>
        <li>Your seat-turn <strong>ends</strong> (unspent AP are burned). Next player acts.</li>
      </ul>
      <p><strong>When the place can still fall</strong></p>
      <ul class="wait-confirm-list">
        <li>If <em>every</em> invent calendar reaches fail year <strong>${failY}</strong>, the place times out for everyone.</li>
        <li>Your invent alone at ${nextYear}${
          yearsLeft === 0 ? " (fail year)" : ` (${yearsLeft}y before fail year)`
        } does <em>not</em> end the race.</li>
        <li>Meters maxed by deploy play can still end the table for everyone.</li>
      </ul>
      <p class="muted sm">EmTech categories stay pickable either way — Wait is for claim timing, not unlocking cards.</p>`;
  }

  const apLine = apEnabled()
    ? "<li>Unspent AP are burned; AP refills after Wait.</li>"
    : "";
  return `
    <p><strong>What happens</strong></p>
    <ul class="wait-confirm-list">
      <li>Calendar moves <strong>${year} → ${nextYear}</strong> (waits ${waits + 1}).</li>
      <li>Crisis meters rise: ${crisisLine || "—"}. Wait is never free.</li>
      ${apLine}
      <li>Feasibility re-checks whether your how-it-works over-claims <strong>${nextYear}</strong>.</li>
    </ul>
    <p><strong>Implications</strong></p>
    <ul class="wait-confirm-list">
      <li>Use Wait when later world conditions help your claims (costs, adoption, infrastructure) — not to “unlock” category cards. EmTechs are always pickable.</li>
      <li>${
        yearsLeft === 0
          ? `Next Wait hits fail year <strong>${failY}</strong> — the mission can end.`
          : `${yearsLeft} year(s) of buffer before fail year <strong>${failY}</strong> after this Wait.`
      }</li>
      <li>Any meter at 5 also ends the mission.</li>
    </ul>`;
}

/** @type {null | (() => void)} */
let _waitConfirmOnOk = null;

function closeWaitConfirm() {
  const backdrop = $("#wait-confirm-backdrop");
  if (backdrop) {
    backdrop.classList.remove("open");
    backdrop.hidden = true;
  }
  _waitConfirmOnOk = null;
}

/**
 * Show Wait confirmation; runs onOk only if the player confirms.
 * @param {() => void} onOk
 * @param {{ year?: number, waits?: number, pressure?: object, mission?: object, multiparty?: boolean }} [ctx]
 */
function openWaitConfirm(onOk, ctx = {}) {
  const backdrop = $("#wait-confirm-backdrop");
  const body = $("#wait-confirm-body");
  const title = $("#wait-confirm-title");
  if (!backdrop || !body) {
    // Fallback if DOM missing
    if (confirm("Wait +2 years?")) onOk();
    return;
  }
  const mp = ctx.multiparty != null ? ctx.multiparty : Boolean(mpBridge() || state.mp);
  if (title) {
    title.textContent = mp ? "Wait +2 years on your invent?" : "Wait +2 years?";
  }
  body.innerHTML = buildWaitConfirmHtml(ctx);
  _waitConfirmOnOk = onOk;
  backdrop.hidden = false;
  backdrop.classList.add("open");
  $("#wait-confirm-ok")?.focus();
}

/** Click handler: confirm, then run waitTurn. */
function requestWaitTurn() {
  if (isInventActionBusy()) {
    flashToast(inventActionBusyReason());
    return;
  }
  const waitGate = canWaitOnCurrentInvent();
  if (!waitGate.ok) {
    flashToast(mpFriendlyError(waitGate.error));
    return;
  }
  openWaitConfirm(() => waitTurn({ skipConfirm: true }));
}

function updateEndTurnButton() {
  const endTurnSels = ["#btn-end-turn", "#btn-challenge-end-turn", "#btn-deploy-end-turn"];
  if (!apEnabled()) {
    for (const sel of endTurnSels) {
      const btn = $(sel);
      if (!btn) continue;
      btn.hidden = true;
      btn.setAttribute("hidden", "");
    }
    updateDeployFooterButtons();
    return;
  }
  const b = mpBridge();
  const label = endTurnButtonLabel();
  // Deploy helpers are NOT watch-only when they can Pilot/Scale — they may End turn after an action
  const challengeWatch = isChallengeWatchOnly();
  const deploySpectator =
    state.screen === "deploy" &&
    (Boolean(state.challengeSpectator) || Boolean(b && !b.isMyTurn?.()));
  const notMyTurn = Boolean(b && !b.isMyTurn?.());
  const gate = isMpTurnGateBlocking();
  const inventBusy = isInventActionBusy();
  const challengeBusy = isChallengeCombatBlocking();
  // Do not treat *viewed* invent scrutiny as "you may end turn" (spectator hydrate used to)
  const ownScrutiny =
    state.turnPhase === "scrutiny" &&
    !challengeWatch &&
    (!b || !b.viewingOther?.());
  const spent = (state.apSpentThisTurn || 0) >= 1;
  const apNotFull = (state.ap ?? 0) < (state.apMax ?? GAME.apMax ?? 3);
  // Must have taken an action this seat-turn (no free End turn just for being on Deploy)
  const hasEngagement = spent || apNotFull || ownScrutiny;
  const canAct =
    !challengeWatch &&
    !deploySpectator &&
    !notMyTurn &&
    !gate &&
    !inventBusy &&
    !challengeBusy &&
    hasEngagement;

  for (const sel of endTurnSels) {
    const btn = $(sel);
    if (!btn) continue;
    btn.hidden = false;
    btn.removeAttribute("hidden");
    btn.textContent = label;
    if (challengeWatch || (sel === "#btn-deploy-end-turn" && deploySpectator)) {
      btn.disabled = true;
      btn.title =
        sel === "#btn-challenge-end-turn" || sel === "#btn-deploy-end-turn"
          ? "Watching only — leave via seat tabs when you're done looking."
          : "Watching — leave via seat tabs before ending your turn.";
      continue;
    }
    if (notMyTurn) {
      btn.disabled = true;
      btn.title = "Not your turn — wait for the active player";
      continue;
    }
    if (gate) {
      btn.disabled = true;
      btn.title = "Hit “Let's go” on “It's your turn!” first";
      continue;
    }
    if (inventBusy || challengeBusy) {
      btn.disabled = true;
      btn.title = inventActionBusyReason();
      continue;
    }
    btn.disabled = !canAct;
    btn.title = canAct
      ? b
        ? isOnlineRoomMp()
          ? "End your seat-turn (next player becomes active)"
          : "End your seat-turn and pass to the next player"
        : "Refill AP without advancing the calendar or crisis"
      : "Spend AP on an action first (Pilot, Scale, tech, write…), then End turn";
  }
  if (challengeWatch) applyChallengeWatchOnlyLock();
  updateDeployFooterButtons();
}

/** Look-only on Deploy (follow Pilot/Scale, not your turn). Helpers fielding stay interactive. */
function isDeployWatchOnly() {
  if (state.screen !== "deploy") return false;
  if (state.challengeSpectator) return true;
  const b = mpBridge();
  if (!b) return false;
  if (!b.isMyTurn?.()) return true;
  // Helper who can Pilot/Scale is active fielding — not watch-only
  if (b.viewingOther?.() && !b.canRunDeploy?.()) return true;
  return false;
}

/**
 * Deploy footer rules (multiplayer):
 * - Invent owner: Abandon deployment + End turn (End turn needs engagement)
 * - Other players (helpers): Abandon disabled; End turn enabled after ≥1 action
 * - Spectators / not your turn: both disabled (End turn via updateEndTurnButton)
 */
function updateDeployFooterButtons() {
  const abandon = $("#btn-deploy-abandon");
  if (!abandon) return;
  abandon.textContent = "Abandon deployment";

  if (state.screen !== "deploy") {
    abandon.hidden = true;
    return;
  }
  abandon.hidden = false;

  const b = mpBridge();
  const myTurn = !b || Boolean(b.isMyTurn?.());
  // Owner = viewing your own invent (solo always owner)
  const isOwner = !b || !b.viewingOther?.();
  const watching = Boolean(state.challengeSpectator) || !myTurn;

  if (watching || !isOwner) {
    // Helpers and spectators cannot reopen/abandon the invent
    abandon.disabled = true;
    abandon.title = watching
      ? "Watching only — only the invent owner can abandon deployment"
      : "Only the invent owner can abandon deployment and reopen invent for rework";
  } else {
    abandon.disabled = false;
    abandon.title =
      "Unlock invent for rework — clears Challenge and Pilot progress. Facing Challenge again costs AP.";
  }

  // Pilot/Scale button: only when fielding is allowed
  const primary = $("#btn-deploy-stage-primary");
  if (primary && (watching || (b && !b.canRunDeploy?.()))) {
    if (watching || !myTurn || (b?.viewingOther?.() && !b.canRunDeploy?.())) {
      primary.disabled = true;
      if (watching || !myTurn) {
        primary.title = "Watching only — active player fields Pilot/Scale";
      }
    }
  }
}

/** @deprecated use updateDeployFooterButtons */
function applyDeployWatchOnlyLock() {
  updateDeployFooterButtons();
  if (!isDeployWatchOnly()) return;
  const primary = $("#btn-deploy-stage-primary");
  if (primary) {
    primary.disabled = true;
    primary.title = "Watching only — active player fields Pilot/Scale";
  }
}

function endTurn() {
  if (blockIfMpTurnGate("ending your turn")) return;
  if (isInventActionBusy() || isChallengeCombatBlocking()) {
    flashToast(inventActionBusyReason());
    return;
  }
  // Spectating Challenge combat: look only
  if (isChallengeWatchOnly()) {
    flashToast(
      "Watching only — only the invent owner can finish this Challenge. Use the seat tabs to leave."
    );
    applyChallengeWatchOnlyLock();
    return;
  }
  // Spectating Deploy (not your turn): look only — helpers on their turn may End turn
  if (
    state.screen === "deploy" &&
    (state.challengeSpectator || (mpBridge() && !mpBridge().isMyTurn?.()))
  ) {
    flashToast("Watching only — leave via seat tabs when done.");
    updateDeployFooterButtons();
    return;
  }
  // Flush own invent draft so the next player sees final prose.
  // (Helping someone else: contribution AI only runs on field blur, not End turn.)
  if (writeCommitTimer) {
    clearTimeout(writeCommitTimer);
    writeCommitTimer = null;
  }
  if (!mpBridge()?.viewingOther?.()) {
    softPersistInventDrafts();
    void commitWriteIfNeeded();
  }

  // Online room: end seat-turn on server
  if (
    roomBridge.isRoom() &&
    (state.screen === "workshop" ||
      state.screen === "challenge-step" ||
      state.screen === "deploy")
  ) {
    if (!roomBridge.isMyTurn()) {
      flashToast("Not your turn.");
      return;
    }
    try {
      roomBridge.send({ type: "end_turn" });
      flashToast(
        state.turnPhase === "scrutiny"
          ? "Turn ended — invent stays locked mid-Challenge until you resume"
          : "Turn ended — next player"
      );
      // Wait on workshop; mid-challenge invent must stay frozen (don't open combat UI)
      if (state.screen === "challenge-step" && state.turnPhase === "scrutiny") {
        applyStoryFieldLocks();
        updateMissionStepPills();
      } else {
        showScreen("workshop");
        applyStoryFieldLocks();
        updateMissionStepPills();
        updateChallengeButton();
      }
    } catch (e) {
      flashToast(e.message || "Could not end turn");
    }
    return;
  }
  // Hotseat (Invent / Challenge / Deploy): End turn = pass device to next seat
  if (
    hotseatBridge.isHotseat() &&
    (state.screen === "workshop" ||
      state.screen === "challenge-step" ||
      state.screen === "deploy")
  ) {
    mpPassDevice();
    return;
  }
  // Allow end turn on challenge/deploy if AP was spent even with full bar edge cases
  if (apEnabled() && (state.apSpentThisTurn || 0) < 1 && (state.ap ?? 0) >= (state.apMax ?? 3)) {
    if (
      state.turnPhase !== "scrutiny" &&
      state.screen !== "challenge-step" &&
      state.screen !== "deploy"
    ) {
      flashToast("Do something this turn, or Wait.");
      return;
    }
  }
  // If on challenge/deploy with spent AP, patch spent counter so sim accepts end_turn
  if (
    apEnabled() &&
    (state.apSpentThisTurn || 0) < 1 &&
    isChallengeOrDeployScreen() &&
    (state.ap ?? 0) < (state.apMax ?? 3)
  ) {
    state.apSpentThisTurn = 1;
  }
  const r = dispatchSim("end_turn");
  if (!r.ok) {
    if (r.error === "end_turn_noop") {
      if (isChallengeOrDeployScreen() && (state.ap ?? 0) < (state.apMax ?? 3)) {
        state.ap = state.apMax ?? 3;
        state.apSpentThisTurn = 0;
        state.writeCommitsThisTurn = 0;
        flashToast(`End turn · AP refilled (${state.ap})`);
        if (state.screen === "deploy") renderDeployHud();
        else renderChallengeHud();
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
  if (state.screen === "deploy") {
    renderDeployHud();
    return;
  }
  renderWorkshop();
}

function lobbyAction() {
  if (!budgetWillEnabled()) return;
  if (blockIfMpTurnGate("lobbying")) return;
  if (isInventActionBusy()) {
    flashToast(inventActionBusyReason());
    return;
  }
  if (isChallengeWatchOnly?.()) {
    flashToast("Watching only — Lobby on your own invent turn.");
    return;
  }
  const bridge = mpBridge();
  if (bridge && !bridge.isMyTurn?.()) {
    flashToast("Not your turn.");
    return;
  }

  // Online room: server-authoritative lobby on *your* invent
  if (roomBridge.isRoom()) {
    syncRoomResourcesFromSnapshot();
    if (apEnabled() && getSpendableAp() < 1) {
      flashToast("No AP to lobby — End turn or Wait first.", { resource: "ap" });
      return;
    }
    if ((state.budget ?? 0) < 1) {
      flashToast("Need 1 Budget to lobby.", { resource: "budget" });
      return;
    }
    try {
      roomBridge.send({ type: "lobby" });
    } catch (e) {
      flashToast(mpFriendlyError(e.message) || "Could not lobby");
      return;
    }
    // Optimistic HUD (patch re-syncs)
    if (apEnabled()) {
      state.ap = Math.max(0, getSpendableAp() - 1);
      state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
    }
    state.budget = Math.max(0, (state.budget ?? 0) - 1);
    state.will = Math.min(GAME.maxWill ?? 5, (state.will ?? 0) + 1);
    flashToast(`Lobbied · Budget ${state.budget} · Will ${state.will}`);
    renderWorkshop();
    return;
  }

  // Solo / hotseat: local sim (hotseat syncs invent via dispatchSim → mpSyncFromSolo)
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

/**
 * @param {{ skipConfirm?: boolean }} [opts]
 */
function waitTurn(opts = {}) {
  if (blockIfMpTurnGate("Waiting")) return;
  if (isInventActionBusy()) {
    flashToast(inventActionBusyReason());
    return;
  }
  const waitGate = canWaitOnCurrentInvent();
  if (!waitGate.ok) {
    flashToast(mpFriendlyError(waitGate.error));
    return;
  }
  if (!opts.skipConfirm) {
    openWaitConfirm(() => waitTurn({ skipConfirm: true }));
    return;
  }
  // Multiplayer: collapsed() is place-level only (not one invent's calendar).
  if (collapsed()) {
    if (mpBridge() || state.mp) {
      const sess = mpBridge()?.getSession?.();
      const mpOutcome =
        sess && hotseatBridge.isHotseat()
          ? buildHotseatMpOutcome(sess, { kind: "collapse" })
          : state.mpOutcome || {
              multiparty: true,
              mode: roomBridge.isRoom() ? "room" : "hotseat",
              kind: "collapse",
              placeStatus: "collapsed",
            };
      if (hotseatBridge.isHotseat()) leaveHotseat();
      finishOutcome("collapse", { multiparty: true, mpOutcome });
      return;
    }
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

  // Online room: personal invent Wait on server (also ends your seat-turn)
  if (roomBridge.isRoom()) {
    if (!roomBridge.isMyTurn()) {
      flashToast("Not your turn.");
      return;
    }
    try {
      roomBridge.send({ type: "wait" });
      // Clear any leftover challenge/pose locks so we don't look "frozen" until the patch
      state.challengeSpectator = false;
      state.challengePosePending = false;
      challengeCombatBusy = false;
      document.body.classList.remove(
        "challenge-spectator",
        "challenge-pose-pending",
        "challenge-combat-busy",
        "mp-contrib-evaluating"
      );
      setMpContributionLock(false);
      showScreen("workshop");
      // Optimistic: Wait ends your seat-turn — disable act chrome until patch confirms next seat
      flashToast(
        "Wait — your invent +2 years · seat-turn ends (others keep their year; place only falls if meters max or every invent is late)."
      );
      renderWorkshop();
      renderMpChrome();
      applyEndTurnChrome();
      updateEndTurnButton();
    } catch (e) {
      flashToast(mpFriendlyError(e.message) || "Cannot Wait now.");
    }
    return;
  }

  // Hotseat: personal invent Wait via session, then pass device
  if (hotseatBridge.isHotseat()) {
    mpSyncFromSolo();
    const m = state.mission;
    const techsNow = selectedTechs();
    const stretch = detectClaimStretch(
      state.inventionHow.trim() || state.inventionImpact.trim(),
      techsNow,
      state.year
    );
    const waiterId = hotseatBridge.getActiveId();
    const yearBefore = state.year;
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
    const marketEv = (r.events || []).find((e) => e?.type === "market_news");
    if (marketEv?.marketNews) {
      queueMarketNewsModal(marketEv.marketNews, { force: true });
    }
    const yearEv = (r.events || []).find((e) => e?.type === "year_tick");
    if (yearEv?.bulletin) {
      noteYearAdvance(yearEv.bulletin);
    }
    const waiterYear =
      r.session.invents?.[waiterId]?.year ??
      (r.events || []).find((e) => e.type === "wait")?.year ??
      yearBefore + (m.yearsPerTurn || 2);
    flashToast(`Wait → your invent ${waiterYear} · next player keeps their year`);
    showScreen("workshop");
    mpHydrateAndRender({ skipTurnNotice: Boolean(marketEv?.marketNews) });
    // Explicit turn notice for next seat (deferred if market modal is up)
    const nextSeat = hotseatBridge.activeSeat?.();
    if (nextSeat) {
      state.mpLastActiveSeatId = nextSeat.id;
      showTurnStartNotice({
        name: nextSeat.displayName || "Player",
        isYou: true,
        mode: "hotseat",
      });
    }
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
  // During carousel reveal the banner must stay fully hidden — only finishChallengerDraw shows it
  // (display:grid on .challenger-banner beats the UA [hidden] rule without our CSS/helpers)
  if (state.challengeRevealPending) {
    wrap.hidden = true;
    wrap.setAttribute("hidden", "");
    wrap.classList.remove("is-revealing");
    return;
  }
  let a = angle;
  // Always resolve full angle catalog entry so portrait path is correct
  if (a?.id) {
    a = CHALLENGE_ANGLES.find((x) => x.id === a.id) || a;
  } else if (!a) {
    a = CHALLENGE_ANGLES.find((x) => x.id === state.challengeAngle);
  }
  if (!a) {
    wrap.hidden = true;
    wrap.setAttribute("hidden", "");
    return;
  }
  wrap.hidden = false;
  wrap.removeAttribute("hidden");
  wrap.dataset.challenger = a.id;
  const src = a.visual || `assets/challengers/${a.id}.jpg`;
  img.src = src;
  img.alt = `${a.label || a.id}, challenger`;
  img.hidden = false;
  img.removeAttribute("hidden");
  // Retry if load fails (path edge cases)
  img.onerror = () => {
    if (!img.dataset.fallback) {
      img.dataset.fallback = "1";
      img.src = `assets/challengers/${a.id}.jpg`;
    }
  };
  if (nameEl) nameEl.textContent = a.label || a.id;
}

/** Hide main challenger banner + speech (used while carousel is running). */
function hideChallengerBannerForReveal() {
  document.body.classList.add("challenge-reveal-pending");
  const wrap = $("#challenger-visual");
  if (wrap) {
    wrap.hidden = true;
    wrap.setAttribute("hidden", "");
    wrap.classList.remove("is-revealing");
    // Clear identity so nothing briefly flashes the pick under the carousel
    delete wrap.dataset.challenger;
  }
  const resolveEl = $("#challenger-resolve");
  if (resolveEl) {
    resolveEl.hidden = true;
    resolveEl.innerHTML = "";
  }
  const title = $("#challenge-angle-title");
  const sub = $("#challenge-angle-sub");
  const label = $("#challenge-angle-label");
  const nameEl = $("#challenger-name");
  if (label) label.textContent = "";
  if (title) title.textContent = "";
  if (sub) sub.textContent = "";
  if (nameEl) nameEl.textContent = "";
  const speech = $("#challenge-speech");
  if (speech) {
    speech.hidden = true;
    speech.setAttribute("hidden", "");
    speech.innerHTML = `<p class="muted">Summoning a challenger…</p>`;
  }
  const qEl = $("#challenge-question");
  if (qEl) {
    qEl.hidden = true;
    qEl.setAttribute("hidden", "");
    qEl.textContent = "";
  }
  const moves = $("#scrutiny-moves");
  if (moves) moves.hidden = true;
  hideAllModePanels();
}

/**
 * Build one full challenger panel (portrait + name + blurb + resolve hearts).
 * @param {object} a — CHALLENGE_ANGLES entry
 * @param {number} [hp=2]
 */
function challengerSlideHtml(a, hp = 2) {
  const hearts = "♥".repeat(Math.max(0, hp)) + "♡".repeat(Math.max(0, 2 - hp));
  const src = a.visual || `assets/challengers/${a.id}.jpg`;
  return `
    <div class="challenger-slide" data-id="${escapeHtml(a.id)}">
      <div class="challenger-slide-panel" data-challenger="${escapeHtml(a.id)}">
        <div class="challenger-portrait-wrap">
          <img src="${escapeHtml(src)}" alt="" width="160" height="160" />
        </div>
        <div class="challenger-slide-copy challenger-copy">
          <div class="label">Challenger</div>
          <h2>${escapeHtml(a.label)}</h2>
          <p class="challenge-angle-sub">${escapeHtml(a.subtitle || "")} — ${escapeHtml(
            a.blurb || ""
          )}</p>
          <p class="challenger-slide-resolve">
            <span class="challenger-resolve-label">Their resolve</span>
            <span class="challenger-resolve-hearts" aria-hidden="true">${hearts}</span>
          </p>
        </div>
      </div>
    </div>`;
}

/**
 * Horizontal carousel: one full challenger panel at a time, sliding R→L.
 * Random pick is already done; `until` is the AI pose promise — keep sliding until
 * it settles, then land on `finalAngle` (never stop on a wrong critic).
 *
 * @param {object} finalAngle — CHALLENGE_ANGLES entry (pre-selected)
 * @param {{ until?: Promise<any>, skip?: boolean, maxHp?: number }} [opts]
 * @returns {Promise<any>} resolves with the `until` result (or undefined)
 */
function playChallengerDrawAnimation(finalAngle, opts = {}) {
  const draw = $("#challenger-draw");
  const track = $("#challenger-draw-reel");
  const status = $("#challenger-draw-status");
  const banner = $("#challenger-visual");
  const speech = $("#challenge-speech");
  const moves = $("#scrutiny-moves");
  if (!draw || !track || !finalAngle) {
    state.challengeRevealPending = false;
    document.body.classList.remove("challenge-reveal-pending");
    return Promise.resolve(opts.until);
  }

  const preferReduced =
    opts.skip ||
    (typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  const maxHp = opts.maxHp != null ? opts.maxHp : 2;
  const untilPromise =
    opts.until && typeof opts.until.then === "function"
      ? opts.until
      : Promise.resolve(undefined);

  // Block room full-hydrate while the carousel runs (desync fix)
  state.challengeRevealPending = true;
  document.body.classList.add("challenge-reveal-pending");
  // Only the carousel is visible — never the final banner underneath
  hideChallengerBannerForReveal();

  // Fixed roster; pick is independent. Append clone of first for seamless wrap 3→0.
  const roster = CHALLENGE_ANGLES.slice();
  const n = roster.length;
  const winIdx = Math.max(
    0,
    roster.findIndex((a) => a.id === finalAngle.id)
  );

  track.innerHTML =
    roster.map((a) => challengerSlideHtml(a, maxHp)).join("") +
    challengerSlideHtml(roster[0], maxHp); // clone for wrap animation
  draw.hidden = false;
  draw.removeAttribute("hidden");
  if (status) {
    status.classList.remove("is-landed");
    status.textContent = "Summoning a challenger…";
  }

  const SLIDE_MS = 500;
  const MIN_SPIN_MS = 1400;
  const startedAt = Date.now();

  /** Logical index into roster (0..n-1); track may briefly sit on clone at n */
  let idx = 0;
  let poseReady = false;
  let poseResult;
  let poseFailed = false;
  let stopped = false;

  const setTrack = (i, { snap = false } = {}) => {
    if (snap) track.classList.add("is-snap");
    else track.classList.remove("is-snap");
    track.style.transform = `translateX(-${i * 100}%)`;
    if (snap) {
      void track.offsetWidth;
      track.classList.remove("is-snap");
    }
    const a = roster[i % n];
    if (status && a && !stopped) {
      status.textContent = preferReduced
        ? `${finalAngle.label} steps forward`
        : `…${a.label}?`;
    }
  };

  setTrack(0, { snap: true });

  untilPromise
    .then((r) => {
      poseReady = true;
      poseResult = r;
    })
    .catch((err) => {
      poseReady = true;
      poseFailed = true;
      poseResult = err;
    });

  const markWinnerSlide = () => {
    track.querySelectorAll(".challenger-slide").forEach((el, i) => {
      // Don't highlight the wrap clone as winner styling twice oddly
      const isWin = el.dataset.id === finalAngle.id && i === winIdx;
      el.classList.toggle("is-winner", isWin);
    });
  };

  const finish = () => {
    stopped = true;
    idx = winIdx;
    setTrack(winIdx, { snap: true });
    markWinnerSlide();
    if (status) {
      status.classList.add("is-landed");
      status.textContent = `${finalAngle.label} steps forward`;
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        finishChallengerDraw(finalAngle);
        if (poseFailed) resolve(undefined);
        else resolve(poseResult);
      }, preferReduced ? 120 : 520);
    });
  };

  if (preferReduced) {
    setTrack(winIdx, { snap: true });
    markWinnerSlide();
    return untilPromise.then(() => finish()).catch(() => finish());
  }

  /** One step left (R→L). Seamless wrap via clone at index n. */
  const slideOnce = () =>
    new Promise((resolve) => {
      if (idx === n - 1) {
        // Animate onto clone of first (index n), then snap to 0
        setTrack(n);
        setTimeout(() => {
          idx = 0;
          setTrack(0, { snap: true });
          setTimeout(resolve, 20);
        }, SLIDE_MS + 20);
        return;
      }
      idx += 1;
      setTrack(idx);
      setTimeout(resolve, SLIDE_MS + 30);
    });

  const canStop = () => {
    if (!poseReady) return false;
    if (Date.now() - startedAt < MIN_SPIN_MS) return false;
    return roster[idx]?.id === finalAngle.id;
  };

  return (async () => {
    const hardStop = Date.now() + 45000;
    while (!canStop() && Date.now() < hardStop) {
      await slideOnce();
    }
    // Guarantee we end on the randomly selected challenger
    if (roster[idx]?.id !== finalAngle.id) {
      // Keep sliding until winner (at most one full revolution)
      for (let k = 0; k < n && roster[idx]?.id !== finalAngle.id; k++) {
        await slideOnce();
      }
      if (roster[idx]?.id !== finalAngle.id) {
        idx = winIdx;
        setTrack(winIdx, { snap: true });
      }
    }
    return finish();
  })();
}

/**
 * Hide carousel and show the landed challenger on the main banner.
 * @param {object} finalAngle
 */
function finishChallengerDraw(finalAngle) {
  const draw = $("#challenger-draw");
  if (draw) {
    draw.hidden = true;
    draw.setAttribute("hidden", "");
  }
  // Clear reveal lock *before* painting the real banner (setChallengerVisual respects it)
  state.challengeRevealPending = false;
  document.body.classList.remove("challenge-reveal-pending");
  const a =
    CHALLENGE_ANGLES.find((x) => x.id === finalAngle?.id) || finalAngle;
  if (!a) return;
  setChallengerVisual(a);
  const title = $("#challenge-angle-title");
  const sub = $("#challenge-angle-sub");
  const label = $("#challenge-angle-label");
  if (label) label.textContent = "Your idea is under attack";
  if (title) title.textContent = a.label;
  if (sub) sub.textContent = `${a.subtitle || ""} — ${a.blurb || ""}`;
  const banner = $("#challenger-visual");
  if (banner) {
    banner.hidden = false;
    banner.removeAttribute("hidden");
    banner.classList.remove("is-revealing");
    void banner.offsetWidth;
    banner.classList.add("is-revealing");
  }
  // Speech / question stay empty until poseScrutinyEncounters / poseChallenge fill them
  const speech = $("#challenge-speech");
  if (speech) {
    speech.hidden = false;
    speech.removeAttribute("hidden");
  }
  const qEl = $("#challenge-question");
  if (qEl) {
    qEl.hidden = false;
    qEl.removeAttribute("hidden");
  }
}

/**
 * Challenge modes only need the invent + selected stack — not the full emTech catalog.
 * Slimming the payload cuts pose latency significantly.
 */
const SLIM_COINVENT_MODES = new Set([
  "pose-challenge",
  "judge-scrutiny-move",
  "judge-challenge",
  "coach-challenge",
  "draft-challenge",
]);

function techsForCoInventMode(mode) {
  if (SLIM_COINVENT_MODES.has(mode)) {
    const selected = selectedTechs();
    const list = selected.length ? selected : [];
    return list.map((t) => {
      const full = techForAi(t, state.year);
      return {
        id: full.id,
        name: full.name,
        domain: full.domain,
        summary: full.summary,
        readyYear: full.readyYear || full.softHorizon || null,
      };
    });
  }
  return TECHS.map((t) => techForAi(t, state.year));
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
        availableTechs: techsForCoInventMode(mode),
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
  if (blockIfMpTurnGate("facing the challenge")) return;
  if (isInventActionBusy()) {
    flashToast(inventActionBusyReason());
    return;
  }
  const b = mpBridge();
  if (b) {
    if (!b.canFaceChallenge?.()) {
      flashToast(
        b.viewingOther?.()
          ? "Only the owner faces Challenge on this invent — use the seat tabs to open yours."
          : "This invent can't enter Challenge right now."
      );
      return;
    }
    // Ensure we're on own invent before spending AP / posing
    if (hotseatBridge.isHotseat() && hotseatBridge.getViewId() !== hotseatBridge.getActiveId()) {
      hotseatBridge.setViewSeat(hotseatBridge.getActiveId());
      hotseatBridge.hydrateSoloState(state, { global: state.global });
    }
    if (roomBridge.isRoom() && roomBridge.getViewId() !== roomBridge.myId()) {
      roomBridge.setViewSeat(roomBridge.myId());
      roomBridge.hydrateSoloState(state, { global: state.global });
    }
    // Commit any in-progress story before freeze (blur may not have fired)
    if (writeCommitTimer) {
      clearTimeout(writeCommitTimer);
      writeCommitTimer = null;
    }
    softPersistInventDrafts();
    await commitWriteIfNeeded();
    mpSyncFromSolo();
  }
  if (!inventReadyForChallenge()) {
    flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
    return;
  }
  // Online room: spend enter_challenge AP on the server, then use the same Challenge screen as solo/hotseat
  if (roomBridge.isRoom()) {
    const apNow = getSpendableAp();
    if (apEnabled() && apNow < 1) {
      flashToast("No AP to face the challenge — End turn or Wait first.", { resource: "ap" });
      return;
    }
    try {
      roomBridge.send({ type: "enter_challenge" });
    } catch (e) {
      flashToast(e.message || "Could not enter challenge");
      return;
    }
    // Optimistic AP spend so Challenge HUD matches server before the patch arrives
    // (mid-Challenge full hydrate is often paused — without this, chip stays stale).
    if (apEnabled()) {
      state.ap = Math.max(0, apNow - 1);
      state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
    }
    // Local freeze immediately — Face the challenge locks invent for everyone
    // (server invent_locked once turnPhase=scrutiny; helpers cannot edit story/stack)
    state.turnPhase = "scrutiny";
    if (state.mp) {
      state.mp.inventLocked = true;
      state.mp.forgePhase = "challenge";
      state.mp.canContributeStory = false;
      state.mp.canEditStack = false;
    }
    applyStoryFieldLocks();
    // Angle is chosen below — avoid broadcasting a null-angle view that
    // spectators latch onto before the real draw lands.
  } else if (hotseatBridge.isHotseat()) {
    // Authoritative invent lifecycle (turnPhase scrutiny + inventPhase challenge)
    const ent = hotseatBridge.applyActiveAction?.({ type: "enter_challenge" });
    if (ent && !ent.ok) {
      flashToast(mpFriendlyError(ent.error) || "Cannot enter challenge");
      return;
    }
    hotseatBridge.hydrateSoloState?.(state, { global: state.global });
    state.turnPhase = "scrutiny";
    state.challengeLocked = false;
    if (state.mp) {
      state.mp.inventLocked = true;
      state.mp.forgePhase = "challenge";
      state.mp.canContributeStory = false;
      state.mp.canEditStack = false;
    }
    applyStoryFieldLocks();
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
    // Sidestep is once per *mission* (not per Face Challenge). Reopening invent
    // after a failed Pilot does not restore another free sidestep.
    state.scrutiny = {
      missCount: 0,
      pivotUsed: Boolean(state.elegancePivotPenalty),
      coachFreeUsed: false,
      encounters: buildEncounters(angles, resolveForFeasibility(feas.overall)),
    };
    state.challengeAngle = angles[0]?.id || null;
    // Lock banner *before* showScreen → renderChallengeStep paints, so the pick
    // never appears under the carousel (only finishChallengerDraw reveals it).
    state.challengeRevealPending = true;
    hideChallengerBannerForReveal();
    // Sync scrutiny skeleton for followers; angle is known but UI stays on carousel until land
    if (roomBridge.isRoom()) {
      roomSyncChallengeView({
        angle: state.challengeAngle,
        speech: "",
        question: "",
        scrutiny: state.scrutiny,
      });
    }
    showScreen("challenge-step");
    await poseScrutinyEncounters();
    return;
  }

  state.scrutiny = null;
  const angle = pickChallengeAngle();
  state.challengeAngle = angle.id;
  state.challengeRevealPending = true;
  hideChallengerBannerForReveal();
  if (roomBridge.isRoom()) {
    roomSyncChallengeView({
      angle: angle.id,
      speech: "",
      question: "",
      scrutiny: null,
    });
  }
  showScreen("challenge-step");
  await poseChallenge(angle);
}

/**
 * Start AI pose + horizontal challenger carousel in parallel.
 * When AI is ready, carousel lands on the pre-selected critic and speech appears.
 */
async function poseScrutinyEncounters() {
  const box = $("#scrutiny-encounters");
  const status = $("#scrutiny-status");
  const moves = $("#scrutiny-moves");
  const essayBtn = $("#btn-challenge-submit");
  if (box) {
    box.hidden = true;
    box.innerHTML = "";
  }
  if (status) {
    status.hidden = false;
    status.textContent = "A challenger is being drawn…";
  }
  if (moves) moves.hidden = true;
  if (essayBtn) essayBtn.hidden = true;

  // Lock reveal before any paint — prevents banner showing under the carousel
  state.challengeRevealPending = true;
  document.body.classList.add("challenge-reveal-pending");
  hideChallengerBannerForReveal();

  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  const bayHide = $("#deploy-bay");
  if (bayHide) bayHide.hidden = true;
  hideAllModePanels();
  setChallengePoseBusy(true);
  renderChallengeHud();
  renderScrutinyEncounters();

  try {
    const enc = state.scrutiny?.encounters?.[0];
    if (!enc) {
      setChallengePoseBusy(false);
      return;
    }
    const meta =
      CHALLENGE_ANGLES.find((a) => a.id === enc.angleId) || {
        id: enc.angleId,
        label: enc.label,
        subtitle: enc.subtitle,
        blurb: enc.blurb,
        visual: enc.visual,
      };
    state.challengeAngle = enc.angleId;
    const local = localPose(meta);
    const maxHp = enc.maxHp || 2;

    // AI starts immediately (behind the scenes); carousel runs until it completes
    const posePromise = (async () => {
      try {
        const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
          challengeAngle: enc.angleId,
        });
        return {
          speech: (data.challengeSpeech || data.message || "").trim() || local.speech,
          question:
            (data.challengeQuestion || "").trim() ||
            local.question ||
            "How does your invention survive this attack?",
        };
      } catch {
        return { speech: local.speech, question: local.question };
      }
    })();

    const posed = await playChallengerDrawAnimation(meta, {
      until: posePromise,
      maxHp,
    });

    const speech =
      posed?.speech || local.speech;
    const question =
      posed?.question ||
      local.question ||
      "How does your invention survive this attack?";
    enc.speech = speech;
    enc.question = question;
    state.challengeText = speech;
    state.challengeQuestion = question;
    state.challengeAngle = enc.angleId;

    state.scrutinyMoveMode = null;
    setChallengePoseBusy(false);
    paintActiveEncounter();
    renderScrutinyEncounters();
    renderChallengeHud();
    refreshChallengeVision(
      {
        angle: enc.angleId,
        label: enc.label || meta.label,
        phase: "posed",
        speech,
        question,
        move: "",
        response: "",
        quality: "",
      },
      { immediate: true }
    );
    roomSyncChallengeView({
      angle: enc.angleId,
      speech,
      question,
      scrutiny: state.scrutiny,
    });
  } catch (e) {
    state.challengeRevealPending = false;
    document.body.classList.remove("challenge-reveal-pending");
    setChallengePoseBusy(false);
    flashToast(e.message || "Challenge failed to load");
  }
}

function paintActiveEncounter() {
  // Carousel is the only challenger chrome until the draw lands
  if (state.challengeRevealPending) {
    hideChallengerBannerForReveal();
    const moves = $("#scrutiny-moves");
    if (moves) moves.hidden = true;
    hideAllModePanels();
    renderChallengeHud();
    return;
  }
  const enc = activeEncounter(state.scrutiny);
  if (!enc) {
    const speechEl = $("#challenge-speech");
    if (speechEl) {
      speechEl.hidden = false;
      speechEl.removeAttribute("hidden");
      speechEl.innerHTML = deployStagesEnabled()
        ? "<p><strong>Challenge cleared.</strong> Field a <strong>Pilot</strong>, then Scale, then declare the new normal — or hold the line after Pilot.</p>"
        : "<p><strong>Challenge cleared.</strong> You may deploy when ready.</p>";
    }
    const qClear = $("#challenge-question");
    if (qClear) {
      qClear.hidden = false;
      qClear.removeAttribute("hidden");
      qClear.textContent = "";
    }
    state.challengeVerdict = state.challengeVerdict || "pass";
    state.hadChallengeAttempt = true;
    if (!state.lastChallengeVerdict) state.lastChallengeVerdict = "pass";
    const moves = $("#scrutiny-moves");
    if (moves) moves.hidden = true;
    hideAllModePanels();
    // Keep portrait of the challenger they just beat
    const lastEnc = state.scrutiny?.encounters?.[0];
    if (lastEnc) {
      const meta =
        CHALLENGE_ANGLES.find((a) => a.id === lastEnc.angleId) || lastEnc;
      setChallengerVisual(meta);
      paintChallengerResolve(lastEnc);
    }
    // Spectators: watch only — do not unlock their own deploy bay or submit to server
    if (!isChallengeSpectator()) {
      if (!state.deployUnlocked) unlockDeployBay();
      else state.challengePassed = true;
      // Ensure pose/spectator locks don't leave Deploy buttons disabled
      state.challengePosePending = false;
      document.body.classList.remove("challenge-pose-pending");
      ["#btn-deploy-stage-primary", "#btn-deploy-back-invent", "#btn-challenge-end-turn"].forEach(
        (sel) => {
          const el = $(sel);
          if (el) el.disabled = false;
        }
      );
      updateDeployButtonCost();
      renderDeployBay();
    } else {
      const bay = $("#deploy-bay");
      if (bay) bay.hidden = true;
    }
    renderChallengeHud();
    if (isChallengeWatchOnly()) applyChallengeWatchOnlyLock();
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
  // Prefer full CHALLENGE_ANGLES entry so portrait `visual` path is always present
  const meta = CHALLENGE_ANGLES.find((a) => a.id === enc.angleId) || {
    id: enc.angleId,
    label: enc.label,
    subtitle: enc.subtitle,
    blurb: enc.blurb,
    visual: enc.visual || `assets/challengers/${enc.angleId}.jpg`,
  };
  state.challengeAngle = enc.angleId;
  state.challengeText = enc.speech;
  state.challengeQuestion = enc.question;
  setChallengerVisual(meta);
  if (isChallengeSpectator() || isChallengeWatchOnly()) {
    const viewName =
      roomBridge.seatSummaries?.()?.find((s) => s.id === roomBridge.getViewId())
        ?.displayName || "Player";
    $("#challenge-angle-label").textContent = `Watching ${viewName}'s challenge`;
  } else {
    $("#challenge-angle-label").textContent = "Your idea is under attack";
  }
  $("#challenge-angle-title").textContent = meta.label;
  $("#challenge-angle-sub").textContent = `${meta.subtitle || ""} — ${meta.blurb || ""}`;
  const speechPaint = $("#challenge-speech");
  if (speechPaint) {
    speechPaint.hidden = false;
    speechPaint.removeAttribute("hidden");
    speechPaint.innerHTML = enc.speech
      ? `<p>${escapeHtml(enc.speech || "").replace(/\n/g, "<br>")}</p>`
      : aiPendingHtml("Waiting for the challenger speech…");
  }
  const qPaint = $("#challenge-question");
  if (qPaint) {
    qPaint.hidden = false;
    qPaint.removeAttribute("hidden");
    qPaint.textContent = enc.question || "";
  }
  paintChallengerResolve(enc);
  const moves = $("#scrutiny-moves");
  if (moves) moves.hidden = false;
  // Restore or default to defend mode so the player always has a next step
  // (only invent owner mid-challenge — never on Deploy / non-owner views)
  if (!isChallengePosePending() && canFightChallengeCombat()) {
    let mode = state.scrutinyMoveMode || "defend";
    if (mode === "sidestep" && state.scrutiny?.pivotUsed) mode = "defend";
    setScrutinyMoveMode(mode);
    updateSidestepAvailability();
  } else {
    lockChallengeCombatChrome();
    updateSidestepAvailability();
  }
  updateDeployButtonCost();
  renderChallengeHud();
  applyChallengeWatchOnlyLock();
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
  // During carousel: keep status quiet so only the reel shows the challengers
  if (state.challengeRevealPending) {
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
    state.scrutiny.pivotUsed || state.elegancePivotPenalty
      ? "used this mission"
      : "once this mission"
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

  state.challengeAngle = angle.id;
  state.challengeRevealPending = true;
  document.body.classList.add("challenge-reveal-pending");
  hideChallengerBannerForReveal();
  const localFb = localPose(angle);
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#challenge-feedback")?.classList.remove("is-pending", "pass", "partial", "fail");
  const bayEssay = $("#deploy-bay");
  if (bayEssay) bayEssay.hidden = true;
  $("#btn-challenge-submit").disabled = true;
  renderChallengeHud();

  try {
    const posePromise = (async () => {
      try {
        const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
          challengeAngle: angle.id,
        });
        return {
          speech:
            (data.challengeSpeech || data.message || "").trim() || localFb.speech,
          question:
            (
              data.challengeQuestion ||
              "How does your invention survive this attack?"
            ).trim() || localFb.question,
        };
      } catch {
        return { speech: localFb.speech, question: localFb.question };
      }
    })();

    const posed = await playChallengerDrawAnimation(angle, {
      until: posePromise,
      maxHp: 2,
    });

    state.challengeText = posed?.speech || localFb.speech;
    state.challengeQuestion =
      posed?.question ||
      localFb.question ||
      "How does your invention survive this attack?";
    state.challengeAngle = angle.id;
    setChallengerVisual(angle);
    $("#challenge-angle-title").textContent = angle.label;
    $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(
      /\n/g,
      "<br>"
    )}</p>`;
    $("#challenge-question").textContent = state.challengeQuestion;

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
    state.challengeRevealPending = false;
    document.body.classList.remove("challenge-reveal-pending");
    setChallengePoseBusy(false);
    $("#btn-challenge-submit").disabled = false;
    renderChallengeHud();
    roomSyncChallengeView({
      angle: state.challengeAngle,
      speech: state.challengeText,
      question: state.challengeQuestion,
    });
  }
}

/**
 * Paint crisis ●○○ chips into a .hud-pressure container (invent + challenge top bars).
 * Color is dynamic vs this Quest's winMax (no extra HUD text):
 * green = at/under goal · yellow = above goal · red = dangerous (4–5).
 */
function paintHudPressureMeters(box) {
  if (!box) return;
  const pressure = state.pressure || {};
  const winMax = state.mission?.winMax || {};
  box.innerHTML = Object.entries(pressure)
    .map(([k, v]) => {
      const n = Math.max(0, Math.min(5, Math.round(Number(v) || 0)));
      const goal = winMax[k];
      const level = crisisMeterLevel(n, goal);
      const goalBit =
        goal != null && !Number.isNaN(Number(goal))
          ? ` · goal ≤${Math.round(Number(goal))}`
          : "";
      return `<span class="meter ${level}" title="${escapeHtml(
        k
      )}: ${n}/5${goalBit}. Green = at goal; yellow = above goal; red = danger. Wait raises; Scale lowers."><b>${escapeHtml(
        k
      )}</b> ${"●".repeat(n)}${"○".repeat(5 - n)}</span>`;
    })
    .join("");
}

function renderChallengeHud() {
  const yearEl = $("#ch-hud-year");
  if (!yearEl) return;
  yearEl.textContent = String(state.year);
  yearEl.title = "Click for year foresight (capabilities & predictions)";
  const waitsBit = state.waits ? ` · waits ${state.waits}` : "";
  const turnEl = $("#ch-hud-turn");
  if (turnEl) {
    const mp = Boolean(mpBridge() || state.mp);
    turnEl.textContent = mp
      ? `Invent${waitsBit} · R${state.turn || 1} · fail ${state.mission?.collapseYear ?? ""}`.trim()
      : `Turn ${state.turn}${waitsBit}`;
  }

  paintResourceChips("ch-");
  const apEl = $("#ch-hud-ap");
  if (apEl && apEnabled()) {
    apEl.title = "Action points. Defense, fix, sidestep, AI help, and deploy cost AP.";
  }
  const budgetEl = $("#ch-hud-budget");
  if (budgetEl && budgetWillEnabled()) {
    budgetEl.title =
      "Capital (same as invent). Solo: Budget 0$ is game over. Challenge wins can restore a little.";
  }
  const willEl = $("#ch-hud-will");
  if (willEl && budgetWillEnabled()) {
    willEl.title = "Political will (same as invent). Sidestep costs 1 Will.";
  }
  syncEconomyChromeVisibility();
  // Crisis meters (same as invent top bar, beside Future Forge brand)
  paintHudPressureMeters($("#ch-hud-pressure"));
  // Invent + Challenge End turn: single rule set (includes spectator / not-your-turn)
  applyEndTurnChrome();
  updateEndTurnButton();
  updateChallengeAbandonButton();
  // Always re-apply: freezes combat when !canFight (Deploy / non-owner) too
  applyChallengeWatchOnlyLock();
  updateSidestepAvailability();
  updateMissionStepPills();
}

/** Grey out Sidestep after the one-per-mission use (does not change mode). */
/** Live Sidestep cost label from remaining resolve hearts. */
function currentSidestepCost() {
  const enc = activeEncounter(state.scrutiny);
  return sidestepCostForEncounter(enc, { budgetWill: budgetWillEnabled() });
}

function formatSidestepCostShort(cost) {
  if (!cost?.ok) return "—";
  const bits = [`${cost.ap} AP`];
  if (budgetWillEnabled()) bits.push(`${cost.will} Will`);
  return bits.join(" · ");
}

function updateSidestepAvailability() {
  // Mission-scoped: elegancePivotPenalty sticks even after reopen invent / re-challenge
  const used = Boolean(state.scrutiny?.pivotUsed || state.elegancePivotPenalty);
  const spectating = isChallengeSpectator();
  const poseBusy = isChallengePosePending() || challengeCombatBusy;
  const pivotBtn = $("#btn-scrutiny-pivot");
  const confirmBtn = $("#btn-challenge-confirm-sidestep");
  const blurb = pivotBtn?.querySelector(".scrutiny-move-blurb");
  const costEl = pivotBtn?.querySelector(".scrutiny-move-cost");
  const cost = currentSidestepCost();
  const costLabel = formatSidestepCostShort(cost);
  const hearts = cost.ok ? cost.hearts : 0;
  // Spectators / pose lock: keep ALL move buttons grayed (do not re-enable Sidestep)
  const forceDisabled = spectating || poseBusy;
  if (pivotBtn) {
    pivotBtn.disabled = forceDisabled || used;
    pivotBtn.setAttribute("aria-disabled", pivotBtn.disabled ? "true" : "false");
    pivotBtn.title = spectating
      ? "Read-only — watching the active player"
      : used
        ? "Sidestep already used this mission (once per run)"
        : cost.ok
          ? `Skip this challenger once per mission (${hearts}♥ left → ${costLabel}; softens elegance ★)`
          : "Skip this challenger once per mission (cost = remaining resolve hearts)";
  }
  if (costEl) {
    costEl.textContent = used
      ? "used this mission"
      : cost.ok
        ? `${hearts}♥ left · ${costLabel} · softens elegance`
        : "once/mission · cost = remaining ♥ · softens elegance";
  }
  if (blurb) {
    blurb.textContent = used
      ? "Already used this mission — Defend or Fix if you face Challenge again."
      : cost.ok
        ? `Skip without winning. Cost equals remaining resolve (${hearts}♥ → ${costLabel}). Once per mission. Softens ★ elegance — not free. Lobby if you need more Will.`
        : "Skip without winning the argument. Cost equals remaining resolve hearts. Once per mission.";
  }
  if (confirmBtn) {
    confirmBtn.disabled = forceDisabled || used;
    confirmBtn.textContent = used
      ? "Sidestep already used"
      : cost.ok
        ? `Confirm sidestep (${costLabel})`
        : "Confirm sidestep";
  }
  // Spectators: force Defend + Fix to the same disabled/gray look as Sidestep
  if (spectating || poseBusy) {
    $$(".scrutiny-move-btn").forEach((btn) => {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      btn.classList.add("is-spectator-locked");
      if (!btn.title) btn.title = "Read-only — watching the active player";
    });
  } else {
    $$(".scrutiny-move-btn").forEach((btn) => {
      btn.classList.remove("is-spectator-locked");
    });
  }
}

/**
 * Paint move-mode chrome (Defend / Fix / Sidestep panels + selected buttons).
 * Used by active player and spectators (read-only).
 * @param {"defend"|"fix"|"sidestep"} mode
 * @param {{ spectator?: boolean, activeName?: string }} [opts]
 */
function paintScrutinyMoveModeChrome(mode, opts = {}) {
  const m = mode === "fix" || mode === "sidestep" ? mode : "defend";
  state.scrutinyMoveMode = m;
  const sidestepUsed = Boolean(state.scrutiny?.pivotUsed || state.elegancePivotPenalty);
  $$(".scrutiny-move-btn").forEach((btn) => {
    const on = btn.dataset.mode === m;
    btn.classList.toggle("is-selected", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    const busy = Boolean(opts.spectator) || isChallengePosePending() || challengeCombatBusy;
    if (btn.dataset.mode === "sidestep") {
      btn.disabled = busy || sidestepUsed;
    } else {
      btn.disabled = busy;
    }
  });
  const defend = $("#mode-panel-defend");
  const fix = $("#mode-panel-fix");
  const side = $("#mode-panel-sidestep");
  if (defend) defend.hidden = m !== "defend";
  if (fix) fix.hidden = m !== "fix";
  if (side) side.hidden = m !== "sidestep";

  if (m === "fix") {
    const howEdit = $("#challenge-how-edit");
    if (howEdit) {
      howEdit.value = state.inventionHow || "";
      if (opts.spectator) {
        howEdit.readOnly = true;
        howEdit.classList.add("is-locked");
        howEdit.title = "Read-only — watching the active player";
      }
    }
  }
  if (m === "defend") {
    const label = $("#challenge-answer-label");
    const enc = activeEncounter(state.scrutiny);
    const crit = enc?.label || "this challenger";
    if (label) {
      label.textContent = opts.spectator
        ? `${opts.activeName || "Player"} is defending against ${crit}`
        : `Write your defense against ${crit}`;
    }
  }
  if (m === "sidestep") {
    const lead = $("#mode-panel-sidestep .mode-panel-lead");
    const sc = currentSidestepCost();
    if (lead) {
      if (sc.ok) {
        lead.innerHTML = `You dodge this challenger without answering. Cost equals <strong>remaining resolve</strong>: <strong>${sc.hearts}♥</strong> → <strong>${escapeHtml(
          formatSidestepCostShort(sc)
        )}</strong>. Only once per mission. Lobby on Invent if you need more Will.`;
      } else {
        lead.innerHTML =
          "You dodge this challenger without answering. Cost equals remaining resolve hearts (e.g. 2♥ → 2 AP · 2 Will). Only once per mission.";
      }
    }
    // status line for spectators
    const status = $("#scrutiny-status");
    if (opts.spectator && status) {
      status.hidden = false;
      status.textContent = `${opts.activeName || "Player"} is considering Sidestep (once per run)…`;
    }
  }
  updateSidestepAvailability();
}

/** Select Defend / Fix / Sidestep — toggle only; does not spend AP until confirm */
function setScrutinyMoveMode(mode) {
  if (blockIfMpTurnGate("choosing a challenge move")) return;
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
    flashToast("Combat locked — only the invent owner can fight mid-Challenge.");
    return;
  }
  if (isChallengePosePending() && !challengeCombatBusy) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
  if (mode === "sidestep" && state.scrutiny?.pivotUsed) {
    flashToast("Sidestep already used this run.");
    mode = "defend";
  }
  paintScrutinyMoveModeChrome(mode, { spectator: false });
  // Live-sync move mode so room spectators see Defend / Fix / Sidestep
  if (roomBridge.isRoom() && canFightChallengeCombat()) {
    roomSyncChallengeView({
      moveMode: state.scrutinyMoveMode || mode,
      answer: state.challengeAnswer ?? $("#challenge-answer")?.value ?? "",
      judging: challengeCombatBusy,
      scrutiny: state.scrutiny,
    });
  }
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
  // Mid carousel: never paint the final challenger under the reel
  if (state.challengeRevealPending) {
    hideChallengerBannerForReveal();
    renderScrutinyEncounters();
    return;
  }
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
  if (blockIfMpTurnGate("submitting a defense")) return;
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
    flashToast("Only the invent owner can submit a defense mid-Challenge.");
    return;
  }
  if (challengeCombatBusy) {
    flashToast("Wait — defense is still being evaluated.");
    return;
  }
  if (isChallengePosePending() && !challengeCombatBusy) {
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
  // Two misses already failed this fight — do not hide controls mid-action again
  if ((state.scrutiny.missCount || 0) >= MISS_BUDGET) {
    flashToast("Scrutiny already failed (2 misses). Return to Invent and strengthen the idea.");
    return;
  }
  const answer = ($("#challenge-answer")?.value || "").trim();
  if (answer.length < 20) {
    flashToast("Write at least a short paragraph for your defense.");
    return;
  }

  // Spend 1 AP like Fix / Sidestep (rooms: server pay_ap so invent + End turn stay in sync)
  let roomApPaid = false;
  let usedReserveAi = false;
  if (apEnabled()) {
    if (roomBridge.isRoom()) syncRoomResourcesFromSnapshot();
    const apHave = getSpendableAp();
    if (apHave < 1) {
      flashToast(
        `No AP to submit defense (have ${apHave}, need 1). End turn to refill.`,
        { resource: "ap" }
      );
      renderChallengeHud();
      return;
    }
    if (roomBridge.isRoom()) {
      try {
        roomBridge.send({ type: "pay_ap", payload: { amount: 1 } });
        roomApPaid = true;
      } catch (e) {
        flashToast(mpFriendlyError(e.message) || "Could not spend AP to defend");
        return;
      }
      state.ap = Math.max(0, apHave - 1);
      state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
    } else {
      const r = dispatchSim("reserve_ai", {
        mode: "judge-scrutiny-move",
        reservedAp: 1,
        clientActionId: `argue-${Date.now()}`,
      });
      if (!r.ok) {
        flashToast("No AP to Argue — End turn on Invent first.", { resource: "ap" });
        return;
      }
      usedReserveAi = true;
      if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    }
    renderChallengeHud();
  }
  state.challengeAnswer = answer;
  // Lock defense textarea + broadcast draft to spectators while AI judges
  setChallengeJudging(true, {
    answer,
    reason: "AI is evaluating your defense…",
  });
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
    if (apEnabled() && usedReserveAi) dispatchSim("resolve_ai");
  } catch {
    const local = localArgueQuality(answer);
    quality = local.quality;
    message = local.message;
    if (apEnabled() && usedReserveAi) dispatchSim("resolve_ai");
  }
  if (hotseatBridge.isHotseat()) mpSyncFromSolo();

  const result = applyArgueResult(state.scrutiny, enc.id, quality);
  state.scrutiny = result.scrutiny;
  state.hadChallengeAttempt = true;
  const verdictMap = { hit: "pass", glance: "partial", miss: "fail" };
  state.lastChallengeVerdict = verdictMap[quality] || "partial";
  fb.className = `challenge-feedback ${quality === "hit" ? "pass" : quality === "glance" ? "partial" : "fail"}`;
  fb.innerHTML = `<strong>${quality.toUpperCase()}</strong> (−${result.damage} resolve) — ${escapeHtml(
    message || "Judged."
  )}`;
  state.challengeFeedback = fb.innerHTML;

  if ((state.scrutiny.missCount || 0) >= MISS_BUDGET) {
    state.challengeFails += 1;
    state.challengePassed = false;
    state.challengeVerdict = "fail";
    // challenge_locked: invent stays frozen until owner Faces again or Reopens invent
    state.challengeLocked = true;
    fb.innerHTML += `<br/><strong>Scrutiny failed</strong> (2 misses). Invent stays locked — only you can Face the challenge again, or Reopen invent to rework.`;
    state.challengeFeedback = fb.innerHTML;
    const moves = $("#scrutiny-moves");
    if (moves) moves.hidden = true;
    const status = $("#scrutiny-status");
    if (status) {
      status.hidden = false;
      status.textContent =
        "Challenge failed — invent locked. Face challenge again, or Reopen invent to rework (helpers still locked out).";
    }
    flashToast("Challenge failed — invent stays locked. Only you can try again.");
    // Sync fail to room server → challenge_locked (not invent)
    if (roomBridge.isRoom() && roomBridge.isMyTurn()) {
      try {
        roomBridge.send({
          type: "submit_challenge",
          payload: {
            answer: answer || state.challengeAnswer || "",
            verdict: "fail",
            force: true,
          },
        });
      } catch {
        /* best-effort */
      }
    }
    if (hotseatBridge.isHotseat()) {
      try {
        hotseatBridge.applyActiveAction?.({
          type: "submit_challenge",
          payload: { answer: answer || "", verdict: "fail", force: true },
        });
      } catch {
        /* ignore */
      }
      mpSyncFromSolo();
    }
    // Unlock first, then paint (so unlock cannot re-enable Sidestep after paints)
    setChallengeJudging(false, {
      answer,
      feedbackHtml: fb.innerHTML,
    });
    updateSidestepAvailability();
    renderScrutinyEncounters();
    renderChallengeHud();
    applyEndTurnChrome();
    roomSyncChallengeView({
      answer,
      judging: false,
      scrutiny: state.scrutiny,
      feedback: fb.innerHTML,
      verdict: "fail",
    });
    void roomApPaid;
    return;
  }

  if (budgetWillEnabled() && quality === "hit") {
    dispatchSim("challenge_income", { verdict: "pass" });
  } else if (budgetWillEnabled() && quality === "miss") {
    dispatchSim("challenge_income", { verdict: "fail" });
  }

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
  if (allEncountersCleared(state.scrutiny)) {
    state.challengeVerdict = "pass";
    if (state.challengeClearMode !== "sidestep") state.challengeClearMode = "defend";
    if (budgetWillEnabled() && quality === "glance") {
      dispatchSim("challenge_income", { verdict: "pass" });
    }
    if (!state.deployUnlocked) unlockDeployBay();
    else renderDeployBay();
    flashToast(
      deployStagesEnabled()
        ? "Challenge cleared — open the deploy bay (Pilot → Scale → New normal)."
        : "Challenge cleared — deploy when ready."
    );
  }
  // Unlock before paints so End turn / Sidestep greys apply correctly
  setChallengeJudging(false, {
    answer,
    feedbackHtml: fb.innerHTML,
  });
  updateSidestepAvailability();
  renderScrutinyEncounters();
  paintActiveEncounter();
  renderChallengeHud();
  applyEndTurnChrome();
  // After unlock, clear box for next defense attempt (if fight continues)
  if (!allEncountersCleared(state.scrutiny) && (state.scrutiny.missCount || 0) < MISS_BUDGET) {
    $("#challenge-answer").value = "";
    state.challengeAnswer = "";
  }
  roomSyncChallengeView({
    answer: state.challengeAnswer || answer,
    judging: false,
    scrutiny: state.scrutiny,
    feedback: fb.innerHTML || "",
    verdict: state.challengeVerdict,
  });
  void roomApPaid;
}

function scrutinyPatch() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (blockIfMpTurnGate("applying a fix")) return;
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
    flashToast("Only the invent owner can fix mid-Challenge.");
    return;
  }
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
    if (roomBridge.isRoom()) syncRoomResourcesFromSnapshot();
    const apHave = getSpendableAp();
    if (apHave < 1) {
      flashToast(
        `No AP to apply the fix (have ${apHave}, need 1). End turn first.`,
        { resource: "ap" }
      );
      renderChallengeHud();
      return;
    }
    if (roomBridge.isRoom()) {
      try {
        roomBridge.send({ type: "pay_ap", payload: { amount: 1 } });
      } catch (e) {
        flashToast(mpFriendlyError(e.message) || "Could not spend AP");
        return;
      }
    }
    state.ap = Math.max(0, apHave - 1);
    state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
    if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    renderChallengeHud();
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
    if (state.challengeClearMode !== "sidestep") state.challengeClearMode = "fix";
    if (!state.deployUnlocked) unlockDeployBay();
    else renderDeployBay();
    flashToast(
      deployStagesEnabled()
        ? "Challenge cleared — open the deploy bay (Pilot → Scale → New normal)."
        : "Challenge cleared — deploy when ready."
    );
  }
  roomSyncChallengeView({ scrutiny: state.scrutiny, verdict: state.challengeVerdict });
}

function scrutinyPivot() {
  if (!scrutinyCombatEnabled() || !state.scrutiny) return;
  if (blockIfMpTurnGate("sidestepping")) return;
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
    flashToast("Only the invent owner can sidestep mid-Challenge.");
    return;
  }
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
  if (state.scrutinyMoveMode !== "sidestep") {
    setScrutinyMoveMode("sidestep");
    const preview = currentSidestepCost();
    flashToast(
      preview.ok
        ? `Confirm sidestep below (${formatSidestepCostShort(preview)} for ${preview.hearts}♥ left).`
        : "Confirm sidestep below if you want to dodge this challenger."
    );
    return;
  }
  const enc = activeEncounter(state.scrutiny);
  if (!enc) return;
  if (state.scrutiny.pivotUsed || state.elegancePivotPenalty) {
    flashToast("Sidestep already used this mission (once per run).");
    return;
  }
  // Refresh from multiparty invent (room snapshot may be ahead of stale state.ap)
  if (roomBridge.isRoom()) syncRoomResourcesFromSnapshot();
  const cost = sidestepCostForEncounter(enc, { budgetWill: budgetWillEnabled() });
  if (!cost.ok) {
    flashToast("Nothing left to sidestep — this challenger is already cleared.");
    return;
  }
  const needAp = apEnabled() ? cost.ap : 0;
  const needWill = budgetWillEnabled() ? cost.will : 0;
  const apHave = getSpendableAp();
  const willHave = getSpendableWill();
  if (apEnabled() && apHave < needAp) {
    flashToast(
      `No AP to sidestep (have ${apHave}, need ${needAp} for ${cost.hearts}♥). End turn to refill.`,
      { resource: "ap" }
    );
    renderChallengeHud();
    return;
  }
  if (budgetWillEnabled() && willHave < needWill) {
    flashToast(
      `Sidestep needs ${needWill} Political will for ${cost.hearts}♥ left (have ${willHave}). Lobby on Invent first.`,
      { resource: "will" }
    );
    renderChallengeHud();
    return;
  }

  // Spend AP + Will (rooms: server-authoritative so invent stays in sync)
  let roomApPaid = 0;
  let roomWillPaid = 0;
  if (apEnabled() && needAp > 0) {
    if (roomBridge.isRoom()) {
      try {
        roomBridge.send({ type: "pay_ap", payload: { amount: needAp } });
        roomApPaid = needAp;
      } catch (e) {
        flashToast(mpFriendlyError(e.message) || "Could not spend AP to sidestep");
        return;
      }
    }
    // Optimistic local HUD (snapshot may lag mid-Challenge)
    state.ap = Math.max(0, apHave - needAp);
    state.apSpentThisTurn = (state.apSpentThisTurn || 0) + needAp;
    if (hotseatBridge.isHotseat()) mpSyncFromSolo();
  }
  if (budgetWillEnabled() && needWill > 0) {
    if (roomBridge.isRoom()) {
      try {
        roomBridge.send({ type: "pay_will", payload: { amount: needWill } });
        roomWillPaid = needWill;
      } catch (e) {
        // Refund AP if Will pay failed
        if (roomApPaid > 0) {
          try {
            roomBridge.send({ type: "refund_ap", payload: { amount: roomApPaid } });
          } catch {
            /* best-effort */
          }
          state.ap = Math.min(state.apMax ?? 3, (state.ap || 0) + roomApPaid);
          state.apSpentThisTurn = Math.max(0, (state.apSpentThisTurn || 0) - roomApPaid);
        }
        flashToast(mpFriendlyError(e.message) || "Could not spend Will to sidestep");
        renderChallengeHud();
        return;
      }
    }
    state.will = Math.max(0, willHave - needWill);
    if (hotseatBridge.isHotseat()) mpSyncFromSolo();
  }
  renderChallengeHud();

  const result = applyPivotResult(state.scrutiny, enc.id);
  if (!result.ok) {
    // Refund if the pivot couldn't apply
    if (apEnabled() && needAp > 0) {
      state.ap = Math.max(0, (state.ap || 0) + needAp);
      state.apSpentThisTurn = Math.max(0, (state.apSpentThisTurn || 0) - needAp);
      if (roomApPaid > 0 && roomBridge.isRoom()) {
        try {
          roomBridge.send({ type: "refund_ap", payload: { amount: roomApPaid } });
        } catch {
          /* best-effort */
        }
      }
      if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    }
    if (budgetWillEnabled() && needWill > 0) {
      state.will = Math.min(GAME.maxWill ?? 5, (state.will || 0) + needWill);
      if (roomWillPaid > 0 && roomBridge.isRoom()) {
        try {
          roomBridge.send({ type: "refund_will", payload: { amount: roomWillPaid } });
        } catch {
          /* best-effort */
        }
      }
      if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    }
    renderChallengeHud();
    flashToast(result.error || "Cannot sidestep.");
    return;
  }
  state.scrutiny = result.scrutiny;
  state.elegancePivotPenalty = true; // also gates further sidesteps this mission
  state.hadChallengeAttempt = true;
  state.challengeClearMode = "sidestep";
  const sidestepMsg = `<strong>SIDESTEP</strong> — You skipped ${escapeHtml(
    enc.label
  )} (${cost.hearts}♥ remaining · ${formatSidestepCostShort(cost)} · once per mission · softens elegance ★).`;
  state.challengeFeedback = sidestepMsg;
  // Not a defended pass — still unlocks deploy, but scoring/outcome treat it as a dodge
  state.challengeVerdict = "pass";
  state.lastChallengeVerdict = "sidestep";
  const fb = $("#challenge-feedback");
  if (fb) {
    fb.hidden = false;
    fb.className = "challenge-feedback pass";
    fb.innerHTML = sidestepMsg;
  }
  // Drop off sidestep mode — button is now spent (do not re-enter sidestep panel)
  state.scrutinyMoveMode = "defend";
  paintScrutinyMoveModeChrome("defend", { spectator: false });
  // Sync combat state + feedback for followers (third-person text on their paint)
  roomSyncChallengeView({
    scrutiny: state.scrutiny,
    verdict: "pass",
    feedback: sidestepMsg,
    moveMode: "defend",
  });
  // Server: challenge cleared via sidestep → deploy_ready (frozen)
  if (roomBridge.isRoom() && roomBridge.isMyTurn()) {
    try {
      roomBridge.send({
        type: "submit_challenge",
        payload: {
          answer: "Sidestep",
          verdict: "pass",
          clearMode: "sidestep",
          sidestep: true,
          force: true,
        },
      });
    } catch (e) {
      flashToast(e.message || "Could not sync sidestep");
    }
  }
  if (hotseatBridge.isHotseat()) {
    try {
      hotseatBridge.applyActiveAction?.({
        type: "submit_challenge",
        payload: {
          answer: "Sidestep",
          verdict: "pass",
          clearMode: "sidestep",
          sidestep: true,
          force: true,
        },
      });
      mpSyncFromSolo();
    } catch {
      /* ignore */
    }
  }
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
  // paintActiveEncounter unlocks deploy when the critic is cleared — that is intentional
  // (Challenge done → bay ready). It does NOT auto-run Pilot.
  paintActiveEncounter();
  renderChallengeHud();
  if (allEncountersCleared(state.scrutiny)) {
    state.challengeVerdict = "pass";
    // Only open the bay once; avoid double unlock + double server submit
    if (!state.deployUnlocked) {
      unlockDeployBay();
    } else {
      renderDeployBay();
    }
    flashToast(
      deployStagesEnabled()
        ? "Sidestep cleared Challenge — deploy bay open (Pilot is optional; click when ready)."
        : "Challenge cleared — deploy when ready."
    );
  }
  roomSyncChallengeView({
    scrutiny: state.scrutiny,
    verdict: "pass",
    feedback: sidestepMsg,
    moveMode: "defend",
  });
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
 * True while defense/fix AI judgment is in flight (active player).
 * @type {boolean}
 */
let challengeCombatBusy = false;

/**
 * Lock combat controls + defense textarea while AI poses or judges.
 * Defense uses readOnly (not disabled) so text stays visible during "Judging…".
 * @param {boolean} busy
 * @param {{ reason?: string, judging?: boolean }} [opts]
 */
function setChallengePoseBusy(busy, opts = {}) {
  if (typeof opts.judging === "boolean") {
    challengeCombatBusy = opts.judging;
  }
  // Spectators always stay locked; judging also keeps lock even if busy=false briefly
  const locked =
    Boolean(busy) ||
    Boolean(state.challengeSpectator) ||
    challengeCombatBusy;
  state.challengePosePending = locked;
  document.body.classList.toggle("challenge-pose-pending", locked);
  document.body.classList.toggle("challenge-spectator", Boolean(state.challengeSpectator));
  document.body.classList.toggle("challenge-combat-busy", challengeCombatBusy);

  const ids = [
    "#btn-scrutiny-argue",
    "#btn-scrutiny-patch",
    "#btn-scrutiny-pivot",
    "#btn-challenge-submit",
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
    "#btn-challenge-abandon",
  ];
  for (const sel of ids) {
    const el = $(sel);
    if (el) el.disabled = locked;
  }
  // Defense / fix text: read-only while judging or spectating (keep text visible)
  const ans = $("#challenge-answer");
  if (ans) {
    ans.readOnly = locked;
    ans.classList.toggle("is-locked", locked);
    ans.classList.toggle("is-evaluating", challengeCombatBusy);
    if (challengeCombatBusy) {
      ans.title = opts.reason || "AI is evaluating your defense…";
    } else if (state.challengeSpectator) {
      ans.title = "Read-only — watching the active player";
    } else {
      ans.removeAttribute("title");
    }
  }
  const howEdit = $("#challenge-how-edit");
  if (howEdit) {
    howEdit.readOnly = locked;
    howEdit.classList.toggle("is-locked", locked);
  }
  $$(".scrutiny-move-btn").forEach((b) => {
    // Never bulk-enable Sidestep if already used this mission
    if (
      !locked &&
      b.dataset.mode === "sidestep" &&
      (state.scrutiny?.pivotUsed || state.elegancePivotPenalty)
    ) {
      b.disabled = true;
    } else {
      b.disabled = locked;
    }
  });
  const moves = $("#scrutiny-moves");
  if (moves) {
    moves.classList.toggle("is-pose-pending", locked);
    moves.setAttribute("aria-busy", locked ? "true" : "false");
  }
  const status = $("#scrutiny-status");
  if (status && locked) {
    status.hidden = false;
    if (challengeCombatBusy) {
      status.textContent =
        opts.reason || "AI is evaluating the defense… locked until the result.";
    } else if (state.challengeSpectator) {
      status.textContent = "Watching the active player face the challenge… (read-only)";
    } else {
      status.textContent = "Challenger is stepping in… actions unlock when the attack is ready.";
    }
  } else if (status && !locked && !state.challengeSpectator) {
    // leave status for renderScrutinyEncounters / paintActiveEncounter
  }
  // After unlock (or while locked), re-apply Sidestep-used / spectator greys
  if (!locked || state.elegancePivotPenalty || state.scrutiny?.pivotUsed) {
    updateSidestepAvailability();
  }
  // End turn re-enable must not clobber pose/judge lock (renderChallengeHud also calls this)
  updateEndTurnButton();
}

/**
 * Begin / end AI judgment on a defense or fix (locks textarea + syncs to room).
 * @param {boolean} on
 * @param {{ answer?: string, reason?: string, feedbackHtml?: string }} [opts]
 */
function setChallengeJudging(on, opts = {}) {
  setChallengePoseBusy(Boolean(on) || Boolean(state.challengeSpectator), {
    judging: Boolean(on),
    reason: opts.reason || "AI is evaluating your defense…",
  });
  // Only while owner is mid-Challenge combat (never after pass / on Deploy)
  if (roomBridge.isRoom() && canFightChallengeCombat()) {
    const fbEl = $("#challenge-feedback");
    roomSyncChallengeView({
      answer: opts.answer ?? state.challengeAnswer ?? $("#challenge-answer")?.value ?? "",
      judging: Boolean(on),
      moveMode: state.scrutinyMoveMode || "defend",
      scrutiny: state.scrutiny,
      feedback:
        opts.feedbackHtml != null
          ? opts.feedbackHtml
          : on
            ? aiPendingHtml("Judging defense…")
            : fbEl?.innerHTML || state.challengeFeedback || "",
      verdict: on ? null : state.challengeVerdict,
    });
  }
}

function isChallengePosePending() {
  return Boolean(state.challengePosePending);
}

function isChallengeSpectator() {
  // Room multiplayer watch-only of another seat's Challenge/Deploy follow
  return Boolean(state.challengeSpectator && roomBridge.isRoom());
}

/**
 * True whenever local UI is look-only on the Challenge screen
 * (spectator follow, not your turn, or browsing another invent's fight).
 * Prefer this over state.challengeSpectator alone for End-turn / combat locks.
 */
function isChallengeWatchOnly() {
  if (state.challengeSpectator) return true;
  if (state.screen !== "challenge-step") return false;
  const b = mpBridge();
  if (!b) return false;
  // Not your seat-turn — never End turn or fight from Challenge chrome
  if (!b.isMyTurn?.()) return true;
  // Viewing someone else's invent: look only (unless you can Pilot/Scale their locked invent)
  if (b.viewingOther?.() && !b.canRunDeploy?.()) return true;
  return false;
}

/**
 * Only the invent owner, on their seat-turn, mid Face-Challenge may fight
 * (Defend / Fix / Sidestep / submit). Solo always when mid-challenge locally.
 */
function canFightChallengeCombat() {
  if (state.challengeSpectator) return false;
  if (state.challengeRevealPending) return false;
  const b = mpBridge();
  if (!b) {
    // Solo: only while this invent is mid-challenge combat
    return (
      state.turnPhase === "scrutiny" ||
      (Boolean(state.scrutiny) && !state.challengePassed)
    );
  }
  if (!b.isMyTurn?.()) return false;
  if (b.viewingOther?.()) return false;
  // Prefer server invent phase when available
  const viewId = b.getViewId?.() || b.myId?.();
  const f = viewId ? b.invent?.(viewId) : null;
  if (f) {
    const phase = b.inventPhaseOf?.(viewId) || deriveInventPhase(f);
    return phase === "challenge";
  }
  return (
    state.turnPhase === "scrutiny" ||
    (Boolean(state.scrutiny) && !state.challengePassed)
  );
}

/**
 * Hide / freeze Defend·Fix·Sidestep panels and answer box (no extra HUD text).
 * Used on Deploy, fielded invent, and non-owner views.
 */
function lockChallengeCombatChrome(opts = {}) {
  const reason =
    opts.reason ||
    "Combat locked — only the invent owner can fight while mid-Challenge.";
  hideAllModePanels();
  const moves = $("#scrutiny-moves");
  if (moves) {
    moves.hidden = true;
    moves.classList.add("is-pose-pending");
  }
  const submit = $("#btn-challenge-submit");
  if (submit) {
    submit.disabled = true;
    submit.hidden = true;
  }
  ["#btn-challenge-apply-fix", "#btn-challenge-confirm-sidestep"].forEach((sel) => {
    const el = $(sel);
    if (el) {
      el.disabled = true;
      el.hidden = true;
    }
  });
  ["#btn-scrutiny-argue", "#btn-scrutiny-patch", "#btn-scrutiny-pivot"].forEach((sel) => {
    const el = $(sel);
    if (el) {
      el.disabled = true;
      el.title = reason;
    }
  });
  const ans = $("#challenge-answer");
  if (ans) {
    ans.readOnly = true;
    ans.classList.add("is-locked");
    ans.title = reason;
  }
  const howEdit = $("#challenge-how-edit");
  if (howEdit) {
    howEdit.readOnly = true;
    howEdit.classList.add("is-locked");
  }
  ["#btn-challenge-coach", "#btn-challenge-draft", "#btn-challenge-ask", "#challenge-help-input"].forEach(
    (sel) => {
      const el = $(sel);
      if (el) el.disabled = true;
    }
  );
}

/**
 * Force Challenge chrome into look-only mode (End turn + combat + AI + deploy).
 * Call after any paint that might re-enable buttons (renderChallengeHud, paintActiveEncounter).
 * Always freezes combat when !canFightChallengeCombat (covers Deploy with spectator=false).
 */
function applyChallengeWatchOnlyLock() {
  // Deploy / fielded / non-owner: never leave Defend·Submit interactive
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
  }
  if (!isChallengeWatchOnly()) return;
  if (state.challengeSpectator) {
    document.body.classList.add("challenge-spectator", "challenge-pose-pending");
    setChallengePoseBusy(true);
  }
  for (const sel of ["#btn-challenge-end-turn", "#btn-end-turn"]) {
    const endBtn = $(sel);
    if (!endBtn) continue;
    endBtn.disabled = true;
    endBtn.title =
      sel === "#btn-challenge-end-turn"
        ? "Watching only — only the invent owner can finish this Challenge. Use the seat tabs to leave."
        : "Watching a Challenge — leave via seat tabs before ending your turn.";
  }
  // Deploy bay must stay hidden while watching combat (not yet passed)
  const bay = $("#deploy-bay");
  if (bay && !state.challengePassed && !state.deployUnlocked) bay.hidden = true;
  ["#btn-deploy-stage-primary", "#btn-challenge-abandon"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    if (sel === "#btn-challenge-abandon") {
      el.disabled = true;
      el.hidden = true;
      el.title = "Only the invent owner can abandon Challenge";
      return;
    }
    if (!mpBridge()?.canRunDeploy?.()) {
      el.disabled = true;
      el.title = "Watching only — active player fields Pilot/Scale";
    }
  });
}

/**
 * Paint crisis meters on Invent, Challenge, and Deploy HUDs.
 * Deploy is a separate screen — painting only #ch-hud-pressure leaves Deploy stale.
 */
function refreshAllPressureHuds() {
  paintHudPressureMeters($("#hud-pressure"));
  paintHudPressureMeters($("#ch-hud-pressure"));
  paintHudPressureMeters($("#dep-hud-pressure"));
}

/**
 * Pull shared crisis meters from the latest room snapshot (or an event payload)
 * and repaint every crisis HUD.
 * @param {{ pressure?: Record<string, number>, drop?: number }} [fromEvent]
 */
function syncPressureHudFromRoom(fromEvent = null) {
  try {
    // Prefer pressure stamped on scale_ok / quest_won (authoritative post-drop board)
    if (fromEvent?.pressure && typeof fromEvent.pressure === "object") {
      state.pressure = clonePressure(fromEvent.pressure);
    } else {
      const place =
        roomBridge.client?.()?.snapshot?.place ||
        roomBridge.client?.()?.snapshot?.mp?.place ||
        null;
      if (place?.pressure) {
        state.pressure = clonePressure(place.pressure);
      }
    }
  } catch {
    /* ignore */
  }
  refreshAllPressureHuds();
  // Keep the visible phase HUD in sync (AP chips etc. unchanged; meters are the point)
  if (state.screen === "deploy") {
    paintHudPressureMeters($("#dep-hud-pressure"));
  } else if (state.screen === "challenge-step") {
    paintHudPressureMeters($("#ch-hud-pressure"));
  } else if (state.screen === "workshop") {
    paintHudPressureMeters($("#hud-pressure"));
  }
}

/**
 * Strip scrutiny combat state to plain JSON-safe fields for room broadcast.
 * (Avoids send failures if encounter objects ever hold non-serializable data.)
 */
function publicScrutinyForSync(scrutiny) {
  if (!scrutiny || typeof scrutiny !== "object") return null;
  return {
    missCount: scrutiny.missCount || 0,
    pivotUsed: Boolean(scrutiny.pivotUsed),
    coachFreeUsed: Boolean(scrutiny.coachFreeUsed),
    encounters: (scrutiny.encounters || []).map((e) => ({
      id: e.id,
      angleId: e.angleId,
      label: e.label || "",
      subtitle: e.subtitle || "",
      blurb: e.blurb || "",
      visual: e.visual || "",
      hp: e.hp,
      maxHp: e.maxHp,
      speech: e.speech || "",
      question: e.question || "",
      cleared: Boolean(e.cleared),
      pivoted: Boolean(e.pivoted),
    })),
  };
}

/**
 * Broadcast live Challenge UI so other room clients can follow along.
 * @param {{ speech?: string, question?: string, angle?: string, scrutiny?: object, feedback?: string, verdict?: string, answer?: string, judging?: boolean, moveMode?: string }} payload
 */
function roomSyncChallengeView(payload = {}) {
  // Never spam server after Challenge cleared / on Deploy / while viewing another invent
  if (!roomBridge.isRoom() || !roomBridge.isMyTurn()) return;
  if (state.screen === "deploy") return;
  if (state.challengePassed || state.deployUnlocked) return;
  if (state.challengeSpectator) return;
  if (!canFightChallengeCombat()) return;
  // Server invent must still be mid-Challenge (avoids race after pass / before hydrate)
  try {
    const me = roomBridge.myId();
    const f = me ? roomBridge.invent(me) : null;
    if (f && f.turnPhase && f.turnPhase !== "scrutiny" && !f.challengeJudging) {
      return;
    }
  } catch {
    /* ignore */
  }
  try {
    const enc = state.scrutiny?.encounters?.[0];
    const rawScrutiny =
      payload.scrutiny !== undefined ? payload.scrutiny : state.scrutiny;
    const answer =
      payload.answer !== undefined
        ? payload.answer
        : state.challengeAnswer ?? $("#challenge-answer")?.value ?? "";
    roomBridge.send({
      type: "sync_challenge_view",
      payload: {
        angle: payload.angle ?? state.challengeAngle ?? enc?.angleId ?? null,
        speech:
          payload.speech ??
          enc?.speech ??
          state.challengeText ??
          "",
        question:
          payload.question ??
          enc?.question ??
          state.challengeQuestion ??
          "",
        answer,
        judging:
          payload.judging !== undefined ? Boolean(payload.judging) : challengeCombatBusy,
        moveMode:
          payload.moveMode ?? state.scrutinyMoveMode ?? "defend",
        scrutiny: publicScrutinyForSync(rawScrutiny),
        feedback: payload.feedback ?? state.challengeFeedback ?? "",
        verdict: payload.verdict ?? state.challengeVerdict ?? null,
      },
    });
  } catch {
    /* offline */
  }
}

/** @type {ReturnType<typeof setTimeout> | null} */
let challengeAnswerSyncTimer = null;

/** Debounced live defense text → room spectators */
function scheduleChallengeAnswerSync() {
  if (!roomBridge.isRoom() || !canFightChallengeCombat()) return;
  if (challengeCombatBusy) return;
  clearTimeout(challengeAnswerSyncTimer);
  challengeAnswerSyncTimer = setTimeout(() => {
    if (!canFightChallengeCombat()) return;
    const answer = $("#challenge-answer")?.value ?? state.challengeAnswer ?? "";
    state.challengeAnswer = answer;
    roomSyncChallengeView({
      answer,
      judging: false,
      moveMode: state.scrutinyMoveMode || "defend",
    });
  }, 350);
}

/**
 * Whether the *viewed* invent's story fields must be read-only
 * (not your turn, Challenge started via Face the challenge, or locked after pass).
 */
function isViewedInventStoryLocked() {
  const b = mpBridge();
  if (!b) return false;
  // Local flag set the moment Face the challenge is clicked
  if (state.mp?.inventLocked && b.getViewId?.() === (b.myId?.() || b.getActiveId?.())) {
    return true;
  }
  if (!b.isMyTurn?.()) return true;
  if (!b.canContributeStory?.()) return true;
  const f = b.invent?.(b.getViewId?.());
  const fine =
    b.inventPhaseOf?.(b.getViewId?.()) ||
    deriveInventPhase(f) ||
    "invent";
  // challenge / challenge_locked / deploy / fielded — content frozen
  if (fine && fine !== "invent") return true;
  const phase = b.viewedPhase?.() || b.forgePhase?.(b.getViewId?.());
  if (phase && phase !== "invent") return true;
  if (
    f &&
    (f.turnPhase === "scrutiny" ||
      f.challengePassed ||
      f.challengeLocked ||
      f.deployStage === "pilot_ok" ||
      f.deployStage === "scaled" ||
      f.deployStage === "new_normal")
  ) {
    return true;
  }
  // Own client mid-challenge (workshop or challenge screen) before next hydrate
  if (state.turnPhase === "scrutiny" && !state.challengeSpectator) {
    return true;
  }
  if (state.challengeLocked) return true;
  return false;
}

/** Apply readOnly to invent story fields (workshop). */
function applyStoryFieldLocks() {
  const locked = isViewedInventStoryLocked() || isMpContributionLocked();
  for (const sel of ["#invention-name", "#invention-how", "#invention-impact"]) {
    const el = $(sel);
    if (!el) continue;
    el.readOnly = locked;
    el.classList.toggle("is-locked", locked);
    if (locked) {
      el.title = isMpContributionLocked()
        ? mpContributionLockReason
        : "Invention locked — Challenge started or not your turn to edit this invent";
    } else {
      el.removeAttribute("title");
    }
  }
  const fill = $("#btn-fill-other");
  if (fill) fill.disabled = locked;
  $$(".story-mode-btn").forEach((btn) => {
    btn.disabled = locked;
  });
}

/**
 * Apply server challenge fields into local challenge UI (for spectators).
 * Always takes feedback from the *viewed* invent so another player's sidestep
 * banner never sticks when you switch seats.
 * @param {object} invent
 */
function applySpectatorChallengeFromChallenge(invent) {
  if (!invent) return;
  state.challengeAngle = invent.challengeAngle || null;
  state.challengeText = invent.challengeSpeech || "";
  state.challengeQuestion = invent.challengeQuestion || "";
  // Always replace (including empty) — clears sticky local SIDESTEP etc.
  state.challengeFeedback = invent.challengeFeedback || "";
  state.challengeVerdict = invent.challengeVerdict || null;
  // Live defense draft (even while still typing)
  if (invent.challengeAnswer != null) {
    state.challengeAnswer = invent.challengeAnswer;
  } else {
    state.challengeAnswer = "";
  }
  state.scrutinyMoveMode = invent.challengeMoveMode || "defend";
  state.challengeJudging = Boolean(invent.challengeJudging);
  if (invent.scrutinyPublic) {
    try {
      state.scrutiny = JSON.parse(JSON.stringify(invent.scrutinyPublic));
    } catch {
      state.scrutiny = invent.scrutinyPublic;
    }
    // Ensure each encounter has visual path for portrait
    if (state.scrutiny?.encounters) {
      for (const e of state.scrutiny.encounters) {
        const full = CHALLENGE_ANGLES.find((a) => a.id === e.angleId);
        if (full) {
          e.visual = full.visual || e.visual;
          e.label = e.label || full.label;
          e.subtitle = e.subtitle || full.subtitle;
          e.blurb = e.blurb || full.blurb;
        }
      }
    }
  } else {
    state.scrutiny = null;
  }
  state.challengePassed = Boolean(invent.challengePassed);
  // Spectators do not unlock their own deploy bay while watching challenge combat
  if (!invent.challengePassed && invent.turnPhase === "scrutiny") {
    state.deployUnlocked = false;
  }
}

/**
 * Show the active player's current Challenge move (Defend / Fix / Sidestep) read-only.
 * @param {string} [activeName]
 */
function paintSpectatorDefensePanel(activeName) {
  const mode =
    state.scrutinyMoveMode === "fix" || state.scrutinyMoveMode === "sidestep"
      ? state.scrutinyMoveMode
      : "defend";
  paintScrutinyMoveModeChrome(mode, { spectator: true, activeName });

  // Lock all action buttons
  const submit = $("#btn-challenge-submit");
  if (submit) {
    submit.hidden = true;
    submit.disabled = true;
  }
  ["#btn-challenge-apply-fix", "#btn-challenge-confirm-sidestep"].forEach((sel) => {
    const el = $(sel);
    if (el) {
      el.disabled = true;
      el.hidden = mode === "defend" ? el.hidden : false;
    }
  });

  const who = activeName || "Player";
  const status = $("#scrutiny-status");
  if (status) {
    status.hidden = false;
    if (state.challengeJudging) {
      status.textContent = `Judging ${who}'s ${
        mode === "fix" ? "fix" : mode === "sidestep" ? "sidestep" : "defense"
      }… (read-only)`;
    } else if (mode === "fix") {
      status.textContent = `${who} chose Fix the invention — editing how-it-works…`;
    } else if (mode === "sidestep") {
      status.textContent = `${who} is on Sidestep once (confirm pending)…`;
    } else {
      status.textContent = `${who} chose Defend in writing…`;
    }
  }

  const ans = $("#challenge-answer");
  if (ans) {
    ans.readOnly = true;
    ans.classList.add("is-locked");
    ans.classList.toggle("is-evaluating", Boolean(state.challengeJudging));
    if (ans.value !== (state.challengeAnswer || "")) {
      ans.value = state.challengeAnswer || "";
    }
    ans.placeholder = state.challengeJudging
      ? "Defense submitted — AI is judging…"
      : `${who} is writing a defense…`;
    ans.title = "Read-only — watching the active player";
  }

  const howEdit = $("#challenge-how-edit");
  if (howEdit && mode === "fix") {
    howEdit.readOnly = true;
    howEdit.classList.add("is-locked");
    if (state.inventionHow) howEdit.value = state.inventionHow;
  }

  const fb = $("#challenge-feedback");
  if (fb) {
    if (state.challengeJudging && !(state.challengeFeedback || "").includes("Judging")) {
      fb.hidden = false;
      fb.className = "challenge-feedback is-pending";
      fb.innerHTML = aiPendingHtml(`Judging ${who}'s move…`);
    } else if (state.challengeFeedback) {
      fb.hidden = false;
      if (String(state.challengeFeedback).includes("ai-pending") || state.challengeJudging) {
        fb.className = "challenge-feedback is-pending";
        fb.innerHTML = state.challengeFeedback;
      } else {
        const v = state.challengeVerdict || "";
        fb.className = `challenge-feedback ${v}`;
        // Rewrite first-person sidestep/defend copy for spectators
        let html = state.challengeFeedback;
        if (/SIDESTEP/i.test(html) && /\bYou skipped\b/i.test(html)) {
          html = html.replace(/\bYou skipped\b/i, `${escapeHtml(who)} skipped`);
        }
        fb.innerHTML = html;
      }
    } else {
      // No feedback on *this* invent — hide sticky banner from a previous seat
      fb.hidden = true;
      fb.innerHTML = "";
      fb.className = "challenge-feedback";
    }
  }
}

/**
 * Paint portrait + labels for the current challenger (always from CHALLENGE_ANGLES assets).
 */
function paintSpectatorChallengerChrome(activeName) {
  const angleId =
    state.challengeAngle ||
    state.scrutiny?.encounters?.[0]?.angleId ||
    null;
  const angle = CHALLENGE_ANGLES.find((a) => a.id === angleId);
  if (angle) {
    setChallengerVisual(angle);
    $("#challenge-angle-label").textContent = `Watching ${activeName || "player"}`;
    $("#challenge-angle-title").textContent = angle.label;
    $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  } else {
    setChallengerVisual(null);
  }
  if (state.challengeText) {
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(
      /\n/g,
      "<br>"
    )}</p>`;
  }
  if (state.challengeQuestion) {
    $("#challenge-question").textContent = state.challengeQuestion;
  }
  // Always show live defense draft + judging state for followers
  paintSpectatorDefensePanel(activeName);
  const fb = $("#challenge-feedback");
  if (!fb) return;
  if (state.challengeFeedback && !state.challengeJudging) {
    fb.hidden = false;
    fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
    let html = state.challengeFeedback;
    if (/SIDESTEP/i.test(html) && /\bYou skipped\b/i.test(html) && activeName) {
      html = html.replace(/\bYou skipped\b/i, `${escapeHtml(activeName)} skipped`);
    }
    fb.innerHTML = html;
  } else if (!state.challengeJudging) {
    fb.hidden = true;
    fb.innerHTML = "";
    fb.className = "challenge-feedback";
  }
}

/**
 * Enter Challenge screen as a read-only follower of the active player's fight.
 */
function enterChallengeAsSpectator(activeInvent, activeName) {
  state.challengeSpectator = true;
  state.challengePosePending = true;
  // Clear any local combat leftovers (own sidestep banner, own pilot bay, etc.)
  state.challengeVisionBeat = null;
  state.deployUnlocked = false;
  state.lastDeployRoll = null;
  state.challengeFeedback = "";
  const oldFb = $("#challenge-feedback");
  if (oldFb) {
    oldFb.hidden = true;
    oldFb.innerHTML = "";
    oldFb.className = "challenge-feedback";
  }
  document.body.classList.add("challenge-spectator", "challenge-pose-pending");
  applySpectatorChallengeFromChallenge(activeInvent);
  // Avoid showScreen → renderChallengeStep essay mode wiping spectator chrome:
  // set screen class directly, then paint spectator UI.
  state.screen = "challenge-step";
  $$(".screen").forEach((el) =>
    el.classList.toggle("active", el.id === "screen-challenge-step")
  );
  ensureCoInventor();
  setChallengeSideTab(state.challengeSideTab || "vision");

  const status = $("#scrutiny-status");
  if (status) {
    status.hidden = false;
    status.textContent = `Watching ${activeName || "the active player"} face the challenge… (read-only)`;
  }
  const moves = $("#scrutiny-moves");
  if (moves) moves.hidden = false;
  const essayBtn = $("#btn-challenge-submit");
  if (essayBtn) essayBtn.hidden = true;
  const bay = $("#deploy-bay");
  if (bay) bay.hidden = true;
  // Show defend panel (read-only) so followers see the live defense draft
  hideAllModePanels();
  paintSpectatorDefensePanel(activeName);

  paintSpectatorChallengerChrome(activeName);

  if (state.scrutiny?.encounters?.[0]) {
    paintActiveEncounter();
    // paintActiveEncounter skips setScrutinyMoveMode for spectators — re-show defense
    paintSpectatorDefensePanel(activeName);
  } else if (!state.challengeText) {
    const speech = $("#challenge-speech");
    if (speech) {
      speech.innerHTML = aiPendingHtml(
        `${activeName || "Player"} is facing the challenge…`
      );
    }
    const q = $("#challenge-question");
    if (q) q.textContent = "";
  }

  // Lock combat UI after paint (paintActiveEncounter may re-enable modes)
  state.challengeSpectator = true;
  document.body.classList.add("challenge-spectator");
  paintSpectatorDefensePanel(activeName);
  renderChallengeHud();
  applyChallengeWatchOnlyLock();
  renderMpChrome();
  // No auto vision on challenge follow — was freezing the tab with data-URL churn
}

function leaveChallengeSpectatorIfNeeded(opts = {}) {
  if (!state.challengeSpectator && !opts.force) return;
  state.challengeSpectator = false;
  document.body.classList.remove("challenge-spectator");
  state.challengePosePending = false;
  challengeCombatBusy = false;
  setChallengePoseBusy(false, { judging: false });
  // Clear messy combat chrome
  hideAllModePanels();
  // Always clear spectator feedback when leaving follow — never leak "You skipped…"
  // into the next player's challenge or your workshop.
  if (opts.clearFeedback !== false) {
    state.challengeFeedback = "";
    const fb = $("#challenge-feedback");
    if (fb) {
      fb.hidden = true;
      fb.innerHTML = "";
      fb.className = "challenge-feedback";
    }
  }
  if (opts.message) flashToast(opts.message);
  if (state.screen === "challenge-step" || opts.forceWorkshop) {
    // Snap view back to your own invent (unless following deploy)
    if (!opts.keepView) {
      ensureRoomViewSeatForLocalPlayer({ forceSelf: true });
      const me = roomBridge.myId();
      if (me) roomBridge.setViewSeat(me);
    }
    if (!opts.stayOnChallenge) {
      // Avoid showScreen() in rooms — it re-triggers vision/img paths
      state.screen = "workshop";
      $$(".screen").forEach((el) =>
        el.classList.toggle("active", el.id === "screen-workshop")
      );
      if (roomBridge.isRoom()) {
        roomBridge.hydrateSoloState(state, { global: state.global });
        syncWriteSnapshotFromState();
        lastHydratedViewSeatId = roomBridge.getViewId();
        lastRoomVisionKey = "";
        renderWorkshop();
        renderMpChrome();
        applyEndTurnChrome();
        scheduleRoomVisionRefresh({ immediate: true });
        maybeNotifyMpTurnStart();
      } else {
        mpHydrateAndRender();
      }
    }
  }
}

/**
 * True when an invent is still mid Deploy (Pilot / waiting on Scale).
 * Fully fielded invents (`new_normal` / `scaled`) are *not* in deploy — callers
 * handle scale_ok events separately so spectators are not stuck read-only.
 * @param {object|null} af
 * @param {object} [evt]
 */
function activePlayerInDeploy(af, evt) {
  if (!af) return false;
  if (af.turnPhase === "scrutiny") return false;
  if (!af.challengePassed) return false;
  // Deploy arc finished — not "still deploying" (partial Scale keeps the Quest open)
  if (af.deployStage === "scaled" || af.deployStage === "new_normal") {
    return false;
  }
  // Deploy-ready or mid Pilot (pilot_ok) — follow the bay
  if (af.deployStage === "none" || af.deployStage === "pilot_ok" || af.deployStage === "pilot") {
    return true;
  }
  const events = evt?.events || [];
  return events.some((e) =>
    ["pilot_ok", "pilot_fail", "scale_fail", "challenge_pass"].includes(e?.type)
  );
}

/** Room client for outcome / patch helpers (never bare `client` in follow handlers). */
function roomClient() {
  return roomBridge.client?.() || null;
}

/**
 * After a successful Scale: full solve → evaluation; partial → unlock UI and park cleanly.
 * Fixes invent owners stuck as read-only spectators after a helper fields their invent.
 * @param {object} scaleEv scale_ok event
 * @param {object} [evt] full patch event
 * @param {string} [actorName]
 * @returns {boolean} true if handled (caller should return)
 */
function finishRoomFollowAfterScaleOk(scaleEv, evt, actorName = "Player") {
  const client = roomClient();
  const me = roomBridge.myId();
  const targetId = scaleEv?.targetSeatId || scaleEv?.seatId || null;
  const solved = Boolean(scaleEv?.solved || scaleEv?.raceOver);

  // Crisis meters first (event pressure is authoritative after Scale)
  try {
    roomBridge.hydrateSoloState(state, { global: state.global });
  } catch {
    /* ignore */
  }
  syncPressureHudFromRoom(scaleEv || null);

  // Full hold → evaluation for the whole table
  if (solved) {
    roomFollowKey = "";
    state.challengeSpectator = false;
    state.challengePosePending = false;
    challengeCombatBusy = false;
    document.body.classList.remove(
      "challenge-spectator",
      "challenge-pose-pending",
      "challenge-combat-busy"
    );
    setChallengePoseBusy(false, { judging: false });
    if (client && openRoomQuestOutcomeIfEnded(client, evt || { events: [scaleEv] })) {
      return true;
    }
    // Fallback if snapshot lag: still force outcome from the event
    if (client) {
      return openRoomQuestOutcomeIfEnded(client, {
        events: [scaleEv, { type: "quest_won", ...scaleEv }],
      });
    }
    return true;
  }

  // Partial Scale — Quest continues. Drop spectator / pose locks so buttons work again.
  roomFollowKey = "";
  state.challengeSpectator = false;
  state.challengePosePending = false;
  challengeCombatBusy = false;
  document.body.classList.remove(
    "challenge-spectator",
    "challenge-pose-pending",
    "challenge-combat-busy"
  );
  setChallengePoseBusy(false, { judging: false });

  // Prefer showing the invent that was Scaled
  if (targetId) roomBridge.setViewSeat(targetId);
  try {
    roomBridge.hydrateSoloState(state, { global: state.global });
  } catch {
    /* ignore */
  }

  const targetInv =
    (targetId && (roomBridge.invent(targetId) || clientSnapshotChallenge(targetId))) || null;
  const iAmScaler = Boolean(me && scaleEv?.seatId === me);
  const iAmOwner = Boolean(me && targetId === me);

  // Scaler (owner or helper) or invent owner: unlocked completed Deploy bay
  if ((iAmScaler || iAmOwner) && targetInv) {
    enterDeployBayInteractive(targetInv, {
      helper: iAmScaler && !iAmOwner,
      ownerName: iAmOwner ? "your invent" : actorName || "this invent",
    });
    const lead = $("#deploy-screen-lead");
    if (lead) {
      if (iAmScaler && roomBridge.isMyTurn()) {
        lead.textContent = iAmOwner
          ? `Scaled (partial). Quest improved — End turn when ready.`
          : `You Scaled their invent (partial). Quest improved — End turn when ready.`;
      } else if (iAmOwner) {
        lead.textContent =
          "Your invent scaled (partial). Quest improved — race continues. Not your turn.";
      } else {
        lead.textContent = `Scaled (partial). Quest improved — race continues.`;
      }
    }
    const fb = $("#deploy-feedback");
    if (fb) {
      fb.hidden = false;
      fb.className = "challenge-feedback pass";
      if (iAmOwner && !iAmScaler) {
        fb.innerHTML = `<strong>SCALE OK</strong> — ${escapeHtml(
          actorName
        )} Scaled your invent (partial). Shared crisis improved; Quest continues.`;
      } else {
        fb.innerHTML = `<strong>SCALE OK</strong> — New normal (partial). Shared crisis improved; Quest continues.`;
      }
    }
    applyEndTurnChrome();
    renderMpChrome();
    return true;
  }

  // Other seats that were only watching: leave Deploy follow for workshop
  leaveChallengeSpectatorIfNeeded({
    force: true,
    forceWorkshop: true,
    clearFeedback: true,
    message: `${actorName} Scaled (partial) — Quest improved. Race continues.`,
  });
  return true;
}

/**
 * Enter Deploy screen as read-only follower of Pilot/Scale.
 * @param {object} invent
 * @param {string} activeName
 * @param {object} [evt]
 */
function enterDeployAsSpectator(invent, activeName, evt) {
  // If it is *your* turn and you can field this invent, open interactive bay instead
  if (
    roomBridge.isRoom() &&
    roomBridge.isMyTurn() &&
    roomBridge.canRunDeploy?.() &&
    invent
  ) {
    enterDeployBayInteractive(invent, {
      helper: roomBridge.viewingOther?.(),
      ownerName: activeName || "this invent",
    });
    return;
  }

  state.challengeSpectator = true;
  state.challengePosePending = false;
  challengeCombatBusy = false;
  state.challengeFeedback = "";
  state.challengeVisionBeat = null;
  document.body.classList.add("challenge-spectator");
  document.body.classList.remove("challenge-pose-pending");
  applySpectatorChallengeFromChallenge(invent);
  state.challengePassed = true;
  state.deployUnlocked = true;
  state.deployStage = soloDeployStageFromChallenge(invent?.deployStage);
  if (invent?.stagedDropPool != null) state.stagedDropPool = invent.stagedDropPool;

  state.screen = "deploy";
  $$(".screen").forEach((el) =>
    el.classList.toggle("active", el.id === "screen-deploy")
  );

  const lead = $("#deploy-screen-lead");
  if (lead) {
    const stage =
      invent?.deployStage === "pilot_ok"
        ? "ready to Scale"
        : invent?.deployStage === "scaled" || invent?.deployStage === "new_normal"
          ? "Scaled"
          : "ready to Pilot";
    lead.textContent = `Watching ${activeName || "player"} deploy (${stage})… (read-only)`;
  }

  // Reflect last pilot/scale event in feedback
  const events = evt?.events || [];
  const lastDep = [...events]
    .reverse()
    .find((e) =>
      ["pilot_ok", "pilot_fail", "scale_ok", "scale_fail"].includes(e?.type)
    );
  const fb = $("#deploy-feedback");
  if (fb) {
    fb.hidden = false;
    if (lastDep?.type === "pilot_ok") {
      fb.className = "challenge-feedback pass";
      fb.innerHTML = `<strong>PILOT OK</strong> — ${escapeHtml(
        activeName || "Player"
      )} piloted successfully. Scale is next.`;
      state.lastDeployRoll = { stage: "pilot", ok: true };
    } else if (lastDep?.type === "pilot_fail") {
      fb.className = "challenge-feedback fail";
      fb.innerHTML = `<strong>PILOT FAILED</strong> — ${escapeHtml(
        activeName || "Player"
      )} will need to retry next turn.`;
      state.lastDeployRoll = { stage: "pilot", ok: false };
    } else if (lastDep?.type === "scale_ok") {
      fb.className = "challenge-feedback pass";
      const solved = Boolean(lastDep.solved);
      fb.innerHTML = solved
        ? `<strong>SCALE WON</strong> — ${escapeHtml(
            activeName || "Player"
          )} Scaled and held the Quest!`
        : `<strong>SCALE OK</strong> — ${escapeHtml(
            activeName || "Player"
          )} Scaled (partial). Quest improved.`;
      state.lastDeployRoll = { stage: "scale", ok: true };
    } else if (lastDep?.type === "scale_fail") {
      fb.className = "challenge-feedback fail";
      fb.innerHTML = `<strong>SCALE FAILED</strong> — ${escapeHtml(
        activeName || "Player"
      )} will need to retry next turn.`;
      state.lastDeployRoll = { stage: "scale", ok: false };
    } else {
      fb.className = "challenge-feedback pass";
      fb.innerHTML = `<strong>Deploy</strong> — ${escapeHtml(
        activeName || "Player"
      )} is fielding Pilot → Scale.`;
    }
  }

  renderDeployBay();
  renderDeployHud();
  renderMpChrome();
  applyDeployWatchOnlyLock();
}

/**
 * True when the room's active seat is mid-Challenge (scrutiny).
 * Uses invent state + optional patch events (enter_challenge / sync).
 * @param {object|null} af active invent
 * @param {object} [evt]
 */
function activePlayerInChallenge(af, evt) {
  if (af?.turnPhase === "scrutiny") return true;
  if (af?.challengeJudging) return true;
  // Any live challenge payload before challengePassed means they're fighting
  if (
    af &&
    !af.challengePassed &&
    (af.challengeSpeech ||
      af.challengeAngle ||
      af.scrutinyPublic ||
      af.challengeQuestion ||
      af.challengeAnswer)
  ) {
    // Only treat as challenge if not still pure invent (turnPhase act with empty scrutiny)
    if (af.turnPhase === "scrutiny" || af.challengeJudging || af.scrutinyPublic) return true;
  }
  const events = evt?.events || [];
  if (
    events.some(
      (e) =>
        e?.type === "enter_challenge" ||
        e?.type === "challenge_view_sync" ||
        e?.type === "challenge_pass" ||
        e?.type === "challenge_fail"
    )
  ) {
    // enter_challenge / view_sync → in challenge; pass/fail handled by caller for leave
    return events.some(
      (e) => e?.type === "enter_challenge" || e?.type === "challenge_view_sync"
    );
  }
  return false;
}

/**
 * Room: follow active player into/out of Challenge + Deploy on patches.
 * @param {object} [evt] optional patch event (used to react to enter_challenge)
 */
/** Re-entrancy + sticky follow key so we don't re-paint Challenge/Deploy every patch. */
let roomFollowBusy = false;
let roomFollowKey = "";

function roomFollowChallengePresence(evt) {
  if (!roomBridge.isRoom()) return;
  if (roomFollowBusy) return;
  roomFollowBusy = true;
  try {
    roomFollowChallengePresenceInner(evt);
  } finally {
    roomFollowBusy = false;
  }
}

function roomFollowChallengePresenceInner(evt) {
  const activeId = roomBridge.getActiveId();
  const me = roomBridge.myId();
  // Prefer mp.invents (authoritative); fall back to top-level invents on snapshot
  let af =
    (activeId && roomBridge.invent(activeId)) ||
    (activeId && clientSnapshotChallenge(activeId)) ||
    null;

  // If patch events name a seat, use that invent (enter_challenge / deploy seatId)
  const events = evt?.events || [];

  const seatEv = events.find(
    (e) =>
      e?.seatId &&
      [
        "enter_challenge",
        "challenge_view_sync",
        "challenge_pass",
        "challenge_fail",
        "pilot_ok",
        "pilot_fail",
        "scale_ok",
        "scale_fail",
      ].includes(e?.type)
  );
  if (seatEv?.seatId) {
    af =
      roomBridge.invent(seatEv.seatId) ||
      clientSnapshotChallenge(seatEv.seatId) ||
      af;
  }
  if (seatEv?.targetSeatId) {
    // Deploy on another's invent — bay reflects the invent being fielded
    const tf =
      roomBridge.invent(seatEv.targetSeatId) || clientSnapshotChallenge(seatEv.targetSeatId);
    if (
      tf &&
      ["pilot_ok", "pilot_fail", "scale_ok", "scale_fail"].includes(seatEv.type)
    ) {
      af = { ...tf, _actorId: seatEv.seatId };
    }
  }

  const followId = seatEv?.seatId || activeId;
  const activeName =
    roomBridge.seatSummaries?.()?.find((s) => s.id === followId)?.displayName ||
    roomBridge.activeSeat()?.displayName ||
    "Player";

  // —— Owner reopened invent ("Back to invent"): leave Deploy, show Invent workshop ——
  // Must run before deploy-follow / mid-pose early returns so helpers aren't stuck on Deploy.
  const reopenEv = events.find((e) => e?.type === "reopen_invent");
  if (reopenEv) {
    const targetId = reopenEv.targetSeatId || reopenEv.seatId;
    if (targetId && roomBridge.getViewId() === targetId) {
      roomFollowKey = "";
      try {
        roomBridge.hydrateSoloState(state, { global: state.global });
      } catch {
        /* ignore */
      }
      openWorkshopForViewedInvent(roomBridge);
      const who =
        roomBridge.seatSummaries?.()?.find((s) => s.id === targetId)?.displayName ||
        "Player";
      flashToast(
        targetId === me
          ? "Invent reopened for rework — Challenge & Pilot cleared."
          : `${who} reopened their invent — unlocked for edits and layering.`
      );
      return;
    }
  }

  // —— Scale completed (any seat): evaluation on full hold, unlock on partial ——
  const scaleOkEv = events.find((e) => e?.type === "scale_ok");
  if (scaleOkEv) {
    const whoScale =
      roomBridge.seatSummaries?.()?.find((s) => s.id === scaleOkEv.seatId)
        ?.displayName || activeName;
    handleRoomDeployEvents(events, whoScale, {
      self: Boolean(me && scaleOkEv.seatId === me),
    });
    if (finishRoomFollowAfterScaleOk(scaleOkEv, evt, whoScale)) return;
  }

  // Active player mid-pose / own turn: surface deploy toasts; still open evaluation on win
  if (
    me &&
    followId === me &&
    roomBridge.isMyTurn() &&
    !state.challengeSpectator
  ) {
    handleRoomDeployEvents(events, activeName, { self: true });
    const c = roomClient();
    if (c && openRoomQuestOutcomeIfEnded(c, evt)) return;
    return;
  }

  // —— Challenge fail / messy exit for spectators ——
  const failedHard = events.some(
    (e) =>
      e?.type === "challenge_fail" ||
      (e?.type === "challenge_view_sync" && e?.verdict === "fail")
  );
  // Fail is also indicated by invent leaving scrutiny without pass
  const forgeFailed =
    af &&
    af.turnPhase !== "scrutiny" &&
    !af.challengePassed &&
    (af.challengeVerdict === "fail" ||
      (state.challengeSpectator && events.some((e) => e?.type === "end_turn")));

  if (state.challengeSpectator && (failedHard || forgeFailed) && !activePlayerInDeploy(af, evt)) {
    leaveChallengeSpectatorIfNeeded({
      force: true,
      forceWorkshop: true,
      clearFeedback: true,
      message: `${activeName} did not clear Challenge — invent stays locked (only they can Face again or Reopen). Back to your workshop.`,
    });
    return;
  }

  const activeInChallenge = activePlayerInChallenge(af, evt);

  // Active (or event seat) is in challenge → other clients open Challenge read-only
  if (activeInChallenge && me && followId && followId !== me) {
    const chKey = `challenge:${followId}`;
    roomBridge.setViewSeat(followId);
    const live = roomBridge.invent(followId) || clientSnapshotChallenge(followId) || af;
    applySpectatorChallengeFromChallenge(live);
    try {
      roomBridge.hydrateSoloState(state, { global: state.global });
    } catch {
      /* ignore */
    }
    applySpectatorChallengeFromChallenge(roomBridge.invent(followId) || live);

    if (state.screen !== "challenge-step" || !state.challengeSpectator) {
      roomFollowKey = chKey;
      enterChallengeAsSpectator(roomBridge.invent(followId) || live || {}, activeName);
      flashToast(`Watching ${activeName} on Challenge`);
    } else {
      // Already on challenge follow — paint only, no vision / full remount
      roomFollowKey = chKey;
      state.challengeSpectator = true;
      document.body.classList.add("challenge-spectator");
      paintSpectatorChallengerChrome(activeName);
      if (state.scrutiny?.encounters?.length) {
        paintActiveEncounter();
      }
      paintSpectatorDefensePanel(activeName);
      renderChallengeHud();
      applyChallengeWatchOnlyLock();
    }
    ensureChallengeScreenVisible();
    return;
  }

  // —— Deploy follow (Pilot / Scale) ——
  // Fielded invent = target of helper Pilot/Scale, else active seat's invent
  const fieldedId =
    seatEv?.targetSeatId ||
    (events.find((e) => e?.targetSeatId)?.targetSeatId) ||
    activeId;
  const fieldedChallenge =
    (fieldedId && (roomBridge.invent(fieldedId) || clientSnapshotChallenge(fieldedId))) || af;
  const myInventBeingFielded =
    Boolean(me && fieldedId === me && activeId && activeId !== me);
  // Mid deploy only (not already fielded). scale_ok handled above.
  const inDeploy =
    activePlayerInDeploy(fieldedChallenge, evt) ||
    events.some((e) =>
      ["pilot_ok", "pilot_fail", "scale_fail"].includes(e?.type)
    );

  // Follow when: (a) someone else is active and deploying, or
  // (b) someone else is piloting/scaling *my* invent (I should watch even if I stayed on Pilot UI)
  if (inDeploy && me && activeId && activeId !== me) {
    const targetId = fieldedId || activeId;
    const who =
      roomBridge.seatSummaries?.()?.find((s) => s.id === activeId)?.displayName ||
      activeName;
    const stageKey = `${targetId}|${fieldedChallenge?.deployStage || "none"}|${activeId}`;
    // Already watching this deploy bay — light update only (full re-enter froze tabs)
    if (
      state.challengeSpectator &&
      state.screen === "deploy" &&
      roomFollowKey === `deploy:${stageKey}`
    ) {
      if (events.some((e) =>
        ["pilot_ok", "pilot_fail", "scale_fail"].includes(e?.type)
      )) {
        handleRoomDeployEvents(events, who, { self: false });
        renderDeployBay();
        renderDeployHud();
      }
      return;
    }
    roomFollowKey = `deploy:${stageKey}`;
    roomBridge.setViewSeat(targetId);
    const live =
      roomBridge.invent(targetId) ||
      clientSnapshotChallenge(targetId) ||
      fieldedChallenge ||
      af;
    try {
      roomBridge.hydrateSoloState(state, { global: state.global });
    } catch {
      /* ignore */
    }
    const label = myInventBeingFielded
      ? `Watching ${who} field *your* invent`
      : `Watching ${who} deploy`;
    const firstEnter = !state.challengeSpectator || state.screen !== "deploy";
    enterDeployAsSpectator(live || {}, who, evt);
    if (firstEnter) flashToast(label);
    handleRoomDeployEvents(events, who, { self: false });
    ensureDeployScreenVisible();
    return;
  }

  // Left on Challenge/Deploy after ending turn (not following someone else).
  // Deploy-ready invents stay on Deploy until Abandon / seat change.
  // Already-scaled invents: unlock and show completed bay (or workshop).
  if (
    me &&
    activeId &&
    activeId !== me &&
    isChallengeOrDeployScreen() &&
    !activePlayerInChallenge(af, evt)
  ) {
    const myChallenge = roomBridge.invent(me) || clientSnapshotChallenge(me);
    const myFielded =
      myChallenge &&
      (myChallenge.deployStage === "new_normal" || myChallenge.deployStage === "scaled");
    if (myFielded) {
      // Own invent already Scaled — drop any sticky spectator locks, show completed bay
      state.challengeSpectator = false;
      state.challengePosePending = false;
      challengeCombatBusy = false;
      document.body.classList.remove(
        "challenge-spectator",
        "challenge-pose-pending",
        "challenge-combat-busy"
      );
      setChallengePoseBusy(false, { judging: false });
      roomBridge.setViewSeat(me);
      try {
        roomBridge.hydrateSoloState(state, { global: state.global });
      } catch {
        /* ignore */
      }
      enterDeployBayInteractive(myChallenge, { helper: false, ownerName: "your invent" });
      const lead = $("#deploy-screen-lead");
      if (lead) {
        lead.textContent =
          "Your invent already scaled. Quest may still be open — not your turn.";
      }
      return;
    }
    if (!state.challengeSpectator && myChallenge && activePlayerInDeploy(myChallenge, evt)) {
      // Keep owner on Deploy for their locked invent (Pilot/Scale disabled until their turn)
      roomBridge.setViewSeat(me);
      try {
        roomBridge.hydrateSoloState(state, { global: state.global });
      } catch {
        /* ignore */
      }
      enterDeployBayInteractive(myChallenge, { helper: false, ownerName: "your invent" });
      const lead = $("#deploy-screen-lead");
      if (lead) {
        lead.textContent =
          "Not your turn — your invent stays on Deploy. Others may Pilot/Scale it on their turns.";
      }
      return;
    }
    if (!state.challengeSpectator) {
      // Wipe own sidestep / pilot chrome so it cannot stick on the next follow
      state.challengeFeedback = "";
      state.challengeVisionBeat = null;
      const fb = $("#challenge-feedback");
      if (fb) {
        fb.hidden = true;
        fb.innerHTML = "";
      }
      flashToast("Not your turn — back to workshop. You'll follow if someone fields your invent.");
      state.screen = "workshop";
      $$(".screen").forEach((el) =>
        el.classList.toggle("active", el.id === "screen-workshop")
      );
      const mid = roomBridge.myId();
      if (mid) roomBridge.setViewSeat(mid);
      roomBridge.hydrateSoloState(state, { global: state.global });
      renderWorkshop();
      renderMpChrome();
      applyEndTurnChrome();
      return;
    }
  }

  // Challenge/deploy finished → spectators return to workshop
  if (state.challengeSpectator) {
    const stillChallenge =
      (af && af.turnPhase === "scrutiny" && followId && followId !== me) ||
      events.some((e) => e?.type === "enter_challenge" || e?.type === "challenge_view_sync");
    const stillDeploy =
      activePlayerInDeploy(fieldedChallenge, evt) && activeId !== me;
    if (stillChallenge || stillDeploy) return;
    leaveChallengeSpectatorIfNeeded({
      force: true,
      forceWorkshop: true,
      clearFeedback: true,
    });
  }

  // Actor-local: also toast deploy results on patch (room path has no local roll UI)
  if (me && activeId === me) {
    handleRoomDeployEvents(events, activeName, { self: true });
  }
}

function ensureChallengeScreenVisible() {
  const ch = document.getElementById("screen-challenge-step");
  const ws = document.getElementById("screen-workshop");
  const dep = document.getElementById("screen-deploy");
  if (ch) {
    ch.classList.add("active");
    state.screen = "challenge-step";
  }
  if (ws) ws.classList.remove("active");
  if (dep) dep.classList.remove("active");
}

/**
 * Surface Pilot/Scale outcomes from room patches (actor + spectators).
 * @param {object[]} events
 * @param {string} activeName
 * @param {{ self?: boolean }} [opts]
 */
function handleRoomDeployEvents(events, activeName, opts = {}) {
  if (!events?.length) return;
  const deployEv = events.some((e) =>
    ["pilot_ok", "pilot_fail", "scale_ok", "scale_fail"].includes(e?.type)
  );
  if (deployEv) {
    try {
      roomBridge.hydrateSoloState(state, { global: state.global });
    } catch {
      /* ignore */
    }
    // Prefer pressure from scale_ok event if present
    const scaleEv = events.find((e) => e?.type === "scale_ok" && e.pressure);
    syncPressureHudFromRoom(scaleEv || null);
  }
  for (const e of events) {
    if (e.type === "pilot_ok") {
      state.lastDeployRoll = { stage: "pilot", ok: true, pct: e.pct, level: e.level };
      if (e.dropPool != null) state.stagedDropPool = e.dropPool;
      flashToast(
        opts.self
          ? "Pilot succeeded · Scale ready"
          : `${activeName} piloted successfully · Scale ready`
      );
      renderDeployBay();
      if (state.screen === "deploy") renderDeployHud();
      else renderChallengeHud();
      refreshAllPressureHuds();
    } else if (e.type === "pilot_fail") {
      state.lastDeployRoll = { stage: "pilot", ok: false, pct: e.pct, level: e.level };
      flashToast(
        opts.self
          ? "Pilot failed — retry next turn"
          : `${activeName}'s Pilot failed`
      );
      renderDeployBay();
      if (state.screen === "deploy") renderDeployHud();
      else renderChallengeHud();
    } else if (e.type === "scale_ok") {
      state.lastDeployRoll = { stage: "scale", ok: true, pct: e.pct, level: e.level };
      state.deployStage =
        e.deployStage === "new_normal" || e.solved || e.raceOver
          ? "new_normal"
          : "scale";
      // Authoritative crisis board from event (fallback: snapshot)
      syncPressureHudFromRoom(e);
      const drop = e.drop != null ? e.drop : 0;
      if (e.solved || e.raceOver) {
        flashToast(
          opts.self
            ? `Scale → New normal · crisis −${drop} · Quest held — complete!`
            : `${activeName} Scaled → New normal and held the Quest — complete!`
        );
        const client = roomBridge.client?.();
        if (client) openRoomQuestOutcomeIfEnded(client, { events });
      } else {
        flashToast(
          opts.self
            ? `Scale → New normal · crisis −${drop} · Quest continues — help others or End turn`
            : `${activeName} Scaled → New normal (partial) · crisis −${drop}`
        );
        renderDeployBay();
        if (state.screen === "deploy") renderDeployHud();
        else if (state.screen === "workshop") {
          renderWorkshop();
          renderHud();
        } else renderChallengeHud();
        refreshAllPressureHuds();
      }
    } else if (e.type === "scale_fail") {
      state.lastDeployRoll = { stage: "scale", ok: false, pct: e.pct, level: e.level };
      flashToast(
        opts.self ? "Scale failed — retry next turn" : `${activeName}'s Scale failed`
      );
      renderDeployBay();
      if (state.screen === "deploy") renderDeployHud();
      else renderChallengeHud();
    }
  }
}

/** Read a invent from the raw room client snapshot (fallback). */
function clientSnapshotChallenge(seatId) {
  try {
    const snap = roomBridge.client?.()?.snapshot;
    return snap?.mp?.invents?.[seatId] || snap?.invents?.[seatId] || null;
  } catch {
    return null;
  }
}

async function coachChallenge(mode, userText) {
  if (state.aiBusy) return;
  if (isChallengeSpectator()) {
    flashToast("You're watching — only the active player can use AI help.");
    return;
  }
  if (isChallengePosePending()) {
    flashToast("Wait for the challenger to finish loading.");
    return;
  }
  if (!state.challengeQuestion && !state.challengeText) {
    flashToast("Wait for the challenge to load first.");
    return;
  }
  // Always 1 AP — same as invent co-inventor (Coach / Draft / Ask are not free)
  let roomApPaid = false;
  let reservedLocal = false;
  if (apEnabled()) {
    if (roomBridge.isRoom()) syncRoomResourcesFromSnapshot();
    const apHave = getSpendableAp();
    if (apHave < 1) {
      flashToast(
        `No AP for AI help (have ${apHave}, need 1). End turn to refill, or answer without coaching.`,
        { resource: "ap" }
      );
      renderChallengeHud();
      return;
    }
    if (roomBridge.isRoom()) {
      try {
        roomBridge.send({ type: "pay_ap", payload: { amount: 1 } });
        roomApPaid = true;
        state.ap = Math.max(0, apHave - 1);
        state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
      } catch (e) {
        flashToast(mpFriendlyError(e.message) || "Could not spend AP for AI help");
        return;
      }
    } else {
      const reserve = dispatchSim("reserve_ai", {
        mode,
        reservedAp: 1,
        clientActionId: `ch-ai-${Date.now()}`,
      });
      if (!reserve.ok) {
        flashToast(
          "No AP left for AI help — End turn, or submit without coaching.",
          { resource: "ap" }
        );
        return;
      }
      reservedLocal = true;
      if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    }
    renderChallengeHud();
  }
  state.aiBusy = true;
  setChallengeHelpBusy(true);
  const pendingLabel =
    mode === "draft-challenge" ? "Drafting an answer… (1 AP)" : "Coaching… (1 AP)";
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
    // local fallback — AP still spent (same as invent co-inventor on soft failure)
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
        `<div>Draft for this ${angle.label} attack — edit before submit. <span class="muted">(1 AP spent)</span></div><div class="draft-block"><strong>Draft answer</strong><p>${escapeHtml(
          draft
        )}</p><div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" id="btn-apply-draft">Use this draft</button></div></div>`
      );
    } else {
      showChallengeCoach(
        `<div><strong>${angle.label} coaching</strong> <span class="muted">(1 AP spent)</span><br/>${escapeHtml(
          angle.blurb
        )}<br/><br/>• Answer the exact question asked.<br/>• Name a concrete actor, cost, or physical limit in ${escapeHtml(
          place
        )}.<br/>• Tie the fix to your stack and invention name.<br/>• One clear safeguard beats vague hope.</div>`
      );
    }
  } finally {
    // Solo/hotseat: resolve reserved AP. Rooms already paid via pay_ap.
    if (apEnabled() && reservedLocal) {
      if (requestOk) dispatchSim("resolve_ai");
      else dispatchSim("reject_ai");
      if (hotseatBridge.isHotseat()) mpSyncFromSolo();
    }
    // If room request truly failed before work started we already returned;
    // transport fallback still keeps the AP spend (same as invent AI).
    void roomApPaid;
    state.aiBusy = false;
    setChallengeHelpBusy(false);
    renderChallengeHud();
  }
}

async function submitChallengeAnswer() {
  if (blockIfMpTurnGate("submitting a defense")) return;
  if (!canFightChallengeCombat()) {
    lockChallengeCombatChrome();
    flashToast("Only the invent owner can submit a defense mid-Challenge.");
    return;
  }
  if (challengeCombatBusy) {
    flashToast("Wait — defense is still being evaluated.");
    return;
  }
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
  setChallengeJudging(true, {
    answer,
    reason: "AI is evaluating your defense…",
  });
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
  setChallengeJudging(false, {
    answer,
    feedbackHtml: state.challengeFeedback || "",
  });
  $("#btn-challenge-submit").disabled = false;
  // Passed → unlockDeployBay navigates to Deploy (no more challenge_view sync)
  if (state.challengePassed && deployStagesEnabled()) {
    // unlock may already have run above; ensure Deploy if needed
    if (!state.deployUnlocked) unlockDeployBay();
    return;
  }
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

/** Freeze crisis relief pool and open **Deploy screen** after challenge clear. */
function unlockDeployBay() {
  if (isChallengeSpectator()) return;
  if (!bothStoryFacesReady()) {
    state.challengePassed = false;
    state.deployUnlocked = false;
    flashToast("Finish both story faces (how it works + everyday life) before Deploy.");
    return;
  }
  state.challengePassed = true;
  state.challengeSpectator = false;
  state.challengePosePending = false;
  document.body.classList.remove("challenge-pose-pending", "challenge-spectator");

  // Online room: tell server the challenge cleared (verdict from local UI) FIRST
  // so rehydrate sees challengePassed and keeps Deploy open
  if (roomBridge.isRoom() && roomBridge.isMyTurn()) {
    try {
      roomBridge.send({
        type: "submit_challenge",
        payload: {
          answer: state.challengeAnswer || "Challenge cleared in scrutiny combat.",
          verdict: state.challengeVerdict || "pass",
          clearMode: state.challengeClearMode || "defend",
          sidestep: state.challengeClearMode === "sidestep",
          force: true,
        },
      });
    } catch (e) {
      flashToast(e.message || "Could not sync challenge pass");
    }
  }
  if (!deployStagesEnabled()) return;

  if (!state.deployUnlocked) {
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
    state.lastNews = `Challenge cleared · Deploy open. Crisis relief pool frozen at −${state.stagedDropPool} (Pilot → Scale → New normal).`;
  } else {
    state.turnPhase = "between_stages";
  }

  // Leave Challenge combat screen entirely — Deploy is its own phase
  const b = mpBridge();
  const inv =
    (b?.getViewId && b.invent?.(b.getViewId())) ||
    (roomBridge.isRoom() && roomBridge.invent?.(roomBridge.getViewId())) ||
    null;
  enterDeployBayInteractive(inv, {
    helper: Boolean(b?.viewingOther?.()),
    ownerName: b?.viewingOther?.() ? "this invent" : "your invent",
  });
  flashToast("Challenge cleared — Deploy: Pilot → Scale.");
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
        ? last.stage === "scale"
          ? " Last Scale failed — not a win; retry or rework."
          : " Last Pilot failed — retry next turn or rework."
        : last && last.ok
          ? last.stage === "scale"
            ? " Last Scale succeeded."
            : " Last Pilot succeeded."
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
      // Scaled invent — multiplayer race may still continue if place not fully held
      const raceOpen =
        roomBridge.isRoom() &&
        (roomBridge.client?.()?.snapshot?.place?.status === "playing" ||
          roomBridge.client?.()?.snapshot?.mp?.place?.status === "playing" ||
          roomBridge.client?.()?.snapshot?.phase === "playing");
      status.textContent = raceOpen
        ? `This invent scaled.${lastLine} Shared crisis improved — race continues until the place is held.`
        : `Deploy complete.${lastLine}`;
    }
  }

  // Active seat may Pilot/Scale any deploy-ready invent they are viewing (own or helper).
  // Spectators / non-active never enable fielding buttons.
  const b = mpBridge();
  const canField =
    !state.challengeSpectator && (!b || Boolean(b.canRunDeploy?.()));

  if (primary) {
    if (next === "pilot") {
      primary.hidden = false;
      primary.disabled = !canField;
      primary.textContent = pilotBits.length
        ? `Try Pilot (${pilotBits.join(" · ")}) →`
        : "Try Pilot →";
      primary.title = !canField
        ? state.challengeSpectator
          ? "Read-only — watching the active player"
          : "Not your turn to Pilot this invent"
        : `About ${feas.pilotChancePct}% chance. Succeeds or fails.`;
    } else if (next === "scale") {
      primary.hidden = false;
      primary.disabled = !canField;
      primary.textContent = scaleBits.length
        ? `Try Scale (${scaleBits.join(" · ")}) →`
        : "Try Scale →";
      primary.title = !canField
        ? state.challengeSpectator
          ? "Read-only — watching the active player"
          : "Not your turn to Scale this invent"
        : `About ${feas.scaleChancePct}% chance. Success → New normal.`;
    } else {
      primary.hidden = true;
    }
  }

  if (backInvent) {
    // Legacy control removed from Deploy screen; keep no-op safe
    backInvent.hidden = true;
  }
  updateDeployFooterButtons();
}

/** Paint Deploy screen (bay + HUD + MP chrome). */
function renderDeployScreen() {
  renderDeployHud();
  if (state.deployUnlocked && state.challengePassed) {
    renderDeployBay();
  }
  renderMpChrome();
  applyEndTurnChrome();
  applyDeployWatchOnlyLock();
  updateMissionStepPills();
}

/** Deploy top bar (mirror of Challenge HUD, separate ids). */
function renderDeployHud() {
  const yearEl = $("#dep-hud-year");
  if (!yearEl) return;
  yearEl.textContent = String(state.year);
  yearEl.title = "Click for year foresight (capabilities & predictions)";
  const waitsBit = state.waits ? ` · waits ${state.waits}` : "";
  const turnEl = $("#dep-hud-turn");
  if (turnEl) {
    const mp = Boolean(mpBridge() || state.mp);
    turnEl.textContent = mp
      ? `Invent${waitsBit} · R${state.turn || 1} · fail ${state.mission?.collapseYear ?? ""}`.trim()
      : `Turn ${state.turn}${waitsBit}`;
  }
  paintResourceChips("dep-");
  const apEl = $("#dep-hud-ap");
  if (apEl && apEnabled()) {
    apEl.title = "Action points. Pilot, Scale, and AI help cost AP.";
  }
  const budgetEl = $("#dep-hud-budget");
  if (budgetEl && budgetWillEnabled()) {
    budgetEl.title = "Capital (same as invent). Deploy spends Budget.";
  }
  const willEl = $("#dep-hud-will");
  if (willEl && budgetWillEnabled()) {
    willEl.title = "Political will (same as invent).";
  }
  syncEconomyChromeVisibility();
  paintHudPressureMeters($("#dep-hud-pressure"));
  applyEndTurnChrome();
  updateEndTurnButton();
  updateDeployFooterButtons();
  updateMissionStepPills();
}

function setDeploySideTab(tab) {
  const t = tab === "coinventor" ? "coinventor" : "vision";
  state.deploySideTab = t;
  $$("[data-dep-tab]").forEach((btn) => {
    const on = btn.dataset.depTab === t;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  const vis = $("#side-deploy-vision");
  const co = $("#side-deploy-coinventor");
  if (vis) vis.hidden = t !== "vision";
  if (co) co.hidden = t !== "coinventor";
  if (t === "coinventor") ensureCoInventor();
}

function ensureDeployScreenVisible() {
  const dep = document.getElementById("screen-deploy");
  const ws = document.getElementById("screen-workshop");
  const ch = document.getElementById("screen-challenge-step");
  if (dep) {
    dep.classList.add("active");
    state.screen = "deploy";
  }
  if (ws) ws.classList.remove("active");
  if (ch) ch.classList.remove("active");
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
  if (blockIfMpTurnGate(stage === "pilot" ? "Pilot" : "Scale")) return;
  if (!state.challengePassed || !state.deployUnlocked) {
    flashToast("Clear the challenge first.");
    return;
  }
  // Multiplayer: invent locked after Challenge; active player may Pilot/Scale
  const b = mpBridge();
  if (b && !b.canRunDeploy?.()) {
    flashToast("Not your turn to Pilot/Scale this invent (or retry locked this seat-turn).");
    return;
  }
  // Online room: server rolls Pilot/Scale on the *viewed* invent (helper pays AP + capital)
  if (roomBridge.isRoom()) {
    try {
      const feas = assessFeasibility();
      const targetSeatId = roomBridge.getViewId() || roomBridge.myId();
      // Pre-check local resources so we don't send a doomed action
      if (roomBridge.isRoom()) syncRoomResourcesFromSnapshot();
      const techs = selectedTechs();
      if (stage === "pilot") {
        const c = currentDeployFieldCost(techs);
        if (apEnabled() && getSpendableAp() < (c.ap || 1)) {
          flashToast(
            `No AP to try Pilot (have ${getSpendableAp()}, need ${c.ap || 1}).`,
            { resource: "ap" }
          );
          return;
        }
        if (budgetWillEnabled() && (state.budget ?? 0) < c.budget) {
          flashToast(`Need ¤${c.budget} Budget to try Pilot.`, { resource: "budget" });
          return;
        }
        // Optimistic local spend (server is authority; patch re-syncs)
        if (apEnabled()) {
          state.ap = Math.max(0, getSpendableAp() - (c.ap || 1));
          state.apSpentThisTurn = (state.apSpentThisTurn || 0) + (c.ap || 1);
        }
        if (budgetWillEnabled()) state.budget = Math.max(0, (state.budget ?? 0) - c.budget);
      } else {
        const c = currentScaleCost(techs);
        if (apEnabled() && getSpendableAp() < (c.ap || 1)) {
          flashToast(
            `No AP to try Scale (have ${getSpendableAp()}, need ${c.ap || 1}).`,
            { resource: "ap" }
          );
          return;
        }
        if (budgetWillEnabled() && (state.budget ?? 0) < c.budget) {
          flashToast(`Need ¤${c.budget} Budget to try Scale.`, { resource: "budget" });
          return;
        }
        if (budgetWillEnabled() && (state.will ?? 0) < (c.will || 0)) {
          flashToast(`Need ${c.will} Will to try Scale.`, { resource: "will" });
          return;
        }
        if (apEnabled()) {
          state.ap = Math.max(0, getSpendableAp() - (c.ap || 1));
          state.apSpentThisTurn = (state.apSpentThisTurn || 0) + (c.ap || 1);
        }
        if (budgetWillEnabled()) {
          state.budget = Math.max(0, (state.budget ?? 0) - c.budget);
          if (c.will > 0) state.will = Math.max(0, (state.will ?? 0) - c.will);
        }
      }
      if (state.screen === "deploy") renderDeployHud();
      else renderChallengeHud();
      roomBridge.send({
        type: stage === "pilot" ? "attempt_pilot" : "attempt_scale",
        payload: {
          feasibilityLevel: stage === "pilot" ? feas.pilotLevel : feas.scaleLevel,
          targetSeatId,
        },
      });
      flashToast(stage === "pilot" ? "Trying Pilot…" : "Trying Scale…");
    } catch (e) {
      flashToast(mpFriendlyError(e.message) || "Deploy failed");
    }
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
      refreshAllPressureHuds();
      if (state.screen === "deploy") renderDeployHud();
      else if (state.screen === "workshop") renderWorkshop();
      else renderChallengeHud();
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
    refreshAllPressureHuds();
    if (state.screen === "deploy") renderDeployHud();
    else if (state.screen === "workshop") renderWorkshop();
    else renderChallengeHud();
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
      state.lastDeployRoll = { stage: "scale", ok: false, pct: roll.pct, level: roll.level };
      flashToast("Scale failed — you did not win this try. Retry Scale, or rework on Invent.");
      renderDeployBay();
      renderChallengeHud();
      return;
    }
    state.lastDeployRoll = { stage: "scale", ok: true, pct: roll.pct, level: roll.level };

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
    // Hotseat: Scale → New normal; race ends only on full place hold
    if (hotseatBridge.isHotseat()) {
      const drop = Math.max(
        scaleStep.drop,
        state.stagedDropRemaining || state.stagedDropPool || 1
      );
      if (drop > 0) state.pressure = applyPressureDrop(state.pressure, drop);
      state.stagedDropRemaining = 0;
      state.dropScaleApplied = drop;
      const pool = Math.max(drop, state.stagedDropPool || 1);
      const nnExtra = (state.will ?? 0) >= 4 && pool >= 4 ? 1 : 0;
      if (nnExtra > 0) {
        state.pressure = applyPressureDrop(state.pressure, nnExtra);
        state.dropNewNormalApplied = nnExtra;
      }
      state.deployStage = "new_normal";
      snapshotTimingAtDeploy();
      const totalDrop = drop + nnExtra;
      state.lastNews = `Scaled → New normal. Shared crisis −${totalDrop}.`;
      mpSyncFromSolo();
      const sess = hotseatBridge.getSession();
      const aId = hotseatBridge.getActiveId();
      const vId = hotseatBridge.getViewId() || aId;
      const inventChallenge = sess?.invents?.[vId];
      if (inventChallenge) {
        inventChallenge.impactDropTotal = (inventChallenge.impactDropTotal || 0) + totalDrop;
        inventChallenge.successfulScales = (inventChallenge.successfulScales || 0) + 1;
        inventChallenge.deployStage = "new_normal";
        inventChallenge.scaledBySeatId = aId;
      }
      if (sess?.place) {
        sess.place.pressure = clonePressure(state.pressure);
      }
      const solved =
        sess?.place && isWin(sess.place.pressure, sess.place.mission?.winMax || {});
      if (solved && sess?.place) {
        sess.place.status = "won";
        if (inventChallenge) inventChallenge.landedSolvingScale = true;
        sess.ranking = rankSurvivors(sess);
        hotseatBridge.setSession(sess);
        flashToast(
          `Scale → New normal · crisis −${totalDrop} · Quest held — complete!`
        );
        const mpOutcome = buildHotseatMpOutcome(sess, {
          kind: "win",
          drop: totalDrop,
          inventSeatId: vId,
          fieldedBySeatId: aId,
        });
        leaveHotseat();
        finishOutcome("win", {
          drop: totalDrop,
          angle: state.challengeAngle,
          verdict: state.challengeVerdict,
          multiparty: true,
          mpOutcome,
        });
        return;
      }
      if (sess?.place) {
        sess.place.status = "playing";
        hotseatBridge.setSession(sess);
      }
      flashToast(
        `Scale → New normal · crisis −${totalDrop} · Quest improved — others may still deploy`
      );
      renderDeployBay();
      refreshAllPressureHuds();
      if (state.screen === "deploy") renderDeployHud();
      else if (state.screen === "workshop") {
        renderWorkshop();
        renderHud();
      } else renderChallengeHud();
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
    const kind = wonMission() ? "win" : "partial";
    state.lastNews =
      kind === "win"
        ? `Scale succeeded · New normal. Crisis −${totalDrop} total. Quest held — you win!`
        : `Scale succeeded · New normal. Crisis −${totalDrop} total. Quest improved (partial).`;
    state.waitReport = "";
    // Clear, explicit win/lose feedback (was easy to miss)
    flashToast(
      kind === "win"
        ? `Scale succeeded · crisis −${totalDrop} · Quest held — you win!`
        : `Scale succeeded · crisis −${totalDrop} · Quest improved (partial)`
    );
    renderDeployBay();
    refreshAllPressureHuds();
    if (state.screen === "deploy") renderDeployHud();
    else renderChallengeHud();
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

/**
 * Apply local unlock after owner reopens invent (Challenge + Pilot progress cleared).
 * Server/session is source of truth in multiplayer; this is optimistic + solo.
 */
function applyLocalReopenInvent() {
  state.challengePassed = false;
  state.challengeLocked = false;
  state.deployUnlocked = false;
  state.deployStage = "none";
  state.turnPhase = "act";
  state.stagedDropPool = 0;
  state.stagedDropRemaining = 0;
  state.dropPilotApplied = 0;
  state.dropScaleApplied = 0;
  state.dropNewNormalApplied = 0;
  state.deployFieldPaid = false;
  state.stagedDropParts = null;
  state.lastDeployRoll = null;
  state.scrutiny = null;
  state.challengeText = "";
  state.challengeQuestion = "";
  state.challengeAngle = null;
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVisionBeat = null;
  state.challengePosePending = false;
  state.challengeRevealPending = false;
  state.challengeSpectator = false;
  state.challengeJudging = false;
  document.body.classList.remove(
    "challenge-spectator",
    "challenge-pose-pending",
    "challenge-reveal-pending"
  );
  setChallengePoseBusy(false, { judging: false });
  hideAllModePanels();
  if (state.mp) {
    state.mp.inventLocked = false;
    state.mp.forgePhase = "invent";
    state.mp.canContributeStory = true;
    state.mp.canEditStack = true;
    state.mp.canRunDeploy = false;
    state.mp.canFaceChallenge = true;
  }
  syncWriteSnapshotFromState();
}

/**
 * Owner reopens invent after Challenge / mid-Challenge / Pilot deploy.
 * Unlocks story + stack so helpers can contribute; clears Challenge pass & Pilot.
 * @param {{ source?: "deploy"|"challenge"|"hud", confirm?: boolean }} [opts]
 */
function reopenInventToWorkshop(opts = {}) {
  const source = opts.source || "deploy";
  const b = mpBridge();

  // Helper / spectator: leave bay or challenge view only — cannot unlock owner's invent
  if (b?.viewingOther?.() || isChallengeWatchOnly()) {
    if (state.challengeSpectator) {
      leaveChallengeSpectatorIfNeeded({ force: true, forceWorkshop: true });
    } else {
      openWorkshopForViewedInvent(b);
    }
    flashToast(
      "Back on invent view — only the invent owner can abandon Challenge and unlock it for rework."
    );
    return;
  }

  // Must be owner's seat-turn in multiplayer
  if (b && !b.isMyTurn?.()) {
    flashToast("Not your turn — wait to abandon Challenge on your invent.");
    return;
  }

  if (isChallengeCombatBlocking()) {
    flashToast(inventActionBusyReason());
    return;
  }

  // Confirm when leaving an active fight (not when deploy already unlocked)
  if (
    opts.confirm !== false &&
    source === "challenge" &&
    !state.deployUnlocked &&
    state.turnPhase === "scrutiny"
  ) {
    const ok = window.confirm(
      "Abandon this Challenge?\n\n" +
        "Your invent unlocks for rework — others can contribute again. " +
        "Challenge progress is cleared. Facing the challenge again costs AP."
    );
    if (!ok) return;
  }

  const doneMsg =
    source === "challenge"
      ? "Challenge abandoned — invent unlocked. Helpers can contribute. Face the challenge again when ready (costs AP)."
      : "Invent reopened — Challenge & Pilot progress cleared. Edit freely (helpers can layer). Face the challenge again when ready.";

  if (roomBridge.isRoom()) {
    try {
      roomBridge.send({
        type: "reopen_invent",
        payload: { targetSeatId: roomBridge.myId() || roomBridge.getViewId() },
      });
    } catch (e) {
      flashToast(mpFriendlyError(e.message) || "Could not abandon Challenge");
      return;
    }
    applyLocalReopenInvent();
    // reopen_invent patch already notifies followers — do not sync_challenge_view (not_in_challenge)
    showScreen("workshop");
    renderWorkshop();
    applyStoryFieldLocks();
    applyEndTurnChrome();
    updateChallengeButton();
    flashToast(doneMsg);
    return;
  }

  if (hotseatBridge.isHotseat()) {
    const r = hotseatBridge.reopenInvent?.();
    if (!r?.ok) {
      flashToast(mpFriendlyError(r?.error) || "Could not abandon Challenge");
      return;
    }
    applyLocalReopenInvent();
    hotseatBridge.hydrateSoloState?.(state, { global: state.global });
    showScreen("workshop");
    renderWorkshop();
    applyStoryFieldLocks();
    applyEndTurnChrome();
    updateChallengeButton();
    flashToast(doneMsg);
    return;
  }

  // Solo: unlock locally
  applyLocalReopenInvent();
  if (apEnabled() && state.turnPhase === "scrutiny") {
    dispatchSim("abandon_scrutiny");
  }
  state.turnPhase = "act";
  showScreen("workshop");
  renderWorkshop();
  applyStoryFieldLocks();
  updateChallengeButton();
  flashToast(
    source === "challenge"
      ? "Challenge abandoned — invent unlocked. Rework, then Face the challenge again (costs AP)."
      : "Invent reopened — Challenge & Pilot progress cleared. Rework, then Face the challenge again."
  );
}

/**
 * "Back to invent" from Deploy bay — owner reopens; helpers only leave the view.
 */
function returnToInventFromDeploy() {
  reopenInventToWorkshop({ source: "deploy", confirm: false });
}

/**
 * Owner abandons mid-Challenge (Face Challenge fight) → invent unlocked.
 */
function abandonChallengeToInvent() {
  reopenInventToWorkshop({ source: "challenge", confirm: true });
}

/**
 * Show/hide Abandon Challenge for invent owner during live Face Challenge (not deploy bay).
 */
function updateChallengeAbandonButton() {
  const btn = $("#btn-challenge-abandon");
  if (!btn) return;
  const b = mpBridge();
  const watchOnly = isChallengeWatchOnly();
  const inDeploy = Boolean(state.deployUnlocked && state.challengePassed);
  // Mid-challenge (or failed-locked view on challenge screen) for owner only
  const midFight =
    !inDeploy &&
    (state.turnPhase === "scrutiny" ||
      state.challengeLocked ||
      Boolean(state.scrutiny) ||
      document.body.classList.contains("screen-challenge") ||
      state.screen === "challenge-step");
  const ownerOnOwn =
    !watchOnly &&
    (!b || (b.isMyTurn?.() && !b.viewingOther?.()));
  const show = midFight && ownerOnOwn && state.screen === "challenge-step" && !inDeploy;
  btn.hidden = !show;
  if (!show) return;
  const busy = isChallengeCombatBlocking() || isInventActionBusy();
  btn.disabled = busy;
  btn.title = busy
    ? inventActionBusyReason()
    : "Leave Challenge and unlock invent for rework — helpers can contribute again. Facing again costs AP.";
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
    report.highlights = [
      ...(report.highlights || []),
      "Sidestep used this mission (−15 elegance).",
    ];
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
  const inventChallenge = inventId ? sess.invents?.[inventId] : null;
  const inventName =
    inventChallenge?.inventionName ||
    state.inventionName ||
    "Untitled invention";
  const inventionHow =
    inventChallenge?.inventionHow || state.inventionHow || "";
  const inventionImpact =
    inventChallenge?.inventionImpact || state.inventionImpact || "";
  const forgeYears = (sess.seatOrder || [])
    .map((id) => sess.invents?.[id]?.year)
    .filter((y) => y != null);
  const latestInventYear = forgeYears.length
    ? Math.max(...forgeYears)
    : sess.place.year;
  return {
    multiparty: true,
    mode: "hotseat",
    kind: opts.kind || ranking?.kind || "partial",
    year: latestInventYear,
    place: sess.place.mission?.place || state.mission?.place || "",
    placeStatus: sess.place.status,
    drop: opts.drop || 0,
    inventSeatId: inventId,
    inventOwnerName: seatName(inventId),
    inventName,
    inventionHow: String(inventionHow || "").trim(),
    inventionImpact: String(inventionImpact || "").trim(),
    fieldedBySeatId: fieldedId,
    fieldedByName: seatName(fieldedId),
    ranking,
    seats: (sess.seatOrder || []).map((id) => {
      const f = sess.invents?.[id];
      const s = sess.seats?.find((x) => x.id === id);
      return {
        seatId: id,
        displayName: s?.displayName || id,
        inventionName: f?.inventionName || "",
        year: f?.year != null ? f.year : sess.place.year,
        waits: f?.waits ?? 0,
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
  // Enrich meta so outcome copy can tell defend vs sidestep vs essay
  const enriched = {
    ...meta,
    angle: meta.angle ?? state.challengeAngle ?? null,
    verdict: meta.verdict ?? state.challengeVerdict ?? state.lastChallengeVerdict ?? null,
    sidestep: Boolean(
      meta.sidestep ||
        state.elegancePivotPenalty ||
        state.challengeClearMode === "sidestep" ||
        state.lastChallengeVerdict === "sidestep"
    ),
    clearMode:
      meta.clearMode ||
      state.challengeClearMode ||
      (state.elegancePivotPenalty ? "sidestep" : null),
  };
  // First solo win unlocks Workshop; multiparty (room/hotseat) never counts
  if (
    kind === "win" &&
    !enriched.multiparty &&
    !enriched.mpOutcome?.multiparty
  ) {
    try {
      markSparkCompleted();
    } catch {
      /* private mode / missing storage */
    }
  }
  const report = features().runReport ? buildRunReport(kind, enriched) : null;
  state.runReport = report;
  if (report && state.mission?.id) persistRunReport(state.mission.id, report);
  // Snapshot invent vision now (before any screen teardown clears panels)
  const visionSnap = collectVisionForShare();
  // Collapse / abandon does not mark solved — only deploy paths above do
  state.outcome = {
    kind,
    meta: enriched,
    techs,
    year: state.year,
    turn: state.turn,
    waits: state.waits || 0,
    pressure: clonePressure(state.pressure),
    // Snapshot invent faces for share card (How it works / Everyday life)
    inventionHow: String(state.inventionHow || "").trim(),
    inventionImpact: String(state.inventionImpact || "").trim(),
    inventionName: String(state.inventionName || "").trim(),
    visionUrl: visionSnap.url || "",
    runReport: report,
    mpOutcome: enriched.mpOutcome || state.mpOutcome || null,
  };
  state.mpOutcome = state.outcome.mpOutcome;
  showScreen("outcome");
  applyOutcomeNextChallengeChrome();
}

/** Any friends/hotseat multiparty outcome (not free solo invent). */
function isMultipartyOutcome() {
  const mp = state.outcome?.mpOutcome || state.mpOutcome;
  return Boolean(mp?.multiparty || state.outcome?.meta?.multiparty);
}

/** Friends room outcome: winner picks next theme; others wait. */
function isRoomMultipartyOutcome() {
  const mp = state.outcome?.mpOutcome || state.mpOutcome;
  return Boolean(isMultipartyOutcome() && mp?.mode === "room");
}

function isHotseatMultipartyOutcome() {
  if (!isMultipartyOutcome()) return false;
  const mp = state.outcome?.mpOutcome || state.mpOutcome;
  // After collapse we clear the live hotseat session — still treat outcome as hotseat via mode
  return mp?.mode === "hotseat" || (mp?.mode !== "room" && Boolean(mp?.multiparty));
}

function nextQuestChooserIsMe() {
  if (!isRoomMultipartyOutcome()) return false;
  const client = roomBridge.client?.();
  const me = client?.snapshot?.you?.id || roomBridge.myId?.() || client?.session?.playerId;
  const mp = state.outcome?.mpOutcome || state.mpOutcome;
  const chooser =
    client?.snapshot?.nextQuestChooserId ||
    mp?.nextQuestChooserId ||
    mp?.ranking?.rows?.[0]?.seatId ||
    null;
  return Boolean(me && chooser && me === chooser);
}

function nextQuestChooserName() {
  const client = roomBridge.client?.();
  const mp = state.outcome?.mpOutcome || state.mpOutcome;
  const chooserId =
    client?.snapshot?.nextQuestChooserId ||
    mp?.nextQuestChooserId ||
    mp?.ranking?.rows?.[0]?.seatId;
  if (!chooserId) return "the winner";
  const p = (client?.snapshot?.players || []).find((x) => x.id === chooserId);
  return p?.displayName || mp?.ranking?.rows?.[0]?.displayName || "the winner";
}

function setOutcomeBtnVisible(el, on) {
  if (!el) return;
  el.hidden = !on;
  if (on) el.removeAttribute("hidden");
  else el.setAttribute("hidden", "");
  el.disabled = !on;
}

function applyOutcomeNextChallengeChrome() {
  const retry = $("#btn-outcome-retry");
  const neu = $("#btn-outcome-new");
  const pick = $("#btn-outcome-rematch-pick");
  const wait = $("#outcome-rematch-wait");
  const leave = $("#btn-outcome-leave-room");
  const hint = $("#outcome-actions-hint");
  const roomMp = isRoomMultipartyOutcome();
  const hotseatMp = isHotseatMultipartyOutcome() && !roomMp;
  const multi = roomMp || hotseatMp || isMultipartyOutcome();
  const kind = state.outcome?.kind || "partial";

  const setHint = (text) => {
    if (!hint) return;
    if (!text) {
      hint.hidden = true;
      hint.textContent = "";
      return;
    }
    hint.hidden = false;
    hint.textContent = text;
  };

  // Solo-only actions — never show after friends / hotseat Challenges
  // Multiplayer outcome only on full win or collapse (partial Scale stays in play).
  if (multi) {
    setOutcomeBtnVisible(retry, false);
    setOutcomeBtnVisible(neu, false);
    // Hard-hide so solo labels never sit disabled next to Challenge-chooser controls
    if (retry) {
      retry.style.display = "none";
      retry.textContent = "Continue this Quest";
    }
    if (neu) {
      neu.style.display = "none";
      neu.textContent = "Leave Quest";
    }
  } else {
    if (retry) retry.style.display = "";
    if (neu) neu.style.display = "";
  }

  if (roomMp) {
    setOutcomeBtnVisible(leave, true);
    leave.textContent = "Leave room";
    leave.title = "Leave this room (others can choose the next Quest without you)";
    const iAmChooser = nextQuestChooserIsMe();
    const placeStatus =
      (state.outcome?.mpOutcome || state.mpOutcome)?.placeStatus || kind;
    const leftByVote =
      placeStatus === "abandoned_by_vote" ||
      Boolean(state.outcome?.meta?.leftByVote);
    if (pick) {
      setOutcomeBtnVisible(pick, iAmChooser);
      if (iAmChooser) {
        pick.disabled = false;
        pick.textContent =
          placeStatus === "collapsed" || kind === "collapse"
            ? "Choose next Quest (host) →"
            : leftByVote
              ? "Choose next Quest (host) →"
              : "Choose next Quest →";
        pick.title = "Pick the next Quest for everyone still in the room";
      }
    }
    if (wait) {
      if (iAmChooser) {
        setOutcomeBtnVisible(wait, false);
        wait.textContent = "";
        setHint(
          kind === "collapse"
            ? "Quest collapsed. You choose the next Quest for the room."
            : leftByVote
              ? "Table voted to leave. You choose the next Quest for the room."
              : "Quest held. You pick the next Quest for everyone still in the room."
        );
      } else {
        setOutcomeBtnVisible(wait, true);
        wait.textContent = `Waiting for ${nextQuestChooserName()} to choose the next Quest… Stay in the room.`;
        setHint("Challenge over — only the chooser starts the next Quest.");
      }
    }
    return;
  }

  if (hotseatMp || multi) {
    // Hotseat (or other multiparty): no solo invent continuum — back to friends lobby
    setOutcomeBtnVisible(pick, false);
    setOutcomeBtnVisible(wait, false);
    setOutcomeBtnVisible(leave, true);
    leave.textContent = hotseatMp ? "Back to friends" : "Leave";
    setHint(
      kind === "collapse"
        ? "Quest collapsed — no champion. Start another Quest from Friends."
        : "Quest complete. Return to Friends to play again."
    );
    return;
  }

  // —— Solo only ——
  setOutcomeBtnVisible(pick, false);
  setOutcomeBtnVisible(wait, false);
  setOutcomeBtnVisible(leave, false);
  setOutcomeBtnVisible(neu, true);

  if (kind === "partial") {
    // Optional continue: crisis still hot, same Challenge
    setOutcomeBtnVisible(retry, true);
    retry.textContent = "Continue this Quest";
    retry.title =
      "Same Challenge — crisis meters as left after deploy. Face Challenge again to field another step.";
    neu.textContent = "Leave Quest";
    neu.title = "Pick another theme / Challenge";
    neu.classList.remove("btn-primary");
    neu.classList.add("btn-secondary");
    retry.classList.add("btn-primary");
    retry.classList.remove("btn-secondary");
    setHint("Not fully solved — keep working this Quest, or leave for another.");
  } else if (kind === "win") {
    setOutcomeBtnVisible(retry, true);
    retry.textContent = "Review invent";
    retry.title = "Return to the workshop (Challenge already held)";
    neu.textContent = "New Quest";
    neu.title = "Pick another theme / Challenge";
    neu.classList.add("btn-primary");
    neu.classList.remove("btn-secondary");
    retry.classList.add("btn-secondary");
    retry.classList.remove("btn-primary");
    setHint("Quest held. Take what you learned to another Quest.");
  } else if (kind === "collapse") {
    const bankrupt = Boolean(state.outcome?.meta?.bankrupt);
    setOutcomeBtnVisible(retry, true);
    retry.textContent = "Retry this Quest";
    retry.title = "Restart this Quest from the beginning";
    neu.textContent = "New Quest";
    neu.title = "Pick another theme / Challenge";
    neu.classList.add("btn-primary");
    neu.classList.remove("btn-secondary");
    retry.classList.add("btn-secondary");
    retry.classList.remove("btn-primary");
    setHint(
      bankrupt
        ? "Out of capital. Restart this Quest leaner, or try a different one."
        : "Too late here. Retry this Quest or start a new one."
    );
  } else {
    setOutcomeBtnVisible(retry, true);
    retry.textContent = "Continue this Quest";
    neu.textContent = "Leave Quest";
    setHint("");
  }
}

/**
 * Crisis meters vs winMax for outcome banner chips.
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} winMax
 */
function buildOutcomeMeterGaps(pressure, winMax) {
  const p = pressure || {};
  const w = winMax || {};
  const keys = Object.keys({ ...p, ...w });
  if (!keys.length) return [];
  return keys.map((k) => {
    const cur = Number(p[k] ?? 0);
    const need = w[k] != null ? Number(w[k]) : null;
    let status = "ok";
    if (need == null) status = cur >= 4 ? "hot" : "ok";
    else if (cur <= need) status = "ok";
    else if (cur >= 5) status = "fail";
    else status = "hot";
    return { key: k, cur, need, status };
  });
}

/**
 * Paint unmissable full/partial/collapse banner on outcome screen.
 * @param {object} o — state.outcome
 * @param {object|null} m — mission
 */
function renderOutcomeResultBanner(o, m) {
  const banner = $("#outcome-result-banner");
  if (!banner || !o) return;
  const kicker = $("#outcome-result-kicker");
  const title = $("#outcome-result-title");
  const sub = $("#outcome-result-sub");
  const gapsEl = $("#outcome-meter-gaps");
  const kind = o.kind || "partial";
  const multiparty = Boolean(o.mpOutcome?.multiparty || o.meta?.multiparty || o.meta?.mpOutcome?.multiparty);
  const pressure = o.pressure || state.pressure || {};
  const winMax = m?.winMax || {};
  const gaps = buildOutcomeMeterGaps(pressure, winMax);

  banner.hidden = false;
  banner.dataset.kind =
    kind === "win" ? "win" : kind === "collapse" ? "collapse" : "partial";

  if (kind === "win") {
    if (kicker) kicker.textContent = multiparty ? "Friends · Quest held" : "Solo · Quest held";
    if (title) title.textContent = "Quest held";
    if (sub) {
      // Plain English: meters 0–5 must each be ≤ this Quest’s goal (shown as “goal ≤N”)
      sub.textContent = multiparty
        ? "Every shared crisis meter is at or below its goal for this Quest. The Quest is over — players are ranked by score below."
        : "Every crisis meter is at or below its goal for this Quest. You fully held the line.";
    }
  } else if (kind === "partial" && (o.meta?.leftByVote || o.mpOutcome?.kind === "abandoned_by_vote")) {
    if (kicker) kicker.textContent = multiparty ? "Friends · left by vote" : "Left by vote";
    if (title) title.textContent = "Table left the Quest";
    if (sub) {
      sub.textContent = multiparty
        ? "A strict majority voted to leave this Quest. Host picks the next one — the game continues in the room."
        : "You left this Quest. Pick another when ready.";
    }
  } else if (kind === "partial") {
    if (kicker) kicker.textContent = "Solo · not fully solved";
    if (title) title.textContent = "Crisis still hot";
    if (sub) {
      sub.textContent =
        "You fielded a New normal and eased pressure — but at least one crisis meter is still above its goal. " +
        "Continue this Quest to push further, or leave for another.";
    }
  } else if (kind === "collapse" && o.meta?.bankrupt) {
    if (kicker) kicker.textContent = "Solo · out of capital";
    if (title) title.textContent = "Budget hit 0$";
    if (sub) {
      sub.textContent =
        "The project went broke before a full solve. Restart leaner or try a new Challenge.";
    }
  } else if (kind === "collapse") {
    if (kicker) {
      kicker.textContent = multiparty
        ? "Friends · Quest collapsed"
        : "Solo · too late";
    }
    if (title) title.textContent = multiparty ? "Quest collapsed — no champion" : "Too late";
    if (sub) {
      sub.textContent = multiparty
        ? "The shared crisis got too bad (a meter hit 5, or every invent waited past the fail year). Everyone loses — no player ranking."
        : "Crisis passed what a late invent could fix.";
    }
  } else {
    if (kicker) kicker.textContent = "Outcome";
    if (title) title.textContent = "Quest paused";
    if (sub) sub.textContent = "";
  }

  if (gapsEl) {
    const showGaps = kind === "partial" || kind === "win" || (kind === "collapse" && !o.meta?.bankrupt);
    if (!showGaps || !gaps.length) {
      gapsEl.hidden = true;
      gapsEl.innerHTML = "";
    } else {
      gapsEl.hidden = false;
      gapsEl.innerHTML = gaps
        .map((g) => {
          // “goal ≤N” = mission winMax for that meter (what “full win” requires)
          const needBit =
            g.need != null ? ` · goal ≤${g.need}` : "";
          const mark =
            g.status === "ok" ? "✓" : g.status === "fail" ? "!" : "·";
          const tip =
            g.need != null
              ? `${g.key}: now ${g.cur} (full win needs ≤${g.need})`
              : `${g.key}: ${g.cur}`;
          return `<li class="outcome-meter-gap is-${g.status}" title="${escapeHtml(
            tip
          )}"><span>${mark}</span> <strong>${escapeHtml(
            g.key
          )}</strong> ${g.cur}${needBit}</li>`;
        })
        .join("");
    }
  }
}

/**
 * Challenge chooser (solver, or host after collapse) picks the next Quest for the room.
 */
function launchRoomNextChallengePick() {
  if (!isRoomMultipartyOutcome()) {
    showScreen("global");
    return;
  }
  if (!nextQuestChooserIsMe()) {
    flashToast(`Only ${nextQuestChooserName()} chooses the next Quest.`);
    return;
  }
  const client = roomBridge.client?.();
  if (!client) {
    flashToast("Room connection lost — rejoin from Friends.");
    return;
  }
  beginMissionPick({
    onSelect: async (mission, global) => {
      try {
        await client.hostCmd("set_quest", {
          globalId: global?.id || mission.globalId,
          mission,
        });
        await client.hostCmd("start_quest", {
          globalId: global?.id || mission.globalId,
          mission,
        });
        // Snapshot / next_quest_started will re-enter play (force when key changes)
        flashToast(`Next race: ${mission.title}`);
        if (client.snapshot?.phase === "playing" || client.snapshot?.mp?.place) {
          setTimeout(() => enterRoomPlay(client, { force: true }), 0);
        }
      } catch (e) {
        flashToast(e.message || "Could not start next Quest");
        showScreen("outcome");
        applyOutcomeNextChallengeChrome();
      }
    },
    onCancel: () => {
      showScreen("outcome");
      applyOutcomeNextChallengeChrome();
    },
  });
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
    if (title) title.textContent = "Quest collapsed — no champion";
    if (lead) {
      lead.textContent = `${mp.place || "This Challenge"} collapsed. The shared crisis ended the Challenge for every player — rankings only apply when the Challenge is held.`;
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
      legend.textContent =
        "Everyone lost the Challenge. Try again with tighter timing or earlier Scale.";
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
      `.${fielded} Player ranking (40% impact · 25% craft · 20% help · 15% race):`;
  }
  if (list) {
    list.innerHTML = rows
      .map((r) => {
        const badges = [];
        if (r.landedSolvingScale) badges.push('<span class="tag tag-win">held Challenge</span>');
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

/**
 * Best AI invent vision for outcome / share card.
 * Uses getAttribute("src") — never bare `.src` (empty src resolves to the page URL).
 * @returns {{ url: string, image: HTMLImageElement|null }}
 */
function collectVisionForShare() {
  /** @type {HTMLImageElement[]} */
  const imgs = [
    $("#outcome-vision-image"),
    document.querySelector("#vision-root .vision-image"),
    document.querySelector("#challenge-vision-root .vision-image"),
    state.vision?.getDecodedImage?.() || null,
    state.vision?.img || null,
  ].filter(Boolean);

  // Prefer a decoded bitmap (canvas-safe, no re-fetch)
  for (const img of imgs) {
    if (img.naturalWidth > 0 && visionUrlFromImg(img)) {
      return { url: visionUrlFromImg(img), image: img };
    }
  }

  const fromRenderer =
    state.vision?.getShareableUrl?.() ||
    (isUsableVisionUrl(state.vision?.currentUrl) ? state.vision.currentUrl : "") ||
    "";
  if (fromRenderer) return { url: fromRenderer, image: null };

  for (const img of imgs) {
    const u = visionUrlFromImg(img);
    if (u) return { url: u, image: img.naturalWidth > 0 ? img : null };
  }

  const cached = state.outcome?.visionUrl || state.sharePayload?.visionUrl || "";
  if (isUsableVisionUrl(cached)) return { url: cached, image: null };
  return { url: "", image: null };
}

/**
 * Copy invent vision onto the outcome panel for display + share.
 * @param {object} [m] mission
 * @param {object} [o] outcome
 */
function paintOutcomeVision(m, o) {
  const img = $("#outcome-vision-image");
  if (!img) return;
  const snap = collectVisionForShare();
  const url = snap.url;
  if (!url) {
    // Leave prior frame if any; don't force-clear (share may still use payload)
    const status = $("#outcome-vision-status");
    if (status && !visionUrlFromImg(img)) {
      status.textContent = "No invent vision captured for this run.";
    }
    return;
  }
  img.hidden = false;
  if (img.getAttribute("src") !== url && img.src !== url) {
    img.src = url;
  }
  const status = $("#outcome-vision-status");
  if (status) {
    const place = m?.place || state.mission?.place || "";
    const year = o?.year ?? state.year;
    status.textContent = place
      ? `Vision of ${place}${year != null ? `, ${year}` : ""}`
      : "Invention vision";
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
  $("#outcome-meta").textContent = `${m?.place || "—"} · ${o.year} · Turn ${o.turn} · waits ${
    o.waits ?? state.waits ?? 0
  } · ${state.global?.title || ""}${mp?.multiparty ? " · Friends / hotseat" : ""}`;

  // Unmissable full / partial / collapse strip (meters vs mission goals)
  renderOutcomeResultBanner(o, m);

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
        <div class="run-scores muted">Player ranking for this race — full table below</div>`;
    } else {
      starsEl.hidden = true;
      starsEl.innerHTML = "";
    }
  }

  renderMpOutcomeStandings(mp);

  // AI invent vision → outcome panel + share card payload
  paintOutcomeVision(m, o);

  let headline = "Holding the line";
  let story = "";
  const lessons = [];

  if (o.kind === "win" && mp?.multiparty) {
    const winner = mp.ranking?.rows?.[0];
    headline = winner ? `${winner.displayName} leads — Quest held` : "Quest held";
    story =
      `In ${o.year}, “${name}” (${mp.inventOwnerName || "a player"}) Scaled in ${m.place}` +
      (mp.drop ? ` and cut crisis by ${mp.drop}` : "") +
      `. Crisis meters are at their goals, so the Challenge is held and play ends for this crisis. Players are ranked by how they played (not story characters).` +
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
      text: "Player rank = 40% crisis impact + 25% craft (challenge) + 20% help given + 15% race to Scale.",
    });
    lessons.push({
      type: "grow",
      text: "If the place had collapsed, there would be no champion — only a shared loss.",
    });
  } else if (o.kind === "win") {
    headline = "Crisis eased";
    const sidestepped = Boolean(o.meta?.sidestep);
    story =
      `In ${o.year}, ${name} landed in ${m.place}. Crisis meters fell enough for people to breathe. ` +
      (sidestepped
        ? `You sidestepped a ${o.meta?.angle || "challenge"} challenger (once per mission), then deployed. `
        : `You faced a ${o.meta?.angle || "challenge"} attack, then deployed. `) +
      (state.inventionImpact.trim()
        ? `Everyday life: ${state.inventionImpact.trim()}`
        : "A local face of a global problem got smaller.");
    if (sidestepped) {
      lessons.push({
        type: "grow",
        text: `Challenge (${o.meta?.angle || "stress-test"}): sidestepped — you bought past the critic (1 AP + 1 Will). Deploy unlocked, but elegance softens.`,
      });
    } else {
      lessons.push({
        type: "good",
        text: `Challenge (${o.meta?.angle || "stress-test"}): ${state.challengeVerdict || "passed"}.`,
      });
    }
    lessons.push({
      type: "good",
      text: `Timing: deployed with feasible claims in ${o.year}, before fail year ${m.collapseYear}.`,
    });
    lessons.push({
      type: "good",
      text: `Local → global: ${m.place} is one face of “${state.global?.title || "the larger problem"}”.`,
    });
  } else if (o.kind === "partial") {
    headline = "Not fully solved";
    story =
      `In ${o.year}, ${name} went live in ${m.place} and eased pressure (−${o.meta?.drop || "?"} on the meters), but at least one crisis meter is still above its goal for a full win. ` +
      `Continue this Quest to invent another step against the remaining crisis, or leave for a different Quest. ` +
      `(In friends multiplayer, a partial Scale would not open this screen — the Challenge keeps going until every meter meets its goal.)`;
    lessons.push({
      type: "grow",
      text: "Solo partial: optional continue. Multiplayer: partial Scales accumulate on the shared crisis until someone fully holds the Challenge.",
    });
    if (o.meta?.sidestep) {
      lessons.push({
        type: "grow",
        text: `You sidestepped the ${o.meta.angle || "challenge"} challenger before deploying — a paid dodge (once per mission), not a defended answer.`,
      });
    } else if (o.meta?.angle) {
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
    headline = "Quest collapsed — no champion";
    story =
      `Crisis in ${m.place} broke the Challenge` +
      (o.year ? ` (earliest invent year ${o.year})` : "") +
      `. In friends play everyone loses when the *shared* crisis collapses — meters maxed, or every invent calendar past the fail year. ` +
      `One player Waiting late does not end the Challenge alone while others still invent in the present. ` +
      `There is no winner ranking, only what each invent learned before the end.`;
    lessons.push({
      type: "grow",
      text: "Shared crisis meters still rise on any Wait — meters at 5 end the table for everyone.",
    });
    lessons.push({
      type: "grow",
      text: "Calendar fail is unanimous: the Challenge only times out when every invent has waited to the fail year. Late solo waits do not sink teammates still working in the present.",
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
    story = "You left the invent. The calendar in that place keeps moving without you.";
  }

  $("#outcome-headline").textContent = headline;
  $("#outcome-story").textContent = story;
  $("#outcome-lessons").innerHTML = lessons
    .map((l) => `<li class="${l.type}">${escapeHtml(l.text)}</li>`)
    .join("");

  // Cache share payload for the Share card button (vision re-resolved on click)
  const visionSnap = collectVisionForShare();
  // Prefer solving invent texts when multiparty captured them; else local faces
  const inventionHow = String(
    mp?.inventionHow || o.inventionHow || state.inventionHow || ""
  ).trim();
  const inventionImpact = String(
    mp?.inventionImpact || o.inventionImpact || state.inventionImpact || ""
  ).trim();
  const pressure = o.pressure || state.pressure || {};
  const winMax = m?.winMax || {};
  state.sharePayload = {
    kind: o.kind,
    kindLabel: kindLabelForOutcome(o.kind, o.meta),
    inventionName: name,
    inventionHow,
    inventionImpact,
    place: m.place,
    year: o.year,
    globalTitle: state.global?.title || "",
    stars: report?.stars ?? 0,
    speedScore: report?.speedScore,
    honestyScore: report?.honestyScore,
    eleganceScore: report?.eleganceScore,
    blurb: story,
    techs: (o.techs || selectedTechs() || [])
      .map((t) => ({
        id: t.id || t.name,
        name: t.name || t.id || "",
        icon: t.icon || "◆",
      }))
      .filter((t) => t.name),
    pressure: { ...pressure },
    winMax: { ...winMax },
    visionUrl: visionSnap.url || o.visionUrl || "",
  };
  if (visionSnap.url) o.visionUrl = visionSnap.url;

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
/**
 * Shared Imagine session per invent in a friends room so A and B see the same
 * server-cached frame (no WS image bytes, no force-on-every-render).
 */
function mpSharedVisionSessionId(seatId) {
  if (!roomBridge.isRoom()) return null;
  const client = roomBridge.client?.();
  const code =
    state.mp?.code || client?.session?.code || client?.snapshot?.code || "room";
  const sid = seatId || roomBridge.getViewId() || roomBridge.myId() || "seat";
  return `room-${String(code).slice(0, 24)}-seat-${String(sid).slice(0, 40)}`;
}

/** Content key for the invent currently on screen (skip redundant Imagine calls). */
function visionContentKey() {
  const techs = (state.selectedTechIds || []).slice().sort().join(",");
  const beat = state.challengeVisionBeat;
  const beatBit = beat
    ? `${beat.angle || ""}|${beat.phase || ""}|${beat.move || ""}|${String(beat.response || "").slice(0, 80)}`
    : "";
  // Include host visionRev so followers re-peek when owner finishes a new frame
  const viewId = roomBridge.isRoom() ? roomBridge.getViewId() || "" : "solo";
  const vRev =
    roomBridge.isRoom() && viewId
      ? roomBridge.invent?.(viewId)?.visionRev || state.mpVisionRev || 0
      : 0;
  return [
    viewId,
    state.mission?.id || "",
    state.year || "",
    state.deployStage || "",
    techs,
    (state.inventionName || "").trim(),
    (state.inventionHow || "").replace(/\s+/g, " ").trim().slice(0, 400),
    (state.inventionImpact || "").replace(/\s+/g, " ").trim().slice(0, 400),
    beatBit,
    `rev:${vRev}`,
  ].join("¦");
}

/** Rate-limit owner → room "frame ready" so followers re-peek the shared cache. */
let lastVisionPublishAt = 0;
function roomPublishVisionReady(meta = {}) {
  if (!roomBridge.isRoom()) return;
  if (roomVisionFollowOnly()) return;
  const me = roomBridge.myId?.();
  const targetSeatId = roomBridge.getViewId() || me;
  // Only invent owner (or active seat) may publish — avoids reject spam in logs
  const mayPublish =
    Boolean(me && targetSeatId && me === targetSeatId) ||
    Boolean(roomBridge.isMyTurn?.());
  if (!mayPublish) return;
  const now = Date.now();
  if (now - lastVisionPublishAt < 1500) return;
  lastVisionPublishAt = now;
  try {
    roomBridge.send({
      type: "sync_vision",
      payload: {
        targetSeatId,
        sessionId: meta.sessionId || mpSharedVisionSessionId(targetSeatId),
      },
    });
  } catch {
    /* offline */
  }
}

/**
 * Soft poll while viewing someone else's invent — only if we still have no frame.
 * Once we have a shared image, vision_sync is enough (no loading flicker).
 */
let roomFollowVisionPoll = null;
function startRoomFollowVisionPoll() {
  stopRoomFollowVisionPoll();
  if (!roomBridge.isRoom() || !roomVisionFollowOnly()) return;
  roomFollowVisionPoll = setInterval(() => {
    if (!roomBridge.isRoom() || !roomVisionFollowOnly()) {
      stopRoomFollowVisionPoll();
      return;
    }
    // Already showing their invent — rely on vision_sync for updates
    if (state.vision?.currentUrl) return;
    lastRoomVisionKey = "";
    roomVisionPendingKey = "";
    if (state.vision) state.vision.lastFingerprint = "";
    scheduleRoomVisionRefresh({ immediate: true });
  }, 4000);
}
function stopRoomFollowVisionPoll() {
  if (roomFollowVisionPoll) {
    clearInterval(roomFollowVisionPoll);
    roomFollowVisionPoll = null;
  }
}

/** True if we should only peek the shared cache (not generate a new image). */
function roomVisionFollowOnly() {
  if (!roomBridge.isRoom()) return false;
  if (state.challengeSpectator) return true;
  const me = roomBridge.myId();
  const view = roomBridge.getViewId();
  return Boolean(me && view && me !== view);
}

let lastRoomVisionKey = "";
let roomVisionScheduleTimer = null;
let roomVisionPendingKey = "";
/** Last invent seat we painted into state — detect view switches */
let lastHydratedViewSeatId = null;

/**
 * Debounced room vision — only when invent content / seat actually changed.
 * Does NOT reset the timer on every WS patch (that prevented generation forever).
 */
function scheduleRoomVisionRefresh(opts = {}) {
  if (!roomBridge.isRoom()) return;
  const key = visionContentKey();
  // Already showing this invent frame
  if (!opts.force && key === lastRoomVisionKey && state.vision?.currentUrl) return;
  // Same content already queued — leave the pending timer alone
  if (!opts.force && roomVisionScheduleTimer && roomVisionPendingKey === key) return;

  roomVisionPendingKey = key;
  clearTimeout(roomVisionScheduleTimer);
  const delay = opts.immediate ? 250 : 1100;
  roomVisionScheduleTimer = setTimeout(() => {
    roomVisionScheduleTimer = null;
    roomVisionPendingKey = "";
    try {
      updateVision({
        // Short inner debounce — outer schedule already waited
        debounceMs: opts.immediate ? 80 : 200,
        force: Boolean(opts.force),
        context: opts.context,
        immediate: Boolean(opts.immediate),
      });
    } catch (e) {
      console.warn("[room vision]", e);
    }
  }, delay);
}

/**
 * Snap view to *your* invent. Only when explicitly forced (turn start / leave follow).
 * Do NOT auto-snap every patch while it is your turn — that blocked helpers from
 * staying on someone else's deploy-ready invent to Pilot/Scale.
 */
function ensureRoomViewSeatForLocalPlayer(opts = {}) {
  if (!roomBridge.isRoom()) return false;
  const me = roomBridge.myId();
  if (!me) return false;
  // Stay on follow when spectating challenge/deploy of someone else
  if (state.challengeSpectator && !opts.forceSelf) return false;
  const view = roomBridge.getViewId();
  if (view === me) return false;
  // Explicit only — never yank the active player off a helper deploy mid-turn
  if (!opts.forceSelf) return false;
  roomBridge.setViewSeat(me);
  return true;
}

/**
 * Map server invent.deployStage → solo workshop deployStage.
 * @param {string} [forgeStage]
 */
function soloDeployStageFromChallenge(forgeStage) {
  const map = {
    none: "none",
    pilot_ok: "pilot",
    pilot: "pilot",
    scaled: "scale",
    scale: "scale",
    new_normal: "new_normal",
  };
  return map[forgeStage] || "none";
}

/**
 * Open Pilot/Scale bay for the *viewed* invent as the active player (owner or helper).
 * Not spectator — Try Pilot / Scale enabled when canRunDeploy().
 * Challenge remains owner-only; invent is locked after Challenge pass.
 *
 * @param {object|null} invent
 * @param {{ helper?: boolean, ownerName?: string }} [opts]
 */
function enterDeployBayInteractive(invent, opts = {}) {
  // Clear combat/spectator locks — Deploy is a separate screen
  state.challengeSpectator = false;
  state.challengePosePending = false;
  challengeCombatBusy = false;
  document.body.classList.remove("challenge-spectator", "challenge-pose-pending");
  setChallengePoseBusy(false, { judging: false });

  state.challengePassed = true;
  state.deployUnlocked = true;
  state.turnPhase = "between_stages";
  state.scrutinyMoveMode = null;
  if (invent) {
    state.deployStage = soloDeployStageFromChallenge(invent.deployStage);
    if (invent.stagedDropPool != null) state.stagedDropPool = invent.stagedDropPool;
    state.stagedDropRemaining =
      invent.deployStage === "pilot_ok"
        ? invent.stagedDropPool || state.stagedDropRemaining || 0
        : invent.deployStage === "scaled" || invent.deployStage === "new_normal"
          ? 0
          : invent.stagedDropPool || state.stagedDropRemaining || 0;
    state.dropPilotApplied =
      invent.deployStage === "pilot_ok" ||
      invent.deployStage === "scaled" ||
      invent.deployStage === "new_normal"
        ? 1
        : 0;
    state.dropScaleApplied =
      invent.deployStage === "scaled" || invent.deployStage === "new_normal" ? 1 : 0;
    if (invent.deployStage === "new_normal" || invent.deployStage === "scaled") {
      state.stagedDropRemaining = 0;
    }
    if (invent.inventionName != null) state.inventionName = invent.inventionName || "";
    if (invent.inventionHow != null) state.inventionHow = invent.inventionHow || "";
    if (invent.inventionImpact != null) state.inventionImpact = invent.inventionImpact || "";
    if (invent.stack) {
      state.selectedTechIds = invent.stack.map((x) => x.techId || x);
    }
  }

  state.screen = "deploy";
  $$(".screen").forEach((el) =>
    el.classList.toggle("active", el.id === "screen-deploy")
  );

  const lead = $("#deploy-screen-lead");
  if (lead) {
    const who = opts.ownerName || "this invent";
    lead.textContent = opts.helper
      ? `Fielding ${who} — Pilot / Scale (you pay). Invent locked after Challenge.`
      : "Challenge cleared. Field this invent: Pilot, then Scale to update the shared crisis.";
  }
  const fb = $("#deploy-feedback");
  if (fb && !state.lastDeployRoll) {
    fb.hidden = true;
    fb.innerHTML = "";
  }

  syncPressureHudFromRoom();
  renderDeployBay();
  renderDeployHud();
  renderMpChrome();
  applyEndTurnChrome();
  applyDeployWatchOnlyLock();
  updateChallengeButton();
  setDeploySideTab(state.deploySideTab || "vision");
}

/**
 * On your seat-turn start: open Deploy if *your* invent already cleared Challenge,
 * otherwise workshop Invent. Do not dump a deploy-locked invent onto Invent as if
 * it were still writable.
 */
function openRoomTurnStartScreenForOwnInvent() {
  if (!roomBridge.isRoom() || !roomBridge.isMyTurn()) return;
  const me = roomBridge.myId();
  if (!me) return;
  roomBridge.setViewSeat(me);
  try {
    roomBridge.hydrateSoloState(state, { global: state.global });
  } catch {
    /* ignore */
  }
  syncWriteSnapshotFromState();
  lastHydratedViewSeatId = me;
  lastRoomVisionKey = "";
  const inv = roomBridge.invent(me);
  const finePhase =
    roomBridge.inventPhaseOf?.(me) || deriveInventPhase(inv) || "invent";
  if (finePhase === "deploy_ready" || finePhase === "scale_ready") {
    enterDeployBayInteractive(inv, {
      helper: false,
      ownerName: "your invent",
    });
    scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
    return;
  }
  if (finePhase === "challenge") {
    // Resume own mid-challenge on Challenge screen (not fail-locked)
    state.challengeSpectator = false;
    document.body.classList.remove("challenge-spectator");
    state.screen = "challenge-step";
    $$(".screen").forEach((el) =>
      el.classList.toggle("active", el.id === "screen-challenge-step")
    );
    renderChallengeStep();
    renderMpChrome();
    scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
    return;
  }
  // invent / challenge_locked / fielded / abandoned — workshop
  // (challenge_locked stays frozen; Face again / Reopen from invent UI)
  if (state.screen !== "workshop") {
    state.screen = "workshop";
    $$(".screen").forEach((el) =>
      el.classList.toggle("active", el.id === "screen-workshop")
    );
  }
  renderWorkshop();
  renderMpChrome();
  scheduleRoomVisionRefresh({ immediate: true });
}

/**
 * After hydrate / seat change: keep lastWriteSnapshot in sync so we don't
 * treat another player's prose as our "previous" edit (false contribution).
 */
function syncWriteSnapshotFromState() {
  state.lastWriteSnapshot = {
    name: state.inventionName || "",
    how: state.inventionHow || "",
    impact: state.inventionImpact || "",
  };
}

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

  const contentKey = visionContentKey();
  // Rooms: skip only when we already have a frame for this exact invent content
  if (roomBridge.isRoom() && !opts.force) {
    if (contentKey === lastRoomVisionKey && state.vision?.currentUrl) {
      return;
    }
  }

  ensureVision();
  if (!state.vision) return;

  const techs = selectedTechs();
  const stage = currentStage();
  const inventName = $("#vision-stage-name");
  const inventBlurb = $("#vision-stage-blurb");
  if (inventName) inventName.textContent = `${stage.name} · ${state.year}`;
  if (inventBlurb) {
    const who =
      roomBridge.isRoom() && roomBridge.viewingOther?.()
        ? " · their invent (shared)"
        : roomBridge.isRoom()
          ? " · your invent"
          : "";
    inventBlurb.textContent = `${stage.blurb}${who}`;
  }
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

  const onChallenge =
    opts.context === "challenge" ||
    state.screen === "challenge-step" ||
    Boolean(state.challengeVisionBeat);

  // Attach renderer status/loading to the visible panel
  if (onChallenge && state.screen === "challenge-step") {
    state.vision.attach($("#challenge-vision-root"));
    state.vision.addMirror($("#vision-root"));
  } else if (state.screen === "deploy") {
    state.vision.attach($("#deploy-vision-root"));
    state.vision.addMirror($("#vision-root"));
  } else if (state.screen === "workshop") {
    state.vision.attach($("#vision-root"));
    state.vision.addMirror($("#challenge-vision-root"));
    state.vision.addMirror($("#deploy-vision-root"));
  }

  const challengeBeat = onChallenge ? buildChallengeVisionBeat() : null;
  // Only follow shared cache when viewing *someone else's* invent (or spectating).
  // Owner always generates (unless waiting on empty first paint without force).
  const followOnly = roomVisionFollowOnly() && !opts.force;
  const sharedSessionId = roomBridge.isRoom()
    ? mpSharedVisionSessionId(roomBridge.getViewId())
    : null;
  if (sharedSessionId) {
    state.vision.setSessionId(sharedSessionId);
  }

  // Mark key only when we actually queue a request (not before ensureVision)
  if (roomBridge.isRoom()) lastRoomVisionKey = contentKey;

  const viewId = roomBridge.isRoom() ? roomBridge.getViewId() : null;
  const visionRev =
    (viewId && roomBridge.invent?.(viewId)?.visionRev) || state.mpVisionRev || 0;

  // While watching another invent, keep soft-polling until we leave
  if (followOnly) startRoomFollowVisionPoll();
  else stopRoomFollowVisionPoll();

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
    force: Boolean(opts.force) && !followOnly,
    debounceMs:
      typeof opts.debounceMs === "number"
        ? opts.debounceMs
        : roomBridge.isRoom()
          ? 400
          : undefined,
    sessionId: sharedSessionId || undefined,
    followOnly,
    visionRev,
    // Owner only: tell the room a new shared frame is ready
    onGenerated: followOnly
      ? undefined
      : (meta) => {
          roomPublishVisionReady(meta);
        },
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
      if (roomBridge.isRoom()) scheduleRoomVisionRefresh({ immediate: true });
      else updateVision({ context: "invent" });
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
      if (roomBridge.isRoom()) {
        scheduleRoomVisionRefresh({ immediate: true, context: "challenge" });
      } else {
        updateVision({ context: "challenge", immediate: true });
      }
    });
  }
  if (state.challengeSideTab === "coinventor") ensureCoInventor();
}

function refreshChallengeVision(partialBeat, opts = {}) {
  if (partialBeat) setChallengeVisionBeat(partialBeat);
  else if (!state.challengeVisionBeat) setChallengeVisionBeat({ phase: "posed" });
  updateChallengeVisionLabels();
  if (roomBridge.isRoom() && !opts.force) {
    scheduleRoomVisionRefresh({
      immediate: opts.immediate !== false,
      context: "challenge",
    });
    return;
  }
  lastRoomVisionKey = "";
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
  if (state.screen === "deploy") return $("#dep-co-inventor-root");
  return $("#co-inventor-root");
}

function ensureCoInventor() {
  const root = coInventorRootEl();
  if (!root) return state.coInventor;
  // Remount when switching Invent ↔ Challenge ↔ Deploy so the panel lives on the active screen
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
      if (isMpInventSpectator()) {
        flashToast(
          "Not your turn — you can browse and use Learn, but only the active player acts."
        );
        return false;
      }
      const bridge = mpBridge();
      if (bridge && !bridge.isMyTurn?.()) {
        flashToast("Not your turn — you can browse and use Learn, but only the active player acts.");
        return false;
      }
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
  // Fresh mount starts interactive; re-apply multiplayer spectator / busy locks
  const spect = isMpInventSpectator();
  const reason = spect
    ? "Not your turn — you can browse and use Learn, but only the active player acts."
    : isInventActionBusy()
      ? inventActionBusyReason()
      : "";
  state.coInventor.setInteractive?.(!spect && !isInventActionBusy(), reason);
  return state.coInventor;
}

/**
 * Apply co-inventor proposals.
 * Techs go through onTechClick (same AP / Budget / Will as a manual library pick).
 * Never free bulk-add a whole suggested stack.
 * @param {object} proposals
 * @returns {{ changed: boolean, addedTechIds: string[] }}
 */
function applyCoInventorProposals(proposals) {
  if (!proposals) return { changed: false, addedTechIds: [] };
  let changed = false;
  const addedTechIds = [];

  // Removals: same toggle path as clicking a selected chip/card
  for (const id of proposals.removeTechIds || []) {
    if (!state.selectedTechIds.includes(id)) continue;
    onTechClick(id);
    if (!state.selectedTechIds.includes(id)) changed = true;
  }

  // Adds: one at a time via normal select/layer path (costs + multiplayer rules)
  for (const id of proposals.addTechIds || []) {
    if (!techById(id)) continue;
    if (state.selectedTechIds.includes(id)) continue;
    const cap = stackCapLimit();
    if (state.selectedTechIds.length >= cap) {
      flashToast(`Stack full (${cap}). Remove one first.`);
      break;
    }
    onTechClick(id);
    if (state.selectedTechIds.includes(id)) {
      addedTechIds.push(id);
      changed = true;
    }
    // If unaffordable / not your turn, onTechClick already toasted — stop bulk
    // so later techs don't pile on after the first hard failure mid "apply all"
    if (
      !state.selectedTechIds.includes(id) &&
      (proposals.addTechIds || []).length > 1
    ) {
      // Continue trying remaining techs only if failure might be "already on stack"
      // (we already skipped those). Stop only when AP/budget likely exhausted.
      const afford = canAffordTech(techById(id));
      if (!afford.ok) break;
    }
  }

  if (proposals.inventionName) {
    state.inventionName = proposals.inventionName;
    const nameEl = $("#invention-name");
    if (nameEl) nameEl.value = state.inventionName;
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
  if (proposals.scrutiny) {
    // Handled by challenge co-inventor consumers if present
    changed = true;
  }

  if (changed) {
    state.aiTiming = null;
    // onTechClick already re-renders for tech changes; story fields need a pass
    if (
      proposals.inventionName ||
      proposals.inventionHow ||
      proposals.inventionImpact
    ) {
      syncLearnOrderWithSelection();
      renderStoryFaceUI();
      renderFeasibility();
      updateChallengeButton();
      updateVision();
      scheduleAiTimingAssess();
      mpSyncFromSolo?.();
    }
    if (addedTechIds.length === 1) {
      flashToast(`Added ${techById(addedTechIds[0])?.name || "tech"} to stack`);
    } else if (addedTechIds.length > 1) {
      flashToast(`Added ${addedTechIds.length} techs to stack`);
    } else if (
      proposals.inventionName ||
      proposals.inventionHow ||
      proposals.inventionImpact
    ) {
      flashToast("Co-inventor ideas applied");
    }
  }
  return { changed, addedTechIds };
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

/** Story-face overlay target for contribution banner (name has no face shell). */
function contribFaceForField(field) {
  if (field === "inventionImpact") return "life";
  if (field === "inventionHow") return "how";
  return undefined;
}

/**
 * Spend 1 AP for co-invent / contribution judge.
 * Room: server pay_ap (+ optimistic local HUD).
 * Hotseat/solo: reserve_ai then resolve (spend sticks; not refunded on content reject).
 * @param {string} [mode]
 * @returns {{ ok: boolean, roomPaid: boolean }}
 */
function spendContributionAp(mode = "contribution") {
  if (!apEnabled()) return { ok: true, roomPaid: false };
  if (roomBridge.isRoom()) {
    if ((state.ap ?? 0) < 1) return { ok: false, roomPaid: false };
    try {
      roomBridge.send({ type: "pay_ap", payload: { amount: 1 } });
      state.ap -= 1;
      state.apSpentThisTurn = (state.apSpentThisTurn || 0) + 1;
      renderHud();
      return { ok: true, roomPaid: true };
    } catch {
      return { ok: false, roomPaid: false };
    }
  }
  const res = dispatchSim("reserve_ai", {
    mode,
    reservedAp: 1,
    clientActionId: `${mode}-${Date.now()}`,
  });
  if (!res.ok) return { ok: false, roomPaid: false };
  renderHud();
  mpSyncFromSolo();
  return { ok: true, roomPaid: false };
}

/**
 * Refund 1 AP after transport failure only (never after content reject).
 * @param {{ roomPaid?: boolean, pendingOnly?: boolean }} [opts]
 */
function refundContributionAp(opts = {}) {
  if (!apEnabled()) return;
  if (opts.roomPaid && roomBridge.isRoom()) {
    try {
      roomBridge.send({ type: "refund_ap", payload: { amount: 1 } });
      state.ap = Math.min(state.apMax || 3, (state.ap || 0) + 1);
      renderHud();
    } catch {
      /* ignore */
    }
    return;
  }
  if (state.pendingAi) dispatchSim("reject_ai");
  else if (!opts.pendingOnly) {
    // Already-resolved hotseat spend: explicit refund
    try {
      const b = mpBridge();
      if (b?.isHotseat?.() && b.getSession?.()) {
        // pay was reserve+resolve; no pending — use sim refund if available
        dispatchSim("reject_ai"); // no-op if nothing pending
      }
    } catch {
      /* ignore */
    }
  }
  renderHud();
  mpSyncFromSolo();
}

/**
 * Single-field additive gate used by Fill-other *and* manual edits (hotseat + room).
 * Blank / near-empty original is always accepted (same as hotseat).
 * @returns {Promise<{ accepted: boolean, blank: boolean, reason: string, face?: string }>}
 */
async function evaluateOneContribution({ field, before, after, baseline }) {
  const blank =
    !String(before || "").trim() || String(before || "").trim().length < 12;
  if (blank) {
    return {
      accepted: true,
      blank: true,
      reason: "Original was empty or stub — addition allowed.",
      face: contribFaceForField(field),
    };
  }
  const verdict = await judgeContributionAdditive({
    field,
    before,
    after,
    baseline,
  });
  return {
    accepted: Boolean(verdict.additive),
    blank: false,
    reason:
      verdict.reason ||
      (verdict.additive ? "Additive check passed." : "Not additive."),
    face: contribFaceForField(field),
  };
}

/**
 * Write accepted prose onto the *viewed* invent.
 * Room → write_commit with targetSeatId. Hotseat → write_commit + syncSoloToSession.
 * @param {Array<[string, string]>} pairs [field, value] that changed
 * @returns {{ ok: boolean, error?: string }}
 */
function persistViewedInventFields(pairs) {
  if (!pairs?.length) return { ok: true };
  if (roomBridge.isRoom()) {
    const targetSeatId = roomBridge.getViewId();
    try {
      for (const [field, value] of pairs) {
        roomBridge.send({
          type: "write_commit",
          payload: { field, value, changed: true, targetSeatId },
        });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Could not save contribution" };
    }
  }
  // Hotseat: sim write_commit meters AP buffer; syncSolo writes viewed invent
  const r = dispatchSim("write_commit", { changed: true });
  if (!r.ok) return { ok: false, error: r.error };
  mpSyncFromSolo();
  return { ok: true };
}

/**
 * Shared hotseat/room path: additive judge for typed edits on someone else's invent.
 * Same judgeContributionAdditive + showContributionNotice shape as Fill other side.
 * Caller owns the UI lock (set before await, clear after persist) when
 * `opts.manageLock === false`.
 * @returns {Promise<{ ok: boolean, notice: null | object, accepted: object }>}
 */
async function evaluateContributionEdits(prev, snap, opts = {}) {
  const manageLock = opts.manageLock !== false;
  if (manageLock) {
    setMpContributionLock(
      true,
      "Evaluating contribution… UI locked until this finishes."
    );
  }
  /** @type {null | { ok: boolean, title: string, reason: string, apNote?: string, face?: string }} */
  let notice = null;
  const accepted = {
    inventionName: prev.name,
    inventionHow: prev.how,
    inventionImpact: prev.impact,
  };
  try {
    const fields = [
      ["inventionName", prev.name, snap.name],
      ["inventionHow", prev.how, snap.how],
      ["inventionImpact", prev.impact, snap.impact],
    ];
    let changedFields = 0;
    let lastFace;
    for (const [field, before, after] of fields) {
      if (before === after) {
        if (field === "inventionName") accepted.inventionName = after;
        if (field === "inventionHow") accepted.inventionHow = after;
        if (field === "inventionImpact") accepted.inventionImpact = after;
        continue;
      }
      changedFields++;
      // 1 AP for contribution review — never refunded if rejected
      let spent = false;
      if (apEnabled() && (state.ap ?? 0) > 0) {
        const pay = spendContributionAp("judge-contribution");
        if (pay.ok) {
          spent = true;
          // Hotseat: resolve pending so spend sticks
          if (!pay.roomPaid && state.pendingAi) dispatchSim("resolve_ai");
          mpSyncFromSolo();
          renderHud();
        }
      }
      const verdict = await evaluateOneContribution({
        field,
        before,
        after,
        baseline: {
          inventionName: prev.name,
          inventionHow: prev.how,
          inventionImpact: prev.impact,
        },
      });
      lastFace = verdict.face;
      if (!verdict.accepted) {
        if (field === "inventionName") state.inventionName = before;
        if (field === "inventionHow") state.inventionHow = before;
        if (field === "inventionImpact") state.inventionImpact = before;
        // Force DOM back to rejected baseline (even if still focused)
        syncStoryFieldsToDom({ force: true });
        notice = {
          ok: false,
          title: "Edit rejected",
          reason: verdict.reason,
          apNote: spent
            ? "AP spent on the contribution check is not returned."
            : "",
          face: verdict.face,
        };
        return { ok: false, notice, accepted };
      }
      if (field === "inventionName") accepted.inventionName = after;
      if (field === "inventionHow") accepted.inventionHow = after;
      if (field === "inventionImpact") accepted.inventionImpact = after;
    }
    if (changedFields > 0) {
      notice = {
        ok: true,
        title: "Contribution accepted",
        reason: "Your edit was applied to their invent (additive check passed).",
        apNote: "",
        face: lastFace,
      };
    }
    return { ok: true, notice, accepted };
  } finally {
    if (manageLock) {
      setMpContributionLock(false);
      renderMpChrome();
    }
  }
}

async function callCoInventMode(mode, userLabel) {
  if (state.aiBusy) return;
  if (isMpContributionLocked()) {
    flashToast(mpContributionLockReason);
    return;
  }
  const bridge = mpBridge();
  if (bridge && !bridge.canContributeStory?.()) {
    flashToast("Cannot edit this invent right now.");
    return;
  }

  // Same for hotseat + online room: helping another seat's invent
  const contributingOther = Boolean(bridge?.viewingOther?.());
  if (contributingOther) {
    mpContributionBaseline = {
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
    };
  }

  // Reserve AP — on contribution *content* rejects we deliberately do NOT refund
  let reservedAp = false;
  let roomApPaid = false;
  if (apEnabled()) {
    const pay = spendContributionAp(mode);
    if (!pay.ok) {
      flashToast("No AP left for AI — End Turn or Wait.", { resource: "ap" });
      return;
    }
    reservedAp = true;
    roomApPaid = pay.roomPaid;
  }
  state.aiBusy = true;
  setFillButtonsDisabled(true);

  const fillOther = mode === "complete-picture";
  // Lock End turn / Wait / Lobby / Challenge / pass / seats for *all* invent AI
  setMpContributionLock(
    true,
    contributingOther
      ? "Evaluating contribution… End turn, Wait, Lobby, and Challenge are disabled until this finishes."
      : fillOther
        ? "Fill other side is still drafting… End turn, Wait, Lobby, and Challenge are disabled until it finishes."
        : "AI co-inventor is working… End turn, Wait, Lobby, and Challenge are disabled until it finishes."
  );
  // Keep action chrome in sync (HUD/challenge refresh can re-enable otherwise)
  updateEndTurnButton();
  updateChallengeButton();
  renderHud();
  applyEndTurnChrome();

  if (fillOther) {
    const target = completePictureTargetFace();
    showStoryFacePending(
      target,
      target === "life" ? "Drafting everyday life…" : "Drafting how it works…"
    );
  }

  /** @type {null | { ok: boolean, title: string, reason: string, apNote?: string, face?: string }} */
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
    // never a rewrite of the face they already own. Same gate for hotseat + room.
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
          reason:
            "The co-inventor did not return a usable draft for the other story face. Try again or type your help.",
          apNote: "AP spent on AI help is not returned.",
          face: completePictureTargetFace(),
        };
        if (reservedAp && state.pendingAi && !roomApPaid) dispatchSim("resolve_ai");
        reservedAp = false;
      } else {
        const field =
          proposals.inventionHow != null ? "inventionHow" : "inventionImpact";
        const before =
          field === "inventionHow"
            ? mpContributionBaseline?.inventionHow || ""
            : mpContributionBaseline?.inventionImpact || "";
        const after =
          field === "inventionHow"
            ? proposals.inventionHow
            : proposals.inventionImpact;
        // Shared additive gate (local heuristic + optional AI rescue)
        const verdict = await evaluateOneContribution({
          field,
          before,
          after,
          baseline: mpContributionBaseline,
        });
        if (!verdict.accepted) {
          if (reservedAp && state.pendingAi && !roomApPaid) dispatchSim("resolve_ai");
          reservedAp = false;
          proposals = null;
          contribNotice = {
            ok: false,
            title: "Contribution rejected",
            reason: verdict.reason,
            apNote: "AP spent on AI help is not returned.",
            face: verdict.face || completePictureTargetFace(),
          };
          ensureCoInventor();
          state.coInventor?.pushAssistant?.(
            {
              message: `**Rejected contribution** — ${verdict.reason}\n\nHelp must *layer on* their idea, not gut it. AP for this AI help stays spent.`,
              proposals: emptyProps(),
              teaching: [],
            },
            { local: true }
          );
        } else {
          contribNotice = {
            ok: true,
            title: "Contribution accepted",
            reason: verdict.blank
              ? "Your help was applied to their invent (filled an empty story face)."
              : "Your help was applied to their invent (additive check passed).",
            apNote: "1 AP spent on co-inventor help.",
            face: verdict.face || completePictureTargetFace(),
          };
        }
      }
    }

    if (proposals) {
      applyCoInventorProposals(proposals);
      // Persist to viewed invent (room server or hotseat session) — one path
      const writePairs = [];
      if (proposals.inventionHow != null) {
        writePairs.push(["inventionHow", state.inventionHow]);
      }
      if (proposals.inventionImpact != null) {
        writePairs.push(["inventionImpact", state.inventionImpact]);
      }
      if (proposals.inventionName != null) {
        writePairs.push(["inventionName", state.inventionName]);
      }
      // Room must send field commits; hotseat uses mpSyncFromSolo for invent text
      // (and write_commit only when contributing / own edits elsewhere).
      if (roomBridge.isRoom() && writePairs.length) {
        const saved = persistViewedInventFields(writePairs);
        if (!saved.ok) flashToast(saved.error || "Could not save contribution to room");
      } else {
        mpSyncFromSolo();
      }
      state.lastWriteSnapshot = {
        name: state.inventionName,
        how: state.inventionHow,
        impact: state.inventionImpact,
      };
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
    if (reservedAp && apEnabled()) {
      refundContributionAp({ roomPaid: roomApPaid });
    }
    reservedAp = false;
    if (contributingOther && fillOther) {
      contribNotice = {
        ok: false,
        title: "Contribution failed",
        reason: e.message || "AI request failed",
        apNote: "AP was refunded because the request failed.",
        face: completePictureTargetFace(),
      };
    } else {
      flashToast(e.message || "AI request failed");
    }
  } finally {
    if (reservedAp && apEnabled() && state.pendingAi && !roomApPaid) {
      dispatchSim("resolve_ai");
    }
    if (fillOther) clearStoryFacePending();
    state.aiBusy = false;
    mpContributionBaseline = null;
    setMpContributionLock(false);
    setFillButtonsDisabled(false);
    updateChallengeButton();
    renderHud();
    renderMpChrome();
    updateEndTurnButton();
    if (fillOther) renderStoryFaceUI();
    mpSyncFromSolo();
    // Always surface contribution outcome after chrome unlock (hotseat + room)
    if (contribNotice) {
      showContributionNotice(contribNotice);
    }
  }
}

async function commitWriteIfNeeded() {
  // Single-flight: blur + debounce must not stack evaluations
  if (writeCommitInFlight || isMpContributionLocked()) return;

  const snap = {
    name: state.inventionName,
    how: state.inventionHow,
    impact: state.inventionImpact,
  };
  const prev = state.lastWriteSnapshot || { name: "", how: "", impact: "" };
  const changed =
    snap.name !== prev.name || snap.how !== prev.how || snap.impact !== prev.impact;
  if (!changed) return;

  const bridge = mpBridge();
  const viewingOther = Boolean(bridge?.viewingOther?.());

  // —— Multiplayer (room or hotseat) contributing to someone else's invent ——
  // On blur with changes: lock invent UI immediately until additive eval finishes
  if (bridge && viewingOther) {
    if (!bridge.canContributeStory?.()) {
      state.inventionName = prev.name;
      state.inventionHow = prev.how;
      state.inventionImpact = prev.impact;
      syncStoryFieldsToDom({ force: true });
      flashToast("Can't edit this invent right now.");
      return;
    }
    writeCommitInFlight = true;
    // Cancel any pending debounce so we don't re-enter after unlock
    if (writeCommitTimer) {
      clearTimeout(writeCommitTimer);
      writeCommitTimer = null;
    }
    setMpContributionLock(
      true,
      "Evaluating contribution… UI locked until this finishes."
    );
    // Pending chrome on faces that actually changed
    if (snap.how !== prev.how) {
      showStoryFacePending("how", "Checking your edit is additive…");
    }
    if (snap.impact !== prev.impact) {
      showStoryFacePending("life", "Checking your edit is additive…");
    }
    try {
      const result = await evaluateContributionEdits(prev, snap, {
        manageLock: false,
      });
      if (result.notice) showContributionNotice(result.notice);
      if (!result.ok) {
        state.lastWriteSnapshot = {
          name: state.inventionName,
          how: state.inventionHow,
          impact: state.inventionImpact,
        };
        return;
      }
      const pairs = [
        ["inventionName", prev.name, result.accepted.inventionName],
        ["inventionHow", prev.how, result.accepted.inventionHow],
        ["inventionImpact", prev.impact, result.accepted.inventionImpact],
      ]
        .filter(([, before, after]) => before !== after)
        .map(([field, , after]) => [field, after]);
      const saved = persistViewedInventFields(pairs);
      if (!saved.ok) {
        flashToast(saved.error || "Could not save contribution");
        return;
      }
      state.lastWriteSnapshot = {
        name: result.accepted.inventionName,
        how: result.accepted.inventionHow,
        impact: result.accepted.inventionImpact,
      };
      renderHud();
    } finally {
      clearStoryFacePending();
      writeCommitInFlight = false;
      setMpContributionLock(false);
      renderMpChrome();
      renderStoryFaceUI();
    }
    return;
  }

  // Online room: own invent (no additive gate)
  if (roomBridge.isRoom()) {
    if (!roomBridge.canContributeStory()) {
      state.inventionName = prev.name;
      state.inventionHow = prev.how;
      state.inventionImpact = prev.impact;
      syncStoryFieldsToDom({ force: true });
      flashToast("Can't edit this invent right now.");
      return;
    }
    const pairs = [
      ["inventionName", prev.name, snap.name],
      ["inventionHow", prev.how, snap.how],
      ["inventionImpact", prev.impact, snap.impact],
    ]
      .filter(([, before, after]) => before !== after)
      .map(([field, , after]) => [field, after]);
    const saved = persistViewedInventFields(pairs);
    if (!saved.ok) {
      flashToast(saved.error || "Could not save edit");
      return;
    }
    state.lastWriteSnapshot = snap;
    return;
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

/* —— Round market news (illustrated card) —— */
// Same reliability model as mp-turn-modal (plain fixed div, display:flex, no opacity traps).
// Multiplayer order: market bulletin FIRST → year flash → deferred "your turn" notice.

const marketImageCache = new Map();
/** Id currently open or about to open (blocks turn notice) */
let marketNewsOpenId = null;
/** Auto-dismiss timer for market bulletin (cleared on manual Got it) */
let marketNewsAutoCloseT = null;
/** Default seconds before market bulletin auto-closes if not dismissed */
const MARKET_NEWS_AUTO_CLOSE_MS = 2500;
/** @type {{ name?: string, isYou?: boolean, mode?: string } | null} */
let deferredTurnNotice = null;
/** Year advance banner/HUD pulse is on-screen — hold turn popup so it isn't covered */
let yearFlashActive = false;
let yearFlashReleaseT = null;
/** Year advanced while market modal owned the screen — replay flash after dismiss */
let yearFlashNeedsReplay = false;

/**
 * Multiplayer: block spend/act until the player acks "It's your turn!" (Let's go).
 * Arms as soon as your seat becomes active — even while the popup is deferred
 * behind market news / year flash — so Challenge cannot be clicked early.
 */
let mpTurnGateActive = false;

function isMarketNewsModalOpen() {
  const el = document.getElementById("market-news-modal");
  return Boolean(el && !el.hidden && el.style.display !== "none");
}

/** True while a modal/flash should keep "your turn" queued. */
function shouldDeferTurnNotice() {
  return Boolean(
    isMarketNewsModalOpen() || marketNewsOpenId || yearBulletinOpen || yearFlashActive
  );
}

/** @param {boolean} on */
function setMpTurnGate(on) {
  const next = Boolean(on);
  if (mpTurnGateActive === next) {
    document.body.classList.toggle("mp-turn-gate", next);
    return;
  }
  mpTurnGateActive = next;
  document.body.classList.toggle("mp-turn-gate", next);
  try {
    applyEndTurnChrome();
    updateEndTurnButton();
    if (state.screen === "challenge-step") renderChallengeHud();
    if (state.screen === "deploy") renderDeployHud();
  } catch {
    /* ignore chrome refresh */
  }
}

/** True when multiparty spend actions must wait for turn-ack. */
function isMpTurnGateBlocking() {
  if (!mpTurnGateActive) return false;
  if (!roomBridge.isRoom() && !hotseatBridge.isHotseat()) {
    setMpTurnGate(false);
    return false;
  }
  const b = mpBridge();
  // Seat moved away — drop the gate
  if (b && typeof b.isMyTurn === "function" && !b.isMyTurn()) {
    setMpTurnGate(false);
    return false;
  }
  return true;
}

/**
 * @param {string} [what] short action name for the toast
 * @returns {boolean} true if the caller should abort
 */
function blockIfMpTurnGate(what = "acting") {
  if (!isMpTurnGateBlocking()) return false;
  // If notice was deferred, try to surface it now (when market/year clear)
  if (deferredTurnNotice?.isYou && !shouldDeferTurnNotice()) {
    releaseDeferredTurnNotice();
  } else if (!document.getElementById("mp-turn-modal") || document.getElementById("mp-turn-modal")?.hidden) {
    // Gate up but modal missing — re-show so the player is not stuck forever
    const b = mpBridge();
    const name =
      b?.activeSeat?.()?.displayName ||
      roomBridge.client?.()?.snapshot?.you?.displayName ||
      "Player";
    showTurnStartNotice({
      name,
      isYou: true,
      mode: roomBridge.isRoom() ? "room" : "hotseat",
    });
  }
  flashToast(
    `Hit “Let's go” on “It's your turn!” before ${what}.`,
    { durationMs: 2800 }
  );
  return true;
}

/**
 * Show any queued turn notice once market / year flash / year dialog are clear.
 */
function releaseDeferredTurnNotice() {
  if (shouldDeferTurnNotice()) return;
  const pending = deferredTurnNotice;
  if (!pending) return;
  deferredTurnNotice = null;
  requestAnimationFrame(() => showTurnStartNotice(pending));
}

/**
 * Queue / show market bulletin. New cards always take the screen.
 * @param {object} news
 * @param {{ force?: boolean }} [opts]
 */
function queueMarketNewsModal(news, opts = {}) {
  if (!news?.id) return;
  state.marketNews = cloneMarketNews(news);
  // Already showing this exact card
  if (marketNewsOpenId === news.id && isMarketNewsModalOpen()) {
    renderMarketBanner({ pulse: false });
    return;
  }
  // Already dismissed this id unless force (e.g. explicit event / re-open from banner)
  if (!opts.force && state.marketNewsShownId === news.id && !isMarketNewsModalOpen()) {
    renderMarketBanner({ pulse: false });
    return;
  }
  // Show immediately — do not wait; turn popup must queue behind us
  showMarketNewsModal(news);
}

function closeMarketNewsModal(opts = {}) {
  const el = document.getElementById("market-news-modal");
  if (!el) return;
  if (marketNewsAutoCloseT) {
    clearTimeout(marketNewsAutoCloseT);
    marketNewsAutoCloseT = null;
  }
  marketNewsOpenId = null;
  document.body.classList.remove("market-news-open");
  el.hidden = true;
  el.setAttribute("hidden", "");
  el.style.display = "none";
  el.classList.remove("is-open", "is-entering", "is-leaving");

  // After dismiss: pulse market banner, re-show year flash if market covered it,
  // then deferred turn notice (year flash still holds the queue while active).
  if (opts.highlightBanner !== false) {
    renderMarketBanner({ pulse: true, scrollIntoView: true });
  }
  if (yearFlashNeedsReplay && state.lastYearBulletin?.toYear != null) {
    yearFlashNeedsReplay = false;
    pulseYearHud(state.lastYearBulletin.toYear);
    flashYearAdvanceBanner(state.lastYearBulletin);
  }
  releaseDeferredTurnNotice();
}

/* —— Year bulletin (world clock + foresight highlights) —— */
let yearBulletinOpen = false;
let lastYearPulseKey = null;

/**
 * Round-end year advance: store bulletin + flash banner + pulse HUD (no auto modal).
 * User clicks the year / banner to open the full foresight dialog.
 * @param {object} bulletin — { fromYear, toYear, highlights[] }
 */
function noteYearAdvance(bulletin) {
  if (!bulletin?.toYear) return;
  state.lastYearBulletin = bulletin;
  const key = `${bulletin.fromYear ?? "?"}→${bulletin.toYear}`;
  if (lastYearPulseKey === key) return;
  lastYearPulseKey = key;
  // Refresh labels first — then pulse so renderHud doesn't clobber the flash title
  try {
    renderHud();
  } catch {
    /* ignore */
  }
  try {
    renderChallengeHud();
  } catch {
    /* ignore */
  }
  pulseYearHud(bulletin.toYear);
  flashYearAdvanceBanner(bulletin);
}

/**
 * Brief highlight on year controls so calendar advance is visible without a popup.
 * @param {number} [toYear]
 */
function pulseYearHud(toYear) {
  const ids = ["hud-year", "ch-hud-year", "mp-hud-year", "hs-hud-year"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (toYear != null) el.textContent = String(toYear);
    el.classList.remove("hud-year-pulse");
    void el.offsetWidth;
    el.classList.add("hud-year-pulse");
    el.title = "Year advanced — click for foresight (capabilities & predictions)";
    clearTimeout(el._yearPulseT);
    el._yearPulseT = setTimeout(() => {
      el.classList.remove("hud-year-pulse");
      el.title = "Click for year foresight (capabilities & predictions)";
    }, 2800);
  }
}

/**
 * Temporary fly-in + ring-pulse banner (same energy as Market Round).
 * Auto-hides after a few seconds; click opens year foresight.
 * Holds the multiplayer "your turn" popup until the flash is mostly done.
 * @param {object} bulletin — { fromYear, toYear, highlights[] }
 */
function flashYearAdvanceBanner(bulletin) {
  if (!bulletin?.toYear) return;
  // If market owns the screen, still arm the hold but mark for replay after dismiss
  if (isMarketNewsModalOpen() || marketNewsOpenId) {
    yearFlashNeedsReplay = true;
  }
  const hosts = [
    $("#year-advance-banner"),
    $("#hs-year-advance-banner"),
    $("#mp-year-advance-banner"),
  ].filter(Boolean);
  if (!hosts.length) {
    // Still hold turn notice briefly for HUD year pulse alone
    armYearFlashHold(2200);
    return;
  }

  const from = bulletin.fromYear != null ? String(bulletin.fromYear) : "?";
  const to = String(bulletin.toYear);
  const n = Array.isArray(bulletin.highlights) ? bulletin.highlights.length : 0;
  const hint =
    n > 0
      ? `${n} foresight note${n === 1 ? "" : "s"} · click for details`
      : "Click for capabilities & predictions";

  const html = `
    <button type="button" class="year-advance-banner-btn" data-year-open="1" title="Open year foresight">
      <span class="year-advance-banner-icon" aria-hidden="true">📅</span>
      <span class="year-advance-banner-text">
        <span class="year-advance-banner-kicker">Calendar · Year advanced</span>
        <strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong>
        <span class="year-advance-banner-hint">${escapeHtml(hint)}</span>
      </span>
    </button>`;

  // Hold "your turn" until the pulse has played (turn modal would cover this banner)
  armYearFlashHold(3000);

  for (const host of hosts) {
    if (!host.isConnected) continue;
    clearTimeout(host._yearFlashHideT);
    clearTimeout(host._yearFlashFadeT);
    host.classList.remove("is-pulse", "is-fly-in", "is-fading");
    host.hidden = false;
    host.removeAttribute("hidden");
    host.innerHTML = html;
    host.querySelector("[data-year-open]")?.addEventListener("click", () => {
      openYearForesightFromHud();
    });

    void host.offsetWidth;
    host.classList.add("is-fly-in", "is-pulse");
    if (host.offsetParent !== null) {
      try {
        host.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {
        /* ignore */
      }
    }

    // Match market: pulse ~2.2s, then soft fade and hide (not sticky)
    host._yearFlashFadeT = setTimeout(() => {
      host.classList.remove("is-pulse");
      host.classList.add("is-fading");
      host._yearFlashHideT = setTimeout(() => {
        host.hidden = true;
        host.setAttribute("hidden", "");
        host.innerHTML = "";
        host.classList.remove("is-fly-in", "is-fading", "is-pulse");
      }, 450);
    }, 3200);
  }
}

/**
 * Keep turn popup queued while year advance is highlighted.
 * @param {number} ms
 */
function armYearFlashHold(ms) {
  yearFlashActive = true;
  clearTimeout(yearFlashReleaseT);
  yearFlashReleaseT = setTimeout(() => {
    yearFlashActive = false;
    yearFlashReleaseT = null;
    releaseDeferredTurnNotice();
  }, Math.max(800, Number(ms) || 3000));
}

function closeYearBulletinModal() {
  const el = document.getElementById("year-bulletin-modal");
  if (!el) return;
  yearBulletinOpen = false;
  document.body.classList.remove("year-bulletin-open");
  el.hidden = true;
  el.setAttribute("hidden", "");
  el.style.display = "none";
  releaseDeferredTurnNotice();
}

/** Click year in HUD — reopen foresight for this mission year (no market sequence). */
function openYearForesightFromHud() {
  const b = state.lastYearBulletin;
  if (b?.toYear != null && Number(b.toYear) === Number(state.year) && b.highlights?.length) {
    showYearBulletinModal(b, { userOpen: true });
    return;
  }
  const highlights = foresightForYear(state.year, {
    techIds: state.selectedTechIds || [],
    globalId: state.global?.id || state.mission?.globalId,
    seed: `${state.mission?.id || "solo"}:hud:${state.year}`,
  });
  showYearBulletinModal(
    {
      fromYear: Math.max(GAME.startYear || 2026, (state.year || 2026) - 1),
      toYear: state.year || GAME.startYear || 2026,
      highlights: highlights.map((h) => ({
        id: h.id,
        kind: h.kind,
        headline: h.headline,
        detail: h.detail,
        claimBand: h.claimBand,
      })),
    },
    { userOpen: true }
  );
}

function showYearBulletinModal(bulletin, opts = {}) {
  if (!bulletin) return;
  yearBulletinOpen = true;
  try {
    closeMpTurnModal();
  } catch {
    /* ignore */
  }

  let el = document.getElementById("year-bulletin-modal");
  if (!el) {
    el = document.createElement("div");
    el.id = "year-bulletin-modal";
    el.className = "year-bulletin-modal market-news-modal";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "year-bulletin-title");
    el.innerHTML = `
      <div class="market-news-dialog year-bulletin-dialog" role="document">
        <div class="market-news-copy">
          <p class="market-news-kicker" id="year-bulletin-kicker">World clock</p>
          <h3 id="year-bulletin-title">Capabilities shift</h3>
          <p id="year-bulletin-body" class="market-news-body"></p>
          <ul class="year-bulletin-list" id="year-bulletin-list"></ul>
          <p class="market-news-note muted">Claims in How it works are judged against this year. Predictions are forecasts — not free unlocks.</p>
          <button type="button" class="btn btn-primary" id="year-bulletin-ok">Got it</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (ev) => {
      if (ev.target === el || ev.target?.id === "year-bulletin-ok" || ev.target?.closest?.("#year-bulletin-ok")) {
        closeYearBulletinModal();
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        const live = document.getElementById("year-bulletin-modal");
        if (live && !live.hidden) closeYearBulletinModal();
      }
    });
  }

  const fromY = bulletin.fromYear ?? (bulletin.toYear - 1);
  const toY = bulletin.toYear;
  const kicker = el.querySelector("#year-bulletin-kicker");
  const title = el.querySelector("#year-bulletin-title");
  const body = el.querySelector("#year-bulletin-body");
  const list = el.querySelector("#year-bulletin-list");
  const okBtn = el.querySelector("#year-bulletin-ok");
  if (kicker) {
    kicker.textContent = opts.userOpen
      ? `World clock · Year ${toY}`
      : `World clock · ${fromY} → ${toY}`;
  }
  if (title) title.textContent = `Year ${toY} — capabilities shift`;
  if (body) {
    body.textContent = opts.userOpen
      ? "Major predicted milestones and near-term capabilities for this calendar year:"
      : "The calendar advanced for everyone. Major predicted milestones and near-term capabilities for this year:";
  }
  if (list) {
    const rows = bulletin.highlights || [];
    list.innerHTML = rows.length
      ? rows
          .map((h) => {
            const kind = h.kind === "prediction" ? "Prediction" : h.kind === "trend" ? "Trend" : "Milestone";
            return `<li class="year-bulletin-item" data-kind="${escapeHtml(h.kind || "")}">
              <span class="year-bulletin-kind">${escapeHtml(kind)}</span>
              <strong>${escapeHtml(h.headline || "")}</strong>
              <span class="year-bulletin-detail">${escapeHtml(h.detail || "")}</span>
            </li>`;
          })
          .join("")
      : `<li class="year-bulletin-item"><strong>Quiet year</strong><span class="year-bulletin-detail">No major curated highlights — keep claims pilot-honest.</span></li>`;
  }
  if (okBtn) {
    okBtn.onclick = (ev) => {
      ev.preventDefault();
      closeYearBulletinModal();
    };
  }

  el.hidden = false;
  el.removeAttribute("hidden");
  el.style.display = "flex";
  el.classList.add("is-open");
  document.body.classList.add("year-bulletin-open");
  try {
    flashToast(`📅 World clock → ${toY}`, { durationMs: 2800 });
  } catch {
    /* ignore */
  }
}

/**
 * Full-screen market bulletin — same shell pattern as "It's your turn".
 * @param {object} news
 */
function showMarketNewsModal(news) {
  if (!news) return;
  state.marketNews = cloneMarketNews(news);
  marketNewsOpenId = news.id;

  // Turn popup must wait — hide it if already up
  try {
    closeMpTurnModal();
  } catch {
    /* ignore */
  }

  let el = document.getElementById("market-news-modal");
  if (!el) {
    el = document.createElement("div");
    el.id = "market-news-modal";
    el.className = "market-news-modal";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "market-news-headline");
    el.innerHTML = `
      <div class="market-news-dialog" role="document">
        <div class="market-news-art" id="market-news-art" aria-hidden="true">
          <div class="market-news-art-fallback" id="market-news-art-fallback"></div>
          <img id="market-news-img" alt="" hidden />
          <div class="market-news-art-loading" id="market-news-art-loading" hidden>Illustrating…</div>
        </div>
        <div class="market-news-copy">
          <p class="market-news-kicker" id="market-news-kicker">Market bulletin</p>
          <h3 id="market-news-headline"></h3>
          <p id="market-news-body" class="market-news-body"></p>
          <div class="market-news-effects" id="market-news-effects"></div>
          <p class="market-news-note muted">AP stays 1. Only Budget and Will for matching emTechs shift this round.</p>
          <button type="button" class="btn btn-primary" id="market-news-ok">Got it</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (ev) => {
      if (ev.target === el || ev.target?.id === "market-news-ok" || ev.target?.closest?.("#market-news-ok")) {
        closeMarketNewsModal();
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        const live = document.getElementById("market-news-modal");
        if (live && !live.hidden) closeMarketNewsModal();
      }
    });
  }

  const tone = news.tone || "mixed";
  el.dataset.tone = tone;

  // Identical visibility recipe as mp-turn-modal (proven to work in multiplayer)
  el.hidden = false;
  el.removeAttribute("hidden");
  el.style.display = "flex";
  el.classList.add("is-open");
  document.body.classList.add("market-news-open");

  // Card fly-in each open
  const dialog = el.querySelector(".market-news-dialog");
  if (dialog) {
    dialog.classList.remove("market-news-dialog-enter");
    void dialog.offsetWidth;
    dialog.classList.add("market-news-dialog-enter");
  }

  const kicker = el.querySelector("#market-news-kicker");
  const headline = el.querySelector("#market-news-headline");
  const body = el.querySelector("#market-news-body");
  const effectsEl = el.querySelector("#market-news-effects");
  const fallback = el.querySelector("#market-news-art-fallback");
  const img = el.querySelector("#market-news-img");
  const loading = el.querySelector("#market-news-art-loading");
  const okBtn = el.querySelector("#market-news-ok");

  if (kicker) {
    kicker.textContent =
      news.round != null ? `Breaking · Round ${news.round}` : "Breaking market news";
  }
  if (headline) headline.textContent = news.headline || "Market shift";
  if (body) body.textContent = news.body || "";
  if (fallback) {
    fallback.hidden = false;
    fallback.textContent = news.icon || "📰";
    fallback.dataset.tone = tone;
  }
  if (okBtn) {
    okBtn.type = "button";
    okBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeMarketNewsModal();
    };
  }

  const desc = describeMarketEffects(news, {
    techName: (id) => techById(id)?.name || id,
    domainLabel: (d) => DOMAINS[d]?.label || d,
  });
  if (effectsEl) {
    effectsEl.innerHTML = `
      <span class="market-effect-scope">${escapeHtml(desc.scope)}</span>
      ${desc.effects
        .map((e) => {
          const up = e.includes("+");
          const down = e.includes("-");
          const cls = up ? "up" : down ? "down" : "";
          return `<span class="market-effect-chip ${cls}">${escapeHtml(e)}</span>`;
        })
        .join("")}`;
  }

  // Illustration: prebuilt static asset (dev-time Imagine batch). Icon fallback if missing.
  if (img) {
    img.hidden = true;
    img.removeAttribute("src");
    img.onerror = null;
  }
  if (loading) loading.hidden = true;
  if (fallback) {
    fallback.hidden = false;
    fallback.textContent = news.icon || "📰";
  }

  const staticUrl = marketNewsImageUrl(news);
  if (staticUrl && img) {
    img.onload = () => {
      if (state.marketNews?.id !== news.id) return;
      img.hidden = false;
      if (fallback) fallback.hidden = true;
      if (loading) loading.hidden = true;
      marketImageCache.set(news.id, staticUrl);
      renderMarketBanner({ pulse: false });
    };
    img.onerror = () => {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
      if (loading) loading.hidden = true;
    };
    // Show loading briefly only when we don't already know the asset works
    if (!marketImageCache.has(news.id) && loading) loading.hidden = false;
    img.src = staticUrl;
  }

  // Mark shown only after the overlay is actually on screen
  state.marketNewsShownId = news.id;
  renderMarketBanner({ pulse: false });

  try {
    flashToast(`📰 Market news · ${news.headline || "costs shifted"}`, {
      durationMs: 3500,
    });
  } catch {
    /* ignore */
  }

  setTimeout(() => {
    try {
      okBtn?.focus?.({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }, 30);

  // Auto-dismiss if the player does not click Got it
  if (marketNewsAutoCloseT) {
    clearTimeout(marketNewsAutoCloseT);
    marketNewsAutoCloseT = null;
  }
  marketNewsAutoCloseT = setTimeout(() => {
    marketNewsAutoCloseT = null;
    if (marketNewsOpenId === news.id && isMarketNewsModalOpen()) {
      closeMarketNewsModal();
    }
  }, MARKET_NEWS_AUTO_CLOSE_MS);
}

/**
 * Static illustration URL for a market card (pre-generated at build time).
 * @param {object} news
 * @returns {string|null}
 */
function marketNewsImageUrl(news) {
  if (!news?.id) return null;
  if (marketImageCache.has(news.id)) return marketImageCache.get(news.id);
  const p = marketNewsImagePath(news);
  return p || null;
}

/**
 * Compact persistent banner under the mission scene.
 * @param {{ pulse?: boolean, scrollIntoView?: boolean }} [opts]
 */
function renderMarketBanner(opts = {}) {
  const hosts = [
    $("#market-news-banner"),
    $("#hs-market-news-banner"),
    $("#mp-market-news-banner"),
  ].filter(Boolean);
  if (!hosts.length) return;
  const news = currentMarketNews();
  if (!news) {
    for (const host of hosts) {
      host.hidden = true;
      host.innerHTML = "";
      host.classList.remove("is-pulse", "is-fly-in");
    }
    return;
  }
  const desc = describeMarketEffects(news, {
    techName: (id) => techById(id)?.name || id,
    domainLabel: (d) => DOMAINS[d]?.label || d,
  });
  const thumb = marketNewsImageUrl(news);
  const html = `
    <button type="button" class="market-news-banner-btn" data-market-open="1" title="Open market bulletin">
      <span class="market-news-banner-thumb" aria-hidden="true">
        ${
          thumb
            ? `<img src="${escapeHtml(thumb)}" alt="" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.hidden=false)" /><span class="market-news-banner-icon" hidden>${escapeHtml(news.icon || "📰")}</span>`
            : `<span class="market-news-banner-icon">${escapeHtml(news.icon || "📰")}</span>`
        }
      </span>
      <span class="market-news-banner-text">
        <span class="market-news-banner-kicker">Market · Round ${escapeHtml(
          String(news.round ?? state.turn ?? 1)
        )}</span>
        <strong>${escapeHtml(news.headline)}</strong>
        <span class="market-news-banner-effects">
          ${escapeHtml(desc.scope)} · ${desc.effects.map(escapeHtml).join(" · ")}
        </span>
      </span>
    </button>`;

  for (const host of hosts) {
    // Only paint hosts that exist in the active layout (others may be on hidden screens)
    if (!host.isConnected) continue;
    host.hidden = false;
    host.dataset.tone = news.tone || "mixed";
    host.innerHTML = html;
    host.querySelector("[data-market-open]")?.addEventListener("click", () => {
      showMarketNewsModal(news);
    });

    if (opts.pulse || opts.scrollIntoView) {
      host.classList.remove("is-pulse", "is-fly-in");
      void host.offsetWidth;
      host.classList.add("is-fly-in", "is-pulse");
      if (opts.scrollIntoView && host.offsetParent !== null) {
        try {
          host.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch {
          host.scrollIntoView();
        }
      }
      clearTimeout(host._pulseTimer);
      host._pulseTimer = setTimeout(() => {
        host.classList.remove("is-pulse");
      }, 2200);
    }
  }
}

/**
 * Unmissable "your turn is starting" popup for multiplayer (room + hotseat).
 * Uses a plain fixed div — never <dialog showModal()> (that trapped the page when
 * the main thread was busy and "Let's go" appeared stuck).
 * @param {{ name?: string, isYou?: boolean, mode?: "room"|"hotseat" }} opts
 */
function closeMpTurnModal() {
  const el = document.getElementById("mp-turn-modal");
  if (!el) return;
  clearTimeout(el._autoClose);
  el._autoClose = null;
  el.hidden = true;
  el.setAttribute("hidden", "");
  el.style.display = "none";
  el.removeAttribute("open");
  // If a legacy <dialog> still has modal state, release it
  try {
    if (typeof el.close === "function" && el.open) el.close();
  } catch {
    /* ignore */
  }
  // Ack "your turn" — unlock invent / challenge spend actions
  setMpTurnGate(false);
}

function bindMpTurnModalOnce(el) {
  if (!el || el.dataset.closeBound === "1") return;
  el.dataset.closeBound = "1";
  const dismiss = (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    closeMpTurnModal();
  };
  // Button click
  el.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!t) return;
    if (t.id === "mp-turn-ok" || t.closest?.("#mp-turn-ok")) {
      dismiss(ev);
      return;
    }
    // Click dimmed backdrop (outside the card) also dismisses
    if (t === el) dismiss(ev);
  });
  // Escape
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && el && !el.hidden) closeMpTurnModal();
  });
}

function showTurnStartNotice(opts = {}) {
  const isYou = Boolean(opts.isYou);
  // Arm the input gate immediately when *your* turn starts — even if the
  // popup waits behind market news / year flash. Prevents Challenge clicks early.
  if (isYou && (roomBridge.isRoom() || hotseatBridge.isHotseat())) {
    setMpTurnGate(true);
  }

  // Market bulletin + year flash own the screen first. Defer turn popup until clear.
  // Year foresight modal is click-to-open only; year *flash* still holds the queue.
  if (shouldDeferTurnNotice()) {
    deferredTurnNotice = { ...opts };
    return;
  }

  const name = opts.name || "Player";
  const mode = opts.mode || (roomBridge.isRoom() ? "room" : "hotseat");
  let el = document.getElementById("mp-turn-modal");
  if (!el) {
    el = document.createElement("div");
    el.id = "mp-turn-modal";
    el.className = "mp-turn-modal";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="mp-turn-dialog">
        <p class="mp-turn-kicker" id="mp-turn-kicker"></p>
        <h3 id="mp-turn-title"></h3>
        <p id="mp-turn-body" class="mp-turn-body"></p>
        <button type="button" class="btn btn-primary" id="mp-turn-ok">Let's go</button>
      </div>`;
    document.body.appendChild(el);
  }
  bindMpTurnModalOnce(el);

  const okBtn = el.querySelector("#mp-turn-ok");
  if (okBtn) {
    okBtn.type = "button";
    // Inline handler as belt-and-suspenders (survives if listeners get weird)
    okBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeMpTurnModal();
    };
  }
  const kicker = el.querySelector("#mp-turn-kicker");
  const title = el.querySelector("#mp-turn-title");
  const body = el.querySelector("#mp-turn-body");
  if (kicker) {
    kicker.textContent = mode === "hotseat" ? "Hotseat" : "Friends multiplayer";
  }
  if (isYou) {
    if (title) title.textContent = "It's your turn!";
    if (body) {
      body.textContent =
        mode === "hotseat"
          ? `${name}, the device is yours. Invent, help others, or Face the challenge.`
          : `${name}, you're the active player. Invent, help others, Face the challenge, or Pilot/Scale.`;
    }
    if (okBtn) okBtn.textContent = "Let's go";
  } else {
    if (title) title.textContent = `${name}'s turn`;
    if (body) {
      body.textContent =
        "You can browse and use Learn. Actions unlock when it becomes your turn.";
    }
    if (okBtn) okBtn.textContent = "Got it";
  }

  el.hidden = false;
  el.removeAttribute("hidden");
  el.style.display = "flex";

  try {
    flashToast(isYou ? `▶ Your turn, ${name}!` : `▶ ${name}'s turn`, { durationMs: 2500 });
  } catch {
    /* ignore */
  }
  clearTimeout(el._autoClose);
  // Short auto-dismiss so a stuck overlay can never trap the game
  el._autoClose = setTimeout(() => closeMpTurnModal(), isYou ? 6000 : 4000);
  // Focus button for keyboard
  setTimeout(() => {
    try {
      okBtn?.focus?.({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }, 30);
}

/**
 * Call after multiplayer hydrate — popup when *your* seat becomes active.
 * Only fires once per seat-id change (not on every WS patch).
 */
function maybeNotifyMpTurnStart() {
  const b = mpBridge();
  if (!b) return;
  const activeId = b.getActiveId?.() || null;
  if (!activeId) return;

  // Room: only the seat matching this browser is "you"
  // Hotseat: whoever holds the device is the active player
  const isYou = isOnlineRoomMp()
    ? Boolean(roomBridge.myId() === activeId)
    : hotseatBridge.isHotseat()
      ? true
      : false;

  const prev = state.mpLastActiveSeatId;
  if (!state.mpTurnNoticePrimed) {
    state.mpLastActiveSeatId = activeId;
    state.mpTurnNoticePrimed = true;
    // First paint: if you act first, tell you clearly + open invent or deploy bay
    if (isYou) {
      const name =
        b.activeSeat?.()?.displayName ||
        roomBridge.client?.()?.snapshot?.you?.displayName ||
        "Player";
      if (roomBridge.isRoom()) {
        openRoomTurnStartScreenForOwnInvent();
      }
      showTurnStartNotice({
        name,
        isYou: true,
        mode: roomBridge.isRoom() ? "room" : "hotseat",
      });
    }
    return;
  }
  // Same active seat as last time — never re-open (was making "Let's go" feel stuck)
  if (prev === activeId) return;
  state.mpLastActiveSeatId = activeId;
  // Only pop for the player whose turn just started (not the whole table)
  if (!isYou) {
    // Seat moved to someone else — drop gate + dismiss any leftover turn modal
    // (do not call closeMpTurnModal before clearing gate flag — avoid re-entrancy)
    mpTurnGateActive = false;
    document.body.classList.remove("mp-turn-gate");
    const el = document.getElementById("mp-turn-modal");
    if (el && !el.hidden) {
      clearTimeout(el._autoClose);
      el._autoClose = null;
      el.hidden = true;
      el.setAttribute("hidden", "");
      el.style.display = "none";
    }
    return;
  }
  const name =
    b.activeSeat?.()?.displayName ||
    roomBridge.client?.()?.snapshot?.you?.displayName ||
    "Player";
  showTurnStartNotice({
    name,
    isYou: true,
    mode: roomBridge.isRoom() ? "room" : "hotseat",
  });
  if (roomBridge.isRoom()) {
    // Your invent: Deploy bay if Challenge already locked invent; else Invent workshop
    openRoomTurnStartScreenForOwnInvent();
  }
}

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
  // Title actions first — never let multiplayer/friends setup block the home screen.
  $("#btn-start")?.addEventListener("click", () => {
    clearMissionPickSession();
    leaveHotseat();
    if (currentSoloPlayMode() === "spark") {
      startSparkPortsideMission();
      return;
    }
    showScreen("global");
  });
  $("#btn-choose-theme")?.addEventListener("click", () => {
    clearMissionPickSession();
    leaveHotseat();
    showScreen("global");
  });
  $("#btn-surprise")?.addEventListener("click", () => {
    clearMissionPickSession();
    surpriseMission().catch(() => flashToast("Could not start a surprise mission"));
  });

  try {
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
      enterRoomPlay,
      leaveRoomPlay,
      openWaitConfirm,
      queueMarketNewsModal,
    });
  } catch (e) {
    console.error("[bind] initFriendsUi failed", e);
  }

  $("#btn-mp-pass-device")?.addEventListener("click", () => mpPassDevice());
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
    if (roomBridge.isRoom()) {
      if (confirm("Leave the room? You disconnect from this friends game.")) {
        try {
          roomBridge.client?.()?.leaveLocal?.();
        } catch {
          /* ignore */
        }
        leaveRoomPlay();
        showScreen("friends");
      }
      return;
    }
    if (hotseatBridge.isHotseat()) {
      if (confirm("Leave hotseat? The shared game ends for this device.")) {
        leaveHotseat();
        showScreen("friends");
      }
      return;
    }
    if (confirm("Leave this Quest? You can pick another theme.")) {
      showScreen("global");
    }
  });

  $("#invention-name").addEventListener("input", (e) => {
    if (isViewedInventStoryLocked()) {
      e.target.value = state.inventionName;
      applyStoryFieldLocks();
      return;
    }
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
      if (isMpContributionLocked() || writeCommitInFlight) {
        flashToast(mpContributionLockReason);
        return;
      }
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

  /**
   * While typing: only soft-save after idle (buffer_write / session sync).
   * AI contribution checks + write_commit AP metering run on blur (or explicit flush).
   */
  const scheduleSoftInventSave = () => {
    if (writeCommitInFlight || isMpContributionLocked()) return;
    clearTimeout(writeCommitTimer);
    writeCommitTimer = setTimeout(() => {
      writeCommitTimer = null;
      softPersistInventDrafts();
    }, INVENT_SOFT_SAVE_MS);
  };
  const inventInputBlocked = () =>
    isViewedInventStoryLocked() || isMpContributionLocked() || writeCommitInFlight;

  $("#invention-how")?.addEventListener("input", (e) => {
    if (inventInputBlocked()) {
      e.target.value = state.inventionHow;
      applyStoryFieldLocks();
      if (isMpContributionLocked()) {
        flashToast(mpContributionLockReason);
      } else {
        flashToast("Invention locked — Challenge started or you can't edit this invent.");
      }
      return;
    }
    state.inventionHow = e.target.value;
    // Spark: keep impact in lockstep so challenge/deploy face length checks pass
    mirrorSparkStoryImpact();
    bumpClaimTiming();
    bumpNarrative();
    scheduleSoftInventSave();
  });
  $("#invention-impact")?.addEventListener("input", (e) => {
    if (inventInputBlocked()) {
      e.target.value = state.inventionImpact;
      applyStoryFieldLocks();
      if (isMpContributionLocked()) {
        flashToast(mpContributionLockReason);
      } else {
        flashToast("Invention locked — Challenge started or you can't edit this invent.");
      }
      return;
    }
    // Spark hides this field; ignore stray input
    if (singleStoryFaceEnabled()) return;
    state.inventionImpact = e.target.value;
    bumpClaimTiming();
    bumpNarrative();
    scheduleSoftInventSave();
  });
  $("#invention-name")?.addEventListener("input", (e) => {
    if (inventInputBlocked()) {
      e.target.value = state.inventionName;
      applyStoryFieldLocks();
      return;
    }
    state.inventionName = e.target.value;
    scheduleSoftInventSave();
  });
  ["#invention-how", "#invention-impact", "#invention-name"].forEach((sel) => {
    $(sel)?.addEventListener("blur", () => {
      if (suppressInventBlurCommit) return;
      if (isViewedInventStoryLocked() && !isMpContributionLocked()) {
        applyStoryFieldLocks();
        return;
      }
      // Finished with this field → cancel soft-save timer and run real commit/AI
      if (writeCommitTimer) {
        clearTimeout(writeCommitTimer);
        writeCommitTimer = null;
      }
      commitWriteIfNeeded();
    });
  });

  $("#btn-fill-other")?.addEventListener("click", () => {
    if (inventInputBlocked()) {
      flashToast(
        isMpContributionLocked()
          ? mpContributionLockReason
          : "Invention locked — Challenge started or you can't edit this invent."
      );
      return;
    }
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

  $("#btn-wait").addEventListener("click", () => requestWaitTurn());
  $("#wait-confirm-cancel")?.addEventListener("click", () => closeWaitConfirm());
  $("#wait-confirm-ok")?.addEventListener("click", () => {
    const fn = _waitConfirmOnOk;
    closeWaitConfirm();
    if (typeof fn === "function") fn();
  });
  $("#wait-confirm-backdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "wait-confirm-backdrop") closeWaitConfirm();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const bd = $("#wait-confirm-backdrop");
    if (bd && bd.classList.contains("open")) closeWaitConfirm();
  });
  $("#btn-end-turn")?.addEventListener("click", () => endTurn());
  $("#btn-lobby")?.addEventListener("click", () => lobbyAction());
  $("#btn-to-challenge")?.addEventListener("click", () => {
    if (isInventActionBusy()) {
      flashToast(inventActionBusyReason());
      return;
    }
    const b = mpBridge();
    // Recovery: open Deploy for a challenge-passed invent (not a dual workshop bay)
    if (deployStagesEnabled() && state.deployUnlocked && state.challengePassed) {
      if (state.deployStage === "new_normal" || state.deployStage === "scale") {
        flashToast("This invent is already Scaled.");
        return;
      }
      if (b && !(b.canRunDeploy?.() || b.canOpenDeployBay?.())) {
        flashToast("Not your turn, or this invent is not ready to deploy.");
        return;
      }
      const inv =
        (b?.getViewId && b.invent?.(b.getViewId())) ||
        null;
      enterDeployBayInteractive(inv, {
        helper: Boolean(b?.viewingOther?.()),
        ownerName: b?.viewingOther?.() ? "this invent" : "your invent",
      });
      return;
    }
    // Multiplayer: only owner faces Challenge
    if (b && !b.canFaceChallenge?.()) {
      flashToast(
        b.viewingOther?.()
          ? "Only the owner can face Challenge on this invent."
          : "Cannot face Challenge on this invent."
      );
      return;
    }
    if (!inventReadyForChallenge()) {
      flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
      return;
    }
    // Room: enter_challenge inside enterChallenge() (server AP)
    // Hotseat: enter_challenge via mp-session inside enterChallenge()
    // Solo only: local sim spend here
    if (apEnabled() && !roomBridge.isRoom() && !hotseatBridge.isHotseat()) {
      const r = dispatchSim("enter_challenge");
      if (!r.ok) {
        if (r.error === "no_ap") flashToast("No AP — End Turn or Wait first.", { resource: "ap" });
        else flashToast(r.error || "Cannot enter challenge");
        return;
      }
      renderHud();
    } else if (!roomBridge.isRoom() && !hotseatBridge.isHotseat()) {
      state.turnPhase = "scrutiny";
    }
    // Opens the dedicated Challenge screen (same as hotseat) — not invent inline
    enterChallenge().catch((e) => {
      console.error(e);
      flashToast(e.message || "Challenge failed to open");
    });
  });
  $("#btn-challenge-back")?.addEventListener("click", () => {
    // Deploy bay already open: cosmetic leave to invent (owner uses Back to Invent to reopen)
    if (state.deployUnlocked && state.challengePassed) {
      state.turnPhase = "between_stages";
      showScreen("workshop");
      renderWorkshop();
      applyEndTurnChrome();
      return;
    }
    // Spectators / not your turn: leave Challenge view only
    if (state.challengeSpectator || isChallengeWatchOnly() || isMpInventSpectator()) {
      leaveChallengeSpectatorIfNeeded();
      if (state.screen !== "workshop") {
        showScreen("workshop");
        renderWorkshop();
      }
      return;
    }
    // Owner mid-Challenge: same as Abandon the challenge (unlock invent for helpers)
    abandonChallengeToInvent();
  });
  $("#btn-challenge-abandon")?.addEventListener("click", () => abandonChallengeToInvent());
  $("#btn-challenge-submit")?.addEventListener("click", () => submitChallengeAnswer());
  // Live defense draft → room spectators (debounced)
  $("#challenge-answer")?.addEventListener("input", (e) => {
    if (!canFightChallengeCombat() || challengeCombatBusy) {
      // Revert if locked (shouldn't fire while readOnly, but be safe)
      e.target.value = state.challengeAnswer || "";
      e.target.readOnly = true;
      return;
    }
    state.challengeAnswer = e.target.value;
    scheduleChallengeAnswerSync();
  });
  $("#btn-deploy-stage-primary")?.addEventListener("click", () => {
    if (isDeployWatchOnly()) {
      flashToast("Watching only — active player fields Pilot/Scale.");
      return;
    }
    const next = nextDeployStageAction();
    if (next) attemptDeployStage(next);
  });
  $("#btn-deploy-abandon")?.addEventListener("click", () => {
    const b = mpBridge();
    if (state.challengeSpectator || (b && !b.isMyTurn?.())) {
      flashToast("Watching only — leave via seat tabs.");
      updateDeployFooterButtons();
      return;
    }
    if (b?.viewingOther?.()) {
      flashToast("Only the invent owner can abandon deployment.");
      updateDeployFooterButtons();
      return;
    }
    // Owner reopens invent (clears Challenge + Pilot)
    reopenInventToWorkshop({ source: "deploy", confirm: true });
  });
  $("#btn-deploy-end-turn")?.addEventListener("click", () => {
    const b = mpBridge();
    if (state.challengeSpectator || (b && !b.isMyTurn?.())) {
      flashToast("Watching only — leave via seat tabs when done.");
      updateDeployFooterButtons();
      return;
    }
    endTurn();
  });
  $("#btn-deploy-to-invent")?.addEventListener("click", () => {
    // Browse invent without reopening Challenge (owner may still be deploy-locked)
    if (state.challengeSpectator || isDeployWatchOnly()) {
      leaveChallengeSpectatorIfNeeded({ force: true, forceWorkshop: true });
      return;
    }
    state.screen = "workshop";
    $$(".screen").forEach((el) =>
      el.classList.toggle("active", el.id === "screen-workshop")
    );
    renderWorkshop();
    renderMpChrome();
    applyEndTurnChrome();
  });
  // Abandon is also wired above with btn-challenge-back for owner mid-Challenge
  $("#btn-workshop-to-deploy")?.addEventListener("click", () => {
    // Legacy control — same recovery as Continue to Deploy
    if (!state.deployUnlocked || !state.challengePassed) return;
    const b = mpBridge();
    enterDeployBayInteractive(
      (b?.getViewId && b.invent?.(b.getViewId())) || null,
      { helper: Boolean(b?.viewingOther?.()), ownerName: "your invent" }
    );
  });
  $("#btn-challenge-coach")?.addEventListener("click", () => {
    if (!canFightChallengeCombat()) {
      flashToast("AI help is only for the invent owner mid-Challenge.");
      return;
    }
    coachChallenge("coach-challenge");
  });
  $("#btn-challenge-draft")?.addEventListener("click", () => {
    if (!canFightChallengeCombat()) {
      flashToast("AI help is only for the invent owner mid-Challenge.");
      return;
    }
    coachChallenge("draft-challenge");
  });
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
    // Spectator / watch-only: never call renderChallengeStep (was dumping viewers to Invent)
    if (isChallengeWatchOnly()) {
      flashToast(
        "Watching only — only the invent owner can finish this Challenge. Use the seat tabs to leave."
      );
      applyChallengeWatchOnlyLock();
      return;
    }
    endTurn();
    // Stay on Challenge if still mid-own-challenge; otherwise HUD/workshop paint handles it
    if (state.screen === "challenge-step" && !state.challengeSpectator) {
      renderChallengeHud();
    }
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
  $("#btn-regen-vision").addEventListener("click", () => {
    lastRoomVisionKey = "";
    updateVision({
      immediate: true,
      force: true,
      context: "invent",
    });
  });
  $("#btn-regen-challenge-vision")?.addEventListener("click", () => {
    lastRoomVisionKey = "";
    refreshChallengeVision(null, { immediate: true, force: true });
  });

  $$(".side-tab[data-tab]").forEach((btn) =>
    btn.addEventListener("click", () => setSideTab(btn.dataset.tab))
  );
  $$(".side-tab[data-ch-tab]").forEach((btn) =>
    btn.addEventListener("click", () => setChallengeSideTab(btn.dataset.chTab))
  );
  $$(".side-tab[data-dep-tab]").forEach((btn) =>
    btn.addEventListener("click", () => setDeploySideTab(btn.dataset.depTab))
  );
  $("#btn-regen-deploy-vision")?.addEventListener("click", () => {
    lastRoomVisionKey = "";
    updateVision({ immediate: true, force: true, context: "deploy" });
  });

  $("#btn-outcome-new").addEventListener("click", () => {
    if (isMultipartyOutcome()) {
      flashToast(
        isRoomMultipartyOutcome()
          ? "In friends play, the chooser starts the next Quest — use that button."
          : "Multiplayer doesn't use Leave Quest here — return via Friends."
      );
      return;
    }
    // Leave Quest → theme / Challenge picker (game continues)
    showScreen("global");
  });
  $("#btn-outcome-retry").addEventListener("click", () => {
    if (isMultipartyOutcome()) {
      flashToast(
        isRoomMultipartyOutcome()
          ? "Friends Challenges only end on a full win or collapse — partial Scales keep the Challenge going in play."
          : "Multiplayer doesn't continue from this screen."
      );
      return;
    }
    if (!state.mission) {
      showScreen("global");
      return;
    }
    const kind = state.outcome?.kind;
    if (kind === "collapse") {
      // Restart same mission from scratch
      const mission = state.mission;
      const global = state.global;
      startMission(mission);
      if (global) state.global = global;
      return;
    }
    // Partial (or review invent after win): same place, meters as left
    if (kind === "partial") {
      // New invent cycle against remaining crisis — re-challenge before next Pilot/Scale
      applyLocalReopenInvent();
      flashToast(
        "Back in this Quest — crisis still hot. Invent another step, then Face Challenge to field it."
      );
    }
    showScreen("workshop");
    renderWorkshop();
    applyEndTurnChrome();
    updateChallengeButton();
  });
  $("#btn-outcome-rematch-pick")?.addEventListener("click", () => launchRoomNextChallengePick());

  // Year foresight — reopen bulletin (same dialog as round-end year tick)
  const openYearFromHud = () => openYearForesightFromHud();
  for (const id of ["hud-year", "ch-hud-year", "mp-hud-year", "hs-hud-year"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("click", openYearFromHud);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openYearFromHud();
      }
    });
  }
  $("#btn-outcome-leave-room")?.addEventListener("click", () => {
    if (!isMultipartyOutcome()) return;
    if (isRoomMultipartyOutcome()) {
      if (!confirm("Leave the room? Others can still rematch without you.")) return;
      try {
        roomBridge.client?.()?.leaveLocal?.();
      } catch {
        /* ignore */
      }
      leaveRoomPlay();
      showScreen("friends");
      return;
    }
    // Hotseat / other multiparty: clear local session and return to Friends
    leaveHotseat();
    leaveRoomPlay({ silent: true });
    state.mpOutcome = null;
    if (state.outcome) state.outcome.mpOutcome = null;
    showScreen("friends");
  });
  $("#btn-outcome-share")?.addEventListener("click", async () => {
    const payload = state.sharePayload;
    if (!payload) {
      flashToast("Nothing to share yet.");
      return;
    }
    const btn = $("#btn-outcome-share");
    if (btn?.disabled) return;
    try {
      if (btn) btn.disabled = true;
      // Prefer already-decoded invent vision (never trust bare img.src — empty → page URL)
      const live = collectVisionForShare();
      const visionUrl = live.url || payload.visionUrl || "";
      const hasVision = Boolean(live.image || isUsableVisionUrl(visionUrl));
      flashToast(hasVision ? "Building share card with your vision…" : "Building share card…");
      const url = await renderShareCard({
        ...payload,
        visionUrl,
        visionImage: live.image || undefined,
      });
      if (!url) {
        flashToast("Could not build share card.");
        return;
      }
      const slug = String(payload.inventionName || "run")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      downloadDataUrl(url, `future-forge-${slug || "run"}.png`);
      flashToast(
        hasVision
          ? "Share card downloaded — Future Forge by Warmer Sun + your vision."
          : "Share card downloaded — Future Forge by Warmer Sun."
      );
    } catch (e) {
      console.warn("[share]", e);
      flashToast("Share card failed.");
    } finally {
      if (btn) btn.disabled = false;
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
  $("#btn-deploy-help")?.addEventListener("click", openHelp);
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
