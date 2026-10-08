/**
 * One base URL for every remote content catalog (quests + trends).
 *
 * FF_CONTENT_BASE_URL=https://warmersun.com/staging/<token>/ points the app at
 * a staged build. Catalog URLs are derived from it:
 *   quests  → <base>quests/catalog.json  (modules, lessons, spotlights)
 *   trends  → <base>trends/catalog.json
 *
 * A specific FF_QUESTS_REMOTE_URL / FF_TRENDS_REMOTE_URL still wins.
 * Unset: live defaults (warmersun.com) are unchanged.
 */

export const STAGING_ORIGIN = "https://warmersun.com/staging/";

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null} base URL ending in "/", or null when unset
 */
export function resolveContentBaseUrl(env = process.env) {
  const raw = env.FF_CONTENT_BASE_URL;
  if (raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === "0" || /^off$/i.test(s) || /^false$/i.test(s)) return null;
  return s.endsWith("/") ? s : `${s}/`;
}

/**
 * @param {string} base
 * @param {"quests"|"trends"} kind
 */
export function contentCatalogUrl(base, kind) {
  return new URL(`${kind}/catalog.json`, base).href;
}

/**
 * Turn a staging token or URL into a content base URL.
 * Accepts: `20261008-113941-f1ab7c98-solved-today`,
 * `https://warmersun.com/staging/<token>/`, or a URL ending in
 * `index.html` / `quests/` / `quests/catalog.json`.
 * @param {string} input
 * @returns {string} base URL ending in "/"
 */
export function stagingBaseFromArg(input) {
  const s = String(input || "").trim();
  if (!s) throw new Error("missing staging token or URL");
  if (/^https?:\/\//i.test(s)) {
    const u = new URL(s);
    u.search = "";
    u.hash = "";
    let p = u.pathname
      .replace(/\/index\.html$/i, "/")
      .replace(/\/quests\/catalog\.json$/i, "/")
      .replace(/\/quests\/?$/i, "/");
    if (!p.endsWith("/")) p += "/";
    u.pathname = p;
    return u.href;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s)) {
    throw new Error(`not a staging token or URL: ${s}`);
  }
  return `${STAGING_ORIGIN}${s}/`;
}
