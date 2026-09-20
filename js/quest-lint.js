/**
 * Quest craft lint — warnings (not failures) for authored Quest tiles.
 *
 * `validate:quest` checks JSON shape. This module checks the craft rules the
 * skill asks for: instance-first player prose, tech offstage, brief headings,
 * walkthrough card count, meter defaults, grounding that survives the AI clip.
 * Pure; safe for Node tests and the browser.
 */

import { TECHS } from "./data.js";
import {
  splitMarkdownSections,
  splitBodyChunks,
  roleFromHeading,
  normalizeBriefHeading,
  wordCount,
} from "./brief-beats.js";
import { assertSceneReadable } from "./scene-prose.js";
import { DO_NOT_SAY } from "./tech-why.js";
import { plainTextFromMarkdown } from "./md-lite.js";

/** What the co-inventor sees of the brief (js/game.js getContext). */
export const BRIEF_AI_CLIP = 2800;
/** What fast-eval sees of grounding (js/server/fast-eval.mjs GROUNDING_CAP). */
export const GROUNDING_AI_CLIP = 3000;
export const BRIEF_WORDS = { min: 250, max: 600 };
export const PLACE_PARAGRAPHS = { min: 2, max: 4 };
export const PARAGRAPH_MAX_WORDS = 90;
export const WALK_CARD_CAP = 8;
export const BUDGET_HIGH = 7;

/** Common player-text leaks per tech id (beyond the catalog name / id). */
const TECH_ALIASES = {
  ai: ["artificial intelligence", "on-device AI", "open-weight", "edge AI", "language model", "LLM"],
  "gene-sequencing": ["sequencer", "sequencing", "genome"],
  synbio: ["synthetic biology", "synbio"],
  robots: ["robot"],
  drones: ["drone"],
  solar: ["solar panel"],
  battery: ["battery"],
  crypto: ["blockchain", "onchain", "stablecoin"],
  bci: ["brain-computer", "neural implant"],
  quantum: ["quantum"],
  print3d: ["3D print"],
  vr: ["VR", "headset"],
  iot: ["sensor network"],
  networks: ["5G", "mesh network"],
  nano: ["nanotech"],
  "alt-proteins": ["cultivated meat", "precision fermentation"],
  "genetic-engineering": ["CRISPR", "gene editing"],
};

const LEGACY_HEADINGS = new Set([
  "what's strained",
  "what just became possible",
  "a capability that just became more real",
  "constraints",
  "your brief",
]);
const CANON_HEADINGS = new Set(["the place", "the bigger problem", "your job"]);

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

const BAN_LIST = [/\bdo not invent\b/i, /\bpass a law\b/i, /\bban the\b/i, /\bUBI\b/, /\bnot asked to\b/i];
const PRESCRIBES = [/^build your invention around/i, /\binvent with\b/i, /is the point of this quest/i];
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
  const techs = Array.isArray(opts.techs) ? opts.techs : TECHS;
  /** @type {{ code: string, hint: string }[]} */
  const warnings = [];
  const warn = (code, hint) => warnings.push({ code, hint });
  const tile = rawTile && typeof rawTile === "object" ? rawTile : {};
  const kind = String(validated?.kind || validated?.tile?.kind || tile.kind || "quest");

  if (kind === "module") {
    lintModule(tile, validated, techs, warn);
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
  const watchIds = [...new Set([spotlightId, ...suggested].filter(Boolean))];

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

  lintTechNames(playerFields, watchIds, techs, warn);
  lintSummary(summary, warn);
  lintEncourage(encourage, warn);
  lintBrief(briefMd, warn);
  lintScene(scene, warn);
  lintPlaceholders([["title", title], ["summary", summary], ["scene", scene], ["briefMd", briefMd]], warn);

  const pressure = missionIn.pressure && typeof missionIn.pressure === "object" ? missionIn.pressure : {};
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

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word, case-insensitive matcher for a phrase (word chars only at edges).
 * @param {string} phrase
 */
function phraseRe(phrase) {
  const body = escapeRe(phrase).replace(/\s+/g, "\\s+");
  const lead = /^\w/.test(phrase) ? "(?<![\\w-])" : "";
  const tail = /\w$/.test(phrase) ? "(?![\\w-])" : "";
  return new RegExp(`${lead}${body}${tail}`, "i");
}

function lintModule(tile, validated, techs, warn) {
  const t = validated?.tile || tile;
  const spotlightId = String(t.spotlight?.techId || tile.spotlight?.techId || "");
  const fields = [
    ["title", str(t.title || tile.title)],
    ["summary", str(t.summary || tile.summary)],
    ["overviewMd", plainTextFromMarkdown(str(t.overviewMd || tile.overviewMd))],
  ];
  if (spotlightId) lintTechNames(fields, [spotlightId], techs, warn);
  lintSummary(str(t.summary || tile.summary), warn);
  lintDoNotSay(fields, {}, warn);
}

function lintTechNames(fields, ids, techs, warn) {
  const byId = new Map((techs || []).map((t) => [t.id, t]));
  for (const id of ids) {
    const tech = byId.get(id);
    const phrases = new Set();
    if (tech?.name) phrases.add(tech.name);
    if (id.length > 2) phrases.add(id);
    for (const a of TECH_ALIASES[id] || []) phrases.add(a);
    for (const [field, text] of fields) {
      if (!text) continue;
      for (const phrase of phrases) {
        if (phraseRe(phrase).test(text)) {
          warn(
            `tech_named_in_player_text:${field}:${phrase}`,
            `"${phrase}" names the ${tech?.name || id} family in ${field}; keep the tech in suggestedWhy, grounding, or the tutor and describe the human problem instead.`
          );
          break;
        }
      }
    }
  }
}

function lintSummary(summary, warn) {
  if (!summary.trim()) return;
  const first = summary.split(/(?<=[.!?])\s+/)[0] || "";
  const themeLede = /\.$/.test(first.trim()) && wordCount(first) <= 3;
  if (themeLede || /this is about how far/i.test(summary)) {
    warn(
      "summary_theme_lede",
      "Summary opens on a theme word or a tech-gap sentence; start with a named person doing something in the place, now."
    );
  }
}

function lintEncourage(encourage, warn) {
  if (!encourage.trim()) return;
  if (PRESCRIBES.some((re) => re.test(encourage))) {
    warn(
      "encourage_prescribes_tech",
      "encourageCopy tells the player which tech to use; state the outcome that must get better in everyday words."
    );
  }
}

function lintBrief(briefMd, warn) {
  if (!briefMd.trim()) return;
  const sections = splitMarkdownSections(briefMd);
  const roles = [];
  let chunkTotal = 0;

  for (const s of sections) {
    const key = normalizeBriefHeading(s.title);
    if (LEGACY_HEADINGS.has(key)) {
      warn(
        `brief_legacy_heading:${s.title}`,
        `"${s.title}" is a legacy heading; use The place, The bigger problem, Your job (capability lectures go to grounding).`
      );
    } else if (!CANON_HEADINGS.has(key)) {
      warn(
        `brief_unknown_heading:${s.title}`,
        `"${s.title}" is not one of The place / The bigger problem / Your job; the walk shows it as an extra card before the job.`
      );
    }
    const role = roleFromHeading(s.title);
    roles.push(role);
    const chunks = splitBodyChunks(s.body);
    chunkTotal += chunks.length;

    const paragraphs = s.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (role === "place") {
      if (paragraphs.length < PLACE_PARAGRAPHS.min || paragraphs.length > PLACE_PARAGRAPHS.max) {
        warn(
          `place_paragraphs_out_of_band:${paragraphs.length}`,
          `The place has ${paragraphs.length} paragraphs; write 2–4 short ones (hook, complication, mechanism, stakes), one per walkthrough card.`
        );
      }
    }
    for (const p of paragraphs) {
      const n = wordCount(plainTextFromMarkdown(p));
      if (n > PARAGRAPH_MAX_WORDS) {
        warn(
          `paragraph_too_long:${s.title}:${n}`,
          `A paragraph under "${s.title}" runs ${n} words; split it so each card stays under ${PARAGRAPH_MAX_WORDS}.`
        );
      }
    }
  }

  for (const need of ["place", "strain", "job"]) {
    if (!roles.includes(need)) {
      warn(
        `brief_missing_section:${need}`,
        need === "strain"
          ? "No The bigger problem section; add the zoom-out with the root cause in everyday words."
          : need === "place"
            ? "No The place section; open with the instance story."
            : "No Your job section; end with the outcome-only invent job."
      );
    }
  }
  const jobAt = roles.indexOf("job");
  const placeAt = roles.indexOf("place");
  const strainAt = roles.indexOf("strain");
  if (jobAt >= 0 && ((placeAt >= 0 && jobAt < placeAt) || (strainAt >= 0 && jobAt < strainAt))) {
    warn(
      "brief_heading_order",
      "Your job comes before the story in the source; order the brief The place → The bigger problem → Your job."
    );
  }

  const plain = plainTextFromMarkdown(briefMd);
  const words = wordCount(plain);
  if (words < BRIEF_WORDS.min || words > BRIEF_WORDS.max) {
    warn(
      `brief_words_out_of_band:${words}`,
      `briefMd is ${words} words; aim for ${BRIEF_WORDS.min}–${BRIEF_WORDS.max} (short paragraphs, no capability lecture).`
    );
  }
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
  for (const re of BAN_LIST) {
    const m = re.exec(plain);
    if (m) {
      warn(
        `brief_ban_list:${m[0]}`,
        `"${m[0]}" reads as a ban-list or policy job; leave the invent open and keep rules as root cause or weather.`
      );
    }
  }
}

function lintScene(scene, warn) {
  if (!scene.trim()) return;
  const r = assertSceneReadable(scene);
  if (r.ok) return;
  for (const reason of r.reasons || []) {
    if (reason === "too_few_sentences") continue; // a 500-char lede is allowed to be brief
    warn(
      `scene_unreadable:${reason}`,
      "mission.scene is dense on first read; use several short sentences with 2–4 punch lines and no semicolon chains."
    );
  }
}

function lintPlaceholders(fields, warn) {
  for (const [field, text] of fields) {
    if (!text) continue;
    if (PLACEHOLDERS.some((re) => re.test(text)) || ((field === "title" || field === "summary") && /\(fictive\)/i.test(text))) {
      warn(
        `template_placeholder:${field}`,
        `${field} still carries scaffold text from author-quest; replace it with the real place and people.`
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
