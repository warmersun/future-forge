import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/quest-package.py");
const LESSON = "https://warmersun.com/lessons/";
const ASSET = "https://warmersun.com/future-forge/quests/assets/";
const python = spawnSync("python3", ["--version"], { encoding: "utf8" });

const cleanup = [];
after(() => {
  for (const dir of cleanup) fs.rmSync(dir, { recursive: true, force: true });
});

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ffquest-"));
  cleanup.push(dir);
  return dir;
}

function run(args) {
  return spawnSync("python3", [CLI, ...args], { encoding: "utf8" });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

/** @param {string} src */
function singleQuestTree(src, { broken = false } = {}) {
  const id = "spotlight-harbor-reef-2026";
  fs.mkdirSync(path.join(src, "lessons/harbor-reef/illustrations"), { recursive: true });
  fs.mkdirSync(path.join(src, "quests"), { recursive: true });
  fs.mkdirSync(path.join(src, "assets"), { recursive: true });
  fs.writeFileSync(path.join(src, "assets/cover.png"), Buffer.from([1, 2, 3, 4]));
  fs.writeFileSync(
    path.join(src, "lessons/harbor-reef/illustrations/cover.png"),
    Buffer.from([5, 6, 7])
  );
  fs.writeFileSync(
    path.join(src, "lessons/harbor-reef/index.html"),
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Harbor reef · Lesson</title></head>
<body><img src="illustrations/cover.png" alt=""></body></html>\n`
  );
  fs.writeFileSync(
    path.join(src, "lessons/harbor-reef/01-place.html"),
    "<!DOCTYPE html><html><head><title>The place</title></head><body><p>Place</p></body></html>\n"
  );
  const page = broken
    ? `${LESSON}harbor-reef/missing.html`
    : `${LESSON}harbor-reef/01-place.html`;
  writeJson(path.join(src, "quests", `${id}.json`), {
    schema: "future-forge.quest-tile/v1",
    kind: "quest",
    id,
    title: "Harbor reef",
    aiTutorContext: `Read ${LESSON}harbor-reef/ and ${page} and see ${ASSET}cover.png. Postcard assets/problems/poverty.jpg`,
  });
  return id;
}

const MODULE_TITLE = "Same-day dollars at the market";
const MODULE_ID = "module-saltpier-market";
const LESSON_IDS = [
  "spotlight-crypto-saltpier-payout-2026",
  "spotlight-crypto-saltpier-remit-2026",
  "spotlight-crypto-saltpier-share-2026",
];

/**
 * Wrapper plus three lesson quests sharing lessons/saltpier-market/.
 * `omit` keeps the id on the wrapper but writes no tile.
 * `questTotals` overrides each lesson quest's totalLessons.
 * @param {string} src
 * @param {{ omit?: string, numbers?: number[], questTotals?: number, extraListed?: string }} [opts]
 */
function moduleTree(src, opts = {}) {
  const numbers = opts.numbers || [1, 2, 3];
  const listed = [...LESSON_IDS];
  if (opts.extraListed) listed.push(opts.extraListed);
  const wrapperTotal = listed.length;
  const questTotal = opts.questTotals ?? wrapperTotal;
  fs.mkdirSync(path.join(src, "quests"), { recursive: true });
  fs.mkdirSync(path.join(src, "lessons/saltpier-market"), { recursive: true });
  fs.writeFileSync(
    path.join(src, "lessons/saltpier-market/index.html"),
    `<!DOCTYPE html><html><head><title>${MODULE_TITLE}</title></head><body></body></html>\n`
  );
  writeJson(path.join(src, "quests", `${MODULE_ID}.json`), {
    schema: "future-forge.quest-tile/v1",
    kind: "module",
    id: MODULE_ID,
    title: MODULE_TITLE,
    module: MODULE_TITLE,
    lessons: listed,
    totalLessons: wrapperTotal,
  });
  LESSON_IDS.forEach((id, i) => {
    if (id === opts.omit) return;
    const page = `0${i + 1}-job.html`;
    fs.writeFileSync(
      path.join(src, "lessons/saltpier-market", page),
      `<!DOCTYPE html><html><head><title>Lesson ${i + 1}</title></head><body></body></html>\n`
    );
    writeJson(path.join(src, "quests", `${id}.json`), {
      schema: "future-forge.quest-tile/v1",
      kind: "quest",
      id,
      title: `Lesson ${i + 1}`,
      isLearningModule: true,
      module: MODULE_TITLE,
      lesson: numbers[i],
      totalLessons: questTotal,
      aiTutorContext: `Read ${LESSON}saltpier-market/${page}`,
    });
  });
}

describe("quest package", { skip: python.status !== 0 }, () => {
  it("packs, verifies, inspects, and unpacks a single quest", () => {
    const src = tmp();
    const work = tmp();
    const id = singleQuestTree(src);
    const pkg = path.join(work, `${id}.ffquest`);
    const packed = run(["pack", src, "-o", pkg, "--no-validate"]);
    assert.equal(packed.status, 0, packed.stderr);
    assert.equal(run(["verify", pkg]).status, 0);

    const inspected = run(["inspect", pkg, "--json"]);
    assert.equal(inspected.status, 0, inspected.stderr);
    const summary = JSON.parse(inspected.stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.manifest.id, id);
    assert.equal(summary.manifest.schema, "future-forge.quest-package/v1");
    assert.equal(summary.manifest.module, undefined);
    assert.equal(summary.manifest.quests[0].kind, "quest");
    assert.equal(summary.manifest.lessons[0].folder, "harbor-reef");
    assert.deepEqual(summary.manifest.lessons[0].questIds, [id]);
    assert.equal(summary.manifest.lessons[0].title, "Harbor reef");

    const rawDest = path.join(work, "raw");
    const raw = run(["unpack", pkg, rawDest]);
    assert.equal(raw.status, 0, raw.stderr);
    const rawQuest = fs.readFileSync(path.join(rawDest, "quests", `${id}.json`), "utf8");
    assert.match(rawQuest, /lessons\/harbor-reef\/01-place\.html/);
    assert.match(rawQuest, /assets\/cover\.png/);
    assert.match(rawQuest, /assets\/problems\/poverty\.jpg/);
    assert.doesNotMatch(rawQuest, /warmersun\.com/);
    const rawHtml = fs.readFileSync(
      path.join(rawDest, "lessons/harbor-reef/index.html"),
      "utf8"
    );
    assert.match(rawHtml, /src="illustrations\/cover\.png"/);
    const manifest = JSON.parse(fs.readFileSync(path.join(rawDest, "manifest.json"), "utf8"));
    assert.deepEqual(manifest.paths, { lessons: "lessons/", assets: "assets/" });

    const dest = path.join(work, "out");
    const unpacked = run([
      "unpack",
      pkg,
      dest,
      "--lesson-root",
      "https://staging.example/lessons/",
      "--asset-root",
      "https://staging.example/assets/",
    ]);
    assert.equal(unpacked.status, 0, unpacked.stderr);
    const quest = fs.readFileSync(path.join(dest, "quests", `${id}.json`), "utf8");
    assert.match(quest, /https:\/\/staging\.example\/lessons\/harbor-reef\/01-place\.html/);
    assert.match(quest, /https:\/\/staging\.example\/assets\/cover\.png/);
    assert.match(quest, /assets\/problems\/poverty\.jpg/);
    assert.doesNotMatch(quest, /warmersun\.com\/lessons/);
    const html = fs.readFileSync(path.join(dest, "lessons/harbor-reef/index.html"), "utf8");
    assert.match(html, /src="illustrations\/cover\.png"/);
    assert.ok(fs.existsSync(path.join(dest, "lessons/harbor-reef/illustrations/cover.png")));

    const fileDest = path.join(work, "file");
    const filed = run([
      "unpack",
      pkg,
      fileDest,
      "--lesson-root",
      "file:///tmp/pkg/lessons/",
      "--asset-root",
      "file:///tmp/pkg/assets/",
    ]);
    assert.equal(filed.status, 0, filed.stderr);
    const fileQuest = fs.readFileSync(path.join(fileDest, "quests", `${id}.json`), "utf8");
    assert.match(fileQuest, /file:\/\/\/tmp\/pkg\/lessons\/harbor-reef\/01-place\.html/);
    assert.match(fileQuest, /file:\/\/\/tmp\/pkg\/assets\/cover\.png/);
    assert.match(fileQuest, /assets\/problems\/poverty\.jpg/);
  });

  it("rejects a quest that links to a lesson file the package does not contain", () => {
    const src = tmp();
    const work = tmp();
    singleQuestTree(src, { broken: true });
    const packed = run([
      "pack",
      src,
      "-o",
      path.join(work, "broken.ffquest"),
      "--no-validate",
    ]);
    assert.notEqual(packed.status, 0);
    assert.match(packed.stderr, /missing lesson file/);

    const good = tmp();
    const goodId = singleQuestTree(good);
    const goodPkg = path.join(work, "good.ffquest");
    const badPkg = path.join(work, "tampered.ffquest");
    assert.equal(run(["pack", good, "-o", goodPkg, "--no-validate"]).status, 0);
    const tamper = spawnSync(
      "python3",
      [
        "-c",
        `
import json, sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
src, dest = sys.argv[1], sys.argv[2]
with ZipFile(src) as zf:
    items = {i.filename: zf.read(i) for i in zf.infolist() if not i.is_dir()}
for name in list(items):
    if name.startswith("quests/") and name.endswith(".json"):
        tile = json.loads(items[name])
        tile["aiTutorContext"] += " lessons/harbor-reef/missing.html"
        items[name] = json.dumps(tile).encode()
with ZipFile(dest, "w") as zf:
    for name, data in sorted(items.items()):
        info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        zf.writestr(info, data)
`,
        goodPkg,
        badPkg,
      ],
      { encoding: "utf8" }
    );
    assert.equal(tamper.status, 0, tamper.stderr);
    const verified = run(["verify", badPkg]);
    assert.notEqual(verified.status, 0);
    assert.match(verified.stderr, /missing lesson file/);
  });

  it("packs a learning module and checks wrapper consistency", () => {
    const src = tmp();
    const work = tmp();
    moduleTree(src);
    const pkg = path.join(work, "module.ffquest");
    const packed = run(["pack", src, "-o", pkg, "--no-validate"]);
    assert.equal(packed.status, 0, packed.stderr);
    const summary = JSON.parse(run(["inspect", pkg, "--json"]).stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.manifest.id, MODULE_ID);
    assert.deepEqual(summary.manifest.module, {
      id: MODULE_ID,
      title: MODULE_TITLE,
      lessons: LESSON_IDS,
      totalLessons: 3,
    });
    assert.deepEqual(
      summary.manifest.quests.map((q) => q.id),
      [MODULE_ID, ...LESSON_IDS]
    );
    assert.deepEqual(summary.manifest.lessons[0].questIds, LESSON_IDS);
    const human = run(["inspect", pkg]);
    assert.match(human.stdout, /1\/3/);
    assert.match(human.stdout, /3\/3/);

    const missing = tmp();
    moduleTree(missing, { omit: LESSON_IDS[2] });
    const missingRun = run([
      "pack",
      missing,
      "-o",
      path.join(work, "missing.ffquest"),
      "--no-validate",
    ]);
    assert.notEqual(missingRun.status, 0);
    assert.match(missingRun.stderr, /is not in the package/);

    const skipped = tmp();
    moduleTree(skipped, { numbers: [1, 2, 4] });
    const skippedRun = run([
      "pack",
      skipped,
      "-o",
      path.join(work, "skip.ffquest"),
      "--no-validate",
    ]);
    assert.notEqual(skippedRun.status, 0);
    assert.match(skippedRun.stderr, /is not 3/);

    const totals = tmp();
    moduleTree(totals, { questTotals: 4 });
    const totalsRun = run([
      "pack",
      totals,
      "-o",
      path.join(work, "totals.ffquest"),
      "--no-validate",
    ]);
    assert.notEqual(totalsRun.status, 0);
    assert.match(totalsRun.stderr, /totalLessons/);

    const external = tmp();
    moduleTree(external, { extraListed: "spotlight-crypto-saltpier-agent-2026" });
    const externalPkg = path.join(work, "external.ffquest");
    const externalRun = run([
      "pack",
      external,
      "-o",
      externalPkg,
      "--no-validate",
      "--allow-external-lessons",
    ]);
    assert.equal(externalRun.status, 0, externalRun.stderr);
    assert.match(externalRun.stderr, /not in the package/);
    const externalVerify = run(["verify", externalPkg, "--allow-external-lessons"]);
    assert.equal(externalVerify.status, 0, externalVerify.stderr);
  });
});
