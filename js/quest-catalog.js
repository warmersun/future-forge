/**
 * Catalog partition + learning-module grouping.
 * Pure helpers for hub / sponsored / learning / library lists.
 */

import { slugId } from "./quest-tile.js";

/**
 * @param {object|null|undefined} m
 */
export function isLearningMission(m) {
  if (!m || typeof m !== "object") return false;
  if (m.isLearningModule) return true;
  if (m.module != null || m.lesson != null) return true;
  return false;
}

/**
 * @param {object|null|undefined} m
 */
export function isSponsoredMission(m) {
  return Boolean(String(m?.sponsorName || "").trim());
}

/**
 * @param {object|null|undefined} e
 */
export function isModuleEntry(e) {
  if (!e || typeof e !== "object") return false;
  return e.kind === "module" || e.tile?.kind === "module";
}

/**
 * @param {object|null|undefined} e
 */
export function isLearningEntry(e) {
  if (!e) return false;
  if (isModuleEntry(e)) return true;
  return isLearningMission(e.mission);
}

/**
 * @param {object|null|undefined} e
 */
export function isSponsoredEntry(e) {
  if (!e) return false;
  if (isSponsoredMission(e.mission)) return true;
  return Boolean(
    String(e.sponsorName || e.tile?.sponsorName || e.mission?.sponsorName || "").trim()
  );
}

/**
 * A module group is Sponsored if the wrapper or any lesson is sponsored.
 * @param {object} group
 */
export function groupIsSponsored(group) {
  if (String(group?.sponsorName || "").trim()) return true;
  if (isSponsoredEntry(group?.wrapper)) return true;
  return (group?.entries || []).some((e) => isSponsoredEntry(e));
}

/**
 * Official channels = remote only. Library = local folder + browser import.
 * Group learning paths first, then classify each **group** as Sponsored vs Learning.
 *
 * @param {{ remote?: object[], local?: object[], imported?: object[] }} buckets
 * @returns {{ all: object[], sponsored: object[], learning: object[], library: object[] }}
 */
export function partitionCatalogQuests(buckets = {}) {
  const remote = Array.isArray(buckets.remote) ? buckets.remote : [];
  const local = Array.isArray(buckets.local) ? buckets.local : [];
  const imported = Array.isArray(buckets.imported) ? buckets.imported : [];
  const library = [...local, ...imported];

  const remoteLearning = remote.filter((e) => isLearningEntry(e));
  const remoteOther = remote.filter((e) => !isLearningEntry(e));
  const groups = groupLearningModules(remoteLearning);

  /** @type {object[]} */
  const sponsored = [];
  /** @type {object[]} */
  const learning = [];
  for (const g of groups) {
    const dest = groupIsSponsored(g) ? sponsored : learning;
    if (g.wrapper) dest.push(g.wrapper);
    dest.push(...g.entries);
  }
  for (const e of remoteOther) {
    if (isSponsoredEntry(e)) sponsored.push(e);
  }

  const all = [...remote, ...library];
  return { all, sponsored, learning, library };
}

function moduleTitleOf(entry) {
  if (!entry) return "";
  if (typeof entry.module === "string" && entry.module.trim()) {
    return entry.module.trim();
  }
  if (typeof entry.tile?.module === "string" && entry.tile.module.trim()) {
    return entry.tile.module.trim();
  }
  if (typeof entry.mission?.module === "string" && entry.mission.module.trim()) {
    return entry.mission.module.trim();
  }
  if (isModuleEntry(entry) && typeof entry.title === "string") {
    return entry.title.trim();
  }
  return "";
}

function entryId(entry) {
  return String(entry?.id || entry?.mission?.id || "");
}

function catalogIdKey(raw) {
  return slugId(raw);
}

function listedLessonIds(wrapper) {
  const listed = Array.isArray(wrapper?.lessons)
    ? wrapper.lessons
    : Array.isArray(wrapper?.tile?.lessons)
      ? wrapper.tile.lessons
      : [];
  return listed.map((id) => catalogIdKey(id)).filter(Boolean);
}

/**
 * Group learning entries (lessons + optional kind:module wrappers) by module title.
 *
 * @param {object[]} entries
 * @returns {{
 *   module: string|null,
 *   key: string,
 *   entries: object[],
 *   wrapper: object|null,
 *   summary: string,
 *   overviewMd: string,
 *   coverImageUrl: string,
 *   sponsorName: string,
 *   sponsorBanner: string,
 *   totalLessons: number,
 * }[]}
 */
export function groupLearningModules(entries) {
  const list = Array.isArray(entries) ? entries : [];
  /** @type {Map<string, ReturnType<typeof emptyGroup>>} */
  const map = new Map();

  function emptyGroup(key, module) {
    return {
      module,
      key,
      entries: [],
      wrapper: null,
      summary: "",
      overviewMd: "",
      coverImageUrl: "",
      sponsorName: "",
      sponsorBanner: "",
      totalLessons: 0,
    };
  }

  function applyWrapper(g, w) {
    g.wrapper = w;
    g.summary = String(w.summary || w.tile?.summary || "").trim();
    g.overviewMd = String(w.overviewMd || w.tile?.overviewMd || "").trim();
    g.coverImageUrl = String(w.coverImageUrl || w.tile?.coverImageUrl || "").trim();
    g.sponsorName = String(w.sponsorName || w.tile?.sponsorName || "").trim();
    g.sponsorBanner = String(
      w.sponsorBanner || w.tile?.sponsorBanner || ""
    ).trim();
    const listed = listedLessonIds(w);
    const totalRaw = Number(w.totalLessons ?? w.tile?.totalLessons);
    if (Number.isFinite(totalRaw) && totalRaw >= 1) g.totalLessons = totalRaw;
    else if (listed.length) g.totalLessons = listed.length;
  }

  const wrappers = [];
  const lessons = [];
  for (const e of list) {
    if (isModuleEntry(e)) wrappers.push(e);
    else if (isLearningMission(e.mission)) lessons.push(e);
  }

  const byId = new Map();
  for (const e of lessons) {
    const id = catalogIdKey(entryId(e));
    if (id && !byId.has(id)) byId.set(id, e);
  }

  const claimed = new Set();
  for (const w of wrappers) {
    const title = moduleTitleOf(w);
    let key = title || String(w.id || "other");
    if (map.has(key) && map.get(key).wrapper) {
      key = String(w.id || `${key}-${map.size}`);
    }
    const g = map.get(key) || emptyGroup(key, title || null);
    applyWrapper(g, w);
    const ordered = [];
    for (const id of listedLessonIds(w)) {
      const hit = byId.get(id);
      if (hit && !claimed.has(hit)) {
        ordered.push(hit);
        claimed.add(hit);
      }
    }
    g.entries = ordered;
    map.set(key, g);
  }

  for (const e of lessons) {
    if (claimed.has(e)) continue;
    const title = moduleTitleOf(e);
    const key = title || "other";
    if (!map.has(key)) map.set(key, emptyGroup(key, title || null));
    map.get(key).entries.push(e);
  }

  for (const g of map.values()) {
    if (!g.wrapper) {
      g.entries.sort(
        (a, b) =>
          (Number(a.mission?.lesson) || 0) - (Number(b.mission?.lesson) || 0)
      );
    }
    if (!g.summary) {
      const first = g.entries[0];
      g.summary = String(first?.summary || first?.mission?.summary || "").trim();
    }
    if (!g.sponsorName) {
      const sponsored = g.entries.find((e) => isSponsoredEntry(e)) || g.entries[0];
      g.sponsorName = String(
        sponsored?.mission?.sponsorName || sponsored?.sponsorName || ""
      ).trim();
      g.sponsorBanner = String(
        sponsored?.mission?.sponsorBanner || sponsored?.sponsorBanner || ""
      ).trim();
    }
    if (!g.totalLessons) {
      const first = g.entries[0];
      const fromMission = Number(first?.mission?.totalLessons);
      g.totalLessons =
        (Number.isFinite(fromMission) && fromMission >= 1 ? fromMission : 0) ||
        g.entries.reduce(
          (max, e) => Math.max(max, Number(e.mission?.lesson) || 0),
          0
        ) ||
        g.entries.length;
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.module == null) return 1;
    if (b.module == null) return -1;
    return a.module.localeCompare(b.module, undefined, { sensitivity: "base" });
  });
}

/**
 * Split a catalog pool into module groups vs standalone quest cards.
 * A group is a module when a wrapper exists, or 2+ lessons, or totalLessons ≥ 2.
 * Single sponsored/learning lessons stay as ordinary cards.
 *
 * @param {object[]} entries
 * @returns {{ groups: object[], standalone: object[] }}
 */
export function catalogTopLevel(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const learningish = list.filter((e) => isLearningEntry(e));
  const nonLearning = list.filter((e) => !isLearningEntry(e));
  const grouped = groupLearningModules(learningish);
  /** @type {object[]} */
  const groups = [];
  /** @type {object[]} */
  const lessonCards = [];
  for (const g of grouped) {
    const n = g.entries.length;
    const total = Number(g.totalLessons) || n;
    if (g.wrapper || n >= 2 || total >= 2) groups.push(g);
    else lessonCards.push(...g.entries);
  }
  return { groups, standalone: [...lessonCards, ...nonLearning] };
}

/**
 * Hub meta counts: modules count as 1, nested lessons do not.
 *
 * @param {{ sponsored: object[], learning: object[], library: object[] }} parts
 * @param {{ mpPick?: boolean }} [opts]
 */
export function catalogHubCounts(parts, opts = {}) {
  const mpPick = Boolean(opts.mpPick);
  const sponsoredPool = mpPick
    ? (parts.sponsored || []).filter((e) => !isLearningEntry(e))
    : parts.sponsored || [];
  const libraryPool = mpPick
    ? (parts.library || []).filter((e) => !isLearningEntry(e))
    : parts.library || [];
  const sp = catalogTopLevel(sponsoredPool);
  const learn = catalogTopLevel(parts.learning || []);
  const lib = catalogTopLevel(libraryPool);
  return {
    sponsored: sp.groups.length + sp.standalone.length,
    learningGroups: learn.groups.length,
    learningLessons: (parts.learning || []).filter((e) => !isModuleEntry(e))
      .length,
    library: lib.groups.length + lib.standalone.length,
  };
}
