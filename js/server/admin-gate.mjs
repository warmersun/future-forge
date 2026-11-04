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
 * Gate for admin / sensitive diagnostics (usage metrics, fat health).
 * - Loopback socket always allowed
 * - Or X-Admin-Token / non-JWT Authorization: Bearer <FF_ADMIN_TOKEN> / ?token=
 */

import crypto from "node:crypto";
import { isLoopbackSocket } from "./client-ip.mjs";
import { extractBearerToken, isJwtShaped } from "./clerk-auth.mjs";

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
  const hdr = req.headers?.["x-admin-token"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  const authTok = extractBearerToken(req);
  if (authTok && !isJwtShaped(authTok)) return authTok;
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
