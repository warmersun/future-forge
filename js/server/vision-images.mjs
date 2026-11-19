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
 * Future Vision plates: one local person and one place per session,
 * plus the on-disk superhero for an emTech placement.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeCastPrompts,
  composeEditPrompt,
  composeGeneratePrompt,
  composeScenePrompt,
  visionImageRequest,
} from "../vision-prompt.mjs";
import { isSafeBriefImageUrl } from "../brief-beats.js";

const ASSET_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets");
const REPO_ROOT = path.join(ASSET_ROOT, "..");
const HERO_DIR = path.join(ASSET_ROOT, "superheroes");
const REFERENCE_BYTE_CAP = 12 * 1024 * 1024;

/** @type {Map<string, string>} */
const heroUrls = new Map();
/** @type {Map<string, string>} */
const referenceUrls = new Map();
/** @type {Map<string, Promise<object|null>>} */
const castFlights = new Map();

/**
 * @param {string} file
 * @returns {string|null}
 */
export function heroDataUrl(file) {
  const name = path.basename(String(file || ""));
  if (!name || name !== file || !name.endsWith(".png")) return null;
  if (heroUrls.has(name)) return heroUrls.get(name);
  const full = path.join(HERO_DIR, name);
  if (!full.startsWith(HERO_DIR)) return null;
  try {
    const buf = fs.readFileSync(full);
    const url = `data:image/png;base64,${buf.toString("base64")}`;
    heroUrls.set(name, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Bundled `assets/…` still, or null when the URL is remote or unsafe.
 * @param {string} url
 * @returns {string|null}
 */
function assetFileForBriefUrl(url) {
  const rel = String(url || "").trim().replace(/^\/+/, "");
  if (!rel || /^https?:/i.test(rel) || !isSafeBriefImageUrl(rel)) return null;
  const full = path.resolve(REPO_ROOT, rel);
  const root = path.resolve(ASSET_ROOT);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

/**
 * Public image host. Private, loopback, and link-local targets stay unread.
 * @param {string} url
 */
function publicImageUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return false;
  }
  if (host === "0.0.0.0" || host === "::1" || host === "169.254.169.254") return false;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Buffer} buf
 * @returns {string}
 */
function sniffImageMime(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

/**
 * Turn one authored plate URL into a data URL. A miss returns "" so Imagine can mint it.
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function loadVisionReferenceUrl(url) {
  const u = String(url || "").trim();
  if (!u || !isSafeBriefImageUrl(u)) return "";
  if (referenceUrls.has(u)) return referenceUrls.get(u) || "";
  try {
    /** @type {Buffer} */
    let buf;
    if (/^https?:/i.test(u)) {
      if (!publicImageUrl(u)) return "";
      const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (!res.ok || !publicImageUrl(res.url || u)) return "";
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      const file = assetFileForBriefUrl(u);
      if (!file) return "";
      buf = fs.readFileSync(file);
    }
    if (!buf.length || buf.length > REFERENCE_BYTE_CAP) return "";
    const mime = sniffImageMime(buf);
    if (!mime) return "";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    referenceUrls.set(u, dataUrl);
    return dataUrl;
  } catch {
    return "";
  }
}

/**
 * Load the plates the quest already ships. Missing keys stay absent.
 * @param {{ characterUrl?: string, locationUrl?: string }|null|undefined} refs
 * @returns {Promise<{ character?: string, location?: string }>}
 */
export async function resolveVisionReferencePlates(refs) {
  const characterUrl = String(refs?.characterUrl || "").trim();
  const locationUrl = String(refs?.locationUrl || "").trim();
  const [character, location] = await Promise.all([
    characterUrl ? loadVisionReferenceUrl(characterUrl) : "",
    locationUrl ? loadVisionReferenceUrl(locationUrl) : "",
  ]);
  return {
    ...(character ? { character } : {}),
    ...(location ? { location } : {}),
  };
}

/** Year changes the world card. The cast stays the person and the place. */
function castIdentity(worldCard) {
  return [worldCard?.missionId || "", worldCard?.place || "", worldCard?.title || "", worldCard?.scene || ""]
    .join("|")
    .toLowerCase();
}

/**
 * Mint or reuse the session's character and location plates.
 * Supplied data URLs win for that plate. `allowGenerate: false` installs
 * shipped plates only and returns null when either plate is still missing.
 * @param {string} sessionId
 * @param {{ missionId?: string, place?: string, title?: string, scene?: string, visualSetting?: string }} worldCard
 * @param {() => { key?: string, location?: string, character?: string }|null} readCast
 * @param {(cast: { key: string, location: string, character: string }) => void} writeCast
 * @param {(prompt: string, aspectRatio: string) => Promise<string>} generate
 * @param {{ supplied?: { character?: string, location?: string }, allowGenerate?: boolean }} [opts]
 * @returns {Promise<{ key: string, location: string, character: string }|null>}
 */
export function ensureVisionCast(sessionId, worldCard, readCast, writeCast, generate, opts) {
  const key = castIdentity(worldCard);
  const existing = readCast();
  if (existing?.key === key && existing.location && existing.character) {
    return Promise.resolve(existing);
  }
  const supplied = opts && typeof opts === "object" ? opts.supplied || {} : {};
  const allowGenerate = !opts || opts.allowGenerate !== false;
  const flightKey = `${sessionId}|${key}|${allowGenerate ? "gen" : "ref"}`;
  const inflight = castFlights.get(flightKey);
  if (inflight) return inflight;
  const prompts = composeCastPrompts(worldCard);
  const job = (async () => {
    const character =
      supplied.character || (allowGenerate ? await generate(prompts.character, "2:3") : "");
    const location =
      supplied.location || (allowGenerate ? await generate(prompts.location, "16:9") : "");
    if (!character || !location) return null;
    const cast = { key, character, location };
    writeCast(cast);
    return cast;
  })().finally(() => {
    if (castFlights.get(flightKey) === job) castFlights.delete(flightKey);
  });
  castFlights.set(flightKey, job);
  return job;
}

/**
 * Choose the Imagine call for this still. Plates win over the previous frame.
 * @param {{ worldCard: object, shot: object, stageId?: string, cast?: { location?: string, character?: string }|null, mode?: string, prevDataUrl?: string|null }} opts
 */
export function prepareSceneImage(opts) {
  const worldCard = opts.worldCard;
  const shot = opts.shot || {};
  const stageId = opts.stageId || "present";
  const mode = opts.mode === "edit" ? "edit" : "generate";
  const cast = opts.cast;
  const hero = shot.hero || null;
  /** @type {string[]} */
  const images = [];
  if (cast?.location && cast?.character) {
    images.push(cast.location, cast.character);
    if (hero?.file) {
      const heroUrl = heroDataUrl(hero.file);
      if (heroUrl) images.push(heroUrl);
    }
  }
  const heroInPrompt = images.length > 2 ? hero : null;
  const prompt = images.length
    ? composeScenePrompt(worldCard, shot, stageId, { hero: heroInPrompt })
    : mode === "edit"
      ? composeEditPrompt(worldCard, shot)
      : composeGeneratePrompt(worldCard, shot, stageId);
  const request = visionImageRequest({
    prompt,
    images,
    edit: mode === "edit",
    prevDataUrl: opts.prevDataUrl || null,
    aspectRatio: "16:9",
  });
  return { prompt, request, usedReferences: images.length > 0 };
}
