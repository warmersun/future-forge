---
name: future-forge-publish-quest
license: MIT
description: >
  Publish a Future Forge quest tile into the private Neon object-store catalog
  the portal serves. Use when asked to publish a quest, ship it to the hosted
  catalog, or put it on the object store.
---

# Publish a quest to the object store

The hosted catalog is the private `quests` bucket. The portal serves that bucket or the public website, not a merge of the two. This command upserts tiles into the bucket. It does not update warmersun.com. Lesson HTML is not part of this upload.

From the game repo. When the user has not already asked to publish, run the dry run and show its summary. Upload only after they ask.

```bash
npm run publish:quest -- <quest.json | dir> [--access open|account|paid] [--dry-run] [--skip-economy]
```

- One tile JSON, several paths, or a directory of `*.json` tiles. `catalog.json` in a directory is not a tile.
- The command reads the live `catalog.json`, adds or replaces those ids, and leaves every other entry. It does not delete objects. `file` is `<id>.json` at the bucket root, under `FF_QUESTS_OBJECT_PREFIX` when that is set.
- Do not assemble a one-quest `catalog.json` and upload that over the live catalog. `scripts/publish-quests-object-storage.mjs` no longer uploads.
- A `kind: "module"` wrapper's lessons must be in this same command, or already in the bucket. Otherwise the command stops before upload.
- Set `access` on the tile, or pass `--access`. The flag is written onto the uploaded JSON only. Unset on a learning module means `account`. `paid` needs the Cloud plan unless the tile is sponsored or `entitlement` is `catalog.free`. `open` is readable unsigned.
- The command parses and validates every file, runs the same craft lint as `npm run validate:quest -- --strict`, and fails on any warning. A `kind: "quest"` tile must have economy verdict `challenging`. A module wrapper skips the lab. `--skip-economy` skips only the lab.
- `--dry-run` prints each id added or updated, the access the portal will enforce, and the resulting catalog count, then uploads nothing. It still reads the live catalog, so it needs credentials.
- Load order is the process environment, then `.env.object-storage.local`, then `.env.portal`. The bucket is `FF_QUESTS_BUCKET` or `quests`. If `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, or `AWS_SECRET_ACCESS_KEY` is missing, stop. Do not print secrets. Do not fetch the public catalog as a fallback. A missing `catalog.json` starts empty. Invalid catalog JSON stops the upload.

Authoring stays in `skills/future-forge-quest`.
