// Query busts game.js (and its graph) — parent main.js?v= alone does not.
import { init } from "./game.js?v=hex-invent-17";

init();
