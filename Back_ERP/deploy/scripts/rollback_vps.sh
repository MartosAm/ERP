#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "Uso: ./deploy/scripts/rollback_vps.sh <commit_sha>"
  exit 1
fi

TARGET_SHA="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Falta .env en Back_ERP."
  exit 1
fi

echo "Validando commit $TARGET_SHA..."
git cat-file -e "$TARGET_SHA^{commit}"

echo "Checkout commit objetivo..."
git checkout "$TARGET_SHA"

echo "Reconstruyendo stack prod..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "Validando health..."
for i in {1..30}; do
  if curl -fsS http://localhost/api/health >/dev/null; then
    bash ./deploy/scripts/post_deploy_smoke.sh http://localhost
    echo "Rollback OK"
    exit 0
  fi
  sleep 2
done

echo "Rollback no logro health OK."
exit 1
