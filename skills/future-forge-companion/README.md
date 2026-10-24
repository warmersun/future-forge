# Future Forge — Companion quest skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to turn one public source into a Future Forge companion quest. The source is a YouTube video, a podcast episode, a blog or other article, or an X post.

It does **not** relicense the Future Forge app. Only this skill tree is MIT.

It also does not own the field rules. Those stay in the two skills it joins:

| Skill | Owns |
|-------|------|
| [`skills/future-forge-quest/`](../future-forge-quest/) | The quest tile, including `references/companion.md` |
| [`skills/future-forge-predictions/`](../future-forge-predictions/) | The predictions bank, its years, and its attribution |

## Quick start

Follow **`SKILL.md`**. Then:

```bash
npm run validate:predictions -- <bank>                 # only when the premise is assumed
npm run validate:quest -- quests/<id>.json --strict    # OK: + lint: clean
npm run economy:quest -- quests/<id>.json              # quest verdict: challenging
npm run pack:quest -- <source-directory> -o <id>.ffquest
npm run verify:quest-package -- <id>.ffquest
./scripts/sideload-local-package.sh <id>.ffquest       # v2 includes its complete bank
```

Use the printed local URL. For v2, every playable Quest has `predictionBankId` and its bank in `predictions/`; assumed `premise.bankId` matches it. `FF_PREDICTIONS_FILE` is only the explicit legacy/default-world path, not a distribution requirement.

## Not under `.grok/`

Works with Grok, Claude Code, Cursor, Codex, and plain "read this folder" workflows. Optional: symlink into a harness skills directory — never required.
