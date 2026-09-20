#!/usr/bin/env node
/**
 * Mux each Say-line TTS under its raw invent-screen take, then concat
 * friend cut (1→8→10→11→5→14→16) and full series (1–18).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadOnTheCurvePackSync } from "../js/on-the-curve-pack.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(ROOT, "output/on-the-curve");
const RAW = path.join(PACK, "raw");
const CLIPS = path.join(PACK, "clips");
const AUDIO = path.join(PACK, "audio");
/** Voice starts after this pad; clip ends shortly after the Say line. */
const VO_DELAY_S = 0.35;
const VO_TAIL_S = 0.45;
/** Start this far into the raw take so the Record beat is on screen during the Say line. */
const RAW_START_S = {
  "10-convergence": 7.2,
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => {
      out += d;
    });
    p.stderr.on("data", (d) => {
      err += d;
    });
    p.on("close", (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.join(" ")} → ${code}\n${err || out}`));
    });
  });
}

function probeDuration(file) {
  return run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]).then((r) => Number.parseFloat(String(r.out).trim()) || 0);
}

function writeConcat(listPath, files) {
  const body = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
  fs.writeFileSync(listPath, body);
  return listPath;
}

async function muxClip(shot) {
  const raw = path.join(RAW, `${shot.id}.mp4`);
  const mp3 = path.join(AUDIO, `${shot.id}.mp3`);
  const dest = path.join(CLIPS, shot.file);
  if (!fs.existsSync(raw)) throw new Error(`missing raw ${raw}`);
  if (!fs.existsSync(mp3)) throw new Error(`missing audio ${mp3}`);
  const vDur = await probeDuration(raw);
  const aDur = await probeDuration(mp3);
  const dur = VO_DELAY_S + aDur + VO_TAIL_S;
  const delayMs = Math.round(VO_DELAY_S * 1000);
  const start = Number(RAW_START_S[shot.id] || 0);
  const ffIn = ["-y", "-hide_banner", "-loglevel", "error"];
  if (start > 0) ffIn.push("-ss", start.toFixed(2));
  ffIn.push("-i", raw, "-i", mp3);
  await run("ffmpeg", [
    ...ffIn,
    "-filter_complex",
    [
      `[0:v]fps=24,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=${dur}[v]`,
      `[1:a]adelay=${delayMs}|${delayMs},apad=pad_dur=${dur}[a]`,
    ].join(";"),
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    dur.toFixed(2),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "24",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    dest,
  ]);
  const outDur = await probeDuration(dest);
  console.log(`mux ${shot.file}  raw=${vDur.toFixed(2)}s  vo=${aDur.toFixed(2)}s  out=${outDur.toFixed(2)}s`);
  return dest;
}

async function concatList(name, files, dest) {
  const list = path.join(PACK, `${name}.concat.txt`);
  writeConcat(
    list,
    files.map((f) => path.relative(PACK, f) || f)
  );
  // concat demuxer paths are relative to the list file
  const absList = path.join(PACK, `${name}.concat.abs.txt`);
  writeConcat(absList, files);
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    absList,
    "-c",
    "copy",
    dest,
  ]);
  const d = await probeDuration(dest);
  console.log(`concat ${path.basename(dest)}  ${d.toFixed(2)}s  (${files.length} clips)`);
  return list;
}

function writeReadme(pack, friendFiles, seriesFiles) {
  const lines = [
    "# On the curve — built pack",
    "",
    "Invent-screen first-person clips from `docs/on-the-curve-recording-pack.md`.",
    "Voice is each item’s **Say** line. Developer view off. Year starts 2026.",
    "Setup Quest: Crossing Clinic 7 (gene sequencing Spotlight).",
    "",
    "## Clips",
    "",
    "| # | File | Friend cut | Say |",
    "| --- | --- | --- | --- |",
    ...pack.shots.map(
      (s) =>
        `| ${s.n} | [\`${s.file}\`](clips/${s.file}) | ${s.friendCut ? "Yes" : ""} | ${s.say.replace(/\|/g, "\\|")} |`
    ),
    "",
    "## Cuts",
    "",
    `- Friend cut (1 → 8 → 10 → 11 → 5 → 14 → 16): [\`friend-cut.mp4\`](friend-cut.mp4)`,
    `- Full series (1–18): [\`full-series.mp4\`](full-series.mp4)`,
    "",
    "Concat lists: `friend-cut.concat.txt`, `full-series.concat.txt`.",
    "",
  ];
  fs.writeFileSync(path.join(PACK, "README.md"), lines.join("\n"));
  void friendFiles;
  void seriesFiles;
}

async function main() {
  const pack = loadOnTheCurvePackSync(ROOT, fs, path);
  fs.mkdirSync(CLIPS, { recursive: true });
  const clipFiles = [];
  for (const shot of pack.shots) {
    clipFiles.push(await muxClip(shot));
  }
  const byN = new Map(pack.shots.map((s, i) => [s.n, clipFiles[i]]));
  const friendFiles = pack.friendCutOrder.map((n) => byN.get(n));
  const seriesFiles = clipFiles;
  await concatList("friend-cut", friendFiles, path.join(PACK, "friend-cut.mp4"));
  await concatList("full-series", seriesFiles, path.join(PACK, "full-series.mp4"));
  writeReadme(pack, friendFiles, seriesFiles);
  console.log("OK  assembled output/on-the-curve/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
