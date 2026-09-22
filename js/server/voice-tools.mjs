/**
 * Validate Grok Voice custom function calls against invent context.
 * Proposals match text co-inventor Apply buttons. Never auto-write the board.
 */

import { clip, inventStateSnapshot, listAvailableTechs } from "./voice-prompt.mjs";
import { listLessonMedia } from "../lesson-media.js";

export function emptyProposals() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
    howTarget: null,
  };
}

/**
 * @param {unknown} raw
 * @returns {object}
 */
export function parseToolArguments(raw) {
  if (raw && typeof raw === "object") return raw;
  const s = String(raw || "").trim();
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/**
 * @param {object|null|undefined} context
 * @returns {Set<string>}
 */
export function availableTechIdSet(context) {
  return new Set(listAvailableTechs(context).map((t) => t.id));
}

const SHOW_IMAGE_CAP = 2;
const SHOW_LINK_CAP = 4;

/**
 * @param {unknown} ids
 * @param {{ id: string }[]} catalog
 * @param {number} cap
 */
export function pickLessonIds(ids, catalog, cap) {
  const wanted = Array.isArray(ids) ? ids : ids ? [ids] : [];
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const out = [];
  const seen = new Set();
  for (const raw of wanted) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    out.push(byId.get(id));
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * @param {unknown} ids
 * @param {Set<string>} allowed
 * @returns {string[]}
 */
export function filterTechIds(ids, allowed) {
  const raw = Array.isArray(ids) ? ids : [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const id = String(x || "").trim();
    if (!id || seen.has(id) || !allowed.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 4) break;
  }
  return out;
}

/**
 * @param {string} name
 * @param {object|string|null|undefined} args
 * @param {object|null|undefined} context
 * @returns {{
 *   output: object,
 *   proposals: object|null,
 *   endTutoring: boolean,
 *   message: string,
 * }}
 */
export function handleVoiceTool(name, args, context = {}) {
  const tool = String(name || "").trim();
  const a = parseToolArguments(args);
  const hex = Boolean(context.hexInvent);
  const tutor = Boolean(context.tutorMode);

  if (tool === "get_invent_state") {
    if (Boolean(context.metricsPending)) {
      return {
        output: {
          ok: false,
          retry: true,
          error: "metrics_recalculating",
          hint: "Meters are being re-checked. Call get_invent_state again shortly. Do not quote meter levels.",
          state: inventStateSnapshot(context),
        },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    const state = inventStateSnapshot(context);
    return {
      output: { ok: true, state },
      proposals: null,
      endTutoring: false,
      message: "",
    };
  }

  if (tool === "suggest_techs") {
    const allowed = availableTechIdSet(context);
    const techIds = filterTechIds(a.techIds, allowed);
    if (!techIds.length) {
      return {
        output: {
          ok: false,
          error: "no_valid_techs",
          hint: "Use ids from get_invent_state.availableTechs. Nothing was offered.",
        },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    const names = listAvailableTechs(context)
      .filter((t) => techIds.includes(t.id))
      .map((t) => t.name);
    return {
      output: { ok: true, techIds, names },
      proposals: { ...emptyProposals(), addTechIds: techIds },
      endTutoring: false,
      message: `Suggested: ${names.join(", ")}`,
    };
  }

  if (tool === "draft_how") {
    const text = clip(a.text, 2500);
    if (!text) {
      return {
        output: { ok: false, error: "empty_draft" },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    const asked = String(a.target || "").trim().toLowerCase();
    const howTarget =
      hex && (asked === "mint" || asked === "pathway") ? asked : null;
    return {
      output: { ok: true, applied: false, howTarget },
      proposals: { ...emptyProposals(), inventionHow: text, howTarget },
      endTutoring: false,
      message: text,
    };
  }

  if (tool === "draft_life") {
    if (hex) {
      return {
        output: {
          ok: false,
          error: "not_on_this_surface",
          hint: "A new tile's description is draft_how with target mint. A placed pathway is draft_how with target pathway.",
        },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    const text = clip(a.text, 2500);
    if (!text) {
      return {
        output: { ok: false, error: "empty_draft" },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    return {
      output: { ok: true, applied: false },
      proposals: { ...emptyProposals(), inventionImpact: text },
      endTutoring: false,
      message: text,
    };
  }

  if (tool === "show_lesson_media") {
    if (!tutor) {
      return {
        output: {
          ok: false,
          error: "not_tutoring",
          hint: "Tutoring is not on. Do not call show_lesson_media.",
        },
        proposals: null,
        media: null,
        endTutoring: false,
        message: "",
      };
    }
    const catalog = listLessonMedia(context.aiTutorContext);
    const images = pickLessonIds(a.imageIds, catalog.images, SHOW_IMAGE_CAP);
    const links = pickLessonIds(a.linkIds, catalog.links, SHOW_LINK_CAP);
    if (!images.length && !links.length) {
      return {
        output: {
          ok: false,
          error: "no_lesson_media",
          hint: "Use imgN and linkN from the lesson catalog. Nothing was shown.",
        },
        proposals: null,
        media: null,
        endTutoring: false,
        message: "",
      };
    }
    return {
      output: {
        ok: true,
        shown: {
          images: images.map((item) => item.alt),
          links: links.map((item) => item.label),
        },
        hint: "Already on screen in the chat. Do not read URLs or filenames.",
      },
      proposals: null,
      media: { images, links },
      endTutoring: false,
      message: "",
    };
  }

  if (tool === "end_tutoring") {
    if (!tutor) {
      return {
        output: {
          ok: false,
          error: "not_tutoring",
          hint: "Tutoring is not on. Do not call end_tutoring.",
        },
        proposals: null,
        endTutoring: false,
        message: "",
      };
    }
    return {
      output: { ok: true },
      proposals: null,
      endTutoring: true,
      message: "",
    };
  }

  return {
    output: { ok: false, error: "unknown_tool" },
    proposals: null,
    endTutoring: false,
    message: "",
  };
}
