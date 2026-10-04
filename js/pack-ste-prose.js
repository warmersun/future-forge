/**
 * ASD-STE100 Issue 9 sentence rules for theme-pack quest text.
 * Description (scene, place, bigger problem, summary, meters, suggestedWhy): 25 words.
 * Your job: one imperative sentence, 20 words.
 * Not a dictionary certificate. The seed script uses this as the retry gate.
 */

export const STE_DESCRIPTION_MAX = 25;
export const STE_PROCEDURE_MAX = 20;

export const PACK_STE_RULES = [
  "ASD-STE100 Issue 9 sentence rules for theme-pack quest text.",
  "These quests stay local stories: named person, concrete place, lived harm, local driver, open outcome. Do not solve the quest.",
  "Description text (scene, ## The place, ## The bigger problem, summary, crisis-meter descriptions, suggestedWhy): each sentence has at most 25 words. No imperative.",
  "Your job: one imperative sentence, at most 20 words. Outcome only. No product name, no 'invent with [tech]', no ban-list.",
  "One topic per sentence. Active voice. Simple present, simple past, or simple future only. No progressive. No perfect.",
  "No contractions. Write 'do not', 'is not', 'cannot'. No semicolon. Do not omit a noun, a verb, a subject, or an article.",
  "Use the same noun for the same thing. A proper name counts as one word. A paragraph has one topic and at most 6 sentences.",
  "Do not close with a 'Who designs X?' riddle.",
  "Word swaps: could → can; people → person or personnel; now → at this time; however → but; therefore → thus or 'as a result'; since (because) → because; may → can; should/shall → must; ensure → make sure; avoid → prevent; need (verb) → necessary; using → use or with.",
  "Also do not write: acceptable, alternate, any, both, further, have to, perform, portion, press as a verb, reach, repeat, required.",
].join(" ");

/** Short hint when seed missions are topic anchors only. */
export const PACK_STE_HINT =
  "Write fresh scene prose as ASD-STE100 description. Each sentence has at most 25 words. " +
  "No contractions. No semicolon. No Who-designs riddle. Keep the person, the place, the harm, and the local driver.";

const ABBREV_END = /\b(?:Mr|Mrs|Ms|Dr|St|vs|Jr|Sr|Prof|p\.m|a\.m|U\.S)\.$/i;

const CONTRACTION =
  /\b(?:[A-Za-z]+n't|[A-Za-z]+'(?:ll|re|ve|d|m)|it's|that's|what's|there's|here's|let's|who's)\b/i;

const RIDDLE = /^who (designs|builds|invents|writes|makes)\b/i;

/**
 * Split on sentence end. Keep Mr./Dr./9 p.m. intact.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSteSentences(text) {
  const flat = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/ +/g, " ")
    .trim();
  if (!flat) return [];
  const raw = flat.split(/(?<=[.!?])\s+/).filter(Boolean);
  /** @type {string[]} */
  const out = [];
  let buf = "";
  for (const bit of raw) {
    if (buf && ABBREV_END.test(buf)) {
      buf = `${buf} ${bit}`;
      continue;
    }
    if (buf) out.push(buf);
    buf = bit;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * @param {string} sentence
 */
export function steWordCount(sentence) {
  return String(sentence || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @param {string} text
 * @param {"description"|"procedure"} [kind]
 * @returns {string[]}
 */
export function packSteIssues(text, kind = "description") {
  const src = String(text || "").trim();
  /** @type {string[]} */
  const issues = [];
  if (!src) {
    issues.push("empty");
    return issues;
  }
  if (src.includes(";")) issues.push("semicolon");
  if (CONTRACTION.test(src)) issues.push("contraction");

  const limit = kind === "procedure" ? STE_PROCEDURE_MAX : STE_DESCRIPTION_MAX;
  const paragraphs = src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const blocks = paragraphs.length ? paragraphs : [src];
  /** @type {string[]} */
  const sentences = [];
  for (const block of blocks) {
    const parts = splitSteSentences(block);
    if (parts.length > 6) issues.push("paragraph_over_6");
    sentences.push(...parts);
  }
  if (kind === "procedure" && sentences.length > 1) {
    issues.push("procedure_not_one_sentence");
  }
  for (const sentence of sentences) {
    const n = steWordCount(sentence);
    if (n > limit) issues.push(`sentence_over_${limit}:${n}`);
    if (RIDDLE.test(sentence.trim())) issues.push("riddle_close");
  }
  return issues;
}

/**
 * @param {string[]} issues
 */
export function steRepairInstruction(issues = []) {
  const why = issues.length ? ` Issues: ${issues.slice(0, 12).join(", ")}.` : "";
  return (
    "Rewrite the quest text to ASD-STE100 sentence limits. Keep the same person, place, and facts. Do not solve the problem. " +
    "Each description sentence has at most 25 words. Your job is one imperative sentence of at most 20 words. " +
    "No contractions. No semicolons. No Who-designs riddle." +
    why
  );
}
