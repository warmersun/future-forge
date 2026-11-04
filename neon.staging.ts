/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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
