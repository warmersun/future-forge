/**
 * Grok Voice session prompt, tools, and keyterms for the co-inventor.
 * Spoken partner — not the JSON SYSTEM_PROMPT used by POST /api/co-invent.
 */

import { knownVoiceId } from "../voice-choices.js";
import { listLessonMedia, tutorNotesForVoice } from "../lesson-media.js";

export const VOICE_MODEL = "grok-voice-latest";
export const VOICE_SAMPLE_RATE = 24_000;
export const VOICE_DEFAULT_ID = "eve";
export const KEYTERM_MAX = 100;
export const KEYTERM_LEN = 50;
/** Stop a crafted catalog from blowing up get_invent_state. Real shelves fit. */
export const SNAPSHOT_TECH_MAX = 120;

const PROMPT_SECTIONS = [
  "Role & Persona",
  "Objective",
  "Conversation Flow",
  "Guardrails & Escalation",
  "Voice & Communication Style",
  "CRITICAL INSTRUCTIONS",
];

/**
 * @param {unknown} s
 * @param {number} n
 */
export function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : "";
}

/**
 * @param {object|null|undefined} context
 * @returns {object[]}
 */
export function listAvailableTechs(context) {
  const raw = Array.isArray(context?.availableTechs) ? context.availableTechs : [];
  const out = [];
  const seen = new Set();
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const id = String(t.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: clip(t.name || id, 80),
      domain: t.domain ? String(t.domain) : null,
    });
  }
  return out;
}

/**
 * @param {object|null|undefined} context
 * @returns {{ id: string, name: string }[]}
 */
export function listSelectedTechs(context) {
  const available = listAvailableTechs(context);
  const byId = new Map(available.map((t) => [t.id, t]));
  const ids = Array.isArray(context?.selectedTechIds)
    ? context.selectedTechIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const out = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const t = byId.get(id);
    out.push({ id, name: t?.name || id });
  }
  return out;
}

/**
 * @param {object|null|undefined} pressure
 * @returns {{ label: string, level: number }[]}
 */
export function listPressure(pressure) {
  if (!pressure) return [];
  if (Array.isArray(pressure)) {
    return pressure
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        label: clip(x.label || x.name || x.id, 60),
        level: Number(x.level) || 0,
      }))
      .filter((x) => x.label)
      .slice(0, 8);
  }
  if (typeof pressure === "object") {
    return Object.entries(pressure)
      .map(([label, level]) => ({
        label: clip(label, 60),
        level: Number(level) || 0,
      }))
      .filter((x) => x.label)
      .slice(0, 8);
  }
  return [];
}

/**
 * ASR bias terms: place, crises, selected + available emTech names.
 * @param {object|null|undefined} context
 * @returns {string[]}
 */
export function buildVoiceKeyterms(context = {}) {
  const terms = [];
  const push = (raw) => {
    const t = clip(raw, KEYTERM_LEN);
    if (t) terms.push(t);
  };
  push(context.place);
  push(context.challenge?.title);
  push(context.challenge?.stakes);
  for (const p of listPressure(context.pressure)) push(p.label);
  for (const t of listSelectedTechs(context)) {
    push(t.name);
    push(t.id);
  }
  for (const t of listAvailableTechs(context)) {
    push(t.name);
    push(t.id);
  }
  const seen = new Set();
  const out = [];
  for (const t of terms) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= KEYTERM_MAX) break;
  }
  return out;
}

/**
 * Compact invent snapshot for the get_invent_state tool.
 * @param {object|null|undefined} context
 */
export function inventStateSnapshot(context = {}) {
  const hex = Boolean(context.hexInvent);
  const pending = Boolean(context.metricsPending);
  const selected = listSelectedTechs(context);
  const pathways = Array.isArray(context.hexBoard?.pathways)
    ? context.hexBoard.pathways.slice(0, 8).map((p) => ({
        howText: clip(p.howText, 400),
        inventionIds: Array.isArray(p.inventionIds)
          ? p.inventionIds.map(String).slice(0, 12)
          : [],
      }))
    : [];
  return {
    year: context.year ?? null,
    place: clip(context.place, 80),
    title: clip(context.challenge?.title, 120),
    hexInvent: hex,
    tutorMode: Boolean(context.tutorMode),
    selected,
    how: hex ? "" : clip(context.inventionHow, 800),
    life: hex ? "" : clip(context.inventionImpact, 800),
    name: hex ? "" : clip(context.inventionName, 80),
    pathways,
    pressure: pending ? [] : listPressure(context.pressure),
    metricsPending: pending,
    availableTechs: listAvailableTechs(context).slice(0, SNAPSHOT_TECH_MAX),
    turn: context.turn ?? null,
    focusTechId: clip(context.focusTechId, 80) || null,
    spotlightTechId: clip(context.spotlightTechId, 80) || null,
    guidance: clip(context.guidance, 400),
  };
}

/**
 * Second-person Grok Voice instructions (fixed H2 order).
 * @param {object|null|undefined} context
 * @returns {string}
 */
export function buildVoiceInstructions(context = {}) {
  const title = clip(context.challenge?.title, 120) || "this Quest";
  const place = clip(context.place, 80) || "this place";
  const year = context.year != null ? String(context.year) : "this year";
  const hex = Boolean(context.hexInvent);
  const tutor = Boolean(context.tutorMode);
  const pendingMetrics = Boolean(context.metricsPending);
  const selected = listSelectedTechs(context);
  const stack =
    selected.length > 0
      ? selected.map((t) => `${t.name} (${t.id})`).join(", ")
      : "none yet";
  const pressure = pendingMetrics
    ? ""
    : listPressure(context.pressure)
        .map((p) => `${p.label} ${p.level}`)
        .join(", ");
  const how = hex
    ? clip(context.hexBoard?.pathways?.[0]?.howText, 500)
    : clip(context.inventionHow, 500);
  const life = hex ? "" : clip(context.inventionImpact, 280);
  const problem = clip(context.challenge?.problem, 500);
  const guidance = clip(context.guidance, 400);
  const spotlight = clip(context.spotlightTechId, 80);
  const tutorBlock = tutor ? tutorVoiceBlock(context.aiTutorContext) : "";
  const surface = hex
    ? "They invent on a hex board. A placed pathway is one connected island and has one how-it-works for that whole pathway. A new invent tile gets its own how-it-works in the How it works box, then they mint the tile and place it. There is no invention name and no second description field."
    : "They write an invention name, how it works, and everyday life, and pick emTechs for a stack.";
  const roleLine = tutor
    ? `You are the AI co-inventor tutor in Future Forge, sitting with one learner on ${title} in ${place} (${year}).`
    : `You are the AI co-inventor in Future Forge, sitting with one learner on ${title} in ${place} (${year}).`;

  return `## Role & Persona
${roleLine} You are a creative partner, not the sole inventor. Warm, practical, hopeful. You talk like a sharp colleague at a workshop table.

## Objective
Help them invent a local solution with emerging technologies for this place and year. They lead. You brainstorm, teach in plain words, and may suggest emTechs or draft how-it-works text they can apply. You do not mint tiles, place them, or write the board yourself.

## Conversation Flow
${surface}
Current stack: ${stack}.
${
  pendingMetrics
    ? "Crisis meters are being re-checked. Do not quote meter levels until get_invent_state returns them."
    : pressure
      ? `Crisis meters: ${pressure}.`
      : ""
}
${problem ? `The situation: ${problem}` : ""}
${guidance ? `Quest note: ${guidance}` : ""}
${spotlight ? `Spotlight emTech id: ${spotlight}. Prefer that capability when it honestly fits this year.` : ""}
${tutorBlock}
${how ? `How it works so far: ${how}` : "They have not written how it works yet."}
${life ? `Everyday life so far: ${life}` : ""}
Listen first. Ask at most one good question per turn. If they want a stack idea, call \`suggest_techs\` with real ids after you name them in speech. ${
    hex
      ? "If they want how a placed pathway works, call \`draft_how\` with target pathway. If they want the description for a new invent tile, the invent card, or so they can mint, call \`draft_how\` with target mint. That fills How it works. They edit it, mint the tile, and place it. You do not mint it. Do not describe another writing surface."
      : "If they want mechanism text, call \`draft_how\`. If they want everyday-life prose, call \`draft_life\`."
  }
Call \`get_invent_state\` when you are unsure what is on the board now.
${
  tutor
    ? "This is a free tutoring session. Stay with one short idea at a time. Speak the explanation in plain words. Never say a URL, a filename, or the word image. If the catalog lists lesson images or links, call `show_lesson_media` after that explanation with the ids for this turn: the next sequence idea, a listed misconception, or they asked for the picture or the long version. One image and its reading link is the normal turn. Pass more ids only when they ask to see more. The chat shows them. Do not read them. Call `end_tutoring` only when they clearly want to invent on their own."
    : "Quick chips like Spark and SIT stay on the screen — do not try to run those modes."
}

## Guardrails & Escalation
Stay local to ${place} in ${year}. A law, ban, UBI bill, or treaty is not an invent — the invent makes something scarce more abundant with emTechs here.
emTech categories are ALWAYS pickable. Timing is about claims in how-it-works versus the calendar, never "you cannot pick this until year X".
Only suggest technology ids that \`get_invent_state\` lists under availableTechs.
Give no medical, legal, or financial advice as if you were licensed. If they mention self-harm, crisis, or an emergency, respond with care, point them to local emergency services, and stop inventing.

## Voice & Communication Style
Spoken word only: no markdown, no bullet lists, no emojis, no stage directions.
1–2 short sentences per turn unless they ask for more.
Plain words first, then the term, when a high-school senior would not know it.
Respond only in English. Vary phrasing; do not repeat the same sentence twice.
If their speech is empty, garbled, or incomplete, ask a short clarification instead of guessing.

## CRITICAL INSTRUCTIONS
You lead nothing on the board. NEVER claim you added a tile, changed a meter, or spent AP.
ALWAYS call a tool when you propose specific emTechs or a how-it-works draft — speech alone does not apply.
NEVER invent technology ids. NEVER call tools that are not in your tool list.
`.trim();
}

/**
 * Custom function tools for Grok Voice session.update.
 * Hex sessions omit draft_life so a new tile is not described as another surface.
 * @param {object|null|undefined} [context]
 * @returns {object[]}
 */
export function voiceToolSchemas(context = {}) {
  const hex = Boolean(context?.hexInvent);
  const tools = [
    {
      type: "function",
      name: "get_invent_state",
      description:
        "Read the current Quest year, place, stack, how-it-works, and available emTech ids. Call when the board may have changed.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      type: "function",
      name: "suggest_techs",
      description:
        "Offer emTechs the learner can Apply / Invent with. Use only ids from availableTechs. Speak the names first, then call this so Apply buttons appear. Does not add tiles by itself.",
      parameters: {
        type: "object",
        properties: {
          techIds: {
            type: "array",
            items: { type: "string" },
            description: "emTech ids from availableTechs, 1–4 ids",
          },
        },
        required: ["techIds"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "draft_how",
      description: hex
        ? "Offer a how-it-works draft the learner can apply. target pathway writes the placed pathway. target mint fills How it works for a new invent tile they will mint. Does not mint or place the tile."
        : "Offer a how-it-works draft the learner can Apply. Does not write the board by itself.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "One short mechanism paragraph in everyday words, local to this place and year",
          },
          ...(hex
            ? {
                target: {
                  type: "string",
                  enum: ["pathway", "mint"],
                  description:
                    "pathway = how the placed pathway works. mint = How it works for a new tile they mint.",
                },
              }
            : {}),
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "draft_life",
      description:
        "Offer an everyday-life draft the learner can Apply. Legacy essay surface only — not the hex board.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "How daily life changes if this invent works, in everyday words",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "show_lesson_media",
      description:
        "Show lesson illustrations and reading links in the chat. Tutoring only. Speak the idea first, then call this with catalog ids. Does not read URLs aloud.",
      parameters: {
        type: "object",
        properties: {
          imageIds: {
            type: "array",
            items: { type: "string" },
            description: "img1, img2, … from the lesson catalog. Usually one.",
          },
          linkIds: {
            type: "array",
            items: { type: "string" },
            description: "link1, link2, … Usually the matching reading. More only if they ask.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "end_tutoring",
      description:
        "End the free tutoring session after the learner clearly wants to invent on their own. Tutoring only.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  ];
  if (!hex) return tools;
  return tools.filter((tool) => tool.name !== "draft_life");
}

/**
 * Full session.update payload for Grok Voice.
 * @param {object|null|undefined} context
 * @param {{ voice?: string, sampleRate?: number }} [opts]
 */
export function buildSessionUpdate(context = {}, opts = {}) {
  const voice = knownVoiceId(opts.voice) || VOICE_DEFAULT_ID;
  const rate = Number(opts.sampleRate) || VOICE_SAMPLE_RATE;
  const keyterms = buildVoiceKeyterms(context);
  return {
    type: "session.update",
    session: {
      voice,
      instructions: buildVoiceInstructions(context),
      reasoning: { effort: "none" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.85,
        prefix_padding_ms: 333,
        silence_duration_ms: 700,
      },
      tools: voiceToolSchemas(context),
      audio: {
        input: {
          format: { type: "audio/pcm", rate },
          transcription: {
            model: "grok-transcribe",
            language_hint: "en",
            keyterms,
          },
        },
        output: {
          format: { type: "audio/pcm", rate },
        },
      },
    },
  };
}

/**
 * @param {string} instructions
 * @returns {string[]}
 */
/**
 * Spoken tutor notes plus a URL-free catalog. Empty when there is no curriculum.
 * @param {unknown} raw
 */
export function tutorVoiceBlock(raw) {
  const notes = tutorNotesForVoice(raw);
  const media = listLessonMedia(raw);
  const images = media.images
    .map((item) => `- ${item.id}: ${item.alt || "illustration"}`)
    .join("\n");
  const links = media.links
    .map((item) => `- ${item.id}: ${item.label || "reading"}`)
    .join("\n");
  const catalog = [
    images ? `Lesson images:\n${images}` : "",
    links ? `Lesson links:\n${links}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return [notes ? `Tutor notes: ${notes}` : "", catalog].filter(Boolean).join("\n");
}

export function instructionSectionHeadings(instructions) {
  return String(instructions || "")
    .split("\n")
    .map((line) => {
      const m = /^##\s+(.+)$/.exec(line.trim());
      return m ? m[1].trim() : null;
    })
    .filter(Boolean);
}

export { PROMPT_SECTIONS };
