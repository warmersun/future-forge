/**
 * Immutable quest-package revision.
 * The descriptor is a compact JSON array. Manifest timestamps and the revision
 * field itself are not inputs. Python and Node must emit the same bytes.
 */

export const PACKAGE_IDENTITY_VERSION = 1;

/**
 * @param {string} path
 * @returns {Uint8Array}
 */
export function utf8Bytes(path) {
  return new TextEncoder().encode(path);
}

/**
 * Sort package paths by raw UTF-8 bytes, not locale collation.
 * @param {string} a
 * @param {string} b
 */
export function comparePackagePaths(a, b) {
  const left = utf8Bytes(a);
  const right = utf8Bytes(b);
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

/**
 * @param {string} schema
 * @param {string} packageId
 * @param {{ path: string, digest: string }[]} files file SHA-256 values, lowercase hex, with or without sha256:
 * @returns {string} compact JSON array, UTF-8, no whitespace
 */
export function packageIdentityDescriptor(schema, packageId, files) {
  const pairs = (files || [])
    .filter((row) => row && row.path && row.path !== "manifest.json")
    .map((row) => {
      const digest = String(row.digest || "")
        .replace(/^sha256:/i, "")
        .toLowerCase();
      return [row.path, digest];
    })
    .sort((a, b) => comparePackagePaths(a[0], b[0]));
  return JSON.stringify([schema, packageId, pairs]);
}

/**
 * @param {string} schema
 * @param {string} packageId
 * @param {{ path: string, digest: string }[]} files
 * @param {(bytes: Uint8Array) => Promise<string>|string} digestHex lowercase hex, no prefix
 * @returns {Promise<string>}
 */
export function packageRevision(schema, packageId, files, digestHex) {
  const encoded = utf8Bytes(packageIdentityDescriptor(schema, packageId, files));
  const digested = digestHex(encoded);
  if (digested && typeof digested.then === "function") {
    return digested.then((hex) => `sha256:${String(hex).replace(/^sha256:/i, "").toLowerCase()}`);
  }
  return `sha256:${String(digested).replace(/^sha256:/i, "").toLowerCase()}`;
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
export async function sha256Hex(bytes) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("crypto.subtle unavailable");
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
