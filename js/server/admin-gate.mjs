/**
 * Gate for admin / sensitive diagnostics (usage metrics, fat health).
 * - Loopback socket always allowed
 * - Or Authorization: Bearer <FF_ADMIN_TOKEN> / ?token= / X-Admin-Token
 */

import crypto from "node:crypto";
import { isLoopbackSocket } from "./client-ip.mjs";

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function adminTokenFromEnv(env = process.env) {
  return String(env.FF_ADMIN_TOKEN || "").trim();
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {object} [opts]
 * @param {string} [opts.token] expected token (default FF_ADMIN_TOKEN)
 * @param {URL|null} [opts.url] pre-parsed URL for query token
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function canSeeAdmin(req, opts = {}) {
  if (isLoopbackSocket(req)) return { ok: true };

  const expected = opts.token != null ? String(opts.token) : adminTokenFromEnv();
  if (!expected) {
    return {
      ok: false,
      status: 403,
      error: "admin_forbidden",
    };
  }

  const presented = extractAdminToken(req, opts.url);
  if (presented && timingSafeEqualStr(presented, expected)) {
    return { ok: true };
  }
  return { ok: false, status: 401, error: "admin_unauthorized" };
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {URL|null|undefined} url
 */
export function extractAdminToken(req, url) {
  const auth = req.headers?.authorization;
  if (typeof auth === "string") {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  const hdr = req.headers?.["x-admin-token"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  if (url?.searchParams) {
    const q = url.searchParams.get("token") || url.searchParams.get("adminToken");
    if (q) return q.trim();
  }
  return "";
}

/** Constant-time string compare for tokens. */
export function timingSafeEqualStr(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}
