/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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
