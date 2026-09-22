# Install Future Forge with Grok Build CLI

Page copy for warmersun.com. Visitors paste the block below into Grok Build CLI. Grok downloads Future Forge, installs what it needs, and starts it for solo play or a self-hosted friends session.

## Above the box

You need Grok Build CLI and a Grok subscription. If `grok` is not installed yet, macOS and Linux use:

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
```

Windows PowerShell uses:

```powershell
irm https://x.ai/cli/install.ps1 | iex
```

Open it with `grok`, sign in, then paste the block below.

## Paste this into Grok

```text
Set up Future Forge on this computer and leave it running. Do the install yourself. The person here should not have to install tools, edit files, or follow a README.

Future Forge is a local web game: one Node process serves the page, the AI co-inventor, and friends rooms. The AI co-inventor uses the Grok subscription already signed in on this machine.

Source (public): https://github.com/warmersun/future-forge.git
Branch: main

License gate, before you install: personal play, a friends session this person joins, and a free server they do not charge for are allowed. If they want this for a school, university, bootcamp, company, client, or any paid hosting, stop and send them to https://github.com/warmersun/future-forge/blob/main/COMMERCIAL.md — a paid license, requested with a GitHub issue titled "Commercial license".

Install:

1. Put the app in their home folder, named future-forge (`~/future-forge` on macOS and Linux, `%USERPROFILE%\future-forge` on Windows). Download it with ordinary git:
   git clone https://github.com/warmersun/future-forge.git
   A Grove `grok clone` checkout is the wrong copy for a server that stays running. If that folder is already this repo, fast-forward `main`. If it has uncommitted changes, keep them and say so. Keep the clone out of whatever project folder this chat opened in.
2. Install Git if it is missing.
3. Install Node.js 22 LTS when `node -v` is missing or older than 20.9.0. npm comes with Node. Use the normal installer for this operating system (nodejs.org, Homebrew, or winget). Skip an old operating-system package that is still on Node 18.
4. In the repo, run `npm install`.

AI login: Future Forge reads `~/.grok/auth.json`, the file `grok login` writes, and refreshes that session. Confirm the file exists. Do not open it, print it, copy it, or commit it. `XAI_API_KEY` and `GROK_API_KEY` do not sign this game in. Skip creating a separate xAI console key unless `grok login` cannot be finished on this machine.

Start the game with `npm start` and no other flags. That is `node server.mjs`. It binds 0.0.0.0 and listens on port 8765.

Leave these alone: `npm run portal`, `npm run start:dev`, `npm run start:developer`, Clerk, Neon, Render, a database, TypeSafe, `.env.portal`, `--developer`, `FF_DEVELOPER`, `--ai-search`, and `FF_TRUST_PROXY`.

Run it detached so it keeps going after this chat. Log to `future-forge-server.log` in the home directory, and record the process id when the operating system allows. If port 8765 is already this game and healthy, use that process. If some other program holds the port, pick a free port with `FF_PORT` and use that port in every step below.

Prove it with an HTTP GET. A HEAD request returns 405.

GET http://127.0.0.1:8765/api/health

Wait until the JSON says "ok": true, "rooms": true, and "ai": true. "ai": true means the co-inventor can call Grok. When "ai" is false, run `grok login`, let sign-in finish, restart the server, and check again. Open http://127.0.0.1:8765 in the browser.

Then tell them, in plain language, how to play:

- Alone: on the home screen, Start a Quest or Surprise Quest.
- Several people, one computer: Invent with friends, then Hotseat. They pass the device. Seat names are comma-separated.
- Friends on the same Wi-Fi: this server stays running. The log lists addresses under "LAN (same Wi-Fi)". The host clicks Invent with friends, Create room, and sends the LAN address plus the 6-character room code. Friends install nothing. Allow inbound TCP on the game port from the local network only if a firewall blocks them. The spoken co-inventor needs a microphone and either http://127.0.0.1 or an https address, so voice is silent on an http://192.168… link. Typing still works.
- Friends on the internet: do the Tailscale steps only after they say they want that.

Say this before any link is shared: friends in a room spend the host's Grok subscription.

Friends on the internet, only when asked:

Install Tailscale from https://tailscale.com/download and run `tailscale up` so they can sign in. Then run `tailscale funnel --bg 8765` (use the real port if it is not 8765). If Funnel is disabled, have them turn on MagicDNS, HTTPS certificates, and Funnel for their tailnet at https://login.tailscale.com/admin and run Funnel again.

Take the https://….ts.net URL Funnel prints. Put one line in the repo's `.env` (create the file if needed; it stays gitignored):

FF_JOIN_ORIGIN=https://that-url.ts.net

Restart the game. The host and every friend open that https URL. Host: Invent with friends, then Create room. Send the https URL and the room code in a private chat.

When the night is over, they run `tailscale funnel reset`. Leave their home router ports closed. Leave Funnel off overnight.

When you finish, tell them: the folder, the local URL, whether the co-inventor is live, and the LAN addresses from the log. Give the commands to start next time (cd into the repo, then `npm start`), to stop the process, and to update (`git pull`, `npm install`, then start again). Close with one line: this setup is for them and for friends they play with; a school or company needs a separate license.

If a step fails, fix it and check /api/health again before you say it is ready.
```
