/**
 * Clerk → Neon user lifecycle. Identity stays in Clerk; we only key rows.
 */

import { normalizeClerkUserId } from "./clerk-auth.mjs";
import { foundingCodes } from "./achievements.mjs";

/**
 * @param {object} evt Clerk webhook event
 */
export function planClerkUserEvent(evt) {
  const type = String(evt?.type || "");
  const id = normalizeClerkUserId(evt?.data?.id);
  if (!id) return { ok: false, error: "invalid_user" };
  if (type === "user.deleted") return { ok: true, action: "delete", userId: id };
  if (type === "user.created") {
    const createdAt = evt.data?.created_at
      ? new Date(evt.data.created_at).toISOString()
      : new Date().toISOString();
    return {
      ok: true,
      action: "ensure",
      userId: id,
      createdAt,
      codes: foundingCodes({
        createdAt,
        cutoff: process.env.FF_FOUNDING_CUTOFF || "2026-12-31",
      }),
    };
  }
  if (type === "user.updated") return { ok: true, action: "touch", userId: id };
  return { ok: true, action: "ignore", userId: id };
}
