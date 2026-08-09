/**
 * Allowlisted static file serving for Future Forge.
 * Only public client assets — never .env, server source, data/, node_modules, etc.
 */

import fs from "node:fs";
import path from "node:path";

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".map": "application/json",
};

/** Root-level files that may be served. */
const ROOT_FILES = new Set(["index.html", "favicon.ico"]);

/** Top-level directories that may be served. */
const PUBLIC_DIRS = new Set(["css", "js", "assets", "locales"]);

/** Extensions never served from the public tree. */
const BLOCKED_EXT = new Set([
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".env",
  ".md",
  ".py",
  ".sh",
  ".yml",
  ".yaml",
  ".toml",
  ".lock",
  ".bak",
]);

/**
 * Normalize URL path to a relative path under root, or null if illegal.
 * @param {string} urlPath
 * @returns {string|null} relative posix-style path without leading slash
 */
export function normalizePublicRel(urlPath) {
  if (urlPath == null) return null;
  let raw = String(urlPath).split("?")[0].split("#")[0];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // Normalize separators and collapse ..
  let cleaned = path.posix.normalize(raw.replace(/\\/g, "/"));
  if (cleaned.startsWith("../") || cleaned === ".." || cleaned.includes("/../")) {
    return null;
  }
  cleaned = cleaned.replace(/^\/+/, "");
  if (!cleaned || cleaned === ".") return "index.html";
  // Hidden segments (.env, .git, …)
  const parts = cleaned.split("/");
  if (parts.some((p) => !p || p === "." || p.startsWith("."))) return null;
  return cleaned;
}

/**
 * Whether a relative path is on the public allowlist.
 * @param {string} rel
 */
export function isPublicRel(rel) {
  if (!rel) return false;
  const parts = rel.split("/");
  const top = parts[0];

  if (parts.length === 1) {
    return ROOT_FILES.has(top);
  }

  if (!PUBLIC_DIRS.has(top)) return false;

  const base = parts[parts.length - 1];
  const ext = path.extname(base).toLowerCase();

  // Server-only / test / backup artifacts under js/
  if (top === "js") {
    if (ext === ".mjs") return false;
    if (base.endsWith(".test.js")) return false;
    if (base.includes(".bak")) return false;
    if (parts.includes("rooms") && base.endsWith(".mjs")) return false;
    // usage-metrics, tts-cache, vision-prompt, quests-* are server-side .mjs — already blocked
  }

  if (BLOCKED_EXT.has(ext)) return false;

  // Allow extensionless only for known root files (already handled)
  if (!ext && parts.length > 1) return false;

  // Known client MIME set (or empty for dirs — we only serve files)
  if (ext && !MIME[ext] && ext !== ".txt") {
    // allow common fonts/media already in MIME; reject unknown server-ish types
    if ([".pem", ".key", ".crt", ".log", ".sql"].includes(ext)) return false;
  }

  return true;
}

/**
 * Resolve a URL path to an absolute filesystem path under root, or null.
 * @param {string} root absolute project root
 * @param {string} urlPath request path
 * @returns {string|null}
 */
export function safePublicPath(root, urlPath) {
  const rel = normalizePublicRel(urlPath);
  if (!rel || !isPublicRel(rel)) return null;

  const rootResolved = path.resolve(root);
  const full = path.resolve(rootResolved, rel);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
    return null;
  }
  // Double-check relative path never escapes
  const relCheck = path.relative(rootResolved, full);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) return null;
  return full;
}

/**
 * @param {string} root
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function serveStatic(root, req, res) {
  let urlPath = req.url === "/" ? "/index.html" : req.url || "/";
  const filePath = safePublicPath(root, urlPath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    /** @type {Record<string, string>} */
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (ext === ".html" || ext === ".js" || ext === ".css" || ext === ".mjs") {
      headers["Cache-Control"] = "no-store";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}
