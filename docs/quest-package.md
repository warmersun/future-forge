# Quest package (`.ffquest`)

One file for a quest, or for a whole learning module, plus the lesson pages and images those tiles link to. The file is a zip. `unzip -l` works on it. The manifest says what is inside and records a sha256 for every file.

This is how a Spotlight lesson moves from an authoring directory to staging and to warmersun.com. The game still plays quest JSON. The package is the envelope around that JSON and the lesson site that goes with it.

## Self-contained worlds (v2)

A Quest with `predictionBankId` or a package containing `predictions/` uses `future-forge.quest-package/v2`. Each playable member names exactly one complete calendar in `predictions/<bank-id>.json`. The filename, bank ID, and Quest binding must agree literally; identifiers are not trimmed or repaired. A module wrapper does not bind a bank. An assumed companion's `premise.bankId` must match its Quest's `predictionBankId`, and grants refer to rows in that calendar.

Different calendars stay separate, even when unrelated packages use the same internal bank ID. Sharing a bank deliberately shares its complete calendar, not just a Quest's granted rows. Unreferenced banks and missing dependencies fail validation. World dependency checks still run under `--no-validate`; that flag does not make an incomplete world valid.

A v2 release has an immutable `revision`: `sha256:` followed by the SHA-256 of compact UTF-8 JSON `[schema, packageId, [[path, digest], ...]]`. Member paths are sorted by raw UTF-8 bytes; file digests are lowercase hexadecimal without a prefix in this descriptor. Every source dependency contributes; generated `manifest.json` and `createdAt` do not. Repacking unchanged bytes retains the revision; changing a calendar, scope, Quest, lesson, or asset creates a new one.

V2 `unpack` retains verified bytes in `raw/` and creates any delivery projection separately. Register `raw/` for integrity and world resolution; never hash a URL-rewritten projection as though it were the original release. Sideload installs this snapshot without changing the process-global calendar. V1 ordinary packages and an explicitly configured v1 developer bank remain supported.

Archive safeguards reject unsafe paths, duplicate names, symbolic links, more than 512 entries, any decompressed member over 8,000,000 bytes, or total decompressed contents over 32,000,000 bytes.

### Worked example and offline publication

Build the existing dock fixture without changing its source claims, adding only its explicit bank binding:

```sh
node scripts/build-companion-dock-example.mjs /absolute/path/to/example-output
./scripts/sideload-local-package.sh /absolute/path/to/example-output/companion-moonshots-304.ffquest
npm run publish:quest-package -- /absolute/path/to/example-output/companion-moonshots-304.ffquest --dry-run
```

The calendar rows are synthetic test assumptions, not verified forecasts or statements by the source speaker. The source quote, interpretation, and fictional scenario premise remain distinct.

Publication validates package integrity/world bindings, strict craft lint, and both solo economy paths before loading an adapter. Both solo paths must be challenging and finish in the same year. Access changes require editing the source and repacking a new revision. Public catalog metadata is derived from that release and replaces stale policy, sponsor, and entitlement fields; current policy also gates historical reads.

Live publication additionally requires a verified atomic create/CAS storage adapter and staging validation. The offline test publisher is not proof of deployed compatibility. See [verification and release gates](testing/self-contained-quest-packages.md) for what was actually exercised, migration/recovery boundaries, and outstanding cross-repository checks.

## Layout

A source directory and the zip use the same paths. `pack` writes `manifest.json`; you do not.

```text
quests/<quest-id>.json          one or more tiles; the file name is the id
lessons/<folder>/index.html     zero or more lesson folders, as served at /lessons/<folder>/
lessons/<folder>/NN-*.html
lessons/<folder>/illustrations/…
assets/…                        optional quest assets
```

Only `quests/`, `lessons/`, and `assets/` are allowed in v1; v2 also permits `predictions/`. Quest JSON sits directly in `quests/`, not in a subdirectory. Lesson folder names are lowercase slugs and do not have to match the quest id (`cells-already-know` can belong to `spotlight-synbio-harborlane-rehab-2026`).

Two shapes, one format:

- **Single quest.** One `kind: "quest"` tile, and optionally one lesson folder. No `module` block.
- **Learning module.** One `kind: "module"` wrapper plus every lesson quest it lists, in order. Lesson pages can be one folder per quest, or one shared folder with many pages. `manifest.module` is derived from the wrapper.

The package id is the wrapper id when there is one, otherwise the quest id. The default output name is `<id>.ffquest`.

## Manifest

The legacy manifest example below uses schema `future-forge.quest-package/v1`. V2 uses schema `future-forge.quest-package/v2`, `version: 2`, a content `revision`, a `predictions` index, and `predictionBankId` on every playable Quest index entry.

```json
{
  "schema": "future-forge.quest-package/v1",
  "id": "module-saltpier-market",
  "version": 1,
  "createdAt": "2026-09-30T00:00:00Z",
  "title": "Same-day dollars at the market",
  "quests": [
    { "id": "module-saltpier-market", "file": "quests/module-saltpier-market.json", "kind": "module", "title": "…" }
  ],
  "module": {
    "id": "module-saltpier-market",
    "title": "Same-day dollars at the market",
    "lessons": ["spotlight-crypto-saltpier-payout-2026"],
    "totalLessons": 4
  },
  "lessons": [
    { "folder": "same-day-dollars", "title": "…", "questIds": ["spotlight-crypto-saltpier-payout-2026"] }
  ],
  "paths": { "lessons": "lessons/", "assets": "assets/" },
  "files": { "quests/module-saltpier-market.json": "sha256:…" }
}
```

`module` is omitted for a single quest. `quests[].lesson` is included when the tile has a lesson number. `lessons[].questIds` lists the quests whose text cites that folder, in lesson order.

The zip stores package paths, not a host. A quest cites `lessons/<folder>/01-job.html` and `assets/cover.png`. A lesson page keeps links relative to itself (`href="01-job.html"`, `src="illustrations/cover.png"`), so those images work on the live site, on a staging preview, and when the HTML is opened with `file://`.

`pack` accepts those paths, and it also accepts the production hosts authors used to write: `https://warmersun.com/lessons/` becomes `lessons/`, and `https://warmersun.com/future-forge/quests/assets/` becomes `assets/`. The manifest records the prefixes:

```json
"paths": { "lessons": "lessons/", "assets": "assets/" }
```

A still the game already serves (`assets/problems/…`, `assets/quests/…` in the game repo) is left as that path. It is rewritten only when the file is actually in the zip.

For v1, `unpack` joins a root onto those paths in the extracted files. For v2, the verified original files stay under `raw/`, with URL-rewritten delivery copies outside `raw/`. Register only the immutable raw release; never overwrite it with the display projection. The root table below describes the legacy v1 delivery layout; v2 deployment roots must include the immutable package ID/revision directory.

```bash
python3 scripts/quest-package.py unpack out.ffquest path/to/destdir \
  --lesson-root https://warmersun.com/staging/<token>/lessons/ \
  --asset-root https://warmersun.com/staging/<token>/quests/package/assets/
```

| Use | lesson root | asset root |
|-----|-------------|------------|
| Stage | `https://warmersun.com/staging/<token>/lessons/` | `https://warmersun.com/staging/<token>/quests/package/assets/` |
| Website deploy (public catalog) | `https://warmersun.com/lessons/` | `https://warmersun.com/future-forge/quests/assets/` |
| Gated deploy (object store) | `https://warmersun.com/lessons/` | `https://warmersun.com/quests/<source>/assets/` |
| Lesson pages on disk | `file:///absolute/dir/lessons/` | `file:///absolute/dir/assets/` |
| Game on localhost | `http://127.0.0.1:<port>/content/lessons/` | `http://127.0.0.1:<port>/content/assets/` |

The website deploy's asset root is the prefix `publish-quests.py` rewrites to `https://warmersun.com/quests/<source>/assets/` when it builds the public site. A gated tile skips that build: `npm run publish:quest` uploads the JSON to the bucket unchanged, and the game uses `imageUrl` as written. So a gated tile must already cite the final path, with `<source>` the module's id in warmersun's `scripts/quest-sources.json` (`solved-today` for Solved Today, `spotlights` for single spotlights). The images themselves are still served from the public site: they must sit in that source's `quests/assets/`, which `publish-quests.py` copies to `/quests/<source>/assets/`.

To play a package on this machine, in developer mode, with the quest in Library:

```bash
./scripts/sideload-local-package.sh path/to/quest.ffquest
```

That unpacks into a temporary folder, serves it at `http://127.0.0.1:8765/content/`, and starts the game. Stopping the server removes the folder. The tutor follows `https://` links and `http://127.0.0.1` links. A page on localhost cannot fetch `file://` images.

## CLI

From the Future Forge repo:

```bash
npm run pack:quest -- path/to/srcdir -o path/to/out.ffquest
npm run verify:quest-package -- path/to/out.ffquest
python3 scripts/quest-package.py inspect path/to/out.ffquest
python3 scripts/quest-package.py inspect path/to/out.ffquest --json
python3 scripts/quest-package.py unpack path/to/out.ffquest path/to/destdir \
  --lesson-root https://warmersun.com/staging/<token>/lessons/ \
  --asset-root https://warmersun.com/staging/<token>/quests/package/assets/
```

`pack` checks the tree, runs `node scripts/validate-quest.mjs --strict` on every tile, then writes the zip. `--no-validate` skips that validator. It does not skip the package checks.

`verify` checks:

- The manifest schema, and that every field matches the files (ids, order, lesson folders, hashes).
- Quest file names match ids. No duplicate ids. No `..` or absolute paths.
- Each lesson folder has an `index.html`.
- Every `lessons/…` path in quest JSON and lesson HTML resolves to a file in the package, including a bare folder path, which must have `index.html`. Every `assets/…` path resolves under `assets/`, except a game still (`assets/problems/…`, `assets/quests/…`) that is not in the zip.
- Page-relative `href` and `src` in lesson HTML resolve inside the package.

When a `kind: "module"` tile is present, `verify` also checks the wrapper the way `validateQuestModule` does:

- Exactly one wrapper, and `manifest.module` matches it.
- Every id in the wrapper's `lessons` array is a `kind: "quest"` tile in the package.
- Every quest with `isLearningModule: true` is listed on the wrapper. More than one learning quest and no wrapper is an error. One learning quest and no wrapper is allowed.
- Each lesson quest sets `isLearningModule: true`, the same `module` title as the wrapper, and `totalLessons` equal to the wrapper's `totalLessons` (or the length of `lessons` when the wrapper omits it).
- `lesson` numbers are unique and run `1..N` in wrapper order.
- The wrapper lists at most 24 lessons.

For v1 only, `--allow-external-lessons` turns a missing lesson id into a warning, for a package that extends lessons already on the live catalog. V2 must include its required lesson Quests and banks; this flag cannot relax those dependencies. `pack` and `verify` both take the flag. Deploy still requires each external id to already be in `future-forge/quests/catalog.json`.

`unpack` verifies first, then extracts. It refuses a non-empty destination. `--lesson-root` and `--asset-root` are joined onto package paths in delivery `*.json` and `*.html` copies, leaving v2 `raw/` bytes unchanged. A root without a trailing slash gets one. The manifest itself is not rewritten.

## Stage and deploy

Those scripts live in the warmersun repo, because that is where the site tree and the here.now credentials are. They call this CLI; they do not reimplement the zip.

```bash
# from ~/dev/warmersun
./scripts/stage-package.sh path/to/out.ffquest
./scripts/website-deploy-package.sh path/to/out.ffquest
./scripts/gated-deploy-package.sh path/to/out.ffquest
```

`website-deploy-package.sh` publishes the quest catalog and the lesson pages on warmersun.com. `gated-deploy-package.sh` upserts the quest JSON into the private object-store catalog and publishes the lesson pages (and package images) on the website. The new tile is not added to the public quest catalog.

`FF_REPO` (default `~/dev/learning-game`) points at this repo. See `~/dev/warmersun/scripts/README.md`.
