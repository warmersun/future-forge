/**
 * World foresight — year-keyed capability highlights for year bulletins
 * and claim-timing feasibility. DOM-free.
 */

import { WORLD_FORESIGHT_EVENTS } from "./world-foresight-data.js";
import { hashSeed, mulberry32 } from "./economy.js";

/**
 * @typedef {object} WorldCapabilityEvent
 * @property {string} id
 * @property {number} year
 * @property {"milestone"|"prediction"|"trend"} kind
 * @property {string[]} [techIds]
 * @property {string[]} [domains]
 * @property {string[]} [globalIds]
 * @property {string} headline
 * @property {string} detail
 * @property {"now"|"near"|"frontier"} claimBand
 * @property {string[]} [claimKeywords]
 * @property {string} [sourceNote]
 * @property {string} [image]
 */

export { WORLD_FORESIGHT_EVENTS };

/**
 * Events that are "active" by calendar year (milestone/prediction year ≤ Y).
 * @param {number} year
 * @param {WorldCapabilityEvent[]} [pool]
 */
export function foresightActiveByYear(year, pool = WORLD_FORESIGHT_EVENTS) {
  const y = Number(year) || 2026;
  return (pool || []).filter((e) => e && Number(e.year) <= y);
}

/**
 * Events that become newly salient this year (exact year match).
 * @param {number} year
 * @param {WorldCapabilityEvent[]} [pool]
 */
export function foresightNewInYear(year, pool = WORLD_FORESIGHT_EVENTS) {
  const y = Number(year) || 2026;
  return (pool || []).filter((e) => e && Number(e.year) === y);
}

/**
 * Pick 3–6 highlights for the year bulletin.
 * @param {number} year
 * @param {object} [opts]
 * @param {string[]} [opts.techIds]
 * @param {string|null} [opts.globalId]
 * @param {number} [opts.limit]
 * @param {string|number} [opts.seed]
 * @param {WorldCapabilityEvent[]} [opts.pool]
 * @returns {WorldCapabilityEvent[]}
 */
export function foresightForYear(year, opts = {}) {
  const y = Number(year) || 2026;
  const limit = Math.max(3, Math.min(6, opts.limit ?? 5));
  const pool = opts.pool || WORLD_FORESIGHT_EVENTS;
  const techSet = new Set(opts.techIds || []);
  const globalId = opts.globalId || null;
  const rng = mulberry32(hashSeed(`${opts.seed ?? "foresight"}:${y}:${globalId || ""}`));

  const score = (e) => {
    let s = 0;
    if (Number(e.year) === y) s += 10;
    else if (Number(e.year) === y - 1) s += 4;
    if ((e.techIds || []).some((id) => techSet.has(id))) s += 6;
    if (globalId && (e.globalIds || []).includes(globalId)) s += 5;
    if (e.kind === "prediction") s += 2;
    if (e.kind === "milestone") s += 1;
    // slight domain diversity noise
    s += rng() * 0.5;
    return s;
  };

  const active = foresightActiveByYear(y, pool);
  const fresh = foresightNewInYear(y, pool);
  // Prefer new-this-year, then best scored active
  const ranked = [
    ...fresh.sort((a, b) => score(b) - score(a)),
    ...active
      .filter((e) => !fresh.some((f) => f.id === e.id))
      .sort((a, b) => score(b) - score(a)),
  ];

  const picked = [];
  const domainsSeen = new Set();
  for (const e of ranked) {
    if (picked.length >= limit) break;
    const dom = (e.domains && e.domains[0]) || (e.techIds && e.techIds[0]) || e.id;
    // light diversity: skip if we already have 2 from same first tech
    const tech0 = (e.techIds || [])[0];
    if (tech0 && domainsSeen.has(tech0) && picked.length >= 3) continue;
    picked.push(e);
    if (tech0) domainsSeen.add(tech0);
    domainsSeen.add(dom);
  }

  // Fallback fill
  while (picked.length < Math.min(3, ranked.length)) {
    const next = ranked.find((e) => !picked.some((p) => p.id === e.id));
    if (!next) break;
    picked.push(next);
  }
  return picked;
}

/**
 * Foresight rows touching a tech stack (for learn / feasibility).
 * @param {string[]} techIds
 * @param {number} year
 * @param {object} [opts]
 */
export function foresightForTechs(techIds, year, opts = {}) {
  const set = new Set(techIds || []);
  const y = Number(year) || 2026;
  const pool = opts.pool || WORLD_FORESIGHT_EVENTS;
  return foresightActiveByYear(y, pool).filter((e) =>
    (e.techIds || []).some((id) => set.has(id))
  );
}

/**
 * Build capability context for claim timing.
 * @param {number} year
 * @param {object[]} techs — tech objects with id
 * @param {object} [opts]
 */
export function foresightCapabilityContext(year, techs = [], opts = {}) {
  const y = Number(year) || 2026;
  const ids = (techs || []).map((t) => t?.id).filter(Boolean);
  const idSet = new Set(ids);
  const pool = opts.pool || WORLD_FORESIGHT_EVENTS;
  const unlockedNear = [];
  const stillFrontier = [];
  const keywordsNear = [];
  const keywordsFrontier = [];

  // All bank rows that touch the stack (including future-dated predictions)
  const related = (pool || []).filter((e) => {
    if (!e) return false;
    if ((e.techIds || []).some((id) => idSet.has(id))) return true;
    if (opts.globalId && (e.globalIds || []).includes(opts.globalId)) return true;
    // Always include iconic frontier predictions (AGI, free energy, etc.)
    if (e.claimBand === "frontier") return true;
    return false;
  });

  for (const e of related) {
    const ey = Number(e.year) || y;
    if (e.claimBand === "frontier" && ey > y) {
      stillFrontier.push(e);
      keywordsFrontier.push(...(e.claimKeywords || []));
    } else if (ey <= y && e.claimBand !== "frontier") {
      unlockedNear.push(e);
      keywordsNear.push(...(e.claimKeywords || []));
    } else if (ey <= y && e.claimBand === "frontier") {
      // Prediction year reached but still "frontier" band → near/yellow soft unlock
      unlockedNear.push(e);
      keywordsNear.push(...(e.claimKeywords || []));
    } else if (ey > y) {
      stillFrontier.push(e);
      keywordsFrontier.push(...(e.claimKeywords || []));
    }
  }

  return {
    year: y,
    unlockedNear,
    stillFrontier,
    keywordsNear: [...new Set(keywordsNear.map((k) => String(k).toLowerCase()))],
    keywordsFrontier: [...new Set(keywordsFrontier.map((k) => String(k).toLowerCase()))],
    highlights: foresightForYear(y, {
      techIds: ids,
      globalId: opts.globalId,
      seed: opts.seed,
      pool: opts.pool,
    }),
  };
}

/**
 * Adjust claim-stretch level using foresight keywords (local fallback; AI may override).
 * @param {{ level: string, reason: string }} stretch
 * @param {string} howText
 * @param {ReturnType<typeof foresightCapabilityContext>} ctx
 */
export function applyForesightToClaimStretch(stretch, howText, ctx) {
  if (!stretch || !ctx) return stretch;
  const text = String(howText || "").toLowerCase();
  if (text.length < 20) return stretch;

  let level = stretch.level;
  let reason = stretch.reason;
  const hitFrontier = (ctx.keywordsFrontier || []).filter((k) => k && text.includes(k));
  const hitNear = (ctx.keywordsNear || []).filter((k) => k && text.includes(k));

  // Explicit frontier prediction not yet due → push toward red/yellow
  const earlyFrontier = (ctx.stillFrontier || []).filter(
    (e) => e.claimBand === "frontier" && Number(e.year) > ctx.year
  );
  for (const e of earlyFrontier) {
    const keys = e.claimKeywords || [];
    if (keys.some((k) => text.includes(String(k).toLowerCase()))) {
      if (level === "green") level = "red";
      else if (level === "yellow") level = "red";
      reason = `Claim matches a ${e.year} prediction still marked frontier (“${e.headline}”). Soften to pilot language or wait.`;
      return { level, reason, foresightHit: e.id };
    }
  }

  if (hitFrontier.length && !hitNear.length) {
    if (level === "green") level = "yellow";
    reason =
      stretch.reason +
      ` Foresight: language overlaps frontier predictions (${hitFrontier.slice(0, 2).join(", ")}).`;
  } else if (hitNear.length && level === "red") {
    level = "yellow";
    reason =
      `Claims touch capabilities that foresight treats as nearer by ${ctx.year} (${hitNear
        .slice(0, 2)
        .join(", ")}). Still verify pilot honesty.`;
  }

  return { level, reason, foresightNear: hitNear, foresightFrontier: hitFrontier };
}

/** Validate bank for tests / build script */
export function validateWorldForesightBank(pool = WORLD_FORESIGHT_EVENTS, techIds = null) {
  const errors = [];
  const ids = new Set();
  for (const e of pool || []) {
    if (!e?.id) errors.push("missing id");
    else if (ids.has(e.id)) errors.push(`dup id ${e.id}`);
    else ids.add(e.id);
    if (!e.headline?.trim()) errors.push(`${e.id}: empty headline`);
    if (!e.detail?.trim()) errors.push(`${e.id}: empty detail`);
    if (!["milestone", "prediction", "trend"].includes(e.kind))
      errors.push(`${e.id}: bad kind`);
    if (!["now", "near", "frontier"].includes(e.claimBand))
      errors.push(`${e.id}: bad claimBand`);
    const y = Number(e.year);
    if (!Number.isFinite(y) || y < 2024 || y > 2040) errors.push(`${e.id}: bad year`);
    if (techIds) {
      for (const t of e.techIds || []) {
        if (!techIds.includes(t)) errors.push(`${e.id}: unknown tech ${t}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, count: (pool || []).length };
}
