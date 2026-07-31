/**
 * Shared player-facing quest scene prose contract.
 * Source: Nonfiction short stories as design challenges (craft),
 * adapted for Future Forge local quest scenes.
 *
 * Used by seed gen, server co-inventor, and client guidance.
 * Goal: easy first read — NOT shorter text for its own sake.
 */

/** Full contract for modeInstruction / guidance payloads. */
export const SCENE_PROSE = [
  "SCENE PROSE (player-facing design-challenge story):",
  "Each quest scene is a flight simulator for a design decision.",
  "The reader should finish able to retell one scene, name one tension, and feel the open design problem in their gut — not leave with a framework dump or a solution brief.",
  "Core test: if the reader remembers only one thing, what decision becomes sharper?",
  "",
  "STORY SPINE (mandatory order):",
  "1) Hook — specific person, place, moment, action. No thesis opener. No definition opener. No \"In today's world…\".",
  "2) Complication — the world pushes back (constraint, failure, tradeoff, surprise) inside the scene.",
  "3) Mechanism in motion — the local system/driver that keeps the theme problem going is revealed through what people do, not a lecture.",
  "4) Stakes — human-scale consequence (one person, team, or decision — not \"society\").",
  "5) Challenge land — close on the open design tension. Do not solve it. Do not list takeaways.",
  "",
  "CONTENT (must appear as lived story, not checklist labels):",
  "(1) lived local harm people feel now;",
  "(2) a local driver/system that keeps producing the theme problem — not only how people shelter from symptoms.",
  "Pick one plot type per scene: Challenge (obstacle vs grit/constraint), Connection (trust/who is left out), or Creativity (a novel move that redefines the problem). Do not blend all three.",
  "",
  "VOICE:",
  "Confident and declarative. Plain but not flat. Warm but unsentimental. Third person by default.",
  "No meta, no workshop jargon, no \"this case shows,\" \"as designers we must,\" \"the lesson here is.\"",
  "If you use jargon or a concept the reader may not know, introduce it once: plain definition → concrete image → resume the scene.",
  "",
  "RHYTHM (this fixes hard-to-read dense stacks):",
  "Vary sentence length. After a complex beat, land a short punch-line sentence — often its own breath.",
  "Use punch-line sentences 2–4 times per scene (more dilutes them).",
  "Default beat: Explain → Concretize → Land.",
  "Prefer one idea per sentence breath. Do not stack three clauses with while/because/so/which into one megasentence.",
  "Avoid semicolon chains and em-dash lists of abstractions.",
  "Do NOT shorten for its own sake — keep texture and stakes; make the path through the story easy.",
  "",
  "OPENING / CLOSING:",
  "Opening fails if it starts with a thesis, a question, a definition, a trend, or \"Imagine…\".",
  "Opening passes if a specific person does a specific thing in a specific moment, with tension already seeded.",
  "Closing fails if it summarizes lessons, lists principles, or hands a solution checklist.",
  "Closing passes if a short final beat leaves the design challenge sharp, open, and hard to unsee.",
  "",
  "CUT: repeated restatements, empty intensifiers (very/incredibly/really), throat-clearing,",
  "sentences that tell the reader how to feel, policy-brief packing, solution theater.",
  "",
  "BAD (dense stack — never write like this):",
  "\"In the chawl maternity room, mothers share cots under a tin roof that holds the day's heat long after dark while the grid dies and fans stop and the sterilizer goes cold, so a new mother spikes a fever with no clean way to cool her because a wiring plan built for lights and phones—landlords still meter power by the room—never reaches the birth floor.\"",
  "",
  "GOOD (same facts, story craft — not shorter for its own sake):",
  "\"Night holds the day's heat under the tin roof. Mothers share cots on the birth floor. When the grid dies, fans stop. The sterilizer goes cold. A new mother spikes a fever, and there is no clean way to cool her or keep instruments safe. Landlords still meter power by the room. The wiring was built for lights and phones, not for round-the-clock birth care. Backup never reaches this floor. Who designs power for the hour a life arrives?\"",
].join(" ");

/** Short system-prompt paste (tone line + spine reminder). */
export const SCENE_PROSE_CAPSULE = [
  "Quest scene prose: nonfiction design-challenge story craft.",
  "Spine: scene hook → complication → mechanism through action → human stakes → close on open design challenge (do not solve).",
  "Voice: confident, declarative, plain-but-not-flat, warm-but-unsentimental, third person, no meta.",
  "Rhythm: vary sentence length; 2–4 short punch-line sentences; one idea per breath; no dense stacked clauses.",
  "Must include lived local harm + local driver as story, not checklist. Do not shorten for its own sake.",
].join(" ");

/** Soft hint when seed missions are topic anchors only. */
export const SCENE_HINT_REWRITE =
  "Write fresh scene prose with design-challenge story craft (hook → complication → mechanism → stakes → open challenge). " +
  "Vary sentence length and land punch-lines. Do not imitate dense stacked-clause style. Do not shorten for its own sake.";

/** Technical cap — generous so craft is not truncated mid-story. */
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
  if (long.length >= 3 && shortPunch.length < 2) {
    reasons.push("long_sentences_without_punches");
  }
  if (long.length >= 1 && sentences.length <= 4 && shortPunch.length === 0) {
    reasons.push("all_dense_no_punches");
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
    " Fix rhythm only: vary sentence length, land 2–4 short punch-line sentences," +
    " one idea per breath, story spine (hook → complication → mechanism → stakes → open challenge)." +
    " Do not solve the problem. Do not shorten for its own sake." +
    why
  );
}
