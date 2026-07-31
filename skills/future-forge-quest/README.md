# Future Forge — Spotlight Quest authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research a recent emerging-technology (emTech) advance and write a portable **Quest tile** (JSON) for [Future Forge](https://github.com/warmersun/future-forge).

It does **not** relicense the Future Forge game engine. Only this skill tree (and example tiles) are MIT.

## Not under `.grok/`

The skill lives at `skills/future-forge-quest/` so it works with Grok, Claude Code, Cursor, Codex, and plain “read this folder” workflows. Optional: symlink into your harness’s skills directory locally — never required.

## Quick start (any agent)

1. Open and follow **`SKILL.md`**.
2. Read **`references/scene-prose.md`** before drafting `mission.scene` or the brief’s place section (same design-challenge craft as in-game seeds).
3. Read other `references/` as needed (brief template, schema, sensitivity, tech ids).
4. Write `output/quests/<slug>/quest.json` (or a path the user chooses).
5. Validate:

```bash
npm run validate:quest -- output/quests/<slug>/quest.json
```

6. Hand-off options:
   - **Server folder (classrooms / multiplayer):** copy the JSON into the game’s **`quests/`** directory, restart or refresh — External Quests appear for everyone on that server (including friends lobby pick).
   - **Per-browser:** Future Forge title screen → **Import Quest…** → select the JSON (replaces Daily on that device by default).

## Local template without AI research

```bash
npm run author:quest -- --tech gene-sequencing --local-only
```

## Example fixture

`examples/spotlight-gene-seq.json` (same as `test/fixtures/quests/spotlight-gene-seq.json` in the game repo).
