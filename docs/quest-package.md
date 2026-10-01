# Quest package (`.ffquest`)

One file for a quest, or for a whole learning module, plus the lesson pages and images those tiles link to. The file is a zip. `unzip -l` works on it. The manifest says what is inside and records a sha256 for every file.

This is how a Spotlight lesson moves from an authoring directory to staging and to warmersun.com. The game still plays quest JSON. The package is the envelope around that JSON and the lesson site that goes with it.

## Layout

A source directory and the zip use the same paths. `pack` writes `manifest.json`; you do not.

```text
quests/<quest-id>.json          one or more tiles; the file name is the id
lessons/<folder>/index.html     zero or more lesson folders, as served at /lessons/<folder>/
lessons/<folder>/NN-*.html
lessons/<folder>/illustrations/…
assets/…                        optional quest assets
```

Only `quests/`, `lessons/`, and `assets/` are allowed. Quest JSON sits directly in `quests/`, not in a subdirectory. Lesson folder names are lowercase slugs and do not have to match the quest id (`cells-already-know` can belong to `spotlight-synbio-harborlane-rehab-2026`).

Two shapes, one format:

- **Single quest.** One `kind: "quest"` tile, and optionally one lesson folder. No `module` block.
- **Learning module.** One `kind: "module"` wrapper plus every lesson quest it lists, in order. Lesson pages can be one folder per quest, or one shared folder with many pages. `manifest.module` is derived from the wrapper.

The package id is the wrapper id when there is one, otherwise the quest id. The default output name is `<id>.ffquest`.

## Manifest

Schema `future-forge.quest-package/v1`.

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

`unpack` joins a root onto those paths. Omit the roots and the extracted tree stays in package form, which is what you edit and re-pack.

```bash
python3 scripts/quest-package.py unpack out.ffquest path/to/destdir \
  --lesson-root https://warmersun.com/staging/<token>/lessons/ \
  --asset-root https://warmersun.com/staging/<token>/quests/package/assets/
```

| Use | lesson root | asset root |
|-----|-------------|------------|
| Stage | `https://warmersun.com/staging/<token>/lessons/` | `https://warmersun.com/staging/<token>/quests/package/assets/` |
| Deploy | `https://warmersun.com/lessons/` | `https://warmersun.com/future-forge/quests/assets/` |
| Lesson pages on disk | `file:///absolute/dir/lessons/` | `file:///absolute/dir/assets/` |
| Game on localhost | `http://127.0.0.1:<port>/content/lessons/` | `http://127.0.0.1:<port>/content/assets/` |

Deploy's asset root is the prefix `publish-quests.py` already rewrites to `https://warmersun.com/quests/<source>/assets/`.

A page served from `http://localhost` cannot fetch `file://` images. Open the lesson HTML itself from disk for that, or point the game at the unpacked directory:

```bash
FF_CONTENT_DIR=path/to/unpacked FF_PORT=8765 npm start
```

The package is then at `http://127.0.0.1:8765/content/`. The tutor follows `https://` links, `http://127.0.0.1` and `http://localhost` links, and a `file://` link only when the game page itself is `file:`.

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

`--allow-external-lessons` turns a missing lesson id into a warning, for a package that extends lessons already on the live catalog. `pack` and `verify` both take the flag. Deploy still requires each external id to already be in `future-forge/quests/catalog.json`.

`unpack` verifies first, then extracts. It refuses a non-empty destination. `--lesson-root` and `--asset-root` are joined onto package paths in `*.json` and `*.html`. A root without a trailing slash gets one. The manifest itself is not rewritten.

## Stage and deploy

Those scripts live in the warmersun repo, because that is where the site tree and the here.now credentials are. They call this CLI; they do not reimplement the zip.

```bash
# from ~/dev/warmersun
./scripts/stage-package.sh path/to/out.ffquest
./scripts/deploy-package.sh path/to/out.ffquest
```

`FF_REPO` (default `~/dev/learning-game`) points at this repo. See `~/dev/warmersun/scripts/README.md`.
