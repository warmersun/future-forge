#!/usr/bin/env node
/**
 * Evaluate (and optionally patch) a Quest's resource / crisis knobs.
 *
 *   node scripts/evaluate-quest-economy.mjs quests/spotlight-gene-seq.json
 *   node scripts/evaluate-quest-economy.mjs --all
 *   node scripts/evaluate-quest-economy.mjs quests/foo.json --write
 *   node scripts/evaluate-quest-economy.mjs quests/foo.json --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const wantAll = Boolean(args.all);
const wantWrite = Boolean(args.write);
const wantJson = Boolean(args.json);
const friendsSeats = args["friends-seats"] ? Number(args["friends-seats"]) : 3;
const fileArg = args._[0] || null;

if (!wantAll && !fileArg) {
  console.error(
    "Usage: node scripts/evaluate-quest-economy.mjs <quest.json> [--write] [--json]\n" +
      "       node scripts/evaluate-quest-economy.mjs --all [--json]"
  );
  process.exit(2);
}

const { evaluateQuestEconomy } = await import(
  pathToFileURL(path.join(ROOT, "js/sim/quest-economy.js")).href
);
const { parseQuestTileJson, validateQuestDocument } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href
);
const {
  listQuestEconomyCatalog,
  resolveQuestEconomyPath,
  writeQuestEconomyPatch,
} = await import(pathToFileURL(path.join(ROOT, "js/server/quest-economy.mjs")).href);

/** @type {{ label: string, input: object, rel?: string, writable?: boolean }[]} */
const targets = [];
if (wantAll) {
  const cat = await listQuestEconomyCatalog(ROOT);
  if (!cat.remoteOk) {
    console.error(
      `WARN: Warmer Sun catalog failed (${cat.remoteUrl || "no url"}) — Sponsored/Learning may be missing.`
    );
  }
  for (const row of cat.local) {
    if (row.kind === "quest" && row.tile) {
      targets.push({
        label: row.rel,
        input: row.tile,
        rel: row.rel,
        writable: true,
      });
    }
  }
  for (const row of cat.remote) {
    if (row.kind === "quest" && (row.tile || row.mission)) {
      targets.push({
        label: `remote:${row.id}`,
        input: row.tile || row.mission,
        writable: false,
      });
    }
  }
} else {
  targets.push({ label: fileArg, file: fileArg, writable: true });
}

let failed = 0;
const reports = [];

for (const spec of targets) {
  let input = spec.input || null;
  let rel = spec.rel || null;
  if (spec.file) {
    const abs = path.isAbsolute(spec.file) ? spec.file : path.join(ROOT, spec.file);
    if (!fs.existsSync(abs)) {
      console.error(`FAIL: not found ${spec.file}`);
      failed += 1;
      continue;
    }
    const raw = fs.readFileSync(abs, "utf8");
    const parsed = parseQuestTileJson(raw);
    if (!parsed.ok) {
      console.error(`FAIL: ${spec.file}: ${parsed.error}`);
      failed += 1;
      continue;
    }
    if (parsed.value?.kind === "module") {
      if (!wantJson) console.log(`SKIP module: ${spec.file}`);
      continue;
    }
    const v = validateQuestDocument(parsed.value);
    if (!v.ok) {
      console.error(`FAIL: ${spec.file}: ${v.error}`);
      if (v.details?.length) for (const d of v.details) console.error(`  - ${d}`);
      failed += 1;
      continue;
    }
    input = v;
    rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  }
  const report = evaluateQuestEconomy(input, { friendsSeats });
  reports.push({ file: spec.label, report });

  if (wantWrite && report.recommendation?.needed) {
    if (!spec.writable || !rel) {
      console.error(`SKIP write ${spec.label}: not a local quests/ file`);
    } else {
      const resolved = resolveQuestEconomyPath(ROOT, rel);
      if (!resolved.ok) {
        console.error(`FAIL write: ${spec.label}: ${resolved.error}`);
        failed += 1;
      } else {
        const w = await writeQuestEconomyPatch(
          ROOT,
          resolved.rel,
          report.recommendation.patch
        );
        if (!w.ok) {
          console.error(`FAIL write: ${spec.label}: ${w.error}`);
          failed += 1;
        } else if (!wantJson) {
          console.log(`WROTE ${resolved.rel}`);
        }
      }
    }
  }

  if (!wantJson) printReport(spec.label, report);
}

if (wantJson) {
  console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
}

process.exit(failed ? 1 : 0);

function printReport(file, report) {
  const k = report.knobs;
  console.log(`\n== ${file}`);
  console.log(`  ${k.title || k.id}`);
  console.log(
    `  Start AP ${k.apMax} · Budget ${k.budget} · Will ${k.will} · ${k.startYear}→${k.collapseYear}`
  );
  console.log(
    `  Meters: ${k.meters
      .map((m) => `${m.label} ${m.start}↑${m.rise} win≤${m.winMax}`)
      .join(" · ")}`
  );
  console.log(`  Quest verdict: ${report.questVerdict}`);
  for (const id of [
    "solo-no-ai",
    "solo-ai",
    "friends-no-ai",
    "friends-ai",
  ]) {
    const a = report.archetypes[id];
    if (!a) continue;
    const block = a.blocked ? ` blocked:${a.blocked.error}` : "";
    console.log(
      `  ${a.label}: ${a.verdict} · ${a.tileCount} tile${a.tileCount === 1 ? "" : "s"} · ` +
        `${a.pathwayCount} pathway${a.pathwayCount === 1 ? "" : "s"} · AP ${a.apSpent} · ` +
        `turns ${a.turnsUsed ?? a.endTurns + 1} · waits ${a.waits} · ` +
        `survive ${a.survive ? "yes" : "no"} · green ${a.fullSolve ? "yes" : "no"}${block}`
    );
    for (const p of a.pathways || []) {
      const names = (p.tiles || []).map((t) => t.name).join(" · ");
      console.log(`    ${p.id}: ${names || "(empty)"}`);
    }
    if (a.ai) {
      console.log(`    AI Attention ${a.aiAp}:`);
      for (const row of a.aiBill || []) {
        console.log(`      - ${row.step} (${row.ap} AP)`);
      }
    }
  }
  const rec = report.recommendation;
  if (rec?.needed) {
    console.log(`  Recommend: ${rec.reason}`);
    console.log(`  Patch: ${JSON.stringify(rec.patch)}`);
  } else {
    console.log(`  Recommend: ${rec?.reason || "none"}`);
  }
}

function parseArgs(argv) {
  /** @type {Record<string, string|boolean|string[]>} */
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    } else if (a.startsWith("-") && a.length === 2) {
      out[a.slice(1)] = true;
    } else {
      out._.push(a);
    }
  }
  return out;
}
