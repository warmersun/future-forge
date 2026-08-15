/**
 * Idea cards — place-specific application sparks for a selected emTech.
 * Pure helpers are safe to import from the server; IdeaDeck is browser-only.
 */

export const HOW_APPEND_MAX = 2400;
export const IDEA_LIMITS = {
  title: 60,
  blurb: 140,
  insertText: 280,
  imagePrompt: 400,
};

/**
 * Session cache key for sparks (mission + tech + year + place).
 * @param {{ missionId?: string, techId?: string, year?: number|string, place?: string }} parts
 */
export function ideaCacheKey(parts = {}) {
  return [
    String(parts.missionId || "none"),
    String(parts.techId || ""),
    String(parts.year ?? ""),
    String(parts.place || ""),
  ].join("|");
}

/**
 * Stable short id for /api/idea-image cache.
 * @param {{ techId?: string, ideaId?: string, place?: string, year?: number|string }} parts
 */
export function ideaImageId(parts = {}) {
  const raw = ideaCacheKey({
    missionId: parts.ideaId || "idea",
    techId: parts.techId,
    year: parts.year,
    place: parts.place,
  });
  return `idea-${fnv1a(raw)}`;
}

/**
 * Append a spark to how-it-works. Never replaces existing text.
 * @param {string} existing
 * @param {string} insertText
 */
export function appendHowText(existing, insertText) {
  const add = String(insertText || "").trim();
  if (!add) return String(existing || "");
  const cur = String(existing || "").trimEnd();
  const next = cur ? `${cur}\n\n${add}` : add;
  if (next.length <= HOW_APPEND_MAX) return next;
  if (!cur) return add.slice(0, HOW_APPEND_MAX);
  const room = HOW_APPEND_MAX - cur.length - 2;
  if (room < 20) return cur;
  return `${cur}\n\n${add.slice(0, room)}`;
}

/**
 * Clamp / sanitize an ideas array. Does not invent fallbacks.
 * @param {unknown} raw
 * @returns {{ id: string, title: string, blurb: string, insertText: string, imagePrompt: string }[]}
 */
export function normalizeIdeas(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const idea = sanitizeIdea(item, out.length);
    if (!idea) continue;
    let { id } = idea;
    if (seen.has(id)) id = `${id}-${out.length}`;
    seen.add(id);
    out.push({ ...idea, id });
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * If the model returned fewer than 3 usable sparks, pad from catalog use cases.
 * @param {unknown} raw
 * @param {object} [tech]
 * @param {object} [context]
 */
export function ideasOrFallback(raw, tech, context) {
  const ideas = normalizeIdeas(raw);
  if (ideas.length >= 3 || !tech) return ideas.slice(0, 3);
  const pad = context?.refresh
    ? rotateLocalIdeaSparks(tech, context, context.avoidTitles || [])
    : localIdeaSparks(tech, context);
  const seen = new Set(ideas.map((i) => i.id));
  for (const extra of pad) {
    if (ideas.length >= 3) break;
    if (seen.has(extra.id)) continue;
    ideas.push(extra);
    seen.add(extra.id);
  }
  return ideas.slice(0, 3);
}

/**
 * Catalog seeds for local sparks (at least 3 when tech is present).
 * @param {object} tech
 * @returns {string[]}
 */
export function collectIdeaSeeds(tech) {
  if (!tech || typeof tech !== "object") return [];
  const name = String(tech.name || "This tech").trim() || "This tech";
  const seeds = [];
  for (const u of tech.useCasesNow || []) {
    if (typeof u === "string" && u.trim()) seeds.push(u.trim());
  }
  if (typeof tech.inventionHint === "string" && tech.inventionHint.trim()) {
    seeds.push(tech.inventionHint.trim());
  }
  if (typeof tech.maturity?.now === "string" && tech.maturity.now.trim()) {
    seeds.push(tech.maturity.now.trim());
  }
  if (typeof tech.summary === "string" && tech.summary.trim()) {
    seeds.push(tech.summary.trim());
  }
  while (seeds.length < 3) {
    seeds.push(`applied ${name} with people still in charge`);
  }
  return seeds;
}

/**
 * Local (no-model) sparks from useCasesNow + place.
 * Always returns up to 3 sanitized ideas when tech is present.
 * @param {object} tech
 * @param {object} [context]
 */
export function localIdeaSparks(tech, context = {}) {
  if (!tech || typeof tech !== "object") return [];
  return normalizeIdeas(
    collectIdeaSeeds(tech)
      .slice(0, 3)
      .map((use, i) => ideaFromSeed(tech, context, use, i, 0))
  );
}

/**
 * Another local trio that prefers seeds not in avoidTitles (refresh).
 * @param {object} tech
 * @param {object} [context]
 * @param {string[]} [avoidTitles]
 */
export function rotateLocalIdeaSparks(tech, context = {}, avoidTitles = []) {
  if (!tech || typeof tech !== "object") return [];
  const seeds = collectIdeaSeeds(tech);
  const avoid = new Set(
    (avoidTitles || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean)
  );
  const unused = seeds.filter((s) => !avoid.has(titleFromUse(s).toLowerCase()));
  const used = seeds.filter((s) => avoid.has(titleFromUse(s).toLowerCase()));
  const ordered =
    unused.length > 0
      ? unused.concat(used)
      : rotateArray(seeds, Math.max(1, avoid.size));
  const salt = (avoidTitles || []).length + 1;
  return normalizeIdeas(
    ordered.slice(0, 3).map((use, i) => ideaFromSeed(tech, context, use, i, salt))
  );
}

/**
 * Browser deck: bind a host element and render 3 cards.
 * Safe to construct only when `document` exists.
 */
export class IdeaDeck {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   fetchSparks: (techId: string) => Promise<object[]>,
   *   fetchImage: (idea: object) => Promise<string|null>,
   *   onPick: (idea: object) => boolean|void,
   *   onClose?: () => void,
   *   onRefresh?: (techId: string, current: object[]) => Promise<object[]|false>,
   * }} opts
   */
  constructor(host, opts) {
    this.host = host;
    this.fetchSparks = opts.fetchSparks;
    this.fetchImage = opts.fetchImage;
    this.onPick = opts.onPick;
    this.onClose = opts.onClose || null;
    this.onRefresh = opts.onRefresh || null;
    this.techId = null;
    this.tech = null;
    this.ideas = [];
    this.selectedIds = new Set();
    this.hint = "";
    this.pickLabel = "Add to how it works";
    this.refreshLabel = "Refresh · 1 AP";
    this.gen = 0;
    this._refreshing = false;
    this._onClick = (e) => this._handleClick(e);
    host.addEventListener("click", this._onClick);
  }

  isOpen() {
    return Boolean(this.techId) && !this.host.hidden;
  }

  /**
   * @param {object} tech
   * @param {{ hint?: string, pickLabel?: string, refreshLabel?: string, selectedIds?: string[] }} [opts]
   */
  async open(tech, opts = {}) {
    if (!tech?.id) return;
    this.techId = tech.id;
    this.tech = tech;
    this.ideas = [];
    this.selectedIds = new Set(opts.selectedIds || []);
    this.hint = String(opts.hint || "");
    this.pickLabel = String(opts.pickLabel || "Add to how it works");
    this.refreshLabel = String(opts.refreshLabel || "Refresh · 1 AP");
    const gen = ++this.gen;
    this.host.hidden = false;
    this.host.setAttribute("data-tech", tech.id);
    this._paintLoading(tech);
    let ideas = [];
    try {
      ideas = await this.fetchSparks(tech.id);
    } catch {
      ideas = localIdeaSparks(tech, {});
    }
    if (gen !== this.gen) return;
    this.ideas = Array.isArray(ideas) ? ideas.slice(0, 3) : [];
    this._paint(tech, this.ideas);
    this._restoreMarks();
    this._loadImages(this.ideas, gen);
  }

  close() {
    const wasOpen = Boolean(this.techId) || !this.host.hidden;
    this.gen += 1;
    this.techId = null;
    this.tech = null;
    this.ideas = [];
    this.selectedIds = new Set();
    this.hint = "";
    this.pickLabel = "Add to how it works";
    this._refreshing = false;
    this.host.hidden = true;
    this.host.removeAttribute("data-tech");
    this.host.innerHTML = "";
    if (wasOpen) this.onClose?.();
  }

  destroy() {
    this.host.removeEventListener("click", this._onClick);
    this.close();
  }

  _handleClick(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const closeBtn = t.closest("[data-idea-close]");
    if (closeBtn) {
      e.preventDefault();
      this.close();
      return;
    }
    const refreshBtn = t.closest("[data-idea-refresh]");
    if (refreshBtn) {
      e.preventDefault();
      this.refresh();
      return;
    }
    const pick = t.closest("[data-idea-pick]");
    if (pick) {
      e.preventDefault();
      const id = pick.getAttribute("data-idea-pick");
      const idea = this.ideas.find((x) => x.id === id);
      if (!idea) return;
      const ok = this.onPick(idea);
      if (ok !== false) this.markSelected(idea.id);
    }
  }

  /**
   * Visual selected state on a card (check on the image + Added CTA).
   * @param {string} ideaId
   */
  markSelected(ideaId) {
    this.selectedIds.add(ideaId);
    const card = this.host.querySelector(`[data-idea-id="${cssEscape(ideaId)}"]`);
    if (!card) return;
    card.classList.add("is-selected");
    card.setAttribute("aria-selected", "true");
    const cta = card.querySelector(".idea-card-cta");
    if (cta) {
      cta.textContent = "Added";
      cta.setAttribute("aria-pressed", "true");
    }
  }

  /**
   * Ask the host for a new trio. `onRefresh` returns ideas, or false to keep the current set.
   */
  async refresh() {
    if (!this.tech || !this.onRefresh || this._refreshing) return;
    this._refreshing = true;
    const gen = ++this.gen;
    const previous = this.ideas.slice();
    this._paintLoading(this.tech);
    let next = false;
    try {
      next = await this.onRefresh(this.tech.id, previous);
    } catch {
      next = false;
    } finally {
      this._refreshing = false;
    }
    if (gen !== this.gen) return;
    if (next === false || !Array.isArray(next) || !next.length) {
      this.ideas = previous;
      this._paint(this.tech, this.ideas);
      this._restoreMarks();
      this._loadImages(this.ideas, gen);
      return;
    }
    this.selectedIds = new Set();
    this.ideas = next.slice(0, 3);
    this._paint(this.tech, this.ideas);
    this._loadImages(this.ideas, gen);
  }

  _restoreMarks() {
    for (const id of this.selectedIds) this.markSelected(id);
  }

  _loadImages(ideas, gen) {
    for (const idea of ideas) {
      this.fetchImage(idea)
        .then((url) => {
          if (gen !== this.gen) return;
          this._setImage(idea.id, url);
        })
        .catch(() => {
          if (gen !== this.gen) return;
          this._setImage(idea.id, null);
        });
    }
  }

  _paintLoading(_tech) {
    this.host.innerHTML = `
      <div class="idea-deck-row" role="list">
        ${[0, 1, 2]
          .map(
            () => `<article class="idea-card is-loading" role="listitem">
              <div class="idea-card-visual"><span class="idea-card-skel"></span></div>
              <div class="idea-card-body">
                <span class="idea-card-skel idea-card-skel-line"></span>
                <span class="idea-card-skel idea-card-skel-line idea-card-skel-short"></span>
              </div>
            </article>`
          )
          .join("")}
      </div>`;
  }

  _paint(_tech, ideas) {
    if (!ideas.length) {
      this.host.innerHTML = `<p class="idea-deck-empty muted">Could not load ideas — try again in a moment.</p>`;
      return;
    }
    this.host.innerHTML = `
      <div class="idea-deck-row" role="list">
        ${ideas.map((idea) => this._cardHtml(idea)).join("")}
      </div>`;
  }

  _cardHtml(idea) {
    return `<article class="idea-card" role="listitem" data-idea-id="${escapeHtml(idea.id)}" aria-selected="false">
      <div class="idea-card-visual">
        <span class="idea-card-skel" data-idea-ph="${escapeHtml(idea.id)}"></span>
      </div>
      <span class="idea-card-check" aria-hidden="true">✓</span>
      <div class="idea-card-body">
        <h4>${escapeHtml(idea.title)}</h4>
        <p>${escapeHtml(idea.blurb)}</p>
        <button type="button" class="idea-card-cta" data-idea-pick="${escapeHtml(idea.id)}">
          ${escapeHtml(this.pickLabel || "Add to how it works")}
        </button>
      </div>
    </article>`;
  }

  _setImage(ideaId, url) {
    const card = this.host.querySelector(`[data-idea-id="${cssEscape(ideaId)}"]`);
    if (!card) return;
    const visual = card.querySelector(".idea-card-visual");
    if (!visual) return;
    if (url) {
      visual.innerHTML = `<img alt="" src="${escapeHtml(url)}">`;
      card.classList.remove("is-loading");
      card.classList.add("has-image");
    } else {
      visual.innerHTML = `<span class="idea-card-fallback" aria-hidden="true"></span>`;
      card.classList.remove("is-loading");
      card.classList.add("is-fallback");
    }
  }
}

function ideaFromSeed(tech, context, use, index, salt = 0) {
  const place =
    String(context.place || context.challenge?.title || "this place").trim() ||
    "this place";
  const year = Number(context.year) || 2026;
  const name = String(tech.name || "This tech").trim() || "This tech";
  const title = titleFromUse(use);
  return {
    id: slugIdea(`${tech.id || "tech"}-${index}-${title}${salt ? `-r${salt}` : ""}`),
    title,
    blurb: `${clip(use, 90)} — a pilot-honest angle for ${year}.`,
    insertText: `In ${place}, ${name} could ${lowerFirst(use)} — keep a person here accountable for the call that matters.`,
    imagePrompt: `Photoreal 4:3 scene in ${place}: people using ${name} for ${use}. Natural light, documentary still, no readable text, no logos, no watermarks.`,
  };
}

function rotateArray(arr, n) {
  const list = Array.isArray(arr) ? arr : [];
  if (!list.length) return [];
  const k = ((Number(n) || 0) % list.length + list.length) % list.length;
  return list.slice(k).concat(list.slice(0, k));
}

function sanitizeIdea(item, index) {
  if (!item || typeof item !== "object") return null;
  const title = clip(item.title, IDEA_LIMITS.title);
  const insertText = clip(item.insertText || item.blurb, IDEA_LIMITS.insertText);
  if (!title || !insertText) return null;
  const id = slugIdea(item.id || title || `idea-${index}`);
  return {
    id,
    title,
    blurb: clip(item.blurb || insertText, IDEA_LIMITS.blurb),
    insertText,
    imagePrompt: clip(item.imagePrompt, IDEA_LIMITS.imagePrompt),
  };
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function slugIdea(s) {
  const slug = String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "idea";
}

function titleFromUse(use) {
  const t = String(use || "").trim();
  if (!t) return "Local application";
  const first = t.split(/[.;]/)[0].trim();
  if (first.length <= IDEA_LIMITS.title) return first;
  return `${first.slice(0, IDEA_LIMITS.title - 1)}…`;
}

function lowerFirst(s) {
  const t = String(s || "").trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssEscape(s) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return String(s).replace(/["\\]/g, "\\$&");
}
