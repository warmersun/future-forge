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
 * Player-facing 4-lane Visual Ontology Workshop.
 * - Lanes 1–2 and Alchemy Fusion never call a model.
 * - Typing in textareas never triggers innerHTML wipes or per-keystroke LLM calls.
 * - score-pathway runs once per unique plugged Pathway fingerprint (and skips early forecast wires).
 * - Custom inventions and edited pathways run real timing feasibility & card art pipelines.
 */

import { TECHS, GAME, detectClaimStretch } from "../data.js";
import { resolveTechTrack, selectPlayableMilestones } from "../ontology/index.js";
import { collectorMilestonesForTech } from "../ontology/collector-ontology.js";
import {
  ideaImageId,
  ideasOrFallback,
  localIdeaSparks,
  rotateLocalIdeaSparks,
  localPlainTiming,
} from "../idea-cards.js";
import { localPose } from "../challenge-pose.js";
import { paintCollectorPicker } from "../collector-cards.js";
import { appendCaptainLog } from "../captain-log.js?v=crisis-role-3";
import { techCost } from "../sim/economy.js";
import {
  seedCrisisTiles,
  placedTechEconomy,
  remainingConcernAngles,
  ensureConcernRoster,
  boardHolds as boardHoldsNow,
} from "../hex/board-state.js?v=plain-1";
import {
  heuristicPathwayScore,
  normalizePathwayScore,
  blendPathwayScore,
  clampPathwayScore,
  timingLevelToPct,
} from "../hex/evaluate.js?v=calm-stage-1";
import { mountTrendChart, destroyTrendChart } from "../trend-chart.js?v=explorer-1";
import {
  renderOntologyBoard,
  resolveChainHighlight,
  syncOntologyWireGeometry,
} from "./board-render.js";
import {
  isPathwayBoard,
  addTechTrack,
  removeTechTrack,
  setChartOpen,
  dealMilestone as dealMilestoneOn,
  removeUseCase,
  addCustomUseCase,
  createPathway,
  removePathway,
  fusePathways,
  unfuseIngredient,
  setPathwayHow,
  setIngredientTiming,
  setIngredientArt,
  addDynamicConvergence,
  plugWire,
  unplugWire,
  setPinnedRules,
  attachRd,
  rollRdFactor,
  formatRdFactor,
  attachArgument,
  settleArgument,
  removeArgument,
  acceptedArgumentsForPathway,
  summonChallenger,
  setChallengerAnswer,
  resolveChallengerLamp,
  migrateToPathwayBoard,
  projectToTiles,
  effectiveTiming,
  pathwayContentFingerprint,
  composePathwayHow,
  needsBridgeWarning,
  applyScoreToCrisis,
  isUseCaseEarly,
} from "./pathway-model.js";

const TUTORIAL_SUGGESTED_REPLY =
  "The growers' committee signs the flight calendar and the co-op pays for the packs. Nobody pays to drink.";

function mapConcernAnswerQuality(data) {
  const q = String(data?.quality || "").toLowerCase();
  if (q === "hit" || q === "glance" || q === "miss") return q;
  const v = String(data?.verdict || "").toLowerCase();
  if (v === "pass" || v === "hit") return "hit";
  if (v === "partial" || v === "glance") return "glance";
  if (v === "fail" || v === "miss") return "miss";
  return null;
}

function parseFeasibilityResult(data, fallbackText, techId, questYear) {
  if (data && typeof data === "object") {
    const rawLevel = String(data.timingLevel || data.level || data.verdict || "").toLowerCase();
    let level =
      rawLevel === "green" || rawLevel === "ok" || rawLevel === "honest"
        ? "green"
        : rawLevel === "red" || rawLevel === "vapor" || rawLevel === "reject" || rawLevel === "nonsense"
          ? "red"
          : rawLevel === "yellow" || rawLevel === "stretch"
            ? "yellow"
            : null;
    const rawPct = Number(data.feasibilityPct ?? data.timingPct ?? data.pct);
    const pct = Number.isFinite(rawPct)
      ? Math.max(5, Math.min(98, Math.round(rawPct)))
      : level
        ? timingLevelToPct(level)
        : 78;
    if (!level) level = pct >= 68 ? "green" : pct >= 40 ? "yellow" : "red";
    const reason = String(data.timingReason || data.reason || data.message || data.note || "").slice(0, 280);
    return { timingLevel: level, timingPct: pct, timingReason: reason };
  }
  if (!techId) {
    const plain = localPlainTiming(fallbackText);
    const level = plain?.level || "green";
    return {
      timingLevel: level,
      timingPct: timingLevelToPct(level),
      timingReason: String(plain?.reason || ""),
    };
  }
  const stretch = detectClaimStretch(fallbackText || "", questYear);
  if (stretch?.level === "red" || stretch?.level === "yellow") {
    return {
      timingLevel: stretch.level,
      timingPct: timingLevelToPct(stretch.level),
      timingReason: String(stretch.note || stretch.reason || ""),
    };
  }
  return { timingLevel: "green", timingPct: 82, timingReason: "" };
}

export function createPathwayWorkshop(api) {
  const tracks = new Map();
  const sparkBatches = new Map();
  /** @type {Map<string, object>} */
  const charts = new Map();
  /** @type {Set<string>} */
  const expandedDescTechs = new Set();
  /** @type {Map<string, string>} */
  const selectedTrendByTech = new Map();
  /** @type {Map<string, boolean>} */
  const chartOverride = new Map();
  /** @type {Set<string>} */
  const scoringPathwayIds = new Set();
  /** @type {Set<string>} */
  const polishingPathwayIds = new Set();

  let focusedTechId = null;
  let focusedPathwayId = null;
  let traceSelection = null;
  let lastHighlight = null;
  let editingPathwayId = null;
  let editHowBuffer = "";
  let selectedUseCaseIds = [];
  let pickerOpen = false;
  let pickerDomain = "all";
  let customUseOpen = false;
  let writeOpen = false;
  let draftHow = "";
  let createBusy = false;
  let summonBusy = false;
  let summoningState = null;
  let draftingRoadblockId = null;
  let argumentModalOpen = false;
  let argumentBusy = false;
  let openChallengerId = null;
  let roadblockDraft = "";
  let wired = false;
  let resizeObs = null;
  let wireRaf = 0;
  let collectionCards = null;
  let collectorFilterTech = "all";

  function board() {
    return api.getBoard?.() || null;
  }

  function year() {
    return Number(api.getYear?.()) || 2026;
  }

  function rootEl() {
    const fromApi = api.$?.("#ontology-board");
    if (fromApi) return fromApi;
    if (typeof document === "undefined") return null;
    return document.querySelector("#ontology-board");
  }

  function techById(id) {
    return TECHS.find((t) => t.id === id) || null;
  }

  function trendsForTech(techId) {
    const list = api.getTrends?.(techId);
    if (Array.isArray(list)) {
      return list.filter((t) => t && (!techId || t.techId === techId));
    }
    return [];
  }

  function trackFor(techId) {
    const cached = tracks.get(techId);
    const liveTrends = trendsForTech(techId);
    if (cached && cached._trendCount === liveTrends.length) return cached;
    const track = resolveTechTrack(techId, {
      quest: api.getMission?.() || null,
      predictions: api.getPredictions?.() || [],
      trends: liveTrends,
      collectorCards: collectionCards || [],
    });
    if (track) {
      track._trendCount = liveTrends.length;
      tracks.set(techId, track);
    }
    return track;
  }

  function enforceWorlds() {
    if (typeof api.enforceWorlds === "function") return api.enforceWorlds() !== false;
    return GAME.enforceWorldDocking !== false;
  }

  function currentWiresView(current, y) {
    if (!current) return [];
    return Object.values(current.wires || {}).map((wire) => {
      const pathway = current.pathways?.[wire.pathwayId];
      const timing = pathway ? effectiveTiming(pathway, current.useCases, y) : null;
      const crisis = current.crises?.[wire.crisisId];
      const fp = pathway ? pathwayContentFingerprint(pathway, current) : "";
      const impact = current.pathwayImpacts?.[fp];
      const role = crisis?.role || "local";
      const pending =
        (Boolean(impact?.pending) || scoringPathwayIds.has(wire.pathwayId)) && !timing?.early;
      const summoning =
        summoningState && summoningState.wireId === wire.id ? summoningState : null;
      return {
        ...wire,
        pending,
        summoning,
        state: timing?.early ? "early" : "solid",
        year: timing?.early ? Number(String(timing.timingReason).match(/~(\d+)/)?.[1]) : null,
        pathwayTitle:
          pathway?.ingredients?.map((i) => i.title).slice(0, 2).join(" · ") || "Pathway",
        lamp: timing?.early ? "red" : crisis?.lamp || "red",
        delta: timing?.early ? 0 : impact?.crisisDelta?.[role] ?? crisis?.delta,
        reason: timing?.early
          ? timing.timingReason
          : impact?.crisisReasons?.[role] || crisis?.reason || "",
        challengers: Object.values(current.challengers || {}).filter(
          (ch) => ch.wireId === wire.id
        ),
      };
    });
  }

  function viewOf(current) {
    const y = year();
    const mission = api.getMission?.() || {};
    const pressure = api.getPressure?.() || {};
    const winMax = mission.winMax || {};
    const suggested = new Set(mission.suggested || []);
    const why = mission.suggestedWhy || {};
    const onBoardSet = new Set(Object.keys(current?.techTracks || {}));

    const activeFocus = focusedTechId || Object.keys(current?.techTracks || {})[0] || null;
    const trackRows = Object.values(current?.techTracks || {})
      .sort((a, b) => (a.addedOrder || 0) - (b.addedOrder || 0))
      .map((row) => {
        const resolved = trackFor(row.techId);
        const dealt = new Set(row.activeMilestoneIds || []);
        const allTrends = resolved?.trends?.length ? resolved.trends : trendsForTech(row.techId);
        const pickedTrendId = selectedTrendByTech.get(row.techId);
        const activeTrend =
          allTrends.find((t) => t.id === pickedTrendId) || allTrends[0] || null;
        const allMilestones = (resolved?.milestones || []).map((m) => ({
          ...m,
          dealt: dealt.has(m.id),
        }));
        const playableMilestones = selectPlayableMilestones(allMilestones, y, dealt);
        const chartVisible = chartOverride.has(row.techId)
          ? chartOverride.get(row.techId)
          : row.techId === activeFocus;
        return {
          techId: row.techId,
          name: resolved?.name || row.techId,
          icon: resolved?.icon || techById(row.techId)?.icon || "",
          world: resolved?.world || "bits",
          capability: resolved?.capability || "",
          trendSummary: resolved?.trendSummary || "",
          chartOpen: Boolean(chartVisible),
          trends: allTrends,
          activeTrend,
          descExpanded: expandedDescTechs.has(row.techId),
          milestones: playableMilestones,
        };
      });

    const useCases = Object.values(current?.useCases || {}).map((uc) => ({
      ...uc,
      techName: techById(uc.techId)?.name || uc.techId || "Custom",
    }));

    const pathways = Object.values(current?.pathways || {})
      .sort((a, b) => (a.createdOrder || 0) - (b.createdOrder || 0))
      .map((pw) => {
        const timing = effectiveTiming(pw, current.useCases, y);
        return {
          id: pw.id,
          title:
            pw.ingredients.map((ing) => ing.title).slice(0, 2).join(" + ") +
              (pw.ingredients.length > 2 ? ` +${pw.ingredients.length - 2}` : "") ||
            "Pathway",
          ingredients: pw.ingredients,
          convergences: pw.convergences || [],
          howText:
            editingPathwayId === pw.id ? editHowBuffer : composePathwayHow(pw),
          timingLevel: timing.early ? "red" : timing.timingLevel,
          timingPct: timing.timingPct,
          timingReason: timing.timingReason,
          timingPending: timing.pending,
          scoring: scoringPathwayIds.has(pw.id),
          polishing: polishingPathwayIds.has(pw.id),
          bridge: needsBridgeWarning(pw, enforceWorlds()),
          rdBoost: pw.rdBoost,
          arguments: (pw.argumentIds || [])
            .map((id) => current.arguments?.[id])
            .filter(Boolean),
          fuseTargets: Object.values(current.pathways)
            .filter((other) => other.id !== pw.id)
            .map((other) => ({
              id: other.id,
              title:
                other.ingredients.map((i) => i.title).slice(0, 2).join(" + ") ||
                other.id,
            })),
        };
      });

    const crises = Object.values(current?.crises || {}).map((c) => {
      const key = c.meterKey || c.name || c.role;
      return {
        ...c,
        level: pressure[key] != null ? pressure[key] : null,
        goal: winMax[key] != null ? winMax[key] : null,
      };
    });

    const wires = currentWiresView(current, y);
    const open = openChallengerId ? current?.challengers?.[openChallengerId] : null;
    const sparks = activeFocus ? sparkBatches.get(activeFocus)?.ideas || [] : [];

    return {
      year: y,
      isTutorial: Boolean(api.isTutorial?.()),
      focusedTechId: activeFocus,
      focusedPathwayId,
      trace: traceSelection,
      editingPathwayId,
      tracks: trackRows,
      useCases,
      pathways,
      crises,
      wires,
      rules: current?.rules || [],
      sparks,
      createBusy,
      summoning: summoningState,
      pickerOpen,
      pickerDomain,
      customUseOpen,
      writeOpen,
      draftHow,
      argumentModalOpen,
      argumentBusy,
      voiceSupported: Boolean(api.toggleVoice),
      voiceActive: Boolean(api.isVoiceActive?.()),
      selectedUseCaseIds,
      enforceWorlds: enforceWorlds(),
      catalog: TECHS.map((tech) => {
        const c = api.budgetWillEnabled?.() ? techCost(tech) : null;
        const costBits = [];
        if (c?.budget) costBits.push(`${c.budget}$`);
        if (c?.will) costBits.push(`Goodwill ${c.will}`);
        return {
          id: tech.id,
          name: tech.name,
          icon: tech.icon || "",
          domain: tech.domain || "other",
          world: tech.polarity || "bits",
          onBoard: onBoardSet.has(tech.id),
          recommended: suggested.has(tech.id) || tech.id === mission.spotlight?.techId,
          why: why[tech.id] || tech.summary || "",
          costLabel: costBits.join(" · "),
        };
      }).sort((a, b) => Number(b.recommended) - Number(a.recommended)),
      openChallenger: open
        ? { ...open, draft: roadblockDraft, drafting: draftingRoadblockId === open.id }
        : null,
    };
  }

  function scheduleWireSync() {
    if (typeof window === "undefined") return;
    if (wireRaf) cancelAnimationFrame(wireRaf);
    wireRaf = requestAnimationFrame(() => {
      wireRaf = 0;
      const root = rootEl();
      const current = board();
      if (!root || !isPathwayBoard(current)) return;
      syncOntologyWireGeometry(root, {
        wires: currentWiresView(current, year()),
        highlight: lastHighlight,
      });
    });
  }

  function scrollLaneIntoView(laneKey) {
    const root = rootEl();
    const laneEl = root?.querySelector?.(`#ontology-lane-${laneKey}`);
    if (!laneEl) return;
    const scroller = root.querySelector?.("[data-lanes-scroll]");
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 4) {
      const targetLeft = Math.max(0, laneEl.offsetLeft - 8);
      scroller.scrollTo?.({ left: targetLeft, behavior: "smooth" });
      return;
    }
    const lanes = root.querySelector?.(".ontology-lanes");
    if (lanes && lanes.scrollWidth > lanes.clientWidth + 4) {
      const targetLeft = Math.max(0, laneEl.offsetLeft - 8);
      lanes.scrollTo?.({ left: targetLeft, behavior: "smooth" });
    }
  }

  function paint() {
    const root = rootEl();
    if (!root) return;
    wireDom();
    const current = board();
    const prevScrollTop = root.scrollTop || 0;
    const prevStageScrollLeft = root.querySelector?.("[data-lanes-scroll]")?.scrollLeft || 0;
    const prevLaneScrollLeft = root.querySelector?.(".ontology-lanes")?.scrollLeft || 0;

    const view = isPathwayBoard(current) ? viewOf(current) : viewOf(null);
    lastHighlight = resolveChainHighlight(view);
    if (traceSelection && !lastHighlight) {
      traceSelection = null;
    }
    root.innerHTML = renderOntologyBoard(view);

    if (prevScrollTop) root.scrollTop = prevScrollTop;
    const scrollerEl = root.querySelector?.("[data-lanes-scroll]");
    if (scrollerEl && prevStageScrollLeft) scrollerEl.scrollLeft = prevStageScrollLeft;
    const lanesEl = root.querySelector?.(".ontology-lanes");
    if (lanesEl && prevLaneScrollLeft) lanesEl.scrollLeft = prevLaneScrollLeft;
    if (lanesEl?.addEventListener) {
      lanesEl.addEventListener("scroll", scheduleWireSync, { passive: true });
    }
    const scrollStage = root.querySelector?.("[data-lanes-stage]");
    if (scrollStage && typeof ResizeObserver !== "undefined") {
      resizeObs?.disconnect?.();
      resizeObs = new ResizeObserver(() => scheduleWireSync());
      resizeObs.observe(scrollStage);
    }

    mountCharts(view);
    syncOntologyWireGeometry(root, { wires: view.wires, highlight: lastHighlight });
    scheduleWireSync();
  }

  function mountCharts(view) {
    for (const chart of charts.values()) destroyTrendChart(chart);
    charts.clear();
    const root = rootEl();
    if (!root?.querySelectorAll) return;
    const y = year();
    const trackById = new Map((view?.tracks || []).map((t) => [t.techId, t]));
    for (const canvas of root.querySelectorAll("canvas[data-trend-tech]")) {
      const techId = canvas.getAttribute("data-trend-tech");
      const trackView = trackById.get(techId);
      const trend =
        trackView?.activeTrend ||
        (trackFor(techId)?.trends || [])[0] ||
        trendsForTech(techId)[0] ||
        null;
      if (!trend) continue;
      const chart = mountTrendChart(canvas, trend, {
        yearNow: y,
        nowLabel: `NOW ${y}`,
        compact: true,
        playableMilestones: trackView?.milestones || [],
        onClickMilestone: (milestoneId) => {
          if (milestoneId) dealMilestone(techId, milestoneId);
        },
      });
      if (chart) charts.set(techId, chart);
    }
  }

  function syncDerivedProse(projected) {
    if (!api.setDerivedProse) return;
    const list = Object.values(projected?.pathways || {});
    const titles = list
      .flatMap((p) => (p.ingredients || []).map((i) => i.title))
      .filter(Boolean);
    const hows = list.map((p) => composePathwayHow(p)).filter(Boolean);
    api.setDerivedProse({
      inventionName: titles.slice(0, 3).join(" + "),
      inventionHow: hows.join("\n\n"),
      inventionImpact: "",
    });
  }

  function commit(next, opts = {}) {
    if (!isPathwayBoard(next)) return false;
    next.questYear = year();
    const prev = board();
    const prevEcon = placedTechEconomy(prev);
    const projected = projectToTiles(next);
    projected.questYear = year();
    api.setBoard?.(projected);
    if (opts.bill && api.reconcileStackFromBoard) {
      const econ = placedTechEconomy(projected);
      const rec = api.reconcileStackFromBoard(econ.all, prevEcon);
      if (rec && rec.ok === false) {
        api.setBoard?.(prev);
        api.flashUnaffordableTech?.(rec.techId, rec.error);
        paint();
        return false;
      }
    }
    syncDerivedProse(projected);
    api.commitBoard?.(projected);
    if (!opts.silent) api.onBoardPainted?.();
    paint();
    return true;
  }

  function gateTech(current, techId, collectorCardId) {
    if (!techId || !api.canPlaceInvention) return { ok: true };
    const already = Object.values(current.pathways || {}).some((pw) =>
      pw.ingredients.some((ing) => ing.techId === techId)
    );
    if (already && !collectorCardId) return { ok: true };
    const free =
      collectorCardId &&
      !Object.values(current.pathways || {}).some((pw) =>
        pw.ingredients.some((ing) => ing.collectorCardId === collectorCardId)
      );
    return (
      api.canPlaceInvention({
        id: "pending",
        kind: "invention",
        techId,
        q: null,
        r: null,
        origin: free ? "collector" : "pathway",
        collectorCardId: free ? collectorCardId : null,
      }) || { ok: true }
    );
  }

  function seedFromMission(mission) {
    tracks.clear();
    sparkBatches.clear();
    expandedDescTechs.clear();
    selectedTrendByTech.clear();
    chartOverride.clear();
    scoringPathwayIds.clear();
    polishingPathwayIds.clear();
    summoningState = null;
    draftingRoadblockId = null;
    traceSelection = null;
    lastHighlight = null;
    selectedUseCaseIds = [];
    editingPathwayId = null;
    openChallengerId = null;
    argumentModalOpen = false;
    pickerOpen = false;
    customUseOpen = false;
    writeOpen = false;
    draftHow = "";

    let next = migrateToPathwayBoard(seedCrisisTiles(mission));
    next = setPinnedRules(next, api.getRules?.() || mission?.rules || []);
    const starterIds = api.isTutorial?.()
      ? ["drones"]
      : [
          mission?.spotlight?.techId,
          ...(Array.isArray(mission?.suggested) ? mission.suggested.slice(0, 1) : []),
        ].filter(Boolean);
    const uniqueStarter = [...new Set(starterIds)].slice(0, 1);
    for (const techId of uniqueStarter) {
      next = addTechTrack(next, techId);
      trackFor(techId);
      focusedTechId = techId;
    }
    if (api.isTutorial?.()) {
      const firstCrisis = Object.values(next.crises || {})[0];
      if (firstCrisis) {
        firstCrisis.name = "Clean Water";
        next.crises = { [firstCrisis.id]: firstCrisis };
        for (const [tid, t] of Object.entries(next.tiles || {})) {
          if (t?.kind === "crisis" && tid !== firstCrisis.id) delete next.tiles[tid];
          else if (tid === firstCrisis.id) t.name = "Clean Water";
        }
      }
      next.concernRoster = ["stakeholder"];
      next.concernTargetCount = 1;
    } else {
      next = ensureConcernRoster(next);
    }
    next.questYear = year();
    commit(next, { silent: true });
  }

  function restoreFromBoard(incomingBoard, opts = {}) {
    tracks.clear();
    sparkBatches.clear();
    expandedDescTechs.clear();
    selectedTrendByTech.clear();
    chartOverride.clear();
    scoringPathwayIds.clear();
    polishingPathwayIds.clear();
    summoningState = null;
    draftingRoadblockId = null;
    traceSelection = null;
    lastHighlight = null;
    selectedUseCaseIds = [];
    focusedPathwayId = null;
    editingPathwayId = null;
    editHowBuffer = "";
    openChallengerId = null;
    roadblockDraft = "";
    argumentModalOpen = false;
    pickerOpen = false;
    customUseOpen = false;
    writeOpen = false;
    draftHow = "";

    const current = isPathwayBoard(incomingBoard) ? incomingBoard : board();
    const trackIds = Object.keys(current?.techTracks || {});
    for (const tid of trackIds) {
      trackFor(tid);
    }
    const wanted = opts.focusedTechId ? String(opts.focusedTechId) : null;
    if (wanted && current?.techTracks?.[wanted]) {
      focusedTechId = wanted;
    } else if (trackIds.length) {
      focusedTechId = trackIds[0];
    } else {
      focusedTechId = wanted || null;
    }
    paint();

    if (api.fetchIdeaImage && isPathwayBoard(current)) {
      const y = year();
      const place = api.getPlace?.() || "";
      for (const pw of Object.values(current.pathways || {})) {
        for (const ing of pw.ingredients || []) {
          if (!ing || ing.artUrl) continue;
          if (!ing.artId && !ing.imagePrompt && !ing.howText && !ing.title) continue;
          const artId =
            ing.artId ||
            ideaImageId({
              techId: ing.techId || "plain",
              ideaId: ing.id,
              place,
              year: y,
            });
          fetchArtForIngredient(pw.id, ing.id, {
            techId: ing.techId || "plain",
            ideaId: ing.id,
            artId,
            place,
            year: y,
            imagePrompt: ing.imagePrompt || ing.howText?.slice(0, 400) || ing.title,
            kind: ing.techId ? undefined : "plain",
          });
        }
      }
    }
  }

  function focusTech(id) {
    const techId = String(id || "");
    if (!techId) return;
    focusedTechId = techId;
    traceSelection = { type: "tech", id: techId };
    chartOverride.clear();
    trackFor(techId);
    let current = board();
    if (!isPathwayBoard(current)) current = migrateToPathwayBoard(current || {});
    pickerOpen = false;
    commit(addTechTrack(current, techId), { bill: false });
  }

  function dealMilestone(techId, milestoneId) {
    const resolved = trackFor(techId);
    const milestone = (resolved?.milestones || []).find((m) => m.id === milestoneId);
    if (!milestone) return false;
    let current = board();
    if (!isPathwayBoard(current)) return false;
    const alreadyDealt = (current.techTracks?.[techId]?.dealtMilestoneIds || []).includes(milestoneId);
    focusedTechId = techId;
    if (alreadyDealt && traceSelection?.type === "milestone" && traceSelection.id === milestoneId) {
      traceSelection = null;
      paint();
      return true;
    }
    traceSelection = { type: "milestone", id: milestoneId };
    commit(dealMilestoneOn(current, techId, milestone), { bill: false });
    return true;
  }

  function selectedIds() {
    return selectedUseCaseIds.filter((id) => board()?.useCases?.[id]);
  }

  async function fetchArtForIngredient(pathwayId, ingredientId, opts) {
    if (!api.fetchIdeaImage) return;
    try {
      const url = await api.fetchIdeaImage(opts);
      const live = board();
      if (!isPathwayBoard(live) || !live.pathways?.[pathwayId]) return;
      commit(
        setIngredientArt(live, pathwayId, ingredientId, url || null, false, opts?.artId),
        {
          bill: false,
          silent: true,
        }
      );
    } catch {
      const live = board();
      if (isPathwayBoard(live) && live.pathways?.[pathwayId]) {
        commit(setIngredientArt(live, pathwayId, ingredientId, null, false, opts?.artId), {
          bill: false,
          silent: true,
        });
      }
    }
  }

  async function assessIngredientFeasibility(pathwayId, ingredientId) {
    const current = board();
    const pw = current?.pathways?.[pathwayId];
    const ing = pw?.ingredients?.find((row) => row.id === ingredientId);
    if (!ing) return;
    const y = year();
    const earlyUc = (ing.useCaseIds || []).some((id) =>
      isUseCaseEarly(current.useCases?.[id], y)
    );
    if (earlyUc) {
      commit(
        setIngredientTiming(current, pathwayId, ingredientId, {
          timingLevel: "red",
          timingPct: 20,
          timingReason: "Relies on a forecast milestone still ahead of this quest year.",
          timingPending: false,
        }),
        { bill: false }
      );
      return;
    }

    let result = null;
    if (api.coInvent) {
      const plain = !ing.techId;
      const cases = acceptedArgumentsForPathway(current, pw);
      try {
        const data = await api.coInvent(
          plain ? "assess-plain" : "assess-feasibility",
          plain ? "[Filter nonsense]" : "[Assess tile timing]",
          plain
            ? {
                inventionHow: ing.howText || "",
                year: y,
                place: api.getPlace?.() || "",
              }
            : {
                inventionHow: ing.howText || "",
                selectedTechIds: [ing.techId],
                year: y,
                place: api.getPlace?.() || "",
                grounding: api.getGrounding?.() || null,
                ...(cases.length ? { acceptedArguments: cases } : {}),
              }
        );
        result = parseFeasibilityResult(data, ing.howText, ing.techId, y);
      } catch {
        result = parseFeasibilityResult(null, ing.howText, ing.techId, y);
      }
    } else {
      result = parseFeasibilityResult(null, ing.howText, ing.techId, y);
    }

    const latest = board();
    if (!isPathwayBoard(latest) || !latest.pathways?.[pathwayId]) return;
    let updated = setIngredientTiming(latest, pathwayId, ingredientId, {
      ...result,
      timingPending: false,
    });
    const isWired = Object.values(updated.wires || {}).some((w) => w.pathwayId === pathwayId);
    if (isWired) {
      updated = await scoreWired(updated);
    }
    commit(updated, { bill: false });
  }

  async function askForIdeas(opts = {}) {
    const activeTech =
      focusedTechId || Object.keys(board()?.techTracks || {})[0] || null;
    if (!activeTech || createBusy) return;
    focusedTechId = activeTech;
    const tech = techById(activeTech);
    if (!tech) return;
    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return;
    }
    const isRefresh = Boolean(opts.refresh);
    const prevTitles = sparkBatches.get(activeTech)?.titles || [];
    createBusy = true;
    api.setAiBusy?.(true);
    paint();
    try {
      const y = year();
      const place = api.getPlace?.() || "";
      const mission = api.getMission?.() || null;
      const selectedUcs = selectedIds()
        .map((id) => board()?.useCases?.[id])
        .filter(Boolean);
      const useCaseHint = selectedUcs.length
        ? selectedUcs.map((u) => `${u.title}: ${u.blurb}`).join("; ")
        : "";
      const ctx = {
        focusTechId: activeTech,
        year: y,
        place,
        refresh: isRefresh,
        avoidTitles: prevTitles,
        stakeholder: mission?.stakeholder || "",
        ...(useCaseHint ? { guidance: `Build on these unlocked use cases: ${useCaseHint}` } : {}),
      };
      let ideas = [];
      if (api.coInvent) {
        try {
          const data = await api.coInvent(
            "idea-sparks",
            isRefresh ? "[Refresh ideas]" : "[Ask for ideas]",
            ctx
          );
          ideas = ideasOrFallback(data?.ideas, tech, ctx);
        } catch {
          ideas =
            isRefresh || prevTitles.length
              ? rotateLocalIdeaSparks(tech, ctx, prevTitles)
              : localIdeaSparks(tech, ctx);
        }
      } else {
        ideas =
          isRefresh || prevTitles.length
            ? rotateLocalIdeaSparks(tech, ctx, prevTitles)
            : localIdeaSparks(tech, ctx);
      }

      if (api.fetchIdeaImage && ideas.length) {
        await Promise.all(
          ideas.map(async (idea) => {
            try {
              const artId = ideaImageId({ techId: activeTech, ideaId: idea.id, place, year: y });
              idea.artId = artId;
              const artUrl = await api.fetchIdeaImage({
                techId: activeTech,
                ideaId: idea.id,
                artId,
                place,
                year: y,
                imagePrompt: idea.imagePrompt || idea.title,
              });
              if (artUrl) idea.artUrl = artUrl;
            } catch {
              /* art optional */
            }
          })
        );
      }

      const seenTitles = Array.from(
        new Set([...prevTitles, ...ideas.map((idea) => idea.title)])
      ).slice(-18);
      sparkBatches.set(activeTech, {
        ids: ideas.map((idea) => idea.id),
        titles: seenTitles,
        ideas,
      });
      api.onHowInput?.();
    } finally {
      createBusy = false;
      api.setAiBusy?.(false);
      api.onCreateIdle?.();
      paint();
    }
  }

  function dismissSpark(ideaId, techId = null) {
    const activeTech =
      techId || focusedTechId || Object.keys(board()?.techTracks || {})[0] || null;
    if (!activeTech || !ideaId) return false;
    const batch = sparkBatches.get(activeTech);
    if (!batch?.ideas?.length) return false;
    const nextIdeas = batch.ideas.filter((row) => row.id !== ideaId);
    if (nextIdeas.length === batch.ideas.length) return false;
    sparkBatches.set(activeTech, {
      ids: nextIdeas.map((row) => row.id),
      titles: batch.titles || [],
      ideas: nextIdeas,
    });
    paint();
    return true;
  }

  function clearSparks(techId = null) {
    const activeTech =
      techId || focusedTechId || Object.keys(board()?.techTracks || {})[0] || null;
    if (!activeTech) return false;
    const batch = sparkBatches.get(activeTech);
    if (!batch?.ideas?.length && !batch?.ids?.length) return false;
    sparkBatches.set(activeTech, {
      ids: [],
      titles: batch.titles || [],
      ideas: [],
    });
    paint();
    return true;
  }

  function placeSpark(ideaId) {
    const activeTech =
      focusedTechId || Object.keys(board()?.techTracks || {})[0] || null;
    const batch = sparkBatches.get(activeTech);
    const idea =
      (batch?.ideas || []).find((row) => row.id === ideaId) || batch?.ideas?.[0];
    if (!idea || !activeTech) return false;
    const current = board();
    const ids = selectedIds();
    const fromTech = Object.values(current.useCases || {})
      .filter((uc) => uc.techId === activeTech)
      .map((uc) => uc.id);
    const useCaseIds = ids.length ? ids : fromTech.slice(0, 2);
    const first = current.useCases?.[useCaseIds[0]];
    const cardId = first?.collectorCardId || null;
    const gate = gateTech(current, activeTech, cardId);
    if (gate && gate.ok === false) {
      api.flashUnaffordableTech?.(activeTech, gate.error);
      return false;
    }
    const y = year();
    const place = api.getPlace?.() || "";
    const artId = idea.artId || ideaImageId({ techId: activeTech, ideaId: idea.id, place, year: y });
    const imagePrompt = idea.imagePrompt || idea.title;
    const needArt = Boolean(api.fetchIdeaImage && !idea.artUrl);
    const created = createPathway(current, {
      techId: activeTech,
      title: idea.title,
      howText: idea.howText || idea.insertText || idea.blurb || "",
      useCaseIds,
      world: first?.world || techById(activeTech)?.polarity || "bits",
      collectorCardId: cardId,
      artUrl: idea.artUrl || null,
      artId,
      imagePrompt,
      artPending: needArt,
      timingLevel: "green",
      timingPct: 84,
      timingReason: "",
    });
    const prevBatch = batch
      ? {
          ids: [...(batch.ids || [])],
          titles: [...(batch.titles || [])],
          ideas: [...(batch.ideas || [])],
        }
      : null;
    if (batch) {
      const remaining = (batch.ideas || []).filter((row) => row.id !== idea.id);
      sparkBatches.set(activeTech, {
        ids: remaining.map((row) => row.id),
        titles: batch.titles || [],
        ideas: remaining,
      });
    }
    focusedPathwayId = created.pathwayId;
    traceSelection = { type: "pathway", id: created.pathwayId };
    selectedUseCaseIds = [];
    const ok = commit(created.board, { bill: true });
    if (!ok && prevBatch) {
      sparkBatches.set(activeTech, prevBatch);
      traceSelection = null;
      paint();
      return false;
    }
    if (ok && needArt) {
      fetchArtForIngredient(created.pathwayId, created.ingredientId, {
        techId: activeTech,
        ideaId: idea.id,
        artId,
        place,
        year: y,
        imagePrompt,
      });
    }
    return ok;
  }

  function wordClip(raw, maxLen = 46) {
    const clean = String(raw || "").replace(/\s+/g, " ").trim();
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen);
    const space = cut.lastIndexOf(" ");
    return `${(space > 16 ? cut.slice(0, space) : cut).replace(/[,;:\-–—]+$/, "")}…`;
  }

  function writePathway() {
    const root = rootEl();
    const liveInput = root?.querySelector?.("[data-role='draft-how']");
    if (liveInput && typeof liveInput.value === "string") {
      draftHow = liveInput.value;
    }
    const text = String(draftHow || "").trim();
    if (text.length < 12) {
      api.flashToast?.("Write at least one full sentence explaining how it works here.");
      return false;
    }
    const current = board();
    const ids = selectedIds();
    const firstUc = current.useCases?.[ids[0]];
    const techId = firstUc?.techId || focusedTechId || null;
    if (!techId && !ids.length) {
      return addHuman(text);
    }
    const cardId = firstUc?.collectorCardId || null;
    const gate = gateTech(current, techId, cardId);
    if (gate && gate.ok === false) {
      api.flashUnaffordableTech?.(techId, gate.error);
      return false;
    }
    const y = year();
    const early = ids.some((id) => isUseCaseEarly(current.useCases[id], y));
    const needArt = Boolean(api.fetchIdeaImage);
    const created = createPathway(current, {
      techId,
      title: wordClip(text.split(/[.!?]/)[0].trim(), 48) || "Local invention",
      howText: text,
      useCaseIds: ids,
      world: firstUc?.world || techById(techId)?.polarity || "bits",
      collectorCardId: cardId,
      imagePrompt: text.slice(0, 400),
      artPending: needArt,
      timingLevel: "yellow",
      timingPct: 72,
      timingPending: !early,
      timingReason: "",
    });
    if (early) {
      const ing = created.board.pathways[created.pathwayId]?.ingredients?.[0];
      if (ing) ing.needsTimingAssess = true;
    }
    draftHow = "";
    writeOpen = false;
    selectedUseCaseIds = [];
    focusedPathwayId = created.pathwayId;
    traceSelection = { type: "pathway", id: created.pathwayId };
    const ok = commit(created.board, { bill: true });
    if (ok) {
      if (!early) {
        assessIngredientFeasibility(created.pathwayId, created.ingredientId).catch((e) =>
          console.warn("[assess-feasibility]", e)
        );
      }
      if (needArt) {
        const place = api.getPlace?.() || "";
        const ideaId = `mint-${created.ingredientId}`;
        const artId = ideaImageId({ techId: techId || "plain", ideaId, place, year: y });
        fetchArtForIngredient(created.pathwayId, created.ingredientId, {
          techId: techId || "plain",
          ideaId,
          artId,
          place,
          year: y,
          imagePrompt: text.slice(0, 400),
          kind: "mint",
        });
      }
    }
    return ok;
  }

  function addHuman(text) {
    const provided = String(text || "").trim();
    const how =
      provided ||
      "Local volunteers and stewards coordinate the daily handoff and check results in person.";
    const needArt = Boolean(api.fetchIdeaImage && provided);
    const created = createPathway(board(), {
      techId: null,
      title: provided ? provided.split(/[.!?]/)[0].trim().slice(0, 56) : "Human workflow step",
      howText: how,
      world: "plain",
      imagePrompt: provided ? provided.slice(0, 400) : "",
      artPending: needArt,
      timingLevel: provided ? "yellow" : "green",
      timingPct: provided ? 75 : 88,
      timingPending: Boolean(provided),
    });
    draftHow = "";
    writeOpen = false;
    focusedPathwayId = created.pathwayId;
    traceSelection = { type: "pathway", id: created.pathwayId };
    if (!provided) {
      editingPathwayId = created.pathwayId;
      editHowBuffer = how;
    }
    const ok = commit(created.board, { bill: false });
    if (ok && provided) {
      assessIngredientFeasibility(created.pathwayId, created.ingredientId).catch((e) =>
        console.warn("[assess-plain]", e)
      );
      if (needArt) {
        const y = year();
        const place = api.getPlace?.() || "";
        const ideaId = `plain-${created.ingredientId}`;
        const artId = ideaImageId({ techId: "plain", ideaId, place, year: y });
        fetchArtForIngredient(created.pathwayId, created.ingredientId, {
          techId: "plain",
          ideaId,
          artId,
          place,
          year: y,
          imagePrompt: provided.slice(0, 400),
          kind: "plain",
        });
      }
    }
    return ok;
  }

  async function savePathwayHow(pathwayId) {
    const root = rootEl();
    const ta = root?.querySelector?.(`[data-role="pathway-how-input"][data-pathway-id="${pathwayId}"]`);
    const text = String(ta ? ta.value : editHowBuffer || "").trim();
    if (text.length < 8) {
      api.flashToast?.("Keep at least one plain sentence describing how the pathway works.");
      return;
    }
    editingPathwayId = null;
    editHowBuffer = "";
    let next = setPathwayHow(board(), pathwayId, text);
    const pw = next.pathways?.[pathwayId];
    if (pw?.ingredients?.length === 1 && !pw.customHow) {
      next = setIngredientTiming(next, pathwayId, pw.ingredients[0].id, {
        timingPending: true,
      });
      commit(next, { bill: false });
      await assessIngredientFeasibility(pathwayId, pw.ingredients[0].id);
      return;
    }
    const isWired = Object.values(next.wires || {}).some((w) => w.pathwayId === pathwayId);
    if (isWired) {
      commit(next, { bill: false });
      const scored = await scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) });
      commit(scored, { bill: false });
    } else {
      commit(next, { bill: false });
    }
  }

  async function checkAiConvergence(pathwayId) {
    if (!api.coInvent) return;
    const current = board();
    const pw = current?.pathways?.[pathwayId];
    if (!pw || (pw.convergences || []).length > 0) return;
    const techIngs = (pw.ingredients || []).filter((i) => i.techId);
    if (techIngs.length < 2) return;
    const placed = techIngs.at(-1);
    const neighbors = techIngs.slice(0, -1).filter((n) => n.techId !== placed.techId);
    if (!neighbors.length) return;
    try {
      const data = await api.coInvent("evaluate-convergence", "[Evaluate convergence]", {
        year: year(),
        place: api.getPlace?.() || "",
        placed: { id: placed.id, techId: placed.techId, howText: placed.howText || "" },
        neighbors: neighbors.map((n) => ({ id: n.id, techId: n.techId, howText: n.howText || "" })),
      });
      const hit = Array.isArray(data?.convergences) ? data.convergences[0] : null;
      if (!hit) return;
      const live = board();
      if (!isPathwayBoard(live) || !live.pathways?.[pathwayId]) return;
      const updated = addDynamicConvergence(live, pathwayId, {
        key: `${placed.id}|${hit.neighborId || neighbors[0].id}`,
        factor: hit.factor,
        reason: hit.reason,
      });
      commit(updated, { bill: false });
    } catch {
      /* optional AI convergence */
    }
  }

  function fuse(targetId, sourceId) {
    const result = fusePathways(board(), targetId, sourceId);
    if (!result.ok) return false;
    focusedPathwayId = result.pathwayId;
    traceSelection = { type: "pathway", id: result.pathwayId };
    editingPathwayId = null;
    const isWired = Object.values(result.board.wires || {}).some(
      (w) => w.pathwayId === result.pathwayId
    );
    const ok = commit(result.board, { bill: false });
    if (ok) {
      const pw = result.board.pathways?.[result.pathwayId];
      if (pw && !(pw.convergences || []).length) {
        void checkAiConvergence(result.pathwayId);
      }
      if (isWired) {
        scoreWired(board(), { forcePathwayIds: new Set([result.pathwayId]) })
          .then((scored) => commit(scored, { bill: false }))
          .catch((e) => console.warn(e));
      }
    }
    return ok;
  }

  function unfuse(pathwayId, ingredientId) {
    const result = unfuseIngredient(board(), pathwayId, ingredientId);
    if (!result.ok) return false;
    const ok = commit(result.board, { bill: false });
    if (ok && result.board.pathways?.[pathwayId]) {
      const stillWired = Object.values(result.board.wires || {}).some(
        (w) => w.pathwayId === pathwayId
      );
      if (stillWired) {
        scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) })
          .then((scored) => commit(scored, { bill: false }))
          .catch((e) => console.warn(e));
      }
    }
    return ok;
  }

  /**
   * Score each unique plugged Pathway once per content fingerprint,
   * fanning out crisisDelta and updating Challenger roadblocks on its wires.
   */
  async function scoreWired(current, opts = {}) {
    let next = structuredClone(current);
    const y = year();
    const forceIds = opts.forcePathwayIds || new Set();
    const wiresByPathway = new Map();
    for (const wire of Object.values(next.wires || {})) {
      if (!wiresByPathway.has(wire.pathwayId)) wiresByPathway.set(wire.pathwayId, []);
      wiresByPathway.get(wire.pathwayId).push(wire);
    }

    const mission = api.getMission?.() || null;
    const rules = api.getRules?.() || next.rules || [];
    const globalObj = api.getGlobal?.() || null;
    const globalId = mission?.globalId || globalObj?.id || null;

    for (const [pathwayId, pwWires] of wiresByPathway.entries()) {
      const pathway = next.pathways?.[pathwayId];
      if (!pathway) continue;
      const timing = effectiveTiming(pathway, next.useCases, y);
      const fp = pathwayContentFingerprint(pathway, next);
      const targetCrises = pwWires
        .map((w) => next.crises?.[w.crisisId])
        .filter(Boolean);
      if (!targetCrises.length) continue;
      const roles = [...new Set(targetCrises.map((c) => c.role || "local"))];

      if (timing.early) {
        const reason = timing.timingReason;
        for (const crisis of targetCrises) {
          const r = crisis.role || "local";
          next = applyScoreToCrisis(next, crisis.id, {
            lamp: "red",
            delta: 0,
            reason,
            crisisDelta: { [r]: 0 },
            crisisReasons: { [r]: reason },
          });
        }
        next.pathwayImpacts[fp] = {
          pathwayId,
          inventionIds: pathway.ingredients.map((ing) => ing.id),
          crisisDelta: Object.fromEntries(roles.map((r) => [r, 0])),
          crisisReasons: Object.fromEntries(roles.map((r) => [r, reason])),
          concerns: {},
          earlyBlocked: true,
          pending: false,
        };
        continue;
      }

      const cached = next.pathwayImpacts?.[fp];
      const pwChallengers = Object.values(next.challengers || {}).filter(
        (ch) => ch.pathwayId === pathwayId
      );
      const needsConcernScore = pwChallengers.some(
        (ch) => !cached?.concerns?.[ch.angle] && fp !== ch.posedAgainstFingerprint
      );
      const allRolesCached =
        cached &&
        !cached.pending &&
        !cached.earlyBlocked &&
        !forceIds.has(pathwayId) &&
        !needsConcernScore &&
        roles.every((r) => cached.crisisDelta && r in cached.crisisDelta);

      let score = cached;
      if (!allRolesCached) {
        const howCombined = composePathwayHow(pathway);
        const inventions = pathway.ingredients.map((ing) => ({
          id: ing.id,
          kind: "invention",
          techId: ing.techId,
          howText: ing.howText || howCombined,
          year: y,
          timingLevel:
            timing.timingLevel === "red" ? "red" : ing.timingLevel || "green",
          feasibilityPct: timing.timingPct ?? ing.timingPct ?? 82,
          polarity: ing.world === "plain" ? "curve" : ing.world,
        }));
        const heurOpts = { mission, rules, crisisRoles: roles };
        const heur = heuristicPathwayScore(inventions, y, heurOpts);

        if (api.coInvent) {
          scoringPathwayIds.add(pathwayId);
          paint();
          try {
            const concernsPayload = pwChallengers.map((ch) => ({
              angle: ch.angle,
              challengeSpeech: ch.speech || "",
              challengeQuestion: ch.question || "",
              playerAnswer: ch.playerAnswer || "",
              inventChanged: Boolean(
                ch.posedAgainstFingerprint && fp !== ch.posedAgainstFingerprint
              ),
              posedHowText: ch.posedHowText || "",
            }));
            const acceptedArgs = acceptedArgumentsForPathway(next, pathway);
            const ai = await api.coInvent("score-pathway", howCombined, {
              pathway: {
                fingerprint: fp,
                howText: howCombined,
                inventions: inventions.map((n) => ({
                  techId: n.techId,
                  year: n.year,
                  howText: n.howText,
                  feasibilityPct: n.feasibilityPct,
                  timingLevel: n.timingLevel || null,
                })),
              },
              year: y,
              place: api.getPlace?.() || "",
              missionTitle: api.getMissionTitle?.() || "",
              globalId,
              rules,
              scene: String(mission?.scene || "").slice(0, 600),
              grounding: api.getGrounding?.() || null,
              pressureBase: next.pressureBase || {},
              winMax: mission?.winMax || {},
              crisisRoles: targetCrises.map((c) => ({
                role: c.role || "local",
                name: c.name,
                meterKey: c.meterKey || c.name,
                description: String(c.description || "").slice(0, 400),
              })),
              ...(concernsPayload.length ? { concerns: concernsPayload } : {}),
              ...(acceptedArgs.length ? { acceptedArguments: acceptedArgs } : {}),
            });
            if (ai && (ai.crisisDelta || ai.concerns)) {
              score = clampPathwayScore(
                blendPathwayScore(
                  normalizePathwayScore(ai, roles),
                  heur,
                  roles
                ),
                inventions,
                heurOpts
              );
              if (ai.concerns && !score.concerns) score.concerns = ai.concerns;
            } else {
              score = heur;
            }
          } catch {
            score = heur;
          } finally {
            scoringPathwayIds.delete(pathwayId);
          }
        } else {
          score = heur;
        }

        next.pathwayImpacts[fp] = {
          pathwayId,
          inventionIds: pathway.ingredients.map((ing) => ing.id),
          crisisDelta: score.crisisDelta || {},
          crisisReasons: score.crisisReasons || {},
          concerns: score.concerns || {},
          pending: false,
        };
        api.grantPathwayEase?.({ crisisDelta: score.crisisDelta });
      }

      for (const crisis of targetCrises) {
        const r = crisis.role || "local";
        next = applyScoreToCrisis(next, crisis.id, {
          delta: score.crisisDelta?.[r],
          reason: score.crisisReasons?.[r],
        });
      }

      for (const ch of pwChallengers) {
        const cRow = score.concerns?.[ch.angle];
        const concernLamp = typeof cRow === "string" ? cRow : cRow?.level;
        const liveCh = next.challengers[ch.id];
        if (liveCh) {
          liveCh.lamp = resolveChallengerLamp(liveCh, pathway, concernLamp, next);
          if (cRow?.reason && !liveCh.playerAnswer) {
            liveCh.answerFeedback = String(cRow.reason).slice(0, 400);
          }
        }
      }
    }
    return next;
  }

  async function plug(pathwayId, crisisId) {
    const result = plugWire(board(), pathwayId, crisisId);
    if (!result.ok) return false;
    focusedPathwayId = pathwayId;
    traceSelection = { type: "pathway", id: pathwayId };
    commit(result.board, { bill: false, silent: true });
    const scored = await scoreWired(board());
    return commit(scored, { bill: false });
  }

  async function unplug(wireId) {
    if (traceSelection?.type === "wire" && traceSelection.id === wireId) {
      traceSelection = null;
    }
    const next = unplugWire(board(), wireId);
    const hasWires = Object.keys(next.wires || {}).length > 0;
    const rescored = hasWires ? await scoreWired(next) : next;
    return commit(rescored, { bill: false });
  }

  async function summonNextChallenger() {
    if (api.canSummonChallengers && !api.canSummonChallengers()) {
      api.flashToast?.("Only this invent's owner can summon challengers.");
      return;
    }
    let current = board();
    const wires = Object.values(current?.wires || {});
    if (!wires.length) {
      api.flashToast?.("Plug a Pathway into a Crisis in Lane 4 first.");
      return;
    }
    if (!Array.isArray(current.concernRoster) || !current.concernRoster.length) {
      current = ensureConcernRoster(current);
    }
    const roster =
      Array.isArray(current.concernRoster) && current.concernRoster.length
        ? current.concernRoster
        : ["stakeholder"];
    const used = new Set(Object.values(current.challengers || {}).map((ch) => ch.angle));
    const angle = roster.find((a) => !used.has(a));
    if (!angle) {
      const openRed = Object.values(current.challengers || {}).find((c) => c.lamp === "red");
      if (openRed) {
        openChallengerId = openRed.id;
        roadblockDraft = openRed.playerAnswer || "";
        paint();
      }
      return;
    }
    const occupiedWireIds = new Set(
      Object.values(current.challengers || {}).map((ch) => ch.wireId)
    );
    const targetWire = wires.find((w) => !occupiedWireIds.has(w.id)) || wires[0];
    await summonRoadblock(targetWire.id, angle);
  }

  async function summonRoadblock(wireId, angle = "stakeholder") {
    if (summonBusy) return;
    const pay = api.spendFirstSummonAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP to summon a challenger.");
      return;
    }
    summonBusy = true;
    const startWire = board()?.wires?.[wireId];
    summoningState = {
      angle,
      wireId,
      pathwayId: startWire?.pathwayId || null,
      crisisId: startWire?.crisisId || null,
    };
    api.setAiBusy?.(true, { summon: true });
    paint();
    try {
      const current = board();
      const wire = current?.wires?.[wireId];
      const pathway = wire ? current?.pathways?.[wire.pathwayId] : null;
      const place = api.getPlace?.() || "";
      const authored = api.getCriticPrompt?.(angle) || null;
      const local = localPose(angle, {
        place,
        authoredQuestion: authored?.question || "",
        authoredConnection: authored?.connection || "",
      });

      const posePromise = (async () => {
        let speech = local.speech;
        let question = local.question;
        if (api.coInvent && pathway) {
          try {
            const howText = composePathwayHow(pathway);
            const data = await api.coInvent("pose-challenge", "[Pose challenge]", {
              challengeAngle: angle,
              pathway: {
                howText,
                inventions: pathway.ingredients.map((n) => ({
                  techId: n.techId,
                  howText: String(n.howText || "").slice(0, 800),
                  timingLevel: n.timingLevel || null,
                })),
              },
            });
            speech =
              String(data?.challengeSpeech || data?.speech || data?.message || "").trim() ||
              local.speech;
            question =
              String(data?.challengeQuestion || data?.question || "").trim() ||
              local.question;
          } catch {
            /* local pose stands */
          }
        }
        return { speech, question };
      })();

      if (api.playChallengerReel && !api.isTutorial?.()) {
        try {
          await api.playChallengerReel({ angle, until: posePromise });
        } catch {
          /* non-fatal */
        }
      }
      const posed = await posePromise;
      const live = board();
      const result = summonChallenger(live, {
        wireId,
        angle,
        speech: posed.speech,
        question: posed.question,
      });
      if (!result.ok) {
        api.refundFirstSummonAp?.();
        return;
      }
      const roster = Array.isArray(result.board.concernRoster)
        ? [...result.board.concernRoster]
        : [];
      if (!roster.includes(angle)) roster.push(angle);
      result.board.concernRoster = roster;
      result.board.concernTargetCount = Math.max(
        Number(result.board.concernTargetCount) || 1,
        roster.length
      );
      openChallengerId = result.id;
      roadblockDraft = "";
      commit(result.board, { bill: false });
    } finally {
      summonBusy = false;
      summoningState = null;
      api.setAiBusy?.(false);
      api.onCreateIdle?.();
      paint();
    }
  }

  async function draftRoadblockAi(id) {
    if (draftingRoadblockId) return;
    const current = board();
    const ch = current?.challengers?.[id];
    const pathway = ch ? current?.pathways?.[ch.pathwayId] : null;
    if (!ch || !pathway) return;
    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return;
    }
    if (api.coInvent) {
      draftingRoadblockId = id;
      api.setAiBusy?.(true);
      paint();
      try {
        const prompt = `Draft a concise 2-sentence defense answering ${ch.angle}'s question ("${ch.question || ch.speech}") for this local pathway: ${composePathwayHow(pathway)}`;
        const data = await api.coInvent("chat", prompt, {
          year: year(),
          place: api.getPlace?.() || "",
          selectedTechIds: pathway.ingredients.map((i) => i.techId).filter(Boolean),
        });
        const draft = String(data?.message || data?.text || "").trim();
        if (draft) {
          roadblockDraft = draft.slice(0, 1200);
        }
      } catch {
        api.flashToast?.("Could not draft a reply right now.");
      } finally {
        draftingRoadblockId = null;
        api.setAiBusy?.(false);
        paint();
      }
    }
  }

  async function submitRoadblock(id, text, opts = {}) {
    if (api.canAnswerConcern && !api.canAnswerConcern()) {
      api.flashToast?.("Only this invent's owner can answer the challenger.");
      return;
    }
    const root = rootEl();
    const liveArea = root?.querySelector?.("[data-role='roadblock-text']");
    const answer = String(text ?? (liveArea ? liveArea.value : roadblockDraft) ?? "").trim();
    if (answer.length < 12) {
      api.flashToast?.(
        "Write a bit more — name who acts, who pays, or what hard limit you respect."
      );
      return;
    }
    if (!opts.freeAp) {
      const pay = api.spendChallengeAp?.();
      if (pay && pay.ok === false) {
        api.flashToast?.(pay.reason || "Not enough AP");
        return;
      }
    }
    let pendingBoard = setChallengerAnswer(board(), id, {
      playerAnswer: answer,
      answerPending: true,
    });
    commit(pendingBoard, { bill: false, silent: true });

    const ch0 = pendingBoard.challengers?.[id];
    const pw0 = ch0 ? pendingBoard.pathways?.[ch0.pathwayId] : null;
    let quality = "glance";
    let feedback = "";
    if (api.coInvent && ch0) {
      try {
        const data = await api.coInvent("judge-challenge", answer, {
          challengerId: id,
          challengeAngle: ch0.angle,
          challengeSpeech: ch0.speech || "",
          challengeQuestion: ch0.question || "",
          playerAnswer: answer,
          pathway: pw0
            ? {
                anyTouch: true,
                howText: composePathwayHow(pw0).slice(0, 1600),
                inventions: pw0.ingredients.map((n) => ({
                  techId: n.techId,
                  howText: String(n.howText || "").slice(0, 400),
                  timingLevel: n.timingLevel || null,
                })),
              }
            : { anyTouch: true, howText: "", inventions: [] },
        });
        const mapped = mapConcernAnswerQuality(data);
        quality = mapped || (answer.length >= 40 ? "glance" : "miss");
        feedback = String(data?.message || data?.lesson || data?.feedback || "").slice(
          0,
          400
        );
      } catch {
        quality = answer.length >= 40 ? "glance" : "miss";
        feedback = "Saved your defense locally while the judge was unreachable.";
      }
    }

    let next = setChallengerAnswer(board(), id, {
      playerAnswer: answer,
      answerQuality: quality,
      answerFeedback: feedback,
      answerPending: false,
    });
    const ch = next.challengers[id];
    const pathway = next.pathways[ch.pathwayId];
    ch.lamp = resolveChallengerLamp(ch, pathway, ch.lamp, next);
    if (ch.lamp !== "red") {
      openChallengerId = null;
      roadblockDraft = "";
    } else {
      roadblockDraft = answer;
    }
    commit(next, { bill: false });
  }

  async function polishHow(pathwayId) {
    if (polishingPathwayIds.has(pathwayId)) return;
    const current = board();
    const pathway = current?.pathways?.[pathwayId];
    if (!pathway) return;
    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return;
    }
    const baseHow =
      editingPathwayId === pathwayId && editHowBuffer.trim()
        ? editHowBuffer.trim()
        : composePathwayHow(pathway);
    let text = baseHow;
    polishingPathwayIds.add(pathwayId);
    api.setAiBusy?.(true);
    paint();
    try {
      if (api.coInvent) {
        try {
          const techIds = pathway.ingredients.map((i) => i.techId).filter(Boolean);
          const data = await api.coInvent("draft-how", baseHow, {
            selectedTechIds: techIds,
            inventionHow: baseHow,
            year: year(),
            place: api.getPlace?.() || "",
            hexInvent: true,
          });
          const proposed = String(
            data?.proposals?.inventionHow || data?.howText || data?.text || ""
          ).trim();
          if (proposed.length >= 12) text = proposed;
        } catch {
          /* keep deterministic how */
        }
      }
    } finally {
      polishingPathwayIds.delete(pathwayId);
      api.setAiBusy?.(false);
    }
    editingPathwayId = null;
    editHowBuffer = "";
    const live = board() || current;
    const next = setPathwayHow(live, pathwayId, text);
    const isWired = Object.values(next.wires || {}).some((w) => w.pathwayId === pathwayId);
    const scored = isWired
      ? await scoreWired(next, { forcePathwayIds: new Set([pathwayId]) })
      : next;
    commit(scored, { bill: false });
  }

  async function rollRdOnPathway() {
    const current = board();
    const pathwayId = focusedPathwayId || Object.keys(current?.pathways || {})[0];
    if (!pathwayId || !current?.pathways?.[pathwayId]) {
      api.flashToast?.("Create an invention or pathway in Lane 3 first.");
      return;
    }
    const pay = api.spendRdMint?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough Budget for R&D.");
      return;
    }
    const factor = rollRdFactor();
    const next = attachRd(current, pathwayId, { factor, label: "R&D" });
    api.flashToast?.(`🧪 R&D rolled ${formatRdFactor(factor)} feasibility multiplier!`);
    appendCaptainLog({
      kind: "action",
      title: `Rolled R&D ${formatRdFactor(factor)}`,
      detail: `Applied to ${next.pathways[pathwayId]?.ingredients?.[0]?.title || "pathway"}.`,
    });
    const isWired = Object.values(next.wires || {}).some((w) => w.pathwayId === pathwayId);
    const scored = isWired
      ? await scoreWired(next, { forcePathwayIds: new Set([pathwayId]) })
      : next;
    commit(scored, { bill: false });
  }

  async function submitArgumentForm(form) {
    if (argumentBusy) return;
    const fd = new FormData(form);
    const pathwayId =
      String(fd.get("pathwayId") || "").trim() ||
      focusedPathwayId ||
      Object.keys(board()?.pathways || {})[0];
    const claim = String(fd.get("claim") || "").trim();
    if (!pathwayId || !board()?.pathways?.[pathwayId]) {
      api.flashToast?.("Create a Pathway in Lane 3 before filing an argument.");
      return;
    }
    if (claim.length < 12) {
      api.flashToast?.("State a concrete demonstrated fact (at least one full sentence).");
      return;
    }
    const pay = api.spendArgumentAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP (1 AP required).");
      return;
    }
    argumentBusy = true;
    argumentModalOpen = false;
    const argId = `arg-${Date.now().toString(36)}`;
    let next = attachArgument(board(), pathwayId, {
      id: argId,
      claim,
      verdict: "pending",
      pending: true,
    });
    commit(next, { bill: false });

    try {
      let verdict = null;
      let reason = "";
      if (api.coInvent) {
        const data = await api.coInvent("fact-check-argument", "[Fact-check argument]", {
          claim,
          year: year(),
          place: api.getPlace?.() || "",
          grounding: api.getGrounding?.() || null,
        });
        const v = String(data?.verdict || "").toLowerCase();
        if (v === "accept" || v === "reject") verdict = v;
        reason = String(data?.reason || data?.message || "").slice(0, 280);
      } else {
        verdict = "accept";
        reason = "Accepted in offline mode.";
      }
      if (!verdict) {
        commit(removeArgument(board(), argId), { bill: false });
        api.flashToast?.("Fact-check could not verify — argument removed.");
        return;
      }
      let settled = settleArgument(board(), argId, verdict, reason);
      api.flashToast?.(
        verdict === "accept"
          ? `⚖️ Argument accepted: ${reason || "attached to pathway."}`
          : `⚖️ Argument rejected: ${reason || "claim not verified."}`
      );
      if (verdict === "accept") {
        const isWired = Object.values(settled.wires || {}).some(
          (w) => w.pathwayId === pathwayId
        );
        if (isWired) {
          settled = await scoreWired(settled, { forcePathwayIds: new Set([pathwayId]) });
        }
      }
      commit(settled, { bill: false });
    } catch {
      commit(removeArgument(board(), argId), { bill: false });
      api.flashToast?.("Fact-check failed — argument removed.");
    } finally {
      argumentBusy = false;
    }
  }

  async function showCollection() {
    if (!api.isSignedIn?.()) {
      api.flashToast?.("Sign in to access your Collector Cards.");
      return;
    }
    const dlg = typeof document !== "undefined" ? document.querySelector("#collector-cards") : null;
    if (!dlg) return;
    if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
    try {
      collectionCards = collectionCards || (await api.listCollectorCards?.()) || [];
    } catch {
      collectionCards = [];
    }
    const renderPickerContent = () => {
      paintCollectorPicker({
        list: document.querySelector("#collector-cards-list"),
        filters: document.querySelector("#collector-cards-filters"),
        empty: document.querySelector("#collector-cards-empty"),
        cards: collectionCards,
        techId: collectorFilterTech,
        onFilter: (nextTech) => {
          collectorFilterTech = nextTech || "all";
          renderPickerContent();
        },
        onPick: (card) => {
          if (typeof dlg.close === "function") dlg.close();
          adoptCollector(card);
        },
      });
    };
    renderPickerContent();
  }

  function adoptCollector(card) {
    if (!card?.techId) return;
    const current = board();
    const world = techById(card.techId)?.polarity || "bits";
    const milestones = collectorMilestonesForTech([card], card.techId, { world });
    const milestone = milestones[0];
    if (!milestone) return;
    if (!Array.isArray(collectionCards)) collectionCards = [];
    if (!collectionCards.some((c) => c?.id === card.id)) collectionCards.push(card);
    tracks.delete(card.techId);
    let next = addTechTrack(
      isPathwayBoard(current) ? current : migrateToPathwayBoard(current || {}),
      card.techId
    );
    next = dealMilestoneOn(next, card.techId, milestone);
    focusedTechId = card.techId;
    trackFor(card.techId);
    commit(next, { bill: false });
  }

  function jumpYear(years) {
    const id = Number(years) === 2 ? "#btn-wait" : "#btn-end-turn";
    const btn = api.$?.(id) || (typeof document !== "undefined" ? document.querySelector(id) : null);
    btn?.click?.();
  }

  function onClick(event) {
    const target = event.target;
    if (target?.getAttribute?.("data-action") === "close-picker") {
      pickerOpen = false;
      paint();
      return;
    }
    if (target?.getAttribute?.("data-action") === "close-roadblock-scrim") {
      openChallengerId = null;
      paint();
      return;
    }
    if (target?.getAttribute?.("data-action") === "close-argument-scrim") {
      argumentModalOpen = false;
      paint();
      return;
    }

    const root = rootEl();
    const btn = target?.closest?.("[data-action]");
    if (!btn || !root?.contains(btn)) {
      if (!root?.contains(target)) return;
      if (
        typeof window !== "undefined" &&
        String(window.getSelection?.() || "").trim().length > 0
      ) {
        return;
      }
      if (
        target?.closest?.(
          "button, a, input, textarea, select, label, summary, details, canvas, .ontology-modal-scrim, .ontology-composer, .ontology-rules, .ontology-topbar, .ontology-trace-bar"
        )
      ) {
        return;
      }
      const toggleTrace = (type, nodeId) => {
        if (!nodeId) return;
        traceSelection =
          traceSelection?.type === type && traceSelection.id === nodeId
            ? null
            : { type, id: nodeId };
      };
      const wireRead = target?.closest?.(".ontology-wire-read[data-wire-id]");
      if (wireRead) {
        toggleTrace("wire", wireRead.getAttribute("data-wire-id"));
        paint();
        return;
      }
      const pwCard = target?.closest?.(".ontology-pathway[data-pathway-id]");
      if (pwCard) {
        const pwId = pwCard.getAttribute("data-pathway-id");
        focusedPathwayId = pwId;
        toggleTrace("pathway", pwId);
        paint();
        return;
      }
      const crisisCard = target?.closest?.(".ontology-crisis[data-crisis-id]");
      if (crisisCard) {
        toggleTrace("crisis", crisisCard.getAttribute("data-crisis-id"));
        paint();
        return;
      }
      const useCard = target?.closest?.(".ontology-use[data-usecase-id]");
      if (useCard) {
        toggleTrace("usecase", useCard.getAttribute("data-usecase-id"));
        paint();
        return;
      }
      const techCard = target?.closest?.(".ontology-tech[data-tech-id]");
      if (techCard) {
        const tId = techCard.getAttribute("data-tech-id");
        if (focusedTechId !== tId) {
          focusedTechId = tId;
          chartOverride.clear();
        }
        toggleTrace("tech", tId);
        paint();
        return;
      }
      if (traceSelection && target?.closest?.("[data-lanes-stage]")) {
        traceSelection = null;
        paint();
      }
      return;
    }
    const action = btn.getAttribute("data-action");
    const techId = btn.getAttribute("data-tech-id");
    const id = btn.getAttribute("data-id");

    if (action === "clear-trace") {
      traceSelection = null;
    } else if (action === "toggle-picker") {
      pickerOpen = !pickerOpen;
    } else if (action === "filter-picker-domain") {
      pickerDomain = btn.getAttribute("data-domain") || "all";
    } else if (action === "pick-tech") {
      focusTech(techId || id);
      return;
    } else if (action === "focus-tech") {
      const nextTech = techId || focusedTechId;
      const sameFocused = nextTech && focusedTechId === nextTech;
      if (sameFocused && traceSelection?.type === "tech" && traceSelection.id === nextTech) {
        traceSelection = null;
      } else {
        if (!sameFocused) {
          focusedTechId = nextTech;
          chartOverride.clear();
        }
        traceSelection = nextTech ? { type: "tech", id: nextTech } : null;
      }
    } else if (action === "remove-tech") {
      chartOverride.delete(techId);
      if (traceSelection?.type === "tech" && traceSelection.id === techId) {
        traceSelection = null;
      }
      const next = removeTechTrack(board(), techId);
      if (focusedTechId === techId) {
        focusedTechId = Object.keys(next.techTracks || {})[0] || null;
      }
      commit(next, { bill: false });
      return;
    } else if (action === "learn-tech") {
      event.stopPropagation();
      api.openLearnTech?.(techId);
      return;
    } else if (action === "deal-milestone") {
      dealMilestone(techId, btn.getAttribute("data-milestone-id"));
      return;
    } else if (action === "toggle-chart") {
      const current = board();
      const activeFocus = focusedTechId || Object.keys(current?.techTracks || {})[0] || null;
      const wasOpen = chartOverride.has(techId)
        ? chartOverride.get(techId)
        : techId === activeFocus;
      chartOverride.set(techId, !wasOpen);
      commit(setChartOpen(current, techId, !wasOpen), { bill: false });
      return;
    } else if (action === "toggle-trend-desc") {
      if (expandedDescTechs.has(techId)) expandedDescTechs.delete(techId);
      else expandedDescTechs.add(techId);
    } else if (action === "toggle-custom-use") {
      customUseOpen = !customUseOpen;
    } else if (action === "remove-use") {
      selectedUseCaseIds = selectedUseCaseIds.filter((x) => x !== id);
      if (traceSelection?.type === "usecase" && traceSelection.id === id) {
        traceSelection = null;
      }
      commit(removeUseCase(board(), id), { bill: false });
      return;
    } else if (action === "toggle-use") {
      const uc = board()?.useCases?.[id];
      if (uc?.techId) focusedTechId = uc.techId;
      const wasSelected = selectedUseCaseIds.includes(id);
      selectedUseCaseIds = wasSelected
        ? selectedUseCaseIds.filter((x) => x !== id)
        : [...selectedUseCaseIds, id];
      traceSelection = !wasSelected
        ? { type: "usecase", id }
        : selectedUseCaseIds.length
          ? { type: "usecase", id: selectedUseCaseIds[selectedUseCaseIds.length - 1] }
          : null;
    } else if (action === "use-to-invent") {
      const uc = board()?.useCases?.[id];
      if (uc?.techId) focusedTechId = uc.techId;
      if (!selectedUseCaseIds.includes(id)) {
        selectedUseCaseIds = [...selectedUseCaseIds, id];
      }
      traceSelection = { type: "usecase", id };
      paint();
      scrollLaneIntoView("pathway");
      return;
    } else if (action === "toggle-write") {
      writeOpen = !writeOpen;
    } else if (action === "toggle-voice") {
      api.toggleVoice?.();
      paint();
      return;
    } else if (action === "ask-ideas") {
      askForIdeas({ refresh: false }).catch((e) => console.warn(e));
      return;
    } else if (action === "refresh-ideas") {
      askForIdeas({ refresh: true }).catch((e) => console.warn(e));
      return;
    } else if (action === "place-spark") {
      placeSpark(btn.getAttribute("data-idea-id"));
      return;
    } else if (action === "dismiss-spark") {
      dismissSpark(btn.getAttribute("data-idea-id"));
      return;
    } else if (action === "clear-sparks") {
      clearSparks();
      return;
    } else if (action === "human-step") {
      addHuman("");
      return;
    } else if (action === "write-pathway") {
      writePathway();
      return;
    } else if (action === "remove-pathway") {
      const pwId = btn.getAttribute("data-pathway-id");
      if (focusedPathwayId === pwId) focusedPathwayId = null;
      if (editingPathwayId === pwId) editingPathwayId = null;
      if (traceSelection?.type === "pathway" && traceSelection.id === pwId) {
        traceSelection = null;
      }
      const next = removePathway(board(), pwId);
      scoreWired(next)
        .then((scored) => commit(scored, { bill: true }))
        .catch(() => commit(next, { bill: true }));
      return;
    } else if (action === "edit-pathway-how") {
      const pwId = btn.getAttribute("data-pathway-id");
      const pw = board()?.pathways?.[pwId];
      if (pw) {
        editingPathwayId = pwId;
        editHowBuffer = composePathwayHow(pw);
        focusedPathwayId = pwId;
      }
    } else if (action === "cancel-edit-how") {
      editingPathwayId = null;
      editHowBuffer = "";
    } else if (action === "save-pathway-how") {
      savePathwayHow(btn.getAttribute("data-pathway-id")).catch((e) => console.warn(e));
      return;
    } else if (action === "fuse-pair") {
      fuse(btn.getAttribute("data-pathway-id"), btn.getAttribute("data-source-id"));
      return;
    } else if (action === "plug-pair") {
      plug(btn.getAttribute("data-pathway-id"), btn.getAttribute("data-crisis-id")).catch((e) =>
        console.warn(e)
      );
      return;
    } else if (action === "unfuse") {
      unfuse(btn.getAttribute("data-pathway-id"), btn.getAttribute("data-ingredient-id"));
      return;
    } else if (action === "polish-how") {
      polishHow(btn.getAttribute("data-pathway-id")).catch((e) => console.warn(e));
      return;
    } else if (action === "unplug") {
      unplug(btn.getAttribute("data-wire-id")).catch((e) => console.warn(e));
      return;
    } else if (action === "open-roadblock") {
      openChallengerId = btn.getAttribute("data-challenger-id");
      roadblockDraft = board()?.challengers?.[openChallengerId]?.playerAnswer || "";
    } else if (action === "close-roadblock") {
      openChallengerId = null;
    } else if (action === "roadblock-draft-ai") {
      draftRoadblockAi(btn.getAttribute("data-challenger-id")).catch((e) => console.warn(e));
      return;
    } else if (action === "roadblock-suggest") {
      if (!api.isTutorial?.()) return;
      roadblockDraft = TUTORIAL_SUGGESTED_REPLY;
      submitRoadblock(btn.getAttribute("data-challenger-id"), TUTORIAL_SUGGESTED_REPLY, {
        freeAp: true,
      }).catch((e) => console.warn(e));
      return;
    } else if (action === "roadblock-submit") {
      submitRoadblock(btn.getAttribute("data-challenger-id")).catch((e) => console.warn(e));
      return;
    } else if (action === "open-year-dialog") {
      const hudYear = api.$?.("#hud-year") || document.querySelector("#hud-year");
      hudYear?.click?.();
      return;
    } else if (action === "year-plus") {
      jumpYear(btn.getAttribute("data-years"));
      return;
    } else if (action === "jump-lane") {
      scrollLaneIntoView(btn.getAttribute("data-lane"));
      return;
    } else if (action === "tool-lobby") {
      const lobby = api.$?.("#btn-lobby") || document.querySelector("#btn-lobby");
      lobby?.click?.();
      return;
    } else if (action === "tool-rd") {
      rollRdOnPathway().catch((e) => console.warn(e));
      return;
    } else if (action === "tool-argument") {
      if (!Object.keys(board()?.pathways || {}).length) {
        api.flashToast?.("Create a Pathway in Lane 3 first.");
        return;
      }
      argumentModalOpen = true;
    } else if (action === "close-argument") {
      argumentModalOpen = false;
    } else if (action === "tool-collection") {
      showCollection().catch((e) => console.warn(e));
      return;
    } else if (action === "tool-share") {
      document.querySelector("[data-share-puzzle]")?.click();
      return;
    } else {
      return;
    }
    paint();
  }

  /**
   * Focus-safe input tracking: updates in-memory buffers WITHOUT wiping DOM!
   */
  function onInput(event) {
    const el = event.target;
    const role = el?.getAttribute?.("data-role");
    if (role === "draft-how") {
      draftHow = el.value;
      api.onHowInput?.();
    } else if (role === "pathway-how-input") {
      editHowBuffer = el.value;
    } else if (role === "roadblock-text") {
      roadblockDraft = el.value;
    }
  }

  function onSubmit(event) {
    const customForm = event.target?.closest?.("form[data-action='custom-use']");
    if (customForm) {
      event.preventDefault();
      const fd = new FormData(customForm);
      const title = String(fd.get("title") || "").trim();
      const activeTech =
        String(fd.get("techId") || "").trim() ||
        focusedTechId ||
        Object.keys(board()?.techTracks || {})[0] ||
        "";
      if (!title) return;
      if (activeTech) focusedTechId = activeTech;
      const world = techById(activeTech)?.polarity || "bits";
      const added = addCustomUseCase(board(), {
        techId: activeTech,
        title,
        blurb: title,
        world,
        milestoneYear: year(),
        milestoneStatus: "reached",
      });
      selectedUseCaseIds = [...selectedUseCaseIds, added.id];
      traceSelection = { type: "usecase", id: added.id };
      customUseOpen = false;
      commit(added.board, { bill: false });
      return;
    }

    const argForm = event.target?.closest?.("form[data-action='submit-argument']");
    if (argForm) {
      event.preventDefault();
      submitArgumentForm(argForm).catch((e) => console.warn(e));
    }
  }

  function onChange(event) {
    const sel = event.target?.closest?.("select[data-action='select-trend']");
    if (!sel || !rootEl()?.contains(sel)) return;
    const techId = sel.getAttribute("data-tech-id");
    if (techId && sel.value) {
      selectedTrendByTech.set(techId, sel.value);
      paint();
    }
  }

  function wireDom() {
    if (wired) return;
    const root = rootEl();
    if (!root?.addEventListener) return;
    wired = true;
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);
    root.addEventListener("submit", onSubmit);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", scheduleWireSync, { passive: true });
    }
    if (typeof document !== "undefined") {
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !traceSelection) return;
        if (pickerOpen || openChallengerId || argumentModalOpen) return;
        traceSelection = null;
        paint();
      });
    }
    root.addEventListener("dragstart", (event) => {
      const card = event.target?.closest?.("[data-usecase-id], [data-pathway-id]");
      if (!card) return;
      const payload = card.getAttribute("data-usecase-id")
        ? `use:${card.getAttribute("data-usecase-id")}`
        : `path:${card.getAttribute("data-pathway-id")}`;
      event.dataTransfer?.setData("text/plain", payload);
      card.classList.add("is-dragging");
    });
    root.addEventListener("dragend", (event) => {
      event.target?.closest?.(".is-dragging")?.classList.remove("is-dragging");
      root.querySelectorAll?.(".is-drop-hover").forEach((el) => el.classList.remove("is-drop-hover"));
    });
    root.addEventListener("dragover", (event) => {
      const zone = event.target?.closest?.("[data-drop]");
      if (!zone) return;
      event.preventDefault();
      zone.classList.add("is-drop-hover");
    });
    root.addEventListener("dragleave", (event) => {
      const zone = event.target?.closest?.("[data-drop]");
      if (zone && !zone.contains(event.relatedTarget)) {
        zone.classList.remove("is-drop-hover");
      }
    });
    root.addEventListener("drop", (event) => {
      root.querySelectorAll?.(".is-drop-hover").forEach((el) => el.classList.remove("is-drop-hover"));
      const zone = event.target?.closest?.("[data-drop]");
      if (!zone) return;
      event.preventDefault();
      const payload = event.dataTransfer?.getData("text/plain") || "";
      if (payload.startsWith("use:") && zone.getAttribute("data-drop") === "pathway") {
        const ucId = payload.slice(4);
        const uc = board()?.useCases?.[ucId];
        if (!uc) return;
        if (uc.techId) focusedTechId = uc.techId;
        selectedUseCaseIds = [ucId];
        writeOpen = true;
        paint();
      } else if (payload.startsWith("path:")) {
        const sourceId = payload.slice(5);
        if (zone.getAttribute("data-drop") === "crisis") {
          const crisisId =
            event.target.closest("[data-crisis-id]")?.getAttribute("data-crisis-id") ||
            Object.keys(board()?.crises || {})[0];
          if (crisisId) plug(sourceId, crisisId).catch((e) => console.warn(e));
        } else if (zone.getAttribute("data-drop") === "pathway") {
          const targetId = event.target
            .closest("[data-pathway-id]")
            ?.getAttribute("data-pathway-id");
          if (targetId && targetId !== sourceId) {
            fuse(targetId, sourceId);
          }
        }
      }
    });
  }

  wireDom();

  return {
    seedFromMission,
    restoreFromBoard,
    cancelSummon: () => {
      summonBusy = false;
    },
    focusTech,
    selectTrace: (sel) => {
      traceSelection = sel && sel.type && sel.id ? { type: sel.type, id: sel.id } : null;
      paint();
    },
    clearTrace: () => {
      traceSelection = null;
      paint();
    },
    getTrace: () => traceSelection,
    paint,
    wireDom,
    dealMilestone,
    askForIdeas,
    placeSpark,
    dismissSpark,
    clearSparks,
    fuse,
    unfuse,
    plug,
    unplug,
    summonHardQuestions: () => summonNextChallenger(),
    summonNextChallenger,
    remainingConcernAngles: () => remainingConcernAngles(board()),
    refreshAfterYearChange: async () => {
      const current = board();
      if (!isPathwayBoard(current)) return;
      const y = year();
      current.questYear = y;
      const readyAssess = [];
      for (const pw of Object.values(current.pathways || {})) {
        for (const ing of pw.ingredients || []) {
          if (!ing.needsTimingAssess) continue;
          const stillEarly = (ing.useCaseIds || []).some((id) =>
            isUseCaseEarly(current.useCases?.[id], y)
          );
          if (!stillEarly) {
            delete ing.needsTimingAssess;
            readyAssess.push([pw.id, ing.id]);
          }
        }
      }
      const scored = await scoreWired(current);
      commit(scored, { bill: false });
      for (const [pwId, ingId] of readyAssess) {
        await assessIngredientFeasibility(pwId, ingId);
      }
    },
    afterRulesChange: () => {
      const current = board();
      if (!isPathwayBoard(current)) return;
      const next = setPinnedRules(current, api.getRules?.() || []);
      scoreWired(next)
        .then((scored) => commit(scored, { bill: false }))
        .catch(() => commit(next, { bill: false }));
    },
    afterYearPressureRise: () => paint(),
    afterWaitPressureRise: () => paint(),
    boardHolds: () => boardHoldsNow(board()),
    getFocusedTechId: () => focusedTechId,
    revealTile: () => paint(),
    hideTile: () => {
      if (openChallengerId) {
        openChallengerId = null;
        paint();
      }
    },
    setHighlightedTile: () => {},
    clearHighlightedTile: () => {},
    effectiveHowLength: () => String(draftHow || "").trim().length,
    resetCreateMode: () => {
      draftHow = "";
      writeOpen = false;
      paint();
    },
    resumeArgumentWrite: () => {},
    useScaffold: () => {},
    hasSparkBatch: (techId) =>
      Boolean(sparkBatches.get(techId || focusedTechId)?.ids?.length),
    isSummonBusy: () => summonBusy,
    isCreateBusy: () => createBusy,
    createBusyKind: () => (createBusy ? "ideas" : ""),
    fillMintHow: (text) => {
      draftHow = String(text || "").trim();
      if (!draftHow) return false;
      writeOpen = true;
      paint();
      return true;
    },
    listPathways: () => Object.values(board()?.pathways || {}),
    syncPathwayScores: async () => {
      const current = board();
      if (!isPathwayBoard(current)) return;
      commit(await scoreWired(current), { bill: false });
    },
    exportSparkBatches: () => {
      const out = {};
      for (const [techId, batch] of sparkBatches) {
        if (batch?.ids?.length) {
          out[techId] = { ids: batch.ids, titles: batch.titles || [] };
        }
      }
      return Object.keys(out).length ? out : null;
    },
    importSparkBatches: (raw) => {
      sparkBatches.clear();
      if (!raw || typeof raw !== "object") return;
      for (const [techId, batch] of Object.entries(raw)) {
        if (Array.isArray(batch?.ids) && batch.ids.length) {
          sparkBatches.set(techId, {
            ids: batch.ids,
            titles: batch.titles || [],
            ideas: [],
          });
        }
      }
    },
    adoptCollector,
  };
}
