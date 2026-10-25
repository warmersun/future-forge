# Capability trends — remote catalog

Official capability-trend tiles download from Warmer Sun:

`https://warmersun.com/trends/catalog.json`

Source of truth: `~/dev/warmersun/future-forge/trends/` (rebuild and publish with `./scripts/publish-trends.sh`).

Schema: [`docs/capability-trend-schema.md`](capability-trend-schema.md).

> [!NOTE]
> Unlike official quests, capability trends **do not use object storage** (no S3/R2 bucket). They continue to be published and served statically from `warmersun.com/trends/`.

## Where `/api/trends` lives: Game Server vs. Portal

- **Game App (`server.mjs`)**: Implements `GET /api/trends` (and `/api/trends?refresh=1`). The in-game client (`js/game.js`) fetches this endpoint directly from the game server to render capability curves on the "Look Ahead" (Wait +2 years) screen.
- **Portal (Neon serverless functions)**: Does **not** serve trends. The portal API allowlist (`js/server/portal-api-paths.mjs`) is dedicated to player identity, subscriptions, gated quest packages, and leaderboards. Calling `/api/trends` on the portal returns `404`.

## Game Server

- `GET /api/trends` — validated trends from the remote catalog
- `GET /api/trends?refresh=1` — skip process cache + cache-bust CDN URLs

In-memory TTL ~10 minutes (same pattern as Quests). Game `.env` / `.env.local` are loaded before this URL is resolved.

| Env | Effect |
|-----|--------|
| `FF_TRENDS_REMOTE_URL` unset | Local `~/dev/warmersun/.../trends/catalog.json` if present, else bundled `test/fixtures/trends/catalog.json`, else warmersun.com |
| `FF_TRENDS_REMOTE_URL=off` | Disable remote (empty trends) |
| `FF_TRENDS_REMOTE_URL=/path/to/catalog.json` | Local path (dev/offline) |
| `FF_TRENDS_REMOTE_URL=https://…/catalog.json` | Explicit remote catalog |

Quests may also embed `trends[]` / `spotlightTrends` — see quest tile schema.
