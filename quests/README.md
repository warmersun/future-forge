# Server Quest folder

Drop Future Forge **Quest tile** JSON files here. When the game server starts (and on each `GET /api/quests`), it scans this directory.

## How to use

1. Author a tile with the skill or CLI (`skills/future-forge-quest/`, `npm run author:quest`).
2. Copy the `.json` into this folder (or set `QUESTS_DIR` to another path).
3. Start the server: `npm start`
4. Open the game — **External Quests** appear on the home screen and when picking a Quest for multiplayer.

## Rules

- Only `*.json` files in **this folder** (not subfolders).
- Must pass `npm run validate:quest -- path.json`.
- Invalid files are skipped (logged in `/api/quests` as errors); they do not crash the server.

## Example

`spotlight-gene-seq.json` is a sample Spotlight Quest (gene sequencing).

## Override path

```bash
QUESTS_DIR=/path/to/my-quests npm start
```
