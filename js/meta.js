/**
 * G4 solo meta — dailies, pins, share cards, quest library (client-only, no server).
 */

const QUEST_LIBRARY_KEY = "future-forge:questLibrary:v1";
const DAILY_FOCUS_KEY = "future-forge:dailyFocus";
export const MAX_QUEST_LIBRARY = 50;

/** @param {Date} [d] */
export function dailySeedString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Simple string hash → uint32 */
export function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic daily pick from globals + local scenario pack builder.
 * @param {object[]} globals
 * @param {(global: object, opts: {count: number, salt: number}) => object[]} localScenariosForGlobal
 * @param {string} [seedStr]
 */
export function pickDailyMission(globals, localScenariosForGlobal, seedStr = dailySeedString()) {
  if (!globals?.length || typeof localScenariosForGlobal !== "function") return null;
  const h = hashSeed(`future-forge-daily:${seedStr}`);
  const g = globals[h % globals.length];
  const salt = (h >>> 8) % 1000;
  const list = localScenariosForGlobal(g, { count: 4, salt }) || [];
  if (!list.length) return null;
  const mission = list[(h >>> 16) % list.length];
  return {
    seed: seedStr,
    global: g,
    mission: { ...mission, globalId: mission.globalId || g.id, source: mission.source || "daily" },
  };
}

const PINS_KEY = "future-forge:pins";
export const MAX_PINS = 3;

export function loadPins() {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && p.missionId && p.globalId)
      .slice(0, MAX_PINS)
      .map((p) => ({
        missionId: String(p.missionId),
        globalId: String(p.globalId),
        title: String(p.title || "Pinned mission").slice(0, 100),
        place: String(p.place || "").slice(0, 80),
        globalTitle: String(p.globalTitle || "").slice(0, 80),
        pinnedAt: Number(p.pinnedAt) || Date.now(),
        missionSnapshot:
          p.missionSnapshot && typeof p.missionSnapshot === "object"
            ? p.missionSnapshot
            : null,
      }));
  } catch {
    return [];
  }
}

export function savePins(pins) {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify((pins || []).slice(0, MAX_PINS)));
  } catch {
    /* ignore */
  }
}

export function isPinned(missionId, pins = loadPins()) {
  return pins.some((p) => p.missionId === String(missionId));
}

/**
 * Toggle pin. Returns { pins, ok, error? }
 */
export function togglePin(mission, global, pins = loadPins()) {
  if (!mission?.id) return { pins, ok: false, error: "no_mission" };
  const id = String(mission.id);
  const existing = pins.findIndex((p) => p.missionId === id);
  if (existing >= 0) {
    const next = pins.filter((_, i) => i !== existing);
    savePins(next);
    return { pins: next, ok: true, removed: true };
  }
  if (pins.length >= MAX_PINS) {
    return { pins, ok: false, error: "pins_full" };
  }
  /** Snapshot so imported / spotlight Quests replay without seed packs */
  let missionSnapshot = null;
  if (mission.source === "imported" || mission.briefMd || mission.spotlight) {
    try {
      missionSnapshot = JSON.parse(JSON.stringify(mission));
    } catch {
      missionSnapshot = null;
    }
  }
  const next = [
    {
      missionId: id,
      globalId: String(mission.globalId || global?.id || ""),
      title: String(mission.title || "Mission").slice(0, 100),
      place: String(mission.place || "").slice(0, 80),
      globalTitle: String(global?.title || "").slice(0, 80),
      pinnedAt: Date.now(),
      missionSnapshot,
    },
    ...pins,
  ].slice(0, MAX_PINS);
  savePins(next);
  return { pins: next, ok: true, added: true };
}

/**
 * @returns {object[]} library entries { tile, mission, importedAt, id }
 */
export function loadQuestLibrary() {
  try {
    const raw = localStorage.getItem(QUEST_LIBRARY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && e.mission && e.mission.id)
      .slice(0, MAX_QUEST_LIBRARY)
      .map((e) => ({
        id: String(e.id || e.mission.id),
        importedAt: Number(e.importedAt) || Date.now(),
        tile: e.tile || null,
        mission: e.mission,
      }));
  } catch {
    return [];
  }
}

/**
 * @param {object[]} entries
 */
export function saveQuestLibrary(entries) {
  try {
    localStorage.setItem(
      QUEST_LIBRARY_KEY,
      JSON.stringify((entries || []).slice(0, MAX_QUEST_LIBRARY))
    );
  } catch {
    /* quota */
  }
}

/**
 * Add or replace a validated tile entry. Returns { ok, library, entry?, error? }
 * @param {{ tile: object, mission: object }} validated
 * @param {{ setFocus?: boolean }} [opts]
 */
export function importQuestToLibrary(validated, opts = {}) {
  if (!validated?.mission?.id) return { ok: false, error: "no_mission", library: loadQuestLibrary() };
  const library = loadQuestLibrary();
  const id = String(validated.mission.id);
  const entry = {
    id,
    importedAt: Date.now(),
    tile: validated.tile || null,
    mission: validated.mission,
  };
  const next = [entry, ...library.filter((e) => e.id !== id)].slice(0, MAX_QUEST_LIBRARY);
  if (next.length >= MAX_QUEST_LIBRARY && !library.some((e) => e.id === id)) {
    // still ok — we sliced; oldest drop implicitly via slice after unshift pattern
  }
  saveQuestLibrary(next);
  const placement = validated.tile?.placement?.mode || "replace-daily";
  const shouldFocus =
    opts.setFocus !== false && placement !== "alongside" && placement !== "library-only";
  if (shouldFocus) {
    setDailyFocus(id);
  }
  return { ok: true, library: next, entry, focused: shouldFocus };
}

/**
 * @param {string} missionId
 */
export function removeQuestFromLibrary(missionId) {
  const id = String(missionId || "");
  const next = loadQuestLibrary().filter((e) => e.id !== id);
  saveQuestLibrary(next);
  const focus = loadDailyFocus();
  if (focus?.missionId === id) clearDailyFocus();
  return next;
}

/**
 * @returns {{ missionId: string } | null}
 */
export function loadDailyFocus() {
  try {
    const raw = localStorage.getItem(DAILY_FOCUS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.missionId) return null;
    return { missionId: String(o.missionId) };
  } catch {
    return null;
  }
}

/**
 * @param {string} missionId
 */
export function setDailyFocus(missionId) {
  try {
    localStorage.setItem(
      DAILY_FOCUS_KEY,
      JSON.stringify({ missionId: String(missionId), at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function clearDailyFocus() {
  try {
    localStorage.removeItem(DAILY_FOCUS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve focused imported mission for Daily card, if any.
 * @returns {{ mission: object, globalId: string, entry: object } | null}
 */
export function getFocusedQuest() {
  const focus = loadDailyFocus();
  if (!focus?.missionId) return null;
  const entry = loadQuestLibrary().find((e) => e.id === focus.missionId);
  if (!entry?.mission) {
    clearDailyFocus();
    return null;
  }
  return {
    mission: entry.mission,
    globalId: entry.mission.globalId,
    entry,
  };
}

/**
 * True if `url` can be drawn as an invent vision (not a cleared img.src page URL).
 * Always use getAttribute("src") or this helper — bare `img.src` returns the page URL when empty.
 * @param {string|null|undefined} url
 */
export function isUsableVisionUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (u.startsWith("data:image")) return true;
  if (u.startsWith("blob:")) return true;
  if (/^https?:\/\//i.test(u)) {
    // Reject document page URL mistaken for an image after removeAttribute("src")
    try {
      if (typeof location !== "undefined") {
        const page = location.href.split("#")[0].split("?")[0];
        const abs = u.split("#")[0].split("?")[0];
        if (abs === page || abs === location.origin + "/" || abs === location.origin) {
          return false;
        }
      }
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

/**
 * Read a usable image URL from an <img>. Prefer getAttribute over .src.
 * @param {HTMLImageElement|null|undefined} el
 * @returns {string}
 */
export function visionUrlFromImg(el) {
  if (!el) return "";
  const attr = el.getAttribute?.("src");
  if (isUsableVisionUrl(attr)) {
    // Prefer absolute .src for blob:/http; keep data: as-is
    if (String(attr).startsWith("data:")) return String(attr);
    const abs = el.currentSrc || el.src || attr;
    return isUsableVisionUrl(abs) ? abs : String(attr);
  }
  // Fallback: decoded image may still have a usable absolute src
  const abs = el.currentSrc || (el.getAttribute?.("src") ? el.src : "");
  return isUsableVisionUrl(abs) ? abs : "";
}

/**
 * Draw a shareable run card to a canvas; returns data URL PNG.
 * Invention story (How it works + Everyday life), HUD-style crisis meters
 * (●/○ of 5), tech icons, AI vision, Future Forge by Warmer Sun.
 * Height grows with content so invent text can fit.
 *
 * @param {object} opts
 * @param {string} [opts.visionUrl]
 * @param {CanvasImageSource|null} [opts.visionImage] — already-decoded img/canvas (preferred)
 * @param {string} [opts.inventionHow]
 * @param {string} [opts.inventionImpact]
 * @param {Record<string, number>} [opts.pressure]
 * @param {{id?:string,name?:string,icon?:string}|string[]} [opts.techs]
 * @returns {Promise<string|null>}
 */
export async function renderShareCard(opts = {}) {
  const w = 1080;
  const padX = 96;
  const contentW = w - padX * 2;
  const maxDraftH = 3600;

  /** @type {CanvasImageSource|null} */
  let visionImg = null;
  if (opts.visionImage && isDrawableVision(opts.visionImage)) {
    visionImg = opts.visionImage;
  } else {
    const visionUrl = String(opts.visionUrl || opts.imageUrl || "").trim();
    if (isUsableVisionUrl(visionUrl)) {
      visionImg = await loadShareImage(visionUrl);
    }
  }

  const how = cleanShareText(opts.inventionHow || opts.how);
  const life = cleanShareText(opts.inventionImpact || opts.life || opts.everydayLife);
  const meters = normalizeCrisisMeters(opts.pressure);
  const techs = normalizeShareTechs(opts.techs);

  // Draft on a tall canvas, then crop to content
  const draft = document.createElement("canvas");
  draft.width = w;
  draft.height = maxDraftH;
  const ctx = draft.getContext("2d");
  if (!ctx) return null;

  // Background
  const grad = ctx.createLinearGradient(0, 0, w, maxDraftH);
  grad.addColorStop(0, "#0b0a14");
  grad.addColorStop(0.35, "#0c1220");
  grad.addColorStop(1, "#12111c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, maxDraftH);

  ctx.fillStyle = "rgba(255, 159, 67, 0.12)";
  ctx.beginPath();
  ctx.arc(160, 140, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 107, 74, 0.08)";
  ctx.beginPath();
  ctx.arc(920, 360, 240, 0, Math.PI * 2);
  ctx.fill();

  // —— Brand header ——
  drawWarmerSun(ctx, 114, 118, 20);
  ctx.fillStyle = "#fff4e6";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("Future Forge", 148, 112);
  ctx.fillStyle = "rgba(247, 240, 230, 0.58)";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("by ", 148, 144);
  const byW = ctx.measureText("by ").width;
  ctx.fillStyle = "#ffd28a";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText("Warmer Sun", 148 + byW, 144);

  ctx.fillStyle = "#ffb347";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(String(opts.kindLabel || "RUN REPORT").toUpperCase(), padX, 198);

  let y = 240;

  // —— AI vision (no label overlay on the image) ——
  if (visionImg) {
    const ih = 420;
    drawImageCover(ctx, visionImg, padX, y, contentW, ih, 22);
    y += ih + 40;
  }

  // —— Invention name + place ——
  ctx.fillStyle = "#fff4e6";
  ctx.font = "700 48px system-ui, sans-serif";
  y = wrapText(ctx, String(opts.inventionName || "Untitled invention"), padX, y, contentW, 54, 3) + 28;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 24px system-ui, sans-serif";
  const meta = [opts.place, opts.year && `Year ${opts.year}`, opts.globalTitle]
    .filter(Boolean)
    .join(" · ");
  if (meta) y = wrapText(ctx, meta, padX, y, contentW, 32, 2) + 32;

  // —— Crisis meters (same ●○○ language as the in-game HUD) ——
  if (meters.length) {
    y = drawCrisisMeterPills(ctx, padX, y, contentW, meters);
  }

  // —— How it works ——
  if (how) {
    y = drawShareSection(ctx, {
      x: padX,
      y,
      w: contentW,
      label: "HOW IT WORKS",
      body: how,
      maxLines: 16,
      bodySize: 26,
      lineHeight: 36,
    });
    y += 28;
  }

  // —— Everyday life ——
  if (life) {
    y = drawShareSection(ctx, {
      x: padX,
      y,
      w: contentW,
      label: "EVERYDAY LIFE",
      body: life,
      maxLines: 16,
      bodySize: 26,
      lineHeight: 36,
    });
    y += 28;
  }

  // Fallback if neither face exists (rare)
  if (!how && !life) {
    const fallback = cleanShareText(opts.blurb);
    if (fallback) {
      y = drawShareSection(ctx, {
        x: padX,
        y,
        w: contentW,
        label: "THE INVENTION",
        body: fallback,
        maxLines: 10,
        bodySize: 26,
        lineHeight: 36,
      });
      y += 28;
    }
  }

  // —— Technologies used (icon + name chips) ——
  if (techs.length) {
    y = drawTechChips(ctx, padX, y, contentW, techs);
  }

  // —— Footer ——
  y += 20;
  ctx.fillStyle = "rgba(247, 240, 230, 0.4)";
  ctx.font = "400 20px system-ui, sans-serif";
  ctx.fillText("Invent local. Race the exponential clock.", padX, y);
  y += 36;
  drawWarmerSun(ctx, padX + 12, y - 6, 12);
  ctx.fillStyle = "#fff4e6";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillText("Future Forge by Warmer Sun", padX + 34, y);
  y += 30;
  ctx.fillStyle = "#ffd28a";
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillText("warmersun.com", padX, y);
  y += 56;

  const finalH = Math.max(1200, Math.min(maxDraftH, Math.ceil(y)));

  // Outer frame on final crop
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = finalH;
  const out = canvas.getContext("2d");
  if (!out) return null;
  out.drawImage(draft, 0, 0, w, finalH, 0, 0, w, finalH);
  out.strokeStyle = "rgba(255, 180, 100, 0.28)";
  out.lineWidth = 3;
  roundRect(out, 48, 48, w - 96, finalH - 96, 28);
  out.stroke();

  return canvas.toDataURL("image/png");
}

/** @param {unknown} t */
function cleanShareText(t) {
  return String(t || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Record<string, number>|null|undefined} pressure
 * @returns {{ key: string, value: number }[]}
 */
export function normalizeCrisisMeters(pressure) {
  if (!pressure || typeof pressure !== "object") return [];
  return Object.entries(pressure)
    .filter(([k]) => k)
    .map(([key, v]) => ({
      key: String(key),
      value: Math.max(0, Math.min(5, Math.round(Number(v) || 0))),
    }))
    .slice(0, 8);
}

/**
 * @param {unknown} techs
 * @returns {{ id: string, name: string, icon: string }[]}
 */
export function normalizeShareTechs(techs) {
  if (!Array.isArray(techs)) return [];
  return techs
    .map((t) => {
      if (typeof t === "string") {
        return { id: t, name: t, icon: "◆" };
      }
      if (!t || typeof t !== "object") return null;
      const name = String(t.name || t.id || "").trim();
      if (!name) return null;
      return {
        id: String(t.id || name),
        name,
        icon: String(t.icon || "◆").slice(0, 4) || "◆",
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * HUD-style crisis pills: label + ●●●○○ (0–5), one per row — no prose overlay.
 * @returns {number} y after block
 */
function drawCrisisMeterPills(ctx, x, y, contentW, meters) {
  ctx.fillStyle = "rgba(247, 240, 230, 0.45)";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText("CRISIS", x, y);
  y += 28;

  const gap = 12;
  const pillH = 48;
  // Flow as wrapping chips when they fit; otherwise stack
  let cx = x;
  let cy = y;
  let rowMaxH = pillH;

  for (const m of meters) {
    const dots = `${"●".repeat(m.value)}${"○".repeat(5 - m.value)}`;
    ctx.font = "600 20px system-ui, sans-serif";
    const labelW = ctx.measureText(m.key).width;
    ctx.font = "600 22px system-ui, sans-serif";
    const dotsW = ctx.measureText(dots).width;
    const pillW = Math.min(contentW, Math.ceil(labelW + dotsW + 40));

    if (cx > x && cx + pillW > x + contentW) {
      cx = x;
      cy += rowMaxH + gap;
      rowMaxH = pillH;
    }

    const level = m.value >= 4 ? "hot" : m.value >= 2 ? "warm" : "cool";
    let border = "rgba(148, 163, 184, 0.28)";
    let bg = "rgba(18, 26, 43, 0.95)";
    let labelColor = "#e8eef9";
    let dotsColor = "#94a3b8";
    if (level === "warm") {
      border = "rgba(251, 191, 36, 0.45)";
      labelColor = "#fde68a";
      dotsColor = "#fbbf24";
    } else if (level === "hot") {
      border = "rgba(248, 113, 113, 0.5)";
      bg = "rgba(248, 113, 113, 0.1)";
      labelColor = "#fecaca";
      dotsColor = "#f87171";
    }

    roundRect(ctx, cx, cy, pillW, pillH, pillH / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label then dots — fixed baseline so nothing stacks on itself
    const baseline = cy + 31;
    ctx.fillStyle = labelColor;
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(m.key, cx + 16, baseline);
    ctx.fillStyle = dotsColor;
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(dots, cx + 16 + labelW + 12, baseline);

    cx += pillW + gap;
    rowMaxH = Math.max(rowMaxH, pillH);
  }

  return cy + rowMaxH + 28;
}

/**
 * Tech chips with emTech icon + name.
 * @returns {number} y after block
 */
function drawTechChips(ctx, x, y, contentW, techs) {
  ctx.fillStyle = "rgba(247, 240, 230, 0.45)";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText("TECHNOLOGIES USED", x, y);
  y += 28;

  const gap = 12;
  const chipH = 48;
  let cx = x;
  let cy = y;

  for (const t of techs) {
    ctx.font = "400 24px system-ui, sans-serif";
    const iconW = ctx.measureText(t.icon).width;
    ctx.font = "500 22px system-ui, sans-serif";
    const nameW = ctx.measureText(t.name).width;
    const chipW = Math.min(contentW, Math.ceil(iconW + nameW + 44));

    if (cx > x && cx + chipW > x + contentW) {
      cx = x;
      cy += chipH + gap;
    }

    roundRect(ctx, cx, cy, chipW, chipH, 14);
    ctx.fillStyle = "rgba(26, 36, 56, 0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const baseline = cy + 32;
    ctx.font = "400 24px system-ui, sans-serif";
    ctx.fillStyle = "#fff4e6";
    ctx.fillText(t.icon, cx + 14, baseline);
    ctx.font = "500 22px system-ui, sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(t.name, cx + 14 + iconW + 10, baseline);

    cx += chipW + gap;
  }

  return cy + chipH + 24;
}

/**
 * Section label + wrapped body. Returns y after the last line (+ spacing).
 */
function drawShareSection(ctx, { x, y, w, label, body, maxLines = 12, bodySize = 26, lineHeight = 36 }) {
  ctx.fillStyle = "rgba(247, 240, 230, 0.45)";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(label, x, y);
  let yy = y + 34;
  ctx.fillStyle = "#e8eef9";
  ctx.font = `400 ${bodySize}px system-ui, sans-serif`;
  yy = wrapText(ctx, body, x, yy, w, lineHeight, maxLines);
  return yy + 10;
}

/** Warmer Sun logo mark (radial sunrise gold). */
function drawWarmerSun(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
  g.addColorStop(0, "#fff8e7");
  g.addColorStop(0.28, "#ffe29a");
  g.addColorStop(0.62, "#ff9f43");
  g.addColorStop(1, "#ff6b4a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 180, 100, 0.35)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
}

/**
 * @param {unknown} src
 * @returns {src is CanvasImageSource}
 */
function isDrawableVision(src) {
  if (!src || typeof src !== "object") return false;
  // HTMLImageElement / SVGImageElement
  if ("naturalWidth" in src) {
    const w = Number(src.naturalWidth) || 0;
    const h = Number(src.naturalHeight) || 0;
    return w > 0 && h > 0;
  }
  // HTMLCanvasElement / OffscreenCanvas / ImageBitmap
  if ("width" in src && "height" in src) {
    return Number(src.width) > 0 && Number(src.height) > 0;
  }
  return false;
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement|null>}
 */
function loadShareImage(url) {
  return new Promise((resolve) => {
    if (!isUsableVisionUrl(url) || typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    // blob:/data: are same-origin. Remote https needs CORS for canvas export.
    if (/^https?:\/\//i.test(url)) {
      try {
        img.crossOrigin = "anonymous";
      } catch {
        /* ignore */
      }
    }
    const done = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img);
      else resolve(null);
    };
    img.onload = done;
    img.onerror = () => resolve(null);
    try {
      img.src = url;
      // Cached / already-complete
      if (img.complete) done();
    } catch {
      resolve(null);
    }
  });
}

/** Draw image cover-fit into a rounded rect, then stroke the frame. */
function drawImageCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const ir = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
  const tr = w / h;
  let dw;
  let dh;
  let dx;
  let dy;
  if (ir > tr) {
    dh = h;
    dw = h * ir;
    dx = x - (dw - w) / 2;
    dy = y;
  } else {
    dw = w;
    dh = w / ir;
    dx = x;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 180, 100, 0.4)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @returns {number} y of last line baseline
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 5) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  let line = "";
  let yy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText(`${line}…`, x, yy);
        return yy;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, yy);
    return yy;
  }
  return y;
}

export function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "future-forge-run.png";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function kindLabelForOutcome(kind, meta = {}) {
  if (meta?.bankrupt) return "Out of capital";
  if (kind === "win") return "Crisis eased";
  if (kind === "partial") return "Partial deploy";
  if (kind === "collapse") return "Too late";
  return "Run report";
}
