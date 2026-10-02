#!/usr/bin/env bash
# Issue or update a collector card and print its public URL.
#   ./scripts/issue-collector-card.sh cards/examples/drones-urban-delivery.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec node scripts/issue-collector-card.mjs "$@"
