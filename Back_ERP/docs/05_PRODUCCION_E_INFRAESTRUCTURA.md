# Produccion e Infraestructura

## Indice

1. [Resumen de lo que se hizo para produccion](#resumen)
2. [Dockerfile multi-stage](#dockerfile-multi-stage)
3. [docker-compose.prod.yml](#docker-compose-prod)
4. [Nginx como reverse proxy](#nginx-como-reverse-proxy)
5. [Variables de entorno](#variables-de-entorno)
6. [server.ts -- Arranque y apagado robusto](#server-ts)
7. [Health checks -- Tres niveles](#health-checks)
8. [Seguridad HTTP en profundidad](#seguridad-http)
9. [Scripts de package.json](#scripts-de-package-json)
10. [Flujo de despliegue paso a paso](#flujo-de-despliegue)
11. [Checklist pre-produccion](#checklist-pre-produccion)

---

## Resumen

El backend paso por un proceso de preparacion para produccion que cubre estas
areas:

| Area | Que se hizo |
|---|---|
| Contenedorizacion | Dockerfile multi-stage con imagen minima (~180MB) |
| Orquestacion | docker-compose.prod.yml con PostgreSQL + API + Nginx |
| Reverse proxy | Nginx con rate limiting, compresion, headers de seguridad |
| Arranque seguro | Verificacion de BD antes de aceptar trafico |
| Cierre ordenado | Graceful shutdown con timeout de 15 segundos |
| Timeouts HTTP | keepAliveTimeout > proxy idle para evitar 502 |
| Health checks | Liveness superficial + readiness con ping a BD |
| Variables de entorno | Validacion con Zod al arranque; fallo rapido si faltan |
| Seguridad | Helmet, CORS, HPP, rate limiting, XSS, headers adicionales |
| Logging | JSON estructurado en produccion; nivel ajustable sin redesplegar |
| Scripts | Build limpio, migraciones de produccion, CI pipeline |

---

## Dockerfile multi-stage

### Por que multi-stage

Un Dockerfile convencional copia todo el codigo fuente, instala dependencias
de desarrollo, compila TypeScript y deja todo en la imagen final. El resultado
es una imagen de 800MB+ que contiene:

- Codigo fuente TypeScript (innecesario en runtime)
- Compilador TypeScript y sus dependencias
- devDependencies como jest, supertest, nodemon

Con multi-stage, la imagen final solo contiene lo estrictamente necesario para
ejecutar el servidor:

### Las 3 etapas

```
Etapa 1: deps
  Instala SOLO dependencias de produccion (npm ci --omit=dev)
  Genera el Prisma Client
  Peso: temporal, se descarta

Etapa 2: builder
  Instala TODAS las dependencias (incluye TypeScript)
  Compila src/ a dist/ con tsc
  Peso: temporal, se descarta

Etapa 3: runner (imagen final)
  Copia node_modules de deps (sin devDependencies)
  Copia dist/ de builder (solo JavaScript compilado)
  Copia prisma/ (migraciones y schema)
  Peso: ~180MB
```

### Detalle de cada etapa

**Etapa 1 (deps):**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate
```

- `node:20-alpine` usa Alpine Linux (~50MB vs ~300MB de la imagen debian)
- `npm ci` instala exactamente lo que dice `package-lock.json` (reproducible)
- `--omit=dev` excluye jest, typescript, nodemon, etc.
- `prisma generate` crea el cliente tipado que necesita el runtime

**Etapa 2 (builder):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build
```

- Aqui si se instalan devDependencies porque necesitamos TypeScript
- `npm run build` ejecuta `rm -rf dist && tsc`
- El resultado es la carpeta `dist/` con JavaScript puro

**Etapa 3 (runner):**
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 erp && \
    adduser --system --uid 1001 erp

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

USER erp
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

- **Usuario no-root:** Previene que un exploit en Node.js obtenga acceso root
  al contenedor. El usuario `erp` (UID 1001) solo puede leer/escribir archivos
  de la aplicacion.

- **HEALTHCHECK:** Docker verifica cada 30 segundos si el servidor responde.
  Si falla 3 veces consecutivas, el contenedor se marca como "unhealthy" y
  docker-compose lo reinicia.

- **CMD:** Primero aplica migraciones pendientes (`prisma migrate deploy`) y
  luego arranca el servidor. No importa si no hay migraciones nuevas; el
  comando es idempotente.

### .dockerignore

Excluye archivos que no deben entrar en la imagen de construccion:

```
node_modules    -- Se reinstalan dentro del contenedor
dist            -- Se recompila dentro del contenedor
.env, .env.*    -- Secretos nunca en la imagen
docs/, http/    -- Documentacion y archivos de prueba
.git            -- Historial de Git (potencialmente grande)
coverage/       -- Resultados de tests
```

Sin `.dockerignore`, Docker copia `node_modules` al contexto de build, lo que
duplica 300MB+ de archivos que se van a reinstalar de todas formas.

---

## docker-compose.prod.yml

### Topologia de red

```
Internet
  |
  v
[Nginx :80/:443]   <-- Unico servicio expuesto al host
  |
  v
(red interna "backend")
  |         |
  v         v
[API :3001]  [PostgreSQL :5432]
```

Nginx es el unico contenedor con puertos expuestos al host. La API y PostgreSQL
solo se comunican dentro de la red Docker `backend`. Esto significa que un
atacante no puede conectarse directamente a la base de datos desde fuera.

### Servicio PostgreSQL

```yaml
postgres:
  image: postgres:16-alpine
  command:
    - "postgres"
    - "-c" 
    - "max_connections=100"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "log_min_duration_statement=1000"
```

- `max_connections=100`: Suficiente para 20 conexiones del pool de Prisma +
  headroom para admin y backups.
- `shared_buffers=256MB`: Cache de paginas de datos en RAM. Regla general:
  25% de la RAM disponible para PostgreSQL.
- `log_min_duration_statement=1000`: Registra queries que tarden mas de 1
  segundo. Permite identificar consultas lentas sin llenar los logs.
- `data-checksums`: Detecta corrupcion de datos en disco.
- `healthcheck` con `pg_isready`: Verifica que PostgreSQL acepta conexiones
  antes de que la API intente conectarse.

### Servicio API

```yaml
api:
  depends_on:
    postgres:
      condition: service_healthy
```

- `service_healthy`: La API no arranca hasta que PostgreSQL pase su healthcheck.
  Esto evita el error "Connection refused" que ocurre cuando la API arranca
  antes que la base de datos.

### Limites de recursos

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: "1.0"
```

Sin limites, un leak de memoria o un loop infinito pueden consumir toda la RAM
del servidor e impactar otros servicios. Los limites actuan como fusibles.

---

## Nginx como reverse proxy

### Por que Nginx frente a Node.js

Node.js es un runtime de aplicacion; Nginx es un servidor web optimizado para
tareas de red:

| Tarea | Node.js | Nginx |
|---|---|---|
| Servir archivos estaticos | Lento (single thread) | Rapido (sendfile, zero-copy) |
| TLS termination | Implementable pero costoso | Nativo, optimizado (OpenSSL) |
| Compresion gzip | Usa CPU del proceso Node | Proceso dedicado |
| Rate limiting por IP | express-rate-limit (en app) | A nivel de red (antes del app) |
| Balanceo de carga | No aplica | Round-robin, least-conn |

### Zonas de rate limiting

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
```

Esto crea dos limitadores independientes:

- `api`: 100 requests/minuto por IP para endpoints generales. La zona usa
  10MB de memoria, suficiente para rastrear ~160,000 IPs simultaneas.
- `auth`: 10 requests/minuto por IP para login/registro. Mas restrictivo
  porque los endpoints de autenticacion son el vector de ataque mas comun.

Los buckets se aplican con `burst`:

```nginx
location /api/v1/auth/ {
    limit_req zone=auth burst=5 nodelay;
}
```

`burst=5` permite rafagas cortas de hasta 5 requests simultaneos. `nodelay`
los procesa inmediatamente en lugar de encolarlos. El sexto request dentro
de la ventana recibe un 429.

### Headers de Proxy

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Sin estos headers, la API veria todas las conexiones como provenientes de
la IP de Nginx (172.x.x.x interna de Docker). Con ellos, `req.ip` en Express
devuelve la IP real del cliente.

### Bloqueos en produccion

```nginx
location /api-docs { return 404; }
location /         { return 404; }
```

- Swagger esta deshabilitado en la app de Express, pero por defensa en
  profundidad, Nginx tambien bloquea la ruta.
- Cualquier ruta que no empiece con `/api/` recibe 404, previniendo escaneo
  de rutas por bots.

---

## Variables de entorno

### Validacion al arranque

El archivo `config/env.ts` usa Zod para validar TODAS las variables de entorno
cuando la aplicacion arranca. Si una variable falta, tiene un formato incorrecto
o esta fuera de rango, el proceso termina inmediatamente con un mensaje claro:

```
Error: Variable de entorno 'JWT_SECRET' debe tener minimo 32 caracteres.
Proceso terminado.
```

### Variables obligatorias vs opcionales

**Obligatorias (sin default, fallo si no existen):**

| Variable | Motivo |
|---|---|
| DATABASE_URL | Sin BD no hay aplicacion |
| JWT_SECRET | Sin secreto los tokens no son seguros |

**Opcionales (con defaults razonables):**

| Variable | Default | Ajuste en produccion |
|---|---|---|
| PORT | 3001 | Generalmente no cambia |
| NODE_ENV | development | Siempre `production` en deploy |
| BCRYPT_SALT_ROUNDS | 12 | Subir a 14 si el hardware lo permite |
| CORS_ORIGIN | localhost:4200 | Dominio(s) del frontend |
| JWT_EXPIRES_IN | 8h | Segun politica de seguridad |
| LOG_LEVEL | segun NODE_ENV | `info` o `warn` en produccion |
| TRUST_PROXY | 1 | 2 si hay CDN + Nginx |
| REQUEST_TIMEOUT_MS | 30000 | Reducir a 15000 para APIs rapidas |

### CORS multi-origen

`CORS_ORIGIN` acepta multiples dominios separados por coma:

```ini
CORS_ORIGIN=https://erp.empresa.com,https://admin.empresa.com
```

El archivo `env.ts` los separa en un array y Expres los evalua en cada request:

```typescript
export const corsOrigins = env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map(o => o.trim())
  : env.CORS_ORIGIN;
```

### Plantilla .env.production.example

El repositorio incluye `.env.production.example` con todas las variables
documentadas. El flujo de despliegue es:

1. Copiar `.env.production.example` a `.env`
2. Reemplazar todos los valores marcados con "CAMBIAR"
3. Verificar que `CORS_ORIGIN` apunta al dominio real
4. Verificar que `JWT_SECRET` tiene al menos 64 caracteres aleatorios

---

## server.ts

### Arranque seguro

```typescript
const iniciar = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Conexion a base de datos verificada.');
  } catch (error) {
    logger.error('No se pudo conectar a la base de datos:', error);
    process.exit(1);
  }
  // ... listen() solo despues de verificar BD
};
```

El servidor NO acepta trafico hasta que la BD responda. Si la BD esta caida,
el proceso sale con codigo 1, Docker lo detecta via healthcheck y lo reinicia
segun la politica `restart: unless-stopped`.

### Timeouts HTTP

```typescript
server.keepAliveTimeout = 61_000; // 61 segundos
server.headersTimeout = 62_000;   // 62 segundos
server.setTimeout(30_000);        // 30 segundos por request
```

**Por que 61 segundos y no 60:** Nginx y los load balancers de AWS (ALB/NLB)
tienen un idle timeout default de 60 segundos para conexiones keep-alive. Si
Node.js cierra la conexion ANTES que el proxy, ocurre un `502 Bad Gateway`
porque el proxy intenta reusar una conexion que Node ya cerro.

La regla es: `keepAliveTimeout del backend > idle timeout del proxy`.

`headersTimeout` debe ser mayor que `keepAliveTimeout` porque cuenta desde
el inicio de la conexion, no desde el ultimo dato.

### Graceful shutdown

Cuando el proceso recibe SIGTERM (Docker) o SIGINT (Ctrl+C):

```
Senal recibida
  |
  v
Dejar de aceptar conexiones nuevas (server.close)
  |
  v
Esperar 5 segundos para que requests en vuelo terminen
  |
  v
Cerrar conexiones keep-alive activas (server.closeAllConnections)
  |
  v
Desconectar Prisma (liberar pool de BD)
  |
  v
process.exit(0)
  |
  (Si todo lo anterior no termina en 15 segundos)
  |
  v
process.exit(1) -- cierre forzado
```

**Por que es importante:** Sin graceful shutdown, al hacer `docker stop`:

- Requests en vuelo reciben `ECONNRESET` (error de red para el cliente)
- Transacciones de BD pueden quedar abiertas y bloquear locks
- Conexiones del pool de Prisma no se liberan, agotando el limite de
  PostgreSQL si se hacen reinicios frecuentes

### Errores globales

```typescript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
```

Ambos terminan el proceso porque un error no manejado deja la aplicacion en
un estado indeterminado. Es mas seguro reiniciar (Docker lo hace automaticamente)
que seguir ejecutando con estado corrupto.

---

## Health checks

### Tres niveles de chequeo

El sistema implementa health checks en tres capas complementarias:

**Nivel 1: Docker HEALTHCHECK (infraestructura)**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider http://localhost:3001/api/health || exit 1
```

Docker ejecuta esto cada 30 segundos. Si falla 3 veces seguidas, marca el
contenedor como `unhealthy`. `start-period=10s` da tiempo a la aplicacion
para arrancar sin contar fallos.

**Nivel 2: GET /api/health (liveness)**

```typescript
app.get('/api/health', (_req, res) => {
  res.json(ApiResponse.ok({
    estado: 'activo',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
});
```

Verifica que el proceso de Node.js responde. No verifica la BD. Es rapido
y barato. Usado por Docker y Nginx para saber si el proceso esta vivo.

**Nivel 3: GET /api/health/ready (readiness)**

```typescript
app.get('/api/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json(ApiResponse.ok({
      estado: 'listo',
      componentes: {
        baseDatos: 'conectada',
        memoria: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        uptime: process.uptime(),
      },
    }));
  } catch {
    res.status(503).json(
      ApiResponse.fail('Base de datos no disponible', 'SERVICE_UNAVAILABLE'),
    );
  }
});
```

Verifica que la aplicacion puede atender trafico real (BD accesible, pool
de conexiones funcionando). Si falla, balanceadores de carga deben dejar de
enviar trafico a esta instancia.

### Cuadro comparativo

| Propiedad | /api/health | /api/health/ready |
|---|---|---|
| Verifica BD | No | Si (SELECT 1) |
| Latencia | <1ms | ~5ms |
| Estado ante fallo BD | 200 (proceso vivo) | 503 (no listo) |
| Uso principal | Liveness probe | Readiness probe |
| Requiere auth | No | No |
| Rate limited | No (via Nginx access_log off) | No |

---

## Seguridad HTTP en profundidad

### Pipeline de seguridad (orden de ejecucion)

```
Request entrante
  |
  1. Nginx: rate limiting por zona (auth vs api)
  2. Nginx: headers de seguridad (X-Frame-Options, etc.)
  |
  v
  3. Express: ocultarTecnologia (elimina X-Powered-By)
  4. Express: helmet (20+ headers de seguridad)
  5. Express: CORS (valida origen)
  6. Express: HPP (limpia parametros duplicados)
  7. Express: headersSeguridad (Permissions-Policy, etc.)
  8. Express: validarContentType (rechaza body sin JSON)
  9. Express: express.json (parsea body, limite 10MB)
  10. Express: limitarGeneral (100 req/min por IP)
  |
  v
Llega al router del modulo
  |
  11. autenticar (JWT + sesion + usuario activo + horario)
  12. requerirRol (verifica rol)
  13. validar (Zod schema sobre body/query/params)
  |
  v
Controller → Service → Base de datos
```

### Headers de seguridad generados

| Header | Valor | Protege contra |
|---|---|---|
| Content-Security-Policy | default-src 'self' | XSS, inyeccion de scripts |
| Strict-Transport-Security | max-age=31536000 | Downgrade HTTPS a HTTP |
| X-Frame-Options | DENY | Clickjacking |
| X-Content-Type-Options | nosniff | MIME sniffing |
| X-DNS-Prefetch-Control | off | Tracking via DNS |
| Referrer-Policy | strict-origin-when-cross-origin | Leak de URLs en referer |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Uso no autorizado de APIs |
| X-Robots-Tag | noindex | Indexacion por bots |
| Cache-Control | no-store, no-cache | Cache de datos sensibles |
| X-Request-ID | UUID v4 unico | Correlacion de logs |

### Defensa en profundidad

Cada medida de seguridad esta duplicada en al menos dos capas:

| Amenaza | Capa 1 (Nginx) | Capa 2 (Express) |
|---|---|---|
| Brute force login | zone=auth 10r/m | limitarLogin 5/15min |
| DDoS/Abuso | zone=api 100r/m | limitarGeneral 100r/m |
| XSS | -- | Helmet CSP + sanitizarString + xss lib |
| Body gigante | client_max_body_size 10m | express.json limit 10mb |
| Info disclosure | Bloques /api-docs, / | Swagger deshabilitado en prod |
| Header sniffing | -- | ocultarTecnologia + helmet |
| Parameter pollution | -- | HPP + Zod validation |

---

## Scripts de package.json

### Scripts de desarrollo

| Script | Comando | Proposito |
|---|---|---|
| `dev` | tsx watch src/server.ts | Hot-reload en desarrollo |
| `db:generate` | prisma generate | Regenerar Prisma Client |
| `db:migrate` | prisma migrate dev | Crear/aplicar migracion en dev |
| `db:seed` | tsx prisma/seed.ts | Insertar datos iniciales |
| `db:studio` | prisma studio | UI web para explorar la BD |
| `db:reset` | prisma migrate reset | Borrar BD y recrear desde cero |

### Scripts de produccion

| Script | Comando | Proposito |
|---|---|---|
| `build` | rm -rf dist && tsc | Compilar TypeScript (limpio) |
| `start` | node dist/server.js | Arrancar servidor compilado |
| `start:prod` | NODE_ENV=production node dist/server.js | Arrancar con entorno prod |
| `db:migrate:deploy` | prisma migrate deploy | Aplicar migraciones en prod |

### Scripts de testing y CI

| Script | Comando | Proposito |
|---|---|---|
| `test` | jest --passWithNoTests | Ejecutar tests unitarios |
| `test:watch` | jest --watch | Tests en modo observador |
| `test:ci` | jest --passWithNoTests --ci --coverage | Tests en pipeline CI |
| `test:e2e` | bash test-flujo-completo.sh | 87 tests de flujo completo |
| `typecheck` | tsc --noEmit | Verificar tipos sin compilar |
| `ci` | typecheck + test:ci + build | Pipeline CI completo |

### Diferencia entre db:migrate y db:migrate:deploy

```
db:migrate (desarrollo):
  - Genera SQL de migracion a partir de cambios en schema.prisma
  - Pide confirmacion si hay datos que se perderian
  - Crea archivo de migracion en prisma/migrations/
  - Solo para desarrollo

db:migrate:deploy (produccion):
  - Aplica migraciones ya existentes en prisma/migrations/
  - No genera nuevas migraciones
  - No pide confirmacion
  - Idempotente: si ya se aplicaron, no hace nada
  - Seguro para scripts automatizados y Docker CMD
```

---

## Flujo de despliegue paso a paso

### Primer despliegue

```
1. Clonar repositorio en el servidor
   git clone <repo> && cd Back_ERP

2. Crear archivo de configuracion
   cp .env.production.example .env
   nano .env   # Rellenar TODOS los valores

3. Construir y levantar
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

4. Verificar
   curl http://localhost/api/health
   curl http://localhost/api/health/ready
   docker compose logs -f api  # Revisar logs
```

### Despliegues subsiguientes (actualizaciones)

```
1. Actualizar codigo
   git pull origin main

2. Reconstruir solo la API (PostgreSQL mantiene sus datos)
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api

3. Las migraciones se aplican automaticamente via CMD del Dockerfile
   (npx prisma migrate deploy se ejecuta antes de node dist/server.js)

4. Verificar
   curl http://localhost/api/health/ready
```

### Rollback de emergencia

```
1. Volver al commit anterior
   git checkout <commit-anterior>

2. Reconstruir
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api

3. Si hay migraciones problematicas, revertir manualmente en la BD
   (Prisma no tiene rollback automatico; las reversiones se hacen via SQL)
```

---

## Checklist pre-produccion

Antes de desplegar, verificar cada punto:

### Seguridad

- [ ] JWT_SECRET cambiado a un valor aleatorio de al menos 64 caracteres
- [ ] DB_PASSWORD cambiado a una contrasena fuerte
- [ ] CORS_ORIGIN apunta al dominio real del frontend, no a localhost
- [ ] NODE_ENV esta en "production"
- [ ] Swagger deshabilitado en produccion (automatico con NODE_ENV=production)
- [ ] PostgreSQL no expone puerto al host (solo red interna Docker)
- [ ] Certificados TLS configurados en Nginx (descomentar seccion ssl)
- [ ] Rate limiting activo en ambas capas (Nginx + Express)

### Infraestructura

- [ ] .env creado a partir de .env.production.example con valores reales
- [ ] Volumen de PostgreSQL en almacenamiento persistente
- [ ] Backups de BD configurados (pg_dump o herramienta externa)
- [ ] Logs redirigidos a sistema de monitoreo (Datadog, CloudWatch, etc.)
- [ ] Alertas configuradas para contenedores unhealthy
- [ ] Firewall del servidor solo permite puertos 80 y 443

### Aplicacion

- [ ] npm run ci pasa sin errores (typecheck + test + build)
- [ ] test-flujo-completo.sh pasa 87/87 tests
- [ ] Seed ejecutado si es la primera vez (npm run db:seed)
- [ ] Health checks responden correctamente (/api/health y /api/health/ready)
- [ ] Logs de arranque muestran "Servidor ERP/POS iniciado" sin errores

### Despues del despliegue

- [ ] Probar login desde el frontend real
- [ ] Verificar que las operaciones CRUD funcionan
- [ ] Revisar logs por errores en los primeros 15 minutos
- [ ] Confirmar que el rate limiting funciona (>100 req/min devuelve 429)
- [ ] Confirmar que CORS rechaza origenes no autorizados
