import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { planLooseQuests, publishLooseQuests } from "./publish-loose-quest.mjs";
import { catalogFromObjectReader } from "./quest-object-storage.mjs";
import { main } from "../../scripts/publish-loose-quests.mjs";

const load = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const digest = b => createHash("sha256").update(b).digest("hex");
async function fixture() {
  const template = await load("../../test/fixtures/quests/companion-moonshots-304.json");
  const stub = await load("../../test/fixtures/packages/self-contained-worlds/quests/kiln-ferry-test.json");
  const tile = { ...template, ...stub, access: "paid", title: "Café fixture", mission: { ...template.mission, id: stub.id, title: "Café fixture" } };
  delete tile.titleImageUrl; delete tile.briefBeats; delete tile.mission.briefBeats;
  tile.companion = { ...template.companion, ...stub.companion,
    source: { ...template.companion.source, title: "Synthetic test source", show: "Test fixture", speaker: "Test fixture speaker", url: "https://example.com/synthetic-test" },
    interpretation: "Invented test claims, not a real source attribution.",
    exploration: { ...stub.companion.exploration, challenges: Object.fromEntries(["nature", "moloch", "ethicist", "stakeholder"].map(angle => [angle, { connection: "A fictional bounded grant.", question: "What happens outside the grant?" }])) } };
  delete tile.companion.quote;
  const bank = await readFile(new URL("../../test/fixtures/packages/self-contained-worlds/predictions/kiln-ferry-bank.json", import.meta.url));
  tile.predictionBankRef = { id: tile.predictionBankId, sha256: digest(bank) };
  const raw = Buffer.from(JSON.stringify(tile, null, 1) + "\n");
  return { raw, tile, bank, plans: await planLooseQuests({ quests: [raw], prefix: "private", readBank: async () => bank }) };
}
function memory(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, Buffer.from(v)]));
  return { map, exists: async k => map.has(k), read: async k => { if (!map.has(k)) throw Error("missing"); return Buffer.from(map.get(k)); }, write: async (k, b) => map.set(k, Buffer.from(b)) };
}
test("exact immutable bytes, metadata and catalog survive migration and resolve", async () => {
  const { plans, raw, tile } = await fixture();
  const legacy = { ...tile, access: "paid", entitlement: "catalog.free", sponsorName: "Example" };
  const other = { id: "other", file: "other.json", custom: 123 };
  const adapter = memory({ "private/catalog.json": JSON.stringify({ version: 9, quests: [other, { id: tile.id, file: "old.json", custom: "keep" }] }), "private/old.json": JSON.stringify(legacy) });
  const result = await publishLooseQuests(plans, { adapter, prefix: "private", readPublicBank: async () => plans[0].bankBytes });
  assert.deepEqual(adapter.map.get(result.quests[0].key), raw);
  const cat = JSON.parse(adapter.map.get("private/catalog.json"));
  assert.equal(cat.version, 9); assert.deepEqual(cat.quests[0], other);
  assert.equal(cat.quests[1].access, "paid"); assert.equal(cat.quests[1].entitlement, plans[0].card.entitlement); assert.equal(cat.quests[1].sponsorName, plans[0].card.sponsorName); assert.equal(cat.quests[1].custom, undefined);
  assert.equal(cat.quests[1].storage, "loose-v2"); assert.equal(cat.quests[1].packageRef.revision, `sha256:${digest(raw)}`);
  assert.equal((await catalogFromObjectReader(async k => (await adapter.read(k)).toString(), { prefix: "private" })).quests.find(x => x.id === tile.id).access, "paid");
  await publishLooseQuests(plans, { adapter, prefix: "private", readPublicBank: async () => plans[0].bankBytes });
  const updated = JSON.parse(adapter.map.get("private/catalog.json")).quests[1];
  assert.equal(updated.access, "paid"); assert.equal(updated.entitlement, plans[0].card.entitlement); assert.equal(updated.custom, undefined);
});
test("reject invalid bank, duplicate ids, invalid ref and unsafe prefix before writing", async () => {
  const { raw, tile, bank } = await fixture();
  await assert.rejects(planLooseQuests({ quests: [raw], readBank: async () => Buffer.from("wrong") }), /integrity/);
  await assert.rejects(planLooseQuests({ quests: [raw, raw], readBank: async () => bank }), /conflict/);
  const bad = Buffer.from(JSON.stringify({ ...tile, predictionBankRef: { id: "../bad", sha256: digest(bank) } }));
  await assert.rejects(planLooseQuests({ quests: [bad], readBank: async () => { throw Error("must not read"); } }), /reference/);
  await assert.rejects(planLooseQuests({ quests: [raw], prefix: "../bad", readBank: async () => bank }), /forbidden/);
});
test("conflicts and corrupt readback fail closed", async () => {
  const { plans, tile } = await fixture();
  const readPublicBank = async () => plans[0].bankBytes;
  const conflict = memory({ "private/catalog.json": JSON.stringify({ quests: [{ id: tile.id }, { id: tile.id }] }) });
  await assert.rejects(publishLooseQuests(plans, { adapter: conflict, prefix: "private", readPublicBank }), /catalog_id_conflict/);
  const object = memory({ [plans[0].key]: "bad" });
  await assert.rejects(publishLooseQuests(plans, { adapter: object, prefix: "private", readPublicBank }), /immutable_object_conflict/);
  const changed = memory({ "private/catalog.json": JSON.stringify({ quests: [] }) });
  const origWrite = changed.write; changed.write = async (k, b) => { await origWrite(k, b); if (k !== "private/catalog.json") changed.map.set("private/catalog.json", Buffer.from('{"quests":[],"changed":true}')); };
  await assert.rejects(publishLooseQuests(plans, { adapter: changed, prefix: "private", readPublicBank }), /catalog_changed/);
  const corruptQuest = memory(); const questWrite = corruptQuest.write; corruptQuest.write = async (k, b) => questWrite(k, Buffer.from("broken"));
  await assert.rejects(publishLooseQuests(plans, { adapter: corruptQuest, prefix: "private", readPublicBank }), /quest_readback_mismatch/);
  assert.equal(corruptQuest.map.has("private/catalog.json"), false);
  const broken = memory(); const write = broken.write; broken.write = async (k, b) => write(k, k.endsWith("catalog.json") ? Buffer.from("broken") : b);
  await assert.rejects(publishLooseQuests(plans, { adapter: broken, prefix: "private", readPublicBank }), /catalog_readback_mismatch/);
});
test("public bank must be present and byte-identical before any storage writes", async () => {
  const { plans } = await fixture();
  const adapter = memory();
  await assert.rejects(publishLooseQuests(plans, { adapter }), /public_bank_reader_required/);
  await assert.rejects(publishLooseQuests(plans, { adapter, readPublicBank: async () => { throw Error("404"); } }), /public_bank_unavailable/);
  await assert.rejects(publishLooseQuests(plans, { adapter, readPublicBank: async () => Buffer.from("bad") }), /public_bank_mismatch/);
  assert.equal(adapter.map.size, 0);
});
test("CLI dry-run reads projected banks offline and never creates adapter", async t => {
  const { raw, tile, bank } = await fixture();
  const dir = await mkdtemp(path.join(os.tmpdir(), "loose-test-")); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, "quests"), { recursive: true });
  await mkdir(path.join(dir, "predictions", tile.predictionBankId), { recursive: true });
  await writeFile(path.join(dir, "quests", "q.json"), raw);
  await writeFile(path.join(dir, "quests", "module.json"), JSON.stringify({ id: "module", kind: "module" }));
  await writeFile(path.join(dir, "predictions", tile.predictionBankId, `${digest(bank)}.json`), bank);
  await assert.rejects(main([dir, "--dry-run", "--prefix", "private"], { adapterFactory: () => { throw Error("adapter used"); }, stdout: () => {} }), /refusing partial publication/);
  await rm(path.join(dir, "quests", "module.json"));
  const result = await main([dir, "--dry-run", "--prefix", "private"], { adapterFactory: () => { throw Error("adapter used"); }, stdout: () => {} });
  assert.equal(result.quests.length, 1); assert.deepEqual(result.skipped, []);
  const before = process.env.AWS_ENDPOINT_URL_S3;
  try {
    process.env.AWS_ENDPOINT_URL_S3 = "https://other.invalid";
    await assert.rejects(main([dir], { adapterFactory: () => { throw Error("adapter used"); }, stdout: () => {} }), /production main branch/);
  } finally {
    if (before === undefined) delete process.env.AWS_ENDPOINT_URL_S3;
    else process.env.AWS_ENDPOINT_URL_S3 = before;
  }
});
