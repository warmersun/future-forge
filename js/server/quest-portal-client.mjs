/**
 * Game → portal quest catalog. The game never holds the object-storage keys.
 * Official tiles come from the portal. Library files stay on the game.
 */

import { isLibraryCatalogEntry } from "../quest-catalog.js";
import { slugId } from "../quest-tile.js";
import {
  isTutorContext,
  questIdFromContext,
  tutorContextFromCatalogTile,
} from "./cloud-gate.mjs";

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function portalOrigin(env = process.env) {
  return String(env.FF_PORTAL_URL || "")
    .trim()
    .replace(/\/$/, "");
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {string[]} [args]
 */
export function portalQuestsEnabled(env = process.env, args = process.argv.slice(2)) {
  // Connecting an account must not replace a self-hosted game's catalog.
  // The dev launcher explicitly opts in; env/.env choices still take priority.
  const enabled = env.FF_PORTAL_QUESTS === undefined
    ? args.includes("--portal-quests")
    : /^(1|true|yes)$/i.test(String(env.FF_PORTAL_QUESTS).trim());
  return Boolean(portalOrigin(env)) && enabled;
}

/**
 * Remote wins on id, same as the in-process catalog merge.
 * @param {object[]} local
 * @param {object[]} remote
 */
export function mergeQuestCatalog(local, remote) {
  const byId = new Map();
  for (const q of local || []) {
    if (q?.id) byId.set(q.id, q);
  }
  for (const q of remote || []) {
    if (q?.id) byId.set(q.id, q);
  }
  return [...byId.values()];
}

/**
 * Ids the official catalog already serves. The hub reads `local` and `remote`
 * separately, so a shared id must leave `local` or the Library copy skips the gate.
 * @param {object|null|undefined} entry
 */
function officialIdKeys(entry) {
  /** @type {string[]} */
  const keys = [];
  for (const raw of [entry?.id, entry?.mission?.id]) {
    const id = slugId(raw);
    if (id) keys.push(id);
  }
  return keys;
}

/**
 * @param {object[]} local
 * @param {object[]} remote
 */
export function omitOfficialLocalDuplicates(local, remote) {
  const official = new Set();
  for (const q of remote || []) {
    for (const id of officialIdKeys(q)) official.add(id);
  }
  return (local || []).filter((q) => {
    const ids = officialIdKeys(q);
    if (!ids.length) return true;
    return !ids.some((id) => official.has(id));
  });
}

/**
 * @param {string} header
 */
function authorizationHeader(header) {
  const raw = String(header || "").trim();
  if (!raw) return "";
  return /^bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
}

/**
 * @param {object} opts
 * @param {string} [opts.id]
 * @param {string} [opts.search]
 * @param {string} [opts.authorization]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {typeof fetch} [opts.fetchImpl]
 */
export async function fetchPortalQuests(opts = {}) {
  const env = opts.env || process.env;
  const origin = portalOrigin(env);
  if (!origin) {
    return { ok: false, status: 503, data: { ok: false, error: "portal_unconfigured" } };
  }
  const id = String(opts.id || "").trim();
  const search = opts.search
    ? opts.search.startsWith("?")
      ? opts.search
      : `?${opts.search}`
    : "";
  const path = id
    ? `/api/quests/${encodeURIComponent(id)}`
    : `/api/quests${search}`;
  /** @type {Record<string, string>} */
  const headers = { Accept: "application/json" };
  const auth = authorizationHeader(opts.authorization);
  if (auth) headers.Authorization = auth;
  const secret = String(env.FF_API_SECRET || "").trim();
  if (secret) headers["X-FF-Secret"] = secret;
  const fetchImpl = opts.fetchImpl || fetch;
  try {
    const res = await fetchImpl(`${origin}${path}`, { method: "GET", headers });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 503, data: { ok: false, error: "quests_unavailable" } };
  }
}

/** Only an authoritative missing-quest response permits a local side-load. */
export function portalQuestNotFound(result, id) {
  return result?.status === 404 && result.data?.error === "not_found" && result.data?.id === id;
}

/**
 * When the hosted catalog is opted into, tutor notes for an official quest come from
 * the portal tile. Client-supplied notes are dropped.
 * @param {object|null|undefined} context
 * @param {{ authorization?: string, env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch }} [opts]
 */
export async function officialTutorContext(context, opts = {}) {
  const ctx = context && typeof context === "object" ? context : {};
  const env = opts.env || process.env;
  if (!portalQuestsEnabled(env)) return { ok: true, context: ctx };
  if (!isTutorContext(ctx) || isLibraryCatalogEntry(ctx)) {
    return { ok: true, context: ctx };
  }
  const id = questIdFromContext(ctx);
  if (!id) return { ok: true, context: tutorContextFromCatalogTile(ctx, null) };
  const got = await fetchPortalQuests({
    id,
    authorization: opts.authorization,
    env,
    fetchImpl: opts.fetchImpl,
  });
  if (got.status === 401 || got.status === 402) {
    return {
      ok: false,
      status: got.status,
      error: got.data?.error || (got.status === 402 ? "content_required" : "sign_in_required"),
      subscribeUrl: got.data?.subscribeUrl || null,
    };
  }
  if (got.status === 200 && got.data?.tile) {
    return { ok: true, context: tutorContextFromCatalogTile(ctx, got.data.tile) };
  }
  if (portalQuestNotFound(got, id)) {
    return { ok: true, context: tutorContextFromCatalogTile(ctx, null) };
  }
  return {
    ok: false,
    status: got.status || 503,
    error: got.data?.error || "quests_unavailable",
  };
}
