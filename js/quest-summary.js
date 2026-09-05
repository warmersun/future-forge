/**
 * Player-facing quest summary (invent-banner lede).
 * Plain spoken — not scene craft. Shared by schema, skill writers, seed fill, AI fallback.
 */

export const SUMMARY_CAP = 420;

export const SUMMARY_LOADING_COPY = "Shaping the job…";

/** Locked voice + recipe for every writer (skill, seed fill, generate-scenarios, fill-quest-summary). */
export const QUEST_SUMMARY_RECIPE = `QUEST SUMMARY (player-facing lede, 2–3 short sentences, max ${SUMMARY_CAP} chars):
Plain spoken, like explaining the quest to a student. Not a story. Not a scene.
No asphalt, flares, whiteboards, named clinics, "who designs…", place names, person names, or invented proper nouns.

Recipe, in order:
1) Which global problem — everyday theme name (Climate crises, Infectious diseases, Rogue AI).
2) The situation — one plain fact about what is going wrong.
3) What we are solving for — local job and/or global/system job when both exist. Spotlight quests name the emTech and the capability gap in everyday words. Theme packs with a whole tech tray do NOT list techs.
4) Hard no: names, scene craft, solution theater. If a draft sounds like a short story, it fails.

Gold examples:
- Climate crises. It's too hot — it doesn't even cool down overnight. The local problem is dealing with the heat. The global problem is inventing something that actually moves the needle on warming.
- Infectious diseases. This is about how far gene sequencing has to go so clinics can do it quick and cheap on site — so they don't have to send samples to a lab.
- Rogue AI. This is about AI making high-stakes decisions, and how we know the answer is right — and that it hasn't gone rogue.
- Climate crises. Ocean currents are shifting, so fisheries can't find fish the way they used to. Invent something sustainable that doesn't make the long run worse.`;

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
