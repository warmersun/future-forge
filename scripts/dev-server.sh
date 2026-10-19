#!/usr/bin/env bash
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
