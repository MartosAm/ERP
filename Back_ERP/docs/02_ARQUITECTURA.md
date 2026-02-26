# Arquitectura del Backend ERP/POS

## Indice

1. [Vision general](#vision-general)
2. [Stack tecnologico y justificacion](#stack-tecnologico-y-justificacion)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Patron modular: service-controller-routes-schema](#patron-modular)
5. [Flujo de un request HTTP](#flujo-de-un-request-http)
6. [Pipeline de middlewares](#pipeline-de-middlewares)
7. [Sistema de autenticacion y autorizacion](#sistema-de-autenticacion-y-autorizacion)
8. [Gestion de errores centralizada](#gestion-de-errores-centralizada)
9. [Modelo de datos (Prisma)](#modelo-de-datos)
10. [Los 13 modulos del sistema](#los-13-modulos-del-sistema)

---

## Vision general

El backend es una API REST que sirve como motor de un sistema ERP/POS para
pequenas y medianas empresas. Gestiona el ciclo completo de operaciones: compras
a proveedores, control de inventario, ventas en punto de venta, entregas a
domicilio, turnos de caja y reportes gerenciales.

La arquitectura sigue el patron de **modulos verticales**: cada dominio de
negocio (productos, ordenes, inventario) es un modulo autocontenido con su
propio servicio, controlador, rutas y esquemas de validacion. Los modulos
comparten utilidades transversales a traves de las carpetas `compartido/`,
`config/` y `middlewares/`.

---

## Stack tecnologico y justificacion

### Runtime y lenguaje

| Tecnologia | Version | Por que se eligio |
|---|---|---|
| Node.js | 20+ | Motor de ejecucion asincrono. Ideal para APIs con muchas operaciones I/O (consultas a BD, llamadas externas) sin bloquear el event loop. |
| TypeScript | 5.3+ | Agrega tipado estatico a JavaScript. Detecta errores en tiempo de compilacion en lugar de en produccion. Facilita el refactoring seguro y la documentacion implicita del codigo. |

### Framework HTTP

| Tecnologia | Version | Por que se eligio |
|---|---|---|
| Express | 4.18 | Framework HTTP minimalista. Ecosistema maduro con miles de middlewares. Patrón de middlewares en cadena permite componer funcionalidad de forma declarativa. |

### Base de datos

| Tecnologia | Version | Por que se eligio |
|---|---|---|
| PostgreSQL | 16 | Base de datos relacional con soporte para transacciones ACID, JSON nativo, indices parciales y constraints complejos. Necesario para un ERP donde la integridad de datos es critica. |
| Prisma | 5.22 | ORM con schema declarativo, migraciones automaticas y cliente TypeScript generado. Previene inyeccion SQL. El schema sirve como documentacion viva del modelo de datos. |

### Validacion y seguridad

| Tecnologia | Proposito |
|---|---|
| Zod | Validacion de datos de entrada en runtime con schemas declarativos. Genera tipos TypeScript automaticamente. |
| Helmet | Configura headers HTTP de seguridad (CSP, HSTS, X-Frame-Options). |
| cors | Control de acceso cross-origin. |
| hpp | Proteccion contra HTTP Parameter Pollution. |
| bcrypt | Hash de contrasenas con salt (12 rondas). |
| jsonwebtoken | Autenticacion basada en tokens JWT. |
| xss | Sanitizacion de strings contra ataques XSS. |
| express-rate-limit | Proteccion contra fuerza bruta y DDoS. |

### Observabilidad

| Tecnologia | Proposito |
|---|---|
| Winston | Logging estructurado -- texto colorizado en desarrollo, JSON en produccion. |
| Morgan | Logging de requests HTTP con formato combined (produccion) o dev (desarrollo). |
| swagger-jsdoc + swagger-ui-express | Documentacion interactiva de la API en `/api-docs`. |

### Cache y performance

| Tecnologia | Proposito |
|---|---|
| node-cache | Cache en memoria con TTL configurable por modulo. Reduce queries repetitivos a PostgreSQL. |
| compression | Compresion gzip de respuestas HTTP para reducir ancho de banda. |

---

## Estructura de carpetas

```
Back_ERP/
  src/
    app.ts              -- Configuracion de Express y pipeline de middlewares
    server.ts           -- Entry point: arranque, shutdown graceful, timeouts

    compartido/         -- Utilidades transversales (usadas por todos los modulos)
      asyncHandler.ts   -- Wrapper try/catch para handlers async
      errores.ts        -- Jerarquia de errores tipados (AppError y subclases)
      logger.ts         -- Instancia Winston configurada por entorno
      paginacion.ts     -- Funciones de paginacion reutilizables
      respuesta.ts      -- Formato estandar de respuesta (ApiResponse)
      sanitizar.ts      -- Sanitizacion XSS de strings y objetos

    config/             -- Configuracion centralizada
      cache.ts          -- Instancia de cache y TTLs por modulo
      database.ts       -- Singleton de PrismaClient
      env.ts            -- Validacion de variables de entorno con Zod
      swagger.ts        -- Configuracion de OpenAPI/Swagger

    middlewares/         -- Middlewares reutilizables
      autenticar.ts     -- Verificacion de JWT + sesion activa + horario
      validar.ts        -- Validacion generica de body/query/params con Zod
      requerirRol.ts    -- Autorizacion basada en roles
      seguridad.ts      -- Headers de seguridad, request ID, tiempo de respuesta
      limitarRates.ts   -- Rate limiting (login y general)
      manejarErrores.ts -- Manejador global de errores (siempre ultimo)

    modulos/            -- Modulos de negocio (un directorio por dominio)
      categorias/
        categorias.routes.ts       -- Definicion de rutas REST
        categorias.schema.ts       -- Schemas Zod de validacion
        categorias.controller.ts   -- Orquestacion request/response
        categorias.service.ts      -- Logica de negocio y acceso a BD
      productos/
        ...mismo patron...
      ordenes/
        ...mismo patron...
      (13 modulos en total)

    tipos/
      express.d.ts      -- Extension del tipo Request de Express con JwtPayload

  prisma/
    schema.prisma       -- Esquema completo del modelo de datos (670 lineas)
    seed.ts             -- Datos iniciales para desarrollo y testing
```

---

## Patron modular

Cada modulo sigue el mismo patron de 4 archivos con responsabilidades estrictas:

### 1. Routes (categorias.routes.ts)

Define los endpoints REST y compone los middlewares en el orden correcto.

```
Router
  .use(autenticar)                         -- Toda ruta requiere JWT
  .get('/',      validar(Schema, 'query'), Controller.listar)
  .get('/:id',                             Controller.obtener)
  .post('/',     requerirRol('ADMIN'), validar(Schema), Controller.crear)
  .patch('/:id', requerirRol('ADMIN'), validar(Schema), Controller.actualizar)
  .delete('/:id', requerirRol('ADMIN'),                 Controller.eliminar)
```

**Responsabilidad:** Composicion declarativa. No contiene logica de negocio ni
acceso a BD.

### 2. Schema (categorias.schema.ts)

Define los contratos de entrada con Zod.

```typescript
export const CrearCategoriaSchema = z.object({
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(500).optional(),
  padreId: z.string().cuid().optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  orden: z.number().int().min(0).optional(),
});
```

**Responsabilidad:** Validacion y tipado. Define que datos acepta cada endpoint.
El middleware `validar` ejecuta estos schemas automaticamente antes de que el
request llegue al controller.

### 3. Controller (categorias.controller.ts)

Orquesta el request/response: extrae datos del request, llama al servicio y
formatea la respuesta.

```typescript
static crear = async (req: Request, res: Response): Promise<void> => {
  const dto = req.body;                       // Ya validado por Zod
  const { empresaId } = req.user;             // Extraido del JWT
  const categoria = await CategoriaService.crear(dto, empresaId);
  res.status(201).json(ApiResponse.ok(categoria, 'Categoria creada'));
};
```

**Responsabilidad:** Adaptacion HTTP. No contiene logica de negocio ni
consultas a BD. Solo traduce entre el protocolo HTTP y la capa de servicio.

### 4. Service (categorias.service.ts)

Contiene toda la logica de negocio y el acceso a la base de datos.

```typescript
static crear = async (dto: CrearCategoriaDTO, empresaId: string) => {
  // Verificar que no existe otra categoria con el mismo nombre
  const existente = await prisma.categoria.findFirst({
    where: { nombre: dto.nombre, empresaId, activo: true },
  });
  if (existente) throw new ErrorConflicto('Ya existe una categoria con ese nombre');

  // Crear la categoria
  const categoria = await prisma.categoria.create({
    data: { ...dto, empresaId },
    select: { id: true, nombre: true, ... },
  });

  // Invalidar cache
  invalidarCacheModulo('categorias');

  return categoria;
};
```

**Responsabilidad:** Logica de negocio pura. Lanza errores tipados (nunca hace
`res.status()`). Puede ser testeada independientemente del framework HTTP.

### Diagrama de flujo dentro de un modulo

```
Request HTTP
    |
    v
[routes.ts] -- Aplica middlewares (auth, validacion, roles)
    |
    v
[controller.ts] -- Extrae datos del request, llama al servicio
    |
    v
[service.ts] -- Ejecuta logica de negocio, accede a Prisma
    |
    v
[Prisma/BD] -- Consulta/escribe en PostgreSQL
    |
    v
[controller.ts] -- Formatea respuesta con ApiResponse
    |
    v
Response HTTP
```

---

## Flujo de un request HTTP

Cuando un cliente envia `POST /api/v1/ordenes` con un token JWT, el request
atraviesa las siguientes capas en orden:

```
1. Express recibe el request
2. asignarRequestId     -- Genera UUID para trazabilidad
3. medirTiempoRespuesta -- Inicia cronometro
4. helmet               -- Agrega headers de seguridad
5. cors                 -- Verifica origen permitido
6. protegerParametros   -- Previene parameter pollution
7. validarContentType   -- Verifica Content-Type: application/json
8. express.json         -- Parsea el body JSON
9. compression          -- Prepara compresion gzip
10. morgan              -- Registra el request en logs
11. limitarGeneral      -- Valida rate limit (100 req/min)
12. autenticar          -- Verifica JWT, sesion activa, horario
13. requerirRol         -- Verifica que el rol puede crear ordenes
14. validar(schema)     -- Valida el body contra el schema Zod
15. controller.crear    -- Orquesta la operacion
16. service.crear       -- Ejecuta logica de negocio
17. Prisma              -- Escribe en PostgreSQL
18. ApiResponse.ok      -- Formatea respuesta JSON estandar
19. medirTiempoRespuesta -- Agrega X-Response-Time al header
20. Response 201        -- Envia respuesta al cliente
```

Si en cualquier paso ocurre un error, se propaga automaticamente al middleware
`manejarErrores` (paso 21) gracias a `asyncHandler`, que convierte errores
de funciones async en llamadas a `next(error)`.

---

## Pipeline de middlewares

El archivo `app.ts` configura los middlewares en un orden especifico que no es
arbitrario:

```
Trazabilidad (request ID, tiempo)
       |
Seguridad (helmet, CORS, HPP, content-type)
       |
Parsing (JSON body, URL encoding)
       |
Performance (compression)
       |
Observabilidad (morgan logging)
       |
Proteccion (rate limiting)
       |
Rutas de la aplicacion
       |
Documentacion (Swagger, solo en desarrollo)
       |
Manejo de errores (siempre al final)
```

**Por que este orden importa:**

- La trazabilidad va primero para que todos los logs incluyan el request ID.
- La seguridad va antes del parsing para rechazar requests maliciosos antes de
  gastar CPU parseando JSON.
- El rate limiting va antes de las rutas para proteger contra abuso antes de
  ejecutar logica de negocio.
- El manejo de errores va al final porque Express identifica los error handlers
  por tener 4 parametros (err, req, res, next) y los ejecuta cuando cualquier
  middleware anterior llama a `next(error)`.

---

## Sistema de autenticacion y autorizacion

### Flujo de autenticacion (JWT + sesion en BD)

```
1. POST /auth/login {correo, contrasena}
2. Service busca usuario por correo
3. Compara hash bcrypt de contrasena
4. Crea registro Sesion en BD (activo: true)
5. Firma JWT con {usuarioId, empresaId, rol, sesionId}
6. Retorna token al cliente

Para cada request posterior:
7. Middleware autenticar extrae Bearer token
8. Verifica firma JWT con JWT_SECRET
9. Busca sesion en BD (activo: true)
10. Verifica que el usuario sigue activo
11. Inyecta payload en req.user para uso downstream
```

### Por que sesion en BD ademas de JWT

Los JWT son stateless -- una vez firmados, son validos hasta que expiran. Esto
significa que no se pueden invalidar (por ejemplo, al hacer logout). La sesion
en BD resuelve esto: al hacer logout, se marca `activo: false` en la BD, y el
middleware `autenticar` verifica este campo en cada request.

### Control de acceso por roles

```typescript
// En las rutas, se compone con requerirRol:
router.post('/', requerirRol('ADMIN'), controller.crear);
router.get('/', controller.listar);  // Cualquier rol autenticado
```

Roles del sistema:

| Rol | Permisos |
|---|---|
| ADMIN | Acceso total. CRUD de catalogo, gestion de usuarios, reportes. |
| CAJERO | Ventas POS, apertura/cierre de turno, consulta de productos/clientes. |
| REPARTIDOR | Consulta y actualizacion de entregas asignadas. |

### Control de acceso por horario

El middleware `autenticar` verifica el horario laboral para CAJERO y REPARTIDOR:

```typescript
if (usuario.rol !== 'ADMIN' && usuario.horarioInicio && usuario.horarioFin) {
  const horaActual = dayjs().format('HH:mm');
  if (horaActual < usuario.horarioInicio || horaActual > usuario.horarioFin)
    throw new ErrorAcceso('Acceso fuera de horario laboral');
}
```

Esto permite restringir que los cajeros solo operen durante su turno asignado.

---

## Gestion de errores centralizada

### Jerarquia de errores

```
AppError (clase base)
  |-- ErrorPeticion       (400 BAD_REQUEST)
  |-- ErrorNoAutorizado   (401 UNAUTHORIZED)
  |-- ErrorAcceso         (403 FORBIDDEN)
  |-- ErrorNoEncontrado   (404 NOT_FOUND)
  |-- ErrorConflicto      (409 CONFLICT)
  |-- ErrorNegocio        (422 UNPROCESSABLE)
```

### Como funciona

Los servicios lanzan errores tipados en lugar de manejar HTTP directamente:

```typescript
// En el servicio:
throw new ErrorNoEncontrado('Producto no existe');

// El middleware manejarErrores lo intercepta y produce:
// HTTP 404
// { "exito": false, "error": { "mensaje": "Producto no existe", "codigo": "NOT_FOUND" } }
```

### Tipos de error manejados

| Origen | Tipo | Respuesta HTTP |
|---|---|---|
| Express parser | SyntaxError (JSON malformado) | 400 |
| Express parser | PayloadTooLarge | 413 |
| Zod | ZodError (validacion fallida) | 400 con detalles de campos |
| Prisma | P2002 (unique constraint) | 409 |
| Prisma | P2025 (registro no encontrado) | 404 |
| Prisma | P2003 (foreign key invalida) | 400 |
| Prisma | P2014 (relacion requerida) | 400 |
| Prisma | P2024 (pool timeout) | 503 |
| Servicio | AppError (subclases) | Status code segun subclase |
| Desconocido | Error generico | 500 (detalles ocultos en produccion) |

---

## Modelo de datos

El schema de Prisma (`prisma/schema.prisma`, 670 lineas) define 20 modelos y
6 enums que representan el dominio de un ERP/POS:

### Entidades principales

```
Empresa (multi-tenant)
  |-- Usuario (ADMIN, CAJERO, REPARTIDOR)
  |     |-- Sesion
  |-- Categoria (jerarquica, padre-hijo)
  |-- Almacen
  |-- Proveedor
  |-- Producto
  |     |-- ProductoAlmacen (existencias por almacen)
  |     |-- MovimientoInventario (historial inmutable)
  |-- Cliente (con credito opcional)
  |-- CajaRegistradora
  |     |-- TurnoCaja
  |-- Orden (venta POS)
  |     |-- DetalleOrden (items)
  |     |-- PagoOrden (metodos de pago)
  |     |-- Entrega (domicilio)
  |-- OrdenCompra (compra a proveedor)
  |     |-- DetalleOrdenCompra
  |-- Notificacion
  |-- RegistroAuditoria (inmutable)
```

### Multi-tenancy

Todos los modelos tienen un campo `empresaId` que vincula los datos a una
empresa especifica. Cada consulta filtra por el `empresaId` del usuario
autenticado, extraido del JWT:

```typescript
const productos = await prisma.producto.findMany({
  where: { empresaId: req.user.empresaId, activo: true },
});
```

Esto permite que multiples empresas compartan la misma instancia de la API sin
ver los datos de las demas.

---

## Los 13 modulos del sistema

| Modulo | Rutas base | Descripcion |
|---|---|---|
| auth | `/auth` | Login, logout, registro, perfil, cambio de PIN |
| categorias | `/categorias` | CRUD de categorias con jerarquia padre-hijo |
| almacenes | `/almacenes` | Gestion de almacenes/sucursales |
| proveedores | `/proveedores` | CRUD de proveedores |
| productos | `/productos` | Catalogo con busqueda por SKU, barras, texto |
| clientes | `/clientes` | Gestion de clientes con sistema de credito |
| inventario | `/inventario` | Existencias, movimientos, ajustes, traslados |
| turnos-caja | `/turnos-caja` | Apertura/cierre de turno, arqueo de caja |
| ordenes | `/ordenes` | Ventas POS con pagos mixtos y cancelacion |
| compras | `/compras` | Ordenes de compra a proveedores con recepcion |
| entregas | `/entregas` | Entregas a domicilio con maquina de estados |
| usuarios | `/usuarios` | Gestion de personal, horarios, roles |
| reportes | `/reportes` | Dashboard, ventas, inventario, cajeros, entregas |

Cada modulo se registra en `app.ts` con un prefijo bajo `/api/v1/`:

```typescript
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/categorias',  categoriasRoutes);
app.use('/api/v1/productos',   productosRoutes);
// ... 13 modulos en total
```
