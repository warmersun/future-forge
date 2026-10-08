/**
 * Hosted Cloud AI quota. Self-host (cloudAi off) is not metered.
 * Rates are FF_QUOTA_*; the monthly allowance is FF_CLOUD_AI_BUDGET.
 * Ledger amounts are integer points. One point is one quota unit.
 * In-process fields named *Micro are that integer, not dollars.
 */

import { createHmac } from "node:crypto";
import { timingSafeEqualStr } from "./admin-gate.mjs";

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  "The hosted co-inventor is a monthly subscription. Self-host if you want it free.";

export const QUOTA_SPENT_MESSAGE =
  "This period’s co-inventor budget is spent. It comes back when the subscription renews.";

export const QUOTA_UNAVAILABLE_MESSAGE =
  "Could not check the subscription quota. Try again in a moment.";

/** Tokens or characters per point block. Leftover counts round up to the next block. */
export const QUOTA_BLOCK = 1000;

export const DEFAULT_QUOTA_RATES = {
  textInPerKTok: 2,
  textOutPerKTok: 6,
  image: 20,
  ttsPerKChar: 15,
  voicePerMin: 160,
};

export const DEFAULT_BUDGET_POINTS = 5000;
/** Reasoning headroom added on top of the text ceiling. Not the whole deposit. */
export const DEFAULT_TEXT_HOLD_POINTS = 20;
export const DEFAULT_TEXT_MAX_OUT = 8192;
/** Room seats keep a portal-signed grant this long. Entitlement is rechecked at reserve. */
export const QUOTA_GRANT_TTL_MS = 12 * 60 * 60 * 1000;
export const DEFAULT_PLAN_SLUGS = ["cloud"];
export const DEFAULT_VOICE_MAX_MS = 600_000;

const KINDS = new Set(["text", "image", "tts", "voice"]);

/**
 * Non-negative integer. A fraction, negative, or non-numeric value uses fallback.
 * Zero is kept: that rate is free against the quota.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} env
 * @param {string} key
 * @param {number} fallback
 */
function pointsFromEnv(env, key, fallback) {
  if (env[key] == null || env[key] === "") return fallback;
  const raw = String(env[key]).trim();
  if (!/^\d+$/.test(raw)) return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n)) return fallback;
  return n;
}

/**
 * @param {unknown} count
 * @returns {number}
 */
function startedBlocks(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 0) return 0;
  return Math.ceil(n / QUOTA_BLOCK);
}

/**
 * @param {unknown} rate
 * @returns {number}
 */
function pointsRate(rate) {
  const n = Math.floor(Number(rate) || 0);
  return n > 0 ? n : 0;
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function quotaRatesFromEnv(env = process.env) {
  return {
    textInPerKTok: pointsFromEnv(env, "FF_QUOTA_TEXT_IN_PER_KTOK", DEFAULT_QUOTA_RATES.textInPerKTok),
    textOutPerKTok: pointsFromEnv(env, "FF_QUOTA_TEXT_OUT_PER_KTOK", DEFAULT_QUOTA_RATES.textOutPerKTok),
    image: pointsFromEnv(env, "FF_QUOTA_IMAGE", DEFAULT_QUOTA_RATES.image),
    ttsPerKChar: pointsFromEnv(env, "FF_QUOTA_TTS_PER_KCHAR", DEFAULT_QUOTA_RATES.ttsPerKChar),
    voicePerMin: pointsFromEnv(env, "FF_QUOTA_VOICE_PER_MIN", DEFAULT_QUOTA_RATES.voicePerMin),
  };
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function budgetMicroFromEnv(env = process.env) {
  return pointsFromEnv(env, "FF_CLOUD_AI_BUDGET", DEFAULT_BUDGET_POINTS);
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function textHoldMicroFromEnv(env = process.env) {
  return pointsFromEnv(env, "FF_QUOTA_TEXT_HOLD", DEFAULT_TEXT_HOLD_POINTS);
}

/**
 * Max output tokens priced into a text hold and applied to the provider call.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function textMaxOutFromEnv(env = process.env) {
  const n = Number(env?.FF_QUOTA_TEXT_MAX_OUT);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_TEXT_MAX_OUT;
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function planSlugsFromEnv(env = process.env) {
  const raw = String(env.FF_CLOUD_PLAN_SLUGS ?? "").trim();
  if (!raw) return [...DEFAULT_PLAN_SLUGS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function voiceMaxMsFromEnv(env = process.env) {
  const n = Number(env.FF_VOICE_MAX_MS);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_VOICE_MAX_MS;
}

/**
 * Points for one started minute of a two-way voice call.
 * The configured integer is the whole charge; it is not doubled per direction.
 * @param {{ voicePerMin?: number }} rates
 */
export function voiceConnectedMinuteMicro(rates) {
  return pointsRate(rates?.voicePerMin);
}

/**
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @param {{ textInPerKTok?: number, textOutPerKTok?: number }} rates
 */
export function quoteTextMicro(inputTokens, outputTokens, rates) {
  return (
    startedBlocks(inputTokens) * pointsRate(rates?.textInPerKTok) +
    startedBlocks(outputTokens) * pointsRate(rates?.textOutPerKTok)
  );
}

/**
 * @param {{ image?: number }} rates
 */
export function quoteImageMicro(rates) {
  return pointsRate(rates?.image);
}

/**
 * @param {number} chars
 * @param {{ ttsPerKChar?: number }} rates
 */
export function quoteTtsMicro(chars, rates) {
  return startedBlocks(chars) * pointsRate(rates?.ttsPerKChar);
}

/**
 * @param {number} durationMs
 * @param {{ voicePerMin?: number }} rates
 */
export function quoteVoiceMicro(durationMs, rates) {
  const ms = Math.max(0, Number(durationMs) || 0);
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60_000) * voiceConnectedMinuteMicro(rates);
}

/**
 * @param {string} kind
 */
export function isQuotaKind(kind) {
  return KINDS.has(String(kind || ""));
}

/**
 * Hold taken before the provider call. Voice depends on remaining budget.
 * @param {string} kind
 * @param {{ remainingMicro?: number, chars?: number, inputTokens?: number, rates: object, env?: object, maxVoiceMs?: number }} opts
 */
export function holdMicroFor(kind, opts) {
  const rates = opts.rates || {};
  const remaining = Math.max(0, Number(opts.remainingMicro) || 0);
  if (kind === "text") {
    const input = Math.max(0, Math.floor(Number(opts.inputTokens) || 0));
    return quoteTextMicro(input, textMaxOutFromEnv(opts.env), rates) + textHoldMicroFromEnv(opts.env);
  }
  if (kind === "image") return quoteImageMicro(rates);
  if (kind === "tts") return quoteTtsMicro(opts.chars, rates);
  if (kind === "voice") {
    const minute = voiceConnectedMinuteMicro(rates);
    if (minute > 0 && remaining < minute) return minute;
    const max = quoteVoiceMicro(opts.maxVoiceMs ?? DEFAULT_VOICE_MAX_MS, rates);
    if (max <= 0) return 0;
    return Math.min(remaining, max);
  }
  return 0;
}

/**
 * What a settle may add to spent. Never more than this hold, and never past the budget
 * once other holds are kept. A missing budget clamps to the hold only.
 * @param {{ actualMicro?: number, heldMicro?: number, budgetMicro?: number|null, spentMicro?: number, heldTotalMicro?: number }} input
 */
export function chargeMicro(input = {}) {
  const actual = Math.max(0, Math.floor(Number(input.actualMicro) || 0));
  const held = Math.max(0, Math.floor(Number(input.heldMicro) || 0));
  const capByBudget = input.budgetMicro != null && input.budgetMicro !== "";
  let room = held;
  if (capByBudget) {
    const budget = Math.max(0, Math.floor(Number(input.budgetMicro) || 0));
    const spent = Math.max(0, Math.floor(Number(input.spentMicro) || 0));
    const heldTotal = Math.max(0, Math.floor(Number(input.heldTotalMicro) || 0));
    const other = Math.max(0, heldTotal - held);
    room = Math.max(0, budget - spent - other);
  }
  return Math.min(actual, held, room);
}

/**
 * HMAC grant proving portal saw this user's Clerk JWT. The signing key stays in Neon.
 * @param {string} userId
 * @param {string} secret
 * @param {number} [now]
 */
export function signQuotaGrant(userId, secret, now = Date.now()) {
  const uid = String(userId || "").trim();
  const key = String(secret || "");
  if (!uid || !key) return "";
  const exp = now + QUOTA_GRANT_TTL_MS;
  const body = Buffer.from(JSON.stringify({ u: uid, e: exp })).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/**
 * @param {string} grant
 * @param {string} secret
 * @param {number} [now]
 * @returns {string|null} clerk user id
 */
export function verifyQuotaGrant(grant, secret, now = Date.now()) {
  const key = String(secret || "");
  const raw = String(grant || "");
  const dot = raw.lastIndexOf(".");
  if (!key || dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  if (!timingSafeEqualStr(sig, expected)) return null;
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const uid = String(parsed?.u || "").trim();
  const exp = Number(parsed?.e);
  if (!uid || !Number.isFinite(exp) || now >= exp) return null;
  return uid;
}

/**
 * Actual charge after the call. `release` settles to 0.
 * @param {string} kind
 * @param {{ release?: boolean, inputTokens?: number, outputTokens?: number, chars?: number, durationMs?: number, bill?: boolean }} measure
 * @param {object} rates
 */
export function settleMicroFor(kind, measure = {}, rates = {}) {
  if (measure.release) return 0;
  if (kind === "text") return quoteTextMicro(measure.inputTokens, measure.outputTokens, rates);
  if (kind === "image") return measure.bill ? quoteImageMicro(rates) : 0;
  if (kind === "tts") return quoteTtsMicro(measure.chars, rates);
  if (kind === "voice") return quoteVoiceMicro(measure.durationMs, rates);
  return 0;
}

/**
 * @param {{ status?: string, planSlug?: string, periodEnd?: string|number|Date|null, now?: number|Date, allowedSlugs?: string[] }} input
 */
export function subscriptionEntitled(input = {}) {
  const slug = String(input.planSlug || "").trim();
  const allowed = Array.isArray(input.allowedSlugs) ? input.allowedSlugs : DEFAULT_PLAN_SLUGS;
  if (!slug || !allowed.includes(slug)) return false;
  const status = String(input.status || "")
    .trim()
    .toLowerCase();
  const now = input.now instanceof Date ? input.now.getTime() : Number(input.now) || Date.now();
  const endRaw = input.periodEnd;
  const end = endRaw ? new Date(endRaw).getTime() : null;
  const endOk = Number.isFinite(end);
  if (status === "active") {
    if (endOk && now >= end) return false;
    return true;
  }
  if (status === "canceled" || status === "cancelled") {
    return Boolean(endOk && now < end);
  }
  return false;
}

/**
 * @param {{ cloudAi?: boolean, signedIn?: boolean, entitled?: boolean, remainingMicro?: number, holdMicro?: number }} input
 */
export function cloudAiDecision(input = {}) {
  if (!input.cloudAi) return { ok: true, mode: "self-host" };
  if (!input.signedIn || !input.entitled) {
    return {
      ok: false,
      status: 402,
      error: "subscription_required",
      message: SUBSCRIPTION_REQUIRED_MESSAGE,
    };
  }
  const remaining = Math.max(0, Number(input.remainingMicro) || 0);
  const hold = Math.max(0, Number(input.holdMicro) || 0);
  if (hold > remaining) {
    return {
      ok: false,
      status: 429,
      error: "quota_spent",
      message: QUOTA_SPENT_MESSAGE,
    };
  }
  return { ok: true, mode: "user", remainingMicro: remaining, holdMicro: hold };
}

/**
 * UTC month start when a subscription row has no period_start.
 * @param {number|Date} [now]
 */
export function monthPeriodStart(now = Date.now()) {
  const d = now instanceof Date ? now : new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
