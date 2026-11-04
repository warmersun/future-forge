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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { databaseUrl, migrateUrl, dbEnabled, publicDbConfig } from "./db.mjs";

describe("db env helpers", () => {
  it("off without DATABASE_URL", () => {
    assert.equal(databaseUrl({}), "");
    assert.equal(dbEnabled({}), false);
    assert.deepEqual(publicDbConfig({}), { enabled: false });
  });

  it("on when DATABASE_URL is set", () => {
    const env = { DATABASE_URL: "postgresql://neondb_owner@example/neondb" };
    assert.equal(dbEnabled(env), true);
    assert.deepEqual(publicDbConfig(env), { enabled: true });
  });

  it("migrate prefers unpooled", () => {
    assert.equal(
      migrateUrl({
        DATABASE_URL: "postgresql://pooler/neondb",
        DATABASE_URL_UNPOOLED: "postgresql://direct/neondb",
      }),
      "postgresql://direct/neondb"
    );
    assert.equal(migrateUrl({ DATABASE_URL: "postgresql://only/neondb" }), "postgresql://only/neondb");
  });
});
