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
    :root { color-scheme: dark; --bg:#070b14; --text:#e8eef9; --dim:#94a3b8; --accent:#a78bfa; --line:#2a3a58; }
    html, body { margin:0; background:var(--bg); color:var(--text); font-family:"Segoe UI",system-ui,sans-serif; }
    main { max-width:40rem; margin:0 auto; padding:1.5rem 1.1rem 3rem; }
    .shot { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:14px; background:#121a2b; display:block; }
    .tech { margin:1rem 0 0; color:var(--accent); font-size:.85rem; letter-spacing:.04em; text-transform:uppercase; }
    h1 { font-size:1.6rem; line-height:1.25; margin:.35rem 0 .75rem; }
    .desc, .prose p { color:var(--dim); line-height:1.5; }
    .links { padding-left:1.1rem; }
    .links a { color:#7dd3fc; }
    button { font:inherit; cursor:pointer; border:0; border-radius:10px; padding:.6rem 1rem; background:var(--accent); color:#0c1220; margin-top:1rem; }
    button[disabled] { opacity:.65; cursor:default; }
    #status { color:var(--dim); min-height:1.2em; }
  </style>
</head>
<body>
  <main>
    <img class="shot" src="${escapeHtml(imageUrl)}" alt="" />
    <p class="tech">${escapeHtml(techName)}</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="desc">${escapeHtml(description)}</p>
    ${bodyHtml}
    ${linkHtml}
    <p><button type="button" id="collect">Collect</button></p>
    <p id="status"></p>
  </main>
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
