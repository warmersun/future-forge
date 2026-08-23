/**
 * Four-angle pathway scrutiny — sanitize + offline fallback.
 * Shared by server co-invent and hex workshop (browser-safe .js).
 */

export const SCRUTINY_ANGLES = ["moloch", "ethicist", "stakeholder", "nature"];

/**
 * @param {unknown} raw
 * @returns {{ analysis: string, safeguard: string, imagePrompt?: string }|null}
 */
export function sanitizeScrutinyAngle(raw) {
  if (!raw || typeof raw !== "object") return null;
  const analysis = String(raw.analysis || "").trim().slice(0, 1200);
  const safeguard = String(raw.safeguard || "").trim().slice(0, 400);
  const imagePrompt = String(raw.imagePrompt || "").trim().slice(0, 400);
  if (!analysis && !safeguard) return null;
  return {
    analysis,
    safeguard,
    ...(imagePrompt ? { imagePrompt } : {}),
  };
}

/**
 * @param {unknown} raw
 * @returns {Record<string, { analysis: string, safeguard: string, imagePrompt?: string }>|null}
 */
export function sanitizeScrutiny(raw) {
  if (!raw || typeof raw !== "object") return null;
  const moloch = sanitizeScrutinyAngle(raw.moloch);
  const ethicist = sanitizeScrutinyAngle(raw.ethicist);
  const stakeholder = sanitizeScrutinyAngle(raw.stakeholder);
  const nature = sanitizeScrutinyAngle(raw.nature);
  const policy = sanitizeScrutinyAngle(raw.policy);
  if (!moloch && !ethicist && !stakeholder && !nature && !policy) return null;
  return {
    moloch,
    ethicist,
    stakeholder: stakeholder || policy,
    nature,
  };
}

/**
 * Offline / no-key four-angle scrutiny for a local pathway.
 * @param {{ place?: string, inventionName?: string, inventionHow?: string }} context
 */
export function localScrutinyProposals(context = {}) {
  const place = context.place || "this place";
  const name = context.inventionName || "this pathway";
  const how = String(context.inventionHow || "").slice(0, 200);
  const howBit = how ? ` Built around: ${how}` : "";
  return {
    moloch: {
      analysis: `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design.”${howBit}`,
      safeguard:
        "Make defection visible and align incentives — shared fund, default enroll, or a small fee/reward that stops freeriding.",
      imagePrompt: `Photoreal street scene in ${place}: competing incentives, people free-riding while careful neighbors pay — system pressure on a local pathway.`,
    },
    ethicist: {
      analysis: `The Ethicist, ${place}: “${name} forces a choice you cannot optimize away. Someone’s dignity or opportunity is on the line — and both sides have a point.”${howBit}`,
      safeguard:
        "Name the hardest tradeoff, who is harmed either way, and one hard constraint you refuse to cross.",
      imagePrompt: `Photoreal documentary still in ${place}: a quiet ethical tension — dignity, consent, or who is left out when a local tech pathway scales.`,
    },
    stakeholder: {
      analysis: `The Stakeholder, ${place}: “I am the mayor, the clinic board, and the neighborhood meeting. Someone must sign, fund, and defend ${name} in public.”${howBit}`,
      safeguard:
        "Name who must say yes, who pays year 1 and year 5, and one financing or legitimacy move that wins public support.",
      imagePrompt: `Photoreal city hall or community meeting in ${place}: officials and neighbors weighing whether to fund and permit a local pathway.`,
    },
    nature: {
      analysis: `Mother Nature, ${place}: “${name} still burns energy and makes waste. Storms and scarcity do not care about your pitch deck.”${howBit}`,
      safeguard:
        "Name the first physical limit (energy, materials, ecology, disease, storms) and a design cap or monitoring that absorbs a bad week.",
      imagePrompt: `Photoreal outdoor documentary still in ${place}: weather, materials, energy, or ecology pressing on a local emerging-tech pathway — no text.`,
    },
  };
}
