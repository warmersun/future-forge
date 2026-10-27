import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateQuestDocument } from "../quest-tile.js";
import { planPublishPackage, publishPackagePlan } from "./publish-quest-package.mjs";
import { main, readArchivePackage } from "../../scripts/publish-quest-package.mjs";
import { createHash } from "node:crypto";
import { packageRevision } from "../package-identity.js";
import { catalogFromObjectReader } from "./quest-object-storage.mjs";
import { createHostedPackageResolver } from "./hosted-package-resolver.mjs";

function editRelease(files, edit) {
  const next = { ...files };
  const manifest = JSON.parse(next["manifest.json"]);
  for (const { file } of manifest.quests) {
    const tile = JSON.parse(next[file]);
    edit(tile);
    next[file] = Buffer.from(JSON.stringify(tile));
  }
  const hash = (body) => createHash("sha256").update(body).digest("hex");
  for (const name of Object.keys(manifest.files)) manifest.files[name] = `sha256:${hash(next[name])}`;
  manifest.revision = packageRevision(manifest.schema, manifest.id,
    Object.entries(manifest.files).map(([path, digest]) => ({ path, digest })), hash);
  next["manifest.json"] = Buffer.from(JSON.stringify(manifest));
  return next;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORLDS = path.join(ROOT, "test/fixtures/packages/self-contained-worlds");
let temp, archive, files;

// Compose the repository's real, valid quest template with its explicitly
// synthetic package-world fixture, exactly as package-release.test.js does.
function packFixture(name, access = "open", world = "kiln-ferry", edit = () => {}) {
  const src = path.join(temp, name);
  fs.mkdirSync(path.join(src, "quests"), { recursive: true });
  fs.mkdirSync(path.join(src, "predictions"), { recursive: true });
  fs.mkdirSync(path.join(src, "assets"), { recursive: true });
  // An actual repository PNG exercises byte fidelity beyond UTF-8 JSON.
  fs.copyFileSync(path.join(ROOT, "test/fixtures/collector-cards/cards/daily/2026-10-08-sample-card.png"), path.join(src, "assets", "fixture-card.png"));
  const id = `${world}-test`;
  const template = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/quests/companion-moonshots-304.json")));
  const stub = JSON.parse(fs.readFileSync(path.join(WORLDS, "quests", `${id}.json`)));
  const tile = { ...template, ...stub, access };
  tile.mission = { ...template.mission, id, title: stub.title, access };
  tile.companion = {
    ...template.companion, ...stub.companion,
    // Keep the real template's source/citation; only the package calendar and
    // premise below are synthetic. Never invent a source to satisfy lint.
    source: template.companion.source,
    claim: template.companion.claim,
    evidence: template.companion.evidence,
    interpretation: "The cited opinion is from the real template. This test's package calendar and bounded grant are synthetic scenario assumptions, not claims about that source.",
    exploration: { ...stub.companion.exploration, challenges: Object.fromEntries(["nature", "moloch", "ethicist", "stakeholder"].map((angle) => [angle, {
      connection: "The synthetic grant has a bounded scope.", question: "What happens outside the fictional grant's scope?",
    }])) },
  };
  tile.research = template.research;
  tile.companion.invitation = tile.spotlight.encourageCopy;
  delete tile.companion.quote;
  edit(tile);
  const valid = validateQuestDocument(tile);
  assert.equal(valid.ok, true, JSON.stringify(valid));
  fs.writeFileSync(path.join(src, "quests", `${id}.json`), `${JSON.stringify(tile, null, 2)}\n`);
  fs.copyFileSync(path.join(WORLDS, "predictions", `${world}-bank.json`), path.join(src, "predictions", `${world}-bank.json`));
  const pkg = path.join(temp, `${name}.ffquest`);
  const result = spawnSync("python3", [path.join(ROOT, "scripts/quest-package.py"), "pack", src, "-o", pkg, "--no-validate"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return pkg;
}

// Linearizable offline adapter: versions change on every write, conditional
// operations are atomic within this process, and all bodies are byte snapshots.
function memoryStore(catalog = { marker: "retain metadata", quests: [{ id: "old", file: "old.json" }] }) {
  const objects = new Map();
  let serial = 0;
  const set = (key, body) => objects.set(key, { body: Buffer.from(body), version: String(++serial) });
  if (catalog !== null) set("catalog.json", Buffer.from(JSON.stringify(catalog)));
  const adapter = {
    readObject: async (key) => { const row = objects.get(key); return row ? { ...row, body: Buffer.from(row.body) } : null; },
    createObject: async (key, body) => { if (objects.has(key)) return false; set(key, body); return true; },
    compareAndSwap: async (key, body, version) => { if ((objects.get(key)?.version ?? null) !== version) return false; set(key, body); return true; },
  };
  return { objects, set, adapter, catalog: () => JSON.parse(objects.get("catalog.json").body) };
}

before(async () => {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "ffpublish-test-"));
  archive = packFixture("first");
  files = await readArchivePackage(archive);
});
after(() => { if (temp) fs.rmSync(temp, { recursive: true, force: true }); });

describe("immutable package publisher", () => {
  it("plans referenced shipped media without inventing a public serving root", async () => {
    const archive = packFixture("shipped-media", "open", "kiln-ferry", (tile) => {
      tile.titleImageUrl = "assets/fixture-card.png";
    });
    const raw = await readArchivePackage(archive);
    const plan = planPublishPackage({ files: raw });
    assert.ok(plan.objects.some((object) => object.key.endsWith("/assets/fixture-card.png")));
    const result = await publishPackagePlan(plan, { dryRun: true });
    assert.equal(result.ok, true);
    assert.deepEqual(result.wrote, []);
  });

  it("carries validated current display, module, sponsor and entitlement metadata through the catalog loader", async () => {
    const current = planPublishPackage({ files: editRelease(files, (tile) => {
      tile.title = "Current sponsored lesson";
      tile.summary = "Current release summary.";
      tile.access = "paid";
      tile.mission.access = "paid";
      tile.module = "Current module";
      tile.lesson = 2;
      tile.totalLessons = 3;
      tile.sponsorName = "Current sponsor";
      tile.entitlement = "catalog.free";
    }) });
    const store = memoryStore(null);
    await publishPackagePlan(current, { adapter: store.adapter });
    const reader = async (key) => {
      const row = await store.adapter.readObject(key);
      assert.ok(row, key);
      return row.body;
    };
    const loadCatalog = () => catalogFromObjectReader(async (key) => (await reader(key)).toString());
    const catalog = await loadCatalog();
    assert.equal(catalog.ok, true);
    assert.deepEqual(catalog.errors, []);
    for (const row of [current.entries[0], store.catalog().quests[0], catalog.quests[0]]) {
      for (const [key, value] of Object.entries({ title: "Current sponsored lesson", summary: "Current release summary.",
        access: "paid", module: "Current module", lesson: 2, totalLessons: 3,
        sponsorName: "Current sponsor", entitlement: "catalog.free" })) assert.equal(row[key], value, key);
      for (const key of ["tile", "mission", "grounding", "aiTutorContext", "world", "bank"]) assert.equal(row[key], undefined, key);
    }
    const resolver = createHostedPackageResolver({ readBytes: reader, loadCatalog });
    assert.equal((await resolver.resolve(current.entries[0].packageRef)).code, "sign_in_required");
    assert.equal((await resolver.resolve(current.entries[0].packageRef, {
      identity: { enabled: true, signedIn: true }, entitled: false,
    })).ok, true);
  });
  for (const access of ["account", "paid"]) {
    it(`published ${access} metadata gates retained open revisions and removes stale sponsor/free policy`, async () => {
      const store = memoryStore(null);
      const old = planPublishPackage({ files: editRelease(files, (tile) => {
        tile.sponsorName = "Former sponsor";
        tile.sponsorBanner = "Former banner";
        tile.entitlement = "catalog.free";
      }) });
      await publishPackagePlan(old, { adapter: store.adapter });
      const reader = async (key) => {
        const row = await store.adapter.readObject(key);
        if (!row) throw new Error("missing");
        return row.body;
      };
      const loadCatalog = () => catalogFromObjectReader(async (key) => (await reader(key)).toString());
      const resolver = createHostedPackageResolver({ readBytes: reader, loadCatalog });
      assert.equal((await resolver.resolve(old.entries[0].packageRef)).ok, true); // warm old-open cache
      const current = planPublishPackage({ files: editRelease(files, (tile) => {
        tile.access = access;
        tile.mission.access = access;
        tile.title = "Current title";
      }) });
      const stale = store.catalog();
      Object.assign(stale.quests[0], { module: "Removed module", lesson: 1, totalLessons: 4,
        isLearningModule: true, lessons: ["stale"], campaignId: "removed-campaign",
        mission: { access: "open", sponsorName: "Forged stale nested sponsor" }, unknownOldField: true });
      store.set("catalog.json", Buffer.from(JSON.stringify(stale)));
      await publishPackagePlan(current, { adapter: store.adapter });
      const row = store.catalog().quests[0];
      assert.equal(row.title, "Current title");
      assert.equal(row.access, access);
      assert.equal(row.sponsorName, undefined);
      assert.equal(row.sponsorBanner, undefined);
      assert.equal(row.entitlement, undefined);
      for (const privateField of ["tile", "mission", "grounding", "aiTutorContext", "world", "bank",
        "module", "lesson", "totalLessons", "isLearningModule", "lessons", "campaignId", "unknownOldField"]) assert.equal(row[privateField], undefined);
      const catalog = await loadCatalog();
      assert.equal(catalog.quests[0].access, access);
      assert.equal((await resolver.resolve(old.entries[0].packageRef)).code, "sign_in_required");
      const signedIn = { identity: { enabled: true, signedIn: true } };
      const insufficient = await resolver.resolve(old.entries[0].packageRef, signedIn);
      assert.equal(insufficient.ok, access === "account");
      if (access === "paid") assert.equal(insufficient.code, "content_required");
      assert.equal((await resolver.resolve(old.entries[0].packageRef, { ...signedIn, entitled: true })).ok, true);
    });
  }

  for (const [gate, edit] of [
    ["craft", (tile) => { delete tile.grounding; delete tile.mission.grounding; }],
    ["economy", (tile) => { tile.mission.collapseYear = tile.mission.startYear; }],
  ]) {
    it(`rejects ${gate} failures before adapter load or any adapter/network call, including dry-run`, async () => {
      const bad = editRelease(files, edit);
      let touched = 0;
      const adapter = new Proxy({}, { get() { touched++; throw new Error("adapter touched"); } });
      assert.throws(() => planPublishPackage({ files: bad }), new RegExp(gate, "i"));
      await assert.rejects(publishPackagePlan({ files: bad }, { adapter }), new RegExp(gate, "i"));
      for (const flags of [[], ["--dry-run"]]) {
        await assert.rejects(main([archive, ...flags], {
          readArchive: async () => bad,
          loadAdapter: async () => { touched++; throw new Error("adapter loaded"); }, stdout: () => {},
        }), new RegExp(gate, "i"));
      }
      // Genuine archive verification succeeds: authoring acceptance is a
      // separate gate and must still reject before loading the live adapter.
      const rejectedArchive = packFixture(`rejected-${gate}`, "open", "kiln-ferry", edit);
      await readArchivePackage(rejectedArchive);
      await assert.rejects(main([rejectedArchive], {
        loadAdapter: async () => { touched++; throw new Error("adapter loaded"); }, stdout: () => {},
      }), new RegExp(gate, "i"));
      assert.equal(touched, 0);
    });
  }
  it("plans verified bytes and dry-runs with no adapter/credentials/network", async () => {
    const plan = planPublishPackage({ files, prefix: "private/quests" });
    const result = await publishPackagePlan(plan, { dryRun: true });
    assert.equal(result.ok, true);
    assert.equal(result.plan.objects.length, Object.keys(files).length);
    for (const row of result.plan.objects) assert.match(row.key, /^private\/quests\/packages\//);
    const cli = spawnSync(process.execPath, [path.join(ROOT, "scripts/publish-quest-package.mjs"), archive, "--dry-run"], {
      encoding: "utf8", env: { ...process.env, AWS_ENDPOINT_URL_S3: "", AWS_ACCESS_KEY_ID: "", AWS_SECRET_ACCESS_KEY: "" },
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).dryRun, true);
  });

  it("uploads every raw byte, verifies exact readback, preserves catalog and retries idempotently", async () => {
    const plan = planPublishPackage({ files });
    const store = memoryStore();
    const first = await publishPackagePlan(plan, { adapter: store.adapter });
    assert.equal(first.wrote.length, plan.objects.length);
    for (const row of plan.objects) assert.deepEqual(store.objects.get(row.key).body, row.body);
    const next = await publishPackagePlan(plan, { adapter: store.adapter });
    assert.deepEqual(next.wrote, []);
    assert.equal(store.catalog().marker, "retain metadata");
    assert.deepEqual(store.catalog().quests.map((row) => row.id), ["old", "kiln-ferry-test"]);
    assert.deepEqual(store.catalog().quests[1].packageRef, plan.entries[0].packageRef);
  });

  for (const failure of ["upload", "readback", "conflicting existing bytes", "racing immutable create"]) {
    it(`${failure} never promotes or changes the old catalog`, async () => {
      const plan = planPublishPackage({ files });
      const store = memoryStore();
      const old = Buffer.from(store.objects.get("catalog.json").body);
      const target = plan.objects[1].key;
      if (failure === "conflicting existing bytes") store.set(target, Buffer.from("conflict"));
      const adapter = { ...store.adapter, createObject: async (key, body) => {
        if (key === target) {
          if (failure === "upload") throw new Error("injected upload failure");
          if (failure === "readback") { store.set(key, Buffer.from("corruption")); return true; }
          if (failure === "racing immutable create") { store.set(key, Buffer.from("racing conflict")); return false; }
        }
        return store.adapter.createObject(key, body);
      } };
      await assert.rejects(publishPackagePlan(plan, { adapter }), /failure|readback|conflict/i);
      assert.deepEqual(store.objects.get("catalog.json").body, old);
    });
  }

  it("immutable manifest metadata conflicts fail rather than overwrite the same content revision", async () => {
    const original = planPublishPackage({ files });
    const manifest = JSON.parse(files["manifest.json"]);
    manifest.createdAt = "2000-01-01T00:00:00Z";
    const changed = planPublishPackage({ files: { ...files, "manifest.json": Buffer.from(JSON.stringify(manifest)) } });
    assert.equal(changed.revision, original.revision);
    const store = memoryStore();
    await publishPackagePlan(original, { adapter: store.adapter });
    const old = Buffer.from(store.objects.get("catalog.json").body);
    await assert.rejects(publishPackagePlan(changed, { adapter: store.adapter }), /Immutable object conflict/);
    assert.deepEqual(store.objects.get("catalog.json").body, old);
  });

  it("failed object reads are not treated as absent and never promote", async () => {
    const plan = planPublishPackage({ files });
    const store = memoryStore();
    const old = Buffer.from(store.objects.get("catalog.json").body);
    let creates = 0;
    await assert.rejects(publishPackagePlan(plan, { adapter: {
      ...store.adapter,
      readObject: async (key) => { if (key !== "catalog.json") throw new Error("permission denied"); return store.adapter.readObject(key); },
      createObject: async () => { creates++; return true; },
    } }), /permission denied/);
    assert.equal(creates, 0);
    assert.deepEqual(store.objects.get("catalog.json").body, old);
  });

  it("resumes partial uploads after failure without overwriting completed objects", async () => {
    const plan = planPublishPackage({ files });
    const store = memoryStore();
    let calls = 0;
    await assert.rejects(publishPackagePlan(plan, { adapter: { ...store.adapter, createObject: async (key, body) => {
      if (++calls === 2) throw new Error("offline");
      return store.adapter.createObject(key, body);
    } } }), /offline/);
    const retained = store.objects.get(plan.objects[0].key).version;
    await publishPackagePlan(plan, { adapter: store.adapter });
    assert.equal(store.objects.get(plan.objects[0].key).version, retained);
  });

  it("CAS retry re-merges another publisher's entries and metadata", async () => {
    const store = memoryStore();
    let calls = 0;
    const adapter = { ...store.adapter, compareAndSwap: async (key, body, version) => {
      if (++calls === 1) {
        const current = store.catalog();
        current.concurrent = true;
        current.quests.push({ id: "other", file: "other.json" });
        store.set(key, Buffer.from(JSON.stringify(current)));
      }
      return store.adapter.compareAndSwap(key, body, version);
    } };
    const result = await publishPackagePlan(planPublishPackage({ files }), { adapter });
    assert.equal(result.attempts, 2);
    assert.equal(store.catalog().concurrent, true);
    assert.deepEqual(store.catalog().quests.map((row) => row.id), ["old", "other", "kiln-ferry-test"]);
  });

  it("concurrent publishers retain both independently verified releases", async () => {
    const other = await readArchivePackage(packFixture("second", "open", "harbor-clock"));
    const a = planPublishPackage({ files });
    const b = planPublishPackage({ files: other });
    const store = memoryStore(null);
    await Promise.all([publishPackagePlan(a, { adapter: store.adapter }), publishPackagePlan(b, { adapter: store.adapter })]);
    assert.deepEqual(store.catalog().quests.map((row) => row.id).sort(), ["harbor-clock-test", "kiln-ferry-test"]);
    for (const row of [...a.objects, ...b.objects]) assert.deepEqual(store.objects.get(row.key).body, row.body);
  });

  it("bounds conflicts without changing catalog, retaining uploads for retry", async () => {
    const plan = planPublishPackage({ files });
    const store = memoryStore();
    const old = Buffer.from(store.objects.get("catalog.json").body);
    await assert.rejects(publishPackagePlan(plan, { adapter: { ...store.adapter, compareAndSwap: async () => false }, maxAttempts: 2 }), /conflict after 2/);
    assert.deepEqual(store.objects.get("catalog.json").body, old);
    assert.equal(store.objects.size, plan.objects.length + 1);
  });

  it("rejects access override, accepts a repacked new revision and retains the old release", async () => {
    assert.throws(() => planPublishPackage({ files, access: "paid" }), /NEW content revision/);
    const paid = await readArchivePackage(packFixture("paid", "paid"));
    const oldPlan = planPublishPackage({ files });
    const newPlan = planPublishPackage({ files: paid });
    assert.notEqual(oldPlan.revision, newPlan.revision);
    const store = memoryStore();
    await publishPackagePlan(oldPlan, { adapter: store.adapter });
    await publishPackagePlan(newPlan, { adapter: store.adapter });
    assert.equal(store.catalog().quests.find((row) => row.id === "kiln-ferry-test").packageRef.revision, newPlan.revision);
    for (const row of oldPlan.objects) assert.deepEqual(store.objects.get(row.key).body, row.body);
  });

  it("rolls back by selecting a retained verified release without overwriting any immutable bytes", async () => {
    const previous = planPublishPackage({ files });
    const current = planPublishPackage({ files: editRelease(files, tile => { tile.title = "Updated release"; }) });
    const store = memoryStore();
    await publishPackagePlan(previous, { adapter: store.adapter });
    await publishPackagePlan(current, { adapter: store.adapter });
    const immutable = new Map([...store.objects].filter(([key]) => key !== "catalog.json")
      .map(([key, row]) => [key, { body: Buffer.from(row.body), version: row.version }]));
    const result = await publishPackagePlan(previous, { adapter: store.adapter });
    assert.deepEqual(result.wrote, []);
    assert.deepEqual(store.catalog().quests.find(row => row.id === previous.entries[0].id).packageRef, previous.entries[0].packageRef);
    for (const [key, row] of immutable) assert.deepEqual(store.objects.get(key), row);
    const loadCatalog = () => catalogFromObjectReader(async key => (await store.adapter.readObject(key)).body.toString());
    const resolver = createHostedPackageResolver({ readBytes: async key => (await store.adapter.readObject(key)).body, loadCatalog });
    assert.equal((await resolver.resolve(previous.entries[0].packageRef)).ok, true);
    assert.equal((await resolver.resolve(current.entries[0].packageRef)).ok, true, "newer retained runs also survive rollback");
  });

  it("fails closed for non-CAS adapters and malformed catalogs", async () => {
    const plan = planPublishPackage({ files });
    await assert.rejects(publishPackagePlan(plan, { adapter: { upload: async () => {} } }), /Atomic CAS adapter/);
    const store = memoryStore();
    store.set("catalog.json", Buffer.from('{"quests":null}'));
    await assert.rejects(publishPackagePlan(plan, { adapter: store.adapter }), /malformed/);
    assert.equal(store.objects.size, 1);
  });

  it("rejects corrupt bytes, unlisted dependencies and v1 explicitly before adapter load", async () => {
    const corrupt = { ...files, [Object.keys(files).find((name) => name !== "manifest.json")]: Buffer.from("bad") };
    assert.throws(() => planPublishPackage({ files: corrupt }), /revision/);
    assert.throws(() => planPublishPackage({ files: { ...files, "assets/unlisted.bin": Buffer.from([0, 255]) } }), /exactly/);
    const legacy = { "manifest.json": Buffer.from(JSON.stringify({ version: 1, schema: "future-forge.quest-package/v1" })) };
    assert.throws(() => planPublishPackage({ files: legacy }), /v1.*unsupported.*repack/);
    let loaded = false;
    await assert.rejects(main([archive], { readArchive: async () => corrupt, loadAdapter: async () => { loaded = true; } }), /revision/);
    assert.equal(loaded, false);
    const invalid = path.join(temp, "broken.ffquest");
    fs.writeFileSync(invalid, "not a ZIP");
    await assert.rejects(main([invalid], { loadAdapter: async () => { loaded = true; } }), /verify failed/);
    assert.equal(loaded, false);
  });

  it("offline injected CLI never loads credentials/writer; live mode clearly reports missing production adapter", async () => {
    let called = false;
    const result = await main([archive, "--dry-run"], { loadAdapter: async () => { called = true; throw new Error("must not load"); }, stdout: () => {} });
    assert.equal(called, false);
    assert.equal(result.plan.objects.length, Object.keys(files).length);
    await assert.rejects(main([archive], { stdout: () => {} }), /No production CAS adapter configured/);
    const store = memoryStore();
    await main([archive], { loadAdapter: async () => store.adapter, stdout: () => {} });
    assert.equal(store.catalog().quests.some((row) => row.id === "kiln-ferry-test"), true);
  });
});
