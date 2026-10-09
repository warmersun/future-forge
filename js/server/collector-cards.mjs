/**
 * Collector card records, public HTML, and collect responses.
 * Player-facing prose never includes the operator `source` note.
 */

import path from "node:path";
import { DOMAINS, techById } from "../data.js";

export const CARD_TITLE_MAX = 80;
export const CARD_DESCRIPTION_MAX = 4000;
export const CARD_BODY_MAX = 8000;
export const CARD_LINKS_MAX = 8;
export const CARD_IMAGE_MAX_BYTES = 1_500_000;

/** Plain-words answer to "what can we do now that we could not do before?" */
export const CARD_CAPABILITY_MAX = 400;
/** Each use case is one short plain sentence. */
export const CARD_USE_CASE_MAX = 200;
export const CARD_USE_CASES_MAX = 3;
export const CARD_CAPABILITY_HEADING = "Capability";
export const CARD_USE_CASES_HEADING = "Use cases";
export const CARD_DETAILS_HEADING = "The details";

/** Open Graph / X large-card image. 1200×630 is the size those crawlers expect. */
export const CARD_SHARE_WIDTH = 1200;
export const CARD_SHARE_HEIGHT = 630;
export const CARD_SHARE_TYPE = "image/jpeg";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * @param {unknown} id
 */
export function isCardId(id) {
  return UUID_RE.test(String(id || "").trim());
}

/**
 * @param {unknown} id
 * @returns {string|null}
 */
export function normalizeCardId(id) {
  const s = String(id || "").trim().toLowerCase();
  return isCardId(s) ? s : null;
}

/**
 * @param {string} pathOnly
 * @returns {{ id: string, image: boolean, share: boolean } | { invalid: true } | null}
 */
export function parseCardPath(pathOnly) {
  const m = /^\/card\/([^/]+)(?:\/(image|preview\.jpg))?$/.exec(String(pathOnly || ""));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return { invalid: true };
  }
  const id = normalizeCardId(raw);
  if (!id) return { invalid: true };
  return { id, image: m[2] === "image", share: m[2] === "preview.jpg" };
}

/**
 * @param {string} pathOnly
 * @returns {{ id: string } | { invalid: true } | null}
 */
export function parseCollectPath(pathOnly) {
  const m = /^\/api\/me\/cards\/([^/]+)\/collect$/.exec(String(pathOnly || ""));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return { invalid: true };
  }
  const id = normalizeCardId(raw);
  if (!id) return { invalid: true };
  return { id };
}

/**
 * @param {unknown} url
 */
export function isHttpUrl(url) {
  try {
    const u = new URL(String(url || ""));
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

/**
 * @param {unknown} links
 * @returns {{ label: string, url: string }[]}
 */
export function sanitizeCardLinks(links) {
  if (!Array.isArray(links)) return [];
  const out = [];
  for (const row of links) {
    if (!row || typeof row !== "object") continue;
    const label = String(row.label || "").trim().slice(0, 80);
    const url = String(row.url || "").trim();
    if (!label || !isHttpUrl(url)) continue;
    out.push({ label, url });
    if (out.length >= CARD_LINKS_MAX) break;
  }
  return out;
}

/**
 * @param {string} ext
 */
export function contentTypeForImageExt(ext) {
  const e = String(ext || "").toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "";
}

/**
 * @param {unknown} type
 */
export function isCardImageType(type) {
  return IMAGE_TYPES.has(String(type || "").toLowerCase());
}

/** Sibling page-image extensions, first match wins. */
export const CARD_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Paths next to a card JSON: same basename, jpg then jpeg, png, webp.
 * @param {string} jsonPath
 * @returns {string[]}
 */
export function siblingCardImageCandidates(jsonPath) {
  const file = String(jsonPath || "");
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  return CARD_IMAGE_EXTS.map((ext) => path.join(dir, `${base}${ext}`));
}

/**
 * Explicit `image` (relative to the JSON) wins. Otherwise the first sibling that exists.
 * @param {string} jsonPath
 * @param {(filePath: string) => boolean} exists
 * @param {string} [override]
 * @returns {string|null}
 */
export function resolveCardImageFile(jsonPath, exists, override) {
  const dir = path.dirname(String(jsonPath || ""));
  const explicit = String(override || "").trim();
  if (explicit) return path.resolve(dir, explicit);
  for (const candidate of siblingCardImageCandidates(jsonPath)) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** One line of plain text: whitespace collapsed, trimmed. */
function oneLine(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Validate optional `capability` and `useCases`.
 * @param {object} src
 * @returns {{ ok: true, capability: string, useCases: string[] } | { ok: false, error: string }}
 */
export function parseCapabilityFields(src) {
  const capability = oneLine(src?.capability);
  if (src?.capability !== undefined && (typeof src.capability !== "string" || !capability)) {
    return { ok: false, error: "bad_capability" };
  }
  if (capability.length > CARD_CAPABILITY_MAX) return { ok: false, error: "bad_capability" };
  let useCases = [];
  const raw = src?.useCases ?? src?.use_cases;
  if (raw !== undefined) {
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > CARD_USE_CASES_MAX) {
      return { ok: false, error: "bad_use_cases" };
    }
    for (const item of raw) {
      const text = typeof item === "string" ? oneLine(item).replace(/^[-*•]\s+/, "") : "";
      if (!text || text.length > CARD_USE_CASE_MAX) return { ok: false, error: "bad_use_cases" };
      useCases.push(text);
    }
  }
  return { ok: true, capability, useCases };
}

/**
 * Stored body: the Capability and Use cases sections first, then the free
 * body under "The details". Plain `body` alone is returned unchanged, so
 * cards without the new fields store exactly what they did before.
 * @param {{ capability?: string, useCases?: string[], body?: string }} card
 */
export function composeCardBody({ capability = "", useCases = [], body = "" }) {
  const rest = String(body || "").trim();
  const parts = [];
  if (capability) parts.push(`## ${CARD_CAPABILITY_HEADING}\n${capability}`);
  if (useCases.length) {
    parts.push(`## ${CARD_USE_CASES_HEADING}\n${useCases.map((u) => `- ${u}`).join("\n")}`);
  }
  if (!parts.length) return rest;
  if (rest) parts.push(`## ${CARD_DETAILS_HEADING}\n\n${rest}`);
  return parts.join("\n\n");
}

/**
 * Validate an issue-script payload. `source` is dropped.
 * @param {unknown} raw
 * @param {{ requireImage?: boolean }} [opts]
 */
export function parseIssueCard(raw, opts = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const techId = String(src.techId || src.tech_id || "").trim();
  if (!techId || !techById(techId)) {
    return { ok: false, error: "unknown_tech" };
  }
  const title = String(src.title || "").trim();
  if (!title || title.length > CARD_TITLE_MAX) {
    return { ok: false, error: "bad_title" };
  }
  const description = String(src.description || "").trim();
  if (!description || description.length > CARD_DESCRIPTION_MAX) {
    return { ok: false, error: "bad_description" };
  }
  const extra = parseCapabilityFields(src);
  if (!extra.ok) return extra;
  const body = composeCardBody({
    capability: extra.capability,
    useCases: extra.useCases,
    body: String(src.body || "").trim(),
  });
  if (body.length > CARD_BODY_MAX) return { ok: false, error: "bad_body" };
  const links = sanitizeCardLinks(src.links);
  const id = src.id ? normalizeCardId(src.id) : null;
  if (src.id && !id) return { ok: false, error: "bad_id" };
  const published = src.published === false ? false : true;
  const imagePath = String(src.image || "").trim();
  if (opts.requireImage !== false && !imagePath) {
    return { ok: false, error: "image_required" };
  }
  return {
    ok: true,
    card: {
      id,
      techId,
      title,
      description,
      capability: extra.capability,
      useCases: extra.useCases,
      body,
      links,
      published,
      imagePath,
    },
  };
}

/**
 * @param {unknown} s
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {object} row
 * @param {string} origin
 */
export function publicCardDto(row, origin) {
  const id = normalizeCardId(row?.id) || String(row?.id || "");
  const techId = String(row?.techId || row?.tech_id || "");
  const tech = techById(techId);
  const base = String(origin || "").replace(/\/$/, "");
  return {
    id,
    techId,
    techName: tech?.name || techId,
    title: String(row?.title || ""),
    description: String(row?.description || ""),
    imagePath: `/card/${id}/image`,
    imageUrl: base ? `${base}/card/${id}/image` : `/card/${id}/image`,
    collectedAt: row?.collectedAt || row?.collected_at || null,
  };
}

/**
 * Edition line printed on the plate and on the share image.
 * @param {string} id
 */
export function cardEdition(id) {
  const s = String(id || "");
  return `No. ${s.slice(0, 4).toUpperCase()}\u00b7${s.slice(4, 8).toUpperCase()}`;
}

/**
 * Headers for a public card image. HEAD and GET share them; only GET sends bytes.
 * @param {number} byteLength
 * @param {{ contentType?: string, etag: string }} meta
 */
export function collectorImageHeaders(byteLength, meta) {
  return {
    "Content-Type": meta.contentType || CARD_SHARE_TYPE,
    "Content-Length": String(byteLength),
    ETag: meta.etag,
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
  };
}

/**
 * Domain light for the gallery. Falls back to forge gold.
 * @param {string} techId
 * @returns {string} "r, g, b"
 */
export function domainRgb(techId) {
  const hex = DOMAINS[techById(techId)?.domain]?.color;
  const safe = /^#[0-9a-f]{6}$/i.test(String(hex || "")) ? hex : "#e4c56a";
  const n = parseInt(safe.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * @param {string} url
 */
function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Card body to HTML. Blank lines split blocks. A block that starts with
 * "## " is a heading (any following lines become a paragraph). A block whose
 * lines all start with "- " is a list. Anything else is a paragraph with
 * single newlines kept as line breaks. When the body opens with the
 * Capability section, it and Use cases go in a highlighted panel so they read
 * first, right under the description.
 * @param {string} body
 * @returns {string}
 */
export function renderCardBodyHtml(body) {
  const text = String(body || "").trim();
  if (!text) return "";
  /** @type {{ kind: "h" | "p" | "ul", text?: string, items?: string[] }[]} */
  const blocks = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split("\n");
    if (/^## \S/.test(lines[0])) {
      blocks.push({ kind: "h", text: lines[0].slice(3).trim() });
      const rest = lines.slice(1);
      if (rest.length && rest.every((l) => /^- \S/.test(l))) {
        blocks.push({ kind: "ul", items: rest.map((l) => l.slice(2).trim()) });
      } else if (rest.join("").trim()) {
        blocks.push({ kind: "p", text: rest.join("\n").trim() });
      }
    } else if (lines.every((l) => /^- \S/.test(l))) {
      blocks.push({ kind: "ul", items: lines.map((l) => l.slice(2).trim()) });
    } else {
      blocks.push({ kind: "p", text: chunk });
    }
  }
  const html = (b, panel) => {
    if (b.kind === "h") return `<h2>${escapeHtml(b.text)}</h2>`;
    if (b.kind === "ul") return `<ul>${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    const cls = panel ? ' class="capability-text"' : "";
    return `<p${cls}>${escapeHtml(b.text).replace(/\n/g, "<br>")}</p>`;
  };
  let panelEnd = 0;
  if (blocks[0]?.kind === "h" && blocks[0].text === CARD_CAPABILITY_HEADING) {
    panelEnd = blocks.length;
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.kind === "h" && b.text !== CARD_USE_CASES_HEADING) {
        panelEnd = i;
        break;
      }
    }
  }
  const panel = panelEnd
    ? `<section class="capability" aria-label="${escapeHtml(CARD_CAPABILITY_HEADING)}">${blocks
        .slice(0, panelEnd)
        .map((b) => html(b, true))
        .join("")}</section>`
    : "";
  const rest = blocks.slice(panelEnd);
  const restHtml = rest.length ? `<div class="prose">${rest.map((b) => html(b, false)).join("")}</div>` : "";
  return panel + restHtml;
}

/**
 * @param {object} row
 * @param {{ origin: string, publishableKey?: string, clerkEnabled?: boolean, collectNow?: boolean }} opts
 */
export function renderCollectorCardPage(row, opts) {
  const origin = String(opts.origin || "").replace(/\/$/, "");
  const id = normalizeCardId(row.id) || String(row.id || "");
  const techId = String(row.techId || row.tech_id || "");
  const techName = techById(techId)?.name || techId;
  const title = String(row.title || "");
  const description = String(row.description || "");
  const body = String(row.body || "");
  const links = sanitizeCardLinks(row.links);
  const pageUrl = `${origin}/card/${id}`;
  const imageUrl = `${origin}/card/${id}/image`;
  const shareUrl = `${origin}/card/${id}/preview.jpg`;
  const ogDescription = description.replace(/\s+/g, " ").slice(0, 300);
  const paint = domainRgb(techId);
  const edition = cardEdition(id);
  const linkHtml = links.length
    ? `<section class="record"><h2>The record</h2><ul>${links
        .map((l) => {
          const host = escapeHtml(linkHost(l.url));
          return `<li><a href="${escapeHtml(l.url)}" rel="noopener noreferrer"><span class="record-name">${escapeHtml(l.label)}</span><span class="record-host">${host}</span></a></li>`;
        })
        .join("")}</ul></section>`
    : "";
  const bodyHtml = renderCardBodyHtml(body);
  const boot = JSON.stringify({
    cardId: id,
    publishableKey: opts.clerkEnabled ? String(opts.publishableKey || "") : "",
    clerkEnabled: Boolean(opts.clerkEnabled && opts.publishableKey),
    collectNow: Boolean(opts.collectNow),
  }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Future Forge</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta name="theme-color" content="#05070d" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(shareUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:image:width" content="${CARD_SHARE_WIDTH}" />
  <meta property="og:image:height" content="${CARD_SHARE_HEIGHT}" />
  <meta property="og:image:type" content="${CARD_SHARE_TYPE}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(shareUrl)}" />
  <link rel="icon" href="/assets/brand/ff-mark-hex.png" type="image/png" />
  <style>
    :root {
      color-scheme: dark;
      --ink: #05070d;
      --ivory: #f7f8fb;
      --read: #f4f7fb;
      --gold: #e4c56a;
      --gold-2: #f6e7b8;
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      --sans: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; }
    html { color-scheme: dark; scrollbar-color: rgba(228, 197, 106, 0.4) transparent; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--ink);
      color: var(--read);
      font-family: var(--sans);
      font-weight: 500;
      font-size: 1.125rem;
      line-height: 1.5;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(980px 680px at 16% 30%, rgba(var(--domain-rgb), 0.28), transparent 60%),
        radial-gradient(820px 620px at 86% 78%, rgba(var(--domain-rgb), 0.14), transparent 62%),
        radial-gradient(700px 460px at 50% 108%, rgba(228, 197, 106, 0.1), transparent 55%);
    }
    ::selection { background: rgba(var(--domain-rgb), 0.35); color: white; }
    :focus-visible { outline: 2px solid var(--gold-2); outline-offset: 3px; }
    .hexfield, .grain {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .hexfield { z-index: 0; opacity: 0.07; }
    .grain { z-index: 0; opacity: 0.04; mix-blend-mode: overlay; }
    .mast, main, footer { position: relative; z-index: 1; }
    .mast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0 auto;
      padding: 1rem clamp(1.25rem, 2.4vw, 2.5rem) 0;
    }
    .branding { display: block; text-decoration: none; }
    .branding img { display: block; height: 2.15rem; width: auto; }
    .mast-series {
      margin: 0;
      flex: none;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold-2);
    }
    main {
      margin: 0 auto;
      padding: clamp(0.85rem, 2vh, 1.5rem) clamp(1.25rem, 2.4vw, 2.5rem) 2.5rem;
    }
    .plate { position: relative; z-index: 0; }
    .plate::before {
      content: "";
      position: absolute;
      z-index: -1;
      inset: -16% -12%;
      pointer-events: none;
      background: radial-gradient(ellipse at center, rgba(var(--domain-rgb), 0.5), transparent 68%);
      filter: blur(16px);
    }
    .plate-stage {
      position: relative;
      z-index: 0;
      overflow: hidden;
      padding: 1.15rem 1.15rem 1.05rem;
      border-radius: 22px;
      background: linear-gradient(165deg, #191d27 0%, #0c0e14 42%, #08090d 100%);
      box-shadow:
        inset 0 0 0 1px rgba(255, 236, 200, 0.14),
        0 0 0 1px rgba(228, 197, 106, 0.5),
        0 30px 70px -24px rgba(0, 0, 0, 0.85),
        0 46px 100px -30px rgba(var(--domain-rgb), 0.55);
      animation: arrive 1.05s var(--ease) both;
      transition: box-shadow 0.45s ease;
    }
    .plate:hover .plate-stage {
      box-shadow:
        inset 0 0 0 1px rgba(255, 236, 200, 0.2),
        0 0 0 1px rgba(228, 197, 106, 0.78),
        0 34px 80px -22px rgba(0, 0, 0, 0.88),
        0 50px 110px -28px rgba(var(--domain-rgb), 0.7);
    }
    .plate-wash {
      position: absolute;
      z-index: 0;
      inset: -14%;
      width: 128%;
      height: 128%;
      object-fit: cover;
      filter: blur(36px) saturate(1.45) brightness(0.72);
    }
    .plate-stage .wash-dim {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at center, rgba(5, 7, 13, 0.18), rgba(5, 7, 13, 0.62) 80%);
    }
    .mat {
      position: relative;
      z-index: 1;
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
      background: #0b0d12;
    }
    .shot {
      display: block;
      width: 100%;
      height: auto;
      max-height: 72vh;
      object-fit: contain;
      border-radius: 2px;
    }
    .tick {
      position: absolute;
      z-index: 4;
      width: 16px;
      height: 16px;
      pointer-events: none;
    }
    .tick.tl { top: 9px; left: 9px; border-top: 1.5px solid var(--gold); border-left: 1.5px solid var(--gold); }
    .tick.tr { top: 9px; right: 9px; border-top: 1.5px solid var(--gold); border-right: 1.5px solid var(--gold); }
    .tick.bl { bottom: 9px; left: 9px; border-bottom: 1.5px solid var(--gold); border-left: 1.5px solid var(--gold); }
    .tick.br { bottom: 9px; right: 9px; border-bottom: 1.5px solid var(--gold); border-right: 1.5px solid var(--gold); }
    .vignette, .sheen {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
    }
    .vignette {
      z-index: 2;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(5, 7, 13, 0.28) 100%);
    }
    .sheen {
      z-index: 3;
      background: linear-gradient(108deg, transparent 40%, rgba(255, 248, 230, 0.07) 47%, rgba(255, 248, 230, 0.28) 50%, rgba(255, 248, 230, 0.07) 53%, transparent 60%);
      transform: translateX(-90%);
      mix-blend-mode: soft-light;
      animation: plate-sheen 16s ease-in-out infinite;
    }
    figcaption {
      display: flex;
      justify-content: flex-end;
      margin: 0.8rem 0.2rem 0;
    }
    .edition {
      flex: none;
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: 0.04em;
      white-space: nowrap;
      color: var(--gold-2);
    }
    .placard { animation: fade-in 0.9s var(--ease) 0.08s both; }
    .eyebrow {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      margin: 0 0 0.85rem;
      color: var(--gold-2);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .pip {
      width: 0.62rem;
      height: 0.72rem;
      flex: none;
      background: rgb(var(--domain-rgb));
      clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
      filter: drop-shadow(0 0 6px rgba(var(--domain-rgb), 0.9));
    }
    .eyebrow-tech { color: rgb(var(--domain-rgb)); letter-spacing: 0.06em; }
    .eyebrow-tech::before {
      content: "";
      display: inline-block;
      width: 3px;
      height: 3px;
      margin: 0 0.6rem 0 0.05rem;
      border-radius: 50%;
      background: currentColor;
      vertical-align: 0.15em;
    }
    h1 {
      margin: 0 0 0.85rem;
      color: #fff;
      font-weight: 700;
      font-size: clamp(2.15rem, 3.4vw, 3.6rem);
      line-height: 1.12;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }
    .lead {
      margin: 0;
      color: #fff;
      font-size: clamp(1.25rem, 1.45vw, 1.6rem);
      font-weight: 600;
      line-height: 1.45;
      text-wrap: pretty;
    }
    .prose {
      margin-top: 1.25rem;
      padding-top: 1.15rem;
      border-top: 1px solid rgba(var(--domain-rgb), 0.55);
      color: #fff;
      font-size: clamp(1.15rem, 1.25vw, 1.4rem);
      font-weight: 600;
      line-height: 1.5;
      text-wrap: pretty;
    }
    .prose p { margin: 0 0 0.95rem; }
    .prose p:last-child { margin: 0; }
    .prose h2, .capability h2 {
      margin: 1.1rem 0 0.45rem;
      color: var(--gold-2);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .prose h2:first-child, .capability h2:first-child { margin-top: 0; }
    .prose ul { margin: 0 0 0.95rem; padding-left: 1.2rem; }
    .capability {
      margin-top: 1.25rem;
      padding: 1.1rem 1.25rem 1.15rem;
      border-radius: 14px;
      border-left: 4px solid rgb(var(--domain-rgb));
      background: linear-gradient(135deg, rgba(var(--domain-rgb), 0.2), rgba(var(--domain-rgb), 0.06));
      box-shadow: inset 0 0 0 1px rgba(var(--domain-rgb), 0.35);
      color: #fff;
    }
    .capability-text {
      margin: 0;
      font-size: clamp(1.2rem, 1.35vw, 1.5rem);
      font-weight: 650;
      line-height: 1.45;
      text-wrap: pretty;
    }
    .capability ul { list-style: none; margin: 0; padding: 0; }
    .capability li {
      position: relative;
      margin: 0 0 0.55rem;
      padding-left: 1.35rem;
      font-size: clamp(1.1rem, 1.2vw, 1.3rem);
      font-weight: 600;
      line-height: 1.45;
    }
    .capability li:last-child { margin-bottom: 0; }
    .capability li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.42em;
      width: 0.62rem;
      height: 0.72rem;
      background: rgb(var(--domain-rgb));
      clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    }
    .capability + .prose { margin-top: 1.25rem; }
    .record { margin-top: 1.5rem; }
    .record h2 {
      margin: 0 0 0.35rem;
      color: var(--gold-2);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .record ul { list-style: none; margin: 0; padding: 0; }
    .record a {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.2rem 1rem;
      align-items: baseline;
      padding: 0.85rem 0;
      border-bottom: 1px solid rgba(244, 247, 251, 0.18);
      color: #fff;
      font-size: clamp(1.05rem, 1.15vw, 1.25rem);
      text-decoration: none;
    }
    .record li:first-child a { border-top: 1px solid rgba(244, 247, 251, 0.18); }
    .record-name { font-weight: 700; }
    .record a:hover .record-name { color: var(--gold-2); }
    .record-host { color: #e7eef8; font-size: 1.05rem; letter-spacing: 0.01em; }
    .record a:hover .record-host { color: rgb(var(--domain-rgb)); }
    .collect-dock { margin-top: 1.6rem; }
    #collect {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      width: 100%;
      max-width: 28rem;
      min-height: 3.4rem;
      padding: 0.95rem 1.5rem;
      border: 0;
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.48), transparent 40%),
        linear-gradient(180deg, #f8e7b8 0%, #e6c36a 40%, #c4923a 100%);
      color: #24180a;
      font: inherit;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      line-height: 1.25;
      text-align: center;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.55),
        0 12px 32px -14px rgba(228, 180, 70, 0.95),
        0 0 0 1px rgba(90, 58, 10, 0.35);
      transition: transform 0.2s var(--ease), filter 0.2s ease, box-shadow 0.2s ease;
    }
    .btn-hex {
      width: 0.68rem;
      height: 0.78rem;
      flex: none;
      background: #3a2a10;
      clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    }
    #collect:hover:not([disabled]) {
      transform: translateY(-1px);
      filter: brightness(1.06);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        0 18px 36px -12px rgba(228, 180, 70, 1),
        0 0 0 1px rgba(90, 58, 10, 0.35);
    }
    #collect:active:not([disabled]) { transform: translateY(0); }
    #collect[disabled] { cursor: default; }
    #collect.is-held {
      background: transparent;
      color: var(--gold-2);
      filter: none;
      letter-spacing: 0.14em;
      box-shadow: inset 0 0 0 1px rgba(228, 197, 106, 0.55);
    }
    #collect.is-held .btn-hex { background: var(--gold); }
    #collect.is-quiet {
      background: #241c12;
      color: #d9cba8;
      letter-spacing: 0.08em;
      filter: none;
      box-shadow: inset 0 0 0 1px rgba(228, 197, 106, 0.28);
    }
    #collect.is-quiet .btn-hex { background: #d9cba8; }
    #status {
      margin: 0.7rem 0 0;
      color: var(--read);
      font-size: 1.05rem;
      line-height: 1.45;
    }
    #status:empty { display: none; }
    .collect-dock:has(.is-held) #status { color: var(--gold-2); }
    footer {
      margin: 0 auto;
      padding: 0.4rem clamp(1.25rem, 2.4vw, 2.5rem) 2.4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.7rem;
      text-align: center;
    }
    footer::before {
      content: "";
      width: 7.5rem;
      height: 1px;
      margin-bottom: 0.7rem;
      background: linear-gradient(90deg, transparent, rgba(228, 197, 106, 0.75), transparent);
    }
    footer img { height: 2.55rem; width: auto; }
    footer p { margin: 0; color: var(--read); font-size: 1.05rem; }
    footer a { color: var(--gold-2); text-decoration: none; }
    footer a:hover { color: white; }
    @keyframes arrive {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes plate-sheen {
      0%, 64% { transform: translateX(-95%); }
      84%, 100% { transform: translateX(95%); }
    }
    @media (min-width: 720px) {
      .branding img { height: 2.7rem; }
    }
    @media (min-width: 1040px) {
      .spread {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
        column-gap: clamp(1.75rem, 2.6vw, 3.25rem);
        align-items: start;
      }
      .plate { position: sticky; top: 1rem; }
      .shot { max-height: 86vh; }
      #collect { max-width: none; }
    }
    @media (max-width: 1039px) {
      #collect { max-width: none; }
      .shot { max-height: 62vh; }
    }
    @media (prefers-reduced-motion: reduce) {
      .plate-stage, .placard, .sheen { animation: none; }
      .plate-stage, #collect { transition: none; }
    }
  </style>
</head>
<body style="--domain-rgb:${paint}">
  <svg class="hexfield" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="hexes" width="28" height="49" patternUnits="userSpaceOnUse">
        <path fill="#e4c56a" d="M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z"/>
      </pattern>
      <radialGradient id="hexfade" cx="50%" cy="42%" r="78%">
        <stop offset="0%" stop-color="white"/>
        <stop offset="62%" stop-color="white"/>
        <stop offset="100%" stop-color="black"/>
      </radialGradient>
      <mask id="hexmask">
        <rect width="100%" height="100%" fill="url(#hexfade)"/>
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexes)" mask="url(#hexmask)"/>
  </svg>
  <svg class="grain" aria-hidden="true" focusable="false">
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>
  <header class="mast">
    <a href="https://warmersun.com" class="branding">
      <img src="/assets/brand/ff-by-warmersun-transparent-bg.png" alt="Future Forge by Warmer Sun" width="1242" height="347" />
    </a>
    <p class="mast-series">Collection</p>
  </header>
  <main>
    <div class="spread">
      <figure class="plate">
        <div class="plate-stage">
          <img class="plate-wash" alt="" aria-hidden="true" src="${escapeHtml(imageUrl)}" />
          <div class="wash-dim" aria-hidden="true"></div>
          <div class="mat">
            <img class="shot" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" fetchpriority="high" />
          </div>
          <span class="tick tl" aria-hidden="true"></span>
          <span class="tick tr" aria-hidden="true"></span>
          <span class="tick bl" aria-hidden="true"></span>
          <span class="tick br" aria-hidden="true"></span>
          <span class="vignette" aria-hidden="true"></span>
          <span class="sheen" aria-hidden="true"></span>
        </div>
        <figcaption>
          <span class="edition">${escapeHtml(edition)}</span>
        </figcaption>
      </figure>
      <article class="placard">
        <p class="eyebrow"><span class="pip" aria-hidden="true"></span><span>Collector card</span><span class="eyebrow-tech">${escapeHtml(techName)}</span></p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        ${bodyHtml}
        ${linkHtml}
        <div class="collect-dock">
          <button type="button" id="collect"><span class="btn-hex" aria-hidden="true"></span><span id="collect-label">Collect this card</span></button>
          <p id="status" aria-live="polite"></p>
        </div>
      </article>
    </div>
  </main>
  <footer>
    <img src="/assets/brand/ff-mark-footer.png" alt="Future Forge" width="592" height="567" />
    <p><a href="https://warmersun.com">Warmer Sun</a></p>
  </footer>

  <script type="module">
    const boot = ${boot};
    const btn = document.getElementById("collect");
    const label = document.getElementById("collect-label");
    const status = document.getElementById("status");
    function setLabel(text) {
      if (label) label.textContent = text;
      else btn.textContent = text;
    }
    function clerkHost(pk) {
      const parts = String(pk || "").trim().split("_");
      if (parts.length < 3) throw new Error("Invalid Clerk publishable key");
      const decoded = atob(parts.slice(2).join("_"));
      return decoded.endsWith("$") ? decoded.slice(0, -1) : decoded;
    }
    function loadScript(src, attrs) {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.crossOrigin = "anonymous";
        for (const [k, v] of Object.entries(attrs || {})) s.setAttribute(k, v);
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("clerk_load_failed"));
        document.head.appendChild(s);
      });
    }
    function signIn() {
      const back = new URL(location.href);
      back.searchParams.set("collect", "1");
      location.href = "/signin?return=" + encodeURIComponent(back.toString());
    }
    async function owned(token) {
      const res = await fetch("/api/me/cards", { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return (data.cards || []).some((c) => c.id === boot.cardId);
    }
    function markOwned() {
      setLabel("In your collection");
      btn.classList.add("is-held");
      btn.disabled = true;
      status.textContent = "This card is in your Future Forge collection.";
    }
    async function collect(token) {
      btn.disabled = true;
      setLabel("Collecting…");
      status.textContent = "";
      const res = await fetch("/api/me/cards/" + boot.cardId + "/collect", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        btn.disabled = false;
        setLabel("Collect this card");
        status.textContent = "Could not collect this card.";
        return;
      }
      markOwned();
    }
    btn.addEventListener("click", async () => {
      if (!boot.clerkEnabled || !window.Clerk?.session) {
        signIn();
        return;
      }
      try {
        const token = await window.Clerk.session.getToken();
        if (!token) return signIn();
        await collect(token);
      } catch (e) {
        status.textContent = e?.message || "Could not collect this card.";
      }
    });
    if (!boot.clerkEnabled) {
      setLabel("Sign in is unavailable");
      btn.classList.add("is-quiet");
      btn.disabled = true;
    } else {
      try {
        const host = clerkHost(boot.publishableKey);
        await loadScript("https://" + host + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js", {
          "data-clerk-publishable-key": boot.publishableKey,
        });
        await window.Clerk.load();
        if (window.Clerk.session) {
          const token = await window.Clerk.session.getToken();
          if (token && (await owned(token))) markOwned();
          else if (boot.collectNow && token) await collect(token);
        } else if (boot.collectNow) signIn();
      } catch {
        status.textContent = "Sign in could not load. You can still read this card.";
      }
    }
  </script>
</body>
</html>
`;
}

/**
 * @param {{ ok?: boolean, status?: number, error?: string }} gate
 * @param {{ published?: boolean } | null} card
 * @param {{ already?: boolean }} [collect]
 */
export function collectHttpResult(gate, card, collect = {}) {
  if (!gate?.ok) {
    return {
      status: gate?.status || 401,
      body: { ok: false, error: gate?.error || "sign_in_required" },
    };
  }
  if (!card || card.published === false) {
    return { status: 404, body: { ok: false, error: "not_found" } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      collected: true,
      already: Boolean(collect.already),
    },
  };
}
