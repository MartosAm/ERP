#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
DB_USER="${DB_USER:-erp_user}"
DB_NAME="${DB_NAME:-ERP_db}"
PG_CONTAINER="${PG_CONTAINER:-$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres)}"

if [[ -z "$PG_CONTAINER" ]]; then
  echo "No se pudo resolver contenedor de postgres."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
OUT_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Generando backup de $DB_NAME en $OUT_FILE"
docker exec -e PGPASSWORD="${DB_PASSWORD:-}" "$PG_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --clean --if-exists \
  | gzip > "$OUT_FILE"

if [[ ! -s "$OUT_FILE" ]]; then
  echo "Backup vacio o fallido."
  exit 1
fi

echo "Backup completado: $OUT_FILE"
