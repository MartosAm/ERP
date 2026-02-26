# Archivos Compartidos, Configuracion y Reutilizacion

## Indice

1. [Mapa de dependencias entre archivos](#mapa-de-dependencias-entre-archivos)
2. [Carpeta compartido/ -- Utilidades transversales](#carpeta-compartido)
3. [Carpeta config/ -- Configuracion centralizada](#carpeta-config)
4. [Carpeta middlewares/ -- Capas intermedias reutilizables](#carpeta-middlewares)
5. [Carpeta tipos/ -- Extensiones de TypeScript](#carpeta-tipos)
6. [Como se reutilizan: grafo de uso real](#como-se-reutilizan)
7. [Principio de diseno: escribir una vez, usar en los 13 modulos](#principio-de-diseno)

---

## Mapa de dependencias entre archivos

Este diagrama muestra que archivo importa a cual. Las flechas van de quien
importa hacia lo que importa:

```
server.ts
  |-- app.ts
  |-- config/env.ts
  |-- config/database.ts
  |-- compartido/logger.ts

app.ts
  |-- config/env.ts
  |-- config/database.ts
  |-- config/swagger.ts
  |-- middlewares/* (todos)
  |-- compartido/respuesta.ts
  |-- modulos/*/routes.ts (13 modulos)

Cada modulo (routes.ts):
  |-- middlewares/autenticar.ts
  |-- middlewares/requerirRol.ts
  |-- middlewares/validar.ts
  |-- compartido/asyncHandler.ts
  |-- ./modulo.controller.ts
  |-- ./modulo.schema.ts

Cada modulo (controller.ts):
  |-- compartido/respuesta.ts (ApiResponse)
  |-- compartido/paginacion.ts
  |-- ./modulo.service.ts

Cada modulo (service.ts):
  |-- config/database.ts (prisma)
  |-- config/cache.ts
  |-- compartido/errores.ts
  |-- compartido/sanitizar.ts
  |-- compartido/paginacion.ts

middlewares/manejarErrores.ts:
  |-- compartido/errores.ts
  |-- compartido/respuesta.ts
  |-- compartido/logger.ts
  |-- config/env.ts

middlewares/autenticar.ts:
  |-- config/database.ts
  |-- config/env.ts
  |-- compartido/errores.ts
```

---

## Carpeta compartido/

Contiene 6 archivos que proveen funcionalidad transversal. Ningun archivo de
esta carpeta depende de modulos de negocio; solo de librerias externas y de
`config/`.

### asyncHandler.ts

**Que hace:** Envuelve funciones async de Express para que los errores se
propaguen automaticamente al middleware de errores.

**Quien lo usa:** Todos los archivos `routes.ts` de los 13 modulos.

**Cuantas veces se reutiliza:** Mas de 70 veces (una por cada endpoint).

**Lineas de codigo:** 12

**Si no existiera:** Cada controller necesitaria un bloque try/catch de 5
lineas, multiplicado por 70+ endpoints = 350+ lineas de codigo repetitivo
que es facil olvidar y causa errores silenciosos cuando se omite.

```typescript
// Lo que asyncHandler ahorra en CADA endpoint:
router.get('/', asyncHandler(Controller.listar));
// vs sin asyncHandler:
router.get('/', async (req, res, next) => {
  try { await Controller.listar(req, res, next); }
  catch (err) { next(err); }
});
```

### errores.ts

**Que hace:** Define la jerarquia de errores operacionales del sistema. Cada
subclase encapsula un codigo HTTP y un codigo de error legible por maquina.

**Quien lo usa:** Todos los archivos `service.ts` (lanzan errores) y
`manejarErrores.ts` (los intercepta).

**Cuantas veces se reutiliza:** Mas de 50 `throw` repartidos en los 13 servicios.

**Lineas de codigo:** 22

```typescript
// Jerarquia completa:
AppError (base abstracta)
  ErrorPeticion       (400)  -- Datos invalidos que pasaron Zod pero fallan en servicio
  ErrorNoAutorizado   (401)  -- Token ausente, invalido o sesion cerrada
  ErrorAcceso         (403)  -- Rol sin permisos o fuera de horario
  ErrorNoEncontrado   (404)  -- Recurso no existe o fue eliminado
  ErrorConflicto      (409)  -- Duplicado (nombre, SKU, correo)
  ErrorNegocio        (422)  -- Violacion de regla de negocio (stock, estado)
```

### respuesta.ts

**Que hace:** Define el formato estandar de todas las respuestas HTTP de la API.

**Quien lo usa:** Todos los controllers (ApiResponse.ok), manejarErrores
(ApiResponse.fail), limitarRates (mensajes de rate limit).

**Cuantas veces se reutiliza:** Cada respuesta de la API pasa por `ApiResponse`.

**Lineas de codigo:** 18

**Formato de respuesta exitosa:**
```json
{
  "exito": true,
  "datos": { "id": "...", "nombre": "..." },
  "mensaje": "Producto creado",
  "meta": null
}
```

**Formato de respuesta paginada:**
```json
{
  "exito": true,
  "datos": [ ... ],
  "mensaje": "OK",
  "meta": {
    "total": 47,
    "pagina": 2,
    "limite": 20,
    "totalPaginas": 3,
    "tieneSiguiente": true,
    "tieneAnterior": true
  }
}
```

**Formato de error:**
```json
{
  "exito": false,
  "datos": null,
  "error": {
    "mensaje": "Stock insuficiente",
    "codigo": "UNPROCESSABLE",
    "detalles": null
  }
}
```

### paginacion.ts

**Que hace:** Calcula los parametros `skip`/`take` para Prisma y construye el
objeto `meta` de paginacion para la respuesta.

**Quien lo usa:** Todos los services que implementan listado paginado (categorias,
productos, clientes, ordenes, compras, entregas, inventario, usuarios, turnos).

**Lineas de codigo:** 18

```typescript
// En el servicio:
const { skip, take } = paginar({ pagina, limite });
const [datos, total] = await Promise.all([
  prisma.producto.findMany({ skip, take, where: filtros }),
  prisma.producto.count({ where: filtros }),
]);
const meta = construirMeta(total, { pagina, limite });

// En el controller:
res.json(ApiResponse.ok(datos, 'OK', meta));
```

**Si no existiera:** Cada servicio implementaria su propia logica de paginacion
con formulas posiblemente inconsistentes. Un servicio usaria `(pagina - 1) *
limite` y otro `pagina * limite`, causando datos faltantes o duplicados.

### sanitizar.ts

**Que hace:** Limpia strings de entrada contra ataques XSS usando la libreria
`xss`. Recorta espacios en blanco y escapa HTML peligroso.

**Quien lo usa:** Servicios que almacenan datos proporcionados por el usuario
(productos, categorias, clientes, proveedores).

**Lineas de codigo:** 8

```typescript
// Dos funciones:
sanitizarString("  <script>alert('xss')</script>  ")
// Retorna: "&lt;script&gt;alert('xss')&lt;/script&gt;"

sanitizarObjeto({ nombre: " <b>Test</b> ", precio: 10 })
// Retorna: { nombre: "&lt;b&gt;Test&lt;/b&gt;", precio: 10 }
// Solo sanitiza strings; deja numeros y otros tipos intactos
```

### logger.ts

**Que hace:** Crea una instancia de Winston configurada por entorno con nivel
ajustable via variable de entorno.

**Quien lo usa:** `server.ts`, `manejarErrores.ts` y cualquier archivo que
necesite registrar eventos.

**Lineas de codigo:** 40

**Comportamiento por entorno:**

| Entorno | Formato | Nivel default | Ejemplo de salida |
|---|---|---|---|
| development | Texto colorizado | debug | `12:30:45 [info]: Servidor iniciado` |
| production | JSON estructurado | info | `{"level":"info","message":"Servidor iniciado","timestamp":"2026-02-26T12:30:45Z","servicio":"erp-backend"}` |
| test | Silenciado | -- | (Sin salida para no ensuciar tests) |

**Override con LOG_LEVEL:** Si se establece `LOG_LEVEL=warn` en el `.env`, solo
se registran warnings y errores, sin importar el entorno. Permite reducir ruido
en produccion sin redesplegar.

---

## Carpeta config/

Contiene 4 archivos que centralizan la configuracion de infraestructura.

### env.ts

**Que hace:** Valida todas las variables de entorno al arranque de la aplicacion
usando Zod. Si una variable falta o tiene formato incorrecto, el proceso termina
con un mensaje que identifica exactamente que variable fallo.

**Quien lo usa:** Practicamente todos los archivos (database, logger, auth,
cors, rate limiting).

**Por que es critico:** Sin validacion al arranque, un `.env` incompleto causa
errores crípticos en runtime. Por ejemplo, un `JWT_SECRET` vacio produciria
tokens invalidos que solo fallan cuando un usuario intenta autenticarse --
posiblemente horas despues del deploy.

**Variables validadas:**

| Variable | Tipo | Default | Regla |
|---|---|---|---|
| DATABASE_URL | string (URL) | requerida | Debe ser URL valida |
| JWT_SECRET | string | requerida | Minimo 32 caracteres |
| PORT | number | 3001 | Coercion automatica |
| NODE_ENV | enum | development | Solo: development, test, production |
| BCRYPT_SALT_ROUNDS | number | 12 | Rango 10-14 |
| CORS_ORIGIN | string | localhost:4200 | Acepta multiples separados por coma |
| JWT_EXPIRES_IN | string | 8h | Formato libre ("8h", "1d", "30m") |
| LOG_LEVEL | enum | segun NODE_ENV | error, warn, info, debug, etc. |
| TRUST_PROXY | number | 1 | Rango 0-5 |
| REQUEST_TIMEOUT_MS | number | 30000 | Rango 5000-120000 |

**Advertencia en produccion:** Si `CORS_ORIGIN` sigue siendo `localhost:4200`
en produccion, se emite un warning en la consola al arranque. Esto previene el
error comun de copiar el `.env` de desarrollo a produccion sin modificarlo.

### database.ts

**Que hace:** Exporta una instancia singleton de PrismaClient.

**Quien lo usa:** Todos los servicios y el middleware `autenticar`.

**Por que es singleton:** PrismaClient mantiene un pool de conexiones TCP hacia
PostgreSQL (por defecto `num_cpus * 2 + 1`). Si cada archivo creara su propia
instancia, se abririan multiples pools, agotando las conexiones disponibles del
servidor de BD.

**Truco para desarrollo:** En development, la instancia se almacena en
`globalThis` para sobrevivir al hot-reload de tsx. Sin esto, cada vez que se
guarda un archivo, tsx reinicia el modulo y crea una nueva instancia de
PrismaClient sin cerrar la anterior.

### cache.ts

**Que hace:** Configura un cache en memoria con TTL (tiempo de vida) por modulo.

**Quien lo usa:** Servicios que leen datos consultados frecuentemente
(categorias, productos, almacenes, proveedores, clientes, reportes).

**TTLs configurados:**

| Modulo | TTL | Justificacion |
|---|---|---|
| Categorias | 5 min | Cambian poco, se consultan mucho (selectores del UI) |
| Productos | 2 min | Cambian moderadamente (precios, stock) |
| Almacenes | 10 min | Casi nunca cambian |
| Proveedores | 5 min | Datos maestros estables |
| Clientes | 2 min | Credito puede cambiar con cada venta |
| Reportes | 1 min | Se recalculan en cada consulta |
| Stock bajo | 30 seg | Alerta critica, debe ser fresco |

**Patron de invalidacion:**

```typescript
// Al crear/actualizar/eliminar un producto:
invalidarCacheModulo('productos');

// invalidarCacheModulo busca todas las claves que empiezan con 'productos'
// y las elimina del cache. El proximo GET recalcula desde la BD.
```

### swagger.ts

**Que hace:** Genera la especificacion OpenAPI 3.0.3 a partir de comentarios
JSDoc en los archivos de rutas.

**Quien lo usa:** `app.ts` para montar `/api-docs` en desarrollo.

**En produccion:** Swagger esta deshabilitado (`swaggerHabilitado = env.NODE_ENV
!== 'production'`). La documentacion interactiva consume recursos y expone
informacion de la API que no deberia ser publica.

---

## Carpeta middlewares/

Contiene 6 middlewares que se aplican de forma transversal.

### autenticar.ts

**Quien lo usa:** Todos los 13 modulos (via `router.use(autenticar)` en cada
archivo de rutas).

**Que hace en cada request:**

1. Extrae el token del header `Authorization: Bearer <token>`
2. Verifica la firma JWT con `JWT_SECRET`
3. Busca la sesion en la BD (debe estar activa)
4. Verifica que el usuario sigue activo
5. Verifica horario laboral (para CAJERO/REPARTIDOR)
6. Inyecta `req.user` con los datos del JWT

**Si falla en cualquier paso:** Lanza `ErrorNoAutorizado` (401) o `ErrorAcceso`
(403) sin dejar pasar el request al controller.

### validar.ts

**Quien lo usa:** Todos los endpoints que reciben datos de entrada.

**Que hace:** Ejecuta un schema Zod contra `req.body`, `req.query` o
`req.params`. Si la validacion falla, pasa el `ZodError` a `next()` para que
lo procese `manejarErrores`.

**Ventaja de la generalizacion:** Una sola funcion de 10 lineas reemplaza la
validacion manual en 70+ endpoints. El schema define las reglas; el middleware
ejecuta la mecanica:

```typescript
// Misma funcion, diferentes schemas, diferentes targets:
validar(CrearCategoriaSchema, 'body')       // POST /categorias
validar(FiltroProductosSchema, 'query')     // GET /productos?buscar=...
validar(IdParamsSchema, 'params')           // GET /productos/:id
```

### requerirRol.ts

**Quien lo usa:** Endpoints que necesitan autorizacion por rol (creacion de
catalogos, gestion de usuarios, reportes).

**Como funciona:** Recibe una lista de roles permitidos y verifica si
`req.user.rol` esta en la lista:

```typescript
// Solo ADMIN puede crear categorias
router.post('/', requerirRol('ADMIN'), ...);

// ADMIN y CAJERO pueden ver productos
router.get('/', requerirRol('ADMIN', 'CAJERO'), ...);
```

### seguridad.ts

**Quien lo usa:** `app.ts` aplica todas las funciones globalmente.

**6 funciones independientes:**

| Funcion | Que hace |
|---|---|
| `protegerParametros` | Previene HTTP Parameter Pollution con whitelist |
| `asignarRequestId` | Genera UUID v4 por request para trazabilidad en logs |
| `medirTiempoRespuesta` | Mide y expone tiempo de procesamiento en header |
| `headersSeguridad` | Agrega Permissions-Policy, Referrer-Policy, Cache-Control |
| `validarContentType` | Rechaza POST/PUT/PATCH sin Content-Type: application/json |
| `ocultarTecnologia` | Elimina X-Powered-By y Server headers |

### limitarRates.ts

**Quien lo usa:** `app.ts` aplica `limitarGeneral` a todas las rutas bajo
`/api/`. Las rutas de auth aplican ademas `limitarLogin`.

**Configuracion:**

| Limitador | Ventana | Maximo | Proposito |
|---|---|---|---|
| `limitarLogin` | 15 min | 5 intentos | Prevenir fuerza bruta de contrasenas |
| `limitarGeneral` | 1 min | 100 requests | Prevenir abuso general de la API |

### manejarErrores.ts

**Quien lo usa:** `app.ts` lo registra como el ULTIMO middleware.

**Procesamiento en cascada:** Revisa el tipo de error en orden de especificidad
y produce la respuesta HTTP correspondiente. Si ningun tipo coincide, responde
500 con detalles ocultos en produccion.

---

## Carpeta tipos/

### express.d.ts

**Que hace:** Extiende la interfaz `Request` de Express para incluir la
propiedad `user` con el tipo `JwtPayload`.

**Por que existe:** Sin esta extension, TypeScript marcaria `req.user` como
error en cada controller porque Express no sabe que el middleware `autenticar`
inyecta esa propiedad:

```typescript
// Sin express.d.ts: Error de TypeScript
req.user.empresaId  // Property 'user' does not exist on type 'Request'

// Con express.d.ts: TypeScript sabe que req.user existe y tiene tipo
req.user.empresaId  // string -- OK, autocompletado funciona
```

---

## Como se reutilizan

### Grafo de uso real (cuantos modulos usan cada archivo compartido)

```
asyncHandler.ts    -- 13 modulos (todos los routes.ts)
errores.ts         -- 13 modulos (todos los services.ts) + 2 middlewares
respuesta.ts       -- 13 modulos (todos los controllers.ts) + 2 middlewares
paginacion.ts      -- 10 modulos (todos los que tienen listado paginado)
sanitizar.ts       --  8 modulos (los que almacenan texto de usuario)
logger.ts          --  4 archivos (server, manejarErrores, app, seguridad)

env.ts             -- 10+ archivos (database, logger, cors, auth, swagger, etc.)
database.ts        -- 14 archivos (13 services + autenticar.ts)
cache.ts           --  8 archivos (services con cache activada)
swagger.ts         --  1 archivo (app.ts)

autenticar.ts      -- 13 modulos (todos los routes.ts)
validar.ts         -- 13 modulos (todos los routes.ts)
requerirRol.ts     -- 10 modulos (los que restringen por rol)
seguridad.ts       --  1 archivo (app.ts, aplicacion global)
limitarRates.ts    --  2 archivos (app.ts general + auth.routes.ts login)
manejarErrores.ts  --  1 archivo (app.ts, aplicacion global)
```

### Efecto multiplicador

Si se cuenta cuantas lineas de codigo "ahorra" cada archivo compartido al evitar
duplicacion:

| Archivo | Lineas propias | Se usa en N lugares | Lineas ahorradas (estimado) |
|---|---|---|---|
| asyncHandler | 12 | 70+ endpoints | 350+ (try/catch en cada handler) |
| errores | 22 | 50+ throw | 250+ (if/else de status codes) |
| respuesta | 18 | 80+ respuestas | 400+ (formatos ad-hoc) |
| paginacion | 18 | 10 servicios | 180+ (calculo manual skip/take/meta) |
| validar | 10 | 40+ endpoints | 200+ (safeParse manual) |

Total: 80 lineas de utilidades evitan mas de 1380 lineas de codigo repetitivo.

---

## Principio de diseno

### Escribir una vez, usar en los 13 modulos

La regla que gobierna la carpeta `compartido/` es: **si la logica se usa en mas
de un modulo, se extrae a un archivo compartido.**

Esto produce un efecto cascada positivo:

1. **Consistencia:** Todos los endpoints responden con el mismo formato.
2. **Mantenibilidad:** Corregir un bug en `manejarErrores.ts` lo corrige para
   los 13 modulos simultaneamente.
3. **Onboarding:** Un nuevo desarrollador aprende el patron una vez y lo
   aplica a cualquier modulo.
4. **Testing:** Las utilidades compartidas se testean una vez; no 13 veces.

### Cuando NO extraer a compartido

Un archivo solo se extrae a `compartido/` cuando cumple estas condiciones:

- Se usa en 2 o mas modulos (no especulativo)
- No tiene logica de dominio especifica (no sabe sobre "productos" o "ordenes")
- Su interfaz es estable (no cambia segun quien lo consume)

Logica que solo pertenece a un modulo se queda en ese modulo. Por ejemplo,
la funcion `mapearTipoMovimiento` vive en `inventario.service.ts` porque solo
tiene sentido en el contexto de movimientos de inventario.
