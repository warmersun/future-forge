# Cloud portal → SPA and Neon Functions

**Status: cut over (2026-10-19).** The Neon Function is the production portal backend on `proud-hill-53375382/main`. The static SPA is mounted at `https://warmersun.com/portal/`. The Render portal service and its `cloud.warmersun.com` custom domain have been **removed**. The playable Future Forge game remains a separate app and service. The former `aws-us-west-2` Neon database is no longer authoritative; Neon Functions are not available in that region.

## Deployed review fixes

The reviewed fixes are deployed to production: `cloudapi` deployment **10** is active on `proud-hill-53375382/main`, and here.now Site `autumn-linden-y6rk` serves version **`01M5AWYEJMMTQP3QGVKXCPKA2G`** under `https://warmersun.com/portal/`. The entry script is `app.js?v=20261019-review-fixes`.

- Collector cards use the configured portal UI for sign-in and return to the canonical card URL. Return-only sign-in works independently of device handshakes. Account lookup failures display unavailable subscription state, not an inactive plan.
- Player progress commits before best-effort achievements. Sponsored, toolkit, founding/event and streak awards are restored, with private/remote catalog source parity. Profile reads restore the sanitized owner login summary.
- Quota reservation and webhook reconciliation use consistent lock ordering. Account subscription refreshes take the same payer lock before fetching Clerk state. Remote-only score writes load the catalog's start year.
- `FF_PORTAL_SESSION_SECRET` is preserved when supplied at deployment. The current production deployment has no dedicated session key and keeps its existing Clerk-secret fallback.
- Accounts and hosted catalog selection are separate: the game now requires `FF_PORTAL_QUESTS=1` to proxy quests through the portal. This change is in the local game source, Blueprint and setup docs; the hosted game was not redeployed or reconfigured during this portal update. Dashboard-managed hosted games must add the flag before their next game deployment.

Verification: the complete offline suite passed **1,570 tests**, with no failures and the two optional local-Postgres tests skipped. Independent specification and quality reviews passed. **19 live checks** passed against the deployed API and mounted SPA, including malformed-token rejection, origin/preflight checks, the unchanged 31-entry quest catalog, gated quest detail, card sign-in configuration, native share-image rendering, exact HTML routes, unknown-route 404s, and a short-lived unbound device handshake. All six published file hashes, including `.herenow/proxy.json`, and the mounted `app.js` bytes were read back and matched. No schema/data migration, DNS, webhook, hosted-game configuration, or billing change was made. Real Clerk sign-in and checkout remain manual verification steps.

The previous Site version, **`01M59HMGV4YNHPE762AT4YQCYZ`**, was backed up and hash-verified before publication. The older staging and migration notes below are historical, not the current deployment checklist.

## Boundaries

- A static frontend host serves one portal SPA at `/`, `/signin` and `/subscribe`. It does not serve `/api/*` or dynamic `/card/*` as SPA fallbacks. Neon Functions do not host the frontend.
- The Function owns Cloud APIs and dynamic collector-card pages. The game retains its own local gameplay, AI and Friends logic. Keep Clerk as the identity provider and existing private bucket/catalog behavior until their replacements have been tested.
- The Function URL is public. Browser calls carry a verified Clerk/session JWT; server-to-server quota calls use the existing shared secret. The smoke-test API key must never be embedded in the SPA. Public read endpoints are explicitly listed, not permitted by default.
- Portal review updates change only the Function code and static Site version. DNS, Clerk webhook destination and the hosted game's configuration remain unchanged.

## Historical: static portal staging site

The portal SPA is published as its own authenticated here.now Site at `https://autumn-linden-y6rk.here.now/` and mounted at `https://warmersun.com/portal/`. This is an **additional** frontend; `cloud.warmersun.com`, the game and production routing are unchanged. The existing account's here.now plan permits only one custom domain, so `portal.warmersun.com` was not connected. The user chose the `/portal/` mount instead.

Publish only `portal/index.html`, `portal/app.js`, `portal/app.css`, three HTML shells (`index.html`, `signin`, `subscribe`) and `portal/here-now/proxy.json` as `.herenow/proxy.json`. Use here.now Site `autumn-linden-y6rk`; do not publish the whole `portal/` directory (it contains server code and tests). No generic SPA fallback is enabled: direct `/portal/signin` and `/portal/subscribe` work while unknown paths return 404. Assets and navigation use relative links, and `app.js` derives the `/portal` base from its own module URL.

The two site-local proxies, `/api/health` and `/api/device/complete`, point to the **existing Render API** at `cloud.warmersun.com`, not to the partial Neon Function. They let the staged UI use same-origin fetches without embedding secrets. Do not remove `.herenow/proxy.json` during a republish; proxy routes disappear between versions if it is omitted. Live checks confirmed both HTML routes/assets, the health JSON, 401 for an unauthenticated device-complete request, and 404 for unknown routes. A real Clerk login and billing checkout have **not** been exercised on this mounted host; do not redirect game traffic or replace the production portal yet.

The portal has no fixed link or checkout redirect to the playable app. Hosted and self-hosted installations may have different addresses; sign-in starts in the app and only an allowlisted return URL supplied by that flow can take the player back.

## Historical: data preparation status before cutover

The west-region production database was snapshotted into both `proud-hill-53375382/migration-rehearsal` and `proud-hill-53375382/main` in the new east-region project. Source and target table counts and constraints were compared after restore. The isolated rehearsal branch also has the new `clerk_webhook_events` table, which is **not** yet installed on target `main`. The source's private `assets` and `quests` buckets in `soft-hat-66349820/main` were copied into private buckets on target `main`: 1 asset and 28 quest objects. Every copied object was downloaded from the target and checked byte-for-byte; a separate listing confirmed matching counts, sizes and ETags. These are snapshots, not replication. Check for source writes and copy deltas again before any cutover. No live traffic, webhook destination, or game configuration has been changed.

Public, player, and billing route modules have offline tests but are not integrated into or deployed with `cloudapi`. Review found that the new public and billing modules reject game-session tokens that the existing game uses, staged frontend CORS and URL routing are incomplete, webhook updates can be reordered, and full `/api/me` and player-write parity remain open. Do not switch traffic until these are corrected and tested end-to-end. A healthy Function or static site does not establish migration readiness.

## Reachable portal contract to preserve

| Surface | Methods and paths | Critical behavior |
| --- | --- | --- |
| Health/account | GET `/api/health`, `/api/me` | Public Clerk publishable config; signed and unsigned account states, bad-token rejection, subscription/quota status |
| Device login | POST `/api/device/start`, `/api/device/complete`; GET `/api/device/status` | Game-origin CORS, short-lived one-time code, verified Clerk token, signed game session; use a durable database store instead of a process-local Map |
| Player | GET `/api/me/runs`, `/achievements`, `/cards`, `/pins`, `/run-state`, `/profile`; PUT `/api/me/pins`, `/run-state`, `/profile`; POST `/api/me/import`, `/runs/start`, `/runs`, `/runs/share`, `/cards/:id/collect`, `/quests/:id/score`; PUT `/api/me/quests/:id/still` | Per-user authorization, response shapes, raw-image size limits and leaderboard semantics |
| Quota/billing | POST `/api/me/ai/reserve`, `/api/internal/ai/reserve`, `/api/me/ai/settle`, `/api/webhooks/clerk` | Fail-closed internal secret, atomic reserve/settle, webhook signature on raw bytes, idempotency and subscription updates |
| Reports | POST `/api/report` | Maintain the existing validation, bounded payload and response contract |
| Public | GET `/api/u/:username`, `/api/board[/:questId]`, `/api/board/:questId/still/:userId`, `/api/quests[/:id]`; GET/HEAD `/card/:id` and image/preview | Gated quest content, collector-card HTML/image bytes, cache/HEAD behavior |

Only routes reachable through `js/server/portal-api-paths.mjs` should be ported. AI, TTS, rooms, predictions/trends and usage handlers in `portal/server.mjs` are not a reachable Cloud API today; do not activate them accidentally. `/api/report` **is reachable** and must be preserved. Keep unknown `/api/*` paths JSON 404, not an HTML SPA response.

## Build and verification gates

1. **Contract and isolated Functions.** Add Request/Response handlers with explicit method/path routing, bounded raw bodies, exact auth and origin rules. Unit-test denial cases, payload sizes, signed/unsigned identity, public catalog masking, binary responses, and failure states. Deploy only to an east-region development branch. Migrations run as a separate operator step, never on isolate startup. Check a deployed Function by its exact URL and compare route responses with the current portal using synthetic fixtures.
2. **Portal SPA.** Move the current Clerk callback and Billing UI into one static application shell. Direct navigation/refresh and Back/Forward must work at both paths. Preserve the device-code callback, the return-URL allowlist and Clerk checkout behavior. Host static assets separately; do not point live DNS at the development Function.
3. **Prepare the production target.** Provision a separate east-region Neon project with scoped credentials. Create the same SQL schema and services; copy required private bucket objects and verify catalog keys. Keep production Postgres and bucket reads unchanged. Record schema versions, table counts and representative records from the source **without printing credentials or private content**.
4. **Data rehearsal.** Prefer an isolated rehearsed `pg_dump -Fc` from the source's direct URL and `pg_restore -O` into the target's direct URL for a planned write-freeze cutover. Validate extensions, migrations, row counts, foreign keys, sequences, per-user isolation, paid/unsigned quest gates, and billing/quota accounting. Do not run restore into the development object's main branch. Logical replication is an alternative only if downtime requirements justify its irreversible source setting change, compute restart, ongoing cost and DDL/sequence coordination.
5. **Staging end-to-end.** Exercise real Clerk sign-in, device callback, account UI, subscription test mode, quest gates, quota reserve/settle, webhook signature and replay, collector cards, and game→Function calls in a nonproduction domain. Verify authentication before database work; test concurrent code redemption and quota calls across isolates. Reconcile bucket objects separately from database rows.
6. **Approval and cutover.** Obtain explicit approval before a production write freeze, DNS/webhook updates or game `FF_PORTAL_URL` change. Perform final copy or replication catch-up, validate counts/queries and sequences, then switch one ingress path at a time. Keep the west-region source intact for rollback; never dual-write production users or deliver Clerk webhooks to both backends.

References: [Neon Functions](https://neon.com/docs/compute/functions/overview), [deployment](https://neon.com/docs/compute/functions/deploy), [cross-region migration](https://neon.com/docs/import/migrate-neon-to-another-region), [Neon-to-Neon replication](https://neon.com/docs/guides/logical-replication-neon-to-neon).
