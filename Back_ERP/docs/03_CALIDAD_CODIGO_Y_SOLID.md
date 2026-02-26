# Calidad de Codigo, Principios SOLID y Buenas Practicas

## Indice

1. [Principios SOLID aplicados](#principios-solid-aplicados)
2. [Configuracion estricta de TypeScript](#configuracion-estricta-de-typescript)
3. [Patrones de diseno utilizados](#patrones-de-diseno-utilizados)
4. [Reglas de codigo del proyecto](#reglas-de-codigo-del-proyecto)
5. [Validacion como primera linea de defensa](#validacion-como-primera-linea-de-defensa)
6. [Manejo de errores como ciudadano de primera clase](#manejo-de-errores-como-ciudadano-de-primera-clase)
7. [Inmutabilidad y trazabilidad](#inmutabilidad-y-trazabilidad)
8. [Seguridad por diseno](#seguridad-por-diseno)
9. [Convenciones de nomenclatura](#convenciones-de-nomenclatura)
10. [Anti-patrones evitados](#anti-patrones-evitados)

---

## Principios SOLID aplicados

### S -- Single Responsibility Principle (Responsabilidad Unica)

Cada archivo tiene una sola razon para cambiar:

| Archivo | Responsabilidad unica |
|---|---|
| `categorias.routes.ts` | Definir que endpoints existen y que middlewares aplican |
| `categorias.schema.ts` | Definir que datos son validos para cada operacion |
| `categorias.controller.ts` | Traducir entre HTTP y la capa de servicio |
| `categorias.service.ts` | Ejecutar logica de negocio y acceder a la BD |
| `manejarErrores.ts` | Transformar cualquier error en una respuesta HTTP |
| `autenticar.ts` | Verificar identidad del usuario |
| `requerirRol.ts` | Verificar permisos del usuario |
| `validar.ts` | Ejecutar schemas Zod contra datos de entrada |

**Ejemplo concreto:** Si cambian las reglas de validacion de una categoria
(por ejemplo, el nombre ahora debe tener minimo 3 caracteres en lugar de 2),
solo se modifica `categorias.schema.ts`. No se toca el controller, ni el
servicio, ni las rutas.

**Ejemplo concreto:** Si se cambia la forma de autenticar (de JWT a OAuth2),
solo se modifica `autenticar.ts`. Los 13 modulos siguen funcionando sin cambios
porque dependen de la interfaz `req.user`, no de la implementacion JWT.

### O -- Open/Closed Principle (Abierto/Cerrado)

El sistema esta abierto a extension pero cerrado a modificacion en puntos clave:

**Jerarquia de errores:**
```typescript
// Agregar un nuevo tipo de error NO requiere modificar manejarErrores.ts
export class ErrorRateLimitado extends AppError {
  constructor() { super('Demasiadas peticiones', 429, 'RATE_LIMITED'); }
}
// manejarErrores.ts ya lo maneja porque verifica `instanceof AppError`
```

**Middlewares componibles:**
```typescript
// Agregar autorizacion a un endpoint es composicion, no modificacion
router.post('/', requerirRol('ADMIN'), validar(Schema), controller.crear);
// Agregar un nuevo rol solo requiere pasar otro string al mismo middleware
router.get('/', requerirRol('ADMIN', 'SUPERVISOR'), controller.listar);
```

**Modulos pluggables:**
```typescript
// Agregar un modulo nuevo (ej: "proveedores") es una linea en app.ts
app.use('/api/v1/proveedores', proveedoresRoutes);
// No se modifica ningun modulo existente
```

### L -- Liskov Substitution Principle (Sustitucion de Liskov)

Las subclases de `AppError` pueden usarse donde se espera `AppError` sin
romper el comportamiento:

```typescript
// Todas estas son AppError y el middleware las trata uniformemente
throw new ErrorNoEncontrado('Producto no existe');  // 404
throw new ErrorNegocio('Stock insuficiente');        // 422
throw new ErrorConflicto('SKU duplicado');           // 409

// manejarErrores.ts las procesa con la misma logica:
if (err instanceof AppError && err.esOperacional) {
  res.status(err.statusCode).json(ApiResponse.fail(err.mensaje, err.codigo));
}
```

Cada subclase respeta el contrato de la clase base: tiene `statusCode`,
`codigo`, `mensaje` y `esOperacional`. El middleware no necesita conocer cada
subclase especifica; trabaja con la interfaz comun.

### I -- Interface Segregation Principle (Segregacion de Interfaces)

Los middlewares tienen interfaces minimas e independientes:

```typescript
// validar() solo necesita un ZodSchema y un objetivo
export const validar = (schema: ZodSchema, objetivo: 'body' | 'query' | 'params') => ...

// requerirRol() solo necesita una lista de roles permitidos
export const requerirRol = (...roles: Rol[]) => ...

// autenticar solo inyecta req.user con la interfaz minima
interface JwtPayload {
  usuarioId: string;
  empresaId: string;
  rol: string;
  sesionId: string;
}
```

Ningun middleware expone mas informacion de la necesaria. El controller no sabe
como se verifico el JWT; solo sabe que `req.user` existe y tiene los 4 campos
del payload.

### D -- Dependency Inversion Principle (Inversion de Dependencias)

Las capas superiores no dependen de las inferiores directamente:

```
[Controller] --> depende de --> [Service] (interfaz: metodos estaticos)
[Service]    --> depende de --> [Prisma]  (importa `prisma` de config)
[Routes]     --> depende de --> [Middlewares] (importa funciones genericas)
```

**Ejemplo:** El controller no importa Prisma directamente. Llama a
`CategoriaService.crear(dto, empresaId)` sin saber si usa PostgreSQL, MongoDB
o un archivo JSON. Si se quisiera cambiar el ORM, solo se modifica la capa de
servicio.

**Ejemplo:** El middleware `validar` recibe un `ZodSchema` generico. No conoce
la estructura especifica de cada schema. Funciona igual para validar
categorias, productos u ordenes:

```typescript
// En categorias.routes.ts
router.post('/', validar(CrearCategoriaSchema), controller.crear);

// En productos.routes.ts (exactamente la misma funcion)
router.post('/', validar(CrearProductoSchema), controller.crear);
```

---

## Configuracion estricta de TypeScript

El `tsconfig.json` activa las reglas mas estrictas disponibles:

```json
{
  "strict": true,              // Activa TODAS las comprobaciones estrictas
  "noImplicitAny": true,       // Prohibe el tipo 'any' implicito
  "strictNullChecks": true,    // Distingue entre T, T|null y T|undefined
  "strictFunctionTypes": true, // Verifica varianza de parametros de funciones
  "noUnusedLocals": true,      // Error si hay variables declaradas sin usar
  "noUnusedParameters": true,  // Error si hay parametros de funcion sin usar
  "noImplicitReturns": true,   // Error si una funcion tiene paths sin return
  "noFallthroughCasesInSwitch": true  // Error si un case de switch no tiene break
}
```

### Por que strict mode importa

Sin `strict: true`, TypeScript permite codigo como este sin errores:

```typescript
// SIN strict: compila sin errores
function buscar(id) {            // 'id' es 'any' implicito
  const resultado = null;
  return resultado.nombre;       // NullPointerException en runtime
}
```

Con `strict: true`, TypeScript obliga a tipar todo explicitamente:

```typescript
// CON strict: errores en compilacion, no en produccion
function buscar(id: string): Producto | null {
  const resultado: Producto | null = null;
  return resultado?.nombre;  // Operador opcional previene el crash
}
```

### Resultado practico

El comando `npx tsc --noEmit` se ejecuta en CI antes de cada deploy. Si hay
un solo error de tipos, el build falla. Esto significa que el codigo en
produccion nunca tiene errores de tipos que TypeScript pueda detectar.

En este proyecto: **0 errores de compilacion con strict mode activado en los
13 modulos, 6 middlewares, 6 utilidades, 4 configs y el entry point.**

---

## Patrones de diseno utilizados

### Singleton (database.ts)

```typescript
const globalParaPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({ log: ['error'] });

if (env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}
```

**Problema que resuelve:** PrismaClient mantiene un pool de conexiones a
PostgreSQL. Si se crean multiples instancias (por ejemplo, durante hot-reload
en desarrollo), cada una abre su propio pool, agotando rapidamente las
conexiones disponibles.

**Como lo resuelve:** Se almacena la instancia en `globalThis`, que sobrevive
al hot-reload de tsx/nodemon. En produccion no se usa `globalThis` porque no
hay hot-reload.

### Factory Method (errores.ts)

```typescript
export class AppError extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly statusCode: number,
    public readonly codigo: string,
    public readonly esOperacional: boolean = true,
  ) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorNoEncontrado extends AppError {
  constructor(m: string) { super(m, 404, 'NOT_FOUND'); }
}
```

**Problema que resuelve:** Sin esta jerarquia, cada servicio tendria que
decidir codigos HTTP y formatos de error independientemente, causando
inconsistencias.

**Como lo resuelve:** Cada subclase encapsula el status code y el codigo de
error. El servicio solo necesita saber "esto no se encontro" y lanza
`ErrorNoEncontrado`. El middleware traduce uniformemente.

### Decorator/Wrapper (asyncHandler.ts)

```typescript
export const asyncHandler =
  (fn: HandlerAsync) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
```

**Problema que resuelve:** Express no captura errores de funciones async
automaticamente. Sin este wrapper, cada controller necesitaria:

```typescript
// SIN asyncHandler: codigo repetitivo en cada metodo
static crear = async (req, res, next) => {
  try {
    const categoria = await Service.crear(req.body, req.user.empresaId);
    res.status(201).json(ApiResponse.ok(categoria));
  } catch (error) {
    next(error);  // Hay que recordar hacer esto en CADA metodo
  }
};
```

**Como lo resuelve:** Envuelve el handler y propaga errores automaticamente:

```typescript
// CON asyncHandler: limpio y seguro
router.post('/', asyncHandler(Controller.crear));

static crear = async (req, res) => {
  const categoria = await Service.crear(req.body, req.user.empresaId);
  res.status(201).json(ApiResponse.ok(categoria));
  // Si Service.crear lanza error, asyncHandler lo captura y llama a next(error)
};
```

### Strategy (validar.ts)

```typescript
export const validar =
  (schema: ZodSchema, objetivo: Objetivo = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req[objetivo]);
    if (!resultado.success) return next(resultado.error);
    (req as any)[objetivo] = resultado.data;
    next();
  };
```

**Problema que resuelve:** Cada endpoint necesita validar datos diferentes (body
para crear, query para listar, params para obtener por ID).

**Como lo resuelve:** El schema Zod es la "estrategia" intercambiable. El
middleware es generico y acepta cualquier schema. La misma funcion valida el
body de "crear categoria" y el query de "listar productos".

### Builder (respuesta.ts)

```typescript
export class ApiResponse {
  static ok<T>(datos: T, mensaje = 'OK', meta?: MetaPaginacion) {
    return { exito: true, datos, mensaje, meta: meta ?? null };
  }

  static fail(mensaje: string, codigo: string, detalles?: unknown) {
    return { exito: false, datos: null, error: { mensaje, codigo, detalles: detalles ?? null } };
  }
}
```

**Problema que resuelve:** Sin un formato estandar, cada endpoint inventaria su
propia estructura de respuesta, haciendo imposible que el frontend procese
errores de manera uniforme.

**Como lo resuelve:** Todas las respuestas exitosas usan `ApiResponse.ok()` y
todas las de error usan `ApiResponse.fail()`. El frontend solo necesita
verificar `response.exito` para saber si fue exitoso.

---

## Reglas de codigo del proyecto

### 1. Nunca hacer `res.status()` en un servicio

Los servicios son agnosticos de HTTP. Lanzan errores tipados:

```typescript
// CORRECTO: el servicio lanza un error tipado
throw new ErrorNegocio('Stock insuficiente');

// INCORRECTO: el servicio conoce detalles HTTP
res.status(422).json({ error: 'Stock insuficiente' });
```

### 2. Nunca hacer `try/catch` en un controller

El `asyncHandler` se encarga de capturar errores. Los controllers son lineales:

```typescript
// CORRECTO: lineal, sin try/catch
static crear = async (req: Request, res: Response): Promise<void> => {
  const resultado = await Service.crear(req.body, req.user.empresaId);
  res.status(201).json(ApiResponse.ok(resultado));
};

// INCORRECTO: try/catch manual (el asyncHandler ya lo hace)
static crear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await Service.crear(req.body);
    res.status(201).json(ApiResponse.ok(resultado));
  } catch (err) {
    next(err);
  }
};
```

### 3. Toda entrada externa se valida con Zod

Ningun dato del usuario llega al servicio sin pasar por un schema Zod:

```typescript
// En las rutas: el middleware validar ejecuta el schema ANTES del controller
router.post('/', validar(CrearProductoSchema), asyncHandler(Controller.crear));

// El controller recibe datos ya validados y tipados
static crear = async (req: Request, res: Response) => {
  const dto = req.body;  // Esto ya paso por Zod, es seguro
};
```

### 4. Toda respuesta usa ApiResponse

```typescript
// CORRECTO: formato uniforme
res.json(ApiResponse.ok(datos, 'Producto creado'));
res.json(ApiResponse.fail('No encontrado', 'NOT_FOUND'));

// INCORRECTO: formato ad-hoc
res.json({ success: true, product: datos });
res.json({ error: 'Not found' });
```

### 5. Toda query filtra por empresaId

Para mantener el aislamiento multi-tenant:

```typescript
// CORRECTO: siempre filtrar por empresa del usuario autenticado
const productos = await prisma.producto.findMany({
  where: { empresaId, activo: true },
});

// INCORRECTO: query sin filtro de empresa (fuga de datos cross-tenant)
const productos = await prisma.producto.findMany({
  where: { activo: true },
});
```

### 6. Los strings del usuario se sanitizan

```typescript
import { sanitizarObjeto } from '../../compartido/sanitizar';

// En el servicio, antes de escribir en BD:
const datosSeguros = sanitizarObjeto(dto);
const producto = await prisma.producto.create({ data: { ...datosSeguros, empresaId } });
```

### 7. Las operaciones criticas usan transacciones

```typescript
// Venta: descontar stock + crear orden + registrar pago en UNA transaccion
await prisma.$transaction(async (tx) => {
  await tx.productoAlmacen.update({ where: ..., data: { cantidad: { decrement: cantidad } } });
  const orden = await tx.orden.create({ data: ... });
  await tx.pagoOrden.create({ data: { ordenId: orden.id, ... } });
});
// Si cualquier paso falla, TODO se revierte automaticamente
```

---

## Validacion como primera linea de defensa

### Capas de validacion

El sistema aplica validacion en 3 capas independientes:

```
Capa 1: Zod (schema en runtime)
  - Valida tipos, formatos, rangos, strings vacios
  - Rechaza con 400 antes de ejecutar logica

Capa 2: Servicio (reglas de negocio)
  - Valida unicidad ("ya existe un producto con ese SKU")
  - Valida estado ("la orden ya esta cancelada")
  - Valida relaciones ("el almacen destino no existe")
  - Rechaza con 409/422

Capa 3: PostgreSQL (constraints de BD)
  - Unique constraints como ultima red de seguridad
  - Foreign keys para integridad referencial
  - NOT NULL para campos obligatorios
  - Prisma traduce errores de BD en codigos (P2002, P2025)
```

### Ejemplo de las 3 capas en accion

Crear un producto con SKU duplicado:

```
1. Capa Zod: verifica que "sku" es string de 3-50 chars  -> PASA
2. Capa Servicio: busca producto con mismo SKU y empresa  -> DETECTA DUPLICADO
3.   -> Lanza ErrorConflicto('Ya existe un producto con ese SKU')
4.   -> Middleware responde 409

Si por alguna razon la capa 2 falla:
3. Capa PostgreSQL: unique constraint en (sku, empresaId) -> P2002
4. Middleware traduce P2002 a 409 "Registro duplicado"
```

---

## Manejo de errores como ciudadano de primera clase

### Principio: los errores son datos, no excepciones invisibles

Cada error en el sistema tiene:
- Un status code HTTP especifico
- Un codigo de error legible por maquina
- Un mensaje legible por humanos
- Contexto para depuracion (solo en desarrollo)

### Flujo de propagacion

```
Servicio lanza error tipado
       |
       v
asyncHandler lo captura (catch)
       |
       v
Llama a next(error)
       |
       v
Express busca el siguiente error handler
       |
       v
manejarErrores.ts lo procesa:
  1. Loguea con contexto (requestId, ruta, usuario)
  2. Clasifica el tipo de error
  3. Produce respuesta HTTP estandarizada
  4. En produccion, oculta stack traces y detalles internos
```

### Lo que NUNCA se filtra a produccion

```typescript
// En desarrollo: detalle completo para debugging
{
  "exito": false,
  "error": {
    "mensaje": "Cannot read properties of undefined (reading 'id')",
    "codigo": "INTERNAL_ERROR"
  }
}

// En produccion: mensaje generico para seguridad
{
  "exito": false,
  "error": {
    "mensaje": "Error interno del servidor",
    "codigo": "INTERNAL_ERROR"
  }
}
```

---

## Inmutabilidad y trazabilidad

### Movimientos de inventario inmutables

Los movimientos de inventario nunca se modifican ni eliminan. Cada ajuste crea
un nuevo registro:

```typescript
const movimiento = await tx.movimientoInventario.create({
  data: {
    productoId,
    almacenId,
    tipoMovimiento: 'MERMA',
    cantidad: 2,
    cantidadAnterior: 100,
    cantidadPosterior: 98,
    motivo: 'Botellas danadas',
    usuarioId,
  },
});
```

Esto permite reconstruir el historial completo de un producto: cuanto habia,
que paso, cuando, quien lo hizo y por que.

### Registro de auditoria

El modelo `RegistroAuditoria` almacena acciones criticas con valores anteriores
y posteriores en formato JSON:

```
RegistroAuditoria {
  accion: "CANCELAR_ORDEN"
  entidad: "Orden"
  entidadId: "clxyz..."
  valoresAnteriores: { estado: "COMPLETADA" }
  valoresNuevos: { estado: "CANCELADA" }
  usuarioId: "..."
  direccionIp: "192.168.1.1"
  creadoEn: 2026-02-26T10:30:00Z
}
```

### Soft delete

Los registros principales (productos, categorias, clientes) nunca se eliminan
fisicamente. Se marcan como `activo: false`:

```typescript
static eliminar = async (id: string, empresaId: string) => {
  await prisma.categoria.update({
    where: { id, empresaId },
    data: { activo: false },
  });
};
```

Esto preserva la integridad referencial (ordenes historicas que referencian un
producto eliminado siguen funcionando) y permite revertir eliminaciones.

---

## Seguridad por diseno

| Medida | Implementacion | Archivo |
|---|---|---|
| SQL Injection | Prisma usa queries parametrizados; nunca concatena strings | Todos los services |
| XSS | Sanitizacion de strings con `xss` antes de almacenar | sanitizar.ts |
| CSRF | Autenticacion por header (Bearer), no por cookies | autenticar.ts |
| Fuerza bruta | Rate limiting: 5 intentos de login / 15 min | limitarRates.ts |
| Secrets exposure | Variables de entorno validadas; nunca hardcodeadas | env.ts |
| Stack traces | Ocultos en produccion (mensaje generico) | manejarErrores.ts |
| Parameter pollution | hpp middleware con whitelist | seguridad.ts |
| Headers de seguridad | Helmet + headers custom (CSP, HSTS, X-Frame) | app.ts, seguridad.ts |
| Password storage | bcrypt con 12 rondas de salt | auth.service.ts |
| Session hijacking | Sesion en BD, verificada en cada request | autenticar.ts |
| Data isolation | Todas las queries filtran por empresaId | Todos los services |

---

## Convenciones de nomenclatura

| Elemento | Convencion | Ejemplo |
|---|---|---|
| Archivos | kebab-case en espanol | `categorias.service.ts` |
| Clases | PascalCase | `CategoriasController`, `AppError` |
| Funciones | camelCase | `construirMeta`, `sanitizarObjeto` |
| Variables | camelCase | `empresaId`, `tokenAdmin` |
| Constantes | SNAKE_UPPER | `CacheTTL.PRODUCTOS`, `BCRYPT_SALT_ROUNDS` |
| Modelos Prisma | PascalCase espanol | `Producto`, `DetalleOrden` |
| Campos Prisma | camelCase | `codigoBarras`, `precioVenta` |
| Tablas BD | snake_case (via `@@map`) | `productos`, `detalles_orden` |
| Enums | SNAKE_UPPER | `SALIDA_VENTA`, `AJUSTE_MANUAL` |
| Rutas HTTP | kebab-case plural | `/turnos-caja`, `/ordenes` |
| Variables de entorno | SNAKE_UPPER | `JWT_SECRET`, `CORS_ORIGIN` |

---

## Anti-patrones evitados

### 1. God Object (Objeto Dios)

**Evitado con:** Modulos verticales. Cada dominio tiene su propio servicio
en lugar de un unico `database.service.ts` con 2000 lineas.

### 2. Callback Hell

**Evitado con:** async/await en todas las operaciones asincronas. El
`asyncHandler` garantiza que los errores de promesas se propaguen correctamente.

### 3. Magic Numbers

**Evitado con:** Constantes nombradas:
```typescript
// En vez de: cache.set(key, data, 300)
cache.set(key, data, CacheTTL.CATEGORIAS);  // 300 = 5 minutos para categorias
```

### 4. Anemic Domain Model (Modelo de dominio anemico)

**Evitado con:** Los servicios contienen logica de negocio real, no solo CRUD:
- Verificar credito disponible del cliente antes de vender
- Calcular monto esperado en el cierre de caja
- Validar transiciones de estado de entregas
- Aplicar mapeo de tipos de movimiento segun contexto

### 5. Shotgun Surgery (Cirugia de escopeta)

**Evitado con:** Centralizacion de conceptos transversales:
- Un solo lugar para formato de respuesta (`ApiResponse`)
- Un solo lugar para manejo de errores (`manejarErrores`)
- Un solo lugar para validacion (`validar` + schemas Zod)
- Un solo lugar para logging (`logger`)

Cambiar el formato de respuesta requiere modificar un solo archivo, no 13
controllers.
