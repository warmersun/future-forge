/** Hosted portal (Render custom domain). Clerk Sign in runs here, not on the game. */

export const CLOUD_PORTAL_HOST = "cloud.warmersun.com";
export const CLOUD_PORTAL_ORIGIN = `https://${CLOUD_PORTAL_HOST}`;

/** CORS allowlist for device handshake (game SPA only). Loopback is always on. */
export const GAME_DEVICE_ORIGINS = Object.freeze([
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);

/**
 * Public origin for /signin links. Override with FF_PUBLIC_ORIGIN for local portal.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function portalPublicOrigin(env = process.env) {
  const raw = String(env.FF_PUBLIC_ORIGIN || "").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  return CLOUD_PORTAL_ORIGIN;
}

/**
 * Scheme + host + optional port. Rejects paths, credentials, and junk.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeGameDeviceOrigin(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    if (u.pathname && u.pathname !== "/") return "";
    if (u.search || u.hash) return "";
    if (!u.hostname) return "";
    return u.origin;
  } catch {
    return "";
  }
}

/**
 * Loopback defaults plus extras from FF_GAME_DEVICE_ORIGINS (comma-separated).
 * Extra values append; they do not replace loopback.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function gameDeviceOriginsFromEnv(env = process.env) {
  const extra = String(env.FF_GAME_DEVICE_ORIGINS || "")
    .split(",")
    .map((part) => normalizeGameDeviceOrigin(part))
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const origin of [...GAME_DEVICE_ORIGINS, ...extra]) {
    if (seen.has(origin)) continue;
    seen.add(origin);
    out.push(origin);
  }
  return out;
}

/**
 * @param {unknown} origin
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function allowGameDeviceOrigin(origin, env = process.env) {
  const needle = normalizeGameDeviceOrigin(origin);
  if (!needle) return false;
  return gameDeviceOriginsFromEnv(env).includes(needle);
}
