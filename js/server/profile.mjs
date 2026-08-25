/**
 * E1 in-game inventor profile. Default private. No marketing URL.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
export const BIO_MAX = 280;

/**
 * @param {unknown} raw
 */
export function sanitizeUsername(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!USERNAME_RE.test(s)) return null;
  return s;
}

/**
 * @param {unknown} raw
 */
export function sanitizeBio(raw) {
  if (raw == null) return "";
  return String(raw).trim().slice(0, BIO_MAX);
}

/**
 * @param {unknown} body
 */
export function parseProfilePatch(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  if ("username" in src) {
    const u = sanitizeUsername(src.username);
    if (!u) return { ok: false, error: "invalid_username" };
    out.username = u;
  }
  if ("bio" in src) out.bio = sanitizeBio(src.bio);
  if ("public" in src || "isPublic" in src) {
    out.isPublic = Boolean(src.public ?? src.isPublic);
  }
  if ("displayName" in src) {
    const n = String(src.displayName || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
    if (n.includes("@")) return { ok: false, error: "invalid_name" };
    out.displayName = n || null;
  }
  return { ok: true, patch: out };
}

/**
 * Public payload: never email. Private profiles 404 at the route.
 * @param {object} row
 * @param {object[]} [holds]
 */
export function publicInventorPage(row, holds = []) {
  if (!row || !row.isPublic) return null;
  return {
    username: row.username,
    displayName: row.displayName || row.username,
    bio: row.bio || "",
    holds: (holds || []).slice(0, 8).map((h) => ({
      questId: h.questId || h.quest_id,
      place: h.place || null,
      yearReached: h.yearReached ?? h.year_reached ?? null,
      kind: h.kind || null,
    })),
  };
}

/**
 * @param {unknown} runId
 */
export function sanitizeRunId(runId) {
  const s = String(runId || "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : null;
}

export function parseShareBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const id = sanitizeRunId(src.runId || src.id);
  if (!id) return { ok: false, error: "invalid_run" };
  return { ok: true, runId: id, share: src.share !== false };
}

export { sanitizeQuestId };
