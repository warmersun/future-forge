/**
 * Developer AI-inspect bundle: the exact text sent to the model, split into
 * colored sections, plus the raw model text. Callers attach this only when
 * developer mode is on.
 */

import { SEARCH_SYSTEM_LINE } from "./ai-search.mjs";

const SYSTEM_HEADINGS = [
  { id: "role", label: "Role", tone: "role", heading: "Role:" },
  {
    id: "scrutiny",
    label: "Scrutiny angles",
    tone: "warn",
    heading: "Scrutiny / challenge angles",
  },
  { id: "rules", label: "Hard rules", tone: "warn", heading: "Hard rules:" },
  { id: "tutor-style", label: "Tutor style", tone: "warn", heading: "Tutor style" },
  { id: "ending", label: "Ending tutoring", tone: "warn", heading: "Ending tutoring" },
  { id: "modes", label: "Modes", tone: "contract", heading: "Modes:" },
  {
    id: "contract",
    label: "Output contract",
    tone: "contract",
    heading: "Respond with a single JSON object",
  },
];

const IMAGE_HEADINGS = [
  { id: "setting", label: "Setting", tone: "role", heading: "SETTING (this place only):" },
  {
    id: "happening",
    label: "What is happening",
    tone: "state",
    heading: "WHAT IS HAPPENING IN THIS FRAME:",
  },
  { id: "tone", label: "Tone", tone: "contract", heading: "\nTone: " },
];

/**
 * Join non-quote slices of one part. Equals the exact prompt string.
 * @param {Array<{ part?: string, quote?: boolean, text?: string }>} sections
 * @param {"system"|"user"} part
 */
export function joinPromptPart(sections, part) {
  return (Array.isArray(sections) ? sections : [])
    .filter((s) => s && s.part === part && !s.quote)
    .map((s) => String(s.text ?? ""))
    .join("");
}

/**
 * @param {string} text
 * @param {Array<{ id: string, label: string, tone: string, heading: string }>} headings
 * @param {{ id: string, label: string, tone: string, part: string }} fallback
 * @param {string} introLabel
 */
function splitByHeadings(text, headings, fallback, introLabel) {
  const raw = String(text ?? "");
  if (!raw) return [];
  const hits = [];
  for (const h of headings) {
    const at = raw.indexOf(h.heading);
    if (at >= 0) hits.push({ ...h, at });
  }
  hits.sort((a, b) => a.at - b.at);
  if (!hits.length) {
    return [{ ...fallback, text: raw }];
  }
  const sections = [];
  if (hits[0].at > 0) {
    sections.push({
      id: "intro",
      label: introLabel,
      tone: "role",
      part: fallback.part,
      text: raw.slice(0, hits[0].at),
    });
  }
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].at;
    const end = i + 1 < hits.length ? hits[i + 1].at : raw.length;
    const slice = raw.slice(start, end);
    if (!slice) continue;
    sections.push({
      id: hits[i].id,
      label: hits[i].label,
      tone: hits[i].tone,
      part: fallback.part,
      text: slice,
    });
  }
  return sections;
}

/**
 * @param {string} text
 */
export function splitSystemPrompt(text) {
  const raw = String(text ?? "");
  const headings = SYSTEM_HEADINGS.slice();
  if (raw.includes(SEARCH_SYSTEM_LINE)) {
    headings.push({
      id: "search",
      label: "Search",
      tone: "search",
      heading: SEARCH_SYSTEM_LINE,
    });
  }
  return splitByHeadings(
    raw,
    headings,
    { id: "system", label: "System", tone: "role", part: "system" },
    "Persona"
  );
}

/**
 * Preamble, optional quoted modeInstruction, session JSON, closing line.
 * Quote slices are display-only; the other user slices join back to `text`.
 * @param {string} text
 */
export function splitUserPrompt(text) {
  const raw = String(text ?? "");
  if (!raw) return [];
  const closeAt = raw.lastIndexOf("\n\n");
  if (closeAt <= 0) {
    return [{ id: "user", label: "User", tone: "state", part: "user", text: raw }];
  }
  const head = raw.slice(0, closeAt);
  const close = raw.slice(closeAt);
  const nl = head.indexOf("\n");
  if (nl < 0) {
    return [{ id: "user", label: "User", tone: "state", part: "user", text: raw }];
  }
  const preamble = head.slice(0, nl + 1);
  const state = head.slice(nl + 1);
  const preambleLabel = /session state/i.test(preamble) ? "Preamble" : "Task";
  /** @type {Array<object>} */
  const sections = [
    {
      id: "preamble",
      label: preambleLabel,
      tone: "preamble",
      part: "user",
      text: preamble,
    },
  ];
  let instruction = "";
  try {
    const parsed = JSON.parse(state);
    if (parsed && typeof parsed.modeInstruction === "string" && parsed.modeInstruction.trim()) {
      instruction = parsed.modeInstruction;
    }
  } catch {
    /* state is not JSON */
  }
  if (instruction) {
    sections.push({
      id: "mode-instruction",
      label: "Mode instruction",
      tone: "instruction",
      part: "user",
      quote: true,
      text: instruction,
    });
  }
  sections.push({
    id: "state",
    label: "Session state",
    tone: "state",
    part: "user",
    text: state,
  });
  sections.push({
    id: "close",
    label: "Close",
    tone: "contract",
    part: "user",
    text: close,
  });
  return sections;
}

/**
 * Imagine prompt sections. A prompt with none of the vision headings stays one block.
 * @param {string} text
 */
export function splitImagePrompt(text) {
  return splitByHeadings(
    text,
    IMAGE_HEADINGS,
    { id: "prompt", label: "Image prompt", tone: "state", part: "user" },
    "Frame"
  );
}

/**
 * @param {unknown} tools
 * @returns {string[]}
 */
function toolNames(tools) {
  if (!Array.isArray(tools)) return [];
  const names = [];
  for (const t of tools) {
    if (!t || typeof t !== "object") continue;
    const name = String(t.type || t.name || "").trim();
    if (name) names.push(name);
  }
  return names;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} reasoning
 * @returns {string|null}
 */
function reasoningLabel(reasoning) {
  if (reasoning == null || reasoning === "") return null;
  if (typeof reasoning === "string") return reasoning;
  if (typeof reasoning === "object" && reasoning.effort) return String(reasoning.effort);
  return null;
}

/**
 * @param {{
 *   system?: string,
 *   user?: string,
 *   model?: string|null,
 *   temperature?: number|null,
 *   maxOutputTokens?: number|null,
 *   reasoning?: unknown,
 *   tools?: unknown,
 *   sent?: boolean,
 *   rawOutput?: string|null,
 *   error?: string|null,
 *   note?: string|null,
 * }} [opts]
 */
export function buildLlmInspect(opts = {}) {
  const system = String(opts.system ?? "");
  const user = String(opts.user ?? "");
  return {
    kind: "text",
    sent: opts.sent !== false,
    model: opts.model ? String(opts.model) : null,
    temperature: finiteOrNull(opts.temperature),
    maxOutputTokens: finiteOrNull(opts.maxOutputTokens),
    reasoning: reasoningLabel(opts.reasoning),
    tools: toolNames(opts.tools),
    system,
    user,
    sections: [...splitSystemPrompt(system), ...splitUserPrompt(user)],
    rawOutput: opts.rawOutput == null ? "" : String(opts.rawOutput),
    error: opts.error ? String(opts.error) : null,
    note: opts.note ? String(opts.note) : null,
  };
}

/**
 * Image call. `director` is a text-inspect bundle for the hidden shot-director chat.
 * @param {{
 *   prompt?: string,
 *   model?: string|null,
 *   imageMode?: string|null,
 *   sent?: boolean,
 *   rawOutput?: string|null,
 *   error?: string|null,
 *   note?: string|null,
 *   director?: object|null,
 * }} [opts]
 */
export function buildImageLlmInspect(opts = {}) {
  const prompt = String(opts.prompt ?? "");
  const director =
    opts.director && typeof opts.director === "object"
      ? opts.director.kind === "text"
        ? opts.director
        : buildLlmInspect(opts.director)
      : null;
  return {
    kind: "image",
    sent: opts.sent !== false,
    model: opts.model ? String(opts.model) : null,
    temperature: null,
    maxOutputTokens: null,
    reasoning: null,
    tools: [],
    imageMode: opts.imageMode ? String(opts.imageMode) : null,
    system: "",
    user: prompt,
    sections: splitImagePrompt(prompt),
    rawOutput: opts.rawOutput == null ? "" : String(opts.rawOutput),
    error: opts.error ? String(opts.error) : null,
    note: opts.note ? String(opts.note) : null,
    director,
  };
}
