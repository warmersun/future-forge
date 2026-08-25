// Query busts game.js (and its graph) — parent main.js?v= alone does not.
import { init } from "./game.js?v=clerk-auth-2";
import { initAuth } from "./auth.js?v=clerk-1";

init();
void initAuth();
