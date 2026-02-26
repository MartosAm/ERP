# .github/copilot-instructions.md
# Proyecto: Sistema ERP/POS para PyMEs
# Backend — Node.js 20 · TypeScript 5 · Express 4 · Prisma 5 · PostgreSQL 16
# Directorio raiz: erp-pos-backend/

---

## PROPOSITO DEL PROYECTO

Sistema de punto de venta y control empresarial para pequenas y medianas empresas.
Problematica que resuelve: falta de control de inventario, ventas sin registro, acceso sin
auditoria y visibilidad nula para el dueno del negocio cuando no esta en el local.

Roles: ADMIN (dueno o gerente), CAJERO (empleado de caja), REPARTIDOR (entregas a domicilio).
Despliegue final: VPS Debian 12, Nginx como reverse proxy, Docker para contenedores.
Equipo pequeno. Sin sobreingenieria. Cada decision tecnica resuelve un problema real del negocio.

Este archivo es el contrato tecnico del proyecto. Copilot debe leerlo antes de generar
cualquier codigo. Lo que no esta aqui definido se consulta antes de implementar.

---

## STACK TECNOLOGICO — NO CAMBIAR

No agregar, reemplazar ni sugerir alternativas sin justificacion documentada en ARCHITECTURE.md.

```
Runtime         : Node.js 20 LTS
Lenguaje        : TypeScript 5  —  strict: true obligatorio en tsconfig.json
Framework HTTP  : Express 4
ORM             : Prisma 5  →  PostgreSQL 16
Validacion      : Zod 3  (unico validador del proyecto, sin class-validator ni Joi)
Autenticacion   : jsonwebtoken 9  +  bcrypt 5
Sanitizacion    : xss  (limpieza de strings de usuario antes de persistir)
Cache           : node-cache  (in-memory, sin Redis en v1)
Logger          : Winston 3
Rate limiting   : express-rate-limit
Documentacion   : swagger-jsdoc  +  swagger-ui-express
Testing         : Jest 29  +  Supertest 6
Utilidades      : dayjs (manejo de fechas)  +  uuid (identificadores externos)
```

---

## PRINCIPIOS SOLID — APLICACION CONCRETA

**Single Responsibility**
Cada archivo tiene una sola razon para cambiar.
El controller conoce solo HTTP. El service conoce solo logica de negocio.
El schema conoce solo validacion y tipos. Si un service supera 150 lineas, dividirlo.

**Open/Closed**
Los services dependen de interfaces TypeScript, no de implementaciones concretas.
Para agregar un nuevo tipo de movimiento de inventario: extender el enum y agregar el caso.
No modificar la logica existente del servicio de inventario.

**Liskov Substitution**
Toda implementacion de una interfaz es intercambiable sin romper el sistema.
Los errores custom heredan de AppError y se comportan de forma predecible en el errorHandler.

**Interface Segregation**
Las interfaces son especificas por modulo. No crear interfaces genericas con muchos metodos
que obligan a implementar funcionalidad que no se usa.

**Dependency Inversion**
Los services no crean sus propias dependencias. Las reciben como parametros o las consumen
a traves de los singletons de config/. Los controllers nunca instancian services directamente.

---

## QUE HACER Y QUE NO HACER

Se hace:
- Validar todo input con Zod antes de que toque el service.
- Sanitizar strings con xss() antes de persistir en base de datos.
- Filtrar siempre por companyId extraido del JWT. Nunca del body ni de query params.
- Usar prisma.$transaction() en toda operacion que toque mas de una tabla.
- Registrar en AuditLog toda accion critica: crear o cancelar orden, ajustar stock, cambiar precio.
- Retornar siempre el formato ApiResponse.ok() o ApiResponse.fail(). Sin excepciones.
- Soft delete en todas las tablas de negocio: isActive = false. Nunca DELETE fisico.
- Propagar errores con next(error) hacia el errorHandler global. Nunca responder en el catch.
- Usar asyncHandler para eliminar el try/catch repetitivo en cada controller.
- Documentar con JSDoc los endpoints para Swagger al momento de crearlos.

No se hace:
- No usar console.log. Solo logger.debug / info / warn / error.
- No usar any en TypeScript. Si el tipo no existe, crearlo. Excepcion temporal con comentario TODO.
- No escribir logica de negocio en controllers ni en routes.
- No escribir queries Prisma en controllers. Solo en services.
- No retornar passwordHash, pinHash ni costPrice a roles que no sean ADMIN.
- No aceptar companyId, userId ni role desde body, query params ni headers del cliente.
- No hacer DELETE fisico en tablas de negocio.
- No hacer UPDATE ni DELETE en InventoryMovement ni en AuditLog. Son append-only.
- No generar numeros de orden, folios ni identificadores de negocio desde el cliente.
- No cachear sesiones activas ni stock en tiempo real del POS.
- No instalar librerias fuera del stack definido.
- No exponer stack trace de errores en produccion.
- No usar $queryRawUnsafe. Si se necesita SQL raw, usar $queryRaw con template literals.

---

## ARQUITECTURA: TRES CAPAS POR MODULO

Cada modulo de negocio tiene exactamente estos cuatro archivos y nada mas:

```
erp-pos-backend/src/modulos/{nombre-modulo}/
  {nombre}.schema.ts      — Zod schemas, DTOs y tipos inferidos
  {nombre}.service.ts     — Logica de negocio, reglas de dominio, transacciones Prisma
  {nombre}.controller.ts  — Handler HTTP: extrae datos del request, llama service, responde
  {nombre}.routes.ts      — Express Router: rutas y middlewares por endpoint
```

Flujo de dependencias — nunca invertir ni saltar capas:

```
Request HTTP
    |
    v  autenticar, requerirRol, validar(schema)
routes.ts
    |
    v  req.body / req.params / req.query / req.user (ya validados y tipados)
controller.ts
    |
    v  datos limpios y tipados
service.ts
    |
    v  Prisma queries parametrizadas
PostgreSQL
    |
    v  datos del modelo
service.ts  →  controller.ts  →  res.json(ApiResponse.ok(datos))
```

Regla absoluta:
- El controller nunca importa PrismaClient.
- El service nunca importa Request o Response de Express.
- El schema nunca contiene logica de negocio.
- Las routes nunca contienen logica de negocio ni queries.

---

## ESTRUCTURA DE DIRECTORIOS

```
erp-pos-backend/
|
|-- .github/
|   `-- copilot-instructions.md          — este archivo, contrato tecnico del proyecto
|
|-- prisma/
|   |-- schema.prisma                    — todos los modelos y relaciones
|   |-- seed.ts                          — datos iniciales: empresa, usuario ADMIN, almacen
|   `-- migrations/                      — generado por Prisma, no editar manualmente
|
|-- src/
|   |
|   |-- config/                          — se instancia una sola vez al arrancar la app
|   |   |-- env.ts                       — valida process.env con Zod, falla si falta algo
|   |   |-- database.ts                  — singleton PrismaClient
|   |   `-- cache.ts                     — singleton NodeCache, TTL por tipo de recurso
|   |
|   |-- compartido/                      — utilidades reutilizadas por todos los modulos
|   |   |-- respuesta.ts                 — ApiResponse.ok() y ApiResponse.fail()
|   |   |-- errores.ts                   — AppError y subclases por codigo HTTP
|   |   |-- sanitizar.ts                 — sanitizarString() y sanitizarObjeto() con xss
|   |   |-- paginacion.ts                — paginar() y construirMeta()
|   |   |-- asyncHandler.ts              — wrapper try/catch para handlers async
|   |   `-- logger.ts                    — instancia Winston configurada por entorno
|   |
|   |-- middlewares/                     — interceptores reutilizados en routes
|   |   |-- autenticar.ts                — verifica JWT + sesion activa en BD
|   |   |-- requerirRol.ts               — requireRole(...roles) por endpoint
|   |   |-- validar.ts                   — validate(schema, target) con Zod
|   |   |-- limitarRates.ts              — instancias de rate-limit por tipo de ruta
|   |   `-- manejarErrores.ts            — error middleware global, ultimo en app.ts
|   |
|   |-- modulos/
|   |   |-- auth/
|   |   |   |-- auth.schema.ts
|   |   |   |-- auth.service.ts
|   |   |   |-- auth.controller.ts
|   |   |   `-- auth.routes.ts
|   |   |
|   |   |-- usuarios/
|   |   |   |-- usuarios.schema.ts
|   |   |   |-- usuarios.service.ts
|   |   |   |-- usuarios.controller.ts
|   |   |   `-- usuarios.routes.ts
|   |   |
|   |   |-- categorias/
|   |   |   |-- categorias.schema.ts
|   |   |   |-- categorias.service.ts
|   |   |   |-- categorias.controller.ts
|   |   |   `-- categorias.routes.ts
|   |   |
|   |   |-- almacenes/
|   |   |   |-- almacenes.schema.ts
|   |   |   |-- almacenes.service.ts
|   |   |   |-- almacenes.controller.ts
|   |   |   `-- almacenes.routes.ts
|   |   |
|   |   |-- proveedores/
|   |   |   |-- proveedores.schema.ts
|   |   |   |-- proveedores.service.ts
|   |   |   |-- proveedores.controller.ts
|   |   |   `-- proveedores.routes.ts
|   |   |
|   |   |-- productos/
|   |   |   |-- productos.schema.ts
|   |   |   |-- productos.service.ts      — incluye busqueda por barcode para scanner POS
|   |   |   |-- productos.controller.ts
|   |   |   `-- productos.routes.ts
|   |   |
|   |   |-- clientes/
|   |   |   |-- clientes.schema.ts
|   |   |   |-- clientes.service.ts
|   |   |   |-- clientes.controller.ts
|   |   |   `-- clientes.routes.ts
|   |   |
|   |   |-- inventario/
|   |   |   |-- inventario.schema.ts
|   |   |   |-- inventario.service.ts     — ajustes manuales, historial, traslados
|   |   |   |-- inventario.controller.ts
|   |   |   `-- inventario.routes.ts
|   |   |
|   |   |-- compras/
|   |   |   |-- compras.schema.ts
|   |   |   |-- compras.service.ts        — recepcion de mercancia, actualiza stock
|   |   |   |-- compras.controller.ts
|   |   |   `-- compras.routes.ts
|   |   |
|   |   |-- turnos-caja/
|   |   |   |-- turnos-caja.schema.ts
|   |   |   |-- turnos-caja.service.ts
|   |   |   |-- turnos-caja.controller.ts
|   |   |   `-- turnos-caja.routes.ts
|   |   |
|   |   |-- ordenes/
|   |   |   |-- ordenes.schema.ts
|   |   |   |-- ordenes.service.ts        — transaccion atomica POS, modulo mas critico
|   |   |   |-- ordenes.controller.ts
|   |   |   `-- ordenes.routes.ts
|   |   |
|   |   |-- entregas/
|   |   |   |-- entregas.schema.ts
|   |   |   |-- entregas.service.ts
|   |   |   |-- entregas.controller.ts
|   |   |   `-- entregas.routes.ts
|   |   |
|   |   `-- reportes/
|   |       |-- reportes.schema.ts        — filtros de fecha, agrupacion
|   |       |-- reportes.service.ts       — queries analiticas, solo ADMIN
|   |       |-- reportes.controller.ts
|   |       `-- reportes.routes.ts
|   |
|   |-- tipos/
|   |   `-- express.d.ts                  — extiende Request con req.user: JwtPayload
|   |
|   `-- app.ts                            — configura Express: middlewares globales + rutas
|
|-- server.ts                             — entry point: listen() + graceful shutdown
|-- .env                                  — nunca en git
|-- .env.example                          — template sin valores, si en git
|-- .env.test                             — base de datos separada para Jest
|-- tsconfig.json
|-- jest.config.ts
|-- docker-compose.yml                    — postgres + api para desarrollo local
|-- docker-compose.prod.yml               — postgres + api + nginx para produccion
|-- Dockerfile                            — multi-stage: builder → production
|-- nginx.conf                            — reverse proxy, SSL, headers de seguridad
`-- package.json
```

---

## ARCHIVOS DE CONFIGURACION — IMPLEMENTACION

Estos archivos se crean en la Fase 1 y no se modifican salvo cambio de requisitos.

### src/config/env.ts
Valida las variables de entorno con Zod al arrancar la aplicacion.
Si falta alguna variable o tiene formato incorrecto, el proceso termina con un mensaje
claro que identifica exactamente que falta. Nunca arrancar con configuracion incompleta.

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL:       z.string().url(),
  JWT_SECRET:         z.string().min(32),
  PORT:               z.coerce.number().default(3001),
  NODE_ENV:           z.enum(['development', 'test', 'production']).default('development'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
  CORS_ORIGIN:        z.string().url().default('http://localhost:4200'),
  JWT_EXPIRES_IN:     z.string().default('8h'),
});

const resultado = EnvSchema.safeParse(process.env);
if (!resultado.success) {
  console.error('ERROR: Variables de entorno invalidas —', resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = resultado.data;
```

### src/config/database.ts
Singleton de PrismaClient. Multiples instancias agotan el pool de conexiones de PostgreSQL.
Una sola instancia en toda la aplicacion.

```typescript
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalParaPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalParaPrisma.prisma = prisma;
```

### src/config/cache.ts
Cache in-memory para recursos que se leen frecuentemente y cambian poco.
Reduce la carga sobre PostgreSQL en listados del catalogo y el dashboard del ADMIN.
Se invalida en cada mutacion del recurso cacheado.

```typescript
import NodeCache from 'node-cache';

export const cache = new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false });

export const CacheTTL = {
  CATEGORIAS:  300,
  PRODUCTOS:   120,
  ALMACENES:   600,
  PROVEEDORES: 300,
  CLIENTES:    120,
  REPORTES:     60,
  STOCK_BAJO:   30,
} as const;

// Clave de cache: "{modulo}:{companyId}:{hash-de-filtros}"
// Ejemplo: "productos:cjxyz123:p1-l20-catABC"

export const invalidarCacheModulo = (prefijo: string): void => {
  const claves = cache.keys().filter(k => k.startsWith(prefijo));
  if (claves.length > 0) cache.del(claves);
};
```

---

## ARCHIVOS COMPARTIDOS — IMPLEMENTACION

Estos archivos se crean en la Fase 1. Todos los modulos los importan.
Copilot debe usarlos, no reimplementar su logica en cada modulo.

### src/compartido/respuesta.ts
Formato unificado para todas las respuestas JSON de la API.
El frontend Angular depende de esta estructura exacta.

```typescript
export interface MetaPaginacion {
  total:           number;
  pagina:          number;
  limite:          number;
  totalPaginas:    number;
  tieneSiguiente:  boolean;
  tieneAnterior:   boolean;
}

export class ApiResponse {
  static ok<T>(datos: T, mensaje = 'OK', meta?: MetaPaginacion) {
    return { exito: true, datos, mensaje, meta: meta ?? null };
  }
  static fail(mensaje: string, codigo: string, detalles?: unknown) {
    return { exito: false, datos: null, error: { mensaje, codigo, detalles: detalles ?? null } };
  }
}
```

### src/compartido/errores.ts
Jerarquia de errores tipados que el middleware manejarErrores interpreta
para producir la respuesta HTTP correcta. Lanzar desde los services con throw.
Nunca hacer res.status() dentro de un service o controller catch.

```typescript
export class AppError extends Error {
  constructor(
    public readonly mensaje:       string,
    public readonly statusCode:    number,
    public readonly codigo:        string,
    public readonly esOperacional: boolean = true,
  ) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErrorPeticion     extends AppError { constructor(m: string)         { super(m, 400, 'BAD_REQUEST');     } }
export class ErrorNoAutorizado extends AppError { constructor(m = 'No autorizado') { super(m, 401, 'UNAUTHORIZED');   } }
export class ErrorAcceso       extends AppError { constructor(m = 'Acceso denegado') { super(m, 403, 'FORBIDDEN');   } }
export class ErrorNoEncontrado extends AppError { constructor(m: string)         { super(m, 404, 'NOT_FOUND');       } }
export class ErrorConflicto    extends AppError { constructor(m: string)         { super(m, 409, 'CONFLICT');        } }
export class ErrorNegocio      extends AppError { constructor(m: string)         { super(m, 422, 'UNPROCESSABLE');   } }
```

### src/compartido/sanitizar.ts
Elimina contenido potencialmente malicioso en strings de usuario antes de persistirlos.
Prisma parametriza queries y previene inyeccion SQL.
xss() previene adicionalmente el almacenamiento de scripts en campos de texto libre.

```typescript
import xss from 'xss';

export const sanitizarString = (valor: string): string => xss(valor.trim());

export const sanitizarObjeto = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? sanitizarString(v) : v])
  ) as T;
```

### src/compartido/paginacion.ts
Calcula skip/take de Prisma y construye el objeto meta de paginacion.
Centralizado aqui para no duplicar la formula en cada service.

```typescript
import { MetaPaginacion } from './respuesta';

export interface ParametrosPaginacion { pagina: number; limite: number; }

export const paginar = (p: ParametrosPaginacion) => ({
  skip: (p.pagina - 1) * p.limite,
  take: p.limite,
});

export const construirMeta = (total: number, p: ParametrosPaginacion): MetaPaginacion => {
  const totalPaginas = Math.ceil(total / p.limite);
  return {
    total, pagina: p.pagina, limite: p.limite, totalPaginas,
    tieneSiguiente: p.pagina < totalPaginas,
    tieneAnterior:  p.pagina > 1,
  };
};
```

### src/compartido/asyncHandler.ts
Elimina el bloque try/catch repetitivo en cada metodo de controller.
Cualquier error lanzado por el handler es capturado y entregado a next().

```typescript
import { Request, Response, NextFunction } from 'express';

type HandlerAsync = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (fn: HandlerAsync) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
```

---

## MIDDLEWARES — IMPLEMENTACION

### src/middlewares/autenticar.ts
Verifica JWT y valida la sesion activa en BD en cada request protegido.
Si el ADMIN desactiva un usuario, su sesion queda invalida en el siguiente request.

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma }              from '../config/database';
import { env }                 from '../config/env';
import { ErrorNoAutorizado }   from '../compartido/errores';
import { JwtPayload }          from '../tipos/express';

export const autenticar = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new ErrorNoAutorizado('Token requerido'));

  const token = header.split(' ')[1]!;
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return next(new ErrorNoAutorizado('Token invalido o expirado'));
  }

  const sesion = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { isActive: true, user: { select: { isActive: true } } },
  });

  if (!sesion?.isActive || !sesion.user.isActive) {
    return next(new ErrorNoAutorizado('Sesion invalida o usuario inactivo'));
  }

  req.user = payload;
  next();
};
```

### src/middlewares/requerirRol.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorAcceso } from '../compartido/errores';

type Rol = 'ADMIN' | 'CAJERO' | 'REPARTIDOR';

export const requerirRol =
  (...roles: Rol[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Rol)) {
      return next(new ErrorAcceso('No tiene permisos para esta operacion'));
    }
    next();
  };
```

### src/middlewares/validar.ts
Recibe un schema Zod y el target del request. Reemplaza req[target] con los
datos coercionados y validados. Propaga el ZodError al errorHandler si falla.

```typescript
import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

type Objetivo = 'body' | 'query' | 'params';

export const validar =
  (schema: ZodSchema, objetivo: Objetivo = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req[objetivo]);
    if (!resultado.success) return next(resultado.error);
    (req as Record<string, unknown>)[objetivo] = resultado.data;
    next();
  };
```

### src/middlewares/manejarErrores.ts
Unico lugar en la aplicacion donde se producen respuestas de error.
Cubre: errores Zod, errores Prisma conocidos, AppError y errores inesperados.

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError }   from 'zod';
import { Prisma }     from '@prisma/client';
import { AppError }   from '../compartido/errores';
import { ApiResponse } from '../compartido/respuesta';
import { logger }     from '../compartido/logger';
import { env }        from '../config/env';

export const manejarErrores = (
  err: unknown, req: Request, res: Response, _next: NextFunction
): void => {
  logger.error({ ruta: req.path, metodo: req.method, error: err instanceof Error ? err.message : String(err) });

  if (err instanceof ZodError) {
    res.status(400).json(ApiResponse.fail('Datos de entrada invalidos', 'VALIDATION_ERROR', err.flatten()));
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { res.status(409).json(ApiResponse.fail('Registro duplicado', 'CONFLICT')); return; }
    if (err.code === 'P2025') { res.status(404).json(ApiResponse.fail('Registro no encontrado', 'NOT_FOUND')); return; }
  }
  if (err instanceof AppError && err.esOperacional) {
    res.status(err.statusCode).json(ApiResponse.fail(err.mensaje, err.codigo));
    return;
  }
  const mensaje = env.NODE_ENV === 'production' ? 'Error interno del servidor' : String(err);
  res.status(500).json(ApiResponse.fail(mensaje, 'INTERNAL_ERROR'));
};
```

---

## PATRON CRUD — PLANTILLA PARA TODOS LOS MODULOS

Al generar cualquier modulo nuevo, seguir exactamente este patron.
Sustituir {Entidad}/{entidad}/{ENTIDAD} por el nombre real del modulo.

### 1. {entidad}.schema.ts — primer archivo a crear
```typescript
import { z } from 'zod';

export const Crear{Entidad}Schema = z.object({
  // Definir campos con validaciones de negocio reales.
  // .trim() en todos los strings.
  // .min() y .max() en longitudes conocidas del dominio.
  // .positive() en numeros que no pueden ser negativos.
  // .cuid() en referencias a otros registros de la BD.
});

export const Actualizar{Entidad}Schema = Crear{Entidad}Schema.partial();

export const Filtros{Entidad}Schema = z.object({
  busqueda: z.string().optional(),
  pagina:   z.coerce.number().min(1).default(1),
  limite:   z.coerce.number().min(1).max(100).default(20),
  // Filtros especificos del modulo: estado, categoria, fecha, etc.
});

// Tipos TypeScript inferidos directamente desde los schemas.
// Un solo lugar para cambiar el contrato — schema y tipo se actualizan juntos.
export type Crear{Entidad}Dto      = z.infer<typeof Crear{Entidad}Schema>;
export type Actualizar{Entidad}Dto = z.infer<typeof Actualizar{Entidad}Schema>;
export type Filtros{Entidad}Dto    = z.infer<typeof Filtros{Entidad}Schema>;
```

### 2. {entidad}.service.ts
```typescript
import { prisma }                            from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { sanitizarObjeto }                   from '../../compartido/sanitizar';
import { paginar, construirMeta }            from '../../compartido/paginacion';
import { ErrorNoEncontrado }                 from '../../compartido/errores';
import type {
  Crear{Entidad}Dto,
  Actualizar{Entidad}Dto,
  Filtros{Entidad}Dto,
} from './{entidad}.schema';

// Orden fijo de metodos: listar → obtenerPorId → crear → actualizar → eliminar

export const {Entidad}Service = {

  async listar(filtros: Filtros{Entidad}Dto, companyId: string) {
    const claveCache = `{entidad}:${companyId}:${JSON.stringify(filtros)}`;
    const enCache = cache.get(claveCache);
    if (enCache) return enCache;

    const where = {
      companyId,
      isActive: true,
      ...(filtros.busqueda && {
        nombre: { contains: filtros.busqueda, mode: 'insensitive' as const },
      }),
    };

    const [datos, total] = await prisma.$transaction([
      prisma.{modeloPrisma}.findMany({ where, ...paginar(filtros), orderBy: { createdAt: 'desc' } }),
      prisma.{modeloPrisma}.count({ where }),
    ]);

    const resultado = { datos, meta: construirMeta(total, filtros) };
    cache.set(claveCache, resultado, CacheTTL.{ENTIDAD_MAYUSCULA});
    return resultado;
  },

  async obtenerPorId(id: string, companyId: string) {
    const item = await prisma.{modeloPrisma}.findFirst({
      where: { id, companyId, isActive: true },
    });
    if (!item) throw new ErrorNoEncontrado('{Entidad} no encontrado');
    return item;
  },

  async crear(dto: Crear{Entidad}Dto, companyId: string) {
    const limpio = sanitizarObjeto({ ...dto, companyId });
    // Verificar unicidad antes de crear si el campo tiene restriccion unique.
    const item = await prisma.{modeloPrisma}.create({ data: limpio });
    invalidarCacheModulo('{entidad}');
    return item;
  },

  async actualizar(id: string, dto: Actualizar{Entidad}Dto, companyId: string) {
    await {Entidad}Service.obtenerPorId(id, companyId); // lanza si no existe
    const limpio = sanitizarObjeto(dto);
    const item = await prisma.{modeloPrisma}.update({ where: { id }, data: limpio });
    invalidarCacheModulo('{entidad}');
    return item;
  },

  async eliminar(id: string, companyId: string) {
    await {Entidad}Service.obtenerPorId(id, companyId);
    await prisma.{modeloPrisma}.update({ where: { id }, data: { isActive: false } });
    invalidarCacheModulo('{entidad}');
  },
};
```

### 3. {entidad}.controller.ts
```typescript
import { Request, Response } from 'express';
import { ApiResponse }       from '../../compartido/respuesta';
import { {Entidad}Service }  from './{entidad}.service';

// El controller es deliberadamente delgado.
// Una sola responsabilidad: extraer datos del request y retornar la respuesta HTTP.
// Toda logica de negocio va en el service. Nunca agregar condicionales de negocio aqui.

export const {Entidad}Controller = {

  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await {Entidad}Service.listar(req.query as any, req.user.companyId);
    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta));
  },

  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const item = await {Entidad}Service.obtenerPorId(req.params['id']!, req.user.companyId);
    res.json(ApiResponse.ok(item));
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    const item = await {Entidad}Service.crear(req.body, req.user.companyId);
    res.status(201).json(ApiResponse.ok(item, '{Entidad} creado exitosamente'));
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    const item = await {Entidad}Service.actualizar(req.params['id']!, req.body, req.user.companyId);
    res.json(ApiResponse.ok(item, '{Entidad} actualizado exitosamente'));
  },

  eliminar: async (req: Request, res: Response): Promise<void> => {
    await {Entidad}Service.eliminar(req.params['id']!, req.user.companyId);
    res.status(204).send();
  },
};
```

### 4. {entidad}.routes.ts
```typescript
import { Router }             from 'express';
import { asyncHandler }       from '../../compartido/asyncHandler';
import { autenticar }         from '../../middlewares/autenticar';
import { requerirRol }        from '../../middlewares/requerirRol';
import { validar }            from '../../middlewares/validar';
import { {Entidad}Controller } from './{entidad}.controller';
import {
  Crear{Entidad}Schema,
  Actualizar{Entidad}Schema,
  Filtros{Entidad}Schema,
} from './{entidad}.schema';

const router = Router();

router.use(autenticar); // todas las rutas del modulo requieren sesion activa

/**
 * @openapi
 * /api/v1/{entidades}:
 *   get:
 *     summary: Listar {entidades} con filtros y paginacion
 *     tags: [{Entidades}]
 *     security: [{ bearerAuth: [] }]
 */
router.get(    '/',    validar(Filtros{Entidad}Schema, 'query'), asyncHandler({Entidad}Controller.listar));
router.get(    '/:id',                                           asyncHandler({Entidad}Controller.obtenerPorId));
router.post(   '/',    requerirRol('ADMIN'), validar(Crear{Entidad}Schema),      asyncHandler({Entidad}Controller.crear));
router.put(    '/:id', requerirRol('ADMIN'), validar(Actualizar{Entidad}Schema), asyncHandler({Entidad}Controller.actualizar));
router.delete( '/:id', requerirRol('ADMIN'),                                     asyncHandler({Entidad}Controller.eliminar));

export default router;
```

---

## MODULOS CON LOGICA ESPECIAL

### ordenes — Punto de Venta (modulo mas critico)

El service de ordenes no sigue el patron CRUD basico.
Una venta toca multiples tablas de forma atomica.

Reglas obligatorias:
- Toda creacion de orden usa prisma.$transaction() con isolationLevel: Serializable.
- El stock se verifica Y se descuenta dentro de la misma transaccion para prevenir race conditions.
- Nunca confiar en el stock que el cliente Angular envia en el body. Leerlo desde BD dentro de la tx.
- El numero de orden lo genera el servidor con formato VTA-YYYY-NNNNN.

Orden de operaciones dentro de la transaccion:
1. Verificar stock disponible por producto y almacen.
2. Crear Order con status PENDIENTE.
3. Crear OrderItems con snapshot de precio y costo en ese momento.
4. Decrementar Stock por almacen para cada producto.
5. Crear InventoryMovement SALIDA_VENTA por cada item con quantityBefore y quantityAfter.
6. Actualizar acumulados del CashShift activo.
7. Cambiar Order.status a COMPLETADA.
8. Crear AuditLog con userId, companyId y snapshot resumido de la orden.

Cancelar una orden requiere rol ADMIN o PIN de supervisor.
La cancelacion crea un InventoryMovement DEVOLUCION que revierte el stock.
La orden cancelada conserva su registro con cancelReason obligatorio.

### inventario — Ajustes y movimientos

- Solo ADMIN puede hacer ajustes manuales de stock.
- El campo motivo es obligatorio en todo ajuste manual.
- InventoryMovement es append-only. Ningun metodo hace UPDATE ni DELETE en esta tabla.
- Cada movimiento registra quantityBefore y quantityAfter.
- Actualizar Stock y crear InventoryMovement en la misma transaccion Prisma.

### auth — Autenticacion

- El login verifica en orden: credenciales → user.isActive → horario laboral (CAJERO/REPARTIDOR).
- Login exitoso: crear Session en BD, incluir sessionId en el payload del JWT.
- Logout: marcar Session.isActive = false.
- Despues de 5 intentos fallidos consecutivos: User.lockedUntil = ahora + 30 minutos.
- El endpoint de login aplica el middleware limitarLogin.
- El mensaje de error de login es siempre generico: 'Credenciales invalidas'.
  Nunca indicar si fue el email o la contrasena lo que fallo.

### reportes — Dashboard del ADMIN

- Solo ADMIN. Verificar con requerirRol('ADMIN') en todas las rutas.
- Todos los endpoints usan cache con TTL entre 30 y 60 segundos.
- companyId siempre del JWT. Nunca de query params.
- Queries con agrupacion usan prisma.$queryRaw con template literals. Nunca $queryRawUnsafe.
- Filtros de fecha se validan con Zod y se procesan con dayjs.

### entregas — Repartidor

- REPARTIDOR solo ve sus propias entregas: where: { assignedToId: req.user.userId }.
- ADMIN ve todas. El controller detecta el rol y aplica el filtro correspondiente en el service.
- El estado avanza en una sola direccion: ASIGNADO → EN_RUTA → ENTREGADO o NO_ENTREGADO.
- Al marcar ENTREGADO se crea un AuditLog con timestamp exacto.

---

## FORMATO DE RESPUESTA — CONTRATO CON EL FRONTEND

Toda respuesta de la API tiene esta estructura. Sin excepciones.
El frontend Angular depende de exactamente estos campos.

```
// Recurso unico exitoso
{ "exito": true, "datos": { ... }, "mensaje": "OK", "meta": null }

// Lista paginada exitosa
{
  "exito": true,
  "datos": [ ... ],
  "mensaje": "OK",
  "meta": {
    "total": 80, "pagina": 1, "limite": 20, "totalPaginas": 4,
    "tieneSiguiente": true, "tieneAnterior": false
  }
}

// Error controlado
{
  "exito": false,
  "datos": null,
  "error": { "mensaje": "El SKU ya existe en el catalogo", "codigo": "CONFLICT", "detalles": null }
}
```

Codigos HTTP y cuando usarlos:

200  GET, PUT, PATCH exitoso
201  POST exitoso: recurso creado
204  DELETE exitoso: sin body
400  Validacion Zod fallida o parametros invalidos
401  Sin token, token invalido, sesion inactiva, usuario desactivado
403  Token valido pero rol insuficiente
404  Recurso no encontrado
409  Conflicto de unicidad: SKU, email, barcode, etc.
422  Datos validos en formato pero invalidos segun logica de negocio
429  Rate limit excedido
500  Error no controlado del servidor

---

## SEGURIDAD — REGLAS CRITICAS

Inyeccion SQL:
Prisma parametriza todas las queries ORM automaticamente. En $queryRaw usar siempre
template literals: prisma.$queryRaw`SELECT ... WHERE id = ${id}`. Nunca $queryRawUnsafe.

XSS almacenado:
Llamar a sanitizarObjeto(dto) antes de todo prisma.create() y prisma.update() en services
que persisten strings de usuario (nombres, descripciones, notas, observaciones).

Autorizacion:
companyId, userId y role siempre desde req.user (JWT verificado por autenticar.ts).
Nunca aceptar estos valores desde req.body, req.query ni req.params.

Datos sensibles en respuestas:
Usar .select() de Prisma para retornar solo los campos necesarios por rol.
passwordHash y pinHash nunca aparecen en ninguna respuesta.
costPrice solo en respuestas a usuarios con rol ADMIN.

Fuerza bruta:
Endpoint de login con limitarLogin: maximo 5 intentos por IP en ventana de 15 minutos.
Despues de 5 intentos fallidos: bloquear usuario con User.lockedUntil.

Sesiones:
JWT stateful validado contra tabla Session en cada request autenticado.
Al desactivar usuario: todas sus sesiones quedan invalidas en el siguiente request.

Produccion:
Nunca exponer stack trace en NODE_ENV production.
Puerto 3001 (Node) y 5432 (PostgreSQL) no accesibles desde internet.
Solo Nginx en puertos 80 y 443.

---

## ORDEN DE DESARROLLO — SEGUIR ESTA SECUENCIA

No saltar fases. Cada fase es requisito de la siguiente.

```
FASE 1 — BASE (todo lo demas depende de esto)
  [1]  prisma/schema.prisma
  [2]  npx prisma migrate dev --name init
  [3]  src/config/env.ts
  [4]  src/config/database.ts
  [5]  src/config/cache.ts
  [6]  src/compartido/logger.ts
  [7]  src/compartido/respuesta.ts
  [8]  src/compartido/errores.ts
  [9]  src/compartido/sanitizar.ts
  [10] src/compartido/paginacion.ts
  [11] src/compartido/asyncHandler.ts
  [12] src/middlewares/autenticar.ts
  [13] src/middlewares/requerirRol.ts
  [14] src/middlewares/validar.ts
  [15] src/middlewares/limitarRates.ts
  [16] src/middlewares/manejarErrores.ts
  [17] src/tipos/express.d.ts
  [18] src/app.ts
  [19] server.ts

FASE 2 — AUTENTICACION (desbloquea el acceso al sistema)
  [20] modulos/auth/                    login, logout, /me

FASE 3 — CATALOGO (CRUD puro, sin transacciones complejas)
  [21] modulos/categorias/
  [22] modulos/almacenes/
  [23] modulos/proveedores/
  [24] modulos/productos/               incluir GET /barcode/:codigo para scanner POS

FASE 4 — OPERACIONES DE NEGOCIO (logica compleja, transacciones)
  [25] modulos/clientes/
  [26] modulos/inventario/              stock actual, ajustes manuales, historial
  [27] modulos/compras/                 recepcion de mercancia, actualiza stock
  [28] modulos/turnos-caja/             abrir y cerrar turno de caja
  [29] modulos/ordenes/                 transaccion atomica POS
  [30] modulos/entregas/                asignacion y confirmacion de entrega

FASE 5 — ANALYTICS Y PRODUCCION
  [31] modulos/reportes/                dashboard ADMIN: ventas, utilidad, stock, desempeno
  [32] Swagger JSDoc en todas las routes
  [33] prisma/seed.ts                   datos iniciales de desarrollo
  [34] Tests unitarios Jest             services de ordenes e inventario
  [35] Tests de integracion Supertest   flujo completo de venta
  [36] Dockerfile multi-stage
  [37] docker-compose.yml y nginx.conf
```