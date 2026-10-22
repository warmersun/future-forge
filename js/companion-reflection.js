/**
 * Optional "Back to the idea" response. Plain text. No inferred belief.
 */

/**
 * Invention text for Back to the idea.
 * A placed hex pathway wins. The place-and-year header alone is not an invention.
 * Legacy story fields fill in when the board has no placed tiles.
 * @param {{
 *   pathwayText?: string,
 *   inventionCount?: number,
 *   how?: string,
 *   impact?: string,
 * }} [input]
 * @returns {string}
 */
export function inventionLineForResponse(input = {}) {
  const count = Number(input.inventionCount) || 0;
  const pathway = String(input.pathwayText || "").trim();
  if (count > 0 && pathway) return pathway;
  const how = String(input.how || "").trim();
  const impact = String(input.impact || "").trim();
  return [how, impact].filter(Boolean).join("\n\n");
}

/**
 * @param {string} statement
 * @returns {string}
 */
export function assumingLine(statement) {
  const s = String(statement || "").trim();
  if (!s) return "";
  if (/^For this Quest,\s*assume\b/i.test(s)) {
    return s.replace(/^For this Quest,\s*assume\b/i, "Assuming");
  }
  return s;
}

/**
 * @param {{
 *   questTitle?: string,
 *   sourceTitle?: string,
 *   speaker?: string,
 *   claim?: string,
 *   premiseStatement?: string,
 *   inventionSummary?: string,
 *   reflection?: string,
 *   questUrl?: string,
 *   sourceUrl?: string,
 * }} [input]
 * @returns {string}
 */
export function formatSourceResponse(input = {}) {
  const lines = [];
  const questTitle = String(input.questTitle || "").trim();
  const sourceTitle = String(input.sourceTitle || "").trim();
  const speaker = String(input.speaker || "").trim();
  if (questTitle) lines.push(questTitle);
  if (speaker && sourceTitle) lines.push(`${speaker}, ${sourceTitle}`);
  else if (sourceTitle) lines.push(sourceTitle);
  else if (speaker) lines.push(speaker);
  const claim = String(input.claim || "").trim();
  if (claim) lines.push(claim);
  const assuming = assumingLine(input.premiseStatement);
  if (assuming) lines.push(assuming);
  const invention = String(input.inventionSummary || "").trim();
  lines.push(invention || "No invention recorded yet.");
  const reflection = String(input.reflection || "").trim();
  if (reflection) lines.push(reflection);
  lines.push(
    "This was a fictional exploration under the Quest's assumptions. It does not verify the source."
  );
  const questUrl = String(input.questUrl || "").trim();
  if (questUrl) lines.push(questUrl);
  const sourceUrl = String(input.sourceUrl || "").trim();
  if (sourceUrl.startsWith("https://")) lines.push(sourceUrl);
  return lines.join("\n\n");
}
