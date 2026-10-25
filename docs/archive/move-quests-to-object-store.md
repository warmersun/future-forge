# Move the official quests into object storage

This document is for Grok Bot. Reading it is the request to copy the current official quest JSON into the private Neon `quests` bucket.

Dry-run first. Upload when the dry-run matches the checks in this document. Leave warmersun.com, Render, and every tile's `access` field as they are.

A new tile ships as one `.ffquest`, then `./scripts/gated-deploy-package.sh` in the warmersun repo. This document is the one-time move of the catalogs that already exist. That move calls `npm run publish:quest` directly.

Inventory date: 2026-10-14 (updated for Solved Today). Re-read the source catalogs when you run. The counts below are the expected set.

## What changed

The portal serves one official catalog.

- With `FF_QUESTS_BUCKET` set, the portal reads only that private bucket. The bucket name is `quests` unless the variable names another bucket. An optional `FF_QUESTS_OBJECT_PREFIX` is prepended to every key. A configured bucket does not fall back to https://warmersun.com/quests/catalog.json. An empty or unreadable catalog fails closed.
- With `FF_QUESTS_BUCKET` unset, the portal reads the public catalog (`FF_QUESTS_REMOTE_URL`, otherwise the warmersun.com quests catalog).
- The two sources are not merged.

The game asks the portal for quests only when both `FF_PORTAL_URL` and `FF_PORTAL_QUESTS=1` are set. Setting only the API origin connects accounts without replacing a self-hosted game's Library or configured remote catalog. The hosted game must explicitly enable the catalog flag. The game never holds bucket keys. Portal 200, 401, and 402 pass through. Any other portal status falls back to the local Library folder only.

The local Library folder still merges with whichever official catalog is active. Official wins on a shared id. `omitOfficialLocalDuplicates` drops the Library copy of an official id from the list the hub renders, so that copy cannot skip the gate. A failed official fetch yields no ids to omit, and Library copies can still be served in that case.

Gate, when Clerk is on:

- `open`: full JSON, signed in or not.
- Unset remote learning module, `kind: "module"`, or `access: "account"`: a card if unsigned, full JSON if signed in.
- `access: "paid"` with no sponsor and no `entitlement: "catalog.free"`: a card if unsigned (401) or signed in without `subscriptionEntitled` (402 plus `subscribeUrl`). Full JSON if entitled. Sponsored or `catalog.free` stays an account gate even when `access` is `paid`.
- Clerk off: no gate. Library `hosted` and `imported` tiles stay ungated and are never looked up in the bucket.

`subscriptionEntitled` is the existing Cloud plan check (`FF_CLOUD_PLAN_SLUGS`).

`GET /api/quests` returns full JSON only for tiles the caller may read, and cards otherwise. `GET /api/quests/:id` returns `{ ok: true, tile }` or 401/402 with the card. A 402 includes `subscribeUrl`. The portal caches a successful bucket read for about 10 minutes. `?refresh=1` bypasses that cache. The gate runs per request after the cache.

A card omits `aiTutorContext`, the mission body, `overviewMd`, and the raw tile. A card includes `id`, `title`, `summary`, `access`, `entitlement`, `kind`, `module`, `lesson`, `totalLessons`, `sponsorName`, `isLearningModule`, `source`, `gated`, `globalId`, `place`, and `lessons` id arrays. The hub keeps a locked card with no mission body. Lesson order reads `lesson` on the card. Unsigned play prompts Sign in before the missing-mission toast. A 402 sends the player to subscribe. Tutor and voice session create take `aiTutorContext` from the gated catalog tile, not from the client body.

`npm run publish:quest` upserts tiles into the live bucket catalog. It downloads `catalog.json`, adds or replaces the ids you pass, and leaves every other entry. It does not delete objects. The object key is `<id>.json` from the JSON `id`, under the prefix when one is set. A missing catalog starts `{ quests: [] }`. Invalid catalog JSON stops the upload. Auth and network errors are not an empty catalog. `scripts/publish-quests-object-storage.mjs` no longer uploads.

Lesson HTML on warmersun.com/lessons stays public. This upload is JSON tiles only.

## Where the quests are

Paths depend on the machine. Set these before you run anything. Each one has a default:

| Variable | Default | What it is |
| --- | --- | --- |
| `FF_GAME_DIR` | the current directory | This future-forge checkout. `npm run publish:quest` runs here. |
| `FF_WARMERSUN_DIR` | `~/dev/warmersun` | The warmersun repo checkout. |
| `FF_SPOTLIGHTS_QUESTS_DIR` | `$FF_WARMERSUN_DIR/future-forge/quests` | The `spotlights` source. |
| `FF_SOLVED_TODAY_QUESTS_DIR` | `~/dev/ff-solved-today/quests` | The `solved-today` source (warmersun/ff-solved-today). |
| `FF_LEARN_DAILY_QUESTS_DIR` | `~/dev/ff-learn-daily/quests` | The `learn-daily` source (warmersun/ff-learn-daily). |
| `FF_QUEST_MOVE_FILES` | `/tmp/ff-quest-move-files.txt` | Where the file list from step 2 is saved. |
| `FF_QUEST_MOVE_MIN` | `60` | The smallest total number of catalog tiles the file list may have. |

For example:

```bash
export FF_GAME_DIR="$PWD"
export FF_WARMERSUN_DIR="$HOME/dev/warmersun"
```

The public site is built by `$FF_WARMERSUN_DIR/scripts/publish-quests.sh` from `scripts/quest-sources.json`, which lists three sources:

| Source id | Path | On 2026-10-14 |
| --- | --- | --- |
| `spotlights` | `$FF_SPOTLIGHTS_QUESTS_DIR` | catalog `updated` 2026-10-13, 29 entries |
| `solved-today` | `$FF_SOLVED_TODAY_QUESTS_DIR` | catalog `updated` 2026-10-13, 7 entries: the `solved-today` module and its 6 lessons |
| `learn-daily` | `$FF_LEARN_DAILY_QUESTS_DIR` | catalog `updated` 2026-10-01, 24 entries |

That is 60 tiles, the same 60 ids as the live https://warmersun.com/quests/catalog.json on 2026-10-14 (29 under `spotlights/`, 7 under `solved-today/`, 24 under `learn-daily/`).

`publish-quests.sh` and `publish-quests.py` stop when any listed source catalog is missing. Without `--build-only` they also publish the public website. Do not run either script. Publish from the three source catalogs.

Solved Today holds these tiles, all with `access: "account"`. They were `open` at the 2026-10-14 inventory; Sic changed the module and its lessons to require an account on 2026-10-19 (ff-solved-today commit `afbd7b1`).

| Catalog id | File |
| --- | --- |
| `solved-today` (`kind: "module"`, lessons are the six below) | `solved-today.json` |
| `spotlight-robots-grayreach-deck-2026` | `spotlight-robots-grayreach-deck-2026.json` |
| `spotlight-geothermal-steamholt-brine-2026` | `spotlight-geothermal-steamholt-brine-2026.json` |
| `spotlight-print3d-beadwell-walls-2026` | `spotlight-print3d-beadwell-walls-2026.json` |
| `solved-today-ocean-cleanup-sennet-2026` | `solved-today-ocean-cleanup-sennet-2026.json` |
| `spotlight-space-farcall-ferry-2026` | `spotlight-space-farcall-ferry-2026.json` |
| `spotlight-geneng-mistlantern-fields-2026` | `spotlight-geneng-mistlantern-fields-2026.json` |

The module wrapper lists its six lessons, so all seven files go in the same command, like the `module-progress-and-predictions` batch.

The source tiles are not byte-for-byte the public ones. The public build rewrites image URLs. In the Sennet, Farcall and Mistlantern source files, `briefBeats[].imageUrl` points at `https://warmersun.com/future-forge/quests/assets/...`, which returns 404. The public copies point at `https://warmersun.com/quests/solved-today/assets/...`, which works. The bucket gets the source files as they are, so those three tiles will show broken beat images from the bucket until their sources are fixed in ff-solved-today. Mention this in the summary. Do not edit tiles as part of this move.

Each source `catalog.json` is an index of `{ id, file }`. The tile JSON holds `access`, `kind`, `isLearningModule`, and `sponsorName`. Pass `path.join(sourceDir, entry.file)` for every entry. `catalog.json` itself is not a tile.

One source filename does not match its id. The spotlights catalog entry `spotlight-synbio-harborlane-rehab-2026` points at `cells-already-know.json`. The JSON `id` inside that file is `spotlight-synbio-harborlane-rehab-2026`. Pass that path. The uploader names the object from the JSON `id`. Leave the source filename as it is.

The spotlights directory also contains `spotlight-ai-hearthline-rsi-check-play-2026.json`. It is not in `catalog.json`. The catalog tile is `spotlight-ai-hearthline-rsi-check-2026`. Directory mode of `publish:quest` uploads every `*.json` except `catalog.json` in that folder, one level only, so it would upload the play file. Pass the catalog file list. Do not pass either source directory.

`module-progress-and-predictions` is in the spotlights catalog. Its lesson ids are the twelve `pp-01` through `pp-12` tiles in that same catalog. Those lessons have to be in the same command, or already in the bucket, or the command uploads nothing. One command with every catalog-listed file from all three sources is the batch. The two `pp-automator-lesson-*` tiles are separate quests in the spotlights catalog. Include them too. They are not the module wrapper's lesson list.

All three source folders must be present. If any source catalog or any listed file is missing, stop and upload nothing.

Do not publish `$FF_GAME_DIR/quests`. That folder is the local Library side-load (sample JSON files, including copies of official ids).

## Access to leave in place

Do not pass `--access`. The flag would rewrite `access` on the uploaded JSON. The portal enforces this for the 2026-10-14 tiles:

| Tiles | Stored `access` | Portal enforces |
| --- | --- | --- |
| `spotlight-synbio-tallowkey-bottles-2026` | `open` (also a learning module) | `open` |
| `solved-today` and its six lessons (Grayreach, Steamholt, Beadwell, Sennet, Farcall, Mistlantern) | `account` (was `open` until 2026-10-19) | `account` |
| `spotlight-drones-northline-cedar-bend-2026` (MyCompany), `spotlight-gene-seq-yourcompany-crossing-clinic-2026` (YourCompany), `spotlight-robots-ourcompany-millspan-line-2026` (OurCompany) | unset, not a learning module | `open` |
| The other 24 spotlights quests, including Extropic `spotlight-computing-northwharf-dispatch-2026` and the four Base saltpier tiles | unset learning modules | `account` |
| `module-progress-and-predictions` | unset `kind: "module"` | `account` |
| 22 learn-daily tiles | `account` | `account` |
| `spotlight-drones-ashwell-yards-2026`, `spotlight-quantum-rook-cryo-2026` | unset learning modules | `account` |

None of these tiles are `paid`. None set `entitlement`. Sponsored learning tiles stay an account gate. Do not mark them `paid`.

## Steps

1. Set the path variables above. Confirm all three source catalogs exist: `$FF_SPOTLIGHTS_QUESTS_DIR/catalog.json`, `$FF_SOLVED_TODAY_QUESTS_DIR/catalog.json` and `$FF_LEARN_DAILY_QUESTS_DIR/catalog.json`. Pull each source repo so it matches the live catalog.

2. Build the file list from the three catalogs. This prints absolute paths and exits 1 if a catalog or a listed file is missing, if a JSON `id` disagrees with the catalog id, if the play file is included, or if any id from the inventory below is absent, or if the list has fewer than `FF_QUEST_MOVE_MIN` tiles.

```bash
node --input-type=module << 'JS'
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const expand = (p) => (p.startsWith("~/") ? path.join(home, p.slice(2)) : p);
const env = (name, fallback) => path.resolve(expand(process.env[name] || fallback));
const warmersunDir = env("FF_WARMERSUN_DIR", "~/dev/warmersun");
const sources = [
  env("FF_SPOTLIGHTS_QUESTS_DIR", path.join(warmersunDir, "future-forge/quests")),
  env("FF_SOLVED_TODAY_QUESTS_DIR", "~/dev/ff-solved-today/quests"),
  env("FF_LEARN_DAILY_QUESTS_DIR", "~/dev/ff-learn-daily/quests"),
];
const minCount = Number(process.env.FF_QUEST_MOVE_MIN || 60);
const required = new Set(`
spotlight-computing-northwharf-dispatch-2026
spotlight-drones-northline-cedar-bend-2026
spotlight-gene-seq-yourcompany-crossing-clinic-2026
spotlight-robots-ourcompany-millspan-line-2026
pp-automator-lesson-1-bits-millbridge-2026
pp-automator-lesson-2-atoms-eastspan-2026
spotlight-synbio-eastferry-mirror-foundry-2026
spotlight-synbio-tideglass-high-2026
spotlight-drones-kettle-ford-2026
spotlight-synbio-harborlane-rehab-2026
spotlight-crypto-saltpier-payout-2026
spotlight-crypto-saltpier-remit-2026
spotlight-crypto-saltpier-share-2026
spotlight-crypto-saltpier-agent-2026
spotlight-ai-hearthline-rsi-check-2026
spotlight-synbio-tallowkey-bottles-2026
solved-today
spotlight-robots-grayreach-deck-2026
spotlight-geothermal-steamholt-brine-2026
spotlight-print3d-beadwell-walls-2026
solved-today-ocean-cleanup-sennet-2026
spotlight-space-farcall-ferry-2026
spotlight-geneng-mistlantern-fields-2026
module-progress-and-predictions
pp-01-exponential-quiet-2026
pp-02-computing-living-plan-2026
pp-03-ai-owned-desk-2026
pp-04-robots-open-crate-2026
pp-05-networks-first-day-2026
pp-06-transport-curb-2026
pp-07-iot-wet-wall-2026
pp-08-print-cracked-coupling-2026
pp-09-synbio-empty-vial-2026
pp-10-vr-open-housing-2026
pp-11-crypto-shared-book-2026
pp-12-solar-noon-cup-2026
spotlight-genetic-engineering-saltwick-filter-2026
spotlight-robots-ashford-draw-2026
spotlight-transportation-pellwater-hop-2026
spotlight-iot-riverglen-duo-signal-2026
spotlight-solar-sunreach-depot-2026
spotlight-genetic-engineering-harborfeed-ward-2026
spotlight-nuclear-coalridge-license-2026
spotlight-quantum-thornbay-gravity-fix-2026
spotlight-link-saltcove-sky-cell-2026
spotlight-drones-marshbay-middle-mile-2026
spotlight-genetic-engineering-ashglen-axd-2026
spotlight-robots-millhaven-walkoff-2026
spotlight-battery-kilnreach-heat-2026
spotlight-bci-twinreach-both-talk-2026
spotlight-energy-saltreach-same-path-2026
spotlight-earth-driftmouth-rivers-first-2026
spotlight-robots-steadybend-steady-scope-2026
spotlight-genetic-engineering-softglen-gene-keep-2026
spotlight-robots-steadyhaven-hands-free-2026
spotlight-lifeforce-quickculture-right-drug-2026
spotlight-lifeforce-glowreach-needlefree-light-2026
spotlight-automator-milereach-one-charge-2026
spotlight-drones-ashwell-yards-2026
spotlight-quantum-rook-cryo-2026
`.trim().split(/\s+/));

const files = [];
const ids = [];
for (const dir of sources) {
  const catPath = path.join(dir, "catalog.json");
  if (!fs.existsSync(catPath)) {
    console.error("missing catalog:", catPath);
    process.exit(1);
  }
  const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
  if (!cat || !Array.isArray(cat.quests) || !cat.quests.length) {
    console.error("empty catalog:", catPath);
    process.exit(1);
  }
  for (const entry of cat.quests) {
    if (!entry || typeof entry.file !== "string" || !entry.id) {
      console.error("bad catalog entry in", catPath);
      process.exit(1);
    }
    const file = path.join(dir, entry.file);
    if (!fs.existsSync(file)) {
      console.error("missing tile:", file);
      process.exit(1);
    }
    const tile = JSON.parse(fs.readFileSync(file, "utf8"));
    if (tile.id !== entry.id) {
      console.error("id mismatch:", file, "catalog", entry.id, "json", tile.id);
      process.exit(1);
    }
    files.push(file);
    ids.push(entry.id);
  }
}
if (files.some((file) => file.endsWith("spotlight-ai-hearthline-rsi-check-play-2026.json"))) {
  console.error("play file must not be in the list");
  process.exit(1);
}
const missing = [...required].filter((id) => !ids.includes(id));
if (missing.length) {
  console.error("missing required ids:", missing.join(", "));
  process.exit(1);
}
if (new Set(ids).size !== ids.length) {
  console.error("duplicate catalog ids across sources");
  process.exit(1);
}
if (files.length < minCount) {
  console.error(`only ${files.length} tiles, expected at least ${minCount}`);
  process.exit(1);
}
const extra = ids.filter((id) => !required.has(id));
if (extra.length) console.error("extra catalog ids:", extra.join(", "));
console.error(`ok: ${files.length} tiles from ${sources.length} catalogs`);
process.stdout.write(files.join("\n") + "\n");
JS
```

Save stdout to `$FF_QUEST_MOVE_FILES` (for example, end the `node` line with `> "${FF_QUEST_MOVE_FILES:-/tmp/ff-quest-move-files.txt}"`). If stderr reports extra catalog ids, keep those files in the list. They belong to the current source catalogs. Mention them in the summary. If the script exits 1, stop.

3. Credentials load from the process environment, then `.env.object-storage.local`, then `.env.portal`. The command does that itself. Do not print those files or any secret value. If `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, or `AWS_SECRET_ACCESS_KEY` is missing, the command exits before upload. Stop there. Do not fetch the public catalog to fill the bucket. Do not write a new `DATABASE_URL`.

4. Dry-run from the game repo. This still reads the live catalog.

```bash
cd "${FF_GAME_DIR:-.}"
mapfile -t FILES < "${FF_QUEST_MOVE_FILES:-/tmp/ff-quest-move-files.txt}"
npm run publish:quest -- "${FILES[@]}" --dry-run
```

5. Accept the dry-run only when all of these are true:

- One `added` or `updated` line for every id in the file list, including `module-progress-and-predictions`, all twelve `pp-01` through `pp-12` lessons, `spotlight-synbio-tallowkey-bottles-2026`, and the `solved-today` module with its six lessons.
- The harborlane line is `spotlight-synbio-harborlane-rehab-2026`, from `cells-already-know.json`.
- No line for `spotlight-ai-hearthline-rsi-check-play-2026`.
- Access on the four open spotlights tiles above is `open`. Access on all seven Solved Today tiles is `account`. Access on `module-progress-and-predictions`, the Extropic and Base tiles, and both unset learn-daily tiles is `account`. No line says `access=paid`.
- The catalog count is at least 60 (29 spotlights + 7 solved-today + 24 learn-daily). Upsert keeps ids already in the bucket, so a count above 60 means the live catalog had other entries. That is fine. A count below 60 is not.
- The output contains `dry-run: uploaded nothing` and no line that starts with `uploaded`.

6. If validation, craft lint, or the economy lab fails, the command uploads nothing. Report the file path and the warning or verdict. Do not pass `--skip-economy`. Do not edit a tile to force this move through. A `kind: "quest"` tile must verdict `challenging`. The module wrapper skips the lab.

7. When the dry-run matches, upload with the same file list and no `--access` flag:

```bash
cd "${FF_GAME_DIR:-.}"
mapfile -t FILES < "${FF_QUEST_MOVE_FILES:-/tmp/ff-quest-move-files.txt}"
npm run publish:quest -- "${FILES[@]}"
```

8. Run the same command with `--dry-run` again. Every id from this batch should say `updated`. The catalog count should match the upload you just did. The output should say `dry-run: uploaded nothing`.

## Leave these alone

- Do not upload lesson HTML, images, or the warmersun `catalog.json`.
- Do not assemble a one-quest catalog and upload it over the live catalog.
- Do not run `scripts/publish-quests-object-storage.mjs` or `npm run publish:quests-storage`.
- Do not delete objects from the bucket.
- Do not put `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, or `AWS_REGION` on the `warmer-sun-game` Render service.
- Do not change Render env vars, and do not unpublish quests from warmersun.com, as part of this move.

The hosted portal reads the bucket only when the Render service `warmer-sun-portal` has `FF_QUESTS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION`. In `render.yaml` those keys are `sync: false`. Setting them on the hosted portal switches that portal off the public catalog. This document does not ask for that switch. Local `.env.portal` is what the publish command on this machine reads.

Objects in the bucket do not remove the public site. Lesson pages at warmersun.com/lessons stay public. Stopping a public publish of gated tiles would be a separate change in the warmersun repo.
