#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOD_DIR="$ROOT_DIR/src/modulos"

if command -v rg >/dev/null 2>&1; then
  SEARCH_BIN="rg"
else
  SEARCH_BIN="grep"
fi

fail=0

for mod_path in "$MOD_DIR"/*; do
  [[ -d "$mod_path" ]] || continue
  mod_name="$(basename "$mod_path")"

  for required in "$mod_name.routes.ts" "$mod_name.controller.ts" "$mod_name.service.ts" "$mod_name.schema.ts"; do
    if [[ ! -f "$mod_path/$required" ]]; then
      echo "[ERROR] Modulo $mod_name sin archivo requerido: $required"
      fail=1
    fi
  done

  # Guard rail: evitar acceso directo a prisma desde controllers
  if "$SEARCH_BIN" -nE "from '../../config/database'|from \"../../config/database\"" "$mod_path/$mod_name.controller.ts" >/dev/null 2>&1; then
    echo "[ERROR] Controller $mod_name.controller.ts importa prisma directo (rompe capas)."
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "\nArquitectura invalida: revisar errores anteriores."
  exit 1
fi

echo "Arquitectura valida: capas por modulo OK."
