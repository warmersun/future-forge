/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Adapt a Responses API event stream into public message deltas.
 * Reasoning summaries are a separate preview channel. They are not appended
 * to the answer. output_text.done reconciles; it is not appended again.
 * Encrypted reasoning is ignored.
 */

import { createMessageDecoder } from "./coinvent-output.mjs";

/** Public thinking preview. Keeps the answer inside the SSE size budget. */
export const REASONING_PREVIEW_CAP = 8000;

const IGNORED_PREFIXES = [
  "response.refusal",
  "response.function_call",
  "response.mcp",
  "response.web_search",
  "response.file_search",
  "response.code_interpreter",
  "response.image_generation",
  "response.custom_tool",
  "response.audio",
];

/**
 * @param {AsyncIterable<object>} events
 * @param {{
 *   onDelta?: (text: string) => void,
 *   onReasoning?: (text: string) => void,
 *   onPhase?: (phase: "answering"|"finalizing") => void,
 *   shouldStopDelivery?: () => boolean,
 *   decoder?: ReturnType<typeof createMessageDecoder>,
 * }} [hooks]
 */
export async function readResponsesStream(events, hooks = {}) {
  const decoder = hooks.decoder || createMessageDecoder();
  let response = null;
  let usage = null;
  let status = "completed";
  let outputIndex = null;
  let itemId = null;
  let announcedAnswering = false;
  let announcedFinalizing = false;
  let doneText = null;
  const reasoning = { kind: "", sent: 0, summaryIndex: null };

  for await (const event of events) {
    const type = String(event?.type || "");
    if (!type) continue;
    if (type === "response.reasoning_text.delta" || type === "response.reasoning_summary_text.delta") {
      const kind = type.includes("summary") ? "summary" : "text";
      const piece = takeReasoningPreview(reasoning, event.delta, kind, event.summary_index);
      if (piece && !hooks.shouldStopDelivery?.()) hooks.onReasoning?.(piece);
      continue;
    }
    if (type.startsWith("response.reasoning")) continue;
    if (IGNORED_PREFIXES.some((prefix) => type.startsWith(prefix))) continue;
    if (type === "response.output_text.delta") {
      if (event.output_index != null) {
        if (outputIndex == null) outputIndex = event.output_index;
        else if (event.output_index !== outputIndex) continue;
      }
      if (event.item_id) {
        if (itemId == null) itemId = event.item_id;
        else if (event.item_id !== itemId) continue;
      }
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (!delta) continue;
      const step = decoder.push(delta);
      if (step.appended && !announcedAnswering) {
        announcedAnswering = true;
        hooks.onPhase?.("answering");
      }
      if (step.messageClosed && !announcedFinalizing) {
        announcedFinalizing = true;
        hooks.onPhase?.("finalizing");
      }
      if (step.appended && !hooks.shouldStopDelivery?.()) hooks.onDelta?.(step.appended);
      continue;
    }
    if (type === "response.output_text.done") {
      doneText = typeof event.text === "string" ? event.text : doneText;
      if (!announcedFinalizing) {
        announcedFinalizing = true;
        hooks.onPhase?.("finalizing");
      }
      continue;
    }
    if (type === "response.completed" || type === "response.incomplete" || type === "response.failed") {
      response = event.response || response;
      usage = response?.usage || event.usage || usage;
      if (type === "response.failed") status = "failed";
      else if (type === "response.incomplete") status = "incomplete";
      else status = response?.status || "completed";
      continue;
    }
    if (type === "error" || type === "response.error") {
      status = "failed";
      const err = new Error("provider_failed");
      err.code = "provider_failed";
      err.usage = usage;
      throw err;
    }
  }

  const assembled = response?.output_text || doneText || decoder.raw();
  return {
    response,
    usage: usage || response?.usage || null,
    status,
    preview: decoder.text(),
    assembled: typeof assembled === "string" ? assembled : decoder.raw(),
    messageClosed: decoder.messageClosed(),
    decoderStopped: decoder.stopped(),
    stopReason: decoder.stopReason(),
  };
}

/**
 * One reasoning channel only, so a summary and a raw trace are not both shown.
 * Done events are not appended. The cap stops the preview; the provider read continues.
 * @param {{ kind: string, sent: number, summaryIndex: number|null }} state
 * @param {unknown} delta
 * @param {string} kind
 * @param {unknown} summaryIndex
 */
function takeReasoningPreview(state, delta, kind, summaryIndex) {
  if (typeof delta !== "string" || !delta) return "";
  if (state.kind && state.kind !== kind) return "";
  state.kind = kind;
  if (state.sent >= REASONING_PREVIEW_CAP) return "";
  let piece = delta;
  const index = Number.isInteger(summaryIndex) ? summaryIndex : null;
  if (index != null && state.summaryIndex != null && index !== state.summaryIndex && state.sent > 0) {
    piece = `\n\n${piece}`;
  }
  if (index != null) state.summaryIndex = index;
  const room = REASONING_PREVIEW_CAP - state.sent;
  if (piece.length > room) piece = piece.slice(0, room);
  state.sent += piece.length;
  return piece;
}

/**
 * Copy create options and turn streaming on. Does not change effort or the model.
 * Provider JSON schema stays off unless FF_CO_INVENT_JSON_SCHEMA=1. xAI schema
 * streaming was not probed in this change, so the default remains prompt JSON.
 * @param {Record<string, unknown>} createOpts
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function streamCreateOpts(createOpts, env = process.env) {
  const next = { ...createOpts, stream: true };
  if (String(env.FF_CO_INVENT_JSON_SCHEMA || "") === "1" && !next.text) {
    next.text = { format: conversationalJsonSchema() };
  }
  return next;
}

/**
 * Responses `text.format` schema. Message is listed first. Not attached unless
 * the schema flag is on. maxLength is omitted: xAI treats lengths above 2048
 * as best-effort, and the local 4000 cap stays in the sanitizer.
 */
export function conversationalJsonSchema() {
  return {
    type: "json_schema",
    name: "co_invent_turn",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        message: { type: "string" },
        proposals: {
          type: "object",
          additionalProperties: false,
          properties: {
            addTechIds: { type: "array", items: { type: "string" } },
            removeTechIds: { type: "array", items: { type: "string" } },
            inventionName: { type: ["string", "null"] },
            inventionHow: { type: ["string", "null"] },
            inventionImpact: { type: ["string", "null"] },
            howTarget: { type: ["string", "null"] },
            howTechId: { type: ["string", "null"] },
            scrutiny: { type: ["object", "null"] },
          },
          required: [
            "addTechIds",
            "removeTechIds",
            "inventionName",
            "inventionHow",
            "inventionImpact",
            "howTarget",
            "howTechId",
            "scrutiny",
          ],
        },
        teaching: { type: "array" },
        endTutoring: { type: "boolean" },
      },
      required: ["message", "proposals", "teaching", "endTutoring"],
    },
  };
}
