/**
 * Headless regression: copy ID, paste, portal lookup, preview, errors and gates.
 * Uses an in-memory object reader and a fixture portal; never a live bucket.
 * Usage: node scripts/check-quest-id.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";
import { catalogFromObjectReader } from "../js/server/quest-object-storage.mjs";
import { catalogCard } from "../js/server/cloud-gate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ff-quest-id-"));
const raw = fs.readFileSync(path.join(ROOT, "quests/spotlight-gene-seq.json"), "utf8");
const id = JSON.parse(raw).id;
const objects = { "catalog.json": JSON.stringify({ quests: [{ id, file: `${id}.json` }] }), [`${id}.json`]: raw };
const catalog = await catalogFromObjectReader(async (key) => objects[key]);
assert.equal(catalog.ok, true);
assert.equal(catalog.quests.length, 1);
const tile = catalog.quests[0];
// Explicit test-only sponsor and module records exercise catalog partitioning.
tile.mission.sponsorName = "Test sponsor";
const wrapper = { id: "mixed-sponsor-module", kind: "module", source: "remote", title: "Mixed sponsorship", module: "Mixed sponsorship", lessons: ["module-lesson"], isLearningModule: true };
const lesson = { ...tile, id: "module-lesson", isLearningModule: true, mission: { ...tile.mission, id: "module-lesson", isLearningModule: true, module: wrapper.module, lesson: 1, totalLessons: 1 } };
const tiles = [tile, wrapper, lesson];
const requests = [];
const children = [];
const listen = async (server) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
};
const freePort = async () => {
  const probe = http.createServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
};
const portal = http.createServer((req, res) => {
  requests.push(req.url);
  let status = 200;
  let data;
  if (req.url === "/api/quests") {
    data = { ok: true, remoteOk: true, remote: tiles, quests: tiles };
  } else if (req.url === `/api/quests/${id}`) {
    data = { ok: true, tile };
  } else if (req.url === `/api/quests/${wrapper.id}`) {
    data = { ok: true, tile: wrapper };
  } else if (req.url === "/api/quests/not-listed-quest") {
    data = { ok: true, tile: { ...tile, id: "not-listed-quest", mission: { ...tile.mission, id: "not-listed-quest" } } };
  } else if (req.url === "/api/quests/sign-in-quest" || req.url === "/api/quests/paid-quest") {
    status = req.url.includes("sign-in") ? 401 : 402;
    const card = catalogCard({ ...tile, id: status === 401 ? "sign-in-quest" : "paid-quest", access: status === 401 ? "account" : "paid" });
    data = {
      ok: false,
      error: status === 402 ? "content_required" : "sign_in_required",
      tile: card,
      subscribeUrl: "https://portal.example/subscribe",
    };
  } else if (req.url === "/api/quests/broken-quest") {
    status = 503;
    data = { ok: false, error: "quests_unavailable" };
  } else {
    status = 404;
    data = { ok: false, error: "not_found" };
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
});
let ws;
try {
  const portalPort = await listen(portal);
  const gamePort = await freePort();
  const cdpPort = await freePort();
  const base = `http://127.0.0.1:${gamePort}`;
  fs.mkdirSync(path.join(scratch, "library"));
  const game = spawn(process.execPath, ["server.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      FF_PORT: String(gamePort), FF_HOST: "127.0.0.1",
      FF_PORTAL_URL: `http://127.0.0.1:${portalPort}`,
      FF_QUESTS_DIR: path.join(scratch, "library"), FF_TRENDS_REMOTE_URL: "off",
      FF_API_SECRET: " ", FF_CLOUD_AI: "0", FF_ENABLE_ROOMS: "0",
      FF_TTS_CACHE_DIR: path.join(scratch, "tts"), FF_USAGE_ENABLED: "0",
    },
    stdio: "ignore",
  });
  children.push(game);
  const chrome = spawn("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${path.join(scratch, "chrome")}`,
    "about:blank",
  ], { stdio: "ignore" });
  children.push(chrome);
  async function until(fn, label) {
    for (let i = 0; i < 100; i++) {
      try { const value = await fn(); if (value) return value; } catch { /* booting */ }
      await sleep(100);
    }
    throw new Error(`Timed out: ${label}`);
  }
  await until(async () => (await fetch(`${base}/`)).ok, "game startup");
  const version = await until(async () => {
    const v = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then((r) => r.json());
    return v.webSocketDebuggerUrl;
  }, "Chrome startup");
  ws = new WebSocket(version);
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const pending = new Map();
  let next = 1;
  const exceptions = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); }
    if (msg.method === "Runtime.exceptionThrown") exceptions.push(msg.params.exceptionDetails.text);
  });
  async function send(method, params = {}, sessionId) {
    const n = next++;
    const answer = new Promise((resolve) => pending.set(n, resolve));
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    const msg = await answer;
    if (msg.error) throw new Error(JSON.stringify(msg.error));
    return msg.result;
  }
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Browser.grantPermissions", { origin: base, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send("Page.navigate", { url: base }, sessionId);
  await until(() => evaluate("(() => { document.querySelector('#btn-choose-theme')?.click(); return document.querySelector('.screen.active')?.id === 'screen-quest-hub'; })()"), "app init and hub");
  await until(() => requests.includes("/api/quests"), "catalog via portal");
  await evaluate("document.querySelector('[data-hub=\"sponsored\"]').click()");
  await until(() => evaluate("!!document.querySelector('#quest-catalog-grid [data-copy-quest-id]')"), "catalog card");
  assert.equal(await evaluate("document.querySelectorAll('[data-catalog-copy-id], .catalog-copy').length"), 0, "Copy link removed from catalog");
  await evaluate(`document.querySelector('#quest-catalog-grid [data-copy-quest-id="${id}"]').click()`);
  await until(async () => (await evaluate("navigator.clipboard.readText()")) === id, "copied ID");
  assert.equal(await evaluate("document.querySelector('.screen.active').id"), "screen-quest-catalog");
  await evaluate("document.querySelector('#btn-quest-catalog-back').click()");
  async function load(value) {
    await evaluate(`(() => { document.querySelector('#quest-id-input').value = ${JSON.stringify(value)}; document.querySelector('#quest-id-form').requestSubmit(); })()`);
    await until(() => evaluate("!document.querySelector('#btn-load-quest-id').disabled"), `lookup ${value}`);
    return evaluate("document.querySelector('#quest-id-status').textContent");
  }
  assert.match(await load(`  ${id}\n`), /Quest loaded/);
  assert.ok(requests.includes(`/api/quests/${id}`));
  assert.equal(await evaluate("document.querySelector('.screen.active').id"), "screen-quest-hub");
  assert.equal(await evaluate("document.querySelector('#quest-id-preview h3').textContent"), tile.title);
  assert.equal(await evaluate("document.querySelectorAll('#quest-id-preview [data-catalog-copy-id], #quest-id-preview .catalog-copy').length"), 0, "Copy link removed from preview");
  assert.match(await evaluate("document.querySelector('#quest-id-preview .cta').textContent"), /Play/);
  const copied = await evaluate("navigator.clipboard.readText()");
  assert.equal(copied, id);
  assert.match(await load("not-listed-quest"), /Quest loaded/);
  assert.ok(requests.includes("/api/quests/not-listed-quest"));
  assert.match(await load(wrapper.id), /Module loaded/);
  await evaluate("document.querySelector('#quest-id-preview .quest-module-card').click()");
  assert.equal(await evaluate("document.querySelector('.screen.active').id"), "screen-quest-catalog");
  assert.equal(await evaluate("document.querySelector('#quest-catalog-title').textContent"), wrapper.module);
  assert.equal(await evaluate("document.querySelector('#catalog-module-lessons [data-catalog-id]').dataset.catalogId"), lesson.id);
  await evaluate("document.querySelector('#btn-quest-catalog-back').click(); document.querySelector('#btn-quest-catalog-back').click()");
  const beforeInvalid = requests.length;
  assert.match(await load("https://example.com/?q=x"), /valid Quest ID/);
  assert.equal(requests.length, beforeInvalid);
  assert.equal(await evaluate("document.querySelector('#quest-id-preview').hidden"), true);
  assert.match(await load("no-such-quest"), /Quest not found/);
  assert.match(await load("broken-quest"), /Could not reach/);
  assert.match(await load("sign-in-quest"), /Sign in/);
  assert.equal(await evaluate("document.querySelector('#quest-id-preview').hidden"), false);
  assert.match(await load("paid-quest"), /paid content/);
  assert.equal(await evaluate("document.querySelector('.screen.active').id"), "screen-quest-hub");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "mobile overflow");
  assert.deepEqual(exceptions, []);
  console.log("PASS: clipboard ID, exact portal lookup, pre-launch preview, invalid/missing/service errors, 401/402 cards, module sponsorship navigation, mobile layout; no gameplay auto-start.");
} finally {
  ws?.close();
  for (const child of children) {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await new Promise((resolve) => portal.close(resolve));
  fs.rmSync(scratch, { recursive: true, force: true });
}
