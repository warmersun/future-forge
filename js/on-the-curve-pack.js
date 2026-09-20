/**
 * Parse docs/on-the-curve-recording-pack.md into the 18 shot-list clips,
 * Say lines, Record beats, and friend-cut order. TTS, mux, concat, and the
 * VO check all read this — not a second handwritten shot list.
 */

export const PACK_REL = "docs/on-the-curve-recording-pack.md";
export const CLIP_COUNT = 18;
export const FRIEND_CUT_ORDER = [1, 8, 10, 11, 5, 14, 16];
export const QUEST_ID = "spotlight-gene-seq-border-clinic-2026";
export const START_YEAR = 2026;

/** Extra pack “Do not say” phrases not already covered by DO_NOT_SAY. */
export const PACK_DO_NOT_SAY_EXTRA =
  /\b(catalog id|unlock the card|locked until|wait to unlock|score function|average of two tiles)\b/i;

/**
 * @param {string} markdown
 * @returns {{
 *   shots: Array<{
 *     n: number,
 *     file: string,
 *     id: string,
 *     lesson: string,
 *     friendCut: boolean,
 *     say: string,
 *     record: string,
 *     teaches: string,
 *   }>,
 *   friendCutOrder: number[],
 *   seriesLine: string,
 *   sting: string,
 * }}
 */
export function parseOnTheCurvePack(markdown) {
  const text = String(markdown || "");
  const byN = new Map();
  const tableRe =
    /^\|\s*(\d+)\s*\|\s*`([^`]+?\.mp4)`\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\|/gm;
  for (const m of text.matchAll(tableRe)) {
    const n = Number(m[1]);
    if (!Number.isInteger(n) || n < 1) continue;
    byN.set(n, {
      n,
      file: m[2].trim(),
      lesson: m[3].trim(),
      friendCut: /\*\*Yes\*\*/i.test(m[4] || ""),
    });
  }

  const says = [...text.matchAll(/\*\*Say:\*\*\s*[“"]([\s\S]*?)[”"]/g)].map((m) =>
    m[1].replace(/\s+/g, " ").trim()
  );
  const records = [...text.matchAll(/\*\*Record:\*\*\s*([^\n]+)/g)].map((m) =>
    m[1].trim()
  );
  const teaches = [...text.matchAll(/\*\*Teaches:\*\*\s*([^\n]+)/g)].map((m) =>
    m[1].trim()
  );

  const fcMatch = text.match(
    /Friend['’]s short cut[^:\n]*:\s*([0-9\s→\->,and]+)/i
  );
  let friendCutOrder = [...FRIEND_CUT_ORDER];
  if (fcMatch) {
    const nums = (fcMatch[1].match(/\d+/g) || []).map(Number).filter((n) => n >= 1);
    if (nums.length) friendCutOrder = nums;
  }

  const seriesLine = (
    text.match(/\*\*Series line:\*\*\s*([^\n]+)/) || []
  )[1]?.trim() || "";
  const sting = (
    text.match(/\*\*Sting[^*]*\*\*[^*]*\*([^*]+)\*/) || []
  )[1]?.trim() || "";

  const shots = [];
  for (let n = 1; n <= CLIP_COUNT; n++) {
    const row = byN.get(n) || {};
    const file = row.file || `${String(n).padStart(2, "0")}-missing.mp4`;
    shots.push({
      n,
      file,
      id: file.replace(/\.mp4$/i, ""),
      lesson: row.lesson || "",
      friendCut: Boolean(row.friendCut),
      say: says[n - 1] || "",
      record: records[n - 1] || "",
      teaches: teaches[n - 1] || "",
    });
  }

  return { shots, friendCutOrder, seriesLine, sting };
}

/**
 * Independent extract of **Say:** lines (used by the test to prove the parser
 * did not invent copy).
 * @param {string} markdown
 * @returns {string[]}
 */
export function extractSayLines(markdown) {
  return [...String(markdown || "").matchAll(/\*\*Say:\*\*\s*[“"]([\s\S]*?)[”"]/g)].map(
    (m) => m[1].replace(/\s+/g, " ").trim()
  );
}

/**
 * @param {string} rootDir
 * @param {import("node:fs")} fs
 * @param {import("node:path")} path
 */
export function loadOnTheCurvePackSync(rootDir, fs, path) {
  const file = path.join(rootDir, PACK_REL);
  const markdown = fs.readFileSync(file, "utf8");
  return { file, markdown, ...parseOnTheCurvePack(markdown) };
}
