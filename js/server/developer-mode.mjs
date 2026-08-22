/**
 * Developer UI (quest / trend inspect) is **off by default**.
 *
 * Enable with CLI `--developer` / `--dev`, or env `FF_DEVELOPER=1`.
 * Force off with `--no-developer` (wins over env and enable flags).
 *
 * @param {string[]} [argv] — typically `process.argv.slice(2)`
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [env]
 * @returns {boolean}
 */
export function resolveDeveloperEnabled(argv = [], env = process.env) {
  const args = Array.isArray(argv) ? argv : [];
  if (args.includes("--no-developer")) return false;
  if (args.includes("--developer") || args.includes("--dev")) return true;

  const raw = env?.FF_DEVELOPER;
  if (raw == null || raw === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return false;
}
