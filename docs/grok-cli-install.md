# Install Future Forge with Grok Build CLI

Page copy for warmersun.com. Visitors paste the block below into Grok Build CLI. Grok confirms where to install, downloads Future Forge, writes a start script for the way they want to play, and starts it.

## Above the box

You need Grok Build CLI and a Grok subscription. If `grok` is not installed yet, macOS and Linux use:

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
```

Windows PowerShell uses:

```powershell
irm https://x.ai/cli/install.ps1 | iex
```

Open it with `grok`, sign in, then paste the block below. Grok will ask before it chooses a folder or a friends setup. When the game is running, it also links the authoring skills in that folder and tells you how to add your own quests.

## Paste this into Grok

```text
Set up Future Forge on this computer and leave it running. Do the install yourself. The person here should not have to install tools, edit files, or follow a README. Ask before you pick a folder or a friends setup, then do the work.

Future Forge is a local web game: one Node process serves the page, the AI co-inventor, and friends rooms. The AI co-inventor uses the Grok subscription already signed in on this machine.

Source (public): https://github.com/warmersun/future-forge.git
Branch: main

License gate, before you install: personal play, a friends session this person joins, and a free server they do not charge for are allowed. If they want this for a school, university, bootcamp, company, client, or any paid hosting, stop and send them to https://github.com/warmersun/future-forge/blob/main/COMMERCIAL.md — a paid license, requested with a GitHub issue titled "Commercial license".

Where to install — ask first:

The default is the folder this chat is already in, not their home folder. Tell them that path and ask if Future Forge should go there. Wait for a yes, or for a different path they name. Do not clone until they answer. Do not use their home folder unless they name it.

If this folder already contains files and is not already a checkout of this repo, say so and offer a new future-forge folder inside it. Git cannot clone into a non-empty folder. If this folder is already this repo (server.mjs and package.json are here), ask to update it in place.

Install, after they confirm the folder:

1. Download with ordinary git into that folder:
   git clone https://github.com/warmersun/future-forge.git
   Use the folder they confirmed. When they chose a new future-forge directory, clone into that directory. A Grove `grok clone` checkout is the wrong copy for a server that stays running. If the folder is already this repo, fast-forward main. If it has uncommitted changes, keep them and say so.
2. Install Git if it is missing.
3. Install Node.js 22 LTS when `node -v` is missing or older than 20.9.0. npm comes with Node. Use the normal installer for this operating system (nodejs.org, Homebrew, or winget). Skip an old operating-system package that is still on Node 18.
4. In the repo, run `npm install`.

Agent skills, after the clone:

The repo ships four MIT skill packages under `skills/`. They teach an agent how to author game content. They do not relicense the game. Grok discovers project skills from `.grok/skills/`, and `.grok/` is gitignored, so a fresh clone has the packages and no links. Create the links. Do not copy the trees. Do not commit `.grok/`. If a link is already there, leave it.

On macOS and Linux, from the repo root:

mkdir -p .grok/skills
ln -sfn ../../skills/future-forge-quest .grok/skills/future-forge-quest
ln -sfn ../../skills/future-forge-predictions .grok/skills/future-forge-predictions
ln -sfn ../../skills/future-forge-trends .grok/skills/future-forge-trends
ln -sfn ../../skills/future-forge-collector-cards .grok/skills/future-forge-collector-cards

On Windows, from the repo root, make a directory junction for each package (no administrator prompt):

New-Item -ItemType Directory -Force -Path .grok\skills | Out-Null
foreach ($name in 'future-forge-quest','future-forge-predictions','future-forge-trends','future-forge-collector-cards') {
  $link = Join-Path .grok\skills $name
  if (-not (Test-Path $link)) {
    New-Item -ItemType Junction -Path $link -Target (Join-Path (Resolve-Path skills) $name) | Out-Null
  }
}

When they later ask for a quest, a predictions timeline, a capability chart, or a collector card, open `grok` in this repo and follow that skill's `SKILL.md`. Do not author any of those during this install unless they ask now.

| Skill | They can ask for | Where it lands |
|-------|------------------|----------------|
| `skills/future-forge-quest/` | A Spotlight Quest, or a learning quest with lesson pages packed as one `.ffquest` | Library, after the side-load steps below |
| `skills/future-forge-predictions/` | A dated predictions bank | `FF_PREDICTIONS_FILE` |
| `skills/future-forge-trends/` | One measured capability curve for Look Ahead charts | A trend JSON file, then the trends catalog |
| `skills/future-forge-collector-cards/` | A collector card: a real capability, collected by link, played as a free invention tile | `cards/<slug>.json` plus its page image |

AI login: Future Forge reads ~/.grok/auth.json, the file `grok login` writes, and refreshes that session. Confirm the file exists. Do not open it, print it, copy it, or commit it. XAI_API_KEY and GROK_API_KEY do not sign this game in. Skip creating a separate xAI console key unless `grok login` cannot be finished on this machine.

How they want it to run — ask once, after install:

Ask which of these they want, unless this chat already says:

A. Just me, on this computer (hotseat on this same computer still works).
B. Friends on the same Wi-Fi.
C. Friends anywhere, with a private https link (Tailscale Funnel).

Then ask: "Anything else, or should I use the normal settings?" Normal settings are the defaults below. If they name a wish, map it to the variables in the catalog. Do not quiz them variable by variable. If they do not answer the second question, use the defaults.

Write two files, then start the game by running the script (so the next launch matches):

1. A gitignored `.env` in the repo root. Only lines that differ from the built-in defaults, each with a short comment. The server reads `.env`, then `.env.local`, on startup. A variable already set in the environment wins over the file. Use absolute paths. A tilde is not expanded.
2. A start script in that same repo folder: `start-future-forge.sh` on macOS and Linux, `start-future-forge.ps1` on Windows. Make the shell script executable. Do not commit the script or `.env`.

The script takes no argument to start and `stop` to stop. It cds to the repo, starts `npm start` detached, appends logs to `future-forge-server.log` in the repo, and records the process id in `future-forge-server.pid`. `stop` ends that process. The server loads `.env` itself, so the script does not export a second copy of the settings and does not contain secrets. Read `FF_PORT` from `.env` when the script needs the port; otherwise use 8765. For choice C, after a healthy start the script also runs `tailscale funnel --bg` on that port, and `stop` runs `tailscale funnel reset`. Keep that funnel on/off flag in the script in step with `.env`.

Settings catalog (game process only, `npm start` / `node server.mjs`):

Play and network
- FF_PORT — default 8765. Never use 443.
- FF_HOST — default 0.0.0.0, which allows same-Wi-Fi friends. For A, set FF_HOST=127.0.0.1 so only this computer can open the game. For B or C, leave FF_HOST unset. Funnel reaches the local port either way; same-Wi-Fi friends need the default.
- FF_ENABLE_ROOMS — default on. Set 0 only if they want friends rooms off.
- FF_JOIN_ORIGIN — https origin shown in the friends lobby, no path and no trailing slash. Set it only for C, to the https://….ts.net URL Funnel prints. LAN addresses stay in the server log. They do not belong in this variable.
- FF_MAX_ROOMS — default 200.
- FF_TRUST_PROXY — leave unset. Set 1 only when their own reverse proxy is the only way in. Tailscale Funnel does not need it.
- FF_API_SECRET — leave unset. The page never sends it, so setting it blocks the co-inventor for anyone off this computer's loopback.
- FF_ADMIN_TOKEN — leave unset. It exposes usage and detailed health to other machines.

AI
- Login is ~/.grok/auth.json. Leave FF_XAI_API_KEY unset unless `grok login` cannot work. If a key is required, it goes only in `.env`. Never print it. Never put it in the start script.
- FF_GROK_HOME — default ~/.grok. Set an absolute path only when their Grok login file lives somewhere else.
- FF_XAI_MODEL — default grok-4.7. Leave it.
- FF_XAI_IMAGE_MODEL — default grok-imagine-image. Use grok-imagine-image-quality only if they ask.
- FF_AI_SEARCH — default off. Set 1 only if they want live web and X search on timing checks and Ask for ideas. That is slower and costs extra. Same switch as `npm start -- --ai-search`.
- FF_DEVELOPER — default off. Leave it off.

Voice and read-aloud
- FF_TTS_VOICE — default eve. Read-aloud voice: eve, ara, rex, sal, or leo. The live co-inventor voice is picked in the page, not here.
- FF_VOICE_MAX_SESSIONS — default 8. The service cap is 10.
- FF_VOICE_MAX_MS — default 600000 (10 minutes).
- FF_VOICE_IDLE_MS — default 90000. Hang up when a tab sends no audio.
- FF_TTS_CACHE_DIR — default ./data/tts-cache inside the repo.

Quests, predictions, and trends
- FF_QUESTS_DIR — default ./quests, the Library folder. Relative paths are inside the repo. Setting it replaces that folder. It does not merge with it. The server reads only `*.json` files in that folder, not subfolders. Invalid files are skipped and listed on GET /api/quests.
- FF_CONTENT_DIR — leave unset. Absolute path to an unpacked `.ffquest` tree. The server serves that tree at /content/ so lesson pages and package images load. Set it together with FF_QUESTS_DIR pointed at that tree's `quests/` directory.
- FF_QUESTS_REMOTE_URL — leave unset to use the official Warmer Sun Sponsored and Learning catalog. Set off when the room should see only the Library folder.
- FF_PREDICTIONS_FILE — leave unset to use predictions/default.json. A path or an https URL replaces that bank. It does not merge. The repo already has predictions/examples/musk-abundance.json.
- FF_TRENDS_REMOTE_URL — leave unset to use the official trends catalog. Set off to skip it.
- FF_SHARE_ORIGIN — leave unset. Copy link then uses the public warmersun.com/forge page.

Side-loading quests — ask once, after the run-mode question: "Do you have a quest file to add, a .json tile or a .ffquest package?" If they say no, skip the copy and still explain the three ways in the closing summary. If they name files, add them before the health check, then restart with the script so the Library scan picks them up.

Three ways a quest gets in:

1. Server Library, a quest tile. Copy each `*.json` into the repo `quests/` folder (or into the folder FF_QUESTS_DIR names). Restart. Those tiles show in Library, first in the list, including a Friends room. The tracked `quests/` folder is part of the git checkout. A private tile belongs in a folder they name, with FF_QUESTS_DIR set to that absolute path, so a later commit does not pick it up.
2. This browser only. On the home screen, Import Quest… or drop a `.json`. That copy stays in that browser. Friends in a room do not see it. You do not copy the file for this path.
3. A learning quest with lesson pages, one `.ffquest` file (a zip of the tile and its pages). One-shot, from the repo, after the start-script server is stopped so the port is free: `./scripts/sideload-local-package.sh path/to/quest.ffquest`. That unpacks to a temp folder, serves lessons at /content/, and starts the game. Stopping deletes the folder. Needs `python3`. To keep the package across restarts, unpack into `data/sideload/<id>` (`data/` is gitignored):

python3 scripts/quest-package.py unpack path/to/quest.ffquest data/sideload/<id> --lesson-root http://127.0.0.1:<port>/content/lessons/ --asset-root http://127.0.0.1:<port>/content/assets/

Then set FF_QUESTS_DIR to the absolute path of `data/sideload/<id>/quests` and FF_CONTENT_DIR to the absolute path of `data/sideload/<id>`. Use the port the script will actually bind. A later port change means unpack again so those roots match. FF_QUESTS_DIR replaces the repo `quests/` folder for as long as it is set. Leave FF_QUESTS_REMOTE_URL unset unless they want official Sponsored and Learning hidden.

Cloud sign-in is optional and is not required to play. Leave FF_PORTAL_URL unset. Do not run `npm run portal`. Do not create `.env.portal`.

Cost log, only if they ask
- FF_USAGE_ENABLED=1 writes token, image, and voice estimates under data/usage/. Same switch as `npm start -- --usage`. Default off.
- FF_USAGE_DIR — default ./data/usage.
- Dollar estimates, only if they ask: FF_USAGE_PRICE_TEXT_IN_PER_MTOK=2, FF_USAGE_PRICE_TEXT_OUT_PER_MTOK=6, FF_USAGE_PRICE_IMAGE=0.02, FF_USAGE_PRICE_TTS_PER_MCHAR=15, FF_USAGE_PRICE_VOICE_PER_MIN=0.08.

Rate limits, leave alone unless they ask (hits per minute): FF_RATE_CO_INVENT=40, FF_RATE_VISION=20, FF_RATE_TTS=30, FF_RATE_VOICE=8, FF_RATE_AI_GLOBAL=80, FF_RATE_WS_ACTION=40. FF_WS_MAX_PAYLOAD default 262144.

Leave these alone: `npm run portal`, `npm run start:dev`, `npm run start:developer`, Clerk, Neon, Render, a database, TypeSafe, and `.env.portal`.

If port 8765 is already this game and healthy, use that process and point the script at it. If some other program holds the port, set FF_PORT in `.env` to a free port and use that port in the script.

Prove it with an HTTP GET. A HEAD request returns 405.

GET http://127.0.0.1:<port>/api/health

Wait until the JSON says "ok": true and "ai": true. "rooms": true unless they turned friends rooms off. "ai": true means the co-inventor can call Grok. When "ai" is false, run `grok login`, let sign-in finish, run the script's stop then start, and check again. Open http://127.0.0.1:<port> in the browser.

For choice C, install Tailscale from https://tailscale.com/download and run `tailscale up` so they can sign in, then let the start script turn Funnel on. If Funnel is disabled, have them turn on MagicDNS, HTTPS certificates, and Funnel for their tailnet at https://login.tailscale.com/admin and run the script again. Write the printed https://….ts.net URL into FF_JOIN_ORIGIN and restart with the script. The host and every friend open that https URL. Send the https URL and the room code in a private chat. Leave home-router ports closed. Tell them to run the script's stop command when the night is over so Funnel turns off too.

Then tell them, in plain language, how to play:

- Alone: on the home screen, Start a Quest or Surprise Quest.
- Several people, one computer: Invent with friends, then Hotseat. They pass the device. Seat names are comma-separated.
- Friends on the same Wi-Fi (choice B): this server stays running. The log lists addresses under "LAN (same Wi-Fi)". The host clicks Invent with friends, Create room, and sends the LAN address plus the 6-character room code. Friends install nothing. Allow inbound TCP on the game port from the local network only if a firewall blocks them. The spoken co-inventor needs a microphone and either http://127.0.0.1 or an https address, so voice is silent on an http://192.168… link. Typing still works.
- Friends on the internet (choice C): Invent with friends, Create room, share the https URL and the code.

Say this before any link is shared: friends in a room spend the host's Grok subscription.

When you finish, tell them: the folder, the start-script path, the local URL, whether the co-inventor is live, which choice you configured, and the lines you put in `.env`. Tell them to run the script to start next time and the script's stop command to stop. To update: `git pull`, `npm install`, then run the script again. The skill links live in gitignored `.grok/skills/`, so after a fresh clone on another machine, make those four links again.

Then tell them, in plain language, how to add a quest and what the skills are for:

- A quest tile is one JSON file. Put it in the `quests` folder and restart, and everyone on this server sees it in Library, including friends in a room. Import Quest on the home screen keeps a tile on that browser only.
- A learning quest that includes lesson pages is one `.ffquest` file. Hand that file over and ask to side-load it. One-shot play uses `scripts/sideload-local-package.sh`. A package that should stay uses `data/sideload/` plus FF_QUESTS_DIR and FF_CONTENT_DIR.
- Four authoring skills are linked for Grok in this folder. Next time they open `grok` here they can ask for a Quest (`future-forge-quest`), a predictions timeline (`future-forge-predictions`, side-loaded with FF_PREDICTIONS_FILE), a capability chart (`future-forge-trends`), or a collector card (`future-forge-collector-cards`). Grok should read that skill's SKILL.md and follow it. The skills are MIT. The game is not.

Close with one line: this setup is for them and for friends they play with; a school or company needs a separate license.

If they later change their mind, edit `.env` and the funnel flag in the script, then stop and start. Use only variable names from the catalog above.

If a step fails, fix it and check /api/health again before you say it is ready.
```
