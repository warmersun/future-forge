/**
 * Clerk → Neon user lifecycle. Identity stays in Clerk; we only key rows.
 * Never copy first_name / last_name / full_name (legal names) onto our profile.
 */

import { clerkKeysFromEnv, normalizeClerkUserId } from "./clerk-auth.mjs";
import { planSlugsFromEnv } from "./ai-quota.mjs";
import { foundingCodes } from "./achievements.mjs";
import { sanitizeUsername } from "./profile.mjs";

const FREE_PLAN_SLUGS = new Set(["free_user", "free_org"]);

/**
 * Prefer a paid item so a free plan listed first cannot replace it.
 * @param {unknown} items
 */
function paidBillingItem(items) {
  const list = Array.isArray(items) ? items : [];
  const paid = list.find((item) => {
    const slug = String(item?.plan?.slug || "").trim();
    return slug && !FREE_PLAN_SLUGS.has(slug);
  });
  return paid || list[0] || null;
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
  const allowed = planSlugsFromEnv(env);
  if (allowed.includes(slug)) return slug;
  return allowed[0] || "cloud";
}

/**
 * Map a Clerk Backend billing subscription onto a subscriptions row.
 * Only an active paid item is written. Free plans stay out of the row.
 * @param {object|null|undefined} sub
 * @param {{ env?: NodeJS.ProcessEnv|Record<string, string|undefined> }} [opts]
 * @returns {{ planSlug: string, status: string, periodStart: string|null, periodEnd: string|null } | null}
 */
export function rowFromClerkBillingSubscription(sub, opts = {}) {
  const items = Array.isArray(sub?.subscriptionItems) ? sub.subscriptionItems : [];
  const paid = items.find((item) => {
    const slug = String(item?.plan?.slug || "").trim();
    const status = String(item?.status || "").trim().toLowerCase();
    return slug && !FREE_PLAN_SLUGS.has(slug) && status === "active";
  });
  if (!paid) return null;
  const planSlug = entitledPlanSlug(paid.plan?.slug, opts.env);
  if (!planSlug) return null;
  return {
    planSlug,
    status: "active",
    periodStart: clerkTimeIso(paid.periodStart ?? paid.period_start),
    periodEnd: clerkTimeIso(paid.periodEnd ?? paid.period_end),
  };
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
    const item = paidBillingItem(data.items);
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
