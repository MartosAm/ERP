#!/bin/bash
# ============================================================
# TEST COMPLETO DEL FLUJO ERP/POS - Script automatizado
# Simula un día laboral completo de una PyME
# ============================================================
set -e

BASE="http://localhost:3001/api/v1"
PASS=0
FAIL=0
TOTAL=0

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

check() {
  TOTAL=$((TOTAL + 1))
  local desc="$1"
  local expected_status="$2"
  local method="$3"
  local url="$4"
  local token="$5"
  local body="$6"

  local args=(-s -w "\n%{http_code}" -X "$method" "$url")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]] && args+=(-H "Content-Type: application/json" -d "$body")

  local response
  response=$(curl "${args[@]}" 2>&1)
  local http_code
  http_code=$(echo "$response" | tail -1)
  local resp_body
  resp_body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "$expected_status" ]]; then
    PASS=$((PASS + 1))
    printf "${GREEN}✓${NC} [%s] %s\n" "$http_code" "$desc"
  else
    FAIL=$((FAIL + 1))
    printf "${RED}✗${NC} [%s esperado:%s] %s\n" "$http_code" "$expected_status" "$desc"
    echo "  Response: $(echo "$resp_body" | head -c 200)"
  fi

  # Return body for extraction
  echo "$resp_body" > /tmp/erp_last_response.json
}

extract() {
  python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" < /tmp/erp_last_response.json 2>/dev/null
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        TEST COMPLETO ERP/POS - Flujo de un Día Laboral     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ==================== FASE 1: AUTENTICACION ====================
printf "${CYAN}━━━ FASE 1: AUTENTICACIÓN Y SESIÓN ━━━${NC}\n"

check "Login ADMIN" 200 POST "$BASE/auth/login" "" \
  '{"correo":"admin@minegocio.com","contrasena":"Admin12345"}'
TOKEN_ADMIN=$(extract "d['datos']['token']")

check "Perfil ADMIN" 200 GET "$BASE/auth/perfil" "$TOKEN_ADMIN"

check "Login CAJERO" 200 POST "$BASE/auth/login" "" \
  '{"correo":"cajero@minegocio.com","contrasena":"Cajero12345"}'
TOKEN_CAJERO=$(extract "d['datos']['token']")
CAJERO_ID=$(extract "d['datos']['usuario']['id']")

check "Login con credenciales invalidas (seguridad)" 401 POST "$BASE/auth/login" "" \
  '{"correo":"admin@minegocio.com","contrasena":"MalPassword1"}'

# Registrar repartidor (si no existe ya, el endpoint dará 409, lo capturamos)
curl -s -X POST "$BASE/auth/registro" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Repartidor Flujo","correo":"rep.flujo@minegocio.com","contrasena":"RepFlujo1234","rol":"REPARTIDOR","telefono":"5550001111","horarioInicio":"00:00","horarioFin":"23:59","diasLaborales":[0,1,2,3,4,5,6]}' \
  > /tmp/erp_last_response.json 2>&1

check "Login REPARTIDOR" 200 POST "$BASE/auth/login" "" \
  '{"correo":"rep.flujo@minegocio.com","contrasena":"RepFlujo1234"}'
TOKEN_REPARTIDOR=$(extract "d['datos']['token']")
REPARTIDOR_ID=$(extract "d['datos']['usuario']['id']")

echo ""

# ==================== FASE 2: CONFIG INICIAL ====================
printf "${CYAN}━━━ FASE 2: CATÁLOGOS Y CONFIGURACIÓN ━━━${NC}\n"

check "Crear categoría: Abarrotes" 201 POST "$BASE/categorias" "$TOKEN_ADMIN" \
  '{"nombre":"Abarrotes Test","descripcion":"Productos de consumo","colorHex":"#FF6B35","orden":1}'
CAT_ABARROTES=$(extract "d['datos']['id']")

check "Crear categoría: Bebidas" 201 POST "$BASE/categorias" "$TOKEN_ADMIN" \
  '{"nombre":"Bebidas Test","descripcion":"Refrescos, jugos, agua","colorHex":"#2196F3","orden":2}'
CAT_BEBIDAS=$(extract "d['datos']['id']")

check "Crear subcategoría: Refrescos" 201 POST "$BASE/categorias" "$TOKEN_ADMIN" \
  "{\"nombre\":\"Refrescos Test\",\"padreId\":\"$CAT_BEBIDAS\",\"colorHex\":\"#03A9F4\",\"orden\":1}"
CAT_REFRESCOS=$(extract "d['datos']['id']")

check "Crear categoría: Limpieza" 201 POST "$BASE/categorias" "$TOKEN_ADMIN" \
  '{"nombre":"Limpieza Test","descripcion":"Productos de limpieza","colorHex":"#4CAF50","orden":3}'
CAT_LIMPIEZA=$(extract "d['datos']['id']")

check "Listar categorías (4 creadas)" 200 GET "$BASE/categorias" "$TOKEN_ADMIN"

check "Árbol jerárquico de categorías" 200 GET "$BASE/categorias/arbol" "$TOKEN_ADMIN"

check "Detalle categoría Bebidas" 200 GET "$BASE/categorias/$CAT_BEBIDAS" "$TOKEN_ADMIN"

check "Nombre duplicado rechazado (409)" 409 POST "$BASE/categorias" "$TOKEN_ADMIN" \
  '{"nombre":"Abarrotes Test"}'

check "Crear proveedor: Distribuidora" 201 POST "$BASE/proveedores" "$TOKEN_ADMIN" \
  '{"nombre":"Distribuidora Test SA","nombreContacto":"Carlos","telefono":"5551234567","correo":"ventas@dist.com","rfc":"DTS201115AB3"}'
PROV_1=$(extract "d['datos']['id']")

check "Crear proveedor: Bebidas Centro" 201 POST "$BASE/proveedores" "$TOKEN_ADMIN" \
  '{"nombre":"Bebidas Centro Test","nombreContacto":"Maria","telefono":"5559876543","correo":"pedidos@beb.com"}'
PROV_2=$(extract "d['datos']['id']")

check "Listar proveedores" 200 GET "$BASE/proveedores" "$TOKEN_ADMIN"

check "Listar almacenes" 200 GET "$BASE/almacenes" "$TOKEN_ADMIN"
ALMACEN_PRINCIPAL=$(extract "d['datos'][0]['id']")

check "Crear almacén secundario" 201 POST "$BASE/almacenes" "$TOKEN_ADMIN" \
  '{"nombre":"Sucursal Norte Test","direccion":"Blvd. Norte #321"}'
ALMACEN_SEC=$(extract "d['datos']['id']")

echo ""

# ==================== FASE 3: PRODUCTOS ====================
printf "${CYAN}━━━ FASE 3: CATÁLOGO DE PRODUCTOS ━━━${NC}\n"

TS=$(date +%s)
check "Crear producto: Arroz 1kg" 201 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"ABR-T$TS-1\",\"codigoBarras\":\"75${TS}01\",\"nombre\":\"Arroz Test 1kg\",\"marca\":\"La Perla\",\"categoriaId\":\"$CAT_ABARROTES\",\"proveedorId\":\"$PROV_1\",\"tipoUnidad\":\"PIEZA\",\"etiquetaUnidad\":\"pza\",\"precioCosto\":18.50,\"precioVenta1\":28.00,\"precioVenta2\":25.00,\"impuestoIncluido\":true,\"rastrearInventario\":true,\"stockMinimo\":10,\"stockMaximo\":200,\"destacado\":true}"
PROD_1=$(extract "d['datos']['id']")

check "Crear producto: Frijol 1kg" 201 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"ABR-T$TS-2\",\"codigoBarras\":\"75${TS}02\",\"nombre\":\"Frijol Test 1kg\",\"marca\":\"San Juan\",\"categoriaId\":\"$CAT_ABARROTES\",\"proveedorId\":\"$PROV_1\",\"tipoUnidad\":\"PIEZA\",\"etiquetaUnidad\":\"pza\",\"precioCosto\":22.00,\"precioVenta1\":35.00,\"impuestoIncluido\":true,\"rastrearInventario\":true,\"stockMinimo\":8}"
PROD_2=$(extract "d['datos']['id']")

check "Crear producto: Coca-Cola 600ml" 201 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"BEB-T$TS-1\",\"codigoBarras\":\"75${TS}03\",\"nombre\":\"Coca-Cola Test 600ml\",\"marca\":\"Coca-Cola\",\"categoriaId\":\"$CAT_REFRESCOS\",\"proveedorId\":\"$PROV_2\",\"tipoUnidad\":\"PIEZA\",\"etiquetaUnidad\":\"pza\",\"precioCosto\":8.00,\"precioVenta1\":18.00,\"impuestoIncluido\":true,\"rastrearInventario\":true,\"stockMinimo\":24,\"stockMaximo\":500,\"destacado\":true}"
PROD_3=$(extract "d['datos']['id']")

check "Crear producto: Cloro 1L" 201 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"LIM-T$TS-1\",\"codigoBarras\":\"75${TS}04\",\"nombre\":\"Cloro Test 1L\",\"marca\":\"Cloralex\",\"categoriaId\":\"$CAT_LIMPIEZA\",\"proveedorId\":\"$PROV_1\",\"tipoUnidad\":\"PIEZA\",\"etiquetaUnidad\":\"pza\",\"precioCosto\":12.00,\"precioVenta1\":22.00,\"impuestoIncluido\":true,\"rastrearInventario\":true,\"stockMinimo\":6}"
PROD_4=$(extract "d['datos']['id']")

check "Crear producto: Aceite 1L" 201 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"ABR-T$TS-3\",\"codigoBarras\":\"75${TS}05\",\"nombre\":\"Aceite Test 1L\",\"marca\":\"1-2-3\",\"categoriaId\":\"$CAT_ABARROTES\",\"proveedorId\":\"$PROV_1\",\"tipoUnidad\":\"LITRO\",\"etiquetaUnidad\":\"lt\",\"precioCosto\":28.00,\"precioVenta1\":42.00,\"impuestoIncluido\":true,\"rastrearInventario\":true,\"stockMinimo\":5}"
PROD_5=$(extract "d['datos']['id']")

check "Listar productos (ADMIN ve costos)" 200 GET "$BASE/productos" "$TOKEN_ADMIN"
check "Buscar por código de barras (scanner POS)" 200 GET "$BASE/productos/codigo/75${TS}01" "$TOKEN_CAJERO"
check "Buscar productos por nombre" 200 GET "$BASE/productos?buscar=coca" "$TOKEN_CAJERO"
check "SKU duplicado rechazado (409)" 409 POST "$BASE/productos" "$TOKEN_ADMIN" \
  "{\"sku\":\"ABR-T$TS-1\",\"nombre\":\"Duplicado\",\"precioCosto\":1,\"precioVenta1\":2}"

echo ""

# ==================== FASE 4: COMPRAS ====================
printf "${CYAN}━━━ FASE 4: COMPRAS A PROVEEDOR → INVENTARIO ━━━${NC}\n"

check "Crear compra a Distribuidora" 201 POST "$BASE/compras" "$TOKEN_ADMIN" \
  "{\"proveedorId\":\"$PROV_1\",\"numeroFactura\":\"FACT-TEST-001\",\"detalles\":[{\"productoId\":\"$PROD_1\",\"cantidad\":50,\"costoUnitario\":18.50},{\"productoId\":\"$PROD_2\",\"cantidad\":40,\"costoUnitario\":22.00},{\"productoId\":\"$PROD_4\",\"cantidad\":30,\"costoUnitario\":12.00},{\"productoId\":\"$PROD_5\",\"cantidad\":25,\"costoUnitario\":28.00}]}"
COMPRA_1=$(extract "d['datos']['id']")

check "Crear compra a Bebidas Centro" 201 POST "$BASE/compras" "$TOKEN_ADMIN" \
  "{\"proveedorId\":\"$PROV_2\",\"detalles\":[{\"productoId\":\"$PROD_3\",\"cantidad\":120,\"costoUnitario\":8.00}]}"
COMPRA_2=$(extract "d['datos']['id']")

check "Recibir compra 1 → ingreso inventario" 200 POST "$BASE/compras/$COMPRA_1/recibir" "$TOKEN_ADMIN" \
  "{\"almacenId\":\"$ALMACEN_PRINCIPAL\"}"

check "Recibir compra 2 → ingreso inventario" 200 POST "$BASE/compras/$COMPRA_2/recibir" "$TOKEN_ADMIN" \
  "{\"almacenId\":\"$ALMACEN_PRINCIPAL\"}"

check "Compra ya recibida rechazada (422)" 422 POST "$BASE/compras/$COMPRA_1/recibir" "$TOKEN_ADMIN" \
  "{\"almacenId\":\"$ALMACEN_PRINCIPAL\"}"

check "Existencias actualiz. (tiene stock)" 200 GET "$BASE/inventario/existencias" "$TOKEN_ADMIN"
check "Historial compras" 200 GET "$BASE/compras" "$TOKEN_ADMIN"
check "Detalle compra 1" 200 GET "$BASE/compras/$COMPRA_1" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 5: CLIENTES ====================
printf "${CYAN}━━━ FASE 5: CLIENTES CON CRÉDITO ━━━${NC}\n"

check "Crear cliente con crédito (Don Pedro)" 201 POST "$BASE/clientes" "$TOKEN_ADMIN" \
  '{"nombre":"Don Pedro Test","telefono":"5550011223","correo":"donpedro.test@correo.com","direccion":"Calle Hidalgo #45","limiteCredito":5000,"diasCredito":15}'
CLIENTE_1=$(extract "d['datos']['id']")

check "Crear cliente sin crédito" 201 POST "$BASE/clientes" "$TOKEN_ADMIN" \
  '{"nombre":"Maria Garcia Test","telefono":"5550099887","direccion":"Av. Juarez #123"}'
CLIENTE_2=$(extract "d['datos']['id']")

check "Listar clientes" 200 GET "$BASE/clientes" "$TOKEN_CAJERO"
check "Buscar por teléfono (POS rápido)" 200 GET "$BASE/clientes?buscar=5550011223" "$TOKEN_CAJERO"

echo ""

# ==================== FASE 6: TURNO DE CAJA ====================
printf "${CYAN}━━━ FASE 6: APERTURA DE TURNO DE CAJA ━━━${NC}\n"

# Obtener ID de la caja registradora desde la BD
CAJA_ID=$(PGPASSWORD=MAVF2002 psql -U postgres -h localhost -d ERP_db -t -c "SELECT id FROM cajas_registradoras LIMIT 1;" 2>/dev/null | tr -d ' \n')

check "Abrir turno de caja ($500)" 201 POST "$BASE/turnos-caja/abrir" "$TOKEN_CAJERO" \
  "{\"cajaRegistradoraId\":\"$CAJA_ID\",\"montoApertura\":500.00,\"notas\":\"Turno matutino test\"}"
TURNO_ID=$(extract "d['datos']['id']")

check "Turno duplicado rechazado (409)" 409 POST "$BASE/turnos-caja/abrir" "$TOKEN_CAJERO" \
  "{\"cajaRegistradoraId\":\"$CAJA_ID\",\"montoApertura\":500}"

check "Turno activo del cajero" 200 GET "$BASE/turnos-caja/activo" "$TOKEN_CAJERO"

echo ""

# ==================== FASE 7: VENTAS (CORE) ====================
printf "${CYAN}━━━ FASE 7: VENTAS POS — NÚCLEO DEL NEGOCIO ━━━${NC}\n"

check "VENTA 1: Efectivo (Arroz+Coca=$46, paga $50)" 201 POST "$BASE/ordenes" "$TOKEN_CAJERO" \
  "{\"detalles\":[{\"productoId\":\"$PROD_1\",\"cantidad\":1,\"precioUnitario\":28.00,\"descuento\":0},{\"productoId\":\"$PROD_3\",\"cantidad\":1,\"precioUnitario\":18.00,\"descuento\":0}],\"pagos\":[{\"metodo\":\"EFECTIVO\",\"monto\":50.00}]}"
ORDEN_1=$(extract "d['datos']['id']")

check "VENTA 2: Tarjeta débito ($138)" 201 POST "$BASE/ordenes" "$TOKEN_CAJERO" \
  "{\"detalles\":[{\"productoId\":\"$PROD_3\",\"cantidad\":3,\"precioUnitario\":18.00,\"descuento\":0},{\"productoId\":\"$PROD_5\",\"cantidad\":2,\"precioUnitario\":42.00,\"descuento\":0}],\"pagos\":[{\"metodo\":\"TARJETA_DEBITO\",\"monto\":138.00,\"referencia\":\"AUTH-7829384\"}]}"
ORDEN_2=$(extract "d['datos']['id']")

check "VENTA 3: Pago mixto ($410)" 201 POST "$BASE/ordenes" "$TOKEN_CAJERO" \
  "{\"clienteId\":\"$CLIENTE_2\",\"detalles\":[{\"productoId\":\"$PROD_1\",\"cantidad\":10,\"precioUnitario\":25.00,\"descuento\":0},{\"productoId\":\"$PROD_2\",\"cantidad\":5,\"precioUnitario\":32.00,\"descuento\":0}],\"pagos\":[{\"metodo\":\"EFECTIVO\",\"monto\":200.00},{\"metodo\":\"TRANSFERENCIA\",\"monto\":210.00,\"referencia\":\"SPEI-001\"}]}"
ORDEN_3=$(extract "d['datos']['id']")

check "VENTA 4: Crédito Don Pedro ($596)" 201 POST "$BASE/ordenes" "$TOKEN_CAJERO" \
  "{\"clienteId\":\"$CLIENTE_1\",\"detalles\":[{\"productoId\":\"$PROD_4\",\"cantidad\":5,\"precioUnitario\":22.00,\"descuento\":0},{\"productoId\":\"$PROD_3\",\"cantidad\":20,\"precioUnitario\":18.00,\"descuento\":0},{\"productoId\":\"$PROD_5\",\"cantidad\":3,\"precioUnitario\":42.00,\"descuento\":0}],\"pagos\":[{\"metodo\":\"CREDITO_CLIENTE\",\"monto\":596.00}],\"notas\":\"Pedido semanal Don Pedro\"}"
ORDEN_4=$(extract "d['datos']['id']")

check "VENTA 5: Con descuento ($50)" 201 POST "$BASE/ordenes" "$TOKEN_CAJERO" \
  "{\"detalles\":[{\"productoId\":\"$PROD_1\",\"cantidad\":2,\"precioUnitario\":28.00,\"descuento\":3.00}],\"pagos\":[{\"metodo\":\"EFECTIVO\",\"monto\":50.00}]}"
ORDEN_5=$(extract "d['datos']['id']")

check "Detalle orden 4 (crédito)" 200 GET "$BASE/ordenes/$ORDEN_4" "$TOKEN_CAJERO"
check "Listar órdenes del día" 200 GET "$BASE/ordenes" "$TOKEN_CAJERO"
check "Crédito utilizado Don Pedro" 200 GET "$BASE/clientes/$CLIENTE_1" "$TOKEN_ADMIN"

check "Venta sin turno abierto rechazada" 422 POST "$BASE/ordenes" "$TOKEN_ADMIN" \
  "{\"detalles\":[{\"productoId\":\"$PROD_1\",\"cantidad\":1,\"precioUnitario\":28,\"descuento\":0}],\"pagos\":[{\"metodo\":\"EFECTIVO\",\"monto\":28}]}"

echo ""

# ==================== FASE 8: CANCELACION ====================
printf "${CYAN}━━━ FASE 8: CANCELACIÓN (stock devuelto) ━━━${NC}\n"

check "Cancelar orden 5 (ADMIN)" 200 POST "$BASE/ordenes/$ORDEN_5/cancelar" "$TOKEN_ADMIN" \
  '{"motivoCancelacion":"Cliente se arrepintio"}'

check "Cancelar ya cancelada rechazada (422)" 422 POST "$BASE/ordenes/$ORDEN_5/cancelar" "$TOKEN_ADMIN" \
  '{"motivoCancelacion":"Intento duplicado"}'

check "Stock restaurado tras cancelación" 200 GET "$BASE/inventario/existencias?buscar=arroz" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 9: ENTREGAS ====================
printf "${CYAN}━━━ FASE 9: ENTREGAS A DOMICILIO ━━━${NC}\n"

check "Crear entrega para orden 4" 201 POST "$BASE/entregas" "$TOKEN_ADMIN" \
  "{\"ordenId\":\"$ORDEN_4\",\"asignadoAId\":\"$REPARTIDOR_ID\",\"direccionEntrega\":\"Calle Hidalgo #45 - Don Pedro\",\"notas\":\"Tocar timbre azul\"}"
ENTREGA_ID=$(extract "d['datos']['id']")

check "Mis entregas (repartidor)" 200 GET "$BASE/entregas/mis-entregas" "$TOKEN_REPARTIDOR"

check "Cambiar a EN_RUTA" 200 PATCH "$BASE/entregas/$ENTREGA_ID/estado" "$TOKEN_REPARTIDOR" \
  '{"estado":"EN_RUTA","notas":"Saliendo hacia destino"}'

check "Transición inválida rechazada" 400 PATCH "$BASE/entregas/$ENTREGA_ID/estado" "$TOKEN_REPARTIDOR" \
  '{"estado":"INVALIDO"}'

check "Cambiar a ENTREGADO" 200 PATCH "$BASE/entregas/$ENTREGA_ID/estado" "$TOKEN_REPARTIDOR" \
  '{"estado":"ENTREGADO","notas":"Entregado a Don Pedro"}'

check "Detalle entrega finalizada" 200 GET "$BASE/entregas/$ENTREGA_ID" "$TOKEN_ADMIN"
check "Listar entregas" 200 GET "$BASE/entregas" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 10: INVENTARIO MANUAL ====================
printf "${CYAN}━━━ FASE 10: MOVIMIENTOS DE INVENTARIO ━━━${NC}\n"

check "Merma: 2 Coca-Cola dañadas" 201 POST "$BASE/inventario/movimientos" "$TOKEN_ADMIN" \
  "{\"productoId\":\"$PROD_3\",\"almacenId\":\"$ALMACEN_PRINCIPAL\",\"tipoMovimiento\":\"SALIDA\",\"cantidad\":2,\"motivo\":\"Botellas dañadas\",\"referenciaTipo\":\"MERMA\"}"

check "Traslado: 10 Coca-Cola a sucursal" 201 POST "$BASE/inventario/movimientos" "$TOKEN_ADMIN" \
  "{\"productoId\":\"$PROD_3\",\"almacenId\":\"$ALMACEN_PRINCIPAL\",\"almacenDestinoId\":\"$ALMACEN_SEC\",\"tipoMovimiento\":\"TRASLADO\",\"cantidad\":10,\"motivo\":\"Surtir sucursal norte\"}"

check "Stock insuficiente rechazado" 422 POST "$BASE/inventario/movimientos" "$TOKEN_ADMIN" \
  "{\"productoId\":\"$PROD_3\",\"almacenId\":\"$ALMACEN_PRINCIPAL\",\"tipoMovimiento\":\"SALIDA\",\"cantidad\":99999,\"motivo\":\"Test rechazo\"}"

check "Existencias post-movimientos" 200 GET "$BASE/inventario/existencias" "$TOKEN_ADMIN"
check "Historial movimientos" 200 GET "$BASE/inventario/movimientos" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 11: USUARIOS ====================
printf "${CYAN}━━━ FASE 11: GESTIÓN DE USUARIOS ━━━${NC}\n"

check "Listar usuarios" 200 GET "$BASE/usuarios" "$TOKEN_ADMIN"

check "Asignar horario al cajero" 200 PUT "$BASE/usuarios/$CAJERO_ID/horario" "$TOKEN_ADMIN" \
  '{"horarioInicio":"00:00","horarioFin":"23:59","diasLaborales":[0,1,2,3,4,5,6]}'

check "Cambiar PIN cajero" 200 POST "$BASE/auth/cambiar-pin" "$TOKEN_ADMIN" \
  "{\"usuarioId\":\"$CAJERO_ID\",\"nuevoPin\":\"4567\"}"

echo ""

# ==================== FASE 12: CIERRE DE TURNO ====================
printf "${CYAN}━━━ FASE 12: CIERRE DE TURNO DE CAJA ━━━${NC}\n"

check "Cerrar turno (cajero contó $748)" 200 POST "$BASE/turnos-caja/$TURNO_ID/cerrar" "$TOKEN_CAJERO" \
  '{"montoCierre":748.00,"notas":"Cierre normal"}'

check "Turno ya cerrado rechazado" 422 POST "$BASE/turnos-caja/$TURNO_ID/cerrar" "$TOKEN_CAJERO" \
  '{"montoCierre":748.00}'

check "Detalle turno cerrado (auditoría)" 200 GET "$BASE/turnos-caja/$TURNO_ID" "$TOKEN_ADMIN"
check "Historial de turnos" 200 GET "$BASE/turnos-caja" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 13: REPORTES ====================
printf "${CYAN}━━━ FASE 13: REPORTES Y DASHBOARD (ADMIN) ━━━${NC}\n"

check "Dashboard KPIs tiempo real" 200 GET "$BASE/reportes/dashboard" "$TOKEN_ADMIN"
check "Reporte ventas del mes" 200 GET "$BASE/reportes/ventas?fechaDesde=2026-02-01&fechaHasta=2026-02-28" "$TOKEN_ADMIN"
check "Top productos vendidos" 200 GET "$BASE/reportes/top-productos?fechaDesde=2026-02-01&fechaHasta=2026-02-28&limite=10" "$TOKEN_ADMIN"
check "Métodos de pago desglose" 200 GET "$BASE/reportes/metodos-pago?fechaDesde=2026-02-01&fechaHasta=2026-02-28" "$TOKEN_ADMIN"
check "Inventario valorizado" 200 GET "$BASE/reportes/inventario" "$TOKEN_ADMIN"
check "Rendimiento cajeros" 200 GET "$BASE/reportes/cajeros?fechaDesde=2026-02-01&fechaHasta=2026-02-28" "$TOKEN_ADMIN"
check "Reporte entregas" 200 GET "$BASE/reportes/entregas?fechaDesde=2026-02-01&fechaHasta=2026-02-28" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 14: SEGURIDAD ====================
printf "${CYAN}━━━ FASE 14: PRUEBAS DE SEGURIDAD ━━━${NC}\n"

check "Sin token → 401" 401 GET "$BASE/productos" ""
check "Cajero crear categoría → 403" 403 POST "$BASE/categorias" "$TOKEN_CAJERO" \
  '{"nombre":"No autorizado"}'
check "Ruta no existe → 404" 404 GET "$BASE/ruta-inexistente" "$TOKEN_ADMIN"

echo ""

# ==================== FASE 15: LOGOUT ====================
printf "${CYAN}━━━ FASE 15: CIERRE DE SESIONES ━━━${NC}\n"

check "Logout cajero" 200 POST "$BASE/auth/logout" "$TOKEN_CAJERO"
check "Logout repartidor" 200 POST "$BASE/auth/logout" "$TOKEN_REPARTIDOR"
check "Token inválido post-logout" 401 GET "$BASE/auth/perfil" "$TOKEN_CAJERO"
check "Logout admin" 200 POST "$BASE/auth/logout" "$TOKEN_ADMIN"

echo ""

# ==================== RESUMEN ====================
echo "╔══════════════════════════════════════════════════════════╗"
printf "║  ${GREEN}PASARON: %d${NC}  |  ${RED}FALLARON: %d${NC}  |  TOTAL: %d            ║\n" "$PASS" "$FAIL" "$TOTAL"
echo "╚══════════════════════════════════════════════════════════╝"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  printf "${RED}⚠ Hay fallos que requieren revisión.${NC}\n"
  exit 1
else
  echo ""
  printf "${GREEN}✅ TODOS LOS TESTS PASARON — Backend listo para producción.${NC}\n"
  exit 0
fi
