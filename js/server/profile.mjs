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
 * Chosen in-game name. Never treats Clerk legal names as a fallback.
 * @param {unknown} profileOrName
 */
export function chosenDisplayName(profileOrName) {
  const raw =
    profileOrName && typeof profileOrName === "object"
      ? profileOrName.displayName ?? profileOrName.display_name
      : profileOrName;
  const n = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  if (!n || n.includes("@")) return null;
  return n;
}

export function profileNeedsDisplayName(profile) {
  return !chosenDisplayName(profile);
}

/**
 * @param {unknown} body
 */
export function parseProfilePatch(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  if ("username" in src) {
    const raw = String(src.username || "").trim();
    if (!raw) {
      out.username = null;
    } else {
      const u = sanitizeUsername(src.username);
      if (!u) return { ok: false, error: "invalid_username" };
      out.username = u;
    }
  }
  if ("bio" in src) out.bio = sanitizeBio(src.bio);
  if ("public" in src || "isPublic" in src) {
    out.isPublic = Boolean(src.public ?? src.isPublic);
  }
  if ("hideEmail" in src || "hide_email" in src) {
    out.hideEmail = Boolean(src.hideEmail ?? src.hide_email);
  }
  if ("displayName" in src) {
    const n = chosenDisplayName(src.displayName);
    if (!n) {
      return {
        ok: false,
        error: String(src.displayName || "").includes("@")
          ? "invalid_name"
          : "display_name_required",
      };
    }
    out.displayName = n;
  }
  if (out.isPublic && !out.username && !sanitizeUsername(src.username)) {
    return { ok: false, error: "invalid_username" };
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

export function parseReportBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const reason = String(src.reason || "").trim().slice(0, 500);
  if (!reason) return { ok: false, error: "reason_required" };
  return {
    ok: true,
    username: sanitizeUsername(src.username) || null,
    questId: sanitizeQuestId(src.questId || src.quest_id),
    reason,
  };
}

export function parseShareBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const id = sanitizeRunId(src.runId || src.id);
  if (!id) return { ok: false, error: "invalid_run" };
  return { ok: true, runId: id, share: src.share !== false };
}

export { sanitizeQuestId };
