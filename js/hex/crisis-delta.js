/**
 * Crisis-delta parse/clamp — shared by board-state clone and evaluate.
 * DOM-free. Keep this file free of board-state / evaluate imports.
 */

export const CRISIS_REASON_MAX = 160;
export const CRISIS_ROLES = ["local", "global", "support"];

export function emptyCrisisDelta() {
  return { local: 0, global: 0, support: 0 };
}

export function emptyCrisisReasons() {
  return { local: "", global: "", support: "" };
}

export function clipCrisisReason(s) {
  return String(s || "").trim().slice(0, CRISIS_REASON_MAX);
}

export function clampCrisisDelta(v) {
  const n = Math.round(Number(v) || 0);
  return Math.max(-2, Math.min(1, n));
}

/**
 * Accept nested `{ delta, reason }` or a legacy bare number.
 * @param {unknown} v
 * @returns {{ delta: number, reason: string }}
 */
export function parseCrisisDeltaField(v) {
  if (v && typeof v === "object") {
    const deltaRaw =
      v.delta != null ? v.delta : v.value != null ? v.value : v.n;
    return {
      delta: clampCrisisDelta(deltaRaw),
      reason: clipCrisisReason(v.reason),
    };
  }
  return { delta: clampCrisisDelta(v), reason: "" };
}

/**
 * Numeric deltas from a score or cache row (nested or flat).
 * @param {object|null|undefined} cd
 */
export function crisisDeltaValues(cd) {
  const out = emptyCrisisDelta();
  if (!cd || typeof cd !== "object") return out;
  for (const role of CRISIS_ROLES) {
    out[role] = parseCrisisDeltaField(cd[role]).delta;
  }
  return out;
}

/**
 * Teaching sentences from nested crisisDelta and/or sibling crisisReasons.
 * @param {object|null|undefined} cd
 * @param {object|null|undefined} sibling
 */
export function crisisDeltaReasons(cd, sibling = null) {
  const out = emptyCrisisReasons();
  const extra = sibling && typeof sibling === "object" ? sibling : {};
  for (const role of CRISIS_ROLES) {
    const nested = parseCrisisDeltaField(cd?.[role]).reason;
    out[role] = nested || clipCrisisReason(extra[role]);
  }
  return out;
}
