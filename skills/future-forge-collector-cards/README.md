# Future Forge — Collector card authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research a real emerging-technology capability and write a **collector card** (collection card) JSON file for [Future Forge](https://github.com/warmersun/future-forge).

Players open the issued link, collect the card into their library, and play it as a free reusable invention tile. It does **not** relicense the Future Forge app. Only this skill tree is MIT. The example cards live in the game repo at `cards/examples/`.

## Quick start

Follow **`SKILL.md`**. Then:

```bash
npm run validate:collector-card -- cards/<slug>.json
./scripts/issue-collector-card.sh cards/<slug>.json   # only when publishing
```

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Surfaces, hard rules, procedure |
| **`references/schema.md`** | Caps and what each field reaches |
| **`references/output-contract.md`** | Skeleton and omit rules |

## Not under `.grok/`

Works with Grok, Claude Code, Cursor, Codex, and plain "read this folder" workflows. Optional: symlink into a harness skills directory — never required.
