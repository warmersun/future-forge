/**
 * Quest deep links: parse / match / build share URLs.
 * Canonical public form: https://warmersun.com/forge/?q=<quest-id>
 * The forge hop forwards search to the Funnel game host.
 */

/** Public invent hop — share this, never the Funnel *.ts.net hostname. */
export const PUBLIC_FORGE_ORIGIN = "https://warmersun.com/forge";

const TOKEN_MAX = 120;
const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeQuestToken(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > TOKEN_MAX) return "";
  if (!TOKEN_RE.test(s)) return "";
  return s;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function slugifyTitle(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TOKEN_MAX);
}

/**
 * Strip trailing slash; allow an optional path (e.g. /forge). No query/hash.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeShareOrigin(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    if (u.search || u.hash) return "";
    if (!u.hostname) return "";
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "");
    return `${u.origin}${path}`;
  } catch {
    return "";
  }
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function shareOriginFromEnv(env = typeof process !== "undefined" ? process.env : {}) {
  return normalizeShareOrigin(env?.FF_SHARE_ORIGIN);
}

/**
 * Funnel host copies the public hop URL; localhost copies itself.
 * @param {{
 *   healthShareOrigin?: string|null,
 *   hostname?: string,
 *   locationOrigin?: string,
 * }} [opts]
 * @returns {string}
 */
export function resolveShareOrigin(opts = {}) {
  const fromHealth = normalizeShareOrigin(opts.healthShareOrigin);
  if (fromHealth) return fromHealth;
  const host = String(opts.hostname || "");
  if (host === "warmersun.com" || host.endsWith(".warmersun.com") || host.endsWith(".ts.net")) {
    return PUBLIC_FORGE_ORIGIN;
  }
  const loc = normalizeShareOrigin(opts.locationOrigin);
  if (loc) return loc;
  return PUBLIC_FORGE_ORIGIN;
}

/**
 * @param {unknown} questId
 * @param {unknown} origin
 * @returns {string}
 */
export function buildQuestShareUrl(questId, origin) {
  const id = sanitizeQuestToken(questId);
  if (!id) return "";
  const base = normalizeShareOrigin(origin) || PUBLIC_FORGE_ORIGIN;
  return `${base}/?q=${encodeURIComponent(id)}`;
}

/**
 * @param {string|{ href?: string, search?: string, pathname?: string }} loc
 * @returns {{ token: string }|null}
 */
export function parseDeepLink(loc) {
  let href = "";
  if (typeof loc === "string") href = loc;
  else if (loc && typeof loc === "object") {
    if (loc.href) href = String(loc.href);
    else {
      const path = loc.pathname != null ? String(loc.pathname) : "/";
      const search = loc.search != null ? String(loc.search) : "";
      href = `http://local.invalid${path}${search}`;
    }
  }
  if (!href) return null;
  let url;
  try {
    url = new URL(href, "http://local.invalid");
  } catch {
    return null;
  }
  const raw = String(url.searchParams.get("q") || url.searchParams.get("quest") || "").trim();
  if (!raw || raw.length > 200) return null;
  if (/[\u0000-\u001f]/.test(raw)) return null;
  if (/^https?:\/\//i.test(raw) || raw.includes("/") || raw.includes("\\")) return null;
  return { token: raw };
}

/**
 * @param {string} href
 * @returns {string} pathname + leftover search + hash
 */
export function hrefWithoutDeepLink(href) {
  let url;
  try {
    url = new URL(href, "http://local.invalid");
  } catch {
    return "/";
  }
  url.searchParams.delete("q");
  url.searchParams.delete("quest");
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
}

/**
 * @param {string} token
 * @param {object[]} entries
 * @returns {object|null}
 */
export function findCatalogEntry(token, entries) {
  const raw = String(token || "").trim();
  if (!raw || !Array.isArray(entries)) return null;
  const lower = raw.toLowerCase();
  const slug = slugifyTitle(raw);

  const idHit = entries.find((e) => {
    const id = String(e?.id || "");
    const mid = String(e?.mission?.id || "");
    return id.toLowerCase() === lower || mid.toLowerCase() === lower;
  });
  if (idHit) return idHit;

  const titleHit = entries.find((e) => {
    const title = String(e?.title || e?.mission?.title || "").trim();
    return title.toLowerCase() === lower;
  });
  if (titleHit) return titleHit;

  if (!slug) return null;
  return (
    entries.find((e) => slugifyTitle(e?.title || e?.mission?.title || "") === slug) || null
  );
}
