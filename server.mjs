/**
 * Future Forge server — static files + Grok co-inventor
 * Auth: SuperGrok session from ~/.grok/auth.json (same login as Grok CLI).
 * Optional fallback: FF_XAI_API_KEY. Local co-inventor if nothing works.
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
import {
  usageTrackerFromEnv,
  extractTokenUsage,
  normalizeSessionId,
} from "./js/usage-metrics.mjs";
import { scanQuestsFolder, resolveQuestsDir, ensureQuestsDir } from "./js/quests-folder.mjs";
import {
  fetchRemoteQuestCatalog,
  resolveQuestsRemoteUrl,
} from "./js/quests-remote.mjs";
import {
  fetchRemoteTrendCatalog,
  resolveTrendsRemoteUrl,
} from "./js/trends-remote.mjs";
import { SCENE_PROSE, SCENE_PROSE_CAPSULE } from "./js/scene-prose.js";
import {
  normalizeTtsText,
  ttsCacheKey,
  createTtsCache,
} from "./js/tts-cache.mjs";
import { RateLimiter } from "./js/server/rate-limit.mjs";
import { clientIp, isLoopbackSocket } from "./js/server/client-ip.mjs";
import { canSeeAdmin } from "./js/server/admin-gate.mjs";
import { serveStatic } from "./js/server/static.mjs";
import {
  readBody,
  sendJson,
  errorStatus,
} from "./js/server/read-body.mjs";
import {
  CostPolicy,
  checkApiSecret,
} from "./js/server/cost-policy.mjs";
import { resolveDeveloperEnabled } from "./js/server/developer-mode.mjs";
import {
  resolveAiSearchEnabled,
  searchToolsForMode,
  SEARCH_MAX_OUTPUT_TOKENS,
  SEARCH_SYSTEM_LINE,
} from "./js/server/ai-search.mjs";
import { ideasOrFallback, localIdeaSparks, rotateLocalIdeaSparks } from "./js/idea-cards.js";
import {
  sanitizeScrutiny,
  localScrutinyProposals,
} from "./js/scrutiny-shared.js";
import {
  FAST_EVAL_MODES,
  isFastEvalMode,
  fastEvalUserContent,
  sanitizeFast,
} from "./js/server/fast-eval.mjs";
import { heuristicConverges } from "./js/hex/evaluate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const QUESTS_DIR = resolveQuestsDir(ROOT);
ensureQuestsDir(QUESTS_DIR);
const QUESTS_REMOTE_URL = resolveQuestsRemoteUrl();
const TRENDS_REMOTE_URL = resolveTrendsRemoteUrl();
const GROK_HOME = process.env.FF_GROK_HOME || path.join(os.homedir(), ".grok");
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

// Must run before reading FF_* config from process.env
loadEnvFile();

const PORT = Number(process.env.FF_PORT) || 8765;
/** Optional shared secret for expensive APIs when exposed beyond loopback. */
const API_SECRET = String(process.env.FF_API_SECRET || "").trim();
/** Max concurrent rooms (DoS). */
const MAX_ROOMS = Math.max(
  1,
  Number(process.env.FF_MAX_ROOMS) || 200
);
/** Max WebSocket text message size (bytes). */
const WS_MAX_PAYLOAD = Math.max(
  1024,
  Number(process.env.FF_WS_MAX_PAYLOAD) || 256 * 1024
);
/** Bind all interfaces so LAN friends can connect (firewall still blocks WAN). */
const HOST = process.env.FF_HOST || "0.0.0.0";
const MODEL = process.env.FF_XAI_MODEL || "grok-4.6";
/** Default xAI TTS voice (https://docs.x.ai — Text to Speech). */
const TTS_VOICE = process.env.FF_TTS_VOICE || "eve";
/** xAI TTS input character limit. */
const TTS_MAX_CHARS = 15_000;
/** Shared TTS audio cache (disk + memory) so all users share one file per text. */
const TTS_CACHE_DIR =
  process.env.FF_TTS_CACHE_DIR || path.join(ROOT, "data", "tts-cache");
const ttsCache = createTtsCache({ dir: TTS_CACHE_DIR, maxMemory: 64 });
/** Friends co-op rooms (PR9). Default on; set FF_ENABLE_ROOMS=0 to disable. */
const ROOMS_ENABLED = process.env.FF_ENABLE_ROOMS !== "0";

/** Shared rate limiter for HTTP cost policy + room manager. */
const rateLimiter = new RateLimiter();
const costPolicy = new CostPolicy({ limiter: rateLimiter });

/**
 * Hosting-cost usage metrics (tokens, images, TTS, sessions).
 * Off by default — enable with `node server.mjs --usage` or FF_USAGE_ENABLED=1.
 */
const usage = usageTrackerFromEnv(
  process.env,
  path.join(ROOT, "data", "usage"),
  process.argv.slice(2)
);

/**
 * Developer UI (quest / trend inspect). Off by default.
 * Enable with `node server.mjs --developer` or FF_DEVELOPER=1.
 */
const DEVELOPER_MODE = resolveDeveloperEnabled(
  process.argv.slice(2),
  process.env
);

/**
 * Live web + X search on timing assess and idea-sparks. Off by default.
 * Enable with `node server.mjs --ai-search` or FF_AI_SEARCH=1.
 */
const AI_SEARCH_ENABLED = resolveAiSearchEnabled(
  process.argv.slice(2),
  process.env
);

/** Filled after handleCoInvent is defined (see bottom rooms wire). */
const roomManager = ROOMS_ENABLED
  ? new RoomManager({
      maxRooms: MAX_ROOMS,
      rateLimiter,
      onRoomStart: (code, meta) => usage.roomStart(code, meta),
      onRoomEnd: (code, meta) => usage.roomEnd(code, meta),
      onRoomPlayers: (code, n) => usage.roomTouchPlayers(code, n),
    })
  : null;

/**
 * Gate expensive AI POST routes: rate limit + optional FF_API_SECRET.
 * @param {import('node:http').IncomingMessage} req
 * @param {'co-invent'|'vision'|'market-image'|'idea-image'|'tts'} route
 * @param {object|null} [body]
 */
function gateExpensive(req, route, body = null) {
  const ip = clientIp(req);
  const rate = costPolicy.allowExpensive(route, ip);
  if (!rate.ok) return rate;
  const secret = checkApiSecret(req, body, {
    secret: API_SECRET,
    isLoopback: isLoopbackSocket(req),
  });
  if (!secret.ok) return secret;
  return { ok: true, ip };
}

/**
 * @param {object|null|undefined} body
 * @returns {string|null}
 */
function clientSessionFromBody(body) {
  return normalizeSessionId(body?.clientSessionId || body?.clientId);
}

/**
 * Record a co-inventor / director text call.
 * @param {object} opts
 */
function recordAiText(opts) {
  const tokens = extractTokenUsage(opts.usage);
  usage.record({
    type: "ai_text",
    mode: opts.mode || "chat",
    source: opts.source || "ai",
    model: opts.model || MODEL,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    totalTokens: tokens.totalTokens,
    cachedInputTokens: tokens.cachedInputTokens || undefined,
    latencyMs: opts.latencyMs ?? null,
    ok: opts.ok !== false,
    sessionId: opts.sessionId || null,
    roomCode: opts.roomCode || null,
  });
}

/**
 * Record an image gen/edit/cache/follow event.
 * @param {object} opts
 */
function recordAiImage(opts) {
  const tokens = extractTokenUsage(opts.usage);
  const source = opts.source || "live";
  usage.record({
    type: "ai_image",
    kind: opts.kind || "vision",
    mode: opts.mode || "generate",
    source,
    model: opts.model || IMAGE_MODEL,
    imageCount: source === "live" ? opts.imageCount ?? 1 : 0,
    inputTokens: tokens.inputTokens || null,
    outputTokens: tokens.outputTokens || null,
    totalTokens: tokens.totalTokens || null,
    latencyMs: opts.latencyMs ?? null,
    ok: opts.ok !== false,
    sessionId: opts.sessionId || null,
    roomCode: opts.roomCode || null,
  });
}

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

  const apiKey = process.env.FF_XAI_API_KEY || "";
  // Intentionally ignore bare GROK_API_KEY env noise when SuperGrok session is preferred;
  // only FF_XAI_API_KEY is treated as an explicit console key override.
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

// MIME lives in js/server/static.mjs (imported above).

const SYSTEM_PROMPT = `You are the AI Co-Inventor in Future Forge: an inventing practice about emerging technologies, local invention, and timing.

Role:
- Creative partner for a LOCAL mission. Not sole inventor.
- Suggest multi-domain stacks only when the problem needs them — never as a hard rule.
- emTech categories are ALWAYS pickable. Timing is about CLAIMS in how-it-works vs the calendar year — never "you cannot pick Synthetic Biology until 2029".
- readyYear / softHorizon on a tech is only a soft hint that near-scale use cases get more common later — not a lock.
- When mode is art-of-the-possible: teach capability literacy along the chain when useful — product category (not bare emTech encyclopedia), current capabilities, how they advance (trends), labeled predictions, milestones, use cases unlocked, inventable application categories, near vs frontier stretch — for the selected stack (or recommended if empty) and year/place. Use maturity/milestones/useCasesNow from availableTechs as baseline; when context.grounding is present prefer its product category and chain. Enrich carefully. Label uncertainty. Do not invent fake paper titles.
- When mode is sit: Systematic Inventive Thinking ("thinking in a box", TRIZ-inspired). Remix context.inventionHow with four closed-world lenses — Subtraction, Division, Multiplication, Addition. Prefer elements already in how-it-works + stack; do not invent a new mission. Structure message with those four headings. Brainstorm only — leave proposals empty (no inventionHow apply; the learner rewrites their own how-it-works if they like an idea).
- When mode is scamper: SCAMPER checklist (Osborn/Eberle) on context.inventionHow. Structure message with seven headings: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse/Rearrange. More open than SIT (Adapt may borrow nearby domains) but still anchored on their draft. Brainstorm only — leave proposals empty (no inventionHow apply). Do not invent a new mission.
- When mode is assess-feasibility: judge ONLY whether the mechanism is possible or already demonstrated in context.year. Return top-level timing: { "level": "red"|"yellow"|"green", "reason": "..." }. Do not judge quest fit, clinic job, or whether the idea matches grounding's example applications (hoppers vs heavy-lift). green = architecture+payload exists or is demonstrated by year (no pilot tax; smaller grounding examples do not cap payload). yellow = vague, or after checking year the claimed scale is not yet demonstrated. red = only if grounding EXPLICITLY forbids / says not yet, or sci-fi treated as routine (consumer flying cars, mind upload). Never red or yellow merely for "different category" or "not a small hopper". Categories in the stack never force red by themselves. Capability only advances with time: if claims and stack are unchanged, a later year must NOT rate worse than an earlier year. If context.priorTiming is set with the same claims, do not rate harsher than priorTiming.level when year >= priorTiming.year. If context.grounding is present, it is authoritative only on contradiction: an explicit limit, denial, or "not yet". Capabilities, unlocks, and applications are examples — not a closed inventory. Omission is not a contradiction.
- When mode is generate-scenarios: invent MULTIPLE distinct local mission scenarios for context.globalTheme. Return top-level scenarios array (not just one). Concrete places, different angles, valid tech ids only.
- When mode is idea-sparks: return exactly 3 application sparks for context.focusTechId in this place and year. Top-level ideas: [{id, title, blurb, insertText, howText, imagePrompt, year}]. Leave proposals empty (no inventionHow / name / stack). Three different angles. Pilot-honest. title is a plain noun phrase a learner can say aloud (what the idea is, not a slogan; no coined slang). howText (or insertText) is one clear mechanism sentence in everyday words, using the named person/place when known. If context.refresh, do not repeat context.avoidTitles.
- When mode is evaluate-neighbors: judge traffic lights for hex board givens in context.hexEval.givens. Each given is a crisis meter or challenger concern. Judge from that given's FULL reachable invention pathway (neighbors[] = pathway tiles with techId + howText + timing; direct:true = shares an edge with this given; also pathway: combined howText/techIds). Read the pathway as ONE invent — a downstream mechanism can make a docked tile honest. Crisis (kind=crisis): judge against role — local = here-and-now relief / local fit; global = root cause / lasting driver; support = public buy-in AND scale-beyond-pilot. Honor prior; green allowed when honestly eased. Concern (kind=concern): judge against stored challengeSpeech/challengeQuestion plus playerAnswer if present. Judge the combination of ALL inventions in that given's reachable pathway AND the written answer. Nothing docked stays red even with an answer. Docked concerns may be red, yellow, or green. Green only if the pathway honestly holds the answer. red = unanswered/hot; yellow = touching but not enough; green = honestly eased for this place and year. Do not require bits/atoms world-match. Do not rewrite howText or art. Honor grounding. Leave proposals empty.
- When mode is score-pathway: score ONE invention pathway (context.pathway.inventions: techId + howText + timing — no names) as a combination. Return top-level crisisDelta: { local, global, support } integers from -2 to +1 (negative = eases that crisis pressure if this pathway docks onto that meter). Also return concerns: { [angle]: { level: "red"|"yellow"|"green", reason } } for angles in context.concerns (judge ALL inventions in the pathway plus playerAnswer if present vs stored challengeSpeech/challengeQuestion). Docked concerns may be red, yellow, or green. Green only if the pathway honestly holds the answer — a written answer cannot green an empty dock. Leave proposals empty. Do not rewrite inventions.
- When mode is complete-picture: the player wrote ONLY one face (how OR everyday life). Fill the OTHER face only in proposals (inventionHow XOR inventionImpact). Stay local, match the stack, complementary not contradictory. If context.contributingToOther is true, the draft must ADD to their invent without gutting or contradicting what they already wrote.
- When mode is judge-contribution: decide if afterText is an ADDITIVE contribution to beforeText on context.field (inventionHow|inventionImpact|inventionName). Additive = keeps original substance and layers detail/extension. Destructive = rewrites, clears, or removes core meaning. Return top-level additive: true|false and reason: one sentence. Be fair but protect the original author's voice.
- When mode is scrutinize: stress-test the idea from FOUR angles (see below). Put results in proposals.scrutiny.
- Tone: clear, concise, hopeful, practical. Player-facing scene/quest prose: ${SCENE_PROSE_CAPSULE}

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
- If context.grounding is set, treat it as the authoritative source of truth for this Quest along the chain: emTech enables product category → capabilities → trends → predictions → milestones unlock use cases → inventable applications (+ honest limits). Prefer product-category grain over generic tech-id encyclopedia when advising or assessing.

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
  "timing": null,
  "ideas": null
}

For assess-feasibility set timing to { "level": "red"|"yellow"|"green", "reason": "one sentence" }.
For idea-sparks set ideas to exactly 3 objects { id, title, blurb, insertText, imagePrompt } and keep proposals empty.
For other modes timing and ideas may be null.

scrutiny when used:
"scrutiny": {
  "moloch": { "analysis": "...", "safeguard": "...", "imagePrompt": "..." },
  "ethicist": { "analysis": "...", "safeguard": "...", "imagePrompt": "..." },
  "stakeholder": { "analysis": "...", "safeguard": "...", "imagePrompt": "..." },
  "nature": { "analysis": "...", "safeguard": "...", "imagePrompt": "..." }
}
Each imagePrompt is ≤400 chars: a photoreal documentary still of that concern pressing THIS place/pathway — no text, logos, or named real people.

Use null or [] when empty. For complete-picture fill only the missing face. For scrutinize fill scrutiny and keep techs unless asked.`;

/** Tutor mode — active tutor session on a learning-module Quest. Same JSON contract as SYSTEM_PROMPT + endTutoring. */
const TUTOR_SYSTEM_PROMPT = `You are the AI Tutor in Future Forge for a LEARNING MODULE quest (local invent + emerging tech). Tutor session is ACTIVE (free AP for the learner while tutoring).

Role:
- Patient tutor and guide — NOT a free-form co-inventor that dumps full solutions.
- The learner still invents; you scaffold understanding step by step.
- Teach from context.aiTutorContext when present: that is HIDDEN instructor context (curriculum notes). Never quote it as "secret notes" or paste it wholesale. Use it to decide what to introduce next.
- aiTutorContext may list RESOURCES (reading materials as Markdown links, often on warmersun.com/lessons) and ILLUSTRATIONS (diagrams as ![caption](https://…)). Those are the textbook. Chat is the conversation. Neither replaces the other.
- The chat UI renders safe Markdown in **message**: clickable https links and inline https images. Use [title](https://…) and ![alt](https://…). https only; never javascript/data URLs or raw HTML.
- Answer vs send-to-read (hard rules):
  - Always answer the question they asked, in the chat bubble. Never reply with only a URL. SEQUENCE paces unsolicited next ideas — it is not a gate that blocks a later idea they asked about.
  - Teach the current idea in a **short paragraph: 4–8 full sentences (~80–180 words)**. Use one concrete analogy a high-school senior can hold, and unpack the one term this step needs. Do not send a telegram (1–2 cryptic sentences that only name the idea). Do not rewrite a lesson HTML page (no multi-section restatement of the textbook).
  - Then, when a send-to-read rule fires, offer the one matching RESOURCES page as the **long version** (optional matching illustration). The page is extra reading, not the explanation.
  - Stay in chat with **no new URL** when: they recap / "did I get this right?" (confirm or gently correct in complete sentences); they already got that page this step (or they say they read it); they are inventing (local rule, how-it-works, place tension) — scaffold in chat, do not send them away to invent; they are stuck after a link — re-explain in plain words, do not only re-send the same URL.
  - Give the one matching page after the spoken paragraph when: this is the next SEQUENCE idea they have not asked past and a row exists for it; a listed misconception just fired and that row names a page; they ask for the long version, the picture, or "where is this written?"
  - Never use a page as a substitute for the invent gate.
- If context.grounding is present, treat it as authoritative capability truth along its chain (product category, capabilities, trends/predictions, milestones, unlocked use cases → applications, honest limits). Prefer that grain over the whole emTech tray card.
- Scaffold the learner to **apply** unlocked use cases as a local **application** in this place/year (pilot-honest) — do not dump a finished invention or expand to unlimited bare emTech.
- Stay local to this place/year. emTech categories are always pickable; feasibility timing judges CLAIMS vs year/grounding, not card locks.

Tutor style (hard rules for teaching):
- One **current idea** per reply — do not stack SEQUENCE 1–10 or lecture the whole lesson.
- Write in **full sentences**. A teaching turn is a short paragraph (analogy + one mechanism), not a fragment and not a chapter.
- **Do not quiz** the learner on understanding. Do **not** end with a check question, comprehension quiz, or "what do you think X means?" unless they explicitly ask to be tested or quizzed.
- **Learner-driven:** answer the question they asked fully enough that a newcomer understands this one idea. Invite them to ask when stuck — do not interrogate them with a battery of prompts.
- **Do not assume subject-matter knowledge.** If a typical high-school senior would not already know a concept, idea, or term, introduce or briefly explain it in plain language on **first use** (then the term if useful).
- Explain only what the learner needs for the current step. Guide research and invention (next small action, what to try) rather than solving the design for them.
- When they ask for a full solution, give a partial scaffold and leave the next invent step to them — still without quizzing.
- At most one reading link per turn (plus its matching illustration if useful) unless the learner asks for more; do not dump every resource from aiTutorContext at once.

Ending tutoring (important):
- You MAY end the tutor session by setting top-level **endTutoring: true** when:
  (1) the invent gate in aiTutorContext is substantially met (learner can invent pilot-honest on their own), OR
  (2) the learner clearly asks to invent alone / stop tutoring / "I've got it".
- Do **not** set endTutoring on every turn. Default is endTutoring: false or omit the field.
- When ending: say so briefly in message (they can Resume tutoring later on this lesson). Keep proposals sparse.

Modes:
- chat / spark / explain / drafts / art-of-the-possible / sit / scamper / complete-picture: tutor style above; keep proposals sparse and pilot-honest.
- assess-feasibility: same timing JSON as co-inventor (red|yellow|green + reason); honor grounding only on explicit contradiction (limits, denials, not-yet) — examples are not a closed inventory; do not lecture in message beyond a short reason.
- Never invent fake paper titles. Never say a category is locked until a year.

Respond with a single JSON object (no markdown fences) like the co-inventor, plus optional endTutoring:
{
  "message": "string",
  "proposals": { "addTechIds": [], "removeTechIds": [], "inventionName": null, "inventionHow": null, "inventionImpact": null, "scrutiny": null },
  "teaching": [],
  "timing": null,
  "endTutoring": false
}
For assess-feasibility set timing; otherwise timing may be null.`;

/** Compact pose prompt lives in js/server/fast-eval.mjs (FAST_EVAL_MODES). */

/** Appended to invent/challenge modeHints when capability truth matters. */
const GROUNDING_HINT =
  " If context.grounding is present, treat it as authoritative Quest source-of-truth along its chain (product category, capabilities, trends/predictions, milestones, unlocked use cases → applications, honest limits); prefer that grain over generic tech-id encyclopedia; do not invent contradicting facts.";

/** Hex workshop: apply buttons focus emTech / fill mint-box, not essay/stack. */
const HEX_INVENT_HINT =
  " Hex invent: the learner mints invention tiles on a hex board. proposals.addTechIds means consider these emTech categories (they focus the picker — not add to a stack). proposals.inventionHow is a mint-box draft for ONE focused tech; the learner still hits Mint tile. Leave inventionName and inventionImpact empty/null. Do not tell them to Apply name or everyday life.";

/** Appended to invent modeHints when tutor mode is active. */
const TUTOR_HINT =
  " Tutor mode: one current idea per reply, taught in a short paragraph (4–8 sentences, ~80–180 words, analogy + one mechanism); full sentences; no quiz or check questions; answer the question they asked (SEQUENCE does not block a later idea); explain terms a high-school senior may not know on first use; do not dump full solutions; use context.aiTutorContext as hidden curriculum without pasting it wholesale. Answer vs send-to-read: always speak the explanation (never a URL alone); do not rewrite a lesson page; stay in chat for recaps, follow-ups after they already got that page, invent/how-it-works, and confusion after a link; after the spoken paragraph, offer the one matching RESOURCES/ILLUSTRATIONS page when this is the next SEQUENCE idea, a listed misconception fires, or they ask for the long version (https only; chat renders links and inline images).";

/**
 * Resolve optional Quest grounding string from request context.
 * @param {object|null|undefined} context
 * @returns {string|null}
 */
function resolveGrounding(context) {
  if (typeof context?.grounding === "string" && context.grounding.trim()) {
    return String(context.grounding).trim().slice(0, 50_000);
  }
  if (
    typeof context?.mission?.grounding === "string" &&
    context.mission.grounding.trim()
  ) {
    return String(context.mission.grounding).trim().slice(0, 50_000);
  }
  return null;
}

/**
 * Hidden AI tutor curriculum notes (never for player UI).
 * @param {object|null|undefined} context
 * @returns {string|null}
 */
function resolveTutorContext(context) {
  if (typeof context?.aiTutorContext === "string" && context.aiTutorContext.trim()) {
    return String(context.aiTutorContext).trim().slice(0, 50_000);
  }
  if (
    typeof context?.mission?.aiTutorContext === "string" &&
    context.mission.aiTutorContext.trim()
  ) {
    return String(context.mission.aiTutorContext).trim().slice(0, 50_000);
  }
  return null;
}

function isTutorMode(context) {
  // Active tutor session only — learning quests may turn tutoring off mid-play.
  if (context?.tutorMode === true) return true;
  // Backward compat: older clients sent only isLearningModule
  if (context?.tutorMode === false) return false;
  return context?.isLearningModule === true;
}

/** Short excerpt for local (offline) fallback messages. */
function groundingExcerpt(context, max = 500) {
  const g = resolveGrounding(context);
  if (!g) return "";
  const oneLine = g.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/* —— Local co-inventor (always available) —— */

function localArtOfThePossible(context, selected, stack, map, base) {
  const year = context.year || 2026;
  const place = context.place || "this place";
  const focus = (selected.length ? selected : stack).slice(0, 5);
  const groundNote = groundingExcerpt(context, 500);
  const groundBlock = groundNote
    ? `\n\n**Quest grounding (authoritative):** ${groundNote}\n`
    : "";
  if (!focus.length) {
    return {
      source: "local",
      message:
        `**Art of the possible** (${year}, ${place}):\n\n` +
        `Pick at least one emTech category first — then I can map milestones, current capabilities, and unlocked use cases for this year. ` +
        `Remember: categories are always pickable; we judge *claims*, not cards.` +
        groundBlock,
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
      `Categories below are always choosable. Invent with *now* / pilot language for green timing; frontier-as-routine goes red on feasibility.` +
      groundBlock +
      `\n\n` +
      lines.join("\n\n") +
      `\n\nWant a claim that fits this year? Draft how-it-works around a pilot, partnership, or mapped corridor — then I'll stress-test timing.`,
    proposals: base,
    teaching,
  };
}

/**
 * Local SIT (Systematic Inventive Thinking) — four closed-world lenses on how-it-works.
 */
function localSitInvent(context, selected, stack, map, base) {
  const how = String(context.inventionHow || "").trim();
  const place = context.place || "this place";
  const name = context.inventionName || "your invention";
  const year = context.year || 2026;
  const focus = (selected.length ? selected : stack).slice(0, 4);
  const techNames = focus.map((id) => map.get(id)?.name || id).filter(Boolean);
  const techPhrase = techNames.length
    ? techNames.slice(0, 3).join(", ")
    : "the pieces already in your draft";
  const snip = how.length
    ? how.slice(0, 160) + (how.length > 160 ? "…" : "")
    : "the mechanism you wrote";

  if (how.length < 20) {
    return {
      source: "local",
      message:
        `**SIT invent** needs a how-it-works draft first (at least a short paragraph). ` +
        `Write the mechanism, then hit **SIT invent** again — we'll remake it with subtraction, division, multiplication, and addition.`,
      proposals: base,
      teaching: [],
    };
  }

  const subtractionHow =
    `In ${place}, strip the most “obvious” middle step from the current design and let remaining actors + ${techPhrase} carry the function. ` +
    `What you remove is treated as optional scaffolding, not the core value — neighbors still get the outcome without that piece.`;
  const divisionHow =
    `In ${place}, split what was one end-to-end system into modular parts that run on different schedules or blocks: sense here, decide there, act only where the crisis is hottest. ` +
    `${techPhrase} stay in play, but no single site must host the whole stack.`;
  const multiplicationHow =
    `In ${place}, keep the core loop but run a second, changed copy of one component — a cheaper twin, a slower twin, or a community-operated twin — so the original design and its variant cover different users. ` +
    `Same family as ${techPhrase}, deliberately not identical.`;
  const additionHow =
    `In ${place}, assign a new job to something already in the system (a sensor, a clerk, a spare channel, a quiet hour) so it also does coordination or access work. ` +
    `Closed-world addition: no new magic tech — only roles and links already latent in your how-it-works and ${techPhrase}.`;

  return {
    source: "local",
    message:
      `**SIT invent** — thinking in a box for **${name}** (${place}, ${year}).\n` +
      `Starting from your how-it-works: “${snip}”\n\n` +
      `**Subtraction** — remove an essential-looking step and still deliver the outcome:\n${subtractionHow}\n` +
      `_Why it might win:_ fewer moving parts, cheaper pilot, harder to freeride on complexity.\n\n` +
      `**Division** — split whole into parts in time, space, or scale:\n${divisionHow}\n` +
      `_Why it might win:_ starts small, matches uneven streets or clinics, fails gracefully.\n\n` +
      `**Multiplication** — copy a component and change the copy:\n${multiplicationHow}\n` +
      `_Why it might win:_ serves two realities (rich/poor blocks, day/night, skilled/novice) without a second invention.\n\n` +
      `**Addition** — new job for something already inside the system:\n${additionHow}\n` +
      `_Why it might win:_ closed-world; reuses trust and infrastructure you already named.\n\n` +
      `These are sparks, not a paste-in draft — rewrite your own how-it-works if one of them clicks.`,
    proposals: base,
    teaching: teachingFor(focus.length ? focus : stack, map, 2),
  };
}

/**
 * Local SCAMPER — seven checklist remakes of how-it-works.
 */
function localScamperInvent(context, selected, stack, map, base) {
  const how = String(context.inventionHow || "").trim();
  const place = context.place || "this place";
  const name = context.inventionName || "your invention";
  const year = context.year || 2026;
  const focus = (selected.length ? selected : stack).slice(0, 4);
  const techNames = focus.map((id) => map.get(id)?.name || id).filter(Boolean);
  const techPhrase = techNames.length
    ? techNames.slice(0, 3).join(", ")
    : "the pieces already in your draft";
  const snip = how.length
    ? how.slice(0, 160) + (how.length > 160 ? "…" : "")
    : "the mechanism you wrote";

  if (how.length < 20) {
    return {
      source: "local",
      message:
        `**SCAMPER invent** needs a how-it-works draft first (at least a short paragraph). ` +
        `Write the mechanism, then hit **SCAMPER invent** again — we'll remake it with Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, and Reverse.`,
      proposals: base,
      teaching: [],
    };
  }

  const substituteHow =
    `In ${place}, swap one actor or channel in the current design — e.g. a community radio or clinic clerk stands in for a step that currently depends on a scarcer part of ${techPhrase}. ` +
    `Same outcome, different substitute in the chain.`;
  const combineHow =
    `In ${place}, merge two jobs that your draft treats separately (sense + alert, pay + enroll, map + dispatch) so one pass through ${techPhrase} does both. ` +
    `Fewer handoffs, one combined loop.`;
  const adaptHow =
    `In ${place}, borrow a pattern that already works nearby — school lunch logistics, mutual-aid WhatsApp trees, pharmacy refill reminders — and adapt it onto your mechanism with ${techPhrase}. ` +
    `Not a new category; a familiar social pattern wearing your stack.`;
  const modifyHow =
    `In ${place}, change scale or intensity: run a minified block pilot first (one street, one clinic day) or magnify coverage on crisis hours only. ` +
    `${techPhrase} stays, but cadence and footprint shift.`;
  const putToUseHow =
    `In ${place}, keep the same machinery but aim it at a second job on quiet days — training, inventory, neighbor check-ins — so idle capacity from ${techPhrase} is not wasted. ` +
    `Primary crisis use remains; off-peak is the new use.`;
  const eliminateHow =
    `In ${place}, cut the step users skip anyway and redesign so the outcome still lands without it. ` +
    `Remaining actors + ${techPhrase} carry a simpler path.`;
  const reverseHow =
    `In ${place}, flip the sequence: act or enroll first, measure after — or let neighbors request before the system pushes. ` +
    `Rearrange who moves first while keeping ${techPhrase} in the loop.`;

  return {
    source: "local",
    message:
      `**SCAMPER invent** — checklist remakes for **${name}** (${place}, ${year}).\n` +
      `Starting from your how-it-works: “${snip}”\n\n` +
      `**Substitute** — replace a part of the chain:\n${substituteHow}\n` +
      `_Why it might win:_ uses what this place already trusts.\n\n` +
      `**Combine** — merge steps or functions:\n${combineHow}\n` +
      `_Why it might win:_ fewer handoffs, clearer pilot story.\n\n` +
      `**Adapt** — borrow a working pattern:\n${adaptHow}\n` +
      `_Why it might win:_ adoption rides on a familiar habit.\n\n` +
      `**Modify** — change scale or intensity:\n${modifyHow}\n` +
      `_Why it might win:_ honest pilot size or peak-hour focus.\n\n` +
      `**Put to other uses** — same kit, second job:\n${putToUseHow}\n` +
      `_Why it might win:_ justifies cost between crises.\n\n` +
      `**Eliminate** — remove a step and still deliver:\n${eliminateHow}\n` +
      `_Why it might win:_ cheaper, less freeride surface.\n\n` +
      `**Reverse / Rearrange** — flip order or roles:\n${reverseHow}\n` +
      `_Why it might win:_ matches how people already move here.\n\n` +
      `These are sparks, not a paste-in draft — rewrite your own how-it-works if one of them clicks.`,
    proposals: base,
    teaching: teachingFor(focus.length ? focus : stack, map, 2),
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

    const roles = ["local", "global", "support"];
    /** @type {Record<string, { label: string, pressure: number, pressureRise: number, winMax: number }>} */
    let pressure = {};
    const rawP = raw.pressure && typeof raw.pressure === "object" ? raw.pressure : null;
    const isStructured =
      rawP &&
      Object.keys(rawP).some((k) => roles.includes(k)) &&
      Object.keys(rawP).every(
        (k) =>
          !roles.includes(k) ||
          (rawP[k] && typeof rawP[k] === "object" && !Array.isArray(rawP[k]))
      );

    if (isStructured) {
      for (const role of roles) {
        if (!rawP[role] || typeof rawP[role] !== "object") continue;
        const e = rawP[role];
        const label = String(e.label || role).trim().slice(0, 40) || role;
        pressure[role] = {
          label,
          pressure: Math.min(5, Math.max(0, Math.round(Number(e.pressure) || 2))),
          pressureRise: Math.min(
            3,
            Math.max(0, Math.round(Number(e.pressureRise ?? 1) || 0))
          ),
          winMax: Math.min(5, Math.max(0, Math.round(Number(e.winMax ?? 1) || 0))),
        };
      }
    } else if (rawP) {
      // Legacy flat → map first three keys to local/global/support
      const entries = Object.entries(rawP).slice(0, 3);
      entries.forEach(([k, v], i) => {
        const role = roles[i];
        const label = String(k).slice(0, 40);
        const n = typeof v === "object" && v != null ? Number(v.pressure) : Number(v);
        pressure[role] = {
          label,
          pressure: Math.min(5, Math.max(0, Math.round(n || 2))),
          pressureRise: Math.min(
            3,
            Math.max(
              0,
              Math.round(
                Number(
                  (typeof v === "object" && v?.pressureRise) ??
                    raw.pressureRise?.[k] ??
                    (i === entries.length - 1 ? 0 : 1)
                ) || 0
              )
            )
          ),
          winMax: Math.min(
            5,
            Math.max(
              0,
              Math.round(
                Number(
                  (typeof v === "object" && v?.winMax) ?? raw.winMax?.[k] ?? 1
                ) || 0
              )
            )
          ),
        };
      });
    }
    if (!Object.keys(pressure).length) {
      pressure = {
        local: { label: "Pressure", pressure: 2, pressureRise: 1, winMax: 1 },
        global: { label: "Capacity", pressure: 2, pressureRise: 1, winMax: 1 },
        support: { label: "Trust", pressure: 1, pressureRise: 0, winMax: 1 },
      };
    }
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

  const groundNote = groundingExcerpt(context, 400);
  const reasonOut = groundNote
    ? `${reason} (Quest grounding on file — treat as capability source-of-truth.)`
    : reason;
  return {
    source: "local",
    timing: { level, reason: reasonOut },
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

function resolveFocusTech(context) {
  const map = techMap(context);
  const focusId = String(context.focusTechId || (context.selectedTechIds || [])[0] || "");
  return map.get(focusId) || null;
}

function localIdeaSparksResult(context, base) {
  const tech = resolveFocusTech(context);
  const empty = {
    source: "local",
    message: "Select a tech first, then open Ideas.",
    proposals: { ...base },
    teaching: [],
    ideas: [],
  };
  if (!tech) return empty;
  const ideas = context.refresh
    ? rotateLocalIdeaSparks(tech, context, context.avoidTitles || [])
    : localIdeaSparks(tech, context);
  return {
    source: "local",
    message: `Three angles for **${tech.name || tech.id}** here. Pick one to seed how-it-works — then rewrite it so it's yours.`,
    proposals: { ...base },
    teaching: [],
    ideas,
  };
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

  if (mode === "idea-sparks") {
    return localIdeaSparksResult(context, base);
  }

  if (mode === "evaluate-neighbors") {
    const givens = context.hexEval?.givens || [];
    const lights = givens.map((g) => {
      const n = Array.isArray(g.neighbors) ? g.neighbors : [];
      const priorLv = String(g.prior?.level || "").toLowerCase();
      const priorOk =
        priorLv === "red" || priorLv === "yellow" || priorLv === "green";
      if (!n.length) {
        return {
          id: g.id,
          level: "red",
          reason: g.prior?.note || "Still unanswered.",
        };
      }
      let level = priorOk ? priorLv : "yellow";
      // Concerns: offline never awards green
      if (g.kind === "concern" && level === "green") level = "yellow";
      const mature = n.some((x) => x.mature);
      if (!priorOk) {
        if (mature) level = g.kind === "concern" ? "yellow" : "green";
        else level = "yellow";
      }
      return {
        id: g.id,
        level,
        reason:
          g.prior?.note ||
          (mature
            ? "A mature idea is touching this light."
            : "An idea touches but may not be enough yet."),
      };
    });
    return {
      source: "local",
      message: "Board lights updated from pathway clusters.",
      proposals: base,
      teaching: [],
      lights,
    };
  }

  if (mode === "score-pathway") {
    const invs = Array.isArray(context.pathway?.inventions)
      ? context.pathway.inventions
      : [];
    const howLen = invs
      .map((n) => String(n.howText || "").trim())
      .join("\n").length;
    const mature = invs.some((n) => n.mature || n.timingLevel === "green");
    const crisisDelta = { local: 0, global: 0, support: 0 };
    if (mature && howLen >= 40) {
      crisisDelta.local = -1;
      crisisDelta.support = -1;
    } else if (howLen >= 20) {
      crisisDelta.local = -1;
    }
    const concerns = {};
    for (const c of context.concerns || []) {
      const angle = c?.angle;
      if (!angle) continue;
      concerns[angle] = {
        level: invs.length ? "yellow" : "red",
        reason: invs.length
          ? "Pathway may address this concern — confirm honesty."
          : "Still unanswered.",
      };
    }
    return {
      source: "local",
      crisisDelta,
      concerns,
    };
  }

  if (mode === "evaluate-convergence") {
    const placed = context.placed || {};
    const nabes = Array.isArray(context.neighbors) ? context.neighbors : [];
    const convergences = nabes.map((n) => {
      const a = {
        id: placed.id,
        kind: "invention",
        techId: placed.techId,
        polarity: placed.polarity,
        howText: placed.howText || placed.howText,
      };
      const b = {
        id: n.id,
        kind: "invention",
        techId: n.techId,
        polarity: n.polarity,
        howText: n.howText || n.howText,
      };
      const converges = heuristicConverges(a, b);
      const na = String(placed.techName || a.techId || "one field");
      const nb = String(n.techName || b.techId || "the other");
      return {
        neighborId: n.id,
        converges,
        title: converges ? `${na} × ${nb}`.slice(0, 60) : "",
        reason: converges
          ? `Progress in ${na} honestly accelerates ${nb} — better capability, cost, or scale. More or better ${nb} then pulls demand back onto ${na}.`
          : "",
      };
    });
    return { source: "local", convergences };
  }

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
      speech = `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design — that is how the system works.”`;
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

  if (mode === "scrutinize") {
    return {
      source: "local",
      message: "Four hard questions are on the table — ease their lights.",
      proposals: {
        ...base,
        scrutiny: localScrutinyProposals(context),
      },
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
        `Your move: what constraint matters most — cost, equity, speed, or beauty?` +
        (context.hexInvent
          ? ` Or hit **Invent with** on a suggested emTech, then Ask for ideas or write how it works.`
          : ` Or hit **Apply techs** and we'll build on them.`),
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
        (context.hexInvent
          ? `Hit **Invent with** on a category, then Ask for ideas or mint a tile — friction is where invention lives.`
          : `Apply the techs, then tell me what feels wrong — friction is where invention lives.`),
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
      proposals: { ...base, inventionName: context.hexInvent ? null : name },
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
        (context.hexInvent
          ? `\n\nHit **Use as how it works** to drop this in the mint box, then Mint tile if it feels like yours. What's the one step only a human should still own?`
          : `\n\nEdit it until it sounds like *your* invention. What's the one step only a human should still own?`),
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

  if (mode === "sit") {
    return localSitInvent(context, selected, stack, map, base);
  }

  if (mode === "scamper") {
    return localScamperInvent(context, selected, stack, map, base);
  }

  if (mode === "assess-feasibility") {
    return localAssessFeasibility(context, selected, map, base);
  }

  if (mode === "generate-scenarios") {
    return localGenerateScenarios(context, base);
  }

  // free chat — heuristic reply
  const lower = lastUser.toLowerCase();
  const tutorPrefix = isTutorMode(context)
    ? `**Tutor:** Let's take this one step at a time. `
    : "";
  let message =
    tutorPrefix +
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
    chat:
      "Respond to the learner's latest message as co-inventor. Never say a category is locked until a year." +
      GROUNDING_HINT,
    spark:
      "Ignite the session: frame the challenge, suggest 2–3 starting tech directions (as proposals.addTechIds only if they have none), and ask one great question. Do not fully invent for them. Remind categories are always pickable." +
      GROUNDING_HINT,
    "idea-sparks":
      "Return exactly 3 application SPARKS for context.focusTechId in this place and year. Top-level ideas array of 3 objects: { id (slug), title (\u226460 chars), blurb (\u2264140), insertText/howText (\u2264280), imagePrompt (\u2264400), year }. Three DIFFERENT angles. Pilot-honest. title is a plain noun phrase a learner can say aloud (what the idea is, not a slogan; no coined slang). howText/insertText is one clear mechanism sentence in everyday words, using the named person/place when known. Leave proposals empty. If context.refresh is true, do not repeat context.avoidTitles." +
      GROUNDING_HINT,
    "evaluate-neighbors":
      "Judge hex-board traffic lights for context.hexEval.givens from EACH given's FULL reachable invention pathway (neighbors[] + pathway howText/techIds; direct:true = edge contact) plus playerAnswer if present. Judge the combination as one invent. Crisis: role criteria — local = here-and-now / local fit; global = root cause / sustainable; support = public buy-in + scale beyond pilot; honor prior; green OK when honest. Concern: judge against stored challengeSpeech/challengeQuestion AND playerAnswer — hard question honestly answered by the pathway plus written answer? Docked concerns may be red, yellow, or green. Green only if the pathway honestly holds the answer. Return lights: [{id, level:red|yellow|green, reason}]. Do not rewrite inventions. Leave proposals empty." +
      GROUNDING_HINT,
    "score-pathway":
      "Score ONE invention pathway in context.pathway.inventions (techId + howText + timing; no names) as a combination. Return crisisDelta: {local, global, support} integers -2..+1 (negative eases pressure if pathway docks that meter). Return concerns: {[angle]: {level:red|yellow|green, reason}} for context.concerns angles vs their challengeSpeech/challengeQuestion plus playerAnswer if present. Docked concerns may be red, yellow, or green. Green only if the pathway honestly holds the answer. Leave proposals empty." +
      GROUNDING_HINT,
    scrutinize:
      "Stress-test the pathway from FOUR angles: moloch, ethicist, stakeholder, nature. Read inventionHow and context.hexBoard (placed invention tiles) as the invent. Fill proposals.scrutiny with all four keys; each value is { analysis (2–4 sentences attacking THIS local invent), safeguard (one concrete move that would honestly address it), imagePrompt (≤400 chars, photoreal still of that concern in this place — no text/logos) }. Leave addTechIds/removeTechIds/inventionHow/name/impact empty/null. message: one short line that the hard questions are on the table." +
      GROUNDING_HINT,
    "suggest-stack":
      "Propose a coherent technology stack for this challenge. Explain why each piece matters. Put ids in proposals.addTechIds (and removeTechIds if swapping)." +
      GROUNDING_HINT,
    "draft-name":
      "Propose 2–3 invention name options in message, and put your single best pick in proposals.inventionName.",
    "draft-how":
      "Co-draft how the invention works using their current stack. Put the draft in proposals.inventionHow. Teach how the techs connect. Prefer pilot-honest near-term claims for the current year." +
      GROUNDING_HINT,
    "draft-impact":
      "Co-draft everyday life in a world where this works. Put draft in proposals.inventionImpact. Make it sensory and specific." +
      GROUNDING_HINT,
    "push-further":
      "Timing and fit check on CLAIMS vs year (not category locks): wait for better world conditions vs revise how-it-works. Missing capability if any. Do not force multi-domain." +
      GROUNDING_HINT,
    "explain-techs":
      "Teach the currently selected technologies (or recommended ones if none)." +
      GROUNDING_HINT,
    "art-of-the-possible":
      "Capability literacy for selected stack (or recommended if empty) at context.year in context.place. Structure message along the chain when useful: product category (not bare emTech dump), what works NOW, trends/predictions (labeled forecasts), recent milestones, use cases unlocked, inventable application categories, near (2–5y), frontier stretch. Use maturity/milestones/useCasesNow on availableTechs as baseline; when context.grounding is present, prefer its product category and chain as Quest source-of-truth. Enrich carefully. Never imply a category is locked. teaching blurbs welcome. proposals usually empty." +
      GROUNDING_HINT,
    sit:
      "Systematic Inventive Thinking (SIT) — Soviet TRIZ-inspired 'thinking in a box'. The learner already wrote context.inventionHow; remix THAT idea (plus name/stack/place), not a blank-slate invent. Produce FOUR short variants, one per lens:\n" +
      "1) **Subtraction** — remove an essential component/step and re-solve the function with what remains.\n" +
      "2) **Division** — split product/process in time, space, or scale (parts that were whole).\n" +
      "3) **Multiplication** — copy a component/step and change the copy in a useful way.\n" +
      "4) **Addition** — add a closed-world element already present in the system, or assign a new job to an existing part (task unification as addition).\n" +
      "Closed world: prefer recombining elements already named in how-it-works and the stack; avoid open-ended blue-sky tech. Stay local to place/year. Message structure: one-line SIT framing, then the four headed variants (2–4 sentences each + one why-it-might-win line). Brainstorm only — leave proposals empty (inventionHow, inventionName, inventionImpact, addTechIds all empty/null). Do NOT offer an Apply how-it-works draft; the learner rewrites their own story if inspired. Never say categories are year-locked." +
      GROUNDING_HINT,
    scamper:
      "SCAMPER invent (Osborn/Eberle checklist) — more open than SIT, but still remix the learner's context.inventionHow (plus name/stack/place), not a blank-slate invent. Produce SEVEN short variants, one per letter:\n" +
      "1) **Substitute** — replace a material, actor, step, or channel.\n" +
      "2) **Combine** — merge functions, audiences, or steps.\n" +
      "3) **Adapt** — borrow a pattern from a nearby domain or familiar local practice.\n" +
      "4) **Modify** — change scale, intensity, frequency (magnify or minify).\n" +
      "5) **Put to other uses** — same system, second job or audience.\n" +
      "6) **Eliminate** — remove a step/component and still deliver value.\n" +
      "7) **Reverse / Rearrange** — flip sequence, roles, or cause-effect.\n" +
      "Stay local to place/year. Message structure: one-line SCAMPER framing, then the seven headed variants (2–4 sentences each + one why-it-might-win line). Brainstorm only — leave proposals empty (inventionHow, inventionName, inventionImpact, addTechIds all empty/null). Do NOT offer an Apply how-it-works draft; the learner rewrites their own story if inspired. Never say categories are year-locked. Do not confuse with SIT closed-world templates — SCAMPER may Adapt from outside the draft." +
      GROUNDING_HINT,
    "assess-feasibility":
      "Judge claim timing only: is this mechanism possible or already demonstrated in context.year? Do not judge quest fit, clinic job, or hopper vs heavy-lift category. If grounding is present, it is authoritative only on contradiction: an explicit limit, denial, or not-yet. Examples are not a closed inventory; smaller examples do not cap payload. Different category is not does-not-exist. Return timing: { level: red|yellow|green, reason: one sentence }. green = architecture+payload demonstrated by year (no pilot tax). yellow = vague or scale not yet demonstrated after checking year. red = only explicit grounding forbid/not-yet, or sci-fi as routine. Never red/yellow merely for different category or not a small hopper. Same claims at a later year must not score worse than priorTiming. message can briefly echo the reason. proposals empty.",
    "complete-picture":
      "Player wrote only one story face. storyFace in context is 'how' or 'life'. If storyFace=how, fill proposals.inventionImpact only (everyday life). If storyFace=life, fill proposals.inventionHow only (mechanism). Do not overwrite the face they wrote. Keep local and tied to the tech stack. If context.contributingToOther, extend their invent additively — never replace their core idea." +
      GROUNDING_HINT,
    "judge-contribution":
      "Multiplayer contribution check. Context has field, beforeText, afterText (and optional full invent). Decide if afterText is ADDITIVE vs DESTRUCTIVE relative to beforeText. Additive keeps original actors/mechanisms/intent and adds detail; destructive rewrites, clears, or strips core meaning. Return JSON with top-level additive (boolean) and reason (one sentence). message may echo the reason. proposals empty.",
    "pose-challenge":
      "Speak ONLY as context.challengeAngle (moloch|ethicist|stakeholder|nature). Attack this invent in 2–4 sentences; one question. Return angle, angleLabel, challengeSpeech, challengeQuestion. Keep speech under ~120 words." +
      GROUNDING_HINT +
      " Stay hostile but do not invent capability limits that contradict grounding.",
    "judge-scrutiny-move":
      "The learner Argues against a fixed challenger (context.challengeAngle, challengeSpeech, challengeQuestion, playerAnswer). Score their argument as quality: hit | glance | miss. hit = concrete actors/costs/limits/mechanics that answer the question; glance = partial substance; miss = vague hope or off-topic. Return top-level: quality, message (1-2 sentences feedback), damage (hit=2, glance=1, miss=0). Be fair but strict on freeriding and handwaving." +
      GROUNDING_HINT,
    "judge-challenge":
      "Judge the learner's answer to the challenge (context has challengeSpeech, challengeQuestion, playerAnswer, challengeAngle). Return top-level verdict: pass | partial | fail, message (feedback), lesson (one teaching sentence). Be fair: concrete mechanisms, named actors, costs, or physical limits = pass/partial. Vague hope = fail." +
      GROUNDING_HINT,
    "coach-challenge":
      "The learner is stuck on the challenge step. Context has challengeAngle, challengeSpeech, challengeQuestion, invention details. Coach them: explain what this angle cares about, give 2–4 concrete hint bullets for THIS local invention (not generic theory). Do NOT write a full ready-to-submit answer unless they clearly asked to draft. Put coaching in message. Optional top-level field draftAnswer only if mode intent is draft (see draft-challenge)." +
      GROUNDING_HINT,
    "draft-challenge":
      "Write a solid draft answer the learner can edit and submit to the challenge. Context has challengeAngle, challengeSpeech, challengeQuestion, invention how/impact, techs, place. Draft must be specific to their invention: name actors, costs or physical limits, anti-defection or affordability moves as relevant. Put full draft in top-level draftAnswer AND a short coaching note in message. Do not auto-judge." +
      GROUNDING_HINT,
    "generate-scenarios":
      "Generate MULTIPLE distinct local Quests (crisis episodes) for context.globalTheme (a global problem). Return top-level scenarios: an array of 4 objects (or context.scenarioCount) — wire field name stays 'scenarios' for compatibility. Each Quest MUST be a concrete place living a piece of the global problem — different geographies, stakeholders, and angles (not renames of the same story). Each scene MUST include BOTH (1) lived local harm people feel now AND (2) a local driver/system that keeps producing the theme problem — not only how people shelter from symptoms (e.g. air pollution: name trucks/cookfuel/stacks, not only indoor filters). " +
      SCENE_PROSE +
      " Include seedMissions as curated baselines if provided, then invent NEW ones that do not duplicate them. Each object fields: id (slug), title, place, scene, stakeholder, startYear (2026), collapseYear (2032–2036), yearsPerTurn (2), pressure (structured — see CRITICAL), suggested (array of tech ids from availableTechs only — mix protection and abatement when relevant), visionTheme (one of: coastal-city, food-city, care-city, energy-city, learn-city, rebuild-city, social-city, ocean-city), source ('curated' or 'generated'). CRITICAL — pressure is an object with up to three role keys: local, global, support. Omit a role to hide that crisis meter on the HUD. Each present role: { \"label\": \"plain English HUD name 1–3 words Title Case\", \"description\": \"1-3 everyday sentences of what this meter means in this place\", \"pressure\": 0-5, \"pressureRise\": 0-3, \"winMax\": 0-5 }. local = lived local harm; global = systemic/driver; support = trust/legitimacy/fear. description is place-specific strain, not the generic role lecture. NEVER camelCase jargon labels (bad: AlleyPM, BenzeneSpikes, CorridorPM). Default full Quest uses all three roles. message: one short line inviting the learner to pick a Quest. proposals empty. Also follow context.guidance when present.",
  };

  if (context?.hexInvent) {
    for (const key of ["chat", "spark", "suggest-stack", "draft-how", "draft-name"]) {
      if (modeHints[key]) modeHints[key] += HEX_INVENT_HINT;
    }
  }

  // Prefer selected techs with full capability seeds for literacy modes
  const selectedIds = new Set(context?.selectedTechIds || []);
  const focusTechs = available.filter((t) => selectedIds.has(t.id));

  const grounding = resolveGrounding(context);
  const tutorMode = isTutorMode(context);
  const aiTutorContext = tutorMode ? resolveTutorContext(context) : null;
  const tutorModes = new Set([
    "chat",
    "spark",
    "suggest-stack",
    "draft-how",
    "draft-impact",
    "push-further",
    "explain-techs",
    "art-of-the-possible",
    "sit",
    "scamper",
    "complete-picture",
  ]);
  const baseHint = modeHints[mode] || modeHints.chat;
  const modeInstruction =
    tutorMode && tutorModes.has(mode || "chat")
      ? baseHint + TUTOR_HINT
      : baseHint;

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
      grounding,
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
    modeInstruction,
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
    grounding,
    isLearningModule: tutorMode,
    tutorMode,
    aiTutorContext,
    focusTechId: context?.focusTechId || null,
    hexInvent: Boolean(context?.hexInvent),
    hexEval: context?.hexEval || null,
    hexBoard: context?.hexBoard || null,
    pathway: context?.pathway || null,
    pressureBase: context?.pressureBase || null,
    winMax: context?.winMax || null,
    crisisRoles: context?.crisisRoles || null,
    concerns: context?.concerns || null,
    challengeAngle: context?.challengeAngle || null,
    challengeSpeech: context?.challengeSpeech
      ? String(context.challengeSpeech).slice(0, 800)
      : null,
    challengeQuestion: context?.challengeQuestion
      ? String(context.challengeQuestion).slice(0, 400)
      : null,
    playerAnswer: context?.playerAnswer
      ? String(context.playerAnswer).slice(0, 2000)
      : null,
    priorTiming: context?.priorTiming || null,
    refresh: Boolean(context?.refresh),
    avoidTitles: Array.isArray(context?.avoidTitles)
      ? context.avoidTitles.slice(0, 12)
      : null,
    designRule:
      "emTech categories are always pickable; feasibility timing judges claims in how-it-works vs year." +
      (grounding
        ? " When grounding is present, treat it as authoritative Quest source-of-truth."
        : "") +
      (tutorMode
        ? " Tutor mode: one current idea; short teaching paragraph (analogy + one mechanism); no quizzes; answer the question they asked; explain unfamiliar terms on first use; use aiTutorContext as hidden curriculum; explain first then at most one matching lesson link — never a URL alone, never rewrite a page, never send them away to invent."
        : ""),
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

function sanitizeResult(parsed, availableIds, source = "ai", mode = "chat") {
  const ids = new Set(availableIds);
  // SIT / SCAMPER / idea-sparks are brainstorm sparks — never offer Apply how-it-works
  const brainstormOnly =
    mode === "sit" ||
    mode === "scamper" ||
    mode === "idea-sparks" ||
    mode === "evaluate-neighbors" ||
    mode === "score-pathway";
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
  const addTechIds = brainstormOnly
    ? []
    : (Array.isArray(proposals.addTechIds) ? proposals.addTechIds : [])
        .map(String)
        .filter((id) => ids.has(id));
  const removeTechIds = brainstormOnly
    ? []
    : (Array.isArray(proposals.removeTechIds) ? proposals.removeTechIds : [])
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
      inventionName: brainstormOnly
        ? null
        : proposals.inventionName != null && String(proposals.inventionName).trim()
          ? String(proposals.inventionName).trim().slice(0, 80)
          : null,
      inventionHow: brainstormOnly
        ? null
        : proposals.inventionHow != null && String(proposals.inventionHow).trim()
          ? String(proposals.inventionHow).trim().slice(0, 2500)
          : null,
      inventionImpact: brainstormOnly
        ? null
        : proposals.inventionImpact != null && String(proposals.inventionImpact).trim()
          ? String(proposals.inventionImpact).trim().slice(0, 2500)
          : null,
      scrutiny: brainstormOnly ? null : sanitizeScrutiny(proposals.scrutiny),
    },
    teaching,
  };

  if (mode === "idea-sparks") {
    out.ideas = ideasOrFallback(parsed.ideas, null);
  }

  // Tutor session exit signal (learning modules)
  if (parsed.endTutoring === true || parsed.endTutoring === "true") {
    out.endTutoring = true;
  }

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

async function aiCoInvent(body, client, meta = {}) {
  const mode = body.mode || "chat";
  const context = body.context || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const availableIds = (context.availableTechs || []).map((t) => t.id);
  const sessionId = meta.sessionId || clientSessionFromBody(body);

  const fastSpec = FAST_EVAL_MODES[mode];
  const isTutor =
    !fastSpec && isTutorMode(context) && mode !== "generate-scenarios";
  const searchTools = searchToolsForMode(mode, AI_SEARCH_ENABLED);
  let systemContent = fastSpec
    ? fastSpec.system
    : isTutor
      ? TUTOR_SYSTEM_PROMPT
      : SYSTEM_PROMPT;
  if (searchTools) {
    systemContent = `${systemContent}\n${SEARCH_SYSTEM_LINE}`;
  }
  const userContent = fastSpec
    ? fastEvalUserContent(mode, context)
    : isTutor
      ? `Tutor session state and conversation (JSON):\n${buildUserPayload({ messages, context, mode })}\n\n` +
        `Respond with the required JSON object only. One current idea in a short teaching paragraph (4–8 sentences); full sentences; no quiz questions; answer the learner's question.`
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
    temperature: fastSpec
      ? fastSpec.temperature
      : mode === "generate-scenarios"
        ? 0.55
        : 0.8,
  };
  if (fastSpec) {
    createOpts.max_output_tokens = fastSpec.maxOutputTokens;
    // grok-4.6 defaults to high reasoning; eval JSON does not need it.
    createOpts.reasoning = { effort: "low" };
  }
  if (searchTools) {
    createOpts.tools = searchTools;
    createOpts.include = ["no_inline_citations"];
    const bump = SEARCH_MAX_OUTPUT_TOKENS[mode];
    if (bump) createOpts.max_output_tokens = bump;
  }

  const t0 = Date.now();
  let response;
  try {
    response = await client.responses.create(createOpts);
  } catch (e) {
    recordAiText({
      mode,
      source: "error",
      model: MODEL,
      usage: null,
      latencyMs: Date.now() - t0,
      ok: false,
      sessionId,
    });
    throw e;
  }

  recordAiText({
    mode,
    source: "ai",
    model: MODEL,
    usage: response.usage || null,
    latencyMs: Date.now() - t0,
    ok: true,
    sessionId,
  });

  const text = response.output_text || "";
  const parsed = extractJson(text);
  if (!parsed) {
    if (isFastEvalMode(mode)) {
      return localCoInvent({ mode, messages, context });
    }
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
  if (isFastEvalMode(mode)) {
    return sanitizeFast(mode, parsed, "ai", context);
  }
  if (mode === "generate-scenarios") {
    return sanitizeScenariosResult(parsed, context, "ai");
  }
  const out = sanitizeResult(parsed, availableIds, "ai", mode);
  if (mode === "evaluate-neighbors") {
    const raw = Array.isArray(parsed.lights) ? parsed.lights : [];
    out.lights = raw
      .filter((L) => L && L.id && ["red", "yellow", "green"].includes(String(L.level).toLowerCase()))
      .map((L) => ({
        id: String(L.id),
        level: String(L.level).toLowerCase(),
        reason: String(L.reason || "").slice(0, 280),
      }));
  }
  return out;
}

async function handleCoInvent(body) {
  const context = body.context || {};
  const mode = body.mode || "chat";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const sessionId = clientSessionFromBody(body);
  if (sessionId) usage.touchSession(sessionId);

  let client = await getClient();
  if (!client) {
    const local = localCoInvent({ mode, messages, context });
    recordAiText({
      mode,
      source: "local",
      model: null,
      usage: null,
      latencyMs: 0,
      ok: true,
      sessionId,
    });
    return local;
  }

  try {
    return await aiCoInvent(body, client, { sessionId });
  } catch (e) {
    const msg = String(e?.message || e);
    console.error("[co-invent ai]", msg.slice(0, 200));

    // One retry with forced SuperGrok token refresh
    if (/incorrect api key|invalid.*key|401|unauthorized|expired/i.test(msg)) {
      try {
        client = await getClient({ forceRefresh: true });
        if (client) return await aiCoInvent(body, client, { sessionId });
      } catch (e2) {
        console.error("[co-invent retry]", String(e2?.message || e2).slice(0, 200));
      }
    }

    const local = localCoInvent({ mode, messages, context });
    local.message =
      `*(Co-inventor temporarily offline; local partner here.)*\n\n` + local.message;
    recordAiText({
      mode,
      source: "local",
      model: null,
      usage: null,
      latencyMs: 0,
      ok: true,
      sessionId,
    });
    return local;
  }
}

/* —— Future vision (Imagine) —— */

const IMAGE_MODEL = process.env.FF_XAI_IMAGE_MODEL || "grok-imagine-image";
/** @type {Map<string, object>} */
const visionSessions = new Map();
/** Cache market news illustrations by event id (no invent context). */
const marketImageCache = new Map();
/** Cache idea-card thumbnails by client-provided id. */
const ideaImageCache = new Map();

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
  const t0 = Date.now();
  let data;
  if (mode === "edit") {
    data = await xaiImageRequest("/images/edits", {
      model: IMAGE_MODEL,
      prompt,
      image: {
        url: prevDataUrl,
        type: "image_url",
      },
      response_format: "b64_json",
      aspect_ratio: "16:9",
    });
  } else {
    data = await xaiImageRequest("/images/generations", {
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      response_format: "b64_json",
      aspect_ratio: "16:9",
    });
  }
  // Attach latency for callers that want to log without a second timer
  if (data && typeof data === "object") {
    data._latencyMs = Date.now() - t0;
  }
  return data;
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
  const clientSessionId = clientSessionFromBody(body);
  if (clientSessionId) usage.touchSession(clientSessionId);
  const fingerprint = visionFingerprint(body);
  const force = Boolean(body.force);
  /** Followers only consume the shared cache — never generate a divergent image */
  const followOnly = Boolean(body.followOnly);
  const prev = visionSessions.get(sessionId);
  const stageId = body.stage?.id || "present";

  // Multiplayer followers: return whatever the owner last generated for this session
  if (followOnly) {
    recordAiImage({
      kind: "vision",
      mode: prev?.mode || "generate",
      source: "follow",
      imageCount: 0,
      ok: true,
      sessionId: clientSessionId,
    });
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
    recordAiImage({
      kind: "vision",
      mode: prev.mode || "generate",
      source: "cache",
      imageCount: 0,
      ok: true,
      sessionId: clientSessionId,
    });
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
  let shot = await resolveShot(body, prev, worldCard, {
    client,
    model: MODEL,
    onAiTextUsage: (info) => {
      recordAiText({
        mode: info.mode || "vision-director",
        source: info.source || "ai",
        model: info.model || MODEL,
        usage: info.usage,
        latencyMs: info.latencyMs,
        ok: info.ok !== false,
        sessionId: clientSessionId,
      });
    },
  });

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
      try {
        data = await runVisionImage("generate", prompt, null);
      } catch (e2) {
        recordAiImage({
          kind: "vision",
          mode: usedMode,
          source: "error",
          imageCount: 0,
          latencyMs: null,
          ok: false,
          sessionId: clientSessionId,
        });
        throw e2;
      }
    } else {
      recordAiImage({
        kind: "vision",
        mode,
        source: "error",
        imageCount: 0,
        ok: false,
        sessionId: clientSessionId,
      });
      throw e;
    }
  }

  recordAiImage({
    kind: "vision",
    mode: usedMode,
    source: "live",
    imageCount: 1,
    usage: data?.usage || null,
    latencyMs: data?._latencyMs ?? null,
    ok: true,
    sessionId: clientSessionId,
  });

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
  const clientSessionId = clientSessionFromBody(body);
  if (clientSessionId) usage.touchSession(clientSessionId);
  if (!id) {
    return { ok: false, error: "missing_id" };
  }
  const cached = marketImageCache.get(id);
  if (cached?.imageUrl) {
    recordAiImage({
      kind: "market",
      mode: "generate",
      source: "cache",
      imageCount: 0,
      ok: true,
      sessionId: clientSessionId,
    });
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
    recordAiImage({
      kind: "market",
      mode: "generate",
      source: "live",
      imageCount: 1,
      usage: data?.usage || null,
      latencyMs: data?._latencyMs ?? null,
      ok: true,
      sessionId: clientSessionId,
    });
    return {
      ok: true,
      cached: false,
      imageUrl,
      model: IMAGE_MODEL,
      id,
    };
  } catch (e) {
    console.warn("[market-image]", e.message || e);
    recordAiImage({
      kind: "market",
      mode: "generate",
      source: "error",
      imageCount: 0,
      ok: false,
      sessionId: clientSessionId,
    });
    return {
      ok: false,
      error: String(e.message || "generate_failed").slice(0, 200),
      imageUrl: null,
      id,
    };
  }
}

/**
 * Lightweight Imagine generate for idea-card thumbnails.
 * Cached by client id (tech + idea + place + year hash).
 */
async function handleIdeaImage(body) {
  const id = String(body?.id || "").slice(0, 80);
  const clientSessionId = clientSessionFromBody(body);
  if (clientSessionId) usage.touchSession(clientSessionId);
  if (!id) {
    return { ok: false, error: "missing_id" };
  }
  const cached = ideaImageCache.get(id);
  if (cached?.imageUrl) {
    recordAiImage({
      kind: "idea",
      mode: "generate",
      source: "cache",
      imageCount: 0,
      ok: true,
      sessionId: clientSessionId,
    });
    return {
      ok: true,
      cached: true,
      imageUrl: cached.imageUrl,
      model: IMAGE_MODEL,
      id,
    };
  }

  const rawPrompt = String(body?.prompt || "").slice(0, 700);
  const kind = String(body?.kind || "idea").toLowerCase();
  const prompt =
    kind === "challenger"
      ? [
          "Photoreal 4:3 documentary still of a local pressure or hard question facing a community pathway.",
          "Natural light, grounded, no readable text, no logos, no watermarks, no named real people.",
          rawPrompt ||
            "People and place under a concrete social, ethical, or natural-world pressure.",
        ].join(" ")
      : [
          "Photoreal 4:3 documentary still of a local emerging-tech application.",
          "Natural light, grounded, no readable text, no logos, no watermarks, no named real people.",
          rawPrompt || "People using a practical tool in a specific neighborhood.",
        ].join(" ");

  try {
    const data = await runVisionImage("generate", prompt, null);
    const imageUrl = await normalizeVisionDataUrl(data);
    ideaImageCache.set(id, { imageUrl, prompt, updatedAt: Date.now() });
    if (ideaImageCache.size > 80) {
      const oldest = [...ideaImageCache.entries()].sort(
        (a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0)
      )[0];
      if (oldest) ideaImageCache.delete(oldest[0]);
    }
    recordAiImage({
      kind: "idea",
      mode: "generate",
      source: "live",
      imageCount: 1,
      usage: data?.usage || null,
      latencyMs: data?._latencyMs ?? null,
      ok: true,
      sessionId: clientSessionId,
    });
    return {
      ok: true,
      cached: false,
      imageUrl,
      model: IMAGE_MODEL,
      id,
    };
  } catch (e) {
    console.warn("[idea-image]", e.message || e);
    recordAiImage({
      kind: "idea",
      mode: "generate",
      source: "error",
      imageCount: 0,
      ok: false,
      sessionId: clientSessionId,
    });
    return {
      ok: false,
      error: String(e.message || "generate_failed").slice(0, 200),
      imageUrl: null,
      id,
    };
  }
}

/* —— Text-to-speech (xAI) —— */

/**
 * Proxy browser "Read out loud" to xAI TTS with shared server cache.
 * Same text+voice+language → one file for all users (memory + data/tts-cache/).
 * @param {object} body
 * @returns {Promise<{ buffer: Buffer, contentType: string, voice: string, charCount: number, latencyMs: number, cache: "hit"|"miss", key: string }>}
 */
async function handleTts(body) {
  const raw = normalizeTtsText(body?.text);
  if (!raw) {
    const err = new Error("text is required");
    err.status = 400;
    throw err;
  }
  if (raw.length > TTS_MAX_CHARS) {
    const err = new Error(`text exceeds ${TTS_MAX_CHARS} characters`);
    err.status = 400;
    throw err;
  }

  const voice =
    String(body?.voice_id || body?.voice || TTS_VOICE)
      .trim()
      .slice(0, 64) || TTS_VOICE;
  const language = String(body?.language || "en").trim().slice(0, 16) || "en";
  const sessionId = clientSessionFromBody(body);
  const key = ttsCacheKey({ text: raw, voice, language, fingerprint: "norm=0" });
  const t0 = Date.now();

  // Fast path: shared cache (no AI auth required)
  const cached = ttsCache.get(key);
  if (cached) {
    const latencyMs = Date.now() - t0;
    usage.record({
      type: "ai_tts",
      source: "cache",
      voice: cached.voice || voice,
      charCount: cached.charCount || raw.length,
      bytes: cached.buffer.length,
      latencyMs,
      ok: true,
      sessionId,
    });
    return {
      buffer: cached.buffer,
      contentType: cached.contentType || "audio/mpeg",
      voice: cached.voice || voice,
      charCount: cached.charCount || raw.length,
      latencyMs,
      cache: "hit",
      key,
    };
  }

  let entry;
  let cache;
  try {
    ({ entry, cache } = await ttsCache.getOrCreate(key, async () => {
      let token = await resolveAccessToken();
      if (!token) {
        const err = new Error(
          "AI not configured — sign in with SuperGrok or set FF_XAI_API_KEY"
        );
        err.status = 503;
        throw err;
      }

      const payload = {
        text: raw,
        voice_id: voice,
        language,
        text_normalization: false,
      };

      let res = await fetch(`${XAI_BASE}/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        token = await resolveAccessToken({ forceRefresh: true });
        if (token) {
          res = await fetch(`${XAI_BASE}/tts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!res.ok) {
        let detail = "";
        try {
          detail = (await res.text()).slice(0, 240);
        } catch {
          /* ignore */
        }
        const err = new Error(
          detail
            ? `TTS upstream ${res.status}: ${detail}`
            : `TTS upstream ${res.status}`
        );
        err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
        throw err;
      }

      const ab = await res.arrayBuffer();
      const buffer = Buffer.from(ab);
      return {
        buffer,
        contentType: res.headers.get("content-type") || "audio/mpeg",
        voice,
        language,
        charCount: raw.length,
      };
    }));
  } catch (e) {
    usage.record({
      type: "ai_tts",
      source: "error",
      voice,
      charCount: raw.length,
      latencyMs: Date.now() - t0,
      ok: false,
      sessionId,
    });
    throw e;
  }

  const latencyMs = Date.now() - t0;

  usage.record({
    type: "ai_tts",
    source: cache === "miss" ? "ai" : "cache",
    voice: entry.voice || voice,
    charCount: entry.charCount || raw.length,
    bytes: entry.buffer.length,
    latencyMs,
    ok: true,
    sessionId,
  });

  return {
    buffer: entry.buffer,
    contentType: entry.contentType || "audio/mpeg",
    voice: entry.voice || voice,
    charCount: entry.charCount || raw.length,
    latencyMs,
    cache,
    key,
  };
}

/* —— HTTP —— */

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Admin-Token, X-FF-Secret",
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
    /** Public health — no LAN IPs / paths / room counts (Funnel-safe). */
    const publicHealth = {
      ok: true,
      coInventor: true,
      vision: ai,
      ai,
      auth: authInfo.source ? "configured" : null,
      rooms: ROOMS_ENABLED,
      features: {
        actionPoints: Boolean(GAME.features?.actionPoints),
        budgetWill: Boolean(GAME.features?.budgetWill),
        rooms: ROOMS_ENABLED,
        tts: ai,
        ttsVoice: TTS_VOICE,
      },
      usageEnabled: usage.enabled,
      developer: DEVELOPER_MODE,
      aiSearch: AI_SEARCH_ENABLED,
    };
    const admin = canSeeAdmin(req, {
      url: new URL(req.url || "/", `http://${req.headers.host || "localhost"}`),
    });
    if (!admin.ok) {
      return sendJson(res, 200, publicHealth);
    }
    const lanIps = listLanIpv4();
    return sendJson(res, 200, {
      ...publicHealth,
      auth: authInfo.source,
      model: MODEL,
      imageModel: IMAGE_MODEL,
      port: PORT,
      lanIps,
      lanUrls: lanIps.map((ip) => `http://${ip}:${PORT}`),
      roomStats: roomManager ? roomManager.stats() : null,
      usageDir: usage.enabled ? usage._dir : null,
      trustProxy: process.env.FF_TRUST_PROXY === "1",
      apiSecretRequired: Boolean(API_SECRET),
      maxRooms: MAX_ROOMS,
    });
  }

  if (req.method === "GET" && req.url?.startsWith("/api/usage")) {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const admin = canSeeAdmin(req, { url });
    if (!admin.ok) {
      return sendJson(res, admin.status || 403, {
        ok: false,
        error: admin.error || "admin_forbidden",
      });
    }
    return sendJson(res, 200, {
      ok: true,
      enabled: usage.enabled,
      ...usage.getSummary(),
    });
  }

  // —— Quest tiles: local folder (Library) + remote catalog (Sponsored/Learning) ——
  if (req.method === "GET" && (req.url === "/api/quests" || req.url?.startsWith("/api/quests?"))) {
    try {
      const forceRemote =
        typeof req.url === "string" && /[?&]refresh=1(?:&|$)/.test(req.url);
      const [scanned, remote] = await Promise.all([
        scanQuestsFolder(QUESTS_DIR),
        fetchRemoteQuestCatalog(QUESTS_REMOTE_URL, { force: forceRemote }),
      ]);
      const local = scanned.quests || [];
      const remoteQuests = remote.quests || [];
      // Merge for backward compat: remote wins on id
      const byId = new Map();
      for (const q of local) byId.set(q.id, q);
      for (const q of remoteQuests) byId.set(q.id, q);
      const quests = [...byId.values()];
      return sendJson(res, 200, {
        ok: true,
        dir: scanned.dir,
        remoteUrl: remote.url,
        remoteOk: remote.ok,
        remoteCached: remote.cached,
        local,
        remote: remoteQuests,
        count: quests.length,
        quests,
        errors: [...(scanned.errors || []), ...(remote.errors || [])],
      });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        error: e.message || "quests_scan_failed",
        dir: QUESTS_DIR,
        remoteUrl: QUESTS_REMOTE_URL,
        local: [],
        remote: [],
        quests: [],
      });
    }
  }

  // —— Capability trends (warmersun catalog) ——
  if (req.method === "GET" && (req.url === "/api/trends" || req.url?.startsWith("/api/trends?"))) {
    try {
      const forceRemote =
        typeof req.url === "string" && /[?&]refresh=1(?:&|$)/.test(req.url);
      const remote = await fetchRemoteTrendCatalog(TRENDS_REMOTE_URL, {
        force: forceRemote,
      });
      return sendJson(res, 200, {
        ok: true,
        url: remote.url,
        remoteOk: remote.ok,
        cached: remote.cached,
        count: (remote.trends || []).length,
        trends: remote.trends || [],
        errors: remote.errors || [],
      });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        error: e.message || "trends_fetch_failed",
        url: TRENDS_REMOTE_URL,
        trends: [],
        errors: [],
      });
    }
  }

  // —— Friends rooms (PR9) ——
  if (ROOMS_ENABLED && roomManager && req.method === "POST" && req.url === "/api/rooms") {
    try {
      const body = await readBody(req);
      const sid = clientSessionFromBody(body);
      if (sid) usage.touchSession(sid);
      const ip = clientIp(req);
      const result = roomManager.createRoom({
        displayName: body.displayName,
        ip,
      });
      return sendJson(res, result.ok ? 200 : result.status || 400, result);
    } catch (e) {
      return sendJson(res, errorStatus(e), {
        ok: false,
        error: e.message || "create_failed",
      });
    }
  }

  if (ROOMS_ENABLED && roomManager && req.method === "POST") {
    const joinMatch = req.url?.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join\/?$/);
    if (joinMatch) {
      try {
        const body = await readBody(req);
        const sid = clientSessionFromBody(body);
        if (sid) usage.touchSession(sid);
        const ip = clientIp(req);
        const result = roomManager.joinRoom(joinMatch[1].toUpperCase(), {
          displayName: body.displayName,
          playerToken: body.playerToken,
          ip,
        });
        return sendJson(res, result.ok ? 200 : result.status || 400, result);
      } catch (e) {
        return sendJson(res, errorStatus(e), {
          ok: false,
          error: e.message || "join_failed",
        });
      }
    }
    const hostMatch = req.url?.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/host\/?$/);
    if (hostMatch) {
      try {
        const body = await readBody(req);
        const room = roomManager.rooms.get(hostMatch[1].toUpperCase());
        if (!room) return sendJson(res, 404, { ok: false, error: "room_not_found" });
        // Only resolve playerToken inside this room (no cross-room host privilege)
        const player = roomManager.playerInRoom(room, body.playerToken);
        const result = roomManager.hostCommand(room, player, body.cmd, body);
        const status = result.ok
          ? 200
          : result.error === "unauthorized"
            ? 401
            : result.error === "not_host" || result.error === "not_quest_chooser"
              ? 403
              : 400;
        return sendJson(res, status, result);
      } catch (e) {
        return sendJson(res, errorStatus(e), {
          ok: false,
          error: e.message || "host_failed",
        });
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
      const player = roomManager.playerInRoom(room, token);
      if (!player) {
        return sendJson(res, 401, { ok: false, error: "unauthorized" });
      }
      return sendJson(res, 200, {
        ok: true,
        snapshot: roomManager.snapshotFor(room, player.id),
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/vision")) {
    try {
      const body = await readBody(req);
      const gate = gateExpensive(req, "vision", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
        });
      }
      const result = await handleVision(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[vision]", e.message || e);
      const status = errorStatus(e);
      return sendJson(res, status, {
        ok: false,
        error: e.message || "Vision generation failed",
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/idea-image")) {
    try {
      const body = await readBody(req);
      const gate = gateExpensive(req, "idea-image", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
        });
      }
      const result = await handleIdeaImage(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[idea-image]", e.message || e);
      const status = errorStatus(e);
      return sendJson(res, status, {
        ok: false,
        error: e.message || "Idea image generation failed",
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/market-image")) {
    try {
      const body = await readBody(req);
      const gate = gateExpensive(req, "market-image", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
        });
      }
      const result = await handleMarketImage(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[market-image]", e.message || e);
      const status = errorStatus(e);
      return sendJson(res, status, {
        ok: false,
        error: e.message || "Market image generation failed",
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/tts")) {
    try {
      const body = await readBody(req);
      const gate = gateExpensive(req, "tts", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
        });
      }
      const result = await handleTts(body);
      res.writeHead(200, {
        "Content-Type": result.contentType || "audio/mpeg",
        "Content-Length": result.buffer.length,
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "X-TTS-Voice": result.voice,
        "X-TTS-Chars": String(result.charCount),
        "X-TTS-Cache": result.cache || "miss",
        "X-TTS-Key": result.key || "",
      });
      return res.end(result.buffer);
    } catch (e) {
      console.error("[tts]", e.message || e);
      const status = errorStatus(e);
      return sendJson(res, status, {
        ok: false,
        error: e.message || "TTS failed",
      });
    }
  }

  if (req.method === "POST" && req.url?.startsWith("/api/co-invent")) {
    try {
      const body = await readBody(req);
      const gate = gateExpensive(req, "co-invent", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          error: gate.error || "rate_limited",
          source: "error",
          message:
            gate.error === "api_secret_required"
              ? "This server requires an API secret for co-inventor calls."
              : "Too many co-inventor requests — wait a moment and try again.",
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
      const result = await handleCoInvent(body);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error("[co-invent]", e.message || e);
      const status = errorStatus(e);
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

  if (req.method === "GET") return serveStatic(ROOT, req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

// Inject AI boundary into rooms (PR10) once handleCoInvent is in scope
if (roomManager) {
  roomManager.coInventHandler = (body) => handleCoInvent(body);
}

// WebSocket for friends rooms
if (ROOMS_ENABLED && roomManager) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/rooms",
    maxPayload: WS_MAX_PAYLOAD,
  });
  wss.on("connection", (socket, req) => {
    let bound = null; // { room, player }
    const ip = clientIp(req);

    socket.on("message", (raw) => {
      if (raw != null && Buffer.byteLength(String(raw)) > WS_MAX_PAYLOAD) {
        return safeWs(socket, { type: "error", error: "payload_too_large" });
      }
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return safeWs(socket, { type: "error", error: "bad_json" });
      }
      // #region agent log
      {
        const bytes = raw != null ? Buffer.byteLength(String(raw)) : 0;
        const aType = msg?.action?.type || msg?.cmd || null;
        const tiles = msg?.action?.payload?.hexBoard?.tiles || {};
        const art = Object.values(tiles).map((t) => String(t?.artUrl || ""));
        fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "0655d1",
          },
          body: JSON.stringify({
            sessionId: "0655d1",
            hypothesisId: "A",
            location: "server.mjs:ws-message",
            message: "ws inbound accepted",
            data: {
              type: msg?.type || "?",
              actionType: aType,
              bytes,
              limit: WS_MAX_PAYLOAD,
              tileCount: Object.keys(tiles).length,
              dataImageCount: art.filter((u) => u.startsWith("data:")).length,
              artUrlBytes: art.reduce((n, u) => n + u.length, 0),
              player: bound?.player?.displayName || null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion

      if (msg.type === "auth") {
        if (!costPolicy.allow("ws-auth", ip).ok) {
          return safeWs(socket, { type: "error", error: "rate_limited" });
        }
        const found = roomManager.findByPlayerToken(msg.token);
        if (!found) return safeWs(socket, { type: "error", error: "unauthorized" });
        bound = found;
        const sid = normalizeSessionId(msg.clientSessionId || msg.clientId);
        if (sid) usage.touchSession(sid);
        roomManager.bindSocket(found.room, found.player, socket);
        return safeWs(socket, {
          type: "hello",
          snapshot: roomManager.snapshotFor(found.room, found.player.id),
        });
      }

      if (!bound) return safeWs(socket, { type: "error", error: "auth_required" });

      const { room, player } = bound;
      // Token still belongs to this room seat
      if (!room.players.includes(player) || !roomManager.rooms.has(room.code)) {
        bound = null;
        return safeWs(socket, { type: "error", error: "room_gone" });
      }

      if (msg.type === "action") {
        const action = msg.action || msg;
        const aType = action?.type || "?";
        const t0 = Date.now();
        const actionKey = `${room.code}:${player.id}`;
        if (!costPolicy.allow("ws-action", actionKey).ok) {
          return safeWs(socket, {
            type: "reject",
            error: "rate_limited",
            actionType: aType,
          });
        }
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
        if (!costPolicy.allow("ws-request-ai", `${room.code}:${player.id}`).ok) {
          return safeWs(socket, { type: "reject", error: "rate_limited" });
        }
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
    // #region agent log
    socket.on("error", (err) => {
      fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "0655d1",
        },
        body: JSON.stringify({
          sessionId: "0655d1",
          hypothesisId: "C",
          location: "server.mjs:ws-error",
          message: "ws socket error (would crash if unhandled)",
          data: {
            code: err?.code || null,
            name: err?.name || null,
            errMessage: String(err?.message || err).slice(0, 200),
            limit: WS_MAX_PAYLOAD,
            player: bound?.player?.displayName || null,
            room: bound?.room?.code || null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      console.error(
        `[rooms] ws error ${bound?.room?.code || "?"} ${bound?.player?.displayName || "?"} ${err?.code || ""} ${err?.message || err}`
      );
    });
    // #endregion
  });
}

function shutdownUsage(signal) {
  try {
    usage.close();
  } catch (e) {
    console.warn("[usage] close failed:", e.message || e);
  }
  if (signal) {
    // allow default exit after flush when signal handlers are used
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shutdownUsage(sig);
    process.exit(0);
  });
}
process.on("beforeExit", () => {
  try {
    usage.flush();
  } catch {
    /* ignore */
  }
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use (${HOST}).\n` +
        `Stop the other Future Forge process, e.g.:\n` +
        `  fuser -k ${PORT}/tcp\n` +
        `  # or: pkill -f "node server.mjs"\n` +
        `Or start on another port: FF_PORT=8766 npm start`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, async () => {
  console.log(`Future Forge → http://127.0.0.1:${PORT} (bound ${HOST})`);
  if (usage.enabled) {
    console.log(`Usage metrics ON → ${usage._dir}/summary.json (GET /api/usage)`);
  } else {
    console.log("Usage metrics OFF (pass --usage or set FF_USAGE_ENABLED=1 to enable)");
  }
  if (DEVELOPER_MODE) {
    console.log("Developer mode: ON (quest / trend inspect UI)");
  } else {
    console.log("Developer mode: OFF (pass --developer or set FF_DEVELOPER=1 to enable)");
  }
  if (AI_SEARCH_ENABLED) {
    console.log("AI search: ON (web + X on timing assess and idea-sparks)");
  } else {
    console.log("AI search: OFF (pass --ai-search or set FF_AI_SEARCH=1 to enable)");
  }
  try {
    const scanned = await scanQuestsFolder(QUESTS_DIR);
    console.log(
      `Local Quests (Library): ${scanned.quests.length} tile(s) in ${scanned.dir}`
    );
    if (scanned.errors.length) {
      console.warn(
        `  ${scanned.errors.length} local file(s) skipped:`,
        scanned.errors.map((e) => `${e.file} (${e.error})`).join(", ")
      );
    }
  } catch (e) {
    console.warn(`Local Quests: scan failed for ${QUESTS_DIR}:`, e.message || e);
  }
  if (QUESTS_REMOTE_URL) {
    console.log(`Remote Quests catalog: ${QUESTS_REMOTE_URL}`);
    try {
      const remote = await fetchRemoteQuestCatalog(QUESTS_REMOTE_URL);
      console.log(
        `  → ${remote.quests.length} official tile(s)${remote.ok ? "" : " (fetch issues)"}${
          remote.cached ? " [cache]" : ""
        }`
      );
      if (remote.errors.length) {
        console.warn(
          `  ${remote.errors.length} remote issue(s):`,
          remote.errors
            .slice(0, 5)
            .map((e) => `${e.file} (${e.error})`)
            .join(", ")
        );
      }
    } catch (e) {
      console.warn(`  Remote catalog failed:`, e.message || e);
    }
  } else {
    console.log("Remote Quests catalog: OFF (FF_QUESTS_REMOTE_URL empty/off)");
  }
  if (TRENDS_REMOTE_URL) {
    console.log(`Remote Trends catalog: ${TRENDS_REMOTE_URL}`);
    try {
      const remote = await fetchRemoteTrendCatalog(TRENDS_REMOTE_URL);
      console.log(
        `  → ${remote.trends.length} trend(s)${remote.ok ? "" : " (fetch issues)"}${
          remote.cached ? " [cache]" : ""
        }`
      );
    } catch (e) {
      console.warn(`  Trends catalog failed:`, e.message || e);
    }
  } else {
    console.log("Remote Trends catalog: OFF (FF_TRENDS_REMOTE_URL empty/off)");
  }
  const urls = lanJoinUrls();
  if (urls.length) {
    console.log("LAN (same Wi‑Fi) — friends open one of:");
    for (const u of urls) console.log(`  ${u}`);
  } else {
    console.log("LAN: no private IPv4 found — check Wi‑Fi / ethernet");
  }
  if (ROOMS_ENABLED) {
    console.log(
      `Friends rooms: ON · WS /ws/rooms · maxRooms=${MAX_ROOMS} (FF_ENABLE_ROOMS=0 to disable)`
    );
  } else {
    console.log("Friends rooms: OFF");
  }
  if (process.env.FF_TRUST_PROXY === "1") {
    console.log("Trust proxy: ON (X-Forwarded-For used for rate limits)");
  } else {
    console.log("Trust proxy: OFF (socket IP only — set FF_TRUST_PROXY=1 behind a reverse proxy)");
  }
  if (API_SECRET) {
    console.log("API secret: ON (expensive POST routes require FF_API_SECRET)");
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

function safeWs(socket, obj) {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}
