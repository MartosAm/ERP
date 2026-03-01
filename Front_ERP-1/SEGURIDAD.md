# Seguridad y Buenas Prácticas — Arquitectura Full-Stack

**Sistema:** ERP POS — Angular 17 + Express + Prisma + PostgreSQL  
**Última actualización:** 2026-03-01

---

## Índice

1. [Visión general](#1-visión-general)
2. [Flujo de autenticación completo](#2-flujo-de-autenticación-completo)
3. [Hashing de contraseñas](#3-hashing-de-contraseñas)
4. [JWT — firma, payload y almacenamiento](#4-jwt--firma-payload-y-almacenamiento)
5. [Almacenamiento del token en el frontend](#5-almacenamiento-del-token-en-el-frontend)
6. [Autorización — RBAC en ambas capas](#6-autorización--rbac-en-ambas-capas)
7. [Validación y sanitización de entrada](#7-validación-y-sanitización-de-entrada)
8. [Headers de seguridad — defensa en profundidad](#8-headers-de-seguridad--defensa-en-profundidad)
9. [Rate limiting — protección contra abuso](#9-rate-limiting--protección-contra-abuso)
10. [Manejo de errores — sin filtración de información](#10-manejo-de-errores--sin-filtración-de-información)
11. [Gestión de sesiones](#11-gestión-de-sesiones)
12. [Infraestructura y Docker](#12-infraestructura-y-docker)
13. [¿Por qué no CSRF?](#13-por-qué-no-csrf)
14. [¿Por qué no refresh tokens?](#14-por-qué-no-refresh-tokens)
15. [Inventario completo de archivos](#15-inventario-completo-de-archivos)
16. [Hallazgos y mejoras futuras](#16-hallazgos-y-mejoras-futuras)

---

## 1. Visión general

La seguridad se implementa en **4 capas defensivas**:

```
┌─────────────────────────────────────────────────┐
│  Capa 1: NGINX (reverse proxy)                  │
│  • Rate limiting por zona (API 100r/m, Auth 10r/m) │
│  • Headers de seguridad (CSP, HSTS, X-Frame)    │
│  • TLS termination (preparado)                   │
│  • Bloqueo de /api-docs en producción            │
├─────────────────────────────────────────────────┤
│  Capa 2: EXPRESS MIDDLEWARE (backend)            │
│  • Helmet (CSP, HSTS, frameguard, noSniff)       │
│  • CORS restrictivo                              │
│  • HPP (HTTP Parameter Pollution)                │
│  • Content-Type validation                       │
│  • express-rate-limit (respaldo)                 │
│  • JSON body limit 10MB                          │
├─────────────────────────────────────────────────┤
│  Capa 3: LÓGICA DE NEGOCIO (backend)            │
│  • JWT verify + DB session check por request     │
│  • bcrypt 12 rounds para passwords               │
│  • Bloqueo de cuenta: 5 intentos → 30 min        │
│  • Horario laboral verificado por request         │
│  • Zod validation → replace con datos parseados   │
│  • XSS sanitization con librería `xss`           │
├─────────────────────────────────────────────────┤
│  Capa 4: ANGULAR (frontend)                      │
│  • Token en memoria (no accesible al DOM)         │
│  • CSP en meta tag (defense in depth)             │
│  • Guards: authGuard + roleGuard en rutas         │
│  • Interceptors: auth (inyectar token) + error    │
│  • Inactividad: auto-logout 30 min                │
│  • APP_INITIALIZER: validar sesión al arrancar    │
│  • Angular sanitiza HTML por defecto              │
└─────────────────────────────────────────────────┘
```

**Decisión arquitectónica:** se eligió **JWT stateful** (JWT + sesión en DB) en lugar de JWT stateless puro. Esto permite revocar sesiones inmediatamente sin esperar a que el token expire — crítico para un sistema POS donde un administrador puede necesitar bloquear acceso instantáneamente.

---

## 2. Flujo de autenticación completo

### Diagrama secuencial

```
Frontend                          Backend                          Base de Datos
   │                                │                                │
   │  POST /auth/login              │                                │
   │  {correo, contrasena}          │                                │
   │──────────────────────────────> │                                │
   │                                │  limitarLogin (5/15min)        │
   │                                │  validar(LoginSchema)          │
   │                                │──────────────────────────────> │
   │                                │  SELECT usuario WHERE correo   │
   │                                │ <──────────────────────────────│
   │                                │                                │
   │                                │  ¿usuario.activo?              │
   │                                │  ¿empresa.activo?              │
   │                                │  ¿bloqueadoHasta > ahora?      │
   │                                │  bcrypt.compare(pass, hash)    │
   │                                │                                │
   │                                │  Si falla: intentosFallidos++  │
   │                                │  Si >= 5: bloqueadoHasta +30m  │
   │                                │                                │
   │                                │  Si exitoso:                   │
   │                                │  • Verificar horarioLaboral    │
   │                                │  • Reset intentosFallidos=0    │
   │                                │  • jwt.sign(payload, secret)   │
   │                                │──────────────────────────────> │
   │                                │  INSERT sesion (sha256 token)  │
   │                                │ <──────────────────────────────│
   │                                │                                │
   │  { token, usuario }            │                                │
   │ <──────────────────────────────│                                │
   │                                │                                │
   │  TokenService.guardar()        │                                │
   │  • tokenEnMemoria = token      │                                │
   │  • sessionStorage.erp_tkn      │                                │
   │  AuthService._usuario.set()    │                                │
```

### Archivos involucrados

| Paso | Archivo | Líneas clave |
|------|---------|-------------|
| Login request | `Front_ERP-1/src/app/features/auth/login.component.ts` | Form submit → `authService.login(credenciales)` |
| HTTP call | `Front_ERP-1/src/app/core/services/auth.service.ts` | `api.post<LoginResponse>('auth/login', creds)` |
| Rate limit | `Back_ERP/src/middlewares/limitarRates.ts` | `limitarLogin`: 5 req/15min vía `express-rate-limit` |
| Validación Zod | `Back_ERP/src/middlewares/validar.ts` | `LoginSchema.safeParse(req.body)` → replace `req.body` |
| Lógica de negocio | `Back_ERP/src/modulos/auth/auth.service.ts` | `login()`: bcrypt compare, lockout, session create |
| Guardar token | `Front_ERP-1/src/app/core/services/token.service.ts` | `guardar()`: memoria + sessionStorage |
| Actualizar estado | `Front_ERP-1/src/app/core/services/auth.service.ts` | `_usuario.set(res.usuario)` → signals reactivos |

### Por qué esta solución

- **bcrypt compare en backend:** nunca se envía el hash al frontend ni se compara en el cliente
- **Rate limiting en login:** previene fuerza bruta. 5 peticiones en 15 minutos antes de que express-rate-limit actúe. Además, el lockout de cuenta actúa después de 5 intentos fallidos (30 min de bloqueo)
- **Zod replace:** no solo valida — reemplaza `req.body` con datos parseados, eliminando campos desconocidos inyectados por el atacante
- **Sesión persistida:** el JWT es stateless por naturaleza, pero almacenamos un hash SHA-256 del token en la tabla `sesiones`. Esto permite:
  - Revocar la sesión al instante (desactivar registro)
  - Auditoría de IP y user-agent por sesión
  - Ver sesiones activas de un usuario

---

## 3. Hashing de contraseñas

### Implementación

```
Archivo: Back_ERP/src/modulos/auth/auth.service.ts

Registro:  bcrypt.hash(dto.contrasena, env.BCRYPT_SALT_ROUNDS)
Login:     bcrypt.compare(dto.contrasena, usuario.hashContrasena)
PIN:       bcrypt.hash(dto.nuevoPin, env.BCRYPT_SALT_ROUNDS)
```

### Configuración

```
Archivo: Back_ERP/src/config/env.ts

BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12)
```

### Por qué bcrypt con 12 rounds

| Alternativa | Por qué no (o por qué sí) |
|-------------|--------------------------|
| **bcrypt 12** ✅ | Estándar de la industria. 12 rounds ≈ 250ms por hash en hardware moderno. Impide brute force offline incluso con GPU. El rango 10-14 es configurable para ajustar performance vs seguridad. |
| **Argon2id** | Superior teóricamente (memory-hard, resistente a ASIC). Pero la librería `argon2` en Node.js requiere compilación nativa, la cual falla en algunos Alpine Docker images. bcrypt es más portable y suficientemente seguro para un ERP empresarial. |
| **PBKDF2** | Más débil que bcrypt contra GPU attacks. No recomendado para nuevos proyectos. |
| **SHA-256 + salt** | Peligroso. SHA-256 es rápido → fuerza bruta viable. Nunca para passwords. |
| **Texto plano** | Inadmisible. |

### Modelo de datos (Prisma)

```prisma
// Back_ERP/prisma/schema.prisma
model Usuario {
  hashContrasena   String
  hashPin          String?
  intentosFallidos Int       @default(0)
  bloqueadoHasta   DateTime?
  // ...
}
```

- `hashContrasena` almacena el hash bcrypt completo (incluye salt + algorithm + rounds)
- `intentosFallidos` se incrementa en cada login fallido, se resetea a 0 en login exitoso
- `bloqueadoHasta` se establece a `now + 30 min` cuando `intentosFallidos >= 5`

---

## 4. JWT — firma, payload y almacenamiento

### Creación del token

```
Archivo: Back_ERP/src/modulos/auth/auth.service.ts

jwt.sign(
  { usuarioId, empresaId, rol, sesionId },  // payload
  env.JWT_SECRET,                             // clave secreta
  { expiresIn: env.JWT_EXPIRES_IN }           // default "8h"
)
```

### Validación del secret

```
Archivo: Back_ERP/src/config/env.ts

JWT_SECRET: z.string().min(32)    // enforzado al arranque. >= 32 caracteres
JWT_EXPIRES_IN: z.string().default('8h')
```

### Hashing del token en DB

```
// auth.service.ts — al crear sesión:
const hashToken = crypto.createHash('sha256').update(token).digest('hex');

await prisma.sesion.create({
  data: {
    token: hashToken,        // ← NUNCA el JWT raw
    usuarioId,
    empresaId,
    direccionIp: ip,
    agenteUsuario: userAgent,
    expiraEn: fechaExpiracion,
  }
});
```

### Por qué esta solución

| Decisión | Justificación |
|----------|---------------|
| **JWT (no sesiones basadas en cookies)** | El frontend es una SPA. Las cookies requieren `SameSite`, CSRF protection, y son más complejas con múltiples pestañas. Un header `Authorization: Bearer` es el estándar para APIs REST consumidas por SPAs. |
| **JWT_SECRET >= 32 caracteres** | Para HMAC-SHA256 (HS256), la clave necesita al menos 256 bits de entropía. El proceso se detiene si es menor a 32 chars. |
| **SHA-256 del token en DB** | Si un atacante obtiene acceso a la base de datos, no puede reconstruir los JWTs a partir de los hashes SHA-256. |
| **Session ID en payload** | Permite revocación: cada request valida `sesion.activo` en DB. Un admin puede desactivar la sesión y el JWT se vuelve inválido inmediatamente — sin esperar expiración. |
| **8 horas de expiración** | Cubre un turno laboral completo. Demasiado corto obliga a re-login frecuente (mal UX en POS). Demasiado largo amplía la ventana de riesgo. |

---

## 5. Almacenamiento del token en el frontend

### Implementación

```
Archivo: Front_ERP-1/src/app/core/services/token.service.ts

Estrategia: MEMORIA (principal) + sessionStorage (fallback)
```

| Mecanismo | Variable/Key | Propósito |
|-----------|-------------|-----------|
| Memoria | `private tokenEnMemoria: string \| null` | Almacenamiento primario — no accesible al DOM |
| sessionStorage | `erp_tkn` | Fallback para recarga F5 del navegador |
| sessionStorage | `erp_usr` | Datos del usuario para rehidratación post-recarga |

### Flujo de rehidratación

```typescript
// Al arrancar la app:
// 1. APP_INITIALIZER → AuthService.validarSesion()
// 2. Si hay token en sessionStorage → se copia a memoria
// 3. Se llama GET /auth/perfil para validar contra el backend
// 4. Si falla → limpiar todo, redirigir a login
```

### Verificación de expiración

```typescript
// token.service.ts
estaExpirado(): boolean {
  const payload = this.decodificar();
  if (!payload?.exp) return true;
  return Date.now() >= (payload.exp - 60) * 1000;
  //                      ↑ 60 segundos de margen de seguridad
}
```

### Por qué esta solución (y no otras)

| Alternativa | Análisis |
|-------------|----------|
| **Memoria + sessionStorage** ✅ | Token en variable JS no es accesible vía `document.cookie` ni APIs del DOM. XSS podría acceder a JavaScript runtime, pero el sessionStorage es solo fallback para F5 — en operación normal el token vive solo en memoria. `sessionStorage` se limpia al cerrar pestaña. |
| **localStorage** ❌ | Persiste entre pestañas y sesiones del navegador. Un XSS roba el token indefinidamente. Peor aún, otro tab podría leerlo. |
| **HttpOnly cookie** ❓ | Máxima protección contra XSS (JavaScript no puede leer la cookie). Pero: requiere `SameSite`, CSRF protection, complicaciones con CORS en desarrollo. Para una SPA REST pura, el patrón Bearer es más natural y portable. HttpOnly cookie sería ideal si quisiéramos defensa máxima contra XSS a costa de complejidad. |
| **Service Worker cache** ❌ | Área de almacenamiento persistente — el mismo problema que localStorage. |

### Seguridad adicional

El **auth interceptor** (`auth.interceptor.ts`) solo envía el token a URLs que empiezan con `environment.apiUrl`:

```typescript
// auth.interceptor.ts
if (!req.url.startsWith(environment.apiUrl)) {
  return next(req);  // ← nunca envía token a terceros
}
```

---

## 6. Autorización — RBAC en ambas capas

### Roles del sistema

```prisma
// Back_ERP/prisma/schema.prisma
enum Rol {
  ADMIN
  CAJERO
  REPARTIDOR
}
```

### Capa backend — middleware chain

```
// Ejemplo: ruta protegida para solo ADMIN
router.post('/registro',
  requerirRol('ADMIN'),     // ← verifica rol
  validar(RegistroSchema),  // ← valida entrada
  AuthController.registrar  // ← lógica de negocio
);
```

**Archivo: `Back_ERP/src/middlewares/autenticar.ts`** — se ejecuta ANTES de `requerirRol`:

1. Extrae token del header `Authorization: Bearer <token>`
2. `jwt.verify(token, secret)` — valida firma y expiración
3. Busca la sesión en DB: `prisma.sesion.findUnique({ sesionId })`
4. Verifica `sesion.activo && usuario.activo`
5. Verifica horario laboral para CAJERO/REPARTIDOR (en cada request, no solo login)
6. Establece `req.user = { usuarioId, empresaId, rol, sesionId }`

**Archivo: `Back_ERP/src/middlewares/requerirRol.ts`**:

```typescript
export const requerirRol = (...roles: Rol[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      throw new ErrorAcceso('No tienes permisos para esta acción');
    }
    next();
  };
};
```

### Capa frontend — guards y directiva

**Archivo: `Front_ERP-1/src/app/core/guards/auth.guard.ts`**:

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const token = inject(TokenService);
  const router = inject(Router);

  if (auth.estaAutenticado()) return true;

  token.limpiar();
  return router.createUrlTree(['/auth/login']);
};
```

**Archivo: `Front_ERP-1/src/app/core/guards/role.guard.ts`**:

```typescript
export const roleGuard = (...roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();

    if (usuario && roles.includes(usuario.rol)) return true;
    return router.createUrlTree(['/dashboard']);
  };
};
```

**Archivo: `Front_ERP-1/src/app/shared/directives/rol.directive.ts`**:

```html
<!-- Template — ocultar UI según rol -->
<button *appRol="'ADMIN'">Solo visible para Admin</button>
<section *appRol="['ADMIN', 'CAJERO']">Admin o Cajero</section>
```

### Mapa de rutas protegidas

| Ruta | Guard Frontend | Middleware Backend |
|------|---------------|-------------------|
| `/auth/login` | Ninguno (pública) | `limitarLogin` únicamente |
| `/dashboard` | `authGuard` | `autenticar` |
| `/pos` | `authGuard` | `autenticar` |
| `/productos`, `/clientes`, `/categorias` | `authGuard` | `autenticar` |
| `/ordenes`, `/inventario`, `/entregas` | `authGuard` | `autenticar` |
| `/compras` | `roleGuard('ADMIN')` | `autenticar` + `requerirRol('ADMIN')` |
| `/proveedores`, `/almacenes` | `roleGuard('ADMIN')` | `autenticar` + `requerirRol('ADMIN')` |
| `/usuarios`, `/reportes`, `/configuracion` | `roleGuard('ADMIN')` | `autenticar` + `requerirRol('ADMIN')` |
| `/turnos-caja` | `roleGuard('ADMIN', 'CAJERO')` | `autenticar` + `requerirRol('ADMIN', 'CAJERO')` |

### Por qué RBAC en ambas capas

| Solo frontend | Solo backend | **Ambas capas** ✅ |
|--------------|-------------|-------------------|
| Un usuario que conoce las URLs puede acceder a rutas restringidas deshabilitando JavaScript | Protege los datos pero la UI muestra botones/rutas que luego fallan con 403 — mala UX | Guards previenen navegación no autorizada (UX). Middleware previene acceso a datos (seguridad real). La directiva `*appRol` oculta UI irrelevante. |

---

## 7. Validación y sanitización de entrada

### Backend: Zod + middleware `validar`

```
Archivo: Back_ERP/src/middlewares/validar.ts

validar(schema: ZodSchema, objetivo: 'body' | 'query' | 'params' = 'body')
```

**Comportamiento clave:** `schema.safeParse()` → si pasa, **reemplaza** `req[body|query|params]` con datos parseados. Esto:
- Elimina campos que el atacante inyectó pero no están en el schema
- Coerce tipos (string `"5"` → number `5`)
- Aplica transformaciones (trim, lowercase en emails)

### Ejemplo: RegistroSchema

```typescript
// Back_ERP/src/modulos/auth/auth.schema.ts
export const RegistroSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  correo: z.string().trim().toLowerCase().email(),
  contrasena: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Requiere al menos una mayúscula')
    .regex(/[a-z]/, 'Requiere al menos una minúscula')
    .regex(/[0-9]/, 'Requiere al menos un número'),
  rol: z.nativeEnum(Rol),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horarioFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  diasLaborales: z.array(z.number().int().min(0).max(6)).optional(),
});
```

### Backend: XSS Sanitization

```
Archivo: Back_ERP/src/compartido/sanitizar.ts

Librería: `xss` (npm)
Funciones: sanitizarString(valor), sanitizarObjeto<T>(obj)
```

```typescript
// Uso en servicios (6 módulos):
const datosSanitizados = sanitizarObjeto(dto);
await prisma.categoria.create({ data: datosSanitizados });
```

**Módulos que sanitizan:** categorías, clientes, productos, proveedores, almacenes, compras.  
**Gap encontrado:** `auth.service.ts` no sanitiza `dto.nombre` en registro → ver sección de hallazgos.

### Frontend: Angular sanitización automática

Angular sanitiza automáticamente todo lo que se interpola en el DOM (`{{ }}`, property bindings). No existe uso de:
- `[innerHTML]` sin sanitizar
- `bypassSecurityTrustHtml`
- `DomSanitizer.bypassSecurity*`

### Por qué Zod y no `class-validator`

| Aspecto | Zod ✅ | class-validator |
|---------|-------|----------------|
| Type inference | `z.infer<typeof Schema>` genera tipos automáticamente | Requiere decoradores + clases + transformaciones manuales |
| Tree-shaking | Solo importas lo que usas | Dependencia en `reflect-metadata`, más peso |
| Coerción | Nativa (`z.coerce.number()`) | Requiere `class-transformer` adicional |
| Ecosistema | Funciona con cualquier framework | Atado a decoradores TypeScript |
| Replace input | `safeParse` devuelve datos limpios | Necesitas transformar manualmente |

---

## 8. Headers de seguridad — defensa en profundidad

Los security headers se aplican en **3 capas**:

### Capa 1: Nginx (producción)

```
Archivo: Back_ERP/nginx/nginx.conf     (backend)
Archivo: Front_ERP-1/docker/nginx.conf (frontend)
```

| Header | Valor | Propósito |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Previene clickjacking — el sitio no puede embeberse en iframes |
| `X-Content-Type-Options` | `nosniff` | Previene MIME sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita información enviada en el Referer header |
| `Content-Security-Policy` | Ver tabla abajo | Restringe fuentes de contenido |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Bloquea APIs del navegador que el ERP no necesita |
| `Cache-Control` | `no-store, no-cache, must-revalidate` | En API responses — previene cacheo de datos sensibles |

### CSP (Content-Security-Policy) configurada

| Directiva | Backend (Helmet) | Frontend (nginx + meta) |
|-----------|-----------------|----------------------|
| `default-src` | `'self'` | `'self'` |
| `script-src` | `'self' 'unsafe-inline'` (Swagger) | `'self'` |
| `style-src` | `'self' 'unsafe-inline'` | `'self' 'unsafe-inline'` (Material) |
| `img-src` | `'self' data: validator.swagger.io` | `'self' data: blob:` |
| `font-src` | `'self'` | `'self' data:` |
| `connect-src` | (no especificado → default) | `'self'` |
| `object-src` | `'none'` | `'none'` |
| `frame-src` | `'none'` | `'none'` |
| `base-uri` | `'self'` | `'self'` |
| `form-action` | `'self'` | `'self'` |
| `worker-src` | (no especificado) | `'self'` |

**Nota sobre `'unsafe-inline'` en style-src:** Angular Material inyecta estilos inline en ciertos componentes (overlays, ripple effects). Sin `'unsafe-inline'`, el CDK se rompe. Una alternativa sería usar hashes/nonces, pero requiere SSR o build-time generation — complejidad excesiva para el beneficio marginal en un ERP interno.

### Capa 2: Helmet en Express

```
Archivo: Back_ERP/src/app.ts

Configuración específica:
- HSTS: maxAge 31536000 (1 año), includeSubDomains, preload
- frameguard: deny
- noSniff
- dnsPrefetchControl: allow: false
```

### Capa 3: Meta tags en index.html

```
Archivo: Front_ERP-1/src/index.html

Meta tags de CSP que duplican la config de nginx como fallback
```

### Middleware adicional de seguridad

```
Archivo: Back_ERP/src/middlewares/seguridad.ts (209 líneas, 6 funciones)
```

| Función | Qué hace |
|---------|----------|
| `ocultarTecnologia()` | Elimina `X-Powered-By` y `Server` headers — no revelar que es Express |
| `asignarRequestId()` | UUID v4 por request → trazabilidad en logs |
| `medirTiempoRespuesta()` | `X-Response-Time` header → monitoreo de performance |
| `headersSeguridad()` | Agrega `Permissions-Policy`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` |
| `validarContentType()` | Rechaza (`415`) POST/PUT/PATCH sin `Content-Type: application/json` |
| `protegerParametros()` | HPP — previene parameter pollution (whitelist: categoriaId, proveedorId, etc.) |

### Por qué defensa en profundidad

Si una capa falla (nginx mal configurado, nuevo endpoint sin Helmet), las otras capas siguen protegiendo. En producción real:
- El meta tag CSP protege incluso si nginx se reinicia sin headers
- Helmet protege incluso si nginx está en una configuración intermedia
- `validarContentType` previene ataques de inyección de contenido incluso sin CSP

---

## 9. Rate limiting — protección contra abuso

### Backend: express-rate-limit

```
Archivo: Back_ERP/src/middlewares/limitarRates.ts
```

| Limiter | Ventana | Máximo | Aplicado a |
|---------|---------|--------|-----------|
| `limitarLogin` | 15 min | 5 requests | `POST /auth/login` |
| `limitarGeneral` | 1 min | 100 requests | Todos los `/api/*` |

Configuración: `standardHeaders: true`, `legacyHeaders: false` → envía `RateLimit-*` headers estándar (draft-ietf-httpapi-ratelimit-headers).

### Nginx: rate limiting adicional

```
Archivo: Back_ERP/nginx/nginx.conf

limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

location /api/v1/auth/ {
    limit_req zone=auth burst=5 nodelay;
}
```

### Bloqueo de cuenta (nivel de negocio)

```
Archivo: Back_ERP/src/modulos/auth/auth.service.ts

if (intentosFallidos >= 5) {
  bloqueadoHasta = now + 30 minutos
}
```

### Por qué triple protección

| Capa | Protege contra | Limitación |
|------|---------------|-----------|
| **Nginx rate limit** | DDoS, bots, flood masivo | Solo ve la IP real (detrás de CDN puede ser la IP del CDN) |
| **express-rate-limit** | Abuso de API por IP | En memoria → se resetea al reiniciar el servidor |
| **Lockout de cuenta** | Brute force de credenciales específicas | Por usuario, no por IP → protege incluso con IPs rotatorias |

Las tres capas juntas hacen que un ataque de fuerza bruta necesite rotar IPs (para nginx/express), Y cambiar de usuario (para el lockout), Y esperar 15 minutos entre intentos — impracticable.

---

## 10. Manejo de errores — sin filtración de información

### Backend: centralizado en un handler

```
Archivo: Back_ERP/src/middlewares/manejarErrores.ts
```

| Tipo de error | Status | Mensaje al cliente | ¿Revela detalles? |
|---------------|--------|-------------------|-------------------|
| `ZodError` | 400 | "Datos inválidos" + campos específicos | Solo errores de validación por campo |
| Prisma P2002 | 409 | "Registro duplicado" | No revela qué campo |
| Prisma P2025 | 404 | "Registro no encontrado" | No |
| `AppError` (operacional) | Variable | `err.mensaje` controlado | Solo lo que el desarrollador escribió |
| Error desconocido (prod) | 500 | "Error interno del servidor" | **Nunca** — sin stack, sin detalles |
| Error desconocido (dev) | 500 | String del error | Solo en desarrollo |

**Regla crítica en login:** el mensaje de error es SIEMPRE `"Credenciales inválidas"` — nunca `"Usuario no encontrado"` ni `"Contraseña incorrecta"`. Esto previene enumeración de usuarios.

### Frontend: interceptor de errores

```
Archivo: Front_ERP-1/src/app/core/interceptors/error.interceptor.ts
```

| Status | Comportamiento | Retry |
|--------|---------------|-------|
| `0` | "Error de conexión. Verifica tu red." | No |
| `401` | Limpiar token → redirigir a login → "Sesión expirada" | No |
| `403` | "No tienes permisos para realizar esta acción." | No |
| `429` | "Demasiadas solicitudes. Espera un momento." | No |
| `502, 503, 504` | Solo para GET/HEAD/OPTIONS | 2 reintentos (1s, 2s backoff) |
| Otros | `err.error?.mensaje \|\| 'Error inesperado'` | No |

**Solo procesa errores de URLs del propio backend** (`environment.apiUrl`) — nunca muestra notificaciones por errores de APIs externas.

**Retry solo en idempotentes:** evita reenviar POST/PUT/DELETE que podrían crear registros duplicados.

---

## 11. Gestión de sesiones

### Auto-logout por inactividad

```
Archivo: Front_ERP-1/src/app/core/services/inactividad.service.ts
```

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| Timeout | 30 min | Balance entre seguridad y usabilidad POS |
| Intervalo de verificación | 60 seg | Suficiente granularidad sin consumir recursos |
| Throttle de eventos | 2 seg | Evita procesamiento excesivo por movimiento de mouse |
| Eventos monitoreados | `mousemove`, `keydown`, `click`, `scroll`, `touchstart` | Cubre interacciones comunes en desktop y tablet |

**Corre fuera de NgZone** (`zone.runOutsideAngular`): el `setInterval` y los event listeners no disparan change detection de Angular — zero impacto en performance.

**Doble check:** en cada tick (60s) también verifica `tokenService.estaExpirado()` — si el JWT expira durante una sesión activa, el logout ocurre al siguiente tick.

### Validación de sesión al arrancar (APP_INITIALIZER)

```
Archivo: Front_ERP-1/src/app/app.config.ts

APP_INITIALIZER → AuthService.validarSesion() → GET /auth/perfil
```

Al recargar la página (F5):
1. `TokenService` rehidrata el token desde sessionStorage
2. `APP_INITIALIZER` ejecuta `validarSesion()` antes de renderizar cualquier componente
3. Si el backend responde OK → la sesión es válida, se actualiza `_usuario` signal
4. Si el backend responde 401 → se limpia todo, no se muestra contenido protegido

### Sesión en base de datos

```prisma
// Back_ERP/prisma/schema.prisma
model Sesion {
  id            String    @id @default(cuid())
  token         String    // SHA-256 hash — NUNCA el JWT raw
  usuarioId     String
  empresaId     String
  direccionIp   String?
  agenteUsuario String?
  activo        Boolean   @default(true)
  expiraEn      DateTime
  creadoEn      DateTime  @default(now())
}
```

**Verificación en cada request** (`autenticar.ts`):
```typescript
const sesion = await prisma.sesion.findUnique({
  where: { id: payload.sesionId },
  include: { usuario: true },
});

if (!sesion || !sesion.activo || !sesion.usuario.activo) {
  throw new ErrorNoAutorizado('Sesión inválida');
}
```

---

## 12. Infraestructura y Docker

### Backend: multi-stage build seguro

```
Archivo: Back_ERP/Dockerfile
```

```dockerfile
# Stage 1: dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: build  
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build

# Stage 3: runner (mínima superficie de ataque)
FROM node:20-alpine AS runner
RUN addgroup -g 1001 erp && adduser -u 1001 -G erp -s /bin/sh -D erp
USER erp                    # ← NO corre como root
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3001/api/health
```

### Frontend: nginx optimizado

```
Archivo: Front_ERP-1/docker/Dockerfile
```

```dockerfile
# Stage 1: build
FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Stage 2: serve
FROM nginx:1.25-alpine
COPY --from=build /app/dist/front-erp/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost/ || exit 1
```

### Docker Compose: producción vs desarrollo

| Aspecto | `docker-compose.yml` (dev) | `docker-compose.prod.yml` (prod) |
|---------|---------------------------|----------------------------------|
| DB expuesta | Sí (`5432:5432`) | No (solo red interna) |
| Credenciales | Hardcoded (`MAVF2002`) | Variables de entorno requeridas (`${DB_PASSWORD:?}`) |
| Nginx | No incluido | Incluido con TLS ready |
| Resource limits | No | API 512MB/1CPU, Postgres 512MB/1CPU, Nginx 128MB |
| Network | Default bridge | `backend` bridge network aislada |
| Trust proxy | `1` | `2` (CDN + Nginx) |

### Timeouts del servidor

```
Archivo: Back_ERP/src/server.ts

keepAliveTimeout:  61,000 ms  (> Nginx default 60s → evita 502)
headersTimeout:    62,000 ms
setTimeout:        30,000 ms  (request timeout general)
gracefulShutdown:  15,000 ms  (fuerza kill después de 15s)
```

### Por qué estas decisiones

| Decisión | Justificación |
|----------|---------------|
| **Multi-stage build** | La imagen final solo tiene el runtime y código compilado. No incluye devDependencies, código fuente, archivos .ts. Reduce superficie de ataque y tamaño de imagen (~200MB vs ~800MB). |
| **Non-root user** | Si un atacante logra RCE dentro del container, no tiene permisos de root. Estándar de seguridad en Kubernetes y cualquier orquestador. |
| **Alpine base** | ~5MB vs ~900MB de Ubuntu. Menos paquetes = menos vulnerabilidades conocidas. |
| **DB no expuesta en prod** | Solo accesible desde la red Docker interna. Ni siquiera con port scanning desde el host. |
| **keepAliveTimeout > nginx** | Si Express cierra la conexión antes que Nginx, se producen 502 Bad Gateway intermitentes. 61s > 60s resuelve esto. |
| **Healthcheck** | Docker/orquestador puede reiniciar containers automáticamente si el health falla. |

---

## 13. ¿Por qué no CSRF?

**CSRF (Cross-Site Request Forgery)** no es necesario en esta arquitectura porque:

1. **No usamos cookies para autenticación.** El token se envía en el header `Authorization: Bearer <token>`.
2. **Los navegadores no pueden agregar headers custom en cross-origin requests** sin CORS `preflight` (OPTIONS). Nuestro CORS solo permite origins específicos.
3. **Un formulario malicioso** en otro sitio puede enviar POST con cookies (CSRF clásico), pero NO puede agregar el header `Authorization`. Sin ese header, el request falla en `autenticar.ts`.

Si migráramos a cookies HttpOnly para el token, sería **obligatorio** implementar tokens CSRF.

---

## 14. ¿Por qué no refresh tokens?

**Estado actual:** no existe mecanismo de refresh token. El JWT expira a las 8 horas y el usuario debe re-loguearse.

### Análisis

| Factor | Evaluación |
|--------|-----------|
| **Tipo de sistema** | ERP POS interno, no público. Los usuarios tienen turnos definidos. |
| **Duración de turno** | 8 horas típico → el JWT de 8h cubre el turno completo. |
| **Inactividad** | Auto-logout a los 30 min sin actividad → la mayoría de sesiones terminan antes de la expiración del JWT. |
| **Seguridad** | Un refresh token es otro artefacto que proteger. Sin él, la ventana de compromiso es limitada (8h máximo). |
| **UX de POS** | Un cajero NO debe quedar deslogueado en medio de una venta. 8h es suficiente. Si necesita más, re-login es aceptable al cambio de turno. |

### Cuándo agregar refresh tokens (futuro)

- Si el sistema se abre a clientes externos (portal web público)
- Si se reduce la expiración del JWT a < 1h por compliance
- Si se agrega funcionalidad offline que requiera mantener sesión

---

## 15. Inventario completo de archivos

### Backend — archivos de seguridad

| Archivo | Líneas | Función |
|---------|--------|---------|
| `Back_ERP/src/middlewares/autenticar.ts` | 104 | JWT verify + DB session + horario laboral |
| `Back_ERP/src/middlewares/requerirRol.ts` | 39 | RBAC por endpoint |
| `Back_ERP/src/middlewares/limitarRates.ts` | 49 | Rate limiting (login 5/15m, general 100/1m) |
| `Back_ERP/src/middlewares/seguridad.ts` | 209 | 6 funciones: requestId, tiempos, headers, content-type, HPP, ocultar tech |
| `Back_ERP/src/middlewares/validar.ts` | 44 | Zod validation → replace input |
| `Back_ERP/src/middlewares/manejarErrores.ts` | 150 | Error handler centralizado |
| `Back_ERP/src/compartido/sanitizar.ts` | 53 | XSS sanitization con `xss` lib |
| `Back_ERP/src/compartido/errores.ts` | 73 | Jerarquía AppError → 6 subclases |
| `Back_ERP/src/modulos/auth/auth.service.ts` | 447 | Login, registro, logout, lockout, horario, JWT |
| `Back_ERP/src/modulos/auth/auth.schema.ts` | 108 | Zod schemas: registro, login, cambiar-pin |
| `Back_ERP/src/modulos/auth/auth.routes.ts` | 219 | Definición de rutas auth + middleware chain |
| `Back_ERP/src/modulos/auth/auth.controller.ts` | 87 | HTTP controller + auditoría IP/user-agent |
| `Back_ERP/src/config/env.ts` | 89 | Validación Zod de env vars al boot |
| `Back_ERP/src/app.ts` | 251 | Orden de middlewares (11 pasos) |
| `Back_ERP/src/server.ts` | ~80 | Timeouts, graceful shutdown |
| `Back_ERP/prisma/schema.prisma` | 670 | Modelo Usuario (hash, lockout) + Sesion |
| `Back_ERP/nginx/nginx.conf` | 113 | Reverse proxy + rate limiting + security headers |
| `Back_ERP/Dockerfile` | 61 | Multi-stage, non-root user |
| `Back_ERP/docker-compose.prod.yml` | 105 | Producción: secrets, limits, isolated network |

### Frontend — archivos de seguridad

| Archivo | Líneas | Función |
|---------|--------|---------|
| `Front_ERP-1/src/app/core/services/auth.service.ts` | 105 | Estado de auth (signals), login/logout |
| `Front_ERP-1/src/app/core/services/token.service.ts` | 130 | JWT en memoria + sessionStorage + decode |
| `Front_ERP-1/src/app/core/services/inactividad.service.ts` | 108 | Auto-logout 30 min, fuera de NgZone |
| `Front_ERP-1/src/app/core/guards/auth.guard.ts` | 30 | Guard de ruta: ¿autenticado? |
| `Front_ERP-1/src/app/core/guards/role.guard.ts` | 23 | Guard de ruta: ¿tiene rol? |
| `Front_ERP-1/src/app/core/interceptors/auth.interceptor.ts` | 30 | Inyecta Bearer token en requests |
| `Front_ERP-1/src/app/core/interceptors/error.interceptor.ts` | 73 | Retry, 401 redirect, error display |
| `Front_ERP-1/src/app/shared/directives/rol.directive.ts` | 54 | `*appRol` — mostrar/ocultar por rol |
| `Front_ERP-1/src/app/features/auth/login.component.ts` | 71 | Formulario de login |
| `Front_ERP-1/src/app/app.routes.ts` | 159 | Guards en rutas |
| `Front_ERP-1/src/app/app.config.ts` | 55 | Interceptors + APP_INITIALIZER |
| `Front_ERP-1/src/index.html` | 52 | CSP meta tag |
| `Front_ERP-1/docker/nginx.conf` | 82 | Servidor web: CSP, headers, cache |
| `Front_ERP-1/docker/Dockerfile` | 30 | Multi-stage build |

---

## 16. Hallazgos y mejoras futuras

### Problemas encontrados

| Severidad | Hallazgo | Ubicación | Estado |
|-----------|----------|-----------|--------|
| **MEDIA** | `auth.service.ts` no sanitiza `dto.nombre` en registro (todos los demás módulos sí llaman `sanitizarObjeto`) | `Back_ERP/src/modulos/auth/auth.service.ts` | Pendiente |
| **BAJA** | Frontend valida contraseña `minLength(6)` pero backend exige `min(8)` — permite submit de passwords inválidas | `Front_ERP-1/...login.component.ts` vs `Back_ERP/...auth.schema.ts` | Pendiente |
| **BAJA** | CSP requiere `'unsafe-inline'` en `style-src` por Angular Material overlays | Ambos proyectos | Aceptado — limitación de Material |
| **BAJA** | `docker-compose.yml` (dev) tiene contraseña de Postgres hardcoded en el repo | `Back_ERP/docker-compose.yml` | Aceptado — solo dev |
| **BAJA** | TLS en nginx de producción está comentado (ready pero no activado) | `Back_ERP/nginx/nginx.conf` | Pendiente (activar al desplegar) |
| **BAJA** | Dockerfile frontend no tiene `USER nginx` explícito | `Front_ERP-1/docker/Dockerfile` | Pendiente |
| **INFO** | `X-XSS-Protection: 1; mode=block` es deprecado en navegadores modernos (CSP lo reemplaza) | Ambos nginx.conf | Aceptado — no causa daño |
| **INFO** | No se exigen caracteres especiales en contraseñas (solo upper+lower+digit) | `Back_ERP/...auth.schema.ts` | Aceptado para ERP interno |
| **INFO** | `connect-src 'self'` en meta tag del frontend bloquea `localhost:3001` en desarrollo | `Front_ERP-1/src/index.html` | Sin impacto real (meta tag no se usa en dev mode) |

### Mejoras recomendadas para el futuro

| Prioridad | Mejora | Beneficio |
|-----------|--------|-----------|
| Alta | Agregar `sanitizarObjeto(dto)` en `auth.service.ts` registro | Consistencia — previene XSS en nombre de usuario |
| Alta | Sincronizar `minLength(8)` en `login.component.ts` | Evita submit innecesarios que el backend rechazará |
| Media | Refresh tokens cuando el sistema se abra a clientes externos | Sesiones más largas sin comprometer seguridad |
| Media | `USER nginx` en Dockerfile del frontend | Estándar de seguridad de containers |
| Baja | Migrar de bcrypt a Argon2id cuando Alpine soporte estable | Mayor resistencia a GPU/ASIC attacks |
| Baja | Reemplazar `'unsafe-inline'` con hashes/nonces para styles | CSP más estricto |
| Baja | Activar TLS en nginx al desplegar a producción | HTTPS obligatorio |
