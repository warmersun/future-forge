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

cd "$ROOT"
export FF_CONTENT_DIR="$DEST"
export FF_QUESTS_DIR="$DEST/quests"
export FF_PORT="$PORT"
: "${FF_QUESTS_REMOTE_URL:=https://warmersun.com/quests/catalog.json}"
export FF_QUESTS_REMOTE_URL

echo "Sideloaded $(basename "$PKG")"
echo "  Library quests: $DEST/quests"
echo "  Lessons: http://127.0.0.1:${PORT}/content/"
echo "  Open:    http://127.0.0.1:${PORT}/"
node server.mjs --developer --ai-search "$@"
