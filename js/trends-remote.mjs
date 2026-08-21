/**
 * Fetch capability-trend tiles from a remote catalog
 * (default: warmersun.com/future-forge/trends/catalog.json).
 *
 * Also accepts a local filesystem path to catalog.json (dev/offline).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export const DEFAULT_TRENDS_REMOTE_URL =
  "https://warmersun.com/future-forge/trends/catalog.json";

/**
 * Local checkout when present (dev machines with ~/dev/warmersun).
 */
export function defaultLocalWarmersunTrendsCatalogPath() {
  const candidates = [
    path.join(os.homedir(), "dev/warmersun/future-forge/trends/catalog.json"),
    path.join(ROOT, "../warmersun/future-forge/trends/catalog.json"),
    // Bundled research fixtures for offline / pre-publish demos
    path.join(ROOT, "test/fixtures/trends/catalog.json"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Resolve remote catalog URL or local path from env.
 * Empty / "0" / "off" / "false" disables remote fetch.
 * Unset: local warmersun checkout → warmersun.com.
 * @returns {string|null}
 */
export function resolveTrendsRemoteUrl() {
  const raw = process.env.FF_TRENDS_REMOTE_URL;
  if (raw !== undefined) {
    const s = String(raw).trim();
    if (!s || s === "0" || /^off$/i.test(s) || /^false$/i.test(s)) return null;
    return s;
  }
  return defaultLocalWarmersunTrendsCatalogPath() || DEFAULT_TRENDS_REMOTE_URL;
}

/**
 * Ordered catalog URLs to try when env is unset (or only the explicit env URL when set).
 * @param {string|null} [primary]
 * @returns {string[]}
 */
export function resolveTrendsRemoteUrlCandidates(
  primary = resolveTrendsRemoteUrl()
) {
  if (!primary) return [];
  const raw = process.env.FF_TRENDS_REMOTE_URL;
  if (raw !== undefined) return [primary];
  const out = [primary];
  if (primary !== DEFAULT_TRENDS_REMOTE_URL) out.push(DEFAULT_TRENDS_REMOTE_URL);
  return [...new Set(out.filter(Boolean))];
}

/**
 * @param {string} catalogRef
 * @returns {boolean}
 */
function isLocalCatalogPath(catalogRef) {
  if (!catalogRef) return false;
  if (catalogRef.startsWith("file:")) return true;
  if (/^https?:\/\//i.test(catalogRef)) return false;
  return true;
}

/**
 * @param {string} catalogRef
 */
function localCatalogPath(catalogRef) {
  if (catalogRef.startsWith("file:")) {
    return fileURLToPath(catalogRef);
  }
  return path.isAbsolute(catalogRef) ? catalogRef : path.join(ROOT, catalogRef);
}

/**
 * @param {string} catalogUrl
 * @param {string} file
 */
export function resolveTrendTileUrl(catalogUrl, file) {
  const name = String(file || "").replace(/^\/+/, "");
  if (isLocalCatalogPath(catalogUrl)) {
    const catPath = localCatalogPath(catalogUrl);
    return path.join(path.dirname(catPath), name);
  }
  const base = catalogUrl.replace(/\/?catalog\.json(?:\?.*)?$/i, "/");
  return new URL(name, base.endsWith("/") ? base : `${base}/`).href;
}

/**
 * @param {string} url
 * @param {number} [now]
 * @returns {string}
 */
export function withCacheBust(url, now = Date.now()) {
  const sep = String(url).includes("?") ? "&" : "?";
  return `${url}${sep}_=${now}`;
}

/**
 * Local catalog mtime (ms) when path exists; else 0.
 * @param {string} catalogRef
 */
function localCatalogMtimeMs(catalogRef) {
  try {
    const p = localCatalogPath(catalogRef);
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * @param {string} urlOrPath
 * @param {{ timeoutMs?: number, local?: boolean, force?: boolean, fetchImpl?: typeof fetch }} [opts]
 */
async function fetchText(urlOrPath, opts = {}) {
  if (opts.local || isLocalCatalogPath(urlOrPath)) {
    const p = opts.local ? urlOrPath : localCatalogPath(urlOrPath);
    return fs.readFileSync(p, "utf8");
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const fetchFn = opts.fetchImpl || fetch;
  const requestUrl = opts.force ? withCacheBust(urlOrPath) : urlOrPath;
  try {
    const res = await fetchFn(requestUrl, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`http_${res.status}`);
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @type {{
 *   url: string,
 *   at: number,
 *   ttlMs: number,
 *   trends: object[],
 *   errors: object[],
 *   ok: boolean,
 * } | null}
 */
let cache = null;

/**
 * @param {string} url
 * @param {{
 *   force?: boolean,
 *   ttlMs?: number,
 *   timeoutMs?: number,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
async function fetchOneRemoteCatalog(url, opts = {}) {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const localMode = isLocalCatalogPath(url);
  const localMtimeFresh =
    localMode &&
    cache &&
    cache.url === url &&
    localCatalogMtimeMs(url) > cache.at;

  if (
    !opts.force &&
    !localMtimeFresh &&
    cache &&
    cache.url === url &&
    now - cache.at < cache.ttlMs &&
    cache.ok
  ) {
    return {
      url,
      ok: true,
      trends: cache.trends,
      errors: cache.errors,
      cached: true,
    };
  }

  const { parseTrendJson, validateCapabilityTrend } = await import(
    pathToFileURL(path.join(ROOT, "js/capability-trend.js")).href
  );

  /** @type {object[]} */
  const trends = [];
  /** @type {{ file: string, error: string, details?: string[] }[]} */
  const errors = [];

  let catalogRaw;
  try {
    catalogRaw = await fetchText(url, {
      timeoutMs: opts.timeoutMs,
      local: localMode,
      force: opts.force,
      fetchImpl: opts.fetchImpl,
    });
  } catch (e) {
    const err = {
      file: url,
      error:
        e?.name === "AbortError" ? "timeout" : e?.message || "catalog_fetch_failed",
    };
    if (cache && cache.url === url && cache.trends.length) {
      return {
        url,
        ok: false,
        trends: cache.trends,
        errors: [err, ...cache.errors],
        cached: true,
      };
    }
    return { url, ok: false, trends: [], errors: [err], cached: false };
  }

  let catalog;
  try {
    catalog = JSON.parse(catalogRaw);
  } catch {
    return {
      url,
      ok: false,
      trends: [],
      errors: [{ file: url, error: "catalog_invalid_json" }],
      cached: false,
    };
  }

  const list = Array.isArray(catalog?.trends) ? catalog.trends : [];

  for (const entry of list) {
    const file = String(entry?.file || "").trim();
    if (!file) {
      errors.push({ file: String(entry?.id || "?"), error: "missing_file" });
      continue;
    }
    const tileUrl = resolveTrendTileUrl(url, file);
    let raw;
    try {
      raw = await fetchText(tileUrl, {
        timeoutMs: opts.timeoutMs,
        local: localMode,
        force: opts.force,
        fetchImpl: opts.fetchImpl,
      });
    } catch (e) {
      errors.push({
        file,
        error:
          e?.name === "AbortError" ? "timeout" : e?.message || "tile_fetch_failed",
      });
      continue;
    }

    const parsed = parseTrendJson(raw);
    if (!parsed.ok) {
      errors.push({ file, error: parsed.error || "invalid_json" });
      continue;
    }

    const v = validateCapabilityTrend(parsed.value);
    if (!v.ok) {
      errors.push({
        file,
        error: v.error || "validation_failed",
        details: v.details,
      });
      continue;
    }

    trends.push({
      ...v.trend,
      file,
      remoteUrl: tileUrl,
      source: "catalog",
    });
  }

  const result = {
    url,
    ok: true,
    trends,
    errors,
    cached: false,
  };

  cache = {
    url,
    at: Date.now(),
    ttlMs,
    trends,
    errors,
    ok: true,
  };

  return result;
}

/**
 * @param {string|null} [url]
 * @param {{
 *   force?: boolean,
 *   ttlMs?: number,
 *   timeoutMs?: number,
 *   tryFallbacks?: boolean,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export async function fetchRemoteTrendCatalog(
  url = resolveTrendsRemoteUrl(),
  opts = {}
) {
  if (!url) {
    return { url: null, ok: true, trends: [], errors: [], cached: false };
  }

  const tryFallbacks =
    opts.tryFallbacks !== false && process.env.FF_TRENDS_REMOTE_URL === undefined;
  const candidates = tryFallbacks
    ? resolveTrendsRemoteUrlCandidates(url)
    : [url];

  /** @type {{ file: string, error: string }[]} */
  const attemptErrors = [];
  for (const candidate of candidates) {
    const r = await fetchOneRemoteCatalog(candidate, opts);
    if (r.ok && r.trends.length) {
      if (attemptErrors.length) {
        r.errors = [...attemptErrors, ...r.errors];
      }
      return r;
    }
    if (r.ok && !r.trends.length && !r.errors.length) {
      return r;
    }
    attemptErrors.push(
      ...(r.errors || []),
      ...(r.ok ? [] : [{ file: candidate, error: "catalog_unavailable" }])
    );
    if (r.ok) return r;
  }

  if (cache && cache.trends.length) {
    return {
      url: cache.url,
      ok: false,
      trends: cache.trends,
      errors: attemptErrors,
      cached: true,
    };
  }

  return {
    url: candidates[0] || url,
    ok: false,
    trends: [],
    errors: attemptErrors,
    cached: false,
  };
}

/** Test helper */
export function _resetRemoteTrendCache() {
  cache = null;
}
