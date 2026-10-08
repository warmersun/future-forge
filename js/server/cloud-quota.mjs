/**
 * Portal-side subscription check + quota hold/settle.
 * Game calls this over HTTP. Self-host never reaches here.
 */

import { timingSafeEqualStr } from "./admin-gate.mjs";
import {
  budgetMicroFromEnv,
  cloudAiDecision,
  holdMicroFor,
  isQuotaKind,
  monthPeriodStart,
  planSlugsFromEnv,
  quotaRatesFromEnv,
  settleMicroFor,
  signQuotaGrant,
  SUBSCRIPTION_REQUIRED_MESSAGE,
  QUOTA_SPENT_MESSAGE,
  QUOTA_UNAVAILABLE_MESSAGE,
  subscriptionEntitled,
  textMaxOutFromEnv,
  verifyQuotaGrant,
  voiceConnectedMinuteMicro,
  voiceMaxMsFromEnv,
} from "./ai-quota.mjs";
import {
  getAiReservation,
  getQuotaGrantSecret,
  getSubscription,
  reserveAiBudget,
  settleAiReservation,
} from "./db.mjs";

/**
 * @param {string} [origin]
 */
export function subscribeUrlFromEnv(env = process.env) {
  const origin = String(env.FF_PUBLIC_ORIGIN || "https://cloud.warmersun.com")
    .trim()
    .replace(/\/$/, "");
  return `${origin}/subscribe`;
}

/**
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.kind
 * @param {number} [input.chars]
 * @param {number} [input.inputTokens]
 * @param {NodeJS.ProcessEnv} [input.env]
 * @param {number|Date} [input.now]
 */
export async function reserveQuota(input) {
  const env = input.env || process.env;
  const kind = String(input.kind || "");
  const subscribeUrl = subscribeUrlFromEnv(env);
  if (!isQuotaKind(kind)) {
    return { ok: false, status: 400, error: "bad_kind", subscribeUrl };
  }
  const userId = String(input.userId || "").trim();
  if (!userId) {
    return {
      ok: false,
      status: 402,
      error: "subscription_required",
      message: SUBSCRIPTION_REQUIRED_MESSAGE,
      subscribeUrl,
    };
  }
  const sub = await getSubscription(userId);
  const now = input.now || Date.now();
  const entitled = subscriptionEntitled({
    status: sub?.status,
    planSlug: sub?.plan_slug,
    periodEnd: sub?.period_end,
    now,
    allowedSlugs: planSlugsFromEnv(env),
  });
  if (!entitled) {
    return {
      ok: false,
      status: 402,
      error: "subscription_required",
      message: SUBSCRIPTION_REQUIRED_MESSAGE,
      subscribeUrl,
    };
  }
  const rates = quotaRatesFromEnv(env);
  const periodStart = sub?.period_start
    ? new Date(sub.period_start).toISOString()
    : monthPeriodStart(now);
  const maxVoiceMs = voiceMaxMsFromEnv(env);
  let reserved;
  try {
    reserved = await reserveAiBudget({
      userId,
      periodStart,
      budgetMicro: budgetMicroFromEnv(env),
      kind,
      quoteHold: (remaining) =>
        holdMicroFor(kind, {
          remainingMicro: remaining,
          chars: input.chars,
          inputTokens: input.inputTokens,
          rates,
          env,
          maxVoiceMs,
        }),
    });
  } catch (e) {
    console.warn("[quota] reserve", e?.message || e);
    return {
      ok: false,
      status: 503,
      error: "quota_unavailable",
      message: QUOTA_UNAVAILABLE_MESSAGE,
      subscribeUrl,
    };
  }
  if (!reserved.ok) {
    const spent = reserved.error === "quota_spent";
    return {
      ok: false,
      status: reserved.status || (spent ? 429 : 503),
      error: spent ? "quota_spent" : reserved.error || "quota_unavailable",
      message: spent ? QUOTA_SPENT_MESSAGE : QUOTA_UNAVAILABLE_MESSAGE,
      subscribeUrl,
      remainingMicro: reserved.remainingMicro,
    };
  }
  const decision = cloudAiDecision({
    cloudAi: true,
    signedIn: true,
    entitled: true,
    remainingMicro: reserved.remainingMicro + reserved.holdMicro,
    holdMicro: reserved.holdMicro,
  });
  if (!decision.ok) {
    await settleAiReservation({ reservationId: reserved.reservationId, actualMicro: 0 });
    return { ...decision, subscribeUrl };
  }
  return {
    ok: true,
    reservationId: reserved.reservationId,
    settleToken: reserved.settleToken,
    userId: reserved.userId,
    holdMicro: reserved.holdMicro,
    remainingMicro: reserved.remainingMicro,
    maxOutputTokens: kind === "text" ? textMaxOutFromEnv(env) : 0,
    minuteMicro: kind === "voice" ? voiceConnectedMinuteMicro(rates) : 0,
    subscribeUrl,
  };
}

/**
 * Grant for a user whose Clerk JWT portal just verified.
 * @param {string} userId
 */
export async function quotaGrantForUser(userId) {
  const secret = await getQuotaGrantSecret();
  if (!secret) return null;
  const grant = signQuotaGrant(userId, secret);
  return grant || null;
}

/**
 * @param {string} grant
 * @returns {Promise<string|null>}
 */
export async function quotaGrantUserId(grant) {
  const secret = await getQuotaGrantSecret();
  if (!secret) return null;
  return verifyQuotaGrant(grant, secret);
}

/**
 * @param {object} input
 * @param {string} input.reservationId
 * @param {string} [input.userId]
 * @param {string} [input.settleToken]
 * @param {boolean} [input.release]
 * @param {number} [input.inputTokens]
 * @param {number} [input.outputTokens]
 * @param {number} [input.chars]
 * @param {number} [input.durationMs]
 * @param {boolean} [input.bill]
 * @param {NodeJS.ProcessEnv} [input.env]
 */
export async function settleQuota(input) {
  const id = String(input?.reservationId || "").trim();
  if (!id) return { ok: false, status: 400, error: "bad_settle" };
  const row = await getAiReservation(id);
  if (!row) return { ok: false, status: 404, error: "not_found" };
  const userId = String(input?.userId || "").trim();
  const token = String(input?.settleToken || "").trim();
  const tokenOk =
    Boolean(token) &&
    Boolean(row.settle_token) &&
    timingSafeEqualStr(token, String(row.settle_token));
  if (!userId || userId !== row.clerk_user_id || !tokenOk) {
    return { ok: false, status: 403, error: "quota_forbidden" };
  }
  if (row.settled) return { ok: true, idempotent: true };
  const env = input.env || process.env;
  const rates = quotaRatesFromEnv(env);
  const actual = settleMicroFor(
    row.kind,
    {
      release: Boolean(input.release),
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      chars: input.chars,
      durationMs: input.durationMs,
      bill: Boolean(input.bill),
    },
    rates
  );
  return settleAiReservation({
    reservationId: id,
    actualMicro: actual,
    budgetMicro: budgetMicroFromEnv(env),
  });
}
