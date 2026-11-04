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

# Run Future Forge locally (port 8765) against a warmersun.com staging build
# instead of live: modules, lessons, and spotlights all come from
# https://warmersun.com/staging/<token>/quests/catalog.json.
#
# Usage:
#   npm run staging -- <token>
#   ./scripts/run-staging.sh <token|https://warmersun.com/staging/<token>/> [server args]
#
# Fails before starting the server if the staging catalog is missing or broken.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARG="${1:-}"
if [[ -z "$ARG" || "$ARG" == "--help" || "$ARG" == "-h" ]]; then
  sed -n '2,10p' "$0"
  [[ -z "$ARG" ]] && exit 1 || exit 0
fi
shift

BASE="$(node --input-type=module -e '
import { stagingBaseFromArg } from "./js/content-base.mjs";
try { console.log(stagingBaseFromArg(process.argv[1])); }
catch (e) { console.error("error: " + e.message); process.exit(1); }
' "$ARG")"

# One base drives every remote content catalog. Clear per-catalog overrides
# (shell or .env) so nothing silently falls back to live.
export FF_CONTENT_BASE_URL="$BASE"
unset FF_QUESTS_REMOTE_URL FF_TRENDS_REMOTE_URL

node scripts/check-staging.mjs "$BASE"

# Trends are optional in a staging build. If the build has none, use live
# trends so the app still has its capability charts, and say so.
TRENDS_URL="${BASE}trends/catalog.json"
if node -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))' "$TRENDS_URL"; then
  echo "Trends:         $TRENDS_URL"
else
  export FF_TRENDS_REMOTE_URL="https://warmersun.com/trends/catalog.json"
  echo "Trends:         none in this staging build, using live $FF_TRENDS_REMOTE_URL"
fi
# Explicit env = no fallback to live quests if staging goes away mid-session.
export FF_QUESTS_REMOTE_URL="${BASE}quests/catalog.json"
export FF_PORT="${FF_PORT:-8765}"

echo "Open:           http://127.0.0.1:${FF_PORT}/"
exec node server.mjs --developer "$@"
