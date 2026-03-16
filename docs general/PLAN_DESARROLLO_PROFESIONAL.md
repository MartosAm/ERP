# Plan de Desarrollo Profesional — ERP POS

> Última actualización: 11 de marzo de 2026
> Estado del proyecto: MVP funcional con 362 tests unitarios
> Objetivo: Llevar el ERP POS a calidad de producción profesional

---

## Estado Actual del Proyecto

### Lo que está construido
- **Backend**: 13 módulos API REST (Express + TypeScript + Prisma + PostgreSQL)
- **Frontend**: Angular 17 + Tailwind + Angular Material
- **Testing**: 24 suites, 362 tests, 70.87% cobertura de líneas
- **Seguridad base**: Helmet, CORS, rate limiting, validación Zod, sanitización XSS
- **Infraestructura**: Docker Compose (dev + producción), graceful shutdown

### Lo que falta para producción
- Correcciones de seguridad críticas (JWT, contraseñas)
- Escalabilidad (Redis, rate limiting distribuido)
- Observabilidad (logging estructurado, métricas, alertas)
- CI/CD automatizado
- Cobertura de tests > 80%

---

## Roadmap por Fases

---

### FASE 1 — Seguridad Crítica
**Prioridad:** Bloqueante para producción

| Tarea | Detalle | Archivo(s) |
|-------|---------|------------|
| Fix JWT algorithm | Agregar `algorithms: ['HS256']` en `jwt.verify()` | `autenticar.ts` |
| Secrets en env vars | Mover contraseña BD de docker-compose a `.env` | `docker-compose.yml` |
| TLS/HTTPS | Configurar Nginx reverse proxy con Let's Encrypt | `nginx.conf` (nuevo) |
| Rate limit auth | Limiter dedicado: 5 intentos/15min para login, registro, cambiar-pin | `auth.routes.ts`, `limitarRates.ts` |
| Refresh tokens | Access token 15min + refresh token 7d httpOnly cookie | `auth.service.ts`, `auth.routes.ts` |

**Entregable:** Backend seguro para exponer a internet.

---

### FASE 2 — Escalabilidad e Infraestructura
**Prioridad:** Requerido para múltiples usuarios simultáneos

| Tarea | Detalle |
|-------|---------|
| Redis como store central | Reemplazar NodeCache por Redis para caché, sesiones y rate limiting |
| Rate limit distribuido | Migrar a `rate-limit-redis` para funcionar en cluster |
| Connection pool | Configurar `connection_limit` y `pool_timeout` en DATABASE_URL |
| Cache de sesiones | Cachear sesiones activas en Redis (TTL 5min) en vez de query por request |
| Índices BD | Crear índices para queries frecuentes POS (ordenes, productos, inventario) |
| Query timeout | Middleware Prisma para cortar queries > 30s |

**Entregable:** Sistema que soporta 50+ usuarios POS concurrentes sin degradación.

---

### FASE 3 — Calidad de Código y Tests
**Prioridad:** Prevenir regresiones y bugs en producción

| Tarea | Tests estimados | Impacto cobertura |
|-------|----------------|-------------------|
| Tests `ordenes.service.ts` (crear, cancelar, devolver) | ~30 tests | +8-10% |
| Tests `inventario.service.ts` (ajustar, transferir) | ~15 tests | +3-4% |
| Tests `compras.service.ts` (recibir parcial/total) | ~12 tests | +2-3% |
| Tests `auth.service.ts` (registroPublico, perfil, horario) | ~15 tests | +2-3% |
| Tests 7 schemas faltantes | ~50 tests | +3% |
| Tests `autenticar.ts` middleware | ~10 tests | +2% |
| Tests sanitizar + paginacion | ~8 tests | +1% |
| Tests de rutas (11 módulos restantes) | ~120 tests | Integración |

**Entregable:** > 85% cobertura, ~550 tests, regresiones imposibles.

**Meta de cobertura:**
| Actual | Post-Fase 3 |
|--------|------------|
| 70.87% líneas | > 85% líneas |
| 362 tests | ~550 tests |
| 24 suites | ~45 suites |

---

### FASE 4 — Observabilidad y Monitoreo
**Prioridad:** Detectar y resolver problemas antes que el usuario

| Tarea | Herramienta |
|-------|-------------|
| Logging estructurado (JSON) | Winston/Pino con niveles, correlación por request-id |
| Métricas de aplicación | Prometheus + prom-client (latencia, errores, conexiones BD) |
| Dashboard operacional | Grafana con paneles: latencia p95, tasa de errores, cajas activas |
| Alertas | Alertmanager: error rate > 5%, latencia p95 > 2s, BD conexiones > 80% |
| Health checks avanzados | `/health/ready` (BD + Redis + dependencias) vs `/health/live` (proceso vivo) |
| Tracing distribuido | OpenTelemetry para rastrear requests cross-service |

**Entregable:** Visibilidad total del estado del sistema en tiempo real.

**Métricas críticas POS a monitorear:**
```
- Tiempo de respuesta crear orden (p50, p95, p99)
- Tasa de errores por módulo
- Ordenes procesadas por minuto
- Conexiones activas a BD
- Memoria/CPU por instancia
- Turnos de caja abiertos vs cerrados
```

---

### FASE 5 — CI/CD y Deploy Automatizado
**Prioridad:** Eliminar errores humanos en despliegue

| Tarea | Detalle |
|-------|---------|
| Pipeline CI (GitHub Actions / GitLab CI) | Lint → Tests → Build → Coverage check |
| Gate de calidad | Rechazar PR si cobertura < 80% o tests fallan |
| Build Docker optimizado | Multi-stage build, imagen final < 200MB |
| Deploy automatizado | Staging automático en push a `develop`, producción manual en `main` |
| Migraciones BD seguras | `prisma migrate deploy` en pipeline, nunca manual |
| Rollback automatizado | Si health check falla post-deploy, rollback a versión anterior |
| Secretos | GitHub Secrets / Vault / AWS SSM — nunca en repositorio |

**Pipeline propuesto:**
```
[Push] → [Lint+Types] → [Tests 362+] → [Build Docker] → [Deploy Staging]
                                                              ↓
                                            [Smoke Tests] → [Deploy Prod]
                                                              ↓
                                                    [Health Check] → OK / Rollback
```

**Entregable:** Deploy a producción en < 10 minutos con confianza total.

---

### FASE 6 — Concurrencia y Resiliencia Avanzada
**Prioridad:** Cero pérdida de datos bajo carga

| Tarea | Detalle |
|-------|---------|
| Optimistic locking | Campo `version` en ordenes, inventario, turnos-caja |
| Idempotency keys | Header `X-Idempotency-Key` para crear orden y procesar pagos |
| Circuit breaker | Patrón circuit breaker para servicios externos (pasarela de pago, email) |
| Retry con backoff | Reintentos exponenciales para operaciones transitorias (BD timeout) |
| Dead letter queue | Cola de reintentos para operaciones fallidas (emails, notificaciones) |
| Manejo de stock | `SELECT FOR UPDATE` en actualización de inventario para evitar oversell |

**Entregable:** Sistema que no pierde datos ni corrompe estado bajo alta concurrencia.

---

### FASE 7 — Funcionalidades de Negocio
**Prioridad:** Valor agregado para el usuario final

| Funcionalidad | Módulo | Descripción |
|---------------|--------|-------------|
| Dashboard en tiempo real | Frontend | Ventas del día, productos top, comparativa temporal |
| Notificaciones stock bajo | Inventario | Alerta cuando producto < cantidad mínima |
| Reportes exportables | Reportes | PDF y Excel para ventas, inventario, compras |
| Multi-sucursal | Almacenes | Gestión centralizada de múltiples puntos de venta |
| Facturación electrónica | Ordenes | Integración con SAT/AFIP según país |
| Auditoría completa | General | Log de todas las acciones por usuario con timestamps |
| Backup automático | Infra | Backup diario BD + verificación de restauración |

---

## Priorización Visual

```
URGENCIA / IMPORTANCIA

                    URGENTE                    NO URGENTE
                ┌─────────────────────┬─────────────────────┐
                │                     │                     │
   IMPORTANTE   │  FASE 1: Seguridad  │  FASE 4: Monitoreo  │
                │  FASE 2: Escala     │  FASE 6: Resiliencia│
                │                     │  FASE 7: Negocio    │
                ├─────────────────────┼─────────────────────┤
                │                     │                     │
 NO IMPORTANTE  │  FASE 3: Tests      │  Refactoring        │
                │  FASE 5: CI/CD      │  Documentación extra│
                │                     │                     │
                └─────────────────────┴─────────────────────┘
```

---

## Definición de "Listo para Producción"

Un checklist definitivo antes de considerar el sistema producción-ready:

### Seguridad
- [ ] JWT con algoritmo explícito y refresh tokens
- [ ] Cero secretos en código fuente
- [ ] TLS/HTTPS obligatorio
- [ ] Rate limiting distribuido en endpoints críticos
- [ ] Sanitización XSS automática
- [ ] CORS configurado para dominio de producción
- [ ] Swagger deshabilitado en producción

### Estabilidad
- [ ] > 80% cobertura de tests
- [ ] Graceful shutdown (ya implementado ✅)
- [ ] Connection pool configurado
- [ ] Query timeouts activos
- [ ] Manejo de errores centralizado (ya implementado ✅)

### Escalabilidad
- [ ] Redis para caché y rate limiting
- [ ] Índices de BD para queries frecuentes
- [ ] Paginación en todos los listados (ya implementado ✅)
- [ ] Sin memory leaks (NodeCache reemplazado)

### Operaciones
- [ ] CI/CD pipeline funcional
- [ ] Logging estructurado con request-id
- [ ] Métricas y alertas configuradas
- [ ] Health checks (readiness + liveness)
- [ ] Backups automatizados con verificación
- [ ] Procedimiento de rollback documentado

### Frontend
- [ ] Build optimizado (tree shaking, lazy loading)
- [ ] PWA para uso offline en punto de venta
- [ ] Manejo de errores de red (reintentos, cola offline)
- [ ] Caché de catálogos para performance

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| `GUIA_PRODUCCION_ROBUSTEZ.md` | Arquitectura de alta disponibilidad, concurrencia, rendimiento, monitoreo, disaster recovery |
| `REPORTE_COBERTURA_TESTS.md` | Cobertura actual por módulo, brechas identificadas, plan de mejora |
| `AUDITORIA_SEGURIDAD.md` | Hallazgos de seguridad con severidad, código de corrección, checklist |
| `FLUJO_DESARROLLO_API.md` | Flujo estándar para desarrollar nuevos módulos |
| `PLAN_DESARROLLO.md` | Plan original de módulos del backend |
