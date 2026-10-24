/** Delivery projections never modify the bytes used for release hashes.
 * deliveryRoot is an operator-approved HTTPS directory mapping the object-key
 * namespace (including its configured storage prefix), NOT a bucket name or an
 * assertion that private objects are public. FF_QUEST_PACKAGE_DELIVERY_ROOT must
 * point at an actually served, appropriately access-controlled media/lesson
 * endpoint. That endpoint must not serve manifest, quest or prediction sources.
 * No delivery root is inferred from a private bucket or a filesystem location.
 */
import { safePackageMember } from "./package-paths.mjs";

function error(code) { return Object.assign(new Error(code), { code }); }

export function approvedPackageDeliveryRoot(value) {
  if (typeof value !== "string" || !value || value !== value.trim() ||
      /[\\\s%]/.test(value)) throw error("package_delivery_root_forbidden");
  let url;
  try { url = new URL(value); } catch { throw error("package_delivery_root_forbidden"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      value.split("/").some((part) => part === "." || part === ".."))
    throw error("package_delivery_root_forbidden");
  return `${url.href.replace(/\/+$/, "")}/`;
}

/** Project ONLY selected, validated quest content; never serialize release files. */
export function projectPackageDelivery(record, { deliveryRoot, objectRoot, members, validateOnly = false } = {}) {
  const base = deliveryRoot == null || deliveryRoot === "" ? "" : approvedPackageDeliveryRoot(deliveryRoot);
  if (!safePackageMember(objectRoot)) throw error("package_delivery_root_forbidden");
  const root = base ? new URL(`${objectRoot}/`, base).href : "";
  const mapUrl = (raw) => {
    if (typeof raw !== "string" || !raw) return raw;
    // Absolute external URLs and fragment-only links are not package members.
    if (/^https?:\/\//i.test(raw) || raw.startsWith("#")) return raw;
    const match = /^(?:\.\/)?((?:assets|lessons)\/[^?#]*)([?#].*)?$/.exec(raw);
    if (!match) throw error("package_delivery_path_forbidden");
    const [, member, suffix = ""] = match;
    if (!safePackageMember(member)) throw error("package_delivery_path_forbidden");
    if (!Object.hasOwn(members || {}, member)) {
      // Match the archive contract: engine-owned stills are not dependencies
      // unless shipped in this release. They remain relative to the game origin.
      if (member.startsWith("assets/problems/") || member.startsWith("assets/quests/")) return raw;
      throw error("package_dependency_missing");
    }
    // Offline publication validates containment/dependencies before an operator
    // has configured a serving endpoint. It must not invent a delivery URL.
    if (validateOnly) return raw;
    if (!root) throw error("package_delivery_root_required");
    const url = new URL(member, root);
    if (!url.href.startsWith(root)) throw error("package_delivery_path_forbidden");
    return `${url.href}${suffix}`;
  };
  const markdown = (text) => typeof text === "string"
    ? text.replace(/(!?\[[^\]\n]*\]\(\s*<?)([^\s)>]+)(>?[^)\n]*\))/g,
      (_all, before, url, after) => `${before}${mapUrl(url)}${after}`)
    : text;
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      ["titleImageUrl", "coverImageUrl", "imageUrl"].includes(key) ? mapUrl(item)
        : ["briefMd", "overviewMd", "aiTutorContext", "grounding", "bodyMd"].includes(key) ? markdown(item)
          : visit(item)]));
  };
  return { record: visit(record), deliveryRoot: root };
}
