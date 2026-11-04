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
 * Object and remote paths for an immutable package release.
 * A package ref is not a URL. Paths must stay under the configured prefix.
 */

const PACKAGE_REF_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const REVISION_RE = /^sha256:[0-9a-f]{64}$/;

/**
 * @param {unknown} raw
 * @returns {{ packageId: string, revision: string, questId: string } | null}
 */
export function parsePackageRef(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { packageId, revision, questId } = raw;
  if (![packageId, revision, questId].every((value) => typeof value === "string")) return null;
  if (!PACKAGE_REF_RE.test(packageId) || !PACKAGE_REF_RE.test(questId)) return null;
  if (!REVISION_RE.test(revision)) return null;
  return { packageId, revision, questId };
}

/**
 * @param {string} prefix
 * @param {{ packageId: string, revision: string }} ref
 * @param {string} [rel]
 */
export function packageObjectKey(prefix, ref, rel = "") {
  if (!ref || typeof ref.packageId !== "string" || !PACKAGE_REF_RE.test(ref.packageId) ||
      typeof ref.revision !== "string" || !REVISION_RE.test(ref.revision)) return "";
  if (rel !== "" && !safePackageMember(rel)) return "";
  const hex = ref.revision.slice("sha256:".length);
  const base = ["packages", ref.packageId, hex, rel]
    .filter(Boolean)
    .join("/");
  const p = String(prefix || "").replace(/^\/+|\/+$/g, "");
  const key = p ? `${p}/${base}` : base;
  if (key.split("/").some((part) => !part || part === ".." || part === ".")) return "";
  return key;
}

/**
 * Refuse a file path that leaves the catalog origin or the storage prefix.
 * @param {string} root
 * @param {string} file
 */
export function safePackageMember(name) {
  return typeof name === "string" && !!name &&
    !/[\\\\%?#:\u0000-\u001f\u007f]/.test(name) &&
    !name.split("/").some((part) => !part || part === "." || part === "..");
}

export function containedPackageFile(root, file) {
  if (!safePackageMember(file)) return "";
  const name = file;
  const base = String(root || "").replace(/\/+$/, "");
  return base ? `${base}/${name}` : name;
}
