import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mintGameSessionToken, verifyGameSessionToken } from "../../js/server/game-session.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtureEnv = {
  CLERK_SECRET_KEY: "fixture-clerk-secret",
  CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  CLERK_WEBHOOK_SECRET: "whsec_fixture",
  FF_API_SECRET: "fixture-api-secret",
  FF_CLOUD_PLAN_SLUGS: "cloud",
  FF_CONTENT_PLAN_SLUGS: "content",
  FF_CLOUD_AI_BUDGET: "100",
  FF_QUOTA_TEXT_IN_PER_KTOK: "1",
  FF_QUOTA_TEXT_OUT_PER_KTOK: "1",
  FF_QUOTA_TEXT_HOLD: "1",
  FF_QUOTA_TEXT_MAX_OUT: "100",
  FF_QUOTA_IMAGE: "1",
  FF_QUOTA_TTS_PER_KCHAR: "1",
  FF_QUOTA_VOICE_PER_MIN: "1",
  FF_GAME_DEVICE_ORIGINS: "http://localhost:8765",
};
function deployedEnv(extra = {}) {
  // Load the actual policy with fixture-only env, never the caller's credentials.
  const script = `import { loadConfigFromFile } from "@neon/config/v1";
    const { config } = await loadConfigFromFile({ path: "neon.portal.ts" });
    console.log(JSON.stringify(config.functions.cloudapi.env));`;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: root, encoding: "utf8", env: { ...fixtureEnv, ...extra },
  }));
}

test("production policy preserves an explicitly configured device-session key", () => {
  const legacyEnv = { ...fixtureEnv, FF_PORTAL_SESSION_SECRET: "fixture-dedicated-session-secret" };
  const env = deployedEnv({ FF_PORTAL_SESSION_SECRET: legacyEnv.FF_PORTAL_SESSION_SECRET });
  assert.equal(env.FF_PORTAL_SESSION_SECRET, legacyEnv.FF_PORTAL_SESSION_SECRET);
  const token = mintGameSessionToken({ userId: "user_fixture" }, legacyEnv);
  assert.equal(verifyGameSessionToken(token, env).sub, "user_fixture");
});

test("production policy keeps the Clerk-secret fallback when no session key is configured", () => {
  const env = deployedEnv();
  assert.equal(Object.hasOwn(env, "FF_PORTAL_SESSION_SECRET"), false);
  const token = mintGameSessionToken({ userId: "user_fixture" }, fixtureEnv);
  assert.equal(verifyGameSessionToken(token, env).sub, "user_fixture");
  assert.equal(env.FF_PORTAL_UI_URL, "https://warmersun.com/portal/");
  assert.equal(env.FF_CONTENT_PLAN_SLUGS, "content");
  assert.equal(env.FF_CLOUD_PLAN_SLUGS, "cloud");
  assert.equal(Object.hasOwn(env, "DATABASE_URL"), false);
});
