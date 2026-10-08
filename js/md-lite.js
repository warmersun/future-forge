/**
 * Safe Markdown subset for Quest briefs and chat bubbles.
 * Allows: headings (#–###), paragraphs, **bold**, *italic*, lists, https? links.
 * Optional (chat): images ![alt](https://…), bare-URL autolink.
 * No raw HTML, tables, or scripts.
 */

/**
 * Escape HTML special characters.
 * @param {string} s
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
 * Strip markdown-ish markup to plain text (for excerpts / AI).
 * @param {string} md
 */
export function plainTextFromMarkdown(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} md
 * @param {number} [maxLen=220]
 */
export function excerptFromBrief(md, maxLen = 220) {
  const plain = plainTextFromMarkdown(md);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * @typedef {{ allowImages?: boolean, autolink?: boolean }} MdRenderOpts
 */

/**
 * Render a safe HTML string from markdown subset.
 * @param {string} md
 * @param {MdRenderOpts} [opts]
 * @returns {string}
 */
export function renderMarkdownSafe(md, opts = {}) {
  const allowImages = Boolean(opts.allowImages);
  const autolink = Boolean(opts.autolink);
  const src = String(md || "").replace(/\r\n/g, "\n");
  if (!src.trim()) return "";

  // Clean destinations first so <https://…> and titled URLs are not eaten as tags.
  const normalized = normalizeMarkdownDestinations(src);
  const withAutolinks = convertAngleAutolinks(normalized);
  // Strip any raw HTML tags entirely (do not interpret)
  const cleaned = withAutolinks.replace(/<[^>]*>/g, "");

  const lines = cleaned.split("\n");
  const blocks = [];
  let i = 0;

  const inline = (text) => inlineFormat(text, { allowImages, autolink });

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Standalone image line → block wrap (chat)
    if (allowImages && /^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      blocks.push(`<p class="md-img-wrap">${inline(trimmed)}</p>`);
      i += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(
          `<li>${inline(lines[i].trim().replace(/^[-*+]\s+/, ""))}</li>`
        );
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(
          `<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`
        );
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph: consecutive non-empty non-special lines
    const para = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^#{1,3}\s+/.test(t) || /^[-*+]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
        break;
      }
      if (allowImages && /^!\[[^\]]*\]\([^)]+\)$/.test(t)) break;
      para.push(t);
      i += 1;
    }
    if (para.length) {
      blocks.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }

  return blocks.join("\n");
}

/**
 * Chat bubbles: links + images + bare URL autolink.
 * @param {string} md
 */
export function renderChatMarkdown(md) {
  return renderMarkdownSafe(md, { allowImages: true, autolink: true });
}

/**
 * Markdown link destination: drop a quoted title and angle brackets.
 * Accepts raw quotes and the entities escapeHtml writes.
 * @param {string} raw
 * @returns {string}
 */
export function unwrapMarkdownDestination(raw) {
  let u = String(raw || "").trim();
  if (u.length >= 2 && u.startsWith("<") && u.endsWith(">")) {
    const inner = u.slice(1, -1).trim();
    if (inner && !/[\s<>]/.test(inner)) u = inner;
  }
  if (u.startsWith("&lt;") && u.endsWith("&gt;")) {
    const inner = u.slice(4, -4).trim();
    if (inner && !/[\s<>]/.test(inner) && !/&(?:lt|gt);/.test(inner)) u = inner;
  }
  const titled = /^(\S+)\s+(?:"[^"]*"|'[^']*'|&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;)\s*$/.exec(u);
  if (titled) u = titled[1];
  return u;
}

/**
 * Safe http(s) URL for href/src (input may already be HTML-escaped).
 * @param {string} url
 */
export function isSafeHttpUrl(url) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return false;
  // After escapeHtml, quotes become entities; still reject raw dangerous chars
  if (/[\s<>"']/.test(u)) return false;
  // Reject obvious non-http after decoding common entities
  const decoded = u
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  if (!/^https?:\/\//i.test(decoded)) return false;
  if (/[\s<>"']/.test(decoded)) return false;
  if (/^(javascript|data|vbscript):/i.test(decoded)) return false;
  return true;
}

/**
 * @param {string} text
 * @param {MdRenderOpts} [opts]
 */
function inlineFormat(text, opts = {}) {
  let s = escapeHtml(text);

  s = rewriteMarkdownMedia(s, opts);

  // Bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text* (simple; avoid list markers already handled)
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");

  if (opts.autolink) {
    s = autolinkBareUrls(s);
  }

  return s;
}

/**
 * Convert markdown images and links (already HTML-escaped text).
 * Images: ![alt](url) when allowImages; otherwise alt text only.
 * Links: [label](url) with https? only.
 * @param {string} s
 * @param {MdRenderOpts} [opts]
 */
function rewriteMarkdownMedia(s, opts = {}) {
  const allowImages = Boolean(opts.allowImages);
  let out = "";
  let i = 0;
  while (i < s.length) {
    // Image: ![alt](url)
    if (s[i] === "!" && s[i + 1] === "[") {
      const parsed = parseMdLinkAt(s, i + 1);
      if (parsed) {
        if (allowImages && isSafeHttpUrl(parsed.url)) {
          const safe = sanitizeUrlAttr(parsed.url);
          const alt = parsed.label;
          out += `<img class="md-img" src="${safe}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />`;
        } else {
          // No image: show alt text only (never javascript:/data: as src)
          out += parsed.label;
        }
        i = parsed.end;
        continue;
      }
    }

    // Link: [label](url)
    if (s[i] === "[") {
      const parsed = parseMdLinkAt(s, i);
      if (parsed) {
        if (isSafeHttpUrl(parsed.url)) {
          const safe = sanitizeUrlAttr(parsed.url);
          out += `<a href="${safe}" target="_blank" rel="noopener noreferrer">${parsed.label}</a>`;
        } else {
          out += parsed.label;
        }
        i = parsed.end;
        continue;
      }
    }

    out += s[i];
    i += 1;
  }
  return out;
}

/**
 * Parse [label](url) starting at index of `[`.
 * @param {string} s
 * @param {number} openBracket
 * @returns {{ label: string, url: string, end: number }|null}
 */
function parseMdLinkAt(s, openBracket) {
  if (s[openBracket] !== "[") return null;
  const closeLabel = s.indexOf("]", openBracket + 1);
  if (closeLabel < 0 || s[closeLabel + 1] !== "(") return null;
  const label = s.slice(openBracket + 1, closeLabel);
  let j = closeLabel + 2;
  let depth = 1;
  while (j < s.length && depth > 0) {
    if (s[j] === "(") depth += 1;
    else if (s[j] === ")") depth -= 1;
    j += 1;
  }
  if (depth !== 0) return null;
  const url = unwrapMarkdownDestination(s.slice(closeLabel + 2, j - 1));
  return { label, url, end: j };
}

/**
 * Rewrite ![alt](dest) and [label](dest) so dest is only the URL.
 * @param {string} src
 */
function normalizeMarkdownDestinations(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const image = src[i] === "!" && src[i + 1] === "[";
    if (image || src[i] === "[") {
      const parsed = parseMdLinkAt(src, image ? i + 1 : i);
      if (parsed) {
        out += `${image ? "!" : ""}[${parsed.label}](${parsed.url})`;
        i = parsed.end;
        continue;
      }
    }
    out += src[i];
    i += 1;
  }
  return out;
}

/**
 * Markdown autolinks <https://…> become real links before the tag strip.
 * Unsafe schemes are left for the stripper to delete.
 * @param {string} src
 */
function convertAngleAutolinks(src) {
  return src.replace(/<(https?:\/\/[^>\s]+)>/gi, (full, url) => {
    const clean = unwrapMarkdownDestination(url);
    if (!isSafeHttpUrl(clean)) return full;
    return `[${clean}](${clean})`;
  });
}

/**
 * @param {string} url already escaped-ish
 */
function sanitizeUrlAttr(url) {
  return String(url).replace(/"/g, "%22");
}

/**
 * Turn bare https?:// URLs into links; skip text already inside tags/attributes.
 * @param {string} s HTML fragment
 */
function autolinkBareUrls(s) {
  // Split on tags so we only touch text nodes. A URL that is already
  // the label of a link (angle autolinks become [url](url)) must stay put.
  const parts = s.split(/(<[^>]+>)/g);
  let inAnchor = false;
  return parts
    .map((part) => {
      if (part && part[0] === "<") {
        if (/^<a\b/i.test(part)) inAnchor = true;
        else if (/^<\/a\b/i.test(part)) inAnchor = false;
        return part;
      }
      if (!part || inAnchor) return part;
      return part.replace(
        /(https?:\/\/[^\s<]+)/gi,
        (raw) => {
          // Peel trailing punctuation common in prose
          let url = raw;
          let trail = "";
          while (url.length && /[.,);:!?]$/.test(url)) {
            trail = url.slice(-1) + trail;
            url = url.slice(0, -1);
          }
          if (!isSafeHttpUrl(url)) return raw;
          const safe = sanitizeUrlAttr(url);
          return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${url}</a>${trail}`;
        }
      );
    })
    .join("");
}
