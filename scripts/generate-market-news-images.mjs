/**
 * Pre-generate market news illustrations into assets/market-news/{id}.jpg
 * Uses SuperGrok session (~/.grok/auth.json) or FF_XAI_API_KEY — same as server.mjs.
 *
 * Usage:
 *   node scripts/generate-market-news-images.mjs
 *   node scripts/generate-market-news-images.mjs --only=ram-shortage,solar-glut
 *   node scripts/generate-market-news-images.mjs --force
 *   node scripts/generate-market-news-images.mjs --limit=5
 *   node scripts/generate-market-news-images.mjs --concurrency=2
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "assets/market-news/manifest.json");
const OUT_DIR = path.join(ROOT, "assets/market-news");
const GROK_HOME = process.env.FF_GROK_HOME || path.join(os.homedir(), ".grok");
const AUTH_PATH = path.join(GROK_HOME, "auth.json");
const XAI_BASE = "https://api.x.ai/v1";
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth2/token";
const IMAGE_MODEL = process.env.FF_XAI_IMAGE_MODEL || "grok-imagine-image";

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

function parseArgs(argv) {
  const opts = { force: false, only: null, limit: null, concurrency: 2 };
  for (const a of argv) {
    if (a === "--force") opts.force = true;
    else if (a.startsWith("--only=")) {
      opts.only = new Set(
        a
          .slice("--only=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } else if (a.startsWith("--limit=")) opts.limit = Number(a.slice("--limit=".length));
    else if (a.startsWith("--concurrency="))
      opts.concurrency = Math.max(1, Number(a.slice("--concurrency=".length)) || 2);
  }
  return opts;
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
    const next = { ...all, [storeKey]: entry };
    fs.writeFileSync(AUTH_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch (e) {
    console.warn("[auth] could not persist refreshed token:", e.message);
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
    throw new Error(`SuperGrok token refresh failed (${res.status}): ${text.slice(0, 120)}`);
  }
  const out = await res.json();
  const access = out.access_token;
  if (!access) throw new Error("SuperGrok refresh returned no access_token");
  const expiresIn = Number(out.expires_in) || 21600;
  const updated = {
    ...entry,
    key: access,
    refresh_token: out.refresh_token || entry.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  writeAuthEntry(storeKey, updated, all);
  return updated.key;
}

async function resolveAccessToken({ forceRefresh = false } = {}) {
  const session = readAuthFile();
  if (session) {
    const { storeKey, entry, all } = session;
    try {
      if (forceRefresh || tokenExpired(entry)) {
        return await refreshSuperGrokToken(storeKey, entry, all);
      }
      return entry.key;
    } catch (e) {
      console.warn("[auth]", e.message);
    }
  }

  const apiKey = process.env.FF_XAI_API_KEY || "";
  if (apiKey && !apiKey.startsWith("eyJ")) {
    if (!session) return apiKey;
  }
  if (!session) return null;
  return session.entry.key;
}

async function xaiImageGenerate(prompt) {
  let token = await resolveAccessToken();
  if (!token) throw new Error("No SuperGrok session or FF_XAI_API_KEY");

  const doFetch = async (tok) =>
    fetch(`${XAI_BASE}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        response_format: "b64_json",
        aspect_ratio: "16:9",
      }),
    });

  let res = await doFetch(token);
  if (res.status === 401 || res.status === 403) {
    token = await resolveAccessToken({ forceRefresh: true });
    if (!token) throw new Error("Auth expired");
    res = await doFetch(token);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(String(data?.error || data?.message || text.slice(0, 200)));
  }
  const item = data?.data?.[0] || data;
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error("No image data in response");
}

async function mapPool(items, concurrency, worker) {
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => run()));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(MANIFEST)) {
    console.error("Missing manifest. Run: python3 scripts/build-market-news-catalog.py");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let items = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (opts.only) items = items.filter((x) => opts.only.has(x.id));
  if (opts.limit != null && opts.limit > 0) items = items.slice(0, opts.limit);

  const todo = items.filter((x) => {
    const dest = path.join(ROOT, x.image);
    return opts.force || !fs.existsSync(dest) || fs.statSync(dest).size < 1000;
  });

  console.log(
    `Market news images: ${items.length} selected, ${todo.length} to generate (force=${opts.force}, concurrency=${opts.concurrency})`
  );
  if (!todo.length) {
    console.log("Nothing to do.");
    return;
  }

  const tok = await resolveAccessToken();
  if (!tok) {
    console.error("Not signed in. Use SuperGrok (~/.grok/auth.json) or set FF_XAI_API_KEY.");
    process.exit(1);
  }
  console.log("Auth OK — generating…");

  let ok = 0;
  let fail = 0;
  await mapPool(todo, opts.concurrency, async (item) => {
    const dest = path.join(ROOT, item.image);
    const prompt = [
      "Editorial news illustration for a strategy board game about emerging technology.",
      "Cinematic 16:9, rich color, no readable text, no logos, no watermarks.",
      item.imagePrompt || item.headline,
    ].join(" ");
    try {
      const buf = await xaiImageGenerate(prompt);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      ok++;
      console.log(`✓ [${ok + fail}/${todo.length}] ${item.id} (${buf.length} bytes)`);
    } catch (e) {
      fail++;
      console.error(`✗ [${ok + fail}/${todo.length}] ${item.id}: ${e.message || e}`);
    }
  });

  console.log(`Done. ok=${ok} fail=${fail} remaining_missing=${todo.length - ok}`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
