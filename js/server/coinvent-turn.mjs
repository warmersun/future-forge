/**
 * One co-invent provider turn: stream adapter, final JSON acceptance,
 * and quota metadata. Both game and portal servers call this. They keep
 * their own sanitizers and do not paste a second stream loop.
 */

import { readResponsesStream, streamCreateOpts } from "./coinvent-provider.mjs";
import { parseModelJson, publicCoInventResult } from "./coinvent-output.mjs";
import { createCoInventSse } from "./coinvent-stream.mjs";
import {
  assignUsageCounts,
  createLatencyTrace,
  markLatency,
  publicLatencyRecord,
} from "../coinvent-latency.js";

/**
 * @param {object|null|undefined} usage
 * @returns {{ inputTokens: number, outputTokens: number } | null}
 */
export function measureFromUsage(usage) {
  if (!usage || typeof usage !== "object") return null;
  const inputTokens = Number(usage.input_tokens ?? usage.inputTokens);
  const outputTokens = Number(usage.output_tokens ?? usage.outputTokens);
  if (!Number.isFinite(inputTokens) && !Number.isFinite(outputTokens)) return null;
  return {
    inputTokens: Number.isFinite(inputTokens) ? Math.max(0, Math.floor(inputTokens)) : 0,
    outputTokens: Number.isFinite(outputTokens) ? Math.max(0, Math.floor(outputTokens)) : 0,
  };
}

/**
 * @param {string} code
 * @param {object|null|undefined} usage
 */
export function quotaError(code, usage, cause) {
  const err = new Error(cause?.message ? String(cause.message) : code);
  err.code = code;
  if (cause) err.cause = cause;
  const measure = measureFromUsage(usage);
  if (measure) {
    err.quotaOutcome = "settle";
    err.quotaMeasure = measure;
  } else {
    err.quotaOutcome = "retain";
  }
  return err;
}

/**
 * Forward the reserved output ceiling. A lower existing cap stays lower.
 * Absence (0 / null) leaves the call unchanged — record that as an absent cap.
 * @param {Record<string, unknown>} createOpts
 * @param {number|null|undefined} maxOutputTokens
 */
export function applyOutputCap(createOpts, maxOutputTokens) {
  const cap = Math.floor(Number(maxOutputTokens) || 0);
  if (cap <= 0 || !createOpts) return createOpts;
  const existing = Number(createOpts.max_output_tokens);
  createOpts.max_output_tokens =
    Number.isFinite(existing) && existing > 0 ? Math.min(existing, cap) : cap;
  return createOpts;
}

/**
 * @param {{ responses: { create: Function } }} client
 * @param {Record<string, unknown>} createOpts
 * @param {{
 *   onDelta?: (text: string) => void,
 *   onReasoning?: (text: string) => void,
 *   onPhase?: (phase: string) => void,
 *   shouldStopDelivery?: () => boolean,
 *   onConnected?: () => void,
 *   env?: Record<string, string|undefined>,
 * }} [delivery]
 */
export async function readCoInventProviderStream(client, createOpts, delivery = {}) {
  let events;
  try {
    events = await client.responses.create(streamCreateOpts(createOpts, delivery.env));
  } catch (cause) {
    // Not accepted yet. Leave quotaOutcome unset so a session refresh can run
    // and an unused hold is released. Retain starts only after accept.
    if (cause instanceof Error) throw cause;
    throw new Error(cause == null ? "provider_failed" : String(cause));
  }
  delivery.onConnected?.();
  try {
    return await readResponsesStream(events, {
      onDelta: delivery.onDelta,
      onReasoning: delivery.onReasoning,
      onPhase: delivery.onPhase,
      shouldStopDelivery: delivery.shouldStopDelivery,
    });
  } catch (e) {
    if (e?.code === "provider_failed" || e?.message === "provider_failed") {
      throw quotaError("provider_failed", e.usage, e);
    }
    const err = quotaError("provider_failed", e?.usage);
    err.cause = e;
    throw err;
  }
}

/**
 * Prompt-JSON acceptance. Malformed structured output settles known usage
 * and does not fall back to a raw text slice.
 * @param {string} assembled
 * @param {object|null|undefined} usage
 */
export function acceptStreamedModelJson(assembled, usage) {
  const parsed = parseModelJson(assembled);
  if (!parsed.ok) throw quotaError("malformed_output", usage);
  return parsed.value;
}

/**
 * @param {object} result
 * @param {object|null|undefined} usage
 */
export function stampQuota(result, usage) {
  if (!result || typeof result !== "object") return result;
  const measure = measureFromUsage(usage);
  if (measure) result._quotaTokens = measure;
  else result._quotaUnknown = true;
  return result;
}

/**
 * Measure for withCloudQuota. Deletes private keys. Unknown post-dispatch
 * usage retains the hold instead of settling a fake zero.
 * @param {object} result
 */
export function quotaMeasureFromResult(result) {
  if (!result || typeof result !== "object") {
    return { inputTokens: 0, outputTokens: 0 };
  }
  const unknown = Boolean(result._quotaUnknown);
  const tokens = result._quotaTokens;
  delete result._quotaTokens;
  delete result._quotaUnknown;
  delete result._streamPreview;
  if (unknown && !tokens) return { retain: true };
  const t = tokens || {};
  return { inputTokens: t.inputTokens || 0, outputTokens: t.outputTokens || 0 };
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {object} body
 */
export function openCoInventDelivery(res, body) {
  const writer = createCoInventSse(res, {
    requestId: String(body?.requestId || "").slice(0, 80),
    mode: String(body?.mode || "chat"),
  });
  writer.open();
  writer.start();
  writer.status("thinking");
  const delivery = {
    onDelta(text) {
      if (writer.accepting()) writer.messageDelta(text);
    },
    onReasoning(text) {
      if (writer.accepting()) writer.reasoningDelta(text);
    },
    onPhase(phase) {
      if (writer.accepting()) writer.status(phase);
    },
    shouldStopDelivery() {
      return writer.gone;
    },
  };
  return { writer, delivery };
}

/**
 * @param {ReturnType<typeof createCoInventSse>|null} writer
 * @param {object} result
 */
export function finishCoInventDelivery(writer, result) {
  if (!writer || writer.terminal || writer.gone) return false;
  return writer.result(publicCoInventResult(result));
}

/**
 * @param {ReturnType<typeof createCoInventSse>|null} writer
 * @param {any} err
 */
export function failCoInventDelivery(writer, err) {
  if (!writer || writer.terminal) return false;
  return writer.error({
    code: err?.code || "co_invent_failed",
    partial: writer.sentText,
  });
}

/**
 * Run one streamed Responses call and finalize with the caller's sanitizer.
 * The returned object still carries quota metadata for the caller to measure.
 * @param {{
 *   client: { responses: { create: Function } },
 *   createOpts: Record<string, unknown>,
 *   delivery?: object,
 *   finalize: (parsed: object, read: object) => object,
 * }} opts
 */
/**
 * One turn's server clock. Marks are first-wins. A missing phase stays null.
 * Buffered turns never mark provider_connected or first_public_delta.
 * @param {object} [meta]
 */
export function createTurnLatency(meta = {}) {
  const trace = createLatencyTrace(meta);
  let providerStarted = false;
  return {
    trace,
    mark(name) {
      markLatency(trace, name);
    },
    noteOutputCap(maxOutputTokens) {
      const cap = Math.floor(Number(maxOutputTokens) || 0);
      trace.outputCap = cap > 0 ? cap : null;
      trace.outputCapApplied = cap > 0;
    },
    /**
     * Mutates the delivery object so connect and the first public answer are timed.
     * @param {object|null|undefined} delivery
     */
    watch(delivery) {
      if (!delivery) return null;
      const onDelta = delivery.onDelta;
      const onConnected = delivery.onConnected;
      delivery.onDelta = (text) => {
        markLatency(trace, "first_public_delta");
        return onDelta?.(text);
      };
      delivery.onConnected = () => {
        markLatency(trace, "provider_connected");
        return onConnected?.();
      };
      return delivery;
    },
    startProvider() {
      providerStarted = true;
      markLatency(trace, "provider_start");
    },
    completeProvider(usage) {
      if (!providerStarted) return;
      markLatency(trace, "provider_complete");
      if (usage) assignUsageCounts(trace, usage);
    },
    publicRecord(status) {
      if (status && trace.status === "open") trace.status = status;
      return publicLatencyRecord(trace);
    },
  };
}

export async function executeStreamedCoInvent(opts) {
  const read = await readCoInventProviderStream(opts.client, opts.createOpts, opts.delivery || {});
  if (read.status === "failed") throw quotaError("provider_failed", read.usage);
  const parsed = acceptStreamedModelJson(read.assembled, read.usage);
  const out = opts.finalize(parsed, read);
  if (out && typeof out === "object") out._streamPreview = read.preview || "";
  return stampQuota(out, read.usage);
}
