/**
 * A1 account door for Warmer Sun Cloud.
 * When Clerk is off, nothing is gated (self-host / LAN).
 * When Clerk is on, learning (and access:account|paid) tiles need a session
 * to receive aiTutorContext and to run tutor-mode co-invent.
 *
 * Public CDN catalogs may still contain tutor text until the gated here.now
 * split (H). This module only gates *our* API and the in-app tutor.
 */

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
 * @param {object} tile
 * @param {object|null|undefined} ident
 */
export function applyCatalogGate(tile, ident) {
  if (mayReadSecrets(ident, tile)) return tile;
  return publicCatalogTile(tile);
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
 * When Clerk is on, tutor sessions require sign-in and take aiTutorContext
 * from the server catalog tile — never from the client body.
 *
 * @param {object|null|undefined} context
 * @param {object|null|undefined} ident
 * @param {object|null|undefined} catalogTile
 */
export function prepareTutorContext(context, ident, catalogTile) {
  const ctx = context && typeof context === "object" ? context : {};
  if (!ident?.enabled) return { ok: true, context: ctx };
  if (!isTutorContext(ctx)) return { ok: true, context: ctx };

  const account = requireCloudAccount(ident);
  if (!account.ok) return account;

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
  if (secret && mayReadSecrets(ident, catalogTile)) {
    next.aiTutorContext = secret;
  }
  return { ok: true, context: next };
}
