/**
 * E4 Friends: typed name wins; chosen profile name fills in when the form is empty.
 * Never uses Clerk first/last name.
 */

export function clerkRoomDisplayName(opts = {}) {
  const typed = String(opts.displayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (typed && !typed.includes("@")) return typed;
  const profile = String(opts.profileDisplayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (profile && !profile.includes("@")) return profile;
  return opts.fallback || "Player";
}

export function stampRoomPlayer(player, ident) {
  const p = player && typeof player === "object" ? { ...player } : {};
  const userId = ident?.signedIn ? ident.userId : null;
  if (userId) p.clerkUserId = userId;
  else delete p.clerkUserId;
  return p;
}
