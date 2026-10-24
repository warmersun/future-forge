import { it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { packageRevision } from "../package-identity.js";
import { packageObjectKey } from "./package-paths.mjs";
import { mintGameSessionToken } from "./game-session.mjs";
import { createQuestRequestAuthority, createPortalQuestRequestAuthority, createRoomQuestRequestAuthority } from "./quest-request-authority.mjs";
const ref = { packageId: "dock", questId: "dock", revision: `sha256:${"ab".repeat(32)}` };
const newer = { ...ref, revision: `sha256:${"cd".repeat(32)}` };
const runId = "11111111-1111-4111-8111-111111111111";
const identity = { enabled: true, signedIn: true, userId: "user_owner" };
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

function httpRelease(label) {
  const tile = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/quests/companion-moonshots-304.json")));
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/predictions/companion-dock-test.json")));
  tile.id = "dock";
  tile.mission.id = "dock";
  tile.access = "open";
  tile.predictionBankId = bank.id;
  tile.grounding = tile.mission.grounding = `AUTHORED ${label}`;
  bank.predictions[0].headline = `Synthetic calendar ${label}`;
  const members = { "quests/dock.json": JSON.stringify(tile), [`predictions/${bank.id}.json`]: JSON.stringify(bank) };
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const files = Object.fromEntries(Object.entries(members).map(([name, bytes]) => [name, `sha256:${hash(bytes)}`]));
  const schema = "future-forge.quest-package/v2";
  const revision = packageRevision(schema, "dock", Object.entries(files).map(([path, digest]) => ({ path, digest })), hash);
  const ref = { packageId: "dock", revision, questId: "dock" };
  const manifest = { schema, version: 2, id: "dock", revision, files,
    quests: [{ id: "dock", kind: "quest", file: "quests/dock.json", predictionBankId: bank.id }],
    predictions: [{ id: bank.id, file: `predictions/${bank.id}.json` }] };
  const objects = Object.fromEntries(Object.entries({ ...members, "manifest.json": JSON.stringify(manifest) })
    .map(([name, bytes]) => [packageObjectKey("", ref, name), bytes]));
  return { ref, objects, bankId: bank.id };
}

async function spawnOfflineServer(entry, work, extra = {}, imports = []) {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, [...imports.flatMap((file) => ["--import", file]), entry, "--developer"], {
    cwd: ROOT, env: { PATH: process.env.PATH, HOME: work, TMPDIR: os.tmpdir(),
      FF_SKIP_GAME_ENV_FILE: "1", FF_SKIP_PORTAL_ENV_FILE: "1",
      FF_PORT: String(port), FF_HOST: "127.0.0.1", FF_QUESTS_DIR: path.join(work, "quests"),
      FF_QUESTS_REMOTE_URL: "off", FF_TRENDS_REMOTE_URL: "off", FF_USAGE_ENABLED: "0",
      FF_GROK_HOME: path.join(work, "grok"), FF_TTS_CACHE_DIR: path.join(work, "tts"), ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ended = once(child, "exit");
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output = (output + chunk).slice(-8000); });
  const origin = `http://127.0.0.1:${port}`;
  const close = async () => {
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 2000);
    force.unref();
    await ended;
    clearTimeout(force);
  };
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) assert.fail(output);
      try { if ((await fetch(`${origin}/api/health`)).ok) return { origin, close }; } catch { /* startup */ }
      await delay(30);
    }
    assert.fail(output);
  } catch (error) { await close(); throw error; }
}
it("real legacy portal delivers immutable hosted worlds and game model routes enforce its async authority", { timeout: 30_000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "ff-authority-http-"));
  const old = httpRelease("old");
  const latest = httpRelease("latest");
  const catalog = { quests: [{ id: "dock", title: "Synthetic dock", source: "remote", access: "open", packageRef: latest.ref }] };
  const objects = { ...old.objects, ...latest.objects, "catalog.json": JSON.stringify(catalog) };
  const objectFile = path.join(work, "objects.json");
  fs.writeFileSync(objectFile, JSON.stringify(objects));
  const preload = path.join(work, "offline-fetch.mjs");
  // All external reads are fixture bytes; an unexpected external request fails, never hits a network.
  fs.writeFileSync(preload, `import fs from "node:fs";
    globalThis.fetch = async (raw, opts = {}) => {
      const url = new URL(String(raw));
      if (url.origin !== "https://authority-fixture.example") throw Error("Unexpected external request");
      const objects = JSON.parse(fs.readFileSync(${JSON.stringify(objectFile)}, "utf8"));
      const key = decodeURIComponent(url.pathname.slice("/quests/".length));
      return Object.hasOwn(objects, key) ? new Response(objects[key], { headers: { "Content-Type": "application/json" } })
        : new Response("missing", { status: 404 });
    };`);
  let portal;
  let game;
  try {
    portal = await spawnOfflineServer("portal/server.mjs", work, {
      FF_QUESTS_REMOTE_URL: "https://authority-fixture.example/quests/catalog.json",
      CLERK_PUBLISHABLE_KEY: "pk_test_b2ZmbGluZS5leGFtcGxlJA",
      CLERK_SECRET_KEY: "offline-test-secret-not-a-credential",
    }, [preload]);
    const listing = await (await fetch(`${portal.origin}/api/quests`)).json();
    assert.equal(listing.ok, true, JSON.stringify(listing));
    assert.equal(listing.quests.length, 1);
    assert.equal(JSON.stringify(listing).includes("Synthetic calendar"), false);
    const current = await (await fetch(`${portal.origin}/api/quests/dock`)).json();
    assert.equal(current.ok, true, JSON.stringify(current));
    assert.deepEqual(current.tile.packageRef, latest.ref);
    assert.equal(current.tile.mission.runWorld.bank.id, latest.bankId);
    const previous = await (await fetch(`${portal.origin}/api/quests/dock?revision=${encodeURIComponent(old.ref.revision)}`)).json();
    assert.equal(previous.ok, true, JSON.stringify(previous));
    assert.equal(previous.tile.mission.grounding, "AUTHORED old");
    game = await spawnOfflineServer("server.mjs", work, { FF_PORTAL_URL: portal.origin, FF_PORTAL_QUESTS: "1" });
    const continued = await (await fetch(`${game.origin}/api/quests/dock?revision=${encodeURIComponent(old.ref.revision)}`)).json();
    assert.deepEqual(continued.tile.packageRef, old.ref);
    const roomPost = async (route, body) => (await fetch(`${game.origin}${route}`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    const room = await roomPost("/api/rooms", { displayName: "Host" });
    await roomPost(`/api/rooms/${room.code}/join`, { displayName: "Guest" });
    for (const cmd of ["set_quest", "start_quest"]) {
      const denied = await roomPost(`/api/rooms/${room.code}/host`, { cmd, playerToken: room.playerToken,
        mission: { id: "dock", grounding: "FORGED" } });
      assert.equal(denied.error, "room_package_credentials_unavailable", JSON.stringify(denied));
    }
    const ordinaryMission = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/quests/spotlight-gene-seq.json'))).mission;
    ordinaryMission.id = 'portal-generated-room';
    assert.equal((await roomPost(`/api/rooms/${room.code}/host`, { cmd: 'set_quest', playerToken: room.playerToken,
      mission: ordinaryMission })).ok, true);
    assert.equal((await roomPost(`/api/rooms/${room.code}/host`, { cmd: 'start_quest', playerToken: room.playerToken })).ok, true);
    const post = (origin, route, context, token) => fetch(`${origin}${route}`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ mode: "assess-feasibility", context }),
    });
    const omitted = await post(game.origin, "/api/co-invent", {
      questId: "dock", year: 2026, grounding: "FORGED", inventionHow: "A bounded dawn loading mechanism.",
      availableTechs: [{ id: "ai", name: "AI" }],
    });
    assert.equal(omitted.status, 200, await omitted.clone().text());
    const payload = JSON.stringify((await omitted.json()).llm);
    assert.equal(payload.includes("AUTHORED latest"), true, payload);
    assert.equal(payload.includes("FORGED"), false, payload);
    for (const year of [null, "2026", 2026.5, 2099]) {
      const denied = await post(game.origin, "/api/co-invent", { questId: "dock", year });
      assert.equal(denied.status, 409, await denied.clone().text());
    }
    const noYear = await post(portal.origin, "/api/quests/resolve-context", { questId: "dock" });
    assert.equal((await noYear.json()).context.year, 2026);
    const voice = await post(game.origin, "/api/co-invent-voice/session", { questId: "dock", year: "2026" });
    assert.equal(voice.status, 409, await voice.clone().text());
    const run = await post(game.origin, "/api/co-invent", { questId: "dock", runId });
    assert.equal(run.status, 401, await run.clone().text());
    const signed = mintGameSessionToken({ userId: "user_offline_test" }, { CLERK_SECRET_KEY: "offline-test-secret-not-a-credential" });
    catalog.quests[0].access = "account";
    objects["catalog.json"] = JSON.stringify(catalog);
    fs.writeFileSync(objectFile, JSON.stringify(objects));
    const unsignedAccount = await post(game.origin, "/api/co-invent", { questId: "dock" });
    assert.equal(unsignedAccount.status, 401, await unsignedAccount.clone().text());
    const signedAccount = await post(game.origin, "/api/co-invent", { questId: "dock" }, signed);
    assert.equal(signedAccount.status, 200, await signedAccount.clone().text());
    catalog.quests[0].access = "paid";
    objects["catalog.json"] = JSON.stringify(catalog);
    fs.writeFileSync(objectFile, JSON.stringify(objects));
    const paid = await post(game.origin, "/api/co-invent", { questId: "dock", packageRef: old.ref, entitled: true }, signed);
    assert.equal(paid.status, 402, await paid.clone().text());
    // Current membership changes must deny even after both release caches are warm.
    objects["catalog.json"] = JSON.stringify({ quests: [] });
    fs.writeFileSync(objectFile, JSON.stringify(objects));
    const withdrawn = await post(game.origin, "/api/co-invent", { questId: "dock", packageRef: old.ref });
    assert.equal(withdrawn.status, 404, await withdrawn.clone().text());
  } finally {
    await game?.close();
    await portal?.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
});

it("real local-only room entrypoint infers registered package IDs and replaces lobby/start worlds", { timeout: 15000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "ff-room-authority-"));
  const release = httpRelease("room");
  const packages = path.join(work, "packages");
  const rootKey = packageObjectKey("", release.ref);
  for (const [key, bytes] of Object.entries(release.objects)) {
    const target = path.join(packages, "dock", key.slice(rootKey.length + 1));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  let game;
  try {
    game = await spawnOfflineServer("server.mjs", work, { FF_QUEST_PACKAGES_DIR: packages });
    const post = async (route, body) => (await fetch(`${game.origin}${route}`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    const room = await post("/api/rooms", { displayName: "Host" });
    assert.equal(room.ok, true, JSON.stringify(room));
    const selected = await post(`/api/rooms/${room.code}/host`, { cmd: "set_quest", playerToken: room.playerToken,
      mission: { id: "dock", grounding: "FORGED", runWorld: { bank: { id: "FORGED" } } } });
    assert.equal(selected.ok, true, JSON.stringify(selected));
    assert.deepEqual(selected.snapshot.questMeta.mission.packageRef, release.ref);
    assert.equal(selected.snapshot.questMeta.mission.grounding, "AUTHORED room");
    assert.equal(selected.snapshot.questMeta.mission.runWorld.bank.id, release.bankId);
    await post(`/api/rooms/${room.code}/join`, { displayName: "Guest" });
    const started = await post(`/api/rooms/${room.code}/host`, { cmd: "start_quest", playerToken: room.playerToken });
    assert.equal(started.ok, true, JSON.stringify(started));
    const snapshot = await (await fetch(`${game.origin}/api/rooms/${room.code}/snapshot?token=${encodeURIComponent(room.playerToken)}`)).json();
    assert.equal(JSON.stringify(snapshot).includes("FORGED"), false);
    assert.equal(JSON.stringify(snapshot).includes("Synthetic calendar room"), true);
  } finally { await game?.close(); fs.rmSync(work, { recursive: true, force: true }); }
});

it("synchronous room authority refuses hosted and Promise-only resolution, including omitted refs", () => {
  let reads = 0;
  const hosted = createRoomQuestRequestAuthority({ hostedAuthorityRequired: () => true,
    packageRefForQuest: () => { reads++; return ref; } });
  assert.equal(hosted({ id: "dock" }).code, "package_revision_unavailable");
  assert.equal(hosted({ id: "dock", packageRef: ref }).code, "package_revision_unavailable");
  assert.equal(reads, 0);
  const pending = createRoomQuestRequestAuthority({ packageRefForQuest: () => ref, resolvePackage: async () => ({ ok: true }) });
  assert.equal(pending({ id: "dock" }).code, "package_revision_unavailable");
});

it("remote-configured production rooms preserve ordinary/generated selection and start via real loopback catalog", { timeout: 15000 }, async () => {
  const work = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "ff-room-remote-"));
  const tile = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/quests/spotlight-gene-seq.json')));
  tile.id = tile.mission.id = 'ordinary-room';
  tile.title = tile.mission.title = 'AUTHORED ordinary';
  const mission = tile.mission;
  let unavailable = false;
  const catalog = createServer((req, res) => {
    res.writeHead(unavailable ? 503 : 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(req.url.startsWith('/ordinary.json') ? tile : { quests: [{ id: mission.id, file: 'ordinary.json' }] }));
  });
  catalog.listen(0, "127.0.0.1");
  await once(catalog, "listening");
  let game;
  try {
    game = await spawnOfflineServer("server.mjs", work, { FF_QUESTS_REMOTE_URL: `http://127.0.0.1:${catalog.address().port}/catalog.json` });
    const post = async (route, body) => (await fetch(`${game.origin}${route}`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    for (const selected of [{ ...mission, title: "FORGED", runWorld: { bank: { id: "FORGED" } } }, { ...mission, id: "generated-room", title: "Generated" }]) {
      const room = await post("/api/rooms", { displayName: "Host" });
      const guest = await post(`/api/rooms/${room.code}/join`, { displayName: "Guest" });
      const route = `/api/rooms/${room.code}/host`;
      assert.equal((await post(route, { cmd: "set_quest", playerToken: guest.playerToken, mission: selected })).error, "not_host");
      const result = await post(route, { cmd: "set_quest", playerToken: room.playerToken, mission: selected });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.snapshot.questMeta.mission.title, selected.id === mission.id ? mission.title : "Generated");
      assert.equal(result.snapshot.questMeta.mission.runWorld, undefined);
      assert.equal((await post(route, { cmd: "start_quest", playerToken: room.playerToken })).ok, true);
    }
    unavailable = true;
    const room = await post("/api/rooms", { displayName: "Host" });
    const denied = await post(`/api/rooms/${room.code}/host`, { cmd: "set_quest", playerToken: room.playerToken, mission });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "package_catalog_unavailable");
  } finally { await game?.close(); await new Promise(resolve => catalog.close(resolve)); fs.rmSync(work, { recursive: true, force: true }); }
});

it("production remote rooms infer package refs, clone hosted worlds and recheck access at start", { timeout: 15000 }, async () => {
  const work = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "ff-room-hosted-"));
  const release = httpRelease("remote room");
  const catalog = { quests: [{ id: "dock", title: "Dock", access: "open", packageRef: release.ref }] };
  const objects = { ...release.objects, "catalog.json": JSON.stringify(catalog) };
  const objectFile = path.join(work, "objects.json"), preload = path.join(work, "offline-fetch.mjs");
  fs.writeFileSync(objectFile, JSON.stringify(objects));
  fs.writeFileSync(preload, `import fs from 'node:fs';
    globalThis.fetch = async raw => {
      const url = new URL(String(raw));
      if (url.origin !== 'https://room-fixture.example') throw Error('Unexpected external request');
      const objects = JSON.parse(fs.readFileSync(${JSON.stringify(objectFile)}, 'utf8'));
      const key = decodeURIComponent(url.pathname.slice('/quests/'.length));
      return Object.hasOwn(objects, key) ? new Response(objects[key]) : new Response('missing', { status: 404 });
    };`);
  let game;
  try {
    game = await spawnOfflineServer("server.mjs", work, { FF_QUESTS_REMOTE_URL: "https://room-fixture.example/quests/catalog.json" }, [preload]);
    const post = async (route, body) => (await fetch(`${game.origin}${route}`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    const room = await post("/api/rooms", { displayName: "Host", clerkUserId: "forged", entitled: true });
    await post(`/api/rooms/${room.code}/join`, { displayName: "Guest" });
    const route = `/api/rooms/${room.code}/host`;
    const selected = await post(route, { cmd: "set_quest", playerToken: room.playerToken,
      mission: { id: "dock", grounding: "FORGED", runWorld: { bank: { id: "FORGED" } } } });
    assert.equal(selected.ok, true, JSON.stringify(selected));
    assert.deepEqual(selected.snapshot.questMeta.mission.packageRef, release.ref);
    assert.equal(selected.snapshot.questMeta.mission.grounding, "AUTHORED remote room");
    assert.equal(selected.snapshot.questMeta.mission.runWorld.bank.id, release.bankId);
    catalog.quests[0].access = "account";
    objects['catalog.json'] = JSON.stringify(catalog); fs.writeFileSync(objectFile, JSON.stringify(objects));
    const denied = await post(route, { cmd: "start_quest", playerToken: room.playerToken, entitled: true, clerkUserId: "forged" });
    assert.equal(denied.error, "sign_in_required", JSON.stringify(denied));
    catalog.quests[0].access = "open";
    objects['catalog.json'] = JSON.stringify(catalog); fs.writeFileSync(objectFile, JSON.stringify(objects));
    const socket = new WebSocket(`${game.origin.replace('http:', 'ws:')}/ws/rooms`);
    const receive = (type) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.off('message', onMessage); reject(Error(`Timed out: ${type}`)); }, 5000);
      const onMessage = raw => { const msg = JSON.parse(String(raw)); if (msg.type === type || msg.type === 'reject') {
        clearTimeout(timer); socket.off('message', onMessage); resolve(msg);
      } };
      socket.on('message', onMessage);
    });
    try {
      await once(socket, 'open');
      let received = receive('hello'); socket.send(JSON.stringify({ type: 'auth', token: room.playerToken }));
      assert.equal((await received).type, 'hello');
      received = receive('host_ok'); socket.send(JSON.stringify({ type: 'host', cmd: 'start_quest' }));
      const started = await received;
      assert.equal(started.ok, true, JSON.stringify(started));
      received = receive('ai_result'); socket.send(JSON.stringify({ type: 'request_ai', payload: {
        mode: 'assess-feasibility', tutor: true, clientActionId: 'remote-room-ai',
        context: { grounding: 'FORGED', predictionsBank: { id: 'FORGED' }, entitled: true },
      } }));
      const result = await received;
      assert.equal(result.ok, true, JSON.stringify(result));
    } finally { socket.terminate(); }
    const snapshot = await (await fetch(`${game.origin}/api/rooms/${room.code}/snapshot?token=${room.playerToken}`)).json();
    assert.equal(JSON.stringify(snapshot).includes("Synthetic calendar remote room"), true);
    assert.equal(JSON.stringify(snapshot).includes("FORGED"), false);
  } finally { await game?.close(); fs.rmSync(work, { recursive: true, force: true }); }
});

function harness() {
  const state = { entitled: true, withdrawn: false, calls: [] };
  const authorize = createQuestRequestAuthority({
    loadCatalog: async () => ({ ok: true, quests: state.withdrawn ? [] : [{ id: "dock", packageRef: newer }] }),
    loadRun: async (userId, id) => userId === identity.userId && id === runId ? { quest_id: "dock", packageRef: ref } : null,
    resolvePackage: async (requested, opts) => {
      state.calls.push({ requested, opts });
      if (state.withdrawn) return { ok: false, code: "package_reference_forbidden", status: 404 };
      if (!state.entitled) return { ok: false, code: "subscription_required", status: 402 };
      return { ok: true, packageRef: requested, record: { id: "dock", mission: { id: "dock", startYear: 2026, collapseYear: 2034, grounding: "AUTHORED" } } };
    },
  });
  return { state, authorize };
}
it("derives current package identity when the caller omits it and ignores client access claims", async () => {
  const { state, authorize } = harness();
  const result = await authorize({ context: { questId: "dock", year: 2026, grounding: "FORGED", entitled: true, inventionHow: "player text" } }, { identity, entitled: false });
  assert.equal(result.ok, true);
  assert.deepEqual(result.body.context.packageRef, newer);
  assert.equal(result.body.context.grounding, "AUTHORED");
  assert.equal(result.body.context.inventionHow, "player text");
  assert.equal(state.calls[0].opts.entitled, false);
});
it("uses an owner's bound old revision, even when omitted, instead of latest", async () => {
  const { authorize } = harness();
  const result = await authorize({ context: { questId: "dock", runId, year: 2026 } }, { identity });
  assert.equal(result.ok, true);
  assert.deepEqual(result.body.context.packageRef, ref);
  assert.equal(result.body.context.runId, runId);
});
it("rejects another owner, swapped revision, withdrawn membership and revoked entitlement before composing", async () => {
  const { state, authorize } = harness();
  const body = { context: { questId: "dock", runId, year: 2026 } };
  assert.equal((await authorize(body, { identity: { ...identity, userId: "user_other" } })).status, 403);
  assert.equal((await authorize({ context: { ...body.context, packageRef: newer } }, { identity })).status, 403);
  assert.equal(state.calls.length, 0);
  state.entitled = false;
  assert.equal((await authorize(body, { identity })).status, 402);
  state.entitled = true;
  state.withdrawn = true;
  assert.equal((await authorize(body, { identity })).status, 404);
});
it("supports unsigned exact-reference open play without fabricating a run", async () => {
  const { state, authorize } = harness();
  assert.equal((await authorize({ context: { packageRef: ref, year: 2026 } })).ok, true);
  assert.equal(state.calls[0].opts.identity.signedIn, false);
  assert.equal((await authorize({ context: { packageRef: ref, runId, year: 2026 } })).status, 401);
});

it("infers the quest from a run and fails closed for unbound, malformed, and mismatched stored identities", async () => {
  const { authorize } = harness();
  assert.deepEqual((await authorize({ context: { runId } }, { identity })).body.context.packageRef, ref);
  for (const row of [
    { quest_id: "dock" },
    { quest_id: "dock", package_id: "dock", package_revision: "bad" },
    { quest_id: "another", packageRef: ref },
    { quest_id: "dock", packageRef: ref, clerk_user_id: "user_other" },
  ]) {
    const check = createQuestRequestAuthority({
      loadRun: async () => row,
      loadCatalog: async () => ({ ok: true, quests: [{ id: "dock", packageRef: newer }] }),
      resolvePackage: async () => { throw Error("must not resolve"); },
    });
    assert.equal((await check({ context: { runId } }, { identity })).ok, false);
  }
});
it("rejects contradictory run aliases and handles unavailable authority without trusting body claims", async () => {
  const { authorize, state } = harness();
  const other = "22222222-2222-4222-8222-222222222222";
  for (const body of [{ runId: other, context: { runId } }, { context: { runId, cloudRunId: other } }])
    assert.equal((await authorize(body, { identity })).status, 403);
  assert.equal(state.calls.length, 0);
  const unavailable = createQuestRequestAuthority({ loadCatalog: async () => { throw Error("offline"); } });
  assert.equal((await unavailable({ context: { questId: "dock", entitled: true } })).status, 503);
});
it("portal delegation preserves the bearer and run, rejects redirects, and propagates current denial", async () => {
  let denied = false;
  const calls = [];
  const authorize = createPortalQuestRequestAuthority({ origin: "https://portal.example/", fetchImpl: async (url, opts) => {
    calls.push({ url, opts });
    return denied ? Response.json({ ok: false, error: "subscription_required" }, { status: 402 })
      : Response.json({ ok: true, context: { questId: "dock", packageRef: ref, runId, year: 2026, grounding: "AUTHORED" } });
  } });
  const body = { mode: "chat", runId, context: { questId: "dock", grounding: "FORGED" } };
  const bound = await authorize(body, { authorization: "Bearer verified-by-portal" });
  assert.equal(bound.body.context.grounding, "AUTHORED");
  assert.equal(bound.body.mode, "chat");
  assert.equal(calls[0].url, "https://portal.example/api/quests/resolve-context");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer verified-by-portal");
  assert.equal(calls[0].opts.redirect, "error");
  assert.equal(JSON.parse(calls[0].opts.body).runId, runId);
  denied = true;
  assert.equal((await authorize(body)).status, 402);
  const offline = createPortalQuestRequestAuthority({ origin: "https://portal.example", fetchImpl: async () => { throw Error("offline"); } });
  assert.equal((await offline(body)).status, 503);
});
