#!/usr/bin/env bash
# Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon
#
# This file is part of Future Forge.
#
# Future Forge is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Future Forge is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Future Forge. If not, see <https://www.gnu.org/licenses/>.

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
# The manifest id is the tile the deep link resolves to: the module wrapper for a
# module package, otherwise the single quest. Print it so a sideload opens on the
# quest itself rather than the Library root.
QUEST_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("id",""))' "$PACKAGE_ROOT/manifest.json" 2>/dev/null || true)"
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
if [[ -n "$QUEST_ID" ]]; then
  echo "  Quest:   http://127.0.0.1:${PORT}/?q=${QUEST_ID}"
fi
node server.mjs --developer --ai-search "$@"
