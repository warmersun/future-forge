/** Hosted portal (Neon Function). The device handshake callback lives here. The sign-in form is Clerk's own sign-in component. */

export const CLOUD_PORTAL_HOST = "br-wild-surf-b4jds6qu-cloudapi.compute.c-6.us-east-2.aws.neon.tech";
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

/** RFC1918 IPv4 only, not link-local, CGNAT, or arbitrary private hostnames. */
export function isLanHostname(host) {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((n) => n > 255) || parts.join(".") !== host) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

/**
 * Self-hosted games are served from private addresses, so RFC1918 origins are
 * allowed by default. `FF_ALLOW_LAN_ORIGINS=0` restores the strict behavior
 * where only loopback and explicitly listed origins are accepted.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function allowLanOriginsFromEnv(env = process.env) {
  const raw = env.FF_ALLOW_LAN_ORIGINS;
  if (raw === undefined || String(raw).trim() === "") return true;
  return !/^(0|false|no|off)$/i.test(String(raw).trim());
}

/**
 * Exactly `http://<rfc1918-ip>[:port]` — a page served from a private address.
 * A public hostname cannot claim a private literal, and loopback is separate.
 * @param {unknown} raw
 */
export function isLanHttpOrigin(raw) {
  const origin = typeof raw === "string" ? raw.trim() : "";
  if (!origin) return false;
  const u = gameHttpUrl(origin);
  if (!u || u.origin !== origin) return false;
  return u.protocol === "http:" && isLanHostname(u.hostname);
}

// URL() repairs malformed input (slashes, whitespace, numeric IP aliases).
// Do not let those repairs turn an invalid URL into an allowlisted destination.
function gameHttpUrl(raw) {
  if (typeof raw !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(raw) || /%(?![a-f\d]{2})/i.test(raw)) return null;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(raw)?.[1];
  if (!authority || /[@%]/.test(authority)) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password || !url.hostname) return null;
    if (/^[\d.]+$/.test(url.hostname) && authority.split(":")[0] !== url.hostname) return null;
    return url;
  } catch { return null; }
}

/** Syntactic origin normalization, also used by non-auth Friends room links. */
export function normalizeGameDeviceOrigin(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  const u = gameHttpUrl(s);
  if (!u || !/^https?:\/\/[^/?#]+\/?$/i.test(s)) return "";
  return u.origin;
}

/** Eligible auth origin; normalization alone must not grant HTTP permission. */
function normalizeGameReturnOrigin(raw) {
  const origin = normalizeGameDeviceOrigin(raw);
  if (!origin) return "";
  const u = new URL(origin);
  if (u.protocol === "http:" && !["localhost", "127.0.0.1"].includes(u.hostname) && !isLanHostname(u.hostname)) return "";
  return origin;
}

/** Strict CORS origin. LAN is eligible only in an explicit origin list. */
export function validPortalCorsOrigin(raw, { allowLan = false } = {}) {
  const origin = normalizeGameReturnOrigin(raw);
  if (!origin || origin !== raw) return null;
  const u = new URL(origin);
  if (u.protocol === "http:" && isLanHostname(u.hostname) && !allowLan) return null;
  return origin;
}

/** One policy for all three independently deployable API slices. */
export function cloudCorsOriginsFromEnv(env = process.env) {
  const defaults = [
    "http://127.0.0.1:8765", "http://localhost:8765",
    "http://127.0.0.1:8766", "http://localhost:8766",
    "https://ff.warmersun.com", "https://cloud.warmersun.com", "https://warmersun.com",
    env.FF_PUBLIC_ORIGIN,
  ].map((s) => validPortalCorsOrigin(String(s || "").trim())).filter(Boolean);
  const configured = [env.FF_GAME_DEVICE_ORIGINS, env.FF_CLOUD_CORS_ORIGINS]
    .flatMap((s) => String(s || "").split(","))
    .map((s) => validPortalCorsOrigin(s.trim(), { allowLan: true })).filter(Boolean);
  return new Set([...defaults, ...configured]);
}

/**
 * One Origin policy for a request: the exact allowlist, plus any private-LAN
 * origin while LAN access is on. Private literals cannot be forged by a public
 * page, so a self-hosted game on the local network needs no configuration.
 * @param {unknown} raw request Origin header
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {Set<string>|null} [allowed] precomputed cloudCorsOriginsFromEnv(env)
 */
export function cloudOriginAllowed(raw, env = process.env, allowed = null) {
  const origin = validPortalCorsOrigin(raw, { allowLan: true });
  if (!origin) return false;
  if ((allowed || cloudCorsOriginsFromEnv(env)).has(origin)) return true;
  return allowLanOriginsFromEnv(env) && isLanHttpOrigin(origin);
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
    .map((part) => normalizeGameReturnOrigin(part))
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
  if (gameDeviceOriginsFromEnv(env).includes(needle)) return true;
  return allowLanOriginsFromEnv(env) && isLanHttpOrigin(needle);
}

/**
 * Safe post-signin bounce back to the game (deep-link same-tab).
 * Allows loopback, Funnel (*.ts.net), warmersun.com, and FF_GAME_DEVICE_ORIGINS.
 * @param {unknown} href
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>|string[]} [envOrExtras]
 */
export function isAllowedGameReturnUrl(href, envOrExtras) {
  const u = gameHttpUrl(href);
  if (!u) return false;
  const host = String(u.hostname || "").toLowerCase();
  if (!host) return false;
  if (host === "127.0.0.1" || host === "localhost") return true;
  if (u.protocol === "https:" && (host === "warmersun.com" || host.endsWith(".warmersun.com") || host.endsWith(".ts.net"))) return true;
  /** @type {string[]} */
  let extras = [];
  /** Explicit origin lists are the caller's own policy; LAN stays on by default. */
  let lan = true;
  if (Array.isArray(envOrExtras)) extras = envOrExtras;
  else if (envOrExtras && typeof envOrExtras === "object") {
    extras = gameDeviceOriginsFromEnv(envOrExtras);
    lan = allowLanOriginsFromEnv(envOrExtras);
  }
  if (extras.map(normalizeGameReturnOrigin).filter(Boolean).includes(u.origin)) return true;
  return lan && u.protocol === "http:" && isLanHostname(host);
}

/**
 * @param {string} signInUrl
 * @param {string} returnHref
 * @param {string[]} [extras] Validated game return origins published by health.
 * @returns {string}
 */
export function signInUrlWithReturn(signInUrl, returnHref, extras = []) {
  const base = String(signInUrl || "").trim();
  if (!base || !isAllowedGameReturnUrl(returnHref, extras)) return base;
  try {
    const u = new URL(base);
    u.searchParams.set("return", String(returnHref));
    return u.href;
  } catch {
    return base;
  }
}
