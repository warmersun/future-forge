/**
 * Optional live web + X search on timing assess and idea-sparks.
 * Off by default — search is slower and billed per tool call.
 *
 * Enable with CLI `--ai-search` / `--search`, or env `FF_AI_SEARCH=1`.
 * Force off with `--no-ai-search` / `--no-search` (wins over env and enable flags).
 */

export const AI_SEARCH_MODES = new Set(["assess-feasibility", "idea-sparks"]);

export const SEARCH_TOOLS = [{ type: "web_search" }, { type: "x_search" }];

export const SEARCH_MAX_OUTPUT_TOKENS = {
  "assess-feasibility": 400,
  "idea-sparks": 900,
};

export const SEARCH_SYSTEM_LINE =
  "Use web_search and x_search to check whether THIS architecture and payload are already demonstrated in year. If they are, score green (or write a real spark). Do not let smaller grounding examples (hoppers, medical boxes) cap payload or force yellow/red. Quest/clinic fit is not timing. Honor only explicit grounding contradictions (limits, denials, not-yet).";

/**
 * @param {string[]} [argv] — typically `process.argv.slice(2)`
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [env]
 * @returns {boolean}
 */
export function resolveAiSearchEnabled(argv = [], env = process.env) {
  const args = Array.isArray(argv) ? argv : [];
  if (args.includes("--no-ai-search") || args.includes("--no-search")) {
    return false;
  }
  if (args.includes("--ai-search") || args.includes("--search")) return true;

  const raw = env?.FF_AI_SEARCH;
  if (raw == null || raw === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return false;
}

/**
 * Tools for a co-invent mode, or null when search is off / mode is ineligible.
 * @param {string} mode
 * @param {boolean} enabled
 * @returns {{ type: string }[]|null}
 */
export function searchToolsForMode(mode, enabled) {
  if (!enabled) return null;
  if (!AI_SEARCH_MODES.has(String(mode || ""))) return null;
  return SEARCH_TOOLS;
}
