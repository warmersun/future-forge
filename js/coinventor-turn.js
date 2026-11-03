/**
 * Co-invent turn ownership. DOM-free so seat, lane, and stale-event checks
 * can be tested without a document.
 */

/**
 * @param {object} [identity]
 */
export function captureTurnIdentity(identity = {}) {
  return {
    requestId: String(identity.requestId || ""),
    runId: identity.runId == null ? null : String(identity.runId),
    seatId: identity.seatId == null ? "solo" : String(identity.seatId),
    lane: identity.lane === "tutor" ? "tutor" : "coinventor",
    mode: identity.mode ? String(identity.mode) : "chat",
  };
}

/**
 * @param {object|null|undefined} turn
 * @param {object|null|undefined} current
 */
export function sameTurnOwner(turn, current) {
  if (!turn || !current) return false;
  if (turn.requestId !== current.requestId) return false;
  if ((turn.runId || null) !== (current.runId || null)) return false;
  if ((turn.seatId || "solo") !== (current.seatId || "solo")) return false;
  if ((turn.lane || "coinventor") !== (current.lane || "coinventor")) return false;
  return true;
}

/**
 * @param {number} distanceFromBottom
 * @param {number} [threshold]
 */
export function shouldFollowScroll(distanceFromBottom, threshold = 80) {
  return Number(distanceFromBottom) <= threshold;
}

/**
 * Announce at sentence boundaries, not every token.
 * @param {string} previous
 * @param {string} next
 */
export const UNFINISHED_STOP_NOTE = "Stopped — unfinished answer";
export const UNFINISHED_TIMEOUT_NOTE = "Timed out — unfinished answer";

/**
 * What to show when a turn does not commit.
 * A stop or timeout keeps a preview under its own note. A provider error
 * shows the safe message, and keeps a preview only under that message.
 * @param {{ aborted?: boolean, stopReason?: string|null, preview?: string, errorMessage?: string|null }} input
 * @returns {{ outcome: "stop"|"timeout"|"error", cancelled: boolean, unfinishedNote: string|null, message: string|null }}
 */
export function terminalTurnView(input = {}) {
  const preview = String(input.preview || "");
  if (input.aborted) {
    const timeout = input.stopReason === "timeout";
    return {
      outcome: timeout ? "timeout" : "stop",
      cancelled: true,
      unfinishedNote: preview ? (timeout ? UNFINISHED_TIMEOUT_NOTE : UNFINISHED_STOP_NOTE) : null,
      message: !preview && timeout ? "That turn timed out. Try again." : null,
    };
  }
  const message = String(input.errorMessage || "").trim()
    || "The co-inventor hit a snag. Try again in a moment.";
  return {
    outcome: "error",
    cancelled: false,
    unfinishedNote: preview ? message : null,
    message: preview ? null : message,
  };
}

export function announcementDelta(previous, next) {
  const prior = String(previous || "");
  const text = String(next || "");
  if (text.length <= prior.length) return "";
  const added = text.slice(prior.length);
  const end = Math.max(added.lastIndexOf("."), added.lastIndexOf("!"), added.lastIndexOf("?"));
  if (end < 0) return "";
  return added.slice(0, end + 1);
}
