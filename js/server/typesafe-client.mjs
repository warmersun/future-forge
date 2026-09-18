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
/**
 * Inspect blob for the AI inspect Jev row. Keep it JSON-safe and small.
 * @param {object|null|undefined} judged
 * @param {{ state?: object, answers?: object, ms?: number }} [extra]
 */
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

export function typesafeTraceOf(judged, extra = {}) {
  if (!judged && !extra.answers) return null;
  return {
    model: judged?.model || extra.model || null,
    usage: judged?.usage || extra.usage || null,
    ms: Number.isFinite(Number(extra.ms)) ? Math.max(0, Math.round(Number(extra.ms))) : null,
    state: extra.state || null,
    questions: extra.questions || judged?.questions || null,
    answers: extra.answers != null ? extra.answers : null,
  };
}

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
