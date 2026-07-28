#!/usr/bin/env node
/**
 * Draft Hungarian long-form packs (problem briefs + scenario seeds).
 * Uses SuperGrok session (~/.grok/auth.json) or XAI_API_KEY — same as server.mjs.
 *
 * Usage:
 *   node scripts/i18n-draft-longform.mjs              # both
 *   node scripts/i18n-draft-longform.mjs --briefs
 *   node scripts/i18n-draft-longform.mjs --scenarios
 *   node scripts/i18n-draft-longform.mjs --scenarios --theme climate
 *   node scripts/i18n-draft-longform.mjs --scenarios --start-here
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "locales", "hu");
const AUTH_PATH = process.env.GROK_HOME
  ? path.join(process.env.GROK_HOME, "auth.json")
  : path.join(os.homedir(), ".grok", "auth.json");
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth/token";
const XAI_BASE = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const MODEL = process.env.XAI_MODEL || "grok-4.5";

const START_HERE = [
  "climate",
  "water",
  "infectious",
  "education",
  "energy-access",
  "poverty",
];

const args = process.argv.slice(2);
const doBriefs = args.includes("--briefs") || (!args.includes("--scenarios") && !args.includes("--briefs"));
const doScenarios =
  args.includes("--scenarios") || (!args.includes("--scenarios") && !args.includes("--briefs"));
const themeFilter = (() => {
  const i = args.indexOf("--theme");
  return i >= 0 ? args[i + 1] : null;
})();
const startHereOnly = args.includes("--start-here");

function loadEnv() {
  for (const file of [path.join(ROOT, ".env"), path.join(ROOT, ".env.local")]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

function readAuthFile() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const entries = Object.entries(data || {});
    if (!entries.length) return null;
    entries.sort(([a], [b]) => (a.includes("auth.x.ai") ? 0 : 1) - (b.includes("auth.x.ai") ? 0 : 1));
    const [storeKey, entry] = entries[0];
    if (!entry?.key) return null;
    return { storeKey, entry, all: data };
  } catch {
    return null;
  }
}

function tokenExpired(entry, skewMs = 60_000) {
  if (!entry?.expires_at) return false;
  const exp = Date.parse(entry.expires_at);
  if (Number.isNaN(exp)) return false;
  return Date.now() >= exp - skewMs;
}

async function refreshSuperGrokToken(storeKey, entry, all) {
  if (!entry.refresh_token || !entry.oidc_client_id) {
    throw new Error("SuperGrok session has no refresh token — run: grok login");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: entry.refresh_token,
    client_id: entry.oidc_client_id,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`refresh failed (${res.status}): ${text.slice(0, 120)}`);
  }
  const out = await res.json();
  if (!out.access_token) throw new Error("no access_token");
  const expiresIn = Number(out.expires_in) || 21600;
  const updated = {
    ...entry,
    key: out.access_token,
    refresh_token: out.refresh_token || entry.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  const next = { ...all, [storeKey]: updated };
  fs.writeFileSync(AUTH_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  return updated.key;
}

async function resolveToken() {
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
  const apiKey = process.env.XAI_API_KEY || "";
  if (apiKey) return apiKey;
  if (session?.entry?.key) return session.entry.key;
  throw new Error("No SuperGrok session or XAI_API_KEY — run: grok login");
}

function extractJson(text) {
  const s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : s;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

async function chatJson(client, system, user, { maxTokens = 8000 } = {}) {
  const response = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_output_tokens: maxTokens,
  });
  const text =
    response.output_text ||
    response.output?.map((o) => o.content?.map((c) => c.text || "").join("") || "").join("") ||
    "";
  return extractJson(text);
}

const SYSTEM = `You are a professional Hungarian game-localization translator for Future Forge, a serious learning game about emerging tech and local invention.
Rules:
- Output Hungarian only in string values (not keys).
- Prefer feltalálni (invent) not kitalálni; AI → MI / mesterséges intelligencia in player-facing text.
- Hemingway clarity; smart high-school audience; introduce jargon in plain words on first use.
- Keep place names that are real geographic/institution names as proper nouns (may keep English/local forms).
- Pressure meter keys: 1–3 short Hungarian words, human, Title Case or natural Hungarian caps, no camelCase.
- Return a single JSON object only, no markdown fences unless necessary.
- Do not invent new scenarios; translate the given English faithfully.`;

async function draftBriefs(client) {
  const { PROBLEM_BRIEFS } = await import(
    pathToFileURL(path.join(ROOT, "js/problem-briefs.js")).href
  );
  const outPath = path.join(OUT_DIR, "problem-briefs.json");
  let existing = {};
  if (fs.existsSync(outPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch {
      existing = {};
    }
  }
  const ids = Object.keys(PROBLEM_BRIEFS);
  const batchSize = 6;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const skip = batchIds.every(
      (id) =>
        existing[id]?.currentState &&
        existing[id]?.rootCauses &&
        existing[id]?.warnings
    );
    if (skip) {
      console.log(`[briefs] skip ${batchIds.join(", ")} (already present)`);
      continue;
    }
    const payload = {};
    for (const id of batchIds) payload[id] = PROBLEM_BRIEFS[id];
    console.log(`[briefs] translating ${batchIds.join(", ")}…`);
    const result = await chatJson(
      client,
      SYSTEM,
      `Translate these problem briefs to Hungarian. Keep the same object keys (theme ids). Each value: { "currentState", "rootCauses", "warnings" }.\n\n${JSON.stringify(payload)}`,
      { maxTokens: 12000 }
    );
    for (const id of batchIds) {
      if (result[id]?.currentState) existing[id] = result[id];
    }
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + "\n");
    console.log(`[briefs] wrote ${Object.keys(existing).length}/${ids.length}`);
  }
  return existing;
}

async function draftScenarios(client) {
  const { SCENARIO_ANGLE_PACKS } = await import(
    pathToFileURL(path.join(ROOT, "js/scenario-seeds.js")).href + "?t=" + Date.now()
  );
  const outPath = path.join(OUT_DIR, "scenario-seeds.json");
  let existing = {};
  if (fs.existsSync(outPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch {
      existing = {};
    }
  }

  let themes = Object.keys(SCENARIO_ANGLE_PACKS).filter((t) => t !== "_default");
  if (themeFilter) themes = themes.filter((t) => t === themeFilter);
  if (startHereOnly) themes = themes.filter((t) => START_HERE.includes(t));

  for (const themeId of themes) {
    const arr = SCENARIO_ANGLE_PACKS[themeId] || [];
    const need = arr.filter((e) => e.seedId && !existing[e.seedId]?.scene);
    if (!need.length) {
      console.log(`[scenarios] ${themeId}: complete (${arr.length})`);
      continue;
    }
    // Translate up to 4 at a time (one theme pack)
    const payload = {};
    for (const e of need) {
      payload[e.seedId] = {
        title: e.title,
        scene: e.scene,
        stakeholder: e.stakeholder,
        pressureKeys: e.pressureKeys,
        places: e.places,
      };
    }
    console.log(`[scenarios] ${themeId}: translating ${need.length}…`);
    const result = await chatJson(
      client,
      SYSTEM,
      `Translate these Future Forge local mission scenarios to Hungarian.
Keys are seedIds — keep them exactly.
Each value must be:
{
  "title": string,
  "scene": string (full prose),
  "stakeholder": string,
  "pressureKeys": [exactly 3 short HUD labels in Hungarian],
  "places": [optional translated display strings; keep real place names recognizable]
}

Input JSON:
${JSON.stringify(payload)}`,
      { maxTokens: 14000 }
    );
    for (const e of need) {
      const row = result[e.seedId];
      if (row?.title && row?.scene) {
        existing[e.seedId] = {
          title: row.title,
          scene: row.scene,
          stakeholder: row.stakeholder || e.stakeholder,
          pressureKeys: Array.isArray(row.pressureKeys)
            ? row.pressureKeys.slice(0, 3)
            : e.pressureKeys,
          places: Array.isArray(row.places) ? row.places : e.places,
        };
      } else {
        console.warn(`[scenarios] missing translation for ${e.seedId}`);
      }
    }
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + "\n");
    console.log(
      `[scenarios] ${themeId}: pack now ${Object.keys(existing).filter((k) => k.startsWith(themeId + "--")).length}/${arr.length} for theme; total keys ${Object.keys(existing).length}`
    );
  }
  return existing;
}

async function main() {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await resolveToken();
  const client = new OpenAI({ apiKey: token, baseURL: XAI_BASE });
  console.log(`Model ${MODEL} · out ${OUT_DIR}`);

  if (doBriefs) {
    await draftBriefs(client);
  }
  if (doScenarios) {
    await draftScenarios(client);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
