# Capability trends — remote catalog

Official capability-trend tiles download from Warmer Sun:

`https://warmersun.com/future-forge/trends/catalog.json`

Source of truth: `~/dev/warmersun/future-forge/trends/` (publish with the marketing site).

Schema: [`docs/capability-trend-schema.md`](capability-trend-schema.md).

## Server

- `GET /api/trends` — validated trends from the remote catalog
- `GET /api/trends?refresh=1` — skip process cache + cache-bust CDN URLs

In-memory TTL ~10 minutes (same pattern as Quests). Game `.env` / `.env.local` (and portal `.env.portal`) are loaded before this URL is resolved.

| Env | Effect |
|-----|--------|
| `FF_TRENDS_REMOTE_URL` unset | Local `~/dev/warmersun/.../trends/catalog.json` if present, else bundled `test/fixtures/trends/catalog.json`, else warmersun.com |
| `FF_TRENDS_REMOTE_URL=off` | Disable remote (empty trends) |
| `FF_TRENDS_REMOTE_URL=/path/to/catalog.json` | Local path (dev/offline) |
| `FF_TRENDS_REMOTE_URL=https://…/catalog.json` | Explicit remote catalog |

Quests may also embed `trends[]` / `spotlightTrends` — see quest tile schema.
