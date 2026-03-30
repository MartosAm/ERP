# Fase 7 - Despliegue temporal (Iteracion 1)

Fecha: 2026-03-28
Rama: `chore/plan-calidad-despliegue-temp`

## Objetivo

Iniciar la fase de despliegue temporal con validacion post-deploy ejecutable y trazable.

## Alcance ejecutado en esta iteracion

1. Se ejecuto smoke base post-deploy del backend:
   - `GET /api/health` -> 200
   - `GET /api/health/ready` -> 200
   - `GET /api/v1/auth/me` sin token -> 401

2. Se implemento smoke extendido post-deploy:
   - Health + readiness
   - Validacion de headers de seguridad (`x-request-id`, `x-content-type-options`, `x-response-time`)
   - Login con usuario real
   - Perfil autenticado
   - Listado de productos paginado
   - Flujo POS minimo: crear orden (`POST /api/v1/ordenes`) con idempotencia

3. Artefactos tecnicos agregados:
   - `Back_ERP/deploy/scripts/post_deploy_smoke_full.sh`
   - Script npm: `ops:smoke:full`
   - Blueprint Render: `render.yaml` (servicio backend `Back_ERP`)

## Validacion ejecutada

```bash
npm run ops:smoke -- http://localhost:3001
SMOKE_CAJA_ID=<id_caja> SMOKE_PRODUCTO_ID=<id_producto> npm run ops:smoke:full -- http://localhost:3001
```

## Resultado

- Smoke base: OK
- Smoke extendido: OK
- Orden POS creada en smoke: `cmnb1nk9f000412le0bcgmg14`

## Estado de Fase 7

- EN PROGRESO
- Pendiente para cierre total:
  1. Publicar backend en Render con URL publica.
  2. Publicar frontend en Cloudflare Pages y ajustar `CORS_ORIGIN`/`apiUrl` final.
  3. Ejecutar smoke extendido contra URL publica y anexar evidencia final.

## Evidencia

- `docs general/baselines/2026-03-28/back_smoke_post_deploy_fase_7_iteracion_1.txt`
- `docs general/baselines/2026-03-28/back_smoke_post_deploy_fase_7_iteracion_2_full.txt`
