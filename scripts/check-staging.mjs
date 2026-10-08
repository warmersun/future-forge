#!/usr/bin/env node
/**
 * Preflight for scripts/run-staging.sh: make sure a warmersun.com staging
 * build has a usable quest catalog before the local server starts.
 *
 * Usage: node scripts/check-staging.mjs <token|url>
 *
 * Exits 1 (with a clear message) when the catalog 404s, is not JSON,
 * has no quests array, or no tile loads. Tile-level problems and links
 * that still point at live warmersun.com are printed as warnings.
 */
import { stagingBaseFromArg, contentCatalogUrl } from "../js/content-base.mjs";

function fail(msg) {
  console.error(`\nSTAGING CHECK FAILED: ${msg}\n`);
  process.exit(1);
}

const arg = process.argv[2] || process.env.FF_CONTENT_BASE_URL;
let base;
try {
  base = stagingBaseFromArg(arg);
} catch (e) {
  fail(`${e.message}\nUsage: npm run staging -- <token|https://warmersun.com/staging/<token>/>`);
}

// Pin the app's resolvers to this base before importing them.
process.env.FF_CONTENT_BASE_URL = base;
delete process.env.FF_QUESTS_REMOTE_URL;
const { fetchRemoteQuestCatalog } = await import("../js/quests-remote.mjs");

const catalogUrl = contentCatalogUrl(base, "quests");
console.log(`Staging base:   ${base}`);
if (!/\/staging\/[^/]+\/$/.test(new URL(base).pathname)) {
  console.warn("NOTE: this base is not a /staging/<token>/ folder. Make sure you did not mean live.");
}
console.log(`Quest catalog:  ${catalogUrl}`);

let res;
try {
  res = await fetch(catalogUrl, { headers: { Accept: "application/json" } });
} catch (e) {
  fail(`could not reach ${catalogUrl} (${e.cause?.code || e.message})`);
}
const text = await res.text();
if (!res.ok) {
  fail(`${catalogUrl} returned HTTP ${res.status}. Is the token right, and has this build been staged?`);
}
let catalog;
try {
  catalog = JSON.parse(text);
} catch {
  fail(`${catalogUrl} is not valid JSON (got ${JSON.stringify(text.slice(0, 80))}…)`);
}
if (!Array.isArray(catalog?.quests)) {
  fail(`${catalogUrl} has no "quests" array`);
}
if (!catalog.quests.length) {
  fail(`${catalogUrl} lists zero quests`);
}

const remote = await fetchRemoteQuestCatalog(catalogUrl, { force: true, tryFallbacks: false });
if (!remote.ok) {
  fail(`could not load ${catalogUrl}: ${remote.errors.map((e) => e.error).join(", ")}`);
}
if (!remote.quests.length) {
  fail(
    `none of the ${catalog.quests.length} catalog entries loaded:\n  ` +
      remote.errors.map((e) => `${e.file}: ${e.error}`).join("\n  ")
  );
}

const modules = remote.quests.filter((q) => q.kind === "module");
const lessonIds = new Set(modules.flatMap((m) => m.lessons || []));
const lessons = remote.quests.filter((q) => q.kind !== "module" && lessonIds.has(q.id));
const spotlights = remote.quests.filter((q) => q.kind !== "module" && !lessonIds.has(q.id));

console.log(`Loaded ${remote.quests.length}/${catalog.quests.length} catalog entries from staging:`);
for (const m of modules) {
  console.log(`  module    ${m.id} (${(m.lessons || []).length} lessons, access ${m.access || "unset"})`);
}
for (const q of lessons) console.log(`  lesson    ${q.id}`);
for (const q of spotlights) console.log(`  spotlight ${q.id}`);
for (const id of lessonIds) {
  if (!remote.quests.some((q) => q.id === id)) {
    console.warn(`  WARNING: module lists lesson ${id}, but it is not in the staging catalog`);
  }
}
if (remote.errors.length) {
  console.warn(`WARNING: ${remote.errors.length} catalog entr${remote.errors.length === 1 ? "y" : "ies"} did not load:`);
  for (const e of remote.errors) console.warn(`  ${e.file}: ${e.error}`);
}

// Images, lesson pages, and covers should come from staging, not live.
const live = new Set();
for (const q of remote.quests) {
  const s = JSON.stringify(q.tile || q);
  for (const m of s.matchAll(/https:\/\/warmersun\.com\/[^\s"'()\\]+/g)) {
    if (!m[0].startsWith(base)) live.add(m[0]);
  }
}
if (live.size) {
  console.warn(`NOTE: ${live.size} link(s) in staged quests point at live warmersun.com, not staging:`);
  for (const u of [...live].slice(0, 10)) console.warn(`  ${u}`);
}
console.log("Staging check OK.");
