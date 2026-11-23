# Deploy a quest package

`./deploy-quest.sh` publishes one `.ffquest` to production. A v1 package goes through the Warmer Sun gated deploy: quest JSON into the private Neon `quests` bucket, lesson pages onto `https://warmersun.com/lessons/`, and package images onto the public quest catalog when the zip contains them. A v2 package publishes versioned prediction banks, lessons, and quest assets on warmersun.com, then retains the quest revision in Neon. See [Quest package](quest-package.md) for the file format and [loose quest resolution](loose-quest-resolution.md) for v2 retention limits.

```sh
./deploy-quest.sh <package.ffquest> [options]
./deploy-quest.sh --help
```

The package path and the flags may be mixed. Exactly one existing file ending in `.ffquest` is required. The script copies that file to a private temp directory and verifies the copy. The temp directory is removed when the script exits.

Production is the only target. A live deploy asks you to type `yes` unless `--yes` is set. A non-interactive shell has no prompt, so it requires `--yes`.

## Options

| Option | What it does |
| --- | --- |
| `-h`, `--help` | Print the usage comment at the top of `deploy-quest.sh` and exit. |
| `--yes` | Skip the confirmation prompt. Required when stdin is not a terminal. |
| `--dry-run`, `--no-publish` | Validate and build the publication plan. Publish nothing and land nothing in `lesson-src/`. |
| `--force` | Bypass the Economy Lab acceptance gate and allow replacement of mutable collisions. Integrity checks stay in force. |
| `--allow-external-lessons` | V1 only. Accept a package whose wrapper names a lesson quest that is not in the zip. |
| `--source <id>` | V1 only. Quest source id from `scripts/quest-sources.json` in the Warmer Sun checkout. Default `spotlights`. |
| `--plan-dir <directory>` | V2 `--dry-run` only. Copy the offline plan into a new directory. |
| `--package-adapter <module>` | Parsed, then rejected. See below. |
| `--production`, `--prod` | Accepted and ignored. The script always targets production. |
| `--staging`, `--stage` | Exit with an error. Play the package with `scripts/sideload-local-package.sh`. |

`--source`, `--plan-dir`, and `--package-adapter` also accept `--flag=value`. The value must be non-empty. Written as two arguments, `--plan-dir` and `--package-adapter` refuse a value that starts with `--`.

## `--yes`

On a terminal, the script prints `Deploy <id> to production Neon and Warmer Sun? Type yes:`. The reply must be the word `yes`. Any other reply cancels the deploy. `--dry-run` returns before this prompt.

## `--dry-run`

Both package versions are verified with `scripts/quest-package.py verify` before the dry-run work.

A v1 dry-run unpacks into the temp directory with the production lesson root `https://warmersun.com/lessons/` and the asset root for `--source`. It then runs `npm run publish:quest -- <unpacked quests> --dry-run`. It does not call `gated-deploy-package.sh`, because that helper writes `lesson-src/` even when asked not to publish.

A v2 dry-run runs `scripts/publish-quest-package.mjs --dry-run`, unpacks a delivery projection, and writes a plan under the temp directory. The plan's `publishable` field is false. With `--plan-dir`, that plan is copied out. The script prints the plan JSON.

## `--force`

The flag does not skip package verify, craft lint, access checks, or immutable-release protection.

For a v1 production deploy it is forwarded to `gated-deploy-package.sh --force`. That bypasses the economy gate and allows the land step to replace lesson folders and package images already on disk. A v1 dry-run passes `--skip-economy` to the `publish:quest` dry-run.

For v2, the same flag is passed to `publish-quest-package.mjs --dry-run` (the preflight used by both dry-run and production). On a live v2 deploy it also allows two replacements:

- A catalog row whose stored quest bytes differ from this package.
- A lesson file in `lesson-src/` and on the live lessons site whose bytes differ.

Prediction-bank files and quest-asset files stay immutable. A different hash there is still a collision. A catalog id that already appears more than once is still an error.

## `--allow-external-lessons`

Passed through to `quest-package.py verify` and, on a v1 production deploy, to `gated-deploy-package.sh`. A missing lesson id becomes a warning so a package can extend lessons already on the live catalog. The bucket upload still requires that id to be in the catalog already. A v2 package exits with `v2 publisher does not support external lessons`.

## `--source`

The id must match `[a-z0-9][a-z0-9-]*`. The Warmer Sun helper reads `scripts/quest-sources.json`. The ids shipped there are:

| Id | Quest directory |
| --- | --- |
| `spotlights` | `future-forge/quests` in the Warmer Sun checkout. This is the default. |
| `solved-today` | `~/dev/ff-solved-today/quests` |
| `learn-daily` | `~/dev/ff-learn-daily/quests` |

For any source other than `spotlights`, images land in that source's directory, and the tile is added to that content repo's catalog by its own change. Quest JSON cites `https://warmersun.com/quests/<source>/assets/`. The v1 lesson check after deploy compares published HTML with that same asset root.

A v2 deploy accepts a missing `--source` or `--source spotlights`. Any other id exits with `v2 does not support --source`. V2 asset URLs are revision-scoped under `https://warmersun.com/quests/spotlights/assets/<package-id>/<revision>/`.

## `--plan-dir`

V2 with `--dry-run` only. A v1 package, and a v2 deploy without `--dry-run`, exit before publication. The path must not exist, including as a symlink. The script creates the directory and copies the plan into it. `umask 077` applies, because the plan contains quest text. The copy is local. Nothing is published.

## `--package-adapter`

The header comment still lists this flag. The script resolves the path with `realpath`, so the file has to exist, and then rejects it:

- A v1 package exits with `--package-adapter is only supported for v2`.
- A v2 production deploy exits with `--package-adapter is not supported for v2 loose publication`.
- A v2 `--dry-run` keeps the path and does not pass it to the publisher.

Live v2 publication uses the loose publisher in this repo. It does not take an adapter module.

## Version limits

The manifest `version` must be `1` or `2`.

A v2 production deploy also refuses a quest whose `kind` is `module`, and it requires `https://cloud.warmersun.com/api/health` to report `ok`, service `portal`, and feature `looseQuestV2`. That check does not prove an authenticated play-through. The portal that serves loose quests has to be deployed before this check can pass.

## Environment

| Variable | Default | Role |
| --- | --- | --- |
| `FF_REPO` | The directory that contains `deploy-quest.sh` | Future Forge checkout. Must contain `scripts/quest-package.py`. Exported for the publishers. |
| `WARMERSUN_DIR` | `FF_WARMERSUN_DIR`, then `~/dev/warmersun` | Warmer Sun checkout. Must contain an executable `scripts/gated-deploy-package.sh`. |

V2 publication reads object-storage credentials from `FF_REPO/.env.portal`, then from `.env.object-storage.local` when that file exists. The script does not print those values. It refuses a bucket other than production `quests` on the main-branch endpoint.

## Examples

Confirm and deploy a v1 spotlight package:

```sh
./deploy-quest.sh output/quests/example.ffquest
```

Deploy a Solved Today package without a prompt, replacing landed lesson files:

```sh
./deploy-quest.sh ~/dev/ff-solved-today/packages/example.ffquest --source solved-today --force --yes
```

Check a package without publishing:

```sh
./deploy-quest.sh path/to/out.ffquest --dry-run
```

Save a v2 plan locally:

```sh
./deploy-quest.sh path/to/out.ffquest --dry-run --plan-dir "$HOME/plans/out"
```

## What a successful production run checks

A v1 run publishes first, then fetches every `lessons/` file in the package from `https://warmersun.com/` and compares it with the unpacked projection. HTML may contain the public lesson root and the source asset root in place of package paths, and here.now may insert its social meta tags. Markdown may be served as that site's HTML viewer when the original text is still in the page. The script does not re-read the Neon catalog after the v1 upload. It prints `Neon upload returned success; exact object/catalog readback was not performed.`

A v2 run checks the live bytes of prediction banks, lessons, and quest assets, then the loose publisher checks the stored object and the catalog row. It prints `V2 publisher verified immutable object and catalog readback.`

If a public-byte check fails, the script stops. Files already patched in that run can already be on the site.
