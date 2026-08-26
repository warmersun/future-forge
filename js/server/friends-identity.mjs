/**
 * E4 Friends: typed name wins; Clerk fills in when the form is empty.
 */

export function clerkRoomDisplayName(opts = {}) {
  const typed = String(opts.displayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (typed && !typed.includes("@")) return typed;
  const clerk =
    String(opts.clerkFirstName || opts.firstName || opts.clerkUsername || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 24);
  if (clerk && !clerk.includes("@")) return clerk;
  return opts.fallback || "Player";
}

export function stampRoomPlayer(player, ident) {
  const p = player && typeof player === "object" ? { ...player } : {};
  const userId = ident?.signedIn ? ident.userId : null;
  if (userId) p.clerkUserId = userId;
  else delete p.clerkUserId;
  return p;
}
