#!/usr/bin/env node
/**
 * Export side-by-side EN / locale review markdown packs under docs/i18n-review-{code}/.
 *
 * Usage:
 *   node scripts/i18n-export-review-md.mjs --locale fr
 *   node scripts/i18n-export-review-md.mjs --locale fr,es,he
 *   node scripts/i18n-export-review-md.mjs --locale hu   # regenerates HU-style pack
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const LOCALE_META = {
  hu: { code: "hu", label: "Hungarian", tag: "HU", dir: "docs/i18n-review-hu" },
  fr: { code: "fr", label: "French", tag: "FR", dir: "docs/i18n-review-fr" },
  es: { code: "es", label: "Spanish", tag: "ES", dir: "docs/i18n-review-es" },
  he: { code: "he", label: "Hebrew", tag: "HE", dir: "docs/i18n-review-he" },
};

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const localeArg = argValue("--locale") || "fr,es,he";
const codes = localeArg
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function flatten(obj, prefix = "", out = {}) {
  if (obj == null) return out;
  if (typeof obj === "string") {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function entry(key, en, loc, tag, notes = "") {
  const enS = esc(en);
  const locS = esc(loc);
  const long =
    enS.includes("\n") ||
    locS.includes("\n") ||
    enS.length > 120 ||
    locS.length > 120;
  const lines = [`### \`${key}\``, ""];
  if (notes) {
    lines.push(`*${notes}*`, "");
  }
  if (long) {
    lines.push("**EN:**", "", enS || "_(missing)_", "");
    lines.push(`**${tag}:**`, "", locS || "_(missing)_");
  } else {
    lines.push(`**EN:** ${enS || "_(missing)_"}`, "");
    lines.push(`**${tag}:** ${locS || "_(missing)_"}`);
  }
  lines.push("", "---", "");
  return lines.join("\n");
}

function writeFile(outDir, name, title, bodyParts, introExtra, tag) {
  const body = bodyParts.join("");
  const n = (body.match(/### `/g) || []).length;
  const today = new Date().toISOString().slice(0, 10);
  const text = `# ${title}

> Generated for human review of ${title.includes("French") ? "French" : title.includes("Spanish") ? "Spanish" : title.includes("Hebrew") ? "Hebrew" : "locale"} localization.  
> **Edit only the ${tag} text.** Keep keys (\`\` \`like.this\` \`\`) unchanged.  
> Date: ${today} · entries: ${n}

## How to correct

1. Edit **${tag}:** lines (or ${tag} blocks) in place.
2. Optional: add a line \`**NOTE:** ...\` under an entry if you want a comment.
3. When finished, tell the agent to apply corrections from \`${path.relative(ROOT, outDir)}/\`.

${introExtra}

---

${body}`;
  const p = path.join(outDir, name);
  fs.writeFileSync(p, text, "utf8");
  console.log(`  wrote ${path.relative(ROOT, p)} (${n} entries, ${(fs.statSync(p).size / 1024).toFixed(1)} KB)`);
  return n;
}

/** Extract EN UI defaults from t() call sites + index.html */
function extractEnUi() {
  const enUi = {};
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(js|mjs|html)$/.test(ent.name)) files.push(p);
    }
  }
  walk(path.join(ROOT, "js"));
  files.push(path.join(ROOT, "index.html"));

  function extractTCalls(text) {
    const results = [];
    let i = 0;
    while (true) {
      const j = text.indexOf("t(", i);
      if (j < 0) break;
      if (j > 0 && /[\w.$]/.test(text[j - 1])) {
        i = j + 2;
        continue;
      }
      let k = j + 2;
      while (k < text.length && " \t\n\r".includes(text[k])) k++;
      if (k >= text.length || (text[k] !== '"' && text[k] !== "'")) {
        i = j + 2;
        continue;
      }
      const quote = text[k++];
      const keyStart = k;
      while (k < text.length) {
        if (text[k] === "\\") {
          k += 2;
          continue;
        }
        if (text[k] === quote) break;
        k++;
      }
      const key = text.slice(keyStart, k);
      k++;
      let depth = 1;
      const args = [];
      let startArgs = k;
      let p = k;
      let inStr = null;
      let escape = false;
      while (p < text.length && depth > 0) {
        const ch = text[p];
        if (inStr) {
          if (escape) escape = false;
          else if (ch === "\\") escape = true;
          else if (ch === inStr) inStr = null;
        } else {
          if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
          else if (ch === "(") depth++;
          else if (ch === ")") {
            depth--;
            if (depth === 0) break;
          } else if (ch === "," && depth === 1) {
            args.push(text.slice(startArgs, p));
            startArgs = p + 1;
          }
        }
        p++;
      }
      args.push(text.slice(startArgs, p));
      if (args.length >= 2) {
        const last = args[args.length - 1].trim();
        const m = last.match(/^(["'])([\s\S]*)\1$/);
        if (m) {
          let def = m[2]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, "\\");
          results.push([key, def]);
        }
      }
      i = j + 2;
    }
    return results;
  }

  for (const f of files) {
    let text;
    try {
      text = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const [k, d] of extractTCalls(text)) {
      if (k && d && !enUi[k]) enUi[k] = d;
    }
  }

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const m of html.matchAll(/data-i18n="([^"]+)"([^>]*)>/g)) {
    const key = m[1];
    const rest = m[2];
    const dm = rest.match(/data-i18n-default="([^"]*)"/);
    if (dm) enUi[key] = dm[1];
    else {
      const start = m.index + m[0].length;
      const end = html.indexOf("<", start);
      if (end > start) {
        const txt = html.slice(start, end).replace(/\s+/g, " ").trim();
        if (txt && !enUi[key]) enUi[key] = txt;
      }
    }
  }
  for (const m of html.matchAll(/data-i18n-content="([^"]+)"[^>]*content="([^"]*)"/g)) {
    enUi[m[1]] = m[2];
  }
  for (const m of html.matchAll(/data-i18n-title="([^"]+)"[^>]*title="([^"]*)"/g)) {
    enUi[m[1]] = m[2];
  }
  for (const m of html.matchAll(/title="([^"]*)"[^>]*data-i18n-title="([^"]+)"/g)) {
    if (!enUi[m[2]]) enUi[m[2]] = m[1];
  }
  return enUi;
}

async function loadEnglishContent() {
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
  const yearNews = data.YEAR_NEWS || [];
  const foresight = data.FORESIGHT || [];
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
    domains,
    shelves,
    globals,
    techs,
    challengeAngles,
    visionStages,
    yearNews,
    foresight,
    missions,
    problemBriefs: PROBLEM_BRIEFS || {},
    marketNews,
    scenarioSeeds,
  };
}

function readLocaleJson(code, file) {
  const p = path.join(ROOT, "locales", code, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function packSectionIdFields(title, packFile, enMap, locMap, tag) {
  const parts = [`## ${title}\n\n`, `Source pack: \`locales/{code}/${packFile}\`\n\n`];
  const en = enMap || {};
  const loc = locMap || {};
  const ids = [...new Set([...Object.keys(en), ...Object.keys(loc)])].sort();
  for (const id of ids) {
    const enItem = en[id] || {};
    const locItem = loc[id] || {};
    const enFlat = flatten(typeof enItem === "object" ? enItem : { value: enItem });
    const locFlat = flatten(typeof locItem === "object" ? locItem : { value: locItem });
    const fields = [...new Set([...Object.keys(enFlat), ...Object.keys(locFlat)])].sort();
    for (const f of fields) {
      parts.push(entry(`${id}.${f}`, enFlat[f], locFlat[f], tag));
    }
  }
  return parts;
}

async function exportLocale(code, enUi, enContent) {
  const meta = LOCALE_META[code];
  if (!meta) throw new Error(`Unknown locale ${code}`);
  const outDir = path.join(ROOT, meta.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const tag = meta.tag;
  const label = meta.label;
  console.log(`[review] ${code} → ${meta.dir}`);

  // 01 UI
  const locUi = readLocaleJson(code, "ui.json") || {};
  const locUiFlat = flatten(locUi);
  const uiParts = [];
  let missingEn = 0;
  for (const key of Object.keys(locUiFlat).sort()) {
    const en = enUi[key] || "";
    if (!en) missingEn++;
    uiParts.push(
      entry(
        key,
        en,
        locUiFlat[key],
        tag,
        en ? "" : "EN source not found in code/HTML — verify sense from locale or context"
      )
    );
  }
  const extraEn = Object.keys(enUi)
    .filter((k) => !(k in locUiFlat))
    .sort();
  if (extraEn.length) {
    uiParts.push(`## Keys present in EN extract but missing from ${tag} pack\n\n`);
    for (const key of extraEn) {
      uiParts.push(
        entry(key, enUi[key], "", tag, `Missing ${tag} — add if still used in UI`)
      );
    }
  }
  const nUi = writeFile(
    outDir,
    "01-ui.md",
    `${label} review — UI chrome (\`locales/${code}/ui.json\`)`,
    uiParts,
    `Pack path: \`locales/${code}/ui.json\`  \nEN sources: \`t(..., "default")\` call sites + \`index.html\` data-i18n  \n${tag} keys without EN extract: **${missingEn}** · EN keys without ${tag}: **${extraEn.length}**`,
    tag
  );

  // 02 catalog
  let catParts = [];
  catParts = catParts.concat(
    packSectionIdFields(
      "Domains",
      "domains.json",
      enContent.domains,
      readLocaleJson(code, "domains.json"),
      tag
    )
  );
  catParts = catParts.concat(
    packSectionIdFields(
      "Shelves",
      "shelves.json",
      enContent.shelves,
      readLocaleJson(code, "shelves.json"),
      tag
    )
  );
  catParts = catParts.concat(
    packSectionIdFields(
      "Globals (themes)",
      "globals.json",
      enContent.globals,
      readLocaleJson(code, "globals.json"),
      tag
    )
  );
  catParts = catParts.concat(
    packSectionIdFields(
      "Challenge angles",
      "challenge-angles.json",
      enContent.challengeAngles,
      readLocaleJson(code, "challenge-angles.json"),
      tag
    )
  );
  catParts = catParts.concat(
    packSectionIdFields(
      "Vision stages",
      "vision-stages.json",
      enContent.visionStages,
      readLocaleJson(code, "vision-stages.json"),
      tag
    )
  );
  catParts = catParts.concat(
    packSectionIdFields(
      "Missions (tutorial / fixed)",
      "missions.json",
      enContent.missions,
      readLocaleJson(code, "missions.json"),
      tag
    )
  );

  const ynLoc = readLocaleJson(code, "year-news.json") || {};
  catParts.push("## Year news\n\n", `Source pack: \`locales/${code}/year-news.json\`\n\n`);
  const ynEn = enContent.yearNews || [];
  const ynKeys = Object.keys(ynLoc).sort((a, b) => Number(a) - Number(b));
  for (const i of ynKeys) {
    const huItem = ynLoc[i];
    const enItem = ynEn[Number(i)] || {};
    const textLoc = typeof huItem === "object" ? huItem.text : huItem;
    const textEn = typeof enItem === "object" ? enItem.text : "";
    catParts.push(entry(`yearNews.${i}.text`, textEn, textLoc, tag));
  }

  const fsLoc = readLocaleJson(code, "foresight.json") || {};
  catParts.push("## Foresight\n\n", `Source pack: \`locales/${code}/foresight.json\`\n\n`);
  const fsEn = enContent.foresight || [];
  for (const i of Object.keys(fsLoc).sort((a, b) => Number(a) - Number(b))) {
    const item = fsLoc[i];
    const enItem = fsEn[Number(i)] || {};
    const textLoc = typeof item === "object" ? item.text : item;
    const textEn = typeof enItem === "object" ? enItem.text : "";
    catParts.push(entry(`foresight.${i}.text`, textEn, textLoc, tag));
  }

  // Fix pack path placeholders in catalog sections
  catParts = catParts.map((s) =>
    typeof s === "string" ? s.replaceAll("locales/{code}/", `locales/${code}/`) : s
  );

  const nCat = writeFile(
    outDir,
    "02-catalog.md",
    `${label} review — catalog (domains, themes, missions, …)`,
    catParts,
    "",
    tag
  );

  // 03 techs
  const techParts = packSectionIdFields(
    "Techs",
    "techs.json",
    enContent.techs,
    readLocaleJson(code, "techs.json"),
    tag
  ).map((s) =>
    typeof s === "string" ? s.replaceAll("locales/{code}/", `locales/${code}/`) : s
  );
  const nTech = writeFile(
    outDir,
    "03-techs.md",
    `${label} review — technologies (\`locales/${code}/techs.json\`)`,
    techParts,
    "",
    tag
  );

  // 04 problem briefs
  const enB = enContent.problemBriefs || {};
  const locB = readLocaleJson(code, "problem-briefs.json") || {};
  const briefParts = [];
  for (const id of [...new Set([...Object.keys(enB), ...Object.keys(locB)])].sort()) {
    const enItem = enB[id] || {};
    const locItem = locB[id] || {};
    const enFlat = flatten(enItem);
    const locFlat = flatten(locItem);
    // Prefer indexed arrays for list fields
    for (const f of [...new Set([...Object.keys(enFlat), ...Object.keys(locFlat)])].sort()) {
      briefParts.push(entry(`${id}.${f}`, enFlat[f], locFlat[f], tag));
    }
  }
  const nBrief = writeFile(
    outDir,
    "04-problem-briefs.md",
    `${label} review — problem briefs (\`locales/${code}/problem-briefs.json\`)`,
    briefParts,
    "",
    tag
  );

  // 05 scenario seeds
  const enS = enContent.scenarioSeeds || {};
  const locS = readLocaleJson(code, "scenario-seeds.json") || {};
  const seedParts = [];
  const missLoc = Object.keys(enS)
    .filter((id) => !locS[id])
    .sort();
  const missEn = Object.keys(locS)
    .filter((id) => !enS[id])
    .sort();
  if (missLoc.length) {
    seedParts.push(`## Missing ${tag} overlays (${missLoc.length})\n\n`);
    for (const id of missLoc) seedParts.push(`- \`${id}\`\n`);
    seedParts.push("\n");
  }
  for (const id of [...new Set([...Object.keys(enS), ...Object.keys(locS)])].sort()) {
    const enItem = enS[id] || {};
    const locItem = locS[id] || {};
    seedParts.push(`## Seed \`${id}\`\n\n`);
    for (const f of ["title", "stakeholder", "scene"]) {
      seedParts.push(entry(`${id}.${f}`, enItem[f], locItem[f], tag));
    }
    const ep = enItem.places || [];
    const lp = locItem.places || [];
    const pn = Math.max(ep.length, lp.length, 1);
    for (let i = 0; i < pn; i++) {
      seedParts.push(entry(`${id}.places.${i}`, ep[i], lp[i], tag));
    }
    const ek = enItem.pressureKeys || [];
    const lk = locItem.pressureKeys || [];
    const kn = Math.max(ek.length, lk.length, 1);
    for (let i = 0; i < kn; i++) {
      seedParts.push(entry(`${id}.pressureKeys.${i}`, ek[i], lk[i], tag));
    }
  }
  const nSeed = writeFile(
    outDir,
    "05-scenario-seeds.md",
    `${label} review — scenario seeds (\`locales/${code}/scenario-seeds.json\`)`,
    seedParts,
    `EN seedIds: ${Object.keys(enS).length} · ${tag} overlays: ${Object.keys(locS).length} · missing ${tag}: ${missLoc.length} · extra ${tag}: ${missEn.length}`,
    tag
  );

  // 06 market news
  const enM = enContent.marketNews || {};
  const locM = readLocaleJson(code, "market-news.json") || {};
  const mnParts = [];
  for (const id of [...new Set([...Object.keys(enM), ...Object.keys(locM)])].sort()) {
    const enItem = enM[id] || {};
    const locItem = locM[id] || {};
    mnParts.push(entry(`${id}.headline`, enItem.headline, locItem.headline, tag));
    mnParts.push(entry(`${id}.body`, enItem.body, locItem.body, tag));
  }
  const nMn = writeFile(
    outDir,
    "06-market-news.md",
    `${label} review — market news (\`locales/${code}/market-news.json\`)`,
    mnParts,
    "",
    tag
  );

  const readme = `# ${label} translation review pack

Side-by-side **English / ${label}** strings for review and correction.

| File | Contents | Entries (approx) |
|------|----------|------------------|
| [01-ui.md](./01-ui.md) | UI chrome (\`locales/${code}/ui.json\`) | ${nUi} |
| [02-catalog.md](./02-catalog.md) | Domains, shelves, globals, angles, vision, missions, year news, foresight | ${nCat} |
| [03-techs.md](./03-techs.md) | Technology catalog | ${nTech} |
| [04-problem-briefs.md](./04-problem-briefs.md) | Theme problem briefs | ${nBrief} |
| [05-scenario-seeds.md](./05-scenario-seeds.md) | Local mission angle packs (largest) | ${nSeed} |
| [06-market-news.md](./06-market-news.md) | Market news headlines/bodies | ${nMn} |

## How to edit

1. Open any file above.
2. Change only text after **\`${tag}:\`** (or the ${tag} block for long strings).
3. **Do not rename** keys in headings like \`\` \`title.tagline\` \`\`.
4. Optional reviewer notes: add \`**NOTE:** …\` under an entry.

## After you finish

Tell the agent something like:

> Apply my corrections from \`docs/i18n-review-${code}/\`

It should parse the ${tag} fields and write back into \`locales/${code}/*.json\` (and re-run i18n tests).

## Notes

- First-pass packs may be machine-translated — edit freely for natural ${label}.
- Scenario seed places (city names) are often left in English on purpose.
- Brand names **Future Forge** and **Warmer Sun** stay untranslated.
- Regenerate this pack: \`node scripts/i18n-export-review-md.mjs --locale ${code}\`
`;
  fs.writeFileSync(path.join(outDir, "README.md"), readme, "utf8");
  console.log(
    `  total entries ~${nUi + nCat + nTech + nBrief + nSeed + nMn}`
  );
}

async function main() {
  console.log("[review] extracting EN UI…");
  const enUi = extractEnUi();
  console.log(`[review] EN UI keys: ${Object.keys(enUi).length}`);
  console.log("[review] loading EN content…");
  const enContent = await loadEnglishContent();
  for (const code of codes) {
    await exportLocale(code, enUi, enContent);
  }
  console.log("[review] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
