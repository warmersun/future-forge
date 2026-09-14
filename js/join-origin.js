/**
 * Public Friends-room join origin (Funnel / MagicDNS).
 * Distinct from FF_SHARE_ORIGIN (catalog hop) and FF_GAME_DEVICE_ORIGINS (portal CORS).
 */

import { normalizeGameDeviceOrigin } from "./cloud/portal-origin.js";

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function joinOriginFromEnv(env = typeof process !== "undefined" ? process.env : {}) {
  return normalizeGameDeviceOrigin(env?.FF_JOIN_ORIGIN);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeJoinUrlList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const origin = normalizeGameDeviceOrigin(item);
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    out.push(origin);
  }
  return out;
}

function isLoopbackHost(host) {
  const h = String(host || "").toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

/**
 * Page origin when the host is already on Funnel MagicDNS. Loopback is never public.
 * @param {{ hostname?: string, locationOrigin?: string }} [opts]
 * @returns {string}
 */
export function funnelPageOrigin(opts = {}) {
  const host = String(opts.hostname || "").toLowerCase();
  if (!host.endsWith(".ts.net") || isLoopbackHost(host)) return "";
  return normalizeGameDeviceOrigin(opts.locationOrigin);
}

/**
 * True when a join URL is Funnel / HTTPS (not a LAN http://192.168… link).
 * @param {unknown} url
 * @returns {boolean}
 */
export function isRemoteJoinUrl(url) {
  const origin = normalizeGameDeviceOrigin(url);
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.protocol === "https:") return true;
    return String(u.hostname || "")
      .toLowerCase()
      .endsWith(".ts.net");
  } catch {
    return false;
  }
}

/**
 * Dedupe: configured join URLs, then Funnel page origin, then LAN.
 * @param {{
 *   joinUrls?: unknown,
 *   lanUrls?: unknown,
 *   hostname?: string,
 *   locationOrigin?: string,
 * }} [opts]
 * @returns {string[]}
 */
export function resolveRoomJoinUrls(opts = {}) {
  const join = normalizeJoinUrlList(opts.joinUrls);
  const page = funnelPageOrigin(opts);
  const lan = normalizeJoinUrlList(opts.lanUrls);
  const out = [];
  const seen = new Set();
  for (const u of [...join, ...(page ? [page] : []), ...lan]) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}
