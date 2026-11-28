# Capability trends — remote catalog (`v2`)

Official capability and trend tiles (`future-forge.capability-trend/v2`) download from Warmer Sun:

- Catalog index: `https://warmersun.com/trends/catalog.json` (`future-forge.capability-trend-catalog/v2`)
- Single-request bundle: `https://warmersun.com/trends/bundle.json` (`future-forge.capability-trend-bundle/v2`)

Source of truth: `~/dev/warmersun/future-forge/trends/*.json` (rebuild `catalog.json` + `bundle.json` and publish with `./scripts/publish-trends.sh`).

Schema: [`docs/capability-trend-schema.md`](capability-trend-schema.md).

> [!NOTE]
> Unlike official quests, capability tiles **do not use object storage** (no S3/R2 bucket). They continue to be served statically from `warmersun.com/trends/`.

## Where `/api/trends` lives: Game Server vs. Portal

- **Game App (`server.mjs`)**: Implements `GET /api/trends` (and `/api/trends?refresh=1`). The in-game client fetches this endpoint directly for Lane 1 Capabilities/Milestones/Use Cases on the 4-Lane Board, the inline Invent Capability outlook, and the Look Ahead (`+2 years`) log charts.
- **Portal (Neon serverless functions)**: Does **not** serve trends. Calling `/api/trends` on the portal returns `404`.

## Game Server (`js/trends-remote.mjs`)

- `GET /api/trends` — validated `v2` capability tiles from `bundle.json` (1 request) with bounded-concurrency parallel per-file fallback
- `GET /api/trends?refresh=1` — skip process cache + cache-bust CDN URLs

In-memory TTL ~10 minutes (same pattern as Quests). Game `.env` / `.env.local` are loaded before this URL is resolved.

| Env | Effect |
|-----|--------|
| `FF_TRENDS_REMOTE_URL` unset | Local `~/dev/warmersun/.../trends/catalog.json` if present, else bundled `test/fixtures/trends/catalog.json`, else warmersun.com |
| `FF_TRENDS_REMOTE_URL=off` | Disable remote (empty capabilities/trends) |
| `FF_TRENDS_REMOTE_URL=/path/to/catalog.json` | Local path (dev/offline) |
| `FF_TRENDS_REMOTE_URL=https://…/catalog.json` | Explicit remote catalog |

Quests may also embed `trends[]` / `spotlightTrends` — see quest tile schema.
