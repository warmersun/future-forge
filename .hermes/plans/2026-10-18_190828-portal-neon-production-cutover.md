# Portal → Neon Production Cutover Implementation Plan

> **Executed 2026-10-19.** Tasks 1–7 are complete. The Neon Function is the production portal backend; `https://warmersun.com/portal/` is mounted to it; the Render portal service and its `cloud.warmersun.com` custom domain are removed; the hosted game `FF_PORTAL_URL` points at the Function; local sign-in was confirmed by the user. Remaining manual step: point the Clerk webhook destination at `<Function origin>/api/webhooks/clerk` (dashboard-only). The steps below are the original plan, kept for the record.

> **For Hermes:** Use the subagent-driven-development skill for implementation and review, but do not commit or publish until the user authorizes execution of this plan.

**Goal:** Make the already-mounted `https://warmersun.com/portal/` SPA use the production Neon Function and let the user exercise it from a local Future Forge game, then move the hosted game's Cloud API and Clerk webhook to that Function without changing DNS or removing Render.

**Architecture:** The here.now Site `autumn-linden-y6rk` continues serving the SPA under `/portal/`. Its **two same-origin proxy routes** (`/api/health` and `/api/device/complete`) change upstream from Render to the new Function on `proud-hill-53375382/main`. The game uses `FF_PORTAL_URL` as an **API origin**, while the Function uses `FF_PORTAL_UI_URL=https://warmersun.com/portal/` for browser sign-in and subscribe links. Keep Render deployed as a rollback path. No DNS work, custom Function domain, additional staging Site, or shared API key in the public proxy is needed.

**Tech stack:** Node/Neon Functions, PostgreSQL and private Neon buckets, Clerk, here.now Site proxies, npm tests.

## Current state and important distinction

- `https://warmersun.com/portal/` is already mounted to the here.now SPA. Its published `/portal/api/health` returns JSON 200, but the checked-in `portal/here-now/proxy.json` still sends it and device completion to `https://cloud.warmersun.com` (Render). The separate `ground-aura-dtd8.here.now` Site is not the production mount; no further staging publication is proposed.
- The integrated API was exercised on `proud-hill-53375382/portal-api-staging`, not deployed to target `main`. A read-only check of `main` showed **no Functions** and neither `device_handshakes` nor `clerk_webhook_events`. The target `main` database is an earlier source snapshot, not replication. Its quest bucket has the complete 31-ID catalog (27 source-bucket entries plus four formerly local-only quests); reconcile subsequent source changes before use.
- `neon.staging.ts` has Clerk keys only for staging; `neon.ts` also declares an unrelated smoke Function. Do not deploy either policy wholesale to production `main` without a production-only policy.
- `portal/app.js:65-71,85-93` calls **only** same-origin `${base}/api/health` and `${base}/api/device/complete`. The proxy manifest already supplies the upstream addresses; **here.now service variables are not required to tell it where Neon is**. Variables are only needed for a server-held value injected into a proxy request, and neither of these routes should carry a shared secret. Never put the Clerk secret or `FF_API_SECRET` in a publicly callable proxy.
- In contrast, `js/auth.js:341-384` and `js/server/quest-portal-client.mjs:17-20,94-118` construct `/api/*` calls from the game's `FF_PORTAL_URL`. Setting it to `https://warmersun.com/portal/` would send routes such as `/portal/api/me` and `/portal/api/quests` to a static Site that proxies only two routes. Set it to the **Neon Function's origin** for a local trial; the Function returns the `/portal/signin` URL through `FF_PORTAL_UI_URL`.
- The local `.env`/`.env.portal` files and Render/Clerk credentials must not be printed, committed, or copied into the plan. A successful 200 health check or offline test is not proof of billing or authenticated parity.

## Execution sequence (after approval)

### Task 1 — Establish a read-only cutover baseline

**Files:** Inspect `docs/portal-neon-functions-migration.md`, `portal/functions/*.mjs`, `js/server/db/staging/{019_device_handshakes,020_clerk_webhook_events}.sql`, `portal/here-now/proxy.json`, `.env.example`, and `render.yaml`; record results in the migration document only when execution begins.

1. Recheck `git status`; retain the current uncommitted work. Inventory Render portal/game environment **names and nonsecret numeric settings**, Clerk webhook destination, target `main` Function list, target schema, and actual here.now mount/proxy. Do not echo values.
2. Compare live source and target table counts/fingerprints, schema/constraints/sequences, and latest bucket object inventories. Exclude the intentional four additional main-bucket quest files from a simplistic source-bucket equality test; compare the live union of quest IDs with the target catalog. If the database has diverged, devise and verify a guarded delta or short write-freeze/final restore before exposing the target; do not assume the older snapshot is current.
3. Record the current Render-backed proxy manifest, old webhook URL and game `FF_PORTAL_URL` securely for rollback. Do **not** change any traffic at this step.

**Gate:** No unaccounted source writes, missing records, quest IDs, or schema differences. Stop rather than switch if reconciliation is uncertain.

### Task 2 — Fix the game/API-versus-UI URL contract before local testing

**Files:** `js/server/cloud-quota-client.mjs`, `js/server/cloud-quota-client.test.js`, `js/game.js` (only if its hard-coded subscribe fallback remains reachable), `js/cloud/portal-origin.js`/`.test.js` only if an actual navigation test exposes a defect, `.env.example`, and optionally the migration document.

1. Write a failing test showing that a quota denial/fallback with `FF_PORTAL_URL=<Function origin>` links to `https://warmersun.com/portal/subscribe`, **not** `<Function origin>/subscribe`. Keep `FF_PORTAL_URL` unchanged as the API origin; use a separate, explicit `FF_PORTAL_UI_URL` or a trusted `subscribeUrl` from the API for browser navigation. Do not accept a user-supplied redirect target blindly.
2. Make the smallest change to pass that test and cover the no-configuration fallback in the game. Preserve the existing device-code return URL validation; the portal has no fixed playable-app URL. A local game at `127.0.0.1:8765` is supported; any additional self-hosted browser origin must pass the intended origin/return validation rather than be guessed by the portal.
3. Update `.env.example` and operator instructions to say explicitly: local **game** `FF_PORTAL_URL=<production Neon Function origin>`; local game `FF_PORTAL_UI_URL=https://warmersun.com/portal/` if the fallback uses it; Function `FF_PORTAL_UI_URL=https://warmersun.com/portal/`. Do not replace a user's ignored `.env` without checking its existing keys. Run `node --test js/server/cloud-quota-client.test.js js/cloud/portal-origin.test.js` and relevant SPA tests.

**Gate:** Every generated sign-in/subscribe link reaches `/portal/`, while all game `/api/*` calls reach Neon directly.

### Task 3 — Prepare the target `main` schema and reconcile data

**Files:** `js/server/db/staging/019_device_handshakes.sql`, `js/server/db/staging/020_clerk_webhook_events.sql`; no source SQL changes unless a real schema mismatch is found.

1. Apply those **existing, reviewed** migrations to `proud-hill-53375382/main` with an explicit project and branch. Read back both exact tables and the handshake expiry index; confirm the webhook table starts with the expected records and no source DB was changed.
2. Reconcile source data into main as indicated by Task 1 (including sequence positions), then repeat fingerprints, constraints and representative read-only API queries. Preserve the target-only quest additions. Do not start dual-writing, copy private data into the repo, or expose connection strings.

**Gate:** `main` is current and schema-complete before the production Function accepts user writes.

### Task 4 — Deploy a production-only Neon Function on `main`

**Files:** Create `neon.portal.ts` (a production-only policy; exact name can be chosen on execution), keep `portal/functions/cloud-api-entry.mjs` and imported route modules, update `portal/functions/cloud-api.test.js` for any discovered contract mismatch. Do not use the smoke Function from `neon.ts`.

1. Declare only `cloudapi` and existing private `assets`/`quests` buckets, with `externalPackages: ["sharp"]`. Explicitly provide `FF_QUESTS_BUCKET=quests`, `FF_PORTAL_UI_URL=https://warmersun.com/portal/`, Clerk publishable/secret keys, existing game-session signing configuration, webhook signing secret, server-to-server `FF_API_SECRET`, and the production quota/plan settings. Provision secrets securely from the existing authorized source or coordinate a matched rotation on game and Function; fail closed if a required value is unavailable. **Never** put the west-region `DATABASE_URL` in the Function env: use Neon's injected `main` branch DB URL.
2. `neon config plan --config neon.portal.ts --project-id proud-hill-53375382 --branch main` must show only intended changes. Deploy with `--no-env-pull`; when loading an ignored local env file, launch the CLI through Node `--env-file` if necessary and never use command-line `KEY=VALUE` secret flags. Read back Function slug, active deployment, **env names only**, and effective health/auth behavior.
3. Capture the stable `main` Function invocation **origin** for the game, proxy and share-card links. Configure `FF_PUBLIC_ORIGIN` to that API origin (not `/portal/`, because the Site does not proxy `/card/*`) and redeploy if necessary. Probe actual integrated routes: health 200/Clerk enabled/DB enabled, unsigned `/api/me` 200, forged token 401, quest catalog 31 IDs, public board and card read, unknown API JSON 404, CORS and preflight. Verify the private quest gate with a legitimate signed test account before asserting paid access. Never print JWTs or keys.

**Gate:** Function is live on **main** with the target database/bucket and no accidental Render DB, missing native module, or silent partial `/api/me` response.

### Task 5 — Prepare the local game for a trial

**Files:** User's ignored local game `.env` (edit only the intended keys after inspecting names), `.env.example` documentation; no Render service changes.

1. Set local game `FF_PORTAL_URL` to the verified `main` Function origin; keep the UI at `https://warmersun.com/portal/`. If testing hosted AI quota, provision the same `FF_API_SECRET` locally and on the Function without printing it; otherwise leave cloud AI off for the first sign-in trial. Start the local game and verify `/api/health` reports the intended `portal.origin`.
2. Probe `/api/device/start` against the Function from the local game; its `signInUrl` must target `https://warmersun.com/portal/signin?device=…`. Do not attempt to complete the browser flow until Task 6 switches and verifies the mounted Site's proxy.

**Gate:** The local game targets Neon for API calls, not the static `/portal/` path. This is preparation, not a completed sign-in trial.

### Task 6 — Repoint the existing mounted Site's two proxies (no service variables, no DNS)

**Files:** Modify `portal/here-now/proxy.json`; publish only the SPA shells/assets and `.herenow/proxy.json` to existing Site `autumn-linden-y6rk` using the here.now authenticated publisher. Do not publish the `portal/` server/tests or republish the entire warmersun.com root.

1. Change the two `upstream` fields for `/api/health` (GET) and `/api/device/complete` (POST) to the verified **main** Function URL. Keep methods, paths, and Authorization pass-through intact. Do not add `FF_API_SECRET` as a here.now service variable: these are public/signed-user routes, not shared-key routes. Proxy upstream selection is in the manifest, not a secret variable.
2. Publish with `.herenow/proxy.json` included on **every** version; retain the current exact manifest for a one-step rollback. Read back the Site version/proxy target from the here.now management API where available, then check `https://warmersun.com/portal/`, `/signin`, `/subscribe`, `/app.js`, `/api/health` (JSON) and unknown-path 404. Do not infer upstream from a generic health 200 alone; the local game device callback must prove its completion and poll hit the same target DB.
3. Now run the local game sign-in: the mounted portal must submit completion to the **same Function** through its proxy, and the game must redeem the device code once and see its scoped `/api/me` data. Do not invent credentials; the user performs the Clerk sign-in if browser-profile access is unavailable. Test subscribed and unsubscribed quest gates, quota reserve/settle without a charge if suitable, cards and profile read/write using a designated test account. Treat a real billing checkout as a separately signalled user action; do not purchase automatically.
4. Once the user has confirmed the local trial, keep that Site version and proceed. If sign-in fails, republish the original two Render upstreams and verify the mounted paths; do not change DNS or dismantle Render.

**Gate:** The production mounted portal calls `main` Neon for its two API needs, and the local game round-trip proves it.

### Task 7 — Move billing/webhook and the hosted game only after the user's trial confirmation

**Files:** `neon.portal.ts`, `render.yaml` operator settings/docs, `docs/portal-neon-functions-migration.md`; actual configuration lives in Clerk and the existing hosted game service.

1. Verify a real signed Clerk webhook against the Function using an authorized test event and replay/out-of-order checks; `020` must make delivery idempotent. Then change the **single** Clerk webhook destination from Render to `<main Function origin>/api/webhooks/clerk`, verify Clerk's delivery and exact target DB state, and do not leave both destinations active. Keep Render running, but no longer authoritative for these writes.
2. Change only the hosted game's `FF_PORTAL_URL` to the Function origin and ensure its `FF_API_SECRET` matches the Function. Do **not** change the game's public URL, the portal mount, Render DNS, or delete the Render services. Verify health reports the new portal origin, sign-in, quota reserve/settle, quest gates and error subscription link in a hosted session.
3. Recheck source/target DB and bucket deltas after the switch, inspect Function errors, and record the final rollback boundary. If new writes reached Neon, rolling back to Render requires a deliberate reverse reconciliation; blindly changing two URLs back would lose those writes.

**Gate:** One API authority and one Clerk webhook destination, with Render retained solely as a reversible standby. Removal of Render is explicitly outside this plan.

## Validation and stop conditions

- Before any switch: `node --test portal/functions/*.test.js`, `node --test portal/app.test.js`, focused game tests, `npm run test`, and `git diff --check`; tests must not load production DB credentials (the collector-card isolation fix must remain in place).
- After each external write (migration, Function deploy, Site publish, webhook edit, hosted-game config): read back that **exact** schema/service/URL/event state. Do not print secrets, production rows or raw authorization headers.
- Stop if source and target data cannot be reconciled, a required secret is missing, the Function only works on staging, the site proxy still points at Render, Clerk cannot return to the mounted portal, webhook signatures cannot be verified, or authenticated quota/quest/card contracts disagree. Do not call offline mocks or a health 200 a production cutover.
- User acceptance: local Future Forge points to the Function API and signs in through `https://warmersun.com/portal/`; the mounted SPA's proxied calls reach Neon; after explicit trial confirmation, the hosted game and Clerk webhook also use Neon. Render remains deployed for rollback and **no DNS change is made**.

## Decisions to confirm during execution, not assumptions

- Whether the user wants only the **local trial** now, or also the post-confirm hosted-game/webhook switch in the same run. This plan sequences both but puts the latter after their manual confirmation.
- Which existing authorized source supplies the live `FF_API_SECRET` and Clerk webhook signing secret; if inaccessible, arrange a synchronized rotation rather than inventing or exposing values.
- Whether a paid checkout test can use Clerk test mode; never initiate a real charge automatically.
