/**
 * Outreach note for a companion quest.
 * Prints the note, ?q=<id>, and the host line. Does not fetch the network
 * and does not invent which origin this machine is serving.
 *
 *   node scripts/companion-sheet.mjs
 *   node scripts/companion-sheet.mjs test/fixtures/quests/companion-moonshots-304.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { companionAccessLine } from "../js/companion.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fileArg = process.argv[2] && !process.argv[2].startsWith("http")
  ? process.argv[2]
  : "test/fixtures/quests/companion-moonshots-304.json";
const originArg = process.argv[3] || (String(process.argv[2] || "").startsWith("http") ? process.argv[2] : "");

const tile = JSON.parse(fs.readFileSync(path.join(root, fileArg), "utf8"));
const companion = tile.companion || {};
const source = companion.source || {};
const id = tile.id || tile.mission?.id || "";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function longDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!match) return String(iso || "");
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function moonshotsNote() {
  return [
    `${source.speaker}, on ${source.show} episode ${source.episode} (recorded ${longDate(source.recorded)}), says he thinks AGI is here and that it cannot diffuse because the build-out is missing. That is his judgement, not a demonstrated capability.`,
    "",
    "Night shift, Kiln Ferry dock. The demo can name damaged parcels. Two people and a bad circuit cannot run it as the shift. What would you field, and what stays with people?",
    "",
    `Listen at ${source.cue}: ${source.url}`,
    "",
    "If you want the board, the same question is a Future Forge Quest. Access limits are on the page before play.",
    "",
    companionAccessLine(tile, { placed: false }),
  ].join("\n");
}

function genericNote() {
  const who = source.speaker || source.author || "The source";
  const where = source.show || source.publication || source.title || "the piece";
  const lines = [
    `${who}, ${where}.`,
    "",
    companion.invitation || "",
    "",
    source.url || "",
    "",
    "If you want the board, the same question is a Future Forge Quest. Access limits are on the page before play.",
    "",
    companionAccessLine(tile, { placed: false }),
  ];
  return lines.filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
}

const note = id === "companion-moonshots-304" ? moonshotsNote() : genericNote();
const query = id ? `?q=${id}` : "";
const hostLine =
  "The host is the server you are sharing from, for example https://ff.warmersun.com or http://127.0.0.1:8765.";

console.log(note);
console.log("");
console.log(query);
if (originArg && id) {
  const base = String(originArg).replace(/\/$/, "");
  console.log(`${base}/?q=${encodeURIComponent(id)}`);
}
console.log(hostLine);
