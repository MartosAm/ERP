# Reporte de Cobertura de Tests — ERP POS Backend

> Generado: 11 de marzo de 2026
> Framework: Jest 30.1.3 + ts-jest
> Total: **24 suites, 362 tests, 0 fallos**

---

## Resumen Global

| Métrica | Valor | Objetivo recomendado |
|---------|-------|---------------------|
| **Statements** | 68.71% | > 80% |
| **Branches** | 58.02% | > 75% |
| **Functions** | 68.00% | > 80% |
| **Lines** | 70.87% | > 80% |

---

## Cobertura por Módulo

### Servicios (lógica de negocio)

| Módulo | Stmts | Branch | Funcs | Lines | Estado | Tests |
|--------|-------|--------|-------|-------|--------|-------|
| productos.service.ts | 93.1% | 79.7% | 100% | 97.6% | ✅ Excelente | 15 |
| clientes.service.ts | 93.9% | 86.4% | 100% | 95.7% | ✅ Excelente | 13 |
| proveedores.service.ts | 94.4% | 84.6% | 100% | 96.2% | ✅ Excelente | 11 |
| reportes.service.ts | 94.8% | 52.9% | 100% | 100% | ✅ Líneas excelente | 13 |
| entregas.service.ts | 91.2% | 90.0% | 80% | 92.5% | ✅ Muy bueno | 14 |
| almacenes.service.ts | 89.9% | 77.3% | 100% | 95.3% | ✅ Muy bueno | 13 |
| usuarios.service.ts | 85.5% | 72.5% | 85.7% | 86.8% | ✅ Bueno | 16 |
| turnos-caja.service.ts | 86.4% | 65.8% | 83.3% | 87.7% | ✅ Bueno | 13 |
| categorias.service.ts | 81.9% | 72.9% | 100% | 88.2% | ✅ Bueno | 14 |
| auth.service.ts | 69.1% | 59.7% | 63.6% | 68.8% | ⚠️ Mejorable | 20 |
| compras.service.ts | 63.1% | 53.3% | 75% | 63.4% | ⚠️ Bajo | 12 |
| inventario.service.ts | 50.0% | 34.6% | 66.7% | 54.8% | 🔴 Insuficiente | 10 |
| ordenes.service.ts | 50.3% | 36.9% | 53.8% | 50.5% | 🔴 Insuficiente | 18 |

### Schemas Zod (validación de DTOs)

| Módulo | Stmts | Branch | Lines | Tests |
|--------|-------|--------|-------|-------|
| auth.schema.ts | 100% | 100% | 100% | 24 |
| entregas.schema.ts | 100% | 100% | 100% | 16 |
| inventario.schema.ts | 100% | 100% | 100% | 18 |
| ordenes.schema.ts | 100% | 100% | 100% | 25 |
| clientes.schema.ts | 83.3% | 100% | 83.3% | 14 |
| productos.schema.ts | 75% | 100% | 75% | 26 |
| almacenes.schema.ts | 0% | — | 0% | — |
| categorias.schema.ts | 0% | — | 0% | — |
| compras.schema.ts | 0% | — | 0% | — |
| proveedores.schema.ts | 0% | — | 0% | — |
| reportes.schema.ts | 0% | — | 0% | — |
| turnos-caja.schema.ts | 0% | — | 0% | — |
| usuarios.schema.ts | 0% | — | 0% | — |

### Middlewares

| Archivo | Stmts | Branch | Funcs | Lines | Tests |
|---------|-------|--------|-------|-------|-------|
| requerirRol.ts | 100% | 100% | 100% | 100% | 6 |
| validar.ts | 100% | 100% | 100% | 100% | 6 |
| manejarErrores.ts | 91.1% | 82.1% | 100% | 90.9% | 13 |
| autenticar.ts | 0% | 0% | 0% | 0% | — |
| seguridad.ts | 0% | 0% | 0% | 0% | — |
| limitarRates.ts | 0% | — | — | 0% | — |

### Compartido (utilidades)

| Archivo | Stmts | Branch | Funcs | Lines |
|---------|-------|--------|-------|-------|
| asyncHandler.ts | 100% | 100% | 100% | 100% |
| errores.ts | 100% | 33.3% | 100% | 100% |
| respuesta.ts | 66.7% | 40% | 50% | 66.7% |
| logger.ts | 70% | 40% | 0% | 70% |
| paginacion.ts | 0% | — | 0% | 0% |
| sanitizar.ts | 0% | 0% | 0% | 0% |

### Rutas (integración HTTP con supertest)

| Módulo | Tests | Cubre |
|--------|-------|-------|
| auth.routes.test.ts | 14 | Login, registro, logout, perfil, cambiar-pin + validación + roles |
| productos.routes.test.ts | 18 | CRUD completo + validación Zod + control de roles |

---

## Distribución de Tests por Tipo

| Tipo | Archivos | Tests | Porcentaje |
|------|----------|-------|------------|
| Service (lógica de negocio) | 13 | 182 | 50.3% |
| Schema (validación Zod) | 6 | 123 | 34.0% |
| Route (integración HTTP) | 2 | 32 | 8.8% |
| Middleware (infraestructura) | 3 | 25 | 6.9% |
| **Total** | **24** | **362** | **100%** |

---

## Análisis de Brechas

### Módulos con cobertura insuficiente (< 70% líneas)

#### 1. `ordenes.service.ts` — 50.5% líneas

**Funciones sin cobertura:**
- `crearDesdeVenta()` → Flujo completo de venta POS (líneas 176-349)
- `cancelar()` → Cancelación con reversión de stock (líneas 388-459)
- `devolver()` → Devolución parcial/total con cálculos (líneas 732-854)
- `confirmarCotizacion()` → Convertir cotización a venta (líneas 919-1024)

**Impacto:** CRÍTICO — Es el módulo más complejo y el corazón del POS.

**Tests faltantes recomendados:**
```
- crearDesdeVenta: con descuento, con crédito, sin stock, multi-item
- cancelar: orden ya cancelada, orden con entregas, reposición de stock
- devolver: parcial (1 de N items), total, cantidad > original
- confirmarCotizacion: stock insuficiente al confirmar, descuentos aplicados
```

#### 2. `inventario.service.ts` — 54.8% líneas

**Funciones sin cobertura:**
- `ajustarInventario()` → Ajustes manuales de stock (líneas 132-208)
- Flujo completo de transferencia entre almacenes (líneas 242-245)
- Lógica de auditoría de movimientos

**Tests faltantes recomendados:**
```
- ajustarInventario: incremento, decremento, por debajo de 0
- transferencia: entre almacenes, almacén origen sin stock
- movimientos: filtrado por tipo, por producto, por almacén
```

#### 3. `compras.service.ts` — 63.4% líneas

**Funciones sin cobertura:**
- `recibir()` → Recepción parcial de compra (líneas 167-244)
- Lógica de actualización de costos al recibir

**Tests faltantes recomendados:**
```
- recibir: parcial, completa, cantidades incorrectas, almacén inválido
- actualizar costos de producto al recibir
```

#### 4. `auth.service.ts` — 68.8% líneas

**Funciones sin cobertura:**
- `registroPublico()` → Auto-registro con creación de empresa (líneas 140-217)
- `obtenerPerfil()` → Consulta de perfil (línea 320)
- Flujo de verificación de horario laboral (líneas 426-459)
- Generación de token y sesión (líneas 522-533)

**Tests faltantes recomendados:**
```
- registroPublico: éxito con empresa nueva, email duplicado, empresa creada pero usuario falla (rollback)
- obtenerPerfil: usuario activo, usuario inactivo
- verificarHorario: dentro de horario, fuera de horario, día no laboral
```

### Schemas sin tests (7 módulos)

Los siguientes schemas no tienen tests dedicados:
1. `almacenes.schema.ts`
2. `categorias.schema.ts`
3. `compras.schema.ts`
4. `proveedores.schema.ts`
5. `reportes.schema.ts`
6. `turnos-caja.schema.ts`
7. `usuarios.schema.ts`

**Impacto:** Bajo-Medio — Los schemas que validan input del usuario deberían tener
tests explícitos para documentar reglas de negocio y prevenir regresiones.

### Middlewares sin tests

- `autenticar.ts` — Flujo JWT completo (firma, expiración, sesión BD, horario)
- `seguridad.ts` — Headers, Content-Type, Request-ID
- `limitarRates.ts` — Configuración de rate limiting

---

## Plan de Mejora de Cobertura

### Fase 1 — Prioridad CRÍTICA (subir a 80% global)

| Acción | Impacto en cobertura | Esfuerzo |
|--------|---------------------|----------|
| Tests para `ordenes.service.ts` (crear/cancelar/devolver) | +8-10% global | Alto |
| Tests para `inventario.service.ts` (ajustar/transferir) | +3-4% global | Medio |
| Tests para `compras.service.ts` (recibir completo) | +2-3% global | Medio |
| Tests para `auth.service.ts` (registroPublico/perfil) | +2-3% global | Medio |

### Fase 2 — Schemas y middlewares restantes

| Acción | Impacto | Esfuerzo |
|--------|---------|----------|
| 7 archivos de schema tests | +3% global | Bajo |
| Test de `autenticar.ts` middleware | +2% global | Medio |
| Test de `sanitizar.ts` | +1% global | Bajo |
| Test de `paginacion.ts` | +1% global | Bajo |

### Fase 3 — Tests de integración y E2E

| Acción | Valor | Esfuerzo |
|--------|-------|----------|
| Rutas CRUD para los 11 módulos restantes | Validar stack completo | Alto |
| Tests E2E flujo POS completo | Máxima confianza | Alto |
| Test de carga con k6/artillery | Validar rendimiento | Medio |

### Objetivo por milestone

| Milestone | Suites | Tests | Lines | Fecha objetivo |
|-----------|--------|-------|-------|---------------|
| **Actual** | 24 | 362 | 70.9% | ✅ Completado |
| **Fase 1** | ~28 | ~450 | > 80% | — |
| **Fase 2** | ~38 | ~550 | > 85% | — |
| **Fase 3** | ~45 | ~650 | > 90% | — |

---

## Cómo ejecutar tests

```bash
# Todos los tests
npx jest

# Con cobertura
npx jest --coverage

# Un módulo específico
npx jest --testPathPattern=ordenes

# Solo services
npx jest --testPathPattern=service

# Watch mode (desarrollo)
npx jest --watch
```
