// Query busts game.js (and its graph) — parent main.js?v= alone does not.
import { init } from "./game.js?v=spotlight-hidden-1";

init().catch((err) => {
  console.error("[Future Forge] init failed", err);
});
