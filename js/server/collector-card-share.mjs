/**
 * Open Graph / X preview of a collector card: the plated artwork, not the bare file.
 * 1200×630 JPEG, cached by card id and updated_at.
 */

import sharp from "sharp";
import {
  CARD_SHARE_HEIGHT,
  CARD_SHARE_WIDTH,
  cardEdition,
  domainRgb,
} from "./collector-cards.mjs";

export { CARD_SHARE_HEIGHT, CARD_SHARE_WIDTH };

const CACHE_MAX = 32;
/** @type {Map<string, Buffer>} */
const cache = new Map();

/**
 * @param {string} id
 * @param {unknown} updatedAt
 */
export function shareCacheKey(id, updatedAt) {
  return `${id}\0${stampOf(updatedAt)}`;
}

/**
 * @param {unknown} updatedAt
 */
function stampOf(updatedAt) {
  if (!updatedAt) return "0";
  const d = new Date(/** @type {string|number|Date} */ (updatedAt));
  return Number.isNaN(d.getTime()) ? String(updatedAt) : d.toISOString();
}

/**
 * @param {string} s
 */
function xml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plate, 16:9 mat, and where the artwork sits. The mat keeps the whole picture.
 */
function plateLayout() {
  const W = CARD_SHARE_WIDTH;
  const H = CARD_SHARE_HEIGHT;
  const plate = { x: 28, y: 24, w: W - 56, h: H - 48, r: 22 };
  const pad = 16;
  const caption = 40;
  const inner = {
    x: plate.x + pad,
    y: plate.y + pad,
    w: plate.w - pad * 2,
    h: plate.h - pad - caption,
  };
  let artW = inner.w;
  let artH = Math.round(artW / (16 / 9));
  if (artH > inner.h) {
    artH = inner.h;
    artW = Math.round(artH * (16 / 9));
  }
  const art = {
    x: inner.x + Math.round((inner.w - artW) / 2),
    y: inner.y + Math.round((inner.h - artH) / 2),
    w: artW,
    h: artH,
  };
  return { W, H, plate, art };
}

/**
 * @param {string} rgb
 * @param {{ x: number, y: number, w: number, h: number, r: number }} plate
 * @param {number} W
 * @param {number} H
 */
function fieldSvg(rgb, plate, W, H) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="a" cx="16%" cy="28%" r="58%">
        <stop offset="0%" stop-color="rgb(${rgb})" stop-opacity="0.46"/>
        <stop offset="68%" stop-color="rgb(${rgb})" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="b" cx="88%" cy="84%" r="48%">
        <stop offset="0%" stop-color="rgb(${rgb})" stop-opacity="0.24"/>
        <stop offset="72%" stop-color="rgb(${rgb})" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="c" cx="50%" cy="110%" r="42%">
        <stop offset="0%" stop-color="#e4c56a" stop-opacity="0.18"/>
        <stop offset="74%" stop-color="#e4c56a" stop-opacity="0"/>
      </radialGradient>
      <filter id="halo" x="-35%" y="-45%" width="170%" height="190%">
        <feGaussianBlur stdDeviation="16"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="#05070d"/>
    <rect width="${W}" height="${H}" fill="url(#a)"/>
    <rect width="${W}" height="${H}" fill="url(#b)"/>
    <rect width="${W}" height="${H}" fill="url(#c)"/>
    <rect x="${plate.x}" y="${plate.y + 16}" width="${plate.w}" height="${plate.h}" rx="${plate.r}" fill="rgb(${rgb})" opacity="0.62" filter="url(#halo)"/>
  </svg>`;
}

/**
 * @param {{ x: number, y: number, w: number, h: number, r: number }} plate
 */
function washDimSvg(plate) {
  return `<svg width="${plate.w}" height="${plate.h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="dim" cx="50%" cy="46%" r="72%">
        <stop offset="42%" stop-color="#05070d" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#05070d" stop-opacity="0.58"/>
      </radialGradient>
    </defs>
    <rect width="${plate.w}" height="${plate.h}" rx="${plate.r}" fill="url(#dim)"/>
  </svg>`;
}

/**
 * @param {object} box
 * @param {{ x: number, y: number, w: number, h: number }} art
 * @param {string} edition
 * @param {number} W
 * @param {number} H
 */
function frameSvg(box, art, edition, W, H) {
  const inset = 12;
  const arm = 18;
  const x1 = box.x + inset;
  const y1 = box.y + inset;
  const x2 = box.x + box.w - inset;
  const y2 = box.y + box.h - inset;
  const tick = `fill="none" stroke="#e4c56a" stroke-width="2" stroke-linecap="square"`;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="${art.x}" y1="${art.y}" x2="${art.x + art.w}" y2="${art.y + art.h}">
        <stop offset="38%" stop-color="#fff8e6" stop-opacity="0"/>
        <stop offset="49%" stop-color="#fff8e6" stop-opacity="0.07"/>
        <stop offset="52%" stop-color="#fff8e6" stop-opacity="0.22"/>
        <stop offset="56%" stop-color="#fff8e6" stop-opacity="0.07"/>
        <stop offset="68%" stop-color="#fff8e6" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="vig" cx="50%" cy="46%" r="68%">
        <stop offset="58%" stop-color="#05070d" stop-opacity="0"/>
        <stop offset="100%" stop-color="#05070d" stop-opacity="0.32"/>
      </radialGradient>
      <clipPath id="artClip">
        <rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#artClip)">
      <rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" fill="url(#sheen)"/>
      <rect x="${art.x}" y="${art.y}" width="${art.w}" height="${art.h}" fill="url(#vig)"/>
    </g>
    <rect x="${art.x + 0.5}" y="${art.y + 0.5}" width="${art.w - 1}" height="${art.h - 1}" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
    <rect x="${box.x + 5}" y="${box.y + 5}" width="${box.w - 10}" height="${box.h - 10}" rx="${Math.max(box.r - 4, 0)}" fill="none" stroke="#fff8e6" stroke-opacity="0.14" stroke-width="1"/>
    <rect x="${box.x + 0.75}" y="${box.y + 0.75}" width="${box.w - 1.5}" height="${box.h - 1.5}" rx="${box.r}" fill="none" stroke="#e4c56a" stroke-opacity="0.86" stroke-width="1.75"/>
    <path ${tick} d="M${x1} ${y1 + arm} V${y1} H${x1 + arm}"/>
    <path ${tick} d="M${x2 - arm} ${y1} H${x2} V${y1 + arm}"/>
    <path ${tick} d="M${x1} ${y2 - arm} V${y2} H${x1 + arm}"/>
    <path ${tick} d="M${x2 - arm} ${y2} H${x2} V${y2 - arm}"/>
    <text x="${box.x + box.w - 22}" y="${box.y + box.h - 15}" text-anchor="end" fill="#f6e7b8" font-family="DejaVu Sans, Liberation Sans, Noto Sans, sans-serif" font-size="22" font-weight="700" letter-spacing="0.8">${xml(edition)}</text>
  </svg>`;
}

/**
 * @param {{ w: number, h: number, r: number }} plate
 */
function washMask(plate) {
  return Buffer.from(
    `<svg width="${plate.w}" height="${plate.h}" xmlns="http://www.w3.org/2000/svg"><rect width="${plate.w}" height="${plate.h}" rx="${plate.r}" fill="#fff"/></svg>`
  );
}

/**
 * @param {Buffer} bytes
 * @param {ReturnType<typeof plateLayout>} lay
 */
async function blurredWash(bytes, lay) {
  const { plate } = lay;
  const covered = await sharp(bytes)
    .resize(plate.w, plate.h, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.66, saturation: 1.45 })
    .blur(20)
    .ensureAlpha()
    .png()
    .toBuffer();
  return sharp(covered).composite([{ input: washMask(plate), blend: "dest-in" }]).png().toBuffer();
}

/**
 * @param {{ id: string, techId: string, bytes: Buffer }} card
 */
async function composeShareImage(card) {
  const lay = plateLayout();
  const { W, H, plate, art } = lay;
  const rgb = domainRgb(card.techId);
  const edition = cardEdition(card.id);
  const bytes = Buffer.isBuffer(card.bytes) ? card.bytes : Buffer.from(card.bytes);
  const [wash, picture] = await Promise.all([
    blurredWash(bytes, lay),
    sharp(bytes)
      .resize(art.w, art.h, {
        fit: "contain",
        background: { r: 11, g: 13, b: 18, alpha: 1 },
      })
      .jpeg({ quality: 92 })
      .toBuffer(),
  ]);
  return sharp(Buffer.from(fieldSvg(rgb, plate, W, H)))
    .resize(W, H)
    .composite([
      { input: wash, left: plate.x, top: plate.y },
      { input: Buffer.from(washDimSvg(plate)), left: plate.x, top: plate.y },
      { input: picture, left: art.x, top: art.y },
      { input: Buffer.from(frameSvg(plate, art, edition, W, H)), left: 0, top: 0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

/**
 * @param {{ id: string, techId?: string, bytes: Buffer, updatedAt?: unknown }} card
 * @returns {Promise<Buffer>}
 */
export async function renderCollectorCardShare(card) {
  const key = shareCacheKey(card.id, card.updatedAt);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const jpeg = await composeShareImage({
    id: String(card.id || ""),
    techId: String(card.techId || ""),
    bytes: card.bytes,
  });
  cache.set(key, jpeg);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return jpeg;
}
