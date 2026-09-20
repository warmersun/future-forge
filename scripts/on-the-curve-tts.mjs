#!/usr/bin/env node
/**
 * Synthesize each pack Say line via xAI TTS (eve). Driven by parseOnTheCurvePack.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { DO_NOT_SAY } from "../js/tech-why.js";
import {
  PACK_DO_NOT_SAY_EXTRA,
  loadOnTheCurvePackSync,
} from "../js/on-the-curve-pack.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "output/on-the-curve/audio");
const GROK_HOME = process.env.FF_GROK_HOME || path.join(os.homedir(), ".grok");
const AUTH_PATH = path.join(GROK_HOME, "auth.json");
const XAI_BASE = "https://api.x.ai/v1";
const VOICE = "eve";

function loadEnv() {
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

function readAuthFile() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const entries = Object.entries(data || {});
    if (!entries.length) return null;
    entries.sort(([a], [b]) => {
      const score = (k) => (k.includes("auth.x.ai") ? 0 : 1);
      return score(a) - score(b);
    });
    const [storeKey, entry] = entries[0];
    if (!entry?.key) return null;
    return { storeKey, entry, all: data };
  } catch {
    return null;
  }
}

function writeAuthEntry(storeKey, entry, all) {
  try {
    fs.writeFileSync(AUTH_PATH, JSON.stringify({ ...all, [storeKey]: entry }, null, 2), {
      mode: 0o600,
    });
  } catch {
    /* ignore */
  }
}

function tokenExpired(entry) {
  if (!entry?.expires_at) return false;
  const exp = Date.parse(entry.expires_at);
  if (Number.isNaN(exp)) return false;
  return Date.now() >= exp - 60_000;
}

async function refreshSuperGrokToken(storeKey, entry, all) {
  if (!entry.refresh_token || !entry.oidc_client_id) {
    throw new Error("SuperGrok session has no refresh token — run: grok login");
  }
  const res = await fetch("https://auth.x.ai/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: entry.refresh_token,
      client_id: entry.oidc_client_id,
    }),
  });
  if (!res.ok) throw new Error(`refresh failed ${res.status}`);
  const out = await res.json();
  if (!out.access_token) throw new Error("no access_token");
  const updated = {
    ...entry,
    key: out.access_token,
    refresh_token: out.refresh_token || entry.refresh_token,
    expires_at: new Date(Date.now() + (Number(out.expires_in) || 21600) * 1000).toISOString(),
  };
  writeAuthEntry(storeKey, updated, all);
  return updated.key;
}

async function token() {
  const session = readAuthFile();
  if (session) {
    const { storeKey, entry, all } = session;
    if (tokenExpired(entry)) return await refreshSuperGrokToken(storeKey, entry, all);
    return entry.key;
  }
  const apiKey = process.env.FF_XAI_API_KEY || "";
  if (apiKey && !apiKey.startsWith("eyJ")) return apiKey;
  throw new Error("No SuperGrok session or FF_XAI_API_KEY");
}

async function tts(text, voice, tok) {
  const res = await fetch(`${XAI_BASE}/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voice,
      language: "en",
      text_normalization: false,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 240);
    throw new Error(`TTS ${res.status}: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  loadEnv();
  const pack = loadOnTheCurvePackSync(ROOT, fs, path);
  for (const shot of pack.shots) {
    if (DO_NOT_SAY.test(shot.say) || PACK_DO_NOT_SAY_EXTRA.test(shot.say)) {
      throw new Error(`forbidden words in ${shot.file}: ${shot.say}`);
    }
  }
  const tok = await token();
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const shot of pack.shots) {
    const dest = path.join(OUT, `${shot.id}.mp3`);
    process.stdout.write(`${shot.id} … `);
    const buf = await tts(shot.say, VOICE, tok);
    fs.writeFileSync(dest, buf);
    console.log(`${buf.length} bytes`);
    manifest.push({ id: shot.id, file: `${shot.id}.mp3`, n: shot.n, say: shot.say, voice: VOICE });
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`wrote ${manifest.length} clips → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
