/**
 * Player-facing quest prose.
 * Used by seed gen, server prompts, and client guidance.
 * Less is more: one instance of the global problem, and what that problem is.
 */

/** Full contract for modeInstruction / guidance payloads. */
export const SCENE_PROSE = [
  "SCENE PROSE:",
  "Less is more. Every word costs the reader. Cut a word, line, or paragraph unless the scene is unclear without it.",
  "Plain words. Short sentences. No throat-clearing, no lecture, no second telling of the same fact.",
  "The player must get two things: (1) one instance of the global problem — a concrete place and what is happening there now; (2) what the global problem is, in everyday words.",
  "Voice, person, and length are free. Do not pad to a five-beat spine, a plot type, or a word count.",
  "An optional ask may be an outcome to invent, or which emTech, capability, and use case fit. Naming that technology is allowed.",
  "Do not close with a law, a ban, or a bill.",
].join(" ");

/** Short system-prompt paste. */
export const SCENE_PROSE_CAPSULE = [
  "Quest prose: less is more. Cut anything the reader does not need.",
  "Show one instance of the global problem, and say what that problem is. Plain words. Short sentences.",
  "Voice and length are free. Do not pad. The ask, if any, is an invention or the emTech, capability, and use case that fit.",
].join(" ");

/** Soft hint when seed missions are topic anchors only. */
export const SCENE_HINT_REWRITE =
  "Write a short scene: one instance of the global problem, and what that problem is. " +
  "Cut every line that is not needed. Do not pad. Do not close with Who designs X?";

/**
 * Generated seed scenes (js/scenario-seeds.js) may run this long.
 * Imported Quest tiles cap mission.scene at 500 (CAPS.scene in js/quest-tile.js);
 * their longer story lives in briefMd.
 */
export const SCENE_CHAR_CAP = 2000;

/**
 * Split into sentences (simple; good enough for a craft gate).
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  return String(text || "")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} sentence
 */
function wordCount(sentence) {
  return sentence.split(/\s+/).filter(Boolean).length;
}

/**
 * Heuristic readability / craft gate — not a Hemingway API.
 * Measures path-through ease, not "must be shorter."
 *
 * @param {string} text
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function assertSceneReadable(text) {
  const scene = String(text || "").trim();
  /** @type {string[]} */
  const reasons = [];
  if (!scene) {
    return { ok: false, reasons: ["empty_scene"] };
  }

  const sentences = splitSentences(scene);
  if (sentences.length < 4) {
    reasons.push("too_few_sentences");
  }

  const lengths = sentences.map(wordCount);
  const long = lengths.filter((n) => n > 22);
  const veryLong = lengths.filter((n) => n > 28);
  const shortPunch = lengths.filter((n) => n > 0 && n <= 8);

  // Dense stacks: several long sentences without punch-line relief
  if (veryLong.length >= 2) {
    reasons.push("multiple_very_long_sentences");
  }
  if (long.length >= 3 && shortPunch.length < 1) {
    reasons.push("long_sentences_without_punches");
  }
  if (long.length >= 1 && sentences.length <= 4 && shortPunch.length === 0) {
    reasons.push("all_dense_no_punches");
  }
  if (shortPunch.length >= 5 && sentences.length >= 6) {
    reasons.push("too_many_punch_lines");
  }

  if ((scene.match(/;/g) || []).length >= 2) {
    reasons.push("semicolon_chains");
  }
  if ((scene.match(/—/g) || []).length >= 3) {
    reasons.push("emdash_abstraction_lists");
  }

  const open = sentences[0] || "";
  if (
    /^(in today's|in a world|across the|globally|imagine\b|the challenge of|this (problem|issue|case)|it is (important|worth)|interestingly\b)/i.test(
      open
    )
  ) {
    reasons.push("thesis_or_trend_opener");
  }

  const close = sentences[sentences.length - 1] || "";
  if (
    /\b(the lesson|key takeaway|in conclusion|to summarize|the solution is|they solved|metrics improved)\b/i.test(
      close
    ) ||
    /\b(therefore we must|designers should|stakeholders need to)\b/i.test(close)
  ) {
    reasons.push("solution_or_takeaway_close");
  }
  if (/^Who (designs|writes|builds|invents)\b/i.test(close)) {
    reasons.push("riddle_close");
  }

  // Stacked relative/subordinate glue in a single sentence
  for (const s of sentences) {
    const glue =
      (s.match(/\b(while|because|so that|which|although|when|where)\b/gi) || []).length;
    if (wordCount(s) > 20 && glue >= 3) {
      reasons.push("stacked_clause_sentence");
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * One-line repair instruction for a rewrite pass.
 * @param {string[]} reasons
 */
export function sceneRepairInstruction(reasons = []) {
  const why = reasons.length ? ` Issues: ${reasons.join(", ")}.` : "";
  return (
    "Rewrite each quest scene with the same facts, place, and design tension." +
    " Fix rhythm only: spoken mid-length sentences, at most 1–2 short punch-lines," +
    " no telegram chops, no Who-designs-X riddle, story spine (hook → complication → mechanism → stakes → open challenge)." +
    " Do not solve the problem. Do not shorten for its own sake." +
    why
  );
}
