# Deploy Future Forge on Render

Two Web Services from this repo. **Portal** is the Cloud API (Clerk, Neon, subscribe). **Game** is the playable app and the only process that holds `FF_XAI_API_KEY`.

Players open the **game** URL. Sign-in is Clerk's Account Portal at `https://accounts.warmersun.com/sign-in`. Subscribe stays on the portal at `https://cloud.warmersun.com/subscribe`. `https://cloud.warmersun.com/signin` only finishes the local device-code handshake.

The live portal is `https://future-forge-0yil.onrender.com`. Do not apply `render.yaml` as a new Blueprint against that service. Blueprint names the portal `warmer-sun-portal` and can create a second portal. Update the existing portal by hand, then create only the game service.

Node must be 20.9 or newer. Set `NODE_VERSION=22` if Render’s default is older.

Use a paid instance for both services. A free instance sleeps, which drops sign-in, Friends rooms, and voice. Run **one** game instance. Rooms, voice sockets, and the TTS cache live in that process. Do not put `FF_XAI_API_KEY` on the portal. Do not put `DATABASE_URL` on the game. Both services share one `FF_API_SECRET`.

## 1. Push the branch Render builds

Render builds the branch the service tracks. Push the commit that contains the `warmer-sun-game` service in `render.yaml`, migration `js/server/db/016_quota_settle_guard.sql`, and the quota code.

## 2. Update the existing portal

Dashboard for the service that serves `future-forge-0yil.onrender.com`:

- Build: `npm install`
- Start: `npm run portal`
- Health check: `/api/health`

`FF_TRUST_PROXY=1`. Leave `FF_XAI_API_KEY` unset. Render sets `PORT`.

Quota keys can stay unset. Defaults are in `.env.portal.example`.

| Key | Value |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Clerk API key |
| `CLERK_SECRET_KEY` | Clerk secret |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret for `POST /api/webhooks/clerk` |
| `DATABASE_URL` | Neon **pooler** URL, `sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Neon **direct** URL. Migrations on boot use this. |
| `FF_API_SECRET` | A long random string. The game uses this exact value. |
| `FF_CLOUD_PLAN_SLUGS` | `cloud` |
| `FF_CLOUD_AI_BUDGET` | `5000` |
| `FF_QUOTA_TEXT_IN_PER_KTOK` | `2` |
| `FF_QUOTA_TEXT_OUT_PER_KTOK` | `6` |
| `FF_QUOTA_TEXT_MAX_OUT` | `8192` |
| `FF_QUOTA_TEXT_HOLD` | `20` |
| `FF_QUOTA_IMAGE` | `20` |
| `FF_QUOTA_TTS_PER_KCHAR` | `15` |
| `FF_QUOTA_VOICE_PER_MIN` | `160` |
| `FF_PUBLIC_ORIGIN` | `https://cloud.warmersun.com` |

Leave `CLERK_AUTHORIZED_PARTIES` empty unless you mean to replace the code defaults. If you set it, include `https://ff.warmersun.com`, `https://cloud.warmersun.com`, `https://warmersun.com`, `http://127.0.0.1:8765`, and `http://localhost:8765`.

After the game URL exists, set `FF_GAME_DEVICE_ORIGINS` to that origin with no path, for example `https://your-game.onrender.com`. Device sign-in CORS allows loopback plus this list only.

Redeploy the portal. Boot runs SQL migrations, including `016_quota_settle_guard.sql`, against `DATABASE_URL_UNPOOLED`. Read the logs for a migration error before continuing.

`GET https://future-forge-0yil.onrender.com/api/health` should report Clerk and the database as up.

## 3. Create the game service

New Web Service, same repo and branch.

- Name: `warmer-sun-game`
- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`

| Key | Value |
| --- | --- |
| `FF_TRUST_PROXY` | `1` |
| `FF_CLOUD_AI` | `1` |
| `FF_XAI_API_KEY` | The xAI key. This is the only service that gets it. |
| `FF_PORTAL_URL` | `https://future-forge-0yil.onrender.com` (no trailing slash) |
| `FF_API_SECRET` | The same secret as the portal |
| `FF_QUOTA_TEXT_MAX_OUT` | `8192`, same as the portal. The game applies the cap the portal returns. |
| `FF_JOIN_ORIGIN` | The public game origin, no path. Friends links use this. |
| `NODE_VERSION` | `22` |

Do not set `FF_PORT`. Render sets `PORT`.

Deploy and open the game’s `*.onrender.com` URL. That is the playable app. Put that origin into the portal’s `FF_GAME_DEVICE_ORIGINS` and into the game’s `FF_JOIN_ORIGIN`, then redeploy both if those were blank the first time.

## 4. Turn on Clerk Billing

In the Clerk dashboard for this instance:

1. Enable Billing and create a user plan whose slug is `cloud`. The code ignores Clerk’s automatic `free_user` plan.
2. On the existing webhook `https://future-forge-0yil.onrender.com/api/webhooks/clerk`, subscribe to `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.pastDue`, and the `subscriptionItem.*` events (`active`, `updated`, `canceled`, `ended`, `expired`, `pastDue`). Keep the user lifecycle events already on that endpoint.
3. Confirm the signing secret matches `CLERK_WEBHOOK_SECRET`.

Until that plan exists, hosted co-inventor calls return 402. Hex invent, quests, and boards still work.

## 5. Optional custom domain

Sign-in is already `https://cloud.warmersun.com` (CNAME to the portal). For the game, add a hostname such as `play.warmersun.com` on the **game** service, CNAME it there, then set:

- Game `FF_JOIN_ORIGIN=https://play.warmersun.com`
- Portal `FF_GAME_DEVICE_ORIGINS=https://play.warmersun.com`

`*.warmersun.com` is already allowed as a post-sign-in return URL. A bare `*.onrender.com` game URL is not, unless it is listed in `FF_GAME_DEVICE_ORIGINS`.

## 6. Check it

1. `GET` both `/api/health` URLs.
2. Open the game, sign in through `https://accounts.warmersun.com/sign-in`, and confirm the chip shows you signed in.
3. Open `https://cloud.warmersun.com/subscribe` and subscribe to `cloud`.
4. Use the co-inventor once. It should answer. A second browser with no session should get a subscribe message, not a local fallback.
5. In the portal logs, confirm the webhook stored the subscription. In Neon, `subscriptions` should have your user with plan `cloud`, and `ai_quota_reservations` should grow after the call.
