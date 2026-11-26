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
export function selectPlayableMilestones(milestones, questYear = 2026, dealtIds = new Set()) {
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
    const key = `${m.year}|${m.label.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, copyMilestone(m, m.origin || "catalog"));
  }
  for (const m of collectorMilestonesForTech(ctx.collectorCards, id, { world })) {
    const key = `${m.year}|${m.label.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, m);
  }

  const milestones = [...byKey.values()].sort(
    (a, b) => a.year - b.year || String(mOriginOrder(a)).localeCompare(String(mOriginOrder(b)))
  );

  const rate = trendRows.map(trendRateSummary).find(Boolean);
  if (rate) trendSummary = rate;

  return {
    techId: id,
    name,
    icon: base?.icon || tech?.icon || "",
    domain: base?.domain || tech?.domain || "",
    productCategory,
    world,
    capability,
    trendSummary,
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
