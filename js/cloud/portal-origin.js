/** Hosted portal (Render custom domain). Clerk Sign in runs here, not on the game. */

export const CLOUD_PORTAL_HOST = "cloud.warmersun.com";
export const CLOUD_PORTAL_ORIGIN = `https://${CLOUD_PORTAL_HOST}`;

/** CORS allowlist for device handshake (game SPA only). */
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
 * @param {unknown} origin
 */
export function allowGameDeviceOrigin(origin) {
  return GAME_DEVICE_ORIGINS.includes(String(origin || "").trim());
}
