/**
 * A1 account door for Warmer Sun Cloud.
 * When Clerk is off, nothing is gated (self-host / LAN).
 * When Clerk is on, *curated remote* learning (and access:account|paid) tiles
 * need a session before the quest JSON is returned. access:paid that bills
 * the player needs the content plan. Cloud includes content. Library side-load
 * (`hosted` / `imported`) is local JSON — play and tutor use the tile itself,
 * never the Cloud catalog.
 *
 * The official catalog lives in a private bucket. This module only gates
 * the portal response and tutor notes. It does not fetch the public site.
 */

import { isLibraryCatalogEntry } from "../quest-catalog.js";
import { publicCompanionSlice } from "../companion.js";

export const ACCESS = {
  OPEN: "open",
  ACCOUNT: "account",
  PAID: "paid",
};

/**
 * @param {object|null|undefined} tile
 * @returns {"open"|"account"|"paid"}
 */
export function tileAccess(tile) {
  if (!tile || typeof tile !== "object") return ACCESS.OPEN;
  if (isLibraryCatalogEntry(tile)) return ACCESS.OPEN;
  const raw = tile.access || tile.mission?.access;
  if (raw === ACCESS.OPEN || raw === ACCESS.ACCOUNT || raw === ACCESS.PAID) {
    return raw;
  }
  if (tile.isLearningModule === true || tile.mission?.isLearningModule === true) {
    return ACCESS.ACCOUNT;
  }
  if (tile.kind === "module") return ACCESS.ACCOUNT;
  return ACCESS.OPEN;
}

/**
 * @param {object|null|undefined} ident from authenticateClerkRequest
 * @param {object|null|undefined} tile
 */
export function mayReadSecrets(ident, tile) {
  if (!ident?.enabled) return true;
  const access = tileAccess(tile);
  if (access === ACCESS.OPEN) return true;
  return Boolean(ident.signedIn);
}

/**
 * @param {object|null|undefined} ident
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export const ENTITLEMENT_FREE = "catalog.free";

/**
 * B3: sponsored / catalog.free tiles never ask the player for Billing.
 * Paid access without a free entitlement is a Billing check (todo B1).
 * @param {object|null|undefined} tile
 */
export function needsPlayerBilling(tile) {
  if (!tile || typeof tile !== "object") return false;
  const access = tileAccess(tile);
  if (access !== ACCESS.PAID) return false;
  const ent = String(tile.entitlement || tile.mission?.entitlement || "").trim();
  if (ent === ENTITLEMENT_FREE || ent === "catalog.free") return false;
  if (String(tile.sponsorName || tile.mission?.sponsorName || "").trim()) return false;
  return true;
}

/**
 * C2: sponsored spotlight comes from the catalog tile, not the client body.
 * @param {object|null|undefined} tile
 */
export function tileIsSponsored(tile) {
  if (!tile || typeof tile !== "object") return false;
  return Boolean(String(tile.sponsorName || tile.mission?.sponsorName || "").trim());
}

/**
 * Optional campaign id for sponsor invent counts (not PII).
 * @param {object|null|undefined} tile
 */
export function campaignIdFromTile(tile) {
  const raw = tile?.campaignId || tile?.mission?.campaignId || tile?.sponsorCampaignId;
  const s = String(raw || "").trim().slice(0, 80);
  return /^[A-Za-z0-9._:-]+$/.test(s) ? s : null;
}

export function requireCloudAccount(ident) {
  if (!ident?.enabled) return { ok: true };
  if (ident.signedIn) return { ok: true };
  return { ok: false, status: 401, error: "sign_in_required" };
}

/**
 * Clone a tile for the public catalog: drop hidden tutor curriculum.
 * Official remote tiles use {@link catalogCard} instead. This remains for
 * callers that only need the tutor notes removed.
 * @param {object} tile
 */
export function publicCatalogTile(tile) {
  if (!tile || typeof tile !== "object") return tile;
  const out = { ...tile };
  delete out.aiTutorContext;
  if (out.mission && typeof out.mission === "object") {
    out.mission = { ...out.mission };
    delete out.mission.aiTutorContext;
  }
  return out;
}

/**
 * Hub card for a quest the caller may not read. No mission body and no tutor notes.
 * @param {object} tile
 */
export function catalogCard(tile) {
  if (!tile || typeof tile !== "object") return tile;
  const mission = tile.mission && typeof tile.mission === "object" ? tile.mission : {};
  const rawTile = tile.tile && typeof tile.tile === "object" ? tile.tile : {};
  const lessons = Array.isArray(tile.lessons)
    ? tile.lessons
    : Array.isArray(rawTile.lessons)
      ? rawTile.lessons
      : [];
  /** @type {Record<string, unknown>} */
  const card = {
    id: String(tile.id || mission.id || ""),
    title: String(tile.title || mission.title || ""),
    summary: String(tile.summary || mission.summary || "").slice(0, 280),
    access: tileAccess(tile),
    kind: tile.kind || rawTile.kind || "quest",
    source: String(tile.source || mission.source || rawTile.source || "remote"),
    gated: true,
  };
  const entitlement = String(
    tile.entitlement || mission.entitlement || rawTile.entitlement || ""
  ).trim();
  if (entitlement) card.entitlement = entitlement;
  const sponsor = String(
    tile.sponsorName || mission.sponsorName || rawTile.sponsorName || ""
  ).trim();
  if (sponsor) card.sponsorName = sponsor;
  const moduleName = tile.module || mission.module || rawTile.module;
  if (typeof moduleName === "string" && moduleName.trim()) card.module = moduleName.trim();
  const lesson = tile.lesson ?? mission.lesson ?? rawTile.lesson;
  if (lesson != null && lesson !== "") card.lesson = lesson;
  const total = tile.totalLessons ?? mission.totalLessons ?? rawTile.totalLessons;
  if (total != null && total !== "") card.totalLessons = total;
  const globalId = String(tile.globalId || mission.globalId || rawTile.globalId || "").trim();
  if (globalId) card.globalId = globalId;
  const place = String(tile.place || mission.place || rawTile.place || "").trim();
  if (place) card.place = place;
  if (
    tile.isLearningModule === true ||
    mission.isLearningModule === true ||
    rawTile.isLearningModule === true ||
    card.kind === "module"
  ) {
    card.isLearningModule = true;
  }
  if (lessons.length) card.lessons = lessons.map((id) => String(id));
  const companion = publicCompanionSlice(
    tile.companion || mission.companion || rawTile.companion
  );
  if (companion) card.companion = companion;
  return card;
}

/**
 * Whether this caller may receive the quest JSON.
 * Clerk off and Library side-load are always allowed.
 * @param {object} tile
 * @param {object|null|undefined} ident
 * @param {{ entitled?: boolean }} [opts]
 * @returns {{ allow: true } | { allow: false, status: number, error: string }}
 */
export function questReadDecision(tile, ident, opts = {}) {
  if (!tile || typeof tile !== "object") return { allow: true };
  if (!ident?.enabled) return { allow: true };
  if (isLibraryCatalogEntry(tile)) return { allow: true };
  const access = tileAccess(tile);
  if (access === ACCESS.OPEN) return { allow: true };
  if (!ident.signedIn) {
    return { allow: false, status: 401, error: "sign_in_required" };
  }
  if (access === ACCESS.PAID && needsPlayerBilling(tile) && !opts.entitled) {
    return { allow: false, status: 402, error: "content_required" };
  }
  return { allow: true };
}

/**
 * Full tile when the caller may read it. Otherwise a hub card with no body.
 * @param {object} tile
 * @param {object|null|undefined} ident
 * @param {{ entitled?: boolean }} [opts]
 */
export function applyCatalogGate(tile, ident, opts = {}) {
  if (questReadDecision(tile, ident, opts).allow) return tile;
  return catalogCard(tile);
}

/**
 * @param {object|null|undefined} context
 */
export function isTutorContext(context) {
  if (context?.tutorMode === true) return true;
  if (context?.tutorMode === false) return false;
  return context?.isLearningModule === true;
}

/**
 * Hosted lesson tutor text. Signed-in callers skip the paid quota.
 * Images, speech, and voice stay on the paid plan.
 * @param {string} route
 * @param {object|null|undefined} body
 */
export function hostedLessonSkipsQuota(route, body) {
  return route === "co-invent" && isTutorContext(body?.context);
}

/**
 * A catalog lesson may be tutored without plan `cloud`.
 * Library tiles and open quests stay on the paid path.
 * @param {object|null|undefined} tile
 */
export function catalogLessonSkipsQuota(tile) {
  return tileAccess(tile) === ACCESS.ACCOUNT;
}

/**
 * @param {object|null|undefined} context
 * @returns {string|null}
 */
export function questIdFromContext(context) {
  if (!context || typeof context !== "object") return null;
  const id =
    context.questId ||
    context.mission?.id ||
    context.challenge?.id ||
    null;
  if (id == null) return null;
  const s = String(id).trim();
  return s || null;
}

/**
 * When Clerk is on, curated remote tutor sessions require sign-in and take
 * aiTutorContext from the server catalog tile — never from the client body.
 * Library sessions keep the side-loaded JSON notes and skip the account door.
 *
 * @param {object|null|undefined} context
 * @param {object|null|undefined} ident
 * @param {object|null|undefined} catalogTile
 * @param {{ entitled?: boolean }} [opts]
 */
export function prepareTutorContext(context, ident, catalogTile, opts = {}) {
  const ctx = context && typeof context === "object" ? context : {};
  if (!ident?.enabled) return { ok: true, context: ctx };
  if (!isTutorContext(ctx)) return { ok: true, context: ctx };

  if (isLibraryCatalogEntry(ctx) || isLibraryCatalogEntry(catalogTile)) {
    return { ok: true, context: ctx };
  }

  const account = requireCloudAccount(ident);
  if (!account.ok) return account;
  if (needsPlayerBilling(catalogTile) && !opts.entitled) {
    return { ok: false, status: 402, error: "content_required" };
  }

  const next = { ...ctx };
  delete next.aiTutorContext;
  if (next.mission && typeof next.mission === "object") {
    next.mission = { ...next.mission };
    delete next.mission.aiTutorContext;
  }

  const secret =
    (typeof catalogTile?.aiTutorContext === "string" &&
      catalogTile.aiTutorContext.trim()) ||
    (typeof catalogTile?.mission?.aiTutorContext === "string" &&
      catalogTile.mission.aiTutorContext.trim()) ||
    null;
  if (secret && mayReadSecrets(ident, catalogTile) && questReadDecision(catalogTile, ident, opts).allow) {
    next.aiTutorContext = secret;
  }
  return { ok: true, context: next };
}

/**
 * Replace client-supplied tutor notes with the catalog tile the portal allowed.
 * A missing tile drops the notes.
 * @param {object|null|undefined} context
 * @param {object|null|undefined} catalogTile
 */
export function tutorContextFromCatalogTile(context, catalogTile) {
  const ctx = context && typeof context === "object" ? { ...context } : {};
  delete ctx.aiTutorContext;
  if (ctx.mission && typeof ctx.mission === "object") {
    ctx.mission = { ...ctx.mission };
    delete ctx.mission.aiTutorContext;
  }
  const secret =
    (typeof catalogTile?.aiTutorContext === "string" &&
      catalogTile.aiTutorContext.trim()) ||
    (typeof catalogTile?.mission?.aiTutorContext === "string" &&
      catalogTile.mission.aiTutorContext.trim()) ||
    "";
  if (secret) ctx.aiTutorContext = secret;
  return ctx;
}
