# Flujo de Desarrollo de APIs - Sistema ERP/POS

Este documento describe el proceso paso a paso para crear cualquier API
en el sistema. Sirve como guia para mantener consistencia en todos los
modulos del backend.

---

## Indice

1. [Arquitectura de tres capas](#1-arquitectura-de-tres-capas)
2. [Flujo de un request HTTP](#2-flujo-de-un-request-http)
3. [Orden de creacion de archivos](#3-orden-de-creacion-de-archivos)
4. [Convencion de nombres](#4-convencion-de-nombres)
5. [Relacion entre modulos](#5-relacion-entre-modulos)
6. [Mapa de dependencias del sistema](#6-mapa-de-dependencias-del-sistema)
7. [Plan de APIs por modulo](#7-plan-de-apis-por-modulo)
8. [Uso de utilidades compartidas](#8-uso-de-utilidades-compartidas)

---

## 1. Arquitectura de tres capas

Cada modulo de negocio tiene exactamente 4 archivos. No mas, no menos.

```
src/modulos/{nombre}/
  {nombre}.schema.ts      -- Validacion Zod + tipos TypeScript
  {nombre}.service.ts     -- Logica de negocio + queries Prisma
  {nombre}.controller.ts  -- Manejo HTTP (req/res) + llamar service
  {nombre}.routes.ts      -- Router Express + middlewares por ruta
```

Regla absoluta de dependencias (nunca invertir ni saltar capas):

```
routes.ts  -->  controller.ts  -->  service.ts  -->  Prisma/PostgreSQL
   |                |                    |
   |                |                    +-- Importa: prisma, cache, errores, sanitizar
   |                +-- Importa: ApiResponse, service
   +-- Importa: asyncHandler, autenticar, requerirRol, validar, schemas
```

**Prohibiciones:**
- El controller NUNCA importa PrismaClient
- El service NUNCA importa Request/Response de Express
- El schema NUNCA contiene logica de negocio
- Las routes NUNCA contienen logica de negocio ni queries

---

## 2. Flujo de un request HTTP

```
Cliente (Angular)
    |
    | POST /api/v1/productos  { nombre: "Coca Cola", sku: "CC-001", ... }
    v
[Express]
    |
    v  helmet() + cors() + json() + compression() + morgan()
[Middlewares globales]
    |
    v  limitarGeneral (100 req/min)
[Rate limiting]
    |
    v  routes.ts: autenticar -> requerirRol('ADMIN') -> validar(CrearProductoSchema)
[Middlewares de ruta]
    |
    v  Zod valida y coerciona req.body. Si falla: ZodError -> manejarErrores -> 400
[Validacion]
    |
    v  controller.ts: extrae req.body, req.user.empresaId, llama service
[Controller]
    |
    v  service.ts: sanitiza, verifica unicidad, prisma.create, invalida cache
[Service]
    |
    v  PostgreSQL ejecuta INSERT
[Base de datos]
    |
    v  service retorna el objeto creado
[Respuesta]
    |
    v  controller: res.status(201).json(ApiResponse.ok(producto, 'Producto creado'))
[JSON al cliente]
    |
    v  { exito: true, datos: {...}, mensaje: "Producto creado", meta: null }
[Angular recibe]
```

Si ocurre un error en cualquier punto:

```
[Cualquier capa]
    |
    v  throw new ErrorNoEncontrado('Producto no encontrado')
        o  throw (ZodError desde el middleware validar)
        o  throw (PrismaClientKnownRequestError desde la BD)
    |
    v  asyncHandler captura con .catch(next)
[asyncHandler]
    |
    v  next(error) propaga al error handler global
[manejarErrores.ts]
    |
    v  Detecta tipo de error -> responde con ApiResponse.fail() y status correcto
[Respuesta de error]
    |
    v  { exito: false, datos: null, error: { mensaje: "...", codigo: "NOT_FOUND" } }
```

---

## 3. Orden de creacion de archivos

Al crear un modulo nuevo, seguir siempre este orden:

### Paso 1: Schema (validacion + tipos)
Archivo: `{nombre}.schema.ts`

```typescript
// 1. Definir schemas Zod para crear, actualizar y filtrar
// 2. Inferir tipos TypeScript desde los schemas
// 3. Los schemas son el contrato de entrada de la API
```

Se crea primero porque define la forma de los datos que entran al sistema.
El controller y el service dependen de estos tipos.

### Paso 2: Service (logica de negocio)
Archivo: `{nombre}.service.ts`

```typescript
// 1. Importar prisma, cache, sanitizar, errores, tipos del schema
// 2. Implementar metodos: listar, obtenerPorId, crear, actualizar, eliminar
// 3. Sanitizar strings antes de persistir
// 4. Usar transacciones para operaciones multi-tabla
// 5. Invalidar cache en cada mutacion
```

Se crea segundo porque contiene toda la logica. No depende de HTTP.

### Paso 3: Controller (capa HTTP)
Archivo: `{nombre}.controller.ts`

```typescript
// 1. Importar ApiResponse y el service
// 2. Extraer datos del request (body, params, query, user)
// 3. Llamar al service con los datos limpios
// 4. Retornar con ApiResponse.ok() o dejar que el error fluya
```

Es deliberadamente delgado. Una sola responsabilidad: traducir HTTP a llamadas de service.

### Paso 4: Routes (rutas + middlewares)
Archivo: `{nombre}.routes.ts`

```typescript
// 1. Crear Router de Express
// 2. Aplicar autenticar a todas las rutas (router.use)
// 3. Definir cada ruta con sus middlewares especificos:
//    - requerirRol() para restringir por rol
//    - validar() para validar input con Zod
//    - asyncHandler() para capturar errores async
```

Se crea al final porque conecta todo: schemas + controller + middlewares.

### Paso 5: Registrar en app.ts

```typescript
import authRoutes from './modulos/auth/auth.routes';
app.use('/api/v1/auth', authRoutes);
```

---

## 4. Convencion de nombres

| Concepto            | Formato          | Ejemplo                          |
|---------------------|------------------|----------------------------------|
| Modelo Prisma       | PascalCase (es)  | `Producto`, `DetalleOrden`       |
| Campo Prisma        | camelCase (es)   | `precioVenta1`, `creadoEn`       |
| Tabla BD            | snake_case (es)  | `productos`, `detalles_orden`    |
| Enum Prisma         | UPPER_SNAKE (es) | `SALIDA_VENTA`, `PENDIENTE`      |
| Archivo modulo      | kebab-case (es)  | `auth.schema.ts`, `ordenes.service.ts` |
| Carpeta modulo      | kebab-case (es)  | `turnos-caja/`, `movimientos/`   |
| Schema Zod          | PascalCase (es)  | `CrearProductoSchema`            |
| Tipo DTO            | PascalCase (es)  | `CrearProductoDto`               |
| Service             | PascalCase (es)  | `ProductoService`                |
| Controller          | PascalCase (es)  | `ProductoController`             |
| Endpoint API        | kebab-case (es)  | `/api/v1/productos`              |
| Variable/funcion    | camelCase (es)   | `obtenerPorId`, `listar`         |

---

## 5. Relacion entre modulos

Los modulos no son independientes. Estan conectados por relaciones de negocio.

```
                        +-----------+
                        |  EMPRESA  |  (tenant central)
                        +-----+-----+
                              |
          +-------------------+-------------------+
          |                   |                   |
     +----v----+        +----v----+        +-----v------+
     | USUARIO |        | ALMACEN |        | CATEGORIA  |
     +----+----+        +----+----+        +-----+------+
          |                  |                    |
          |             +----v----+          +----v-----+
          |             |EXISTENCIA|<------->| PRODUCTO |
          |             +---------+          +----+-----+
          |                  ^                    |
          |                  |                    |
     +----v----+    +--------v---------+     +----v------+
     | SESION  |    | MOV. INVENTARIO  |     | PROVEEDOR |
     +---------+    +------------------+     +-----------+
          |
     +----v----+         +----------+       +-----------+
     | TURNO   |-------->|  ORDEN   |------>|  CLIENTE  |
     |  CAJA   |         +----+-----+       +-----------+
     +---------+              |
                         +----v-------+     +-----------+
                         |DETALLE ORDEN|    |   PAGO    |
                         +-------------+    +-----------+
                              |
                         +----v-------+
                         |  ENTREGA   |
                         +----+-------+
                              |
                         (REPARTIDOR)

     +--------------+     +--------------+
     | NOTIFICACION |     |  AUDITORIA   |  (transversales)
     +--------------+     +--------------+
```

### Dependencias entre modulos al desarrollar:

| Modulo           | Depende de                                     |
|------------------|------------------------------------------------|
| auth             | Usuario, Sesion (modelos Prisma)                |
| usuarios         | auth (para crear usuarios autenticado)          |
| categorias       | -- (modulo independiente)                       |
| almacenes        | -- (modulo independiente)                       |
| proveedores      | -- (modulo independiente)                       |
| productos        | categorias, proveedores (relaciones opcionales) |
| clientes         | -- (modulo independiente)                       |
| inventario       | productos, almacenes (existencias + movimientos)|
| compras          | proveedores, productos, inventario              |
| turnos-caja      | auth (usuario activo)                           |
| ordenes          | productos, inventario, turnos-caja, clientes    |
| entregas         | ordenes, clientes (repartidor)                  |
| reportes         | ordenes, inventario, productos (solo lectura)   |

---

## 6. Mapa de dependencias del sistema

### Modulos de infraestructura (usados por todos):

```
src/config/
  env.ts          -- Variables de entorno validadas con Zod
  database.ts     -- Singleton PrismaClient
  cache.ts        -- NodeCache + TTL por recurso + invalidacion

src/compartido/
  respuesta.ts    -- ApiResponse.ok() / ApiResponse.fail()
  errores.ts      -- AppError, ErrorNoEncontrado, ErrorConflicto, etc.
  sanitizar.ts    -- sanitizarString() / sanitizarObjeto() con xss
  paginacion.ts   -- paginar() + construirMeta()
  asyncHandler.ts -- Wrapper try/catch para controllers async
  logger.ts       -- Winston configurado por entorno

src/middlewares/
  autenticar.ts    -- JWT + validacion de sesion en BD
  requerirRol.ts   -- Verificar rol del usuario
  validar.ts       -- Validar body/query/params con schema Zod
  limitarRates.ts  -- Rate limiting por tipo de ruta
  manejarErrores.ts-- Error handler global (ultimo middleware)
```

### Como un service usa las utilidades:

```typescript
// Ejemplo real de un service tipico
import { prisma }                                  from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo }   from '../../config/cache';
import { sanitizarObjeto }                         from '../../compartido/sanitizar';
import { paginar, construirMeta }                  from '../../compartido/paginacion';
import { ErrorNoEncontrado, ErrorConflicto }       from '../../compartido/errores';
import type { CrearProductoDto, FiltrosProductoDto } from './productos.schema';

export const ProductoService = {
  async listar(filtros: FiltrosProductoDto, empresaId: string) {
    // 1. Verificar cache
    const clave = `productos:${empresaId}:${JSON.stringify(filtros)}`;
    const enCache = cache.get(clave);
    if (enCache) return enCache;

    // 2. Construir condiciones de busqueda
    const where = { empresaId, activo: true, /* ...filtros */ };

    // 3. Ejecutar consulta paginada en transaccion
    const [datos, total] = await prisma.$transaction([
      prisma.producto.findMany({ where, ...paginar(filtros), orderBy: { creadoEn: 'desc' } }),
      prisma.producto.count({ where }),
    ]);

    // 4. Construir respuesta con meta de paginacion
    const resultado = { datos, meta: construirMeta(total, filtros) };

    // 5. Guardar en cache
    cache.set(clave, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  async crear(dto: CrearProductoDto, empresaId: string) {
    // 1. Sanitizar strings del usuario (prevenir XSS almacenado)
    const limpio = sanitizarObjeto({ ...dto, empresaId });

    // 2. Verificar unicidad antes de crear
    const existente = await prisma.producto.findUnique({ where: { sku: limpio.sku } });
    if (existente) throw new ErrorConflicto('El SKU ya existe en el catalogo');

    // 3. Persistir en BD
    const producto = await prisma.producto.create({ data: limpio });

    // 4. Invalidar cache del modulo
    invalidarCacheModulo('productos');

    return producto;
  },
};
```

---

## 7. Plan de APIs por modulo

### Fase 2: Autenticacion (auth)

| Metodo | Ruta              | Accion                                 | Rol         |
|--------|-------------------|----------------------------------------|-------------|
| POST   | /auth/login       | Iniciar sesion (correo + contrasena)   | Publico     |
| POST   | /auth/logout      | Cerrar sesion activa                   | Autenticado |
| GET    | /auth/perfil      | Obtener datos del usuario actual       | Autenticado |
| POST   | /auth/cambiar-pin | Cambiar PIN de autorizacion en caja    | ADMIN       |

### Fase 3: Catalogo

**Categorias**
| Metodo | Ruta              | Accion                  | Rol            |
|--------|-------------------|-------------------------|----------------|
| GET    | /categorias       | Listar con paginacion   | Autenticado    |
| GET    | /categorias/:id   | Obtener por ID          | Autenticado    |
| POST   | /categorias       | Crear categoria         | ADMIN          |
| PUT    | /categorias/:id   | Actualizar categoria    | ADMIN          |
| DELETE | /categorias/:id   | Desactivar (soft delete)| ADMIN          |

**Almacenes** (misma estructura CRUD)
**Proveedores** (misma estructura CRUD)

**Productos**
| Metodo | Ruta                       | Accion                        | Rol         |
|--------|----------------------------|-------------------------------|-------------|
| GET    | /productos                 | Listar con filtros y paginacion| Autenticado|
| GET    | /productos/:id             | Obtener por ID                | Autenticado |
| GET    | /productos/codigo/:barcode | Buscar por codigo de barras   | Autenticado |
| POST   | /productos                 | Crear producto                | ADMIN       |
| PUT    | /productos/:id             | Actualizar producto           | ADMIN       |
| DELETE | /productos/:id             | Desactivar (soft delete)      | ADMIN       |

### Fase 4: Operaciones

**Clientes** (CRUD estandar)

**Inventario**
| Metodo | Ruta                        | Accion                     | Rol   |
|--------|-----------------------------|----------------------------|-------|
| GET    | /inventario/existencias     | Consultar stock actual     | Todos |
| GET    | /inventario/movimientos     | Historial de movimientos   | ADMIN |
| POST   | /inventario/ajuste          | Ajuste manual de stock     | ADMIN |
| POST   | /inventario/traslado        | Trasladar entre almacenes  | ADMIN |
| GET    | /inventario/stock-bajo      | Productos bajo minimo      | ADMIN |

**Compras**
| Metodo | Ruta              | Accion                        | Rol   |
|--------|-------------------|-------------------------------|-------|
| GET    | /compras          | Listar compras                | ADMIN |
| GET    | /compras/:id      | Detalle de compra             | ADMIN |
| POST   | /compras          | Registrar compra              | ADMIN |
| POST   | /compras/:id/recibir | Recibir mercancia (+ stock)| ADMIN |

**Turnos de Caja**
| Metodo | Ruta                  | Accion                  | Rol           |
|--------|-----------------------|-------------------------|---------------|
| POST   | /turnos-caja/abrir    | Abrir turno de caja     | CAJERO, ADMIN |
| POST   | /turnos-caja/cerrar   | Cerrar turno activo     | CAJERO, ADMIN |
| GET    | /turnos-caja/activo   | Obtener turno activo    | CAJERO, ADMIN |
| GET    | /turnos-caja          | Historial de turnos     | ADMIN         |

**Ordenes (POS)**
| Metodo | Ruta                    | Accion                       | Rol           |
|--------|-------------------------|------------------------------|---------------|
| GET    | /ordenes                | Listar ordenes               | ADMIN, CAJERO |
| GET    | /ordenes/:id            | Detalle de orden              | ADMIN, CAJERO |
| POST   | /ordenes                | Crear venta (transaccion POS)| CAJERO, ADMIN |
| POST   | /ordenes/:id/cancelar   | Cancelar orden (+ stock)     | ADMIN         |
| POST   | /ordenes/cotizacion     | Crear cotizacion (sin stock) | CAJERO, ADMIN |

**Entregas**
| Metodo | Ruta                       | Accion                   | Rol              |
|--------|----------------------------|--------------------------|------------------|
| GET    | /entregas                  | Listar entregas          | ADMIN, REPARTIDOR|
| GET    | /entregas/:id              | Detalle de entrega       | ADMIN, REPARTIDOR|
| POST   | /entregas                  | Asignar entrega          | ADMIN            |
| PATCH  | /entregas/:id/estado       | Actualizar estado        | REPARTIDOR       |

### Fase 5: Reportes

| Metodo | Ruta                       | Accion                      | Rol   |
|--------|----------------------------|-----------------------------|-------|
| GET    | /reportes/ventas           | Resumen de ventas por fecha | ADMIN |
| GET    | /reportes/utilidad         | Margen de utilidad          | ADMIN |
| GET    | /reportes/productos-top    | Productos mas vendidos      | ADMIN |
| GET    | /reportes/inventario       | Valuacion de inventario     | ADMIN |
| GET    | /reportes/cajeros          | Desempeno por cajero        | ADMIN |
| GET    | /reportes/dashboard        | KPIs principales            | ADMIN |

---

## 8. Uso de utilidades compartidas

### Cuando usar cada utilidad:

| Utilidad              | Donde se usa                | Ejemplo                                    |
|-----------------------|-----------------------------|--------------------------------------------|
| `sanitizarObjeto()`   | Service, antes de create/update | `sanitizarObjeto(dto)`                |
| `paginar()`           | Service, en findMany        | `prisma.x.findMany({ ...paginar(filtros) })` |
| `construirMeta()`     | Service, despues de count   | `construirMeta(total, filtros)`            |
| `ApiResponse.ok()`    | Controller, respuesta       | `res.json(ApiResponse.ok(datos))`          |
| `ApiResponse.fail()`  | manejarErrores (automatico) | No llamar manualmente                      |
| `asyncHandler()`      | Routes, envolver controller | `asyncHandler(controller.listar)`          |
| `autenticar`          | Routes, proteger rutas      | `router.use(autenticar)`                   |
| `requerirRol()`       | Routes, restringir por rol  | `requerirRol('ADMIN')`                     |
| `validar()`           | Routes, validar input       | `validar(CrearSchema)`                     |
| `throw ErrorXxx()`    | Service, errores de negocio | `throw new ErrorNoEncontrado('...')`       |
| `invalidarCacheModulo()` | Service, en mutaciones   | `invalidarCacheModulo('productos')`        |
| `logger.info/error()` | Donde sea necesario         | `logger.error({ ... })`                   |
| `cache.get/set()`     | Service, en lecturas        | `cache.get(clave)`                         |
