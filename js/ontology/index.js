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
 * Resolve one Tech Track for a Quest + run world.
 * Priority: quest.ontology, else spotlight grounding, then catalog + bank + trends, then collector cards.
 * Milestone status is copied from its source and never rewritten when years advance.
 */

import { TECHS } from "../data.js";
import {
  allCatalogTechIds,
  catalogTrack,
  mergeExternalMilestones,
  trendRateSummary,
} from "./catalog-ontology.js";
import { collectorMilestonesForTech } from "./collector-ontology.js";
import { parseGrounding, parseGroundingTechId } from "./grounding-parser.js";

/**
 * Curated subset of playable capability milestones for Lane 1 cards & interactive curve dots.
 * Keeps raw empirical trend survey rows (origin: "trend") and pure past history anchors on the
 * log-scale chart only, while surfacing:
 *   - the Quest's authored milestone (replacing the generic catalog 2026 row when present),
 *   - otherwise the latest reached catalog milestone,
 *   - 1-2 forecast/prediction milestones ahead (catalog + up to 1 distinct prediction-bank row),
 *   - all Collector Card milestones and any already-dealt milestones.
 *
 * @param {object[]} milestones
 * @param {number} [questYear]
 * @param {Set<string>} [dealtIds]
 * @returns {object[]}
 */
export function selectPlayableMilestones(
  milestones,
  questYear = 2026,
  dealtIds = new Set(),
  opts = {}
) {
  const list = Array.isArray(milestones) ? milestones : [];
  if (!list.length) return [];

  const chosen = [];
  const seenIds = new Set();
  const add = (m) => {
    if (!m || seenIds.has(m.id)) return;
    seenIds.add(m.id);
    chosen.push(m);
  };

  // Always preserve any already-dealt or collector milestones
  for (const m of list) {
    if (m.origin === "collector" || dealtIds.has(m.id)) add(m);
  }

  const activeCapabilityId = opts?.activeCapabilityId
    ? String(opts.activeCapabilityId)
    : null;
  const capTrendRows = activeCapabilityId
    ? list.filter(
        (m) => m.origin === "trend" && m.capabilityId === activeCapabilityId
      )
    : [];

  if (capTrendRows.length) {
    const nonTrend = list.filter((m) => m.origin !== "trend");
    for (const qm of nonTrend
      .filter((m) => m.origin === "quest" && m.status === "reached")
      .slice(0, 1)) {
      add(qm);
    }

    const capReachedAll = capTrendRows.filter((m) => m.status === "reached");
    const capReachedUse = capReachedAll.filter((m) => m.hasAuthoredUseCases);
    const capReached = capReachedUse.length ? capReachedUse : capReachedAll;
    if (capReached.length > 2) {
      add(capReached[0]);
      add(capReached.at(-1));
    } else if (capReached.length) {
      for (const m of capReached) add(m);
    } else {
      const catReached = nonTrend.filter(
        (m) => m.status === "reached" && !m.isHistoryAnchor
      );
      if (catReached.length) add(catReached.at(-1));
    }

    for (const qm of nonTrend
      .filter((m) => m.origin === "quest" && m.status === "predicted")
      .slice(0, 1)) {
      add(qm);
    }

    const capPredAll = capTrendRows.filter((m) => m.status === "predicted");
    const capPredUse = capPredAll.filter((m) => m.hasAuthoredUseCases);
    const capPred = capPredUse.length ? capPredUse : capPredAll;
    if (capPred.length) {
      for (const m of capPred.slice(0, 2)) add(m);
    } else {
      const catPred = nonTrend.filter(
        (m) => m.origin === "catalog" && m.status === "predicted"
      );
      if (catPred.length) add(catPred[0]);
      const existingPredYears = new Set(
        chosen
          .filter((m) => m.status === "predicted")
          .map((m) => Number(m.year))
      );
      const bankPred = nonTrend.filter(
        (m) =>
          m.origin === "bank" &&
          m.status === "predicted" &&
          !existingPredYears.has(Number(m.year))
      );
      if (
        bankPred.length &&
        chosen.filter((m) => m.status === "predicted").length < 2
      ) {
        add(bankPred[0]);
      }
    }

    if (!chosen.length) add(capTrendRows.at(-1) || list.at(-1));
    return chosen.sort(
      (a, b) =>
        Number(a.year) - Number(b.year) || String(a.id).localeCompare(String(b.id))
    );
  }

  // Reached capability milestones (excluding raw trend survey dots and history anchors)
  const nonTrend = list.filter((m) => m.origin !== "trend");
  const questReached = nonTrend.filter((m) => m.origin === "quest" && m.status === "reached");
  if (questReached.length) {
    for (const m of questReached.slice(0, 1)) add(m);
  } else {
    const catReached = nonTrend.filter((m) => m.status === "reached" && !m.isHistoryAnchor);
    if (catReached.length) add(catReached.at(-1));
    else {
      const anyReached = nonTrend.filter((m) => m.status === "reached");
      if (anyReached.length) add(anyReached.at(-1));
    }
  }

  // Forecast / prediction milestones (quest + catalog + up to 1 distinct-year bank prediction)
  const questPred = nonTrend.filter((m) => m.origin === "quest" && m.status === "predicted");
  for (const m of questPred.slice(0, 1)) add(m);

  const catPred = nonTrend.filter((m) => m.origin === "catalog" && m.status === "predicted");
  if (catPred.length) add(catPred[0]);

  const existingPredYears = new Set(
    chosen.filter((m) => m.status === "predicted").map((m) => Number(m.year))
  );
  const bankPred = nonTrend.filter(
    (m) => m.origin === "bank" && m.status === "predicted" && !existingPredYears.has(Number(m.year))
  );
  if (bankPred.length && chosen.filter((m) => m.status === "predicted").length < 2) {
    add(bankPred[0]);
  }

  // Fallback if everything was filtered
  if (!chosen.length) add(list.at(-1));

  return chosen.sort((a, b) => Number(a.year) - Number(b.year) || String(a.id).localeCompare(String(b.id)));
}

export { trendRateSummary, allCatalogTechIds, parseGrounding };

function copyMilestone(m, origin) {
  return {
    ...m,
    origin: m.origin || origin,
    status: m.status === "reached" ? "reached" : "predicted",
    useCases: (m.useCases || []).map((u) => ({ ...u, origin: u.origin || origin })),
  };
}

function questOntologyEntry(quest, techId) {
  const rows = Array.isArray(quest?.ontology) ? quest.ontology : [];
  return rows.find((row) => row && String(row.techId || "") === techId) || null;
}

function structuredMilestones(entry, world) {
  return (entry.milestones || []).map((m, i) => {
    const year = Number(m.year);
    const status = m.status === "predicted" ? "predicted" : "reached";
    const uses = (m.useCases || entry.useCases || []).map((u, j) => ({
      id: u.id || `uc-${entry.techId}-quest-${i + 1}-${j + 1}`,
      title: String(u.title || u).slice(0, 80),
      blurb: String(u.blurb || u.title || u).slice(0, 280),
      world: u.world || world,
      origin: "quest",
    }));
    return {
      id: m.id || `ms-${entry.techId}-ontology-${i + 1}`,
      year: Number.isFinite(year) ? year : 2026,
      label: String(m.label || "Milestone").slice(0, 180),
      detail: m.detail ? String(m.detail).slice(0, 280) : undefined,
      status,
      attribution: m.attribution ? String(m.attribution).slice(0, 160) : undefined,
      origin: "quest",
      useCases: uses,
    };
  });
}

/**
 * @param {string} techId
 * @param {{
 *   quest?: object|null,
 *   techs?: object[],
 *   predictions?: object[],
 *   trends?: object[],
 *   collectorCards?: object[],
 * }} [ctx]
 */
export function resolveTechTrack(techId, ctx = {}) {
  const id = String(techId || "");
  const techs = ctx.techs || TECHS;
  const tech = techs.find((t) => t.id === id);
  const base = catalogTrack(id, { techs });
  if (!base && !questOntologyEntry(ctx.quest, id)) return null;

  const world = base?.world || "bits";
  const entry = questOntologyEntry(ctx.quest, id);
  /** @type {object[]} */
  let questMilestones = [];
  let capability = base?.capability || "";
  let trendSummary = base?.trendSummary || "";
  let productCategory = "";
  let applicationHints = [];
  let limits = "";
  const name = base?.name || tech?.name || id;

  if (entry) {
    capability = String(entry.capability || capability);
    trendSummary = String(entry.trendSummary || trendSummary);
    questMilestones = structuredMilestones(entry, entry.world || world);
  } else {
    const spotlightId = String(ctx.quest?.spotlight?.techId || "");
    const grounding = String(ctx.quest?.grounding || "");
    const groundingId = parseGroundingTechId(grounding);
    if (grounding && (spotlightId === id || groundingId === id)) {
      const parsed = parseGrounding(grounding, {
        techId: id,
        world,
        questYear: Number(ctx.quest?.startYear) || undefined,
      });
      if (parsed.productCategory) productCategory = parsed.productCategory;
      if (parsed.capability) capability = parsed.capability;
      if (parsed.trendSummary) trendSummary = parsed.trendSummary.slice(0, 220);
      if (parsed.applicationHints?.length) applicationHints = parsed.applicationHints;
      if (parsed.limits) limits = parsed.limits;
      questMilestones = parsed.milestones;
    }
  }

  const trendRows = (ctx.trends || []).filter((t) => t && t.techId === id);
  const merged = mergeExternalMilestones(
    {
      techId: id,
      name,
      world,
      capability,
      trendSummary,
      trends: trendRows,
      milestones: base?.milestones || [],
    },
    ctx.predictions || [],
    trendRows
  );

  const byKey = new Map();
  for (const m of questMilestones) byKey.set(`${m.year}|${m.label.toLowerCase()}`, copyMilestone(m, "quest"));
  for (const m of merged?.milestones || []) {
    const key = `${m.year}|${m.capabilityId || ""}|${m.label.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, copyMilestone(m, m.origin || "catalog"));
  }
  for (const m of collectorMilestonesForTech(ctx.collectorCards, id, { world })) {
    const key = `${m.year}|${m.label.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, m);
  }

  const milestones = [...byKey.values()].sort(
    (a, b) => a.year - b.year || String(mOriginOrder(a)).localeCompare(String(mOriginOrder(b)))
  );

  const hasQuestOverride = Boolean(entry || questMilestones.length > 0);
  const activeTrend =
    (ctx.activeCapabilityId &&
      trendRows.find((t) => t.id === ctx.activeCapabilityId)) ||
    trendRows[0] ||
    null;
  if (!hasQuestOverride && activeTrend) {
    if (activeTrend.capability) capability = activeTrend.capability;
    const rate = activeTrend.trendSummary || trendRateSummary(activeTrend);
    if (rate) trendSummary = rate;
  } else {
    const rate = trendRows.map((t) => t.trendSummary || trendRateSummary(t)).find(Boolean);
    if (rate) trendSummary = rate;
  }

  return {
    techId: id,
    name,
    icon: base?.icon || tech?.icon || "",
    domain: base?.domain || tech?.domain || "",
    productCategory,
    world,
    capability,
    trendSummary,
    hasQuestOverride,
    applicationHints,
    limits,
    trends: trendRows,
    milestones,
  };
}

function mOriginOrder(m) {
  if (m?.origin === "quest") return "0";
  if (m?.origin === "collector") return "1";
  if (m?.isHistoryAnchor) return "2";
  return `3-${m?.label || ""}`;
}

/**
 * @param {object} milestone
 * @returns {"reached"|"predicted"}
 */
export function authoredStatus(milestone) {
  return milestone?.status === "reached" ? "reached" : "predicted";
}

/**
 * A forecast dot at or before the quest year sits ABOVE the sliding NOW bar
 * (playable in this year of the run) while keeping its Forecast status badge.
 * @param {object} milestone
 * @param {number} questYear
 */
export function milestonePlayable(milestone, questYear) {
  return Number(milestone?.year) <= Number(questYear);
}

export function isForecastEarly(milestone, questYear) {
  return Number(milestone?.year) > Number(questYear);
}

const BACKCAST_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "over", "under",
  "your", "their", "local", "place", "town", "year", "using", "uses", "used",
  "more", "than", "make", "makes", "made", "help", "helps", "without", "when",
  "where", "what", "will", "have", "need", "needs", "work", "works", "each",
]);

function backcastTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 3 && !BACKCAST_STOPWORDS.has(w));
}

function tokenOverlapScore(needleTokens, haystackText) {
  if (!needleTokens.length) return 0;
  const hay = new Set(backcastTokens(haystackText));
  let score = 0;
  for (const tok of new Set(needleTokens)) {
    if (hay.has(tok)) score += tok.length >= 6 ? 2 : 1;
  }
  return score;
}

function milestoneSearchText(milestone) {
  return [
    milestone.label,
    milestone.detail,
    ...(milestone.useCases || []).map((u) => `${u.title || ""} ${u.blurb || ""}`),
  ].join(" ");
}

function rankBackcastTracks(opts, queryTokens) {
  return TECHS.map((tech) => {
    const track = resolveTechTrack(tech.id, opts);
    const text = [
      tech.id, tech.name, tech.summary, track?.capability,
      ...(track?.milestones || []).map(milestoneSearchText),
    ].join(" ");
    const overlap = tokenOverlapScore(queryTokens, text);
    const score = overlap && overlap + (tech.polarity === opts.world ? 0.5 : 0);
    return { track, score };
  })
    .filter(({ track, score }) => track && score > 0)
    .sort((a, b) => b.score - a.score || a.track.techId.localeCompare(b.track.techId));
}

function backcastMilestones(track, year) {
  const milestones = track.milestones || [];
  const playable = selectPlayableMilestones(milestones, year);
  return [...playable, ...milestones.filter((m) => m.origin === "trend" && !playable.includes(m))];
}

/**
 * Compact grounded ontology digest sent with `assess-feasibility` when linking
 * a Pathway idea back to its Use Case, Capability Milestone, and emTech.
 *
 * @param {{
 *   techId?: string|null,
 *   milestoneId?: string|null,
 *   howText?: string,
 *   title?: string,
 *   quest?: object|null,
 *   predictions?: object[],
 *   trends?: object[],
 *   collectorCards?: object[],
 *   year?: number,
 * }} [opts]
 */
export function buildBackcastCandidates(opts = {}) {
  const y = Number(opts.year) || 2026;
  const explicitId = opts.techId && TECHS.some((t) => t.id === opts.techId)
    ? String(opts.techId)
    : null;
  const queryTokens = backcastTokens(`${opts.title || ""} ${opts.howText || ""}`);

  const rankedTracks = explicitId
    ? [resolveTechTrack(explicitId, opts)].filter(Boolean)
    : rankBackcastTracks(opts, queryTokens).slice(0, 6).map(({ track }) => track);
  const tracks = rankedTracks.map((track) => {
    const linked = track.milestones.find((m) => m.id === opts.milestoneId);
    const playable = backcastMilestones(track, y).filter((m) => m !== linked)
      .map((milestone) => ({
        milestone,
        score: tokenOverlapScore(queryTokens, milestoneSearchText(milestone)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, linked ? 4 : 5)
      .map(({ milestone }) => milestone);
    if (linked) playable.unshift(linked);
    return {
      techId: track.techId,
      name: track.name,
      world: track.world,
      milestones: playable.map((m) => ({
        id: m.id,
        year: m.year,
        status: m.status,
        label: String(m.label || "").slice(0, 120),
        useCases: (m.useCases || []).slice(0, 4).map((u) => ({
          id: u.id,
          title: String(u.title || "").slice(0, 80),
        })),
      })),
    };
  });

  return {
    catalogTechIds: explicitId ? [explicitId] : TECHS.map((t) => t.id),
    tracks,
  };
}

/**
 * Deterministically resolve a Pathway ingredient (plus optional AI backcast
 * hints) onto a grounded `emTech` track, real Quest/Trend/Bank/Catalog
 * Milestone, and Use Case—or mark `beyondForecasts: true` with zero fabricated
 * milestone dates when the claim exceeds every known milestone or honest limit.
 *
 * @param {{
 *   howText?: string,
 *   title?: string,
 *   techId?: string|null,
 *   world?: string|null,
 *   year?: number,
 *   timingLevel?: string|null,
 *   timingReason?: string,
 *   quest?: object|null,
 *   predictions?: object[],
 *   trends?: object[],
 *   collectorCards?: object[],
 *   aiBackcast?: object|null,
 * }} opts
 */
export function matchIdeaToOntology(opts = {}) {
  const y = Number(opts.year) || 2026;
  const ai = opts.aiBackcast && typeof opts.aiBackcast === "object" ? opts.aiBackcast : null;
  const queryText = `${opts.title || ""} ${opts.howText || ""}`.trim();
  const queryTokens = backcastTokens(queryText);

  const validTech = (id) => (id && TECHS.some((t) => t.id === id) ? String(id) : null);

  const explicitId = validTech(opts.techId) || validTech(ai?.techId);
  const track = explicitId
    ? resolveTechTrack(explicitId, opts)
    : rankBackcastTracks(opts, queryTokens)[0]?.track;
  if (!track) {
    return {
      techId: null,
      milestone: null,
      useCase: null,
      beyondForecasts: false,
      gapReason: "",
    };
  }

  const chosenTechId = track.techId;
  const allMilestones = Array.isArray(track.milestones) ? track.milestones : [];
  const playable = backcastMilestones(track, y);
  const pool = playable.length ? playable : allMilestones;
  const inPlayPool = pool.filter((m) => Number(m.year) <= y);
  const futurePool = pool.filter((m) => Number(m.year) > y);

  const level = String(opts.timingLevel || "").toLowerCase();
  const reasonText = String(ai?.gapReason || opts.timingReason || "").trim();

  if (ai?.beyondForecasts === true) {
    return {
      techId: chosenTechId,
      milestone: null,
      useCase: null,
      beyondForecasts: true,
      gapReason:
        reasonText ||
        `Requires ${track.name} capabilities beyond known forecasts or honest limits.`,
    };
  }

  const pickBestMs = (list) => {
    if (!list.length) return null;
    let best = list[0];
    let bestScore = -1;
    for (const m of list) {
      const score = tokenOverlapScore(queryTokens, milestoneSearchText(m));
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  };

  let milestone = null;
  if (ai?.milestoneId) {
    milestone =
      allMilestones.find((m) => m.id === String(ai.milestoneId)) ||
      null;
  }

  if (!milestone) {
    if (level === "red") {
      const futureMatch = pickBestMs(futurePool);
      const sciFiRe = /\b(impossible|forbid|violat|sci-?fi|mind upload|teleport|antigrav|perpetual|beyond|honest limit)\b/i;
      if (futureMatch && !sciFiRe.test(reasonText)) {
        milestone = futureMatch;
      } else {
        return {
          techId: chosenTechId,
          milestone: null,
          useCase: null,
          beyondForecasts: true,
          gapReason:
            reasonText ||
            `Stretches beyond known ${track.name} forecasts or honest limits in ${y}.`,
        };
      }
    } else if (level === "yellow") {
      const bestInPlay = pickBestMs(inPlayPool);
      const bestFuture = pickBestMs(futurePool);
      const inScore = bestInPlay
        ? tokenOverlapScore(
            queryTokens,
            `${bestInPlay.label} ${(bestInPlay.useCases || []).map((u) => u.title).join(" ")}`
          )
        : -1;
      const futScore = bestFuture
        ? tokenOverlapScore(
            queryTokens,
            `${bestFuture.label} ${(bestFuture.useCases || []).map((u) => u.title).join(" ")}`
          )
        : -1;
      milestone =
        bestFuture && futScore > inScore + 1
          ? bestFuture
          : bestInPlay || bestFuture || pool.at(-1) || null;
    } else {
      milestone = pickBestMs(inPlayPool) || pool[0] || null;
    }
  }

  if (!milestone) {
    return {
      techId: chosenTechId,
      milestone: null,
      useCase: null,
      beyondForecasts: true,
      gapReason:
        reasonText ||
        `No grounded ${track.name} milestone matches this capability level yet.`,
    };
  }

  const msUcs = Array.isArray(milestone.useCases) ? milestone.useCases : [];
  let useCase = null;
  if (ai?.useCaseId) {
    useCase = msUcs.find((u) => u.id === String(ai.useCaseId)) || null;
  }
  if (!useCase && ai?.customUseCaseTitle && String(ai.customUseCaseTitle).trim().length >= 4) {
    const customTitle = String(ai.customUseCaseTitle).trim().slice(0, 80);
    useCase = {
      id: `uc-bc-${chosenTechId}-${milestone.id}-${customTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}`,
      techId: chosenTechId,
      milestoneId: milestone.id,
      milestoneLabel: milestone.label,
      milestoneYear: milestone.year,
      milestoneStatus: milestone.status,
      title: customTitle,
      blurb: String(opts.howText || customTitle).slice(0, 280),
      world: track.world,
      origin: "backcast",
    };
  }
  if (!useCase && msUcs.length) {
    let bestUc = msUcs[0];
    let bestUcScore = -1;
    for (const u of msUcs) {
      const s = tokenOverlapScore(queryTokens, `${u.title || ""} ${u.blurb || ""}`);
      if (s > bestUcScore) {
        bestUcScore = s;
        bestUc = u;
      }
    }
    useCase = {
      ...bestUc,
      techId: chosenTechId,
      milestoneId: milestone.id,
      milestoneLabel: milestone.label,
      milestoneYear: milestone.year,
      milestoneStatus: milestone.status,
      world: bestUc.world || track.world,
    };
  }
  if (!useCase) {
    const fallbackTitle = String(opts.title || milestone.label || `${track.name} capability`).slice(0, 80);
    useCase = {
      id: `uc-bc-${chosenTechId}-${milestone.id}`,
      techId: chosenTechId,
      milestoneId: milestone.id,
      milestoneLabel: milestone.label,
      milestoneYear: milestone.year,
      milestoneStatus: milestone.status,
      title: fallbackTitle,
      blurb: String(opts.howText || milestone.label || "").slice(0, 280),
      world: track.world,
      origin: "backcast",
    };
  }

  return {
    techId: chosenTechId,
    milestone,
    useCase,
    beyondForecasts: false,
    gapReason: "",
  };
}
