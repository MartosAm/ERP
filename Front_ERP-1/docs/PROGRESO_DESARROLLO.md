# Progreso de Desarrollo — Front ERP

> Documento de seguimiento del avance por fases según la [GUIA_DESARROLLO.md](../GUIA_DESARROLLO.md).
> Última actualización: 28 de febrero de 2026.

---

## Resumen general

| Fase | Nombre | Estado | Progreso |
|------|--------|--------|----------|
| **1** | shared/ Infrastructure | ✅ Completada | 12/12 piezas |
| **2** | Módulos CRUD simples | ✅ Completada | 5/5 módulos |
| **3** | Módulos transaccionales | ✅ Completada | 5/5 módulos |
| **4** | POS (Punto de Venta) | ✅ Completada | 4/4 componentes |
| **5** | Administración | ✅ Completada | 3/3 módulos |
| **6** | Pulido y producción | ❌ Pendiente | 0/8 tareas |

---

## Fase 1 — shared/ Infrastructure ✅

> Commit: `ebe51b3d` — "feat(front): fase 1 — componentes shared reutilizables"

### Componentes creados (6)

| # | Componente | Archivo | Descripción |
|---|-----------|---------|-------------|
| 1.1 | `ConfirmDialogComponent` | `shared/components/confirm-dialog/` | Diálogo genérico de confirmación con título, mensaje, textos y color configurables |
| 1.2 | `PageHeaderComponent` | `shared/components/page-header/` | Encabezado de página (título, subtítulo, icono, slot para botones vía `<ng-content>`) |
| 1.3 | `EmptyStateComponent` | `shared/components/empty-state/` | Estado vacío con icono, mensaje, submensaje y botón de acción opcional |
| 1.4 | `EstadoBadgeComponent` | `shared/components/estado-badge/` | Badge coloreado para estados. Tipos: orden, entrega, activo, movimiento, compra, turno, pago |
| 1.5 | `SearchInputComponent` | `shared/components/search-input/` | Input con debounce (300ms), botón clear, emit `(buscar)` |
| 1.6 | `FormDialogComponent` | `shared/components/form-dialog/` | Wrapper de diálogo CRUD con header, body scrollable, footer con `<ng-content select="[acciones]">` |

### Pipes creados (5)

| # | Pipe | Selector | Ejemplo |
|---|------|----------|---------|
| 1.7 | `MonedaPipe` | `moneda` | `{{ 1234.5 \| moneda }}` → `$1,234.50` |
| 1.8 | `FechaCortaPipe` | `fechaCorta` | `{{ iso \| fechaCorta }}` → `28/02/2026` |
| 1.8b | `FechaHoraPipe` | `fechaHora` | `{{ iso \| fechaHora }}` → `28/02/2026 14:30` |
| 1.9 | `TiempoRelativoPipe` | `tiempoRelativo` | `{{ iso \| tiempoRelativo }}` → `Hace 5 min` |
| 1.10b | `EnumLabelPipe` | `enumLabel` | `{{ 'TARJETA_CREDITO' \| enumLabel }}` → `Tarjeta crédito` |

### Directiva creada (1)

| # | Directiva | Selector | Ejemplo |
|---|-----------|----------|---------|
| 1.10 | `RolDirective` | `*appRol` | `*appRol="'ADMIN'"` o `*appRol="['ADMIN','CAJERO']"` |

---

## Fase 2 — Módulos CRUD simples ✅

> Commit: `a240a3f4` — "feat(front): fase 2 — módulos CRUD catálogos"

### Módulos completados

| # | Módulo | Archivos | Funcionalidades |
|---|--------|----------|-----------------|
| 2.1 | **Categorías** | 6 archivos (list + form-dialog × ts/html/css) | Listado paginado, búsqueda, crear/editar vía MatDialog, eliminar con confirmación |
| 2.2 | **Proveedores** | 6 archivos | CRUD estándar completo con búsqueda, MatDialog crear/editar, eliminar |
| 2.3 | **Almacenes** | 6 archivos | CRUD con toggle principal, MatDialog crear/editar, eliminar |
| 2.4 | **Productos** (upgrade) | Upgraded a CRUD completo | Diálogo crear/editar con campos completos (SKU, categoría, proveedor, precios 1/2/3, impuesto, inventario), filtros avanzados |
| 2.5 | **Clientes** (upgrade) | Upgraded a CRUD completo | Diálogo crear/editar (nombre, teléfono, email, dirección, RFC, crédito), vista detalle |

### Rutas agregadas

- `/categorias`, `/proveedores` (ADMIN), `/almacenes` (ADMIN)
- Rutas de detalle: `/productos/:id`, `/clientes/:id`

### Sidebar actualizado

- Categorías, Proveedores (ADMIN), Almacenes (ADMIN)

---

## Fase 3 — Módulos transaccionales ✅

> Commit: `632402b8` — "feat(front): fase 3 — módulos transaccionales completos"

### Módulos completados

| # | Módulo | Componentes | Funcionalidades clave |
|---|--------|------------|----------------------|
| 3.1 | **Órdenes** | `ordenes` (list), `orden-detalle`, `cancelar-orden-dialog`, `devolucion-dialog` | Filtros por estado (MatChips: COTIZACION→DEVUELTA), rango de fechas con MatDatepicker, búsqueda. Detalle con productos, pagos, entrega. Cancelar con motivo. Devolución parcial/total con selección de productos y cantidades |
| 3.2 | **Compras** | `compras` (list), `compra-detalle`, `compra-form-dialog` | Filtro por proveedor (MatSelect), filtro recibida/pendiente. Detalle con "recibir mercancía" (selección de almacén + confirmación). Formulario de nueva compra con líneas dinámicas de productos |
| 3.3 | **Inventario** (upgrade) | `inventario` (tabs), `ajuste-dialog`, `traslado-dialog` | Tabs: Existencias (tabla con stock bajo highlight) / Movimientos (tabla con tipo, cantidades anterior/posterior). Diálogo ajuste manual. Diálogo traslado entre almacenes (origen ≠ destino validado) |
| 3.4 | **Entregas** | `entregas` (list), `entrega-detalle` | Filtros por estado con MatChips incluyendo "PENDIENTES" virtual. Detalle con transiciones de estado dinámicas: ASIGNADO→EN_RUTA, EN_RUTA→ENTREGADO/NO_ENTREGADO/REPROGRAMADO, etc. Formulario dinámico con motivo/fecha/notas según acción |
| 3.5 | **Turnos de Caja** | `turnos-caja` (list), `turno-detalle`, `abrir-turno-dialog`, `cerrar-turno-dialog` | Banner de turno activo. List con filtro abierto/cerrado. Detalle con montos (apertura, esperado, cierre, diferencia con color coding). Abrir turno (caja + monto apertura). Cerrar turno (monto cierre + notas) |

### Fixes aplicados

- **inventario.service.ts**: Corregido `AJUSTE_MANUAL` → `AJUSTE` (coincide con enum backend Zod). Corregido traslado para mapear `almacenOrigenId` → `almacenId`
- **estado-badge.component.ts**: Agregados 3 nuevos tipos de badge: `compra` (Recibida/Pendiente), `turno` (Abierto/Cerrado), `pago` (6 métodos de pago)

### Rutas agregadas

- `/ordenes`, `/ordenes/:id`
- `/compras` (ADMIN), `/compras/:id` (ADMIN)
- `/entregas`, `/entregas/:id`
- `/turnos-caja` (ADMIN + CAJERO), `/turnos-caja/:id` (ADMIN + CAJERO)

### Sidebar actualizado

- Órdenes, Compras (ADMIN), Entregas, Turnos de Caja (ADMIN + CAJERO)

---

## Fase 4 — POS (Punto de Venta) ✅

> Commit: `9b0f0d08` — "feat(front): fase 4 — módulo POS punto de venta completo"

### Componentes

| # | Componente | Archivos | Descripción |
|---|-----------|---------|-------------|
| 4.1 | **PosComponent** | ts + html + css | Pantalla completa con grid de productos y panel de carrito. Búsqueda por código de barras/SKU (Enter), categorías con chips horizontales, grid de productos con cards, carrito con controles de cantidad/descuento/eliminar, selector de lista de precios (1/2/3), computed de totales (subtotal, descuento, impuesto, total). Atajos: F2=cobrar, F4=buscar, Esc=limpiar. Verificación de turno de caja activo |
| 4.2 | **CobrarDialogComponent** | ts + html + css | Diálogo de cobro. Pago único (método + monto + referencia, atajos de billetes $50-$1000, monto exacto) y pago mixto (FormArray dinámico). Cálculo de cambio y faltante en tiempo real. Crédito cliente solo si hay clienteId |
| 4.3 | **ClienteDialogComponent** | ts + html + css | Búsqueda de clientes con debounce (300ms). Listado con nombre, RFC, teléfono. Selección por click |
| 4.4 | **TicketDialogComponent** | ts + html + css | Recibo post-venta con número de orden, fecha, cliente, detalle de líneas, totales, pagos y cambio. Botón "Nueva venta" |

### Características técnicas

- Layout CSS Grid custom (productos | 380px carrito), sin page-container
- Estado del carrito con signals y computed (sin FormArray)
- Validación de stock al agregar productos
- Soporte multi-pago (pago mixto) con FormArray
- Responsive: @1024px carrito=320px, @768px stacked
- Barcode scanning via `buscarPorCodigo()` + ProductosService

---

## Fase 5 — Administración ✅

> Commit: `f0272020` — "feat(front): fase 5 — módulos administración completos"

### Módulos completados

| # | Módulo | Componentes | Funcionalidades clave |
|---|--------|------------|----------------------|
| 5.1 | **Usuarios** | `usuarios` (list), `usuario-form-dialog`, `usuario-registro-dialog`, `horario-dialog` | Listado paginado con filtros por rol (chips) y estado. Búsqueda por nombre/correo. Registro de nuevos usuarios. Editar datos básicos. Asignar horario laboral (hora inicio/fin + días). Activar/desactivar con confirmación. Cerrar sesiones activas. Avatar con inicial, badge de rol |
| 5.2 | **Reportes** (upgrade) | `reportes` (tabs + charts) | 6 tabs: Ventas, Top productos, Métodos de pago, Inventario, Cajeros, Entregas. Date range picker. Gráficas Chart.js (bar, doughnut, pie). KPIs de ventas. Tablas top 10 productos, inventario valorizado por almacén/categoría, rendimiento por repartidor |
| 5.3 | **Configuración** (upgrade) | `configuracion` (tabs) | Tab Perfil: datos del usuario actual (info personal, empresa, moneda, impuesto, horario, días laborales). Tab Seguridad (solo ADMIN): cambiar PIN de cualquier usuario con confirmación |

### Infraestructura agregada

- `CambiarPinDto` agregado a `api.model.ts`
- `obtenerPerfil()`, `cambiarPin()`, `registrar()` en `auth.service.ts`
- Ruta `/usuarios` con `roleGuard('ADMIN')`
- Item "Usuarios" agregado al sidebar
- Fix `FiltroFechas` spread en `reportes.service.ts`

---

## Fase 6 — Pulido y producción ❌

| Tarea | Estado |
|-------|--------|
| Responsive (mobile/tablet/desktop) | ❌ |
| Dark mode | ❌ |
| Impresión (tickets, reportes) | ❌ |
| PWA (manifest, service worker) | ❌ |
| Performance (lazy images, virtual scroll) | ❌ |
| A11y (ARIA, focus trap, contraste WCAG AA) | ❌ |
| Build producción (tree-shaking, CSP, Docker) | ❌ |
| Bundle budgets optimización | ❌ |

---

## Infraestructura completada (pre-fases)

| Componente | Estado |
|-----------|--------|
| `api.model.ts` (968 líneas, 55 endpoints tipados) | ✅ |
| 18 servicios core | ✅ |
| 3 utilidades (fecha, formato, tabla) | ✅ |
| Guards (auth + role) | ✅ |
| Interceptors (auth + error) | ✅ |
| Layout (shell + header + sidebar) | ✅ |
| Login + Dashboard | ✅ |
| Tailwind v4 configuración CSS-first | ✅ |
| Seguridad (CSP, XSS, auto-logout, token en memoria) | ✅ |

---

## Historial de commits

| Commit | Fase | Descripción |
|--------|------|-------------|
| `ebe51b3d` | 1 | shared/ — 6 componentes, 5 pipes, 1 directiva |
| `a240a3f4` | 2 | CRUD — categorías, proveedores, almacenes, productos upgrade, clientes upgrade |
| `632402b8` | 3 | Transaccionales — órdenes, compras, inventario, entregas, turnos-caja |
| `9b0f0d08` | 4 | POS — punto de venta completo con cobro, cliente, ticket |
| `f0272020` | 5 | Administración — usuarios, reportes con Chart.js, configuración |
| — | 6 | Pulido y producción (pendiente) |
