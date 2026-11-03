/**
 * Process-local cap on dispatched co-invent provider attempts.
 * Two slots per verified owner: one foreground turn and one draining replacement.
 * A multi-process deployment needs a shared store before this is a global guarantee.
 */

export const DEFAULT_ADMISSION_LIMIT = 2;

/**
 * Verified user id wins, so two seats of one account share the cap.
 * An unsigned room seat uses seatId. HTTP guests use ip. A caller session id
 * is never a key. With none of those, every unsigned caller would share "local".
 * @param {{ userId?: string|null, seatId?: string|null, ip?: string|null }} ids
 */
export function admissionKey(ids = {}) {
  const userId = String(ids.userId || "").trim();
  if (userId) return `user:${userId.slice(0, 120)}`;
  const seatId = String(ids.seatId || "").trim();
  if (seatId) return `seat:${seatId.slice(0, 80)}`;
  const ip = String(ids.ip || "").trim();
  if (ip) return `ip:${ip.slice(0, 80)}`;
  return "local";
}

/**
 * @param {{ limit?: number }} [opts]
 */
export function createAdmission(opts = {}) {
  const limit = Math.max(1, Math.floor(Number(opts.limit) || DEFAULT_ADMISSION_LIMIT));
  /** @type {Map<string, number>} */
  const slots = new Map();

  function tryAcquire(key) {
    const id = String(key || "");
    if (!id) return { ok: false, error: "no_owner", message: "Previous requests are still finishing." };
    const n = slots.get(id) || 0;
    if (n >= limit) {
      return {
        ok: false,
        error: "still_finishing",
        message: "Previous requests are still finishing.",
      };
    }
    slots.set(id, n + 1);
    let released = false;
    return {
      ok: true,
      release() {
        if (released) return;
        released = true;
        const left = (slots.get(id) || 1) - 1;
        if (left <= 0) slots.delete(id);
        else slots.set(id, left);
      },
    };
  }

  return {
    limit,
    tryAcquire,
    size: () => slots.size,
    count: (key) => slots.get(String(key || "")) || 0,
  };
}

/** Shared by the game server process. Tests construct their own. */
export const gameAdmission = createAdmission();
