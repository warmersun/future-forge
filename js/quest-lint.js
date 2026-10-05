/**
 * Quest lint — warnings (not failures) for authored Quest tiles.
 *
 * Player text is a beat sequence plus a short form (the place, the bigger
 * problem). This module does not grade voice or length. It checks the data
 * the game needs: crisis meters, grounding for the model, shelf reasons,
 * research URLs, and learning-field pairs.
 * Pure; safe for Node tests and the browser.
 */

import {
  splitMarkdownSections,
  splitBodyChunks,
  roleFromHeading,
  normalizeBriefHeading,
} from "./brief-beats.js";
import { DO_NOT_SAY } from "./tech-why.js";
import { plainTextFromMarkdown } from "./md-lite.js";

/** What the co-inventor sees of the brief (js/game.js getContext). */
export const BRIEF_AI_CLIP = 2800;
/** What fast-eval sees of grounding (js/server/fast-eval.mjs GROUNDING_CAP). */
export const GROUNDING_AI_CLIP = 3000;
export const WALK_CARD_CAP = 8;
export const BUDGET_HIGH = 7;

const GROUNDING_HEADINGS = new Set([
  "technology",
  "capabilities",
  "trends & predictions",
  "trends and predictions",
  "trends",
  "predictions",
  "milestone",
  "milestones",
  "unlocks use case(s)",
  "unlocks use cases",
  "unlocks use case",
  "unlocks",
  "use cases",
  "use case",
  "applications",
  "honest limits",
]);

const PLACEHOLDERS = [
  /fill after research/i,
  /replace with/i,
  /a named person does/i,
  /trouble at fictive/i,
  /fictive field site/i,
  /what went wrong at this place/i,
];

/**
 * @param {object} rawTile — parsed JSON as authored
 * @param {object} validated — result of validateQuestTile / validateQuestDocument
 * @param {{ techs?: object[] }} [opts]
 * @returns {{ warnings: { code: string, hint: string }[] }}
 */
export function lintQuestTile(rawTile, validated, opts = {}) {
  /** @type {{ code: string, hint: string }[]} */
  const warnings = [];
  const warn = (code, hint) => warnings.push({ code, hint });
  const tile = rawTile && typeof rawTile === "object" ? rawTile : {};
  const kind = String(validated?.kind || validated?.tile?.kind || tile.kind || "quest");

  if (kind === "module") {
    lintModule(tile, validated, warn);
    return { warnings };
  }

  const mission = validated?.mission || {};
  const missionIn = tile.mission && typeof tile.mission === "object" ? tile.mission : {};
  const pick = (key) => (tile[key] !== undefined ? tile[key] : missionIn[key]);
  const spotlightId = String(mission.spotlight?.techId || tile.spotlight?.techId || "");
  const suggested = Array.isArray(mission.suggested) && mission.suggested.length
    ? mission.suggested.map(String)
    : Array.isArray(missionIn.suggested)
      ? missionIn.suggested.map(String)
      : spotlightId
        ? [spotlightId]
        : [];
  const summary = str(tile.summary || missionIn.summary);
  const title = str(tile.title || missionIn.title);
  const scene = str(missionIn.scene);
  const encourage = str(tile.spotlight?.encourageCopy ?? missionIn.spotlight?.encourageCopy);
  const briefMd = str(missionIn.briefMd);
  const beats = Array.isArray(pick("briefBeats")) ? pick("briefBeats") : [];

  /** @type {[string, string][]} */
  const playerFields = [
    ["title", title],
    ["summary", summary],
    ["scene", scene],
    ["encourageCopy", encourage],
    ["briefMd", plainTextFromMarkdown(briefMd)],
    ...beats.map((b, i) => [`briefBeats[${i}]`, plainTextFromMarkdown(str(b?.bodyMd))]),
  ];

  lintBrief(briefMd, warn);
  const pressure = missionIn.pressure && typeof missionIn.pressure === "object" ? missionIn.pressure : {};
  /** @type {[string, string][]} */
  const placeholderFields = [
    ["title", title],
    ["summary", summary],
    ["scene", scene],
    ["briefMd", briefMd],
    ["encourageCopy", encourage],
  ];
  for (const [role, meter] of Object.entries(pressure)) {
    if (!meter || typeof meter !== "object") continue;
    placeholderFields.push([`pressure.${role}.label`, str(meter.label)]);
    placeholderFields.push([`pressure.${role}.description`, str(meter.description)]);
  }
  lintPlaceholders(placeholderFields, warn);
  lintDoNotSay(playerFields, pressure, warn);
  lintPressure(pressure, warn);
  lintResources(pick("resources"), warn);
  lintGrounding(pick("grounding"), warn);
  lintResearch(tile.research, warn);
  lintSuggestedWhy(suggested, mission.suggestedWhy || pick("suggestedWhy"), pressure, warn);
  lintLearning(mission, pick, warn);

  return { warnings };
}

/**
 * Print-ready lines for the CLI.
 * @param {{ code: string, hint: string }[]} warnings
 */
export function formatLintWarnings(warnings) {
  return (warnings || []).map((w) => `WARN ${w.code}: ${w.hint}`);
}

// ---------------------------------------------------------------------------

function str(v) {
  return v == null ? "" : String(v);
}

function lintModule(tile, validated, warn) {
  const t = validated?.tile || tile;
  const fields = [
    ["title", str(t.title || tile.title)],
    ["summary", str(t.summary || tile.summary)],
    ["overviewMd", plainTextFromMarkdown(str(t.overviewMd || tile.overviewMd))],
  ];
  lintDoNotSay(fields, {}, warn);
}

function lintBrief(briefMd, warn) {
  if (!briefMd.trim()) return;
  const sections = splitMarkdownSections(briefMd);
  const roles = [];
  let chunkTotal = 0;

  for (const s of sections) {
    roles.push(roleFromHeading(s.title));
    chunkTotal += splitBodyChunks(s.body).length;
  }

  if (!roles.includes("place")) {
    warn("brief_missing_section:place", "No The place section; that is the local problem in the short form.");
  }
  if (!roles.includes("strain")) {
    warn(
      "brief_missing_section:strain",
      "No The bigger problem section; that is what this scene is an instance of."
    );
  }

  const plain = plainTextFromMarkdown(briefMd);
  if (chunkTotal > WALK_CARD_CAP) {
    warn(
      `brief_cards_over_cap:${chunkTotal}`,
      `The brief would derive ${chunkTotal} walkthrough cards; the engine merges down to ${WALK_CARD_CAP}, so cut paragraphs or author briefBeats.`
    );
  }
  if (plain.length > BRIEF_AI_CLIP) {
    warn(
      `brief_ai_clip:${plain.length}`,
      `The co-inventor reads only the first ${BRIEF_AI_CLIP} characters of the brief; keep the decisive facts early or trim.`
    );
  }
}

function lintPlaceholders(fields, warn) {
  for (const [field, text] of fields) {
    if (!text) continue;
    if (PLACEHOLDERS.some((re) => re.test(text)) || ((field === "title" || field === "summary") && /\(fictive\)/i.test(text))) {
      warn(
        `template_placeholder:${field}`,
        `${field} still carries placeholder text; replace it with the real place and people.`
      );
    }
  }
}

function lintDoNotSay(fields, pressure, warn) {
  const all = [...fields];
  for (const [role, meter] of Object.entries(pressure || {})) {
    if (!meter || typeof meter !== "object") continue;
    all.push([`pressure.${role}.label`, str(meter.label)]);
    all.push([`pressure.${role}.description`, str(meter.description)]);
  }
  for (const [field, text] of all) {
    if (!text) continue;
    const m = DO_NOT_SAY.exec(text);
    if (m) {
      warn(
        `do_not_say:${field}:${m[1]}`,
        `"${m[1]}" is UI or developer jargon that player copy keeps off the page; say it in plain words.`
      );
    }
  }
}

function lintPressure(pressure, warn) {
  const local = pressure.local && typeof pressure.local === "object" ? pressure.local : null;
  const global = pressure.global && typeof pressure.global === "object" ? pressure.global : null;
  const support = pressure.support && typeof pressure.support === "object" ? pressure.support : null;
  if (support && Number(support.pressureRise) > 0) {
    warn(
      "pressure_support_rises",
      "Support rises with the calendar; set pressureRise 0 unless you mean trust to rot with time."
    );
  }
  if (local && global && Number(local.pressure) <= Number(global.pressure)) {
    warn(
      "pressure_local_not_hotter",
      "Local is not hotter than global; new tiles start local 3 and global 2 so this year's harm is the first act."
    );
  }
  for (const role of ["local", "global", "support"]) {
    const m = pressure[role];
    if (m && typeof m === "object" && !str(m.description).trim()) {
      warn(
        `pressure_missing_description:${role}`,
        `pressure.${role} has no description; one or two everyday sentences of what this meter means here feed the crisis popup and the AI.`
      );
    }
  }
}

function lintResources(resources, warn) {
  if (!resources || typeof resources !== "object") return;
  const keys = Object.keys(resources);
  if (!keys.length) return;
  if (Number(resources.startingBudget) >= BUDGET_HIGH) {
    warn(
      "resources_budget_high",
      `startingBudget ${resources.startingBudget} pre-funds act two; pathway ease pays +1 Budget per eased role, so omit resources unless the first tile is unaffordable.`
    );
  } else {
    warn(
      "resources_present",
      "resources override the default wallet; keep only if the first island cannot buy the spotlight tech at Budget 5."
    );
  }
}

function lintGrounding(grounding, warn) {
  if (typeof grounding !== "string" || !grounding.trim()) {
    warn(
      "grounding_missing",
      "No grounding; the AI has no capability truth for this Quest, so add the emTech → product category → … → honest limits chain."
    );
    return;
  }
  const limitsAt = grounding.search(/^#{1,3}\s+honest limits\b/im);
  if (limitsAt < 0) {
    if (grounding.length > GROUNDING_AI_CLIP) {
      warn(
        "grounding_limits_missing",
        `grounding is ${grounding.length} characters with no Honest limits heading; add one inside the first ${GROUNDING_AI_CLIP} characters.`
      );
    }
  } else if (limitsAt > GROUNDING_AI_CLIP) {
    warn(
      `grounding_limits_past_clip:${limitsAt}`,
      `Honest limits starts at character ${limitsAt}; fast-eval reads only the first ${GROUNDING_AI_CLIP}, so move it up (right after Milestone).`
    );
  }
  for (const s of splitMarkdownSections(grounding)) {
    const key = normalizeBriefHeading(s.title).replace(/[:.]+$/, "");
    if (key === "the place") continue; // preamble before the first heading
    if (!GROUNDING_HEADINGS.has(key)) {
      warn(
        `grounding_unknown_heading:${s.title}`,
        `"${s.title}" is not part of the grounding chain; move tutor-only notes to aiTutorContext.`
      );
    }
  }
}

function lintResearch(research, warn) {
  if (!research || typeof research !== "object") return;
  const sources = research.sources;
  if (Array.isArray(sources) && sources.length === 0) {
    warn("research_sources_empty", "research.sources is an empty array; add the https sources you used or omit the key.");
    return;
  }
  if (!Array.isArray(sources)) {
    warn("research_sources_missing", "research has no sources; cite the advance with https links or omit research.");
    return;
  }
  for (const s of sources) {
    const url = typeof s === "string" ? s : str(s?.url);
    if (!url) continue;
    if (!/^https:\/\//i.test(url)) {
      warn(`research_source_not_https:${url}`, "Sources must be https URLs.");
    }
    if (/https?:\/\/(www\.)?example\.(com|org)\b/i.test(url)) {
      warn(`research_source_placeholder:${url}`, "Replace the example.com placeholder with the real source.");
    }
  }
}

function lintSuggestedWhy(suggested, why, pressure, warn) {
  const labels = Object.values(pressure || {})
    .map((m) => str(m?.label).trim().toLowerCase())
    .filter(Boolean);
  const map = why && typeof why === "object" && !Array.isArray(why) ? why : {};
  for (const id of suggested) {
    const text = str(map[id]).trim();
    if (!text) {
      warn(
        `suggestedWhy_missing:${id}`,
        `No suggestedWhy for ${id}; write one plain sentence (≤120 chars) saying what this family could do here and which meter it eases.`
      );
      continue;
    }
    const low = text.toLowerCase();
    if (labels.length && !labels.some((l) => low.includes(l))) {
      warn(
        `suggestedWhy_no_meter_label:${id}`,
        `suggestedWhy for ${id} names no crisis meter label; include the label verbatim so it ranks first in "What could help here?".`
      );
    }
  }
}

function lintLearning(mission, pick, warn) {
  const isLearning = mission.isLearningModule === true || pick("isLearningModule") === true;
  const lesson = mission.lesson ?? pick("lesson");
  const total = mission.totalLessons ?? pick("totalLessons");
  if ((lesson != null) !== (total != null)) {
    warn(
      "learning_lesson_without_total",
      "lesson and totalLessons must travel together or the progress bar paints nothing."
    );
  }
  if (isLearning && !str(mission.aiTutorContext || pick("aiTutorContext")).trim()) {
    warn(
      "learning_no_tutor_context",
      "isLearningModule is set but there is no aiTutorContext; the tutor has nothing to teach."
    );
  }
}
