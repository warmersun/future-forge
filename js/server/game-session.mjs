/**
 * Long-lived game session JWT minted after a Clerk handshake.
 * Clerk session tokens from getToken() expire in ~60s; the game stores the
 * handshake JWT in sessionStorage and must not replay that short-lived token.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeClerkUserId } from "./clerk-id.mjs";

export const GAME_SESSION_TYP = "ff_game";
export const GAME_SESSION_ISS = "ff-portal";
export const GAME_SESSION_TTL_SEC = 12 * 60 * 60;

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function gameSessionSecretFromEnv(env = process.env) {
  return String(
    env.FF_PORTAL_SESSION_SECRET || env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY || ""
  ).trim();
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {unknown} token
 */
export function isGameSessionToken(token) {
  const payload = decodeJwtPayload(token);
  return payload?.typ === GAME_SESSION_TYP;
}

function signHs256(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyHs256(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", secret).update(data).digest();
  let actual;
  try {
    actual = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {{ userId?: string|null, sessionId?: string|null }} ident
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {{ nowSec?: number, ttlSec?: number }} [opts]
 * @returns {string|null}
 */
export function mintGameSessionToken(ident, env = process.env, opts = {}) {
  const secret = gameSessionSecretFromEnv(env);
  const userId = normalizeClerkUserId(ident?.userId);
  if (!secret || !userId) return null;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSec ?? GAME_SESSION_TTL_SEC;
  const sid = normalizeClerkUserId(ident?.sessionId);
  return signHs256(
    {
      sub: userId,
      ...(sid ? { sid } : {}),
      typ: GAME_SESSION_TYP,
      iss: GAME_SESSION_ISS,
      iat: now,
      exp: now + ttl,
    },
    secret
  );
}

/**
 * @param {string} token
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @param {{ nowSec?: number }} [opts]
 * @returns {{ sub: string, sid?: string }}
 */
export function verifyGameSessionToken(token, env = process.env, opts = {}) {
  const secret = gameSessionSecretFromEnv(env);
  if (!secret) throw new Error("game_session_secret_missing");
  const payload = verifyHs256(token, secret);
  if (!payload || payload.typ !== GAME_SESSION_TYP) throw new Error("not_game_session");
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (payload.exp != null && Number(payload.exp) <= now) throw new Error("expired");
  const userId = normalizeClerkUserId(payload.sub);
  if (!userId) throw new Error("no_sub");
  const sid = normalizeClerkUserId(payload.sid);
  return sid ? { sub: userId, sid } : { sub: userId };
}
