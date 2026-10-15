/**
 * Validate quest tiles and upsert them into the private Neon quests bucket.
 *
 *   npm run publish:quest -- <quest.json | dir> [--access open|account|paid] [--dry-run] [--skip-economy]
 *
 * Downloads the live catalog.json, adds or replaces those ids, and uploads
 * the tiles plus the merged catalog. Other catalog entries stay. Secrets are
 * never printed.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  parseAccessFlag,
  parseLiveCatalog,
  planPublish,
  publishPlanned,
} from "../js/server/publish-quest.mjs";
import { questsBucketFromEnv, questsObjectPrefixFromEnv } from "../js/server/quest-object-storage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function collectTilePaths(inputs) {
  /** @type {string[]} */
  const out = [];
  for (const input of inputs) {
    const abs = path.resolve(input);
    if (!fs.existsSync(abs)) fail(`File not found: ${abs}`);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const names = fs
        .readdirSync(abs)
        .filter((name) => name.toLowerCase().endsWith(".json") && name !== "catalog.json")
        .sort();
      if (!names.length) fail(`No quest JSON in ${abs}`);
      for (const name of names) out.push(path.join(abs, name));
    } else {
      out.push(abs);
    }
  }
  return out;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const skipEconomy = argv.includes("--skip-economy");
  /** @type {string[]} */
  const inputs = [];
  let access = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run" || arg === "--skip-economy") continue;
    if (arg === "--access") {
      access = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg.startsWith("--")) fail(`Unknown flag: ${arg}`);
    inputs.push(arg);
  }
  return { dryRun, skipEconomy, inputs, access };
}

loadEnvFile(path.join(ROOT, ".env.object-storage.local"));
loadEnvFile(path.join(ROOT, ".env.portal"));

const args = parseArgs(process.argv.slice(2));
if (!args.inputs.length) {
  fail(
    "Usage: npm run publish:quest -- <quest.json | dir> [--access open|account|paid] [--dry-run] [--skip-economy]"
  );
}
if (args.access != null && !parseAccessFlag(args.access)) {
  fail("--access must be open, account, or paid");
}
const access = parseAccessFlag(args.access);

const { parseQuestTileJson, validateQuestDocument } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href
);
const { lintQuestTile, formatLintWarnings } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-lint.js")).href
);
const { evaluateQuestEconomy } = await import(
  pathToFileURL(path.join(ROOT, "js/sim/quest-economy.js")).href
);

/** @type {object[]} */
const documents = [];
for (const abs of collectTilePaths(args.inputs)) {
  const raw = fs.readFileSync(abs, "utf8");
  const parsed = parseQuestTileJson(raw);
  if (!parsed.ok) fail(`${abs}: ${parsed.error}`);
  const validated = validateQuestDocument(parsed.value);
  if (!validated.ok) {
    const details = (validated.details || []).map((d) => `\n  - ${d}`).join("");
    fail(`${abs}: ${validated.error}${details}`);
  }
  const lint = lintQuestTile(parsed.value, validated);
  if (lint.warnings.length) {
    for (const line of formatLintWarnings(lint.warnings)) console.error(line);
    fail(`${abs}: ${lint.warnings.length} lint warning(s)`);
  }
  const kind = validated.kind || validated.tile?.kind || "quest";
  if (kind !== "module" && !args.skipEconomy) {
    const report = evaluateQuestEconomy(validated);
    const verdict = report.questVerdict;
    if (verdict !== "challenging") {
      fail(`${abs}: economy verdict ${verdict} (need challenging)`);
    }
  }
  documents.push(parsed.value);
}

if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  fail(
    "Object storage credentials are missing. Set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
  );
}

const bucket = questsBucketFromEnv() || "quests";
const prefix = questsObjectPrefixFromEnv();
const { Files } = await import("files-sdk");
const { neon } = await import("files-sdk/neon");
const { joinObjectKey } = await import("../js/server/quest-object-storage.mjs");
const files = new Files({ adapter: neon({ bucket }) });
const catalogKey = joinObjectKey(prefix, "catalog.json");

let catalog = { quests: [] };
let present = false;
try {
  present = await files.exists(catalogKey);
} catch (err) {
  const code = err && err.code ? err.code : "error";
  fail(`Could not read ${catalogKey} (${code}). Not uploading.`);
}
if (present) {
  let text;
  try {
    const stored = await files.download(catalogKey);
    text = await stored.text();
  } catch (err) {
    const code = err && err.code ? err.code : "error";
    fail(`Could not read ${catalogKey} (${code}). Not uploading.`);
  }
  const parsed = parseLiveCatalog(text);
  if (!parsed.ok) fail(`${catalogKey} is not a quest catalog. Not uploading.`);
  catalog = parsed.catalog;
}

const plan = planPublish({ documents, catalog, access });
if (plan.unsafe.length) {
  for (const id of plan.unsafe) console.error(`unsafe id: ${id}`);
  fail("Refused an id with a slash or '..'. Not uploading.");
}
if (plan.missing.length) {
  for (const row of plan.missing) {
    console.error(`missing lesson ${row.lesson} listed by ${row.wrapper}`);
  }
  fail("Module wrapper is missing lesson tiles. Not uploading.");
}

for (const action of plan.actions) {
  const item = plan.prepared.find((row) => row.id === action.id);
  console.log(`${action.action} ${action.id} access=${item?.access || "open"} file=${action.file}`);
}
console.log(`catalog ${plan.catalog.quests.length} quest(s)${args.dryRun ? " (dry-run)" : ""}`);

const result = await publishPlanned(plan, {
  dryRun: args.dryRun,
  prefix,
  writeObject: async (key, body) => {
    await files.upload(key, body, { contentType: "application/json" });
  },
});
if (!result.ok) fail("Not uploading.");
for (const key of result.wrote) console.log(`uploaded ${key}`);
if (args.dryRun) console.log("dry-run: uploaded nothing");
