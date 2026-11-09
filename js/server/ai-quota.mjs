/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Hosted Cloud AI quota. Self-host (cloudAi off) is not metered.
 * Rates are FF_QUOTA_*; the monthly allowance is FF_CLOUD_AI_BUDGET.
 * Ledger amounts are integer points. One point is one quota unit.
 * In-process fields named *Micro are that integer, not dollars.
 */

import { createHmac } from "node:crypto";
import { timingSafeEqualStr } from "./admin-gate.mjs";

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  "Hosted AI requires a Warmer Sun Cloud AI top-up ($20 for 15,000 points).";

export const QUOTA_SPENT_MESSAGE =
  "Your 15,000 AI points are spent. Reset your usage ($20 for 15,000 points) to keep using the AI co-inventor, images, voice, and speech.";

export const QUOTA_UNAVAILABLE_MESSAGE =
  "Could not check the AI usage quota. Try again in a moment.";

/** Tokens or characters per point block. Leftover counts round up to the next block. */
export const QUOTA_BLOCK = 1000;

export const DEFAULT_QUOTA_RATES = {
  textInPerKTok: 2,
  textOutPerKTok: 6,
  image: 20,
  ttsPerKChar: 15,
  voicePerMin: 80,
};

export const DEFAULT_BUDGET_POINTS = 15000;
export const TOPUP_PRICE_USD = 20;
export const TOPUP_PERIOD_START = "1970-01-01T00:00:00.000Z";
const STRIPE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
export const DEFAULT_STRIPE_TOLERANCE_SEC = 300;
/** Reasoning headroom added on top of the text ceiling. Not the whole deposit. */
export const DEFAULT_TEXT_HOLD_POINTS = 20;
export const DEFAULT_TEXT_MAX_OUT = 8192;
/** Room seats keep a portal-signed grant this long. Entitlement is rechecked at reserve. */
export const QUOTA_GRANT_TTL_MS = 12 * 60 * 60 * 1000;
export const DEFAULT_PLAN_SLUGS = ["cloud"];
export const DEFAULT_CONTENT_PLAN_SLUGS = ["content"];
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
 * Paid-catalog plan slugs. Cloud slugs are not listed here; cloud includes them.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function contentPlanSlugsFromEnv(env = process.env) {
  const raw = String(env.FF_CONTENT_PLAN_SLUGS ?? "").trim();
  if (!raw) return [...DEFAULT_CONTENT_PLAN_SLUGS];
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
 * Points for one started minute. $0.08 is 80 points.
 * The configured integer is the whole charge.
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
 * Stripe Payment Link URL for the $20 / 15,000-point AI usage reset.
 * Appends `client_reference_id` when a Clerk user ID is provided.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {string} [userId]
 */
export function topUpUrlFromEnv(env = process.env, userId = "") {
  const raw = String(env?.FF_STRIPE_TOPUP_URL || env?.STRIPE_PAYMENT_LINK_URL || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const uid = String(userId || "").trim();
    if (uid && STRIPE_ID_RE.test(uid)) {
      url.searchParams.set("client_reference_id", uid);
    }
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Verify a Stripe webhook payload signed with `Stripe-Signature: t=...,v1=...`.
 * @param {string} rawBody
 * @param {string|null|undefined} signatureHeader
 * @param {string} secret
 * @param {{ nowSec?: number, toleranceSec?: number }} [opts]
 */
export function verifyStripeWebhook(rawBody, signatureHeader, secret, opts = {}) {
  const key = String(secret || "").trim();
  const header = String(signatureHeader || "").trim();
  if (!key || !header || typeof rawBody !== "string") {
    throw new Error("Missing Stripe webhook signature or secret");
  }
  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t" && /^\d+$/.test(v)) timestamp = Number(v);
    if (k === "v1" && /^[0-9a-fA-F]{64}$/.test(v)) signatures.push(v.toLowerCase());
  }
  if (!Number.isSafeInteger(timestamp) || signatures.length === 0) {
    throw new Error("Malformed Stripe-Signature header");
  }
  const nowSec = Number.isFinite(opts.nowSec) ? Number(opts.nowSec) : Math.floor(Date.now() / 1000);
  const toleranceSec = Number.isFinite(opts.toleranceSec)
    ? Math.max(0, Number(opts.toleranceSec))
    : DEFAULT_STRIPE_TOLERANCE_SEC;
  if (Math.abs(nowSec - timestamp) > toleranceSec) {
    throw new Error("Stripe webhook timestamp outside tolerance");
  }
  const expected = createHmac("sha256", key)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const matched = signatures.some((sig) => timingSafeEqualStr(sig, expected));
  if (!matched) {
    throw new Error("Stripe webhook signature mismatch");
  }
  return JSON.parse(rawBody);
}

/**
 * Plan a verified Stripe webhook event.
 * Paid `checkout.session.completed` (or `checkout.session.async_payment_succeeded`)
 * resets the buyer's AI usage period (`spent_points = 0`) for `client_reference_id`.
 * @param {object} evt
 */
export function planStripeWebhookEvent(evt) {
  const id = String(evt?.id || "").trim();
  if (!STRIPE_ID_RE.test(id)) return { ok: false, error: "invalid_event" };
  const type = String(evt?.type || "").trim();
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") {
    return { ok: true, id, action: "ignore" };
  }
  const session = evt?.data?.object;
  if (type === "checkout.session.completed") {
    const paymentStatus = String(session?.payment_status || "").trim().toLowerCase();
    if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
      return { ok: true, id, action: "ignore" };
    }
  }
  const rawUser = String(
    session?.client_reference_id ||
      session?.metadata?.clerk_user_id ||
      session?.metadata?.userId ||
      ""
  ).trim();
  if (!STRIPE_ID_RE.test(rawUser)) {
    return { ok: false, error: "invalid_user" };
  }
  return { ok: true, id, action: "reset_ai_usage", userId: rawUser };
}

/**
 * Paid catalog access. True only for an active (or in-grace canceled) Content plan.
 * @param {{ status?: string, planSlug?: string, periodEnd?: unknown, now?: number|Date, env?: NodeJS.ProcessEnv|Record<string, string|undefined>, contentSlugs?: string[] }} [input]
 */
export function contentEntitled(input = {}) {
  const env = input.env;
  const content = Array.isArray(input.contentSlugs)
    ? input.contentSlugs
    : contentPlanSlugsFromEnv(env || {});
  const allowedSlugs = [];
  for (const slug of content) {
    if (slug && !allowedSlugs.includes(slug)) allowedSlugs.push(slug);
  }
  return subscriptionEntitled({
    status: input.status,
    planSlug: input.planSlug,
    periodEnd: input.periodEnd,
    now: input.now,
    allowedSlugs,
  });
}

/**
 * True when the user has purchased a top-up and has points remaining.
 * @param {object|null|undefined} usageRow
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function topUpEntitled(usageRow, env = process.env) {
  if (!usageRow || typeof usageRow !== "object") return false;
  const rowBudget = usagePoints(usageRow.budget_points ?? usageRow.budget);
  const budget = rowBudget > 0 ? rowBudget : budgetMicroFromEnv(env);
  const spent = usagePoints(usageRow.spent_points ?? usageRow.spent);
  const held = usagePoints(usageRow.held_points ?? usageRow.held);
  return budget - spent - held > 0;
}

/**
 * Public subscription slice of /api/me. Allowance numbers are `usage`, not here.
 * `entitled` is hosted AI access (top-up balance > 0). `content` is paid catalog access.
 * @param {object|null|undefined} sub
 * @param {{ subscribeUrl?: string, topUpUrl?: string, topUpEntitled?: boolean, allowedSlugs?: string[], contentSlugs?: string[], env?: NodeJS.ProcessEnv|Record<string, string|undefined>, now?: number|Date }} [opts]
 */
export function subscriptionView(sub, opts = {}) {
  const entitled =
    typeof opts.topUpEntitled === "boolean"
      ? opts.topUpEntitled
      : subscriptionEntitled({
          status: sub?.status,
          planSlug: sub?.plan_slug,
          periodEnd: sub?.period_end,
          now: opts.now,
          allowedSlugs: opts.allowedSlugs,
        });
  const content = contentEntitled({
    status: sub?.status,
    planSlug: sub?.plan_slug,
    periodEnd: sub?.period_end,
    now: opts.now,
    env: opts.env,
    contentSlugs: opts.contentSlugs,
  });
  const view = {
    entitled,
    content,
    planSlug: sub?.plan_slug || null,
    status: sub?.status || null,
    subscribeUrl: String(opts.subscribeUrl || ""),
  };
  if (opts.topUpUrl) view.topUpUrl = String(opts.topUpUrl);
  return view;
}

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

/**
 * Period key shared with reserve. Null when period_start is set but not a date,
 * so the meter does not read a different month than the ledger.
 * @param {object|null|undefined} sub
 * @param {number|Date} [now]
 */
export function usagePeriodStart(sub, now = Date.now()) {
  if (sub?.period_start) {
    const d = new Date(sub.period_start);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toISOString();
  }
  return monthPeriodStart(now);
}

function usagePoints(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function usagePeriodEnd(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * Player-facing allowance. Held points are already unavailable.
 * Remaining is clamped at zero. Before the first top-up (`hasTopUp: false`),
 * `remaining` is 0 (`0 used · 0 left`).
 * @param {{ entitled?: boolean, hasTopUp?: boolean, budget?: unknown, spent?: unknown, held?: unknown, periodEnd?: unknown, resetAt?: unknown, topUpUrl?: string }} [input]
 */
export function usageView(input = {}) {
  if (!input?.entitled) return null;
  const budget = usagePoints(input.budget);
  const hasTopUp = input.hasTopUp !== false;
  const spent = hasTopUp ? usagePoints(input.spent) : 0;
  const held = hasTopUp ? usagePoints(input.held) : 0;
  const remaining = hasTopUp ? Math.max(0, budget - spent - held) : 0;
  const resetAt = hasTopUp ? usagePeriodEnd(input.resetAt) : null;
  const view = {
    budget,
    spent,
    held,
    remaining,
    periodEnd: usagePeriodEnd(input.periodEnd),
  };
  if (resetAt) view.resetAt = resetAt;
  if (input.topUpUrl) view.topUpUrl = String(input.topUpUrl);
  return view;
}

/**
 * Ledger read for signed-in /api/me. Throws on query failure so the route can
 * return usage null without failing the rest of the account payload.
 * @param {(sql: string, params?: unknown[]) => Promise<{ rows?: object[] }>} query
 * @param {string} userId
 * @param {object|null|undefined} sub
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export async function usageForAccount(query, userId, sub, env = process.env) {
  const uid = String(userId || "").trim();
  if (!uid || typeof query !== "function") return null;
  const row = (await query(
    `SELECT budget_points, spent_points, held_points, updated_at FROM ai_usage_period
     WHERE clerk_user_id = $1 AND period_start = $2`,
    [uid, TOPUP_PERIOD_START]
  ))?.rows?.[0] || null;
  const defaultBudget = budgetMicroFromEnv(env);
  const rowBudget = row?.budget_points != null ? usagePoints(row.budget_points) : 0;
  return usageView({
    entitled: true,
    hasTopUp: Boolean(row),
    budget: row && rowBudget > 0 ? rowBudget : defaultBudget,
    spent: row?.spent_points,
    held: row?.held_points,
    periodEnd: null,
    resetAt: row?.updated_at,
    topUpUrl: topUpUrlFromEnv(env, uid),
  });
}
