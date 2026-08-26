#!/usr/bin/env node
/**
 * Verify Sign in can appear on the live **portal** host (Warmer Sun Cloud).
 *
 *   npm run portal
 *   npm run check:clerk-signin
 *   FF_ORIGIN=http://127.0.0.1:8765 node scripts/check-clerk-signin.mjs
 *
 * Exit 0 = PASS. Exit 1 = FAIL lines (those are the bugs to fix).
 *
 * This does not click the Clerk modal. After PASS: open the origin, hard-refresh,
 * Sign in is top-right. **game** (`npm start`) has no Sign in — that is correct.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clerkFrontendApiHost } from "../js/auth.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = String(process.env.FF_ORIGIN || process.argv[2] || "http://127.0.0.1:8765").replace(
  /\/$/,
  ""
);
const CACHE = "portal-1";

const fails = [];
const oks = [];

function ok(msg) {
  oks.push(msg);
  console.log(`  ok    ${msg}`);
}
function fail(msg) {
  fails.push(msg);
  console.log(`  FAIL  ${msg}`);
}

async function get(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${ORIGIN}${pathOrUrl}`;
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { url, status: res.status, text };
}

function importSpecs(source) {
  const specs = [];
  const re =
    /(?:^|\n)\s*(?:import\s+(?:type\s+)?(?:[^'"\n]+from\s+)?|export\s+\{[^}]*\}\s*from\s+|import\s*\(\s*)["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(source))) specs.push(m[1].split("?")[0]);
  return specs;
}

function resolveRel(fromUrlPath, spec) {
  return new URL(spec, `http://local${fromUrlPath}`).pathname;
}

/**
 * Disk walk: no node: builtins in the client graph.
 * @param {string[]} absEntries
 */
function assertNoNodeBuiltins(absEntries) {
  const seen = new Set();
  const queue = [...absEntries];
  const hits = [];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fs.existsSync(file)) {
      hits.push(`missing ${path.relative(ROOT, file)}`);
      continue;
    }
    const src = fs.readFileSync(file, "utf8");
    for (const spec of importSpecs(src)) {
      if (spec.startsWith("node:")) {
        hits.push(`${path.relative(ROOT, file)} -> ${spec}`);
        continue;
      }
      if (!spec.startsWith(".")) continue;
      queue.push(path.resolve(path.dirname(file), spec));
    }
  }
  return hits;
}

async function main() {
  console.log(`check-clerk-signin  origin=${ORIGIN}\n`);

  let health;
  try {
    const h = await get("/api/health");
    if (h.status !== 200) fail(`GET /api/health HTTP ${h.status} — start the host: npm start`);
    else {
      health = JSON.parse(h.text);
      ok("GET /api/health 200");
    }
  } catch (e) {
    fail(`cannot reach ${ORIGIN} (${e.message || e}). Start portal with: npm run portal`);
  }

  if (health) {
    const clerk = health.clerk || {};
    if (clerk.enabled && clerk.publishableKey) {
      ok("health.clerk.enabled + publishableKey");
    } else {
      fail(
        "health.clerk.enabled is false or publishableKey missing — set CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY in .env and restart npm run portal"
      );
    }
    if (health.db?.enabled) ok("health.db.enabled (Neon)");
    else console.log("  skip   health.db.enabled false (save/import off; Sign in can still show)");
  }

  const htmlHit = await get("/").catch(() => null);
  const html = htmlHit?.status === 200 ? htmlHit.text : "";
  if (!html) fail("GET / not 200");
  else {
    if (html.includes('id="ff-account"') && html.includes("ff-account-signin")) {
      ok("HTML has #ff-account and Sign in");
    } else fail("HTML missing #ff-account / Sign in — wrong document");
    if (html.includes(`js/main.js?v=${CACHE}`)) ok(`HTML loads main.js?v=${CACHE}`);
    else fail(`HTML missing main.js?v=${CACHE} — bump or hard-refresh; got old cache bust`);
  }

  const mainJs = (await get(`/js/main.js?v=${CACHE}`)).text;
  if (mainJs.includes("initAuth")) ok("main.js loads initAuth");
  else fail("main.js does not load initAuth");
  if (mainJs.includes('import("./auth.js')) ok("main.js loads auth.js even if game.js fails");
  else fail("main.js statically ties auth to game — a game graph error hides Sign in");

  const gamePath = `/js/game.js?v=${CACHE}`;
  const gameHit = await get(gamePath);
  if (gameHit.status !== 200) fail(`GET ${gamePath} HTTP ${gameHit.status}`);
  const gameJs = gameHit.text;
  if (gameJs.includes("clerk-auth.mjs")) fail("game.js source imports clerk-auth.mjs");
  else ok("game.js source does not import clerk-auth.mjs");

  const authHit = await get(`/js/auth.js?v=${CACHE}`);
  const authJs = authHit.status === 200 ? authHit.text : "";
  if (authJs.includes("mount.hidden = false")) ok("auth.js unhides #ff-account after Clerk CDN");
  else fail("auth.js missing mount.hidden = false");

  // Every relative import from served game.js must be HTTP 200 (this is why Sign in / the page dies).
  const gameImports = importSpecs(gameJs)
    .filter((s) => s.startsWith("."))
    .map((s) => resolveRel("/js/game.js", s));
  const mustServe = [
    ...new Set(gameImports.filter((p) => p.includes("/server/") || p.includes("/cloud/"))),
  ];
  console.log(`\n  game.js cloud/server imports: ${mustServe.join(", ") || "(none)"}\n`);
  for (const p of mustServe) {
    const hit = await get(p);
    if (hit.status === 200) ok(`browser can GET ${p}`);
    else if (hit.status === 403) {
      fail(
        `GET ${p} HTTP 403 — static.mjs blocks .mjs. Allowlist this client module in isPublicRel (keep clerk-auth.mjs / db.mjs / *.sql blocked)`
      );
    } else fail(`GET ${p} HTTP ${hit.status}`);
  }

  const clerkAuth = await get("/js/server/clerk-auth.mjs");
  if (clerkAuth.status === 403 || clerkAuth.status === 404) {
    ok("GET /js/server/clerk-auth.mjs blocked (must stay server-only)");
  } else {
    fail(`GET /js/server/clerk-auth.mjs HTTP ${clerkAuth.status} — must not be public`);
  }

  const ghostDisk = path.join(ROOT, "js/cloud/ghost.js");
  const ghostSrc = fs.readFileSync(ghostDisk, "utf8");
  if (ghostSrc.includes("clerk-auth.mjs") || ghostSrc.includes("node:async_hooks")) {
    fail("js/cloud/ghost.js still imports clerk-auth.mjs or node:async_hooks");
  } else ok("disk js/cloud/ghost.js uses clerk-id, not clerk-auth");

  const nodeHits = assertNoNodeBuiltins([
    path.join(ROOT, "js/cloud/ghost.js"),
    path.join(ROOT, "js/cloud/daily-url.js"),
    path.join(ROOT, "js/cloud/continue.js"),
    path.join(ROOT, "js/cloud/clerk-id.js"),
    path.join(ROOT, "js/auth.js"),
  ]);
  if (nodeHits.length) fail(`client disk graph pulls Node builtins:\n    ${nodeHits.join("\n    ")}`);
  else ok("js/cloud + auth disk graph has no node: imports");

  if (health?.clerk?.publishableKey) {
    try {
      const host = clerkFrontendApiHost(health.clerk.publishableKey);
      ok(`publishable key decodes FAPI host (…${host.slice(-28)})`);
      const ui = await fetch(`https://${host}/npm/@clerk/ui@1/dist/ui.browser.js`, {
        method: "HEAD",
      });
      const js = await fetch(`https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        method: "HEAD",
      });
      if (ui.ok) ok("Clerk UI CDN reachable");
      else fail(`Clerk UI CDN HTTP ${ui.status}`);
      if (js.ok) ok("Clerk JS CDN reachable");
      else fail(`Clerk JS CDN HTTP ${js.status}`);
    } catch (e) {
      fail(`Clerk CDN / key: ${e.message || e}`);
    }
  }

  const me = await get("/api/me");
  if (me.status === 200) {
    const body = JSON.parse(me.text);
    if (body.clerk === true && body.signedIn === false) {
      ok("GET /api/me unsigned → clerk true, signedIn false");
    } else fail(`GET /api/me body ${JSON.stringify(body)}`);
  } else fail(`GET /api/me HTTP ${me.status}`);

  console.log("");
  if (fails.length) {
    console.log(`RESULT  FAIL  ${fails.length} check(s)`);
    console.log("Fix each FAIL. Then: hard-refresh the origin (Ctrl+Shift+R). Sign in is top-right.");
    process.exit(1);
  }
  console.log("RESULT  PASS  host will unhide Sign in after Clerk CDN loads in the browser.");
  console.log(`Open ${ORIGIN}  →  Ctrl+Shift+R  →  Sign in top-right.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
