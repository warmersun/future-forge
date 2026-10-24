#!/usr/bin/env node
/** Offline: node scripts/publish-quest-package.mjs package.ffquest --dry-run
 * Live: add --adapter ./verified-cas-adapter.mjs (exports createAdapter(env)).
 * No built-in production adapter: files-sdk upload does not provide the required
 * atomic create/CAS contract. Never fall back to that unconditional publisher.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { planPublishPackage, publishPackagePlan } from "../js/server/publish-quest-package.mjs";
import { questsObjectPrefixFromEnv } from "../js/server/quest-object-storage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Python owns ZIP safety, manifest/dependency verification and raw extraction.
 * Snapshot once so verify and unpack cannot observe different archive bytes.
 */
export async function readArchivePackage(archive) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ffpublish-"));
  try {
    const snapshot = path.join(temp, "input.ffquest");
    await fs.copyFile(path.resolve(archive), snapshot);
    const dest = path.join(temp, "unpacked");
    for (const args of [["verify", snapshot], ["unpack", snapshot, dest]]) {
      const result = spawnSync("python3", [path.join(ROOT, "scripts/quest-package.py"), ...args], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
      if (result.error || result.status !== 0) throw new Error(`Package ${args[0]} failed: ${result.error?.message || result.stderr || result.stdout}`);
    }
    let raw = path.join(dest, "raw");
    try { await fs.access(path.join(raw, "manifest.json")); }
    catch { raw = dest; } // v1 unpacks at root; planner gives explicit migration guidance.
    const files = {};
    async function walk(dir, rel = "") {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const name = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await walk(path.join(dir, entry.name), name);
        else if (entry.isFile()) files[name] = await fs.readFile(path.join(dir, entry.name));
        else throw new Error(`Unexpected extracted member ${name}`);
      }
    }
    await walk(raw);
    return files;
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

/** Injection is for offline tests and embedding; adapter factory is invoked only
 * AFTER full archive verification, strict craft lint, and both solo economy
 * paths accepting a challenging verdict in the same year. Package verification
 * alone is not authoring acceptance. Dry-run runs the same gates and never calls
 * the adapter factory.
 */
export async function main(argv, {
  readArchive = readArchivePackage,
  loadAdapter = async (modulePath) => {
    if (!modulePath) throw new Error("No production CAS adapter configured. Supply --adapter <module> exporting createAdapter(env); unconditional files-sdk upload is not safe.");
    const module = await import(pathToFileURL(path.resolve(modulePath)).href);
    if (typeof module.createAdapter !== "function") throw new Error("CAS module must export createAdapter(env)");
    return module.createAdapter(process.env);
  },
  stdout = (text) => console.log(text),
} = {}) {
  let archive, adapterPath, access = null, dryRun = false;
  let prefix = questsObjectPrefixFromEnv();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (["--prefix", "--adapter", "--access"].includes(arg)) {
      const value = argv[++i];
      if (value == null || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      if (arg === "--prefix") prefix = value;
      else if (arg === "--adapter") adapterPath = value;
      else access = value;
    } else if (arg.startsWith("-") || archive) throw new Error(`Unexpected argument: ${arg}`);
    else archive = arg;
  }
  if (!archive) throw new Error("Usage: node scripts/publish-quest-package.mjs <package.ffquest> [--dry-run] [--prefix path] [--adapter module.mjs]");
  const files = await readArchive(archive);
  const plan = planPublishPackage({ files, prefix, access });
  const adapter = dryRun ? undefined : await loadAdapter(adapterPath);
  const result = await publishPackagePlan(plan, { dryRun, adapter });
  stdout(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
