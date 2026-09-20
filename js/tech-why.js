/**
 * Problem-first tray helpers — pure, no DOM.
 *
 * A Quest names a few suggested emTechs. This module turns those bare ids into
 * "For this place" cards with a one-line reason a newcomer can read, and picks
 * which of them to offer from a red crisis hex.
 */

export const WHY_MAX = 120;
export const CAPABILITY_MAX = 90;

/** Words that never belong in player copy (see docs/on-the-curve-recording-pack.md). */
export const DO_NOT_SAY = /\b(developer|JSON|overlay|schema|modal|feature|API|score function|locked until|unlock the card)\b/i;

/**
 * Clip to one sentence-ish fragment of at most `max` chars, no dangling word.
 * @param {string} text
 * @param {number} max
 */
export function clipLine(text, max = WHY_MAX) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  const base = stop > max * 0.5 ? cut.slice(0, stop) : cut;
  return `${base.replace(/[\s,;.]+$/, "")}…`;
}

/**
 * The one line a card leads with: what this family can do, not what it is.
 * @param {object} tech
 */
export function capabilityLine(tech) {
  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");
  const src =
    str(tech?.inventionHint) ||
    (Array.isArray(tech?.useCasesNow) ? str(tech.useCasesNow[0]) : "") ||
    str(tech?.maturity?.now) ||
    str(tech?.summary);
  return clipLine(src, CAPABILITY_MAX);
}

/**
 * Crisis meters of a normalized mission as [{ label, level, role }], hottest first.
 * Normalized missions carry pressure {Label: n} and crisisRoles [role] in the same order.
 * @param {object} mission
 */
export function metersByHeat(mission) {
  const pressure = mission?.pressure && typeof mission.pressure === "object" ? mission.pressure : {};
  const labels = Object.keys(pressure);
  const roles = Array.isArray(mission?.crisisRoles) ? mission.crisisRoles : [];
  const winMax = mission?.winMax && typeof mission.winMax === "object" ? mission.winMax : {};
  return labels
    .map((label, i) => ({
      label,
      level: Number(pressure[label]) || 0,
      goal: Number.isFinite(Number(winMax[label])) ? Number(winMax[label]) : 1,
      role: roles[i] || null,
    }))
    .sort((a, b) => b.level - b.goal - (a.level - a.goal) || b.level - a.level);
}

/**
 * Suggested tech ids for a mission: spotlight first, then the authored order.
 * @param {object} mission
 * @returns {string[]}
 */
/**
 * The real advance behind a Spotlight Quest, shaped for the AI tutor:
 * { title, summary, asOf } or null. Player prose never names it; the tutor
 * does, after the learner has the story (server.mjs TUTOR_SYSTEM_PROMPT).
 * @param {object} mission
 */
export function spotlightAdvanceForAi(mission) {
  const spot = mission?.spotlight;
  if (!spot || typeof spot !== "object") return null;
  const title = String(spot.advanceTitle || "").trim() || null;
  const summary = String(spot.advanceSummary || "").trim() || null;
  const asOf = String(spot.asOf || "").trim() || null;
  if (!title && !summary) return null;
  return { title, summary, asOf };
}

export function suggestedIds(mission) {
  const spot = mission?.spotlight?.techId || null;
  const list = Array.isArray(mission?.suggested) ? mission.suggested.map(String) : [];
  const out = [];
  if (spot) out.push(spot);
  for (const id of list) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Why this emTech is on the shelf for this place — one plain line.
 * Order: authored `suggestedWhy` → spotlight advance → template from the
 * tech's capability line and the hottest crisis meter.
 * @param {object} tech
 * @param {object} mission
 */
export function whyHere(tech, mission) {
  if (!tech) return "";
  const authored = mission?.suggestedWhy?.[tech.id];
  if (typeof authored === "string" && authored.trim()) return clipLine(authored);

  const spot = mission?.spotlight;
  if (spot && spot.techId === tech.id) {
    const line = spot.advanceSummary || spot.encourageCopy || "";
    if (line) return clipLine(firstSentence(line));
  }

  const cap = capabilityLine(tech);
  const hottest = metersByHeat(mission)[0];
  if (!cap) return hottest ? `Could ease ${hottest.label} here.` : "";
  const capNoDot = cap.replace(/[.…]+$/, "");
  return clipLine(hottest ? `${capNoDot} — for ${hottest.label}.` : `${capNoDot}.`);
}

/**
 * Techs to offer from a red crisis hex, with reasons.
 * Prefers authored reasons that name this meter; then the rest of the shelf.
 * @param {object} mission
 * @param {object[]} techs — full catalog
 * @param {{ meterLabel?: string }} where — the crisis meter's label (its role is not needed)
 * @param {number} [n]
 * @returns {{ tech: object, why: string }[]}
 */
export function pickTechsForCrisis(mission, techs, where = {}, n = 3) {
  const byId = new Map((techs || []).map((t) => [t.id, t]));
  const ids = suggestedIds(mission).filter((id) => byId.has(id));
  if (!ids.length) return [];
  const label = String(where.meterLabel || "").trim().toLowerCase();
  const why = mission?.suggestedWhy || {};
  const scored = ids.map((id, i) => {
    const text = String(why[id] || "").toLowerCase();
    const hit = label && text && text.includes(label) ? 0 : 1;
    return { id, hit, i };
  });
  scored.sort((a, b) => a.hit - b.hit || a.i - b.i);
  return scored.slice(0, Math.max(0, n)).map(({ id }) => {
    const tech = byId.get(id);
    return { tech, why: whyHere(tech, mission) };
  });
}

/**
 * Split the catalog into the shelf for this place and everything else.
 * @param {object} mission
 * @param {object[]} techs
 * @returns {{ place: object[], rest: object[] }}
 */
export function splitTray(mission, techs) {
  const ids = suggestedIds(mission);
  const order = new Map(ids.map((id, i) => [id, i]));
  const place = [];
  const rest = [];
  for (const t of techs || []) {
    if (order.has(t.id)) place.push(t);
    else rest.push(t);
  }
  place.sort((a, b) => order.get(a.id) - order.get(b.id));
  return { place, rest };
}

/**
 * Sanitize an authored `suggestedWhy` map: keep only the given ids (callers pass the
 * Quest's suggested / spotlight ids), strings only, clipped to WHY_MAX.
 * @param {unknown} raw
 * @param {Set<string>|string[]} validIds
 * @returns {Record<string,string>|null}
 */
export function sanitizeSuggestedWhy(raw, validIds) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const valid = validIds instanceof Set ? validIds : new Set(validIds || []);
  /** @type {Record<string,string>} */
  const out = {};
  for (const [id, text] of Object.entries(raw)) {
    if (!valid.has(id)) continue;
    if (typeof text !== "string" || !text.trim()) continue;
    out[id] = clipLine(text, WHY_MAX);
  }
  return Object.keys(out).length ? out : null;
}

const ABBREVIATIONS = new Set(["dr", "mr", "mrs", "ms", "prof", "st", "no", "vs", "eg", "e.g", "ie", "i.e", "etc", "approx", "u.s", "u.k", "e.u", "inc", "ltd"]);

/** First sentence, ignoring periods inside abbreviations ("U.S.", "Dr.", "e.g."). */
function firstSentence(text) {
  const t = String(text || "").trim();
  const re = /[.!?]+(?=\s|$)/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(0, m.index);
    const word = (before.match(/(\S+)$/) || [])[1] || "";
    const bare = word.replace(/^[("'“]+/, "").toLowerCase();
    const isInitial = /^(?:[a-z]\.)*[a-z]$/.test(bare) && bare.length <= 3; // "U.S", "J"
    if (m[0] === "." && (isInitial || ABBREVIATIONS.has(bare))) continue;
    return t.slice(0, m.index + m[0].length);
  }
  return t;
}
