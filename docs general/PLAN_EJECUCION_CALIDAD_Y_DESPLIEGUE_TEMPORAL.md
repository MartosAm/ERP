# Plan de Ejecucion de Calidad y Despliegue Temporal

Fecha: 2026-03-28
Alcance: Back_ERP + Front_ERP-1
Tipo: Plan operativo para mejorar calidad de software y desplegar una demo temporal gratis

---

## 1) Objetivo

Ejecutar una estrategia solida para:

1. Corregir bloqueos tecnicos actuales.
2. Subir calidad de codigo (arquitectura, tipado, pruebas, protocolos).
3. Aplicar SOLID en puntos de mayor riesgo.
4. Publicar el sistema en un entorno temporal gratis para validacion funcional.

Resultado esperado:

- Front y Back con pipeline verde reproducible.
- Modulos criticos con deuda tecnica reducida.
- Despliegue temporal estable y auditable.

Estado de ejecucion (2026-03-28):

- Fase 0: COMPLETADA
- Fase 1: COMPLETADA
- Fase 2: COMPLETADA
- Fase 3: COMPLETADA
- Fase 4: COMPLETADA
- Fase 5: EN PROGRESO (iteracion 1 en `ordenes.service.ts`)
- Fase 6: PENDIENTE
- Fase 7: PENDIENTE

---

## 2) Diagnostico inicial (base de trabajo)

### 2.1 Backend

- Typecheck: OK.
- Quality gate: OK.
- Tests: 31 suites / 451 tests en verde.
- Buen uso de transacciones en modulos criticos (`ordenes`, `compras`, `inventario`).
- Middleware de idempotencia activo para endpoints mutables clave.

Riesgos actuales:

- Servicios muy grandes en `ordenes`, `reportes` y `auth` (riesgo SRP/mantenibilidad).
- Uso de `as any` en algunos controllers/services.
- Modelo de auditoria existe en Prisma, pero falta uso sistematico en servicios.

### 2.2 Frontend

- Typecheck: OK.
- Unit tests base: OK (suite inicial).
- Build de produccion: con fallos en estilos por uso de `@apply` en componentes.
- Incompatibilidad de versiones Angular core 19 vs Material/CDK 17.

Riesgos actuales:

- Riesgo de build no deterministico.
- Riesgo de regresion visual por ajustes rapidos en estilos.
- Cobertura unitaria aun baja frente al numero de componentes.

---

## 3) Principios de calidad de software (reglas del plan)

1. Cambios pequenos, trazables y reversibles.
2. Un objetivo tecnico por PR.
3. Definition of Done obligatoria por fase.
4. Ningun merge sin typecheck + tests + build.
5. Seguridad primero: secretos fuera de git, CORS/JWT correctos, minima exposicion.
6. Observabilidad minima: healthcheck, logs estructurados, smoke tests post deploy.

---

## 4) Estrategia por fases (paso a paso)

## Fase 0 - Baseline y control de cambios

Objetivo:

- Congelar estado actual y crear base de comparacion.

Acciones:

1. Crear rama: `chore/plan-calidad-despliegue-temp`.
2. Registrar baseline:
   - `Back_ERP`: `npm run quality:gate`.
   - `Front_ERP-1`: `npm run ci` (capturar salida, hoy falla en build).
3. Guardar resultados en reporte de ejecucion.

Criterio de salida:

- Baseline documentado y reproducible.

---

## Fase 1 - Estabilizar Front para produccion

Objetivo:

- Dejar `Front_ERP-1` con build de produccion exitoso.

Acciones:

1. Corregir errores de Tailwind v4 en CSS de componentes:
   - Evitar `@apply` en clases que no resuelven en ese contexto.
   - Opcion recomendada: mover utilidades al template HTML y dejar CSS local para reglas propias.
2. Corregir import faltante para `mat-divider` en header.
3. Ejecutar:
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`

Criterio de salida:

- `npm run ci` en Front pasa completo sin errores.

---

## Fase 2 - Normalizar dependencias Angular

Objetivo:

- Eliminar incompatibilidades de peers y asegurar instalacion limpia.

Acciones:

1. Alinear versiones de `@angular/material` y `@angular/cdk` con Angular 19.
2. Reinstalar dependencias sin usar `--legacy-peer-deps`.
3. Validar `npm ls` sin paquetes invalid.

Criterio de salida:

- `npm install` limpio y arbol de dependencias consistente.

---

## Fase 3 - Refactor SOLID en backend critico

Objetivo:

- Reducir complejidad y acoplamiento en servicios grandes.

Prioridad de modulos:

1. `ordenes.service.ts`
2. `auth.service.ts`
3. `reportes.service.ts`

Acciones:

1. Separar casos de uso por responsabilidad:
   - validacion de pagos
   - validacion de credito
   - validacion de stock
   - persistencia transaccional
2. Extraer funciones puras reutilizables para eliminar duplicacion.
3. Mantener contrato publico sin romper API.

Criterio de salida:

- Menor complejidad ciclomatica.
- Metodos mas pequenos y testeables.
- Sin cambios funcionales no planeados.

---

## Fase 4 - Auditoria operativa real

Objetivo:

- Registrar eventos criticos de negocio de forma consistente.

Acciones:

1. Implementar escritura en `RegistroAuditoria` para:
   - crear/confirmar/cancelar/devolver orden
   - ajustes y traslados de inventario
   - recepcion de compras
2. Definir helper comun para auditoria (accion, actor, entidad, snapshot, timestamp).
3. Validar que el registro sea append-only.

Criterio de salida:

- Cada flujo critico deja evidencia de auditoria consultable.

---

## Fase 5 - Endurecer tipado (eliminar `any` en runtime)

Objetivo:

- Subir seguridad de tipos en rutas de produccion.

Acciones:

1. Reemplazar `req.query as any` por DTOs validados y tipados.
2. Reemplazar `meta as any` por tipo explicito de respuesta paginada.
3. Limitar `any` en tests a casos de mocking no evitables.

Criterio de salida:

- Cero `any` en controllers/services de runtime.

---

## Fase 6 - Estrategia de pruebas (uso practico)

Objetivo:

- Proteger regresiones funcionales en modulos de negocio.

Backend:

1. Mantener `quality:gate` como release gate.
2. Agregar pruebas para auditoria recien implementada.
3. Agregar smoke tests de endpoints criticos.

Frontend:

1. Subir cobertura en orden:
   - core interceptors/guards
   - servicios API principales
   - POS (`pos`, `cobrar-dialog`, `ticket-dialog`)
2. Definir objetivo inicial de cobertura: 60% lineas criticas.

Criterio de salida:

- Pruebas cubren flujos de mayor riesgo funcional.

---

## Fase 7 - Despliegue temporal gratis (recomendado)

Arquitectura recomendada:

- Front: Cloudflare Pages (gratis)
- API: Render Web Service (free tier)
- PostgreSQL: Neon (free tier)
- Redis opcional: Upstash (free tier)

### 7.1 Backend en Render

1. Crear servicio apuntando a `Back_ERP`.
2. Build command:

```bash
npm ci && npx prisma generate && npm run build
```

3. Start command:

```bash
npx prisma migrate deploy && node dist/server.js
```

4. Variables minimas:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `NODE_ENV=production`
- `PORT=3001`
- `CORS_ORIGIN` (URL real del front)
- `TRUST_PROXY=1` o `2` segun infraestructura
- `REDIS_URL` (si se usa)

### 7.2 Front en Cloudflare Pages

1. Crear proyecto apuntando a `Front_ERP-1`.
2. Build command:

```bash
npm ci && npm run build
```

3. Output directory:

```bash
dist/front-erp/browser
```

4. Ajustar API de produccion:

- Si front y api quedan en dominios distintos, actualizar `environment.prod.ts` con URL completa de API.
- Si comparten dominio con proxy `/api`, se puede mantener `'/api/v1'`.

### 7.3 Smoke tests post deploy

1. `GET /api/health` responde 200.
2. Login y refresh de sesion.
3. Listado de productos con paginacion.
4. Flujo POS minimo (crear orden).
5. Confirmar logs y headers de seguridad.

Criterio de salida:

- Demo funcional online con monitoreo basico.

---

## 5) Protocolos en uso practico

## 5.1 API y seguridad

- JWT stateful (sesion activa en BD).
- CORS estricto con origen explicito.
- Rate limit por tipo de endpoint.
- Idempotencia en operaciones mutables de alto impacto.
- Transacciones ACID en flujos de inventario/ventas.

## 5.2 Operacion y release

- Release gate obligatorio:
  - Back: `npm run quality:gate`
  - Front: `npm run ci`
- No release si alguno falla.
- Migraciones solo con `prisma migrate deploy`.

---

## 6) Matriz de riesgos y mitigacion

1. Riesgo: Front no compila en produccion.
- Mitigacion: Fase 1 completa antes de despliegue.

2. Riesgo: Dependencias incompatibles rompen instalacion.
- Mitigacion: Fase 2 + lockfile limpio.

3. Riesgo: Falta de trazabilidad operativa.
- Mitigacion: Fase 4 con auditoria en eventos criticos.

4. Riesgo: Regresiones de negocio.
- Mitigacion: Fase 6 con pruebas de modulos criticos.

5. Riesgo: Caida del servicio gratis por sleep o limites.
- Mitigacion: usar entorno temporal solo para demo/QA, no produccion final.

---

## 7) Cronograma sugerido

Semana 1:

- Fase 0, 1 y 2.
- Entregable: pipeline Front y Back en verde.

Semana 2:

- Fase 3, 4 y 5.
- Entregable: mejora de arquitectura, tipado y auditoria.

Semana 3 (2-3 dias):

- Fase 6 y 7.
- Entregable: despliegue temporal online + checklist de smoke tests.

---

## 8) Checklist final (Definition of Done)

- [ ] Back quality gate verde.
- [ ] Front CI verde (typecheck + test + build).
- [ ] Dependencias Angular alineadas.
- [ ] Auditoria operativa activa en flujos criticos.
- [ ] Reduccion de `any` en runtime.
- [ ] Cobertura unitaria incrementada en modulos clave.
- [ ] Demo temporal desplegada y validada con smoke tests.

---

## 9) Comandos de referencia

Backend:

```bash
cd Back_ERP
npm run quality:gate
npm run test:release
npm run build
```

Frontend:

```bash
cd Front_ERP-1
npm run ci
npm run test
npm run build
```

---

Este plan prioriza estabilidad, trazabilidad y velocidad de entrega sin sacrificar calidad tecnica.
