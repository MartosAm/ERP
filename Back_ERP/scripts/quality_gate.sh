#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/verify_architecture.sh
npm run typecheck
npm run test -- --runInBand
npm run build

echo "Quality gate backend: OK"
