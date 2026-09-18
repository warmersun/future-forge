/**
 * Ring buffer of AI text + image exchanges for the developer AI inspect pane.
 * DOM-free aside from optional blob: previews of Imagine data URLs.
 */

const CAP = 30;
const PREVIEW_CAP = 6;
const FILTERS = new Set(["all", "text", "image", "jev"]);
const IMAGE_MODES = new Set(["vision", "idea-image"]);
const JEV_MODES = new Set(["tag-lobby-rule"]);

/** @type {Array<object>} */
let entries = [];
let selectedId = null;
let seq = 0;
/** @type {"all"|"text"|"image"|"jev"} */
let filter = "all";
/** @type {Set<() => void>} */
const listeners = new Set();
/** blob: URLs this module created — safe to revoke */
const ownedBlobs = new Set();

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function revokeOwned(url) {
  if (!url || !ownedBlobs.has(url)) return;
  ownedBlobs.delete(url);
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function revokeAllOwned() {
  for (const url of [...ownedBlobs]) revokeOwned(url);
}

/**
 * Replace huge data:image… strings with a short stub so inspect JSON stays light.
 * @param {unknown} value
 * @param {number} [depth]
 */
export function summarizeAiTracePayload(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:image")) {
      const semi = value.indexOf(";");
      const mime = value.slice(5, semi > 5 ? semi : 5 + 16) || "image";
      return `data:${mime}… (${value.length} chars)`;
    }
    return value;
  }
  if (depth > 8) return value;
  if (Array.isArray(value)) {
    return value.map((v) => summarizeAiTracePayload(v, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = summarizeAiTracePayload(v, depth + 1);
    }
    return out;
  }
  return value;
}

function dataUrlToPreview(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return null;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || "image/png";
  const isB64 = Boolean(m[2]);
  const data = m[3] || "";
  try {
    let bytes;
    if (isB64) {
      if (typeof atob !== "function") return null;
      const bin = atob(data);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else if (typeof Blob === "function") {
      const blobUrl = URL.createObjectURL(
        new Blob([decodeURIComponent(data)], { type: mime })
      );
      ownedBlobs.add(blobUrl);
      return blobUrl;
    } else {
      return null;
    }
    if (typeof Blob !== "function") return null;
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
    ownedBlobs.add(blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}

function attachPreview(url) {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("data:image")) return dataUrlToPreview(url);
  return null;
}

function prunePreviews(list) {
  let kept = 0;
  for (const e of list) {
    if (!e?.previewUrl) continue;
    if (kept < PREVIEW_CAP) {
      kept += 1;
      continue;
    }
    revokeOwned(e.previewUrl);
    e.previewUrl = null;
  }
}

/**
 * @param {object} [raw]
 * @returns {"text"|"image"|"jev"}
 */
export function aiTraceKind(raw = {}) {
  if (raw.kind === "image" || raw.kind === "text" || raw.kind === "jev") {
    return raw.kind;
  }
  const mode = String(raw.mode || raw.sent?.mode || "");
  const source = String(raw.source || raw.received?.source || "");
  if (IMAGE_MODES.has(mode)) return "image";
  if (source === "typesafe" || JEV_MODES.has(mode)) return "jev";
  return "text";
}

export function resetAiTrace() {
  revokeAllOwned();
  entries = [];
  selectedId = null;
  seq = 0;
  filter = "all";
  emit();
}

export function subscribeAiTrace(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {"all"|"text"|"image"|"jev"} next
 */
export function setAiTraceFilter(next) {
  const want = FILTERS.has(next) ? next : "all";
  if (want === filter) return filter;
  filter = want;
  emit();
  return filter;
}

export function aiTraceFilter() {
  return filter;
}

export function aiTraceFilterCounts() {
  let text = 0;
  let image = 0;
  let jev = 0;
  for (const e of entries) {
    if (e.kind === "image") image += 1;
    else if (e.kind === "jev") jev += 1;
    else text += 1;
  }
  return { all: entries.length, text, image, jev };
}

/**
 * @param {{
 *   mode?: string,
 *   kind?: "text"|"image"|"jev",
 *   sent?: object,
 *   received?: object|null,
 *   error?: string|null,
 *   cancelled?: boolean,
 *   ok?: boolean,
 *   ms?: number,
 *   source?: string|null,
 *   previewUrl?: string|null,
 * }} raw
 */
export function pushAiTrace(raw = {}) {
  seq += 1;
  const mode = String(raw.mode || raw.sent?.mode || "co-invent");
  const kind = aiTraceKind({ ...raw, mode });
  const receivedRaw =
    raw.received && typeof raw.received === "object" ? raw.received : null;
  const previewUrl = attachPreview(
    typeof raw.previewUrl === "string"
      ? raw.previewUrl
      : receivedRaw?.imageUrl
  );
  const source =
    String(raw.source || receivedRaw?.source || "").slice(0, 40) || null;
  const entry = {
    id: `ai-${seq}`,
    ts: Date.now(),
    mode,
    kind,
    sent:
      raw.sent && typeof raw.sent === "object"
        ? summarizeAiTracePayload(raw.sent)
        : { mode },
    received: receivedRaw ? summarizeAiTracePayload(receivedRaw) : null,
    error: raw.error ? String(raw.error) : null,
    cancelled: Boolean(raw.cancelled),
    ok: raw.ok !== false && !raw.error && !raw.cancelled,
    ms: Number.isFinite(Number(raw.ms)) ? Math.max(0, Math.round(Number(raw.ms))) : 0,
    source,
    previewUrl,
    modelRequest:
      raw.modelRequest && typeof raw.modelRequest === "object"
        ? summarizeAiTracePayload(raw.modelRequest)
        : null,
  };
  const next = [entry, ...entries];
  const dropped = next.slice(CAP);
  for (const d of dropped) revokeOwned(d.previewUrl);
  entries = next.slice(0, CAP);
  prunePreviews(entries);
  const matches = filter === "all" || entry.kind === filter;
  if (matches) selectedId = entry.id;
  emit();
  return entry;
}

/**
 * Peel `typesafeTrace` off a co-invent payload and push a Jev inspect row.
 * Grok/local stays Text (or Images). `tag-lobby-rule` is Jev-only.
 * @param {object} [raw]
 */
export function pushAiTraceWithTypesafe(raw = {}) {
  const rec =
    raw.received && typeof raw.received === "object" ? raw.received : null;
  const ts =
    rec?.typesafeTrace && typeof rec.typesafeTrace === "object"
      ? rec.typesafeTrace
      : null;
  let mr =
    rec?.modelRequest && typeof rec.modelRequest === "object"
      ? rec.modelRequest
      : raw.modelRequest && typeof raw.modelRequest === "object"
        ? raw.modelRequest
        : null;
  if (
    !mr &&
    (raw.kind === "image" ||
      IMAGE_MODES.has(String(raw.mode || raw.sent?.mode || "")))
  ) {
    const prompt = rec?.prompt || raw.sent?.prompt;
    if (prompt || raw.sent) {
      mr = {
        model: rec?.model || null,
        system: prompt ? String(prompt) : null,
        payload: raw.sent || null,
      };
    }
  }
  let cleaned = rec && ts ? stripTypesafeTrace(rec) : rec;
  if (cleaned && mr) {
    cleaned = { ...cleaned };
    delete cleaned.modelRequest;
  }
  const jevOnly =
    raw.kind === "jev" ||
    String(raw.mode || raw.sent?.mode || "") === "tag-lobby-rule";
  let textEntry = null;
  if (!jevOnly) {
    textEntry = pushAiTrace({
      ...raw,
      received: cleaned,
      modelRequest: mr,
    });
  }
  if (ts) {
    pushAiTrace({
      kind: "jev",
      mode: raw.mode || raw.sent?.mode || "co-invent",
      modelRequest: {
        model: ts.model || "jev-latest",
        questions: ts.questions || null,
        state: ts.state || null,
      },
      sent: {
        model: ts.model || "jev-latest",
        questions: ts.questions || null,
        state: ts.state || null,
      },
      received: {
        model: ts.model || null,
        usage: ts.usage || null,
        answers: ts.answers || null,
      },
      ms: Number.isFinite(Number(ts.ms)) ? Math.max(0, Math.round(Number(ts.ms))) : raw.ms,
      source: "typesafe",
      ok: raw.ok,
      error: raw.error,
      cancelled: raw.cancelled,
    });
  } else if (jevOnly) {
    pushAiTrace({
      ...raw,
      kind: "jev",
      received: cleaned,
      source: raw.source || "typesafe",
    });
  }
  return textEntry;
}

function stripTypesafeTrace(received) {
  const out = { ...received };
  delete out.typesafeTrace;
  return out;
}

/**
 * @param {{ filter?: "all"|"text"|"image"|"jev" }} [opts]
 */
export function listAiTrace(opts = {}) {
  const all = entries.slice();
  const f = opts.filter !== undefined ? opts.filter : filter;
  if (!f || f === "all") return all;
  return all.filter((e) => e.kind === f);
}

export function selectAiTrace(id) {
  const hit = entries.find((e) => e.id === id);
  selectedId = hit ? hit.id : selectedId;
  emit();
  return hit || null;
}

export function selectedAiTrace() {
  const visible = listAiTrace();
  return visible.find((e) => e.id === selectedId) || visible[0] || null;
}

/**
 * Reconstruct the full model request as plain text (prompt + payload).
 * @param {object|null|undefined} req
 */
export function formatModelRequestPlain(req) {
  if (!req || typeof req !== "object") return "";
  const bits = [];
  if (req.model) bits.push(`model: ${req.model}`);
  if (req.system) bits.push(req.system);
  if (req.questions) bits.push(formatAiTraceJson(req.questions));
  if (req.userPrefix) bits.push(req.userPrefix);
  if (req.payload != null) bits.push(formatAiTraceJson(req.payload));
  if (req.state != null) bits.push(formatAiTraceJson(req.state));
  if (req.userSuffix) bits.push(req.userSuffix);
  return bits.filter(Boolean).join("\n\n");
}

export function formatAiTraceJson(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

export function aiTraceBadgeLabel(entry) {
  if (!entry) return "";
  const mode = String(entry.mode || "").trim() || "co-invent";
  if (entry.cancelled) return `${mode} · cancelled`;
  if (!entry.ok) return `${mode} · error`;
  if (entry.kind === "image") {
    const src = String(entry.source || "live").trim() || "live";
    return `${mode} · ${src}`;
  }
  if (entry.kind === "jev") {
    return `${mode} · jev`;
  }
  return mode;
}
