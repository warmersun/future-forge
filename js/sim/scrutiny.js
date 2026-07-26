/**
 * G3 scrutiny combat (DOM-free).
 * One critic per run — Defend / Fix / Sidestep against their resolve.
 * (Multi-challenger gauntlets were too much text and not fun.)
 */

/**
 * @param {object[]} angles — CHALLENGE_ANGLES-like
 * @param {number} n
 * @param {string|null} excludeId
 */
export function pickChallengeAngles(angles, n, excludeId = null) {
  const pool = (angles || []).filter((a) => a.id !== excludeId);
  const list = pool.length ? [...pool] : [...(angles || [])];
  // shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const take = Math.max(1, Math.min(n, list.length));
  return list.slice(0, take);
}

/**
 * Always one critic. Feasibility no longer multiplies speech walls.
 * Kept as a function so call sites / tests stay stable.
 */
export function encounterCountForFeasibility(_overall) {
  return 1;
}

/** Resolve (hearts) on the single critic — always 2 for a short fight. */
export function resolveForFeasibility(_overall) {
  return 2;
}

/**
 * @param {object[]} angleList — selected angle objects with id, label
 * @param {number} hp each
 */
export function buildEncounters(angleList, hp = 2) {
  return (angleList || []).map((a, i) => ({
    id: `enc-${a.id}-${i}`,
    angleId: a.id,
    label: a.label,
    subtitle: a.subtitle || "",
    blurb: a.blurb || "",
    visual: a.visual || "",
    hp: hp,
    maxHp: hp,
    speech: "",
    question: "",
    cleared: false,
    pivoted: false,
  }));
}

export function activeEncounter(scrutiny) {
  if (!scrutiny?.encounters?.length) return null;
  return scrutiny.encounters.find((e) => !e.cleared) || null;
}

export function allEncountersCleared(scrutiny) {
  return Boolean(scrutiny?.encounters?.length) && scrutiny.encounters.every((e) => e.cleared);
}

/**
 * Apply damage to an encounter. Returns new scrutiny clone.
 * @param {"hit"|"glance"|"miss"} quality
 */
export function applyArgueResult(scrutiny, encounterId, quality) {
  const next = cloneScrutiny(scrutiny);
  const enc = next.encounters.find((e) => e.id === encounterId);
  if (!enc || enc.cleared) return { scrutiny: next, miss: false, damage: 0 };

  let damage = 0;
  if (quality === "hit") damage = 2;
  else if (quality === "glance") damage = 1;

  enc.hp = Math.max(0, enc.hp - damage);
  let miss = false;
  if (quality === "miss") {
    next.missCount = (next.missCount || 0) + 1;
    miss = true;
  }
  if (enc.hp <= 0) {
    enc.cleared = true;
    enc.hp = 0;
  }
  return { scrutiny: next, miss, damage, cleared: enc.cleared };
}

export function applyPatchResult(scrutiny, encounterId, funded = false) {
  const next = cloneScrutiny(scrutiny);
  const enc = next.encounters.find((e) => e.id === encounterId);
  if (!enc || enc.cleared) return { scrutiny: next, damage: 0 };
  const damage = funded ? 2 : 1;
  enc.hp = Math.max(0, enc.hp - damage);
  if (enc.hp <= 0) {
    enc.cleared = true;
    enc.hp = 0;
  }
  return { scrutiny: next, damage, cleared: enc.cleared };
}

export function applyPivotResult(scrutiny, encounterId) {
  const next = cloneScrutiny(scrutiny);
  if (next.pivotUsed) return { ok: false, error: "pivot_used", scrutiny: next };
  const enc = next.encounters.find((e) => e.id === encounterId);
  if (!enc || enc.cleared) return { ok: false, error: "no_encounter", scrutiny: next };
  enc.hp = 0;
  enc.cleared = true;
  enc.pivoted = true;
  next.pivotUsed = true;
  return { ok: true, scrutiny: next };
}

/**
 * Sidestep cost = remaining resolve hearts.
 * Full critic (2♥) → 2 AP + 2 Will; after a glance (1♥) → 1 AP + 1 Will.
 * @param {object|null|undefined} enc
 * @param {{ budgetWill?: boolean }} [opts]
 * @returns {{ ok: boolean, error?: string, hearts: number, ap: number, will: number }}
 */
export function sidestepCostForEncounter(enc, opts = {}) {
  const budgetWill = opts.budgetWill !== false;
  if (!enc || enc.cleared) {
    return { ok: false, error: "no_encounter", hearts: 0, ap: 0, will: 0 };
  }
  const maxHp = Math.max(1, Math.floor(Number(enc.maxHp) || 2));
  const hearts = Math.max(0, Math.min(maxHp, Math.floor(Number(enc.hp) || 0)));
  if (hearts <= 0) {
    return { ok: false, error: "already_cleared", hearts: 0, ap: 0, will: 0 };
  }
  return {
    ok: true,
    hearts,
    ap: hearts,
    will: budgetWill ? hearts : 0,
  };
}

export function cloneScrutiny(s) {
  if (!s) return null;
  return {
    missCount: s.missCount || 0,
    pivotUsed: Boolean(s.pivotUsed),
    coachFreeUsed: Boolean(s.coachFreeUsed),
    elegancePivotPenalty: Boolean(s.elegancePivotPenalty),
    encounters: (s.encounters || []).map((e) => ({ ...e })),
  };
}

/** Local heuristic when AI judge fails */
export function localArgueQuality(answer) {
  const t = String(answer || "").trim();
  if (t.length < 20) return { quality: "miss", message: "Too short — name a concrete fix." };
  const concrete =
    /\b(who|pay|cost|meter|limit|permit|default|fee|cap|monitor|opt[- ]in|human|review|budget|year)\b/i.test(
      t
    );
  const long = t.length >= 80;
  if (concrete && long) {
    return { quality: "hit", message: "Concrete and specific — that lands hard." };
  }
  if (concrete || long) {
    return { quality: "glance", message: "Some substance — not a full answer yet." };
  }
  return { quality: "miss", message: "Still vague — name actors, costs, or hard limits." };
}

export const MISS_BUDGET = 2;
