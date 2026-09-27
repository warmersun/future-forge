/**
 * Ring buffer of AI text + image exchanges for the developer AI inspect pane.
 * DOM-free aside from optional blob: previews of Imagine data URLs.
 */

const CAP = 30;
const PREVIEW_CAP = 6;
const FILTERS = new Set(["all", "text", "image"]);
const IMAGE_MODES = new Set(["vision", "idea-image"]);

/** @type {Array<object>} */
let entries = [];
let selectedId = null;
let seq = 0;
/** @type {"all"|"text"|"image"} */
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
 * @returns {"text"|"image"}
 */
export function aiTraceKind(raw = {}) {
  if (raw.kind === "image" || raw.kind === "text") return raw.kind;
  const mode = String(raw.mode || raw.sent?.mode || "");
  if (IMAGE_MODES.has(mode)) return "image";
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
 * @param {"all"|"text"|"image"} next
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
  for (const e of entries) {
    if (e.kind === "image") image += 1;
    else text += 1;
  }
  return { all: entries.length, text, image };
}

/**
 * @param {{
 *   mode?: string,
 *   kind?: "text"|"image",
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
    raw.received && typeof raw.received === "object" ? { ...raw.received } : null;
  let llm = raw.llm && typeof raw.llm === "object" ? raw.llm : null;
  if (receivedRaw && receivedRaw.llm && typeof receivedRaw.llm === "object") {
    if (!llm) llm = receivedRaw.llm;
    delete receivedRaw.llm;
  }
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
    llm,
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
 * @param {{ filter?: "all"|"text"|"image" }} [opts]
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
  return mode;
}

function escapeTraceHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TONE_CLASS = {
  role: "ai-trace-sec-role",
  warn: "ai-trace-sec-warn",
  contract: "ai-trace-sec-contract",
  state: "ai-trace-sec-state",
  search: "ai-trace-sec-search",
  instruction: "ai-trace-sec-instruction",
  preamble: "ai-trace-sec-preamble",
};

function toneClass(tone) {
  return TONE_CLASS[tone] || "ai-trace-sec-role";
}

function sectionKey(scope, section, index) {
  return `${scope}:${index}:${section?.id || "part"}`;
}

function findTraceSection(llm, key) {
  if (!llm || !key) return null;
  const parts = String(key).split(":");
  const scope = parts[0];
  const index = Number(parts[1]);
  const list = scope === "director" ? llm.director?.sections : llm.sections;
  if (!Array.isArray(list) || !Number.isInteger(index)) return null;
  return list[index] || null;
}

/**
 * Text for an inspect copy button.
 * @param {object|null} entry
 * @param {string} which
 * @param {string|null} [sectionKey]
 */
export function aiTraceCopyText(entry, which, sectionKey) {
  const llm = entry?.llm;
  if (which === "request") {
    if (!llm) return formatAiTraceJson(entry?.sent);
    if (llm.kind === "image") return String(llm.user || "");
    return [llm.system, llm.user].filter((s) => s).join("\n\n");
  }
  if (which === "response") return String(llm?.rawOutput || "");
  if (which === "director-request") {
    const director = llm?.director;
    if (!director) return "";
    return [director.system, director.user].filter((s) => s).join("\n\n");
  }
  if (which === "director-response") return String(llm?.director?.rawOutput || "");
  if (which === "section") return displaySectionText(findTraceSection(llm, sectionKey));
  if (which === "sent") return formatAiTraceJson(entry?.sent);
  return formatAiTraceJson(entry?.received);
}

function metaLines(llm) {
  if (!llm) return "";
  const lines = [];
  if (llm.model) lines.push(`model: ${llm.model}`);
  if (llm.imageMode) lines.push(`image mode: ${llm.imageMode}`);
  if (llm.temperature != null) lines.push(`temperature: ${llm.temperature}`);
  if (llm.maxOutputTokens != null) lines.push(`max output tokens: ${llm.maxOutputTokens}`);
  if (llm.reasoning) lines.push(`reasoning: ${llm.reasoning}`);
  if (Array.isArray(llm.tools) && llm.tools.length) lines.push(`tools: ${llm.tools.join(", ")}`);
  lines.push(llm.sent ? "sent: yes" : "sent: no");
  if (llm.note) lines.push(`note: ${llm.note}`);
  if (llm.error) lines.push(`error: ${llm.error}`);
  return lines.join("\n");
}

function detailsBlock({ className, open, title, copy, section, body }) {
  const copyBtn = copy
    ? `<button type="button" class="btn btn-ghost btn-sm" data-ai-trace-copy="${escapeTraceHtml(copy)}"${
        section ? ` data-ai-trace-section="${escapeTraceHtml(section)}"` : ""
      }>Copy</button>`
    : "";
  return `<details class="ai-trace-sec ${className}"${open ? " open" : ""}>
    <summary><span>${escapeTraceHtml(title)}</span></summary>
    ${copyBtn ? `<div class="ai-trace-sec-actions">${copyBtn}</div>` : ""}
    <pre class="ai-trace-pre">${escapeTraceHtml(body)}</pre>
  </details>`;
}

/**
 * Session state is the JSON payload. Show it indented; the stored text stays exact.
 * @param {object|null|undefined} section
 */
function displaySectionText(section) {
  const text = String(section?.text || "");
  if (section?.id !== "state" && section?.id !== "user") return text;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return text;
  }
}

function sectionsHtml(llm, scope) {
  const list = Array.isArray(llm?.sections) ? llm.sections : [];
  return list
    .map((section, index) => {
      const n = String(section?.text || "").length;
      const title = `${section?.label || "Section"} · ${n.toLocaleString()} chars`;
      return detailsBlock({
        className: toneClass(section?.tone),
        open: section?.id === "state",
        title,
        copy: "section",
        section: sectionKey(scope, section, index),
        body: displaySectionText(section),
      });
    })
    .join("");
}

function exchangeHtml(llm, { scope, requestCopy, responseCopy, metaTitle }) {
  if (!llm) return "";
  const responseBody = llm.rawOutput
    ? llm.rawOutput
    : llm.kind === "image"
      ? "No text response. The image is the preview above."
      : "";
  return (
    detailsBlock({
      className: "ai-trace-sec-meta",
      open: false,
      title: metaTitle,
      copy: requestCopy,
      body: metaLines(llm),
    }) +
    sectionsHtml(llm, scope) +
    detailsBlock({
      className: "ai-trace-sec-response",
      open: false,
      title: "Response",
      copy: responseCopy,
      body: responseBody,
    })
  );
}

/**
 * Collapsible prompt sections when the server echoed `llm`; otherwise the payload JSON.
 * @param {object|null} entry
 */
export function aiTraceDetailBlocks(entry) {
  const llm = entry?.llm;
  if (!llm || typeof llm !== "object") {
    return `<div class="ai-trace-block">
      <div class="ai-trace-block-head">Sent<button type="button" class="btn btn-ghost btn-sm" data-ai-trace-copy="sent">Copy</button></div>
      <pre class="ai-trace-pre" id="aitrace-sent">${escapeTraceHtml(formatAiTraceJson(entry?.sent))}</pre>
    </div>
    <div class="ai-trace-block">
      <div class="ai-trace-block-head">Returned<button type="button" class="btn btn-ghost btn-sm" data-ai-trace-copy="returned">Copy</button></div>
      <pre class="ai-trace-pre" id="aitrace-returned">${escapeTraceHtml(formatAiTraceJson(entry?.received))}</pre>
    </div>`;
  }
  const director = llm.director
    ? `<details class="ai-trace-sec ai-trace-sec-director">
        <summary><span>Vision director</span></summary>
        <div class="ai-trace-director">
          ${exchangeHtml(llm.director, {
            scope: "director",
            requestCopy: "director-request",
            responseCopy: "director-response",
            metaTitle: "Director request",
          })}
        </div>
      </details>`
    : "";
  const folded = `<details class="ai-trace-sec ai-trace-sec-folded" open>
      <summary><span>Parsed result</span></summary>
      <div class="ai-trace-sec-actions"><button type="button" class="btn btn-ghost btn-sm" data-ai-trace-copy="returned">Copy</button></div>
      <pre class="ai-trace-pre">${escapeTraceHtml(formatAiTraceJson(entry?.received))}</pre>
    </details>
    <details class="ai-trace-sec ai-trace-sec-folded">
      <summary><span>HTTP payload</span></summary>
      <div class="ai-trace-sec-actions"><button type="button" class="btn btn-ghost btn-sm" data-ai-trace-copy="sent">Copy</button></div>
      <pre class="ai-trace-pre">${escapeTraceHtml(formatAiTraceJson(entry?.sent))}</pre>
    </details>`;
  return (
    exchangeHtml(llm, {
      scope: "main",
      requestCopy: "request",
      responseCopy: "response",
      metaTitle: llm.kind === "image" ? "Image request" : "Request",
    }) +
    director +
    folded
  );
}
