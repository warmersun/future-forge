import { defineConfig } from "@neon/config/v1";

// Production portal Function on proud-hill-53375382/main only. Deploy with
// --config neon.portal.ts; the default neon.ts also declares a dev smoke Function.
export default defineConfig({
  auth: false,
  buckets: {
    assets: { access: "private" },
    quests: { access: "private" },
  },
  functions: {
    cloudapi: {
      name: "Warmer Sun Cloud API",
      source: "portal/functions/cloud-api-entry.mjs",
      externalPackages: ["sharp"],
      env: {
        FF_QUESTS_BUCKET: "quests",
        FF_PORTAL_UI_URL: "https://warmersun.com/portal/",
        FF_PUBLIC_ORIGIN: process.env.FF_PUBLIC_ORIGIN || "https://br-wild-surf-b4jds6qu-cloudapi.compute.c-6.us-east-2.aws.neon.tech",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
        CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET!,
        FF_API_SECRET: process.env.FF_API_SECRET!,
        FF_CLOUD_PLAN_SLUGS: process.env.FF_CLOUD_PLAN_SLUGS!,
        FF_CLOUD_AI_BUDGET: process.env.FF_CLOUD_AI_BUDGET!,
        FF_QUOTA_TEXT_IN_PER_KTOK: process.env.FF_QUOTA_TEXT_IN_PER_KTOK!,
        FF_QUOTA_TEXT_OUT_PER_KTOK: process.env.FF_QUOTA_TEXT_OUT_PER_KTOK!,
        FF_QUOTA_TEXT_HOLD: process.env.FF_QUOTA_TEXT_HOLD!,
        FF_QUOTA_TEXT_MAX_OUT: process.env.FF_QUOTA_TEXT_MAX_OUT!,
        FF_QUOTA_IMAGE: process.env.FF_QUOTA_IMAGE!,
        FF_QUOTA_TTS_PER_KCHAR: process.env.FF_QUOTA_TTS_PER_KCHAR!,
        FF_QUOTA_VOICE_PER_MIN: process.env.FF_QUOTA_VOICE_PER_MIN!,
        FF_GAME_DEVICE_ORIGINS: process.env.FF_GAME_DEVICE_ORIGINS!,
      },
    },
  },
  branch: () => ({}),
});
