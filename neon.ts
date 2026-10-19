import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
    // Official quest catalog. The portal is the only reader.
    quests: { access: "private" },
  },
  functions: {
    portalgate: {
      name: "Portal API key check",
      source: "portal/functions/api-key-check.ts",
      env: { PORTAL_SMOKE_API_KEY: process.env.PORTAL_SMOKE_API_KEY! },
    },
    cloudapi: {
      name: "Cloud portal API (staging slice)",
      source: "portal/functions/cloud-api-entry.mjs",
      // Collector-card share images use sharp's native linux-arm64 runtime binary.
      externalPackages: ["sharp"],
      env: { FF_QUESTS_BUCKET: "quests", FF_PORTAL_UI_URL: "https://warmersun.com/portal/" },
      // Clerk/session secrets are not deployed to this dev branch. Add explicit
      // env keys before testing sign-in against a dedicated staging Clerk app.
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
