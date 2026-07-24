/**
 * G4 solo meta — dailies, pins, share cards (client-only, no server).
 */

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
  const next = [
    {
      missionId: id,
      globalId: String(mission.globalId || global?.id || ""),
      title: String(mission.title || "Mission").slice(0, 100),
      place: String(mission.place || "").slice(0, 80),
      globalTitle: String(global?.title || "").slice(0, 80),
      pinnedAt: Date.now(),
    },
    ...pins,
  ].slice(0, MAX_PINS);
  savePins(next);
  return { pins: next, ok: true, added: true };
}

/**
 * Draw a shareable run card to a canvas; returns data URL PNG.
 * @param {object} opts
 */
export function renderShareCard(opts = {}) {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#070b14");
  grad.addColorStop(0.45, "#0c1220");
  grad.addColorStop(1, "#121a2b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Accent orbs
  ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
  ctx.beginPath();
  ctx.arc(180, 160, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(167, 139, 250, 0.1)";
  ctx.beginPath();
  ctx.arc(920, 280, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(52, 211, 153, 0.08)";
  ctx.beginPath();
  ctx.arc(540, 1180, 300, 0, Math.PI * 2);
  ctx.fill();

  // Card frame
  ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
  ctx.lineWidth = 3;
  roundRect(ctx, 48, 48, w - 96, h - 96, 28);
  ctx.stroke();

  ctx.fillStyle = "#e8eef9";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("FUTURE FORGE", 96, 130);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(String(opts.kindLabel || "RUN REPORT").toUpperCase(), 96, 175);

  // Invention name
  ctx.fillStyle = "#e8eef9";
  ctx.font = "700 56px system-ui, sans-serif";
  wrapText(ctx, String(opts.inventionName || "Untitled invention"), 96, 280, w - 192, 64);

  // Place / meta
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 28px system-ui, sans-serif";
  const meta = [opts.place, opts.year && `Year ${opts.year}`, opts.globalTitle]
    .filter(Boolean)
    .join(" · ");
  wrapText(ctx, meta, 96, 420, w - 192, 36);

  // Stars
  const stars = Math.max(0, Math.min(3, Number(opts.stars) || 0));
  ctx.font = "700 64px system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("★".repeat(stars) + "☆".repeat(3 - stars), 96, 540);

  // Scores
  if (opts.speedScore != null) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 26px system-ui, sans-serif";
    ctx.fillText(
      `Speed ${opts.speedScore} · Honesty ${opts.honestyScore} · Elegance ${opts.eleganceScore}`,
      96,
      610
    );
  }

  // Story blurb
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "400 30px system-ui, sans-serif";
  wrapText(ctx, String(opts.blurb || "").slice(0, 320), 96, 700, w - 192, 42);

  // Techs
  if (opts.techs?.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText("STACK", 96, 1000);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "500 28px system-ui, sans-serif";
    wrapText(ctx, opts.techs.slice(0, 8).join(" · "), 96, 1050, w - 192, 38);
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText("Invent local. Race the exponential clock.", 96, h - 100);

  return canvas.toDataURL("image/png");
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
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
      if (lines >= 5) {
        ctx.fillText(`${line}…`, x, yy);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
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
