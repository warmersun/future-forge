/**
 * Load the predictions bank for this server process.
 * Default: predictions/default.json. Side-load: FF_PREDICTIONS_FILE
 * (absolute or repo-relative path, file: URL, or https URL).
 * An invalid side-load falls back to the default and reports errors.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TECHS } from "./data.js";
import {
  parsePredictionsJson,
  validatePredictionsBank,
  setWorldForesightBank,
  getWorldForesightBank,
} from "./sim/world-foresight.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export const DEFAULT_PREDICTIONS_FILE = path.join(ROOT, "predictions/default.json");

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * @typedef {object} PredictionsLoadResult
 * @property {boolean} ok — a bank is active
 * @property {string} source — what is active (path or URL)
 * @property {string} requested — what FF_PREDICTIONS_FILE asked for
 * @property {boolean} fallback — requested source failed; default is active
 * @property {number} count
 * @property {{ file: string, error: string, details?: string[] }[]} errors
 * @property {string[]} warnings
 */

/** @type {PredictionsLoadResult|null} */
let lastLoad = null;

/**
 * @param {Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function resolvePredictionsSource(env = process.env) {
  const raw = String(env?.FF_PREDICTIONS_FILE || "").trim();
  if (!raw) return DEFAULT_PREDICTIONS_FILE;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("file:")) return fileURLToPath(raw);
  return path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
}

/**
 * @param {string} ref
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 */
async function readSource(ref, opts = {}) {
  if (!/^https?:\/\//i.test(ref)) return fs.readFileSync(ref, "utf8");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await (opts.fetchImpl || fetch)(ref, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`http_${res.status}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {string} ref
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean, bank?: object, error?: string, details?: string[], warnings: string[] }>}
 */
async function readAndValidate(ref, opts) {
  let text;
  try {
    text = await readSource(ref, opts);
  } catch (e) {
    const error =
      e?.name === "AbortError"
        ? "timeout"
        : e?.code === "ENOENT"
          ? "file_not_found"
          : e?.message || "read_failed";
    return { ok: false, error, warnings: [] };
  }
  const parsed = parsePredictionsJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error, warnings: [] };
  const v = validatePredictionsBank(
    parsed.value,
    TECHS.map((t) => t.id)
  );
  if (!v.ok || !v.bank) {
    return {
      ok: false,
      error: v.error || "validation_failed",
      details: v.errors.slice(0, 20),
      warnings: v.warnings,
    };
  }
  return { ok: true, bank: v.bank, warnings: v.warnings };
}

/**
 * Load, validate, and activate the bank.
 * @param {{
 *   source?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   defaultFile?: string,
 * }} [opts]
 * @returns {Promise<PredictionsLoadResult>}
 */
export async function loadPredictionsBank(opts = {}) {
  const requested = opts.source || resolvePredictionsSource();
  const defaultFile = opts.defaultFile || DEFAULT_PREDICTIONS_FILE;
  /** @type {PredictionsLoadResult["errors"]} */
  const errors = [];

  const first = await readAndValidate(requested, opts);
  if (first.ok && first.bank) {
    setWorldForesightBank(first.bank);
    lastLoad = {
      ok: true,
      source: requested,
      requested,
      fallback: false,
      count: getWorldForesightBank().predictions.length,
      errors,
      warnings: first.warnings,
    };
    return lastLoad;
  }
  errors.push({
    file: requested,
    error: first.error || "load_failed",
    ...(first.details?.length ? { details: first.details } : {}),
  });

  if (requested !== defaultFile) {
    const fb = await readAndValidate(defaultFile, opts);
    if (fb.ok && fb.bank) {
      setWorldForesightBank(fb.bank);
      lastLoad = {
        ok: true,
        source: defaultFile,
        requested,
        fallback: true,
        count: getWorldForesightBank().predictions.length,
        errors,
        warnings: fb.warnings,
      };
      return lastLoad;
    }
    errors.push({
      file: defaultFile,
      error: fb.error || "load_failed",
      ...(fb.details?.length ? { details: fb.details } : {}),
    });
  }

  lastLoad = {
    ok: getWorldForesightBank().predictions.length > 0,
    source: lastLoad?.source || "",
    requested,
    fallback: false,
    count: getWorldForesightBank().predictions.length,
    errors,
    warnings: [],
  };
  return lastLoad;
}

/** @returns {PredictionsLoadResult|null} */
export function lastPredictionsLoad() {
  return lastLoad;
}

/**
 * Shared body for GET /api/predictions (game + portal servers).
 * @param {string|undefined} url
 */
export async function predictionsApiResponse(url) {
  const refresh = typeof url === "string" && /[?&]refresh=1(?:&|$)/.test(url);
  const load = refresh || !lastLoad ? await loadPredictionsBank() : lastLoad;
  return {
    ok: load.ok,
    source: displaySource(load.source),
    fallback: load.fallback,
    count: load.count,
    bank: getWorldForesightBank(),
    errors: load.errors.map((e) => ({ ...e, file: displaySource(e.file) })),
  };
}

/** Repo-relative path for local files so absolute paths never leave the server. */
export function displaySource(ref) {
  if (!ref || /^https?:\/\//i.test(ref)) return ref || "";
  const rel = path.relative(ROOT, ref);
  return rel && !rel.startsWith("..") ? rel : path.basename(ref);
}

/** Console lines for server boot. */
export function logPredictionsLoad(load, log = console) {
  if (!load) return;
  const where = displaySource(load.source);
  if (load.ok) {
    log.log(
      `Predictions bank: ${getWorldForesightBank().title} — ${load.count} row(s) from ${where}${
        load.fallback ? " (fallback)" : ""
      }`
    );
  } else {
    log.warn("Predictions bank: none loaded — year dialog and AI world clock are empty");
  }
  for (const e of load.errors) {
    log.warn(
      `  ${displaySource(e.file)}: ${e.error}${e.details?.length ? ` — ${e.details.slice(0, 3).join("; ")}` : ""}`
    );
  }
}
