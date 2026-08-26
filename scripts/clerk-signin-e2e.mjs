#!/usr/bin/env node
/**
 * Browser click-through against **portal**: Sign in → Clerk email/password → signed in.
 * game (`npm start`) has no Sign-in chip — run `npm run portal` first.
 *
 *   npm i -D playwright
 *   npx playwright install chromium
 *
 * Put credentials in gitignored .env.portal (never commit them):
 *   CLERK_E2E_EMAIL=you@example.com
 *   CLERK_E2E_PASSWORD=...
 *
 *   npm run portal
 *   npm run e2e:clerk-signin
 *   FF_ORIGIN=http://127.0.0.1:8765 node scripts/clerk-signin-e2e.mjs
 *
 * Headed (watch the clicks): CLERK_E2E_HEADED=1
 * Headless (Cursor/CI default): omit HEADED, or CLERK_E2E_HEADED=0
 *
 * Exit 0 PASS. Exit 1 FAIL. Screenshots: data/e2e/clerk-signin-*.png
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = String(process.env.FF_ORIGIN || "http://127.0.0.1:8765").replace(/\/$/, "");
const OUT = path.join(ROOT, "data", "e2e");

function loadEnvFile() {
  const files = [path.join(ROOT, ".env.portal"), path.join(ROOT, ".env.portal.local")];
  for (const file of files) {
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

const EMAIL = String(process.env.CLERK_E2E_EMAIL || process.env.FF_CLERK_E2E_EMAIL || "").trim();
const PASSWORD = String(
  process.env.CLERK_E2E_PASSWORD || process.env.FF_CLERK_E2E_PASSWORD || ""
).trim();

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, `clerk-signin-${name}.png`);
  await page.screenshot({ path: dest, fullPage: true });
  log("shot", dest);
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("FAIL  playwright is not installed.");
    console.error("      npm i -D playwright && npx playwright install chromium");
    process.exit(2);
  }
}

/** Clerk primary submit only — not in-game "Continue this Quest". */
async function clickClerkPrimary(scope) {
  const btn = scope
    .locator(
      ".cl-formButtonPrimary, .cl-modalContent button.cl-button, button.cl-formButtonPrimary, [data-localization-key='formButtonPrimary']"
    )
    .first();
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  await btn.click();
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("FAIL  Set CLERK_E2E_EMAIL and CLERK_E2E_PASSWORD in .env.portal (gitignored).");
    process.exit(1);
  }

  const { chromium } = await loadPlaywright();
  const wantHeaded = process.env.CLERK_E2E_HEADED === "1";
  let browser;
  try {
    browser = await chromium.launch({
      headless: !wantHeaded,
      slowMo: wantHeaded ? 80 : 0,
    });
  } catch (e) {
    log("launch", `headed failed (${e.message || e}); retrying headless`);
    browser = await chromium.launch({ headless: true });
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(25_000);

  try {
    log("1", `GET ${ORIGIN}`);
    const health = await (await page.request.get(`${ORIGIN}/api/health`)).json();
    if (!health?.clerk?.enabled) {
      throw new Error("GET /api/health clerk.enabled is false — keys missing or wrong host");
    }
    log("1", "health.clerk.enabled true");

    await page.goto(ORIGIN, { waitUntil: "domcontentloaded" });
    await shot(page, "01-loaded");

    log("2", "wait for Sign in (Clerk CDN + initAuth unhides #ff-account)");
    const signIn = page.locator("#ff-account-signin");
    await signIn.waitFor({ state: "visible", timeout: 40_000 });
    log("2", "Sign in visible — clicking");
    await signIn.click();
    await shot(page, "02-clicked-signin");

    log("3", "Clerk: email");
    const ident = page.locator(
      'input[name="identifier"], input[name="emailAddress"], input[type="email"]'
    );
    // Prefer the visible one; Clerk modal is usually in the top document.
    const identBox = ident.filter({ visible: true }).first();
    try {
      await identBox.waitFor({ state: "visible", timeout: 20_000 });
    } catch {
      // iframe fallback
      const frames = page.frames();
      let filled = false;
      for (const frame of frames) {
        const el = frame.locator(
          'input[name="identifier"], input[name="emailAddress"], input[type="email"]'
        );
        if (await el.count()) {
          await el.first().fill(EMAIL);
          filled = true;
          await clickClerkPrimary(frame);
          break;
        }
      }
      if (!filled) {
        await shot(page, "fail-no-identifier");
        throw new Error("Clerk email field not found after Sign in click");
      }
    }
    if (await identBox.count()) {
      await identBox.fill(EMAIL);
      log("3", "typed email — Continue");
      await clickClerkPrimary(page);
    }
    await shot(page, "03-after-email");

    log("4", "Clerk: password");
    const pw = page.locator('input[type="password"], input[name="password"]');
    const pwBox = pw.filter({ visible: true }).first();
    try {
      await pwBox.waitFor({ state: "visible", timeout: 20_000 });
      await pwBox.fill(PASSWORD);
    } catch {
      for (const frame of page.frames()) {
        const el = frame.locator('input[type="password"], input[name="password"]');
        if (await el.count()) {
          await el.first().fill(PASSWORD);
          await clickClerkPrimary(frame);
          break;
        }
      }
      const otp = page.getByText(/check your email|verification code|enter the code/i);
      if (await otp.count()) {
        await shot(page, "fail-otp-only");
        throw new Error(
          "Clerk asked for email code, not password. Use a password-enabled test user or disable email-code for this instance."
        );
      }
    }
    if (await pwBox.count()) {
      log("4", "typed password — Continue");
      await clickClerkPrimary(page);
    }
    await shot(page, "04-after-password");

    log("5", "wait until signed in (Sign in hidden, UserButton mounted)");
    await page.locator("#ff-account-signin").waitFor({ state: "hidden", timeout: 40_000 });
    await page.locator("#ff-account-user").waitFor({ state: "visible", timeout: 20_000 });

    const signed = await page.evaluate(() => {
      const c = window.Clerk;
      return {
        ready: Boolean(c),
        isSignedIn: Boolean(c?.isSignedIn),
        userId: c?.user?.id || null,
        hasSession: Boolean(c?.session),
      };
    });
    log("5", JSON.stringify(signed));
    if (!signed.isSignedIn || !signed.hasSession) {
      await shot(page, "fail-not-signed-in");
      throw new Error("Clerk reports not signed in after submit");
    }

    log("6", "GET /api/me with session JWT");
    const me = await page.evaluate(async () => {
      const token = await window.Clerk.session.getToken();
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status, body: await res.json() };
    });
    log("6", `HTTP ${me.status} signedIn=${me.body?.signedIn} userId=${me.body?.userId ? "yes" : "no"}`);
    if (me.status !== 200 || me.body?.signedIn !== true || !me.body?.userId) {
      await shot(page, "fail-api-me");
      throw new Error(`GET /api/me after login failed: ${JSON.stringify(me)}`);
    }

    log("7", "open UserButton menu");
    const userBtn = page.locator("#ff-account-user button, #ff-account-user .cl-userButtonTrigger").first();
    await userBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "05-user-button");

    log("PASS", "Sign in clicked through. Session JWT accepted by GET /api/me.");
    console.log(`Screenshots: ${OUT}/clerk-signin-*.png`);
    await browser.close();
    process.exit(0);
  } catch (e) {
    try {
      await shot(page, "fail");
    } catch {
      /* ignore */
    }
    console.error(`FAIL  ${e.message || e}`);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
