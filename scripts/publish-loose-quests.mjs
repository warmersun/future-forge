#!/usr/bin/env node
/* Copyright © 2026 Warmer Sun Education. GPL-3.0-or-later. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planLooseQuests, publishLooseQuests, createNeonLooseAdapter } from "../js/server/publish-loose-quest.mjs";
import { questsBucketFromEnv, questsObjectPrefixFromEnv } from "../js/server/quest-object-storage.mjs";
import { createPublicBankReader } from "../js/server/loose-quest-release.mjs";

export async function main(argv, { adapterFactory = createNeonLooseAdapter, stdout = console.log, stderr = console.error } = {}) {
  let dir, dryRun = false, prefix = questsObjectPrefixFromEnv();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--prefix") {
      prefix = argv[++i];
      if (prefix === undefined || prefix.startsWith("--")) throw new Error("Missing --prefix value");
    } else if (argv[i].startsWith("-") || dir) throw new Error(`Unexpected argument: ${argv[i]}`);
    else dir = argv[i];
  }
  if (!dir) throw new Error("Usage: node scripts/publish-loose-quests.mjs <plan-dir> [--dry-run] [--prefix path]");
  const quests = [], skipped = [];
  for (const name of (await fs.readdir(path.join(dir, "quests"))).sort()) {
    if (!name.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(dir, "quests", name));
    let tile;
    try { tile = JSON.parse(raw.toString("utf8")); } catch { throw new Error(`Invalid quest JSON: ${name}`); }
    if (tile?.kind === "module") { skipped.push(name); continue; }
    quests.push(raw);
  }
  if (skipped.length) throw new Error(`Module wrappers are not supported; refusing partial publication: ${skipped.join(", ")}`);
  const plans = await planLooseQuests({ quests, prefix, readBank: ({ id, sha256 }) => fs.readFile(path.join(dir, "predictions", id, `${sha256}.json`)) });
  if (dryRun) {
    const result = { dryRun: true, quests: plans.map(({ id, key, ref }) => ({ id, key, packageRef: ref })), skipped };
    stdout(JSON.stringify(result, null, 2));
    return result;
  }
  const bucket = questsBucketFromEnv() || (process.env.FF_QUESTS_BUCKET === undefined ? "quests" : null);
  if (bucket !== "quests" || prefix !== "" || process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "") !== "https://br-wild-surf-b4jds6qu.storage.c-6.us-east-2.aws.neon.tech") {
    throw new Error("Refusing publication: storage must target the production main branch quests bucket");
  }
  stderr("Warning: catalog publication is last-writer-wins; coordinate all catalog writers. Checking public bank bytes before promotion.");
  const readPublicBank = createPublicBankReader({ root: "https://warmersun.com/predictions/" });
  const result = await publishLooseQuests(plans, { adapter: await adapterFactory(bucket), prefix, readPublicBank });
  stdout(JSON.stringify({ ...result, skipped }, null, 2));
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
