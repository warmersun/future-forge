/**
 * Future Forge server — static files + Grok co-inventor
 * Auth: SuperGrok session from ~/.grok/auth.json (same login as Grok CLI).
 * Optional fallback: XAI_API_KEY. Local co-inventor if nothing works.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const GROK_HOME = process.env.GROK_HOME || path.join(os.homedir(), ".grok");
const AUTH_PATH = path.join(GROK_HOME, "auth.json");
const XAI_BASE = "https://api.x.ai/v1";
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth2/token";

function loadEnvFile() {
  const candidates = [path.join(ROOT, ".env"), path.join(ROOT, ".env.local")];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT) || 8765;
const MODEL = process.env.XAI_MODEL || "grok-4.5";

/** @type {{ source: 'supergrok'|'api-key'|null, email?: string }} */
let authInfo = { source: null };

function readAuthFile() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const entries = Object.entries(data || {});
    if (!entries.length) return null;
    // Prefer auth.x.ai session entries
    entries.sort(([a], [b]) => {
      const score = (k) => (k.includes("auth.x.ai") ? 0 : 1);
      return score(a) - score(b);
    });
    const [storeKey, entry] = entries[0];
    if (!entry?.key) return null;
    return { storeKey, entry, all: data };
  } catch {
    return null;
  }
}

function writeAuthEntry(storeKey, entry, all) {
  try {
    const next = { ...all, [storeKey]: entry };
    fs.writeFileSync(AUTH_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch (e) {
    console.warn("[auth] could not persist refreshed token:", e.message);
  }
}

function tokenExpired(entry, skewMs = 60_000) {
  if (!entry?.expires_at) return false;
  const exp = Date.parse(entry.expires_at);
  if (Number.isNaN(exp)) return false;
  return Date.now() >= exp - skewMs;
}

async function refreshSuperGrokToken(storeKey, entry, all) {
  if (!entry.refresh_token || !entry.oidc_client_id) {
    throw new Error("SuperGrok session has no refresh token — run: grok login");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: entry.refresh_token,
    client_id: entry.oidc_client_id,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SuperGrok token refresh failed (${res.status}): ${text.slice(0, 120)}`);
  }
  const out = await res.json();
  const access = out.access_token;
  if (!access) throw new Error("SuperGrok refresh returned no access_token");
  const expiresIn = Number(out.expires_in) || 21600;
  const updated = {
    ...entry,
    key: access,
    refresh_token: out.refresh_token || entry.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  writeAuthEntry(storeKey, updated, all);
  return updated.key;
}

/**
 * Resolve bearer token: SuperGrok login first, then optional API key.
 * Never expose tokens to the browser.
 */
async function resolveAccessToken({ forceRefresh = false } = {}) {
  const session = readAuthFile();
  if (session) {
    let { storeKey, entry, all } = session;
    try {
      if (forceRefresh || tokenExpired(entry)) {
        const token = await refreshSuperGrokToken(storeKey, entry, all);
        authInfo = { source: "supergrok", email: entry.email };
        return token;
      }
      authInfo = { source: "supergrok", email: entry.email };
      return entry.key;
    } catch (e) {
      console.warn("[auth]", e.message);
      // fall through to API key if any
    }
  }

  const apiKey = process.env.XAI_API_KEY || "";
  // Intentionally ignore bare GROK_API_KEY env noise when SuperGrok session is preferred;
  // only XAI_API_KEY is treated as an explicit console key override.
  if (apiKey && !apiKey.startsWith("eyJ")) {
    // If it looks like a console key (xai-...), use it only when no session worked
    if (!session) {
      authInfo = { source: "api-key" };
      return apiKey;
    }
  }

  if (!session) {
    authInfo = { source: null };
    return null;
  }
  // Session existed but refresh failed — last try with existing key
  authInfo = { source: "supergrok", email: session.entry.email };
  return session.entry.key;
}

async function getClient(opts) {
  const token = await resolveAccessToken(opts);
  if (!token) return null;
  return new OpenAI({
    apiKey: token,
    baseURL: XAI_BASE,
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const SYSTEM_PROMPT = `You are the AI Co-Inventor in Future Forge: a solo learning game about emerging technologies, local invention, and timing.

Role:
- Creative partner for a LOCAL mission. Not sole inventor.
- Suggest multi-domain stacks only when the problem needs them — never as a hard rule.
- emTech categories are ALWAYS pickable. Timing is about CLAIMS in how-it-works vs the calendar year — never "you cannot pick Synthetic Biology until 2029".
- readyYear / softHorizon on a tech is only a soft hint that near-scale use cases get more common later — not a lock.
- When mode is art-of-the-possible: teach milestones, current capabilities (now), use cases unlocked, near vs frontier stretch for the selected stack (or recommended if empty) and year/place. Use maturity/milestones/useCasesNow from availableTechs as baseline; enrich with real-world knowledge when confident. Label uncertainty. Do not invent fake paper titles.
- When mode is assess-feasibility: judge ONLY whether inventionHow/inventionImpact over-claim what is possible in context.year for the stack. Return top-level timing: { "level": "red"|"yellow"|"green", "reason": "..." }. green = near-term/pilot-honest; yellow = stretch or vague; red = frontier treated as routine. Categories in the stack never force red by themselves.
- When mode is complete-picture: the player wrote ONLY one face (how OR everyday life). Fill the OTHER face only in proposals (inventionHow XOR inventionImpact). Stay local, match the stack, complementary not contradictory.
- When mode is scrutinize: stress-test the idea from THREE angles (see below). Put results in proposals.scrutiny.
- Tone: vivid, concise, hopeful, practical.

Scrutiny angles (plain language, local, specific):
1. moloch — Multipolar traps / race-to-the-bottom / coordination failure (Scott Alexander's "Moloch"): who defects, what metric gets goodharted, arms races, tragedy of the commons. Optional one nod to "Moloch" if natural. Always a safeguard that is a coordination fix, not a sermon.
2. nature — Mother Nature: energy, materials, ecology, disease, climate feedbacks, physical failure modes. Safeguard = design limit or monitoring.
3. policy — Policy buy-in AND affordability: who must say yes (mayor, clinic, voters, regulators), budget, who is priced out, legitimacy. Safeguard = financing or governance move.

Hard rules:
- Only use technology ids from availableTechs.
- Stay local: this place/year, not UN resolutions.
- No tabletop jargon. No UI lectures.
- Never say a category is locked until a year.

Respond with a single JSON object (no markdown fences):
{
  "message": "string — short conversational reply",
  "proposals": {
    "addTechIds": [],
    "removeTechIds": [],
    "inventionName": null,
    "inventionHow": null,
    "inventionImpact": null,
    "scrutiny": null
  },
  "teaching": [{ "techId": "id", "blurb": "one sentence" }],
  "timing": null
}

For assess-feasibility set timing to { "level": "red"|"yellow"|"green", "reason": "one sentence" }.
For other modes timing may be null.

scrutiny when used:
"scrutiny": {
  "moloch": { "analysis": "...", "safeguard": "..." },
  "nature": { "analysis": "...", "safeguard": "..." },
  "policy": { "analysis": "...", "safeguard": "..." }
}

Use null or [] when empty. For complete-picture fill only the missing face. For scrutinize fill scrutiny and keep techs unless asked.`;

/* —— Local co-inventor (always available) —— */

function localArtOfThePossible(context, selected, stack, map, base) {
  const year = context.year || 2026;
  const place = context.place || "this place";
  const focus = (selected.length ? selected : stack).slice(0, 5);
  if (!focus.length) {
    return {
      source: "local",
      message:
        `**Art of the possible** (${year}, ${place}):\n\n` +
        `Pick at least one emTech category first — then I can map milestones, current capabilities, and unlocked use cases for this year. ` +
        `Remember: categories are always pickable; we judge *claims*, not cards.`,
      proposals: base,
      teaching: [],
    };
  }
  const lines = focus.map((id) => {
    const t = map.get(id) || {};
    const mat = t.maturity || {};
    const now = mat.now || t.summary || "Real deployments exist in some form.";
    const near = mat.near || "Broader access as costs fall and regulation settles.";
    const frontier = mat.frontier || "Transformative everyday infrastructure (stretch).";
    const milestones = Array.isArray(t.milestones) && t.milestones.length
      ? t.milestones.join("; ")
      : "Ongoing pilots and products in this category.";
    const uses = Array.isArray(t.useCasesNow) && t.useCasesNow.length
      ? t.useCasesNow.join("; ")
      : t.summary || "Applied with human oversight";
    const soft = t.readyYear || t.softHorizon;
    const softNote =
      soft && soft > year
        ? ` Soft horizon ~${soft} (near-scale often more common later — not a lock).`
        : "";
    return (
      `### ${t.name || id}\n` +
      `**Now (${year}):** ${now}\n` +
      `**Milestones:** ${milestones}\n` +
      `**Use cases unlocked:** ${uses}\n` +
      `**Near:** ${near}\n` +
      `**Frontier (stretch if claimed as routine):** ${frontier}` +
      (softNote ? `\n_${softNote}_` : "")
    );
  });
  const teaching = focus.slice(0, 4).map((id) => {
    const t = map.get(id);
    const blurb =
      (Array.isArray(t?.useCasesNow) && t.useCasesNow[0]) ||
      t?.maturity?.now ||
      t?.summary ||
      "";
    return { techId: id, blurb: String(blurb).slice(0, 400) };
  });
  return {
    source: "local",
    message:
      `**Art of the possible** — ${place}, **${year}**\n\n` +
      `Categories below are always choosable. Invent with *now* / pilot language for green timing; frontier-as-routine goes red on feasibility.\n\n` +
      lines.join("\n\n") +
      `\n\nWant a claim that fits this year? Draft how-it-works around a pilot, partnership, or mapped corridor — then I'll stress-test timing.`,
    proposals: base,
    teaching,
  };
}

function localAssessFeasibility(context, selected, map, base) {
  const year = context.year || 2026;
  const how = String(context.inventionHow || "").trim();
  const impact = String(context.inventionImpact || "").trim();
  const text = how || impact;
  const techs = selected.map((id) => map.get(id)).filter(Boolean);

  const frontierRe =
    /quantum\s*internet|full(y)?\s*autonomous\s*(city|fleet|everything)|mind\s*control|upload(ed)?\s*consciousness|unlimited\s*energy|free\s*energy|teleport|cure\s*all\s*cancer|bci.*(everyone|consumer|mass)|programmable\s*(city|building)|living\s*(city|infrastructure)\s*that\s*grow|general[- ]purpose\s*quantum|replace\s*all\s*(doctors|teachers|drivers)/i;
  const pilotRe =
    /\b(pilot|trial|partnership|partner with|lab|research|limited|mapped corridor|geofenced|supervised|clinical|opt[- ]in|prototype|with oversight|human[- ]in[- ]the[- ]loop)\b/i;
  const routineRe =
    /\b(routine|every(one| resident)?|all residents|city[- ]wide|guarantees|always|overnight|fully automatic|no human|autonomous everywhere)\b/i;

  let level = "green";
  let reason = `Claims look compatible with near-term capabilities in ${year}.`;

  if (!selected.length) {
    level = "red";
    reason = "Add at least one technology to the stack.";
  } else if (text.length < 20) {
    level = "yellow";
    reason = "Need a clearer how-it-works to judge claim timing for this year.";
  } else if (frontierRe.test(text)) {
    level = "red";
    reason =
      "How-it-works treats frontier capability as routine now — revise toward pilots, partnerships, or near-term tools.";
  } else {
    const softHorizon = techs.filter((t) => (t.readyYear || t.softHorizon || year) > year + 2);
    if (softHorizon.length && routineRe.test(text) && !pilotRe.test(text)) {
      level = "yellow";
      reason = `${softHorizon
        .map((t) => t.name)
        .join(", ")} can stay in the stack, but city-wide/routine claims need pilot framing in ${year}.`;
    } else if (softHorizon.length && !pilotRe.test(text) && text.length < 80) {
      level = "yellow";
      reason = `Longer-horizon categories present (${softHorizon
        .map((t) => t.name)
        .join(", ")}). Spell a near-term mechanism so timing stays honest.`;
    } else if (softHorizon.length && pilotRe.test(text)) {
      level = "green";
      reason = `Pilot-honest framing looks compatible with ${year}.`;
    }
  }

  const names = techs.map((t) => t.name).join(", ") || "empty stack";
  return {
    source: "local",
    message: `Timing assess (${year}): **${level}** — ${reason}\n\nStack: ${names}. Categories are never locked; only claims are judged.`,
    timing: { level, reason },
    proposals: base,
    teaching: [],
  };
}

const NAME_SEEDS = [
  ["Aether", "Lattice", "Harbor", "Pulse", "Nimbus", "Root", "Forge", "Loom", "Reef", "Kin"],
  ["Weave", "Shield", "Orbit", "Vein", "Chorus", "Anchor", "Garden", "Mirror", "Relay", "Crest"],
];

function pick(arr, salt = 0) {
  if (!arr.length) return null;
  return arr[Math.abs(salt) % arr.length];
}

function techMap(context) {
  const map = new Map();
  for (const t of context.availableTechs || []) map.set(t.id, t);
  return map;
}

function resolveStack(context, targetCount = 4) {
  const selected = new Set(context.selectedTechIds || []);
  const recommended = context.challenge?.recommended || [];
  const available = (context.availableTechs || []).map((t) => t.id);
  const availSet = new Set(available);

  const stack = [...selected].filter((id) => availSet.has(id));
  for (const id of recommended) {
    if (stack.length >= targetCount) break;
    if (availSet.has(id) && !stack.includes(id)) stack.push(id);
  }
  for (const id of available) {
    if (stack.length >= targetCount) break;
    if (!stack.includes(id)) stack.push(id);
  }
  return stack.slice(0, Math.max(targetCount, stack.length));
}

function inventName(context, stack) {
  if (context.inventionName?.trim()) return context.inventionName.trim();
  const title = context.challenge?.title || "Future";
  const word = title.split(/\s+/).find((w) => w.length > 4) || "Nova";
  const salt = (stack.join("").length + title.length) % 10;
  return `${pick(NAME_SEEDS[0], salt)}${pick(NAME_SEEDS[1], salt + 3)}`;
}

function draftHow(context, stack, map) {
  if (context.inventionHow?.trim() && context.inventionHow.trim().length > 40) {
    return context.inventionHow.trim();
  }
  const names = stack.map((id) => map.get(id)?.name || id);
  const challenge = context.challenge?.prompt || context.challenge?.problem || "the challenge";
  const parts = stack.slice(0, 5).map((id, i) => {
    const t = map.get(id);
    const role =
      i === 0
        ? "senses and models the situation"
        : i === 1
          ? "decides and coordinates responses"
          : i === 2
            ? "acts in the physical world"
            : "extends resilience and reach";
    return `${t?.name || id} ${role}${t?.summary ? ` (${t.summary.replace(/\.$/, "")})` : ""}`;
  });
  return (
    `A coordinated system aimed at: ${challenge}\n\n` +
    `Core loop: ${parts.join("; ")}. ` +
    `Together they form a cycle of sense → decide → act → learn. ` +
    `Humans set goals and ethics; the stack handles scale and speed. ` +
    `Key technologies: ${names.join(", ")}.`
  );
}

function draftImpact(context, stack, map) {
  if (context.inventionImpact?.trim() && context.inventionImpact.trim().length > 40) {
    return context.inventionImpact.trim();
  }
  const title = context.challenge?.title || "this problem";
  const techs = stack
    .slice(0, 3)
    .map((id) => map.get(id)?.name)
    .filter(Boolean)
    .join(", ");
  return (
    `On an ordinary Tuesday, people notice ${title.toLowerCase()} less as a crisis and more as a managed rhythm. ` +
    `${techs || "The stack"} fades into infrastructure: quieter streets or clinics, clearer air or lessons, fewer impossible tradeoffs. ` +
    `Work shifts from firefighting to stewardship. Not everyone benefits equally at first — the invention must be designed so access is a feature, not an afterthought. ` +
    `Children grow up assuming this capability is normal; grandparents remember when it was not.`
  );
}

function teachingFor(stack, map, limit = 3) {
  return stack.slice(0, limit).map((id) => {
    const t = map.get(id);
    return {
      techId: id,
      blurb: t?.summary || "An emerging capability worth understanding deeply.",
    };
  });
}

function localCoInvent({ mode, messages, context }) {
  const map = techMap(context);
  const selected = context.selectedTechIds || [];
  const stack = resolveStack(context, mode === "push-further" ? 6 : 4);
  const toAdd = stack.filter((id) => !selected.includes(id));
  const challengeTitle = context.challenge?.title || "your challenge";
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === "user")?.content || "";

  const base = {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };

  if (mode === "complete-picture") {
    const face = context.storyFace === "life" ? "life" : "how";
    const how = draftHow(context, selected.length ? selected : stack, map);
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    if (face === "how") {
      return {
        source: "local",
        message:
          "I drafted **everyday life** from your mechanism. Edit anything that doesn't feel like this place.",
        proposals: { ...base, inventionImpact: impact },
        teaching: teachingFor(selected.length ? selected : stack, map, 2),
      };
    }
    return {
      source: "local",
      message:
        "I drafted **how it works** from the day-in-the-life you wrote. Check the mechanism against your stack.",
      proposals: { ...base, inventionHow: how },
      teaching: teachingFor(selected.length ? selected : stack, map, 2),
    };
  }

  if (mode === "pose-challenge") {
    const place = context.place || "this place";
    const name = context.inventionName || "this invention";
    const angles = ["moloch", "nature", "policy"];
    const angle = angles.includes(context.challengeAngle)
      ? context.challengeAngle
      : angles[Math.floor(Math.random() * 3)];
    const labels = {
      moloch: "Moloch",
      nature: "Mother Nature",
      policy: "Policy & money",
    };
    let speech;
    let question;
    if (angle === "nature") {
      speech = `Mother Nature, ${place}: “${name} still burns energy and makes waste. Storms and scarcity don’t care about your pitch deck.”`;
      question = "What physical limit hits first — and how does the design absorb a bad week?";
    } else if (angle === "policy") {
      speech = `Policy & money, ${place}: “Who signs? Who pays year five? If households can’t afford it, the pilot is a photo-op.”`;
      question = "Who pays — and who is priced out?";
    } else {
      speech = `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design.”`;
      question = "What stops defection when neighbors can freeride?";
    }
    return {
      source: "local",
      message: speech,
      angle,
      angleLabel: labels[angle],
      challengeSpeech: speech,
      challengeQuestion: question,
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "judge-challenge") {
    const ans = String(context.playerAnswer || lastUser || "");
    const concrete =
      ans.length >= 40 &&
      /(pay|cost|budget|sensor|fine|opt|default|energy|waste|monitor|who|when|if )/i.test(ans);
    const verdict = concrete ? (ans.length >= 80 ? "pass" : "partial") : "fail";
    return {
      source: "local",
      message:
        verdict === "fail"
          ? "Too vague — name a concrete actor, cost, or physical limit."
          : verdict === "pass"
            ? "Solid. You named a real counter-move. You may deploy."
            : "Partial credit — more specificity would help, but enough to try deploy.",
      verdict,
      lesson:
        verdict === "fail"
          ? "Challenges need mechanisms, not hopes."
          : "Good inventions survive hostile questions.",
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "coach-challenge" || mode === "draft-challenge") {
    const place = context.place || "this place";
    const name = context.inventionName || "the invention";
    const angle = context.challengeAngle || "moloch";
    const q = context.challengeQuestion || "How does it survive?";
    const techNames = (selected.length ? selected : stack)
      .slice(0, 4)
      .map((id) => map.get(id)?.name || id)
      .join(", ");
    if (mode === "coach-challenge") {
      const tips =
        angle === "nature"
          ? `• Name the physical limit (energy, corrosion, heat, waste, flood height).\n• Tie it to ${techNames || "your stack"}.\n• Say what fails first in a bad week.\n• Add a sensor, cap, or graceful degrade.`
          : angle === "policy"
            ? `• Name who must say yes in ${place}.\n• Say who pays year 1 vs year 5.\n• Name who is priced out.\n• Offer a free tier, subsidy, or phased cost.`
            : `• Name who can freeride on ${name}.\n• What they gain by defecting.\n• Make defection visible.\n• Align incentives (shared fund, default enroll, small fee/reward).`;
      return {
        source: "local",
        message:
          `Coaching for this challenge:\n\n**Question:** ${q}\n\n${tips}\n\nWrite your answer in your own words, then submit.`,
        proposals: base,
        teaching: [],
      };
    }
    const draft =
      angle === "nature"
        ? `In ${place}, the first physical failure for ${name} is overload or waste if ${techNames || "the stack"} runs without caps. We limit scale to measured budgets, add monitoring, and fail safe to a manual fallback during extremes so the system degrades instead of collapsing.`
        : angle === "policy"
          ? `In ${place}, the clinic/city signs off only if year-1 capital is grant-backed and year-5 ops are under a known line item. Households below a threshold get a free tier; others pay a small fee. That keeps legitimacy and affordability without killing the pilot.`
          : `In ${place}, freeriders would keep old habits while careful users pay. ${name} makes participation the default for covered blocks, publishes compliance, and ties a small shared fee/reward to verified use so defection is visible and costly.`;
    return {
      source: "local",
      message: "Draft answer below — edit it so it sounds like your invention, then submit.",
      draftAnswer: draft,
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "spark") {
    return {
      source: "local",
      message:
        `Let's crack **${challengeTitle}** together.\n\n` +
        `${context.challenge?.problem || ""}\n\n` +
        `A strong opening stack could weave: **${stack
          .slice(0, 3)
          .map((id) => map.get(id)?.name || id)
          .join(" + ")}**. ` +
        `That combo gives you sensing, decision, and real-world action — the skeleton of most transformative systems.\n\n` +
        `Your move: what constraint matters most — cost, equity, speed, or beauty? Or hit **Apply techs** and we'll build on them.`,
      proposals: { ...base, addTechIds: selected.length ? [] : toAdd.slice(0, 3) },
      teaching: teachingFor(stack, map, 3),
    };
  }

  if (mode === "suggest-stack") {
    return {
      source: "local",
      message:
        `Here's a coherent stack for **${challengeTitle}**:\n\n` +
        stack
          .map((id, i) => {
            const t = map.get(id);
            return `${i + 1}. **${t?.name || id}** — ${t?.summary || ""}`;
          })
          .join("\n") +
        `\n\nWhy this mix: coverage across domains beats a single shiny tool. ` +
        `Apply the techs, then tell me what feels wrong — friction is where invention lives.`,
      proposals: { ...base, addTechIds: toAdd },
      teaching: teachingFor(stack, map, 4),
    };
  }

  if (mode === "draft-name") {
    const name = inventName(context, stack);
    const alt1 = inventName({ ...context, inventionName: "" }, [...stack].reverse());
    const alt2 = inventName(
      { ...context, inventionName: "", challenge: { title: (context.challenge?.title || "") + " X" } },
      stack
    );
    return {
      source: "local",
      message:
        `Name options for your invention:\n\n` +
        `1. **${name}** (my top pick — memorable + slightly mythical)\n` +
        `2. **${alt1}**\n` +
        `3. **${alt2}**\n\n` +
        `Apply the top pick, or type your own twist in the name field.`,
      proposals: { ...base, inventionName: name },
      teaching: [],
    };
  }

  if (mode === "draft-how") {
    const how = draftHow(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message:
        `Here's a draft mechanism you can steal, remix, or fight with:\n\n` +
        how +
        `\n\nEdit it until it sounds like *your* invention. What's the one step only a human should still own?`,
      proposals: {
        ...base,
        addTechIds: selected.length ? [] : toAdd.slice(0, 4),
        inventionHow: how,
      },
      teaching: teachingFor(selected.length ? selected : stack, map, 3),
    };
  }

  if (mode === "draft-impact") {
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message:
        `A day in the future if this works:\n\n` +
        impact +
        `\n\nWhose Tuesday is still hard in this world? Design for them next.`,
      proposals: { ...base, inventionImpact: impact },
      teaching: [],
    };
  }

  if (mode === "push-further") {
    const year = context.year || 2026;
    const how = String(context.inventionHow || "").trim();
    const assess = localAssessFeasibility(context, selected, map, base);
    const extras = resolveStack(context, 6).filter((id) => !selected.includes(id));
    return {
      source: "local",
      message:
        `Timing check for **${context.inventionName || "your draft"}** in **${year}**:\n\n` +
        `• **Claim timing:** ${assess.timing?.level || "—"} — ${assess.timing?.reason || ""}\n` +
        `• **Stack size:** ${selected.length} tech(s) — one sharp tool can be enough; add more only if the problem needs it.\n` +
        (extras.length
          ? `• **Optional muscle:** ${extras
              .slice(0, 2)
              .map((id) => map.get(id)?.name || id)
              .join(" and ")} if you have a real gap.\n`
          : "") +
        `• **Failure mode:** What happens in a 3-day blackout or if only the rich can afford it?\n` +
        `• **Wait tradeoff:** Waiting improves world conditions for stretch claims but raises crisis meters — it does not unlock cards.\n\n` +
        (how.length < 40
          ? `Write more of how-it-works so we can judge claims against ${year}.`
          : `Revise claims toward pilot-honest language if timing is yellow/red, or face the challenge if green.`),
      proposals: base,
      teaching: teachingFor(selected.length ? selected : extras, map, 2),
      timing: assess.timing,
    };
  }

  if (mode === "explain-techs") {
    const focus = selected.length ? selected : (context.challenge?.recommended || stack).slice(0, 4);
    return {
      source: "local",
      message:
        `Crash course on the techs in play:\n\n` +
        focus
          .map((id) => {
            const t = map.get(id);
            return `**${t?.name || id}** (${t?.domain || "emerging"}): ${t?.summary || ""}`;
          })
          .join("\n\n") +
        `\n\nAsk me how any two of these amplify each other — or hit **Art of the possible** for milestones and use cases.`,
      proposals: base,
      teaching: teachingFor(focus, map, 4),
    };
  }

  if (mode === "art-of-the-possible") {
    return localArtOfThePossible(context, selected, stack, map, base);
  }

  if (mode === "assess-feasibility") {
    return localAssessFeasibility(context, selected, map, base);
  }

  // free chat — heuristic reply
  const lower = lastUser.toLowerCase();
  let message =
    `I'm with you on **${challengeTitle}**. ` +
    (selected.length
      ? `Your stack so far: ${selected.map((id) => map.get(id)?.name || id).join(", ")}. `
      : `You haven't locked a stack yet — try **Suggest stack** or name a technology you're curious about. `);

  if (/name|call it|title/.test(lower)) {
    const name = inventName(context, stack);
    return {
      source: "local",
      message: message + `How about **${name}**? Apply it if it sparks something.`,
      proposals: { ...base, inventionName: name },
      teaching: [],
    };
  }
  if (/how|work|mechanism|system/.test(lower)) {
    const how = draftHow(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message: message + `Here's a mechanism draft to react to:\n\n` + how,
      proposals: { ...base, inventionHow: how, addTechIds: selected.length ? [] : toAdd.slice(0, 3) },
      teaching: teachingFor(stack, map, 2),
    };
  }
  if (/future|life|impact|day|everyday|world/.test(lower)) {
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message: message + `\n\n` + impact,
      proposals: { ...base, inventionImpact: impact },
      teaching: [],
    };
  }

  const ideaTech = (context.availableTechs || []).find((t) =>
    lower.includes(t.name.toLowerCase().split(" ")[0])
  );
  if (ideaTech) {
    return {
      source: "local",
      message:
        message +
        `**${ideaTech.name}** is a strong thread: ${ideaTech.summary} ` +
        `Pair it with something from another domain so you get emergence, not a gadget.`,
      proposals: { ...base, addTechIds: selected.includes(ideaTech.id) ? [] : [ideaTech.id] },
      teaching: [{ techId: ideaTech.id, blurb: ideaTech.summary }],
    };
  }

  return {
    source: "local",
    message:
      message +
      `\n\nYou said: “${lastUser.slice(0, 200)}” — keep going. ` +
      `I can **Suggest stack**, **Draft how**, or riff on a constraint you care about (equity, energy, beauty, speed).`,
    proposals: base,
    teaching: teachingFor(stack, map, 2),
  };
}

/* —— AI path —— */

function buildUserPayload({ messages, context, mode }) {
  const available = (context?.availableTechs || []).map((t) => ({
    id: t.id,
    name: t.name,
    domain: t.domain,
    summary: t.summary,
    readyYear: t.readyYear || t.softHorizon || null,
    maturity: t.maturity || null,
    milestones: t.milestones || [],
    useCasesNow: t.useCasesNow || [],
    alwaysPickable: true,
  }));

  const modeHints = {
    chat: "Respond to the learner's latest message as co-inventor. Never say a category is locked until a year.",
    spark:
      "Ignite the session: frame the challenge, suggest 2–3 starting tech directions (as proposals.addTechIds only if they have none), and ask one great question. Do not fully invent for them. Remind categories are always pickable.",
    "suggest-stack":
      "Propose a coherent technology stack for this challenge. Explain why each piece matters. Put ids in proposals.addTechIds (and removeTechIds if swapping).",
    "draft-name":
      "Propose 2–3 invention name options in message, and put your single best pick in proposals.inventionName.",
    "draft-how":
      "Co-draft how the invention works using their current stack. Put the draft in proposals.inventionHow. Teach how the techs connect. Prefer pilot-honest near-term claims for the current year.",
    "draft-impact":
      "Co-draft everyday life in a world where this works. Put draft in proposals.inventionImpact. Make it sensory and specific.",
    "push-further":
      "Timing and fit check on CLAIMS vs year (not category locks): wait for better world conditions vs revise how-it-works. Missing capability if any. Do not force multi-domain.",
    "explain-techs":
      "Teach the currently selected technologies (or recommended ones if none).",
    "art-of-the-possible":
      "Capability literacy for selected stack (or recommended if empty) at context.year in context.place. Structure message with: recent milestones, what works NOW, use cases unlocked, near (2–5y), frontier stretch. Use maturity/milestones/useCasesNow on availableTechs as baseline; enrich carefully. Never imply a category is locked. teaching blurbs welcome. proposals usually empty.",
    "assess-feasibility":
      "Judge claim timing only. Read inventionHow/inventionImpact and selected stack vs context.year. Return top-level timing: { level: red|yellow|green, reason: one sentence }. green = near-term/pilot-honest; yellow = stretch/vague; red = frontier as routine. Selecting synbio/quantum/BCI never forces red by itself. message can briefly echo the reason. proposals empty.",
    "complete-picture":
      "Player wrote only one story face. storyFace in context is 'how' or 'life'. If storyFace=how, fill proposals.inventionImpact only (everyday life). If storyFace=life, fill proposals.inventionHow only (mechanism). Do not overwrite the face they wrote. Keep local and tied to the tech stack.",
    "pose-challenge":
      "You ARE a hostile critic of the invention. Use context.challengeAngle if set (moloch|nature|policy), else pick one. Speak in character: Moloch (coordination traps/race to the bottom), Mother Nature (physical/ecological limits), or Policy & money (buy-in and affordability). Attack the idea as if it will fail. End with ONE clear question the learner must answer. Also return top-level fields: angle, angleLabel, challengeSpeech (full attack), challengeQuestion (the one question). proposals can be empty.",
    "judge-challenge":
      "Judge the learner's answer to the challenge (context has challengeSpeech, challengeQuestion, playerAnswer, challengeAngle). Return top-level verdict: pass | partial | fail, message (feedback), lesson (one teaching sentence). Be fair: concrete mechanisms, named actors, costs, or physical limits = pass/partial. Vague hope = fail.",
    "coach-challenge":
      "The learner is stuck on the challenge step. Context has challengeAngle, challengeSpeech, challengeQuestion, invention details. Coach them: explain what this angle cares about, give 2–4 concrete hint bullets for THIS local invention (not generic theory). Do NOT write a full ready-to-submit answer unless they clearly asked to draft. Put coaching in message. Optional top-level field draftAnswer only if mode intent is draft (see draft-challenge).",
    "draft-challenge":
      "Write a solid draft answer the learner can edit and submit to the challenge. Context has challengeAngle, challengeSpeech, challengeQuestion, invention how/impact, techs, place. Draft must be specific to their invention: name actors, costs or physical limits, anti-defection or affordability moves as relevant. Put full draft in top-level draftAnswer AND a short coaching note in message. Do not auto-judge.",
  };

  // Prefer selected techs with full capability seeds for literacy modes
  const selectedIds = new Set(context?.selectedTechIds || []);
  const focusTechs = available.filter((t) => selectedIds.has(t.id));
  const payload = {
    mode: mode || "chat",
    modeInstruction: modeHints[mode] || modeHints.chat,
    challenge: context?.challenge || null,
    selectedTechIds: context?.selectedTechIds || [],
    inventionName: context?.inventionName || "",
    inventionHow: context?.inventionHow || "",
    inventionImpact: context?.inventionImpact || "",
    storyFace: context?.storyFace || null,
    writeBoth: Boolean(context?.writeBoth),
    year: context?.year || null,
    turn: context?.turn || null,
    place: context?.place || null,
    pressure: context?.pressure || null,
    stackCapability: focusTechs,
    availableTechs: available,
    conversation: (messages || []).slice(-12),
    designRule:
      "emTech categories are always pickable; feasibility timing judges claims in how-it-works vs year.",
  };

  return JSON.stringify(payload, null, 2);
}

function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeScrutinyAngle(raw) {
  if (!raw || typeof raw !== "object") return null;
  const analysis = String(raw.analysis || "").trim().slice(0, 1200);
  const safeguard = String(raw.safeguard || "").trim().slice(0, 400);
  if (!analysis && !safeguard) return null;
  return { analysis, safeguard };
}

function sanitizeScrutiny(raw) {
  if (!raw || typeof raw !== "object") return null;
  const moloch = sanitizeScrutinyAngle(raw.moloch);
  const nature = sanitizeScrutinyAngle(raw.nature);
  const policy = sanitizeScrutinyAngle(raw.policy);
  if (!moloch && !nature && !policy) return null;
  return { moloch, nature, policy };
}

function sanitizeResult(parsed, availableIds, source = "ai") {
  const ids = new Set(availableIds);
  const empty = {
    source,
    message: "I'm with you — tell me what you want to invent, or pick a quick action.",
    proposals: {
      addTechIds: [],
      removeTechIds: [],
      inventionName: null,
      inventionHow: null,
      inventionImpact: null,
      scrutiny: null,
    },
    teaching: [],
  };
  if (!parsed || typeof parsed !== "object") return empty;

  const proposals = parsed.proposals || {};
  const addTechIds = (Array.isArray(proposals.addTechIds) ? proposals.addTechIds : [])
    .map(String)
    .filter((id) => ids.has(id));
  const removeTechIds = (Array.isArray(proposals.removeTechIds) ? proposals.removeTechIds : [])
    .map(String)
    .filter((id) => ids.has(id));

  const teaching = (Array.isArray(parsed.teaching) ? parsed.teaching : [])
    .filter((t) => t && ids.has(String(t.techId)))
    .map((t) => ({ techId: String(t.techId), blurb: String(t.blurb || "").slice(0, 400) }))
    .slice(0, 6);

  const out = {
    source,
    message: String(parsed.message || empty.message).slice(0, 4000),
    proposals: {
      addTechIds,
      removeTechIds,
      inventionName:
        proposals.inventionName != null && String(proposals.inventionName).trim()
          ? String(proposals.inventionName).trim().slice(0, 80)
          : null,
      inventionHow:
        proposals.inventionHow != null && String(proposals.inventionHow).trim()
          ? String(proposals.inventionHow).trim().slice(0, 2500)
          : null,
      inventionImpact:
        proposals.inventionImpact != null && String(proposals.inventionImpact).trim()
          ? String(proposals.inventionImpact).trim().slice(0, 2500)
          : null,
      scrutiny: sanitizeScrutiny(proposals.scrutiny),
    },
    teaching,
  };

  // Challenge step fields (pose / judge)
  if (parsed.angle) out.angle = String(parsed.angle);
  if (parsed.angleLabel) out.angleLabel = String(parsed.angleLabel).slice(0, 80);
  if (parsed.challengeSpeech)
    out.challengeSpeech = String(parsed.challengeSpeech).slice(0, 3000);
  if (parsed.challengeQuestion)
    out.challengeQuestion = String(parsed.challengeQuestion).slice(0, 500);
  if (parsed.verdict) out.verdict = String(parsed.verdict).toLowerCase();
  if (parsed.lesson) out.lesson = String(parsed.lesson).slice(0, 500);
  if (parsed.draftAnswer) out.draftAnswer = String(parsed.draftAnswer).slice(0, 2500);

  // Feasibility timing (assess-feasibility mode)
  const rawTiming = parsed.timing || null;
  if (rawTiming && typeof rawTiming === "object") {
    const lvl = String(rawTiming.level || "").toLowerCase();
    if (["red", "yellow", "green"].includes(lvl)) {
      out.timing = {
        level: lvl,
        reason: String(rawTiming.reason || "").slice(0, 500),
      };
    }
  } else if (parsed.timingLevel) {
    const lvl = String(parsed.timingLevel).toLowerCase();
    if (["red", "yellow", "green"].includes(lvl)) {
      out.timing = {
        level: lvl,
        reason: String(parsed.timingNote || parsed.message || "").slice(0, 500),
      };
    }
  }

  return out;
}

async function aiCoInvent(body, client) {
  const mode = body.mode || "chat";
  const context = body.context || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const availableIds = (context.availableTechs || []).map((t) => t.id);

  const input = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Co-invention session state and conversation (JSON):\n${buildUserPayload({ messages, context, mode })}\n\n` +
        `Respond with the required JSON object only.`,
    },
  ];

  const response = await client.responses.create({
    model: MODEL,
    input,
    temperature: 0.8,
  });

  const text = response.output_text || "";
  const parsed = extractJson(text);
  if (!parsed) {
    return {
      source: "ai",
      message: text.slice(0, 2000) || "I had trouble shaping that thought — try again?",
      proposals: {
        addTechIds: [],
        removeTechIds: [],
        inventionName: null,
        inventionHow: null,
        inventionImpact: null,
      },
      teaching: [],
    };
  }
  return sanitizeResult(parsed, availableIds, "ai");
}

async function handleCoInvent(body) {
  const context = body.context || {};
  const mode = body.mode || "chat";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  let client = await getClient();
  if (!client) {
    return localCoInvent({ mode, messages, context });
  }

  try {
    return await aiCoInvent(body, client);
  } catch (e) {
    const msg = String(e?.message || e);
    console.error("[co-invent ai]", msg.slice(0, 200));

    // One retry with forced SuperGrok token refresh
    if (/incorrect api key|invalid.*key|401|unauthorized|expired/i.test(msg)) {
      try {
        client = await getClient({ forceRefresh: true });
        if (client) return await aiCoInvent(body, client);
      } catch (e2) {
        console.error("[co-invent retry]", String(e2?.message || e2).slice(0, 200));
      }
    }

    const local = localCoInvent({ mode, messages, context });
    local.message =
      `*(Co-inventor temporarily offline; local partner here.)*\n\n` + local.message;
    return local;
  }
}

/* —— Future vision (Imagine) —— */

const IMAGE_MODEL = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";
const visionSessions = new Map(); // sessionId -> { fingerprint, dataUrl, prompt, stageId }

const THEME_SCENES = {
  "coastal-city":
    "a coastal megacity skyline at the waterfront, dense towers meeting the sea, embankments and ports",
  "food-city":
    "a dense modern city with farmland at its edge and markets in the streets, food systems visible in the landscape",
  "care-city":
    "a calm residential city district with clinics, parks, and multi-generational public spaces",
  "energy-city":
    "an industrial-meets-urban skyline with power infrastructure, substations, and distant generation plants",
  "learn-city":
    "a campus-city hybrid with schools, libraries, plazas, and students moving between buildings",
  "ocean-city":
    "a harbor and open ocean horizon with ships, piers, and the living sea as the main character",
  "social-city":
    "intimate city streets and gathering places — cafes, parks, transit hubs where people meet",
  "rebuild-city":
    "a city district recovering after shock — mixed damaged and renewed structures, temporary and permanent builds",
};

const STAGE_LOOK = {
  present:
    "Present day, realistic documentary photography. Weathered infrastructure, ordinary life, the problem visible but not apocalyptic. Muted cool color grade, overcast or late-day light.",
  prototype:
    "Near-future early prototypes appearing in the same place. A few experimental installations, soft tech glows, scaffolding of change. Still mostly today's world with hopeful interventions.",
  transition:
    "Transition-era city: new systems at scale, transformed streets and infrastructure, cleaner light, integrated technology in architecture and public space. Optimistic but grounded speculative realism.",
  transformed:
    "Fully transformed civilization-scale future of this place. Harmonious advanced systems, luminous civic design, nature and technology woven together. Cinematic hopeful sci-fi realism, same camera viewpoint.",
};

function clipText(s, max = 600) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function visionFingerprint(body) {
  const techIds = (body.techs || []).map((t) => t.id || t.name).sort().join(",");
  const stage = body.stage?.id || "present";
  const theme = body.challenge?.visionTheme || "";
  const name = (body.inventionName || "").trim().toLowerCase();
  const how = clipText(body.inventionHow, 400).toLowerCase();
  const life = clipText(body.inventionImpact, 400).toLowerCase();
  const year = body.year || "";
  const place = clipText(body.place, 80).toLowerCase();
  const pressure = body.pressure
    ? Object.entries(body.pressure)
        .map(([k, v]) => `${k}:${v}`)
        .join(",")
    : "";
  return `${theme}|${stage}|${year}|${place}|${pressure}|${techIds}|${name}|${how}|${life}`;
}

function buildVisionPrompt(body, { isEdit }) {
  const theme = body.challenge?.visionTheme || "coastal-city";
  const place = THEME_SCENES[theme] || THEME_SCENES["coastal-city"];
  const stageId = body.stage?.id || "present";
  const stageLook = STAGE_LOOK[stageId] || STAGE_LOOK.present;
  const challengeTitle = body.challenge?.title || "a future city";
  const problem = body.challenge?.problem || "";
  const invention = (body.inventionName || "").trim();
  const how = clipText(body.inventionHow, 700);
  const everyday = clipText(body.inventionImpact, 700);
  const risk = clipText(body.inventionRisk, 280);
  const year = body.year || null;
  const localPlace = clipText(body.place, 120);
  const pressure = body.pressure
    ? Object.entries(body.pressure)
        .map(([k, v]) => `${k} ${v}/5`)
        .join(", ")
    : "";
  const techs = body.techs || [];

  const techLines = techs
    .slice(0, 8)
    .map((t) => {
      const bit = t.narrative || t.summary || "";
      return `- ${t.name}: ${bit}`.slice(0, 180);
    })
    .join("\n");

  const style =
    "Single cohesive wide cinematic still (not a collage, not a UI mockup, no text overlays, no watermarks, no logos, no readable signage). Photorealistic speculative architecture concept art, 16:9 composition, consistent camera angle.";

  const strain =
    pressure &&
    (Object.values(body.pressure || {}).some((v) => v >= 3)
      ? "Visible strain from the crisis (subtle, human-scale — not apocalypse porn)."
      : "Early stress signs from the local crisis, still a lived-in place.");

  const learnerBlock = [
    how
      ? `How the invention works (show this mechanism in the environment and tools people use):\n${how}`
      : "",
    everyday
      ? `Everyday life if it works (people, streets, work, care):\n${everyday}`
      : "",
    risk
      ? `Subtle risk atmosphere only (not disaster porn): ${risk}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const localeLine = localPlace
    ? `Specific locale: ${localPlace}${year ? `, year ${year}` : ""}. Keep this same place recognizable.`
    : `Locale type: ${place}.`;

  if (!isEdit) {
    return (
      `${style}\n\n` +
      `${localeLine}\n` +
      `Mission: "${challengeTitle}". ${problem}\n\n` +
      `Era look: ${stageLook}\n` +
      (pressure ? `Crisis pressure meters: ${pressure}. ${strain}\n\n` : "\n") +
      (invention ? `Invention name: "${invention}".\n\n` : "") +
      (learnerBlock
        ? `LEARNER VISION (highest priority — depict concretely):\n${learnerBlock}\n\n`
        : "") +
      (techs.length
        ? `Emerging technologies as believable local infrastructure:\n${techLines}\n\n`
        : `Ordinary infrastructure and daily life before the fix.\n\n`) +
      `Mood: serious hope, human-scale figures, atmospheric depth. Local and specific over generic futurism.`
    );
  }

  return (
    `Edit this image into the same place at a later moment. Keep camera viewpoint and landmarks.\n\n` +
    `${localeLine}\n` +
    `Evolve toward: ${stageLook}\n` +
    `Mission: ${challengeTitle}. ${problem}\n` +
    (pressure ? `Pressure now: ${pressure}. ${strain}\n\n` : "\n") +
    (invention ? `Invention: "${invention}".\n\n` : "") +
    (learnerBlock
      ? `LEARNER VISION (highest priority):\n${learnerBlock}\n\n`
      : "") +
    (techs.length ? `Technologies to show:\n${techLines}\n\n` : "") +
    `Gradual change, photorealistic, no text/UI. Prefer learner description over generic sci-fi.`
  );
}

async function xaiImageRequest(path, payload, { forceRefresh = false } = {}) {
  let token = await resolveAccessToken({ forceRefresh });
  if (!token) throw Object.assign(new Error("Not signed in to SuperGrok"), { status: 503 });

  const doFetch = async (tok) =>
    fetch(`${XAI_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

  let res = await doFetch(token);
  if (res.status === 401 || res.status === 403) {
    token = await resolveAccessToken({ forceRefresh: true });
    if (!token) throw Object.assign(new Error("SuperGrok session expired"), { status: 503 });
    res = await doFetch(token);
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || text.slice(0, 200) || res.statusText;
    throw Object.assign(new Error(String(msg)), { status: res.status });
  }
  return data;
}

function extractImageDataUrl(data) {
  const item = data?.data?.[0] || data;
  if (item?.b64_json) {
    return `data:image/jpeg;base64,${item.b64_json}`;
  }
  if (item?.url) return item.url;
  if (data?.url) return data.url;
  return null;
}

async function handleVision(body) {
  const sessionId = String(body.sessionId || "default").slice(0, 80);
  const fingerprint = visionFingerprint(body);
  const force = Boolean(body.force);
  const prev = visionSessions.get(sessionId);

  if (!force && prev?.fingerprint === fingerprint && prev.dataUrl) {
    return {
      ok: true,
      cached: true,
      imageUrl: prev.dataUrl,
      prompt: prev.prompt,
      stageId: body.stage?.id || "present",
      model: IMAGE_MODEL,
      mode: prev.mode || "generate",
    };
  }

  const techs = body.techs || [];
  const stageId = body.stage?.id || "present";
  const canEdit = Boolean(prev?.dataUrl?.startsWith("data:")) && techs.length > 0 && stageId !== "present";
  const isEdit = canEdit && !force;
  const prompt = buildVisionPrompt(body, { isEdit });

  let data;
  let mode;
  if (isEdit) {
    mode = "edit";
    data = await xaiImageRequest("/images/edits", {
      model: IMAGE_MODEL,
      prompt,
      image: {
        url: prev.dataUrl,
        type: "image_url",
      },
      response_format: "b64_json",
      aspect_ratio: "16:9",
    });
  } else {
    mode = "generate";
    data = await xaiImageRequest("/images/generations", {
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      response_format: "b64_json",
      aspect_ratio: "16:9",
    });
  }

  let imageUrl = extractImageDataUrl(data);
  if (!imageUrl) {
    throw new Error("Image API returned no image data");
  }

  // Normalize remote URLs into data URLs so edit chains stay stable
  if (imageUrl.startsWith("http")) {
    try {
      const imgRes = await fetch(imageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const mime = imgRes.headers.get("content-type") || "image/jpeg";
      imageUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // keep remote URL if download fails
    }
  }

  visionSessions.set(sessionId, {
    fingerprint,
    dataUrl: imageUrl,
    prompt,
    stageId,
    mode,
    updatedAt: Date.now(),
  });

  // Bound memory: drop oldest if too many sessions
  if (visionSessions.size > 40) {
    const oldest = [...visionSessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
    if (oldest) visionSessions.delete(oldest[0]);
  }

  return {
    ok: true,
    cached: false,
    imageUrl,
    prompt,
    stageId,
    model: IMAGE_MODEL,
    mode,
  };
}

/* —— HTTP —— */

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 4_000_000) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(ROOT, cleaned);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function serveStatic(req, res) {
  let urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = safePath(urlPath);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "GET" && req.url?.startsWith("/api/health")) {
    // Probe auth without blocking on refresh unless needed
    let ai = false;
    try {
      const token = await resolveAccessToken();
      ai = Boolean(token);
    } catch {
      ai = false;
    }
    return sendJson(res, 200, {
      ok: true,
      coInventor: true,
      vision: ai,
      ai,
      auth: authInfo.source,
      model: MODEL,
      imageModel: IMAGE_MODEL,
    });
  }

  if (req.method === "POST" && req.url?.startsWith("/api/vision")) {
    try {
      const body = await readBody(req);
      const result = await handleVision(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[vision]", e.message || e);
      const status = e.status || 500;
      return sendJson(res, status, {
        ok: false,
        error: e.message || "Vision generation failed",
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/co-invent")) {
    try {
      const body = await readBody(req);
      const result = await handleCoInvent(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[co-invent]", e.message || e);
      const status = e.status || 500;
      return sendJson(res, status, {
        error: e.message || "Co-inventor failed",
        source: "error",
        message: "The co-inventor hit a snag. Try again in a moment.",
        proposals: {
          addTechIds: [],
          removeTechIds: [],
          inventionName: null,
          inventionHow: null,
          inventionImpact: null,
        },
        teaching: [],
      });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, async () => {
  console.log(`Future Forge → http://127.0.0.1:${PORT}`);
  try {
    const token = await resolveAccessToken();
    if (token && authInfo.source === "supergrok") {
      console.log(
        `Co-inventor: SuperGrok session${authInfo.email ? ` (${authInfo.email})` : ""} · model ${MODEL}`
      );
    } else if (token) {
      console.log(`Co-inventor: API key auth · model ${MODEL}`);
    } else {
      console.log("Co-inventor: local only — run `grok login` for SuperGrok");
    }
  } catch (e) {
    console.log("Co-inventor: local only —", e.message);
  }
});
