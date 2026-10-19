import { it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { scanQuestsFolder } from "../quests-folder.mjs";
import { createPublicRoutes } from "../../portal/functions/public-routes.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtureJwt = "eyJfixture.payload.signature";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function stop(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

it("dev launcher enforces authoritative account gates and preserves local side-loads", { timeout: 30_000 }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ff-dev-launcher-"));
  const questsDir = path.join(dir, "quests");
  await mkdir(questsDir);
  const raw = JSON.parse(await readFile(new URL("../../test/fixtures/quests/spotlight-gene-seq.json", import.meta.url), "utf8"));
  for (const id of ["official-account-lesson", "library-only-lesson"]) {
    const tile = structuredClone(raw);
    tile.id = id;
    tile.access = "account";
    if (tile.mission?.id) tile.mission.id = id;
    await writeFile(path.join(questsDir, `${id}.json`), JSON.stringify(tile));
  }
  const scanned = await scanQuestsFolder(questsDir);
  assert.equal(scanned.errors.length, 0);
  const localOfficial = scanned.quests.find((tile) => tile.id === "official-account-lesson");
  const official = {
    ...localOfficial,
    source: "remote",
    mission: { ...localOfficial.mission, source: "remote", aiTutorContext: "Private fixture tutor notes" },
  };
  let catalogUnavailable = false;
  const api = createPublicRoutes({
    env: { CLERK_PUBLISHABLE_KEY: "pk_test_fixture", CLERK_SECRET_KEY: "sk_test_fixture" },
    loadCatalog: async () => ({ ok: !catalogUnavailable, quests: [official], errors: [] }),
    verifyClerk: async (token) => token === fixtureJwt ? { sub: "user_fixture" } : null,
  });
  let publicCatalogReads = 0;
  const upstream = createServer(async (req, res) => {
    try {
      if (req.url === "/public-catalog.json") {
        publicCatalogReads++;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ schema: "future-forge.catalog/v1", quests: [] }));
        return;
      }
      const response = await api.fetch(new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end("fixture request failed");
    }
  });
  const upstreamPort = await listen(upstream);
  const upstreamOrigin = `http://127.0.0.1:${upstreamPort}`;
  const children = [];
  async function startGame(extraEnv = {}) {
    const portReservation = createServer();
    const port = await listen(portReservation);
    await stop(portReservation);
    // Explicit allowlist, not process.env: no real cloud keys or home auth files.
    const child = spawn("bash", ["scripts/dev-server.sh"], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: dir,
        TMPDIR: os.tmpdir(),
        FF_SKIP_GAME_ENV_FILE: "1",
        FF_PORT: String(port),
        FF_HOST: "127.0.0.1",
        FF_PORTAL_URL: upstreamOrigin,
        FF_QUESTS_DIR: questsDir,
        FF_QUESTS_REMOTE_URL: `${upstreamOrigin}/public-catalog.json`,
        FF_TRENDS_REMOTE_URL: "off",
        FF_USAGE_ENABLED: "0",
        FF_GROK_HOME: path.join(dir, "grok"),
        FF_TTS_CACHE_DIR: path.join(dir, "tts"),
        ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (data) => { output = (output + data).slice(-8000); });
    child.stderr.on("data", (data) => { output = (output + data).slice(-8000); });
    const ended = once(child, "exit");
    children.push({ child, ended });
    const origin = `http://127.0.0.1:${port}`;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) assert.fail(`fixture game exited: ${output}`);
      try {
        if ((await fetch(`${origin}/api/health`)).ok) return origin;
      } catch { /* wait for listen */ }
      await delay(30);
    }
    assert.fail(`fixture game did not start: ${output}`);
  }
  try {
    const origin = await startGame();
    assert.equal((await (await fetch(`${origin}/api/health`)).json()).portal.quests, true);
    const catalog = await (await fetch(`${origin}/api/quests`)).json();
    const listed = catalog.quests.find((tile) => tile.id === official.id);
    assert.equal(listed.gated, true, JSON.stringify({ source: listed.source, access: listed.access, missionAccess: listed.mission?.access, remoteUrl: catalog.remoteUrl, error: catalog.error }));
    assert.equal(listed.source, "remote");
    assert.equal(listed.mission, undefined);
    assert.equal(catalog.quests.filter((tile) => tile.id === official.id).length, 1);
    const unsigned = await fetch(`${origin}/api/quests/${official.id}`);
    assert.equal(unsigned.status, 401);
    assert.equal((await unsigned.json()).error, "sign_in_required");
    const signed = await fetch(`${origin}/api/quests/${official.id}`, { headers: { Authorization: `Bearer ${fixtureJwt}` } });
    assert.equal(signed.status, 200);
    assert.equal((await signed.json()).tile.mission.aiTutorContext, "Private fixture tutor notes");
    const sideLoad = await fetch(`${origin}/api/quests/library-only-lesson`);
    assert.equal(sideLoad.status, 200);
    assert.ok((await sideLoad.json()).tile.mission);
    assert.equal(publicCatalogReads, 0, "gated launch must never consult the public catalog");

    catalogUnavailable = true;
    assert.equal((await fetch(`${origin}/api/quests/${official.id}`)).status, 503, "upstream failures must not expose the local duplicate");
    assert.equal((await fetch(`${origin}/api/quests`)).status, 503);
    assert.equal(publicCatalogReads, 0, "upstream failures must not fall back to the public mirror");
    catalogUnavailable = false;

    const optOut = await startGame({ FF_PORTAL_QUESTS: "0", FF_QUESTS_REMOTE_URL: "off" });
    assert.equal((await (await fetch(`${optOut}/api/health`)).json()).portal.quests, false);
    assert.equal((await fetch(`${optOut}/api/quests/${official.id}`)).status, 200, "explicit self-host catalog opt-out remains supported");
  } finally {
    for (const { child, ended } of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      const kill = setTimeout(() => child.kill("SIGKILL"), 2000);
      kill.unref();
      await ended;
      clearTimeout(kill);
    }
    await stop(upstream);
    await rm(dir, { recursive: true, force: true });
  }
});
