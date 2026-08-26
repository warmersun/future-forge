/**
 * Short-lived device codes: local game polls; portal /signin deposits a Clerk JWT.
 * Map keys are SHA-256 of the code so a dump of memory does not print the redeem secret.
 */
import { createHash, randomBytes } from "node:crypto";

export const DEVICE_TTL_MS = 5 * 60 * 1000;

function hashCode(code) {
  return createHash("sha256").update(String(code), "utf8").digest("hex");
}

/**
 * @param {{ ttlMs?: number, now?: () => number }} [opts]
 */
export function createDeviceAuthStore(opts = {}) {
  const ttlMs = opts.ttlMs ?? DEVICE_TTL_MS;
  const now = opts.now || (() => Date.now());
  /** @type {Map<string, { token: string|null, exp: number }>} */
  const rows = new Map();

  function prune() {
    const t = now();
    for (const [code, row] of rows) {
      if (row.exp <= t) rows.delete(code);
    }
  }

  function start() {
    prune();
    const code = randomBytes(18).toString("base64url");
    rows.set(hashCode(code), { token: null, exp: now() + ttlMs });
    return code;
  }

  /**
   * @param {string} code
   * @param {string} token
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  function complete(code, token) {
    prune();
    const key = String(code || "").trim();
    const jwt = String(token || "").trim();
    if (!key || !jwt) return { ok: false, error: "invalid" };
    const row = rows.get(hashCode(key));
    if (!row) return { ok: false, error: "unknown" };
    if (row.token) return { ok: false, error: "already_bound" };
    row.token = jwt;
    return { ok: true };
  }

  /**
   * @param {string} code
   * @returns {{ ok: true, pending: true } | { ok: true, pending: false, token: string } | { ok: false, error: string }}
   */
  function takeStatus(code) {
    prune();
    const key = String(code || "").trim();
    if (!key) return { ok: false, error: "invalid" };
    const digest = hashCode(key);
    const row = rows.get(digest);
    if (!row) return { ok: false, error: "unknown" };
    if (!row.token) return { ok: true, pending: true };
    const token = row.token;
    rows.delete(digest);
    return { ok: true, pending: false, token };
  }

  return { start, complete, takeStatus };
}

export const deviceAuth = createDeviceAuthStore();
