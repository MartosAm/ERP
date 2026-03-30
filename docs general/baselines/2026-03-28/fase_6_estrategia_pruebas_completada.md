# Fase 6 - Estrategia de Pruebas (Completada)

Fecha: 2026-03-28
Rama: `chore/plan-calidad-despliegue-temp`

## Objetivo de la fase

Proteger regresiones funcionales en flujos criticos de backend y frontend con pruebas operativas ejecutables y evidencia reproducible.

## Alcance ejecutado

### 1) Backend - smoke tests y gate de release

Cambios aplicados:

1. Se agrego suite de smoke de API sobre app completa:
   - `Back_ERP/src/__tests__/smoke.api.test.ts`
2. Se integraron scripts para flujo release:
   - `test:smoke`
   - `test:release` ahora ejecuta `test:core + test:security + test:smoke`

Cobertura smoke backend implementada:

- `GET /api/health`
- `GET /api/v1/productos` sin token -> `401`
- `POST /api/v1/auth/login` con payload invalido -> `400`
- `POST /api/v1/auth/registro-publico` sin idempotency key -> `400`
- `POST /api/v1/auth/login` con content-type invalido -> `415`
- Ruta inexistente -> `404`

Validacion backend:

```bash
npm run test:smoke
npm run test:release
npm run quality:gate
```

Resultado:

- Smoke: 1 suite / 6 tests en verde.
- Release tests: 12 suites / 186 tests en verde.
- Quality gate backend: OK (32 suites / 457 tests + build OK).

### 2) Frontend - cobertura en core (guards/interceptors/services)

Cambios aplicados:

Nuevas pruebas unitarias:

- `Front_ERP-1/src/app/core/guards/auth.guard.spec.ts`
- `Front_ERP-1/src/app/core/guards/role.guard.spec.ts`
- `Front_ERP-1/src/app/core/interceptors/auth.interceptor.spec.ts`
- `Front_ERP-1/src/app/core/interceptors/idempotency.interceptor.spec.ts`
- `Front_ERP-1/src/app/core/interceptors/error.interceptor.spec.ts`
- `Front_ERP-1/src/app/core/services/auth.service.spec.ts`
- `Front_ERP-1/src/app/core/services/token.service.spec.ts`
- `Front_ERP-1/src/app/core/services/api.service.spec.ts`

Validacion frontend:

```bash
npm run test -- --code-coverage
npm run ci
```

Resultado final:

- Tests frontend: 48 SUCCESS.
- Cobertura final:
  - Statements: 85.15%
  - Branches: 62.33%
  - Functions: 84.50%
  - Lines: 89.28%
- CI frontend: OK (`typecheck + test + build`).

## Estado de la fase

- Fase 6: COMPLETADA.
- Criterio de salida cumplido:
  1. Backend con smoke tests de endpoints criticos y gate release actualizado.
  2. Frontend con pruebas en core interceptors/guards/services y cobertura de lineas por encima del objetivo inicial (>= 60%).

## Evidencia

- `docs general/baselines/2026-03-28/back_test_release_post_fase_6_iteracion_1.txt`
- `docs general/baselines/2026-03-28/back_quality_gate_post_fase_6_iteracion_1.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_1.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_2.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_3.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_4.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_5.txt`
- `docs general/baselines/2026-03-28/front_coverage_fase_6_iteracion_6.txt`
- `docs general/baselines/2026-03-28/front_ci_post_fase_6_iteracion_1.txt`
- `docs general/baselines/2026-03-28/front_ci_post_fase_6_iteracion_5_cobertura.txt`
- `docs general/baselines/2026-03-28/front_ci_post_fase_6_iteracion_4_sin_warnings.txt`
