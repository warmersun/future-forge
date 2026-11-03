/**
 * One completed co-invent turn's timing record.
 * Durations stay inside one process clock. Missing marks stay null.
 * The public record has counts and durations only — never learner text.
 */

export const ARCHITECTURE_DECISION = {
  choice: "one-call-streaming",
  twoStage: false,
  liveComparison: false,
  reason:
    "No live provider comparison was run. One-call streaming is the implemented path. Two-stage answer-then-actions orchestration is not built.",
};

const DURATION_PAIRS = {
  submit_to_ack_ms: ["submit", "ack"],
  preflight_ms: ["submit", "preflight_done"],
  auth_headers_ms: ["auth_headers_start", "auth_headers_done"],
  authority_ms: ["authority_start", "authority_done"],
  quota_reserve_ms: ["quota_reserve_start", "quota_reserve_done"],
  provider_connect_ms: ["provider_start", "provider_connected"],
  provider_first_public_delta_ms: ["provider_start", "first_public_delta"],
  first_visible_text_ms: ["submit", "first_visible_text"],
  first_useful_sentence_ms: ["submit", "first_useful_sentence"],
  message_complete_ms: ["submit", "message_complete"],
  provider_complete_ms: ["provider_start", "provider_complete"],
  validated_result_ms: ["submit", "validated_result"],
  quota_settle_ms: ["quota_settle_start", "quota_settle_done"],
  client_final_ms: ["submit", "client_final"],
};

const CONTENT_KEYS = new Set([
  "message",
  "messages",
  "prompt",
  "content",
  "text",
  "reasoning",
  "rawOutput",
  "tutorNotes",
  "delta",
  "preview",
]);

/**
 * @param {object} [meta]
 */
export function createLatencyTrace(meta = {}) {
  return {
    v: 1,
    requestId: meta.requestId ? String(meta.requestId).slice(0, 80) : null,
    marks: {},
    mode: meta.mode ? String(meta.mode).slice(0, 64) : null,
    tutor: Boolean(meta.tutor),
    transport: meta.transport ? String(meta.transport).slice(0, 24) : null,
    model: meta.model ? String(meta.model).slice(0, 80) : null,
    effort: meta.effort == null || meta.effort === "" ? null : String(meta.effort).slice(0, 16),
    promptVariant: meta.promptVariant ? String(meta.promptVariant).slice(0, 64) : null,
    status: "open",
    retryCount: Number.isFinite(Number(meta.retryCount)) ? Math.max(0, Math.floor(Number(meta.retryCount))) : 0,
    cancellationPhase: null,
    outputCap: meta.outputCap == null ? null : Math.max(0, Math.floor(Number(meta.outputCap) || 0)),
    outputCapApplied: meta.outputCap == null ? null : Number(meta.outputCap) > 0,
    tokens: {
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      cachedInputTokens: null,
    },
  };
}

/**
 * @param {object} trace
 * @param {string} name
 * @param {number} [at]
 */
export function markLatency(trace, name, at = monotonicNow()) {
  if (!trace || !name || trace.marks[name] != null) return trace;
  const n = Number(at);
  if (!Number.isFinite(n)) return trace;
  trace.marks[name] = n;
  return trace;
}

/**
 * @param {object|null|undefined} usage
 */
export function usageCountsForTrace(usage) {
  if (!usage || typeof usage !== "object") {
    return {
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      cachedInputTokens: null,
    };
  }
  const inputTokens = countOrNull(usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens);
  const outputTokens = countOrNull(
    usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens
  );
  const reasoningTokens = countOrNull(
    usage.output_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens ?? usage.reasoningTokens
  );
  const cachedInputTokens = countOrNull(
    usage.input_tokens_details?.cached_tokens ??
      usage.prompt_tokens_details?.cached_tokens ??
      usage.cachedInputTokens
  );
  return { inputTokens, outputTokens, reasoningTokens, cachedInputTokens };
}

/**
 * @param {object} trace
 * @param {object|null|undefined} usage
 */
export function assignUsageCounts(trace, usage) {
  if (!trace) return trace;
  trace.tokens = usageCountsForTrace(usage);
  return trace;
}

/**
 * @param {object} trace
 */
export function publicLatencyRecord(trace) {
  const durations = {};
  for (const [field, [from, to]] of Object.entries(DURATION_PAIRS)) {
    durations[field] = durationBetween(trace?.marks, from, to);
  }
  const tokens = trace?.tokens || usageCountsForTrace(null);
  const record = {
    v: 1,
    requestId: trace?.requestId || null,
    mode: trace?.mode || null,
    tutor: Boolean(trace?.tutor),
    transport: trace?.transport || null,
    model: trace?.model || null,
    effort: trace?.effort ?? null,
    promptVariant: trace?.promptVariant || null,
    status: trace?.status || "open",
    retryCount: Number.isFinite(Number(trace?.retryCount)) ? Number(trace.retryCount) : 0,
    cancellationPhase: trace?.cancellationPhase || null,
    outputCap: trace?.outputCap == null ? null : trace.outputCap,
    outputCapApplied: trace?.outputCapApplied == null ? null : Boolean(trace.outputCapApplied),
    ...durations,
    inputTokens: tokens.inputTokens ?? null,
    outputTokens: tokens.outputTokens ?? null,
    reasoningTokens: tokens.reasoningTokens ?? null,
    cachedInputTokens: tokens.cachedInputTokens ?? null,
  };
  for (const key of CONTENT_KEYS) delete record[key];
  return record;
}

/**
 * @param {object} record
 * @returns {boolean}
 */
export function latencyRecordLeaksContent(record) {
  if (!record || typeof record !== "object") return false;
  const blob = JSON.stringify(record);
  if (/"message"\s*:/.test(blob) || /"prompt"\s*:/.test(blob) || /"reasoning"\s*:/.test(blob)) {
    return true;
  }
  for (const key of Object.keys(record)) {
    if (CONTENT_KEYS.has(key)) return true;
  }
  return false;
}

export function monotonicNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function durationBetween(marks, from, to) {
  if (!marks || marks[from] == null || marks[to] == null) return null;
  const ms = Number(marks[to]) - Number(marks[from]);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms);
}

function countOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}
