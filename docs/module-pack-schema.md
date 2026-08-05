# Module pack schema (`future-forge.module-pack/v1`)

Portable **multi-week inventing modules** for Future Forge. A module is an ordered sequence of **quest tiles** on one emTech theme. Play is the core each week; optional primers and research are support, not the product center.

Modules **reference** quests — they do not replace the quest-tile atom (`future-forge.quest-tile/v1`).

## Folder layout (recommended)

```text
modules/<module-id>/
  module.json
  quests/
    week-01.json    # future-forge.quest-tile/v1
    week-02.json
    …
```

Validate:

```bash
npm run validate:module -- modules/<module-id>/module.json
# or the directory (looks for module.json):
npm run validate:module -- modules/<module-id>
```

When a path or directory is given, the validator resolves each week’s `questFile` relative to the module folder and runs quest-tile validation on those files.

## Minimal shape

See `test/fixtures/modules/sample-free/`.

### Top-level required

| Field | Notes |
|-------|--------|
| `schema` | `"future-forge.module-pack/v1"` |
| `kind` | `"module"` |
| `id` | Slug (e.g. `sample-free`) |
| `title` | Player-facing module title |
| `summary` | Short description |
| `access` | `"free"` (showcase) or `"deep"` (paid library tier — no checkout in this schema) |
| `theme` | Short theme key (e.g. `ai-automators`). Alias: `focus` |
| `weeks` | Non-empty array of week entries (see below) |

### Optional top-level

| Field | Notes |
|-------|--------|
| `version` | Number; defaults unused on normalize |
| `estimatedWeeks` | Hint; defaults to `weeks.length` |
| `author` | Object (free-form) |
| `tags` | String array (capped) |
| `research` | Author notes object (not required for play) |
| `i18n` | Locale overlays later (same idea as quest tiles) |

### Week entry

| Field | Notes |
|-------|--------|
| `week` | **Preferred.** 1-based week number (unique in the pack) |
| `index` | Alternate for week number |
| `id` | Alternate; if it contains digits, first number is used as week |
| `title` | Week label (player-facing) |
| `questFile` | **Preferred.** Relative path under the module folder, e.g. `quests/week-01.json` |
| `quest` | Inline quest-tile object (for single-file packs / tests). Use `questFile` for real modules |
| `primerMd` | Optional short Markdown primer for the week |

Each week must have **either** `questFile` **or** `quest` (or both). Paths must be relative (no `..`, not absolute).

## Access tiers

| Value | Intent |
|-------|--------|
| `free` | Showcase / discovery modules |
| `deep` | Paid library depth (entitlement is product work later; field is metadata only) |

## Design notes

- **No new feature hide-and-show** for teaching — modules use the full invent · challenge · field loop.
- Spark / Play tutorial stays as built; modules do not invent a third stripped mode.
- First showcase theme intent: broad AI/Automators (`theme: "ai-automators"`), free access — content authored separately.

## License note

Fixture packs under `test/fixtures/` follow the same spirit as quest fixtures (examples for validation). The Future Forge game itself may use a different license.
