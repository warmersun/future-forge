/**
 * Crisis-delta parse/clamp — shared by board-state clone and evaluate.
 * DOM-free. Keep this file free of board-state / evaluate imports.
 */

export const CRISIS_REASON_MAX = 280;
export const CRISIS_ROLES = ["local", "global", "support"];

/** Accept authored role names or context rows; absent roles mean no meters. */
export function crisisRoleKeys(roles) {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles.map((row) => typeof row === "string" ? row : row?.role))]
    .filter((role) => CRISIS_ROLES.includes(role));
}

export function emptyCrisisDelta(roles = []) {
  return Object.fromEntries(crisisRoleKeys(roles).map((role) => [role, 0]));
}

export function emptyCrisisReasons(roles = []) {
  return Object.fromEntries(crisisRoleKeys(roles).map((role) => [role, ""]));
}

/** Scope before display, persistence or rewards; never trust response keys. */
export function scopeCrisisScore(score, roles) {
  const keys = crisisRoleKeys(roles);
  return {
    ...score,
    crisisDelta: crisisDeltaValues(score?.crisisDelta, keys),
    crisisReasons: crisisDeltaReasons(score?.crisisDelta, score?.crisisReasons, keys),
  };
}

export function clipCrisisReason(s) {
  const text = String(s || "").trim();
  if (text.length <= CRISIS_REASON_MAX) return text;
  // Slice on a UTF-16 boundary, never through an emoji's surrogate pair.
  const safePrefix = (max) => {
    const prefix = text.slice(0, max);
    return /[\uD800-\uDBFF]$/.test(prefix) ? prefix.slice(0, -1) : prefix;
  };
  const prefix = safePrefix(CRISIS_REASON_MAX);
  // A title such as "Dr." is not a complete explanation.
  const sentences = [...prefix.matchAll(/[.!?](?=\s|$)/g)]
    .filter((match) => !/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.$/i.test(prefix.slice(0, match.index + 1)));
  const end = sentences.at(-1)?.index;
  if (end != null && end >= 20) return prefix.slice(0, end + 1);
  const budget = CRISIS_REASON_MAX - 1; // leave room for an explicit ellipsis
  const words = safePrefix(budget);
  const space = words.lastIndexOf(" ");
  return `${(space > 0 ? words.slice(0, space) : words).trimEnd()}…`;
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
export function crisisDeltaValues(cd, roles = Object.keys(cd || {})) {
  const out = emptyCrisisDelta(roles);
  if (!cd || typeof cd !== "object") return out;
  for (const role of crisisRoleKeys(roles)) {
    out[role] = parseCrisisDeltaField(cd[role]).delta;
  }
  return out;
}

/**
 * Teaching sentences from nested crisisDelta and/or sibling crisisReasons.
 * @param {object|null|undefined} cd
 * @param {object|null|undefined} sibling
 */
export function crisisDeltaReasons(cd, sibling = null, roles = Object.keys(cd || {})) {
  const out = emptyCrisisReasons(roles);
  const extra = sibling && typeof sibling === "object" ? sibling : {};
  for (const role of crisisRoleKeys(roles)) {
    const nested = parseCrisisDeltaField(cd?.[role]).reason;
    out[role] = nested || clipCrisisReason(extra[role]);
  }
  return out;
}
