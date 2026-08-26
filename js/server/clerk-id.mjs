/**
 * Clerk user id shape. Implementation lives in js/cloud/clerk-id.js (browser-safe).
 * Do not import clerk-auth.mjs from client code — it uses node:async_hooks.
 */

export { normalizeClerkUserId } from "../cloud/clerk-id.js";
