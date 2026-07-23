# Future Forge

**Invent local solutions with emerging technologies — race the crisis clock with an AI co-inventor.**

Future Forge is a solo learning game. You pick a global problem, land in a concrete place, invent with a stack of emerging tech, defend the idea under challenge, and deploy before the local crisis collapses.

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
  - An **xAI API key** (`XAI_API_KEY`)

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

| Command | Purpose |
|--------|---------|
| `npm start` / `npm run serve` | Start the game server (`server.mjs`) |
| `npm run check:briefs` | Verify problem-brief coverage for all themes |

Default port: **8765** (override with `PORT`).

### Optional environment

Copy `.env.example` to `.env` if you want overrides:

```bash
# .env
PORT=8765
XAI_MODEL=grok-4.5
# XAI_API_KEY=xai-...   # see auth below
```

---

## AI dependency: SuperGrok OAuth or xAI API key

The Node server serves static files and exposes:

- `POST /api/co-invent` — scenarios, co-inventor, feasibility assist, challenges  
- `POST /api/vision` — Imagine-based future vision images  
- `GET /api/health` — co-inventor / auth status  

Auth is resolved **on the server** (tokens never go to the browser).

### Option A — SuperGrok OAuth (default for local dev)

Use the same login as the Grok CLI:

```bash
grok login
```

This stores a session under `~/.grok/auth.json` (or `$GROK_HOME/auth.json`). Future Forge reads and refreshes that session automatically.

**Best for:** local development on a machine where you already use SuperGrok.

### Option B — xAI API key

Create a key in the [xAI console](https://console.x.ai/) and set:

```bash
export XAI_API_KEY=xai-...
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

Browser state (scenario cache, solved missions) lives in **localStorage**.

---

## Deploy (brief)

This is a **long-running Node process**, not a static-only site (unless you accept the local co-inventor only).

Typical approach:

1. Host the repo on a VPS or PaaS (Fly, Railway, Render, etc.).
2. `npm install --omit=dev` and `npm start`.
3. Set `PORT` and **`XAI_API_KEY`** in the host environment (prefer API key over SuperGrok OAuth on servers).
4. Terminate TLS with nginx, Caddy, or the platform’s HTTPS.

Do not commit secrets. Do not put API keys in the client or the git repo.

---

## License

Future Forge is **source available**, **not** OSI open source.

| Use | Free under `LICENSE.md`? |
|-----|------------------------|
| **Personal** self-host (private hobby / own learning only) | **Yes** |
| **School / university / training** | **No** — needs a paid license |
| **Company / commercial / client work** | **No** — needs a paid license |
| **Cloud / multi-tenant / managed service** for others | **No** — needs a paid license |

- Full free grant and restrictions: **[`LICENSE.md`](LICENSE.md)**  
- Education, Commercial, and Cloud tiers: **[`COMMERCIAL.md`](COMMERCIAL.md)**  

**Personal free use** means a natural person, non-commercial, on infrastructure they control, not offering the game as a product, service, or institutional classroom tool. If you are unsure, you need a commercial license — open a GitHub issue with subject **Commercial license**.

Content and art are development-time static assets; scenario text may be generated via the co-inventor when AI is available. AI providers’ terms apply to any keys you use.

> The license text is a practical draft for this product model. Have a lawyer review before large commercial enforcement or sales.
