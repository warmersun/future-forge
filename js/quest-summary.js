/**
 * Player-facing quest summary (invent-banner lede).
 * Instance story — named person, place, what went wrong now.
 * Shared by schema, skill writers, seed fill, AI fallback.
 */

export const SUMMARY_CAP = 420;

export const SUMMARY_LOADING_COPY = "Shaping the job…";

/** Locked voice + recipe for every writer (skill, seed fill, generate-scenarios, fill-quest-summary). */
export const QUEST_SUMMARY_RECIPE = `QUEST SUMMARY (player-facing lede, 2–3 short sentences, max ${SUMMARY_CAP} chars):
A brief little story: one instance of the bigger issue. Named person, concrete fictive place, what went wrong NOW.
Lead with the hook so the first two sentences still work as the invent-banner lede (engine clips on a sentence at ~160 chars — never mid-word).

Recipe, in order:
1) Named person does something specific, now, in a named place.
2) The world pushes back — one concrete fact about what is going wrong here.
3) Optional third sentence: the human-scale stake if nothing changes.
Hard no: theme-word ledes ("Infectious diseases. This is about how far…"), spotlight tech names, sponsor products, "invent with [tech]", "do not invent X", capability lectures, solution theater.

Gold examples:
- Nurse Amina seals another swab at Crossing Clinic 7. The fever sheet on the fridge does not match. The lab truck left at dawn — answers take days, and by then the bench is empty or the ward is full.
- After the last ferry, Ms. Okonkwo locks the pier lab at Harborside. The yard manuals on the bench cannot leave the room. Students still need days of practice.
- Nia tapes a donor plaque beside the new bench at Tideglass High. The visiting fellow wrote: do not finish a living cell. No one has posted what that means on the door.`;

export const FILL_QUEST_SUMMARY_SYSTEM = `You write ONE player-facing quest summary for Future Forge.
${QUEST_SUMMARY_RECIPE}
Return JSON only: { "summary": "…" }.`;

/**
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function clipSummary(raw) {
  return String(raw || "").trim().slice(0, SUMMARY_CAP);
}

/**
 * @param {HTMLElement|null|undefined} el
 * @param {{ summary?: string, loading?: boolean }} [opts]
 */
export function paintMissionSummary(el, opts = {}) {
  if (!el) return;
  if (opts.loading) {
    el.hidden = false;
    el.removeAttribute("hidden");
    el.setAttribute("aria-busy", "true");
    el.classList.add("is-loading");
    el.textContent = SUMMARY_LOADING_COPY;
    return;
  }
  el.classList.remove("is-loading");
  el.removeAttribute("aria-busy");
  const text = clipSummary(opts.summary);
  if (!text) {
    el.hidden = true;
    el.setAttribute("hidden", "");
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.removeAttribute("hidden");
  el.textContent = text;
}

/** @type {Map<string, Promise<string>>} */
const summaryInflight = new Map();

/**
 * Paint an authored summary, or request one when missing.
 * @param {object|null|undefined} mission
 * @param {HTMLElement|null|undefined} el
 * @param {() => Promise<{ summary?: string }>} request
 * @returns {Promise<string>}
 */
export async function ensureQuestSummary(mission, el, request) {
  const existing = clipSummary(mission?.summary);
  if (existing) {
    paintMissionSummary(el, { summary: existing });
    return existing;
  }
  const id = String(mission?.id || "");
  if (!el || !id || typeof request !== "function") {
    paintMissionSummary(el, { summary: "" });
    return "";
  }
  paintMissionSummary(el, { loading: true });
  let p = summaryInflight.get(id);
  if (!p) {
    p = Promise.resolve()
      .then(() => request())
      .then((data) => clipSummary(data?.summary))
      .catch(() => "")
      .finally(() => summaryInflight.delete(id));
    summaryInflight.set(id, p);
  }
  const text = await p;
  if (text && mission) mission.summary = text;
  paintMissionSummary(el, { summary: text });
  return text;
}
