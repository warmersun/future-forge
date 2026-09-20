#!/usr/bin/env node
/**
 * Record the 18 on-the-curve invent-screen clips from the live Future Forge UI.
 * Developer mode off. Visible cursor overlay. Year starts 2026.
 * Setup Quest: Crossing Clinic 7 / gene sequencing Spotlight.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import {
  QUEST_ID,
  loadOnTheCurvePackSync,
} from "../js/on-the-curve-pack.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(ROOT, "output/on-the-curve");
const RAW = path.join(PACK, "raw");
const SCRATCH =
  process.env.FF_RECORD_SCRATCH ||
  "/tmp/grok-goal-8c3fad5a62ce/implementer";
const PORT = Number(process.env.FF_RECORD_PORT || 8767);
const CDP_PORT = Number(process.env.FF_RECORD_CDP || 9223);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const DISPLAY = process.env.DISPLAY || ":1";
const TARGET_S = 18;
const MIN_S = 15.2;
const MAX_S = 24.5;

const GENE_HOW =
  "A same-shift sequencer on the clinic bench reads the swab before the next queue arrives. Nurse Amina gets a pathogen name this afternoon, not next week's truck.";
const AI_HOW =
  "A local ranking model compares the new read to the fever sheet so the ward knows which bench to clear first, this year, under a clinician's eye.";
const STRETCH_HOW =
  "A handheld sequencer finishes a full human genome in four seconds and prints a finished cure on the spot as routine clinic work in 2026.";

function log(...a) {
  console.log(new Date().toISOString().slice(11, 19), ...a);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: opts.stdio || ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout?.on("data", (d) => {
      out += d;
    });
    p.stderr?.on("data", (d) => {
      err += d;
    });
    p.on("close", (code) => {
      if (code === 0) resolve({ out, err, code });
      else reject(new Error(`${cmd} ${args[0] || ""} → ${code}\n${err || out}`));
    });
  });
}

function httpJson(url, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout }, (res) => {
      let b = "";
      res.on("data", (d) => {
        b += d;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

async function waitHttpOk(url, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      await httpJson(url);
      return;
    } catch {
      await sleep(400);
    }
  }
  throw new Error("never up: " + url);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.pending = new Map();
    this.handlers = new Map();
    ws.on("message", (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (data.id != null && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(`${JSON.stringify(data.error)}`));
        else resolve(data.result || {});
      } else if (data.method) {
        const h = this.handlers.get(data.method);
        if (h) h(data.params || {});
      }
    });
  }
  on(method, fn) {
    this.handlers.set(method, fn);
  }
  call(method, params = {}, timeout = 30000) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("timeout " + method));
        }
      }, timeout);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }
  async eval(expr, awaitPromise = false, timeout = 30000) {
    const res = await this.call(
      "Runtime.evaluate",
      {
        expression: expr,
        returnByValue: true,
        awaitPromise,
      },
      timeout
    );
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "eval exception");
    }
    return (res.result || {}).value;
  }
}

function spawnLogged(cmd, args, logFile, extraEnv = {}) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const out = fs.openSync(logFile, "w");
  const child = spawn(cmd, args, {
    env: { ...process.env, DISPLAY, ...extraEnv },
    stdio: ["ignore", out, out],
    detached: false,
  });
  child.unref?.();
  return child;
}

async function startServer() {
  const logFile = path.join(SCRATCH, "game-server.log");
  const child = spawnLogged(
    process.execPath,
    [path.join(ROOT, "server.mjs"), "--no-developer"],
    logFile,
    { FF_PORT: String(PORT), FF_DEVELOPER: "0" }
  );
  await waitHttpOk(`${ORIGIN}/api/health`, 25000);
  const health = await httpJson(`${ORIGIN}/api/health`);
  if (health.developer) throw new Error("developer mode is ON — abort");
  log("game server", ORIGIN, "developer=", health.developer, "ai=", health.ai);
  return child;
}

async function startChrome() {
  const profile = path.join(SCRATCH, "chrome-profile");
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(profile, { recursive: true });
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-session-crashed-bubble",
    "--disable-infobars",
    "--disable-sync",
    "--disable-features=Translate,MediaRouter",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=1920,1080",
    "--window-position=80,60",
    `--app=${ORIGIN}/?q=${QUEST_ID}`,
  ];
  const child = spawnLogged("google-chrome", args, path.join(SCRATCH, "chrome.log"));
  await waitHttpOk(`http://127.0.0.1:${CDP_PORT}/json/version`, 20000);
  await sleep(1200);
  return child;
}

async function connectPage() {
  const targets = await httpJson(`http://127.0.0.1:${CDP_PORT}/json`);
  const pages = (targets || []).filter((t) => t.type === "page");
  const page =
    pages.find((t) => String(t.url || "").includes(String(PORT))) || pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("no chrome page");
  log("cdp page", page.title, page.url);
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 32 * 1024 * 1024 });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  const cdp = new Cdp(ws);
  await cdp.call("Runtime.enable");
  await cdp.call("Page.enable");
  await cdp.call("DOM.enable");
  await cdp.call("Overlay.hideHighlight").catch(() => {});
  try {
    const win = await cdp.call("Browser.getWindowForTarget");
    await cdp.call("Browser.setWindowBounds", {
      windowId: win.windowId,
      bounds: {
        left: 80,
        top: 60,
        width: 1920,
        height: 1080,
        windowState: "normal",
      },
    });
  } catch (e) {
    log("window size skip", e.message);
  }
  return { cdp, ws };
}

const CURSOR_JS = `(() => {
  let el = document.getElementById('ff-rec-cursor');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ff-rec-cursor';
    el.setAttribute('aria-hidden','true');
    el.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M3.5 2.5 L3.5 22.8 L9.8 17.2 L14.2 26.2 L17.6 24.7 L13.1 15.6 L22.4 15.6 Z" fill="#f8fafc" stroke="#0b1220" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(el.style, {
      position:'fixed', left:'0', top:'0', width:'28px', height:'28px',
      pointerEvents:'none', zIndex:'2147483647',
      filter:'drop-shadow(0 1px 2px rgba(0,0,0,.7))',
      transition:'transform 70ms linear'
    });
    document.documentElement.appendChild(el);
  }
  window.__ffMoveCursor = (x,y) => { el.style.transform = 'translate('+x+'px,'+y+'px)'; };
  return 'ok';
})()`;

const BOOT_JS = `(() => {
  try {
    localStorage.setItem('future-forge:conceptCardsMuted', JSON.stringify([
      'look-ahead','honesty-bar','convergence','pathway','wait-vs-end-turn','art-of-the-possible','learn'
    ]));
    localStorage.removeItem('future-forge:tech-rail-collapsed');
  } catch {}
  return true;
})()`;

async function injectChrome(cdp) {
  await cdp.eval(BOOT_JS);
  await cdp.eval(CURSOR_JS);
}

async function boxOf(cdp, selector) {
  return cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width/2, y: r.top + Math.min(24, r.height/2), w: r.width, h: r.height };
  })()`);
}

async function moveCursor(cdp, x, y) {
  await cdp.eval(`window.__ffMoveCursor && window.__ffMoveCursor(${x},${y})`);
  await cdp.call("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    pointerType: "mouse",
  }).catch(() => {});
}

async function clickSel(cdp, selector, opts = {}) {
  const t0 = Date.now();
  const timeout = opts.timeout || 8000;
  let box = null;
  while (Date.now() - t0 < timeout) {
    box = await boxOf(cdp, selector);
    if (box) break;
    await sleep(200);
  }
  if (!box) {
    log("missing", selector);
    return false;
  }
  await moveCursor(cdp, box.x, box.y);
  await sleep(opts.linger || 180);
  await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.scrollIntoView({block:'center', inline:'nearest'});
    el.click();
    return true;
  })()`);
  await sleep(opts.after || 250);
  return true;
}

async function waitFor(cdp, expr, timeout = 15000, label = "wait") {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await cdp.eval(expr);
    if (last) {
      log("ok", label, last);
      return last;
    }
    await sleep(250);
  }
  log("timeout", label, last);
  return last;
}

async function startScreencast(cdp, framesDir) {
  fs.mkdirSync(framesDir, { recursive: true });
  let n = 0;
  let lastWrite = Promise.resolve();
  const times = [];
  const t0 = Date.now();
  cdp.on("Page.screencastFrame", (params) => {
    const sessionId = params.sessionId;
    const b64 = params.data;
    n += 1;
    const dest = path.join(framesDir, `f${String(n).padStart(5, "0")}.jpg`);
    times.push(Date.now());
    lastWrite = lastWrite.then(() => fs.promises.writeFile(dest, Buffer.from(b64, "base64")));
    if (sessionId != null) {
      cdp.call("Page.screencastFrameAck", { sessionId }).catch(() => {});
    }
  });
  await cdp.call("Page.startScreencast", {
    format: "jpeg",
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });
  return {
    async stop() {
      await sleep(120);
      await cdp.call("Page.stopScreencast").catch(() => {});
      await lastWrite;
      const elapsed = (Date.now() - t0) / 1000;
      const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
      log("screencast", frames.length, "frames in", elapsed.toFixed(1), "s");
      return { frames, elapsed, framesDir };
    },
  };
}

async function encodeRaw(id, framesDir, elapsed) {
  const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
  if (!frames.length) throw new Error("no frames for " + id);
  const n = frames.length;
  const fr = Math.max(n / Math.max(elapsed || TARGET_S, TARGET_S), 0.2);
  fs.mkdirSync(RAW, { recursive: true });
  const dest = path.join(RAW, `${id}.mp4`);
  const pattern = path.join(framesDir, "f%05d.jpg");
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    fr.toFixed(4),
    "-i",
    pattern,
    "-vf",
    "fps=24,format=yuv420p,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
    "-t",
    TARGET_S.toFixed(2),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    dest,
  ]);
  log("raw", dest);
  return dest;
}

async function wiggleCursor(cdp, ms) {
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    const box = { x: 900 + (i % 9) * 8, y: 500 + ((i * 3) % 7) * 6 };
    await moveCursor(cdp, box.x, box.y);
    i += 1;
    await sleep(180);
  }
}

async function recordClip(cdp, shot, action) {
  const only = (process.env.FF_RECORD_ONLY || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (only.length && !only.includes(shot.id) && !only.includes(String(shot.n))) {
    log("skip", shot.file);
    return;
  }
  const framesDir = path.join(SCRATCH, "rec-frames", shot.id);
  fs.rmSync(framesDir, { recursive: true, force: true });
  log("REC", shot.file);
  await injectChrome(cdp);
  const t0 = Date.now();
  const rec = await startScreencast(cdp, framesDir);
  try {
    await action();
    const elapsed = (Date.now() - t0) / 1000;
    if (elapsed < TARGET_S) await wiggleCursor(cdp, (TARGET_S - elapsed) * 1000);
  } finally {
    const elapsed = (Date.now() - t0) / 1000;
    if (elapsed < MIN_S) await wiggleCursor(cdp, (MIN_S - elapsed) * 1000);
    const over = (Date.now() - t0) / 1000 - MAX_S;
    if (over > 0) log("clip long", shot.id, (MAX_S + over).toFixed(1));
    const stopped = await rec.stop();
    await encodeRaw(shot.id, framesDir, Math.max(stopped.elapsed, TARGET_S));
  }
}

async function dismissPop(cdp) {
  await cdp.eval(`(() => {
    const news = document.querySelector('#market-news-ok');
    if (news) { news.click(); return 'news'; }
    const ok = document.querySelector('#year-bulletin-ok');
    const modal = document.querySelector('#year-bulletin-modal');
    if (ok && modal && !modal.hidden) { ok.click(); return 'year'; }
    const conv = document.querySelector('#hex-convergence-ok');
    const dlg = document.querySelector('#hex-convergence-dialog');
    if (conv && dlg && !dlg.hidden) { conv.click(); return 'conv'; }
    document.querySelector('#tour-root button')?.click();
    const concept = document.querySelector('[data-concept-dismiss], .coach-dismiss, .tour-card button');
    if (concept) { concept.click(); return 'concept'; }
    return 'none';
  })()`);
}

async function closeWait(cdp) {
  const open = await cdp.eval(
    `document.querySelector('#wait-confirm-backdrop') && !document.querySelector('#wait-confirm-backdrop').hidden`
  );
  if (open) await clickSel(cdp, "#wait-confirm-cancel", { after: 400 });
}

async function openWait(cdp) {
  const open = await cdp.eval(
    `document.querySelector('#wait-confirm-backdrop.open, #wait-confirm-backdrop:not([hidden])') && !document.querySelector('#wait-confirm-backdrop').hidden`
  );
  if (!open) await clickSel(cdp, "#btn-wait", { after: 700 });
  await waitFor(
    cdp,
    `document.querySelector('#wait-confirm-title')?.textContent?.includes('Look Ahead') ? 'look' : ''`,
    8000,
    "look-ahead"
  );
  await sleep(600);
}

async function focusTech(cdp, id) {
  await cdp.eval(`(() => {
    const all = document.querySelector('#tech-group-all');
    if (all && !all.open) all.open = true;
  })()`);
  await sleep(200);
  const sel = `[data-tech-focus="${id}"]`;
  await cdp.eval(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({block:'center'})`);
  await sleep(200);
  return clickSel(cdp, sel, { after: 400 });
}

async function writeHow(cdp, text) {
  const scarce = "Same-shift answers at Crossing Clinic 7";
  const mech = text;
  await cdp.eval(`(() => {
    const scarceEl = document.querySelector('#hex-scaffold-scarce');
    const mechEl = document.querySelector('#hex-scaffold-mech');
    if (scarceEl) {
      scarceEl.focus();
      scarceEl.value = ${JSON.stringify(scarce)};
      scarceEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (mechEl) {
      mechEl.focus();
      mechEl.value = ${JSON.stringify(mech)};
      mechEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const ta = document.querySelector('#hex-how-text');
    if (ta) {
      ta.hidden = false;
      ta.value = ${JSON.stringify(text)};
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return 'ok';
  })()`);
}

async function mintCustom(cdp, how) {
  await writeHow(cdp, how);
  await clickSel(cdp, "#btn-mint-custom", { after: 400 });
  return waitFor(
    cdp,
    `document.querySelector('#hex-idea-cards [data-id]') ? document.querySelector('#hex-idea-cards [data-id]').dataset.id : ''`,
    20000,
    "minted-card"
  );
}

async function placeCard(cdp, q, r) {
  const usedDbl = q === 2 && r === 2;
  if (usedDbl) {
    await cdp.eval(`document.querySelector('#hex-idea-cards [data-id]')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
    await sleep(800);
    return waitFor(
      cdp,
      `document.querySelector('#hex-board-svg g[data-id]:not([data-id^="crisis-"])') ? 'placed' : ''`,
      8000,
      "placed"
    );
  }
  const info = await cdp.eval(
    `(async () => {
      const card = document.querySelector('#hex-idea-cards [data-id]');
      const slot = document.querySelector('#hex-board-svg .hex-slot[data-q="${q}"][data-r="${r}"]');
      if (!card || !slot) return 'missing';
      const cr = card.getBoundingClientRect();
      const sr = slot.getBoundingClientRect();
      const sx = cr.left + cr.width/2, sy = cr.top + Math.min(36, cr.height/3);
      const tx = sr.left + sr.width/2, ty = sr.top + sr.height/2;
      const fire = (target, type, x, y, buttons) => {
        target.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, view: window,
          clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse',
          buttons, button: 0, isPrimary: true
        }));
      };
      fire(card, 'pointerdown', sx, sy, 1);
      const n = 16;
      for (let i = 1; i <= n; i++) {
        const t = i/n;
        fire(window, 'pointermove', sx + (tx-sx)*t, sy + (ty-sy)*t, 1);
        await new Promise(r => setTimeout(r, 40));
      }
      fire(window, 'pointerup', tx, ty, 0);
      return 'dragged';
    })()`,
    true,
    20000
  );
  log("place", q, r, info);
  await sleep(700);
  return info;
}

async function openCoinventor(cdp) {
  await clickSel(cdp, 'button.side-tab[data-tab="coinventor"]', { after: 400 });
}

async function openVision(cdp) {
  await clickSel(cdp, 'button.side-tab[data-tab="vision"]', { after: 300 });
}

async function waitWorkshop(cdp) {
  return waitFor(
    cdp,
    `document.querySelector('#screen-workshop')?.classList.contains('active') ? 'workshop' : ''`,
    25000,
    "workshop"
  );
}

async function setupGeneOnStack(cdp) {
  await dismissPop(cdp);
  await focusTech(cdp, "gene-sequencing");
  const existing = await cdp.eval(
    `document.querySelector('#hex-board-svg g[data-id]:not([data-id^="crisis-"])') ? 'yes' : ''`
  );
  if (existing) return;
  await mintCustom(cdp, GENE_HOW);
  await placeCard(cdp, 2, 2);
  await waitFor(
    cdp,
    `document.querySelector('#hex-board-svg g[data-id]:not([data-id^="crisis-"])') ? 'stack' : ''`,
    10000,
    "gene-on-board"
  );
}

function pointAt(cdp, selector, ms = 1400) {
  return (async () => {
    const box = await boxOf(cdp, selector);
    if (box) {
      await moveCursor(cdp, box.x, box.y);
      await sleep(ms);
    } else {
      await sleep(ms);
    }
  })();
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  fs.mkdirSync(PACK, { recursive: true });
  const pack = loadOnTheCurvePackSync(ROOT, fs, path);
  const byId = Object.fromEntries(pack.shots.map((s) => [s.id, s]));
  const server = await startServer();
  const chrome = await startChrome();
  let cdp;
  try {
    const conn = await connectPage();
    cdp = conn.cdp;
    await injectChrome(cdp);
    await waitWorkshop(cdp);
    await sleep(1500);
    await injectChrome(cdp);

    // 17 — briefing walk (job, place, strain)
    await recordClip(cdp, byId["17-spotlight-quest"], async () => {
      await openVision(cdp);
      await pointAt(cdp, ".quest-briefing-overlay, #ws-mission-scene, .quest-briefing-body", 1800);
      await clickSel(cdp, '[data-brief="next"]', { after: 1600, timeout: 4000 });
      await pointAt(cdp, ".quest-briefing-body", 1600);
      await clickSel(cdp, '[data-brief="next"]', { after: 1600, timeout: 4000 });
      await pointAt(cdp, ".quest-briefing-body, .quest-briefing-title", 1800);
      await clickSel(cdp, '[data-brief="next"], [data-brief="full"]', { after: 1200, timeout: 3000 });
    });

    await cdp.eval(`(() => {
      document.querySelector('[data-brief="full"]')?.click();
      document.querySelector('.quest-briefing-full')?.click();
    })()`);
    await sleep(400);
    await cdp.eval(BOOT_JS);
    await setupGeneOnStack(cdp);
    await sleep(600);

    // 1 Look Ahead
    await recordClip(cdp, byId["01-look-ahead"], async () => {
      await openWait(cdp);
      await pointAt(cdp, "#wait-confirm-title", 900);
      await pointAt(cdp, ".wait-trends-heading, #wait-trend-charts", 1600);
      await pointAt(cdp, ".wait-trend-canvas, canvas.wait-trend-canvas", 2200);
      await pointAt(cdp, "#wait-confirm-ok", 2200);
    });

    // 2 chip
    await recordClip(cdp, byId["02-the-chip"], async () => {
      await openWait(cdp);
      await pointAt(cdp, ".wait-trend-chip", 4000);
      await pointAt(cdp, ".wait-trend-name", 1600);
      await pointAt(cdp, ".wait-trend-chip", 2500);
    });

    // 3 reached vs predicted
    await recordClip(cdp, byId["03-reached-predicted"], async () => {
      await openWait(cdp);
      await pointAt(cdp, ".wait-trend-ms-reached, li.wait-trend-ms-reached", 3500);
      await pointAt(cdp, ".wait-trend-ms-predicted, li.wait-trend-ms-predicted", 3500);
    });

    // 4 quest chart / Spotlight
    await recordClip(cdp, byId["04-quest-chart"], async () => {
      await openWait(cdp);
      await pointAt(cdp, ".wait-trend-spotlight, .wait-trend-card.is-spotlight", 4000);
      await pointAt(cdp, "canvas.wait-trend-canvas", 2500);
    });

    await closeWait(cdp);

    // 6 always pickable
    await recordClip(cdp, byId["06-always-pickable"], async () => {
      await cdp.eval(`document.querySelector('#tech-group-all') && (document.querySelector('#tech-group-all').open = true)`);
      await pointAt(cdp, "#tech-group-all summary, .tech-group-summary", 1800);
      await focusTech(cdp, "alt-proteins");
      await pointAt(cdp, '[data-tech-focus="alt-proteins"]', 1800);
      await focusTech(cdp, "gene-sequencing");
      await openWait(cdp);
      await pointAt(cdp, ".wait-implications-pane, #wait-confirm-body", 2800);
    });
    await closeWait(cdp);
    await focusTech(cdp, "gene-sequencing");

    // 7 world clock
    await recordClip(cdp, byId["07-world-clock"], async () => {
      await pointAt(cdp, "#hud-year", 1200);
      await clickSel(cdp, "#hud-year", { after: 800 });
      await pointAt(cdp, "#year-bulletin-kicker, #year-bulletin-title", 2800);
      await pointAt(cdp, "#year-bulletin-title", 1800);
      await pointAt(cdp, "#year-bulletin-body, .year-bulletin-list", 2000);
    });
    await dismissPop(cdp);

    // 16 Learn
    await recordClip(cdp, byId["16-learn"], async () => {
      await focusTech(cdp, "gene-sequencing");
      await pointAt(cdp, "#btn-learn-tech", 900);
      await clickSel(cdp, "#btn-learn-tech", { after: 700 });
      await pointAt(cdp, ".learn-sec[data-learn-sec='family'], #modal-body", 1600);
      await cdp.eval(`document.querySelector('#modal-body')?.scrollBy({ top: 220, behavior: 'smooth' })`);
      await sleep(900);
      await pointAt(cdp, ".learn-sec[data-learn-sec='now']", 1800);
      await cdp.eval(`document.querySelector('#modal-body')?.scrollBy({ top: 260, behavior: 'smooth' })`);
      await sleep(900);
      await pointAt(cdp, ".learn-sec[data-learn-sec='curve']", 2200);
    });
    await cdp.eval(`document.querySelector('#modal-backdrop')?.classList.remove('open')`);

    // 15 Ask for ideas
    await focusTech(cdp, "gene-sequencing");
    const ideasReady = await cdp.eval(
      `document.querySelectorAll('#hex-idea-cards [data-id]').length >= 3 ? 'yes' : ''`
    );
    if (!ideasReady) {
      await clickSel(cdp, "#btn-ask-ideas", { after: 400 });
      await waitFor(
        cdp,
        `document.querySelectorAll('#hex-idea-cards [data-id]').length >= 3 ? 'ideas' : ''`,
        90000,
        "ideas"
      );
    }
    await recordClip(cdp, byId["15-ask-for-ideas"], async () => {
      await pointAt(cdp, "#btn-ask-ideas", 1000);
      await pointAt(cdp, "#hex-idea-cards", 2500);
      await cdp.eval(`document.querySelector('#hex-idea-cards [data-id]')?.scrollIntoView({block:'center'})`);
      await pointAt(cdp, "#hex-idea-cards [data-id]", 2500);
      await clickSel(cdp, "#hex-idea-cards [data-id]", { after: 1200, timeout: 3000 });
    });

    // 8 honesty bar — mint/place already done; open tile
    await recordClip(cdp, byId["08-honesty-bar"], async () => {
      await cdp.eval(`(() => {
        const g = document.querySelector('#hex-board-svg g[data-id]:not([data-id^="crisis-"])');
        if (!g) return;
        const r = g.getBoundingClientRect();
        g.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:r.left+r.width/2, clientY:r.top+r.height/2, pointerId:1, pointerType:'mouse', isPrimary:true }));
        g.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      })()`);
      await sleep(800);
      await pointAt(cdp, "#hex-board-svg g[data-id] rect, #hex-tile-popup", 2500);
      await pointAt(cdp, "#hex-tile-popup-title, #hex-tile-popup-body", 3500);
    });
    await cdp.eval(`document.querySelector('#hex-tile-popup') && (document.querySelector('#hex-tile-popup').hidden = true)`);

    // 9 Timing check
    await openCoinventor(cdp);
    await recordClip(cdp, byId["09-timing-check"], async () => {
      await pointAt(cdp, 'button.co-chip[data-mode="push-further"]', 1000);
      await clickSel(cdp, 'button.co-chip[data-mode="push-further"]', { after: 600 });
      await waitFor(
        cdp,
        `document.querySelector('#co-log .co-msg, #co-thread, .co-bubble') ? 'reply' : (document.querySelector('.ai-pending:not([hidden])') ? '' : 'idle')`,
        25000,
        "timing-reply"
      );
      await pointAt(cdp, "#co-log, #co-thread, .co-msg", 4000);
    });

    // 14 Art of the possible
    await recordClip(cdp, byId["14-art-of-the-possible"], async () => {
      await openCoinventor(cdp);
      await pointAt(cdp, 'button.co-chip[data-mode="art-of-the-possible"]', 1000);
      await clickSel(cdp, 'button.co-chip[data-mode="art-of-the-possible"]', { after: 600 });
      await waitFor(
        cdp,
        `document.querySelector('#co-log')?.innerText?.length > 80 ? 'art' : ''`,
        25000,
        "art-reply"
      );
      await cdp.eval(`document.querySelector('#co-log, #co-thread')?.scrollBy?.({ top: 120, behavior:'smooth' })`);
      await sleep(1200);
      await pointAt(cdp, "#co-log, #co-thread", 4000);
    });

    // 10 Convergence — second matching-world (bits) tile: AI
    await focusTech(cdp, "ai");
    await mintCustom(cdp, AI_HOW);
    await recordClip(cdp, byId["10-convergence"], async () => {
      await placeCard(cdp, 3, 2);
      await waitFor(
        cdp,
        `document.querySelector('#hex-convergence-dialog:not([hidden])') ? document.querySelector('#hex-convergence-title')?.textContent : ''`,
        20000,
        "convergence"
      );
      await pointAt(cdp, "#hex-convergence-title", 1800);
      await pointAt(cdp, "#hex-convergence-reason", 3500);
    });
    await sleep(400);

    // 11 pathway
    await recordClip(cdp, byId["11-pathway"], async () => {
      await dismissPop(cdp);
      await pointAt(cdp, "#hex-board-svg", 1600);
      await pointAt(cdp, "#feasibility", 2200);
      await pointAt(cdp, "#feasibility-dims", 2500);
      await pointAt(cdp, "#hex-score-chips, #feasibility-summary", 2000);
    });

    // 12 combined honesty
    await recordClip(cdp, byId["12-combined-honesty"], async () => {
      await pointAt(cdp, "#feasibility-dims", 2000);
      const timing = await boxOf(cdp, "#feasibility-dims li:last-child, #feasibility-dims");
      if (timing) await moveCursor(cdp, timing.x, timing.y);
      await sleep(2500);
      await pointAt(cdp, "#btn-mint-rd", 1800);
      await pointAt(cdp, "#feasibility-level-label, #feasibility-summary", 2000);
    });

    // 13 traffic lights
    await recordClip(cdp, byId["13-traffic-lights"], async () => {
      await cdp.eval(`(() => {
        const g = document.querySelector('#hex-board-svg g[data-id^="crisis-"]');
        if (!g) return;
        const r = g.getBoundingClientRect();
        g.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX: r.left+r.width/2, clientY: r.top+r.height/2 }));
      })()`);
      await sleep(900);
      await pointAt(cdp, '#hex-board-svg g[data-id^="crisis-"]', 2200);
      await pointAt(cdp, "#hex-tile-popup-body, #feasibility", 2200);
      await clickSel(cdp, "#hex-tile-popup-lift", { after: 1200, timeout: 4000 });
      await pointAt(cdp, '#hex-board-svg g[data-id^="crisis-"]', 2200);
    });
    await cdp.eval(`document.querySelector('#hex-tile-popup') && (document.querySelector('#hex-tile-popup').hidden = true)`);

    // 5 Wait vs End turn
    await dismissPop(cdp);
    await closeWait(cdp);
    await recordClip(cdp, byId["05-wait-vs-end-turn"], async () => {
      await pointAt(cdp, "#hud-year", 900);
      await pointAt(cdp, "#hud-pressure", 1200);
      await clickSel(cdp, "#btn-end-turn", { after: 1400, timeout: 4000 });
      await dismissPop(cdp);
      await pointAt(cdp, "#hud-year", 1000);
      await pointAt(cdp, "#hud-pressure", 1000);
      await openWait(cdp);
      await pointAt(cdp, "#wait-confirm-ok", 1200);
      await clickSel(cdp, "#wait-confirm-ok", { after: 1600 });
      await pointAt(cdp, "#hud-pressure", 2200);
    });
    await dismissPop(cdp);

    // Drive to outcome: extra Waits until collapse/outcome
    for (let i = 0; i < 4; i++) {
      const outcome = await cdp.eval(
        `document.querySelector('#screen-outcome')?.classList.contains('active') ? 'outcome' : ''`
      );
      if (outcome) break;
      await closeWait(cdp);
      await dismissPop(cdp);
      const opened = await clickSel(cdp, "#btn-wait", { after: 500, timeout: 3000 });
      if (opened) await clickSel(cdp, "#wait-confirm-ok", { after: 800, timeout: 4000 });
      await sleep(900);
      await dismissPop(cdp);
    }
    await waitFor(
      cdp,
      `document.querySelector('#screen-outcome')?.classList.contains('active') ? 'outcome' : ''`,
      12000,
      "outcome"
    );

    await recordClip(cdp, byId["18-foresight"], async () => {
      await cdp.eval(`document.querySelector('#outcome-foresight')?.scrollIntoView({block:'center', behavior:'smooth'})`);
      await sleep(800);
      await pointAt(cdp, "#outcome-foresight", 3500);
      await cdp.eval(`document.querySelector('#outcome-techs')?.scrollIntoView({block:'center', behavior:'smooth'})`);
      await sleep(700);
      await pointAt(cdp, "#outcome-techs", 3500);
    });

    log("recorded all clips");
  } finally {
    try {
      chrome.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    try {
      server.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

async function failIdeaImages(cdp) {
  await cdp.eval(`(() => {
    if (window.__ffSkipIdeaImage) return 'exists';
    window.__ffSkipIdeaImage = true;
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = String(typeof input === 'string' ? input : input && input.url || '');
      if (url.includes('idea-image')) {
        return Promise.reject(new Error('skip-idea-image'));
      }
      return orig(input, init);
    };
    return 'patched';
  })()`);
}

async function collapseBoard(cdp) {
  const expanded = await cdp.eval(
    `document.querySelector('#btn-hex-board-expand')?.getAttribute('aria-pressed') === 'true'`
  );
  if (expanded) await clickSel(cdp, "#btn-hex-board-expand", { after: 400 });
}

async function clickInventHex(cdp) {
  return cdp.eval(`(() => {
    const g = [...document.querySelectorAll('#hex-board-svg g[data-id]')].find((el) => {
      const id = el.dataset.id || '';
      return id && !id.startsWith('crisis-') && !id.startsWith('concern-') && !id.startsWith('rd-');
    });
    if (!g) return '';
    g.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = g.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    g.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }));
    g.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    g.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    return g.dataset.id;
  })()`);
}

async function retakeMain() {
  fs.mkdirSync(RAW, { recursive: true });
  const pack = loadOnTheCurvePackSync(ROOT, fs, path);
  const byId = Object.fromEntries(pack.shots.map((s) => [s.id, s]));
  const server = await startServer();
  const chrome = await startChrome();
  try {
    const { cdp } = await connectPage();
    await failIdeaImages(cdp);
    await injectChrome(cdp);
    await waitWorkshop(cdp);
    await sleep(800);
    await cdp.eval(`document.querySelector('[data-brief="full"]')?.click()`);
    await sleep(400);
    await cdp.eval(BOOT_JS);
    await collapseBoard(cdp);
    await setupGeneOnStack(cdp);
    await sleep(500);

    // 08 honesty bar
    await recordClip(cdp, byId["08-honesty-bar"], async () => {
      const id = await clickInventHex(cdp);
      log("hex", id);
      await sleep(700);
      await pointAt(cdp, "#hex-board-svg g[data-id] rect", 2500);
      await pointAt(cdp, "#hex-tile-popup-title, #hex-tile-popup-body", 4000);
    });
    await cdp.eval(`document.querySelector('#hex-tile-popup') && (document.querySelector('#hex-tile-popup').hidden = true)`);

    // Place a second bits tile (AI) for convergence / pathway
    await focusTech(cdp, "ai");
    const minted = await mintCustom(cdp, AI_HOW);
    log("ai mint", minted);
    if (!minted) {
      await cdp.eval(`document.querySelector('#hex-idea-cards [data-id]')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
      await sleep(800);
    }

    await recordClip(cdp, byId["10-convergence"], async () => {
      await placeCard(cdp, 3, 2);
      await waitFor(
        cdp,
        `document.querySelector('#hex-convergence-dialog:not([hidden])') ? document.querySelector('#hex-convergence-title')?.textContent : ''`,
        18000,
        "convergence"
      );
      await pointAt(cdp, "#hex-convergence-title", 2000);
      await pointAt(cdp, "#hex-convergence-reason, #hex-convergence-meta", 4000);
    });
    await sleep(400);

    await recordClip(cdp, byId["11-pathway"], async () => {
      await dismissPop(cdp);
      await cdp.eval(`document.querySelector('#feasibility')?.scrollIntoView({block:'center'})`);
      await pointAt(cdp, "#hex-board-svg", 1500);
      await pointAt(cdp, "#feasibility", 2000);
      await pointAt(cdp, "#feasibility-dims", 2500);
      await pointAt(cdp, "#hex-score-chips, #feasibility-summary", 2500);
    });

    await recordClip(cdp, byId["12-combined-honesty"], async () => {
      await cdp.eval(`document.querySelector('#feasibility')?.scrollIntoView({block:'center'})`);
      await pointAt(cdp, "#feasibility-dims", 3000);
      await pointAt(cdp, "#feasibility-level-label", 2000);
      await pointAt(cdp, "#btn-mint-rd", 1800);
      await pointAt(cdp, "#feasibility-summary, #feasibility-foot", 2000);
    });

    await recordClip(cdp, byId["13-traffic-lights"], async () => {
      await cdp.eval(`(() => {
        const g = document.querySelector('#hex-board-svg g[data-id^="crisis-"]');
        if (!g) return;
        g.scrollIntoView({block:'center'});
        const r = g.getBoundingClientRect();
        g.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX: r.left+r.width/2, clientY: r.top+r.height/2 }));
      })()`);
      await sleep(800);
      await pointAt(cdp, '#hex-board-svg g[data-id^="crisis-"]', 2500);
      await pointAt(cdp, "#hex-tile-popup-body, #feasibility", 2500);
      await clickSel(cdp, "#hex-tile-popup-lift", { after: 1400, timeout: 4000 });
      await pointAt(cdp, '#hex-board-svg g[data-id^="crisis-"]', 2200);
    });
    await cdp.eval(`document.querySelector('#hex-tile-popup') && (document.querySelector('#hex-tile-popup').hidden = true)`);

    await openCoinventor(cdp);
    await recordClip(cdp, byId["14-art-of-the-possible"], async () => {
      await pointAt(cdp, 'button.co-chip[data-mode="art-of-the-possible"]', 900);
      await clickSel(cdp, 'button.co-chip[data-mode="art-of-the-possible"]', { after: 500 });
      await waitFor(
        cdp,
        `document.querySelector('.ai-pending:not([hidden]), .co-pending') ? '' : (document.querySelector('#co-log')?.innerText?.match(/now|near|frontier|milestone|unlock/i) ? 'art' : '')`,
        45000,
        "art-reply"
      );
      await cdp.eval(`document.querySelector('#co-log, #co-thread')?.parentElement?.scrollBy?.({ top: 160, behavior:'smooth' })`);
      await sleep(1000);
      await pointAt(cdp, "#co-log, .co-msg", 5000);
    });

    await dismissPop(cdp);
    await closeWait(cdp);
    await collapseBoard(cdp);
    await recordClip(cdp, byId["05-wait-vs-end-turn"], async () => {
      const swat = async () => {
        for (let i = 0; i < 40; i++) {
          await cdp.eval(`document.querySelector('#market-news-ok')?.click(); document.querySelector('#year-bulletin-ok')?.click();`);
          await sleep(250);
        }
      };
      const swatP = swat();
      await pointAt(cdp, "#hud-year", 800);
      await pointAt(cdp, "#hud-pressure", 800);
      await pointAt(cdp, "#btn-end-turn", 800);
      await clickSel(cdp, "#btn-end-turn", { after: 500, timeout: 4000 });
      await sleep(300);
      await pointAt(cdp, "#hud-year", 700);
      await pointAt(cdp, "#hud-pressure", 700);
      await openWait(cdp);
      await pointAt(cdp, "#wait-confirm-ok", 900);
      await clickSel(cdp, "#wait-confirm-ok", { after: 600 });
      await sleep(400);
      await pointAt(cdp, "#hud-pressure", 2000);
      await pointAt(cdp, "#hud-year", 1200);
      await swatP;
    });
    await dismissPop(cdp);

    for (let i = 0; i < 5; i++) {
      const outcome = await cdp.eval(
        `document.querySelector('#screen-outcome')?.classList.contains('active') ? 'outcome' : ''`
      );
      if (outcome) break;
      await dismissPop(cdp);
      await closeWait(cdp);
      await clickSel(cdp, "#btn-wait", { after: 400, timeout: 2500 });
      await clickSel(cdp, "#wait-confirm-ok", { after: 700, timeout: 3000 });
      await sleep(600);
      await dismissPop(cdp);
    }
    await waitFor(
      cdp,
      `document.querySelector('#screen-outcome')?.classList.contains('active') ? 'outcome' : ''`,
      15000,
      "outcome"
    );
    await dismissPop(cdp);
    await sleep(400);
    await recordClip(cdp, byId["18-foresight"], async () => {
      await dismissPop(cdp);
      await cdp.eval(`document.querySelector('#outcome-foresight')?.scrollIntoView({block:'center', behavior:'smooth'})`);
      await sleep(700);
      await pointAt(cdp, "#outcome-foresight", 4000);
      await cdp.eval(`document.querySelector('#outcome-techs')?.scrollIntoView({block:'center', behavior:'smooth'})`);
      await sleep(600);
      await pointAt(cdp, "#outcome-techs", 4000);
    });
    log("retake done");
  } finally {
    try { chrome.kill("SIGTERM"); } catch { /* ignore */ }
    try { server.kill("SIGTERM"); } catch { /* ignore */ }
  }
}

const entry = process.env.FF_RETAKE ? retakeMain : main;
entry().catch((e) => {
  console.error(e);
  process.exit(1);
});
