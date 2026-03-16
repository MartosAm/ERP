#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no esta instalado."
  exit 1
fi

echo "[1/3] Pull de cambios..."
git pull --ff-only

echo "[2/3] Build y despliegue frontend..."
docker compose up -d --build

echo "[3/3] Estado servicio frontend"
docker compose ps

echo "Deploy frontend completado."
