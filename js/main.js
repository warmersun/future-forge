// Query busts game.js (and its graph) — parent main.js?v= alone does not.
// Load Clerk independently so a game-module failure still shows Sign in.
void import("./auth.js?v=portal-1")
  .then((m) => m.initAuth())
  .catch((e) => console.warn("[clerk]", e?.message || e));
void import("./game.js?v=portal-1")
  .then((m) => m.init())
  .catch((e) => console.error("[game]", e?.message || e));
