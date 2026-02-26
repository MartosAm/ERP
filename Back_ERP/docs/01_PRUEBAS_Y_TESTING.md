# Pruebas y Testing del Backend ERP/POS

## Indice

1. [Estrategia general de pruebas](#estrategia-general-de-pruebas)
2. [Librerias utilizadas](#librerias-utilizadas)
3. [Suite de pruebas E2E (test-flujo-completo.sh)](#suite-de-pruebas-e2e)
4. [Como funciona el script de pruebas](#como-funciona-el-script-de-pruebas)
5. [Las 15 fases del flujo de prueba](#las-15-fases-del-flujo-de-prueba)
6. [Archivo HTTP para pruebas manuales](#archivo-http-para-pruebas-manuales)
7. [Pruebas unitarias con Jest](#pruebas-unitarias-con-jest)
8. [Como ejecutar las pruebas](#como-ejecutar-las-pruebas)
9. [Criterios de aceptacion](#criterios-de-aceptacion)

---

## Estrategia general de pruebas

El backend utiliza dos niveles de prueba complementarios:

**Nivel 1 -- Pruebas end-to-end (E2E):** Un script Bash automatizado que simula
un dia laboral completo de una PyME, desde que el admin abre sesion hasta que se
cierra el turno de caja. Ejecuta 87 llamadas HTTP reales contra el servidor en
ejecucion, validando codigos de respuesta, flujos de negocio encadenados y casos
de error esperados.

**Nivel 2 -- Pruebas unitarias (Jest + Supertest):** Infraestructura preparada
con Jest y Supertest para pruebas aisladas de servicios, controladores y
middlewares. Cada modulo puede tener archivos `.test.ts` o `.spec.ts` junto al
codigo fuente.

La razon de priorizar E2E es que un sistema ERP/POS tiene flujos transaccionales
encadenados: crear una compra debe aumentar el inventario, vender un producto
debe disminuirlo, cancelar una orden debe devolverlo. Las pruebas unitarias
aisladas no verifican estas cadenas; las E2E si.

---

## Librerias utilizadas

### Produccion (involucradas en validacion)

| Libreria | Version | Proposito en testing |
|---|---|---|
| `zod` | 3.22.4 | Cada endpoint valida su entrada con schemas Zod antes de ejecutar logica de negocio. Si la entrada no cumple el schema, se rechaza con 400 automaticamente. Esto convierte cada request en una prueba de validacion implicita. |
| `express-rate-limit` | 8.2.1 | Limita a 5 intentos de login cada 15 minutos y 100 requests generales por minuto. Las pruebas verifican que los endpoints protegidos rechazan trafico excesivo. |

### Desarrollo (herramientas de testing)

| Libreria | Version | Proposito |
|---|---|---|
| `jest` | 30.2.0 | Framework de pruebas unitarias. Descubrimiento automatico de archivos `*.test.ts` y `*.spec.ts`. |
| `ts-jest` | 29.4.6 | Transformador de TypeScript para Jest. Permite escribir tests en TS sin compilar previamente. |
| `supertest` | 7.2.2 | Permite hacer peticiones HTTP contra una instancia de Express sin levantar un servidor real. Ideal para pruebas de integracion aisladas. |
| `@types/supertest` | 7.2.0 | Tipos TypeScript para Supertest. |
| `tsx` | 4.21.0 | Ejecutor de TypeScript para el script de pruebas E2E y el seed de datos. |

### Herramientas del sistema (E2E)

| Herramienta | Proposito |
|---|---|
| `curl` | Cliente HTTP que ejecuta las 87 llamadas REST contra el servidor en ejecucion. |
| `python3 -c` | Extrae campos JSON de las respuestas para encadenar datos entre fases (IDs de recursos creados). |
| `bash` | Orquestacion del flujo completo, control de errores y reporte de resultados. |

---

## Suite de pruebas E2E

El archivo `test-flujo-completo.sh` contiene 87 pruebas automatizadas que cubren
el ciclo operativo completo de un negocio.

### Arquitectura del script

El script se construye alrededor de dos funciones reutilizables:

```bash
# Funcion principal: ejecuta un request HTTP y valida el codigo de respuesta
check() {
  local desc="$1" expected_status="$2" method="$3" url="$4" token="$5" body="$6"
  # Construye argumentos de curl dinamicamente
  # Compara el HTTP status code contra el esperado
  # Reporta PASS (verde) o FAIL (rojo) con contexto
  # Guarda el body de respuesta en /tmp/erp_last_response.json
}

# Funcion auxiliar: extrae un valor del ultimo JSON de respuesta
extract() {
  python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" \
    < /tmp/erp_last_response.json
}
```

La funcion `check` recibe:
- Descripcion legible del test
- Codigo HTTP esperado (200, 201, 400, 401, 403, 404, 409, 422)
- Metodo HTTP
- URL del endpoint
- Token JWT (opcional)
- Body JSON (opcional)

La funcion `extract` usa una expresion Python para navegar el JSON de respuesta
y extraer valores como IDs, tokens o datos especificos. Esto permite encadenar
operaciones: crear un producto, extraer su ID, y usar ese ID para crear una
orden de compra.

### Patron de encadenamiento

```
check "Crear producto" 201 POST /productos $TOKEN '{"nombre": "Arroz"}'
PRODUCTO_ID=$(extract "d['datos']['id']")

check "Crear compra" 201 POST /compras $TOKEN "{\"items\": [{\"productoId\": \"$PRODUCTO_ID\"}]}"
COMPRA_ID=$(extract "d['datos']['id']")

check "Recibir compra" 200 POST /compras/$COMPRA_ID/recibir $TOKEN ""
```

Cada fase genera datos que la siguiente fase consume. Esto valida que el sistema
funciona como un todo integrado, no solo como endpoints aislados.

---

## Las 15 fases del flujo de prueba

### Fase 1: Autenticacion y sesion (5 tests)
- Login de los 3 roles (ADMIN, CAJERO, REPARTIDOR)
- Verificacion de perfil autenticado
- Rechazo de credenciales invalidas (401)

**Que valida:** El flujo JWT completo -- generacion de token, verificacion de
firma, consulta de sesion activa en BD, inyeccion de payload en el request.

### Fase 2: Catalogos y configuracion (9 tests)
- CRUD de categorias con jerarquia (padre-hijo)
- Creacion de proveedores
- Listado de almacenes existentes y creacion de nuevos
- Rechazo de nombres duplicados (409)

**Que valida:** Restricciones de unicidad (constraints unique de PostgreSQL),
relaciones padre-hijo, filtrado y paginacion.

### Fase 3: Catalogo de productos (8 tests)
- Creacion de 5 productos con SKU, precio, codigo de barras
- Busqueda por codigo de barras (simulando scanner POS)
- Busqueda por texto parcial
- Rechazo de SKU duplicado (409)

**Que valida:** Que el catalogo funciona como POS real -- busqueda rapida por
scanner, busqueda por nombre, proteccion contra duplicados.

### Fase 4: Compras a proveedor e inventario (7 tests)
- Crear ordenes de compra con multiples items
- Recibir mercancia (cambia estado a RECIBIDA)
- Verificar que el inventario se incremento automaticamente
- Rechazo de recepcion duplicada (422)

**Que valida:** La transaccion critica compra-inventario. Al recibir una compra,
el sistema debe crear movimientos de inventario tipo ENTRADA y actualizar las
existencias en el almacen. Si esto falla, el negocio pierde trazabilidad.

### Fase 5: Clientes con credito (4 tests)
- Crear clientes con y sin limite de credito
- Busqueda rapida por telefono (POS)

**Que valida:** Que el sistema de credito empresarial funciona para PyMEs donde
los clientes frecuentes compran a cuenta.

### Fase 6: Apertura de turno de caja (3 tests)
- Abrir turno con monto de apertura
- Rechazo de segundo turno simultaneo (409)
- Consulta de turno activo

**Que valida:** Que solo puede existir un turno abierto por cajero, previniendo
inconsistencias en el arqueo de caja.

### Fase 7: Ventas POS -- nucleo del negocio (9 tests)
- Venta en efectivo
- Venta con tarjeta de debito
- Venta con pago mixto (efectivo + tarjeta)
- Venta a credito (vinculada a cliente)
- Venta con descuento
- Rechazo de venta sin turno abierto (422)

**Que valida:** El motor de ventas completo. Cada venta debe: descontar
inventario, registrar el pago, vincular al turno de caja activo, actualizar el
credito del cliente si aplica.

### Fase 8: Cancelacion con devolucion de stock (3 tests)
- Cancelar una orden existente
- Verificar que el stock se restauro
- Rechazo de cancelacion duplicada (422)

**Que valida:** Que la cancelacion es una transaccion atomica -- cambia el estado
de la orden y devuelve las unidades al inventario en una sola operacion.

### Fase 9: Entregas a domicilio (7 tests)
- Crear entrega vinculada a una orden
- Consultar entregas del repartidor
- Maquina de estados: PENDIENTE -> EN_RUTA -> ENTREGADO
- Rechazo de transicion invalida (400)

**Que valida:** Que la maquina de estados de entregas es estricta -- no permite
saltar de EN_RUTA a PENDIENTE ni repetir estados.

### Fase 10: Movimientos de inventario (5 tests)
- Registrar merma (botellas danadas)
- Registrar traslado entre almacenes
- Rechazo por stock insuficiente (422)
- Verificar existencias post-movimientos

**Que valida:** Que los ajustes manuales de inventario respetan las existencias
reales y que el mapeo de tipos de movimiento API -> Prisma funciona
correctamente (SALIDA -> MERMA cuando referenciaTipo es MERMA).

### Fase 11: Gestion de usuarios (3 tests)
- Listado de usuarios del sistema
- Asignacion de horario laboral
- Cambio de PIN del cajero

**Que valida:** Administracion de personal y control de acceso por horario.

### Fase 12: Cierre de turno de caja (4 tests)
- Cerrar turno con monto contado por el cajero
- Rechazo de cierre duplicado (422)
- Detalle de turno cerrado (montos, diferencias)

**Que valida:** El arqueo de caja -- el sistema calcula el monto esperado
(apertura + ventas en efectivo) y lo compara con lo que el cajero reporto.

### Fase 13: Reportes y dashboard (7 tests)
- Dashboard con KPIs en tiempo real
- Reporte de ventas por periodo
- Top productos mas vendidos
- Desglose por metodo de pago
- Inventario valorizado
- Rendimiento de cajeros
- Reporte de entregas

**Que valida:** Que las consultas analiticas funcionan con datos reales creados
durante el flujo.

### Fase 14: Pruebas de seguridad (3 tests)
- Request sin token -> 401
- Cajero intentando crear categoria -> 403
- Ruta inexistente -> 404

**Que valida:** Que el sistema de autorizacion basado en roles funciona y que
las rutas no existentes devuelven 404 en lugar de errores del servidor.

### Fase 15: Cierre de sesiones (4 tests)
- Logout de cada usuario
- Verificar que el token invalidado ya no funciona (401)

**Que valida:** Que la invalidacion de sesion es real -- se marca como inactiva
en la BD y los requests posteriores con el mismo token son rechazados.

---

## Archivo HTTP para pruebas manuales

El archivo `http/flujo-completo.http` contiene las mismas 15 fases pero en
formato compatible con la extension REST Client de VS Code. Permite ejecutar
cada request individualmente con un clic.

Usa variables de entorno y variables extraidas de respuestas anteriores:

```http
@baseUrl = http://localhost:3001/api/v1

### Login ADMIN
# @name loginAdmin
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "correo": "admin@minegocio.com",
  "contrasena": "Admin12345"
}

### Variable extraida
@tokenAdmin = {{loginAdmin.response.body.datos.token}}

### Crear categoria (usa el token extraido)
POST {{baseUrl}}/categorias
Authorization: Bearer {{tokenAdmin}}
Content-Type: application/json

{
  "nombre": "Abarrotes",
  "descripcion": "Productos de consumo"
}
```

Esto permite depuracion interactiva: si un test automatizado falla, se puede
reproducir el request exacto en REST Client para inspeccionar headers, body y
tiempos de respuesta.

---

## Pruebas unitarias con Jest

La infraestructura de pruebas unitarias esta configurada en `package.json`:

```json
{
  "devDependencies": {
    "jest": "^30.2.0",
    "ts-jest": "^29.4.6",
    "supertest": "^7.2.2",
    "@types/supertest": "^7.2.0"
  }
}
```

### Supertest: pruebas de integracion sin servidor

Supertest permite probar la aplicacion Express directamente, sin necesidad de
levantar un servidor HTTP:

```typescript
import request from 'supertest';
import app from '../../app';

describe('GET /api/health', () => {
  it('debe retornar estado activo', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('activo');
  });
});
```

### Convenciones de archivos

Los archivos de test se ubican junto al codigo que prueban:

```
modulos/
  categorias/
    categorias.service.ts
    categorias.service.test.ts    <-- test unitario del servicio
    categorias.controller.ts
    categorias.routes.test.ts     <-- test de integracion de rutas
```

El `tsconfig.json` excluye estos archivos de la compilacion de produccion:

```json
{
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

---

## Como ejecutar las pruebas

### Pruebas E2E (requiere servidor en ejecucion)

```bash
# 1. Resetear la base de datos con datos de semilla
npm run db:reset

# 2. Iniciar el servidor
npm run dev

# 3. En otra terminal, ejecutar las pruebas
npm run test:e2e
# Equivalente a: bash test-flujo-completo.sh
```

### Pruebas unitarias

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar en modo watch (re-ejecuta al guardar)
npm run test:watch

# Ejecutar con cobertura (para CI/CD)
npm run test:ci
```

### Pipeline completo (CI)

```bash
# Verifica tipos + ejecuta tests + compila
npm run ci
# Equivalente a: npm run typecheck && npm run test:ci && npm run build
```

---

## Criterios de aceptacion

Una ejecucion exitosa del test E2E valida que:

1. **Todos los 13 modulos responden correctamente** -- auth, categorias,
   almacenes, proveedores, productos, clientes, inventario, turnos-caja,
   ordenes, compras, entregas, usuarios, reportes.

2. **Los flujos transaccionales son atomicos** -- compra->inventario,
   venta->descuento de stock, cancelacion->devolucion de stock.

3. **Las restricciones de negocio se aplican** -- unicidad de SKU, un turno por
   cajero, stock suficiente para vender, maquina de estados de entregas.

4. **La seguridad funciona end-to-end** -- autenticacion JWT, autorizacion por
   roles, invalidacion de sesion, rate limiting.

5. **Los codigos HTTP son semanticamente correctos** -- 201 para creacion, 200
   para lectura/actualizacion, 400 para datos invalidos, 401 para no
   autenticado, 403 para no autorizado, 404 para no encontrado, 409 para
   conflicto, 422 para violacion de regla de negocio.

El resultado esperado es:

```
PASARON: 87  |  FALLARON: 0  |  TOTAL: 87
```
