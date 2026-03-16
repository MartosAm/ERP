# Auditoría de Seguridad — ERP POS Backend

> Fecha: 11 de marzo de 2026
> Alcance: Backend Express + Prisma + PostgreSQL + Docker
> Clasificación: OWASP Top 10 + mejores prácticas POS

---

## Resumen Ejecutivo

| Severidad | Hallazgos | Estado |
|-----------|-----------|--------|
| 🔴 **CRÍTICA** | 2 | Requieren acción inmediata |
| 🟠 **ALTA** | 3 | Resolver antes de producción |
| 🟡 **MEDIA** | 8 | Planificar a corto plazo |
| 🔵 **BAJA** | 4 | Mejora continua |

**Evaluación general:** La aplicación tiene una base de seguridad sólida (Helmet, sanitización XSS, rate limiting, validación Zod, Prisma ORM), pero presenta vulnerabilidades críticas que deben corregirse antes del despliegue en producción.

---

## 1. Autenticación y JWT

### 1.1 🔴 CRÍTICA — Falta restricción de algoritmo en jwt.verify()

**Archivo:** `src/middlewares/autenticar.ts`, línea ~57
**Estado actual:**
```typescript
const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
```

**Riesgo:** Sin especificar `algorithms: ['HS256']`, un atacante podría explotar el ataque "algorithm confusion" — falsificar un token RS256 usando la clave pública como HMAC secret.

**Corrección:**
```typescript
const decoded = jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256']
}) as JwtPayload;
```

**Impacto:** Acceso no autorizado a cualquier endpoint protegido.

### 1.2 🟠 ALTA — Sin refresh tokens

**Estado actual:** Token único con expiración de 8 horas.

**Riesgos:**
- Si un token es comprometido, el atacante tiene 8 horas de acceso
- Sin mecanismo de rotación automática
- Los usuarios deben re-autenticarse completamente cada 8h

**Corrección recomendada:**
```
Access Token:  15 minutos (operaciones)
Refresh Token: 7 días (renovación, httpOnly cookie)
```

**Flujo propuesto:**
1. Login → access_token (15min) + refresh_token (7d, httpOnly, secure, sameSite)
2. Access token expira → POST /auth/refresh con refresh_token cookie
3. Servidor valida refresh_token en BD → emite nuevo access_token
4. Logout → invalidar refresh_token en BD + limpiar cookie

### 1.3 🟡 MEDIA — Sesiones en BD consultadas en cada request

**Archivo:** `src/middlewares/autenticar.ts`

**Estado actual:** Cada petición autenticada ejecuta un `SELECT` en la tabla de sesiones.

**Impacto:** Carga innecesaria en BD bajo alta concurrencia POS.

**Corrección:** Cache de sesiones activas en Redis con TTL de 5 minutos:
```typescript
const cacheKey = `session:${sessionId}`;
let session = await redis.get(cacheKey);
if (!session) {
  session = await prisma.sesion.findUnique({ where: { id: sessionId } });
  if (session) await redis.set(cacheKey, JSON.stringify(session), 'EX', 300);
}
```

---

## 2. CORS y CSRF

### 2.1 🟡 MEDIA — credentials: true sin protección CSRF

**Archivo:** `src/middlewares/seguridad.ts`

**Estado actual:**
```typescript
cors({
  origin: CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})
```

**Riesgo:** Con `credentials: true`, cookies se envían automáticamente. Un sitio malicioso podría ejecutar peticiones cross-origin autenticadas (CSRF).

**Mitigación actual:** El sistema usa JWT en headers `Authorization`, no en cookies, lo que reduce significativamente el riesgo CSRF. Sin embargo, si se implementan refresh tokens en cookies:

**Corrección necesaria al implementar refresh tokens:**
```typescript
// 1. Cookie con SameSite=Strict
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,        // Solo HTTPS
  sameSite: 'strict',  // Bloquea CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// 2. CORS origin explícito (nunca '*' con credentials)
// Ya correcto: origin: CORS_ORIGIN || 'http://localhost:4200'
```

### 2.2 🟡 MEDIA — CORS origin hardcodeado a localhost

**Riesgo en producción:** Si `CORS_ORIGIN` no se configura en `.env`, el fallback permite solo `localhost:4200`.

**Corrección:** Validar que `CORS_ORIGIN` esté definido en producción:
```typescript
if (NODE_ENV === 'production' && !CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN debe estar configurado en producción');
}
```

---

## 3. Inyección SQL

### 3.1 ✅ SEGURO — Prisma ORM con queries parametrizadas

**Estado:** Todos los módulos usan Prisma Client con queries parametrizadas. No se encontraron concatenaciones de strings en consultas SQL.

**Verificado en:**
- 13 archivos `.service.ts` en `src/modulos/`
- Uso correcto de `prisma.$queryRaw` con tagged templates (no string concatenation)
- Filtros dinámicos construidos como objetos Prisma, no strings

**Ejemplo verificado (reportes.service.ts):**
```typescript
// SEGURO: tagged template con parámetros
const result = await prisma.$queryRaw`
  SELECT ... WHERE empresa_id = ${empresaId}
`;
```

### 3.2 ✅ SEGURO — No hay SQL raw sin parametrizar

Se revisaron todos los usos de `$queryRaw` y `$executeRaw`. Todos utilizan template literals de Prisma que parametrizan automáticamente.

---

## 4. Cross-Site Scripting (XSS)

### 4.1 🟡 MEDIA — Sanitización XSS es opt-in, no automática

**Archivo:** `src/compartido/sanitizar.ts`

**Estado actual:** Existe una función `xss()` disponible, pero su uso depende de que cada módulo la invoque manualmente.

**Riesgo:** Un desarrollador podría olvidar sanitizar un campo, permitiendo XSS almacenado en BD.

**Corrección — Middleware automático:**
```typescript
// src/middlewares/sanitizarBody.ts
import { xss } from 'xss';

function sanitizarValor(valor: unknown): unknown {
  if (typeof valor === 'string') return xss(valor);
  if (Array.isArray(valor)) return valor.map(sanitizarValor);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, sanitizarValor(v)])
    );
  }
  return valor;
}

export const sanitizarBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizarValor(req.body);
  next();
};
```

Aplicar globalmente en `app.ts`:
```typescript
app.use(sanitizarBody);
```

### 4.2 ✅ BUENO — Content Security Policy implementada

**Archivo:** `src/middlewares/seguridad.ts`

Headers de seguridad activos via Helmet:
- `Content-Security-Policy` configurada
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (correcto — deprecado a favor de CSP)

### 4.3 🟡 MEDIA — CSP incluye 'unsafe-inline' para Swagger

**Estado actual:** `script-src 'self' 'unsafe-inline'` necesario para Swagger UI.

**Corrección en producción:**
```typescript
if (NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
```

O usar nonces CSP para Swagger en modo restringido.

---

## 5. Rate Limiting

### 5.1 🟠 ALTA — Store en memoria no funciona multi-instancia

**Archivo:** `src/middlewares/limitarRates.ts`

**Estado actual:** `express-rate-limit` con store por defecto (MemoryStore).

**Problema:** Con múltiples instancias (PM2 cluster, Docker replicas), cada instancia tiene su propio contador. Un atacante puede multiplicar sus intentos por el número de instancias.

**Corrección:**
```bash
npm install rate-limit-redis
```
```typescript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: REDIS_URL });

export const limiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

### 5.2 🟠 ALTA — Sin rate limit dedicado para endpoints críticos

**Endpoints sin protección específica:**
- `POST /auth/registro` — Un atacante puede crear miles de cuentas
- `POST /auth/cambiar-pin` — Fuerza bruta de PIN (4 dígitos = 10,000 combinaciones)
- `POST /auth/login` — Ya tiene limiter general, pero debería ser más restrictivo

**Corrección:**
```typescript
export const limiterAuth = rateLimit({
  store: new RedisStore({ ... }),
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 intentos por ventana
  message: 'Demasiados intentos. Intente en 15 minutos.',
});

export const limiterRegistro = rateLimit({
  store: new RedisStore({ ... }),
  windowMs: 60 * 60 * 1000,
  max: 3,  // 3 registros por hora por IP
});

// En auth.routes.ts:
router.post('/login', limiterAuth, ...);
router.post('/registro', limiterRegistro, ...);
router.post('/cambiar-pin', limiterAuth, ...);
```

---

## 6. Configuración del Servidor

### 6.1 🔴 CRÍTICA — Contraseña hardcodeada en docker-compose.yml

**Archivo:** `docker-compose.yml`

**Estado actual:**
```yaml
environment:
  POSTGRES_PASSWORD: MAVF2002
```

**Corrección:**
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
```bash
# .env (no versionado)
POSTGRES_PASSWORD=<contraseña-segura-generada>
```

Verificar que `.env` esté en `.gitignore`.

### 6.2 🟡 MEDIA — TLS/HTTPS no configurado

**Estado actual:** El servidor escucha en HTTP plano.

**Corrección en producción:**
```
[Cliente] → HTTPS → [Nginx/Reverse Proxy] → HTTP → [Express API]
```

Nginx maneja TLS con certificados Let's Encrypt. Express no necesita TLS directo.

Configuración Nginx necesaria:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/dominio/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dominio/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Base de Datos

### 7.1 🟡 MEDIA — Sin configuración de connection pool

**Archivo:** `src/config/database.ts`

**Estado actual:** Prisma Client instanciado sin configuración explícita de pool.

**Corrección:**
```typescript
// En schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// En DATABASE_URL agregar parámetros:
// ?connection_limit=20&pool_timeout=10
```

**Valores recomendados POS:**
- `connection_limit`: 20-50 (según instancias)
- `pool_timeout`: 10 segundos
- Total conexiones = connection_limit × número_instancias

### 7.2 🟡 MEDIA — Sin timeout en queries

**Riesgo:** Una query lenta puede bloquear una conexión indefinidamente.

**Corrección en Prisma:**
```typescript
// Para queries individuales
const orden = await prisma.orden.findMany({
  take: 50, // Siempre limitar resultados
});

// Timeout global via middleware Prisma
prisma.$use(async (params, next) => {
  const timeout = setTimeout(() => {
    throw new Error(`Query timeout: ${params.model}.${params.action}`);
  }, 30000); // 30s máximo
  const result = await next(params);
  clearTimeout(timeout);
  return result;
});
```

### 7.3 🔵 BAJA — Sin índices optimizados para consultas POS

**Índices recomendados:**
```sql
-- Consultas frecuentes POS
CREATE INDEX idx_ordenes_empresa_fecha ON ordenes(empresa_id, fecha_creacion DESC);
CREATE INDEX idx_ordenes_estado ON ordenes(estado) WHERE estado IN ('PENDIENTE', 'EN_PROCESO');
CREATE INDEX idx_productos_empresa_activo ON productos(empresa_id) WHERE activo = true;
CREATE INDEX idx_inventario_producto_almacen ON inventario(producto_id, almacen_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha DESC);
CREATE INDEX idx_sesiones_token ON sesiones(token) WHERE activa = true;
```

---

## 8. Caché

### 8.1 🟡 MEDIA — NodeCache no es multi-instancia

**Archivo:** `src/config/cache.ts`

**Estado actual:** NodeCache funciona solo en memoria local del proceso.

**Corrección:** Migrar a Redis:
```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  },
  async del(key: string): Promise<void> {
    await redis.del(key);
  },
  async flush(): Promise<void> {
    await redis.flushDb();
  }
};
```

---

## 9. Headers y Request-ID

### 9.1 🔵 BAJA — X-Request-ID acepta valor del cliente

**Archivo:** `src/middlewares/seguridad.ts`

**Estado actual:**
```typescript
req.headers['x-request-id'] = req.headers['x-request-id'] || uuid();
```

**Riesgo menor:** Un atacante puede inyectar valores maliciosos en `X-Request-ID` que terminan en logs (log injection).

**Corrección:**
```typescript
// Siempre generar internamente, ignorar valor del cliente
req.headers['x-request-id'] = uuid();
```

---

## 10. Docker y Infraestructura

### 10.1 🔵 BAJA — Prisma CLI en dependencies (no devDependencies)

**Archivo:** `package.json`

**Impacto:** La imagen de producción incluye herramientas de desarrollo innecesarias, aumentando la superficie de ataque.

**Corrección:**
```bash
npm install --save-dev prisma
```

### 10.2 🔵 BAJA — Health endpoint expone información del sistema

**Riesgo:** El endpoint `/health` retorna `memoryUsage` y `uptime`, información útil para atacantes.

**Corrección en producción:**
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## 11. Graceful Shutdown

### 11.1 ✅ EXCELENTE — Ya implementado

**Archivo:** `src/server.ts`

El servidor maneja correctamente señales SIGTERM/SIGINT:
1. Deja de aceptar nuevas conexiones
2. Completa las peticiones en curso
3. Cierra conexiones a BD (Prisma disconnect)
4. Limpia caché
5. Sale con código 0

---

## 12. Validación de Input

### 12.1 ✅ EXCELENTE — Zod en todos los endpoints

Todos los módulos usan schemas Zod validados por middleware `validar.ts` antes de llegar al controller. Los schemas verifican:
- Tipos de datos
- Rangos numéricos (precios > 0, cantidades > 0)
- Formatos de string (email, UUID)
- Enums para estados
- Campos opcionales con defaults

### 12.2 ✅ BUENO — Validación de Content-Type

El middleware `seguridad.ts` rechaza peticiones POST/PUT/PATCH sin `Content-Type: application/json`.

---

## Matriz de Prioridades

### Antes de producción (SPRINT 1)

| # | Hallazgo | Severidad | Esfuerzo | Archivo |
|---|----------|-----------|----------|---------|
| 1 | Agregar `algorithms: ['HS256']` a jwt.verify | 🔴 Crítica | 5 min | autenticar.ts |
| 2 | Mover contraseña DB a variables de entorno | 🔴 Crítica | 10 min | docker-compose.yml |
| 3 | Rate limit con Redis store | 🟠 Alta | 2h | limitarRates.ts |
| 4 | Rate limit dedicado login/registro/pin | 🟠 Alta | 1h | auth.routes.ts |
| 5 | Implementar refresh tokens | 🟠 Alta | 4h | auth.service.ts |

### Después del lanzamiento (SPRINT 2-3)

| # | Hallazgo | Severidad | Esfuerzo |
|---|----------|-----------|----------|
| 6 | Sanitización XSS automática global | 🟡 Media | 2h |
| 7 | Migrar NodeCache a Redis | 🟡 Media | 3h |
| 8 | Cache de sesiones en Redis | 🟡 Media | 2h |
| 9 | Configurar connection pool Prisma | 🟡 Media | 30min |
| 10 | CSP sin unsafe-inline (deshabilitar Swagger en prod) | 🟡 Media | 30min |
| 11 | Validar CORS_ORIGIN en producción | 🟡 Media | 10min |
| 12 | TLS via Nginx reverse proxy | 🟡 Media | 2h |
| 13 | Query timeout en Prisma | 🟡 Media | 1h |

### Mejora continua

| # | Hallazgo | Severidad | Esfuerzo |
|---|----------|-----------|----------|
| 14 | Generar X-Request-ID internamente | 🔵 Baja | 5min |
| 15 | Mover prisma a devDependencies | 🔵 Baja | 5min |
| 16 | Reducir info en /health | 🔵 Baja | 5min |
| 17 | Índices BD para queries POS | 🔵 Baja | 1h |

---

## Checklist de Verificación Post-Corrección

```
[ ] jwt.verify usa algorithms: ['HS256']
[ ] docker-compose.yml no tiene contraseñas hardcodeadas
[ ] .env está en .gitignore
[ ] Rate limiting usa Redis store
[ ] Endpoints auth tienen rate limit dedicado (5 intentos/15min)
[ ] Refresh tokens implementados con httpOnly cookies
[ ] Body sanitizado automáticamente contra XSS
[ ] NodeCache reemplazado por Redis
[ ] CSP sin unsafe-inline en producción
[ ] CORS_ORIGIN obligatorio en producción
[ ] TLS configurado (Nginx + Let's Encrypt)
[ ] Connection pool configurado en DATABASE_URL
[ ] Health endpoint no expone memoria/uptime
[ ] X-Request-ID generado internamente
[ ] Swagger deshabilitado en producción
[ ] prisma en devDependencies
```
