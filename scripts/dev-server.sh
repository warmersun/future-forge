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

# Local game server: developer UI, AI search, remote Quests from warmersun.com.
# Extra args are passed through, e.g. ./scripts/dev-server.sh --usage
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${FF_QUESTS_REMOTE_URL:=https://warmersun.com/quests/catalog.json}"
export FF_QUESTS_REMOTE_URL

# Use authoritative Cloud gates when accounts are configured. FF_PORTAL_QUESTS=0
# (including in .env) explicitly keeps the self-hosted/local catalog instead.
exec node server.mjs --developer --ai-search --portal-quests "$@"
