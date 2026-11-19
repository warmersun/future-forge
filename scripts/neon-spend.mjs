#!/usr/bin/env node
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

/**
 * Estimate Warmer Sun's Neon bill for the current billing period and compare it
 * with the org spending limit. Credits, when you pass them, are applied first.
 *
 *   node scripts/neon-spend.mjs
 *   node scripts/neon-spend.mjs --credits 250
 *   npm run neon:spend -- --credits 250
 *
 * Uses the logged-in `neon` CLI. It does not print API keys.
 *
 * The Neon API does not return an account credit balance. AI Gateway credits
 * are a separate prepaid pool. Pass --credits with the remaining dollar balance
 * shown on the Billing page. This period's estimate is drawn from that balance
 * before anything is compared with the monthly spending limit.
 *
 * Exit 0 when the estimated card charge is under the limit, 1 when it reaches
 * the limit, 2 when the CLI or API call fails.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ORG_ID = "org-red-truth-77995409";

const METRICS = [
  "compute_unit_seconds",
  "root_branch_bytes_month",
  "child_branch_bytes_month",
  "instant_restore_bytes_month",
  "snapshot_storage_bytes_month",
  "public_network_transfer_bytes",
  "private_network_transfer_bytes",
  "extra_branches_month",
  "functions_active_capacity_microseconds",
  "functions_waiting_capacity_microseconds",
  "functions_invocations",
  "functions_egress_bytes",
];

const GB = 1_000_000_000;
const HOURS_PER_BILLING_MONTH = 744;

/** Published Launch and Scale rates. https://neon.com/docs/introduction/plans */
const RATES = {
  launch: {
    compute: 0.106,
    storage: 0.35,
    instantRestore: 0.2,
    snapshot: 0.09,
    publicTransfer: 0.1,
    privateTransfer: 0,
    extraBranch: 1.5,
    functionsActive: 0.1,
    functionsWaiting: 0.025,
    functionsInvocations: 0.6,
    includedChildBranches: 9,
    publicTransferAllowanceGb: 500,
  },
  scale: {
    compute: 0.222,
    storage: 0.35,
    instantRestore: 0.2,
    snapshot: 0.09,
    publicTransfer: 0.1,
    privateTransfer: 0.01,
    extraBranch: 1.5,
    functionsActive: 0.12,
    functionsWaiting: 0.03,
    functionsInvocations: 0.6,
    includedChildBranches: 24,
    publicTransferAllowanceGb: 500,
  },
};

const USAGE_LABELS = [
  ["compute", "Compute"],
  ["rootStorage", "Root branch storage"],
  ["childStorage", "Child branch storage"],
  ["instantRestore", "Instant restore"],
  ["snapshot", "Snapshots"],
  ["publicTransfer", "Public transfer above 500 GB"],
  ["privateTransfer", "Private transfer"],
  ["extraBranches", "Extra branches"],
  ["functionsActive", "Functions, active"],
  ["functionsWaiting", "Functions, waiting"],
  ["functionsInvocations", "Functions, invocations"],
];

export function ratesForPlan(plan) {
  const key = String(plan || "launch").toLowerCase();
  if (key.startsWith("scale")) return RATES.scale;
  return RATES.launch;
}

export function money(value) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hoursBetween(start, end) {
  const ms = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 3_600_000;
}

function metricMap(metrics) {
  const out = {};
  for (const row of metrics || []) out[row.metric_name] = num(row.value);
  return out;
}

function emptyUsage() {
  return {
    compute: 0,
    rootStorage: 0,
    childStorage: 0,
    instantRestore: 0,
    snapshot: 0,
    publicTransfer: 0,
    privateTransfer: 0,
    extraBranches: 0,
    functionsActive: 0,
    functionsWaiting: 0,
    functionsInvocations: 0,
    functionsEgressGb: 0,
    publicTransferGb: 0,
  };
}

/**
 * Price one project's consumption history.
 * `periods` is the API `periods` array. Storage metrics are already byte-months.
 * Public transfer allowance and the included child-branch allowance apply per project.
 */
export function priceProject(periods) {
  const usage = emptyUsage();
  let publicBytes = 0;
  let privateBytes = 0;
  let billableBranchHours = 0;
  let branchRate = RATES.launch.extraBranch;
  const plans = new Set();

  for (const period of periods || []) {
    const rates = ratesForPlan(period.period_plan);
    plans.add(period.period_plan || "launch");
    branchRate = rates.extraBranch;
    for (const bucket of period.consumption || []) {
      const hours = hoursBetween(bucket.timeframe_start, bucket.timeframe_end);
      const m = metricMap(bucket.metrics);
      usage.compute += (m.compute_unit_seconds / 3600) * rates.compute;
      usage.rootStorage += (m.root_branch_bytes_month / GB) * rates.storage;
      usage.childStorage += (m.child_branch_bytes_month / GB) * rates.storage;
      usage.instantRestore += (m.instant_restore_bytes_month / GB) * rates.instantRestore;
      usage.snapshot += (m.snapshot_storage_bytes_month / GB) * rates.snapshot;
      usage.functionsActive +=
        (m.functions_active_capacity_microseconds / 3_600_000_000) * rates.functionsActive;
      usage.functionsWaiting +=
        (m.functions_waiting_capacity_microseconds / 3_600_000_000) * rates.functionsWaiting;
      usage.functionsInvocations +=
        (m.functions_invocations / 1_000_000) * rates.functionsInvocations;
      usage.functionsEgressGb += m.functions_egress_bytes / GB;
      publicBytes += m.public_network_transfer_bytes;
      privateBytes += m.private_network_transfer_bytes;
      const allowance = rates.includedChildBranches * hours;
      billableBranchHours += Math.max(0, m.extra_branches_month - allowance);
    }
  }

  usage.publicTransferGb = publicBytes / GB;
  const publicAllowance = ratesForPlan([...plans].at(-1)).publicTransferAllowanceGb;
  const publicRate = ratesForPlan([...plans].at(-1)).publicTransfer;
  const privateRate = ratesForPlan([...plans].at(-1)).privateTransfer;
  usage.publicTransfer = Math.max(0, usage.publicTransferGb - publicAllowance) * publicRate;
  usage.privateTransfer = (privateBytes / GB) * privateRate;
  usage.extraBranches = (billableBranchHours / HOURS_PER_BILLING_MONTH) * branchRate;
  usage.total = USAGE_LABELS.reduce((sum, [key]) => sum + usage[key], 0);
  usage.plans = [...plans];
  return usage;
}

export function sumUsage(projects) {
  const total = emptyUsage();
  total.total = 0;
  for (const project of projects) {
    for (const key of Object.keys(emptyUsage())) total[key] += project.usage[key] || 0;
    total.total += project.usage.total || 0;
  }
  return total;
}

/**
 * Draw this period's estimate from a remaining credit balance first.
 * The monthly spending limit is then compared with the leftover card charge.
 * `creditsUsd` null means the balance was not supplied and was not returned by the API.
 */
export function applyCredits({ usageUsd, creditsUsd, limitUsd }) {
  const usage = Math.max(0, num(usageUsd));
  const known = creditsUsd == null ? null : Math.max(0, num(creditsUsd));
  const drawn = known == null ? 0 : Math.min(known, usage);
  const charge = known == null ? usage : Math.max(0, usage - known);
  const limit = limitUsd == null ? null : num(limitUsd);
  let status = "ok";
  if (limit != null && limit >= 0 && charge >= limit) status = "over";
  else if (limit != null && limit > 0 && charge >= limit * 0.8) status = "warn";
  return {
    usage,
    creditsKnown: known != null,
    creditsRemaining: known,
    creditsDrawn: drawn,
    creditsAfter: known == null ? null : Math.max(0, known - usage),
    charge,
    limit,
    headroom: limit == null ? null : limit - charge,
    status,
  };
}

function parseArgs(argv) {
  const args = {
    orgId: process.env.NEON_ORG_ID || DEFAULT_ORG_ID,
    credits: null,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--org-id") args.orgId = argv[++i];
    else if (arg.startsWith("--org-id=")) args.orgId = arg.slice("--org-id=".length);
    else if (arg === "--credits") args.credits = argv[++i];
    else if (arg.startsWith("--credits=")) args.credits = arg.slice("--credits=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.credits != null) {
    const credits = Number(args.credits);
    if (!Number.isFinite(credits) || credits < 0) {
      throw new Error("--credits must be a remaining balance in US dollars, such as 250");
    }
    args.credits = credits;
  }
  if (!args.orgId) throw new Error("Missing organization id");
  return args;
}

function helpText() {
  return `Usage: node scripts/neon-spend.mjs [--org-id <id>] [--credits <usd>] [--json]

Estimates Neon usage for the current billing period from the consumption API.
--credits is the remaining balance you see on the Billing page. The Neon API
does not return that balance. Usage is subtracted from it before the monthly
spending limit is checked.

Reads the logged-in neon CLI. Does not print secrets.
Exit 0 under the limit, 1 at or over the limit, 2 on a CLI or API error.`;
}

function neonApi(apiPath, query = {}) {
  const args = ["api", apiPath, "-o", "json"];
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    args.push("-Q", `${key}=${value}`);
  }
  const result = spawnSync("neon", args, { encoding: "utf8" });
  if (result.error) throw new Error(`neon CLI failed to start: ${result.error.message}`);
  const stdout = (result.stdout || "").trim();
  let body = null;
  if (stdout) {
    try {
      body = JSON.parse(stdout);
    } catch {
      body = null;
    }
  }
  if (result.status !== 0) {
    const message =
      body?.message ||
      (result.stderr || "").replace(/^ERROR:\s*/m, "").trim() ||
      `neon api ${apiPath} exited ${result.status}`;
    const error = new Error(message);
    error.status = result.status;
    error.body = body;
    throw error;
  }
  if (body == null) throw new Error(`neon api ${apiPath} returned no JSON`);
  return body;
}

function listProjects(orgId) {
  const body = neonApi("/projects", { org_id: orgId, limit: 100 });
  const projects = Array.isArray(body) ? body : body.projects || [];
  return projects.map((project) => {
    let detail = project;
    if (!project.consumption_period_start) {
      try {
        const got = neonApi(`/projects/${project.id}`);
        detail = got.project || got;
      } catch {
        detail = project;
      }
    }
    return {
      id: detail.id || project.id,
      name: detail.name || project.name || project.id,
      consumptionPeriodStart: detail.consumption_period_start || null,
      consumptionPeriodEnd: detail.consumption_period_end || null,
    };
  });
}

function billingWindow(projects, now = new Date()) {
  const starts = projects.map((project) => project.consumptionPeriodStart).filter(Boolean).sort();
  const ends = projects.map((project) => project.consumptionPeriodEnd).filter(Boolean).sort();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const start = starts[0] || monthStart.toISOString();
  const end = ends.at(-1) || nextMonth.toISOString();
  return { start, end };
}

function fetchConsumption(orgId, window) {
  const projects = [];
  let cursor = "";
  const seen = new Set();
  for (let page = 0; page < 20; page += 1) {
    const body = neonApi("/consumption_history/v2/projects", {
      org_id: orgId,
      from: window.start,
      to: window.end,
      granularity: "daily",
      limit: 100,
      metrics: METRICS.join(","),
      cursor,
    });
    for (const project of body.projects || []) projects.push(project);
    const next = body.pagination?.cursor || "";
    if (!next || seen.has(next)) break;
    seen.add(next);
    cursor = next;
  }
  return projects;
}

function readCreditSignals(orgId) {
  const signals = {
    accountBalanceUsd: null,
    aiGatewayGrants: null,
    aiGatewayBalance: null,
    invoiceCount: null,
    notes: [],
  };
  try {
    const listed = neonApi(`/organizations/${orgId}/billing/aigw_credits`);
    signals.aiGatewayGrants = Array.isArray(listed.credits) ? listed.credits.length : null;
  } catch (error) {
    signals.notes.push(`AI Gateway credit list: ${error.message}`);
  }
  try {
    const balance = neonApi(`/organizations/${orgId}/billing/aigw_credits/balance`);
    const cents = balance.balance_cents ?? balance.credits_cents ?? balance.balance;
    signals.aiGatewayBalance = cents == null ? balance : num(cents) / (String(cents).includes(".") ? 1 : 100);
  } catch (error) {
    signals.aiGatewayBalance = null;
    signals.notes.push(`AI Gateway balance: ${error.message}`);
  }
  try {
    const invoices = neonApi(`/organizations/${orgId}/billing/invoices`);
    signals.invoiceCount = Array.isArray(invoices.invoices) ? invoices.invoices.length : null;
  } catch (error) {
    signals.notes.push(`Invoices: ${error.message}`);
  }
  return signals;
}

function readSpendingLimit(orgId) {
  const body = neonApi(`/organizations/${orgId}/billing/spending_limit`);
  if (body.spending_limit_cents == null) return null;
  return num(body.spending_limit_cents) / 100;
}

function orgName(orgId) {
  try {
    const org = neonApi(`/organizations/${orgId}`);
    return { name: org.name || orgId, plan: org.plan || "launch" };
  } catch {
    return { name: orgId, plan: "launch" };
  }
}

export function buildReport({ org, window, projects, limitUsd, creditsUsd, creditSignals }) {
  const priced = projects.map((project) => ({
    id: project.project_id,
    name: project.name || project.project_id,
    usage: priceProject(project.periods),
  }));
  const usage = sumUsage(priced);
  const settlement = applyCredits({
    usageUsd: usage.total,
    creditsUsd,
    limitUsd,
  });
  return {
    org,
    window,
    limitUsd,
    usage,
    projects: priced.filter((project) => project.usage.total > 0 || (project.periods || []).length),
    allProjects: priced,
    settlement,
    creditSignals,
    omitted: [
      "Object storage GB-month is not in the consumption API, so this estimate can sit below the invoice.",
      "Functions egress is reported and is not priced again. Neon counts it toward public network transfer.",
      "Daily buckets round to UTC dates. Branch-hour allowances are slightly coarser than Neon's hourly invoice.",
    ],
  };
}

function printReport(report) {
  const { org, window, settlement, usage, creditSignals } = report;
  const lines = [];
  lines.push(`${org.name} (${org.id})  plan ${org.plan}`);
  lines.push(`Billing window ${window.start} → ${window.end}`);
  lines.push(`Estimated usage ${money(settlement.usage)}`);
  for (const [key, label] of USAGE_LABELS) {
    if (usage[key] > 0) lines.push(`  ${label} ${money(usage[key])}`);
  }
  if (usage.functionsEgressGb > 0) {
    lines.push(`  Functions egress ${usage.functionsEgressGb.toFixed(3)} GB, included with public transfer`);
  }
  if (settlement.usage === 0) {
    lines.push("  No consumption rows in this window. Metrics can lag about an hour.");
  }
  lines.push(
    settlement.limit == null
      ? "Spending limit none"
      : `Spending limit ${money(settlement.limit)}  emails at 80% and 100%, and does not suspend projects`,
  );
  if (creditSignals.accountBalanceUsd == null) {
    lines.push("Account credit balance: not returned by the Neon API");
  }
  const grants = creditSignals.aiGatewayGrants;
  lines.push(
    `AI Gateway credits: ${grants == null ? "unknown" : `${grants} grant${grants === 1 ? "" : "s"}`}` +
      (creditSignals.aiGatewayBalance == null ? ", balance not found" : `, balance ${money(creditSignals.aiGatewayBalance)}`),
  );
  if (creditSignals.invoiceCount != null) lines.push(`Invoices on file: ${creditSignals.invoiceCount}`);
  if (settlement.creditsKnown) {
    lines.push(`Credits applied first ${money(settlement.creditsDrawn)} of ${money(settlement.creditsRemaining)} supplied`);
    lines.push(`Credits left after this estimate ${money(settlement.creditsAfter)}`);
    lines.push(`Estimated card charge ${money(settlement.charge)}`);
  } else {
    lines.push("Estimated card charge: same as usage, because no credit balance was supplied");
    lines.push("Pass --credits with the remaining balance from the Billing page.");
  }
  if (settlement.limit != null) lines.push(`Headroom under the spending limit ${money(settlement.headroom)}`);
  if (settlement.status === "over") lines.push("Status OVER the spending limit");
  else if (settlement.status === "warn") lines.push("Status within 20% of the spending limit");
  else lines.push("Status under the spending limit");
  for (const note of report.omitted) lines.push(`Note: ${note}`);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    return;
  }
  const orgInfo = orgName(args.orgId);
  const projects = listProjects(args.orgId);
  const names = new Map(projects.map((project) => [project.id, project.name]));
  const window = billingWindow(projects);
  const history = fetchConsumption(args.orgId, window).map((project) => ({
    ...project,
    name: names.get(project.project_id) || project.project_id,
  }));
  const knownIds = new Set(history.map((project) => project.project_id));
  for (const project of projects) {
    if (!knownIds.has(project.id)) {
      history.push({ project_id: project.id, name: project.name, periods: [] });
    }
  }
  const report = buildReport({
    org: { id: args.orgId, name: orgInfo.name, plan: orgInfo.plan },
    window,
    projects: history,
    limitUsd: readSpendingLimit(args.orgId),
    creditsUsd: args.credits,
    creditSignals: readCreditSignals(args.orgId),
  });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(printReport(report));
  if (report.settlement.status === "over") process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(2);
  }
}
