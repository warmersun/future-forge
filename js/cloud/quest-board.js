/**
 * Browser-safe: which quests get a leaderboard.
 * Theme shuffle / Surprise ids are gen-… — not the same job for everyone.
 */

export function questHasLeaderboard(questId) {
  const s = String(questId || "").trim();
  if (!s || s.length > 120) return false;
  if (s.startsWith("gen-")) return false;
  return /^[A-Za-z0-9._:-]+$/.test(s);
}
