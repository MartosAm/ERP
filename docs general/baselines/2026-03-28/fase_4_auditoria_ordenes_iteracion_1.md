# Fase 4 - Auditoria Operativa Real (Iteracion 1)

Fecha: 2026-03-28
Rama: `chore/plan-calidad-despliegue-temp`

## Objetivo de la iteracion

Iniciar registro de auditoria append-only en los flujos criticos de ordenes usando un helper comun reutilizable.

## Cambios implementados

### 1) Helper comun de auditoria

Archivo:

- `Back_ERP/src/compartido/auditoria.ts`

Contenido clave:

- `registrarAuditoria(...)` para escritura estandarizada en `RegistroAuditoria`.
- Contrato explicito con `accion`, `entidad`, `entidadId`, `valoresAnteriores`, `valoresNuevos`.

### 2) Integracion en ordenes

Archivo:

- `Back_ERP/src/modulos/ordenes/ordenes.service.ts`

Eventos auditados:

1. `CREAR_ORDEN`
2. `CANCELAR_ORDEN`
3. `CONFIRMAR_COTIZACION`
4. `DEVOLUCION_TOTAL_ORDEN`
5. `DEVOLUCION_PARCIAL_ORDEN`

Caracteristicas:

- Registro dentro de la transaccion del flujo para mantener consistencia.
- Uso de snapshots en `valoresAnteriores` y `valoresNuevos`.
- Sin operaciones `UPDATE`/`DELETE` sobre tabla de auditoria (append-only).

### 3) Ajustes de pruebas

Archivo:

- `Back_ERP/src/modulos/ordenes/ordenes.service.test.ts`

Cambios:

- Se agrega mock de `registroAuditoria.create` en transacciones.
- Se agregan asserts en happy path para verificar que se registra auditoria.

## Validaciones ejecutadas

### 1) Suite de ordenes

Comando:

```bash
npm run test -- src/modulos/ordenes/ordenes.service.test.ts
```

Resultado:

- 1 suite en verde
- 49 tests en verde

### 2) Typecheck backend

Comando:

```bash
npm run typecheck
```

Resultado: OK

### 3) Quality gate backend post iteracion

Comando:

```bash
npm run quality:gate
```

Resultado:

- Typecheck: OK
- Tests: 31 suites / 451 tests en verde
- Build: OK
- Quality gate: OK

Evidencia:

- `docs general/baselines/2026-03-28/back_quality_gate_post_fase_4_iteracion_1.txt`

## Estado de Fase 4

- Fase 4: EN PROGRESO.
- Iteracion 1 completada en `ordenes`.
- Siguiente iteracion recomendada:
  1. Integrar auditoria en `inventario` (ajustes y traslados).
  2. Integrar auditoria en `compras` (recepcion de compras).
