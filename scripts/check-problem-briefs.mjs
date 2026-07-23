/**
 * Coverage check: every GLOBALS id has a non-empty brief with required fields.
 * Also verifies mission loading path surfaces the brief and keeps cards blocked.
 * Run: node scripts/check-problem-briefs.mjs
 * Optional: BRIEF_CHECK_OUT=/path node scripts/check-problem-briefs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLOBALS } from "../js/data.js";
import { PROBLEM_BRIEFS, briefForGlobal } from "../js/problem-briefs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const required = ["currentState", "rootCauses", "warnings"];
const missing = [];
const thin = [];

for (const g of GLOBALS) {
  const b = briefForGlobal(g.id);
  if (!b) {
    missing.push(g.id);
    continue;
  }
  for (const k of required) {
    const v = String(b[k] || "").trim();
    if (!v) missing.push(`${g.id}.${k}`);
    else if (v.length < 40) thin.push(`${g.id}.${k} (${v.length} chars)`);
  }
}

// Real shipped lookup with object form
const first = GLOBALS[0];
const byId = briefForGlobal(first.id);
const byObj = briefForGlobal({ id: first.id });
const lookupOk =
  byId &&
  byObj &&
  byId.currentState === byObj.currentState &&
  byId.rootCauses === byObj.rootCauses &&
  byId.warnings === byObj.warnings;

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

const hasBriefDom =
  /id="problem-brief"/.test(indexHtml) &&
  /id="problem-brief-state"/.test(indexHtml) &&
  /id="problem-brief-causes"/.test(indexHtml) &&
  /id="problem-brief-warnings"/.test(indexHtml);

// Loading branch inside renderMissions: brief (drafting:true) before skeletons
const renderMissionsFn = gameJs.match(
  /async function renderMissions[\s\S]*?\nasync function |async function renderMissions[\s\S]*?\nfunction startMission/
)?.[0] || "";
const draftingCall = /renderProblemBrief\(\s*g\s*,\s*\{\s*drafting:\s*true\s*\}\s*\)/.test(
  renderMissionsFn
);
const afterLoadCall = /renderProblemBrief\(\s*g\s*,\s*\{\s*drafting:\s*false\s*\}\s*\)/.test(
  renderMissionsFn
);
const skeletonCallIdx = renderMissionsFn.indexOf("paintMissionSkeletons(");
const draftingIdx = renderMissionsFn.indexOf("renderProblemBrief(g, { drafting: true })");
const ensureIdx = renderMissionsFn.indexOf("ensureScenarios(");
const skeletonWhileLoading =
  skeletonCallIdx >= 0 &&
  draftingIdx >= 0 &&
  ensureIdx >= 0 &&
  draftingIdx < skeletonCallIdx &&
  skeletonCallIdx < ensureIdx &&
  /scenariosLoading\s*=\s*true/.test(renderMissionsFn);
const startBlocked =
  /function startMission[\s\S]{0,200}scenariosLoading/.test(gameJs) ||
  /if\s*\(\s*state\.scenariosLoading\s*\)/.test(gameJs);

const pass =
  missing.length === 0 &&
  GLOBALS.length === Object.keys(PROBLEM_BRIEFS).length &&
  lookupOk &&
  hasBriefDom &&
  draftingCall &&
  afterLoadCall &&
  skeletonWhileLoading &&
  startBlocked;

const lines = [
  `GLOBALS: ${GLOBALS.length}`,
  `PROBLEM_BRIEFS keys: ${Object.keys(PROBLEM_BRIEFS).length}`,
  `missing: ${missing.length ? missing.join(", ") : "(none)"}`,
  `thin (<40 chars): ${thin.length ? thin.join(", ") : "(none)"}`,
  `lookup sample OK: ${lookupOk}`,
  `DOM brief panel: ${hasBriefDom}`,
  `drafting:true before skeletons: ${draftingCall && skeletonWhileLoading}`,
  `drafting:false after load: ${afterLoadCall}`,
  `startMission blocked while loading: ${startBlocked}`,
  `PASS: ${pass}`,
];

const text = lines.join("\n") + "\n";
console.log(text);

const scratch = process.env.BRIEF_CHECK_OUT;
if (scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(path.join(scratch, "brief-coverage.txt"), text);
}

if (!pass) process.exitCode = 1;
