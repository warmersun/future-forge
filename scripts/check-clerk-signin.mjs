#!/usr/bin/env node
/**
 * Verify the portal account SPA and Cloud APIs (no game UI).
 *
 *   npm run portal
 *   FF_ORIGIN=http://127.0.0.1:8765 npm run check:clerk-signin
 *   FF_ORIGIN=https://future-forge-0yil.onrender.com npm run check:clerk-signin
 *
 * GET /signin is the device-handshake callback. The sign-in form is the
 * Account Portal. The game (`npm start` + FF_PORTAL_URL) stores the JWT.
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
const CACHE = "portal-2";

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
        "health.clerk.enabled is false or publishableKey missing — set CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY in .env.portal and restart npm run portal"
      );
    }
    if (health.db?.enabled) ok("health.db.enabled (Neon)");
    else console.log("  skip   health.db.enabled false (save/import off; Sign in can still show)");
  }

  const rootHit = await get("/").catch(() => null);
  const signin = await get("/signin?device=test-code");
  const subscribe = await get("/subscribe");
  if ([rootHit, signin, subscribe].every((r) => r?.status === 200 &&
      /<main id="app"/.test(r.text) && /src="\/app\.js"/.test(r.text)) &&
      rootHit.text === signin.text && signin.text === subscribe.text) {
    ok("GET /, /signin and /subscribe serve one portal SPA shell");
  } else fail("portal routes must serve the same SPA shell (not the game)");

  const spaScript = await get("/app.js");
  if (spaScript.status === 200 && /completeDevice/.test(spaScript.text) &&
      /redirect_url/.test(spaScript.text) && /mountPricingTable/.test(spaScript.text) &&
      !/mountSignIn/.test(spaScript.text)) {
    ok("portal SPA keeps device callback and Billing; Account Portal owns Sign in");
  } else fail("GET /app.js missing expected portal flows");

  const spa = await get("/index.html");
  if (spa.status === 404) ok("GET /index.html 404 (only canonical SPA routes)");
  else fail(`GET /index.html HTTP ${spa.status} — use canonical SPA routes`);

  const js = await get("/js/game.js");
  if (js.status === 404) ok("GET /js/game.js 404");
  else fail(`GET /js/game.js HTTP ${js.status}`);

  const nodeHits = assertNoNodeBuiltins([
    path.join(ROOT, "js/cloud/continue.js"),
    path.join(ROOT, "js/cloud/clerk-id.js"),
    path.join(ROOT, "js/cloud/quest-board.js"),
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
    console.log("Fix each FAIL.");
    process.exit(1);
  }
  console.log("RESULT  PASS  portal SPA and Cloud APIs. Sign-in form is the Account Portal.");
  console.log(`API ${ORIGIN}/api/health`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
