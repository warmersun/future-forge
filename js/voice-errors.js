/**
 * xAI realtime errors that must not kill a live call.
 * Server VAD already barges in; a cancel with no in-flight response is normal.
 * @param {unknown} err
 */
export function isRecoverableVoiceError(err) {
  const s = String(err?.message || err || "").toLowerCase();
  if (!s) return false;
  return (
    s.includes("no active response") ||
    s.includes("cancellation failed") ||
    s.includes("already cancelled") ||
    s.includes("response was cancelled") ||
    s.includes("nothing to cancel")
  );
}
