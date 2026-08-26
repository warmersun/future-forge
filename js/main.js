// Same specifier as game.js (`./auth.js`) — a ?v= here would be a second Clerk module
// and title CTAs would never see the session.
void import("./auth.js")
  .then((m) => m.initAuth())
  .catch((e) => console.warn("[clerk]", e?.message || e));
void import("./game.js?v=portal-11")
  .then((m) => m.init())
  .catch((e) => console.error("[game]", e?.message || e));
