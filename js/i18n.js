/**
 * Lightweight i18n for Future Forge (no bundler).
 * English defaults live in call-site fallbacks / HTML; locale packs override via JSON.
 */

export const SUPPORTED_LOCALES = ["en", "hu", "fr", "es", "he"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "future-forge:locale";

/** Locales that use right-to-left document direction. */
export const RTL_LOCALES = ["he"];

/** @type {string} */
let locale = DEFAULT_LOCALE;

/** Nested catalog for the active non-en locale (or empty for en). */
let catalog = {};

/** Optional content overlays (globals, techs, …) loaded per locale. */
let contentCatalog = {};

let debugMissing = false;

const OUTPUT_LANGUAGE_NAMES = {
  en: "English",
  hu: "Hungarian",
  fr: "French",
  es: "Spanish",
  he: "Hebrew",
};

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLocale(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!s) return DEFAULT_LOCALE;
  if (SUPPORTED_LOCALES.includes(s)) return s;
  const base = s.split("-")[0];
  if (SUPPORTED_LOCALES.includes(base)) return base;
  return DEFAULT_LOCALE;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} key dotted path
 * @returns {unknown}
 */
function lookup(obj, key) {
  if (!obj || !key) return undefined;
  const parts = String(key).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * @param {string} template
 * @param {Record<string, string|number|boolean|null|undefined>} [vars]
 */
function interpolate(template, vars) {
  if (!vars || typeof template !== "string") return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      const v = vars[name];
      return v == null ? "" : String(v);
    }
    return `{${name}}`;
  });
}

/**
 * Translate a UI key. Falls back to defaultEn, then the key itself.
 * @param {string} key
 * @param {Record<string, string|number|boolean|null|undefined>|null} [vars]
 * @param {string} [defaultEn]
 * @returns {string}
 */
export function t(key, vars = null, defaultEn = "") {
  const found = lookup(catalog, key);
  let str;
  if (typeof found === "string" && found.length) {
    str = found;
  } else if (defaultEn) {
    str = defaultEn;
    if (debugMissing && locale !== DEFAULT_LOCALE) {
      console.warn(`[i18n] missing ${locale}: ${key}`);
    }
  } else {
    str = key;
    if (debugMissing && locale !== DEFAULT_LOCALE) {
      console.warn(`[i18n] missing ${locale}: ${key}`);
    }
  }
  return interpolate(str, vars || undefined);
}

/**
 * Content-pack string (techs, themes, …). Falls back to defaultEn.
 * @param {string} key
 * @param {string} [defaultEn]
 * @param {Record<string, string|number|boolean|null|undefined>|null} [vars]
 */
export function tc(key, defaultEn = "", vars = null) {
  const found = lookup(contentCatalog, key);
  if (typeof found === "string" && found.length) {
    return interpolate(found, vars || undefined);
  }
  if (defaultEn) return interpolate(String(defaultEn), vars || undefined);
  if (debugMissing && locale !== DEFAULT_LOCALE) {
    console.warn(`[i18n] missing content ${locale}: ${key}`);
  }
  return interpolate(String(defaultEn || key), vars || undefined);
}

/** Read nested content pack value (any type) */
export function contentLookup(key) {
  return lookup(contentCatalog, key);
}

export function getLocale() {
  return locale;
}

export function isLocale(code) {
  return locale === normalizeLocale(code);
}

/** BCP-47 / prompt helper */
export function outputLanguageName(code = locale) {
  const n = normalizeLocale(code);
  return OUTPUT_LANGUAGE_NAMES[n] || n;
}

/**
 * Whether this locale should present UI right-to-left.
 * @param {string} [code]
 * @returns {boolean}
 */
export function isRtlLocale(code = locale) {
  return RTL_LOCALES.includes(normalizeLocale(code));
}

/**
 * Document direction for a locale (`rtl` or `ltr`).
 * @param {string} [code]
 * @returns {"rtl"|"ltr"}
 */
export function documentDirection(code = locale) {
  return isRtlLocale(code) ? "rtl" : "ltr";
}

/**
 * BCP-47 language tag for `<html lang>` (maps our codes 1:1 for supported locales).
 * @param {string} [code]
 * @returns {string}
 */
export function htmlLang(code = locale) {
  return normalizeLocale(code);
}

/**
 * Fields to merge into /api/co-invent `context` so the model answers in the UI language.
 * @param {string} [code]
 * @returns {{ locale: string, outputLanguage: string }}
 */
export function aiLocaleContext(code = locale) {
  const loc = normalizeLocale(code);
  return {
    locale: loc,
    outputLanguage: outputLanguageName(loc),
  };
}

export function getDebugMissing() {
  return debugMissing;
}

export function setDebugMissing(on) {
  debugMissing = Boolean(on);
}

/**
 * Read stored locale preference (browser only).
 * @returns {string}
 */
export function readStoredLocale() {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_LOCALE;
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * @param {string} code
 */
function persistLocale(code) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    /* private mode */
  }
}

/**
 * @param {string} code
 * @returns {Promise<Record<string, unknown>>}
 */
async function fetchJsonPack(code, file) {
  const url = `locales/${code}/${file}`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`i18n pack ${url}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Load UI (+ optional content) packs for a locale. English clears overlays.
 * @param {string} code
 * @param {{ contentFiles?: string[] }} [opts]
 */
/** Default content shards loaded for every non-en locale. */
export const DEFAULT_CONTENT_FILES = [
  "domains.json",
  "shelves.json",
  "globals.json",
  "techs.json",
  "challenge-angles.json",
  "vision-stages.json",
  "year-news.json",
  "foresight.json",
  "missions.json",
  "problem-briefs.json",
  "scenario-seeds.json",
  "market-news.json",
];

export async function loadLocalePacks(code, opts = {}) {
  const loc = normalizeLocale(code);
  if (loc === DEFAULT_LOCALE) {
    catalog = {};
    contentCatalog = {};
    return { locale: loc, catalog, contentCatalog };
  }
  const ui = await fetchJsonPack(loc, "ui.json");
  catalog = ui && typeof ui === "object" ? ui : {};
  contentCatalog = {};
  const files =
    opts.contentFiles !== undefined ? opts.contentFiles : DEFAULT_CONTENT_FILES;
  for (const file of files) {
    try {
      const pack = await fetchJsonPack(loc, file);
      if (pack && typeof pack === "object") {
        const base = file.replace(/\.json$/i, "");
        contentCatalog[base] = pack;
      }
    } catch (e) {
      console.warn(`[i18n] optional content pack failed: ${file}`, e?.message || e);
    }
  }
  return { locale: loc, catalog, contentCatalog };
}

/**
 * Apply locale packs, persist, update <html lang>, notify listeners.
 * @param {string} code
 * @param {{ contentFiles?: string[], skipDom?: boolean, root?: ParentNode }} [opts]
 */
export async function setLocale(code, opts = {}) {
  const loc = normalizeLocale(code);
  await loadLocalePacks(loc, { contentFiles: opts.contentFiles });
  locale = loc;
  persistLocale(loc);
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLang(loc);
    document.documentElement.dir = documentDirection(loc);
    if (!opts.skipDom) {
      applyDomI18n(opts.root || document);
    }
    try {
      document.dispatchEvent(
        new CustomEvent("localechange", {
          detail: { locale: loc, dir: documentDirection(loc) },
        })
      );
    } catch {
      /* non-DOM */
    }
  }
  return loc;
}

/**
 * Boot: debug flag, stored preference, load packs, apply DOM.
 * @param {{ contentFiles?: string[] }} [opts]
 */
export async function initI18n(opts = {}) {
  if (typeof location !== "undefined") {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("i18nDebug") === "1" || q.get("i18nDebug") === "true") {
        debugMissing = true;
      }
      const qLoc = q.get("lang") || q.get("locale");
      if (qLoc) {
        await setLocale(qLoc, opts);
        return getLocale();
      }
    } catch {
      /* ignore */
    }
  }
  await setLocale(readStoredLocale(), opts);
  return getLocale();
}

/**
 * Apply data-i18n* attributes under root.
 * - data-i18n="key" → textContent (use data-i18n-html="1" for innerHTML — rare)
 * - data-i18n-placeholder, data-i18n-title, data-i18n-aria-label, data-i18n-label
 * English: attributes keep existing HTML as fallback when pack missing.
 * @param {ParentNode} [root]
 */
/**
 * Remember English source text once so switching back from HU → EN works
 * after textContent has already been replaced.
 * @param {Element} el
 * @param {string} attrName e.g. data-i18n-default
 * @param {string} current
 */
function captureDefault(el, attrName, current) {
  const existing = el.getAttribute(attrName);
  if (existing != null && existing !== "") return existing;
  const trimmed = String(current ?? "").trim();
  if (trimmed) el.setAttribute(attrName, trimmed);
  return trimmed;
}

export function applyDomI18n(root) {
  if (typeof document === "undefined") return;
  const scope = root || document;

  const textNodes = scope.querySelectorAll
    ? scope.querySelectorAll("[data-i18n]")
    : [];
  textNodes.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const useHtml = el.getAttribute("data-i18n-html") === "1";
    const raw = useHtml ? el.innerHTML : el.textContent;
    const fallback = captureDefault(el, "data-i18n-default", raw);
    const value = t(key, null, fallback);
    if (useHtml) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  const attrMap = [
    ["data-i18n-placeholder", "placeholder", "data-i18n-default-placeholder"],
    ["data-i18n-title", "title", "data-i18n-default-title"],
    ["data-i18n-aria-label", "aria-label", "data-i18n-default-aria-label"],
    ["data-i18n-label", "label", "data-i18n-default-label"],
    ["data-i18n-content", "content", "data-i18n-default-content"],
  ];
  for (const [dataAttr, prop, defaultAttr] of attrMap) {
    const nodes = scope.querySelectorAll ? scope.querySelectorAll(`[${dataAttr}]`) : [];
    nodes.forEach((el) => {
      const key = el.getAttribute(dataAttr);
      if (!key) return;
      const fallback = captureDefault(el, defaultAttr, el.getAttribute(prop) || "");
      el.setAttribute(prop, t(key, null, fallback));
    });
  }

  // <title data-i18n="meta.documentTitle"> (may be outside body root)
  if (typeof document !== "undefined") {
    const titleEl = document.querySelector("title[data-i18n]");
    if (
      titleEl &&
      (scope === document ||
        scope === document.documentElement ||
        scope.contains?.(titleEl) ||
        !root)
    ) {
      const key = titleEl.getAttribute("data-i18n");
      const fallback = captureDefault(
        titleEl,
        "data-i18n-default",
        titleEl.textContent || ""
      );
      titleEl.textContent = t(key, null, fallback);
    }
  }
}

/**
 * Scope a storage key by locale (scenario caches, etc.).
 * English keeps the base key for backward compatibility.
 * @param {string} baseKey
 * @param {string} [loc]
 */
export function localeStorageKey(baseKey, loc = locale) {
  const n = normalizeLocale(loc);
  if (n === DEFAULT_LOCALE) return baseKey;
  return `${baseKey}:${n}`;
}

/** Test helper — inject catalog without fetch */
export function _setCatalogForTests(nextCatalog, nextLocale = "hu") {
  catalog = nextCatalog && typeof nextCatalog === "object" ? nextCatalog : {};
  locale = normalizeLocale(nextLocale);
}

export function _setContentCatalogForTests(next) {
  contentCatalog = next && typeof next === "object" ? next : {};
}

export function _resetI18nForTests() {
  locale = DEFAULT_LOCALE;
  catalog = {};
  contentCatalog = {};
  debugMissing = false;
}
