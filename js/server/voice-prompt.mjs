/**
 * Grok Voice session prompt, tools, and keyterms for the co-inventor.
 * Spoken partner — not the JSON SYSTEM_PROMPT used by POST /api/co-invent.
 */

export const VOICE_MODEL = "grok-voice-latest";
export const VOICE_SAMPLE_RATE = 24_000;
export const VOICE_DEFAULT_ID = "eve";
export const KEYTERM_MAX = 100;
export const KEYTERM_LEN = 50;

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
    pressure: listPressure(context.pressure),
    availableTechs: listAvailableTechs(context),
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
  const selected = listSelectedTechs(context);
  const stack =
    selected.length > 0
      ? selected.map((t) => `${t.name} (${t.id})`).join(", ")
      : "none yet";
  const pressure = listPressure(context.pressure)
    .map((p) => `${p.label} ${p.level}`)
    .join(", ");
  const how = hex
    ? clip(context.hexBoard?.pathways?.[0]?.howText, 500)
    : clip(context.inventionHow, 500);
  const life = hex ? "" : clip(context.inventionImpact, 280);
  const problem = clip(context.challenge?.problem, 500);
  const surface = hex
    ? "They invent on a hex board: emTech tiles plus a how-it-works sentence on each pathway. There is no invention name."
    : "They write an invention name, how it works, and everyday life, and pick emTechs for a stack.";
  const roleLine = tutor
    ? `You are the AI co-inventor tutor in Future Forge, sitting with one learner on ${title} in ${place} (${year}).`
    : `You are the AI co-inventor in Future Forge, sitting with one learner on ${title} in ${place} (${year}).`;

  return `## Role & Persona
${roleLine} You are a creative partner, not the sole inventor. Warm, practical, hopeful. You talk like a sharp colleague at a workshop table.

## Objective
Help them invent a local solution with emerging technologies for this place and year. They lead. You brainstorm, teach in plain words, and may suggest emTechs or draft how-it-works text they can apply. Do not mint tiles or write the board yourself.

## Conversation Flow
${surface}
Current stack: ${stack}.
${pressure ? `Crisis meters: ${pressure}.` : ""}
${problem ? `The situation: ${problem}` : ""}
${how ? `How it works so far: ${how}` : "They have not written how it works yet."}
${life ? `Everyday life so far: ${life}` : ""}
Listen first. Ask at most one good question per turn. If they want a stack idea, call \`suggest_techs\` with real ids after you name them in speech. If they want you to draft mechanism text, call \`draft_how\`. ${
    hex
      ? "Do not call \`draft_life\` on the hex board."
      : "If they want everyday-life prose, call \`draft_life\`."
  }
Call \`get_invent_state\` when you are unsure what is on the board now.
${
  tutor
    ? "This is a free tutoring session. Stay with one short idea at a time. Call \`end_tutoring\` only when they clearly want to invent on their own."
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
 * @returns {object[]}
 */
export function voiceToolSchemas() {
  return [
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
      description:
        "Offer a how-it-works draft the learner can Apply. Does not write the board by itself.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "One short mechanism paragraph in everyday words, local to this place and year",
          },
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
      name: "end_tutoring",
      description:
        "End the free tutoring session after the learner clearly wants to invent on their own. Tutoring only.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  ];
}

/**
 * Full session.update payload for Grok Voice.
 * @param {object|null|undefined} context
 * @param {{ voice?: string, sampleRate?: number }} [opts]
 */
export function buildSessionUpdate(context = {}, opts = {}) {
  const voice = clip(opts.voice || VOICE_DEFAULT_ID, 64) || VOICE_DEFAULT_ID;
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
      tools: voiceToolSchemas(),
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
