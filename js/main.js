// Query busts game.js (and its graph) — parent main.js?v= alone does not.
import { init } from "./game.js?v=lesson-progress-hide-3";

init();
