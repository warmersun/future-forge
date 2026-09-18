/**
 * Server-side TypeSafe (Jev) client. Never import from browser code.
 * Key: FF_TYPESAFE_API_KEY, else TYPESAFE_API_KEY. Missing key → null (regex fallback).
 */

import { TypeSafeClient } from "@typesafe-ai/sdk";

export const DEFAULT_TYPESAFE_MODEL = "jev-latest";
export const DEFAULT_TYPESAFE_TIMEOUT_MS = 10_000;

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function resolveTypeSafeApiKey(env = process.env) {
  const ff = String(env?.FF_TYPESAFE_API_KEY || "").trim();
  if (ff) return ff;
  return String(env?.TYPESAFE_API_KEY || "").trim();
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function resolveTypeSafeModel(env = process.env) {
  const m = String(
    env?.FF_TYPESAFE_MODEL || env?.TYPESAFE_DEFAULT_MODEL || ""
  ).trim();
  return m || DEFAULT_TYPESAFE_MODEL;
}

/**
 * JSON-safe TypeSafe questions for inspect (instructions + criteria).
 * @param {object} [questions]
 */
export function jsonSafeQuestions(questions = {}) {
  const out = {};
  for (const [id, q] of Object.entries(questions || {})) {
    if (!q || typeof q !== "object") continue;
    out[id] = {
      type: q.type || null,
      instructions: q.instructions ?? null,
      criteria: q.criteria ?? null,
    };
  }
  return out;
}

/**
 * Inspect blob for the AI inspect Jev row. Keep it JSON-safe and small.
 * Null when systemOne never ran (no model and no usage).
 * @param {object|null|undefined} judged
 * @param {{ state?: object, answers?: object, ms?: number, model?: string, usage?: object, questions?: object }} [extra]
 */
export function typesafeTraceOf(judged, extra = {}) {
  const model = judged?.model || extra.model || null;
  const usage = judged?.usage || extra.usage || null;
  if (!model && !usage) return null;
  return {
    model,
    usage,
    ms: Number.isFinite(Number(extra.ms)) ? Math.max(0, Math.round(Number(extra.ms))) : null,
    state: extra.state || null,
    questions: extra.questions || judged?.questions || null,
    answers: extra.answers != null ? extra.answers : null,
  };
}

/**
 * Overlay failure for inspect. Not a successful typesafe source.
 * @param {unknown} err
 * @param {string} [mode]
 */
export function typesafeErrorOf(err, mode) {
  return {
    message: String(err?.message || err).slice(0, 200),
    mode: mode ? String(mode) : null,
  };
}

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv|Record<string, string|undefined>,
 *   apiKey?: string,
 *   model?: string,
 *   timeout?: number,
 *   fetch?: typeof fetch,
 *   logLevel?: "debug"|"info"|"warn"|"error"|"off",
 * }} [opts]
 * @returns {TypeSafeClient|null}
 */
export function getTypeSafeClient(opts = {}) {
  const env = opts.env || process.env;
  const apiKey =
    opts.apiKey != null
      ? String(opts.apiKey).trim()
      : resolveTypeSafeApiKey(env);
  if (!apiKey) return null;
  return new TypeSafeClient({
    apiKey,
    defaultModel: opts.model || resolveTypeSafeModel(env),
    timeout:
      Number.isFinite(opts.timeout) && opts.timeout > 0
        ? opts.timeout
        : DEFAULT_TYPESAFE_TIMEOUT_MS,
    logLevel: opts.logLevel || "warn",
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
  });
}
