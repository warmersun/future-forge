#!/usr/bin/env bash
# Unpack one .ffquest into a temp folder and start Future Forge in developer mode.
# The package quests are the Library. Lesson pages are at /content/.
#
# Usage:
#   ./scripts/sideload-local-package.sh path/to/quest.ffquest
#
# Extra args are passed to the server, as with scripts/dev-server.sh.
# Stop the server and the temp folder is removed.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="${1:-}"
if [[ -z "$PKG" || "$PKG" == "--help" || "$PKG" == "-h" ]]; then
  sed -n '2,8p' "$0"
  exit 0
fi
shift
if [[ ! -f "$PKG" ]]; then
  echo "error: package not found: $PKG" >&2
  exit 1
fi

PORT="${FF_PORT:-8765}"
DEST="$(mktemp -d "${TMPDIR:-/tmp}/ffquest.XXXXXX")"
cleanup() { rm -rf "$DEST"; }
trap cleanup EXIT

python3 "$ROOT/scripts/quest-package.py" unpack "$PKG" "$DEST" \
  --lesson-root "http://127.0.0.1:${PORT}/content/lessons/" \
  --asset-root "http://127.0.0.1:${PORT}/content/assets/"

PACKAGE_ROOT="$DEST"
if [[ -f "$DEST/raw/manifest.json" ]]; then
  PACKAGE_ROOT="$DEST/raw"
fi

cd "$ROOT"
export FF_CONTENT_DIR="$DEST"
export FF_QUESTS_DIR="$DEST/quests"
if [[ ! -d "$FF_QUESTS_DIR" && -d "$PACKAGE_ROOT/quests" ]]; then
  export FF_QUESTS_DIR="$PACKAGE_ROOT/quests"
fi
if [[ -f "$DEST/raw/manifest.json" ]]; then
  export FF_QUEST_PACKAGES_DIR="$DEST"
else
  unset FF_QUEST_PACKAGES_DIR
fi
export FF_PORT="$PORT"
# v2 owns its calendar; v1 intentionally retains a developer-configured bank.
PACKAGE_VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$PACKAGE_ROOT/manifest.json")"
if [[ "$PACKAGE_VERSION" == "2" ]]; then
  unset FF_PREDICTIONS_FILE
fi
: "${FF_QUESTS_REMOTE_URL:=https://warmersun.com/quests/catalog.json}"
export FF_QUESTS_REMOTE_URL

echo "Sideloaded $(basename "$PKG")"
echo "  Library quests: $FF_QUESTS_DIR"
echo "  Package release: $PACKAGE_ROOT"
echo "  Lessons: http://127.0.0.1:${PORT}/content/"
echo "  Open:    http://127.0.0.1:${PORT}/"
node server.mjs --developer --ai-search "$@"
