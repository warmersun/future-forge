#!/usr/bin/env node
/**
 * Validate package-local prediction banks for a quest source tree or extracted package.
 * Usage: node scripts/validate-quest-package.mjs <srcdir>
 *
 * Prints one JSON object: { ok, errors, warnings, bindings }.
 * Exit 0 when the world bindings are closed. Exit 1 on a binding error.
 * A tree with no predictions/ and no predictionBankId is ok (v1).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { allTechIds } = await import(pathToFileURL(path.join(root, "js/data.js")).href);
const { validatePackageBanks } = await import(
  pathToFileURL(path.join(root, "js/quest-package.js")).href
);

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/validate-quest-package.mjs <srcdir>");
  process.exit(2);
}
const abs = path.resolve(src);
if (!fs.existsSync(abs)) {
  console.error(`not a directory: ${abs}`);
  process.exit(2);
}

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const file = path.join(dir, name);
      return { name, file, doc: JSON.parse(fs.readFileSync(file, "utf8")) };
    });
}

const quests = readJsonDir(path.join(abs, "quests")).map((row) => ({
  id: row.doc?.id,
  kind: row.doc?.kind || "quest",
  file: `quests/${row.name}`,
  tile: row.doc,
}));
const bankRows = readJsonDir(path.join(abs, "predictions"));
const banks = Object.fromEntries(bankRows.map((row) => [row.name, row.doc]));
const hasWorld =
  bankRows.length > 0 ||
  quests.some((quest) => {
    const id = quest.tile?.predictionBankId;
    return typeof id === "string" && id.trim();
  });

const result = hasWorld
  ? validatePackageBanks({ quests, banks, techIds: allTechIds(), requireBanks: true })
  : { ok: true, errors: [], warnings: [], bindings: [] };

const payload = {
  ok: result.ok,
  errors: result.errors,
  warnings: result.warnings,
  bindings: result.bindings,
};
process.stdout.write(`${JSON.stringify(payload)}\n`);
process.exit(result.ok ? 0 : 1);
