/**
 * Package-local prediction bank binding.
 * A playable v2 quest selects one complete bank. Grants do not select another.
 * DOM-free. Does not load the process-global foresight bank.
 */

import { validatePredictionsBank } from "./sim/world-foresight.js";

export const PACKAGE_SCHEMA_V1 = "future-forge.quest-package/v1";
export const PACKAGE_SCHEMA_V2 = "future-forge.quest-package/v2";

const ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function predictionBankIdOf(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const tile = /** @type {Record<string, unknown>} */ (raw);
  const top = tile.predictionBankId;
  if (typeof top === "string") return top;
  if (top !== undefined) return "";
  const mission = tile.mission;
  if (mission && typeof mission === "object" && !Array.isArray(mission)) {
    const nested = /** @type {Record<string, unknown>} */ (mission).predictionBankId;
    if (typeof nested === "string") return nested;
  }
  return "";
}

/**
 * @param {unknown} tile
 * @returns {string}
 */
function questKind(tile) {
  if (!tile || typeof tile !== "object" || Array.isArray(tile)) return "quest";
  const kind = String(/** @type {Record<string, unknown>} */ (tile).kind || "quest").trim();
  return kind || "quest";
}

/**
 * @param {unknown} tile
 * @returns {{ bankId?: string, grants: { predictionId: string }[] } | null}
 */
function assumedPremise(tile) {
  if (!tile || typeof tile !== "object") return null;
  const root = /** @type {Record<string, unknown>} */ (tile);
  const companion = root.companion ?? root.mission?.companion;
  if (!companion || typeof companion !== "object" || Array.isArray(companion)) return null;
  const exploration = /** @type {Record<string, unknown>} */ (companion).exploration;
  if (!exploration || typeof exploration !== "object" || Array.isArray(exploration)) return null;
  const premise = /** @type {Record<string, unknown>} */ (exploration).premise;
  if (!premise || typeof premise !== "object" || Array.isArray(premise)) return null;
  if (premise.mode !== "assumed") return null;
  const bankId = typeof premise.bankId === "string" ? premise.bankId.trim() : "";
  const grants = Array.isArray(premise.grants)
    ? premise.grants
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const predictionId = String(
            /** @type {Record<string, unknown>} */ (item).predictionId || ""
          ).trim();
          return predictionId ? { predictionId } : null;
        })
        .filter(Boolean)
    : [];
  return { ...(bankId ? { bankId } : {}), grants: /** @type {{ predictionId: string }[]} */ (grants) };
}

/**
 * @param {unknown} doc
 * @param {string[]|null} techIds
 */
function validateBankDoc(doc, techIds) {
  return validatePredictionsBank(doc, techIds);
}

/**
 * Cross-check playable quests against complete package-local banks.
 * Structural only: invented claims must still be labeled by the author.
 *
 * @param {{
 *   quests: { id?: string, kind?: string, file?: string, tile: object }[],
 *   banks: Record<string, unknown>,
 *   techIds?: string[]|null,
 *   requireBanks?: boolean,
 * }} input
 * @returns {{
 *   ok: boolean,
 *   errors: { code: string, message: string }[],
 *   warnings: string[],
 *   banks: Record<string, object>,
 *   bindings: { questId: string, predictionBankId: string }[],
 * }}
 */
export function validatePackageBanks(input) {
  const errors = [];
  const warnings = [];
  const quests = Array.isArray(input?.quests) ? input.quests : [];
  const rawBanks = input?.banks && typeof input.banks === "object" ? input.banks : {};
  const techIds = input?.techIds === undefined ? null : input.techIds;
  const requireBanks = input?.requireBanks !== false;
  /** @type {Record<string, object>} */
  const banks = {};
  /** @type {{ questId: string, predictionBankId: string }[]} */
  const bindings = [];
  const referenced = new Set();

  for (const [fileName, doc] of Object.entries(rawBanks)) {
    const validated = validateBankDoc(doc, techIds);
    const stem = String(fileName).replace(/\.json$/i, "").split("/").pop() || "";
    if (!validated.ok || !validated.bank) {
      errors.push({
        code: "package_dependency_missing",
        message: `predictions/${stem}.json: ${validated.errors.join("; ") || "invalid bank"}`,
      });
      continue;
    }
    if (!ID_RE.test(validated.bank.id) || doc.id !== validated.bank.id) {
      errors.push({ code: "package_dependency_missing", message: `predictions/${stem}.json: bank id must be an exact lowercase slug` });
      continue;
    }
    if (validated.bank.id !== stem) {
      errors.push({
        code: "package_dependency_missing",
        message: `predictions/${stem}.json: filename must equal bank id ${validated.bank.id}`,
      });
      continue;
    }
    if (banks[validated.bank.id]) {
      errors.push({
        code: "package_dependency_missing",
        message: `duplicate bank id ${validated.bank.id}`,
      });
      continue;
    }
    banks[validated.bank.id] = validated.bank;
  }

  for (const quest of quests) {
    const tile = quest?.tile;
    const questId = String(quest?.id || tile?.id || "").trim();
    const kind = quest?.kind || questKind(tile);
    const where = quest?.file || questId || "quest";
    const bankId = predictionBankIdOf(tile);
    if (kind === "module") {
      if (bankId) {
        errors.push({
          code: "package_dependency_missing",
          message: `${where}: a module wrapper must not set predictionBankId`,
        });
      }
      continue;
    }
    if (!bankId) {
      if (requireBanks) {
        errors.push({
          code: "package_dependency_missing",
          message: `${where}: missing bank; playable quest requires predictionBankId`,
        });
      }
      continue;
    }
    if (!ID_RE.test(bankId)) {
      errors.push({
        code: "package_dependency_missing",
        message: `${where}: predictionBankId ${bankId} must be a lowercase slug`,
      });
      continue;
    }
    referenced.add(bankId);
    bindings.push({ questId, predictionBankId: bankId });
    const bank = banks[bankId];
    if (!bank) {
      errors.push({
        code: "package_dependency_missing",
        message: `${where}: missing bank ${bankId}`,
      });
      continue;
    }
    const premise = assumedPremise(tile);
    if (premise?.bankId && premise.bankId !== bankId) {
      errors.push({
        code: "package_dependency_missing",
        message: `${where}: mismatched premise bankId ${premise.bankId} (predictionBankId is ${bankId})`,
      });
    }
    const rowIds = new Set((bank.predictions || []).map((row) => row.id));
    for (const grant of premise?.grants || []) {
      if (!rowIds.has(grant.predictionId)) {
        errors.push({
          code: "package_dependency_missing",
          message: `${where}: unresolved grant ${grant.predictionId}`,
        });
      }
    }
  }

  if (requireBanks) {
    for (const bankId of Object.keys(banks)) {
      if (!referenced.has(bankId)) {
        errors.push({
          code: "package_dependency_missing",
          message: `orphan bank ${bankId} is not referenced by a packaged quest`,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    banks,
    bindings,
  };
}

/**
 * The complete bank a quest selected. Unrelated banks are not merged in.
 * @param {Record<string, { id: string, predictions?: object[] }>} banks
 * @param {string} bankId
 */
export function selectPackageBank(banks, bankId) {
  const bank = banks?.[bankId];
  if (!bank) return null;
  return {
    ...bank,
    predictions: (bank.predictions || []).map((row) => ({ ...row })),
  };
}

/**
 * Due / exact / ahead rows inside one complete bank. Inclusion does not move a year.
 * @param {{ predictions?: { id: string, year: number }[] }|null} bank
 * @param {number} year
 */
export function rowsByYear(bank, year) {
  const y = Number(year);
  const rows = bank?.predictions || [];
  return {
    before: rows.filter((row) => Number(row.year) < y),
    at: rows.filter((row) => Number(row.year) === y),
    after: rows.filter((row) => Number(row.year) > y),
  };
}
