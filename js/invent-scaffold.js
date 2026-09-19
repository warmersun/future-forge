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
  const scarce = sentenceCase(trimDot(clean(f.scarce).slice(0, SCAFFOLD_LIMITS.scarce)));
  const mech = lowerFirst(trimDot(clean(f.mechanism).slice(0, SCAFFOLD_LIMITS.mechanism)));
  const who = f.stakeholder ? ` — for ${f.stakeholder}` : "";
  return `In ${f.place}, ${lowerFirst(scarce)} is scarce. ${f.tech} makes it more abundant by ${mech}${who}, this year.`;
}

/**
 * Best-effort split of an existing how-text back into the blanks (for switching modes).
 * @param {string} how
 * @returns {{ scarce: string, mechanism: string } | null}
 */
export function parseHow(how) {
  const t = clean(how);
  const m = t.match(/^In [^,]+, (.+?) is scarce\. .+? makes it more abundant by (.+?)(?: — for [^,]+)?, this year\.?$/);
  if (!m) return null;
  return { scarce: m[1], mechanism: m[2] };
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
function sentenceCase(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function firstName(stakeholder) {
  const s = clean(stakeholder);
  if (!s) return "";
  // "Priya, parent coalition" → "Priya"; "Dr. Okonkwo, clinic lead" → "Dr. Okonkwo"
  return s.split(",")[0].trim().slice(0, 60);
}
