# Future Forge

**Invent local solutions with emerging technologies — race the crisis clock with an AI co-inventor.**

Future Forge is a solo learning game. You pick a global problem, land in a concrete place, invent with a stack of emerging tech, defend the idea under challenge, and deploy before the local crisis collapses.

**About & learning goals:** Future Forge is an [inventing practice](docs/what-is-future-forge.md) — origin (6Ps tabletop), design contradiction, Progress and Predictions, and what learners practice today.

![Future Forge workshop — invent with emerging tech, feasibility light, and AI co-inventor](docs/future-forge-workshop.jpg)

*Invent screen: tech tray, mission story, feasibility (red/yellow/green), dual story faces, future vision, and AI co-inventor.*

---

## How the game works

1. **Theme** — Choose a global problem (climate, infectious disease, energy access, …).
2. **Local scenarios** — Read a short problem brief while the game drafts several concrete places. Pick one mission (cached for next time; solved ones stay playable).
3. **Invent** — Build a tech stack from domains like Power, Automator, Mover, LifeForce, Link, and Portal. Name the invention and write two faces:
   - **How it works** — mechanism
   - **Everyday life** — impact on the ground  
   Use **Focus** + **Fill other side** so the AI drafts the face you are not writing. Both boxes stay editable.
4. **Feasibility** — A traffic light judges whether your *claims* fit this year and place. EmTech categories are always pickable; over-claiming is what goes red.
5. **Challenge** — Defend against a random challenger:
   - **Moloch** — system game mechanics (freeriding, races to the bottom)
   - **Ethicist** — hard tradeoffs with no clean good/bad answer
   - **Stakeholder** — officials & community (funding, permits, public support)
   - **Mother Nature** — physical and ecological limits
6. **Deploy** — Crisis meters drop if you succeed. **Wait** advances the calendar and raises crisis. Fail if any meter hits 5 or the collapse year arrives.

**Learn** (tech tray) opens primers for selected techs (newest first). **?** in the HUD explains the full loop. The **AI co-inventor** brainstorms stacks, names, Art of the possible, and challenge coaching — you lead; it proposes.

---

## Requirements

- **Node.js** 18+ (ES modules)
- Optional but recommended for full AI + vision:
  - **SuperGrok** session via Grok CLI (`grok login`), **or**
  - An **xAI API key** (`FF_XAI_API_KEY`)

Without either auth path, the game still runs: static UI + a **local** co-inventor fallback (weaker, no live Grok).

---

## Install and run locally

```bash
git clone https://github.com/warmersun/future-forge.git
cd future-forge
npm install
npm start
```

Open **http://127.0.0.1:8765**

### Language

The title screen has an **EN | HU** switcher. Choice is stored in `localStorage` (`future-forge:locale`). You can also force a locale with `?lang=hu` or `?lang=en`.

Hungarian UI packs live under `locales/hu/`. Glossary for terms: `docs/i18n-glossary-hu.md`. Full content + AI localization is in progress (see plan: foundation → UI chrome → catalog → seeds → AI).

| Command | Purpose |
|--------|---------|
| `npm start` / `npm run serve` | Start the game server (`server.mjs`) |
| `npm start -- --usage` | Start with AI/session usage metrics writing to `data/usage/` |
| `npm run check:briefs` | Verify problem-brief coverage for all themes |
| `npm run validate:quest -- path.json` | Validate a Spotlight Quest tile JSON |
| `npm run author:quest -- --tech gene-sequencing --local-only` | Scaffold a spotlight Quest tile |

### Spotlight / External Quest tiles

AI agents (any harness) can research a recent emTech advance and author a portable **Quest tile** JSON. See `docs/quest-tile-schema.md` and the MIT skill package `skills/future-forge-quest/`.

**Server folder (recommended for classrooms / multiplayer):**

1. Put validated `.json` tiles in the **`quests/`** directory (next to `server.mjs`).
2. `npm start` — the server scans that folder and logs how many tiles loaded.
3. Players see **External Quests** on the home screen and **first** when choosing a theme/Quest (including friends multiplayer). Cards use a gold “External” badge.
4. Override path: `FF_QUESTS_DIR=/path/to/folder npm start`. API: `GET /api/quests`.

**Browser import (per device):** title screen → **Import Quest…** (or drop a `.json`). Replaces Daily on that device by default. Example: `test/fixtures/quests/spotlight-gene-seq.json` (also copied under `quests/`).

Default port: **8765** (override with `FF_PORT`).

### Optional environment

Copy `.env.example` to `.env` if you want overrides:

```bash
# .env
FF_PORT=8765
FF_XAI_MODEL=grok-4.5
# FF_XAI_API_KEY=xai-...   # see auth below
# FF_TTS_VOICE=eve         # optional default for Read out loud
```

---

## AI dependency: SuperGrok OAuth or xAI API key

The Node server serves static files and exposes:

- `POST /api/co-invent` — scenarios, co-inventor, feasibility assist, challenges  
- `POST /api/vision` — Imagine-based future vision images  
- `POST /api/tts` — cloud text-to-speech for **Read out loud** on long narrative text (xAI TTS; **server caches** audio by text+voice under `data/tts-cache/` so all users share one file; browser falls back to device voice if AI is offline on a cache miss)  
- `GET /api/health` — public co-inventor status (LAN IPs / models / room stats only on loopback or with admin token)  
- `GET /api/usage` — AI token / image / TTS / session rollups (**loopback or `FF_ADMIN_TOKEN` only**)

Auth is resolved **on the server** (tokens never go to the browser).

### Server hardening (static, rates, admin)

The process only serves **allowlisted public assets** (`index.html`, `css/`, client `js/`, `assets/`). It will not serve `.env`, `server.mjs`, `data/`, or other repo files over HTTP.

| Env | Purpose |
|-----|---------|
| `FF_TRUST_PROXY=1` | Use `X-Forwarded-For` for rate-limit keys (**only** behind a reverse proxy you control; off by default) |
| `FF_API_SECRET` | If set, expensive POST routes require `Authorization: Bearer …` or `X-FF-Secret` (loopback exempt) |
| `FF_ADMIN_TOKEN` | Non-loopback access to `/api/usage` and detailed `/api/health` |
| `FF_MAX_ROOMS` | Cap concurrent friends rooms (default 200) |
| `FF_WS_MAX_PAYLOAD` | Max WebSocket message bytes (default 256KiB) |
| `FF_RATE_*` | Optional overrides for solo AI / WS action rate limits (see `.env.example`) |

Solo AI routes (`/api/co-invent`, `/api/vision`, `/api/market-image`, `/api/tts`) share per-IP rate limits. Friends rooms also enforce action and AI flood limits on the WebSocket.

### Usage metrics (hosting cost estimates)

**Off by default.** Enable when you want token / image / TTS / session logs for cost estimates:

```bash
npm start -- --usage
# or
node server.mjs --usage
# or (deploy-friendly)
FF_USAGE_ENABLED=1 npm start
```

Force off even if env is set: `node server.mjs --no-usage`.

When enabled, the server writes under **`data/usage/`** (gitignored):

| File | Contents |
|------|----------|
| `events-YYYY-MM-DD.jsonl` | Append-only events (text tokens, image gens, TTS, sessions, rooms) |
| `summary.json` | Lifetime + UTC-day rollups, active sessions/rooms, optional `$` estimate |

Inspect live rollups:

```bash
# loopback only by default; from elsewhere pass admin token:
curl -s http://127.0.0.1:8765/api/usage | jq .
# curl -s -H "Authorization: Bearer $FF_ADMIN_TOKEN" https://your-host/api/usage | jq .
```

| Flag / env | Purpose |
|------------|---------|
| `--usage` / `--usage-tracking` | Enable metrics (CLI) |
| `--no-usage` | Force disable (wins over env) |
| `FF_USAGE_ENABLED=1` | Enable via environment |
| `FF_USAGE_DIR` | Override metrics directory |
| `FF_USAGE_PRICE_TEXT_IN_PER_MTOK` / `FF_USAGE_PRICE_TEXT_OUT_PER_MTOK` | Optional $ per 1M tokens |
| `FF_USAGE_PRICE_IMAGE` | Optional $ per live image generate/edit |
| `FF_USAGE_PRICE_TTS_PER_MCHAR` | Optional $ per 1M live TTS characters |

**Notes:** Cached vision frames, multiplayer follow-only peeks, and TTS cache hits are counted but **not** billed as live usage. Local co-inventor fallback records calls with **zero** tokens. Prompts and player text are never stored. Assumes a single Node process (set distinct `FF_USAGE_DIR` per instance if you scale out).

### Option A — SuperGrok OAuth (default for local dev)

Use the same login as the Grok CLI:

```bash
grok login
```

This stores a session under `~/.grok/auth.json` (or `$FF_GROK_HOME/auth.json`). Future Forge reads and refreshes that session automatically.

**Best for:** local development on a machine where you already use SuperGrok.

### Option B — xAI API key

Create a key in the [xAI console](https://console.x.ai/) and set:

```bash
export FF_XAI_API_KEY=xai-...
# or put it in .env (never commit .env)
```

**Best for:** servers, CI, or machines without a SuperGrok desktop session.

### What happens if neither works

- The UI still loads.
- Co-inventor modes fall back to a **local** heuristic partner.
- Live Grok reasoning and Imagine vision will not run until auth succeeds.

Check the co-inventor status line in the UI, or:

```text
GET http://127.0.0.1:8765/api/health
```

---

## Project layout

```text
future-forge/
  server.mjs          # static file server + /api/*
  index.html          # game shell
  css/ styles.css
  js/                 # game, data, co-inventor client, vision, problem briefs
  assets/
    problems/         # theme card art
    challengers/      # Moloch, Ethicist, Stakeholder, Mother Nature
  docs/               # README images
  scripts/            # e.g. check-problem-briefs.mjs
```

Browser state lives in **localStorage** on the player’s device: scenario cache, **solved mission ids** (including learning-module completion for the segment progress bar), quest library imports, and related UI prefs. Nothing is synced to warmersun.com by default — see [Privacy](https://warmersun.com/privacy/).

---

## Deploy (brief)

This is a **long-running Node process**, not a static-only site (unless you accept the local co-inventor only).

Typical approach:

1. Host the repo on a VPS or PaaS (Fly, Railway, Render, etc.).
2. `npm install --omit=dev` and `npm start`.
3. Set `FF_PORT` and **`FF_XAI_API_KEY`** in the host environment (prefer API key over SuperGrok OAuth on servers).
4. Terminate TLS with nginx, Caddy, or the platform’s HTTPS.

Do not commit secrets. Do not put API keys in the client or the git repo.

**Friends multiplayer over the Internet (session on your laptop):**  
use **Tailscale Funnel** so remote friends only need a browser — see **[`docs/multiplayer-internet-tailscale-funnel.md`](docs/multiplayer-internet-tailscale-funnel.md)**. Same Wi‑Fi still works via the LAN URLs printed when you `npm start`.

---

## License

**Future Forge** by **Warmer Sun Education, a sole proprietorship by Tamas Simon** (© 2026) is licensed under  
[**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0).

| Use | Free? |
|-----|--------|
| **Non-commercial** copy, share, adapt (with attribution + share-alike) | **Yes** — CC BY-NC-SA 4.0 ([`LICENSE.md`](LICENSE.md)) |
| **Host a meeting** (in person or online) where **you participate**; not charging for Future Forge | **Yes** — free grant in [`COMMERCIAL.md`](COMMERCIAL.md) |
| **Run an online server** with **no commercial intent** and **not charging** | **Yes** — free grant in [`COMMERCIAL.md`](COMMERCIAL.md) |
| **School / university / bootcamp / training org** | **No** — Education is commercial use; needs a paid license |
| **Company / commercial / client work** | **No** — needs a paid commercial license |
| **Paid cloud / multi-tenant / managed service** for others | **No** — needs a paid commercial license |

- Public license text and attribution: **[`LICENSE.md`](LICENSE.md)**  
- Deed: https://creativecommons.org/licenses/by-nc-sa/4.0/  
- Free grants + paid tiers (Education / Commercial / Cloud): **[`COMMERCIAL.md`](COMMERCIAL.md)**  
- Source: https://github.com/warmersun/future-forge  

If you are unsure, contact us — open a GitHub issue with subject **Commercial license**.

Content and art are development-time static assets; scenario text may be generated via the co-inventor when AI is available. AI providers’ terms apply to any keys you use.
