import { it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { prepareRunWorld, bankForRun } from "../sim/run-world.js";
import { normalizeMission } from "../mission-normalize.js";
import { FAST_EVAL_MODES } from "./fast-eval.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CLI = path.join(ROOT, "scripts/quest-package.py");

it("two local packages with identical bank ids keep separate worlds through the actual HTTP model boundary", { timeout: 30_000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "ff-package-http-"));
  const packages = path.join(work, "packages");
  const quests = path.join(work, "quests");
  fs.mkdirSync(quests, { recursive: true });
  fs.mkdirSync(packages);
  const original = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/quests/companion-moonshots-304.json"), "utf8"));
  const originalBank = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/predictions/companion-dock-test.json"), "utf8"));
  const ambient = structuredClone(originalBank);
  ambient.id = "unrelated-ambient";
  ambient.predictions[0].headline = "Ambient must not leak";
  const ambientFile = path.join(work, "ambient.json");
  fs.writeFileSync(ambientFile, JSON.stringify(ambient));
  for (const suffix of ["a", "b"]) {
    const id = `package-dock-${suffix}`;
    const source = path.join(work, `source-${suffix}`);
    fs.mkdirSync(path.join(source, "quests"), { recursive: true });
    fs.mkdirSync(path.join(source, "predictions"));
    const tile = structuredClone(original);
    tile.id = id;
    tile.mission.id = id;
    tile.predictionBankId = originalBank.id;
    const bank = structuredClone(originalBank);
    bank.predictions[0].headline = `Synthetic calendar ${suffix}`;
    const questFile = `${id}.json`;
    fs.writeFileSync(path.join(source, "quests", questFile), JSON.stringify(tile));
    fs.writeFileSync(path.join(source, "predictions", `${bank.id}.json`), JSON.stringify(bank));
    fs.copyFileSync(path.join(source, "quests", questFile), path.join(quests, questFile));
    const pkg = path.join(work, `${id}.ffquest`);
    const packed = spawnSync("python3", [CLI, "pack", source, "-o", pkg], { encoding: "utf8" });
    assert.equal(packed.status, 0, packed.stderr);
    const unpacked = spawnSync("python3", [CLI, "unpack", pkg, path.join(packages, id)], { encoding: "utf8" });
    assert.equal(unpacked.status, 0, unpacked.stderr);
  }
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["server.mjs", "--developer"], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH,
      HOME: work,
      TMPDIR: os.tmpdir(),
      FF_SKIP_GAME_ENV_FILE: "1",
      FF_PORT: String(port),
      FF_HOST: "127.0.0.1",
      FF_QUESTS_DIR: quests,
      FF_QUEST_PACKAGES_DIR: packages,
      FF_PREDICTIONS_FILE: ambientFile,
      FF_QUESTS_REMOTE_URL: "off",
      FF_TRENDS_REMOTE_URL: "off",
      FF_USAGE_ENABLED: "0",
      FF_GROK_HOME: path.join(work, "grok"),
      FF_TTS_CACHE_DIR: path.join(work, "tts"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ended = once(child, "exit");
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output = (output + chunk).slice(-8000); });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) assert.fail(output);
      try { ready = (await fetch(`${origin}/api/health`)).ok; } catch { /* startup */ }
      if (ready) break;
      await delay(30);
    }
    assert.equal(ready, true, output);
    const catalog = await (await fetch(`${origin}/api/quests`)).json();
    assert.equal(catalog.quests.filter((entry) => entry.id.startsWith("package-dock-")).length, 2,
      JSON.stringify({ ids: catalog.quests.map((entry) => entry.id), errors: catalog.errors }));
    const seen = [];
    for (const suffix of ["a", "b"]) {
      const id = `package-dock-${suffix}`;
      const detail = await (await fetch(`${origin}/api/quests/${id}`)).json();
      assert.equal(detail.ok, true, JSON.stringify(detail));
      // Use the same normalization at catalog selection and start as game.js;
      // feeding the API mission directly to prepareRunWorld missed a regression.
      const catalogMission = normalizeMission(detail.tile.mission, detail.tile.mission.globalId);
      const mission = normalizeMission(catalogMission, catalogMission.globalId);
      assert.deepEqual(mission.packageRef, detail.tile.mission.packageRef);
      assert.equal(mission.predictionBankId, originalBank.id);
      const selected = prepareRunWorld(mission, { loadedBank: { id: "unrelated" }, year: 2026 });
      assert.equal(selected.ok, true, selected.message);
      assert.equal(bankForRun({ runWorld: selected.world }).predictions[0].headline, `Synthetic calendar ${suffix}`);
      seen.push(selected.world.packageRef.revision);
      for (const mode of [...Object.keys(FAST_EVAL_MODES), "chat", "sit", "scamper", "evaluate-neighbors", "draft-how", "draft-impact", "generate-scenarios"]) {
      const response = await fetch(`${origin}/api/co-invent`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, context: {
          // Omitting the reference must not bypass server-owned world inference.
          ...(mode === "chat" ? {} : { packageRef: mission.packageRef }),
          questId: id,
          year: 2026,
          inventionHow: "Keep the parcels moving with a human check at dawn.",
          selectedTechIds: ["ai"],
          availableTechs: [{ id: "ai", name: "AI" }],
          grounding: "FORGED grounding",
          predictionsBank: { id: originalBank.id, predictions: [{ year: 1900, headline: "FORGED" }] },
          sourceInquiry: { claim: "FORGED", invitation: "FORGED" },
        } }),
      });
      assert.equal(response.status, 200, await response.clone().text());
      const result = await response.json();
      const providerPayload = JSON.stringify(result.llm);
      if (mode === "assess-feasibility" || mode === "chat") {
        assert.equal(providerPayload.includes(`Synthetic calendar ${suffix}`), true, providerPayload);
        assert.equal(providerPayload.includes("Keep the parcels moving"), true);
      }
      assert.equal(providerPayload.includes("FORGED"), false, providerPayload);
      if (!["judge-contribution", "judge-scrutiny-move", "fill-quest-summary"].includes(mode))
        assert.equal(providerPayload.includes("Power, physical handling, staffing"), true, `${mode}: ${providerPayload}`);
      }
    }
    assert.notEqual(seen[0], seen[1]);
    const unavailable = await fetch(`${origin}/api/co-invent`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "chat", context: {
        packageRef: { packageId: "missing", revision: `sha256:${"aa".repeat(32)}`, questId: "missing" },
        year: 2026,
      } }),
    });
    assert.equal(unavailable.status, 409, await unavailable.clone().text());
  } finally {
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 2000);
    force.unref();
    await ended;
    clearTimeout(force);
    fs.rmSync(work, { recursive: true, force: true });
  }
});
