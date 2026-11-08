/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { packageRevision } from "../package-identity.js";
import { packageObjectKey } from "./package-paths.mjs";
import { createHostedPackageResolver, createHostedPackageResolverFromEnv, createApprovedRemoteObjectReader, readHostedPackageRelease } from "./hosted-package-resolver.mjs";
import { createPublicRoutes } from "../../portal/functions/public-routes.mjs";
import { createPublicBankReader } from "./loose-quest-release.mjs";
import { catalogFromObjectReader } from "./quest-object-storage.mjs";
import { resolveStartPackageBinding, resolveRunPackageBinding } from "./run-package-binding.mjs";

const json = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const hash = (body) => createHash("sha256").update(body).digest("hex");
function fixture(label = "Original", withLinks = false) {
  const prefix = "private";
  const template = json("../../test/fixtures/quests/companion-moonshots-304.json");
  const members = {};
  const quests = [];
  const predictions = [];
  for (const [id, bankId, access] of [["kiln-ferry-test", "kiln-ferry-bank", "open"], ["harbor-clock-test", "harbor-clock-bank", "paid"]]) {
    const stub = json(`../../test/fixtures/packages/self-contained-worlds/quests/${id}.json`);
    const tile = { ...structuredClone(template), ...stub, access, title: `${label} ${id}` };
    tile.mission = { ...template.mission, id, title: tile.title };
    delete tile.titleImageUrl;
    delete tile.briefBeats;
    delete tile.mission.briefBeats;
    if (withLinks) {
      tile.titleImageUrl = "assets/chart.png";
      tile.mission.briefMd += "\n\n[Lesson](lessons/start.html#begin) ![Chart](assets/binary.bin)";
      tile.aiTutorContext = "Read [the lesson](lessons/start.html).";
    }
    tile.companion = { ...template.companion, ...stub.companion,
      source: { ...template.companion.source, title: "Synthetic test source", show: "Test fixture", speaker: "Test fixture speaker", url: "https://example.com/synthetic-test" },
      interpretation: "Invented test claims, not a real source attribution.",
      exploration: { ...stub.companion.exploration,
        challenges: Object.fromEntries(["nature", "moloch", "ethicist", "stakeholder"].map((angle) => [angle, {
          connection: "A fictional bounded grant.", question: "What happens outside the grant?" }])) } };
    delete tile.companion.quote;
    members[`quests/${id}.json`] = Buffer.from(JSON.stringify(tile));
    members[`predictions/${bankId}.json`] = Buffer.from(JSON.stringify(json(`../../test/fixtures/packages/self-contained-worlds/predictions/${bankId}.json`)));
    quests.push({ id, kind: "quest", file: `quests/${id}.json`, predictionBankId: bankId });
    predictions.push({ id: bankId, file: `predictions/${bankId}.json` });
  }
  members["assets/binary.bin"] = Buffer.from([0, 255, 128, 13, 10]);
  if (withLinks) members["assets/chart.png"] = Buffer.from([137, 80, 78, 71, 255, 128]);
  if (withLinks) members["lessons/start.html"] = Buffer.from("<!doctype html><h1 id='begin'>Lesson</h1>");
  const hashes = Object.fromEntries(Object.entries(members).map(([name, body]) => [name, `sha256:${hash(body)}`]));
  const schema = "future-forge.quest-package/v2";
  const revision = packageRevision(schema, "test-worlds", Object.entries(hashes).map(([path, digest]) => ({ path, digest })), hash);
  const ref = { packageId: "test-worlds", revision, questId: "kiln-ferry-test" };
  const files = Object.fromEntries(Object.entries(members).map(([name, body]) => [packageObjectKey(prefix, ref, name), body]));
  files[packageObjectKey(prefix, ref, "manifest.json")] = Buffer.from(JSON.stringify({ schema, version: 2, id: ref.packageId, revision, quests, predictions, files: hashes }));
  const catalog = { ok: true, quests: quests.map((quest) => ({ id: quest.id, title: quest.id, source: "remote", access: quest.id === ref.questId ? "open" : "paid", packageRef: { ...ref, questId: quest.id } })) };
  return { files, ref, prefix, catalog };
}
function setup(f = fixture(), options = {}) {
  let catalog = f.catalog;
  const reads = [];
  const readBytes = async (key) => { reads.push(key); if (!Object.hasOwn(f.files, key)) throw Error("missing"); return f.files[key]; };
  const resolver = createHostedPackageResolver({ readBytes, prefix: f.prefix, loadCatalog: async () => catalog, ...options });
  return { ...f, resolver, reads, readBytes, setCatalog(value) { catalog = value; } };
}
const guest = { enabled: true, signedIn: false };
const signed = { enabled: true, signedIn: true, userId: "user_test" };

test("hosted release keeps binary hashes and only selected quest world, immutable cached bytes cannot be changed through results", async () => {
  const f = setup();
  const got = await f.resolver.resolve(f.ref, { identity: guest });
  assert.equal(got.ok, true, JSON.stringify(got));
  assert.equal(got.bank.id, "kiln-ferry-bank");
  assert.equal(got.record.mission.runWorld.bank.id, "kiln-ferry-bank");
  assert.equal(JSON.stringify(got).includes("harbor-clock"), false);
  got.bank.id = "mutated";
  const reads = f.reads.length;
  const again = await f.resolver.resolve(f.ref, { identity: guest });
  assert.equal(again.bank.id, "kiln-ferry-bank");
  assert.equal(f.reads.length, reads);
});

test("current membership and billing are rechecked after cache warm, including mixed-access members", async () => {
  const f = setup();
  assert.equal((await f.resolver.resolve(f.ref, { identity: guest })).ok, true);
  const paidRef = { ...f.ref, questId: "harbor-clock-test" };
  assert.equal((await f.resolver.resolve(paidRef, { identity: signed, entitled: true })).ok, true);
  const denied = await f.resolver.resolve(paidRef, { identity: signed, entitled: false });
  assert.equal(denied.code, "content_required");
  assert.equal(denied.record.mission, undefined);
  assert.equal(JSON.stringify(denied).includes("predictions"), false);
  f.setCatalog({ ok: true, quests: [] });
  assert.equal((await f.resolver.resolve(f.ref, { identity: signed, entitled: true })).code, "package_reference_forbidden");
});

test("old revision remains addressable when latest differs; identical quest ids do not alias revisions", async () => {
  const first = fixture();
  const next = fixture("Next");
  Object.assign(first.files, next.files);
  first.catalog = next.catalog;
  const f = setup(first);
  const old = await f.resolver.resolve(first.ref, { identity: guest });
  const latest = await f.resolver.resolve(next.ref, { identity: guest });
  assert.equal(old.ok, true, JSON.stringify(old));
  assert.equal(latest.ok, true);
  assert.notEqual(old.packageRef.revision, latest.packageRef.revision);
  assert.match(old.record.title, /Original/);
  assert.match(latest.record.title, /Next/);
});

test("missing and tampered dependencies fail closed and are not cached", async () => {
  const f = setup();
  const key = Object.keys(f.files).find((name) => name.endsWith("assets/binary.bin"));
  const original = f.files[key];
  delete f.files[key];
  assert.equal((await f.resolver.resolve(f.ref)).code, "package_dependency_missing");
  f.files[key] = Buffer.from([0, 255]);
  assert.equal((await f.resolver.resolve(f.ref)).code, "package_integrity_failed");
  f.files[key] = original;
  assert.equal((await f.resolver.resolve(f.ref)).ok, true);
  delete f.files[packageObjectKey(f.prefix, f.ref, "manifest.json")];
  assert.equal((await readHostedPackageRelease(f.readBytes, f.ref, { prefix: f.prefix })).code, "package_revision_unavailable");
});

test("unsafe references and manifest members never reach an object reader", async () => {
  const f = setup();
  assert.equal((await f.resolver.resolve({ ...f.ref, packageId: "../bad" })).code, "package_reference_forbidden");
  assert.equal(f.reads.length, 0);
  const key = packageObjectKey(f.prefix, f.ref, "manifest.json");
  const manifest = JSON.parse(f.files[key]);
  manifest.files["../secret"] = "sha256:bad";
  f.files[key] = Buffer.from(JSON.stringify(manifest));
  assert.equal((await f.resolver.resolve(f.ref)).code, "package_integrity_failed");
  assert.equal(f.reads.length, 1);
});

test("approved HTTPS reader preserves raw bytes and refuses paths, credentials, redirects", async () => {
  const calls = [];
  const reader = createApprovedRemoteObjectReader({ catalogUrl: "https://approved.example/quests/catalog.json", fetchImpl: async (url, opts) => {
    calls.push({ url, opts }); return new Response(Uint8Array.from([0, 255, 128]));
  } });
  assert.deepEqual(await reader("packages/test/object.bin"), Buffer.from([0, 255, 128]));
  assert.equal(calls[0].url, "https://approved.example/quests/packages/test/object.bin");
  assert.equal(calls[0].opts.redirect, "error");
  for (const key of ["../private", "https://evil.example/a", "/outside", "a%2fb", "a\\b"])
    await assert.rejects(reader(key));
  for (const catalogUrl of ["file:///catalog.json", "http://example.com/catalog.json", "https://u:p@example.com/catalog.json"])
    assert.throws(() => createApprovedRemoteObjectReader({ catalogUrl }));
  assert.equal(calls.length, 1);
});

test("environment factory and Functions default resolver use the configured private prefix without network", async () => {
  const f = setup();
  f.files["private/catalog.json"] = Buffer.from(JSON.stringify(f.catalog));
  const env = { FF_QUESTS_BUCKET: "offline", FF_QUESTS_OBJECT_PREFIX: "private" };
  const resolver = createHostedPackageResolverFromEnv({ env, readBytes: f.readBytes });
  assert.equal((await resolver.resolve(f.ref)).ok, true);
  const routes = createPublicRoutes({ env, loadCatalog: async () => f.catalog, readPackageBytes: f.readBytes });
  const response = await routes.fetch(new Request("https://cloud.warmersun.com/api/quests/kiln-ferry-test"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).tile.mission.runWorld.bank.id, "kiln-ferry-bank");
  const disabled = createHostedPackageResolverFromEnv({ env: { FF_QUESTS_REMOTE_URL: "off" }, fetchImpl: () => { throw Error("must not fetch"); } });
  assert.equal((await disabled.resolve(f.ref)).code, "package_catalog_unavailable");
});

test("Functions package listing is slim; selected mission world is resolved and caller access flags ignored", async () => {
  const f = setup();
  let paid = true;
  const routes = createPublicRoutes({ env: { CLERK_SECRET_KEY: "offline", CLERK_PUBLISHABLE_KEY: "pk_test_offline" },
    db: { query: async () => ({ rows: paid ? [{ status: "active", plan_slug: "cloud", period_end: new Date("2099-01-01") }] : [] }) },
    verifyClerk: async () => ({ sub: "user_2y5HvnY8gQd1" }), loadCatalog: async () => f.catalog, packageResolver: f.resolver });
  const req = (path, signedIn = false) => routes.fetch(new Request(`https://cloud.warmersun.com${path}`, { headers: signedIn ? { Authorization: "Bearer eyJoffline.payload.signature" } : {} }));
  const listing = await (await req("/api/quests")).json();
  assert.equal(listing.quests[0].mission, undefined);
  assert.equal(f.reads.length, 0);
  const open = await (await req("/api/quests/kiln-ferry-test")).json();
  assert.equal(open.tile.mission.runWorld.bank.id, "kiln-ferry-bank");
  assert.equal(JSON.stringify(open).includes("harbor-clock"), false);
  assert.equal((await req("/api/quests/harbor-clock-test?entitled=true&access=open")).status, 401);
  assert.equal((await req("/api/quests/harbor-clock-test", true)).status, 200);
  paid = false;
  const denied = await req("/api/quests/harbor-clock-test?entitled=true", true);
  assert.equal(denied.status, 402);
  assert.equal(JSON.stringify(await denied.json()).includes("predictions"), false);
});

test("configured delivery projects media, lesson and tutor links without rewriting immutable release bytes", async () => {
  const f = setup(fixture("Links", true), { deliveryRoot: "https://media.example/content/" });
  const before = Object.fromEntries(Object.entries(f.files).map(([key, body]) => [key, Buffer.from(body)]));
  const result = await f.resolver.resolve(f.ref);
  assert.equal(result.ok, true, JSON.stringify(result));
  const root = `https://media.example/content/${packageObjectKey(f.prefix, f.ref)}/`;
  assert.equal(result.deliveryRoot, root);
  assert.equal(result.record.mission.titleImageUrl, `${root}assets/chart.png`);
  assert.ok(result.record.mission.briefMd.includes(`${root}lessons/start.html#begin`));
  assert.ok(result.record.mission.briefMd.includes(`${root}assets/binary.bin`));
  assert.ok(result.record.mission.aiTutorContext.includes(`${root}lessons/start.html`));
  assert.equal(result.revision, f.ref.revision);
  assert.equal(JSON.stringify(result).includes("harbor-clock"), false);
  for (const key of Object.keys(before)) assert.deepEqual(f.files[key], before[key]);
  result.record.mission.titleImageUrl = "changed";
  assert.equal((await f.resolver.resolve(f.ref)).record.mission.titleImageUrl, `${root}assets/chart.png`);
  const loaded = await readHostedPackageRelease(f.readBytes, f.ref, { prefix: f.prefix, deliveryRoot: "https://media.example/content/" });
  assert.deepEqual(loaded.files[packageObjectKey(f.prefix, f.ref, "assets/binary.bin")], Buffer.from([0, 255, 128, 13, 10]));
});

test("shipped links require explicit delivery configuration; a private bucket never implies public delivery", async () => {
  const f = setup(fixture("Links", true));
  assert.equal((await f.resolver.resolve(f.ref)).code, "package_delivery_root_required");
  const env = { FF_QUESTS_BUCKET: "offline", FF_QUESTS_OBJECT_PREFIX: f.prefix };
  const factory = (extra) => createHostedPackageResolverFromEnv({ env: { ...env, ...extra }, readBytes: f.readBytes, loadCatalog: async () => f.catalog });
  assert.equal((await factory({}).resolve(f.ref)).code, "package_delivery_root_required");
  const got = await factory({ FF_QUEST_PACKAGE_DELIVERY_ROOT: "https://served.example/" }).resolve(f.ref);
  assert.equal(got.ok, true);
  assert.equal(got.record.mission.titleImageUrl, `https://served.example/${packageObjectKey(f.prefix, f.ref)}/assets/chart.png`);
  assert.equal((await factory({ FF_QUEST_PACKAGE_DELIVERY_ROOT: "http://unsafe.example/" }).resolve(f.ref)).code, "package_delivery_root_forbidden");
});


test("loose quest revisions pin exact public bank bytes and recheck access", async () => {
  const f = fixture();
  const quest = JSON.parse(f.files[packageObjectKey(f.prefix, f.ref, "quests/kiln-ferry-test.json")]);
  const bank = f.files[packageObjectKey(f.prefix, f.ref, "predictions/kiln-ferry-bank.json")];
  const objects = {}; const banks = {}; const urls = [];
  function release(title, bankBody) {
    const sha256 = hash(bankBody); banks[sha256] = bankBody;
    const body = Buffer.from(JSON.stringify({ ...quest, title, predictionBankRef: { id: quest.predictionBankId, sha256 } }));
    const ref = { packageId: "loose-quest", questId: quest.id, revision: `sha256:${hash(body)}` };
    objects[`private/loose-quests/${ref.questId}/${hash(body)}.json`] = body;
    return ref;
  }
  const old = release("Old", bank);
  const newBank = Buffer.from(JSON.stringify({ ...JSON.parse(bank), name: "changed" }));
  const latest = release("New", newBank);
  let entry = { id: quest.id, title: "New", access: "open", storage: "loose-v2", packageRef: latest };
  const catalog = async () => catalogFromObjectReader(async () => JSON.stringify({ quests: [entry] }), { prefix: "private" });
  const readBank = createPublicBankReader({ root: "https://warmersun.com/predictions/", fetchImpl: async (url, opts) => {
    urls.push(url); assert.equal(opts.redirect, "error");
    return new Response(banks[url.match(/([0-9a-f]{64})\.json$/)[1]]);
  } });
  const resolver = createHostedPackageResolver({ prefix: "private", readBytes: async key => { if (!objects[key]) throw Error(); return objects[key]; }, loadCatalog: catalog, readBank });
  const noConfig = createHostedPackageResolverFromEnv({ env: { FF_QUESTS_BUCKET: "offline", FF_QUESTS_OBJECT_PREFIX: "private" }, loadCatalog: catalog, readBytes: async key => objects[key] });
  assert.equal((await noConfig.resolve(latest)).code, "package_revision_unavailable");
  const noRefCatalog = await catalogFromObjectReader(async () => JSON.stringify({ quests: [{ id: quest.id, storage: "loose-v2", file: "unsafe.json" }] }));
  assert.equal(noRefCatalog.quests.length, 0);
  const resolvePackage = (r) => resolver.resolve(r, { identity: guest });
  const start = await resolveStartPackageBinding({ questId: quest.id }, { loadCatalog: catalog, resolvePackage });
  assert.deepEqual(start.packageRef, latest);
  const previous = await resolvePackage(old);
  assert.equal(previous.ok, true, JSON.stringify(previous));
  assert.equal(previous.record.title, "Old");
  assert.equal(previous.bank.id, quest.predictionBankId);
  assert.match(urls[0], new RegExp(`^https://warmersun\\.com/predictions/${quest.predictionBankId}/[0-9a-f]{64}\\.json$`));
  const routes = createPublicRoutes({ env: {}, loadCatalog: catalog, packageResolver: resolver });
  const response = await routes.fetch(new Request(`https://cloud.warmersun.com/api/quests/${quest.id}`));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).tile.mission.runWorld.bank.id, quest.predictionBankId);
  const runId = "11111111-1111-4111-8111-111111111111";
  const saved = await resolveRunPackageBinding({ runId, questId: quest.id, play: { packageRef: old, mission: { title: "FORGED" } } }, {
    userId: "user_test", loadRun: async () => ({ quest_id: quest.id, packageRef: old }), resolvePackage });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(saved.state.play.mission.title, "Old");
  assert.deepEqual(saved.packageRef, old);
  entry = { ...entry, access: "paid" };
  assert.equal((await resolvePackage(old)).ok, false);
  entry = { ...entry, access: "open" };
  banks[hash(bank)] = Buffer.from("tampered");
  assert.equal((await resolvePackage(old)).code, "package_integrity_failed");
  objects[`private/loose-quests/${old.questId}/${old.revision.slice(7)}.json`] = Buffer.from("tampered");
  assert.equal((await resolvePackage(old)).code, "package_integrity_failed");
});

test("public bank reader refuses malicious roots, refs, redirects and oversized responses", async () => {
  for (const root of ["http://example.com/", "https://u:p@example.com/", "https://example.com/root", "https://example.com/?q=x"]) assert.throws(() => createPublicBankReader({ root }));
  const calls = [];
  const read = createPublicBankReader({ root: "https://warmersun.com/predictions/", maxBytes: 2, fetchImpl: async (url, opts) => { calls.push({url, opts}); return new Response("abc"); } });
  for (const id of ["../bad", "good%2fbad", "https://evil.com", "BAD"]) await assert.rejects(read({ id, sha256: "a".repeat(64) }));
  await assert.rejects(read({ id: "good", sha256: "A".repeat(64) }));
  assert.equal(calls.length, 0);
  await assert.rejects(read({ id: "good", sha256: "a".repeat(64) }));
  assert.equal(calls[0].opts.redirect, "error");
  const redirect = createPublicBankReader({ root: "https://warmersun.com/predictions/", fetchImpl: async () => Response.redirect("https://evil.example/") });
  await assert.rejects(redirect({ id: "good", sha256: "a".repeat(64) }));
});
