/**
 * Player-facing quest summary (invent-banner lede).
 * Instance story — named person, place, what went wrong at this time.
 * Shared by schema, skill writers, seed fill, AI fallback.
 */

import { PACK_STE_RULES } from "./pack-ste-prose.js";

export const SUMMARY_CAP = 420;

export const SUMMARY_LOADING_COPY = "Shaping the job…";

/** Locked voice + recipe for every writer (skill, seed fill, generate-scenarios, fill-quest-summary). */
export const QUEST_SUMMARY_RECIPE = `QUEST SUMMARY (player-facing lede, 2–3 description sentences, max ${SUMMARY_CAP} chars):
A brief story: one case of the bigger issue. Named person, concrete fictive place, what went wrong at this time.
Lead with the hook: the invent banner and every catalog card show the whole summary (up to ${SUMMARY_CAP} chars), so the first sentence is what a browsing player reads first.

Recipe, in order:
1) A named person does something specific, in a named place.
2) One concrete fact about what is going wrong here.
3) Optional third sentence: the stake for that person if nothing changes.
Each sentence is a description of at most 25 words. No imperative. No contractions. No semicolon.
Hard no: theme-word ledes ("Infectious diseases. This is about how far…"), spotlight tech names, sponsor products, "invent with [tech]", "do not invent X", capability lectures, solution theater.

Gold examples:
- Nurse Amina seals a swab at Crossing Clinic 7. The fever sheet on the fridge does not match the log. The lab truck left at dawn, and the ward is full.
- Ms. Okonkwo locks the pier lab at Harborside after the last ferry. The yard manuals on the bench cannot leave the room. The students need days of practice.
- Nia puts a donor plaque beside the new bench at Tideglass High. A note on the bench says do not finish a living cell. No person posted the meaning of that note.

${PACK_STE_RULES}`;

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

const TITLE_CASE_WORD = /^(?:[A-Z][A-Za-z-]*|[A-Z]{2,}|and|of|the|for|in)$/;

/**
 * True when a summary opens as a topic label or an outcome, not an instance story.
 * @param {string|null|undefined} text
 */
export function isThemeWordLede(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (/\bthis is about how far\b/i.test(s)) return true;
  if (/\bbuild your invention around\b/i.test(s)) return true;
  if (/^Invent a way\b/i.test(s)) return true;
  const m = /^([^.!?]+)\.\s+/.exec(s);
  if (!m) return false;
  const first = m[1].trim();
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 6) return false;
  const allTitle = words.every((w) => TITLE_CASE_WORD.test(w));
  const hasLowerContent = words.some(
    (w) => /^[a-z]/.test(w) && !/^(and|of|the|for|in)$/.test(w)
  );
  return allTitle && !hasLowerContent;
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
