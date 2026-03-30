#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-http://localhost:3001}}"
LOGIN_EMAIL="${SMOKE_LOGIN_EMAIL:-admin@minegocio.com}"
LOGIN_PASSWORD="${SMOKE_LOGIN_PASSWORD:-Admin12345}"
SMOKE_CAJA_ID="${SMOKE_CAJA_ID:-}"
SMOKE_PRODUCTO_ID="${SMOKE_PRODUCTO_ID:-}"
SMOKE_CANTIDAD="${SMOKE_CANTIDAD:-1}"

TMP_DIR="$(mktemp -d)"
LAST_HEADERS_FILE=""
LAST_BODY_FILE=""

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

json_get() {
  local file_path="$1"
  local json_path="$2"

  node - "$file_path" "$json_path" <<'NODE'
const fs = require('fs');

const filePath = process.argv[2];
const path = process.argv[3];
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function resolvePath(input, dottedPath) {
  const tokens = dottedPath.split('.').filter(Boolean);
  let current = input;

  for (const token of tokens) {
    const arrayMatch = token.match(/^([A-Za-z0-9_]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = Number(arrayMatch[2]);
      current = current?.[key]?.[index];
      continue;
    }
    current = current?.[token];
  }

  return current;
}

const value = resolvePath(data, path);
if (value === undefined || value === null || value === '') {
  process.exit(2);
}

if (typeof value === 'object') {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
NODE
}

json_get_optional() {
  local file_path="$1"
  local json_path="$2"

  if value="$(json_get "$file_path" "$json_path" 2>/dev/null)"; then
    printf '%s' "$value"
    return 0
  fi

  printf ''
}

check_header() {
  local header_file="$1"
  local header_name="$2"

  if grep -qi "^${header_name}:" "$header_file"; then
    echo "[OK] header ${header_name} presente"
    return 0
  fi

  echo "[ERROR] Falta header ${header_name}"
  cat "$header_file" || true
  return 1
}

request() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local body="${5:-}"
  local token="${6:-}"
  local idempotency_key="${7:-}"

  local safe_name
  safe_name="$(echo "$name" | tr ' /' '__')"
  local headers_file="$TMP_DIR/${safe_name}.headers"
  local body_file="$TMP_DIR/${safe_name}.body"

  local -a curl_args
  curl_args=(
    -sS
    -X "$method"
    -D "$headers_file"
    -o "$body_file"
    -w "%{http_code}"
    "$url"
  )

  if [[ -n "$token" ]]; then
    curl_args+=( -H "Authorization: Bearer ${token}" )
  fi

  if [[ -n "$idempotency_key" ]]; then
    curl_args+=( -H "X-Idempotency-Key: ${idempotency_key}" )
  fi

  if [[ -n "$body" ]]; then
    curl_args+=( -H "Content-Type: application/json" --data "$body" )
  fi

  local status
  status="$(curl "${curl_args[@]}" || true)"

  LAST_HEADERS_FILE="$headers_file"
  LAST_BODY_FILE="$body_file"

  if [[ "$status" != "$expected_status" ]]; then
    echo "[ERROR] ${name}: HTTP ${status} (esperado ${expected_status})"
    echo "[ERROR] URL: ${url}"
    echo "[ERROR] Body de respuesta:"
    cat "$body_file" || true
    return 1
  fi

  echo "[OK] ${name}: HTTP ${status}"
}

echo "Ejecutando smoke extendido contra ${BASE_URL}"

request "health" GET "${BASE_URL}/api/health" 200
check_header "$LAST_HEADERS_FILE" "x-request-id"
check_header "$LAST_HEADERS_FILE" "x-content-type-options"
check_header "$LAST_HEADERS_FILE" "x-response-time"

request "readiness" GET "${BASE_URL}/api/health/ready" 200

login_body=$(cat <<JSON
{"correo":"${LOGIN_EMAIL}","contrasena":"${LOGIN_PASSWORD}"}
JSON
)
request "login" POST "${BASE_URL}/api/v1/auth/login" 200 "$login_body"

TOKEN="$(json_get "$LAST_BODY_FILE" "datos.token")"
if [[ ${#TOKEN} -lt 20 ]]; then
  echo "[ERROR] Token JWT invalido en respuesta de login"
  exit 1
fi
echo "[OK] login devuelve token JWT"

request "perfil autenticado" GET "${BASE_URL}/api/v1/auth/perfil" 200 "" "$TOKEN"

request "productos paginados" GET "${BASE_URL}/api/v1/productos?pagina=1&limite=5" 200 "" "$TOKEN"
PRODUCTO_ID="${SMOKE_PRODUCTO_ID}"

if [[ -z "$PRODUCTO_ID" ]]; then
  PRODUCTO_ID="$(json_get_optional "$LAST_BODY_FILE" "datos[0].id")"
fi

if [[ -z "$PRODUCTO_ID" ]]; then
  echo "[ERROR] No se encontro producto para prueba POS. Define SMOKE_PRODUCTO_ID."
  exit 1
fi

PRECIO_UNITARIO="$(json_get_optional "$LAST_BODY_FILE" "datos[0].precioVenta1")"
if [[ -z "$PRECIO_UNITARIO" ]]; then
  PRECIO_UNITARIO="1"
fi

request "turno activo" GET "${BASE_URL}/api/v1/turnos-caja/activo" 200 "" "$TOKEN"
TURNO_ID="$(json_get_optional "$LAST_BODY_FILE" "datos.id")"

if [[ -z "$TURNO_ID" ]]; then
  if [[ -z "$SMOKE_CAJA_ID" ]]; then
    echo "[ERROR] No hay turno activo y falta SMOKE_CAJA_ID para abrir turno."
    exit 1
  fi

  abrir_turno_body=$(cat <<JSON
{"cajaRegistradoraId":"${SMOKE_CAJA_ID}","montoApertura":500}
JSON
)

  request "abrir turno" POST "${BASE_URL}/api/v1/turnos-caja/abrir" 201 "$abrir_turno_body" "$TOKEN"
  TURNO_ID="$(json_get "$LAST_BODY_FILE" "datos.id")"
fi

if [[ -z "$TURNO_ID" ]]; then
  echo "[ERROR] No se pudo obtener un turno activo para crear orden POS"
  exit 1
fi

IDEMPOTENCY_KEY="smoke-pos-$(date +%s)-${RANDOM}"
crear_orden_body=$(cat <<JSON
{"detalles":[{"productoId":"${PRODUCTO_ID}","cantidad":${SMOKE_CANTIDAD},"precioUnitario":${PRECIO_UNITARIO},"descuento":0}],"pagos":[{"metodo":"EFECTIVO","monto":${PRECIO_UNITARIO}}],"notas":"Smoke post deploy Fase 7"}
JSON
)

request "crear orden POS" POST "${BASE_URL}/api/v1/ordenes" 201 "$crear_orden_body" "$TOKEN" "$IDEMPOTENCY_KEY"
ORDEN_ID="$(json_get "$LAST_BODY_FILE" "datos.id")"

if [[ -z "$ORDEN_ID" ]]; then
  echo "[ERROR] La orden se creo sin id en respuesta"
  exit 1
fi

echo "[OK] orden POS creada: ${ORDEN_ID}"
echo "Smoke test extendido post deploy: OK"
