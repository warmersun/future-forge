/**
 * Clerk → Neon user lifecycle. Identity stays in Clerk; we only key rows.
 * Never copy first_name / last_name / full_name (legal names) onto our profile.
 */

import { normalizeClerkUserId } from "./clerk-auth.mjs";
import { foundingCodes } from "./achievements.mjs";
import { sanitizeUsername } from "./profile.mjs";

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
 * Billing webhooks. Never copies payer email or legal names.
 * @param {object} evt
 */
export function planClerkBillingEvent(evt) {
  const type = String(evt?.type || "");
  const data = evt?.data && typeof evt.data === "object" ? evt.data : {};
  if (!type.startsWith("subscription")) return { ok: true, action: "ignore" };

  if (SUBSCRIPTION_EVENTS.has(type)) {
    const userId = normalizeClerkUserId(data.payer?.user_id || data.payer?.userId);
    if (!userId) return { ok: false, error: "invalid_user" };
    const item = Array.isArray(data.items) ? data.items[0] : null;
    const planSlug = String(item?.plan?.slug || "").trim() || null;
    return {
      ok: true,
      action: "upsert_subscription",
      userId,
      planSlug,
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
      planSlug: String(data.plan?.slug || "").trim() || null,
      status: status || "active",
      periodStart: clerkTimeIso(data.period_start),
      periodEnd: clerkTimeIso(data.period_end),
    };
  }

  return { ok: true, action: "ignore" };
}
