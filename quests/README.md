# Server Quest folder

Drop Future Forge **Quest tile** JSON files here. When the game server starts (and on each `GET /api/quests`), it scans this directory.

## How to use

1. Author a tile with the skill or CLI (`skills/future-forge-quest/`, `npm run author:quest`).
2. Copy the `.json` into this folder (or set `QUESTS_DIR` to another path).
3. Start the server: `npm start`
4. Open the game → **Play a Quest** — tiles appear under the matching hub path:
   - **Sponsored** — has `sponsorName`
   - **Learning** — `isLearningModule` / module·lesson fields (grouped by module)
   - **Library** — other side-loaded tiles (not learning, not sponsored)
   - **Themes** is separate: generate up to 4 local Quests per problem theme

## Rules

- Only `*.json` files in **this folder** (not subfolders).
- Must pass `npm run validate:quest -- path.json`.
- Invalid files are skipped (logged in `/api/quests` as errors); they do not crash the server.
- **Crisis meters** use structured `mission.pressure` with optional roles `local`, `global`, `support` (each `{ label, pressure, pressureRise, winMax }`). Omit a role to hide that HUD meter. See `docs/quest-tile-schema.md`.

## Example

`spotlight-gene-seq.json` is a sample Spotlight Quest (gene sequencing).

## Override path

```bash
QUESTS_DIR=/path/to/my-quests npm start
```
