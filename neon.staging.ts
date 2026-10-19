import { defineConfig } from "@neon/config/v1";

// Staging deploy only: do not create the API-key smoke Function on the target project.
export default defineConfig({
  auth: false,
  buckets: { assets: { access: "private" }, quests: { access: "private" } },
  functions: {
    cloudapi: {
      name: "Cloud portal API staging",
      source: "portal/functions/cloud-api-entry.mjs",
      externalPackages: ["sharp"],
      env: {
        FF_QUESTS_BUCKET: "quests",
        FF_PORTAL_UI_URL: "https://warmersun.com/portal/",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
      },
    },
  },
  branch: () => ({}),
});
