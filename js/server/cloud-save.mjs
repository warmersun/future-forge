/**
 * A2 save-at-pride: validate import payloads and merge rules.
 * No I/O — Neon writes live in db.mjs.
 */

export const MAX_SOLVED_IDS = 500;
export const QUEST_ID_RE = /^[A-Za-z0-9._:-]{1,120}$/;
export const PLACE_MAX = 200;

const OUTCOMES = new Set(["hold", "partial", "collapse", "abandon"]);
const KINDS = new Set(["theme", "lesson", "friends", "import"]);

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function sanitizeQuestId(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!QUEST_ID_RE.test(s)) return null;
  return s;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function sanitizeSolvedIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (out.length >= MAX_SOLVED_IDS) break;
    const id = sanitizeQuestId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {"hold"|"partial"|"collapse"|"abandon"|null}
 */
export function mapOutcome(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (s === "win") return "hold";
  if (OUTCOMES.has(s)) return s;
  return null;
}

/**
 * @param {unknown} raw
 * @returns {"theme"|"lesson"|"friends"|"import"}
 */
export function mapKind(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (KINDS.has(s)) return s;
  return "theme";
}

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
function optionalInt(raw, min, max) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

/**
 * Slim last-run from the client. Unknown keys (board, hex, vision) are dropped,
 * never stored.
 * @param {unknown} raw
 * @returns {{
 *   questId: string,
 *   outcome: string,
 *   kind: string,
 *   stars: number|null,
 *   yearReached: number|null,
 *   waits: number|null,
 *   place: string|null,
 * }|null}
 */
export function sanitizeLastRun(raw) {
  if (!raw || typeof raw !== "object") return null;
  const questId = sanitizeQuestId(raw.questId || raw.quest_id);
  if (!questId) return null;
  const outcome = mapOutcome(raw.outcome);
  if (!outcome) return null;
  const placeRaw = raw.place != null ? String(raw.place).trim() : "";
  const techRaw = raw.techIds || raw.tech_ids;
  const techIds = [];
  if (Array.isArray(techRaw)) {
    const seen = new Set();
    for (const item of techRaw) {
      if (techIds.length >= 16) break;
      const id = sanitizeQuestId(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      techIds.push(id);
    }
  }
  const runId = typeof raw.id === "string" && /^[0-9a-f-]{36}$/i.test(raw.id.trim())
    ? raw.id.trim()
    : null;
  return {
    id: runId,
    questId,
    outcome,
    kind: mapKind(raw.kind),
    stars: optionalInt(raw.stars, 0, 5),
    yearReached: optionalInt(raw.yearReached ?? raw.year_reached, 0, 9999),
    waits: optionalInt(raw.waits, 0, 10_000),
    place: placeRaw ? placeRaw.slice(0, PLACE_MAX) : null,
    techIds,
  };
}

/**
 * C4: cloud wins on last-run when the account already has a runs row.
 * @param {number} existingRunCount
 * @param {object|null} lastRun
 */
export function shouldStoreLastRun(existingRunCount, lastRun) {
  return Boolean(lastRun) && Number(existingRunCount) === 0;
}

/**
 * Gate for POST /api/me/import and POST /api/me/runs.
 * GET /api/me stays 200 when Clerk is off (unsigned probe).
 *
 * @param {{ enabled?: boolean, signedIn?: boolean, missingToken?: boolean, invalidToken?: boolean, userId?: string|null }} ident
 * @param {{ dbEnabled?: boolean }} [opts]
 * @returns {{ ok: true, userId: string } | { ok: false, status: number, error: string }}
 */
export function cloudWriteGate(ident, opts = {}) {
  if (!ident?.enabled) {
    return { ok: false, status: 404, error: "clerk_disabled" };
  }
  if (ident.missingToken || !ident.signedIn) {
    if (ident.invalidToken) {
      return { ok: false, status: 401, error: "invalid_token" };
    }
    return { ok: false, status: 401, error: "sign_in_required" };
  }
  if (!opts.dbEnabled) {
    return { ok: false, status: 503, error: "db_unavailable" };
  }
  const userId = ident.userId ? String(ident.userId) : "";
  if (!userId) {
    return { ok: false, status: 401, error: "invalid_token" };
  }
  return { ok: true, userId };
}

/**
 * @param {unknown} body
 * @returns {{ solvedIds: string[], lastRun: ReturnType<typeof sanitizeLastRun> }}
 */
export function parseImportBody(body) {
  const src = body && typeof body === "object" ? body : {};
  return {
    solvedIds: sanitizeSolvedIds(src.solvedIds || src.solved_ids),
    lastRun: sanitizeLastRun(src.lastRun || src.last_run || null),
  };
}
