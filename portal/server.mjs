/**
 * Warmer Sun Cloud (portal) — Cloud HTTP APIs only (Clerk + Neon).
 * No game UI, no xAI, no Friends WS. The playable SPA is ../server.mjs (game).
 * Render Web Service: listen on PORT (or FF_PORT), host 0.0.0.0.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import {
  buildWorldCard,
  resolveShot,
  composeGeneratePrompt,
  composeEditPrompt,
  assertCleanImagePrompt,
  visionFingerprint,
  shotNarrativeKey,
  visionHowNarrative,
  visionLifeNarrative,
} from "../js/vision-prompt.mjs";
import { RoomManager } from "../js/rooms/room-manager.mjs";
import {
  usageTrackerFromEnv,
  extractTokenUsage,
  normalizeSessionId,
} from "../js/usage-metrics.mjs";
import { scanQuestsFolder, resolveQuestsDir, ensureQuestsDir } from "../js/quests-folder.mjs";
import {
  fetchRemoteQuestCatalog,
  resolveQuestsRemoteUrl,
} from "../js/quests-remote.mjs";
import {
  fetchRemoteTrendCatalog,
  resolveTrendsRemoteUrl,
} from "../js/trends-remote.mjs";
import { SCENE_PROSE, SCENE_PROSE_CAPSULE } from "../js/scene-prose.js";
import { QUEST_SUMMARY_RECIPE } from "../js/quest-summary.js";
import { BRIEF_MD_RECIPE } from "../js/brief-beats.js";
import {
  normalizeTtsText,
  ttsCacheKey,
  createTtsCache,
} from "../js/tts-cache.mjs";
import { RateLimiter } from "../js/server/rate-limit.mjs";
import { clientIp, isLoopbackSocket } from "../js/server/client-ip.mjs";
import { canSeeAdmin } from "../js/server/admin-gate.mjs";
import { serveStatic } from "../js/server/static.mjs";
import {
  readBody,
  readRawBody,
  sendJson,
  sendBytes,
  errorStatus,
} from "../js/server/read-body.mjs";
import {
  CostPolicy,
  checkApiSecret,
} from "../js/server/cost-policy.mjs";
import { resolveDeveloperEnabled } from "../js/server/developer-mode.mjs";
import {
  publicClerkConfig,
  authenticateClerkRequest,
  extractBearerToken,
  runWithClerkIdentity,
  clerkUserIdFromContext,
  clerkWebhookSecretFromEnv,
  fetchClerkLoginSummary,
} from "../js/server/clerk-auth.mjs";
import { deviceAuth } from "../js/server/device-auth.mjs";
import { mintGameSessionToken } from "../js/server/game-session.mjs";
import {
  allowGameDeviceOrigin,
  gameDeviceOriginsFromEnv,
  portalPublicOrigin,
} from "../js/cloud/portal-origin.js";
import {
  applyCatalogGate,
  publicCatalogTile,
  prepareTutorContext,
  questIdFromContext,
  tileIsSponsored,
} from "../js/server/cloud-gate.mjs";
import {
  dbEnabled,
  publicDbConfig,
  migrate as migrateCloudDb,
  listSolvedIds,
  importProgress,
  insertRun,
  listRuns,
  startRun,
  getRunForUser,
  listAchievements,
  listHoldTechIdLists,
  insertAchievements,
  countUsers,
  deleteUser,
  ensureUser,
  getProfileByUserId,
  getProfileByUsername,
  updateProfile,
  listSharedHolds,
  setRunShare,
  listPins,
  replacePins,
  getRunState,
  putRunState,
  listQuestScores,
  listAllQuestScores,
  upsertQuestScore,
  listQuestStillUserIds,
  listQuestScoreUserIdsRanked,
  putQuestStill,
  getQuestStill,
  deleteQuestStillsOutside,
} from "../js/server/db.mjs";
import { parseRunStateBody, RUN_STATE_MAX_BYTES } from "../js/server/run-state.mjs";
import { planClerkUserEvent } from "../js/server/clerk-webhooks.mjs";
import { sanitizePinList } from "../js/server/pins.mjs";
import {
  parseProfilePatch,
  publicInventorPage,
  parseShareBody,
  parseReportBody,
  sanitizeUsername,
  chosenDisplayName,
  profileNeedsDisplayName,
} from "../js/server/profile.mjs";
import {
  cloudWriteGate,
  parseImportBody,
  sanitizeLastRun,
} from "../js/server/cloud-save.mjs";
import { parseRunsQuery } from "../js/server/quest-log.mjs";
import {
  questHasLeaderboard,
  parseQuestScoreBody,
  bindQuestScoreFromRun,
  attachBoardExtras,
  isBetterScore,
  rankBoard,
  rankPlayers,
  STILL_TOP_K,
  STILL_MAX_BYTES,
} from "../js/server/quest-board.mjs";
import {
  awardForRun,
  awardPortfolioCodes,
  publicAchievement,
  foundingCodes,
} from "../js/server/achievements.mjs";
import {
  portfolioFromTechIdLists,
  publicPortfolio,
} from "../js/sim/portfolio.js";
import {
  searchToolsForMode,
  SEARCH_MAX_OUTPUT_TOKENS,
  SEARCH_SYSTEM_LINE,
} from "../js/server/ai-search.mjs";
import { ideasOrFallback } from "../js/idea-cards.js";
import { sanitizeScrutiny } from "../js/scrutiny-shared.js";
import {
  FAST_EVAL_MODES,
  isFastEvalMode,
  fastEvalUserContent,
  sanitizeFast,
  reasoningEffortForCoInvent,
} from "../js/server/fast-eval.mjs";
import {
  GROUNDING_HINT,
  HEX_INVENT_HINT,
  TUTOR_HINT,
  resolveGrounding,
  resolveTutorContext,
  resolveSpotlightAdvance,
  isTutorMode,
  sanitizeHowTechId,
  sanitizeScenarioList,
  localGenerateScenarios,
  localCoInvent,
} from "../js/server/co-invent-local.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvFile() {
  const candidates = [
    path.join(ROOT, ".env.portal"),
    path.join(ROOT, ".env.portal.local"),
  ];
  let loaded = 0;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    loaded += 1;
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
  if (!loaded) {
    console.warn(
      "No .env.portal — Clerk/Neon off. Copy .env.portal.example → .env.portal (gitignored)."
    );
  }
}

// Must run before reading FF_* config from process.env
loadEnvFile();

const QUESTS_DIR = resolveQuestsDir(ROOT);
ensureQuestsDir(QUESTS_DIR);
const QUESTS_REMOTE_URL = resolveQuestsRemoteUrl();
const TRENDS_REMOTE_URL = resolveTrendsRemoteUrl();
const XAI_BASE = "https://api.x.ai/v1";

const PORT = Number(process.env.PORT || process.env.FF_PORT) || 8765;
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
const MODEL = process.env.FF_XAI_MODEL || "grok-4.7";
/** Default xAI TTS voice (https://docs.x.ai — Text to Speech). */
const TTS_VOICE = process.env.FF_TTS_VOICE || "eve";
/** xAI TTS input character limit. */
const TTS_MAX_CHARS = 15_000;
/** Shared TTS audio cache (disk + memory) so all users share one file per text. */
const TTS_CACHE_DIR =
  process.env.FF_TTS_CACHE_DIR || path.join(ROOT, "data", "tts-cache");
const ttsCache = createTtsCache({ dir: TTS_CACHE_DIR, maxMemory: 64 });
/** Portal is Cloud HTTP only — no Friends WS. Rooms live on game. */
const ROOMS_ENABLED = false;

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
 * Live web + X search is game-only. Portal never enables it, even if FF_AI_SEARCH=1.
 */
const AI_SEARCH_ENABLED = false;

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
async function gateExpensive(req, route, body = null) {
  const ip = clientIp(req);
  const rate = costPolicy.allowExpensive(route, ip);
  if (!rate.ok) return rate;
  const secret = checkApiSecret(req, body, {
    secret: API_SECRET,
    isLoopback: isLoopbackSocket(req),
  });
  if (!secret.ok) return secret;
  // No live xAI on portal — do not burn Cloud AI quota on local heuristics.
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
    clerkUserId: opts.clerkUserId || clerkUserIdFromContext(),
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
    clerkUserId: opts.clerkUserId || clerkUserIdFromContext(),
  });
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {() => Promise<any>} fn
 */
async function withClerkIdentity(req, fn) {
  const ident = await authenticateClerkRequest(req);
  return runWithClerkIdentity(
    ident.signedIn ? { userId: ident.userId, sessionId: ident.sessionId } : {},
    fn
  );
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

/** Portal never pays xAI. SuperGrok / FF_XAI_API_KEY are game (`npm start`) only. */
async function resolveAccessToken() {
  authInfo = { source: null };
  return null;
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
- When mode is evaluate-neighbors: judge traffic lights for hex board givens in context.hexEval.givens. Each given is a crisis meter or challenger concern. Judge from that given's FULL reachable invention pathway (neighbors[] = pathway tiles with techId + howText + timing; direct:true = shares an edge with this given; also pathway: combined howText/techIds). Read the pathway as ONE invent — a downstream mechanism can make a docked tile honest. Crisis (kind=crisis): judge against role — local = here-and-now relief / local fit; global = root cause / lasting driver; support = public buy-in AND scale-beyond-pilot. Honor prior; green allowed when honestly eased. Concern (kind=concern): judge against stored challengeSpeech/challengeQuestion plus playerAnswer if present. Judge the combination of ALL inventions in that given's reachable pathway AND the written answer. Nothing docked stays red even with an answer. Docking/touching is NOT addressing — a docked concern with no written answer and no pathway mechanism that honestly answers THIS challenge stays red. yellow = partial honest address via written answer and/or pathway how-text. Green only if the pathway honestly holds the answer. red = unanswered/hot; green = honestly eased for this place and year. Do not require bits/atoms world-match. Do not rewrite howText or art. Honor grounding. Leave proposals empty.
- When mode is score-pathway: score ONE invention pathway (context.pathway.inventions: techId + howText + timing — no names) as a combination. Return top-level crisisDelta: { local, global, support } each { delta: integer -2..+1, reason: one everyday sentence }. Negative delta eases that crisis if this pathway docks onto that meter; positive worsens it. reason must match the signed delta and cite the how-text mechanism; delta 0 says what is missing. Always reason every role including 0. An invent change may score worse than the prior fingerprint. A how-text that only passes a law, ban, UBI bill, or treaty must score local/global/support delta 0 (or support +1) — ask what becomes abundant with which capability this year. On automation / livelihoods: robots, AI, or self-driving without a share/bridge/paid-skill/meaning mechanism must not ease global; they may ease local remaining work and may raise support (backlash). On rogue-si: an AI/computing stack without a reachable human override, eval, or audit must not ease global; a smarter score that still locks the last call can raise support. Also return concerns: { [angle]: { level: "red"|"yellow"|"green", reason } } for angles in context.concerns (judge ALL inventions in the pathway plus playerAnswer if present vs stored challengeSpeech/challengeQuestion). Docking/touching is NOT addressing. A listed concern stays red unless the pathway how-text and/or written answer honestly respond to that challenge. yellow = partial; green only if the pathway honestly holds the answer — a written answer cannot green an empty dock. Leave proposals empty. Do not rewrite inventions.
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
- A law, ban, UBI bill, or treaty is not an invent. The invent makes something scarce more abundant with emTechs in this place this year. Policy may appear as a fielding condition, never as the sole how-it-works.
- If context.rules is set, those are the local weather already on the books (quest locks plus any the player lobbied). Cite them when they change who can field. They do not ease crisis meters by themselves.
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
    "howTarget": null,
    "howTechId": null,
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
- If context.spotlightAdvance is set, this lesson is pegged to a real recent advance (title, summary, asOf). The player-facing story deliberately never names it. Once the learner has the story (they have read the briefing, or asked about the place or what could help), name the advance, the emTech family it belongs to, and where it sits on its curve: what just became possible, and what is still years out. Say it in plain words first, then the term. Do not lead with the advance before the story, and never present it as the answer to invent — it is what makes the invent possible here.
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
  "proposals": { "addTechIds": [], "removeTechIds": [], "inventionName": null, "inventionHow": null, "inventionImpact": null, "howTarget": null, "howTechId": null, "scrutiny": null },
  "teaching": [],
  "timing": null,
  "endTutoring": false
}
For assess-feasibility set timing; otherwise timing may be null.`;

/** Compact pose prompt lives in js/server/fast-eval.mjs (FAST_EVAL_MODES). */

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
      "Judge hex-board traffic lights for context.hexEval.givens from EACH given's FULL reachable invention pathway (neighbors[] + pathway howText/techIds; direct:true = edge contact) plus playerAnswer if present. Judge the combination as one invent. Crisis: role criteria — local = here-and-now / local fit; global = root cause / sustainable; support = public buy-in + scale beyond pilot; honor prior; green OK when honest. Concern: judge against stored challengeSpeech/challengeQuestion AND playerAnswer — hard question honestly answered by the pathway plus written answer? Docking/touching is NOT addressing. Docked with no answer and no pathway mechanism that answers THIS challenge stays red. yellow = partial honest address; green only if the pathway honestly holds the answer. Return lights: [{id, level:red|yellow|green, reason}]. Do not rewrite inventions. Leave proposals empty." +
      GROUNDING_HINT,
    "score-pathway":
      "Score ONE invention pathway in context.pathway.inventions (techId + howText + timing; no names) as a combination. Return crisisDelta: {local, global, support} each {delta: integer -2..+1, reason: one everyday sentence}. Negative delta eases pressure if pathway docks that meter; positive worsens it — a reactor can raise support pressure. reason must match the signed delta and cite the how-text; delta 0 says what is missing. Always reason every role including 0. An invent change may score worse than the prior fingerprint. A law/ban/UBI bill/treaty is not an invent (delta 0, or support +1). On automation, displacement techs without a share/bridge must not ease global and may raise support. On rogue-si, AI without a reachable override/eval must not ease global. Return concerns: {[angle]: {level:red|yellow|green, reason}} for context.concerns angles vs their challengeSpeech/challengeQuestion plus playerAnswer if present. Docking/touching is NOT addressing. Stay red if inventChanged is false and there is no playerAnswer. posedHowText is the invent when this critic was raised — improve yellow/green only if the new pathway honestly answers this critic better than that snapshot. yellow = partial; green only if the pathway honestly holds the answer. Leave proposals empty." +
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
      "Speak ONLY as context.challengeAngle (moloch|ethicist|stakeholder|nature). There is no invention name. Attack THIS pathway (pathway.inventions + pathway.howText as one invent) in 2–4 sentences; one question. Return angle, angleLabel, challengeSpeech, challengeQuestion. Keep speech under ~120 words." +
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
      " " +
      BRIEF_MD_RECIPE +
      " Include seedMissions as curated baselines if provided, then invent NEW ones that do not duplicate them. Each object fields: id (slug), title, place, scene, summary, briefMd, stakeholder, startYear (2026), collapseYear (2032–2036), yearsPerTurn (2), pressure (structured — see CRITICAL), suggested (array of tech ids from availableTechs only — mix protection and abatement when relevant), suggestedWhy (object: for EACH id in suggested, one everyday-words sentence ≤120 chars saying what that family could do in THIS place and which crisis meter label it eases — no lab jargon, no product names), visionTheme (one of: coastal-city, food-city, care-city, energy-city, learn-city, rebuild-city, social-city, ocean-city), source ('curated' or 'generated'). " +
      QUEST_SUMMARY_RECIPE +
      " CRITICAL — pressure is an object with up to three role keys: local, global, support. Omit a role to hide that crisis meter on the HUD. Each present role: { \"label\": \"plain English HUD name 1–3 words Title Case\", \"description\": \"1-3 everyday sentences of what this meter means in this place\", \"pressure\": 0-5, \"pressureRise\": 0-3, \"winMax\": 0-5 }. local = lived local harm; global = systemic/driver; support = trust/legitimacy/fear. description is place-specific strain, not the generic role lecture. NEVER camelCase jargon labels (bad: AlleyPM, BenzeneSpikes, CorridorPM). Default full Quest uses all three roles. message: one short line inviting the learner to pick a Quest. proposals empty. Also follow context.guidance when present.",
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
    // Learning quests only: the tutor names the real advance after the learner has the story.
    spotlightAdvance: tutorMode ? resolveSpotlightAdvance(context) : null,
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
      howTarget:
        brainstormOnly || (proposals.howTarget !== "mint" && proposals.howTarget !== "pathway")
          ? null
          : proposals.howTarget,
      howTechId: brainstormOnly ? null : sanitizeHowTechId(proposals.howTechId, ids),
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
  }
  // grok-4.7 defaults to high (cannot disable). Eval stays low; tutor uses medium.
  const reasoningEffort = reasoningEffortForCoInvent({ mode, tutor: isTutor });
  if (reasoningEffort) {
    createOpts.reasoning = { effort: reasoningEffort };
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

/**
 * Local folder + remote catalog, merged by id (remote wins).
 * @param {{ forceRemote?: boolean }} [opts]
 */
async function loadMergedQuestTiles(opts = {}) {
  const [scanned, remote] = await Promise.all([
    scanQuestsFolder(QUESTS_DIR),
    fetchRemoteQuestCatalog(QUESTS_REMOTE_URL, { force: Boolean(opts.forceRemote) }),
  ]);
  const local = scanned.quests || [];
  const remoteQuests = remote.quests || [];
  const byId = new Map();
  for (const q of local) byId.set(q.id, q);
  for (const q of remoteQuests) byId.set(q.id, q);
  return {
    scanned,
    remote,
    local,
    remoteQuests,
    quests: [...byId.values()],
    byId,
  };
}

async function ensureUserFromWebhook(plan) {
  if (!plan?.userId) return;
  await ensureUser(plan.userId, null, { username: plan.username });
  if (Array.isArray(plan.codes) && plan.codes.length) {
    await insertAchievements(plan.userId, plan.codes);
  }
}

async function grantCloudAchievements(clerkUserId, run, extra = {}) {
  if (!dbEnabled() || !clerkUserId || !run) return [];
  try {
    const have = await listAchievements(clerkUserId);
    let sponsored = false;
    try {
      const pack = await loadMergedQuestTiles();
      sponsored = tileIsSponsored(findQuestTile(pack, run.questId));
    } catch {
      sponsored = false;
    }
    const already = have.map((h) => h.code);
    const codes = awardForRun(
      {
        outcome: run.outcome,
        kind: run.kind,
        techIds: run.techIds,
      },
      {
        already,
        sponsored,
      }
    );
    try {
      const lists = await listHoldTechIdLists(clerkUserId);
      const toolkit = awardPortfolioCodes(portfolioFromTechIdLists(lists), [
        ...already,
        ...codes,
      ]);
      for (const c of toolkit) {
        if (!codes.includes(c)) codes.push(c);
      }
    } catch {
      /* portfolio is additive; hold still saved */
    }
    const n = await countUsers();
    const extraCodes = foundingCodes({
      userCount: n,
      inventNight: run.kind === "friends" && new Date().getUTCDay() === 3,
    });
    for (const c of extraCodes) {
      if (!have.some((h) => h.code === c) && !codes.includes(c)) codes.push(c);
    }
    if (codes.length) await insertAchievements(clerkUserId, codes, extra.runId || run.id || null);
    return codes.map((c) => publicAchievement(c)).filter(Boolean);
  } catch (e) {
    console.warn("[achievements]", e?.message || e);
    return [];
  }
}

function findQuestTile(pack, id) {
  if (!id || !pack) return null;
  if (pack.byId?.has(id)) return pack.byId.get(id);
  return (
    pack.quests?.find((q) => q.id === id || q.mission?.id === id) || null
  );
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
    how: visionHowNarrative(body, 700),
    impact: visionLifeNarrative(body, 700),
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
  const rawPrompt = String(body?.prompt || "").slice(0, 700);
  const kind = String(body?.kind || "idea").toLowerCase();
  const logKind = kind === "brief" || kind === "challenger" ? kind : "idea";
  const cached = ideaImageCache.get(id);
  if (cached?.imageUrl) {
    recordAiImage({
      kind: logKind,
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

  const prompt =
    kind === "challenger"
      ? [
          "Photoreal 4:3 documentary still of a local pressure or hard question facing a community pathway.",
          "Natural light, grounded, no readable text, no logos, no watermarks, no named real people.",
          rawPrompt ||
            "People and place under a concrete social, ethical, or natural-world pressure.",
        ].join(" ")
      : kind === "brief"
        ? [
            "Photoreal cinematic 16:9 documentary still of a lived local scene for a design-challenge story.",
            "Natural light, grounded, no readable text, no logos, no watermarks, no named real people.",
            rawPrompt || "A specific person in a specific place under concrete tension.",
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
      kind: logKind,
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
      kind: logKind,
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
      clerkUserId: clerkUserIdFromContext(),
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
      clerkUserId: clerkUserIdFromContext(),
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
    clerkUserId: clerkUserIdFromContext(),
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

function isDeviceApiPath(pathOnly) {
  const p = String(pathOnly || "");
  return p === "/api/device" || p.startsWith("/api/device/");
}

/**
 * Device start/status are called from the game SPA.
 * Echo loopback plus FF_GAME_DEVICE_ORIGINS. Missing Origin (curl) is allowed;
 * a foreign Origin is 403.
 */
function sendDeviceJson(req, res, status, data) {
  const origin = String(req.headers.origin || "");
  if (origin && !allowGameDeviceOrigin(origin)) {
    return sendJson(res, 403, { ok: false, error: "origin_forbidden" });
  }
  const body = JSON.stringify(data);
  /** @type {Record<string, string>} */
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(Buffer.byteLength(body)),
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(status, headers);
  res.end(body);
}

function servePortalSignin(res) {
  const file = path.join(__dirname, "signin.html");
  let html;
  try {
    html = fs.readFileSync(file, "utf8");
  } catch {
    return sendJson(res, 500, { ok: false, error: "signin_missing" });
  }
  const buf = Buffer.from(html);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": buf.length,
    "Cache-Control": "no-store",
  });
  res.end(buf);
}

/**
 * Cloud API surface only. The playable SPA, co-inventor, and Friends WS are game.
 * @param {string} pathOnly
 */
function isPortalApiPath(pathOnly) {
  const p = String(pathOnly || "");
  if (p === "/api/health" || p.startsWith("/api/health/")) return true;
  if (p === "/api/me" || p.startsWith("/api/me/")) return true;
  if (p.startsWith("/api/u/")) return true;
  if (p === "/api/webhooks/clerk" || p.startsWith("/api/webhooks/clerk/")) return true;
  if (p === "/api/report" || p.startsWith("/api/report/")) return true;
  if (p === "/api/board" || p.startsWith("/api/board/")) return true;
  if (p === "/api/device" || p.startsWith("/api/device/")) return true;
  return false;
}

function parseBoardPath(pathOnly) {
  const m = /^\/api\/board\/([^/]+)(?:\/still\/([^/]+))?$/.exec(String(pathOnly || ""));
  if (!m) return null;
  try {
    return {
      questId: decodeURIComponent(m[1]),
      stillUser: m[2] ? decodeURIComponent(m[2]) : null,
    };
  } catch {
    return null;
  }
}

function parseMeQuestPath(pathOnly) {
  const m = /^\/api\/me\/quests\/([^/]+)\/(score|still)$/.exec(String(pathOnly || ""));
  if (!m) return null;
  try {
    return { questId: decodeURIComponent(m[1]), action: m[2] };
  } catch {
    return null;
  }
}

async function questBoardJson(questId, ident, extra = {}) {
  const listed = await listQuestScores(questId);
  const ranked = rankBoard(listed.rows || [], {
    userId: ident?.signedIn ? ident.userId : null,
  });
  const stillIds = await listQuestStillUserIds(questId);
  const board = attachBoardExtras(ranked, stillIds, listed.rows || []);
  return {
    ok: true,
    questId,
    ...extra,
    top: board.top,
    you: board.you,
  };
}

async function evictQuestStills(questId) {
  const keep = await listQuestScoreUserIdsRanked(questId, STILL_TOP_K);
  await deleteQuestStillsOutside(questId, keep);
  return keep;
}

const server = http.createServer(async (req, res) => {
  const pathOnly = String(req.url || "/").split("?")[0];
  if (req.method === "OPTIONS") {
    if (isDeviceApiPath(pathOnly)) {
      const origin = String(req.headers.origin || "");
      if (!allowGameDeviceOrigin(origin)) {
        res.writeHead(403);
        return res.end();
      }
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        Vary: "Origin",
      });
      return res.end();
    }
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Admin-Token, X-FF-Secret",
    });
    return res.end();
  }

  if (req.method === "GET" && (pathOnly === "/" || pathOnly === "/api")) {
    return sendJson(res, 200, {
      ok: true,
      service: "portal",
      name: "Warmer Sun Cloud",
      health: "/api/health",
      signin: "/signin",
    });
  }
  if (req.method === "GET" && pathOnly === "/signin") {
    return servePortalSignin(res);
  }
  if (!isPortalApiPath(pathOnly)) {
    return sendJson(res, 404, {
      ok: false,
      error: "not_found",
      service: "portal",
    });
  }

  if (req.method === "GET" && req.url?.startsWith("/api/health")) {
    const publicHealth = {
      ok: true,
      service: "portal",
      clerk: publicClerkConfig(),
      db: publicDbConfig(),
    };
    const admin = canSeeAdmin(req, {
      url: new URL(req.url || "/", `http://${req.headers.host || "localhost"}`),
    });
    if (!admin.ok) {
      return sendJson(res, 200, publicHealth);
    }
    return sendJson(res, 200, {
      ...publicHealth,
      port: PORT,
      trustProxy: process.env.FF_TRUST_PROXY === "1",
    });
  }

  if (req.method === "POST" && pathOnly === "/api/device/start") {
    if (!publicClerkConfig().enabled) {
      return sendDeviceJson(req, res, 503, { ok: false, error: "clerk_off" });
    }
    const code = deviceAuth.start();
    const origin = portalPublicOrigin();
    return sendDeviceJson(req, res, 200, {
      ok: true,
      code,
      signInUrl: `${origin}/signin?device=${encodeURIComponent(code)}`,
    });
  }

  if (req.method === "POST" && pathOnly === "/api/device/complete") {
    const ident = await authenticateClerkRequest(req);
    if (!ident.enabled) {
      return sendJson(res, 503, { ok: false, error: "clerk_off" });
    }
    if (!ident.signedIn) {
      return sendJson(res, 401, { ok: false, error: "sign_in_required" });
    }
    let body = {};
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: e.message || "bad_body" });
    }
    const gameToken = mintGameSessionToken(
      { userId: ident.userId, sessionId: ident.sessionId },
      process.env
    );
    if (!gameToken) {
      return sendJson(res, 500, { ok: false, error: "session_mint_failed" });
    }
    const result = deviceAuth.complete(body?.code, gameToken);
    if (!result.ok) return sendJson(res, 400, { ok: false, error: result.error });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathOnly === "/api/device/status") {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const result = deviceAuth.takeStatus(url.searchParams.get("code"));
    if (!result.ok) {
      return sendDeviceJson(req, res, 404, { ok: false, error: result.error });
    }
    if (result.pending) {
      return sendDeviceJson(req, res, 200, { ok: true, pending: true });
    }
    return sendDeviceJson(req, res, 200, {
      ok: true,
      pending: false,
      token: result.token,
    });
  }

  if (req.method === "GET" && (req.url === "/api/me" || req.url?.startsWith("/api/me?"))) {
    const ident = await authenticateClerkRequest(req);
    if (!ident.enabled) {
      return sendJson(res, 200, { ok: true, signedIn: false, clerk: false, db: false });
    }
    if (ident.missingToken) {
      return sendJson(res, 200, {
        ok: true,
        signedIn: false,
        clerk: true,
        db: dbEnabled(),
      });
    }
    if (ident.invalidToken || !ident.signedIn) {
      return sendJson(res, 401, { ok: false, error: "invalid_token", clerk: true });
    }
    const dbOn = dbEnabled();
    let solvedIds = [];
    if (dbOn) {
      try {
        solvedIds = await listSolvedIds(ident.userId);
      } catch (e) {
        console.warn("[cloud db] listSolvedIds", e?.message || e);
      }
    }
    return sendJson(res, 200, {
      ok: true,
      signedIn: true,
      clerk: true,
      userId: ident.userId,
      sessionId: ident.sessionId,
      db: dbOn,
      solvedIds,
    });
  }

  if (req.method === "GET" && (req.url === "/api/me/runs" || req.url?.startsWith("/api/me/runs?"))) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const q = parseRunsQuery(url.searchParams);
      const result = await listRuns({
        clerkUserId: gate.userId,
        kind: q.kind,
        outcome: q.outcome,
        limit: q.limit,
      });
      return sendJson(res, 200, { ok: true, runs: result.runs || [] });
    } catch (e) {
      console.warn("[cloud db] listRuns", e?.message || e);
      return sendJson(res, errorStatus(e), { ok: false, error: "runs_failed" });
    }
  }

  if (
    req.method === "GET" &&
    (req.url === "/api/me/achievements" || req.url?.startsWith("/api/me/achievements?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const rows = await listAchievements(gate.userId);
      return sendJson(res, 200, {
        ok: true,
        achievements: rows.map((r) => publicAchievement(r.code, r.unlockedAt)).filter(Boolean),
      });
    } catch (e) {
      console.warn("[cloud db] achievements", e?.message || e);
      return sendJson(res, errorStatus(e), { ok: false, error: "achievements_failed" });
    }
  }

  if (req.method === "GET" && (req.url === "/api/me/pins" || req.url?.startsWith("/api/me/pins?"))) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const pins = await listPins(gate.userId);
      return sendJson(res, 200, { ok: true, pins });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "pins_failed" });
    }
  }

  if (req.method === "PUT" && (req.url === "/api/me/pins" || req.url?.startsWith("/api/me/pins?"))) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 48_000 });
      const pins = sanitizePinList(body);
      const result = await replacePins(gate.userId, pins);
      return sendJson(res, 200, { ok: true, pins: result.pins });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "pins_failed" });
    }
  }

  if (
    req.method === "GET" &&
    (req.url === "/api/me/run-state" || req.url?.startsWith("/api/me/run-state?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const st = await getRunState(gate.userId);
      return sendJson(res, 200, { ok: true, state: st });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "run_state_failed" });
    }
  }

  if (
    req.method === "PUT" &&
    (req.url === "/api/me/run-state" || req.url?.startsWith("/api/me/run-state?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: RUN_STATE_MAX_BYTES });
      const parsed = parseRunStateBody(body);
      if (!parsed.ok) return sendJson(res, 400, { ok: false, error: parsed.error });
      await putRunState(gate.userId, parsed.state);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "run_state_failed" });
    }
  }

  {
    const pathOnly = String(req.url || "").split("?")[0];
    const meQuest = parseMeQuestPath(pathOnly);
    if (meQuest && req.method === "POST" && meQuest.action === "score") {
      const ident = await authenticateClerkRequest(req);
      const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
      if (!gate.ok) {
        req.resume();
        return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
      }
      try {
        const body = await readBody(req, { maxBytes: 16_000 });
        const parsed = parseQuestScoreBody(body, meQuest.questId);
        if (!parsed.ok) return sendJson(res, 400, { ok: false, error: parsed.error });
        const owned = await getRunForUser(gate.userId, parsed.row.runId);
        let catalogStartYear = null;
        try {
          const pack = await loadMergedQuestTiles();
          const tile = findQuestTile(pack, parsed.row.questId);
          catalogStartYear = tile?.mission?.startYear ?? tile?.startYear ?? null;
        } catch {
          catalogStartYear = null;
        }
        const bound = bindQuestScoreFromRun(parsed, owned, { startYear: catalogStartYear });
        if (!bound.ok) return sendJson(res, 400, { ok: false, error: bound.error });
        const profile = await getProfileByUserId(gate.userId);
        const displayName = chosenDisplayName(profile);
        if (!displayName) {
          return sendJson(res, 400, { ok: false, error: "display_name_required" });
        }
        const result = await upsertQuestScore(
          { ...bound.row, clerkUserId: gate.userId, displayName },
          isBetterScore
        );
        const keep = await evictQuestStills(meQuest.questId);
        const inTopStills = keep.includes(gate.userId);
        const listed = await listQuestScores(meQuest.questId);
        const ranked = rankBoard(listed.rows || [], { userId: gate.userId });
        return sendJson(res, 200, {
          ok: true,
          stored: Boolean(result.stored),
          kept: Boolean(result.kept),
          rank: ranked.you?.rank || null,
          inTopStills,
        });
      } catch (e) {
        console.warn("[quest score]", e?.message || e);
        return sendJson(res, errorStatus(e), { ok: false, error: "score_failed" });
      }
    }
    if (meQuest && req.method === "PUT" && meQuest.action === "still") {
      const ident = await authenticateClerkRequest(req);
      const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
      if (!gate.ok) {
        req.resume();
        return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
      }
      if (!questHasLeaderboard(meQuest.questId)) {
        req.resume();
        return sendJson(res, 400, { ok: false, error: "no_board" });
      }
      try {
        const buf = await readRawBody(req, { maxBytes: STILL_MAX_BYTES });
        if (!buf.length) return sendJson(res, 400, { ok: false, error: "empty_still" });
        const keep = await listQuestScoreUserIdsRanked(meQuest.questId, STILL_TOP_K);
        if (!keep.includes(gate.userId)) {
          return sendJson(res, 200, { ok: true, stored: false, reason: "not_top" });
        }
        const ctype = String(req.headers["content-type"] || "image/jpeg").split(";")[0].trim();
        await putQuestStill(meQuest.questId, gate.userId, buf, ctype || "image/jpeg");
        await deleteQuestStillsOutside(meQuest.questId, keep);
        return sendJson(res, 200, { ok: true, stored: true });
      } catch (e) {
        console.warn("[quest still]", e?.message || e);
        return sendJson(res, errorStatus(e), { ok: false, error: "still_failed" });
      }
    }
  }

  if (req.method === "GET" && (req.url === "/api/me/profile" || req.url?.startsWith("/api/me/profile?"))) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const profile = await getProfileByUserId(gate.userId);
      const p = profile || { isPublic: false, username: null, displayName: null };
      const login = await fetchClerkLoginSummary(gate.userId);
      let portfolio = publicPortfolio(null);
      try {
        const lists = await listHoldTechIdLists(gate.userId);
        portfolio = publicPortfolio(portfolioFromTechIdLists(lists));
      } catch {
        /* profile still loads without toolkit */
      }
      return sendJson(res, 200, {
        ok: true,
        profile: p,
        portfolio,
        needsDisplayName: profileNeedsDisplayName(p),
        ...(login ? { login } : {}),
      });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "profile_failed" });
    }
  }

  if (req.method === "PUT" && (req.url === "/api/me/profile" || req.url?.startsWith("/api/me/profile?"))) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 8_000 });
      const parsed = parseProfilePatch(body);
      if (!parsed.ok) return sendJson(res, 400, { ok: false, error: parsed.error });
      const result = await updateProfile(gate.userId, parsed.patch);
      const p = result.profile || { isPublic: false, username: null, displayName: null };
      const lists = await listHoldTechIdLists(gate.userId);
      return sendJson(res, 200, {
        ok: true,
        profile: p,
        portfolio: publicPortfolio(portfolioFromTechIdLists(lists)),
        needsDisplayName: profileNeedsDisplayName(p),
      });
    } catch (e) {
      const msg = String(e?.message || e);
      if (/unique/i.test(msg) || e?.code === "23505") {
        return sendJson(res, 409, { ok: false, error: "username_taken" });
      }
      return sendJson(res, errorStatus(e), { ok: false, error: "profile_failed" });
    }
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/me/runs/share" || req.url?.startsWith("/api/me/runs/share?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 4_000 });
      const parsed = parseShareBody(body);
      if (!parsed.ok) return sendJson(res, 400, { ok: false, error: parsed.error });
      const result = await setRunShare(gate.userId, parsed.runId, parsed.share);
      return sendJson(res, 200, { ok: true, stored: result.stored });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "share_failed" });
    }
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/webhooks/clerk" || req.url?.startsWith("/api/webhooks/clerk?"))
  ) {
    const secret = clerkWebhookSecretFromEnv();
    if (!secret) {
      req.resume();
      return sendJson(res, 404, { ok: false, error: "webhooks_off" });
    }
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const payload = Buffer.concat(chunks).toString("utf8");
      let evt = null;
      try {
        const { verifyWebhook } = await import("@clerk/backend/webhooks");
        evt = await verifyWebhook(
          {
            headers: req.headers,
            rawBody: payload,
          },
          { signingSecret: secret }
        );
      } catch {
        try {
          evt = JSON.parse(payload);
        } catch {
          return sendJson(res, 400, { ok: false, error: "invalid_webhook" });
        }
        return sendJson(res, 401, { ok: false, error: "invalid_signature" });
      }
      const plan = planClerkUserEvent(evt);
      if (!plan.ok) return sendJson(res, 400, { ok: false, error: plan.error });
      if (plan.action === "delete") {
        await deleteUser(plan.userId);
      } else if (plan.action === "ensure" || plan.action === "touch") {
        await ensureUserFromWebhook(plan);
      }
      return sendJson(res, 200, { ok: true, action: plan.action });
    } catch (e) {
      console.warn("[clerk webhook]", e?.message || e);
      return sendJson(res, errorStatus(e), { ok: false, error: "webhook_failed" });
    }
  }

  if (req.method === "POST" && (req.url === "/api/report" || req.url?.startsWith("/api/report?"))) {
    try {
      const body = await readBody(req, { maxBytes: 4_000 });
      const parsed = parseReportBody(body);
      if (!parsed.ok) return sendJson(res, 400, { ok: false, error: parsed.error });
      console.warn("[cloud report]", parsed.username || parsed.questId, parsed.reason.slice(0, 80));
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "report_failed" });
    }
  }

  if (req.method === "GET" && req.url?.startsWith("/api/u/")) {
    try {
      const pathOnly = String(req.url).split("?")[0];
      const slug = sanitizeUsername(decodeURIComponent(pathOnly.slice("/api/u/".length)));
      if (!slug) return sendJson(res, 404, { ok: false, error: "not_found" });
      const row = await getProfileByUsername(slug);
      let lists = [];
      try {
        lists = row ? await listHoldTechIdLists(row.clerkUserId) : [];
      } catch {
        lists = [];
      }
      const page = publicInventorPage(
        row,
        row ? await listSharedHolds(row.clerkUserId) : [],
        publicPortfolio(portfolioFromTechIdLists(lists))
      );
      if (!page) return sendJson(res, 404, { ok: false, error: "not_found" });
      return sendJson(res, 200, { ok: true, profile: page });
    } catch (e) {
      return sendJson(res, errorStatus(e), { ok: false, error: "profile_failed" });
    }
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/me/import" || req.url?.startsWith("/api/me/import?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 32_000 });
      const parsed = parseImportBody(body);
      const result = await importProgress({
        clerkUserId: gate.userId,
        solvedIds: parsed.solvedIds,
        lastRun: parsed.lastRun,
      });
      let unlocked = [];
      if (result.lastRunStored && parsed.lastRun) {
        unlocked = await grantCloudAchievements(gate.userId, parsed.lastRun, {
          runId: result.lastRunId,
        });
      }
      return sendJson(res, 200, {
        ok: true,
        inserted: result.inserted,
        total: result.total,
        lastRunStored: result.lastRunStored,
        lastRunId: result.lastRunId || null,
        solvedIds: result.solvedIds,
        unlocked,
      });
    } catch (e) {
      console.warn("[cloud db] import", e?.message || e);
      return sendJson(res, errorStatus(e), {
        ok: false,
        error: e?.status === 400 ? "invalid_json" : "import_failed",
      });
    }
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/me/runs/start" || req.url?.startsWith("/api/me/runs/start?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 8_000 });
      const result = await startRun({ ...body, clerkUserId: gate.userId });
      return sendJson(res, 200, { ok: true, stored: result.stored, id: result.id || null });
    } catch (e) {
      console.warn("[cloud db] startRun", e?.message || e);
      return sendJson(res, errorStatus(e), {
        ok: false,
        error: e?.status === 400 ? "invalid_run" : "run_failed",
      });
    }
  }

  if (
    req.method === "POST" &&
    (req.url === "/api/me/runs" || req.url?.startsWith("/api/me/runs?"))
  ) {
    const ident = await authenticateClerkRequest(req);
    const gate = cloudWriteGate(ident, { dbEnabled: dbEnabled() });
    if (!gate.ok) {
      req.resume();
      return sendJson(res, gate.status, { ok: false, error: gate.error, clerk: ident.enabled });
    }
    try {
      const body = await readBody(req, { maxBytes: 16_000 });
      const run = sanitizeLastRun(body?.run || body);
      if (!run) {
        return sendJson(res, 400, { ok: false, error: "invalid_run" });
      }
      const result = await insertRun({ clerkUserId: gate.userId, run });
      const unlocked = await grantCloudAchievements(gate.userId, run, {
        runId: result.id,
      });
      return sendJson(res, 200, {
        ok: true,
        stored: result.stored,
        id: result.id || null,
        questId: result.questId || run.questId,
        unlocked,
      });
    } catch (e) {
      console.warn("[cloud db] insertRun", e?.message || e);
      return sendJson(res, errorStatus(e), {
        ok: false,
        error: e?.status === 400 ? "invalid_run" : "run_failed",
      });
    }
  }

  if (req.method === "GET" && (pathOnly === "/api/board" || pathOnly === "/api/board/")) {
    try {
      const ident = await authenticateClerkRequest(req);
      const listed = await listAllQuestScores();
      const ranked = rankPlayers(listed.rows || [], {
        userId: ident?.signedIn ? ident.userId : null,
      });
      return sendJson(res, 200, { ok: true, ...ranked });
    } catch (e) {
      console.warn("[players board]", e?.message || e);
      return sendJson(res, errorStatus(e), { ok: false, error: "board_failed" });
    }
  }

  if (req.method === "GET" && String(req.url || "").split("?")[0].startsWith("/api/board/")) {
    const parsed = parseBoardPath(String(req.url || "").split("?")[0]);
    if (!parsed?.questId || !questHasLeaderboard(parsed.questId)) {
      return sendJson(res, 404, { ok: false, error: "no_board" });
    }
    try {
      if (parsed.stillUser) {
        const still = await getQuestStill(parsed.questId, parsed.stillUser);
        if (!still?.bytes) return sendJson(res, 404, { ok: false, error: "no_still" });
        return sendBytes(res, 200, still.bytes, still.contentType || "image/jpeg");
      }
      const ident = await authenticateClerkRequest(req);
      const body = await questBoardJson(parsed.questId, ident);
      return sendJson(res, 200, body);
    } catch (e) {
      console.warn("[quest board]", e?.message || e);
      return sendJson(res, errorStatus(e), { ok: false, error: "board_failed" });
    }
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
  if (req.method === "GET" && req.url && (req.url === "/api/quests" || req.url.startsWith("/api/quests?") || req.url.startsWith("/api/quests/"))) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const ident = await authenticateClerkRequest(req);
      const forceRemote = url.searchParams.get("refresh") === "1";
      const pack = await loadMergedQuestTiles({ forceRemote });
      const { scanned, remote, local, remoteQuests, quests } = pack;

      const idParam =
        url.searchParams.get("id") ||
        (url.pathname.startsWith("/api/quests/") && url.pathname !== "/api/quests/"
          ? decodeURIComponent(url.pathname.slice("/api/quests/".length))
          : "");
      const questId = String(idParam || "").trim();

      if (questId) {
        const tile = findQuestTile(pack, questId);
        if (!tile) {
          return sendJson(res, 404, { ok: false, error: "not_found", id: questId });
        }
        const gated = applyCatalogGate(tile, ident);
        const stripped = gated !== tile;
        if (stripped) {
          return sendJson(res, 401, {
            ok: false,
            error: "sign_in_required",
            id: questId,
            tile: gated,
          });
        }
        return sendJson(res, 200, { ok: true, tile });
      }

      const gateOne = (q) => applyCatalogGate(q, ident);
      return sendJson(res, 200, {
        ok: true,
        dir: scanned.dir,
        remoteUrl: remote.url,
        remoteOk: remote.ok,
        remoteCached: remote.cached,
        local: local.map(gateOne),
        remote: remoteQuests.map(gateOne),
        count: quests.length,
        quests: quests.map(gateOne),
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
      const ident = await authenticateClerkRequest(req);
      const result = roomManager.createRoom({
        displayName: body.displayName,
        ip,
        clerkUserId: ident.signedIn ? ident.userId : null,
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
        const ident = await authenticateClerkRequest(req);
        const result = roomManager.joinRoom(joinMatch[1].toUpperCase(), {
          displayName: body.displayName,
          playerToken: body.playerToken,
          ip,
          clerkUserId: ident.signedIn ? ident.userId : null,
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
      const gate = await gateExpensive(req, "vision", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
          message: gate.message || undefined,
        });
      }
      const result = await withClerkIdentity(req, () => handleVision(body));
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
      const gate = await gateExpensive(req, "idea-image", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
          message: gate.message || undefined,
        });
      }
      const result = await withClerkIdentity(req, () => handleIdeaImage(body));
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
      const gate = await gateExpensive(req, "market-image", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
          message: gate.message || undefined,
        });
      }
      const result = await withClerkIdentity(req, () => handleMarketImage(body));
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
      const gate = await gateExpensive(req, "tts", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          ok: false,
          error: gate.error || "rate_limited",
          message: gate.message || undefined,
        });
      }
      const result = await withClerkIdentity(req, () => handleTts(body));
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
      const gate = await gateExpensive(req, "co-invent", body);
      if (!gate.ok) {
        return sendJson(res, gate.status || 429, {
          error: gate.error || "rate_limited",
          message: gate.message || undefined,
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
      const ident = await authenticateClerkRequest(req);
      let pack = null;
      try {
        pack = await loadMergedQuestTiles();
      } catch (e) {
        console.warn("[quests catalog]", e.message || e);
      }
      const tile = findQuestTile(pack, questIdFromContext(body.context));
      const prepared = prepareTutorContext(body.context, ident, tile);
      if (!prepared.ok) {
        return sendJson(res, prepared.status || 401, {
          error: prepared.error || "sign_in_required",
          source: "error",
          message: "Sign in to use the tutor on this lesson.",
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
      const result = await withClerkIdentity(req, () =>
        handleCoInvent({ ...body, context: prepared.context })
      );
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

  return sendJson(res, 405, { ok: false, error: "method_not_allowed", service: "portal" });
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
    socket.on("error", (err) => {
      console.error(
        `[rooms] ws error ${bound?.room?.code || "?"} ${bound?.player?.displayName || "?"} ${err?.code || ""} ${err?.message || err}`
      );
    });
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
        `  # or: pkill -f "node portal/server.mjs"\n` +
        `Or start on another port: PORT=8766 npm run portal`
    );
    process.exit(1);
  }
  throw err;
});

server.keepAliveTimeout = 120_000;
server.headersTimeout = 125_000;
server.listen(PORT, HOST, async () => {
  console.log(`Warmer Sun Cloud (portal) → http://127.0.0.1:${PORT} (bound ${HOST})`);
  if (dbEnabled()) {
    try {
      const mig = await migrateCloudDb();
      const extra = mig.applied?.length ? ` applied ${mig.applied.join(", ")}` : " schema current";
      console.log(`Cloud DB: Neon ready (${extra.trim()})`);
    } catch (e) {
      console.warn("Cloud DB: migrate failed — import/save disabled until fixed:", e?.message || e);
    }
  } else {
    console.log("Cloud DB: off (no DATABASE_URL)");
  }
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
  console.log("AI search: OFF (portal does not use live AI; that is game)");
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
  if (publicClerkConfig().enabled) {
    console.log("Learner accounts: Clerk ON (optional sign-in)");
    console.log(
      `Device handshake origins: ${gameDeviceOriginsFromEnv().join(", ")}`
    );
  } else {
    console.log(
      "Learner accounts: OFF (set CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY)"
    );
  }
  console.log("AI: off — portal does not use xAI / SuperGrok (that is game)");
});

function safeWs(socket, obj) {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}
