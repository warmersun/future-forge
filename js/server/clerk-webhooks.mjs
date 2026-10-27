/**
 * Clerk → Neon user lifecycle. Identity stays in Clerk; we only key rows.
 * Never copy first_name / last_name / full_name (legal names) onto our profile.
 */

import { clerkKeysFromEnv, normalizeClerkUserId } from "./clerk-auth.mjs";
import { contentPlanSlugsFromEnv, planSlugsFromEnv } from "./ai-quota.mjs";
import { foundingCodes } from "./achievements.mjs";
import { sanitizeUsername } from "./profile.mjs";

const FREE_PLAN_SLUGS = new Set(["free_user", "free_org"]);

/**
 * Cloud outranks content. Unknown paid slugs normalize to cloud, so they outrank content too.
 * Free plans rank 0.
 * @param {unknown} raw
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
function storedPlanRank(raw, env) {
  const slug = String(raw || "").trim();
  if (!slug || FREE_PLAN_SLUGS.has(slug)) return 0;
  const stored = entitledPlanSlug(slug, env);
  if (!stored || FREE_PLAN_SLUGS.has(stored)) return 0;
  if (planSlugsFromEnv(env).includes(stored)) return 2;
  if (contentPlanSlugsFromEnv(env).includes(stored)) return 1;
  return 0;
}

/**
 * Highest-ranked paid item that matches. Free plans stay out unless nothing paid exists.
 * @param {unknown} items
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {(item: object) => boolean} [accept]
 */
function bestPaidItem(items, env, accept) {
  const list = Array.isArray(items) ? items : [];
  let best = null;
  let bestRank = 0;
  for (const item of list) {
    if (accept && !accept(item)) continue;
    const rank = storedPlanRank(item?.plan?.slug, env);
    if (rank > bestRank) {
      best = item;
      bestRank = rank;
    }
  }
  return best;
}

/**
 * Prefer a cloud item over content, and any paid item over a free plan listed first.
 * @param {unknown} items
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
function paidBillingItem(items, env) {
  return bestPaidItem(items, env) || (Array.isArray(items) ? items[0] : null) || null;
}

/**
 * Clerk username slug only. Ignores legal-name fields.
 * @param {object} [data]
 */
export function clerkUsernameSlug(data) {
  return sanitizeUsername(data?.username);
}

/**
 * @param {object} evt Clerk webhook event
 */
export function planClerkUserEvent(evt) {
  const type = String(evt?.type || "");
  const id = normalizeClerkUserId(evt?.data?.id);
  if (!id) return { ok: false, error: "invalid_user" };
  if (type === "user.deleted") return { ok: true, action: "delete", userId: id };
  const username = clerkUsernameSlug(evt.data);
  if (type === "user.created") {
    const createdAt = evt.data?.created_at
      ? new Date(evt.data.created_at).toISOString()
      : new Date().toISOString();
    return {
      ok: true,
      action: "ensure",
      userId: id,
      createdAt,
      username,
      codes: foundingCodes({
        createdAt,
        cutoff: process.env.FF_FOUNDING_CUTOFF || "2026-12-31",
      }),
    };
  }
  if (type === "user.updated") {
    return { ok: true, action: "touch", userId: id, username };
  }
  return { ok: true, action: "ignore", userId: id };
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.pastDue",
]);

const SUBSCRIPTION_ITEM_EVENTS = new Set([
  "subscriptionItem.canceled",
  "subscriptionItem.ended",
  "subscriptionItem.expired",
  "subscriptionItem.pastDue",
  "subscriptionItem.active",
  "subscriptionItem.updated",
]);

/**
 * Clerk timestamps are milliseconds. Treat small numbers as seconds.
 * @param {unknown} value
 * @returns {string|null}
 */
export function clerkTimeIso(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Paid Clerk plan slugs are stored as the entitled slug the app already checks.
 * free_user and free_org stay themselves so they remain unentitled.
 * @param {unknown} raw
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string|null}
 */
export function entitledPlanSlug(raw, env = process.env) {
  const slug = String(raw || "").trim();
  if (!slug) return null;
  if (FREE_PLAN_SLUGS.has(slug)) return slug;
  const cloud = planSlugsFromEnv(env);
  if (cloud.includes(slug)) return slug;
  if (contentPlanSlugsFromEnv(env).includes(slug)) return slug;
  return cloud[0] || "cloud";
}

/**
 * Map a Clerk Backend billing subscription onto a subscriptions row.
 * Only an active paid item is written. Free plans stay out of the row.
 * @param {object|null|undefined} sub
 * @param {{ env?: NodeJS.ProcessEnv|Record<string, string|undefined> }} [opts]
 * @returns {{ planSlug: string, status: string, periodStart: string|null, periodEnd: string|null } | null}
 */
function rowFromPaidItem(item, env, status) {
  if (!item) return null;
  const planSlug = entitledPlanSlug(item.plan?.slug, env);
  if (!planSlug || FREE_PLAN_SLUGS.has(planSlug)) return null;
  return {
    planSlug,
    status,
    periodStart: clerkTimeIso(item.periodStart ?? item.period_start),
    periodEnd: clerkTimeIso(item.periodEnd ?? item.period_end),
  };
}

export function rowFromClerkBillingSubscription(sub, opts = {}) {
  const items = Array.isArray(sub?.subscriptionItems) ? sub.subscriptionItems : [];
  const paid = bestPaidItem(items, opts.env, (item) => {
    return String(item?.status || "").trim().toLowerCase() === "active";
  });
  return rowFromPaidItem(paid, opts.env, "active");
}

/**
 * Canceled item that is still paid through period_end. Cloud outranks content.
 * @param {object|null|undefined} sub
 * @param {{ env?: NodeJS.ProcessEnv|Record<string, string|undefined> }} [opts]
 */
export function canceledRowFromClerkBillingSubscription(sub, opts = {}) {
  const items = Array.isArray(sub?.subscriptionItems) ? sub.subscriptionItems : [];
  const canceled = bestPaidItem(items, opts.env, (item) => {
    const status = String(item?.status || "").trim().toLowerCase();
    return status === "canceled" && Boolean(clerkTimeIso(item?.periodEnd ?? item?.period_end));
  });
  return rowFromPaidItem(canceled, opts.env, "canceled");
}

/**
 * Read the signed-in user's Clerk Billing subscription and return a row
 * when they have an active paid plan. Never copies email or names.
 * @param {string} userId
 * @param {{ env?: NodeJS.ProcessEnv|Record<string, string|undefined>, getUserBillingSubscription?: (userId: string) => Promise<object|null> }} [opts]
 */
export async function clerkPaidSubscriptionRow(userId, opts = {}) {
  const uid = normalizeClerkUserId(userId);
  if (!uid) return null;
  const load =
    opts.getUserBillingSubscription ||
    (async (id) => {
      const keys = clerkKeysFromEnv(opts.env);
      if (!keys.enabled) return null;
      const { createClerkClient } = await import("@clerk/backend");
      const client = createClerkClient({ secretKey: keys.secretKey });
      return client.billing.getUserBillingSubscription(id);
    });
  let sub = null;
  try {
    sub = await load(uid);
  } catch (e) {
    console.warn("[clerk] billing subscription", e?.message || e);
    return null;
  }
  return rowFromClerkBillingSubscription(sub, opts);
}

/**
 * Billing webhooks. Never copies payer email or legal names.
 * A paid plan slug is stored as the entitled slug so a later webhook
 * cannot write a custom name back over it.
 * @param {object} evt
 * @param {{ env?: NodeJS.ProcessEnv|Record<string, string|undefined> }} [opts]
 */
export function planClerkBillingEvent(evt, opts = {}) {
  const type = String(evt?.type || "");
  const data = evt?.data && typeof evt.data === "object" ? evt.data : {};
  if (!type.startsWith("subscription")) return { ok: true, action: "ignore" };

  if (SUBSCRIPTION_EVENTS.has(type)) {
    const userId = normalizeClerkUserId(data.payer?.user_id || data.payer?.userId);
    if (!userId) return { ok: false, error: "invalid_user" };
    const item = paidBillingItem(data.items, opts.env);
    return {
      ok: true,
      action: "upsert_subscription",
      userId,
      planSlug: entitledPlanSlug(item?.plan?.slug, opts.env),
      status: String(data.status || "").trim() || "active",
      periodStart: clerkTimeIso(item?.period_start),
      periodEnd: clerkTimeIso(item?.period_end),
    };
  }

  if (SUBSCRIPTION_ITEM_EVENTS.has(type)) {
    const userId = normalizeClerkUserId(data.payer?.user_id || data.payer?.userId);
    if (!userId) return { ok: false, error: "invalid_user" };
    let status = String(data.status || "").trim();
    if (type === "subscriptionItem.canceled") status = status || "canceled";
    if (type === "subscriptionItem.ended" || type === "subscriptionItem.expired") {
      status = status || "ended";
    }
    if (type === "subscriptionItem.pastDue") status = status || "past_due";
    return {
      ok: true,
      action: "upsert_subscription",
      userId,
      planSlug: entitledPlanSlug(data.plan?.slug, opts.env),
      status: status || "active",
      periodStart: clerkTimeIso(data.period_start),
      periodEnd: clerkTimeIso(data.period_end),
    };
  }

  return { ok: true, action: "ignore" };
}
