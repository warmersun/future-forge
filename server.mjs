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
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import {
  localScenariosForGlobal,
  globalById,
  allTechIds,
  VISION_THEME_IDS,
  GAME,
} from "./js/data.js";
import {
  buildWorldCard,
  resolveShot,
  composeGeneratePrompt,
  composeEditPrompt,
  assertCleanImagePrompt,
  visionFingerprint,
  shotNarrativeKey,
  clipText as visionClip,
} from "./js/vision-prompt.mjs";
import { RoomManager } from "./js/rooms/room-manager.mjs";

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
/** Bind all interfaces so LAN friends can connect (firewall still blocks WAN). */
const HOST = process.env.HOST || "0.0.0.0";
const MODEL = process.env.XAI_MODEL || "grok-4.5";
/** Friends co-op rooms (PR9). Default on; set ENABLE_ROOMS=0 to disable. */
const ROOMS_ENABLED = process.env.ENABLE_ROOMS !== "0";
/** Filled after handleCoInvent is defined (see bottom rooms wire). */
const roomManager = ROOMS_ENABLED ? new RoomManager() : null;

/**
 * Private LAN IPv4 addresses for "join from another computer" display.
 * Skips loopback and public/routable interfaces — local network only.
 * @returns {string[]}
 */
function listLanIpv4() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets || {})) {
    for (const net of list || []) {
      if (!net || net.internal) continue;
      // Node may use family 4 or "IPv4"
      const fam = net.family;
      if (fam !== "IPv4" && fam !== 4) continue;
      const ip = String(net.address || "");
      if (!ip || ip.startsWith("127.")) continue;
      // RFC1918 private only (not meant for Internet exposure)
      const priv =
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
      if (!priv) continue;
      if (!out.includes(ip)) out.push(ip);
    }
  }
  return out;
}

function lanJoinUrls() {
  return listLanIpv4().map((ip) => `http://${ip}:${PORT}`);
}

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
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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
- When mode is generate-scenarios: invent MULTIPLE distinct local mission scenarios for context.globalTheme. Return top-level scenarios array (not just one). Concrete places, different angles, valid tech ids only.
- When mode is complete-picture: the player wrote ONLY one face (how OR everyday life). Fill the OTHER face only in proposals (inventionHow XOR inventionImpact). Stay local, match the stack, complementary not contradictory. If context.contributingToOther is true, the draft must ADD to their invent without gutting or contradicting what they already wrote.
- When mode is judge-contribution: decide if afterText is an ADDITIVE contribution to beforeText on context.field (inventionHow|inventionImpact|inventionName). Additive = keeps original substance and layers detail/extension. Destructive = rewrites, clears, or removes core meaning. Return top-level additive: true|false and reason: one sentence. Be fair but protect the original author's voice.
- When mode is scrutinize: stress-test the idea from FOUR angles (see below). Put results in proposals.scrutiny.
- Tone: vivid, concise, hopeful, practical.

Scrutiny / challenge angles (plain language, local, specific):
1. moloch — System game mechanics: multipolar traps, freeriding, Goodhart’s law, race-to-the-bottom. Safeguard = coordination fix.
2. ethicist — Ethical dilemmas with no clean good/bad answer: dignity, bias, dual-use, who is harmed at scale. Safeguard = a hard constraint you refuse to cross.
3. stakeholder — City officials and community leaders: funding, permits, policy, public support. Safeguard = financing or legitimacy move.
4. nature — Mother Nature / natural world: energy, materials, ecology, disease, storms. Safeguard = design limit or monitoring.

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
  "ethicist": { "analysis": "...", "safeguard": "..." },
  "stakeholder": { "analysis": "...", "safeguard": "..." },
  "nature": { "analysis": "...", "safeguard": "..." }
}

Use null or [] when empty. For complete-picture fill only the missing face. For scrutinize fill scrutiny and keep techs unless asked.`;

/** Compact system prompt for challenge pose — keeps TTFT low vs full co-inventor prompt. */
const POSE_CHALLENGE_SYSTEM = `You are a hostile critic in Future Forge (local invention game).
Speak ONLY as the fixed challengeAngle: moloch (system traps/freeriding), ethicist (hard tradeoffs), stakeholder (funding/permits/public), or nature (physical/ecological limits).
Attack THIS invention in THIS place with 2–4 vivid sentences. End with ONE sharp question.
Return JSON only (no markdown):
{"angle":"<same as challengeAngle>","angleLabel":"<name>","challengeSpeech":"<2-4 sentences>","challengeQuestion":"<one question>","message":"","proposals":{"addTechIds":[],"removeTechIds":[],"inventionName":null,"inventionHow":null,"inventionImpact":null,"scrutiny":null},"teaching":[]}
Stay local and specific. No UN resolutions. No tabletop jargon.`;

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

function localGenerateScenarios(context, base) {
  const theme = context.globalTheme || {};
  const globalId = theme.id || "climate";
  const g = globalById(globalId) || {
    id: globalId,
    title: theme.title || "Global problem",
    blurb: theme.blurb || "",
    kind: theme.kind || "now",
  };
  const count = Math.min(6, Math.max(3, Number(context.scenarioCount) || 4));
  const salt = context.forceRegen ? Date.now() % 10000 : 0;
  const scenarios = localScenariosForGlobal(g, { count, salt });
  return {
    source: "local",
    message: `Here are ${scenarios.length} Quests for **${g.title}**. Pick one to invent for.`,
    scenarios,
    proposals: base,
    teaching: [],
  };
}

function sanitizeScenarioList(rawList, context, techIds) {
  const theme = context?.globalTheme || {};
  const globalId = theme.id || "climate";
  const validTech = new Set(techIds?.length ? techIds : allTechIds());
  const visionOk = new Set(VISION_THEME_IDS);
  const seeds = Array.isArray(context?.seedMissions) ? context.seedMissions : [];
  const list = Array.isArray(rawList) ? rawList : [];
  const out = [];
  const seen = new Set();

  const pushOne = (raw, sourceHint) => {
    if (!raw || typeof raw !== "object") return;
    const place = String(raw.place || "").trim().slice(0, 80);
    const title = String(raw.title || "").trim().slice(0, 100);
    if (!place && !title) return;
    const key = (place || title).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    let pressure = {};
    if (raw.pressure && typeof raw.pressure === "object") {
      for (const [k, v] of Object.entries(raw.pressure).slice(0, 4)) {
        pressure[String(k).slice(0, 24)] = Math.min(5, Math.max(0, Number(v) || 2));
      }
    }
    if (!Object.keys(pressure).length) pressure = { Pressure: 2, Capacity: 2, Trust: 1 };
    const keys = Object.keys(pressure);
    const pressureRise = {};
    const winMax = {};
    keys.forEach((k, i) => {
      pressureRise[k] =
        raw.pressureRise && raw.pressureRise[k] != null
          ? Math.min(2, Math.max(0, Number(raw.pressureRise[k]) || 1))
          : i === keys.length - 1
            ? 0
            : 1;
      winMax[k] =
        raw.winMax && raw.winMax[k] != null
          ? Math.min(3, Math.max(0, Number(raw.winMax[k]) ?? 1))
          : 1;
    });
    const suggested = (Array.isArray(raw.suggested) ? raw.suggested : [])
      .map(String)
      .filter((id) => validTech.has(id))
      .slice(0, 8);
    const visionTheme = visionOk.has(String(raw.visionTheme))
      ? String(raw.visionTheme)
      : "rebuild-city";
    const id =
      String(raw.id || "").trim() ||
      `gen-${globalId}-${out.length}-${Math.random().toString(36).slice(2, 7)}`;
    out.push({
      id,
      globalId,
      title: title || `Challenge in ${place}`,
      place: place || "Local place",
      startYear: Number(raw.startYear) || GAME.startYear,
      collapseYear: Number(raw.collapseYear) || GAME.startYear + 8,
      yearsPerTurn: Number(raw.yearsPerTurn) || GAME.yearsPerTurn,
      pressure,
      pressureRise,
      winMax,
      scene: String(raw.scene || "").trim().slice(0, 800),
      stakeholder: String(raw.stakeholder || "").trim().slice(0, 120),
      suggested: suggested.length ? suggested : ["ai", "iot", "networks"],
      visionTheme,
      source: sourceHint || (raw.source === "curated" ? "curated" : "generated"),
    });
  };

  // Prefer curated seeds first (unless force full regen without seeds)
  if (!context?.forceRegen || seeds.length) {
    for (const s of seeds) pushOne({ ...s, source: "curated" }, "curated");
  }
  for (const s of list) pushOne(s, "generated");

  const target = Math.min(6, Math.max(3, Number(context?.scenarioCount) || 4));
  if (out.length < target) {
    const g = globalById(globalId) || {
      id: globalId,
      title: theme.title || "Global problem",
      blurb: theme.blurb || "",
      kind: theme.kind || "now",
    };
    const fill = localScenariosForGlobal(g, {
      count: target,
      salt: context?.forceRegen ? Date.now() % 10000 : 3,
    });
    for (const s of fill) {
      pushOne(s, s.source || "generated");
      if (out.length >= target) break;
    }
  }
  return out.slice(0, target);
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

  if (mode === "judge-contribution") {
    // Lenient local fallback — prefer accept; only block clear gutting/clearing.
    const before = String(context.beforeText || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const after = String(context.afterText || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    let additive = true;
    let reason = "Keeps original substance and extends it.";
    if (!before || before.length < 12) {
      reason = "Original was empty or stub — addition allowed.";
    } else if (!after) {
      additive = false;
      reason = "Cleared the text — destructive.";
    } else if (after.length < before.length * 0.55) {
      additive = false;
      reason = "Shortened the original too much.";
    } else {
      const bWords = [...new Set(before.split(/\s+/).filter((w) => w.length > 3))];
      const aSet = new Set(after.split(/\s+/));
      let kept = 0;
      for (const w of bWords) if (aSet.has(w)) kept++;
      const retention = bWords.length ? kept / bWords.length : 1;
      // Soft: only reject when most substance gone AND not a longer rewrite
      if (retention < 0.35 && after.length < before.length * 1.15) {
        additive = false;
        reason = `Removed too much original wording (${Math.round(retention * 100)}% kept).`;
      } else {
        reason = "Keeps enough of the original and extends it.";
      }
    }
    return {
      source: "local",
      additive,
      reason,
      message: additive ? `Additive: ${reason}` : `Destructive: ${reason}`,
      proposals: { ...base },
      teaching: [],
    };
  }

  if (mode === "pose-challenge") {
    const place = context.place || "this place";
    const name = context.inventionName || "this invention";
    const angles = ["moloch", "ethicist", "stakeholder", "nature"];
    const angle = angles.includes(context.challengeAngle)
      ? context.challengeAngle
      : angles[Math.floor(Math.random() * angles.length)];
    const labels = {
      moloch: "Moloch",
      ethicist: "Ethicist",
      stakeholder: "Stakeholder",
      nature: "Mother Nature",
    };
    let speech;
    let question;
    if (angle === "nature") {
      speech = `Mother Nature, ${place}: “${name} still burns energy and makes waste. Storms and scarcity do not care about your pitch deck.”`;
      question = "What physical limit hits first — and how does the design absorb a bad week?";
    } else if (angle === "ethicist") {
      speech = `The Ethicist, ${place}: “${name} forces a choice you cannot optimize away. Someone’s dignity or opportunity is on the line — and both sides have a point.”`;
      question = "Name the hardest ethical tradeoff. Who is harmed either way — and what constraint do you refuse to cross?";
    } else if (angle === "stakeholder") {
      speech = `The Stakeholder, ${place}: “I am the mayor, the clinic board, and the neighborhood meeting. Someone must sign, fund, and defend ${name} in public.”`;
      question = "Who must say yes, who pays year 1 and year 5, and how do you win public support without pricing people out?";
    } else {
      speech = `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design — that is how the system plays.”`;
      question = "What stops defection when neighbors can freeride — name the game mechanic you change?";
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

  if (mode === "judge-scrutiny-move") {
    const ans = String(context.playerAnswer || lastUser || "");
    const concrete =
      /\b(who|pay|cost|meter|limit|permit|default|fee|cap|monitor|opt[- ]in|human|review|budget|year)\b/i.test(
        ans
      );
    const long = ans.trim().length >= 80;
    let quality = "miss";
    if (ans.trim().length < 20) quality = "miss";
    else if (concrete && long) quality = "hit";
    else if (concrete || long) quality = "glance";
    const damage = quality === "hit" ? 2 : quality === "glance" ? 1 : 0;
    const messages = {
      hit: "That names a real mechanism — the challenge takes a solid hit.",
      glance: "Some substance — not enough to end the attack.",
      miss: "Too vague for this critic — try actors, costs, or hard limits.",
    };
    return {
      source: "local",
      quality,
      damage,
      message: messages[quality],
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
          : angle === "ethicist"
            ? `• Name the values in tension (privacy vs safety, speed vs consent, inclusion vs cost).\n• Say who is harmed on each horn of the dilemma.\n• State one hard line you will not cross.\n• Show how ${techNames || "your stack"} is constrained by that line.`
            : angle === "stakeholder"
              ? `• Name who must say yes in ${place} (official, board, neighbors).\n• Say who pays year 1 vs year 5.\n• Name who is priced out or loses status.\n• Offer a permit path, free tier, subsidy, or public forum move.`
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
        : angle === "ethicist"
          ? `In ${place}, ${name} creates a real ethical tension around who is surveilled or left out when ${techNames || "the stack"} scales. We refuse one hard line (no coercive enrollment / no sale of identifiable data without consent), publish that rule, and keep a human review path so the dilemma is governed rather than ignored.`
          : angle === "stakeholder"
            ? `In ${place}, the clinic or city signs off only if year-1 capital is grant-backed and year-5 ops sit under a known line item. Households below a threshold get a free tier; a public briefing and simple permit checklist build legitimacy without killing the pilot.`
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

  if (mode === "generate-scenarios") {
    return localGenerateScenarios(context, base);
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
  // Pose/judge: only selected stack summaries — full catalog is huge and slows the model.
  const slimChallenge =
    mode === "pose-challenge" ||
    mode === "judge-scrutiny-move" ||
    mode === "judge-challenge" ||
    mode === "coach-challenge" ||
    mode === "draft-challenge";
  const available = (context?.availableTechs || []).map((t) => {
    const base = {
      id: t.id,
      name: t.name,
      domain: t.domain,
      summary: t.summary,
      readyYear: t.readyYear || t.softHorizon || null,
    };
    if (slimChallenge) return base;
    return {
      ...base,
      maturity: t.maturity || null,
      milestones: t.milestones || [],
      useCasesNow: t.useCasesNow || [],
      alwaysPickable: true,
    };
  });

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
      "Player wrote only one story face. storyFace in context is 'how' or 'life'. If storyFace=how, fill proposals.inventionImpact only (everyday life). If storyFace=life, fill proposals.inventionHow only (mechanism). Do not overwrite the face they wrote. Keep local and tied to the tech stack. If context.contributingToOther, extend their invent additively — never replace their core idea.",
    "judge-contribution":
      "Multiplayer contribution check. Context has field, beforeText, afterText (and optional full invent). Decide if afterText is ADDITIVE vs DESTRUCTIVE relative to beforeText. Additive keeps original actors/mechanisms/intent and adds detail; destructive rewrites, clears, or strips core meaning. Return JSON with top-level additive (boolean) and reason (one sentence). message may echo the reason. proposals empty.",
    "pose-challenge":
      "Speak ONLY as context.challengeAngle (moloch|ethicist|stakeholder|nature). Attack this invent in 2–4 sentences; one question. Return angle, angleLabel, challengeSpeech, challengeQuestion. Keep speech under ~120 words.",
    "judge-scrutiny-move":
      "The learner Argues against a fixed challenger (context.challengeAngle, challengeSpeech, challengeQuestion, playerAnswer). Score their argument as quality: hit | glance | miss. hit = concrete actors/costs/limits/mechanics that answer the question; glance = partial substance; miss = vague hope or off-topic. Return top-level: quality, message (1-2 sentences feedback), damage (hit=2, glance=1, miss=0). Be fair but strict on freeriding and handwaving.",
    "judge-challenge":
      "Judge the learner's answer to the challenge (context has challengeSpeech, challengeQuestion, playerAnswer, challengeAngle). Return top-level verdict: pass | partial | fail, message (feedback), lesson (one teaching sentence). Be fair: concrete mechanisms, named actors, costs, or physical limits = pass/partial. Vague hope = fail.",
    "coach-challenge":
      "The learner is stuck on the challenge step. Context has challengeAngle, challengeSpeech, challengeQuestion, invention details. Coach them: explain what this angle cares about, give 2–4 concrete hint bullets for THIS local invention (not generic theory). Do NOT write a full ready-to-submit answer unless they clearly asked to draft. Put coaching in message. Optional top-level field draftAnswer only if mode intent is draft (see draft-challenge).",
    "draft-challenge":
      "Write a solid draft answer the learner can edit and submit to the challenge. Context has challengeAngle, challengeSpeech, challengeQuestion, invention how/impact, techs, place. Draft must be specific to their invention: name actors, costs or physical limits, anti-defection or affordability moves as relevant. Put full draft in top-level draftAnswer AND a short coaching note in message. Do not auto-judge.",
    "generate-scenarios":
      "Generate MULTIPLE distinct local Quests (crisis episodes) for context.globalTheme (a global problem). Return top-level scenarios: an array of 4 objects (or context.scenarioCount) — wire field name stays 'scenarios' for compatibility. Each Quest MUST be a concrete place living a piece of the global problem — different geographies, stakeholders, and angles (not renames of the same story). Each scene (2–4 vivid sentences) MUST include BOTH (1) lived local harm people feel now AND (2) a local driver/system that keeps producing the theme problem — not only how people shelter from symptoms (e.g. air pollution: name trucks/cookfuel/stacks, not only indoor filters). Include seedMissions as curated baselines if provided, then invent NEW ones that do not duplicate them. Each object fields: id (slug), title, place, scene, stakeholder, startYear (2026), collapseYear (2032–2036), yearsPerTurn (2), pressure (exactly 3 meters, values 0–5), pressureRise, winMax, suggested (array of tech ids from availableTechs only — mix protection and abatement when relevant), visionTheme (one of: coastal-city, food-city, care-city, energy-city, learn-city, rebuild-city, social-city, ocean-city), source ('curated' or 'generated'). CRITICAL — pressure meter KEYS are player-facing HUD labels: plain English, 1–3 words, Title Case with spaces (e.g. \"Dirty air\", \"Sick days\", \"Truck exhaust\", \"Cook smoke\", \"Flooding\", \"Jobs\"). NEVER camelCase, NEVER internal ids, NEVER jargon or opaque acronyms (bad: AlleyPM, BenzeneSpikes, GensetHours, StackUpsets, NosebleedNights, CorridorPM). Prefer one felt-harm meter, one cause/driver meter, one social/constraint meter. message: one short line inviting the learner to pick a Quest. proposals empty. Also follow context.guidance when present.",
  };

  // Prefer selected techs with full capability seeds for literacy modes
  const selectedIds = new Set(context?.selectedTechIds || []);
  const focusTechs = available.filter((t) => selectedIds.has(t.id));

  // Fast path: minimal JSON for challenge pose (biggest latency win)
  if (mode === "pose-challenge") {
    const posePayload = {
      mode: "pose-challenge",
      modeInstruction: modeHints["pose-challenge"],
      challengeAngle: context?.challengeAngle || null,
      place: context?.place || null,
      year: context?.year || null,
      inventionName: context?.inventionName || "",
      inventionHow: String(context?.inventionHow || "").slice(0, 1200),
      inventionImpact: String(context?.inventionImpact || "").slice(0, 800),
      selectedTechIds: context?.selectedTechIds || [],
      stack: focusTechs.length ? focusTechs : available.slice(0, 6),
      mission: context?.challenge
        ? {
            title: context.challenge.title || null,
            scene: String(context.challenge.problem || context.challenge.scene || "").slice(
              0,
              600
            ),
          }
        : null,
    };
    return JSON.stringify(posePayload);
  }

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
    globalTheme: context?.globalTheme || null,
    scenarioCount: context?.scenarioCount || 4,
    seedMissions: context?.seedMissions || [],
    forceRegen: Boolean(context?.forceRegen),
    guidance: context?.guidance || null,
    depthCharacter: context?.depthCharacter || null,
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
  const ethicist = sanitizeScrutinyAngle(raw.ethicist);
  const stakeholder = sanitizeScrutinyAngle(raw.stakeholder);
  const nature = sanitizeScrutinyAngle(raw.nature);
  // legacy alias
  const policy = sanitizeScrutinyAngle(raw.policy);
  if (!moloch && !ethicist && !stakeholder && !nature && !policy) return null;
  return {
    moloch,
    ethicist,
    stakeholder: stakeholder || policy,
    nature,
  };
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
  if (parsed.quality) {
    const q = String(parsed.quality).toLowerCase();
    if (["hit", "glance", "miss"].includes(q)) out.quality = q;
  }
  if (parsed.damage != null && Number.isFinite(Number(parsed.damage))) {
    out.damage = Math.max(0, Math.min(2, Math.floor(Number(parsed.damage))));
  }

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

function sanitizeScenariosResult(parsed, context, source = "ai") {
  const techIds = (context?.availableTechs || []).map((t) => t.id);
  const scenarios = sanitizeScenarioList(
    parsed?.scenarios || parsed?.missions || [],
    context,
    techIds
  );
  return {
    source,
    message: String(
      parsed?.message ||
        `Here are ${scenarios.length} Quests. Pick one to invent for.`
    ).slice(0, 2000),
    scenarios,
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
}

async function aiCoInvent(body, client) {
  const mode = body.mode || "chat";
  const context = body.context || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const availableIds = (context.availableTechs || []).map((t) => t.id);

  const isPose = mode === "pose-challenge";
  const systemContent = isPose ? POSE_CHALLENGE_SYSTEM : SYSTEM_PROMPT;
  const userContent = isPose
    ? `Pose this challenge (JSON state):\n${buildUserPayload({ messages, context, mode })}\n\nJSON only.`
    : `Co-invention session state and conversation (JSON):\n${buildUserPayload({ messages, context, mode })}\n\n` +
      `Respond with the required JSON object only.`;

  const input = [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];

  /** @type {Record<string, unknown>} */
  const createOpts = {
    model: MODEL,
    input,
    temperature: mode === "generate-scenarios" ? 0.8 : isPose ? 0.65 : 0.8,
  };
  // Pose is short speech + one question — cap output for faster completion
  if (isPose) createOpts.max_output_tokens = 450;
  else if (
    mode === "judge-scrutiny-move" ||
    mode === "judge-challenge" ||
    mode === "judge-contribution" ||
    mode === "assess-feasibility"
  ) {
    createOpts.max_output_tokens = 600;
  }

  const response = await client.responses.create(createOpts);

  const text = response.output_text || "";
  const parsed = extractJson(text);
  if (!parsed) {
    if (mode === "generate-scenarios") {
      return localGenerateScenarios(context, {
        addTechIds: [],
        removeTechIds: [],
        inventionName: null,
        inventionHow: null,
        inventionImpact: null,
        scrutiny: null,
      });
    }
    // Pose fallback so the client always has speech if model returns non-JSON
    if (isPose) {
      return localCoInvent({ mode, messages, context });
    }
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
  if (mode === "generate-scenarios") {
    return sanitizeScenariosResult(parsed, context, "ai");
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
/** @type {Map<string, object>} */
const visionSessions = new Map();
/** Cache market news illustrations by event id (no invent context). */
const marketImageCache = new Map();

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

async function runVisionImage(mode, prompt, prevDataUrl) {
  if (mode === "edit") {
    return xaiImageRequest("/images/edits", {
      model: IMAGE_MODEL,
      prompt,
      image: {
        url: prevDataUrl,
        type: "image_url",
      },
      response_format: "b64_json",
      aspect_ratio: "16:9",
    });
  }
  return xaiImageRequest("/images/generations", {
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    response_format: "b64_json",
    aspect_ratio: "16:9",
  });
}

async function normalizeVisionDataUrl(data) {
  let imageUrl = extractImageDataUrl(data);
  if (!imageUrl) {
    throw new Error("Image API returned no image data");
  }
  if (imageUrl.startsWith("http")) {
    try {
      const imgRes = await fetch(imageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const mime = imgRes.headers.get("content-type") || "image/jpeg";
      imageUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      /* keep remote URL */
    }
  }
  return imageUrl;
}

/**
 * Ensure frozen World Card for this session.
 * Rebuild only when mission place/title/scene identity changes.
 */
function ensureWorldCard(sessionId, body, prev) {
  const fresh = buildWorldCard(body);
  if (prev?.worldCard?.key && prev.worldCard.key === fresh.key) {
    return prev.worldCard;
  }
  return fresh;
}

async function handleVision(body) {
  const sessionId = String(body.sessionId || "default").slice(0, 120);
  const fingerprint = visionFingerprint(body);
  const force = Boolean(body.force);
  /** Followers only consume the shared cache — never generate a divergent image */
  const followOnly = Boolean(body.followOnly);
  const prev = visionSessions.get(sessionId);
  const stageId = body.stage?.id || "present";

  // Multiplayer followers: return whatever the owner last generated for this session
  if (followOnly) {
    if (prev?.dataUrl) {
      return {
        ok: true,
        cached: true,
        followOnly: true,
        imageUrl: prev.dataUrl,
        prompt: prev.prompt,
        stageId: prev.stageId || stageId,
        model: IMAGE_MODEL,
        mode: prev.mode || "generate",
        continuity: prev.continuity || "baseline",
        reason: "Shared vision for room seat",
        place: prev.worldCard?.place || null,
      };
    }
    return {
      ok: true,
      cached: false,
      followOnly: true,
      waiting: true,
      imageUrl: null,
      stageId,
      model: IMAGE_MODEL,
      reason: "Waiting for shared vision",
      place: null,
    };
  }

  if (!force && prev?.fingerprint === fingerprint && prev.dataUrl) {
    return {
      ok: true,
      cached: true,
      imageUrl: prev.dataUrl,
      prompt: prev.prompt,
      stageId,
      model: IMAGE_MODEL,
      mode: prev.mode || "generate",
      continuity: prev.continuity || "baseline",
      reason: prev.decisionReason || "Cached vision",
      place: prev.worldCard?.place || null,
    };
  }

  const worldCard = ensureWorldCard(sessionId, body, prev);
  const client = await getClient().catch(() => null);
  let shot = await resolveShot(body, prev, worldCard, { client, model: MODEL });

  let mode = shot.mode === "edit" ? "edit" : "generate";
  if (mode === "edit" && !prev?.dataUrl?.startsWith("data:")) {
    mode = "generate";
    shot = { ...shot, mode: "generate", continuity: "new-shot", reason: "No prior frame to edit" };
  }

  let prompt =
    mode === "edit"
      ? composeEditPrompt(worldCard, shot)
      : composeGeneratePrompt(worldCard, shot, stageId);

  const clean = assertCleanImagePrompt(prompt, { worldScene: worldCard.scene });
  if (!clean.ok) {
    console.warn("[vision] prompt pollution detected:", clean.issues);
  }

  let data;
  let usedMode = mode;
  let continuity = shot.continuity || (mode === "edit" ? "same-frame" : "new-shot");
  let reason = shot.reason || "";

  try {
    data = await runVisionImage(mode, prompt, prev?.dataUrl);
  } catch (e) {
    if (mode === "edit") {
      console.warn("[vision] edit failed, falling back to generate:", e.message || e);
      usedMode = "generate";
      continuity = "new-shot";
      reason = `Edit failed — regenerate (${String(e.message || "error").slice(0, 80)})`;
      prompt = composeGeneratePrompt(worldCard, shot, stageId);
      data = await runVisionImage("generate", prompt, null);
    } else {
      throw e;
    }
  }

  const imageUrl = await normalizeVisionDataUrl(data);

  visionSessions.set(sessionId, {
    fingerprint,
    dataUrl: imageUrl,
    prompt,
    stageId,
    mode: usedMode,
    continuity,
    worldCard,
    lastShot: {
      mode: usedMode,
      continuity,
      happening: shot.happening,
      subjects: shot.subjects || [],
      reason,
    },
    shotNarrativeKey: shotNarrativeKey(body),
    how: visionClip(body.inventionHow, 700),
    impact: visionClip(body.inventionImpact, 700),
    decisionReason: reason,
    updatedAt: Date.now(),
  });

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
    mode: usedMode,
    continuity,
    reason,
    place: worldCard.place || null,
  };
}

/**
 * Lightweight Imagine generate for round market-news cards.
 * Cached by event id so multiplayer clients share one illustration.
 */
async function handleMarketImage(body) {
  const id = String(body?.id || "").slice(0, 80);
  if (!id) {
    return { ok: false, error: "missing_id" };
  }
  const cached = marketImageCache.get(id);
  if (cached?.imageUrl) {
    return {
      ok: true,
      cached: true,
      imageUrl: cached.imageUrl,
      model: IMAGE_MODEL,
      id,
    };
  }

  const headline = String(body?.headline || "Market news").slice(0, 200);
  const rawPrompt = String(body?.prompt || headline).slice(0, 700);
  const prompt = [
    "Editorial news illustration for a strategy board game about emerging technology.",
    "Cinematic 16:9, rich color, no readable text, no logos, no watermarks.",
    rawPrompt || headline,
  ].join(" ");

  try {
    const data = await runVisionImage("generate", prompt, null);
    const imageUrl = await normalizeVisionDataUrl(data);
    marketImageCache.set(id, { imageUrl, prompt, updatedAt: Date.now() });
    if (marketImageCache.size > 60) {
      const oldest = [...marketImageCache.entries()].sort(
        (a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0)
      )[0];
      if (oldest) marketImageCache.delete(oldest[0]);
    }
    return {
      ok: true,
      cached: false,
      imageUrl,
      model: IMAGE_MODEL,
      id,
    };
  } catch (e) {
    console.warn("[market-image]", e.message || e);
    return {
      ok: false,
      error: String(e.message || "generate_failed").slice(0, 200),
      imageUrl: null,
      id,
    };
  }
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
    const lanIps = listLanIpv4();
    return sendJson(res, 200, {
      ok: true,
      coInventor: true,
      vision: ai,
      ai,
      auth: authInfo.source,
      model: MODEL,
      imageModel: IMAGE_MODEL,
      rooms: ROOMS_ENABLED,
      port: PORT,
      /** Private LAN IPs / join URLs for friends on the same network */
      lanIps,
      lanUrls: lanIps.map((ip) => `http://${ip}:${PORT}`),
      features: {
        actionPoints: Boolean(GAME.features?.actionPoints),
        budgetWill: Boolean(GAME.features?.budgetWill),
        rooms: ROOMS_ENABLED,
      },
      roomStats: roomManager ? roomManager.stats() : null,
    });
  }

  // —— Friends rooms (PR9) ——
  if (ROOMS_ENABLED && roomManager && req.method === "POST" && req.url === "/api/rooms") {
    try {
      const body = await readBody(req);
      const ip = clientIp(req);
      const result = roomManager.createRoom({
        displayName: body.displayName,
        ip,
      });
      return sendJson(res, result.ok ? 200 : result.status || 400, result);
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message || "create_failed" });
    }
  }

  if (ROOMS_ENABLED && roomManager && req.method === "POST") {
    const joinMatch = req.url?.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join\/?$/);
    if (joinMatch) {
      try {
        const body = await readBody(req);
        const ip = clientIp(req);
        const result = roomManager.joinRoom(joinMatch[1].toUpperCase(), {
          displayName: body.displayName,
          playerToken: body.playerToken,
          ip,
        });
        return sendJson(res, result.ok ? 200 : result.status || 400, result);
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message || "join_failed" });
      }
    }
    const hostMatch = req.url?.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/host\/?$/);
    if (hostMatch) {
      try {
        const body = await readBody(req);
        const room = roomManager.rooms.get(hostMatch[1].toUpperCase());
        if (!room) return sendJson(res, 404, { ok: false, error: "room_not_found" });
        const found = roomManager.findByPlayerToken(body.playerToken);
        const player = found?.player || null;
        const result = roomManager.hostCommand(room, player, body.cmd, body);
        return sendJson(res, result.ok ? 200 : 400, result);
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message || "host_failed" });
      }
    }
  }

  if (ROOMS_ENABLED && roomManager && req.method === "GET") {
    const snapMatch = req.url?.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/snapshot\/?/);
    if (snapMatch) {
      const room = roomManager.rooms.get(snapMatch[1].toUpperCase());
      if (!room) return sendJson(res, 404, { ok: false, error: "room_not_found" });
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const token = url.searchParams.get("token") || "";
      const found = roomManager.findByPlayerToken(token);
      if (!found || found.room.code !== room.code) {
        return sendJson(res, 401, { ok: false, error: "unauthorized" });
      }
      return sendJson(res, 200, {
        ok: true,
        snapshot: roomManager.snapshotFor(room, found.player.id),
      });
    }
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

  if (req.method === "POST" && req.url?.startsWith("/api/market-image")) {
    try {
      const body = await readBody(req);
      const result = await handleMarketImage(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[market-image]", e.message || e);
      const status = e.status || 500;
      return sendJson(res, status, {
        ok: false,
        error: e.message || "Market image generation failed",
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

// Inject AI boundary into rooms (PR10) once handleCoInvent is in scope
if (roomManager) {
  roomManager.coInventHandler = (body) => handleCoInvent(body);
}

// WebSocket for friends rooms
if (ROOMS_ENABLED && roomManager) {
  const wss = new WebSocketServer({ server, path: "/ws/rooms" });
  wss.on("connection", (socket, req) => {
    let bound = null; // { room, player }
    const ip = clientIp(req);

    socket.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return safeWs(socket, { type: "error", error: "bad_json" });
      }

      if (msg.type === "auth") {
        if (!roomManager.checkRate(`ws-auth:${ip}`, 20, 60 * 1000)) {
          return safeWs(socket, { type: "error", error: "rate_limited" });
        }
        const found = roomManager.findByPlayerToken(msg.token);
        if (!found) return safeWs(socket, { type: "error", error: "unauthorized" });
        bound = found;
        roomManager.bindSocket(found.room, found.player, socket);
        return safeWs(socket, {
          type: "hello",
          snapshot: roomManager.snapshotFor(found.room, found.player.id),
        });
      }

      if (!bound) return safeWs(socket, { type: "error", error: "auth_required" });

      const { room, player } = bound;

      if (msg.type === "action") {
        const action = msg.action || msg;
        const aType = action?.type || "?";
        const t0 = Date.now();
        // Rate-log spammy actions (vision thrash freezes clients)
        if (!room._actionLog) room._actionLog = { n: 0, byType: Object.create(null), windowStart: t0 };
        if (t0 - room._actionLog.windowStart > 2000) {
          const top = Object.entries(room._actionLog.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([k, v]) => `${k}:${v}`)
            .join(" ");
          if (room._actionLog.n > 8) {
            console.warn(
              `[rooms] ${room.code} action burst ${room._actionLog.n} in 2s · ${top}`
            );
          }
          room._actionLog = { n: 0, byType: Object.create(null), windowStart: t0 };
        }
        room._actionLog.n += 1;
        room._actionLog.byType[aType] = (room._actionLog.byType[aType] || 0) + 1;
        if (aType === "sync_vision" || aType === "sync_challenge_view") {
          console.log(
            `[rooms] ${room.code} ${player.displayName} ${aType} (seat ${player.id.slice(0, 8)})`
          );
        }
        const result = roomManager.applyPlayerAction(room, player, action);
        const ms = Date.now() - t0;
        if (!result.ok) {
          console.log(`[rooms] reject ${room.code} ${player.displayName} ${aType}: ${result.error}`);
          return safeWs(socket, { type: "reject", error: result.error, ...result });
        }
        if (ms > 50) console.log(`[rooms] slow action ${aType} ${ms}ms`);
        return; // patch already broadcast
      }

      if (msg.type === "request_ai") {
        // Async — do not block the socket handler on await chain failures
        roomManager
          .requestAi(room, player, msg.payload || msg)
          .then((result) => {
            if (!result.ok) {
              safeWs(socket, { type: "reject", error: result.error || "ai_rejected" });
            }
            // ai_pending / ai_result already broadcast on success path
          })
          .catch((e) => {
            safeWs(socket, { type: "reject", error: e.message || "ai_failed" });
          });
        return;
      }

      if (msg.type === "host") {
        const result = roomManager.hostCommand(room, player, msg.cmd, {
          ...msg.payload,
          hostToken: msg.hostToken,
          playerToken: player.playerToken,
        });
        if (!result.ok) return safeWs(socket, { type: "reject", error: result.error });
        return safeWs(socket, { type: "host_ok", cmd: msg.cmd, ...result });
      }

      if (msg.type === "ping") {
        return safeWs(socket, { type: "pong", t: Date.now() });
      }

      safeWs(socket, { type: "error", error: "unknown_type" });
    });

    socket.on("close", () => {
      roomManager.unbindSocket(socket);
    });
  });
}

server.listen(PORT, HOST, async () => {
  console.log(`Future Forge → http://127.0.0.1:${PORT} (bound ${HOST})`);
  const urls = lanJoinUrls();
  if (urls.length) {
    console.log("LAN (same Wi‑Fi) — friends open one of:");
    for (const u of urls) console.log(`  ${u}`);
  } else {
    console.log("LAN: no private IPv4 found — check Wi‑Fi / ethernet");
  }
  if (ROOMS_ENABLED) {
    console.log(`Friends rooms: ON · WS /ws/rooms (ENABLE_ROOMS=0 to disable)`);
  } else {
    console.log("Friends rooms: OFF");
  }
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

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function safeWs(socket, obj) {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}
