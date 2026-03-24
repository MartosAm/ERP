#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BASE_URL="${1:-http://localhost}"
HEALTH_PATH="/api/health"
READY_PATH="/api/health/ready"

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  local status
  status="$(curl -sS -o /tmp/erp_smoke_body.$$ -w "%{http_code}" "$url" || true)"

  if [[ "$status" != "$expected" ]]; then
    echo "[ERROR] $name devolvio HTTP $status (esperado $expected): $url"
    cat /tmp/erp_smoke_body.$$ || true
    rm -f /tmp/erp_smoke_body.$$ || true
    return 1
  fi

  echo "[OK] $name HTTP $status"
  rm -f /tmp/erp_smoke_body.$$ || true
}

echo "Ejecutando smoke test contra $BASE_URL"
check_endpoint "health" "$BASE_URL$HEALTH_PATH" 200
check_endpoint "readiness" "$BASE_URL$READY_PATH" 200

# Debe responder 401 sin token para validar que auth no este abierto
check_endpoint "auth protegido" "$BASE_URL/api/v1/auth/me" 401

echo "Smoke test post deploy: OK"
