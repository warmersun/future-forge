/* Copyright © 2026 Warmer Sun Education. GPL-3.0-or-later. */
import { createHash } from "node:crypto";
import { allTechIds } from "../data.js";
import { validateQuestDocument, catalogRecordFromValidated } from "../quest-tile.js";
import { validatePackageBanks } from "../quest-package.js";
import { safePackageMember } from "./package-paths.mjs";

const slug = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const hex = /^[0-9a-f]{64}$/;
const fail = (code, status = 409) => ({ ok: false, code, error: code, status });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Only configured roots and authenticated quest bytes determine the network target.
export function createPublicBankReader({ root, fetchImpl = fetch, timeoutMs = 12000, maxBytes = 4 * 1024 * 1024 } = {}) {
  const base = new URL(root);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || !base.pathname.endsWith("/")) throw new Error("bank_origin_forbidden");
  return async ({ id, sha256 }) => {
    if (typeof id !== "string" || !slug.test(id) || typeof sha256 !== "string" || !hex.test(sha256)) throw new Error("bank_reference_forbidden");
    const url = new URL(`${id}/${sha256}.json`, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error("bank_origin_forbidden");
    const response = await fetchImpl(url.href, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok || response.redirected || !response.body) throw new Error("bank_unavailable");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) throw new Error("bank_too_large");
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, size);
  };
}

// The package-shaped reference pins the raw immutable loose quest, including its bank ref.
export async function resolveLooseQuestRelease({ ref, readBytes, readBank, prefix = "", techIds, trust = "official" }) {
  if (ref.packageId !== "loose-quest") return fail("package_reference_forbidden", 400);
  const key = [prefix, "loose-quests", ref.questId, `${ref.revision.slice(7)}.json`].filter(Boolean).join("/");
  if (!safePackageMember(key)) return fail("package_reference_forbidden", 400);
  let raw;
  try { raw = Buffer.from(await readBytes(key)); } catch { return fail("package_revision_unavailable", 404); }
  if (raw.length > 4 * 1024 * 1024 || digest(raw) !== ref.revision.slice(7)) return fail("package_integrity_failed");
  let tile;
  try { tile = JSON.parse(raw.toString("utf8")); } catch { return fail("package_integrity_failed"); }
  if (!tile || tile.id !== ref.questId || tile.kind === "module") return fail("package_integrity_failed");
  const bankRef = tile.predictionBankRef;
  if (!bankRef || typeof bankRef !== "object" || Array.isArray(bankRef) ||
      typeof bankRef.id !== "string" || !slug.test(bankRef.id) || typeof bankRef.sha256 !== "string" || !hex.test(bankRef.sha256) ||
      tile.predictionBankId !== bankRef.id) return fail("bank_reference_forbidden");
  const valid = validateQuestDocument(tile);
  if (!valid.ok) return fail("package_dependency_missing");
  let bankBytes, doc;
  try { bankBytes = Buffer.from(await readBank({ id: bankRef.id, sha256: bankRef.sha256 })); }
  catch { return fail("package_dependency_missing"); }
  if (bankBytes.length > 4 * 1024 * 1024 || digest(bankBytes) !== bankRef.sha256) return fail("package_integrity_failed");
  try { doc = JSON.parse(bankBytes.toString("utf8")); } catch { return fail("package_integrity_failed"); }
  const bound = validatePackageBanks({ quests: [{ id: tile.id, tile }], banks: { [`${bankRef.id}.json`]: doc }, techIds: techIds ?? allTechIds(), requireBanks: true });
  if (!bound.ok) return fail("package_dependency_missing");
  const record = catalogRecordFromValidated(valid, { file: key, source: "remote", packageRef: ref });
  if (!record) return fail("package_dependency_missing");
  return { ok: true, packageRef: ref, revision: ref.revision, trust, record, bank: bound.banks[bankRef.id], predictionBankRef: { id: bankRef.id, sha256: bankRef.sha256 } };
}
