# Quest economy lab

A **simulator** for Spotlight Quest tiles. It pretends four competent players invent before crisis meters go red, then says whether the starting wallet and meters are too easy, too hard, or tight.

Use it after `validate:quest`. Validation checks JSON shape. The lab checks **playable difficulty**.

Canonical code: `js/sim/quest-economy.js`. CLI: `scripts/evaluate-quest-economy.mjs`. Browser: `/tools/quest-economy` (developer mode).

## Why it exists

A Quest that solves in 2026 vs 2029 is a different story. The lab exists so authors can see that before shipping.

Rules it encodes:

- Crises **worsen with the calendar**. They ease only when an invention pathway scores.
- **AI must not steal extra years.** First thinking ask of a seat-turn is 1 Attention; further thinking that turn is free. Judge / submit still costs 1 AP.
- **Two-act pedagogy.** A local island this year should not also finish the global / root-cause meter. Later honest capabilities (after a year tick) are the second act.
- **Friends Wait does not raise shared meters.** The table wrap (+1 year) does.

Target verdict: **challenging** — the two-act path survives (no collapse, no red, no meter at 5). Full green on every meter is not required.

## Run it

### CLI

```bash
npm run economy:quest -- path/to/quest.json
npm run economy:quest -- --all
npm run economy:quest -- path/to/quest.json --json
npm run economy:quest -- path/to/quest.json --write
```

`--all` evaluates local `quests/` plus the remote Sponsored / Learning catalog (skips `kind: "module"` wrappers). `--write` applies the recommended patch **only** to allowlisted local files (`quests/` and `output/quests/`), then you should re-run `validate:quest`.

`--friends-seats N` (2–6, default 3) is recorded on Friends archetypes. The scripted Friends path is still one wrap analog, not a live multi-seat table.

### Browser lab

```bash
npm run start:developer
# open http://127.0.0.1:8765/tools/quest-economy
```

Off unless `--developer` / `--dev` / `FF_DEVELOPER=1`. Production `npm start` must leave this off — the HTTP API 404s.

Pick a Quest the same way as the app (Themes, Sponsored, Learning, Library). The lab evaluates in the browser; **Write into file** only works for Library / `output/quests/` JSON. Theme pack and remote catalog tiles are evaluate-only until **Copy to Library**.

Developer inspect on a catalog card also links here with `?id=`.

## Four kinds of player

| Id | What it pretends |
|----|------------------|
| `solo-no-ai` | Hand-picks techs, writes How it works. Typical pathway yield. |
| `solo-ai` | Asks the co-inventor at every invent and challenge step. Stronger yield; season tax, not 1 AP per utterance. |
| `friends-no-ai` | Personal wallet. Wait does not raise shared meters. Calendar + shared crises tick on **table wrap**. |
| `friends-ai` | Same Friends clock, plus the AI bill. |

**Quest verdict** = the worse of `solo-no-ai` and `solo-ai`. Friends being easier is expected (personal Wait is not a shared crisis grind). Do not lower starting meters only to nerf Friends.

### Verdicts

| Verdict | Meaning |
|---------|---------|
| `challenging` | Survives the scripted two-act (or one-act) path. Target. |
| `too_easy` | Starts already green, cheap tiles, leftover years and wallet. |
| `too_hard` | Blocked (AP / Budget / Will / calendar) or collapses / goes red. |
| `impossible` | Starts already red and still cannot survive, or a one-tile path cannot pay. |

Survive = not collapsed, no meter in the red band (hot ≥ 4), max pressure &lt; 5. Hex **hold** is yellow+; full win is all meters ≤ `winMax`.

## Clock the lab uses

Whole numbers only — never +0.5.

| Action | Year | Shared meters |
|--------|------|----------------|
| Solo **End turn** | +1 | +`pressureRise` once |
| Solo **Wait** | +`yearsPerTurn` (usually 2) | +`pressureRise` once per year jumped |
| Friends **table wrap** | +1 | +`pressureRise` once |
| Friends **personal Wait** | waiter’s invent +`yearsPerTurn` | unchanged |

Red at 4 is danger, not game over. Collapse is any meter at 5 **or** the fail year.

The year table (`yearlyCrisisClock`) is End-turn shaped: one row per calendar year. The dashed “if they never invent” chart tail uses that table, not a Wait-only axis. Hover a solid dot for the action that landed there (place tile, End turn, Wait, AI ask, relief).

Lab **Friends two-act** uses one wrap analog (End turn +1) between islands — the same year as solo End turn, not Wait +2.

## Two-act invent path

`planPath` does **not** dump every suggested tech onto one island.

| Meters on the tile | Plan |
|--------------------|------|
| One meter, or local + support only | 1 pathway, 1 tile |
| Local + global (support optional) | 2 pathways, 1 tile each: local[+support] **this year**, then End turn, then global |

Typical yield (no AI): local −1, support −1, global 0 on the first island. A **global-aimed** second island eases global (typical −1, strong −2). Strong (AI) still does not finish global on the first island.

That is why a three-meter theme Quest usually lands in **2027** on both solo-no-AI and solo-AI — one End turn between acts, not four extra years of chatting.

## AI Attention bill

On AI archetypes, each tile scripts:

1. Which emTech? (`chat`)
2. Ask for ideas (`idea-sparks`)
3. Write How it works (`chat`)

Then a pathway essay, coach, draft, and **judge / submit**. First thinking row of the **path** costs 1 AP; further thinking is 0; judge stays 1. Learning-module **tutor chat** is free and does not pay the season tax.

If the AI path finishes two or more years later than no-AI, the Attention tax is spilling extra seasons — raise `apMax` or cut tiles, do not make thinking cost 0.

## What to put on the tile

Theme-pack style (three meters) that the lab treats as tight:

| Role | Start | Rise / year | Notes |
|------|-------|-------------|--------|
| `local` | 3 | 1 | Urgent this year |
| `global` | 2 | 1 | A bit more time; same integer yearly rise |
| `support` | 2 | 0 | Time does not grind it; scoring eases it; a bad invent can still bump it |

Untreated local 3↑1 hits 5 in **2028** if they never invent (2026 → 2027 → 2028).

`resources` omitted → game defaults (`apMax` 3, Budget 5, Support 3). Spotlight tiles often raise Budget / Support so an early-curve tech is payable.

The recommender (`--write` / lab **Write into file**) may bump `apMax`, Budget, Support, start pressure, rise, or `collapseYear`. It never drops a crisis **role**. Read the patch before applying — it is a search, not pedagogy.

## Chart and CLI output

CLI prints, per Quest:

- Start AP / Budget / Support (Will) and calendar
- Each meter `start↑rise win≤winMax`
- Quest verdict
- Per archetype: verdict, tile count, pathway count, AP spent, turns, waits, survive, full green, optional AI bill

The lab page shows the same four player cards plus a **turn-based** crisis chart (T0 at start; dots = actions). Dashed line = untreated calendar climb after the path ends.

## What it is not

- Not live hex AI scoring. Relief is **analytical** (`YIELD_BANDS` on the planned island), then `applyAction` for AP / Wait / End turn.
- Not market news or frontier-risk ticks (stripped so authoring is deterministic).
- Not a 2–6 player Friends session. Wrap vs personal Wait is encoded; seats are not simulated around the table.
- Not a rewrite of remote warmersun.com tiles. Copy to Library first.
- `kind: "module"` path wrappers are skipped (no mission / meters).

## Files

| Path | Role |
|------|------|
| `js/sim/quest-economy.js` | Knobs, plan, simulate, evaluate, recommend |
| `js/sim/quest-economy.test.js` | Clock, two-act, AI bill, verdicts |
| `scripts/evaluate-quest-economy.mjs` | CLI (`npm run economy:quest`) |
| `js/server/quest-economy.mjs` | Developer HTTP + allowlisted writes |
| `tools/quest-economy.html` | Lab UI |
| `docs/quest-tile-schema.md` | Tile fields the lab reads |

Authoring skill: `skills/future-forge-quest/references/economy.md`.
