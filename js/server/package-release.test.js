import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { allTechIds } from "../data.js";
import { packageQuestProjection, resolvePackageRelease } from "./package-release.mjs";
import { packageObjectKey } from "./package-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(ROOT, "scripts/quest-package.py");
const WORLDS = path.join(ROOT, "test/fixtures/packages/self-contained-worlds");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ffrel-"));
}

function packWorld() {
  const src = tmp();
  fs.mkdirSync(path.join(src, "quests"), { recursive: true });
  fs.mkdirSync(path.join(src, "predictions"), { recursive: true });
  const template = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/quests/companion-moonshots-304.json"), "utf8"));
  for (const id of ["kiln-ferry-test", "harbor-clock-test"]) {
    const stub = JSON.parse(fs.readFileSync(path.join(WORLDS, "quests", `${id}.json`), "utf8"));
    const tile = { ...structuredClone(template), ...stub };
    tile.mission = { ...template.mission, id, title: stub.title };
    delete tile.titleImageUrl;
    delete tile.briefBeats;
    delete tile.mission.briefBeats;
    tile.companion = {
      ...template.companion,
      ...stub.companion,
      source: {
        ...template.companion.source,
        title: "Synthetic test source — not a real episode",
        show: "Test fixture",
        speaker: "Test fixture speaker",
        url: "https://example.com/synthetic-test",
      },
      interpretation: "All claims in this test are invented. No real source is being attributed.",
      exploration: {
        ...stub.companion.exploration,
        challenges: Object.fromEntries(["nature", "moloch", "ethicist", "stakeholder"].map((angle) => [angle, {
          connection: "The synthetic grant has a bounded scope.",
          question: "What happens outside the fictional grant's scope?",
        }])),
      },
    };
    delete tile.companion.quote;
    fs.writeFileSync(path.join(src, "quests", `${id}.json`), `${JSON.stringify(tile, null, 2)}\n`);
  }
  for (const bank of ["kiln-ferry-bank.json", "harbor-clock-bank.json"]) {
    fs.copyFileSync(path.join(WORLDS, "predictions", bank), path.join(src, "predictions", bank));
  }
  const harbor = JSON.parse(fs.readFileSync(path.join(src, "quests/harbor-clock-test.json"), "utf8"));
  harbor.access = "paid";
  fs.writeFileSync(
    path.join(src, "quests/harbor-clock-test.json"),
    `${JSON.stringify(harbor, null, 2)}\n`
  );
  const pkg = path.join(tmp(), "worlds.ffquest");
  const packed = spawnSync("python3", [CLI, "pack", src, "-o", pkg, "--no-validate"], {
    encoding: "utf8",
  });
  assert.equal(packed.status, 0, packed.stderr);
  const dest = path.join(tmp(), "out");
  assert.equal(spawnSync("python3", [CLI, "unpack", pkg, dest], { encoding: "utf8" }).status, 0);
  return path.join(dest, "raw");
}

function filesFromRaw(raw, prefix = "quests") {
  const manifest = JSON.parse(fs.readFileSync(path.join(raw, "manifest.json"), "utf8"));
  const ref = {
    packageId: manifest.id,
    revision: manifest.revision,
    questId: "kiln-ferry-test",
  };
  const root = packageObjectKey(prefix, ref);
  const files = {};
  function walk(dir, relBase) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = relBase ? `${relBase}/${name}` : name;
      if (fs.statSync(abs).isDirectory()) walk(abs, rel);
      else files[`${root}/${rel}`] = fs.readFileSync(abs, "utf8");
    }
  }
  walk(raw, "");
  return { files, manifest, ref, prefix };
}

describe("package release resolution", () => {
  it("resolves one quest world and does not include the other calendar", () => {
    const raw = packWorld();
    const packed = filesFromRaw(raw);
    const resolved = resolvePackageRelease(packed.files, packed.ref, {
      techIds: allTechIds(),
      prefix: packed.prefix,
      trust: "official",
    });
    assert.equal(resolved.ok, true, resolved.message);
    assert.equal(resolved.bank.id, "kiln-ferry-bank");
    assert.equal(resolved.bank.predictions.some((row) => row.id.startsWith("harbor-")), false);
    const open = packageQuestProjection(resolved, { allow: true });
    assert.equal(open.world.bankId, "kiln-ferry-bank");
    assert.equal(open.packageRef.questId, "kiln-ferry-test");
    assert.equal(JSON.stringify(open.world).includes("harbor-"), false);
  });

  it("returns a card without world data when access is denied", () => {
    const packed = filesFromRaw(packWorld());
    const resolved = resolvePackageRelease(
      packed.files,
      { ...packed.ref, questId: "harbor-clock-test" },
      { techIds: allTechIds(), prefix: packed.prefix }
    );
    assert.equal(resolved.ok, true, resolved.message);
    const denied = packageQuestProjection(resolved, { allow: false });
    assert.equal(denied.gated, true);
    assert.equal(denied.world, undefined);
    assert.equal(denied.mission, undefined);
    assert.equal(JSON.stringify(denied).includes("kiln-ferry"), false);
  });

  it("rejects tampered bytes and a missing dependency before returning a world", () => {
    const packed = filesFromRaw(packWorld());
    const bankKey = Object.keys(packed.files).find((key) => key.endsWith("kiln-ferry-bank.json"));
    const tampered = { ...packed.files, [bankKey]: packed.files[bankKey].replace("2026", "2030") };
    const bad = resolvePackageRelease(tampered, packed.ref, {
      techIds: allTechIds(),
      prefix: packed.prefix,
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.code, "package_integrity_failed");

    const missing = { ...packed.files };
    delete missing[bankKey];
    const gone = resolvePackageRelease(missing, packed.ref, {
      techIds: allTechIds(),
      prefix: packed.prefix,
    });
    assert.equal(gone.ok, false);
    assert.equal(gone.code, "package_dependency_missing");
    assert.equal(createHash("sha256").update("x").digest("hex").length, 64);
  });

  it("rejects a forged derived index even when all content hashes still match", () => {
    const packed = filesFromRaw(packWorld());
    const key = Object.keys(packed.files).find((name) => name.endsWith("/manifest.json"));
    const manifest = JSON.parse(packed.files[key]);
    manifest.quests[0].predictionBankId = "wrong-bank";
    const changed = { ...packed.files, [key]: JSON.stringify(manifest) };
    const result = resolvePackageRelease(changed, packed.ref, { prefix: packed.prefix });
    assert.equal(result.ok, false);
    assert.equal(result.code, "package_integrity_failed");
    manifest.quests[0].file = "quests/harbor-clock-test.json";
    const redirected = resolvePackageRelease({ ...packed.files, [key]: JSON.stringify(manifest) }, packed.ref, { prefix: packed.prefix });
    assert.equal(redirected.ok, false);
    assert.equal(redirected.code, "package_integrity_failed");
  });

  it("can still resolve an older retained revision when latest differs", () => {
    const older = filesFromRaw(packWorld(), "store");
    const newerRaw = packWorld();
    const tile = path.join(newerRaw, "quests/kiln-ferry-test.json");
    const doc = JSON.parse(fs.readFileSync(tile, "utf8"));
    doc.summary = "Synthetic quest. Invented claims only. Revised.";
    fs.writeFileSync(tile, `${JSON.stringify(doc, null, 2)}\n`);
    const repacked = spawnSync(
      "python3",
      [CLI, "pack", newerRaw, "-o", path.join(tmp(), "new.ffquest"), "--no-validate"],
      { encoding: "utf8" }
    );
    assert.equal(repacked.status, 0, repacked.stderr);
    const oldResolved = resolvePackageRelease(older.files, older.ref, {
      techIds: allTechIds(),
      prefix: "store",
    });
    assert.equal(oldResolved.ok, true, oldResolved.message);
    assert.equal(oldResolved.packageRef.revision, older.ref.revision);
  });
});
