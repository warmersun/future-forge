/**
 * B2 free-account daily AI cap. Plan-based caps wait on Billing (todo).
 */

export const FREE_DAILY_AI_HITS = 40;
export const QUOTA_SPENT_MESSAGE =
  "Today’s co-inventor energy is spent — comes back at midnight, or upgrade.";

/**
 * @param {{ signedIn?: boolean, used?: number, cap?: number }} input
 * @returns {{ ok: true, mode: "ip"|"user" } | { ok: false, status: number, error: string, message: string }}
 */
export function userQuotaDecision(input = {}) {
  if (!input.signedIn) return { ok: true, mode: "ip" };
  const used = Number(input.used) || 0;
  const cap = Number(input.cap) > 0 ? Number(input.cap) : FREE_DAILY_AI_HITS;
  if (used >= cap) {
    return {
      ok: false,
      status: 429,
      error: "quota_spent",
      message: QUOTA_SPENT_MESSAGE,
    };
  }
  return { ok: true, mode: "user" };
}

export function freeDailyCapFromEnv(env = process.env) {
  const n = Number(env.FF_CLOUD_AI_FREE_DAILY);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return FREE_DAILY_AI_HITS;
}
