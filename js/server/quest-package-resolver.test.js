import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { allTechIds } from "../data.js";
import {
  createPackageRegistry,
  loadVerifiedPackage,
  registerPackagesDir,
} from "./quest-package-resolver.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(ROOT, "scripts/quest-package.py");
const WORLDS = path.join(ROOT, "test/fixtures/packages/self-contained-worlds");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ffpkg-"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function packTree(src) {
  const work = tmp();
  const pkg = path.join(work, "pkg.ffquest");
  const packed = spawnSync("python3", [CLI, "pack", src, "-o", pkg, "--no-validate"], {
    encoding: "utf8",
  });
  assert.equal(packed.status, 0, packed.stderr);
  const dest = path.join(work, "raw");
  const unpacked = spawnSync("python3", [CLI, "unpack", pkg, dest], { encoding: "utf8" });
  assert.equal(unpacked.status, 0, unpacked.stderr);
  return { pkg, raw: path.join(dest, "raw"), work };
}

function worldSrc(ids, banks) {
  const src = tmp();
  fs.mkdirSync(path.join(src, "quests"), { recursive: true });
  fs.mkdirSync(path.join(src, "predictions"), { recursive: true });
  for (const id of ids) {
    fs.copyFileSync(
      path.join(WORLDS, "quests", `${id}.json`),
      path.join(src, "quests", `${id}.json`)
    );
  }
  for (const bank of banks) {
    fs.copyFileSync(
      path.join(WORLDS, "predictions", bank),
      path.join(src, "predictions", bank)
    );
  }
  return src;
}

describe("local package registry", () => {
  it("registers two packages with different calendars and does not use a process bank", () => {
    const kiln = packTree(worldSrc(["kiln-ferry-test", "plain-shelf-test"], ["kiln-ferry-bank.json"]));
    const harborSrc = worldSrc(["harbor-clock-test"], ["harbor-clock-bank.json"]);
    const harborTile = JSON.parse(
      fs.readFileSync(path.join(harborSrc, "quests/harbor-clock-test.json"), "utf8")
    );
    harborTile.id = "harbor-clock-other";
    fs.rmSync(path.join(harborSrc, "quests/harbor-clock-test.json"));
    writeJson(path.join(harborSrc, "quests/harbor-clock-other.json"), harborTile);
    const harbor = packTree(harborSrc);
    const root = tmp();
    fs.cpSync(kiln.raw, path.join(root, "kiln"), { recursive: true });
    fs.cpSync(harbor.raw, path.join(root, "harbor"), { recursive: true });
    const registered = registerPackagesDir(root, { techIds: allTechIds() });
    assert.deepEqual(registered.errors, []);
    assert.equal(registered.registered, 2);
    const kilnRelease = registered.registry.questRelease("kiln-ferry-test");
    const harborRelease = registered.registry.questRelease("harbor-clock-other");
    assert.notEqual(kilnRelease.revision, harborRelease.revision);
    assert.equal(kilnRelease.trust, "local-import");
    assert.equal(
      kilnRelease.banks["kiln-ferry-bank"].predictions.some((row) => row.id.startsWith("harbor-")),
      false
    );
    assert.equal(harborRelease.banks["harbor-clock-bank"].predictions[0].id, "harbor-tide-due-2027");
    assert.equal(process.env.FF_PREDICTIONS_FILE, undefined);
  });

  it("fails registration when two current releases claim the same quest id", () => {
    const left = packTree(worldSrc(["kiln-ferry-test"], ["kiln-ferry-bank.json"]));
    const rightSrc = worldSrc(["kiln-ferry-test"], ["kiln-ferry-bank.json"]);
    const tile = JSON.parse(fs.readFileSync(path.join(rightSrc, "quests/kiln-ferry-test.json"), "utf8"));
    tile.title = "TEST: other release, same quest id";
    writeJson(path.join(rightSrc, "quests/kiln-ferry-test.json"), tile);
    const right = packTree(rightSrc);
    const root = tmp();
    fs.cpSync(left.raw, path.join(root, "left"), { recursive: true });
    fs.cpSync(right.raw, path.join(root, "right"), { recursive: true });
    assert.throws(
      () => {
        const releases = [
          loadVerifiedPackage(path.join(root, "left"), { techIds: allTechIds() }),
          loadVerifiedPackage(path.join(root, "right"), { techIds: allTechIds() }),
        ];
        createPackageRegistry().replaceAll(releases);
      },
      /package_quest_collision/
    );
  });

  it("keeps registry snapshots immutable and preserves the old mapping after a failed replacement", () => {
    const registry = createPackageRegistry();
    const first = { packageId: "pkg", revision: "sha256:first", quests: [{ id: "quest", kind: "quest" }], banks: { bank: { predictions: [{ year: 2026 }] } } };
    registry.replaceAll([first]);
    first.banks.bank.predictions[0].year = 2040;
    assert.equal(registry.get("pkg", "sha256:first").banks.bank.predictions[0].year, 2026);
    assert.throws(() => { registry.get("pkg", "sha256:first").banks.bank.predictions[0].year = 2040; }, TypeError);
    assert.throws(() => registry.replaceAll([first, { ...first, packageId: "other" }]), /package_quest_collision/);
    assert.equal(registry.questRelease("quest").packageId, "pkg");
    assert.equal(registry.size(), 1);
  });

  it("does not publish a partial registry when one package fails validation", () => {
    const good = packTree(worldSrc(["plain-shelf-test"], ["kiln-ferry-bank.json"]));
    const root = tmp();
    fs.cpSync(good.raw, path.join(root, "good"), { recursive: true });
    const bad = path.join(root, "bad");
    fs.cpSync(good.raw, bad, { recursive: true });
    const questPath = path.join(bad, "quests/plain-shelf-test.json");
    fs.writeFileSync(questPath, `${fs.readFileSync(questPath, "utf8")}\n`);
    const registered = registerPackagesDir(root, { techIds: allTechIds() });
    assert.equal(registered.registered, 0);
    assert.equal(registered.registry.size(), 0);
    assert.equal(registered.errors[0].code, "package_integrity_failed");
  });
});
