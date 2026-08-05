/**
 * Module pack schema: parse and validate multi-week inventing paths.
 * Modules order quest tiles; they do not replace quest atoms.
 */

import fs from "node:fs";
import path from "node:path";
import { validateQuestTile, parseQuestTileJson } from "./quest-tile.js";

export const MODULE_PACK_SCHEMA = "future-forge.module-pack/v1";

export const ACCESS_TIERS = new Set(["free", "deep"]);

export const CAPS = {
  id: 80,
  title: 120,
  summary: 400,
  theme: 80,
  weekTitle: 120,
  questFile: 260,
  primerMd: 20_000,
  tags: 20,
};

/**
 * @param {string | object} raw
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseModulePackJson(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, error: "not_object" };
  }
  return { ok: true, value: obj };
}

/**
 * @param {object} obj
 * @param {{
 *   baseDir?: string,
 *   validateQuests?: boolean,
 *   techIds?: string[],
 *   globalIds?: string[],
 * }} [opts]
 * @returns {{ ok: boolean, errors: string[], pack?: object }}
 */
export function validateModulePack(obj, opts = {}) {
  const errors = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, errors: ["not_object"] };
  }

  const schema = String(obj.schema || "");
  if (schema !== MODULE_PACK_SCHEMA) {
    errors.push(`bad_schema: expected ${MODULE_PACK_SCHEMA}`);
  }

  const kind = String(obj.kind || "");
  if (kind !== "module") {
    errors.push(`bad_kind: expected module, got ${kind || "(empty)"}`);
  }

  const id = slugId(obj.id);
  if (!id) errors.push("missing_id");

  const title = String(obj.title || "").trim();
  if (!title) errors.push("missing_title");
  if (title.length > CAPS.title) errors.push("title_too_long");

  const summary = String(obj.summary || "").trim();
  if (!summary) errors.push("missing_summary");
  if (summary.length > CAPS.summary) errors.push("summary_too_long");

  const access = String(obj.access || "").trim();
  if (!ACCESS_TIERS.has(access)) {
    errors.push(`bad_access: expected free|deep, got ${access || "(empty)"}`);
  }

  const theme = String(obj.theme || obj.focus || "").trim();
  if (!theme) errors.push("missing_theme");
  if (theme.length > CAPS.theme) errors.push("theme_too_long");

  const weeksIn = obj.weeks;
  if (!Array.isArray(weeksIn) || weeksIn.length === 0) {
    errors.push("missing_weeks");
  }

  /** @type {object[]} */
  const weeks = [];
  const seenWeeks = new Set();

  if (Array.isArray(weeksIn)) {
    weeksIn.forEach((w, i) => {
      const prefix = `weeks[${i}]`;
      if (!w || typeof w !== "object" || Array.isArray(w)) {
        errors.push(`${prefix}: not_object`);
        return;
      }

      const weekNum = resolveWeekNumber(w, i);
      if (weekNum == null) {
        errors.push(`${prefix}: missing_week_number`);
      } else if (!Number.isInteger(weekNum) || weekNum < 1) {
        errors.push(`${prefix}: bad_week_number`);
      } else if (seenWeeks.has(weekNum)) {
        errors.push(`${prefix}: duplicate_week:${weekNum}`);
      } else {
        seenWeeks.add(weekNum);
      }

      const weekTitle = String(w.title || "").trim();
      if (!weekTitle) errors.push(`${prefix}: missing_title`);
      if (weekTitle.length > CAPS.weekTitle) errors.push(`${prefix}: title_too_long`);

      const questFile =
        w.questFile != null ? String(w.questFile).trim() : "";
      const hasInlineQuest = w.quest != null && typeof w.quest === "object";

      if (!questFile && !hasInlineQuest) {
        errors.push(`${prefix}: missing_quest_ref`);
      }
      if (questFile) {
        if (questFile.length > CAPS.questFile) {
          errors.push(`${prefix}: quest_file_too_long`);
        }
        if (path.isAbsolute(questFile) || questFile.includes("..")) {
          errors.push(`${prefix}: quest_file_must_be_relative`);
        }
      }

      let primerMd;
      if (w.primerMd != null) {
        primerMd = String(w.primerMd);
        if (primerMd.length > CAPS.primerMd) {
          errors.push(`${prefix}: primer_md_too_long`);
        }
      }

      weeks.push({
        week: weekNum ?? i + 1,
        title: weekTitle.slice(0, CAPS.weekTitle),
        questFile: questFile || undefined,
        quest: hasInlineQuest ? w.quest : undefined,
        primerMd,
      });
    });
  }

  // Structural errors stop before optional quest-file checks
  if (errors.length) {
    return { ok: false, errors };
  }

  weeks.sort((a, b) => a.week - b.week);

  const baseDir = opts.baseDir ? path.resolve(opts.baseDir) : null;
  const validateQuests = opts.validateQuests !== false;
  const questOpts = {
    techIds: opts.techIds,
    globalIds: opts.globalIds,
  };

  /** @type {object[]} */
  const normalizedWeeks = [];

  for (const w of weeks) {
    const entry = {
      week: w.week,
      title: w.title,
      ...(w.questFile ? { questFile: w.questFile } : {}),
      ...(w.primerMd != null && w.primerMd !== "" ? { primerMd: w.primerMd } : {}),
    };

    if (baseDir && w.questFile && validateQuests) {
      const abs = path.resolve(baseDir, w.questFile);
      if (!abs.startsWith(baseDir + path.sep) && abs !== baseDir) {
        errors.push(`weeks[week=${w.week}]: quest_file_escapes_base`);
        continue;
      }
      if (!fs.existsSync(abs)) {
        errors.push(`weeks[week=${w.week}]: quest_file_missing:${w.questFile}`);
        continue;
      }
      let raw;
      try {
        raw = fs.readFileSync(abs, "utf8");
      } catch {
        errors.push(`weeks[week=${w.week}]: quest_file_unreadable:${w.questFile}`);
        continue;
      }
      const parsed = parseQuestTileJson(raw);
      if (!parsed.ok) {
        errors.push(`weeks[week=${w.week}]: quest_json:${parsed.error}`);
        continue;
      }
      const qr = validateQuestTile(parsed.value, questOpts);
      if (!qr.ok) {
        const detail = qr.details?.length
          ? qr.details.join("; ")
          : qr.error || "invalid";
        errors.push(`weeks[week=${w.week}]: quest_invalid:${detail}`);
        continue;
      }
      entry.quest = qr.tile;
    } else if (w.quest && validateQuests) {
      const qr = validateQuestTile(w.quest, questOpts);
      if (!qr.ok) {
        const detail = qr.details?.length
          ? qr.details.join("; ")
          : qr.error || "invalid";
        errors.push(`weeks[week=${w.week}]: quest_invalid:${detail}`);
        continue;
      }
      entry.quest = qr.tile;
      if (!entry.questFile) {
        // keep inline-only packs self-describing after normalize
      }
    } else if (w.quest) {
      entry.quest = w.quest;
    }

    normalizedWeeks.push(entry);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const pack = {
    schema: MODULE_PACK_SCHEMA,
    kind: "module",
    id,
    title: title.slice(0, CAPS.title),
    summary: summary.slice(0, CAPS.summary),
    access,
    theme: theme.slice(0, CAPS.theme),
    weeks: normalizedWeeks,
  };

  if (obj.estimatedWeeks != null) {
    const n = Number(obj.estimatedWeeks);
    if (Number.isFinite(n) && n >= 1) pack.estimatedWeeks = Math.round(n);
  } else {
    pack.estimatedWeeks = normalizedWeeks.length;
  }

  if (obj.author != null && typeof obj.author === "object") {
    pack.author = obj.author;
  }
  if (Array.isArray(obj.tags)) {
    pack.tags = obj.tags.map(String).slice(0, CAPS.tags);
  }
  if (obj.research != null && typeof obj.research === "object") {
    pack.research = obj.research;
  }
  if (obj.i18n != null && typeof obj.i18n === "object") {
    pack.i18n = obj.i18n;
  }
  if (obj.version != null) {
    pack.version = Number(obj.version) || 1;
  }

  return { ok: true, errors: [], pack };
}

/**
 * @param {object} w
 * @param {number} index
 * @returns {number | null}
 */
function resolveWeekNumber(w, index) {
  if (w.week != null && w.week !== "") {
    const n = Number(w.week);
    return Number.isFinite(n) ? n : null;
  }
  if (w.index != null && w.index !== "") {
    const n = Number(w.index);
    return Number.isFinite(n) ? n : null;
  }
  if (w.id != null && w.id !== "") {
    const s = String(w.id);
    const m = s.match(/(\d+)/);
    if (m) return Number(m[1]);
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  // 1-based position fallback only when nothing else present — still flag missing
  // so authors set week explicitly; return null to require explicit week/index/id
  void index;
  return null;
}

function slugId(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, CAPS.id);
}
