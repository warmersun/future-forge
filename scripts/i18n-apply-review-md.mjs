#!/usr/bin/env node
/**
 * Apply docs/i18n-review-{code}/ markdown corrections into locales/{code}/*.json
 *
 * Usage:
 *   node scripts/i18n-apply-review-md.mjs --locale fr
 *   node scripts/i18n-apply-review-md.mjs --locale fr,es,he,hu
 *   node scripts/i18n-apply-review-md.mjs --locale fr --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const LOCALE_META = {
  hu: { code: "hu", tag: "HU", dir: "docs/i18n-review-hu" },
  fr: { code: "fr", tag: "FR", dir: "docs/i18n-review-fr" },
  es: { code: "es", tag: "ES", dir: "docs/i18n-review-es" },
  he: { code: "he", tag: "HE", dir: "docs/i18n-review-he" },
};

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const dryRun = args.includes("--dry-run");
const localeArg = argValue("--locale") || "fr,es,he,hu";
const codes = localeArg
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    const nextIsIndex = /^\d+$/.test(next);
    if (cur[p] == null) {
      cur[p] = nextIsIndex ? [] : {};
    } else if (typeof cur[p] !== "object") {
      cur[p] = nextIsIndex ? [] : {};
    }
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur) && /^\d+$/.test(last)) {
    cur[Number(last)] = value;
  } else {
    cur[last] = value;
  }
}

function getPath(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = /^\d+$/.test(p) ? cur[Number(p)] : cur[p];
  }
  return cur;
}

/** Parse ### `key` + **TAG:** value blocks from review markdown */
function parseReviewMd(text, tag) {
  const out = {};
  const re = /^### `([^`]+)`\s*\n([\s\S]*?)(?=^### `|^## |\Z)/gm;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1].trim();
    const body = m[2];
    // Prefer long-form: **TAG:**\n\nbody until --- or **NOTE:
    const long = body.match(
      new RegExp(
        `\\*\\*${tag}:\\*\\*\\s*\\n\\n([\\s\\S]*?)(?=\\n---\\s*\\n|\\n\\*\\*NOTE:\\*\\*|$)`,
        "i"
      )
    );
    const short = body.match(new RegExp(`\\*\\*${tag}:\\*\\*\\s+(.+?)\\s*$`, "im"));
    let val = null;
    if (long && long[1].trim() && long[1].trim() !== "_(missing)_") {
      val = long[1].replace(/\n---\s*$/, "").trimEnd();
      // strip trailing blank lines
      val = val.replace(/\s+$/, "");
    } else if (short) {
      val = short[1].trim();
      if (val === "_(missing)_") val = null;
    }
    if (val != null && val !== "") out[key] = val;
  }
  return out;
}

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function applyFlat(obj, flat, stats, label) {
  if (!obj) obj = {};
  for (const [k, v] of Object.entries(flat)) {
    const prev = getPath(obj, k);
    if (prev === v) {
      stats.same++;
      continue;
    }
    setPath(obj, k, v);
    stats.changed++;
    if (stats.samples.length < 8) {
      stats.samples.push(`${label}:${k}`);
    }
  }
  return obj;
}

/** Catalog keys: yearNews.N.text / foresight.N.text → array-ish objects */
function applyCatalog(reviewDir, tag, code, stats) {
  const md = fs.readFileSync(path.join(reviewDir, "02-catalog.md"), "utf8");
  const flat = parseReviewMd(md, tag);

  // Load full existing pack objects once
  const packFiles = {
    domains: "domains.json",
    shelves: "shelves.json",
    globals: "globals.json",
    "challenge-angles": "challenge-angles.json",
    "vision-stages": "vision-stages.json",
    missions: "missions.json",
  };
  const fullPacks = {};
  for (const [name, file] of Object.entries(packFiles)) {
    fullPacks[name] = clone(readJson(path.join(ROOT, "locales", code, file)) || {});
  }

  const domainIds = new Set(Object.keys(fullPacks.domains));
  const shelfIds = new Set(Object.keys(fullPacks.shelves));
  const globalIds = new Set(Object.keys(fullPacks.globals));
  const angleIds = new Set(Object.keys(fullPacks["challenge-angles"]));
  const visionIds = new Set(Object.keys(fullPacks["vision-stages"]));
  const missionIds = new Set(Object.keys(fullPacks.missions));

  const yearNews = clone(readJson(path.join(ROOT, "locales", code, "year-news.json")) || {});
  const foresight = clone(readJson(path.join(ROOT, "locales", code, "foresight.json")) || {});

  for (const [fullKey, val] of Object.entries(flat)) {
    if (fullKey.startsWith("yearNews.")) {
      // yearNews.0.text
      const m = fullKey.match(/^yearNews\.(\d+)\.text$/);
      if (m) {
        const i = m[1];
        if (typeof yearNews[i] === "object" && yearNews[i]) {
          if (yearNews[i].text !== val) {
            yearNews[i].text = val;
            stats.changed++;
          } else stats.same++;
        } else {
          yearNews[i] = { text: val };
          stats.changed++;
        }
      }
      continue;
    }
    if (fullKey.startsWith("foresight.")) {
      const m = fullKey.match(/^foresight\.(\d+)\.text$/);
      if (m) {
        const i = m[1];
        if (typeof foresight[i] === "object" && foresight[i]) {
          if (foresight[i].text !== val) {
            foresight[i].text = val;
            stats.changed++;
          } else stats.same++;
        } else {
          foresight[i] = { text: val };
          stats.changed++;
        }
      }
      continue;
    }
    const dot = fullKey.indexOf(".");
    if (dot < 0) continue;
    const id = fullKey.slice(0, dot);
    const field = fullKey.slice(dot + 1);
    let packName = null;
    if (domainIds.has(id)) packName = "domains";
    else if (shelfIds.has(id)) packName = "shelves";
    else if (globalIds.has(id)) packName = "globals";
    else if (angleIds.has(id)) packName = "challenge-angles";
    else if (visionIds.has(id)) packName = "vision-stages";
    else if (missionIds.has(id)) packName = "missions";
    else {
      stats.skipped++;
      continue;
    }
    if (!fullPacks[packName][id] || typeof fullPacks[packName][id] !== "object") {
      fullPacks[packName][id] = {};
    }
    const prev = getPath(fullPacks[packName][id], field);
    if (prev === val) stats.same++;
    else {
      setPath(fullPacks[packName][id], field, val);
      stats.changed++;
    }
  }

  const results = {};
  for (const [name, file] of Object.entries(packFiles)) {
    results[file] = fullPacks[name];
  }
  results["year-news.json"] = yearNews;
  results["foresight.json"] = foresight;
  return results;
}

function clone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

function applyIdFieldPack(mdPath, tag, existing, stats, label) {
  const flat = parseReviewMd(fs.readFileSync(mdPath, "utf8"), tag);
  const out = existing ? clone(existing) : {};
  for (const [fullKey, val] of Object.entries(flat)) {
    // id.field.maybe.more — first segment is id; rest may have dots (e.g. maturity.now)
    const firstDot = fullKey.indexOf(".");
    if (firstDot < 0) continue;
    const id = fullKey.slice(0, firstDot);
    const field = fullKey.slice(firstDot + 1);
    if (!out[id] || typeof out[id] !== "object") out[id] = { ...(out[id] || {}) };
    const prev = getPath(out[id], field);
    if (prev === val) stats.same++;
    else {
      setPath(out[id], field, val);
      stats.changed++;
      if (stats.samples.length < 8) stats.samples.push(`${label}:${fullKey}`);
    }
  }
  return out;
}

function applyScenarioSeeds(mdPath, tag, existing, stats) {
  const flat = parseReviewMd(fs.readFileSync(mdPath, "utf8"), tag);
  const out = existing ? clone(existing) : {};
  for (const [fullKey, val] of Object.entries(flat)) {
    // seedId may contain `--`; fields: title, scene, stakeholder, places.N, pressureKeys.N
    let seedId, field;
    const placesM = fullKey.match(/^(.*)\.places\.(\d+)$/);
    const pressureM = fullKey.match(/^(.*)\.pressureKeys\.(\d+)$/);
    if (placesM) {
      seedId = placesM[1];
      field = `places.${placesM[2]}`;
    } else if (pressureM) {
      seedId = pressureM[1];
      field = `pressureKeys.${pressureM[2]}`;
    } else {
      const lastDot = fullKey.lastIndexOf(".");
      if (lastDot < 0) continue;
      seedId = fullKey.slice(0, lastDot);
      field = fullKey.slice(lastDot + 1);
    }
    if (!out[seedId] || typeof out[seedId] !== "object") out[seedId] = {};
    const prev = getPath(out[seedId], field);
    if (prev === val) stats.same++;
    else {
      setPath(out[seedId], field, val);
      stats.changed++;
    }
  }
  return out;
}

function applyLocale(code) {
  const meta = LOCALE_META[code];
  if (!meta) throw new Error(`Unknown locale ${code}`);
  const reviewDir = path.join(ROOT, meta.dir);
  const locDir = path.join(ROOT, "locales", code);
  const tag = meta.tag;
  const stats = { changed: 0, same: 0, skipped: 0, samples: [] };

  console.log(`\n[apply] ${code} from ${meta.dir}`);

  // 01 UI
  const uiMd = path.join(reviewDir, "01-ui.md");
  if (fs.existsSync(uiMd)) {
    const uiFlat = parseReviewMd(fs.readFileSync(uiMd, "utf8"), tag);
    let ui = readJson(path.join(locDir, "ui.json")) || {};
    ui = applyFlat(ui, uiFlat, stats, "ui");
    if (!dryRun) writeJson(path.join(locDir, "ui.json"), ui);
    console.log(`  ui.json keys from review: ${Object.keys(uiFlat).length}`);
  }

  // 02 catalog
  if (fs.existsSync(path.join(reviewDir, "02-catalog.md"))) {
    const cat = applyCatalog(reviewDir, tag, code, stats);
    if (!dryRun) {
      for (const [file, obj] of Object.entries(cat)) {
        writeJson(path.join(locDir, file), obj);
      }
    }
    console.log(`  catalog packs: ${Object.keys(cat).join(", ")}`);
  }

  // 03 techs
  const techsMd = path.join(reviewDir, "03-techs.md");
  if (fs.existsSync(techsMd)) {
    const techs = applyIdFieldPack(
      techsMd,
      tag,
      readJson(path.join(locDir, "techs.json")),
      stats,
      "techs"
    );
    if (!dryRun) writeJson(path.join(locDir, "techs.json"), techs);
  }

  // 04 briefs
  const briefsMd = path.join(reviewDir, "04-problem-briefs.md");
  if (fs.existsSync(briefsMd)) {
    const briefs = applyIdFieldPack(
      briefsMd,
      tag,
      readJson(path.join(locDir, "problem-briefs.json")),
      stats,
      "briefs"
    );
    if (!dryRun) writeJson(path.join(locDir, "problem-briefs.json"), briefs);
  }

  // 05 seeds
  const seedsMd = path.join(reviewDir, "05-scenario-seeds.md");
  if (fs.existsSync(seedsMd)) {
    const seeds = applyScenarioSeeds(
      seedsMd,
      tag,
      readJson(path.join(locDir, "scenario-seeds.json")),
      stats
    );
    if (!dryRun) writeJson(path.join(locDir, "scenario-seeds.json"), seeds);
  }

  // 06 market news
  const newsMd = path.join(reviewDir, "06-market-news.md");
  if (fs.existsSync(newsMd)) {
    const news = applyIdFieldPack(
      newsMd,
      tag,
      readJson(path.join(locDir, "market-news.json")),
      stats,
      "news"
    );
    if (!dryRun) writeJson(path.join(locDir, "market-news.json"), news);
  }

  console.log(
    `  done: changed=${stats.changed} same=${stats.same} skipped=${stats.skipped}` +
      (stats.samples.length ? ` samples=${stats.samples.join(", ")}` : "") +
      (dryRun ? " [dry-run]" : "")
  );
  return stats;
}

let totalChanged = 0;
for (const code of codes) {
  const s = applyLocale(code);
  totalChanged += s.changed;
}
console.log(`\n[apply] total changed leaves: ${totalChanged}${dryRun ? " (dry-run)" : ""}`);
