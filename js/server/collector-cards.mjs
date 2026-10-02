/**
 * Collector card records, public HTML, and collect responses.
 * Player-facing prose never includes the operator `source` note.
 */

import path from "node:path";
import { techById } from "../data.js";

export const CARD_TITLE_MAX = 80;
export const CARD_DESCRIPTION_MAX = 4000;
export const CARD_BODY_MAX = 8000;
export const CARD_LINKS_MAX = 8;
export const CARD_IMAGE_MAX_BYTES = 1_500_000;

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
 * @returns {{ id: string, image: boolean } | { invalid: true } | null}
 */
export function parseCardPath(pathOnly) {
  const m = /^\/card\/([^/]+)(?:\/(image))?$/.exec(String(pathOnly || ""));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return { invalid: true };
  }
  const id = normalizeCardId(raw);
  if (!id) return { invalid: true };
  return { id, image: m[2] === "image" };
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
  const body = String(src.body || "").trim();
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
  const ogDescription = description.replace(/\s+/g, " ").slice(0, 300);
  const linkHtml = links.length
    ? `<ul class="links">${links
        .map(
          (l) =>
            `<li><a href="${escapeHtml(l.url)}" rel="noopener noreferrer">${escapeHtml(l.label)}</a></li>`
        )
        .join("")}</ul>`
    : "";
  const bodyHtml = body
    ? `<div class="prose">${escapeHtml(body)
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("")}</div>`
    : "";
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
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <style>
    :root { 
      color-scheme: dark; 
      --bg:#070b14; 
      --bg-elevated:#0f1729;
      --text:#e8eef9; 
      --text-bright:#f8fafc;
      --dim:#94a3b8; 
      --accent:#a78bfa; 
      --accent-hover:#9169f5;
      --line:#2a3a58; 
      --shadow:rgba(0,0,0,0.4);
    }
    * { box-sizing: border-box; }
    html, body { 
      margin:0; 
      background:var(--bg); 
      color:var(--text); 
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }
    body { min-height:100vh; display:flex; flex-direction:column; }
    
    /* Header branding */
    header { 
      padding:1.25rem 1.25rem 0; 
      max-width:50rem; 
      margin:0 auto; 
      width:100%; 
    }
    .branding { 
      display:block;
      text-decoration:none;
      transition:opacity 0.2s;
    }
    .branding:hover { opacity:0.85; }
    .branding img { 
      height:2.5rem;
      width:auto; 
      display:block;
      max-width:100%;
    }
    
    /* Main content */
    main { 
      flex:1;
      max-width:50rem; 
      margin:0 auto; 
      padding:1.5rem 1.25rem 2rem;
      width:100%;
    }
    
    /* Hero image - 16:9 with proper cropping */
    .hero-wrapper {
      position:relative;
      width:100%;
      aspect-ratio:16/9;
      overflow:hidden;
      border-radius:16px;
      background:var(--bg-elevated);
      box-shadow:0 4px 24px var(--shadow);
      margin-bottom:2rem;
    }
    .shot { 
      width:100%; 
      height:100%;
      object-fit:cover;
      display:block;
    }
    
    /* Content hierarchy */
    .content { max-width:42rem; }
    
    .tech { 
      margin:0 0 0.625rem; 
      color:var(--accent); 
      font-size:0.875rem; 
      font-weight:600;
      letter-spacing:0.05em; 
      text-transform:uppercase; 
    }
    
    h1 { 
      font-size:clamp(1.75rem, 4vw, 2.25rem);
      line-height:1.2; 
      margin:0 0 1rem; 
      color:var(--text-bright);
      font-weight:700;
      letter-spacing:-0.02em;
    }
    
    .desc { 
      color:var(--text); 
      line-height:1.65;
      font-size:1.125rem;
      margin:0 0 1.5rem;
      font-weight:400;
    }
    
    .prose { 
      margin:1.5rem 0;
      color:var(--dim);
      line-height:1.7;
      font-size:1rem;
    }
    .prose p { 
      margin:0 0 1rem;
    }
    .prose p:last-child { margin-bottom:0; }
    
    .links { 
      list-style:none;
      padding:0;
      margin:1.5rem 0;
      display:flex;
      flex-direction:column;
      gap:0.625rem;
    }
    .links li { margin:0; }
    .links a { 
      color:#7dd3fc;
      text-decoration:none;
      font-weight:500;
      transition:color 0.2s;
      display:inline-flex;
      align-items:center;
      gap:0.375rem;
    }
    .links a:hover { color:#38bdf8; }
    .links a::before {
      content:"→";
      font-size:1.125rem;
      line-height:1;
    }
    
    /* Collect button - mobile optimized */
    .collect-wrapper {
      margin:2rem 0 1rem;
      position:sticky;
      bottom:0;
      z-index:10;
      background:linear-gradient(to bottom, transparent 0%, var(--bg) 20%, var(--bg) 100%);
      padding:1.5rem 0 1rem;
      margin-left:-1.25rem;
      margin-right:-1.25rem;
      padding-left:1.25rem;
      padding-right:1.25rem;
    }
    
    button { 
      font:inherit;
      font-size:1.0625rem;
      font-weight:600;
      cursor:pointer; 
      border:0; 
      border-radius:12px; 
      padding:1rem 2rem;
      background:var(--accent); 
      color:#0c1220;
      width:100%;
      max-width:24rem;
      display:block;
      transition:background 0.2s, transform 0.1s;
      box-shadow:0 2px 12px rgba(167,139,250,0.25);
      min-height:3rem;
      touch-action:manipulation;
    }
    button:hover:not([disabled]) { 
      background:var(--accent-hover);
      transform:translateY(-1px);
      box-shadow:0 4px 16px rgba(167,139,250,0.35);
    }
    button:active:not([disabled]) {
      transform:translateY(0);
    }
    button[disabled] { 
      opacity:0.5; 
      cursor:default;
      box-shadow:none;
    }
    
    #status { 
      color:var(--dim); 
      min-height:1.5rem;
      margin-top:0.75rem;
      font-size:0.9375rem;
      line-height:1.5;
    }
    
    /* Bottom padding for mobile scroll clearance */
    .content {
      padding-bottom:8rem;
    }
    
    /* Footer branding */
    footer {
      padding:2rem 1.25rem 1.5rem;
      max-width:50rem;
      margin:0 auto;
      width:100%;
      border-top:1px solid var(--line);
      text-align:center;
    }
    footer img {
      height:1.5rem;
      width:auto;
      opacity:0.5;
      transition:opacity 0.2s;
    }
    footer img:hover { opacity:0.75; }
    
    /* Tablet and desktop adjustments */
    @media (min-width: 640px) {
      header { padding:1.5rem 2rem 0; }
      main { padding:2rem 2rem 3rem; }
      footer { padding:3rem 2rem 2rem; }
      .hero-wrapper { 
        border-radius:20px;
        margin-bottom:2.5rem;
      }
      .content {
        padding-bottom:0;
      }
      .collect-wrapper {
        position:static;
        margin:2.5rem 0 1.5rem;
        background:transparent;
        padding:0;
        margin-left:0;
        margin-right:0;
      }
      button {
        width:auto;
        min-width:16rem;
      }
    }
    
    @media (min-width: 768px) {
      .branding img { height:3.5rem; }
    }
    
    @media (min-width: 1024px) {
      .branding img { height:4rem; }
    }
  </style>
</head>
<body>
  <header>
    <a href="https://warmersun.com" class="branding" aria-label="Future Forge by Warmer Sun">
      <img src="/assets/brand/ff-by-warmersun-transparent-bg.png" alt="Future Forge by Warmer Sun" width="1242" height="347" />
    </a>
  </header>
  <main>
    <div class="hero-wrapper">
      <img class="shot" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
    </div>
    <div class="content">
      <p class="tech">${escapeHtml(techName)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="desc">${escapeHtml(description)}</p>
      ${bodyHtml}
      ${linkHtml}
      <div class="collect-wrapper">
        <button type="button" id="collect">Collect</button>
        <p id="status"></p>
      </div>
    </div>
  </main>
  <footer>
    <img src="/assets/brand/ff-mark-footer.png" alt="Future Forge" width="256" height="256" />
  </footer>
  <script type="module">
    const boot = ${boot};
    const btn = document.getElementById("collect");
    const status = document.getElementById("status");
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
      btn.textContent = "In your collection";
      btn.disabled = true;
      status.textContent = "This card is in your Future Forge collection.";
    }
    async function collect(token) {
      btn.disabled = true;
      status.textContent = "Collecting…";
      const res = await fetch("/api/me/cards/" + boot.cardId + "/collect", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        btn.disabled = false;
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
      btn.textContent = "Sign in is unavailable";
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
