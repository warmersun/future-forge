/**
 * How-it-works scaffold — pure, no DOM.
 *
 * Future Forge's own definition of technology: what takes something scarce and
 * makes it abundant. The scaffold turns the blank "How it works" box into two
 * blanks a newcomer can fill: what is scarce here, and how this emTech makes it
 * abundant. Free writing stays one click away.
 */

export const SCAFFOLD_LIMITS = { scarce: 120, mechanism: 240 };

/**
 * @typedef {{
 *   place: string,
 *   tech: string,
 *   stakeholder: string,
 *   scarce: string,
 *   mechanism: string,
 * }} ScaffoldFields
 */

/**
 * Prefill the parts the Quest already knows; leave the two blanks empty.
 * @param {object|null} mission
 * @param {object|null} tech
 * @returns {ScaffoldFields}
 */
export function scaffoldFields(mission, tech) {
  return {
    place: String(mission?.place || "this place").trim() || "this place",
    tech: String(tech?.name || tech?.id || "this emTech").trim() || "this emTech",
    stakeholder: firstName(mission?.stakeholder),
    scarce: "",
    mechanism: "",
  };
}

/**
 * Labels for the two blanks, phrased for the current tech.
 * @param {ScaffoldFields} f
 */
export function scaffoldLabels(f) {
  return {
    scarce: `What is scarce in ${f.place}?`,
    scarceHint: "One thing people here lack: clean air at school, power after dusk, a diagnosis before the queue…",
    mechanism: `How does ${f.tech} make it more abundant?`,
    mechanismHint: "One plain sentence about the mechanism — who does what, with what, this year.",
  };
}

/** @param {ScaffoldFields} f */
export function isScaffoldComplete(f) {
  return clean(f?.scarce).length >= 3 && clean(f?.mechanism).length >= 8;
}

/**
 * Compose the how-it-works text from the blanks. Returns "" until both blanks have substance.
 * @param {ScaffoldFields} f
 * @returns {string}
 */
export function composeHow(f) {
  if (!isScaffoldComplete(f)) return "";
  const scarce = lowerFirst(trimDot(clean(f.scarce).slice(0, SCAFFOLD_LIMITS.scarce)));
  const mech = lowerFirst(trimDot(clean(f.mechanism).slice(0, SCAFFOLD_LIMITS.mechanism)));
  const tail = f.stakeholder ? `. For ${f.stakeholder}, this year.` : `, this year.`;
  return `In ${f.place}, ${scarce} is scarce. ${f.tech} makes it more abundant: ${mech}${tail}`;
}

/**
 * Split a composed how-text back into the two blanks (for switching modes).
 * Pass the known place / tech / stakeholder so commas or dashes inside them
 * cannot be mistaken for the sentence structure.
 * @param {string} how
 * @param {{ place?: string, tech?: string, stakeholder?: string }} [known]
 * @returns {{ scarce: string, mechanism: string } | null}
 */
export function parseHow(how, known = {}) {
  const t = clean(how);
  if (!t) return null;
  const place = clean(known.place);
  const tech = clean(known.tech);
  const who = clean(known.stakeholder);
  if (place && tech) {
    const tail = who ? `\\. For ${esc(who)}, this year\\.?` : `, this year\\.?`;
    const re = new RegExp(
      `^In ${esc(place)}, (.+) is scarce\\. ${esc(tech)} makes it more abundant: (.+)${tail}$`
    );
    const m = t.match(re);
    if (m) return { scarce: m[1], mechanism: m[2] };
  }
  // Unknown fields: best effort on the canonical shape (place may contain commas, so anchor on " is scarce.").
  const g = t.match(/^In .+, (.+?) is scarce\. .+? makes it more abundant: (.+?)(?:\. For .+?)?, this year\.?$/);
  if (!g) return null;
  return { scarce: g[1], mechanism: g[2] };
}

function esc(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}
function trimDot(s) {
  return s.replace(/[.\s]+$/, "");
}
function lowerFirst(s) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}
function firstName(stakeholder) {
  const s = clean(stakeholder);
  if (!s) return "";
  // "Priya, parent coalition" → "Priya"; "Dr. Okonkwo, clinic lead" → "Dr. Okonkwo"
  return s.split(",")[0].trim().slice(0, 60);
}
