#!/usr/bin/env node
/**
 * Helper for the collector-card GitHub workflows. Runs locally too.
 *
 *   node scripts/collector-cards-ci.mjs changed --base <sha> --head <sha> [--scope daily|all] [--pr]
 *       Print the card JSON files added or changed between two commits, one per
 *       line. A changed image counts as a change to its card. Deleted cards are
 *       skipped. --pr diffs from the merge base (what a pull request adds).
 *       When the base is missing, all zeros (first push), or not an ancestor of
 *       head (force push), every card in scope at head is printed. That is safe
 *       because issuing is an upsert keyed on each card's id.
 *
 *   node scripts/collector-cards-ci.mjs all [--scope daily|all]
 *       Print every card JSON in scope in the working tree.
 *
 *   node scripts/collector-cards-ci.mjs check-ids --base <sha> <card.json ...>
 *       Fail when two cards share an id, or when a card that already existed at
 *       <sha> lost or changed its id (renames are followed).
 *
 *   node scripts/collector-cards-ci.mjs publish [--dry-run] <card.json ...>
 *       Issue each card with scripts/issue-collector-card.mjs, keep going after
 *       a failure, write the links to $GITHUB_STEP_SUMMARY and to
 *       $CARD_LINKS_FILE when set, and exit 1 if any card failed.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizeCardId } from "../js/server/collector-cards.mjs";
import {
  DAILY_CARD_DIR,
  isDailyCardPath,
  isZeroSha,
  selectChangedCards,
  findCardIdProblems,
  toPosix,
} from "../js/server/collector-card-publish.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Where cards/ and its git history live. Tests point this at a scratch repo. */
const CARDS_ROOT = process.env.FF_CARDS_ROOT ? path.resolve(process.env.FF_CARDS_ROOT) : ROOT;

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: CARDS_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", opts.quiet ? "ignore" : "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function gitOk(args) {
  try {
    git(args, { quiet: true });
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base" || a === "--head" || a === "--scope") flags[a.slice(2)] = argv[++i];
    else if (a.startsWith("--")) flags[a.slice(2)] = true;
    else rest.push(a);
  }
  return { flags, rest };
}

function inScope(rel, scope) {
  const p = toPosix(rel);
  if (!p.startsWith("cards/") || !p.endsWith(".json")) return false;
  return scope === "all" ? true : isDailyCardPath(p);
}

function cardsAtCommit(sha, scope) {
  const out = git(["ls-tree", "-r", "--name-only", sha, "--", "cards/"]);
  return out
    .split("\n")
    .filter(Boolean)
    .filter((p) => inScope(p, scope))
    .sort();
}

function cardsInTree(scope) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else {
        const rel = toPosix(path.relative(CARDS_ROOT, abs));
        if (inScope(rel, scope)) out.push(rel);
      }
    }
  };
  walk(path.join(CARDS_ROOT, scope === "all" ? "cards" : DAILY_CARD_DIR));
  return out.sort();
}

/**
 * @returns {{ cards: string[], mode: "diff" | "full", reason?: string }}
 */
export function changedCards({ base, head, scope = "daily", pr = false }) {
  const headSha = git(["rev-parse", "--verify", `${head || "HEAD"}^{commit}`], { quiet: true }).trim();
  let from = base;
  let reason = "";
  if (isZeroSha(from)) reason = "no base commit (first push or new branch)";
  else if (!gitOk(["cat-file", "-e", `${from}^{commit}`])) reason = `base ${from} is not in this clone`;
  else if (pr) {
    from = git(["merge-base", from, headSha], { quiet: true }).trim();
  } else if (!gitOk(["merge-base", "--is-ancestor", from, headSha])) {
    reason = `base ${from} is not an ancestor of head (force push)`;
  }
  if (reason) return { cards: cardsAtCommit(headSha, scope), mode: "full", reason };
  const names = git(["diff", "--name-only", "--diff-filter=ACMRT", "-M", from, headSha, "--", "cards/"])
    .split("\n")
    .filter(Boolean);
  const exists = (rel) => gitOk(["cat-file", "-e", `${headSha}:${rel}`]);
  return { cards: selectChangedCards(names, { scope, exists }), mode: "diff" };
}

function readIdFromText(text) {
  try {
    return normalizeCardId(JSON.parse(text).id);
  } catch {
    return null;
  }
}

function checkIds(base, files) {
  const cards = cardsInTree("all").map((rel) => ({
    path: rel,
    id: readIdFromText(fs.readFileSync(path.join(CARDS_ROOT, rel), "utf8")),
  }));
  const changed = files.map((f) => toPosix(path.relative(CARDS_ROOT, path.resolve(CARDS_ROOT, f))));
  /** @type {Map<string, string>} new path -> old path */
  const renamed = new Map();
  let baseIdOf;
  if (!isZeroSha(base) && gitOk(["cat-file", "-e", `${base}^{commit}`])) {
    const status = git(["diff", "--name-status", "-M", base, "HEAD", "--", "cards/"], { quiet: true });
    for (const line of status.split("\n")) {
      const parts = line.split("\t");
      if (parts[0]?.startsWith("R") && parts.length === 3) renamed.set(parts[2], parts[1]);
    }
    baseIdOf = (rel) => {
      const old = renamed.get(rel) || rel;
      try {
        return readIdFromText(git(["show", `${base}:${old}`], { quiet: true }));
      } catch {
        return undefined;
      }
    };
  }
  return findCardIdProblems(cards, { changed, baseIdOf });
}

function mdEscape(s) {
  return String(s).replace(/[|<>]/g, (c) => `\\${c}`);
}

function publish(files, { dryRun }) {
  const rows = [];
  let failed = 0;
  for (const file of files) {
    const args = [path.join(ROOT, "scripts/issue-collector-card.mjs"), path.resolve(CARDS_ROOT, file)];
    if (dryRun) args.push("--dry-run");
    const r = spawnSync(process.execPath, args, { cwd: CARDS_ROOT, encoding: "utf8", env: process.env });
    const lines = String(r.stdout || "").trim().split("\n").filter(Boolean);
    const url = lines.reverse().find((l) => /^https?:\/\/\S+\/card\/[0-9a-f-]{36}$/i.test(l.trim()));
    if (r.status === 0 && url) {
      rows.push({ file, ok: true, url: url.trim() });
      console.log(`${dryRun ? "would issue" : "issued"} ${file} -> ${url.trim()}`);
    } else {
      failed++;
      const err = String(r.stderr || r.stdout || "").trim().split("\n").pop() || `exit ${r.status}`;
      rows.push({ file, ok: false, error: err });
      console.error(`::error file=${file}::card not issued: ${err}`);
    }
  }
  const title = dryRun ? "Collector cards (dry run, nothing stored)" : "Collector cards published";
  const md = [
    `### ${title}`,
    "",
    ...rows.map((r) =>
      r.ok
        ? `- \`${r.file}\`: ${r.url}`
        : `- \`${r.file}\`: **not issued** (${mdEscape(r.error)})`
    ),
    "",
  ].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  if (process.env.CARD_LINKS_FILE) fs.writeFileSync(process.env.CARD_LINKS_FILE, md);
  if (!process.env.GITHUB_STEP_SUMMARY) console.log(`\n${md}`);
  return failed;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const scope = flags.scope === "all" ? "all" : "daily";
  if (cmd === "changed") {
    const r = changedCards({ base: flags.base, head: flags.head, scope, pr: Boolean(flags.pr) });
    if (r.mode === "full") console.error(`notice: ${r.reason}; listing every card in scope.`);
    for (const c of r.cards) console.log(c);
  } else if (cmd === "all") {
    for (const c of cardsInTree(scope)) console.log(c);
  } else if (cmd === "check-ids") {
    const problems = checkIds(flags.base, rest);
    for (const p of problems) console.error(`FAIL ${p}`);
    if (problems.length) process.exit(1);
    console.log(`OK card ids: unique, and ${rest.length} changed card(s) kept their ids`);
  } else if (cmd === "publish") {
    if (!rest.length) {
      console.log("No cards to issue.");
      process.exit(0);
    }
    const dryRun =
      Boolean(flags["dry-run"]) || /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || ""));
    const failed = publish(rest, { dryRun });
    process.exit(failed ? 1 : 0);
  } else {
    console.error("Usage: collector-cards-ci.mjs changed|all|check-ids|publish ... (see the header)");
    process.exit(2);
  }
}
