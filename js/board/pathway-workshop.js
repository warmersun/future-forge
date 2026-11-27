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
import { applyPressureRiseYears } from "../sim/pressure.js";
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
  mintStagedDraftsToPathway,
  fuseDraftIntoPathway,
  removePathway,
  findUnusedItems,
  pruneUnusedItems,
  fusePathways,
  unfuseIngredient,
  detachIngredientFromPathway,
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
  settledPathwayAssessments,
  summonChallenger,
  setChallengerAnswer,
  resolveChallengerLamp,
  migrateToPathwayBoard,
  projectToTiles,
  effectiveTiming,
  pathwayContentFingerprint,
  composePathwayHow,
  needsBridgeWarning,
  refreshCrisisLamps,
  isUseCaseEarly,
  isImpactRolePending,
} from "./pathway-model.js";
import {
  DOUBLE_DIAMOND_STAGES,
  WORKBENCH_METHODS,
  SIT_LENSES,
  SCAMPER_LENSES,
  CHALLENGER_LENS_MAP,
  extractScarcityPrompts,
  extractDiscoveryClues,
  synthesizeHmwCandidates,
  recommendedScamperForSeed,
  buildLensPrompt,
  ingredientToWorkbenchIdea,
  draftToIngredientPartials,
  evaluateStagedDrafts,
  sanitizeWorkbenchDrafts,
  localWorkbenchLensDrafts,
  formatLensBadge,
  normalizeWorkbenchWorld,
} from "./workbench-methods.js";

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
  if (data && typeof data === "object" && !data.error) {
    const t = data.timing && typeof data.timing === "object" ? data.timing : data;
    const rawLevel = String(
      t.timingLevel || t.level || t.verdict || data.timingLevel || data.level || ""
    ).toLowerCase();
    let level =
      rawLevel === "green" || rawLevel === "ok" || rawLevel === "honest"
        ? "green"
        : rawLevel === "red" ||
            rawLevel === "vapor" ||
            rawLevel === "reject" ||
            rawLevel === "nonsense"
          ? "red"
          : rawLevel === "yellow" || rawLevel === "stretch"
            ? "yellow"
            : null;
    const rawPct = Number(
      t.feasibilityPct ?? t.timingPct ?? t.pct ?? data.feasibilityPct ?? data.timingPct
    );
    const hasExplicitPct = Number.isFinite(rawPct);
    if (level || hasExplicitPct) {
      const pct = hasExplicitPct
        ? Math.max(5, Math.min(98, Math.round(rawPct)))
        : timingLevelToPct(level);
      if (!level) level = pct >= 68 ? "green" : pct >= 40 ? "yellow" : "red";
      const reason = String(
        t.timingReason ||
          t.reason ||
          t.timingNote ||
          t.note ||
          data.timingReason ||
          data.reason ||
          ""
      ).slice(0, 280);
      return { timingLevel: level, timingPct: pct, timingReason: reason };
    }
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
  const techObj = TECHS.find((row) => row.id === techId);
  const stretch = detectClaimStretch(fallbackText || "", techObj ? [techObj] : [], questYear);
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
  /** @type {Map<string, Map<string, number>>} */
  const scoringPathwayRoles = new Map();
  /** @type {Set<string>} */
  const polishingPathwayIds = new Set();

  function addScoringRoles(pathwayId, roles) {
    if (!pathwayId || !Array.isArray(roles) || !roles.length) return;
    let map = scoringPathwayRoles.get(pathwayId);
    if (!map) {
      map = new Map();
      scoringPathwayRoles.set(pathwayId, map);
    }
    for (const role of roles) {
      map.set(role, (map.get(role) || 0) + 1);
    }
  }

  function removeScoringRoles(pathwayId, roles) {
    const map = scoringPathwayRoles.get(pathwayId);
    if (!map) return;
    for (const role of roles || []) {
      const nextCount = (map.get(role) || 0) - 1;
      if (nextCount > 0) map.set(role, nextCount);
      else map.delete(role);
    }
    if (map.size === 0) scoringPathwayRoles.delete(pathwayId);
  }

  function isScoringPathway(pathwayId) {
    return Boolean(scoringPathwayRoles.get(pathwayId)?.size);
  }

  function isScoringPathwayRole(pathwayId, role) {
    return Boolean(scoringPathwayRoles.get(pathwayId)?.get(role));
  }

  const collapsedCards = new Set();

  function collapseKeyFor(kind, id) {
    const k = String(kind || "").trim();
    const v = String(id || "").trim();
    return k && v ? `${k}:${v}` : "";
  }

  function isCardCollapsed(keyOrKind, maybeId) {
    const key = maybeId !== undefined ? collapseKeyFor(keyOrKind, maybeId) : String(keyOrKind || "");
    return Boolean(key && collapsedCards.has(key));
  }

  function expandCard(kind, id) {
    const key = collapseKeyFor(kind, id);
    if (!key) return false;
    return collapsedCards.delete(key);
  }

  function clearCardCollapse(kind, id) {
    const key = collapseKeyFor(kind, id);
    if (key) collapsedCards.delete(key);
  }

  function toggleCardCollapse(key) {
    const clean = String(key || "").trim();
    if (!clean) return false;
    if (collapsedCards.has(clean)) collapsedCards.delete(clean);
    else collapsedCards.add(clean);
    paint();
    return collapsedCards.has(clean);
  }

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
  let collectionLoad = null;
  let collectorFilterTech = "all";
  const scoreFollowup = new WeakMap();

  // Lane 3 Innovation Workbench (strictly solo/local — never written to board or synced over MP)
  let workbenchOpen = false;
  let wbDiamond = "problem";
  let wbSelectedClueIds = [];
  let wbCluesTouched = false;
  let wbCustomClues = [];
  let wbDiscoveryInput = "";
  let wbAiHmwOptions = [];
  let wbDismissedHmwKeys = [];
  let wbHmwBrief = "";
  let wbHmwLocked = false;
  let wbMethod = "seed";
  let wbScarcityFocus = "";
  let wbSitLens = "subtraction";
  let wbScamperLetters = ["S", "C", "R"];
  let wbRemixSeed = null;
  let wbDraftTitle = "";
  let wbDraftText = "";
  const WORKBENCH_IDEA_CAP = 24;
  let wbDrafts = [];
  let wbStagedIds = [];
  let wbTargetPathwayId = null;
  let wbLensBusy = false;
  let wbBusyKind = null;
  let wbRailExpandedTechId = null;

  function browserStorage() {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage || null;
    } catch {
      return null;
    }
  }

  function wbStorageKey() {
    const m = api.getMission?.();
    const id = String(m?.id || m?.title || "").trim();
    return id ? `ff.workbench.v1:${id}` : "";
  }

  function persistLocalWorkbench() {
    const storage = browserStorage();
    if (!storage) return;
    const key = wbStorageKey();
    if (!key) return;
    try {
      const compactIdeas = wbDrafts.slice(0, WORKBENCH_IDEA_CAP).map((d) => ({
        ...d,
        artPending: false,
        artUrl:
          typeof d.artUrl === "string" && d.artUrl.startsWith("data:")
            ? null
            : d.artUrl || null,
      }));
      const payload = {
        diamond: wbDiamond,
        selectedClueIds: wbSelectedClueIds.slice(0, 12),
        cluesTouched: wbCluesTouched,
        customClues: wbCustomClues.slice(0, 12),
        aiHmwOptions: wbAiHmwOptions.slice(0, 6),
        dismissedHmwKeys: wbDismissedHmwKeys.slice(0, 24),
        hmwBrief: wbHmwBrief,
        hmwLocked: wbHmwLocked,
        scarcityFocus: wbScarcityFocus,
        activeMethod: wbMethod,
        sitLens: wbSitLens,
        scamperLetters: wbScamperLetters,
        targetPathwayId: wbTargetPathwayId,
        ideas: compactIdeas,
      };
      storage.setItem(key, JSON.stringify(payload));
    } catch {
      /* storage optional */
    }
  }

  function clearLocalWorkbenchStorage() {
    const storage = browserStorage();
    if (!storage) return;
    const key = wbStorageKey();
    if (!key) return;
    try {
      storage.removeItem(key);
    } catch {
      /* storage optional */
    }
  }

  function resetWorkbenchMemory(clearStorage = false) {
    workbenchOpen = false;
    wbDiamond = "problem";
    wbSelectedClueIds = [];
    wbCluesTouched = false;
    wbCustomClues = [];
    wbDiscoveryInput = "";
    wbAiHmwOptions = [];
    wbDismissedHmwKeys = [];
    wbHmwBrief = "";
    wbHmwLocked = false;
    wbMethod = "seed";
    wbScarcityFocus = "";
    wbSitLens = "subtraction";
    wbScamperLetters = ["S", "C", "R"];
    wbRemixSeed = null;
    wbDraftTitle = "";
    wbDraftText = "";
    wbDrafts = [];
    wbStagedIds = [];
    wbTargetPathwayId = null;
    wbLensBusy = false;
    wbBusyKind = null;
    wbRailExpandedTechId = null;
    if (clearStorage) clearLocalWorkbenchStorage();
  }

  function restoreLocalWorkbench() {
    resetWorkbenchMemory(false);
    const storage = browserStorage();
    if (!storage) return;
    const key = wbStorageKey();
    if (!key) return;
    try {
      const raw = storage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      if (parsed.diamond === "problem" || parsed.diamond === "solution") {
        wbDiamond = parsed.diamond;
      }
      if (Array.isArray(parsed.selectedClueIds)) {
        wbSelectedClueIds = parsed.selectedClueIds.map(String).slice(0, 12);
      }
      wbCluesTouched = Boolean(parsed.cluesTouched);
      if (Array.isArray(parsed.customClues)) {
        wbCustomClues = parsed.customClues
          .filter((c) => c && typeof c === "object" && c.id && c.title)
          .slice(0, 12);
      }
      if (Array.isArray(parsed.aiHmwOptions)) {
        wbAiHmwOptions = parsed.aiHmwOptions
          .filter((o) => o && typeof o === "object" && o.howText)
          .slice(0, 6);
      }
      if (Array.isArray(parsed.dismissedHmwKeys)) {
        wbDismissedHmwKeys = parsed.dismissedHmwKeys.map(String).filter(Boolean).slice(0, 24);
      }
      if (typeof parsed.hmwBrief === "string") {
        wbHmwBrief = parsed.hmwBrief.slice(0, 280);
      }
      wbHmwLocked = Boolean(parsed.hmwLocked);
      if (typeof parsed.scarcityFocus === "string") {
        wbScarcityFocus = parsed.scarcityFocus.slice(0, 140);
      }
      if (["seed", "sit", "scamper"].includes(parsed.activeMethod)) {
        wbMethod = parsed.activeMethod;
      } else {
        wbMethod = "seed";
      }
      if (SIT_LENSES.some((l) => l.id === parsed.sitLens)) {
        wbSitLens = parsed.sitLens;
      }
      if (Array.isArray(parsed.scamperLetters)) {
        const clean = parsed.scamperLetters
          .map((l) => String(l).toUpperCase())
          .filter((id) => SCAMPER_LENSES.some((l) => l.id === id))
          .slice(0, 3);
        if (clean.length) wbScamperLetters = clean;
      }
      if (typeof parsed.targetPathwayId === "string" && parsed.targetPathwayId) {
        wbTargetPathwayId = parsed.targetPathwayId;
      }
      const storedList = Array.isArray(parsed.ideas)
        ? parsed.ideas
        : Array.isArray(parsed.drafts)
          ? parsed.drafts
          : [];
      if (storedList.length) {
        wbDrafts = storedList
          .filter((d) => d && typeof d === "object" && d.id && d.title && d.howText)
          .slice(0, WORKBENCH_IDEA_CAP);
      }
    } catch {
      /* ignore corrupt local storage */
    }
  }

  function countUnusedSparks() {
    let total = 0;
    for (const batch of sparkBatches.values()) {
      total += (batch?.ideas || []).length;
    }
    return total;
  }

  function formatUnusedParts({ techCount, useCaseCount, pathwayCount, sparkCount }) {
    const parts = [];
    if (techCount) parts.push(`${techCount} ${techCount === 1 ? "tech" : "techs"}`);
    if (useCaseCount) parts.push(`${useCaseCount} ${useCaseCount === 1 ? "use case" : "use cases"}`);
    if (pathwayCount) parts.push(`${pathwayCount} ${pathwayCount === 1 ? "pathway" : "pathways"}`);
    if (sparkCount) parts.push(`${sparkCount} ${sparkCount === 1 ? "idea" : "ideas"}`);
    return parts.join(", ");
  }

  function unusedSummaryFor(current, activeFocus) {
    const u = findUnusedItems(current, { focusedTechId: activeFocus });
    const sparkCount = countUnusedSparks();
    const techCount = u.techIds.length;
    const useCaseCount = u.useCaseIds.length;
    const pathwayCount = u.pathwayIds.length;
    const count = techCount + useCaseCount + pathwayCount + sparkCount;
    const parts = formatUnusedParts({ techCount, useCaseCount, pathwayCount, sparkCount });
    return {
      ...u,
      techCount,
      useCaseCount,
      pathwayCount,
      sparkCount,
      count,
      parts,
      tooltip: parts ? `Remove unconnected items: ${parts}` : "Nothing unconnected to clear",
    };
  }

  function resolveEffectiveRemixSeed(current, useCases, pathways, activeFocus) {
    if (wbRemixSeed && wbRemixSeed.howText) return wbRemixSeed;
    if (wbDrafts.length) {
      const top = wbDrafts[0];
      return {
        kind: "draft",
        id: top.id,
        title: top.title,
        howText: top.howText,
        techId: top.techId || activeFocus || null,
        world: top.world || "bits",
      };
    }
    const focusPw =
      pathways.find((p) => p.id === focusedPathwayId) || pathways[0] || null;
    if (focusPw) {
      return {
        kind: "pathway",
        id: focusPw.id,
        title: focusPw.title,
        howText: focusPw.howText || "",
        techId: focusPw.ingredients?.[0]?.techId || activeFocus || null,
        world: focusPw.ingredients?.[0]?.world || "bits",
      };
    }
    const selUc = selectedIds()
      .map((id) => current?.useCases?.[id])
      .filter(Boolean)[0] || useCases[0] || null;
    if (selUc) {
      return {
        kind: "usecase",
        id: selUc.id,
        title: selUc.title,
        howText: selUc.blurb || selUc.title,
        techId: selUc.techId || activeFocus || null,
        world: selUc.world || "bits",
      };
    }
    const tech = activeFocus ? techById(activeFocus) : null;
    if (tech) {
      return {
        kind: "tech",
        id: tech.id,
        title: tech.name,
        howText: tech.summary || tech.name,
        techId: tech.id,
        world: tech.polarity || "bits",
      };
    }
    return null;
  }

  function buildSeedChoices(useCases, pathways) {
    const out = [];
    for (const d of wbDrafts) {
      out.push({ key: `draft:${d.id}`, kind: "draft", id: d.id, label: `Idea · ${d.title}` });
    }
    for (const pw of pathways) {
      out.push({ key: `pathway:${pw.id}`, kind: "pathway", id: pw.id, label: `Pathway · ${pw.title}` });
    }
    for (const uc of useCases) {
      out.push({ key: `usecase:${uc.id}`, kind: "usecase", id: uc.id, label: `Use case · ${uc.title}` });
    }
    return out;
  }

  function resolveDiscoveryContext(current, mission, crises) {
    const baseClues = extractDiscoveryClues(mission, crises, current?.rules || []);
    const allClues = [...wbCustomClues, ...baseClues];
    const validIds = new Set(allClues.map((c) => c.id));
    const effectiveSelectedIds = wbCluesTouched
      ? wbSelectedClueIds.filter((id) => validIds.has(id))
      : baseClues.slice(0, 2).map((c) => c.id);
    const selectedSet = new Set(effectiveSelectedIds);
    const cluesView = allClues.map((c) => ({
      ...c,
      selected: selectedSet.has(c.id),
      removable: wbCustomClues.some((u) => u.id === c.id),
    }));
    const selectedClues = cluesView.filter((c) => c.selected);
    const synth = synthesizeHmwCandidates(mission, crises, selectedClues);
    const dismissedSet = new Set(wbDismissedHmwKeys);
    const hmwCandidates = [];
    const seen = new Set();
    let hiddenSynthCount = 0;
    for (const item of [...wbAiHmwOptions, ...synth]) {
      const key = String(item?.howText || "").trim().toLowerCase();
      const idKey = item?.id ? `id:${item.id}` : "";
      if (!key || seen.has(key)) continue;
      if (dismissedSet.has(key) || (idKey && dismissedSet.has(idKey))) {
        if (!String(item?.id || "").startsWith("hmw-ai-")) hiddenSynthCount += 1;
        continue;
      }
      seen.add(key);
      hmwCandidates.push(item);
      if (hmwCandidates.length >= 6) break;
    }
    return {
      clues: cluesView,
      selectedClues,
      selectedIds: effectiveSelectedIds,
      hmwCandidates,
      dismissedHmwCount: hiddenSynthCount,
    };
  }

  function resolveTargetPathway(pathways) {
    if (!Array.isArray(pathways) || !pathways.length) {
      return { id: null, num: 0, title: "" };
    }
    const idx =
      pathways.findIndex((p) => p.id === wbTargetPathwayId) >= 0
        ? pathways.findIndex((p) => p.id === wbTargetPathwayId)
        : pathways.findIndex((p) => p.id === focusedPathwayId) >= 0
          ? pathways.findIndex((p) => p.id === focusedPathwayId)
          : pathways.length - 1;
    const chosen = pathways[idx];
    return {
      id: chosen.id,
      num: idx + 1,
      title: chosen.title || `Pathway #${idx + 1}`,
    };
  }

  function workbenchViewFor(current, activeFocus, mission, crises, useCases, pathways, y) {
    const place = api.getPlace?.() || mission?.place || "";
    const scarcityChips = extractScarcityPrompts(mission, crises);
    const discovery = resolveDiscoveryContext(current, mission, crises);
    const liveDraftIds = new Set(wbDrafts.map((d) => d.id));
    wbStagedIds = wbStagedIds.filter((id) => liveDraftIds.has(id));
    const stagedSet = new Set(wbStagedIds);
    const stagedDrafts = wbStagedIds
      .map((id) => wbDrafts.find((d) => d.id === id))
      .filter(Boolean);

    const effectiveSeed = resolveEffectiveRemixSeed(current, useCases, pathways, activeFocus);
    const selectedUcs = selectedIds()
      .map((id) => current?.useCases?.[id])
      .filter(Boolean);
    const activeTech = activeFocus ? techById(activeFocus) : null;
    const effectiveHmw = wbHmwBrief.trim();
    const fallbackScarcity = wbScarcityFocus || crises[0]?.name || "";
    const prompt = buildLensPrompt(wbMethod, {
      place,
      year: y,
      hmwBrief: effectiveHmw,
      scarcity: fallbackScarcity,
      useCaseTitles: selectedUcs.map((u) => u.title),
      techName: activeTech?.name || "",
      sitLens: wbSitLens,
      scamperLetters: wbScamperLetters,
      seedTitle: effectiveSeed?.title || "",
      seedText: effectiveSeed?.howText || "",
      challengerAngle: effectiveSeed?.challengerAngle || null,
      challengerQuestion: effectiveSeed?.challengerQuestion || "",
    });
    const budgetEnabled = api.budgetWillEnabled?.() !== false;
    const enforce = enforceWorlds();
    const preflight = evaluateStagedDrafts(stagedDrafts, current, y, {
      budgetWillEnabled: budgetEnabled,
      enforceWorlds: enforce,
    });

    const ideasView = wbDrafts.map((d) => {
      const check = evaluateStagedDrafts([d], current, y, {
        budgetWillEnabled: budgetEnabled,
        enforceWorlds: enforce,
      });
      return {
        ...d,
        staged: stagedSet.has(d.id),
        mintCostLabel: check.cost.label,
        mintCost: check.cost,
        hasSynergy: (check.convergences || []).length > 0,
        earlyForecast: check.horizon.early ? check.horizon.year : null,
      };
    });

    const targetPw = resolveTargetPathway(pathways);

    return {
      open: workbenchOpen,
      diamond: wbDiamond === "problem" ? "problem" : "solution",
      stages: DOUBLE_DIAMOND_STAGES,
      discoveryClues: discovery.clues,
      selectedClueCount: discovery.selectedClues.length,
      discoveryInput: wbDiscoveryInput,
      hmwCandidates: discovery.hmwCandidates,
      dismissedHmwCount: discovery.dismissedHmwCount,
      hmwBrief: wbHmwBrief,
      hmwLocked: Boolean(wbHmwLocked && effectiveHmw),
      method: wbMethod,
      methods: WORKBENCH_METHODS,
      scarcityFocus: wbScarcityFocus,
      scarcityChips,
      sitLenses: SIT_LENSES,
      sitLens: wbSitLens,
      scamperLenses: SCAMPER_LENSES,
      scamperLetters: [...wbScamperLetters],
      remixSeed: effectiveSeed,
      seedChoices: buildSeedChoices(useCases, pathways),
      prompt,
      draftTitle: wbDraftTitle,
      draftText: wbDraftText,
      ideas: ideasView,
      ideaCount: ideasView.length,
      drafts: ideasView,
      draftCount: ideasView.length,
      stagedDrafts,
      stagedCount: stagedDrafts.length,
      targetPathwayId: targetPw.id,
      targetPathwayNum: targetPw.num,
      targetPathwayTitle: targetPw.title,
      preflight,
      busy: wbLensBusy,
      busyKind: wbBusyKind,
      railExpandedTechId: wbRailExpandedTechId,
      challengerGuide: effectiveSeed?.challengerAngle
        ? CHALLENGER_LENS_MAP[effectiveSeed.challengerAngle] || null
        : null,
    };
  }

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
        (isImpactRolePending(impact, role) || isScoringPathwayRole(wire.pathwayId, role)) &&
        !timing?.early;
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
          hasCustomHow: Boolean(String(pw.customHow || "").trim()),
          timingLevel: timing.early ? "red" : timing.timingLevel,
          timingPct: timing.timingPct,
          timingReason: timing.timingReason,
          timingPending: timing.pending,
          scoring: isScoringPathway(pw.id),
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
    const unused = unusedSummaryFor(current, activeFocus);
    const workbench = workbenchViewFor(
      current,
      activeFocus,
      mission,
      crises,
      useCases,
      pathways,
      y
    );

    return {
      year: y,
      isTutorial: Boolean(api.isTutorial?.()),
      focusedTechId: activeFocus,
      focusedPathwayId,
      trace: traceSelection,
      editingPathwayId,
      collapsedCards: [...collapsedCards],
      tracks: trackRows,
      useCases,
      pathways,
      crises,
      wires,
      rules: current?.rules || [],
      sparks,
      unused,
      workbench,
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

  function missionWinMax() {
    const fromApi = api.getWinMax?.();
    if (fromApi && Object.keys(fromApi).length) return fromApi;
    return api.getMission?.()?.winMax || {};
  }

  function commit(next, opts = {}) {
    if (!isPathwayBoard(next)) return false;
    const follow = scoreFollowup.get(next);
    const refreshed = refreshCrisisLamps(next, missionWinMax());
    next = refreshed.board;
    next.questYear = year();
    const prev = board();
    const prevEcon = placedTechEconomy(prev);
    const projected = projectToTiles(next);
    projected.questYear = year();
    if (opts.bill) {
      const afford = affordProjectedBoard(prev, projected);
      if (afford && afford.ok === false) {
        api.flashUnaffordableTech?.(afford.techId, afford.error);
        paint();
        return false;
      }
    }
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
    const display = refreshed.displayPressure || {};
    if (Object.keys(display).length) api.setPressure?.(display);
    syncDerivedProse(projected);
    api.commitBoard?.(projected);
    for (const crisisDelta of follow?.ease || []) {
      if (crisisDelta && Object.keys(crisisDelta).length) {
        api.grantPathwayEase?.({ crisisDelta });
      }
    }
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

  /** Price every new tech in one mint together. Two that each fit alone can still fail as a pair. */
  function gateNewTechs(current, partials) {
    const tiles = [];
    const checked = new Set();
    for (const p of partials || []) {
      if (!p?.techId || checked.has(p.techId)) continue;
      checked.add(p.techId);
      const already = Object.values(current.pathways || {}).some((pw) =>
        (pw.ingredients || []).some((ing) => ing.techId === p.techId)
      );
      if (already && !p.collectorCardId) continue;
      const free =
        p.collectorCardId &&
        !Object.values(current.pathways || {}).some((pw) =>
          (pw.ingredients || []).some((ing) => ing.collectorCardId === p.collectorCardId)
        );
      tiles.push({
        id: "pending",
        kind: "invention",
        techId: p.techId,
        q: null,
        r: null,
        origin: free ? "collector" : "pathway",
        collectorCardId: free ? p.collectorCardId : null,
      });
    }
    if (!tiles.length) return { ok: true };
    if (api.canPlaceInventions) return api.canPlaceInventions(tiles) || { ok: true };
    for (const tile of tiles) {
      const gate = api.canPlaceInvention?.(tile);
      if (gate && gate.ok === false) return { ...gate, techId: tile.techId };
    }
    return { ok: true };
  }

  /**
   * Summed new-tech cost and stack slots for the projected field.
   * Skipped when a paid tech leaves the board — that refund can fund the add,
   * and reconcile rolls the charge back if the remainder still fails.
   */
  function affordProjectedBoard(prevBoard, nextBoard) {
    if (!api.canPlaceInventions) return { ok: true };
    const prevEcon = placedTechEconomy(prevBoard);
    const nextEcon = placedTechEconomy(nextBoard);
    const prevPaid = new Set(prevEcon.paid);
    const nextPaid = new Set(nextEcon.paid);
    if (prevEcon.paid.some((id) => !nextPaid.has(id))) return { ok: true };
    const prevAll = new Set(prevEcon.all);
    const tiles = [];
    for (const id of nextEcon.all) {
      if (prevPaid.has(id)) continue;
      if (nextPaid.has(id)) {
        tiles.push({
          id: "pending",
          kind: "invention",
          techId: id,
          q: null,
          r: null,
          origin: "pathway",
        });
        continue;
      }
      if (!prevAll.has(id) && nextEcon.collectorOnly.includes(id)) {
        tiles.push({
          id: "pending",
          kind: "invention",
          techId: id,
          q: null,
          r: null,
          origin: "collector",
          collectorCardId: "batch",
        });
      }
    }
    if (!tiles.length) return { ok: true };
    return api.canPlaceInventions(tiles) || { ok: true };
  }

  function seedFromMission(mission) {
    tracks.clear();
    sparkBatches.clear();
    expandedDescTechs.clear();
    selectedTrendByTech.clear();
    chartOverride.clear();
    scoringPathwayRoles.clear();
    polishingPathwayIds.clear();
    collapsedCards.clear();
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
    resetWorkbenchMemory(true);

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
    scoringPathwayRoles.clear();
    polishingPathwayIds.clear();
    collapsedCards.clear();
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
    restoreLocalWorkbench();

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
    expandCard("tech", techId);
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

  async function assessIngredientFeasibility(pathwayId, ingredientId, opts = {}) {
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
    const updated = setIngredientTiming(latest, pathwayId, ingredientId, {
      ...result,
      timingPending: false,
    });
    const isWired = Object.values(updated.wires || {}).some((w) => w.pathwayId === pathwayId);
    if (!commit(updated, { bill: false })) return;
    if (isWired && !opts.skipScore) commit(await scoreWired(board()), { bill: false });
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
    const needArt = Boolean(api.fetchIdeaImage);
    const created = createPathway(board(), {
      techId: null,
      title: provided ? provided.split(/[.!?]/)[0].trim().slice(0, 56) : "Human workflow step",
      howText: how,
      world: "plain",
      imagePrompt: how.slice(0, 400),
      artPending: needArt,
      timingLevel: provided ? "yellow" : "green",
      timingPct: provided ? 75 : 88,
      timingPending: Boolean(provided),
    });
    draftHow = "";
    writeOpen = false;
    focusedPathwayId = created.pathwayId;
    traceSelection = { type: "pathway", id: created.pathwayId };
    if (!provided && !workbenchOpen) {
      editingPathwayId = created.pathwayId;
      editHowBuffer = how;
    }
    const ok = commit(created.board, { bill: false });
    if (ok) {
      if (provided) {
        assessIngredientFeasibility(created.pathwayId, created.ingredientId).catch((e) =>
          console.warn("[assess-plain]", e)
        );
      }
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
          imagePrompt: how.slice(0, 400),
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
    expandCard("pathway", result.pathwayId);
    expandCard("wb-pathway", result.pathwayId);
    clearCardCollapse("pathway", sourceId);
    clearCardCollapse("wb-pathway", sourceId);
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
   * Score plugged pathways, then apply those scores onto the live board.
   * Edits made during the round trip stay; a removed wire is not paid.
   */
  async function scoreWired(current, opts = {}) {
    if (!isPathwayBoard(current)) return current;
    const liveAtStart = board();
    const startRev = isPathwayBoard(liveAtStart) ? liveAtStart.rev : null;
    const snap = structuredClone(current);
    const y = year();
    const forceIds = opts.forcePathwayIds || new Set();
    const wiresByPathway = new Map();
    for (const wire of Object.values(snap.wires || {})) {
      if (!wiresByPathway.has(wire.pathwayId)) wiresByPathway.set(wire.pathwayId, []);
      wiresByPathway.get(wire.pathwayId).push(wire);
    }

    const mission = api.getMission?.() || null;
    const rules = api.getRules?.() || snap.rules || [];
    const globalObj = api.getGlobal?.() || null;
    const globalId = mission?.globalId || globalObj?.id || null;
    const results = [];

    for (const [pathwayId, pwWires] of wiresByPathway.entries()) {
      const pathway = snap.pathways?.[pathwayId];
      if (!pathway) continue;
      const timing = effectiveTiming(pathway, snap.useCases, y);
      const fp = pathwayContentFingerprint(pathway, snap);
      const targetCrises = pwWires
        .map((w) => snap.crises?.[w.crisisId])
        .filter(Boolean);
      if (!targetCrises.length) continue;
      const roles = [...new Set(targetCrises.map((c) => c.role || "local"))];
      const inventionIds = pathway.ingredients.map((ing) => ing.id);

      if (timing.early) {
        const reason = timing.timingReason;
        results.push({
          kind: "early",
          pathwayId,
          fingerprint: fp,
          inventionIds,
          scoredRoles: roles,
          impact: {
            pathwayId,
            inventionIds,
            crisisDelta: Object.fromEntries(roles.map((r) => [r, 0])),
            crisisReasons: Object.fromEntries(roles.map((r) => [r, reason])),
            concerns: {},
            earlyBlocked: true,
            pendingRoles: {},
            pending: false,
          },
        });
        continue;
      }

      const cached = snap.pathwayImpacts?.[fp];
      const forcePathway = forceIds.has(pathwayId);
      const pwChallengers = Object.values(snap.challengers || {}).filter(
        (ch) => ch.pathwayId === pathwayId
      );
      const needsConcernScore = pwChallengers.some(
        (ch) => !cached?.concerns?.[ch.angle] && fp !== ch.posedAgainstFingerprint
      );
      const canReuseCachedRoles = Boolean(cached && !cached.earlyBlocked && !forcePathway);
      const missingRoles = canReuseCachedRoles
        ? roles.filter(
            (r) =>
              isImpactRolePending(cached, r) ||
              !cached.crisisDelta ||
              !Object.prototype.hasOwnProperty.call(cached.crisisDelta, r)
          )
        : [...roles];

      if (missingRoles.length === 0 && !needsConcernScore) {
        results.push({
          kind: "cached",
          pathwayId,
          fingerprint: fp,
          inventionIds,
          scoredRoles: [],
          score: cached,
          impact: {
            ...cached,
            pendingRoles: {},
            pending: false,
          },
        });
        continue;
      }

      const rolesToScore = missingRoles.length > 0 ? missingRoles : roles;
      const crisesToScore =
        missingRoles.length > 0
          ? targetCrises.filter((c) => missingRoles.includes(c.role || "local"))
          : targetCrises;
      const includeConcerns = Boolean(
        pwChallengers.length && (forcePathway || needsConcernScore)
      );

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
      const heurOpts = { mission, rules, crisisRoles: rolesToScore };
      const heur = heuristicPathwayScore(inventions, y, heurOpts);
      let score = heur;

      if (api.coInvent) {
        addScoringRoles(pathwayId, rolesToScore);
        paint();
        try {
          const concernsPayload = includeConcerns
            ? pwChallengers.map((ch) => ({
                angle: ch.angle,
                challengeSpeech: ch.speech || "",
                challengeQuestion: ch.question || "",
                playerAnswer: ch.playerAnswer || "",
                inventChanged: Boolean(
                  ch.posedAgainstFingerprint && fp !== ch.posedAgainstFingerprint
                ),
                posedHowText: ch.posedHowText || "",
              }))
            : [];
          const acceptedArgs = acceptedArgumentsForPathway(snap, pathway);
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
            pressureBase: snap.pressureBase || {},
            winMax: mission?.winMax || missionWinMax(),
            crisisRoles: crisesToScore.map((c) => ({
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
                normalizePathwayScore(ai, rolesToScore),
                heur,
                rolesToScore
              ),
              inventions,
              heurOpts
            );
            if (ai.concerns && !score.concerns) score.concerns = ai.concerns;
          }
        } catch {
          score = heur;
        } finally {
          removeScoringRoles(pathwayId, rolesToScore);
        }
      }

      results.push({
        kind: "fresh",
        pathwayId,
        fingerprint: fp,
        inventionIds,
        scoredRoles: missingRoles.length > 0 ? [...missingRoles] : [],
        scoredConcerns: includeConcerns,
        forceReset: forcePathway || Boolean(cached?.earlyBlocked),
        score,
      });
    }

    const liveNow = board();
    const landing =
      isPathwayBoard(liveNow) && liveNow.rev !== startRev
        ? structuredClone(liveNow)
        : structuredClone(current);
    const ease = [];
    let applied = false;
    for (const result of results) {
      const pathway = landing.pathways?.[result.pathwayId];
      if (!pathway) continue;
      if (pathwayContentFingerprint(pathway, landing) !== result.fingerprint) continue;
      const stillWired = Object.values(landing.wires || {}).some(
        (wire) => wire.pathwayId === result.pathwayId
      );
      if (!stillWired) continue;
      const prev = landing.pathwayImpacts?.[result.fingerprint];

      if (result.kind === "early") {
        landing.pathwayImpacts[result.fingerprint] = result.impact;
        applied = true;
        continue;
      }

      if (result.kind === "cached") {
        const keepLive = prev && !prev.pending && !prev.earlyBlocked;
        if (!keepLive) {
          landing.pathwayImpacts[result.fingerprint] = result.impact;
        }
        continue;
      }

      // Fresh incremental merge: preserve already-scored crisis roles unless forceReset
      const newlySettledRoles = (result.scoredRoles || []).filter(
        (role) =>
          !prev ||
          prev.earlyBlocked ||
          isImpactRolePending(prev, role) ||
          !prev.crisisDelta ||
          !Object.prototype.hasOwnProperty.call(prev.crisisDelta, role)
      );
      const baseDelta =
        !result.forceReset && prev && !prev.earlyBlocked && prev.crisisDelta
          ? { ...prev.crisisDelta }
          : {};
      const baseReasons =
        !result.forceReset && prev && !prev.earlyBlocked && prev.crisisReasons
          ? { ...prev.crisisReasons }
          : {};
      const baseConcerns =
        !result.forceReset && prev && !prev.earlyBlocked && prev.concerns
          ? { ...prev.concerns }
          : {};
      for (const role of result.scoredRoles || []) {
        if (
          result.score?.crisisDelta &&
          Object.prototype.hasOwnProperty.call(result.score.crisisDelta, role)
        ) {
          baseDelta[role] = result.score.crisisDelta[role];
        }
        if (
          result.score?.crisisReasons &&
          Object.prototype.hasOwnProperty.call(result.score.crisisReasons, role)
        ) {
          baseReasons[role] = result.score.crisisReasons[role];
        }
      }
      const mergedConcerns = result.scoredConcerns
        ? { ...baseConcerns, ...(result.score?.concerns || {}) }
        : baseConcerns;
      const nextPendingRoles =
        !result.forceReset && prev?.pendingRoles && typeof prev.pendingRoles === "object"
          ? { ...prev.pendingRoles }
          : {};
      for (const role of result.scoredRoles || []) {
        delete nextPendingRoles[role];
      }
      const mergedImpact = {
        pathwayId: result.pathwayId,
        inventionIds: result.inventionIds,
        crisisDelta: baseDelta,
        crisisReasons: baseReasons,
        concerns: mergedConcerns,
        pendingRoles: nextPendingRoles,
        pending: Object.keys(nextPendingRoles).length > 0,
      };
      landing.pathwayImpacts[result.fingerprint] = mergedImpact;
      applied = true;

      if (newlySettledRoles.length) {
        const connected = new Set();
        for (const wire of Object.values(landing.wires || {})) {
          if (wire.pathwayId !== result.pathwayId) continue;
          connected.add(landing.crises?.[wire.crisisId]?.role || "local");
        }
        const crisisDelta = {};
        for (const role of newlySettledRoles) {
          if (!connected.has(role)) continue;
          const n = Number(baseDelta[role]);
          if (Number.isFinite(n) && n < 0) crisisDelta[role] = n;
        }
        if (Object.keys(crisisDelta).length) ease.push(crisisDelta);
      }

      if (result.scoredConcerns || result.forceReset) {
        for (const ch of Object.values(landing.challengers || {})) {
          if (ch.pathwayId !== result.pathwayId) continue;
          const cRow = mergedConcerns?.[ch.angle];
          const concernLamp = typeof cRow === "string" ? cRow : cRow?.level;
          ch.lamp = resolveChallengerLamp(ch, pathway, concernLamp, landing);
          if (cRow?.reason && !ch.playerAnswer) {
            ch.answerFeedback = String(cRow.reason).slice(0, 400);
          }
        }
      }
    }
    if (applied) landing.rev = (Number(landing.rev) || 0) + 1;
    if (ease.length) scoreFollowup.set(landing, { ease });
    return landing;
  }

  async function plug(pathwayId, crisisId) {
    const result = plugWire(board(), pathwayId, crisisId);
    if (!result.ok) return false;
    focusedPathwayId = pathwayId;
    expandCard("crisis", crisisId);
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
    return commit(next, { bill: false });
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
    if (startWire?.crisisId) expandCard("crisis", startWire.crisisId);
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
    expandCard("pathway", pathwayId);
    expandCard("wb-pathway", pathwayId);
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
    if (!commit(next, { bill: false })) return;
    if (isWired) {
      commit(await scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) }), {
        bill: false,
      });
    }
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
    if (!commit(next, { bill: false })) return;
    if (isWired) {
      commit(await scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) }), {
        bill: false,
      });
    }
  }

  async function submitArgument(pathwayId, rawClaim) {
    if (argumentBusy) return null;
    const targetPathwayId =
      String(pathwayId || "").trim() ||
      focusedPathwayId ||
      Object.keys(board()?.pathways || {})[0];
    const claim = String(rawClaim || "").trim();
    if (!targetPathwayId || !board()?.pathways?.[targetPathwayId]) {
      api.flashToast?.("Create a Pathway in Lane 3 before filing an argument.");
      return null;
    }
    if (claim.length < 12) {
      api.flashToast?.("State a concrete demonstrated fact (at least one full sentence).");
      return null;
    }
    const assessments = settledPathwayAssessments(board(), targetPathwayId);
    if (!assessments.timings.length && !assessments.pathways.length) {
      api.flashToast?.(
        "Wait for a timing check or plug this Pathway into a Crisis before filing an argument."
      );
      return null;
    }
    const pay = api.spendArgumentAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP (1 AP required).");
      return null;
    }
    argumentBusy = true;
    argumentModalOpen = false;
    const argId = `arg-${Date.now().toString(36)}`;
    let next = attachArgument(board(), targetPathwayId, {
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
          assessments,
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
        return null;
      }
      let settled = settleArgument(board(), argId, verdict, reason);
      api.flashToast?.(
        verdict === "accept"
          ? `⚖️ Argument accepted: ${reason || "attached to pathway."}`
          : `⚖️ Argument rejected: ${reason || "claim not verified."}`
      );
      if (!commit(settled, { bill: false })) return null;
      if (verdict === "accept") {
        const pwNow = board()?.pathways?.[targetPathwayId];
        for (const ing of pwNow?.ingredients || []) {
          if (ing.timingLevel && ing.timingLevel !== "green") {
            await assessIngredientFeasibility(targetPathwayId, ing.id, { skipScore: true });
          }
        }
        const isWired = Object.values(board()?.wires || {}).some(
          (w) => w.pathwayId === targetPathwayId
        );
        if (isWired) {
          commit(await scoreWired(board(), { forcePathwayIds: new Set([targetPathwayId]) }), {
            bill: false,
          });
        }
      }
      return { id: argId, verdict, reason };
    } catch {
      commit(removeArgument(board(), argId), { bill: false });
      api.flashToast?.("Fact-check failed — argument removed.");
      return null;
    } finally {
      argumentBusy = false;
    }
  }

  async function submitArgumentForm(form) {
    const fd = new FormData(form);
    return submitArgument(fd.get("pathwayId"), fd.get("claim"));
  }

  async function showCollection() {
    if (!api.isSignedIn?.()) {
      api.flashToast?.("Sign in to access your Collector Cards.");
      return;
    }
    const dlg = typeof document !== "undefined" ? document.querySelector("#collector-cards") : null;
    if (!dlg) return;
    if (
      typeof document !== "undefined" &&
      document.body &&
      dlg.parentElement &&
      dlg.parentElement !== document.body &&
      typeof document.body.appendChild === "function"
    ) {
      document.body.appendChild(dlg);
    }
    if (dlg.dataset && !dlg.dataset.backdropClose && typeof dlg.addEventListener === "function") {
      dlg.dataset.backdropClose = "1";
      dlg.addEventListener("click", (ev) => {
        if (ev.target === dlg && typeof dlg.close === "function") dlg.close();
      });
    }
    if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
    const list = document.querySelector("#collector-cards-list");
    const filters = document.querySelector("#collector-cards-filters");
    const empty = document.querySelector("#collector-cards-empty");
    if (!collectionCards) {
      if (filters) filters.hidden = true;
      if (empty) empty.hidden = true;
      if (list && !collectionLoad) list.textContent = "Loading…";
      if (!collectionLoad) {
        collectionLoad = Promise.resolve()
          .then(() => api.listCollectorCards?.() || [])
          .finally(() => {
            collectionLoad = null;
          });
      }
      try {
        const fetched = await collectionLoad;
        if (!api.isSignedIn?.()) {
          if (typeof dlg.close === "function") dlg.close();
          collectionCards = null;
          return;
        }
        collectionCards = Array.isArray(fetched) ? fetched : [];
      } catch {
        collectionCards = null;
        if (list) list.textContent = "";
        if (empty) {
          empty.hidden = false;
          empty.textContent = "Could not load your collection.";
        }
        return;
      }
    }
    const renderPickerContent = () => {
      paintCollectorPicker({
        list: document.querySelector("#collector-cards-list"),
        filters: document.querySelector("#collector-cards-filters"),
        empty: document.querySelector("#collector-cards-empty"),
        cards: collectionCards || [],
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
    traceSelection = { type: "tech", id: card.techId };
    trackFor(card.techId);
    commit(next, { bill: false });
    api.flashToast?.(
      `Added collector card: ${card.title || card.techName || techById(card.techId)?.name || card.techId}`
    );
  }

  function dropClearedSelection(pruned, removed) {
    const removedTechSet = new Set(removed.techIds);
    const removedUcSet = new Set(removed.useCaseIds);
    const removedPwSet = new Set(removed.pathwayIds);
    selectedUseCaseIds = selectedUseCaseIds.filter((id) => !removedUcSet.has(id));
    if (focusedPathwayId && removedPwSet.has(focusedPathwayId)) focusedPathwayId = null;
    if (editingPathwayId && removedPwSet.has(editingPathwayId)) {
      editingPathwayId = null;
      editHowBuffer = "";
    }
    for (const tid of removed.techIds) chartOverride.delete(tid);
    if (focusedTechId && removedTechSet.has(focusedTechId)) {
      focusedTechId = Object.keys(pruned.techTracks || {})[0] || null;
    }
    if (!traceSelection) return;
    const drop =
      (traceSelection.type === "tech" && removedTechSet.has(traceSelection.id)) ||
      (traceSelection.type === "usecase" && removedUcSet.has(traceSelection.id)) ||
      (traceSelection.type === "pathway" && removedPwSet.has(traceSelection.id));
    if (drop) traceSelection = null;
  }

  function wipeSparkBatches() {
    for (const batch of sparkBatches.values()) {
      if (!batch) continue;
      batch.ideas = [];
      batch.ids = [];
      batch.titles = [];
    }
  }

  // ── Lane 3 Innovation Workbench actions (strictly solo/local until Pathway commit) ──

  function openWorkbench(opts = {}) {
    workbenchOpen = true;
    if (opts.diamond === "problem" || opts.diamond === "solution") {
      wbDiamond = opts.diamond;
    } else if (opts.method && ["seed", "sit", "scamper"].includes(opts.method)) {
      wbMethod = opts.method;
      wbDiamond = "solution";
    } else {
      const hasBoardPathways = Object.keys(board()?.pathways || {}).length > 0;
      if (!wbHmwLocked && !wbHmwBrief.trim() && wbDrafts.length === 0 && !hasBoardPathways) {
        wbDiamond = "problem";
      } else if (!wbDiamond) {
        wbDiamond = "solution";
      }
    }
    if (opts.method && ["seed", "sit", "scamper"].includes(opts.method)) {
      wbMethod = opts.method;
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function closeWorkbench() {
    workbenchOpen = false;
    paint();
    return true;
  }

  function toggleWorkbench() {
    return workbenchOpen ? closeWorkbench() : openWorkbench();
  }

  function setWorkbenchDiamond(diamond) {
    if (diamond !== "problem" && diamond !== "solution") return false;
    wbDiamond = diamond;
    persistLocalWorkbench();
    paint();
    return true;
  }

  function setWorkbenchMethod(method) {
    if (!["seed", "sit", "scamper"].includes(method)) return false;
    wbMethod = method;
    wbDiamond = "solution";
    persistLocalWorkbench();
    paint();
    return true;
  }

  function pickWorkbenchScarcity(label) {
    const clean = String(label || "").trim().slice(0, 140);
    wbScarcityFocus = wbScarcityFocus === clean ? "" : clean;
    persistLocalWorkbench();
    paint();
    return wbScarcityFocus;
  }

  function toggleDiscoveryClue(clueId) {
    const id = String(clueId || "").trim();
    if (!id) return false;
    const current = board();
    const mission = api.getMission?.() || {};
    const crises = Object.values(current?.crises || {});
    if (!wbCluesTouched) {
      const defaults = resolveDiscoveryContext(current, mission, crises).selectedIds;
      wbSelectedClueIds = [...defaults];
      wbCluesTouched = true;
    }
    if (wbSelectedClueIds.includes(id)) {
      wbSelectedClueIds = wbSelectedClueIds.filter((x) => x !== id);
    } else {
      wbSelectedClueIds = [...wbSelectedClueIds, id];
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function addPlayerDiscoveryInsight(rawText) {
    const root = rootEl();
    const liveEl = root?.querySelector?.("[data-role='wb-discovery-input']");
    if (liveEl && typeof liveEl.value === "string") wbDiscoveryInput = liveEl.value;
    const text = String(rawText ?? wbDiscoveryInput ?? "").trim();
    if (text.length < 6) {
      api.flashToast?.("Write a short observation about what is stuck, scarce, or mistrusted here.");
      return null;
    }
    const current = board();
    const mission = api.getMission?.() || {};
    const crises = Object.values(current?.crises || {});
    if (!wbCluesTouched) {
      wbSelectedClueIds = [...resolveDiscoveryContext(current, mission, crises).selectedIds];
      wbCluesTouched = true;
    }
    const id = `clue:player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const title = wordClip(text.split(/[.!?]/)[0].trim(), 64) || "Field insight";
    const clue = {
      id,
      kind: "insight",
      author: "player",
      badge: "✍️ Your Insight",
      title,
      cleanTitle: title,
      detail: text.slice(0, 240),
    };
    wbCustomClues = [clue, ...wbCustomClues].slice(0, 12);
    if (!wbSelectedClueIds.includes(id)) {
      wbSelectedClueIds = [id, ...wbSelectedClueIds];
    }
    wbDiscoveryInput = "";
    persistLocalWorkbench();
    paint();
    return clue;
  }

  function removeCustomClue(clueId) {
    const id = String(clueId || "");
    const before = wbCustomClues.length;
    wbCustomClues = wbCustomClues.filter((c) => c.id !== id);
    wbSelectedClueIds = wbSelectedClueIds.filter((x) => x !== id);
    if (wbCustomClues.length === before) return false;
    persistLocalWorkbench();
    paint();
    return true;
  }

  async function dealDiscoveryInsightsAi() {
    if (wbLensBusy) return [];
    const current = board();
    if (!isPathwayBoard(current)) return [];
    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return [];
    }
    const mission = api.getMission?.() || {};
    const place = api.getPlace?.() || mission.place || "";
    const y = year();
    const crises = Object.values(current.crises || {});
    const ctx = {
      method: "discover",
      lenses: ["discover"],
      techIds: [],
      scarcity: crises[0]?.name || "",
      stakeholder: mission.stakeholder || "",
      avoidTitles: wbCustomClues.map((c) => c.title).slice(0, 10),
      year: y,
      place,
    };
    wbLensBusy = true;
    wbBusyKind = "discover";
    api.setAiBusy?.(true);
    paint();
    try {
      let cards = [];
      if (api.coInvent) {
        try {
          const data = await api.coInvent("workbench-lens", "[Workbench discover]", ctx);
          cards = sanitizeWorkbenchDrafts(data?.ideas, ctx);
        } catch {
          cards = [];
        }
      }
      if (!cards.length) {
        cards = localWorkbenchLensDrafts(ctx);
      }
      const stamp = Date.now().toString(36);
      const created = cards.map((c, idx) => ({
        id: `clue:ai-${stamp}-${idx}`,
        kind: "insight",
        author: "ai",
        badge: c.lensLabel || "🔍 Hidden Tension",
        title: c.title,
        cleanTitle: c.title,
        detail: c.howText,
      }));
      if (!wbCluesTouched) {
        wbSelectedClueIds = [...resolveDiscoveryContext(current, mission, crises).selectedIds];
        wbCluesTouched = true;
      }
      wbCustomClues = [...created, ...wbCustomClues].slice(0, 12);
      if (created[0] && !wbSelectedClueIds.includes(created[0].id)) {
        wbSelectedClueIds = [created[0].id, ...wbSelectedClueIds];
      }
      persistLocalWorkbench();
      return created;
    } finally {
      wbLensBusy = false;
      wbBusyKind = null;
      api.setAiBusy?.(false);
      api.onCreateIdle?.();
      paint();
    }
  }

  function pickHmwCandidate(text) {
    const clean = String(text || "").trim().slice(0, 280);
    if (!clean) return false;
    const alreadyChosen = wbHmwBrief.trim().toLowerCase() === clean.toLowerCase();
    if (alreadyChosen) {
      wbHmwBrief = "";
      wbHmwLocked = false;
    } else {
      wbHmwBrief = clean;
    }
    persistLocalWorkbench();
    paint();
    return !alreadyChosen;
  }

  function removeHmwOption(id, text) {
    const cleanId = String(id || "").trim();
    const cleanText = String(text || "").trim();
    const normText = cleanText.toLowerCase();
    if (!cleanId && !normText) return false;

    wbAiHmwOptions = wbAiHmwOptions.filter((o) => {
      if (cleanId && o.id === cleanId) return false;
      if (normText && String(o.howText || "").trim().toLowerCase() === normText) return false;
      return true;
    });
    if (normText && !wbDismissedHmwKeys.includes(normText)) {
      wbDismissedHmwKeys = [normText, ...wbDismissedHmwKeys].slice(0, 24);
    } else if (!normText && cleanId && !cleanId.startsWith("hmw-ai-")) {
      const idKey = `id:${cleanId}`;
      if (!wbDismissedHmwKeys.includes(idKey)) {
        wbDismissedHmwKeys = [idKey, ...wbDismissedHmwKeys].slice(0, 24);
      }
    }
    if (normText && wbHmwBrief.trim().toLowerCase() === normText) {
      wbHmwBrief = "";
      wbHmwLocked = false;
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function restoreDismissedHmw() {
    if (!wbDismissedHmwKeys.length) return false;
    wbDismissedHmwKeys = [];
    persistLocalWorkbench();
    paint();
    return true;
  }

  async function dealHmwOptionsAi() {
    if (wbLensBusy) return [];
    const current = board();
    if (!isPathwayBoard(current)) return [];
    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return [];
    }
    const mission = api.getMission?.() || {};
    const place = api.getPlace?.() || mission.place || "";
    const y = year();
    const crises = Object.values(current.crises || {});
    const discovery = resolveDiscoveryContext(current, mission, crises);
    const ctx = {
      method: "define",
      lenses: ["define"],
      techIds: [],
      scarcity: crises[0]?.name || "",
      stakeholder: mission.stakeholder || "",
      discoveryNotes: discovery.selectedClues.map((c) => `${c.title}: ${c.detail}`),
      avoidTitles: wbAiHmwOptions.map((o) => o.howText).slice(0, 8),
      year: y,
      place,
    };
    wbLensBusy = true;
    wbBusyKind = "define";
    api.setAiBusy?.(true);
    paint();
    try {
      let cards = [];
      if (api.coInvent) {
        try {
          const data = await api.coInvent("workbench-lens", "[Workbench define]", ctx);
          cards = sanitizeWorkbenchDrafts(data?.ideas, ctx);
        } catch {
          cards = [];
        }
      }
      if (!cards.length) {
        cards = localWorkbenchLensDrafts(ctx);
      }
      const stamp = Date.now().toString(36);
      const added = cards.map((c, idx) => ({
        id: `hmw-ai-${stamp}-${idx}`,
        tag: c.title || "AI Framed Brief",
        howText: c.howText.slice(0, 240),
      }));
      const addedKeys = new Set(added.map((a) => a.howText.trim().toLowerCase()));
      wbDismissedHmwKeys = wbDismissedHmwKeys.filter((k) => !addedKeys.has(k));
      wbAiHmwOptions = [...added, ...wbAiHmwOptions].slice(0, 6);
      if (!wbHmwBrief.trim() && added[0]?.howText) {
        wbHmwBrief = added[0].howText;
      }
      persistLocalWorkbench();
      return added;
    } finally {
      wbLensBusy = false;
      wbBusyKind = null;
      api.setAiBusy?.(false);
      api.onCreateIdle?.();
      paint();
    }
  }

  function lockHmwAndIdeate(rawText) {
    const root = rootEl();
    const liveEl = root?.querySelector?.("[data-role='wb-hmw-input']");
    if (liveEl && typeof liveEl.value === "string") {
      wbHmwBrief = liveEl.value.slice(0, 280);
    }
    let brief = String(rawText ?? wbHmwBrief ?? "").trim();
    if (!brief) {
      const current = board();
      const mission = api.getMission?.() || {};
      const crises = Object.values(current?.crises || {});
      const top = resolveDiscoveryContext(current, mission, crises).hmwCandidates[0]?.howText || "";
      brief = top.trim();
    }
    if (!brief) return false;
    wbHmwBrief = brief.slice(0, 280);
    wbHmwLocked = true;
    wbDiamond = "solution";
    persistLocalWorkbench();
    paint();
    return true;
  }

  function clearHmwBrief() {
    wbHmwBrief = "";
    wbHmwLocked = false;
    persistLocalWorkbench();
    paint();
    return true;
  }

  function selectSitLens(lensId) {
    if (!SIT_LENSES.some((l) => l.id === lensId)) return false;
    wbSitLens = lensId;
    wbDiamond = "solution";
    persistLocalWorkbench();
    paint();
    return true;
  }

  function toggleScamperLetter(letter) {
    const id = String(letter || "").toUpperCase();
    if (!SCAMPER_LENSES.some((l) => l.id === id)) return false;
    if (wbScamperLetters.includes(id)) {
      if (wbScamperLetters.length > 1) {
        wbScamperLetters = wbScamperLetters.filter((l) => l !== id);
      }
    } else if (wbScamperLetters.length >= 3) {
      wbScamperLetters = [...wbScamperLetters.slice(1), id];
    } else {
      wbScamperLetters = [...wbScamperLetters, id];
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function pickTop3Scamper() {
    const current = board();
    const seed = resolveEffectiveRemixSeed(
      current,
      Object.values(current?.useCases || {}),
      Object.values(current?.pathways || {}).map((pw) => ({
        ...pw,
        title: pw.ingredients.map((i) => i.title).slice(0, 2).join(" + "),
        howText: composePathwayHow(pw),
      })),
      focusedTechId
    );
    const targetPw = current?.pathways?.[wbTargetPathwayId || focusedPathwayId];
    const hasBridgeGap = targetPw
      ? needsBridgeWarning(targetPw, enforceWorlds())
      : false;
    wbScamperLetters = recommendedScamperForSeed({
      challengerAngle: seed?.challengerAngle || null,
      seedText: seed?.howText || "",
      world: seed?.world || "",
      hasBridgeGap,
    });
    persistLocalWorkbench();
    paint();
    return [...wbScamperLetters];
  }

  function selectRemixSeedByKey(key) {
    const raw = String(key || "");
    const [kind, ...rest] = raw.split(":");
    const targetId = rest.join(":");
    const current = board();
    if (kind === "draft") {
      const d = wbDrafts.find((row) => row.id === targetId);
      if (!d) return false;
      wbRemixSeed = {
        kind: "draft",
        id: d.id,
        title: d.title,
        howText: d.howText,
        techId: d.techId || focusedTechId || null,
        world: d.world || "bits",
      };
    } else if (kind === "pathway") {
      const pw = current?.pathways?.[targetId];
      if (!pw) return false;
      wbRemixSeed = {
        kind: "pathway",
        id: pw.id,
        title: pw.ingredients.map((i) => i.title).slice(0, 2).join(" + ") || "Pathway",
        howText: composePathwayHow(pw),
        techId: pw.ingredients?.[0]?.techId || focusedTechId || null,
        world: pw.ingredients?.[0]?.world || "bits",
      };
    } else if (kind === "usecase") {
      const uc = current?.useCases?.[targetId];
      if (!uc) return false;
      wbRemixSeed = {
        kind: "usecase",
        id: uc.id,
        title: uc.title,
        howText: uc.blurb || uc.title,
        techId: uc.techId || focusedTechId || null,
        world: uc.world || "bits",
      };
    } else {
      return false;
    }
    paint();
    return true;
  }

  function remixInWorkbench(sourceKind, sourceId, targetMethod = "sit") {
    const method = targetMethod === "scamper" ? "scamper" : "sit";
    if (!selectRemixSeedByKey(`${sourceKind}:${sourceId}`)) return false;
    workbenchOpen = true;
    wbDiamond = "solution";
    wbMethod = method;
    if (method === "scamper") {
      wbScamperLetters = recommendedScamperForSeed({ seedText: wbRemixSeed?.howText || "" });
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function remixRoadblockInWorkbench(challengerId) {
    const current = board();
    const ch = current?.challengers?.[challengerId];
    if (!ch) return false;
    const pw = current?.pathways?.[ch.pathwayId];
    const angle = String(ch.angle || "stakeholder").toLowerCase();
    const guide = CHALLENGER_LENS_MAP[angle] || CHALLENGER_LENS_MAP.stakeholder;
    wbRemixSeed = {
      kind: "roadblock",
      id: ch.id,
      pathwayId: ch.pathwayId,
      title:
        pw?.ingredients?.map((i) => i.title).slice(0, 2).join(" + ") || "Blocked Pathway",
      howText: pw ? composePathwayHow(pw) : "",
      techId: pw?.ingredients?.[0]?.techId || focusedTechId || null,
      world: pw?.ingredients?.[0]?.world || "bits",
      challengerAngle: angle,
      challengerQuestion: ch.question || ch.speech || "",
    };
    wbScamperLetters = [...guide.scamper];
    wbSitLens = guide.sit;
    wbMethod = "scamper";
    wbDiamond = "solution";
    openChallengerId = null;
    workbenchOpen = true;
    persistLocalWorkbench();
    paint();
    return true;
  }

  function addPlayerWorkbenchDraft(opts = {}) {
    const root = rootEl();
    const liveTitle = root?.querySelector?.("[data-role='wb-draft-title']");
    const liveText = root?.querySelector?.("[data-role='wb-draft-text']");
    if (liveTitle && typeof liveTitle.value === "string") wbDraftTitle = liveTitle.value;
    if (liveText && typeof liveText.value === "string") wbDraftText = liveText.value;

    const text = String(opts.howText ?? wbDraftText ?? "").trim();
    if (text.length < 10) {
      api.flashToast?.("Write at least one concrete sentence describing how this idea works.");
      return null;
    }

    const current = board();
    const ids = selectedIds();
    const firstUc = current?.useCases?.[ids[0]];
    let techId = opts.techId !== undefined ? opts.techId : null;
    let secondaryTechId = opts.secondaryTechId !== undefined ? opts.secondaryTechId : null;
    let world = opts.world || null;
    let lens = wbMethod;
    let lensLabel = "✍️ Your Idea";
    let useCaseIds = [];
    let collectorCardId = null;

    if (wbMethod === "sit" && opts.techId === undefined) {
      const seed = wbRemixSeed;
      techId = seed?.techId ?? focusedTechId ?? null;
      world = seed?.world || null;
      lens = wbSitLens;
      lensLabel = `${formatLensBadge("sit", wbSitLens)} · Yours`;
    } else if (wbMethod === "scamper" && opts.techId === undefined) {
      const seed = wbRemixSeed;
      techId = seed?.techId ?? focusedTechId ?? null;
      world = seed?.world || null;
      lens = wbScamperLetters[0] || "S";
      lensLabel = `${formatLensBadge("scamper", lens)} · Yours`;
    } else if (opts.techId === undefined) {
      techId = firstUc?.techId ?? focusedTechId ?? null;
      world = firstUc?.world || null;
      useCaseIds = [...ids];
      collectorCardId = firstUc?.collectorCardId || null;
      lens = "seed";
      lensLabel = "💡 Seed · Yours";
    }

    const rawTitle = String(opts.title ?? wbDraftTitle ?? "").trim();
    const title =
      rawTitle.slice(0, 72) ||
      wordClip(text.split(/[.!?]/)[0].trim(), 52) ||
      "Local idea";

    const ideaId = `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const needArt = Boolean(api.fetchIdeaImage);
    const idea = {
      id: ideaId,
      method: opts.method || wbMethod,
      lens,
      lensLabel: opts.lensLabel || lensLabel,
      author: "player",
      title,
      howText: text.slice(0, 1200),
      techId,
      secondaryTechId: secondaryTechId && secondaryTechId !== techId ? secondaryTechId : null,
      useCaseIds,
      world: normalizeWorkbenchWorld(world, techId),
      eases: String(opts.eases ?? wbScarcityFocus ?? "").slice(0, 60),
      imagePrompt: text.slice(0, 400),
      artUrl: null,
      artId: null,
      artPending: needArt,
      collectorCardId,
      seedLabel: wbRemixSeed?.title ? `From ${wbRemixSeed.title}` : "",
    };

    wbDrafts = [idea, ...wbDrafts].slice(0, WORKBENCH_IDEA_CAP);
    wbDraftTitle = "";
    wbDraftText = "";
    wbDiamond = "solution";
    persistLocalWorkbench();
    paint();
    if (needArt) {
      void fetchArtForWorkbenchIdeas([idea]);
    }
    return idea;
  }

  async function fetchArtForWorkbenchIdeas(ideas) {
    if (!api.fetchIdeaImage || !Array.isArray(ideas) || !ideas.length) return;
    const place = api.getPlace?.() || "";
    const y = year();
    for (const row of ideas) {
      if (!row || row.artUrl) continue;
      const target = wbDrafts.find((d) => d.id === row.id);
      if (!target) continue;
      const artId =
        target.artId ||
        ideaImageId({
          techId: target.techId || "plain",
          ideaId: target.id,
          place,
          year: y,
        });
      target.artId = artId;
      target.artPending = true;
      try {
        const url = await api.fetchIdeaImage({
          techId: target.techId || "plain",
          ideaId: target.id,
          artId,
          place,
          year: y,
          imagePrompt: target.imagePrompt || target.howText?.slice(0, 400) || target.title,
          kind: target.techId ? undefined : "plain",
        });
        const live = wbDrafts.find((d) => d.id === row.id);
        if (live) {
          live.artUrl = url || null;
          live.artId = artId;
          live.artPending = false;
          persistLocalWorkbench();
          paint();
        }
      } catch {
        const live = wbDrafts.find((d) => d.id === row.id);
        if (live) {
          live.artPending = false;
          paint();
        }
      }
    }
  }

  function addHumanBridgeToPathway(pathwayId) {
    const current = board();
    if (!isPathwayBoard(current) || !current.pathways?.[pathwayId]) return false;
    const place = api.getPlace?.() || "this place";
    const mission = api.getMission?.() || {};
    const steward =
      String(mission.stakeholder || "Local operators").split(",")[0].trim() || "Local operators";
    const how = `${steward} confirms digital readings in ${place} and executes the physical valve, route, or ledger handoff in person so no software glitch acts unchecked.`;
    const y = year();
    const fused = fuseDraftIntoPathway(current, pathwayId, [
      {
        techId: null,
        title: `${steward} handoff`,
        howText: how,
        world: "plain",
        imagePrompt: how.slice(0, 400),
        artPending: Boolean(api.fetchIdeaImage),
        timingLevel: "green",
        timingPct: 88,
        timingPending: false,
      },
    ]);
    if (!fused.ok) return false;
    focusedPathwayId = pathwayId;
    wbTargetPathwayId = pathwayId;
    expandCard("wb-pathway", pathwayId);
    traceSelection = { type: "pathway", id: pathwayId };
    const ok = commit(fused.board, { bill: false });
    if (!ok) return false;
    runPostMintPipelines(pathwayId, fused.ingredientIds, fused.board, y, { skipFeasibility: true });
    const isWired = Object.values(fused.board.wires || {}).some((w) => w.pathwayId === pathwayId);
    if (isWired) {
      scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) })
        .then((scored) => commit(scored, { bill: false }))
        .catch((e) => console.warn(e));
    }
    api.flashToast?.("Added 0$ Human Bridge step to pathway.");
    return true;
  }

  function addHumanBridgeDraft() {
    const place = api.getPlace?.() || "this place";
    const mission = api.getMission?.() || {};
    const steward =
      String(mission.stakeholder || "Local operators").split(",")[0].trim() || "Local operators";
    const idea = addPlayerWorkbenchDraft({
      method: "seed",
      lensLabel: "🤝 Human Bridge · 0$",
      title: `${steward} verification & handoff`,
      howText: `${steward} confirms digital readings in ${place} and executes the physical valve, route, or ledger handoff in person so no software glitch acts unchecked.`,
      techId: null,
      secondaryTechId: null,
      world: "plain",
      eases: wbScarcityFocus || "",
    });
    return idea;
  }

  async function dealWorkbenchAiDrafts(scope = "focused") {
    if (wbLensBusy) return [];
    const current = board();
    if (!isPathwayBoard(current)) return [];
    const mission = api.getMission?.() || {};
    const place = api.getPlace?.() || mission.place || "";
    const y = year();
    const crises = Object.values(current.crises || {});
    const pathways = Object.values(current.pathways || {}).map((pw) => ({
      ...pw,
      title: pw.ingredients.map((i) => i.title).slice(0, 2).join(" + "),
      howText: composePathwayHow(pw),
    }));
    const useCases = Object.values(current.useCases || {});

    const pay = api.spendIdeaAp?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Not enough AP");
      return [];
    }

    const activeFocus = focusedTechId || Object.keys(current.techTracks || {})[0] || null;
    const selectedUcs = selectedIds()
      .map((id) => current.useCases?.[id])
      .filter(Boolean);
    const effectiveSeed = resolveEffectiveRemixSeed(current, useCases, pathways, activeFocus);

    let lenses = [];
    let techIds = [];
    if (wbMethod === "sit") {
      lenses = scope === "all" ? SIT_LENSES.map((l) => l.id) : [wbSitLens];
      techIds = [effectiveSeed?.techId || activeFocus].filter(Boolean);
    } else if (wbMethod === "scamper") {
      lenses = wbScamperLetters.length ? [...wbScamperLetters] : ["S"];
      techIds = [effectiveSeed?.techId || activeFocus].filter(Boolean);
    } else {
      lenses = ["seed"];
      const ucTechs = selectedUcs.map((u) => u.techId).filter(Boolean);
      techIds = [...new Set([...ucTechs, activeFocus].filter(Boolean))].slice(0, 2);
    }

    const ctx = {
      method: wbMethod,
      lenses,
      techIds,
      focusTechId: techIds[0] || activeFocus,
      hmwBrief: wbHmwBrief.trim() || null,
      scarcity: wbScarcityFocus || crises[0]?.name || "",
      eases: wbScarcityFocus || crises[0]?.name || "",
      seedTitle: effectiveSeed?.title || "",
      seedText: effectiveSeed?.howText || "",
      useCaseHint: selectedUcs.map((u) => u.title).join("; "),
      useCaseIds: wbMethod === "seed" ? selectedIds() : [],
      challengerAngle: effectiveSeed?.challengerAngle || null,
      challengerQuestion: effectiveSeed?.challengerQuestion || null,
      stakeholder: mission.stakeholder || "",
      avoidTitles: wbDrafts.map((d) => d.title).slice(0, 12),
      year: y,
      place,
    };

    wbLensBusy = true;
    wbBusyKind = "ideas";
    api.setAiBusy?.(true);
    paint();
    try {
      let drafts = [];
      if (api.coInvent) {
        try {
          const data = await api.coInvent(
            "workbench-lens",
            `[Workbench ${wbMethod}: ${lenses.join(", ")}]`,
            ctx
          );
          drafts = sanitizeWorkbenchDrafts(data?.ideas, ctx);
        } catch {
          drafts = [];
        }
      }
      if (!drafts.length) {
        drafts = localWorkbenchLensDrafts(ctx);
      }
      const stamp = Date.now().toString(36);
      const needArt = Boolean(api.fetchIdeaImage);
      const stamped = drafts.map((d, idx) => ({
        ...d,
        id: `${d.id}-${stamp}-${idx}`,
        artUrl: d.artUrl || null,
        artId: d.artId || null,
        artPending: needArt && !d.artUrl,
      }));
      wbDrafts = [...stamped, ...wbDrafts].slice(0, WORKBENCH_IDEA_CAP);
      wbDiamond = "solution";
      persistLocalWorkbench();
      if (needArt) {
        void fetchArtForWorkbenchIdeas(stamped);
      }
      return stamped;
    } finally {
      wbLensBusy = false;
      wbBusyKind = null;
      api.setAiBusy?.(false);
      api.onCreateIdle?.();
      paint();
    }
  }

  function toggleStageDraft(draftId) {
    const id = String(draftId || "");
    if (!wbDrafts.some((d) => d.id === id)) return false;
    if (wbStagedIds.includes(id)) {
      wbStagedIds = wbStagedIds.filter((x) => x !== id);
    } else {
      wbStagedIds = [...wbStagedIds, id];
    }
    persistLocalWorkbench();
    paint();
    return true;
  }

  function stageDraft(draftId) {
    const id = String(draftId || "");
    if (!wbDrafts.some((d) => d.id === id)) return false;
    if (!wbStagedIds.includes(id)) {
      wbStagedIds = [...wbStagedIds, id];
      persistLocalWorkbench();
      paint();
    }
    return true;
  }

  function deleteWorkbenchDraft(draftId) {
    const id = String(draftId || "");
    const before = wbDrafts.length;
    wbDrafts = wbDrafts.filter((d) => d.id !== id);
    wbStagedIds = wbStagedIds.filter((x) => x !== id);
    clearCardCollapse("wb-idea", id);
    if (wbDrafts.length === before) return false;
    persistLocalWorkbench();
    paint();
    return true;
  }

  function clearWorkbenchDrafts() {
    if (!wbDrafts.length && !wbStagedIds.length) return false;
    for (const d of wbDrafts) clearCardCollapse("wb-idea", d.id);
    wbDrafts = [];
    wbStagedIds = [];
    persistLocalWorkbench();
    paint();
    return true;
  }

  function selectTargetPathway(pathwayId) {
    const id = String(pathwayId || "");
    const current = board();
    if (!id || !current?.pathways?.[id]) return false;
    wbTargetPathwayId = id;
    focusedPathwayId = id;
    persistLocalWorkbench();
    paint();
    return true;
  }

  function preparePartialsFromIdea(idea, current, y) {
    return draftToIngredientPartials(idea).map((p) => {
      const early = (p.useCaseIds || []).some((ucId) =>
        isUseCaseEarly(current.useCases?.[ucId], y)
      );
      const alreadySettled =
        !early &&
        (p.timingLevel === "green" || p.timingLevel === "yellow" || p.timingLevel === "red");
      return {
        ...p,
        artPending: Boolean(api.fetchIdeaImage && !p.artUrl),
        timingLevel: early ? "red" : alreadySettled ? p.timingLevel : "yellow",
        timingPct: early ? 20 : alreadySettled && p.timingPct != null ? p.timingPct : 76,
        timingReason: early ? "" : alreadySettled ? p.timingReason || "" : "",
        timingPending: !early && !alreadySettled,
      };
    });
  }

  function runPostMintPipelines(pathwayId, ingredientIds, mintedBoard, y, opts = {}) {
    const pw = mintedBoard?.pathways?.[pathwayId];
    if (!pw) return;
    const place = api.getPlace?.() || "";
    const toAssess = [];
    const toPaint = [];
    for (const ingId of ingredientIds || []) {
      const ing = pw.ingredients.find((r) => r.id === ingId);
      if (!ing) continue;
      const early = (ing.useCaseIds || []).some((ucId) =>
        isUseCaseEarly(mintedBoard.useCases?.[ucId], y)
      );
      if (!early && !opts.skipFeasibility && ing.timingPending !== false) {
        toAssess.push(ing.id);
      }
      if (api.fetchIdeaImage && !ing.artUrl) {
        const ideaId = `mint-${ing.id}`;
        const artId =
          ing.artId ||
          ideaImageId({
            techId: ing.techId || "plain",
            ideaId,
            place,
            year: y,
          });
        toPaint.push({
          ingId: ing.id,
          opts: {
            techId: ing.techId || "plain",
            ideaId,
            artId,
            place,
            year: y,
            imagePrompt: ing.imagePrompt || ing.howText?.slice(0, 400) || ing.title,
            kind: ing.techId ? "mint" : "plain",
          },
        });
      }
    }
    if (toPaint.length) {
      void (async () => {
        for (const item of toPaint) {
          await fetchArtForIngredient(pathwayId, item.ingId, item.opts);
        }
      })();
    }
    if (toAssess.length) {
      void (async () => {
        for (const ingId of toAssess) {
          try {
            await assessIngredientFeasibility(pathwayId, ingId);
          } catch (e) {
            console.warn("[assess-feasibility]", e);
          }
        }
      })();
    }
  }

  /**
   * Move ONE Idea card out of `Ideas` to start a brand-new Pathway in Deliver.
   */
  function startPathwayFromIdea(ideaId) {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const id = String(ideaId || "");
    const idea = wbDrafts.find((d) => d.id === id);
    if (!idea) return false;

    const y = year();
    const partials = preparePartialsFromIdea(idea, current, y);

    const gate = gateNewTechs(current, partials);
    if (gate && gate.ok === false) {
      api.flashUnaffordableTech?.(gate.techId, gate.error);
      return false;
    }

    const minted = mintStagedDraftsToPathway(current, partials);
    if (!minted.ok) return false;

    const prevDrafts = [...wbDrafts];
    const prevStaged = [...wbStagedIds];
    wbDrafts = wbDrafts.filter((d) => d.id !== id);
    wbStagedIds = wbStagedIds.filter((x) => x !== id);
    focusedPathwayId = minted.pathwayId;
    wbTargetPathwayId = minted.pathwayId;
    traceSelection = { type: "pathway", id: minted.pathwayId };

    const ok = commit(minted.board, { bill: true });
    if (!ok) {
      wbDrafts = prevDrafts;
      wbStagedIds = prevStaged;
      paint();
      return false;
    }

    persistLocalWorkbench();
    runPostMintPipelines(minted.pathwayId, minted.ingredientIds, minted.board, y);
    const pw = minted.board.pathways?.[minted.pathwayId];
    if (pw && (pw.ingredients || []).length >= 2 && !(pw.convergences || []).length) {
      void checkAiConvergence(minted.pathwayId);
    }
    return true;
  }

  /**
   * Move ONE Idea card out of `Ideas` directly into an existing Pathway (or start a new Pathway
   * if no Pathways exist yet) — zero intermediate dummy pathways!
   */
  function addIdeaToPathway(ideaId, explicitPathwayId = null) {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const orderedIds = Object.values(current.pathways || {})
      .sort((a, b) => (a.createdOrder || 0) - (b.createdOrder || 0))
      .map((p) => p.id);
    const targetId =
      (explicitPathwayId && current.pathways?.[explicitPathwayId] ? explicitPathwayId : null) ||
      (wbTargetPathwayId && current.pathways?.[wbTargetPathwayId] ? wbTargetPathwayId : null) ||
      (focusedPathwayId && current.pathways?.[focusedPathwayId] ? focusedPathwayId : null) ||
      orderedIds.at(-1) ||
      null;
    if (!targetId) {
      return startPathwayFromIdea(ideaId);
    }
    return fuseStagedIntoPathway(targetId, ideaId);
  }

  function ideasTrayHasRoom(extraCount) {
    return wbDrafts.length + extraCount <= WORKBENCH_IDEA_CAP;
  }

  function toastIdeasTrayFull(extraCount) {
    const room = Math.max(0, WORKBENCH_IDEA_CAP - wbDrafts.length);
    if (extraCount <= 1) {
      api.flashToast?.("Ideas tray is full. Remove an idea before returning this one.");
      return;
    }
    if (room <= 0) {
      api.flashToast?.("Ideas tray is full. Remove some ideas before taking this pathway apart.");
      return;
    }
    api.flashToast?.(
      `Ideas tray only has room for ${room} more. Remove some ideas before taking this pathway apart.`
    );
  }

  function notePathwayIngredientsChanged(pathwayId) {
    if (editingPathwayId !== pathwayId) return;
    const pw = board()?.pathways?.[pathwayId];
    if (!pw) {
      editingPathwayId = null;
      editHowBuffer = "";
    } else {
      editHowBuffer = composePathwayHow(pw);
    }
    paint();
  }

  /**
   * Detach ONE ingredient from a Pathway and return it intact (with its artwork & timing)
   * back to the `Ideas` tray. If the Pathway becomes empty, removes it cleanly and refunds unused Budget.
   */
  function returnIngredientToIdeas(pathwayId, ingredientId) {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const det = detachIngredientFromPathway(current, pathwayId, ingredientId);
    if (!det.ok || !det.ingredient) return false;
    const restored = ingredientToWorkbenchIdea(det.ingredient);
    if (!restored) return false;
    if (!ideasTrayHasRoom(1)) {
      toastIdeasTrayFull(1);
      return false;
    }

    if (det.pathwayRemoved) {
      clearCardCollapse("pathway", pathwayId);
      clearCardCollapse("wb-pathway", pathwayId);
      if (focusedPathwayId === pathwayId) focusedPathwayId = null;
      if (wbTargetPathwayId === pathwayId) wbTargetPathwayId = null;
      if (editingPathwayId === pathwayId) {
        editingPathwayId = null;
        editHowBuffer = "";
      }
      if (traceSelection?.type === "pathway" && traceSelection.id === pathwayId) {
        traceSelection = null;
      }
    }

    const ok = commit(det.board, { bill: true });
    if (!ok) return false;

    const needArt = Boolean(api.fetchIdeaImage && !restored.artUrl);
    if (needArt) restored.artPending = true;
    wbDrafts = [restored, ...wbDrafts];
    if (!det.pathwayRemoved) notePathwayIngredientsChanged(pathwayId);
    persistLocalWorkbench();
    paint();
    if (needArt) {
      void fetchArtForWorkbenchIdeas([restored]);
    }
    if (!det.pathwayRemoved) {
      const stillWired = Object.values(det.board.wires || {}).some(
        (w) => w.pathwayId === pathwayId
      );
      if (stillWired) {
        scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) })
          .then((scored) => commit(scored, { bill: false }))
          .catch((e) => console.warn(e));
      }
    }
    return true;
  }

  /**
   * Disassemble an entire Pathway, returning ALL of its ingredients as reusable illustrated
   * Idea cards back to the `Ideas` tray and refunding any unused emTech Budget.
   */
  function breakPathwayIntoIdeas(pathwayId) {
    const current = board();
    const pw = current?.pathways?.[pathwayId];
    if (!isPathwayBoard(current) || !pw) return false;
    const restoredList = (pw.ingredients || [])
      .map((ing) => ingredientToWorkbenchIdea(ing))
      .filter(Boolean);
    if (!restoredList.length) return false;
    if (!ideasTrayHasRoom(restoredList.length)) {
      toastIdeasTrayFull(restoredList.length);
      return false;
    }

    const next = removePathway(current, pathwayId);
    clearCardCollapse("pathway", pathwayId);
    clearCardCollapse("wb-pathway", pathwayId);
    if (focusedPathwayId === pathwayId) focusedPathwayId = null;
    if (wbTargetPathwayId === pathwayId) wbTargetPathwayId = null;
    if (editingPathwayId === pathwayId) {
      editingPathwayId = null;
      editHowBuffer = "";
    }
    if (traceSelection?.type === "pathway" && traceSelection.id === pathwayId) {
      traceSelection = null;
    }

    const ok = commit(next, { bill: true });
    if (!ok) return false;

    const needArt = Boolean(api.fetchIdeaImage);
    const toPaint = [];
    for (const card of restoredList) {
      if (needArt && !card.artUrl) {
        card.artPending = true;
        toPaint.push(card);
      }
    }
    wbDrafts = [...restoredList, ...wbDrafts];
    workbenchOpen = true;
    wbDiamond = "solution";
    persistLocalWorkbench();
    paint();
    if (toPaint.length) {
      void fetchArtForWorkbenchIdeas(toPaint);
    }
    api.flashToast?.(
      `Returned ${restoredList.length} ${restoredList.length === 1 ? "idea" : "ideas"} to Ideas — ready to build new Pathways.`
    );
    return true;
  }

  /**
   * Move an ingredient directly out of `fromPathwayId` into `targetPathwayId` (or `"new"` to
   * start a separate Pathway) in a single atomic commit.
   */
  function moveIngredientBetweenPathways(fromPathwayId, ingredientId, targetPathwayIdOrNew) {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const srcPw = current.pathways?.[fromPathwayId];
    if (!srcPw) return false;
    if (targetPathwayIdOrNew === fromPathwayId) return false;
    if (targetPathwayIdOrNew === "new" && (srcPw.ingredients || []).length <= 1) {
      return false;
    }

    const det = detachIngredientFromPathway(current, fromPathwayId, ingredientId);
    if (!det.ok || !det.ingredient) return false;

    const ing = det.ingredient;
    const partial = {
      id: ing.id,
      techId: ing.techId,
      useCaseIds: [...(ing.useCaseIds || [])],
      title: ing.title,
      howText: ing.howText,
      world: ing.world,
      artUrl: ing.artUrl || null,
      artId: ing.artId || null,
      imagePrompt: ing.imagePrompt || "",
      artPending: Boolean(ing.artPending),
      timingLevel: ing.timingLevel || null,
      timingPct: ing.timingPct ?? null,
      timingReason: ing.timingReason || "",
      timingPending: Boolean(ing.timingPending),
      collectorCardId: ing.collectorCardId || null,
    };

    let destRes = null;
    if (targetPathwayIdOrNew === "new" || !det.board.pathways?.[targetPathwayIdOrNew]) {
      destRes = mintStagedDraftsToPathway(det.board, [partial]);
    } else {
      destRes = fuseDraftIntoPathway(det.board, targetPathwayIdOrNew, [partial]);
    }
    if (!destRes?.ok) return false;

    focusedPathwayId = destRes.pathwayId;
    wbTargetPathwayId = destRes.pathwayId;
    expandCard("wb-pathway", destRes.pathwayId);
    traceSelection = { type: "pathway", id: destRes.pathwayId };

    const ok = commit(destRes.board, { bill: false });
    if (!ok) return false;

    notePathwayIngredientsChanged(fromPathwayId);
    notePathwayIngredientsChanged(destRes.pathwayId);

    const destPw = destRes.board.pathways?.[destRes.pathwayId];
    if (destPw && (destPw.ingredients || []).length >= 2 && !(destPw.convergences || []).length) {
      void checkAiConvergence(destRes.pathwayId);
    }

    const forceSet = new Set();
    for (const w of Object.values(destRes.board.wires || {})) {
      if (w.pathwayId === fromPathwayId || w.pathwayId === destRes.pathwayId) {
        forceSet.add(w.pathwayId);
      }
    }
    if (forceSet.size) {
      scoreWired(board(), { forcePathwayIds: forceSet })
        .then((scored) => commit(scored, { bill: false }))
        .catch((e) => console.warn(e));
    }
    persistLocalWorkbench();
    return true;
  }

  function mintWorkbenchIdea(ideaId) {
    return startPathwayFromIdea(ideaId);
  }

  function mintStagedDrafts() {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const staged = wbStagedIds
      .map((id) => wbDrafts.find((d) => d.id === id))
      .filter(Boolean);
    if (!staged.length) {
      api.flashToast?.("Select at least one Idea first.");
      return false;
    }

    const y = year();
    const partials = staged.flatMap((d) => preparePartialsFromIdea(d, current, y));

    const gate = gateNewTechs(current, partials);
    if (gate && gate.ok === false) {
      api.flashUnaffordableTech?.(gate.techId, gate.error);
      return false;
    }

    const minted = mintStagedDraftsToPathway(current, partials);
    if (!minted.ok) return false;

    const consumedSet = new Set(wbStagedIds);
    const prevDrafts = [...wbDrafts];
    const prevStaged = [...wbStagedIds];
    wbDrafts = wbDrafts.filter((d) => !consumedSet.has(d.id));
    wbStagedIds = [];
    focusedPathwayId = minted.pathwayId;
    wbTargetPathwayId = minted.pathwayId;
    traceSelection = { type: "pathway", id: minted.pathwayId };

    const ok = commit(minted.board, { bill: true });
    if (!ok) {
      wbDrafts = prevDrafts;
      wbStagedIds = prevStaged;
      paint();
      return false;
    }

    persistLocalWorkbench();
    runPostMintPipelines(minted.pathwayId, minted.ingredientIds, minted.board, y);
    const pw = minted.board.pathways?.[minted.pathwayId];
    if (pw && (pw.ingredients || []).length >= 2 && !(pw.convergences || []).length) {
      void checkAiConvergence(minted.pathwayId);
    }
    return true;
  }

  function fuseStagedIntoPathway(pathwayId, explicitDraftId = null) {
    const current = board();
    if (!isPathwayBoard(current) || !current.pathways?.[pathwayId]) return false;
    const toFuseIds = explicitDraftId ? [explicitDraftId] : [...wbStagedIds];
    const drafts = toFuseIds
      .map((id) => wbDrafts.find((d) => d.id === id))
      .filter(Boolean);
    if (!drafts.length) return false;

    const y = year();
    const partials = drafts.flatMap((d) => preparePartialsFromIdea(d, current, y));

    const gate = gateNewTechs(current, partials);
    if (gate && gate.ok === false) {
      api.flashUnaffordableTech?.(gate.techId, gate.error);
      return false;
    }

    const fused = fuseDraftIntoPathway(current, pathwayId, partials);
    if (!fused.ok) return false;

    const consumedSet = new Set(toFuseIds);
    const prevDrafts = [...wbDrafts];
    const prevStaged = [...wbStagedIds];
    wbDrafts = wbDrafts.filter((d) => !consumedSet.has(d.id));
    wbStagedIds = wbStagedIds.filter((id) => !consumedSet.has(id));
    for (const cid of consumedSet) clearCardCollapse("wb-idea", cid);
    focusedPathwayId = pathwayId;
    wbTargetPathwayId = pathwayId;
    expandCard("wb-pathway", pathwayId);
    traceSelection = { type: "pathway", id: pathwayId };
    const ok = commit(fused.board, { bill: true });
    if (!ok) {
      wbDrafts = prevDrafts;
      wbStagedIds = prevStaged;
      paint();
      return false;
    }

    notePathwayIngredientsChanged(pathwayId);
    persistLocalWorkbench();
    runPostMintPipelines(pathwayId, fused.ingredientIds, fused.board, y);
    const pw = fused.board.pathways?.[pathwayId];
    if (pw && (pw.ingredients || []).length >= 2 && !(pw.convergences || []).length) {
      void checkAiConvergence(pathwayId);
    }
    const isWired = Object.values(fused.board.wires || {}).some((w) => w.pathwayId === pathwayId);
    if (isWired) {
      scoreWired(board(), { forcePathwayIds: new Set([pathwayId]) })
        .then((scored) => commit(scored, { bill: false }))
        .catch((e) => console.warn(e));
    }
    return true;
  }

  function pruneUnused() {
    const current = board();
    if (!isPathwayBoard(current)) return false;
    const activeFocus = focusedTechId || Object.keys(current.techTracks || {})[0] || null;
    const summary = unusedSummaryFor(current, activeFocus);
    if (summary.count === 0) {
      api.flashToast?.("Everything on the board is already connected.");
      return false;
    }
    const { board: pruned, removed } = pruneUnusedItems(current, { focusedTechId: activeFocus });
    if (removed.count > 0) {
      const ok = commit(pruned, { bill: removed.pathwayIds.length > 0, silent: true });
      if (!ok) return false;
    }
    wipeSparkBatches();
    dropClearedSelection(pruned, removed);
    api.flashToast?.(`Cleared ${summary.parts}.`);
    paint();
    if (removed.count > 0) api.onBoardPainted?.();
    return true;
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
          "button, a, input, textarea, select, label, summary, details, canvas, .ontology-modal-scrim, .ontology-composer, .ontology-workbench, .ontology-rules, .ontology-topbar, .ontology-trace-bar"
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
    } else if (action === "toggle-card-collapse") {
      toggleCardCollapse(btn.getAttribute("data-collapse-key"));
      return;
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
      clearCardCollapse("tech", techId);
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
      expandCard("tech", techId);
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
      clearCardCollapse("pathway", pwId);
      clearCardCollapse("wb-pathway", pwId);
      if (focusedPathwayId === pwId) focusedPathwayId = null;
      if (editingPathwayId === pwId) editingPathwayId = null;
      if (traceSelection?.type === "pathway" && traceSelection.id === pwId) {
        traceSelection = null;
      }
      commit(removePathway(board(), pwId), { bill: true });
      return;
    } else if (action === "edit-pathway-how") {
      const pwId = btn.getAttribute("data-pathway-id");
      const pw = board()?.pathways?.[pwId];
      if (pw) {
        expandCard("pathway", pwId);
        expandCard("wb-pathway", pwId);
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
      const liveBoard = board();
      const ch = liveBoard?.challengers?.[openChallengerId];
      const crisisId = ch?.crisisId || liveBoard?.wires?.[ch?.wireId]?.crisisId;
      if (crisisId) expandCard("crisis", crisisId);
      roadblockDraft = ch?.playerAnswer || "";
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
      btn.closest?.("details.ontology-tools")?.removeAttribute?.("open");
      const lobby = api.$?.("#btn-lobby") || document.querySelector("#btn-lobby");
      lobby?.click?.();
      return;
    } else if (action === "tool-rd") {
      btn.closest?.("details.ontology-tools")?.removeAttribute?.("open");
      rollRdOnPathway().catch((e) => console.warn(e));
      return;
    } else if (action === "tool-argument") {
      btn.closest?.("details.ontology-tools")?.removeAttribute?.("open");
      if (!Object.keys(board()?.pathways || {}).length) {
        api.flashToast?.("Create a Pathway in Lane 3 first.");
        return;
      }
      argumentModalOpen = true;
    } else if (action === "close-argument") {
      argumentModalOpen = false;
    } else if (action === "tool-collection") {
      btn.closest?.("details.ontology-tools")?.removeAttribute?.("open");
      showCollection().catch((e) => console.warn(e));
      return;
    } else if (action === "toggle-workbench") {
      toggleWorkbench();
      return;
    } else if (action === "wb-set-diamond") {
      setWorkbenchDiamond(btn.getAttribute("data-diamond"));
      return;
    } else if (action === "wb-toggle-clue") {
      toggleDiscoveryClue(btn.getAttribute("data-clue-id"));
      return;
    } else if (action === "wb-add-insight") {
      addPlayerDiscoveryInsight();
      return;
    } else if (action === "wb-remove-clue") {
      removeCustomClue(btn.getAttribute("data-clue-id"));
      return;
    } else if (action === "wb-deal-discover-ai") {
      dealDiscoveryInsightsAi().catch((e) => console.warn(e));
      return;
    } else if (action === "wb-pick-hmw") {
      pickHmwCandidate(btn.getAttribute("data-hmw"));
      return;
    } else if (action === "wb-remove-hmw") {
      removeHmwOption(btn.getAttribute("data-hmw-id"), btn.getAttribute("data-hmw"));
      return;
    } else if (action === "wb-restore-hmw") {
      restoreDismissedHmw();
      return;
    } else if (action === "wb-deal-hmw-ai") {
      dealHmwOptionsAi().catch((e) => console.warn(e));
      return;
    } else if (action === "wb-lock-hmw") {
      lockHmwAndIdeate();
      return;
    } else if (action === "wb-clear-hmw") {
      clearHmwBrief();
      return;
    } else if (action === "wb-set-method") {
      setWorkbenchMethod(btn.getAttribute("data-method"));
      return;
    } else if (action === "wb-pick-scarcity") {
      pickWorkbenchScarcity(btn.getAttribute("data-label"));
      return;
    } else if (action === "wb-clear-scarcity") {
      wbScarcityFocus = "";
      persistLocalWorkbench();
    } else if (action === "wb-sit-select") {
      selectSitLens(btn.getAttribute("data-lens"));
      return;
    } else if (action === "wb-scamper-toggle") {
      toggleScamperLetter(btn.getAttribute("data-letter"));
      return;
    } else if (action === "wb-scamper-top3") {
      pickTop3Scamper();
      return;
    } else if (action === "wb-add-player-draft") {
      addPlayerWorkbenchDraft();
      return;
    } else if (action === "wb-add-human-draft") {
      addHumanBridgeDraft();
      return;
    } else if (action === "wb-add-human-bridge") {
      addHumanBridgeToPathway(btn.getAttribute("data-pathway-id"));
      return;
    } else if (action === "wb-start-pathway" || action === "wb-mint-idea") {
      startPathwayFromIdea(btn.getAttribute("data-idea-id") || btn.getAttribute("data-draft-id"));
      return;
    } else if (action === "wb-add-to-pathway") {
      btn.closest?.("details")?.removeAttribute?.("open");
      addIdeaToPathway(
        btn.getAttribute("data-idea-id") || btn.getAttribute("data-draft-id"),
        btn.getAttribute("data-pathway-id") || null
      );
      return;
    } else if (action === "wb-select-pathway") {
      selectTargetPathway(btn.getAttribute("data-pathway-id"));
      return;
    } else if (action === "wb-return-ingredient") {
      returnIngredientToIdeas(
        btn.getAttribute("data-pathway-id"),
        btn.getAttribute("data-ingredient-id")
      );
      return;
    } else if (action === "wb-break-pathway") {
      btn.closest?.("details")?.removeAttribute?.("open");
      breakPathwayIntoIdeas(btn.getAttribute("data-pathway-id"));
      return;
    } else if (action === "wb-deal-ai") {
      dealWorkbenchAiDrafts(btn.getAttribute("data-scope") || "focused").catch((e) =>
        console.warn(e)
      );
      return;
    } else if (action === "wb-toggle-stage") {
      toggleStageDraft(btn.getAttribute("data-draft-id"));
      return;
    } else if (action === "wb-delete-draft") {
      deleteWorkbenchDraft(btn.getAttribute("data-draft-id"));
      return;
    } else if (action === "wb-clear-drafts") {
      clearWorkbenchDrafts();
      return;
    } else if (action === "wb-remix") {
      btn.closest?.("details")?.removeAttribute?.("open");
      remixInWorkbench(
        btn.getAttribute("data-source-kind"),
        btn.getAttribute("data-source-id"),
        btn.getAttribute("data-target-method")
      );
      return;
    } else if (action === "wb-remix-roadblock") {
      remixRoadblockInWorkbench(btn.getAttribute("data-challenger-id"));
      return;
    } else if (action === "wb-mint-staged") {
      mintStagedDrafts();
      return;
    } else if (action === "wb-fuse-staged") {
      fuseStagedIntoPathway(btn.getAttribute("data-pathway-id"));
      return;
    } else if (action === "wb-rail-toggle-tech") {
      const tid = btn.getAttribute("data-tech-id");
      if (tid) {
        focusedTechId = tid;
        wbRailExpandedTechId = wbRailExpandedTechId === tid ? null : tid;
      }
    } else if (action === "prune-unused") {
      pruneUnused();
      return;
    } else if (action === "tool-share") {
      btn.closest?.("details.ontology-tools")?.removeAttribute?.("open");
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
    } else if (role === "wb-discovery-input") {
      wbDiscoveryInput = el.value.slice(0, 240);
    } else if (role === "wb-hmw-input") {
      wbHmwBrief = el.value.slice(0, 280);
      persistLocalWorkbench();
    } else if (role === "wb-scarcity-input") {
      wbScarcityFocus = el.value.slice(0, 140);
      persistLocalWorkbench();
    } else if (role === "wb-draft-title") {
      wbDraftTitle = el.value.slice(0, 72);
    } else if (role === "wb-draft-text") {
      wbDraftText = el.value.slice(0, 1200);
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
    const root = rootEl();
    const seedSel = event.target?.closest?.("select[data-action='wb-pick-seed']");
    if (seedSel && root?.contains(seedSel)) {
      selectRemixSeedByKey(seedSel.value);
      return;
    }
    const sel = event.target?.closest?.("select[data-action='select-trend']");
    if (!sel || !root?.contains(sel)) return;
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
        if (document.querySelector("#collector-cards")?.open) return;
        traceSelection = null;
        paint();
      });
    }
    api.onSignedIn?.(() => {
      collectionCards = null;
      collectionLoad = null;
    });
    let activeDrag = null;

    function asElement(node) {
      if (!node) return null;
      return node.nodeType === 3 ? node.parentElement || null : node;
    }

    function parseDragPayload(payload) {
      const s = String(payload || "");
      if (s.startsWith("path:")) return { kind: "path", id: s.slice(5) };
      if (s.startsWith("draft:")) return { kind: "draft", id: s.slice(6) };
      if (s.startsWith("use:")) return { kind: "use", id: s.slice(4) };
      if (s.startsWith("ing:")) {
        const rest = s.slice(4);
        const sep = rest.indexOf(":");
        if (sep > 0) {
          return { kind: "ing", pathwayId: rest.slice(0, sep), id: rest.slice(sep + 1) };
        }
      }
      return null;
    }

    function clearDropHovers(exceptEl = null) {
      root.querySelectorAll?.(".is-drop-hover").forEach((el) => {
        if (el !== exceptEl) el.classList.remove("is-drop-hover");
      });
    }

    function resolveDropTarget(rawTarget, drag) {
      const targetEl = asElement(rawTarget);
      if (!targetEl?.closest) return null;
      if (drag?.kind === "path") {
        const crisisCard = targetEl.closest("[data-crisis-id]");
        if (crisisCard) return crisisCard;
        const problemLane = targetEl.closest("[data-lane='problem']");
        if (problemLane) {
          const allCrisisCards = problemLane.querySelectorAll?.("[data-crisis-id]");
          if (allCrisisCards && allCrisisCards.length === 1) return allCrisisCards[0];
          return null;
        }
        const pwCard = targetEl.closest("[data-pathway-id]");
        if (pwCard && pwCard.getAttribute("data-pathway-id") !== drag.id) {
          return pwCard;
        }
        return null;
      }
      if (drag?.kind === "draft") {
        const pwTarget = targetEl.closest("[data-drop='wb-fuse-pathway']");
        if (pwTarget) return pwTarget;
        const newPwZone = targetEl.closest("[data-drop='wb-new-pathway']");
        if (newPwZone) return newPwZone;
        return targetEl.closest("[data-drop='wb-assemble-canvas'], [data-drop='wb-stage']");
      }
      if (drag?.kind === "ing") {
        const ideasBench = targetEl.closest("[data-drop='wb-ideas-bench']");
        if (ideasBench) return ideasBench;
        const otherPw = targetEl.closest("[data-drop='wb-fuse-pathway']");
        if (otherPw && otherPw.getAttribute("data-pathway-id") !== drag.pathwayId) {
          return otherPw;
        }
        const newPwZone = targetEl.closest("[data-drop='wb-new-pathway']");
        if (newPwZone) return newPwZone;
        return null;
      }
      if (drag?.kind === "use") {
        return targetEl.closest(
          "[data-drop='wb-ideas-bench'], [data-drop='wb-assemble-canvas'], [data-drop='wb-stage'], [data-lane='pathway']"
        );
      }
      return targetEl.closest("[data-drop]");
    }

    function handleDragHover(event) {
      const zone = resolveDropTarget(event.target, activeDrag);
      clearDropHovers(zone);
      if (!zone) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      zone.classList.add("is-drop-hover");
    }

    root.addEventListener("dragstart", (event) => {
      const targetEl = asElement(event.target);
      if (targetEl?.closest?.("textarea, input, select")) return;
      const card = targetEl?.closest?.(
        "[data-wb-ing-drag], [data-wb-draft-id], [data-usecase-id], [data-pathway-id]"
      );
      if (!card) return;
      let payload = "";
      if (card.getAttribute("data-wb-ing-drag")) {
        const raw = card.getAttribute("data-wb-ing-drag") || "";
        const sep = raw.indexOf(":");
        if (sep <= 0) return;
        const pwId = raw.slice(0, sep);
        const ingId = raw.slice(sep + 1);
        activeDrag = { kind: "ing", pathwayId: pwId, id: ingId };
        payload = `ing:${pwId}:${ingId}`;
      } else if (card.getAttribute("data-wb-draft-id")) {
        const did = card.getAttribute("data-wb-draft-id");
        activeDrag = { kind: "draft", id: did };
        payload = `draft:${did}`;
      } else if (card.getAttribute("data-usecase-id")) {
        const uid = card.getAttribute("data-usecase-id");
        activeDrag = { kind: "use", id: uid };
        payload = `use:${uid}`;
      } else {
        const pid = card.getAttribute("data-pathway-id");
        activeDrag = { kind: "path", id: pid };
        payload = `path:${pid}`;
        root.classList?.add("is-dragging-pathway");
      }
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "all";
        try {
          event.dataTransfer.setData("application/x-future-forge", payload);
        } catch {}
        try {
          event.dataTransfer.setData("text/plain", payload);
        } catch {}
      }
      card.classList.add("is-dragging");
    });
    root.addEventListener("dragend", (event) => {
      activeDrag = null;
      root.classList?.remove("is-dragging-pathway");
      asElement(event.target)?.closest?.(".is-dragging")?.classList.remove("is-dragging");
      root.querySelectorAll?.(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
      clearDropHovers();
    });
    root.addEventListener("dragenter", handleDragHover);
    root.addEventListener("dragover", handleDragHover);
    root.addEventListener("dragleave", (event) => {
      const zone = resolveDropTarget(event.target, activeDrag);
      const related = asElement(event.relatedTarget);
      if (zone && !zone.contains?.(related)) {
        zone.classList.remove("is-drop-hover");
      }
    });
    root.addEventListener("drop", (event) => {
      const dragSnapshot = activeDrag;
      activeDrag = null;
      root.classList?.remove("is-dragging-pathway");
      root.querySelectorAll?.(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
      clearDropHovers();
      const targetEl = asElement(event.target);
      const customPayload = (() => {
        try {
          return event.dataTransfer?.getData("application/x-future-forge") || "";
        } catch {
          return "";
        }
      })();
      const textPayload = (() => {
        try {
          return event.dataTransfer?.getData("text/plain") || "";
        } catch {
          return "";
        }
      })();
      const effectiveDrag =
        dragSnapshot ||
        parseDragPayload(customPayload) ||
        parseDragPayload(textPayload);
      const zone = resolveDropTarget(targetEl, effectiveDrag);
      if (!zone || !effectiveDrag?.id) return;
      event.preventDefault();
      const dropKind = zone.getAttribute("data-drop");
      if (effectiveDrag.kind === "draft") {
        const draftId = effectiveDrag.id;
        if (dropKind === "wb-fuse-pathway") {
          const targetPwId =
            zone.getAttribute("data-pathway-id") ||
            targetEl?.closest?.("[data-pathway-id]")?.getAttribute("data-pathway-id");
          if (targetPwId) addIdeaToPathway(draftId, targetPwId);
        } else if (dropKind === "wb-new-pathway") {
          startPathwayFromIdea(draftId);
        } else if (dropKind === "wb-assemble-canvas") {
          addIdeaToPathway(draftId);
        } else if (dropKind === "wb-stage") {
          stageDraft(draftId);
        }
        return;
      }
      if (effectiveDrag.kind === "ing") {
        if (dropKind === "wb-ideas-bench") {
          returnIngredientToIdeas(effectiveDrag.pathwayId, effectiveDrag.id);
        } else if (dropKind === "wb-fuse-pathway") {
          const targetPwId =
            zone.getAttribute("data-pathway-id") ||
            targetEl?.closest?.("[data-pathway-id]")?.getAttribute("data-pathway-id");
          if (targetPwId && targetPwId !== effectiveDrag.pathwayId) {
            moveIngredientBetweenPathways(effectiveDrag.pathwayId, effectiveDrag.id, targetPwId);
          }
        } else if (dropKind === "wb-new-pathway") {
          moveIngredientBetweenPathways(effectiveDrag.pathwayId, effectiveDrag.id, "new");
        }
        return;
      }
      if (
        effectiveDrag.kind === "use" &&
        (dropKind === "pathway" ||
          dropKind === "wb-ideas-bench" ||
          dropKind === "wb-stage" ||
          dropKind === "wb-assemble-canvas")
      ) {
        const ucId = effectiveDrag.id;
        const uc = board()?.useCases?.[ucId];
        if (!uc) return;
        if (uc.techId) focusedTechId = uc.techId;
        if (workbenchOpen) {
          if (!selectedUseCaseIds.includes(ucId)) {
            selectedUseCaseIds = [...selectedUseCaseIds, ucId];
          }
          wbDiamond = "solution";
          wbMethod = "seed";
          paint();
        } else {
          selectedUseCaseIds = [ucId];
          writeOpen = true;
          paint();
        }
      } else if (effectiveDrag.kind === "path") {
        const sourceId = effectiveDrag.id;
        const crisisId =
          zone.getAttribute("data-crisis-id") ||
          targetEl?.closest?.("[data-crisis-id]")?.getAttribute("data-crisis-id") ||
          null;
        if (crisisId) {
          plug(sourceId, crisisId).catch((e) => console.warn(e));
        } else if (dropKind === "pathway" || dropKind === "wb-fuse-pathway") {
          const targetId =
            zone.getAttribute("data-pathway-id") ||
            targetEl?.closest?.("[data-pathway-id]")?.getAttribute("data-pathway-id");
          if (targetId && targetId !== sourceId) {
            fuse(targetId, sourceId);
          }
        }
      }
    });
  }

  function afterYearPressureRise(rise, years = 1, frontierRisk = null) {
    const current = board();
    if (!isPathwayBoard(current)) return;
    const next = structuredClone(current);
    if (!next.pressureBase || !Object.keys(next.pressureBase).length) {
      next.pressureBase = { ...(api.getPressure?.() || {}) };
    }
    next.pressureBase = applyPressureRiseYears(next.pressureBase, rise || {}, years);
    if (frontierRisk?.meter && next.pressureBase[frontierRisk.meter] != null) {
      const n = Math.round(Number(next.pressureBase[frontierRisk.meter]) || 0) + 1;
      next.pressureBase[frontierRisk.meter] = Math.max(0, Math.min(5, n));
    }
    commit(next, { bill: false });
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
    toggleCardCollapse,
    isCardCollapsed,
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
      if (!commit(current, { bill: false })) return;
      commit(await scoreWired(board()), { bill: false });
      for (const [pwId, ingId] of readyAssess) {
        await assessIngredientFeasibility(pwId, ingId);
      }
    },
    afterRulesChange: () => {
      const current = board();
      if (!isPathwayBoard(current)) return;
      const next = setPinnedRules(current, api.getRules?.() || []);
      if (!commit(next, { bill: false })) return;
      scoreWired(board())
        .then((scored) => commit(scored, { bill: false }))
        .catch((e) => console.warn(e));
    },
    afterYearPressureRise,
    afterWaitPressureRise: (rise, frontierRisk = null) =>
      afterYearPressureRise(rise, 2, frontierRisk),
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
    showCollection,
    adoptCollector,
    pruneUnused,
    submitArgument,
    openWorkbench,
    closeWorkbench,
    toggleWorkbench,
    setWorkbenchDiamond,
    toggleDiscoveryClue,
    addPlayerDiscoveryInsight,
    removeCustomClue,
    dealDiscoveryInsightsAi,
    pickHmwCandidate,
    removeHmwOption,
    restoreDismissedHmw,
    dealHmwOptionsAi,
    lockHmwAndIdeate,
    clearHmwBrief,
    setWorkbenchMethod,
    pickWorkbenchScarcity,
    selectSitLens,
    toggleScamperLetter,
    pickTop3Scamper,
    remixInWorkbench,
    remixRoadblockInWorkbench,
    addPlayerWorkbenchDraft,
    addPlayerWorkbenchIdea: addPlayerWorkbenchDraft,
    addHumanBridgeDraft,
    addHumanBridgeToPathway,
    dealWorkbenchAiDrafts,
    dealWorkbenchAiIdeas: dealWorkbenchAiDrafts,
    startPathwayFromIdea,
    addIdeaToPathway,
    returnIngredientToIdeas,
    breakPathwayIntoIdeas,
    moveIngredientBetweenPathways,
    selectTargetPathway,
    mintWorkbenchIdea,
    toggleStageDraft,
    deleteWorkbenchDraft,
    deleteWorkbenchIdea: deleteWorkbenchDraft,
    clearWorkbenchDrafts,
    clearWorkbenchIdeas: clearWorkbenchDrafts,
    mintStagedDrafts,
    fuseStagedIntoPathway,
    getWorkbenchState: () => ({
      open: workbenchOpen,
      diamond: wbDiamond,
      busy: wbLensBusy,
      busyKind: wbBusyKind,
      hmwBrief: wbHmwBrief,
      hmwLocked: wbHmwLocked,
      method: wbMethod,
      scarcityFocus: wbScarcityFocus,
      sitLens: wbSitLens,
      scamperLetters: [...wbScamperLetters],
      targetPathwayId: wbTargetPathwayId,
      ideas: wbDrafts.map((d) => ({ ...d })),
      drafts: wbDrafts.map((d) => ({ ...d })),
      stagedIds: [...wbStagedIds],
      remixSeed: wbRemixSeed ? { ...wbRemixSeed } : null,
    }),
  };
}
