#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "Uso: ./deploy/scripts/restore_postgres.sh <archivo_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe archivo de backup: $BACKUP_FILE"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_USER="${DB_USER:-erp_user}"
DB_NAME="${DB_NAME:-ERP_db}"
PG_CONTAINER="${PG_CONTAINER:-$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -q postgres)}"

if [[ -z "$PG_CONTAINER" ]]; then
  echo "No se pudo resolver contenedor de postgres."
  exit 1
fi

echo "Restaurando backup $BACKUP_FILE en base $DB_NAME"
gunzip -c "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="${DB_PASSWORD:-}" "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "Restore completado. Ejecuta smoke test y validacion funcional antes de abrir trafico."
