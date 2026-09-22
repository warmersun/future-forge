/**
 * Lesson pictures and reading links inside aiTutorContext.
 * https only, same family as chat Markdown. Ids are first-seen order.
 */

export const LESSON_IMAGE_CAP = 8;
export const LESSON_LINK_CAP = 12;
export const TUTOR_NOTE_CAP = 2500;

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
  const url = text.slice(closeLabel + 2, j - 1).trim();
  return { label: label.slice(0, 160), url, end: j };
}

/**
 * @param {string} url
 */
export function isLessonHttps(url) {
  const u = String(url || "").trim();
  if (!/^https:\/\//i.test(u)) return false;
  if (/[\s<>"']/.test(u)) return false;
  return true;
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
  const stripped = out.replace(/https?:\/\/[^\s<>)\]]+/gi, "");
  const trimmed = stripped.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return trimmed ? trimmed.slice(0, TUTOR_NOTE_CAP) : "";
}

/**
 * @param {{ images?: unknown[], links?: unknown[] }|null|undefined} media
 */
export function hasLessonMedia(media) {
  return Boolean(media && (media.images?.length || media.links?.length));
}
