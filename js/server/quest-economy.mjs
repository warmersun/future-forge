/**
 * Developer-only helpers: list / read / patch quest JSON for the economy lab.
 * Never writes outside quests/ or output/quests/.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MIME } from "./static.mjs";
import { readBody, sendJson, errorStatus } from "./read-body.mjs";

export const QUEST_WRITE_PREFIXES = ["quests", "output/quests"];

/**
 * @param {string} root
 * @param {string} rel
 * @returns {{ ok: true, abs: string, rel: string } | { ok: false, error: string }}
 */
export function resolveQuestEconomyPath(root, rel) {
  const raw = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!raw || raw.includes("\0")) return { ok: false, error: "bad_path" };
  const parts = raw.split("/").filter(Boolean);
  if (parts.some((p) => p === ".." || p === "." || p.startsWith("."))) {
    return { ok: false, error: "bad_path" };
  }
  const posix = parts.join("/");
  const allowed = QUEST_WRITE_PREFIXES.some(
    (prefix) => posix === prefix || posix.startsWith(`${prefix}/`)
  );
  if (!allowed) return { ok: false, error: "path_not_allowlisted" };
  if (!posix.toLowerCase().endsWith(".json")) {
    return { ok: false, error: "not_json" };
  }
  const rootResolved = path.resolve(root);
  const abs = path.resolve(rootResolved, ...parts);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path.sep)) {
    return { ok: false, error: "bad_path" };
  }
  return { ok: true, abs, rel: posix };
}

/**
 * @param {string} dir
 * @param {string} prefixRel
 * @param {object[]} out
 */
function walkJson(dir, prefixRel, out) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    const rel = prefixRel ? `${prefixRel}/${name}` : name;
    if (st.isDirectory()) {
      walkJson(abs, rel, out);
      continue;
    }
    if (!st.isFile() || !name.toLowerCase().endsWith(".json")) continue;
    out.push(rel.replace(/\\/g, "/"));
  }
}

/**
 * @param {string} root
 * @returns {{ rel: string, id: string, title: string, kind: string, error?: string }[]}
 */
export async function listQuestEconomyFiles(root) {
  const { parseQuestTileJson, validateQuestDocument } = await import(
    pathToFileURL(path.join(root, "js/quest-tile.js")).href
  );
  /** @type {string[]} */
  const rels = [];
  for (const prefix of QUEST_WRITE_PREFIXES) {
    walkJson(path.join(root, prefix), prefix, rels);
  }
  rels.sort((a, b) => a.localeCompare(b));
  const rows = [];
  for (const rel of rels) {
    const abs = path.join(root, ...rel.split("/"));
    let raw;
    try {
      raw = fs.readFileSync(abs, "utf8");
    } catch (e) {
      rows.push({ rel, id: "", title: rel, kind: "error", error: e.message });
      continue;
    }
    const parsed = parseQuestTileJson(raw);
    if (!parsed.ok) {
      rows.push({ rel, id: "", title: rel, kind: "error", error: parsed.error });
      continue;
    }
    const v = validateQuestDocument(parsed.value);
    if (!v.ok) {
      rows.push({
        rel,
        id: parsed.value?.id || "",
        title: parsed.value?.title || rel,
        kind: "invalid",
        error: v.error,
      });
      continue;
    }
    const tile = v.tile;
    rows.push({
      rel,
      id: String(tile.id || v.mission?.id || ""),
      title: String(tile.title || v.mission?.title || rel),
      kind: String(tile.kind || "quest"),
      globalId: tile.globalId || v.mission?.globalId || "",
    });
  }
  return rows;
}

function slimCatalogRow(row) {
  const isLearning = Boolean(row.isLearningModule);
  const sponsorName = row.sponsorName || "";
  return {
    source: row.source,
    writable: Boolean(row.writable),
    id: row.id,
    title: row.title,
    kind: row.kind,
    globalId: row.globalId || "",
    place: row.place || "",
    summary: row.summary || "",
    rel: row.rel || null,
    sponsorName,
    isLearningModule: isLearning,
    module: row.module || "",
    lessons: row.lessons || [],
    coverImageUrl: row.coverImageUrl || "",
    file: row.file || row.rel || null,
    mission: {
      id: row.id,
      globalId: row.globalId || "",
      place: row.place || "",
      isLearningModule: isLearning,
      sponsorName,
      module: row.module || "",
    },
  };
}

/**
 * Library files + remote warmersun catalog + built-in theme missions.
 * @param {string} root
 */
export async function listQuestEconomyCatalog(root) {
  const files = await listQuestEconomyFiles(root);
  /** @type {object[]} */
  const local = [];
  for (const row of files) {
    if (row.kind !== "quest" && row.kind !== "module") continue;
    const got = row.kind === "quest" ? readQuestEconomyFile(root, row.rel) : { ok: false };
    const tile = got.ok ? got.tile : null;
    local.push({
      source: "local",
      writable: row.kind === "quest",
      id: row.id,
      title: row.title,
      kind: row.kind,
      globalId: row.globalId || tile?.globalId || tile?.mission?.globalId || "",
      place: tile?.mission?.place || "",
      summary: tile?.summary || "",
      rel: row.rel,
      tile,
      mission: tile?.mission || null,
      sponsorName: tile?.sponsorName || tile?.mission?.sponsorName || "",
      isLearningModule: Boolean(tile?.isLearningModule || tile?.mission?.isLearningModule),
      module: tile?.module || tile?.mission?.module || "",
      lessons: tile?.lessons || [],
      coverImageUrl: tile?.coverImageUrl || "",
    });
  }

  const { fetchRemoteQuestCatalog, resolveQuestsRemoteUrl } = await import(
    pathToFileURL(path.join(root, "js/quests-remote.mjs")).href
  );
  const remoteResult = await fetchRemoteQuestCatalog(resolveQuestsRemoteUrl());
  const remote = (remoteResult.quests || []).map((q) => ({
    source: "remote",
    writable: false,
    id: String(q.id || q.mission?.id || ""),
    title: String(q.title || q.mission?.title || ""),
    kind: String(q.kind || q.tile?.kind || "quest"),
    globalId: q.globalId || q.mission?.globalId || "",
    place: q.place || q.mission?.place || "",
    summary: q.summary || q.tile?.summary || "",
    tile: q.tile || null,
    mission: q.mission || q.tile?.mission || null,
    remoteUrl: q.remoteUrl || null,
    file: q.file || null,
    sponsorName: q.sponsorName || q.tile?.sponsorName || q.mission?.sponsorName || "",
    isLearningModule: Boolean(
      q.isLearningModule || q.mission?.isLearningModule || q.tile?.isLearningModule
    ),
    module: q.module || q.tile?.module || q.mission?.module || "",
    lessons: q.lessons || q.tile?.lessons || [],
    coverImageUrl: q.coverImageUrl || q.tile?.coverImageUrl || "",
  }));

  const { MISSIONS } = await import(pathToFileURL(path.join(root, "js/data.js")).href);
  const themes = (MISSIONS || []).map((m) => ({
    source: "theme",
    writable: false,
    id: m.id,
    title: m.title,
    kind: "quest",
    globalId: m.globalId,
    place: m.place || "",
    summary: m.scene || "",
    mission: m,
    tile: null,
  }));

  return {
    local,
    remote,
    themes,
    remoteOk: remoteResult.ok !== false,
    remoteUrl: remoteResult.url || null,
    remoteCached: Boolean(remoteResult.cached),
    remoteErrors: remoteResult.errors || [],
  };
}

/**
 * @param {string} root
 * @param {{ source?: string, id?: string, file?: string }} query
 */
export async function loadQuestEconomyEntry(root, query = {}) {
  const source = String(query.source || "").trim();
  const id = String(query.id || "").trim();
  const file = String(query.file || query.rel || "").trim();
  if (file || source === "local") {
    const rel = file || "";
    if (rel) {
      const got = readQuestEconomyFile(root, rel);
      if (!got.ok) return got;
      return {
        ok: true,
        source: "local",
        writable: true,
        rel: got.rel,
        id: got.tile?.id || got.tile?.mission?.id || "",
        tile: got.tile,
        mission: got.tile?.mission || null,
      };
    }
  }
  const cat = await listQuestEconomyCatalog(root);
  if (source === "theme" || (!source && id && cat.themes.some((t) => t.id === id))) {
    const hit = cat.themes.find((t) => t.id === id);
    if (!hit) return { ok: false, error: "not_found" };
    return { ok: true, ...hit };
  }
  if (source === "remote" || (!source && id)) {
    const hit =
      cat.remote.find((t) => t.id === id) ||
      cat.local.find((t) => t.id === id);
    if (hit) return { ok: true, ...hit };
  }
  if (id) {
    const hit = cat.local.find((t) => t.id === id);
    if (hit) return { ok: true, ...hit };
  }
  return { ok: false, error: "not_found" };
}

/**
 * Copy a remote/theme tile into quests/<id>.json so knobs can be written.
 * @param {string} root
 * @param {{ source: string, id: string }} spec
 */
export async function copyQuestEconomyToLibrary(root, spec) {
  const loaded = await loadQuestEconomyEntry(root, spec);
  if (!loaded.ok) return loaded;
  if (loaded.source === "theme") return { ok: false, error: "theme_not_copyable" };
  const tile =
    loaded.tile ||
    (loaded.mission
      ? {
          schema: "future-forge.quest-tile/v1",
          kind: "quest",
          id: loaded.id,
          title: loaded.title || loaded.mission.title,
          summary: loaded.summary || loaded.mission.scene || "",
          globalId: loaded.globalId || loaded.mission.globalId,
          mission: loaded.mission,
        }
      : null);
  if (!tile || tile.kind === "module") {
    return { ok: false, error: "not_copyable" };
  }
  const { slugId, validateQuestDocument, parseQuestTileJson } = await import(
    pathToFileURL(path.join(root, "js/quest-tile.js")).href
  );
  const name = `${slugId(tile.id || loaded.id) || "quest"}.json`;
  const rel = `quests/${name}`;
  const resolved = resolveQuestEconomyPath(root, rel);
  if (!resolved.ok) return resolved;
  if (fs.existsSync(resolved.abs)) {
    return { ok: false, error: "already_exists", rel };
  }
  const text = `${JSON.stringify(tile, null, 2)}\n`;
  const parsed = parseQuestTileJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error || "invalid_json" };
  const v = validateQuestDocument(parsed.value);
  if (!v.ok && loaded.source !== "theme") {
    return { ok: false, error: v.error || "validation_failed", details: v.details };
  }
  fs.writeFileSync(resolved.abs, text, "utf8");
  return { ok: true, rel, tile: parsed.value };
}

/**
 * @param {string} root
 * @param {string} rel
 */
export function readQuestEconomyFile(root, rel) {
  const resolved = resolveQuestEconomyPath(root, rel);
  if (!resolved.ok) return resolved;
  if (!fs.existsSync(resolved.abs)) return { ok: false, error: "not_found" };
  const raw = fs.readFileSync(resolved.abs, "utf8");
  return { ok: true, rel: resolved.rel, raw, tile: JSON.parse(raw) };
}

/**
 * @param {string} root
 * @param {string} rel
 * @param {object} patch
 */
export async function writeQuestEconomyPatch(root, rel, patch) {
  const resolved = resolveQuestEconomyPath(root, rel);
  if (!resolved.ok) return resolved;
  if (!fs.existsSync(resolved.abs)) return { ok: false, error: "not_found" };
  const { parseQuestTileJson, validateQuestDocument } = await import(
    pathToFileURL(path.join(root, "js/quest-tile.js")).href
  );
  const { applyEconomyPatchToTile } = await import(
    pathToFileURL(path.join(root, "js/sim/quest-economy.js")).href
  );
  const raw = fs.readFileSync(resolved.abs, "utf8");
  const parsed = parseQuestTileJson(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error || "invalid_json" };
  if (parsed.value?.kind === "module") {
    return { ok: false, error: "module_not_playable" };
  }
  const next = applyEconomyPatchToTile(parsed.value, patch || {});
  const v = validateQuestDocument(next);
  if (!v.ok) {
    return { ok: false, error: v.error || "validation_failed", details: v.details };
  }
  const text = `${JSON.stringify(next, null, 2)}\n`;
  fs.writeFileSync(resolved.abs, text, "utf8");
  return { ok: true, rel: resolved.rel, tile: next, mission: v.mission };
}

const TOOL_FILES = new Set([
  "quest-economy.html",
  "quest-economy.js",
  "quest-economy.css",
]);

function serveToolFile(root, res, name) {
  const abs = path.join(root, "tools", name);
  const ext = path.extname(name).toLowerCase();
  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

/**
 * Developer-only economy lab HTTP.
 * @returns {Promise<boolean>} true if the request was handled
 */
export async function handleQuestEconomyHttp(req, res, opts = {}) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const isApi = p === "/api/developer/quest-economy";
  const isTool =
    p === "/tools/quest-economy" ||
    p === "/tools/quest-economy.html" ||
    p === "/tools/quest-economy.js" ||
    p === "/tools/quest-economy.css";
  if (!isApi && !isTool) return false;

  if (!opts.developer) {
    if (isTool) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return true;
    }
    sendJson(res, 404, { ok: false, error: "not_found" });
    return true;
  }

  const root = opts.root;
  if (isTool) {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end("Method not allowed");
      return true;
    }
    const name =
      p === "/tools/quest-economy" || p === "/tools/quest-economy.html"
        ? "quest-economy.html"
        : path.posix.basename(p);
    if (!TOOL_FILES.has(name)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return true;
    }
    serveToolFile(root, res, name);
    return true;
  }

  try {
    if (req.method === "GET") {
      const file = url.searchParams.get("file");
      const id = url.searchParams.get("id");
      const source = url.searchParams.get("source");
      if (file || id) {
        const got = await loadQuestEconomyEntry(root, { file, id, source, rel: file });
        if (!got.ok) {
          sendJson(res, got.error === "not_found" ? 404 : 400, got);
          return true;
        }
        sendJson(res, 200, {
          ok: true,
          source: got.source,
          writable: Boolean(got.writable),
          rel: got.rel || null,
          id: got.id,
          tile: got.tile || null,
          mission: got.mission || got.tile?.mission || null,
          title: got.title,
          place: got.place,
          globalId: got.globalId,
        });
        return true;
      }
      const cat = await listQuestEconomyCatalog(root);
      sendJson(res, 200, {
        ok: true,
        files: cat.local.map(slimCatalogRow),
        local: cat.local.map(slimCatalogRow),
        remote: cat.remote.map(slimCatalogRow),
        themes: cat.themes.map(slimCatalogRow),
        remoteOk: cat.remoteOk,
        remoteUrl: cat.remoteUrl,
        remoteCached: cat.remoteCached,
        remoteErrors: cat.remoteErrors,
      });
      return true;
    }
    if (req.method === "POST") {
      const body = await readBody(req, { maxBytes: 200_000 });
      if (body.copyToLibrary) {
        const w = await copyQuestEconomyToLibrary(root, {
          source: body.source,
          id: body.id,
        });
        sendJson(res, w.ok ? 200 : 400, w);
        return true;
      }
      const rel = String(body.file || body.rel || "");
      const patch = body.patch && typeof body.patch === "object" ? body.patch : {};
      const w = await writeQuestEconomyPatch(root, rel, patch);
      sendJson(res, w.ok ? 200 : 400, w);
      return true;
    }
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  } catch (e) {
    sendJson(res, errorStatus(e), {
      ok: false,
      error: e.message || "economy_lab_failed",
    });
    return true;
  }
}
