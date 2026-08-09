#!/usr/bin/env node
/**
 * Build first-pass locale packs for fr / es / he from English (+ HU structure).
 * Uses the public Google Translate endpoint (no API key). Offline draft quality.
 *
 * Usage:
 *   node scripts/i18n-build-locale-packs.mjs
 *   node scripts/i18n-build-locale-packs.mjs --only fr
 *   node scripts/i18n-build-locale-packs.mjs --only fr,es --files ui.json,domains.json
 *   node scripts/i18n-build-locale-packs.mjs --concurrency 12
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HU_DIR = path.join(ROOT, "locales", "hu");

const ALL_FILES = [
  "ui.json",
  "domains.json",
  "shelves.json",
  "globals.json",
  "techs.json",
  "challenge-angles.json",
  "vision-stages.json",
  "year-news.json",
  "foresight.json",
  "missions.json",
  "problem-briefs.json",
  "scenario-seeds.json",
  "market-news.json",
];

const TARGETS = {
  fr: { code: "fr", gtx: "fr", name: "French" },
  es: { code: "es", gtx: "es", name: "Spanish" },
  he: { code: "he", gtx: "iw", name: "Hebrew" },
};

const DO_NOT_TRANSLATE = [
  "Future Forge",
  "Warmer Sun",
  "SCAMPER",
  "SIT",
  "JSON",
  "AP",
  "HUD",
  "TTS",
];

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const onlyRaw = argValue("--only");
const filesRaw = argValue("--files");
const concurrency = Math.max(1, Number(argValue("--concurrency") || 10));
const targetCodes = onlyRaw
  ? onlyRaw.split(",").map((s) => s.trim()).filter(Boolean)
  : Object.keys(TARGETS);
const fileList = filesRaw
  ? filesRaw.split(",").map((s) => s.trim()).filter(Boolean)
  : ALL_FILES;

/** @type {Map<string, string>} */
const cache = new Map();
let apiCalls = 0;
let apiFails = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function protect(text) {
  const holds = [];
  let s = String(text);
  for (const brand of DO_NOT_TRANSLATE) {
    if (!s.includes(brand)) continue;
    s = s.split(brand).join(`⟦${holds.length}⟧`);
    holds.push(brand);
  }
  s = s.replace(/\{(\w+)\}/g, (_, name) => {
    const i = holds.length;
    holds.push(`{${name}}`);
    return `⟦${i}⟧`;
  });
  return { s, holds };
}

function restore(text, holds) {
  let s = String(text ?? "");
  for (let i = 0; i < holds.length; i++) {
    s = s.split(`⟦${i}⟧`).join(holds[i]);
    s = s.split(`[${i}]`).join(holds[i]);
  }
  return s;
}

async function gtxTranslateOnce(text, tl, sl) {
  const { s: protectedText, holds } = protect(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
    encodeURIComponent(sl) +
    "&tl=" +
    encodeURIComponent(tl) +
    "&dt=t&q=" +
    encodeURIComponent(protectedText);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  apiCalls += 1;
  const parts = Array.isArray(data?.[0]) ? data[0] : [];
  const joined = parts.map((p) => (Array.isArray(p) ? p[0] : "")).join("");
  return restore(joined || text, holds);
}

async function translateText(text, tl, sl = "en") {
  const key = `${sl}|${tl}|${text}`;
  if (cache.has(key)) return cache.get(key);
  if (!text || !String(text).trim()) {
    cache.set(key, text);
    return text;
  }
  if (!/[\p{L}\p{N}]/u.test(text)) {
    cache.set(key, text);
    return text;
  }
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const out = await gtxTranslateOnce(text, tl, sl);
      cache.set(key, out);
      return out;
    } catch (e) {
      lastErr = e;
      await sleep(250 * (attempt + 1));
    }
  }
  apiFails += 1;
  console.warn("[i18n-build] keep source:", lastErr?.message || lastErr);
  cache.set(key, text);
  return text;
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const n = Math.min(limit, items.length || 1);
  await Promise.all(Array.from({ length: n }, () => run()));
  return results;
}

function collectStringJobs(obj, path = "", jobs = []) {
  if (typeof obj === "string") {
    jobs.push({ path, value: obj });
    return jobs;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collectStringJobs(v, path ? `${path}.${i}` : String(i), jobs));
    return jobs;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      collectStringJobs(v, path ? `${path}.${k}` : k, jobs);
    }
  }
  return jobs;
}

function setPath(root, pathStr, value) {
  const parts = String(pathStr).split(".");
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    const nextIsIndex = /^\d+$/.test(next);
    if (cur[p] == null) cur[p] = nextIsIndex ? [] : {};
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  cur[last] = value;
}

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function mergeEnOntoHuShape(huTree, enTree) {
  if (typeof huTree === "string") {
    if (typeof enTree === "string" && enTree.trim()) return enTree;
    return huTree;
  }
  if (Array.isArray(huTree)) {
    return huTree.map((v, i) =>
      mergeEnOntoHuShape(v, Array.isArray(enTree) ? enTree[i] : undefined)
    );
  }
  if (huTree && typeof huTree === "object") {
    const out = {};
    for (const [k, v] of Object.entries(huTree)) {
      const enV = enTree && typeof enTree === "object" ? enTree[k] : undefined;
      out[k] = mergeEnOntoHuShape(v, enV);
    }
    return out;
  }
  return huTree;
}

function detectSl(str) {
  return /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(str) ? "hu" : "en";
}

async function translateTree(sourceTree, tlGtx) {
  const jobs = collectStringJobs(sourceTree);
  // Unique by sl|text
  const uniq = new Map(); // key -> {sl, text}
  for (const j of jobs) {
    const sl = detectSl(j.value);
    const k = `${sl}\0${j.value}`;
    if (!uniq.has(k)) uniq.set(k, { sl, text: j.value });
  }
  const uniqueList = [...uniq.entries()];
  await mapPool(uniqueList, concurrency, async ([k, { sl, text }]) => {
    const translated = await translateText(text, tlGtx, sl);
    uniq.set(k, { sl, text, translated });
  });
  const out = cloneJson(sourceTree);
  for (const j of jobs) {
    const sl = detectSl(j.value);
    const k = `${sl}\0${j.value}`;
    const hit = uniq.get(k);
    setPath(out, j.path, hit?.translated ?? j.value);
  }
  return { tree: out, stringCount: jobs.length, unique: uniqueList.length };
}

async function loadEnglishPacks() {
  const data = await import(pathToFileURL(path.join(ROOT, "js/data.js")).href);
  const { PROBLEM_BRIEFS } = await import(
    pathToFileURL(path.join(ROOT, "js/problem-briefs.js")).href
  );
  const { MARKET_EVENTS } = await import(
    pathToFileURL(path.join(ROOT, "js/sim/market-news.js")).href
  );
  const { SCENARIO_ANGLE_PACKS } = await import(
    pathToFileURL(path.join(ROOT, "js/scenario-seeds.js")).href
  );

  const domains = {};
  for (const [id, d] of Object.entries(data.DOMAINS || {})) {
    domains[id] = { label: d.label };
  }
  const shelves = {};
  for (const s of data.THEME_SHELVES || []) shelves[s.id] = { title: s.title };
  const globals = {};
  for (const g of data.GLOBALS || []) {
    globals[g.id] = { title: g.title, blurb: g.blurb };
  }
  const techs = {};
  for (const t of data.TECHS || []) {
    techs[t.id] = {
      name: t.name,
      summary: t.summary,
      learn: t.learn,
      inventionHint: t.inventionHint,
      risk: t.risk,
      scarcity: t.scarcity,
      primer: t.primer,
      maturity: t.maturity,
      milestones: t.milestones,
      useCasesNow: t.useCasesNow,
      narrative: t.narrative,
    };
  }
  const challengeAngles = {};
  for (const a of data.CHALLENGE_ANGLES || []) {
    challengeAngles[a.id] = {
      label: a.label,
      subtitle: a.subtitle,
      blurb: a.blurb,
    };
  }
  const visionStages = {};
  for (const v of data.VISION_STAGES || []) {
    visionStages[v.id] = { name: v.name, blurb: v.blurb };
  }
  const yearNews = {};
  (data.YEAR_NEWS || []).forEach((row, i) => {
    yearNews[String(i)] = { text: row.text, minYear: row.minYear };
  });
  const foresight = {};
  (data.FORESIGHT || []).forEach((row, i) => {
    foresight[String(i)] = { text: row.text, kind: row.kind };
  });
  const missions = {};
  for (const m of data.MISSIONS || []) {
    missions[m.id] = {
      title: m.title,
      place: m.place,
      scene: m.scene,
      stakeholder: m.stakeholder,
    };
  }
  const marketNews = {};
  for (const n of MARKET_EVENTS || []) {
    marketNews[n.id] = { headline: n.headline, body: n.body };
  }
  const scenarioSeeds = {};
  for (const pack of Object.values(SCENARIO_ANGLE_PACKS || {})) {
    for (const s of pack || []) {
      if (!s.seedId) continue;
      scenarioSeeds[s.seedId] = {
        title: s.title,
        scene: s.scene,
        stakeholder: s.stakeholder,
        places: s.places,
        pressureKeys: s.crisisMeters
          ? [s.crisisMeters.local, s.crisisMeters.global, s.crisisMeters.support].filter(
              Boolean
            )
          : s.pressureKeys,
      };
    }
  }

  return {
    "domains.json": domains,
    "shelves.json": shelves,
    "globals.json": globals,
    "techs.json": techs,
    "challenge-angles.json": challengeAngles,
    "vision-stages.json": visionStages,
    "year-news.json": yearNews,
    "foresight.json": foresight,
    "missions.json": missions,
    "problem-briefs.json": PROBLEM_BRIEFS || {},
    "scenario-seeds.json": scenarioSeeds,
    "market-news.json": marketNews,
  };
}

async function main() {
  console.log(`[i18n-build] concurrency=${concurrency}`);
  console.log("[i18n-build] loading English sources…");
  const enPacks = await loadEnglishPacks();

  for (const code of targetCodes) {
    const meta = TARGETS[code];
    if (!meta) {
      console.error("Unknown target", code);
      process.exit(1);
    }
    const outDir = path.join(ROOT, "locales", code);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`[i18n-build] → ${code} (${meta.name})`);

    for (const file of fileList) {
      const huPath = path.join(HU_DIR, file);
      if (!fs.existsSync(huPath)) {
        console.warn("  skip missing HU", file);
        continue;
      }
      const huTree = JSON.parse(fs.readFileSync(huPath, "utf8"));
      const enOverlay = file === "ui.json" ? null : enPacks[file] || null;
      const sourceTree = mergeEnOntoHuShape(huTree, enOverlay || {});
      process.stdout.write(`  ${file} … `);
      const t0 = Date.now();
      const { tree, stringCount, unique } = await translateTree(sourceTree, meta.gtx);
      fs.writeFileSync(
        path.join(outDir, file),
        JSON.stringify(tree, null, 2) + "\n",
        "utf8"
      );
      console.log(
        `${stringCount} strings (${unique} unique) ${Date.now() - t0}ms api=${apiCalls} fails=${apiFails}`
      );
    }
  }
  console.log("[i18n-build] done. api calls:", apiCalls, "fails:", apiFails, "cache:", cache.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
