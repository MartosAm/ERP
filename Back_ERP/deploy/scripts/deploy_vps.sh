#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Falta .env. Copia env.prod.template a .env y configura secretos."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no esta instalado en el VPS."
  exit 1
fi

echo "[1/4] Pull de cambios..."
git pull --ff-only

echo "[2/4] Build y despliegue compose prod..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "[3/4] Esperando health endpoint..."
for i in {1..30}; do
  if curl -fsS http://localhost/api/health >/dev/null; then
    echo "Health OK"
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    echo "Health check fallo tras despliegue."
    exit 1
  fi
done

echo "[4/4] Estado de servicios"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo "Smoke test post deploy..."
bash ./deploy/scripts/post_deploy_smoke.sh http://localhost

echo "Deploy VPS completado."
