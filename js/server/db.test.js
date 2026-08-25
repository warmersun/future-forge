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
