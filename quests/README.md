# Local Quest folder (Library)

Drop Future Forge **Quest tile** JSON files here for the in-app **Library** (side-loaded Quests).

Official **Sponsored** and **Learning** tiles are **not** served from this folder. They download from Warmer Sun:

`https://warmersun.com/future-forge/quests/catalog.json`

Source of truth for those tiles: `~/dev/warmersun/future-forge/quests/` (publish with the marketing site).

## How to use (Library / classroom side-load)

1. Author a tile with the skill or CLI (`skills/future-forge-quest/`, `npm run author:quest -- --tech <id> --local-only`).
2. Validate + craft lint: `npm run validate:quest -- path.json --strict` (shape errors fail; `WARN <code>` lines are craft rules — tech named in player text, legacy brief headings, word counts, pressure defaults, missing grounding, template placeholders; `--strict` fails on any).
3. Check difficulty: `npm run economy:quest -- path.json` (guide: [`docs/quest-economy-lab.md`](../docs/quest-economy-lab.md)). Target verdict **challenging** (too easy now counts as a failing verdict too).
4. Copy into this folder (or set `FF_QUESTS_DIR`).
5. Start the server: `npm start` — Library lists local tiles; Import still works in the hub.

## Official sponsored / learning

1. Put the validated JSON in the warmersun repo under `future-forge/quests/`.
2. Add `{ "id", "file" }` to `catalog.json`.
3. Publish warmersun.com.
4. Future Forge server fetches the catalog (override with `FF_QUESTS_REMOTE_URL`).
5. In the app, open a Sponsored / Learning / Library catalog and tap **↻ Refresh** beside Import Quest… to revalidate (skips the process cache and cache-busts CDN URLs). Without Refresh, the server keeps a ~10-minute in-memory snapshot.

| Env | Effect |
|-----|--------|
| `FF_QUESTS_REMOTE_URL` unset | Local `~/dev/warmersun/.../catalog.json` if present, else warmersun.com, else here.now CDN fallback |
| `FF_QUESTS_REMOTE_URL=off` | Disable remote (Sponsored/Learning empty) |
| `FF_QUESTS_REMOTE_URL=/path/to/catalog.json` | Local path (dev/offline) |
| `FF_QUESTS_REMOTE_URL=https://…/catalog.json` | Explicit remote catalog |
| `FF_QUESTS_DIR` | Override this local Library folder |

Capability trends (Wait charts) use a separate catalog — see [`docs/capability-trends-remote.md`](../docs/capability-trends-remote.md) (`FF_TRENDS_REMOTE_URL`).

**Dev note:** When the local warmersun checkout exists, unset `FF_QUESTS_REMOTE_URL` prefers that disk tree over the live site. To pull published warmersun.com tiles, set `FF_QUESTS_REMOTE_URL=https://warmersun.com/future-forge/quests/catalog.json`.

**CDN note:** Full warmersun.com republish can fail on large trees; an interim permanent catalog lives at `https://russet-waffle-sx4j.here.now/catalog.json` (same tiles). Prefer publishing `future-forge/quests/` onto warmersun.com when the full-site publish pipeline can handle it.

## Rules (local folder)

- Only `*.json` files in **this folder** (not subfolders).
- Must pass `npm run validate:quest -- path.json`; tiles kept here should also be `--strict` lint clean.
- Invalid files are skipped (logged in `/api/quests` as errors).
- **Crisis meters** use structured `mission.pressure` — see `docs/quest-tile-schema.md`. Optional `description` per role is recommended on new tiles; omitted is valid. Tune start / rise / wallet with the [Quest economy lab](../docs/quest-economy-lab.md).

## Sample library tiles

- `spotlight-gene-seq.json` — Spotlight gene sequencing; identical to the skill's `examples/spotlight-gene-seq.json` (the gold prose example)
- `spotlight-ai-edge-north-stack-2026.json` — AI edge spotlight (not sponsored)
- `spotlight-ai-hearthline-rsi-check-2026.json` — learning module, single lesson
- `preventing-mirror-life-tideglass.json` — learning module, single lesson

Sponsored learning **modules** (wrapper + lesson files) live in the warmersun catalog; see `skills/future-forge-quest/examples/spotlight-sponsored-module.json` for the wrapper shape.
