/**
 * Lesson pictures and reading links inside aiTutorContext.
 * Catalog entries are https, or http on localhost. Ids are first-seen order.
 * Package paths (lessons/…, assets/…) are joined to a content root first.
 */

import { unwrapMarkdownDestination } from "./md-lite.js?v=voice-18";

export const LESSON_IMAGE_CAP = 8;
export const LESSON_LINK_CAP = 12;
export const TUTOR_NOTE_CAP = 2500;

/** Stills the game already serves. A package root must not swallow them. */
const GAME_ASSET_PREFIXES = ["assets/problems/", "assets/quests/"];

/**
 * @param {string} text
 * @param {number} openBracket index of `[`
 * @returns {{ label: string, url: string, end: number }|null}
 */
function parseMdLink(text, openBracket) {
  if (text[openBracket] !== "[") return null;
  const closeLabel = text.indexOf("]", openBracket + 1);
  if (closeLabel < 0 || text[closeLabel + 1] !== "(") return null;
  const label = text.slice(openBracket + 1, closeLabel).replace(/\s+/g, " ").trim();
  let j = closeLabel + 2;
  let depth = 1;
  while (j < text.length && depth > 0) {
    if (text[j] === "(") depth += 1;
    else if (text[j] === ")") depth -= 1;
    j += 1;
  }
  if (depth !== 0) return null;
  const url = unwrapMarkdownDestination(text.slice(closeLabel + 2, j - 1));
  return { label: label.slice(0, 160), url, end: j };
}

/**
 * Short reading name for a bare URL. No scheme, so a voice prompt can list it.
 * @param {string} url
 */
function bareReadingLabel(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    const tail = path && path !== "/" ? `${u.hostname}${path}` : u.hostname;
    return tail.slice(0, 160) || "Reading";
  } catch {
    return "Reading";
  }
}

/**
 * @param {string} url
 */
function pageIsFile() {
  try {
    return typeof location !== "undefined" && location.protocol === "file:";
  } catch {
    return false;
  }
}

/**
 * Lesson media the tutor may fetch.
 * https anywhere. http only on localhost. file only when this page is file:.
 * @param {string} url
 */
export function isLessonHttps(url) {
  const u = String(url || "").trim();
  if (!u || /[\s<>"']/.test(u) || u.includes("..")) return false;
  if (/^https:\/\//i.test(u)) return true;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(u)) return true;
  if (/^file:\/\//i.test(u) && pageIsFile()) return true;
  return false;
}

/**
 * @param {string} root
 */
function withSlash(root) {
  const s = String(root || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s : `${s}/`;
}

/**
 * Join a package-relative lesson or asset URL onto a content root.
 * Hosted URLs and game stills stay as written.
 * @param {string} url
 * @param {string} lessonRoot
 * @param {string} assetRoot
 * @returns {string|null}
 */
function boundPackageUrl(url, lessonRoot, assetRoot, includeGameStills) {
  const raw = unwrapMarkdownDestination(url);
  if (!raw || /[\s<>"']/.test(raw) || raw.includes("..")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return null;
  const cut = raw.search(/[?#]/);
  const suffix = cut >= 0 ? raw.slice(cut) : "";
  const path = (cut >= 0 ? raw.slice(0, cut) : raw).replace(/^\/+/, "");
  if (path.startsWith("lessons/") && lessonRoot) {
    return lessonRoot + path.slice("lessons/".length) + suffix;
  }
  if (path.startsWith("assets/") && assetRoot) {
    if (
      !includeGameStills &&
      GAME_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      return null;
    }
    return assetRoot + path.slice("assets/".length) + suffix;
  }
  return null;
}

/**
 * One package path joined to lesson/asset roots. Absolute URLs stay as written.
 * @param {string} url
 * @param {{ lessonRoot?: string, assetRoot?: string, includeGameStills?: boolean }} [roots]
 * @returns {string}
 */
export function resolvePackageMediaUrl(url, roots = {}) {
  const raw = unwrapMarkdownDestination(url);
  if (!raw) return "";
  const next = boundPackageUrl(
    raw,
    withSlash(roots.lessonRoot),
    withSlash(roots.assetRoot),
    Boolean(roots.includeGameStills)
  );
  return next || raw;
}

/**
 * Lesson and asset roots for a remote tile or catalog URL.
 * Staging uses …/staging/&lt;token&gt;/lessons/ and …/quests/package/assets/.
 * @param {string} remoteUrl
 * @returns {{ lessonRoot: string, assetRoot: string, includeGameStills: true }|null}
 */
export function mediaRootsFromRemoteUrl(remoteUrl) {
  const raw = String(remoteUrl || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const path = u.pathname;
  const staging = /^(.*\/staging\/[^/]+\/)/.exec(path);
  if (staging) {
    const base = `${u.origin}${staging[1]}`;
    return {
      lessonRoot: `${base}lessons/`,
      assetRoot: `${base}quests/package/assets/`,
      includeGameStills: true,
    };
  }
  const questsAt = path.indexOf("/quests/");
  if (questsAt < 0) return null;
  const site = `${u.origin}${path.slice(0, questsAt)}`;
  const packageMark = "/quests/package/";
  const packageAt = path.indexOf(packageMark);
  const assetRoot =
    packageAt >= 0
      ? `${u.origin}${path.slice(0, packageAt + packageMark.length)}assets/`
      : `${site}/quests/package/assets/`;
  return {
    lessonRoot: `${site}/lessons/`,
    assetRoot,
    includeGameStills: true,
  };
}

/**
 * Turn lessons/ and assets/ markdown targets into absolute content URLs.
 * @param {unknown} raw
 * @param {{ lessonRoot?: string, assetRoot?: string, includeGameStills?: boolean }} [roots]
 */
export function bindPackageMediaUrls(raw, roots = {}) {
  const text = String(raw || "");
  const lessonRoot = withSlash(roots.lessonRoot);
  const assetRoot = withSlash(roots.assetRoot);
  const includeGameStills = Boolean(roots.includeGameStills);
  if (!text || (!lessonRoot && !assetRoot)) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    const image = text[i] === "!" && text[i + 1] === "[";
    if (image || text[i] === "[") {
      const parsed = parseMdLink(text, image ? i + 1 : i);
      if (parsed) {
        const next = boundPackageUrl(parsed.url, lessonRoot, assetRoot, includeGameStills);
        if (next) {
          out += `${image ? "!" : ""}[${parsed.label}](${next})`;
        } else {
          out += text.slice(i, parsed.end);
        }
        i = parsed.end;
        continue;
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{ images: { id: string, alt: string, url: string }[], links: { id: string, label: string, url: string }[] }}
 */
export function listLessonMedia(raw) {
  const text = String(raw || "");
  /** @type {{ id: string, alt: string, url: string }[]} */
  const images = [];
  /** @type {{ id: string, label: string, url: string }[]} */
  const links = [];
  const seenImg = new Set();
  const seenLink = new Set();
  let i = 0;
  while (i < text.length) {
    const image = text[i] === "!" && text[i + 1] === "[";
    if (image || text[i] === "[") {
      const parsed = parseMdLink(text, image ? i + 1 : i);
      if (parsed && isLessonHttps(parsed.url)) {
        if (image) {
          if (!seenImg.has(parsed.url) && images.length < LESSON_IMAGE_CAP) {
            seenImg.add(parsed.url);
            images.push({
              id: `img${images.length + 1}`,
              alt: parsed.label,
              url: parsed.url,
            });
          }
        } else if (!seenLink.has(parsed.url) && links.length < LESSON_LINK_CAP) {
          seenLink.add(parsed.url);
          links.push({
            id: `link${links.length + 1}`,
            label: parsed.label,
            url: parsed.url,
          });
        }
        i = parsed.end;
        continue;
      }
    }
    const bare = /^<?(https?:\/\/[^\s<>)\]]+)>?/i.exec(text.slice(i));
    if (bare) {
      let url = bare[1];
      while (url.length && /[.,);:!?]$/.test(url)) url = url.slice(0, -1);
      if (isLessonHttps(url) && !seenLink.has(url) && links.length < LESSON_LINK_CAP) {
        seenLink.add(url);
        links.push({
          id: `link${links.length + 1}`,
          label: bareReadingLabel(url),
          url,
        });
      }
      i += bare[0].length;
      continue;
    }
    i += 1;
  }
  return { images, links };
}

/**
 * Tutor notes for the spoken prompt: markdown URLs become catalog ids.
 * Leftover https URLs are removed. No URLs remain.
 * @param {unknown} raw
 * @param {{ images?: { id: string, url: string }[], links?: { id: string, url: string }[] }} [media]
 */
export function tutorNotesForVoice(raw, media) {
  const text = String(raw || "");
  const catalog = media || listLessonMedia(text);
  const imgByUrl = new Map((catalog.images || []).map((item) => [item.url, item.id]));
  const linkByUrl = new Map((catalog.links || []).map((item) => [item.url, item.id]));
  let out = "";
  let i = 0;
  while (i < text.length) {
    const image = text[i] === "!" && text[i + 1] === "[";
    if (image || text[i] === "[") {
      const parsed = parseMdLink(text, image ? i + 1 : i);
      if (parsed) {
        const id = image ? imgByUrl.get(parsed.url) : linkByUrl.get(parsed.url);
        out += id || parsed.label;
        i = parsed.end;
        continue;
      }
    }
    out += text[i];
    i += 1;
  }
  const stripped = out.replace(/<?(https?:\/\/[^\s<>)\]]+)>?/gi, (full, url) => {
    let clean = url;
    while (clean.length && /[.,);:!?]$/.test(clean)) clean = clean.slice(0, -1);
    return linkByUrl.get(clean) || linkByUrl.get(url) || "";
  });
  const trimmed = stripped.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return trimmed ? trimmed.slice(0, TUTOR_NOTE_CAP) : "";
}

/**
 * @param {{ images?: unknown[], links?: unknown[] }|null|undefined} media
 */
export function hasLessonMedia(media) {
  return Boolean(media && (media.images?.length || media.links?.length));
}
