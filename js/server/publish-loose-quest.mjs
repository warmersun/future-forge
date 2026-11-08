/* Copyright © 2026 Warmer Sun Education. GPL-3.0-or-later. */
import { createHash } from "node:crypto";
import { resolveLooseQuestRelease } from "./loose-quest-release.mjs";
import { joinObjectKey } from "./quest-object-storage.mjs";
import { parsePackageRef, safePackageMember } from "./package-paths.mjs";
import { catalogCard } from "./cloud-gate.mjs";
import { validateQuestDocument } from "../quest-tile.js";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));

// Uses the actual server resolver to enforce its size, schema, bank and ID contract.
export async function planLooseQuests({ quests, readBank, prefix = "", techIds }) {
  const plans = [], ids = new Set();
  if (!Array.isArray(quests) || !quests.length) throw new Error("no_quests");
  for (const rawValue of quests) {
    const raw = Buffer.from(rawValue);
    let tile;
    try { tile = JSON.parse(raw.toString("utf8")); } catch { throw new Error("quest_invalid_json"); }
    const ref = { packageId: "loose-quest", questId: tile?.id, revision: `sha256:${hash(raw)}` };
    if (!parsePackageRef(ref) || ids.has(ref.questId)) throw new Error("quest_id_conflict_or_invalid");
    ids.add(ref.questId);
    const key = joinObjectKey(prefix, `loose-quests/${ref.questId}/${ref.revision.slice(7)}.json`);
    if (!safePackageMember(key)) throw new Error("object_key_forbidden");
    let bankBytes;
    const resolved = await resolveLooseQuestRelease({ ref, prefix: String(prefix).replace(/^\/+|\/+$/g, ""), readBytes: async () => raw, readBank: async bankRef => { bankBytes = Buffer.from(await readBank(bankRef)); return bankBytes; }, techIds });
    if (!resolved.ok) throw new Error(`quest ${ref.questId}: ${resolved.code}`);
    plans.push({ id: ref.questId, key, raw, ref, bankRef: resolved.predictionBankRef, bankBytes, card: catalogCard({ ...resolved.record, source: "remote" }) });
  }
  return plans;
}

// Adapter: exists(key), read(key)->bytes, write(key,bytes). All errors propagate.
// This is intentionally last-writer-wins, like the legacy catalog publisher;
// read checks detect observed conflicts but are not atomic compare-and-swap.
export async function publishLooseQuests(plans, { adapter, prefix = "", readPublicBank }) {
  if (typeof readPublicBank !== "function") throw new Error("public_bank_reader_required");
  for (const plan of plans) {
    let publicBytes;
    try { publicBytes = await readPublicBank(plan.bankRef); } catch { throw new Error(`public_bank_unavailable: ${plan.id}`); }
    if (!same(publicBytes, plan.bankBytes)) throw new Error(`public_bank_mismatch: ${plan.id}`);
  }
  const catalogKey = joinObjectKey(prefix, "catalog.json");
  if (!safePackageMember(catalogKey)) throw new Error("object_key_forbidden");
  const original = await adapter.exists(catalogKey) ? Buffer.from(await adapter.read(catalogKey)) : null;
  let catalog;
  try { catalog = original ? JSON.parse(original.toString("utf8")) : { quests: [] }; }
  catch { throw new Error("catalog_invalid_json"); }
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog) || !Array.isArray(catalog.quests)) throw new Error("catalog_invalid");
  const entries = catalog.quests.slice();
  for (const plan of plans) {
    const hits = entries.map((entry, i) => entry?.id === plan.id ? i : -1).filter(i => i >= 0);
    if (hits.length > 1) throw new Error(`catalog_id_conflict: ${plan.id}`);
    const index = hits[0], old = index === undefined ? null : entries[index];
    if (old && old.storage !== "loose-v2") {
      if (Object.hasOwn(old, "packageRef") || !safePackageMember(old.file)) throw new Error(`catalog_entry_conflict: ${plan.id}`);
      const key = joinObjectKey(prefix, old.file);
      if (!safePackageMember(key)) throw new Error("object_key_forbidden");
      let tile;
      try { tile = JSON.parse(Buffer.from(await adapter.read(key)).toString("utf8")); } catch { throw new Error(`legacy_entry_unavailable: ${plan.id}`); }
      if (tile?.id !== plan.id || !validateQuestDocument(tile).ok) throw new Error(`legacy_entry_conflict: ${plan.id}`);
    } else if (old && (!parsePackageRef(old.packageRef) || old.packageRef.packageId !== "loose-quest" || old.packageRef.questId !== plan.id)) {
      throw new Error(`catalog_entry_conflict: ${plan.id}`);
    }
    // The new release owns policy and display metadata: retaining stale free
    // entitlements or sponsorship could let a paid release bypass billing.
    const entry = { ...plan.card, id: plan.id, storage: "loose-v2", packageRef: plan.ref };
    delete entry.file; // immutable ref, never a legacy loose pointer
    if (index === undefined) entries.push(entry); else entries[index] = entry;
  }
  // Check all pre-existing immutable objects before making any writes.
  for (const plan of plans) if (await adapter.exists(plan.key)) {
    if (!same(await adapter.read(plan.key), plan.raw)) throw new Error(`immutable_object_conflict: ${plan.id}`);
  }
  for (const plan of plans) {
    if (!await adapter.exists(plan.key)) await adapter.write(plan.key, plan.raw);
    if (!same(await adapter.read(plan.key), plan.raw)) throw new Error(`quest_readback_mismatch: ${plan.id}`);
  }
  const current = await adapter.exists(catalogKey) ? Buffer.from(await adapter.read(catalogKey)) : null;
  if ((original === null) !== (current === null) || (original && !same(original, current))) throw new Error("catalog_changed");
  const body = Buffer.from(`${JSON.stringify({ ...catalog, quests: entries }, null, 2)}\n`);
  await adapter.write(catalogKey, body);
  if (!same(await adapter.read(catalogKey), body)) throw new Error("catalog_readback_mismatch");
  return { quests: plans.map(({ id, key, ref }) => ({ id, key, packageRef: ref })), catalogKey };
}

export async function createNeonLooseAdapter(bucket) {
  const { Files } = await import("files-sdk");
  const { neon } = await import("files-sdk/neon");
  const files = new Files({ adapter: neon({ bucket }) });
  return {
    exists: key => files.exists(key),
    read: async key => Buffer.from(await (await files.download(key)).arrayBuffer()),
    write: (key, bytes) => files.upload(key, bytes, { contentType: "application/json" }),
  };
}
