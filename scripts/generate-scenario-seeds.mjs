#!/usr/bin/env node
/**
 * Regenerate curated quest packs (js/scenario-seeds.js) for every theme.
 *
 * Uses the same generate-scenarios path as the game:
 *   1) Live SuperGrok / XAI (preferred) via co-invent
 *   2) Local seed builder fallback if AI is offline
 *
 * Usage:
 *   node scripts/generate-scenario-seeds.mjs
 *   node scripts/generate-scenario-seeds.mjs --themes air,climate
 *   node scripts/generate-scenario-seeds.mjs --themes=air,climate
 *   node scripts/generate-scenario-seeds.mjs --local-only
 *   node scripts/generate-scenario-seeds.mjs --dry-run
 *
 * Requires SuperGrok session (~/.grok/auth.json) or FF_XAI_API_KEY for AI packs.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import {
  GAME,
  GLOBALS,
  TECHS,
  localScenariosForGlobal,
  techForAi,
} from "../js/data.js";
import { themeDepthFor } from "../js/sim/sustainable.js";
import {
  SCENE_PROSE,
  SCENE_PROSE_CAPSULE,
  SCENE_HINT_REWRITE,
  SCENE_CHAR_CAP,
  assertSceneReadable,
  sceneRepairInstruction,
} from "../js/scene-prose.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "js/scenario-seeds.js");
const GROK_HOME = process.env.FF_GROK_HOME || path.join(os.homedir(), ".grok");
const AUTH_PATH = path.join(GROK_HOME, "auth.json");
const XAI_BASE = "https://api.x.ai/v1";
const MODEL = process.env.FF_XAI_MODEL || "grok-4.5";
const SCENARIO_COUNT = 4;

/**
 * Parse CLI args. Supports:
 *   --themes=a,b
 *   --themes a,b
 *   --themes a --themes b
 * Unknown flags are ignored except a missing value after --themes errors.
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ localOnly: boolean, dryRun: boolean, themeFilter: string[] | null }}
 */
export function parseSeedArgs(argv) {
  const localOnly = argv.includes("--local-only");
  const dryRun = argv.includes("--dry-run");
  /** @type {string[]} */
  const themeIds = [];
  let sawThemesFlag = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local-only" || a === "--dry-run") continue;
    if (a.startsWith("--themes=")) {
      sawThemesFlag = true;
      themeIds.push(
        ...a
          .slice("--themes=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
      continue;
    }
    if (a === "--themes") {
      sawThemesFlag = true;
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--themes requires a value (e.g. --themes maternal,food or --themes=maternal,food)");
      }
      themeIds.push(
        ...next
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
      i += 1;
      continue;
    }
  }

  if (sawThemesFlag && themeIds.length === 0) {
    throw new Error("--themes was set but no theme ids parsed");
  }

  const themeFilter = sawThemesFlag ? [...new Set(themeIds)] : null;
  return { localOnly, dryRun, themeFilter };
}

const args = process.argv.slice(2);
const { localOnly, dryRun, themeFilter } = parseSeedArgs(args);

function loadEnvFile() {
  for (const file of [path.join(ROOT, ".env"), path.join(ROOT, ".env.local")]) {
    if (!fs.existsSync(file)) continue;
    for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
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
}

loadEnvFile();

function readAuthFile() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const all = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const storeKey = all.active || Object.keys(all.sessions || all)[0];
    const entry =
      all.sessions?.[storeKey] ||
      all[storeKey] ||
      (all.key || all.accessToken ? all : null);
    if (!entry?.key && !entry?.accessToken) return null;
    return {
      storeKey,
      entry: {
        ...entry,
        key: entry.key || entry.accessToken,
        email: entry.email || storeKey,
      },
      all,
    };
  } catch {
    return null;
  }
}

function tokenExpired(entry) {
  if (!entry?.expiresAt && !entry?.expires) return false;
  const exp = Date.parse(entry.expiresAt || entry.expires);
  if (!Number.isFinite(exp)) return false;
  return Date.now() > exp - 60_000;
}

async function refreshSuperGrokToken(storeKey, entry, all) {
  const refresh = entry.refreshToken || entry.refresh_token;
  if (!refresh) throw new Error("No refresh token");
  const res = await fetch("https://auth.x.ai/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  if (!res.ok) throw new Error(`refresh failed ${res.status}`);
  const data = await res.json();
  const key = data.access_token;
  if (!key) throw new Error("no access_token");
  entry.key = key;
  if (data.expires_in) {
    entry.expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  }
  if (all.sessions?.[storeKey]) all.sessions[storeKey] = entry;
  try {
    fs.writeFileSync(AUTH_PATH, JSON.stringify(all, null, 2));
  } catch {
    /* ignore */
  }
  return key;
}

async function resolveAccessToken() {
  const session = readAuthFile();
  if (session) {
    try {
      if (tokenExpired(session.entry)) {
        return await refreshSuperGrokToken(session.storeKey, session.entry, session.all);
      }
      return session.entry.key;
    } catch (e) {
      console.warn("[auth]", e.message);
    }
  }
  const apiKey = process.env.FF_XAI_API_KEY || "";
  if (apiKey && !apiKey.startsWith("eyJ")) return apiKey;
  if (session?.entry?.key) return session.entry.key;
  return null;
}

const MODE_INSTRUCTION =
  "Generate MULTIPLE distinct local Quests (crisis episodes) for context.globalTheme (a global problem). " +
  "Return top-level scenarios: an array of 4 objects (or context.scenarioCount). " +
  "Each Quest MUST be a concrete place living a piece of the global problem — different geographies, stakeholders, and angles. " +
  "Each scene MUST include BOTH (1) lived local harm people feel now AND (2) a local driver/system that keeps producing the theme problem — not only how people shelter from symptoms. " +
  SCENE_PROSE +
  " Each object fields: id (slug), title, place, scene, stakeholder, startYear (2026), collapseYear (2032–2036), yearsPerTurn (2), " +
  "pressure (structured crisis meters — see CRITICAL), " +
  "suggested (tech ids from availableTechs only — mix protection and abatement when relevant), " +
  "visionTheme (one of: coastal-city, food-city, care-city, energy-city, learn-city, rebuild-city, social-city, ocean-city), " +
  "source ('generated'). message: one short invite line. proposals empty. Follow context.guidance when present. " +
  "CRITICAL — pressure is an object with up to three role keys: local, global, support. " +
  "Omit a role to leave that crisis meter off the HUD. " +
  "Each present role is { \"label\": \"plain English HUD name\", \"pressure\": 0-5, \"pressureRise\": 0-3, \"winMax\": 0-5 }. " +
  "local = lived local harm; global = systemic/driver pressure; support = trust/legitimacy/public fear. " +
  "label: plain English, 1–3 words, Title Case with spaces. " +
  "Good labels: \"Dirty air\", \"Sick days\", \"Truck exhaust\", \"Flooding\", \"Jobs\". " +
  "BAD labels: AlleyPM, BenzeneSpikes, GensetHours, CorridorPM. " +
  "Default full Quest uses all three roles.";

const SYSTEM = `You are the AI Co-Inventor in Future Forge.
When mode is generate-scenarios: invent MULTIPLE distinct local mission scenarios for context.globalTheme.
Return a single JSON object only (no markdown fences) with top-level "scenarios" array and "message".
Hard rules: only use technology ids from availableTechs; stay local; concrete inventable places.
${SCENE_PROSE_CAPSULE}
Crisis meter names on the HUD must be plain English anyone understands — never camelCase codes or lab jargon.`;

function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function humanizeMeterKey(key) {
  const s = String(key || "").trim();
  if (!s) return "";
  if (/\s/.test(s)) return s;
  let spaced = s.replace(/[_-]+/g, " ");
  spaced = spaced.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  spaced = spaced.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

const CRISIS_ROLES = ["local", "global", "support"];

/**
 * Extract crisisMeters { local, global, support } labels from AI / legacy scenario JSON.
 * @returns {Record<string, string>}
 */
function extractCrisisMeters(raw) {
  /** @type {Record<string, string>} */
  const meters = {};
  const p = raw?.pressure;
  const cm = raw?.crisisMeters;
  if (cm && typeof cm === "object" && !Array.isArray(cm)) {
    for (const role of CRISIS_ROLES) {
      if (cm[role] == null) continue;
      if (typeof cm[role] === "string") {
        const lab = humanizeMeterKey(cm[role]) || String(cm[role]).trim();
        if (lab) meters[role] = lab;
      } else if (typeof cm[role] === "object" && cm[role].label) {
        const lab = humanizeMeterKey(cm[role].label) || String(cm[role].label);
        if (lab) meters[role] = lab;
      }
    }
  }
  if (Object.keys(meters).length) return meters;

  if (p && typeof p === "object" && !Array.isArray(p)) {
    const structured =
      Object.keys(p).some((k) => CRISIS_ROLES.includes(k)) &&
      Object.keys(p).every(
        (k) =>
          !CRISIS_ROLES.includes(k) ||
          (p[k] && typeof p[k] === "object" && !Array.isArray(p[k]))
      );
    if (structured) {
      for (const role of CRISIS_ROLES) {
        if (!p[role]) continue;
        const lab =
          humanizeMeterKey(p[role].label || role) || String(p[role].label || role);
        if (lab) meters[role] = lab;
      }
      if (Object.keys(meters).length) return meters;
    }
    // Flat legacy: first three keys → local, global, support
    Object.keys(p)
      .slice(0, 3)
      .forEach((k, i) => {
        const role = CRISIS_ROLES[i];
        const v = p[k];
        const lab =
          v && typeof v === "object" && v.label
            ? humanizeMeterKey(v.label) || String(v.label)
            : k === "Trust"
              ? "Trust"
              : humanizeMeterKey(k) || String(k).slice(0, 40);
        if (lab) meters[role] = lab;
      });
  }
  if (!Object.keys(meters).length) {
    return { local: "Pressure", global: "Capacity", support: "Trust" };
  }
  return meters;
}

function normalizeScenario(raw, globalId) {
  const place = String(raw.place || "Local place").slice(0, 80);
  const title = String(raw.title || "Local Quest").slice(0, 100);
  const crisisMeters = extractCrisisMeters(raw);
  const valid = new Set(TECHS.map((t) => t.id));
  const suggested = (Array.isArray(raw.suggested) ? raw.suggested : [])
    .map(String)
    .filter((id) => valid.has(id))
    .slice(0, 8);
  return {
    places: [place],
    title,
    scene: String(raw.scene || "").slice(0, SCENE_CHAR_CAP),
    stakeholder: String(raw.stakeholder || "Local working group").slice(0, 120),
    crisisMeters,
    suggested: suggested.length ? suggested : ["ai", "iot", "networks"],
    visionTheme: String(raw.visionTheme || "rebuild-city").slice(0, 40),
  };
}

function localPackForTheme(g) {
  const list = localScenariosForGlobal(g, { count: SCENARIO_COUNT, salt: 0 });
  return list.map((m) => {
    /** @type {Record<string, string>} */
    const crisisMeters = {};
    const p = m.pressure;
    if (p && typeof p === "object") {
      for (const role of CRISIS_ROLES) {
        if (p[role]?.label) crisisMeters[role] = String(p[role].label);
      }
    }
    if (!Object.keys(crisisMeters).length) {
      Object.assign(crisisMeters, {
        local: "Pressure",
        global: "Capacity",
        support: "Trust",
      });
    }
    return {
      places: [m.place],
      title: m.title,
      scene: m.scene,
      stakeholder: m.stakeholder || "Local working group",
      crisisMeters,
      suggested: m.suggested || ["ai", "iot", "networks"],
      visionTheme: m.visionTheme || "rebuild-city",
    };
  });
}

function parseScenarioList(text) {
  const parsed = extractJson(text);
  const list = Array.isArray(parsed?.scenarios)
    ? parsed.scenarios
    : Array.isArray(parsed?.missions)
      ? parsed.missions
      : [];
  return list;
}

/**
 * @param {import("openai").default} client
 * @param {object} g
 * @param {object} payload
 * @param {string} [extraUser]
 */
async function callScenarioModel(client, payload, extraUser = "") {
  const response = await client.responses.create({
    model: MODEL,
    temperature: 0.55,
    input: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          `Co-invention session state (JSON):\n${JSON.stringify(payload, null, 2)}\n\n` +
          (extraUser ? `${extraUser}\n\n` : "") +
          `Respond with the required JSON object only.`,
      },
    ],
  });
  return response.output_text || "";
}

/**
 * @param {object[]} packs normalized packs
 * @returns {{ ok: boolean, reasons: string[], failedIndexes: number[] }}
 */
function scorePackReadability(packs) {
  /** @type {string[]} */
  const reasons = [];
  /** @type {number[]} */
  const failedIndexes = [];
  packs.forEach((p, i) => {
    const r = assertSceneReadable(p.scene);
    if (!r.ok) {
      failedIndexes.push(i);
      for (const reason of r.reasons) {
        reasons.push(`[${i}]${reason}`);
      }
    }
  });
  return { ok: failedIndexes.length === 0, reasons, failedIndexes };
}

async function aiPackForTheme(client, g) {
  const depth = themeDepthFor(g);
  // Place/title/stakeholder only — omit full scene so old dense prose cannot re-bias style.
  const seedMissions = localScenariosForGlobal(g, { count: SCENARIO_COUNT, salt: 0 }).map(
    (m) => ({
      id: m.id,
      title: m.title,
      place: m.place,
      stakeholder: m.stakeholder,
      suggested: m.suggested,
      visionTheme: m.visionTheme,
      pressure: m.pressure,
      collapseYear: m.collapseYear,
      sceneHint: SCENE_HINT_REWRITE,
    })
  );
  const guidance =
    "Quests are local crisis episodes under this theme. Each quest scene MUST include: " +
    "(1) lived local harm in a concrete place, (2) a local driver of the theme problem " +
    "(not only how people shelter from it). Different geographies and stakeholders. " +
    "Inventable with emerging tech. Pure shelter-only framing is incomplete for source themes. " +
    SCENE_PROSE +
    " seedMissions are topic anchors only (place/title); invent fresh scene text with story craft — never copy prior dense style. " +
    " Crisis meter names (pressure object keys) appear on the player HUD: plain English, 1–3 words " +
    "(Dirty air, Sick days, Truck exhaust) — never camelCase or opaque jargon. " +
    "Asteroid = civilization-class NEO; nuclear = strategic misjudgment risk.";

  const payload = {
    mode: "generate-scenarios",
    modeInstruction: MODE_INSTRUCTION,
    globalTheme: {
      id: g.id,
      title: g.title,
      blurb: g.blurb,
      kind: g.kind,
    },
    scenarioCount: SCENARIO_COUNT,
    seedMissions,
    forceRegen: true,
    guidance,
    depthCharacter: depth.depthCharacter,
    availableTechs: TECHS.map((t) => techForAi(t, GAME.startYear)),
    year: GAME.startYear,
    designRule:
      "emTech categories are always pickable; feasibility timing judges claims in how-it-works vs year.",
    conversation: [{ role: "user", content: "[Generate Quests]" }],
  };

  let text = await callScenarioModel(client, payload);
  let list = parseScenarioList(text);
  if (list.length < 2) {
    throw new Error(`AI returned ${list.length} scenarios`);
  }
  let packs = list.slice(0, SCENARIO_COUNT).map((raw) => normalizeScenario(raw, g.id));
  let score = scorePackReadability(packs);

  if (!score.ok) {
    process.stdout.write(`craft-retry (${score.failedIndexes.length})… `);
    const repairPayload = {
      ...payload,
      seedMissions: packs.map((p, i) => ({
        title: p.title,
        place: (p.places && p.places[0]) || "",
        stakeholder: p.stakeholder,
        sceneDraft: p.scene,
        needsRhythmFix: score.failedIndexes.includes(i),
        suggested: p.suggested,
        visionTheme: p.visionTheme,
      })),
      conversation: [
        { role: "user", content: "[Generate Quests]" },
        {
          role: "user",
          content: sceneRepairInstruction(score.reasons),
        },
      ],
    };
    text = await callScenarioModel(client, repairPayload, sceneRepairInstruction(score.reasons));
    list = parseScenarioList(text);
    if (list.length >= 2) {
      packs = list.slice(0, SCENARIO_COUNT).map((raw) => normalizeScenario(raw, g.id));
      score = scorePackReadability(packs);
      if (!score.ok) {
        process.stdout.write(`craft-warn (${score.reasons.slice(0, 3).join(";")})… `);
      } else {
        process.stdout.write("craft-ok… ");
      }
    }
  }

  return packs;
}

function jsString(s) {
  return JSON.stringify(String(s ?? ""));
}

function packToJs(pack, indent = "    ") {
  const cm = pack.crisisMeters || {};
  const meterParts = CRISIS_ROLES.filter((r) => cm[r])
    .map((r) => `${r}: ${jsString(cm[r])}`)
    .join(", ");
  const sug = (pack.suggested || []).map((k) => jsString(k)).join(", ");
  const places = (pack.places || []).map((p) => jsString(p)).join(", ");
  return (
    `${indent}{\n` +
    `${indent}  places: [${places}],\n` +
    `${indent}  title: ${jsString(pack.title)},\n` +
    `${indent}  scene:\n${indent}    ${jsString(pack.scene)},\n` +
    `${indent}  stakeholder: ${jsString(pack.stakeholder)},\n` +
    `${indent}  crisisMeters: { ${meterParts} },\n` +
    `${indent}  suggested: [${sug}],\n` +
    `${indent}  visionTheme: ${jsString(pack.visionTheme)},\n` +
    `${indent}}`
  );
}

function writeSeedsFile(packsByTheme, meta) {
  const keys = Object.keys(packsByTheme);
  const body = keys
    .map((id) => {
      const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id) ? id : JSON.stringify(id);
      const packs = packsByTheme[id] || [];
      const inner = packs.map((p) => packToJs(p)).join(",\n");
      return `  ${key}: [\n${inner}\n  ]`;
    })
    .join(",\n\n");

  const header = `/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: ${meta.generatedAt}
 * Source: ${meta.source}
 * Themes: ${keys.length}
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
 * Prose: design-challenge story craft (hook → mechanism → open challenge); easy first read, not shorter-for-its-own-sake.
 * Crisis meters: crisisMeters: { local, global, support } — HUD labels per perspective.
 *   (buildLocalScenarioVariants expands to structured mission.pressure with levels.)
 *
 * Re-run: node scripts/generate-scenario-seeds.mjs
 * Scale rule: existential themes (asteroid, nuclear, rogue SI, chem-bio…) are
 * planetary or civilizational stakes told through concrete institutional places.
 */

/** @type {Record<string, object[]>} */
export const SCENARIO_ANGLE_PACKS = {
${body},

  _default: [
    {
      places: ["Local Ward", "Town Center", "District Hub"],
      title: "Crisis lands in {place}",
      scene:
        "People in {place} feel this global problem in daily life. A local driver keeps it going — invent for this place and year, not a slogan.",
      stakeholder: "Local working group",
      crisisMeters: { local: "Pressure", global: "Capacity", support: "Trust" },
      suggested: ["ai", "iot", "networks", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
  ],
};
`;
  return header;
}

async function loadExistingPacks() {
  try {
    const mod = await import(`../js/scenario-seeds.js?t=${Date.now()}`);
    const packs = mod.SCENARIO_ANGLE_PACKS || {};
    /** @type {Record<string, object[]>} */
    const out = {};
    for (const [k, v] of Object.entries(packs)) {
      if (k === "_default") continue;
      if (Array.isArray(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  if (themeFilter) {
    const known = new Set(GLOBALS.map((g) => g.id));
    const unknown = themeFilter.filter((id) => !known.has(id));
    if (unknown.length) {
      throw new Error(
        `Unknown theme id(s): ${unknown.join(", ")}. Known: ${[...known].join(", ")}`
      );
    }
  }

  const themes = GLOBALS.filter((g) => !themeFilter || themeFilter.includes(g.id));
  if (themeFilter) {
    console.log(
      `Generating quest packs for ${themes.length} theme(s): ${themes.map((g) => g.id).join(", ")}`
    );
  } else {
    console.log(`Generating quest packs for ALL ${themes.length} themes (no --themes filter)…`);
  }

  let client = null;
  let source = "local";
  if (!localOnly) {
    const token = await resolveAccessToken();
    if (token) {
      client = new OpenAI({ apiKey: token, baseURL: XAI_BASE });
      source = "ai";
      console.log(`AI: ${MODEL}`);
    } else {
      console.warn("No SuperGrok session / FF_XAI_API_KEY — using local packs only.");
    }
  } else {
    console.log("Local-only mode.");
  }

  // When filtering themes, merge into existing packs so we don't wipe the file
  /** @type {Record<string, object[]>} */
  const packsByTheme = themeFilter ? await loadExistingPacks() : {};
  if (themeFilter) {
    console.log(`Merge mode: keeping ${Object.keys(packsByTheme).length} existing themes`);
  }

  // Ensure every GLOBAL has something if full rebuild
  if (!themeFilter) {
    for (const g of GLOBALS) {
      if (!packsByTheme[g.id]) packsByTheme[g.id] = localPackForTheme(g);
    }
  }

  let aiOk = 0;
  let localOk = 0;
  let fail = 0;

  for (let i = 0; i < themes.length; i++) {
    const g = themes[i];
    process.stdout.write(`[${i + 1}/${themes.length}] ${g.id}… `);
    try {
      if (client) {
        try {
          const packs = await aiPackForTheme(client, g);
          packsByTheme[g.id] = packs;
          aiOk += 1;
          console.log(`AI (${packs.length})`);
          // gentle rate limit
          await new Promise((r) => setTimeout(r, 400));
          continue;
        } catch (e) {
          console.warn(`AI fail (${e.message}); local fallback`);
        }
      }
      packsByTheme[g.id] = localPackForTheme(g);
      localOk += 1;
      console.log(`local (${packsByTheme[g.id].length})`);
    } catch (e) {
      fail += 1;
      console.error(`FAIL ${e.message}`);
      packsByTheme[g.id] = localPackForTheme(g);
    }
  }

  // Full rebuild: include all GLOBALS even if somehow skipped
  if (!themeFilter) {
    for (const g of GLOBALS) {
      if (!packsByTheme[g.id]?.length) {
        packsByTheme[g.id] = localPackForTheme(g);
      }
    }
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: client ? `mixed ai=${aiOk} local=${localOk}` : source,
  };
  const text = writeSeedsFile(packsByTheme, meta);

  if (dryRun) {
    console.log("\n--dry-run: not writing file. Sample air pack:\n");
    console.log(JSON.stringify(packsByTheme.air || packsByTheme[themes[0]?.id], null, 2));
    return;
  }

  // backup
  if (fs.existsSync(OUT)) {
    const bak = OUT.replace(/\.js$/, `.bak-${Date.now()}.js`);
    fs.copyFileSync(OUT, bak);
    console.log(`Backup: ${path.relative(ROOT, bak)}`);
  }
  fs.writeFileSync(OUT, text);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(`Done. AI=${aiOk} local=${localOk} fail=${fail}`);
  console.log("Next: bump STORAGE_SCENARIOS in js/game.js if players still see old packs (currently v10).");
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
