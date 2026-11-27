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
 * Quiet Guardrails — Moves, Budget capacity, and Goodwill capacity helpers (DOM-free).
 * Budget and Goodwill are 100% reversible allocated capacities, not non-refundable wallets.
 * Never use state.trust as a player resource — crisis meters may still be named "Trust".
 */

/** Sparse overrides after playtest */
export const TECH_COST_OVERRIDES = {
  // Super Intelligence needs public/official backing to adopt, not just cash.
  ai: { budget: 1, will: 1 },
};

/**
 * AI modes that count as a real-world commitment (1 Move).
 * Thinking, chat, tutor, idea sparks, coaching, drafting, timing checks, and vision are always free (0 Moves).
 */
export const AI_COMMITMENT_MODES = new Set([
  "judge-challenge",
  "judge-scrutiny-move",
  "fact-check-argument",
]);

/**
 * Moves (AP) required for an AI request mode.
 * @param {string} [mode]
 * @returns {0|1}
 */
export function aiMoveCost(mode) {
  return AI_COMMITMENT_MODES.has(String(mode || "chat")) ? 1 : 0;
}

/**
 * Base emTech capacity requirement (Budget + Goodwill).
 * @param {object|null|undefined} t — tech from TECHS
 * @returns {{ budget: number, will: number }}
 */
export function baseTechCost(t) {
  if (!t) return { budget: 1, will: 0 };
  const overrides = TECH_COST_OVERRIDES[t.id];
  if (overrides) return { ...overrides };

  let budget = 1; // mature and steep default
  let will = 0;

  if (t.curve === "early") {
    budget = 2;
    will = 1;
  }
  const ready = t.readyYear || 2026;
  if (ready >= 2030) {
    budget = Math.max(budget, 3);
    will = Math.max(will, 1);
  } else if (ready >= 2028) {
    budget = Math.max(budget, 2);
  }
  return { budget, will };
}

/**
 * Capacity requirement for an emTech (no market-news price swings).
 * @param {object|null|undefined} t — tech from TECHS
 * @returns {{ budget: number, will: number }}
 */
export function techCost(t) {
  return baseTechCost(t);
}

/**
 * True only for heavier early/frontier techs (Budget > 1 or Goodwill > 0).
 * Mature 1-Budget techs stay uncluttered in the Tech Picker.
 * @param {{ budget?: number, will?: number }|null|undefined} cost
 * @returns {boolean}
 */
export function isHeavyTechCost(cost) {
  return (Number(cost?.budget) || 0) > 1 || (Number(cost?.will) || 0) > 0;
}

/**
 * Quiet badge text for heavy/frontier techs only (empty string for mature techs).
 * @param {{ budget?: number, will?: number }|null|undefined} cost
 * @returns {string}
 */
export function formatHeavyTechCost(cost) {
  if (!isHeavyTechCost(cost)) return "";
  const bits = [];
  if ((Number(cost?.budget) || 0) > 0) bits.push(`${Number(cost.budget)} Budget`);
  if ((Number(cost?.will) || 0) > 0) bits.push(`${Number(cost.will)} Goodwill`);
  return bits.join(" · ");
}

/**
 * Compute currently allocated Budget & Goodwill across unique paid emTechs + active R&D boosts.
 * Removing a Pathway/tech/R&D frees 100% of its allocation immediately.
 *
 * @param {{ techIds?: string[], techById?: (id: string) => object|null, rdCount?: number }} [opts]
 * @returns {{ budget: number, will: number }}
 */
export function allocatedCapacity(opts = {}) {
  const techIds = Array.isArray(opts.techIds) ? opts.techIds : [];
  const lookup = typeof opts.techById === "function" ? opts.techById : () => null;
  const rdCount = Math.max(0, Math.floor(Number(opts.rdCount) || 0));
  const seen = new Set();
  let budget = rdCount;
  let will = 0;
  for (const id of techIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const c = baseTechCost(lookup(id));
    budget += c.budget;
    will += c.will;
  }
  return { budget, will };
}

/**
 * Remaining available Budget & Goodwill given town capacity and current allocation.
 *
 * @param {{ budget?: number, will?: number }} cap
 * @param {{ budget?: number, will?: number }} used
 * @returns {{ budget: number, will: number }}
 */
export function availableCapacity(cap = {}, used = {}) {
  const capB = Math.max(0, Math.floor(Number(cap?.budget) || 0));
  const capW = Math.max(0, Math.floor(Number(cap?.will) || 0));
  const usedB = Math.max(0, Math.floor(Number(used?.budget) || 0));
  const usedW = Math.max(0, Math.floor(Number(used?.will) || 0));
  return {
    budget: Math.max(0, capB - usedB),
    will: Math.max(0, capW - usedW),
  };
}

/**
 * Selected emTechs that actually allocate capacity. Collector ids in `freeIds` stay free.
 * @param {string[]} selectedIds
 * @param {string[]} freeIds
 * @returns {string[]}
 */
export function paidSelectedTechIds(selectedIds, freeIds) {
  const free = new Set(Array.isArray(freeIds) ? freeIds : []);
  const out = [];
  const seen = new Set();
  for (const id of Array.isArray(selectedIds) ? selectedIds : []) {
    if (!id || free.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Budget and Goodwill caps for a Continue save that predates explicit caps.
 * Cap is at least the town start, and at least remaining wallet plus what is still allocated.
 * @param {{
 *   budget?: number,
 *   will?: number,
 *   baseBudgetCap?: number,
 *   baseWillCap?: number,
 *   selectedTechIds?: string[],
 *   freeTechIds?: string[],
 *   rdCount?: number,
 *   techById?: (id: string) => object|null,
 *   maxBudget?: number,
 *   maxWill?: number,
 * }} [opts]
 * @returns {{ used: { budget: number, will: number }, budgetCap: number, willCap: number }}
 */
export function legacyWalletCaps(opts = {}) {
  const used = allocatedCapacity({
    techIds: paidSelectedTechIds(opts.selectedTechIds, opts.freeTechIds),
    techById: opts.techById,
    rdCount: opts.rdCount,
  });
  const maxBudget = opts.maxBudget ?? 10;
  const maxWill = opts.maxWill ?? 5;
  const baseBudget = Number(opts.baseBudgetCap) || 0;
  const baseWill = Number(opts.baseWillCap) || 0;
  return {
    used,
    budgetCap: Math.min(maxBudget, Math.max(baseBudget, (Number(opts.budget) || 0) + used.budget)),
    willCap: Math.min(maxWill, Math.max(baseWill, (Number(opts.will) || 0) + used.will)),
  };
}

/**
 * Absolute R&D count from a `sync_rd_count` payload.
 * Prefer `rdCount`. `count` is the same field under the workshop's name.
 * @param {object|null|undefined} payload
 * @returns {number}
 */
export function readSyncRdCount(payload) {
  const raw = payload && payload.rdCount != null ? payload.rdCount : payload?.count;
  return Math.max(0, Math.floor(Number(raw) || 0));
}

/** Crisis roles a settled pathway can ease (and thus grow Budget capacity for). */
export const PATHWAY_EASE_ROLES = ["local", "global", "support"];

function roleDelta(v) {
  if (v && typeof v === "object") return Math.round(Number(v.delta) || 0);
  return Math.round(Number(v) || 0);
}

/**
 * Clone the once-per-role pathway-ease paid set.
 * @param {object|null|undefined} paid
 * @returns {Record<string, boolean>}
 */
export function clonePathwayEasePaid(paid) {
  const out = {};
  if (!paid || typeof paid !== "object") return out;
  for (const role of PATHWAY_EASE_ROLES) {
    if (paid[role]) out[role] = true;
  }
  return out;
}

function crisisDeltaFromUnknown(cd) {
  const out = { local: 0, global: 0, support: 0 };
  if (!cd || typeof cd !== "object") return out;
  for (const role of PATHWAY_EASE_ROLES) {
    out[role] = roleDelta(cd[role]);
  }
  return out;
}

/**
 * First time a settled pathway eases a crisis role, +1 Budget capacity per such role.
 * Does not grant again for that role on this invent/seat.
 *
 * @param {{ paid?: object, crisisDelta?: object, skip?: boolean }} [opts]
 * @returns {{ amount: number, roles: string[], paid: Record<string, boolean> }}
 */
export function pathwayEaseGrant(opts = {}) {
  const paid = clonePathwayEasePaid(opts.paid);
  if (opts.skip) return { amount: 0, roles: [], paid };
  const delta = crisisDeltaFromUnknown(opts.crisisDelta);
  const roles = [];
  for (const role of PATHWAY_EASE_ROLES) {
    if (paid[role]) continue;
    if (delta[role] < 0) {
      roles.push(role);
      paid[role] = true;
    }
  }
  return { amount: roles.length, roles, paid };
}

/**
 * Union of settled (non-pending) pathway impacts → grant.
 * Used when the board is the source of truth (Friends board_commit).
 *
 * @param {object|null|undefined} impacts — board.pathwayImpacts
 * @param {object|null|undefined} paid
 */
export function pathwayEaseGrantFromImpacts(impacts, paid) {
  const merged = { local: 0, global: 0, support: 0 };
  if (impacts && typeof impacts === "object") {
    for (const row of Object.values(impacts)) {
      if (!row || row.pending) continue;
      const d = crisisDeltaFromUnknown(row.crisisDelta);
      for (const role of PATHWAY_EASE_ROLES) {
        if (d[role] < merged[role]) merged[role] = d[role];
      }
    }
  }
  return pathwayEaseGrant({ paid, crisisDelta: merged });
}

/**
 * Move cost to pilot a fielded invention (Budget/Goodwill are already allocated on the stack).
 * @returns {{ ap: number, budget: number, parts: { id: string, label: string, amount: number }[] }}
 */
export function deployActionCost() {
  return {
    ap: 1,
    budget: 0,
    parts: [{ id: "pilot", label: "Field pilot (1 Move)", amount: 1 }],
  };
}

/**
 * Move cost to scale a successful pilot (no hidden Goodwill thresholds or extra cash burn).
 * @returns {{ ap: number, budget: number, will: number, parts: { id: string, label: string, amount: number }[] }}
 */
export function scaleActionCost() {
  return {
    ap: 1,
    budget: 0,
    will: 0,
    parts: [{ id: "scale", label: "Scale rollout (1 Move)", amount: 1 }],
  };
}

/** Deterministic PRNG for world foresight highlights */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
