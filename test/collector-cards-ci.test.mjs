/**
 * End-to-end checks for the collector-card publish flow against scratch git
 * repos: change detection (first push, normal push, image-only change, force
 * push, deletes, examples), the id guards, the validator's daily rules, and the
 * issue script's dry run. No database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { solidPng } from "./collector-card-png.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI = path.join(ROOT, "scripts/collector-cards-ci.mjs");
const VALIDATE = path.join(ROOT, "scripts/validate-collector-card.mjs");
const ISSUE = path.join(ROOT, "scripts/issue-collector-card.mjs");
const ZERO = "0000000000000000000000000000000000000000";

const ID_A = "5b7c2f0e-3d1a-4c6b-9e8f-0a1b2c3d4e5f";
const ID_B = "6c8d3a1f-4e2b-4d7c-8f90-1b2c3d4e5f60";
const ID_C = "7d9e4b20-5f3c-4e8d-9a01-2c3d4e5f6071";

const GIT_ENV = {
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function card(id, title = "A daily card for the tests", extra = {}) {
  const c = {
    source: "test",
    techId: "drones",
    title,
    description: "A capability described in general terms for a test.",
    capability: "Something can now be done that could not be done before.",
    useCases: ["A first concrete use", "A second concrete use"],
    links: [{ label: "Source", url: "https://example.com/source" }],
    ...extra,
  };
  if (id) c.id = id;
  for (const [k, v] of Object.entries(c)) if (v === undefined) delete c[k];
  return `${JSON.stringify(c, null, 2)}\n`;
}

function scratchRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-cards-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, ...GIT_ENV } }).trim();
  git("init", "-q", "-b", "main");
  const write = (rel, data) => {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, data);
  };
  const commit = (msg) => {
    git("add", "-A");
    git("commit", "-q", "--allow-empty", "-m", msg);
    return git("rev-parse", "HEAD");
  };
  return { dir, git, write, commit };
}

function run(script, args, cwd, extraEnv = {}) {
  const env = { ...process.env, FF_CARDS_ROOT: cwd, ...extraEnv };
  delete env.DATABASE_URL;
  delete env.DATABASE_URL_UNPOOLED;
  delete env.GITHUB_STEP_SUMMARY;
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env });
}

function changed(repo, base, head, scope = "daily") {
  const r = run(CI, ["changed", "--base", base, "--head", head, "--scope", scope], repo.dir);
  assert.equal(r.status, 0, r.stderr);
  return { cards: r.stdout.split("\n").filter(Boolean), stderr: r.stderr };
}

test("change detection: first push, normal push, image-only, examples, delete, force push", () => {
  const repo = scratchRepo();
  repo.write("cards/examples/sample.json", card(null, "Example"));
  repo.write("cards/daily/2026-10-08-alpha.json", card(ID_A));
  repo.write("cards/daily/2026-10-08-alpha.png", solidPng(160, 90));
  const c1 = repo.commit("first");

  // First push (zero before): every daily card, never examples.
  const first = changed(repo, ZERO, c1);
  assert.deepEqual(first.cards, ["cards/daily/2026-10-08-alpha.json"]);
  assert.match(first.stderr, /no base commit/);

  repo.write("cards/daily/2026-10-09-beta.json", card(ID_B));
  repo.write("cards/daily/2026-10-09-beta.png", solidPng(160, 90));
  const c2 = repo.commit("add beta");
  assert.deepEqual(changed(repo, c1, c2).cards, ["cards/daily/2026-10-09-beta.json"]);

  repo.write("cards/daily/2026-10-08-alpha.png", solidPng(320, 180, [200, 10, 10]));
  const c3 = repo.commit("new alpha picture");
  assert.deepEqual(changed(repo, c2, c3).cards, ["cards/daily/2026-10-08-alpha.json"]);

  repo.write("cards/examples/sample.json", card(null, "Example edited"));
  const c4 = repo.commit("edit example");
  assert.deepEqual(changed(repo, c3, c4).cards, []);
  assert.deepEqual(changed(repo, c3, c4, "all").cards, ["cards/examples/sample.json"]);

  repo.git("rm", "-q", "cards/daily/2026-10-09-beta.json", "cards/daily/2026-10-09-beta.png");
  const c5 = repo.commit("remove beta");
  assert.deepEqual(changed(repo, c4, c5).cards, []);

  // Several commits in one push are all seen.
  assert.deepEqual(changed(repo, c1, c3).cards, [
    "cards/daily/2026-10-08-alpha.json",
    "cards/daily/2026-10-09-beta.json",
  ]);

  // Force push: main rewritten from c1, old tip c5 is not an ancestor.
  repo.git("checkout", "-q", "-b", "rewrite", c1);
  repo.write("cards/daily/2026-10-10-gamma.json", card(ID_C));
  repo.write("cards/daily/2026-10-10-gamma.png", solidPng(160, 90));
  const x1 = repo.commit("rewritten history");
  const forced = changed(repo, c5, x1);
  assert.match(forced.stderr, /force push/);
  assert.deepEqual(forced.cards, [
    "cards/daily/2026-10-08-alpha.json",
    "cards/daily/2026-10-10-gamma.json",
  ]);

  // A base commit this clone never saw also falls back to all daily cards.
  const unknown = changed(repo, "1234567890abcdef1234567890abcdef12345678", x1);
  assert.match(unknown.stderr, /not in this clone/);
  assert.equal(unknown.cards.length, 2);
});

test("id guards: duplicate id, changed id, and renamed card with a new id fail", () => {
  const repo = scratchRepo();
  repo.write("cards/daily/2026-10-08-alpha.json", card(ID_A));
  const base = repo.commit("base");
  const ids = (files) => run(CI, ["check-ids", "--base", base, ...files], repo.dir);

  repo.write("cards/daily/2026-10-09-beta.json", card(ID_B));
  let r = ids(["cards/daily/2026-10-09-beta.json"]);
  assert.equal(r.status, 0, r.stderr);

  repo.write("cards/daily/2026-10-09-beta.json", card(ID_A));
  r = ids(["cards/daily/2026-10-09-beta.json"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /duplicate_id/);
  fs.rmSync(path.join(repo.dir, "cards/daily/2026-10-09-beta.json"));

  repo.write("cards/daily/2026-10-08-alpha.json", card(ID_C, "Edited title"));
  r = ids(["cards/daily/2026-10-08-alpha.json"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /id_changed cards\/daily\/2026-10-08-alpha\.json/);

  // Edit that keeps the id is fine (updates in place).
  repo.write("cards/daily/2026-10-08-alpha.json", card(ID_A, "Edited title"));
  r = ids(["cards/daily/2026-10-08-alpha.json"]);
  assert.equal(r.status, 0, r.stderr);

  // Rename plus a new id is caught through git's rename detection.
  repo.git("mv", "cards/daily/2026-10-08-alpha.json", "cards/daily/2026-10-08-alpha-renamed.json");
  repo.write("cards/daily/2026-10-08-alpha-renamed.json", card(ID_C, "Edited title"));
  repo.commit("rename");
  r = ids(["cards/daily/2026-10-08-alpha-renamed.json"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /id_changed/);
});

test("validator: daily cards need an id, the name rule, and a 16:9 image", () => {
  const repo = scratchRepo();
  const validate = (rel) => run(VALIDATE, [rel], repo.dir);

  repo.write("cards/daily/2026-10-08-good.json", card(ID_A));
  repo.write("cards/daily/2026-10-08-good.png", solidPng(1600, 900));
  let r = validate("cards/daily/2026-10-08-good.json");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^OK /m);

  repo.write("cards/daily/2026-10-08-noid.json", card(null));
  repo.write("cards/daily/2026-10-08-noid.png", solidPng(1600, 900));
  r = validate("cards/daily/2026-10-08-noid.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /id_required/);

  repo.write("cards/daily/2026-10-08-square.json", card(ID_B));
  repo.write("cards/daily/2026-10-08-square.png", solidPng(900, 900));
  r = validate("cards/daily/2026-10-08-square.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /image_not_16x9/);

  repo.write("cards/daily/2026-10-08-nopic.json", card(ID_C));
  r = validate("cards/daily/2026-10-08-nopic.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /image_required/);
  fs.rmSync(path.join(repo.dir, "cards/daily/2026-10-08-nopic.json"));

  repo.write("cards/daily/bad-name.json", card("8eaf5c31-6a4d-4f9e-8b12-3d4e5f607182"));
  repo.write("cards/daily/bad-name.png", solidPng(1600, 900));
  r = validate("cards/daily/bad-name.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bad_daily_name/);
  fs.rmSync(path.join(repo.dir, "cards/daily/bad-name.json"));

  // A copied card that kept the original id is a duplicate.
  repo.write("cards/daily/2026-10-09-copy.json", card(ID_A, "Copied card"));
  repo.write("cards/daily/2026-10-09-copy.png", solidPng(1600, 900));
  r = validate("cards/daily/2026-10-09-copy.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /duplicate_id/);
  fs.rmSync(path.join(repo.dir, "cards/daily/2026-10-09-copy.json"));

  // Daily cards need a capability and 1–3 use cases.
  repo.write("cards/daily/2026-10-10-nocap.json", card("9fb06d42-7b5e-4a0f-9c23-4e5f60718293", "No capability", { capability: undefined, useCases: undefined }));
  repo.write("cards/daily/2026-10-10-nocap.png", solidPng(1600, 900));
  r = validate("cards/daily/2026-10-10-nocap.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /capability_required/);
  assert.match(r.stderr, /use_cases_required/);
  repo.write("cards/daily/2026-10-10-nocap.json", card("9fb06d42-7b5e-4a0f-9c23-4e5f60718293", "Too many uses", { useCases: ["a", "b", "c", "d"] }));
  r = validate("cards/daily/2026-10-10-nocap.json");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bad_use_cases/);
  fs.rmSync(path.join(repo.dir, "cards/daily/2026-10-10-nocap.json"));

  // Jargon and over-long link labels warn but never fail.
  repo.write(
    "cards/daily/2026-10-11-jargon.json",
    card("a0c17e53-8c6f-4b10-8d34-5f6071829304", "A 7-electronvolt diode", {
      capability: "We can now grow a film with a bandgap above 7 electronvolts.",
      links: [{ label: "x".repeat(81), url: "https://example.com/long" }],
    })
  );
  repo.write("cards/daily/2026-10-11-jargon.png", solidPng(1600, 900));
  r = validate("cards/daily/2026-10-11-jargon.json");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /warn: jargon: "electronvolt" in title/);
  assert.match(r.stdout, /warn: jargon: "diode" in title/);
  assert.match(r.stdout, /warn: jargon: "bandgap" in capability/);
  assert.match(r.stdout, /warn: 1 link label\(s\) over 80 characters/);
  r = validate("cards/daily/2026-10-08-good.json");
  assert.doesNotMatch(r.stdout, /jargon/);
  fs.rmSync(path.join(repo.dir, "cards/daily/2026-10-11-jargon.json"));

  // Examples keep the old, looser rules: no id needed, odd aspect only warns.
  repo.write("cards/examples/legacy.json", card(null, "Legacy example", { capability: undefined, useCases: undefined }));
  repo.write("cards/examples/legacy.png", solidPng(1200, 1073));
  r = validate("cards/examples/legacy.json");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /warn: image_not_16x9/);
});

test("issue dry run: same id gives the same upsert target and link; daily cards without an id are refused", () => {
  const repo = scratchRepo();
  repo.write("cards/daily/2026-10-08-good.json", card(ID_A));
  repo.write("cards/daily/2026-10-08-good.png", solidPng(1600, 900));
  const once = run(ISSUE, ["--dry-run", "cards/daily/2026-10-08-good.json"], repo.dir);
  const twice = run(ISSUE, ["cards/daily/2026-10-08-good.json"], repo.dir, { DRY_RUN: "1" });
  for (const r of [once, twice]) {
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /ON CONFLICT \(id\) DO UPDATE/);
    assert.match(r.stdout, /## Capability\\nSomething can now be done/);
    assert.match(r.stdout, /## Use cases\\n- A first concrete use\\n- A second concrete use/);
    assert.match(r.stdout, new RegExp(`/card/${ID_A}$`, "m"));
  }
  assert.equal(once.stdout, twice.stdout);

  repo.write("cards/daily/2026-10-08-noid.json", card(null));
  repo.write("cards/daily/2026-10-08-noid.png", solidPng(1600, 900));
  const refused = run(ISSUE, ["--dry-run", "cards/daily/2026-10-08-noid.json"], repo.dir);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /id_required/);

  // Without a database and without dry run, the script stops before storing.
  const noDb = run(ISSUE, ["cards/daily/2026-10-08-good.json"], repo.dir);
  assert.equal(noDb.status, 1);
  assert.match(noDb.stderr, /DATABASE_URL is not set/);
});

test("publish helper: keeps going after a failure and writes the links file", () => {
  const repo = scratchRepo();
  repo.write("cards/daily/2026-10-08-good.json", card(ID_A));
  repo.write("cards/daily/2026-10-08-good.png", solidPng(1600, 900));
  repo.write("cards/daily/2026-10-08-noid.json", card(null));
  repo.write("cards/daily/2026-10-08-noid.png", solidPng(1600, 900));
  const links = path.join(repo.dir, "links.md");
  const r = run(
    CI,
    ["publish", "--dry-run", "cards/daily/2026-10-08-noid.json", "cards/daily/2026-10-08-good.json"],
    repo.dir,
    { CARD_LINKS_FILE: links }
  );
  assert.equal(r.status, 1);
  const md = fs.readFileSync(links, "utf8");
  assert.match(md, /dry run/);
  assert.match(md, new RegExp(`2026-10-08-good\\.json\`: https://cloud\\.warmersun\\.com/card/${ID_A}`));
  assert.match(md, /2026-10-08-noid\.json`: \*\*not issued\*\*/);
});
