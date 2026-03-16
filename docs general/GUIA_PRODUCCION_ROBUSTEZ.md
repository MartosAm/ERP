# Guía de Producción y Robustez — ERP POS

> Documento de referencia para mantener un sistema de punto de venta resiliente,
> disponible, seguro y con rendimiento sostenido bajo carga real.

---

## Índice

1. [Filosofía de Robustez](#1-filosofía-de-robustez)
2. [Alta Disponibilidad y Resiliencia de APIs](#2-alta-disponibilidad-y-resiliencia-de-apis)
3. [Consistencia de Datos bajo Concurrencia](#3-consistencia-de-datos-bajo-concurrencia)
4. [Rendimiento y Escalabilidad](#4-rendimiento-y-escalabilidad)
5. [Monitoreo y Observabilidad](#5-monitoreo-y-observabilidad)
6. [Estrategia de Despliegue](#6-estrategia-de-despliegue)
7. [Plan de Recuperación ante Desastres](#7-plan-de-recuperación-ante-desastres)
8. [Checklist Pre-Producción](#8-checklist-pre-producción)

---

## 1. Filosofía de Robustez

Un ERP de punto de venta **no puede caerse** durante horario comercial. Cada minuto
de inactividad representa ventas perdidas y clientes frustrados.

### Principios rectores

| Principio | Significado |
|-----------|-------------|
| **Fail-fast, recover-fast** | Detectar errores inmediatamente, reiniciar solo el componente afectado |
| **Graceful degradation** | Si un servicio no-crítico falla (reportes, caché), las ventas siguen operando |
| **Circuit breaker** | Dejar de llamar a un servicio caído para no saturarlo durante su recuperación |
| **Idempotencia** | Una operación repetida (ej. reintentar pago) produce el mismo resultado |
| **Defensive coding** | Validar en los bordes del sistema (input), confiar internamente |
| **Zero-downtime deploys** | Actualizar sin que el cajero note interrupción |

---

## 2. Alta Disponibilidad y Resiliencia de APIs

### 2.1 Arquitectura mínima recomendada

```
                    ┌───────────────┐
                    │   Nginx/LB    │ ← TLS termination + rate limit L7
                    └───────┬───────┘
                ┌───────────┼───────────┐
                ▼           ▼           ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │ API  #1  │ │ API  #2  │ │ API  #3  │ ← PM2 cluster / Docker replicas
          └────┬─────┘ └────┬─────┘ └────┬─────┘
               │            │            │
          ┌────▼────────────▼────────────▼────┐
          │          Redis (cache + rate)      │
          └────────────────┬──────────────────┘
          ┌────────────────▼──────────────────┐
          │   PostgreSQL (primary + replica)   │
          └───────────────────────────────────┘
```

### 2.2 Graceful Shutdown (ya implementado ✅)

El servidor actual ya maneja `SIGTERM`/`SIGINT` correctamente:
- Deja de aceptar nuevas conexiones
- Drena peticiones en curso (timeout 15s)
- Cierra conexión a Prisma/BD
- Sale con código limpio

### 2.3 Health Checks (ya implementado ✅)

- **Liveness** `/api/health` → El proceso responde
- **Readiness** `/api/health/ready` → BD conectada y respondiendo

**Mejora pendiente:** Proteger `/api/health/ready` en producción para no exponer
métricas de memoria y uptime públicamente. Opciones:
- Mover datos sensibles detrás de autenticación
- Limitar a IPs internas (health check de orquestador)

### 2.4 Reintentos automáticos en base de datos

```
Problema: Postgres se reinicia → Las conexiones existentes se rompen
Solución: Configurar Prisma con reintentos
```

**Acción requerida:**
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=10"
```

Además, implementar un wrapper de reintento para operaciones críticas (crear orden, procesar pago).

### 2.5 Circuit Breaker para servicios externos

Si en el futuro se integran pasarelas de pago, APIs de envío, etc.:
- Implementar patrón circuit breaker (ej. librería `opossum`)
- Estados: CLOSED → OPEN (tras N fallos) → HALF-OPEN (prueba periódica)
- Fallback: almacenar en cola y reintentar

### 2.6 PM2 / Docker replicas

| Estrategia | Comando | Beneficio |
|-----------|---------|-----------|
| PM2 cluster | `pm2 start dist/server.js -i max` | N procesos según CPUs |
| Docker Compose | `deploy.replicas: 3` | 3 contenedores con healthcheck |
| Kubernetes | `replicas: 3` + HPA | Auto-scaling por CPU/memoria |

---

## 3. Consistencia de Datos bajo Concurrencia

### 3.1 Problemas de concurrencia en un POS

| Escenario | Riesgo | Mitigación |
|-----------|--------|------------|
| 2 cajeros venden el último producto | Sobreventa (stock negativo) | Transacción con `SELECT FOR UPDATE` |
| Admin edita producto mientras cajero crea orden | Precio inconsistente | Capturar precio al momento de la orden (ya implementado ✅) |
| 2 admins editan el mismo producto | Última escritura gana | Optimistic locking con campo `version` |
| Cierre de turno mientras se procesa venta | Venta sin turno asociado | Verificar turno dentro de la transacción |
| 2 usuarios confirman la misma cotización | Doble descuento de stock | Transacción atómica con lock |

### 3.2 Transacciones Prisma (ya implementado ✅)

Las operaciones críticas ya usan `prisma.$transaction()`:
- Crear orden → descontar stock + registrar movimiento + crear pago
- Cerrar turno → calcular efectivo + actualizar turno
- Cambiar estado usuario → cerrar sesiones activas

### 3.3 Mejoras recomendadas de concurrencia

#### a) Bloqueo optimista (Optimistic Locking)

```typescript
// Agregar campo "version" al modelo Producto en schema.prisma
// version Int @default(0)

// En el servicio:
const updated = await prisma.producto.updateMany({
  where: { id: productoId, version: versionActual },
  data: { ...cambios, version: { increment: 1 } }
});
if (updated.count === 0) {
  throw new ErrorConflicto('El registro fue modificado por otro usuario');
}
```

#### b) SELECT FOR UPDATE para stock

```typescript
// En ordenes.service.ts → crear()
await prisma.$transaction(async (tx) => {
  // Bloqueo pesimista para stock crítico
  const [existencia] = await tx.$queryRaw`
    SELECT * FROM existencias
    WHERE "productoId" = ${productoId}
    AND "almacenId" = ${almacenId}
    FOR UPDATE
  `;

  if (existencia.cantidad < cantidadSolicitada) {
    throw new ErrorNegocio('Stock insuficiente');
  }

  // Proceder con la venta...
});
```

#### c) Idempotencia en pagos

```typescript
// Generar UUID antes de enviar el pago
// Si el cliente reintenta, el mismo UUID evita cobro doble
const idempotencyKey = req.headers['x-idempotency-key'];
const pagoExistente = await prisma.pago.findUnique({
  where: { idempotencyKey }
});
if (pagoExistente) return pagoExistente; // Ya procesado
```

---

## 4. Rendimiento y Escalabilidad

### 4.1 Caché distribuido (migrar de NodeCache a Redis)

| Aspecto | NodeCache (actual) | Redis (recomendado) |
|---------|-------------------|---------------------|
| Multi-instancia | ❌ Cada proceso tiene su propio caché | ✅ Compartido entre todas las instancias |
| Persistencia | ❌ Se pierde al reiniciar | ✅ Opcional (RDB/AOF) |
| Pub/Sub | ❌ | ✅ Para invalidación distribuida |
| Límite memoria | ❌ Sin control | ✅ `maxmemory-policy allkeys-lru` |
| Rate limiting | ❌ Independiente | ✅ Mismo Redis para rate-limit-redis |

**Prioridad: ALTA** — Requisito antes de escalar a múltiples instancias.

### 4.2 Sesiones: caché de validación JWT

Actualmente cada request autenticado hace un `SELECT` a la BD para validar la sesión.
Con 50 cajeros activos haciendo 1 req/seg = 50 queries/seg solo de sesiones.

**Solución:**
```
1. Al hacer login → almacenar en Redis: session:{id} = { activo, rol, horario }
2. En autenticar.ts → buscar primero en Redis
3. Al desactivar usuario → invalidar en Redis
4. TTL del caché = 60 segundos (balance entre rendimiento y frescura)
```

### 4.3 Índices de base de datos

Verificar que existen índices para las queries más frecuentes:

```sql
-- Queries de POS (alta frecuencia)
CREATE INDEX IF NOT EXISTS idx_productos_sku_empresa
  ON productos(sku, "empresaId") WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_productos_barras_empresa
  ON productos("codigoBarras", "empresaId") WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_ordenes_turno_estado
  ON ordenes("turnoCajaId", estado);

CREATE INDEX IF NOT EXISTS idx_existencias_producto_almacen
  ON existencias("productoId", "almacenId");

-- Queries de reportes (menor frecuencia pero pesadas)
CREATE INDEX IF NOT EXISTS idx_ordenes_empresa_estado_fecha
  ON ordenes("empresaId", estado, "creadoEn");
```

### 4.4 Paginación eficiente

La paginación actual usa `skip/take` (OFFSET-based), lo cual es lento para páginas altas.

**Para catálogos grandes (>10K productos):**
```typescript
// Cursor-based pagination (mucho más eficiente)
const productos = await prisma.producto.findMany({
  take: limite,
  skip: 1, // Skip the cursor itself
  cursor: { id: ultimoIdVisto },
  where: { empresaId },
  orderBy: { id: 'asc' },
});
```

### 4.5 Compresión y tamaño de respuestas

- ✅ Compresión gzip/br ya habilitada con `compression()`
- ✅ `select` en Prisma para no enviar campos innecesarios
- **Mejora:** Para listados grandes, considerar respuestas parciales (campos seleccionables por el cliente)

---

## 5. Monitoreo y Observabilidad

### 5.1 Los 3 pilares

| Pilar | Herramienta recomendada | Estado actual |
|-------|------------------------|---------------|
| **Logs** | Winston (ya) + transporte a ELK o Loki | ✅ Parcial (solo consola y archivo) |
| **Métricas** | Prometheus + Grafana | ❌ No implementado |
| **Trazas** | OpenTelemetry + Jaeger | ❌ No implementado |

### 5.2 Métricas críticas para un POS

```
# Métricas de negocio
pos_ordenes_por_minuto          → Ritmo de ventas
pos_ticket_promedio             → Salud del negocio
pos_tiempo_creacion_orden_ms    → Experiencia del cajero

# Métricas de aplicación
http_request_duration_seconds   → Latencia por endpoint
http_requests_total             → Throughput
nodejs_heap_used_bytes          → Consumo de memoria
db_pool_active_connections      → Salud de la BD

# Métricas de infraestructura
container_cpu_usage_seconds     → CPU por contenedor
container_memory_usage_bytes    → RAM por contenedor
pg_stat_activity_count          → Conexiones activas en Postgres
```

### 5.3 Alertas recomendadas

| Condición | Severidad | Acción |
|-----------|-----------|--------|
| API no responde en `/api/health` x 3 intentos | **CRÍTICA** | Reiniciar contenedor + notificar |
| Latencia p99 > 2s por 5 min | **ALTA** | Investigar queries lentas |
| Errores 5xx > 1% del tráfico | **ALTA** | Revisar logs de error |
| Pool de BD > 80% utilizado | **MEDIA** | Escalar conexiones o instancias |
| Memoria > 90% del límite | **MEDIA** | Investigar memory leak |
| Disco de BD > 80% | **MEDIA** | Limpiar datos o expandir almacenamiento |
| Certificado TLS expira en < 30 días | **BAJA** | Renovar certificado |

### 5.4 Logging estructurado

El logger actual (Winston) ya produce JSON en producción. Asegurar que cada log incluya:
```json
{
  "timestamp": "2026-03-11T10:30:00.000Z",
  "level": "error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/v1/ordenes",
  "userId": "user-123",
  "empresaId": "emp-456",
  "duration": 245,
  "statusCode": 500,
  "error": "Connection refused",
  "stack": "..." // Solo en development
}
```

---

## 6. Estrategia de Despliegue

### 6.1 Pipeline CI/CD recomendado

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Push   │───▶│  Lint +  │───▶│  Tests   │───▶│  Build   │───▶│  Deploy  │
│  a main  │    │ Typecheck│    │ + Cover  │    │  Docker  │    │  Staging │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                                     │
                                                          ┌──────────▼─────────┐
                                                          │  Tests E2E Staging  │
                                                          └──────────┬─────────┘
                                                                     │ ✅
                                                          ┌──────────▼─────────┐
                                                          │  Deploy Producción  │
                                                          │  (rolling update)   │
                                                          └────────────────────┘
```

### 6.2 Despliegue sin downtime (Rolling Update)

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1        # Actualizar de a 1
        delay: 30s             # Esperar 30s entre cada replica
        failure_action: rollback
        order: start-first     # Levantar nueva antes de bajar vieja
      rollback_config:
        parallelism: 0         # Rollback todas a la vez
```

### 6.3 Migraciones de BD seguras

```
1. Nunca hacer ALTER TABLE destructivas directamente
2. Migrations en 2 fases:
   a) Fase expansiva: ADD COLUMN (compatible con código viejo)
   b) Deploy código nuevo
   c) Fase contractiva: DROP COLUMN viejo (tras verificar)
3. Siempre tener script de rollback para cada migración
4. Ejecutar migraciones ANTES del deploy, no durante
```

---

## 7. Plan de Recuperación ante Desastres

### 7.1 Backup de base de datos

| Tipo | Frecuencia | Retención | Herramienta |
|------|-----------|-----------|-------------|
| **Full dump** | Diario 2:00 AM | 30 días | `pg_dump --format=custom` |
| **WAL archiving** | Continuo | 7 días | `pg_basebackup` + archiver |
| **Snapshot de disco** | Diario | 14 días | Proveedor cloud |

### 7.2 Procedimiento de restauración

```bash
# 1. Detener la API
docker compose -f docker-compose.prod.yml stop api

# 2. Restaurar backup
pg_restore --clean --if-exists -d erp_db backup_20260311.dump

# 3. Verificar integridad
psql -d erp_db -c "SELECT count(*) FROM ordenes;"

# 4. Reiniciar API
docker compose -f docker-compose.prod.yml up -d api

# 5. Verificar health
curl https://api.midominio.com/api/health/ready
```

### 7.3 RTO y RPO objetivo

| Métrica | Valor objetivo | Significado |
|---------|---------------|-------------|
| **RPO** (Recovery Point Objective) | < 1 hora | Máximo 1 hora de datos perdidos |
| **RTO** (Recovery Time Objective) | < 30 min | Sistema operativo en < 30 min tras incidente |

---

## 8. Checklist Pre-Producción

### Infraestructura

- [ ] TLS/HTTPS habilitado y forzado (redirect HTTP → HTTPS)
- [ ] Certificado SSL válido (Let's Encrypt o comercial)
- [ ] Nginx como reverse proxy con rate limiting L7
- [ ] Base de datos con backups automáticos diarios
- [ ] Monitoreo de uptime configurado (UptimeRobot, Pingdom)
- [ ] DNS y dominio configurados
- [ ] Firewall: solo puertos 80, 443 expuestos al público

### Aplicación

- [ ] Variables de entorno en producción (no hardcoded)
- [ ] `NODE_ENV=production`
- [ ] JWT_SECRET de 64+ caracteres generado con `openssl rand -base64 64`
- [ ] CORS_ORIGIN apuntando al dominio real del frontend
- [ ] Swagger deshabilitado (`NODE_ENV=production` ← ya automático)
- [ ] Logs configurados para persistencia (archivo + rotación)
- [ ] Graceful shutdown operativo
- [ ] Health checks respondiendo correctamente

### Base de datos

- [ ] `connection_limit` y `pool_timeout` en DATABASE_URL
- [ ] Password de BD fuerte (32+ caracteres aleatorios)
- [ ] BD no expuesta a Internet (solo acceso interno)
- [ ] Índices optimizados para queries frecuentes
- [ ] `statement_timeout` configurado (30s)
- [ ] Backup verificado y restaurable

### Seguridad (ver AUDITORIA_SEGURIDAD.md para detalle)

- [ ] `algorithms: ['HS256']` en jwt.verify()
- [ ] Rate limiting con Redis store (no in-memory)
- [ ] CSP estricto en producción (sin unsafe-inline)
- [ ] Credenciales fuera del código fuente
- [ ] npm audit sin vulnerabilidades críticas
- [ ] Sanitización de inputs activa en todos los módulos

### Tests

- [ ] Todos los tests unitarios pasando (362 actualmente)
- [ ] Coverage de servicios > 70% (actualmente 72.25%)
- [ ] Test de carga básico ejecutado (vegeta, k6 o artillery)
- [ ] Test de restauración de backup ejecutado

---

> **Próximos documentos relacionados:**
> - `AUDITORIA_SEGURIDAD.md` → Evaluación detallada de seguridad
> - `REPORTE_COBERTURA_TESTS.md` → Coverage por módulo y plan de mejora
> - `PLAN_DESARROLLO_PROFESIONAL.md` → Roadmap de mejoras técnicas
