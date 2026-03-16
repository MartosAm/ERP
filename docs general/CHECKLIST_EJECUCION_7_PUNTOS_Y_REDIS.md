# Checklist de Ejecucion: Guia 7 Puntos + Redis

Fecha: 2026-03-16
Contexto: ERP Full Stack (Back_ERP + Front_ERP-1)
Objetivo: convertir la guia de calidad en tareas concretas, medibles y ejecutables por equipo o agente de IA.

---

## Regla de trabajo

- Cada bloque se cierra solo con evidencia tecnica (comandos y resultado).
- No avanzar al siguiente bloque si el criterio de aceptacion del actual falla.
- Cada bloque debe quedar en commit separado.

---

## Estado actual (marzo 2026)

- [x] Bloque 4 base: idempotencia backend + bloqueo doble submit frontend.
- [x] Redis para rate limiting distribuido (backend/infrastructure).
- [ ] Bloque 1 completo al 100% en todos los modulos.
- [ ] Bloque 2 completo al 100% en todos los modulos.
- [ ] Bloque 3 completo al 100% (cobertura adicional de concurrencia/e2e).
- [ ] Bloque 5 completo al 100% (hardening final SSL + secretos + auditoria).
- [ ] Bloque 6 completo al 100% (metricas y alertas operativas).
- [ ] Bloque 7 completo al 100% (pipeline y rollback formalizado).

---

## Bloque 1 - Arquitectura y Limites

### Tareas
- Verificar que los modulos nuevos respeten: `routes -> controller -> service -> prisma`.
- Prohibir logica de negocio en `controller` y en componentes de UI.
- Confirmar contrato de respuesta uniforme (`ApiResponse.ok/fail`).

### Evidencia requerida
- Lista de archivos tocados por modulo.
- Breve nota de impacto en otros modulos.

### Cierre
- Sin acoplamientos circulares.
- Flujo endpoint completo trazable en codigo.

---

## Bloque 2 - Calidad SOLID

### Tareas
- Revisar funciones grandes y dividir por responsabilidad.
- Evitar `any` nuevo salvo justificacion explicita.
- Mantener manejo de errores en `AppError` + `manejarErrores`.

### Evidencia requerida
- `npm run typecheck` en verde.
- Lista de refactors aplicados (si hubo).

### Cierre
- Cambios legibles y mantenibles.

---

## Bloque 3 - Pruebas y Confiabilidad

### Tareas
- Agregar/ajustar tests para cada regla de negocio modificada.
- Incluir casos negativos y conflicto (400/409/422).
- Validar middlewares criticos y rutas principales.

### Evidencia requerida
- `npm test` o suites objetivo en verde.

### Cierre
- Sin regresiones en modulos tocados.

---

## Bloque 4 - Robustez (No duplicados)

### Tareas
- Idempotencia en endpoints mutables criticos.
- Bloqueo de doble submit en frontend para operaciones de cobro/creacion.
- Reintentos solo en metodos idempotentes.

### Estado actual
- Ya implementado en ordenes/auth/compras criticas y POS.

### Cierre
- Repetir request con la misma key no duplica efecto.

---

## Bloque 5 - Seguridad

### Tareas
- Verificar JWT, roles, validacion de entrada, sanitizacion.
- Revisar CORS y headers bajo proxy.
- Asegurar que no haya secretos hardcodeados.

### Evidencia requerida
- Revision de `.env.example`, compose y nginx.

### Cierre
- Endpoints criticos protegidos por auth + autorizacion + rate limit.

---

## Bloque 6 - Observabilidad

### Tareas
- Validar `requestId` en logs y correlacion de errores.
- Verificar health checks de liveness/readiness.
- Definir alertas minimas (5xx, latencia, pool DB, Redis down).

### Evidencia requerida
- Captura de logs estructurados y estado de health endpoints.

### Cierre
- Incidente reproducible con trazas suficientes.

---

## Bloque 7 - Entrega y Gobierno

### Tareas
- Pipeline: `typecheck -> test -> build`.
- Deploy con migraciones seguras (`db:migrate:deploy`).
- Plan de rollback antes de release.

### Evidencia requerida
- Resultado de comandos y versionado de commit.

### Cierre
- Despliegue sin interrupcion no planificada.

---

## Implementacion Redis (Especifico)

### Objetivo
Hacer rate limiting distribuido y preparado para escalar a multiples replicas.

### Tareas tecnicas obligatorias
- Agregar dependencias: `redis` y `rate-limit-redis`.
- Configurar cliente Redis compartido en backend (`src/config/redis.ts`).
- Integrar Redis en `limitarRates.ts` con fallback seguro en memoria.
- Conectar/desconectar Redis en lifecycle de `server.ts`.
- Definir `REDIS_URL` en `.env.example`.
- Agregar servicio `redis` en `docker-compose.yml` y `docker-compose.prod.yml`.

### Tareas de validacion
- Levantar servicios: `docker compose up -d postgres redis`.
- Validar Redis: `docker compose ps` y `redis-cli ping`.
- Validar backend: `npm run typecheck` y test de middleware.

### Tareas siguientes recomendadas
- Migrar idempotencia a Redis para deduplicacion entre replicas.
- Migrar cache funcional (si aplica) de `node-cache` a Redis.

### Criterio de aceptacion Redis
- App funciona con Redis activo y con fallback si Redis cae.
- Rate limit consistente en entorno multi-instancia.

---

## Formato de reporte para agente de IA

```md
## Bloque ejecutado
- [ ] 1
- [ ] 2
- [ ] 3
- [ ] 4
- [ ] 5
- [ ] 6
- [ ] 7
- [ ] Redis

## Cambios realizados
- Archivo: motivo

## Validacion
- Comando: resultado

## Estado
- completo / parcial
- riesgos pendientes
- siguiente bloque
```
