# Baseline de Calidad - 2026-03-28

Rama de trabajo: `chore/plan-calidad-despliegue-temp`

## Paso 1 - Rama de ejecucion

Estado: OK

Comando aplicado:

```bash
git checkout -b chore/plan-calidad-despliegue-temp
```

## Paso 2 - Baseline tecnico

### Backend (`Back_ERP`)

Estado: OK

Comando:

```bash
npm run quality:gate
```

Resultado:

- `EXIT_CODE=0`
- Quality gate: OK
- 31 suites / 451 tests en verde

Evidencia completa:

- `docs general/baselines/2026-03-28/back_quality_gate.txt`

### Frontend (`Front_ERP-1`)

Estado: FALLA CONTROLADA (esperada por diagnostico previo)

Comando:

```bash
npm run ci
```

Resultado:

- `EXIT_CODE=1`
- `typecheck`: OK
- `test`: OK
- `build`: FALLA

Errores principales detectados:

1. Tailwind CSS en component styles (`@apply` con utilidades no resueltas en varios dialogs).
2. Falta de import para `mat-divider` en `header.component.ts`.

Evidencia completa:

- `docs general/baselines/2026-03-28/front_ci.txt`

## Paso 3 - Fase 1 ejecutada (estabilizar build Front)

Estado: OK

Acciones aplicadas:

1. Se reemplazaron bloques `@apply` conflictivos por CSS estandar en dialogs de modulos criticos.
2. Se corrigio import faltante para `mat-divider` en `header.component.ts`.

Validacion ejecutada:

```bash
npm run ci
```

Resultado:

- `EXIT_CODE=0`
- `typecheck`: OK
- `test`: OK
- `build`: OK

Evidencia completa:

- `docs general/baselines/2026-03-28/front_ci_post_fix_fase_1_2.txt`

## Paso 4 - Fase 2 ejecutada (normalizacion de dependencias Angular)

Estado: OK

Acciones aplicadas:

1. Se alinearon `@angular/material` y `@angular/cdk` a `19.2.19`.
2. Se reinstalaron dependencias sin `--legacy-peer-deps`.
3. Se valido arbol de dependencias sin peers invalidos.

Validacion ejecutada:

```bash
npm install
npm ls @angular/material @angular/cdk
npm run ci
```

Resultado:

- Instalacion limpia y consistente.
- CI de frontend en verde.

## Paso 5 - Fase 3 completada (refactor SOLID backend critico)

Estado: OK (completada)

Iteraciones ejecutadas:

1. `ordenes.service.ts`:
	- Extraccion de helpers para pagos, credito y numeracion secuencial.
	- Reduccion de duplicacion en `crear`, `crearCotizacion`, `confirmarCotizacion`, `cancelar` y `devolver`.
2. `auth.service.ts`:
	- Extraccion de helpers para validacion de correo, hash de secretos, creacion de sesion/JWT y armado de respuesta auth.
	- Reduccion de duplicacion en `registrar`, `registroPublico`, `login` y `cambiarPin`.
3. `reportes.service.ts`:
	- Extraccion de helpers para cache, rango de fechas y calculo de porcentajes.
	- Reduccion de repeticion transversal en dashboard, ventas, top productos, metodos de pago, cajeros y entregas.

Validacion ejecutada:

```bash
npm run test -- src/modulos/ordenes/ordenes.service.test.ts src/modulos/auth/auth.service.test.ts src/modulos/reportes/reportes.service.test.ts
npm run quality:gate
```

Resultado:

- Suites refactorizadas: 3/3 en verde, 88 tests en verde.
- Quality gate backend: OK (31 suites / 451 tests + build OK).

Evidencia completa:

- `docs general/baselines/2026-03-28/fase_3_refactor_ordenes_parcial.md`
- `docs general/baselines/2026-03-28/fase_3_refactor_backend_completada.md`
- `docs general/baselines/2026-03-28/back_tests_refactor_fase_3.txt`
- `docs general/baselines/2026-03-28/back_quality_gate_post_fase_3.txt`

## Paso 6 - Fase 4 completada (auditoria operativa real)

Estado: OK (completada)

Iteraciones ejecutadas:

1. Iteracion 1 (ordenes):
	- Integracion de auditoria append-only en `CREAR_ORDEN`, `CANCELAR_ORDEN`, `CONFIRMAR_COTIZACION`, `DEVOLUCION_TOTAL_ORDEN` y `DEVOLUCION_PARCIAL_ORDEN`.
2. Iteracion 2 (inventario y compras):
	- Integracion de auditoria append-only en `ENTRADA_INVENTARIO`, `SALIDA_INVENTARIO`, `AJUSTE_INVENTARIO` y `TRASLADO_INVENTARIO`.
	- Integracion de auditoria append-only en `RECIBIR_COMPRA`.
3. Consolidacion del helper comun:
	- `Back_ERP/src/compartido/auditoria.ts`.

Validacion ejecutada:

```bash
npm run test -- src/modulos/ordenes/ordenes.service.test.ts src/modulos/inventario/inventario.service.test.ts src/modulos/compras/compras.service.test.ts
npm run quality:gate
```

Resultado:

- Suites de auditoria: 3/3 en verde, 87 tests en verde.
- quality gate backend: OK (31 suites / 451 tests + build OK).

Evidencia completa:

- `docs general/baselines/2026-03-28/fase_4_auditoria_ordenes_iteracion_1.md`
- `docs general/baselines/2026-03-28/fase_4_auditoria_backend_completada.md`
- `docs general/baselines/2026-03-28/back_tests_auditoria_fase_4_iteracion_2.txt`
- `docs general/baselines/2026-03-28/back_quality_gate_post_fase_4_iteracion_2.txt`

## Paso 7 - Fase 5 en progreso (iteracion 1: tipado runtime en ordenes)

Estado: OK (parcial)

Acciones aplicadas:

1. Eliminacion de `as any` en `Back_ERP/src/modulos/ordenes/ordenes.service.ts`.
2. Reemplazo por tipos Prisma concretos (`MetodoPago`, `EstadoOrden`, `Prisma.DateTimeFilter`).
3. Verificacion de 0 ocurrencias de `as any` en servicio de ordenes.

Validacion ejecutada:

```bash
npm run test -- src/modulos/ordenes/ordenes.service.test.ts src/modulos/inventario/inventario.service.test.ts src/modulos/compras/compras.service.test.ts
npm run quality:gate
```

Resultado:

- Suites focalizadas: 3/3 en verde, 87 tests en verde.
- quality gate backend: OK (31 suites / 451 tests + build OK).

Evidencia completa:

- `docs general/baselines/2026-03-28/fase_5_tipado_runtime_iteracion_1.md`
- `docs general/baselines/2026-03-28/back_tests_tipado_fase_5_iteracion_1.txt`
- `docs general/baselines/2026-03-28/back_quality_gate_post_fase_5_iteracion_1.txt`

## Conclusiones operativas

1. Los pasos 1 y 2 (baseline) quedaron ejecutados y documentados.
2. Fase 1 y Fase 2 quedaron ejecutadas con evidencia verificable.
3. Fase 3 quedo completada en los tres modulos criticos (`ordenes`, `auth`, `reportes`) sin regresiones.
4. Fase 4 quedo completada con auditoria operativa en ordenes, inventario y compras.
5. Fase 5 inicio correctamente en modulo critico de ordenes y mantiene calidad global en verde.
6. Siguiente prioridad tecnica: continuar Fase 5 en controllers/services runtime restantes.
