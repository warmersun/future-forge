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
/**
 * A lesson card may have no mission body when the portal has gated it.
 * @param {object|null|undefined} e
 */
export function isCatalogLessonEntry(e) {
  if (!e || isModuleEntry(e)) return false;
  if (isLearningMission(e.mission)) return true;
  if (e.isLearningModule === true) return true;
  if (e.lesson != null && e.lesson !== "") return true;
  return false;
}

/**
 * @param {object|null|undefined} e
 */
export function isLearningEntry(e) {
  if (!e) return false;
  if (isModuleEntry(e)) return true;
  return isCatalogLessonEntry(e);
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
 * Disk Library (`hosted`) or browser Import (`imported`) — not the remote catalog.
 * @param {unknown} source
 */
export function isLibraryCatalogSource(source) {
  return source === "hosted" || source === "imported";
}

/**
 * @param {object|null|undefined} entry catalog card, tile, or co-invent context
 */
export function catalogSourceOf(entry) {
  if (!entry || typeof entry !== "object") return "";
  return String(
    entry.source || entry.mission?.source || entry.tile?.source || ""
  );
}

/**
 * @param {object|null|undefined} entry
 */
export function isLibraryCatalogEntry(entry) {
  return isLibraryCatalogSource(catalogSourceOf(entry));
}

/**
 * A1 account door: curated remote Learning / access:account|paid.
 * Library side-load is local JSON — never requires Sign in.
 *
 * @param {object|null|undefined} entry
 * @param {{ clerkReady?: boolean }} [opts]
 */
export function catalogNeedsAccount(entry, opts = {}) {
  if (!opts.clerkReady) return false;
  if (isLibraryCatalogEntry(entry)) return false;
  const access = entry?.access || entry?.mission?.access || entry?.tile?.access;
  if (access === "open") return false;
  if (access === "account" || access === "paid") return true;
  return Boolean(
    entry?.isLearningModule ||
      entry?.mission?.isLearningModule ||
      isModuleEntry(entry)
  );
}

/** @typedef {"open"|"account"|"paid"} CatalogAccessKind */

/**
 * Player-facing access chip. Paid that bills the player is "paid".
 * A sponsor or catalog.free waiver is "account". A learning tile with no
 * access field is "account". Library with no access field is "open".
 * @param {object|null|undefined} entry
 * @returns {CatalogAccessKind}
 */
export function catalogAccessKind(entry) {
  if (!entry || typeof entry !== "object") return "open";
  const raw = entry.access || entry.mission?.access || entry.tile?.access || "";
  const access = raw === "open" || raw === "account" || raw === "paid" ? raw : "";
  const ent = String(
    entry.entitlement || entry.mission?.entitlement || entry.tile?.entitlement || ""
  ).trim();
  const sponsor = String(
    entry.sponsorName || entry.mission?.sponsorName || entry.tile?.sponsorName || ""
  ).trim();
  const waived = ent === "catalog.free" || Boolean(sponsor);
  if (access === "paid" && !waived) return "paid";
  if (access === "open") return "open";
  if (access === "account" || access === "paid") return "account";
  if (isLibraryCatalogEntry(entry)) return "open";
  if (isLearningEntry(entry)) return "account";
  return "open";
}

/** Chip copy for one access kind. Order used on mixed module cards. */
export const CATALOG_ACCESS_CHIPS = {
  open: {
    label: "Free",
    title: "No account is required to open this Quest.",
  },
  account: {
    label: "Account",
    title: "Sign-in is required before this Quest opens.",
  },
  paid: {
    label: "Paid",
    title: "This Quest is paid content. It needs the Content plan, which Cloud includes.",
  },
};

const CATALOG_ACCESS_ORDER = ["open", "account", "paid"];

/**
 * Distinct access chips for a module's lessons, Free then Sign in then Paid.
 * An empty lesson list uses the wrapper.
 * @param {{ entries?: object[], wrapper?: object|null }} group
 * @returns {CatalogAccessKind[]}
 */
export function catalogGroupAccessKinds(group) {
  const lessons = Array.isArray(group?.entries) ? group.entries : [];
  const source = lessons.length ? lessons : group?.wrapper ? [group.wrapper] : [];
  const present = new Set(source.map((entry) => catalogAccessKind(entry)));
  return CATALOG_ACCESS_ORDER.filter((kind) => present.has(kind));
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

/**
 * Lesson index on a full tile or a gated card (the card has no mission).
 * @param {object|null|undefined} entry
 * @returns {number}
 */
export function catalogLessonIndex(entry) {
  const raw = entry?.lesson ?? entry?.mission?.lesson ?? entry?.tile?.lesson;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {object|null|undefined} entry
 * @returns {number}
 */
export function catalogLessonTotal(entry) {
  const raw = entry?.totalLessons ?? entry?.mission?.totalLessons ?? entry?.tile?.totalLessons;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Hub row for a portal card that has no mission body.
 * Returns null unless the record is gated or access is account/paid.
 * @param {object|null|undefined} e
 * @param {string} [source]
 * @param {{ canRemove?: boolean }} [opts]
 */
export function lockedCatalogHubEntry(e, source, opts = {}) {
  if (!e || typeof e !== "object" || isModuleEntry(e) || e.mission) return null;
  const access = e.access || e.tile?.access;
  const locked = e.gated === true || access === "account" || access === "paid";
  if (!locked) return null;
  const id = String(e.id || "").trim();
  if (!id) return null;
  /** @type {Record<string, unknown>} */
  const entry = {
    id,
    kind: "quest",
    source: source || e.source || "remote",
    gated: true,
    title: String(e.title || "Quest"),
    summary: String(e.summary || ""),
    place: String(e.place || ""),
    canRemove: Boolean(opts.canRemove),
    file: e.file ? String(e.file) : null,
    remoteUrl: e.remoteUrl ? String(e.remoteUrl) : null,
    mission: null,
  };
  if (e.globalId) entry.globalId = e.globalId;
  if (access === "open" || access === "account" || access === "paid") entry.access = access;
  if (e.entitlement) entry.entitlement = e.entitlement;
  if (e.isLearningModule === true) entry.isLearningModule = true;
  if (typeof e.module === "string" && e.module.trim()) entry.module = e.module.trim();
  if (e.lesson != null && e.lesson !== "") entry.lesson = e.lesson;
  if (e.totalLessons != null && e.totalLessons !== "") entry.totalLessons = e.totalLessons;
  const sponsor = String(e.sponsorName || "").trim();
  if (sponsor) entry.sponsorName = sponsor;
  return entry;
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
    else if (isCatalogLessonEntry(e)) lessons.push(e);
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
        (a, b) => (catalogLessonIndex(a) || 0) - (catalogLessonIndex(b) || 0)
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
      const fromEntry = catalogLessonTotal(first);
      g.totalLessons =
        (Number.isFinite(fromEntry) && fromEntry >= 1 ? fromEntry : 0) ||
        g.entries.reduce(
          (max, e) => Math.max(max, catalogLessonIndex(e) || 0),
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
 * After a learning lesson ends, offer the lesson list for that same module.
 * Standalone lessons (no sibling path) return null.
 *
 * @param {object|null|undefined} mission
 * @param {object[]} [groups] result of groupLearningModules
 * @param {{ solvedIds?: Set<string> }} [opts]
 * @returns {{
 *   moduleKey: string,
 *   module: string,
 *   hasLaterLesson: boolean,
 *   nextId: string,
 *   nextTitle: string,
 * }|null}
 */
export function sameModuleLessonOffer(mission, groups, opts = {}) {
  if (!mission || mission.isLearningModule !== true) return null;
  const title = typeof mission.module === "string" ? mission.module.trim() : "";
  if (!title) return null;
  const list = Array.isArray(groups) ? groups : [];
  const missionId = String(mission.id || "");
  const solvedIds = opts.solvedIds instanceof Set ? opts.solvedIds : null;
  const group =
    (missionId
      ? list.find((g) =>
          (g.entries || []).some(
            (e) => String(e.id || e.mission?.id || "") === missionId
          )
        )
      : null) ||
    list.find((g) => g.key === title || g.module === title) ||
    null;

  if (!group) {
    const total = Number(mission.totalLessons);
    if (!(Number.isFinite(total) && total >= 2)) return null;
    const lesson = Number(mission.lesson);
    return {
      moduleKey: title,
      module: title,
      hasLaterLesson: Number.isFinite(lesson) && lesson < total,
      nextId: "",
      nextTitle: "",
    };
  }

  const n = group.entries?.length || 0;
  const total = Number(group.totalLessons) || n;
  if (!group.wrapper && n < 2 && total < 2) return null;

  const currentLesson = catalogLessonIndex(mission);
  const laterEntries = (group.entries || []).filter((e) => {
    if (String(e.id || e.mission?.id || "") === missionId) return false;
    const ln = catalogLessonIndex(e);
    return (
      Number.isFinite(ln) &&
      Number.isFinite(currentLesson) &&
      ln > currentLesson
    );
  });
  const unsolvedLater = solvedIds
    ? laterEntries.filter((e) => {
        const id = String(e.id || e.mission?.id || "");
        return id && !solvedIds.has(id);
      })
    : laterEntries;
  const next = unsolvedLater[0] || null;
  const hasLaterLesson =
    Boolean(next) ||
    (laterEntries.length === 0 &&
      Number.isFinite(currentLesson) &&
      Number.isFinite(total) &&
      currentLesson < total);

  return {
    moduleKey: String(group.key || title),
    module: String(group.module || title),
    hasLaterLesson,
    nextId: next ? String(next.id || next.mission?.id || "") : "",
    nextTitle: next
      ? String(next.title || next.mission?.title || "").trim()
      : "",
  };
}

/**
 * Hub meta counts: modules count as 1, nested lessons do not.
 *
 * @param {{ sponsored: object[], learning: object[], library: object[] }} parts
 * @param {{ mpPick?: boolean }} [_opts] unused — friends pick lists the same tiles as solo
 */
export function catalogHubCounts(parts, _opts = {}) {
  const sp = catalogTopLevel(parts.sponsored || []);
  const learn = catalogTopLevel(parts.learning || []);
  const lib = catalogTopLevel(parts.library || []);
  return {
    sponsored: sp.groups.length + sp.standalone.length,
    learningGroups: learn.groups.length,
    learningLessons: (parts.learning || []).filter((e) => !isModuleEntry(e))
      .length,
    library: lib.groups.length + lib.standalone.length,
  };
}
