# Guía de Desarrollo — Front ERP (Angular 17 + Tailwind CSS v4)

> Documento de referencia para el desarrollo completo del frontend del sistema ERP POS.
> Última actualización: 1 de marzo de 2026.
> Estado: **Todas las fases completadas (1–6). Proyecto en producción.**

---

## Índice

1. [Estado actual del proyecto](#1-estado-actual-del-proyecto)
2. [Arquitectura y estructura de carpetas](#2-arquitectura-y-estructura-de-carpetas)
3. [Plan de desarrollo por fases](#3-plan-de-desarrollo-por-fases)
4. [Componentes shared/ ✅ (referencia)](#4-componentes-shared--referencia)
5. [Módulos feature/ ✅ (referencia)](#5-módulos-feature--referencia)
6. [Convenciones de código Angular](#6-convenciones-de-código-angular)
7. [Guía de estilos con Tailwind CSS v4](#7-guía-de-estilos-con-tailwind-css-v4)
8. [Angular Material — convenciones de uso](#8-angular-material--convenciones-de-uso)
9. [Patrón CRUD estándar de un módulo](#9-patrón-crud-estándar-de-un-módulo)
10. [Manejo de estado y signals](#10-manejo-de-estado-y-signals)
11. [Seguridad y buenas prácticas](#11-seguridad-y-buenas-prácticas)
12. [Testing y calidad](#12-testing-y-calidad)
13. [Checklist de lanzamiento](#13-checklist-de-lanzamiento)

---

## 1. Estado actual del proyecto

### ✅ Proyecto completado — 6 fases finalizadas

| Capa | Detalle |
|------|---------|
| **Core / Models** | `api.model.ts` — 968+ líneas con **todas** las interfaces tipadas 1:1 con el backend (13 módulos, 55 endpoints) |
| **Core / Services** | 18 servicios singleton: `api`, `auth`, `token`, `notification`, `inactividad`, `dashboard`, `reportes`, `productos`, `categorias`, `clientes`, `ordenes`, `inventario`, `turnos`, `almacenes`, `compras`, `entregas`, `proveedores`, `usuarios` |
| **Core / Utils** | `fecha.utils.ts`, `formato.utils.ts`, `tabla.utils.ts` |
| **Core / Guards** | `authGuard` (funcional), `roleGuard` (factory funcional) |
| **Core / Interceptors** | `authInterceptor` (JWT Bearer), `errorInterceptor` (retry + manejo global) |
| **Layout** | `ShellComponent` (responsive sidenav + header + router-outlet), `HeaderComponent`, `SidebarComponent` |
| **shared/** | 6 componentes, 5 pipes, 1 directiva reutilizables |
| **features/** | 15 módulos completos (auth, dashboard, pos, productos, clientes, categorías, proveedores, almacenes, órdenes, compras, inventario, entregas, turnos-caja, usuarios, reportes, configuración) |
| **Tailwind v4** | Configuración CSS-first con `@theme` tokens, `@utility`, dark mode, responsive |
| **PWA** | Service worker, manifest, offline awareness |
| **Dark mode** | `prefers-color-scheme: dark` automático con 15+ overrides Material |
| **A11y** | Skip-nav, ARIA roles, focus-visible, cdkFocusInitial |
| **Docker** | Multi-stage Dockerfile + Nginx con gzip + security headers |
| **Seguridad** | CSP con worker-src, XSS protection, auto-logout (30 min), token en memoria |

### 📦 Dependencias instaladas

```
Angular 17.3 (standalone)    Tailwind CSS v4.2     Angular Material 17.3
@angular/service-worker      @tailwindcss/postcss   PostCSS 8.5
chart.js 4.4                 dayjs 1.11             @fontsource/roboto
material-icons               rxjs 7.8               zone.js 0.14
```

### 📋 Historial de commits

| Commit | Fase | Descripción |
|--------|------|-------------|
| `ebe51b3d` | 1 | shared/ — 6 componentes, 5 pipes, 1 directiva |
| `a240a3f4` | 2 | CRUD — categorías, proveedores, almacenes, productos upgrade, clientes upgrade |
| `632402b8` | 3 | Transaccionales — órdenes, compras, inventario, entregas, turnos-caja |
| `9b0f0d08` | 4 | POS — punto de venta completo con cobro, cliente, ticket |
| `f0272020` | 5 | Administración — usuarios, reportes con Chart.js, configuración |
| `f57350ec` | 6 | Pulido — PWA, dark mode, a11y, responsive, Docker producción |

---

## 2. Arquitectura y estructura de carpetas

```
src/app/
├── app.component.ts           ← Raíz (solo <router-outlet />)
├── app.config.ts              ← Providers globales (router, http, interceptors, APP_INITIALIZER)
├── app.routes.ts              ← Todas las rutas lazy-loaded
│
├── core/                      ← Singleton (providedIn: 'root')
│   ├── guards/                ← authGuard, roleGuard (funcionales)
│   ├── interceptors/          ← authInterceptor, errorInterceptor (funcionales)
│   ├── models/
│   │   └── api.model.ts       ← Interfaces + DTOs + Enums (968 líneas)
│   ├── services/              ← 18 servicios singleton
│   └── utils/                 ← Funciones puras (fecha, formato, tabla)
│
├── layout/                    ← Componentes de layout (shell, header, sidebar)
│   ├── shell.component.*      ← Layout wrapper (sidenav + header + content)
│   ├── header.component.*     ← Barra superior (toggle, turno, menú usuario)
│   └── sidebar.component.*    ← Navegación lateral
│
├── shared/                    ← Componentes/pipes/directivas reutilizables
│   ├── components/            ← ✅ 6 componentes (confirm-dialog, page-header, empty-state, estado-badge, search-input, form-dialog)
│   ├── pipes/                 ← ✅ 5 pipes (moneda, fechaCorta, fechaHora, tiempoRelativo, enumLabel)
│   └── directives/            ← ✅ 1 directiva (appRol)
│
└── features/                  ← Módulos de la aplicación (lazy-loaded)
    ├── auth/                  ← ✅ Login
    ├── dashboard/             ← ✅ KPIs + gráficos
    ├── pos/                   ← ✅ Punto de venta completo
    ├── productos/             ← ✅ CRUD completo + detalle
    ├── clientes/              ← ✅ CRUD completo + detalle + historial
    ├── categorias/            ← ✅ CRUD + árbol jerárquico
    ├── proveedores/           ← ✅ CRUD estándar
    ├── almacenes/             ← ✅ CRUD + toggle principal
    ├── ordenes/               ← ✅ Lista + detalle + acciones
    ├── compras/               ← ✅ Crear + detalle + recibir mercancía
    ├── inventario/            ← ✅ Existencias + movimientos + ajuste + traslado
    ├── entregas/              ← ✅ Lista + detalle + seguimiento
    ├── turnos-caja/           ← ✅ Abrir/cerrar + historial + detalle
    ├── usuarios/              ← ✅ Listado + editar + roles
    ├── reportes/              ← ✅ 6 tabs con Chart.js + date range
    └── configuracion/         ← ✅ Perfil + empresa + cajas
```

### Principios arquitectónicos

| Regla | Detalle |
|-------|---------|
| **Standalone only** | Todos los componentes usan `standalone: true`. No hay `NgModule`. |
| **Lazy loading** | Cada feature se carga con `loadComponent()` en `app.routes.ts`. |
| **core/ es singleton** | Los servicios de `core/` se inyectan con `providedIn: 'root'`. Nunca se importan manualmente en providers. |
| **shared/ es reutilizable** | Los componentes de `shared/` se importan directamente en los `imports` de cada componente que los necesite. |
| **features/ es autocontenido** | Cada feature puede tener sub-componentes, diálogos, etc. dentro de su carpeta. |
| **Sin barrels** | No se usan archivos `index.ts` barrel. Imports directos al archivo. |

---

## 3. Plan de desarrollo por fases

### Fase 1 — shared/ Infrastructure ✅ (commit `ebe51b3d`)

> **Objetivo:** Crear los building blocks que se reutilizarán en TODOS los módulos.
> **Estado:** Completada — 6 componentes, 5 pipes, 1 directiva.

| # | Componente | Tipo | Descripción |
|---|-----------|------|-------------|
| 1.1 | `confirm-dialog` | Component | Dialog genérico de confirmación (título, mensaje, botón confirmar/cancelar). Usa MatDialog. |
| 1.2 | `page-header` | Component | Encabezado de página reutilizable (título, subtítulo, breadcrumb, slot para botones de acción). |
| 1.3 | `empty-state` | Component | Estado vacío con icono, mensaje y botón de acción opcional. |
| 1.4 | `estado-badge` | Component | Badge para estados (orden, entrega, activo/inactivo). Colores por tipo. |
| 1.5 | `search-input` | Component | Input de búsqueda con debounce (300ms) y botón clear. Emite `(buscar)` event. |
| 1.6 | `form-dialog` | Component | Wrapper de diálogo para formularios CRUD. Standardiza header, body scrollable, footer con acciones. |
| 1.7 | `moneda.pipe` | Pipe | `{{ valor \| moneda }}` → `$1,234.56` (usa `formatoMoneda()` de utils) |
| 1.8 | `fecha.pipe` | Pipe | `{{ iso \| fechaCorta }}` → `28/02/2026` (usa `formatoFecha()` de utils) |
| 1.9 | `tiempo-relativo.pipe` | Pipe | `{{ iso \| tiempoRelativo }}` → `Hace 5 min` |
| 1.10 | `rol.directive` | Directive | `*appRol="'ADMIN'"` — muestra/oculta por rol del usuario |

### Fase 2 — Módulos CRUD simples ✅ (commit `a240a3f4`)

> **Objetivo:** Completar los módulos de catálogo base.
> **Estado:** Completada — categorías, proveedores, almacenes, productos y clientes con CRUD completo.

| # | Módulo | Rutas | MatDialogs | Notas |
|---|--------|-------|------------|-------|
| 2.1 | `categorias` | `/categorias` | Crear/Editar categoría | Vista de árbol jerárquico + tabla |
| 2.2 | `proveedores` | `/proveedores` | Crear/Editar proveedor | CRUD estándar |
| 2.3 | `almacenes` | `/almacenes` | Crear/Editar almacén | Toggle principal, gestión de stock |
| 2.4 | `productos` (upgrade) | `/productos`, `/productos/:id` | Crear/Editar producto | Agregar vista detalle, diálogos CRUD, filtros avanzados (categoría, proveedor, estado) |
| 2.5 | `clientes` (upgrade) | `/clientes`, `/clientes/:id` | Crear/Editar cliente | Agregar vista detalle (historial de órdenes), diálogos CRUD |

### Fase 3 — Módulos transaccionales ✅ (commit `632402b8`)

> **Objetivo:** Módulos que manejan transacciones de negocio con flujos complejos.
> **Estado:** Completada — órdenes, compras, inventario, entregas, turnos-caja.

| # | Módulo | Rutas | Componentes especiales |
|---|--------|-------|----------------------|
| 3.1 | `ordenes` | `/ordenes`, `/ordenes/:id` | Lista con filtros por estado + MatChips, detalle completo (detalles, pagos, entrega), acciones (cancelar, devolver) |
| 3.2 | `compras` | `/compras`, `/compras/:id` | Crear compra (selección de proveedor, productos, cantidades), detalle, botón "recibir mercancía" |
| 3.3 | `inventario` (upgrade) | `/inventario` | Tabs: Existencias · Movimientos. Diálogos: ajuste manual, traslado entre almacenes. Indicadores de stock bajo. |
| 3.4 | `entregas` | `/entregas`, `/entregas/:id` | Lista con filtros por estado, mapa conceptual de seguimiento, actualización de estado, vista repartidor |
| 3.5 | `turnos-caja` | `/turnos-caja` | Abrir turno (diálogo), cerrar turno (diálogo con montos), historial, detalle con diferencias |

### Fase 4 — POS (Punto de Venta) ✅ (commit `9b0f0d08`)

> **Objetivo:** Pantalla principal de venta, full-screen, optimizada para táctil y teclado.
> **Estado:** Completada — POS completo con cobro, cliente, ticket, turno de caja requerido.

| Zona | Funcionalidad |
|------|---------------|
| **Barra superior** | Búsqueda de producto (SKU/código/nombre), selector de precio (Lista 1/2/3) |
| **Panel izquierdo** | Grid de categorías rápidas → Grid de productos (imagen, nombre, precio) |
| **Panel derecho** | Carrito: líneas de venta con cantidad, precio, descuento, subtotal. Totales. |
| **Panel inferior** | Métodos de pago, campo de monto pagado, cálculo de cambio. Botón "Cobrar". |
| **Diálogos** | Selección de cliente, pago mixto, ticket/comprobante, apertura/cierre de turno |
| **Requisito previo** | Turno de caja abierto para poder vender |

### Fase 5 — Administración ✅ (commit `f0272020`)

| # | Módulo | Rutas | Funcionalidad |
|---|--------|-------|---------------|
| 5.1 | `usuarios` | `/usuarios`, `/usuarios/:id` | Listado, editar datos, asignar horario, activar/desactivar. Solo ADMIN. |
| 5.2 | `reportes` (upgrade) | `/reportes` | Tabs: Ventas · Top productos · Métodos de pago · Inventario · Cajeros · Entregas. Gráficas con Chart.js. Date range picker. |
| 5.3 | `configuracion` (upgrade) | `/configuracion` | Tabs: Perfil · Empresa · Cajas registradoras. Editar perfil, cambiar PIN. |

### Fase 6 — Pulido y producción ✅ (commit `f57350ec`)

| Tarea | Detalle |
|-------|---------|
| Responsive | Verificar todos los módulos en mobile (< 768px), tablet (768-1024), desktop (> 1024) |
| Dark mode | Variantes CSS con `@media (prefers-color-scheme: dark)` y tokens en `@theme` |
| Impresión | CSS `@media print` para tickets de venta y reportes |
| PWA | `manifest.webmanifest`, service worker, offline awareness |
| Performance | Lazy images, virtual scroll en listas largas, bundle budgets |
| A11y | Tab navigation, ARIA labels, focus trap en diálogos, contraste WCAG AA |
| Build producción | Verificar tree-shaking, CSP headers, Docker + Nginx |

---

## 4. Componentes shared/ ✅ (referencia)

> Todos implementados en Fase 1. Documentación de interfaz mantenida como referencia.

### 4.1 `confirm-dialog`

```
shared/components/confirm-dialog/
├── confirm-dialog.component.ts
├── confirm-dialog.component.html
└── confirm-dialog.component.css
```

**Interfaz:**
```typescript
export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;  // default: "Confirmar"
  textoCancelar?: string;   // default: "Cancelar"
  color?: 'primary' | 'warn';  // default: 'warn'
}
```

**Uso:**
```typescript
const ref = this.dialog.open(ConfirmDialogComponent, {
  data: { titulo: 'Eliminar producto', mensaje: '¿Estás seguro?' }
});
ref.afterClosed().subscribe(confirmado => { if (confirmado) { ... } });
```

### 4.2 `page-header`

```html
<app-page-header
  titulo="Productos"
  subtitulo="Gestión del catálogo de productos"
  icono="inventory_2">
  <button mat-raised-button color="primary" (click)="crear()">
    <mat-icon>add</mat-icon> Nuevo producto
  </button>
</app-page-header>
```

**Template interno:** Título + subtítulo a la izquierda, `<ng-content>` (botones) a la derecha, separador inferior.

### 4.3 `empty-state`

```html
<app-empty-state
  icono="inventory_2"
  mensaje="No se encontraron productos"
  submensaje="Intenta con otro término de búsqueda"
  textoAccion="Crear producto"
  (accion)="crear()">
</app-empty-state>
```

### 4.4 `estado-badge`

```html
<app-estado-badge [estado]="orden.estado" tipo="orden" />
<!-- Renderiza un chip con color y label contextual -->
```

**Mapas de colores:**
```typescript
const COLORES_ORDEN: Record<EstadoOrden, { bg: string; text: string }> = {
  COTIZACION:  { bg: 'bg-blue-100',   text: 'text-blue-800' },
  PENDIENTE:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  EN_PROCESO:  { bg: 'bg-orange-100', text: 'text-orange-800' },
  COMPLETADA:  { bg: 'bg-green-100',  text: 'text-green-800' },
  CANCELADA:   { bg: 'bg-red-100',    text: 'text-red-800' },
  DEVUELTA:    { bg: 'bg-purple-100', text: 'text-purple-800' },
};
```

### 4.5 `search-input`

```html
<app-search-input
  placeholder="Buscar producto..."
  [debounce]="300"
  (buscar)="onBuscar($event)">
</app-search-input>
```

### 4.6 `form-dialog`

Wrapper genérico para diálogos CRUD:
```html
<app-form-dialog titulo="Crear producto" [cargando]="guardando()">
  <!-- Formulario como contenido proyectado -->
  <form [formGroup]="form">...</form>

  <!-- Acciones en footer -->
  <ng-container acciones>
    <button mat-button mat-dialog-close>Cancelar</button>
    <button mat-raised-button color="primary" (click)="guardar()">Guardar</button>
  </ng-container>
</app-form-dialog>
```

### 4.7 Pipes

| Pipe | Selector | Ejemplo de uso | Transforma |
|------|----------|----------------|-----------|
| `MonedaPipe` | `moneda` | `{{ 1234.5 \| moneda }}` | `$1,234.50` |
| `FechaCortaPipe` | `fechaCorta` | `{{ '2026-02-28T...' \| fechaCorta }}` | `28/02/2026` |
| `FechaHoraPipe` | `fechaHora` | `{{ iso \| fechaHora }}` | `28/02/2026 14:30` |
| `TiempoRelativoPipe` | `tiempoRelativo` | `{{ iso \| tiempoRelativo }}` | `Hace 5 min` |
| `EnumLabelPipe` | `enumLabel` | `{{ 'TARJETA_CREDITO' \| enumLabel }}` | `Tarjeta crédito` |

### 4.8 Directiva `*appRol`

```html
<!-- Solo visible para ADMIN -->
<button *appRol="'ADMIN'" mat-raised-button>Eliminar</button>

<!-- Visible para ADMIN o CAJERO -->
<section *appRol="['ADMIN', 'CAJERO']">...</section>
```

---

## 5. Módulos feature/ ✅ (referencia)

> Todos implementados en Fases 2–5. Documentación de estructura mantenida como referencia.

### Vista general — archivos por módulo CRUD típico

```
features/productos/
├── productos.component.ts          ← Página principal (listado)
├── productos.component.html
├── productos.component.css
├── producto-detalle.component.ts   ← Vista de detalle (/productos/:id)
├── producto-detalle.component.html
├── producto-detalle.component.css
├── producto-form-dialog.component.ts   ← Diálogo crear/editar
├── producto-form-dialog.component.html
└── producto-form-dialog.component.css
```

### Rutas a agregar en `app.routes.ts`

```typescript
// Dentro de children del ShellComponent:

// --- Catálogos ---
{
  path: 'categorias',
  loadComponent: () => import('./features/categorias/categorias.component')
    .then(m => m.CategoriasComponent),
},
{
  path: 'proveedores',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/proveedores/proveedores.component')
    .then(m => m.ProveedoresComponent),
},
{
  path: 'almacenes',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/almacenes/almacenes.component')
    .then(m => m.AlmacenesComponent),
},
// --- Detalle con :id ---
{
  path: 'productos/:id',
  loadComponent: () => import('./features/productos/producto-detalle.component')
    .then(m => m.ProductoDetalleComponent),
},
{
  path: 'clientes/:id',
  loadComponent: () => import('./features/clientes/cliente-detalle.component')
    .then(m => m.ClienteDetalleComponent),
},
// --- Transacciones ---
{
  path: 'ordenes',
  loadComponent: () => import('./features/ordenes/ordenes.component')
    .then(m => m.OrdenesComponent),
},
{
  path: 'ordenes/:id',
  loadComponent: () => import('./features/ordenes/orden-detalle.component')
    .then(m => m.OrdenDetalleComponent),
},
{
  path: 'compras',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/compras/compras.component')
    .then(m => m.ComprasComponent),
},
{
  path: 'compras/:id',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/compras/compra-detalle.component')
    .then(m => m.CompraDetalleComponent),
},
{
  path: 'entregas',
  loadComponent: () => import('./features/entregas/entregas.component')
    .then(m => m.EntregasComponent),
},
{
  path: 'entregas/:id',
  loadComponent: () => import('./features/entregas/entrega-detalle.component')
    .then(m => m.EntregaDetalleComponent),
},
// --- Admin ---
{
  path: 'usuarios',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/usuarios/usuarios.component')
    .then(m => m.UsuariosComponent),
},
{
  path: 'turnos-caja',
  loadComponent: () => import('./features/turnos-caja/turnos-caja.component')
    .then(m => m.TurnosCajaComponent),
},
```

### Sidebar — items a agregar

```typescript
readonly navItems: NavItem[] = [
  { label: 'Dashboard',       icon: 'dashboard',      route: '/dashboard' },
  { label: 'Punto de Venta',  icon: 'point_of_sale',  route: '/pos',          roles: ['ADMIN', 'CAJERO'] },
  { label: 'Órdenes',         icon: 'receipt_long',   route: '/ordenes' },
  { label: 'Productos',       icon: 'inventory_2',    route: '/productos' },
  { label: 'Categorías',      icon: 'category',       route: '/categorias' },
  { label: 'Clientes',        icon: 'people',         route: '/clientes' },
  { label: 'Inventario',      icon: 'warehouse',      route: '/inventario' },
  { label: 'Entregas',        icon: 'local_shipping', route: '/entregas',     roles: ['ADMIN', 'REPARTIDOR'] },
  { label: 'Turnos de caja',  icon: 'point_of_sale',  route: '/turnos-caja',  roles: ['ADMIN', 'CAJERO'] },
  { label: 'Compras',         icon: 'shopping_cart',   route: '/compras',      roles: ['ADMIN'] },
  { label: 'Proveedores',     icon: 'local_shipping',  route: '/proveedores', roles: ['ADMIN'] },
  { label: 'Almacenes',       icon: 'store',           route: '/almacenes',   roles: ['ADMIN'] },
  { label: 'Usuarios',        icon: 'manage_accounts', route: '/usuarios',    roles: ['ADMIN'] },
  { label: 'Reportes',        icon: 'bar_chart',       route: '/reportes',    roles: ['ADMIN'] },
  { label: 'Configuración',   icon: 'settings',        route: '/configuracion', roles: ['ADMIN'] },
];
```

---

## 6. Convenciones de código Angular

### 6.1 Nomenclatura de archivos

```
kebab-case para archivos:
  productos.component.ts          ← Componente
  producto-form-dialog.component.ts  ← Sub-componente (diálogo)
  productos.service.ts            ← Servicio
  auth.guard.ts                   ← Guard
  auth.interceptor.ts             ← Interceptor
  moneda.pipe.ts                  ← Pipe
  rol.directive.ts                ← Directiva
```

### 6.2 Nomenclatura de clases

| Tipo | Sufijo | Ejemplo |
|------|--------|---------|
| Componente | `Component` | `ProductosComponent` |
| Servicio | `Service` | `ProductosService` |
| Pipe | `Pipe` | `MonedaPipe` |
| Directiva | `Directive` | `RolDirective` |
| Guard | `Guard` (función) | `authGuard` (camelCase por ser función) |
| Interceptor | `Interceptor` (función) | `authInterceptor` |
| Interface | Sin sufijo | `Producto`, `CrearProductoDto` |

### 6.3 Estructura de un componente

```typescript
@Component({
  selector: 'app-productos',      // Siempre prefijo app-
  standalone: true,                // SIEMPRE standalone
  imports: [                       // Solo lo que se usa en el template
    CommonModule,
    MatTableModule,
    // ...
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  // 1. Inyecciones
  private readonly svc = inject(ProductosService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // 2. Signals de estado
  readonly items = signal<Producto[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);

  // 3. Propiedades de UI
  readonly columnas = ['sku', 'nombre', 'precio', 'activo'] as const;

  // 4. Filtros y paginación
  buscar = '';
  pagina = 1;
  limite = 20;

  // 5. Lifecycle hooks
  ngOnInit(): void { this.cargar(); }

  // 6. Métodos públicos (usados en template)
  cargar(): void { ... }
  onBuscar(): void { this.pagina = 1; this.cargar(); }
  onPage(ev: PageEvent): void { ... }
  crear(): void { ... }
  editar(item: Producto): void { ... }
  eliminar(item: Producto): void { ... }
}
```

### 6.4 Reglas estrictas

| Regla | Detalle |
|-------|---------|
| **Minimizar `any`** | Evitar `as any`. Actualmente quedan 8 en frontend (ver §12.2). Los nuevos desarrollos no deben agregar más. |
| **Sin `subscribe` sin cleanup** | Usar `takeUntilDestroyed(this.destroyRef)` antes de `.subscribe()`. |
| **Sin imports duplicados** | No importar módulos Angular Material completos, solo los módulos específicos. |
| **Signals para estado local** | Preferir `signal()` sobre variables mutables para estado del componente. |
| **Computed para derivados** | Usar `computed()` para valores derivados de signals. |
| **Readonly services** | Marcar inyecciones como `private readonly`. |
| **Type imports** | Usar `import type { X }` cuando solo se usa como tipo (no en runtime). |
| **Archivos separados** | Siempre `.ts`, `.html`, `.css` separados. Nunca inline templates/styles. |

---

## 7. Guía de estilos con Tailwind CSS v4

> **Versión**: Tailwind CSS **v4.2** — configuración CSS-first (sin `tailwind.config.js`).

### 7.1 Instalación y configuración

#### Paquetes (package.json devDependencies)

```json
"tailwindcss": "^4.0.0",
"@tailwindcss/postcss": "^4.0.0",
"postcss": "^8.5.0"
```

#### PostCSS — `.postcssrc.json`

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

> ⚠️ **No existe** `tailwind.config.js`, `postcss.config.js` ni `postcss.config.mjs`.
> En Tailwind v4 toda la configuración vive en **CSS** (`globals.css`).

#### angular.json — orden de estilos

```json
"styles": [
  "node_modules/@fontsource/roboto/400.css",
  "node_modules/@fontsource/roboto/500.css",
  "node_modules/@fontsource/roboto/700.css",
  "node_modules/@angular/material/prebuilt-themes/indigo-pink.css",
  "node_modules/material-icons/iconfont/material-icons.css",
  "src/styles/globals.css"       // ← último: sobrescribe Material
]
```

#### Nota sobre peer dependencies

`@angular-devkit/build-angular@17.3` reporta un peer warning pidiendo `tailwindcss ^2 || ^3`.
Es **inofensivo** — el build compila sin errores con TW v4. Angular CLI aún no actualiza su lista de peers.

### 7.2 Diferencias clave v3 → v4

| Concepto | Tailwind v3 | Tailwind v4 |
|----------|------------|------------|
| **Configuración** | `tailwind.config.js` (JavaScript) | CSS-first: `@theme {}` en `.css` |
| **Directivas CSS** | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| **Colores custom** | `theme.extend.colors` en JS | `@theme { --color-nombre: #hex; }` |
| **Utilities custom** | `@layer utilities { .nombre { @apply ... } }` | `@utility nombre { propiedad: valor; }` |
| **Plugin PostCSS** | `tailwindcss` (paquete principal) | `@tailwindcss/postcss` (dedicado) |
| **Config PostCSS** | `postcss.config.js` con `require('tailwindcss')` | `.postcssrc.json` con `"@tailwindcss/postcss"` |
| **Prefixes** | Siguen igual: `sm:`, `md:`, `hover:`, etc. | Sin cambio |
| **@apply** | Se usa frecuentemente | Se desaconseja; preferir `@utility` |
| **Dark mode** | `darkMode: 'class'` en config JS | `@media (prefers-color-scheme: dark)` nativo o variantes |

### 7.3 Tokens de diseño — `@theme`

Los tokens definidos en `@theme {}` se exponen automáticamente como clases Tailwind (p.ej. `bg-primary`, `text-accent`, `border-border`):

```css
@theme {
  --color-primary:        #3f51b5;   /* Indigo — botones, links, header activo */
  --color-primary-light:  #7986cb;   /* Indigo claro — hover, focus */
  --color-primary-dark:   #303f9f;   /* Indigo oscuro — pressed, active */
  --color-accent:         #ff4081;   /* Pink — CTAs secundarios, badges */
  --color-warn:           #f44336;   /* Red — errores, eliminaciones */
  --color-success:        #4caf50;   /* Green — confirmaciones, activo */
  --color-surface:        #ffffff;   /* Fondo de cards, diálogos */
  --color-bg:             #fafafa;   /* Fondo general */
  --color-text:           #212121;   /* Texto principal */
  --color-text-secondary: #757575;   /* Texto secundario, labels */
  --color-border:         #e5e7eb;   /* Bordes normales */
  --color-border-light:   #f3f4f6;   /* Bordes sutiles (cards, rows) */
}
```

Esto genera automáticamente utilidades como:

```html
<div class="bg-primary text-surface">Header</div>
<p class="text-text-secondary">Subtítulo</p>
<div class="border border-border-light">Card</div>
```

### 7.4 CSS Custom Properties — tokens de layout y dark mode

Tokens que **no** van en `@theme` (no necesitan generar clases Tailwind):

```css
:root {
  /* Layout */
  --sidebar-width: 260px;
  --header-height: 64px;
  --border-radius: 8px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Dark mode aliases (light defaults) */
  --dm-bg: var(--color-bg);
  --dm-surface: var(--color-surface);
  --dm-text: var(--color-text);
  --dm-text-secondary: var(--color-text-secondary);
  --dm-border: var(--color-border);
  --dm-border-light: var(--color-border-light);
  --dm-card-bg: #ffffff;
  --dm-hover: #f9fafb;
  --dm-shadow-sm: var(--shadow-sm);
  --dm-shadow-md: var(--shadow-md);
}
```

### 7.5 Sistema de Dark Mode

Se usa `prefers-color-scheme: dark` (automático OS). Las `@utility` leen las variables `--dm-*`, que se sobrescriben en dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --dm-bg: #121212;
    --dm-surface: #1e1e1e;
    --dm-text: #e0e0e0;
    --dm-text-secondary: #a0a0a0;
    --dm-border: #333333;
    --dm-border-light: #2a2a2a;
    --dm-card-bg: #1e1e1e;
    --dm-hover: #2a2a2a;
    --dm-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
    --dm-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.35);
    color-scheme: dark;
  }
}
```

**Regla clave:** Todas las `@utility` deben leer `var(--dm-xxx, fallback)` en vez de colores hardcodeados. Así el dark mode funciona automáticamente sin duplicar reglas.

Se incluyen 15+ overrides de Angular Material para dark mode:
- Cards, toolbar, diálogos, tablas (header, cell, row hover)
- Form fields (outline, input text, select), menús
- Tabs, paginator, chips, divider, snackbar
- Scrollbar personalizada

### 7.6 Utilities personalizadas — `@utility`

En Tailwind v4, las utilities custom se definen con `@utility nombre { ... }` (no `@layer utilities`):

```css
/* Layout */
@utility page-container {
  padding: 1.5rem;
  max-width: 80rem;
  margin-inline: auto;
}

/* Cards */
@utility card {
  background: var(--dm-card-bg, white);
  border-radius: 0.5rem;
  box-shadow: var(--dm-shadow-sm, var(--shadow-sm));
  padding: 1rem;
  border: 1px solid var(--dm-border-light, #f3f4f6);
}

@utility card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

@utility card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--dm-text, #1f2937);
}

/* KPI Dashboard */
@utility kpi-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);  /* →2 cols @sm, →4 cols @lg via media query */
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@utility kpi-card {
  background: var(--dm-card-bg, white);
  border-radius: 0.5rem;
  box-shadow: var(--dm-shadow-sm, var(--shadow-sm));
  padding: 1.25rem;
  border: 1px solid var(--dm-border-light, #f3f4f6);
  display: flex;
  flex-direction: column;
}

@utility kpi-label {
  font-size: 0.875rem;
  color: var(--dm-text-secondary, #6b7280);
  font-weight: 500;
}

@utility kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dm-text, #1f2937);
  margin-top: 0.25rem;
}

@utility kpi-change {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-weight: 500;
}
```

> **Responsividad de kpi-grid:** Las columnas se adaptan con media queries estándar porque `@utility` no acepta media queries anidadas. En `globals.css` hay:
> `@media (min-width: 640px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }`
> `@media (min-width: 1024px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }`

### 7.7 Tailwind en componentes Angular

Angular usa **View Encapsulation** por defecto. Consideraciones:

| Escenario | Dónde | Cómo |
|-----------|-------|------|
| **Clases Tailwind en templates** | `component.html` | Funcionan directamente — `class="flex gap-4 p-4"` |
| **Estilos globales** (`page-container`, `card`, etc.) | `globals.css` | Se aplican porque no están encapsulados |
| **CSS específico del componente** | `component.css` | Usar selectores Tailwind o CSS puro; `@apply` disponible pero **no recomendado** |
| **Overrides de Material** | `globals.css` | Usar selectores de Material + `!important` donde sea necesario |
| **Tokens de diseño** | `globals.css` + templates | Usar `var(--dm-xxx)` en CSS, `bg-primary` etc. en templates |

**Regla:** Preferir siempre clases Tailwind en el template HTML antes que CSS en `component.css`. Si se necesita un estilo que se repite 3+ veces, crear una `@utility` en `globals.css`.

### 7.8 Estilos de impresión

```css
@media print {
  /* Ocultar chrome: header, sidebar, sidenav, paginator, botones, skip-nav */
  /* Contenido a ancho completo sin margins */
  /* Cards sin shadow, con border sutil */
  /* Tablas a 10pt compactas */
  /* print-color-adjust: exact para gráficos */
}
```

Clase `.no-print` disponible para ocultar elementos en impresión.

### 7.9 Accesibilidad CSS

| Feature | Implementación |
|---------|---------------|
| **Skip navigation** | `.skip-nav` oculto, visible con `:focus` (Tab) |
| **Focus visible** | `*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` |
| **Scrollbar custom** | Sutil 6px, respeta dark mode |
| **Density compact** | `.density-compact` reduce form fields para espacios reducidos |

### 7.10 Reglas de uso

| ✅ Hacer | ❌ No hacer |
|---------|-----------|
| Usar clases Tailwind en templates HTML | Escribir CSS custom para márgenes/paddings |
| Usar `@utility` para patrones repetidos (3+ veces) | Crear clases CSS sueltas en component.css |
| Usar `@theme` para colores del diseño | Hardcodear colores hex en templates |
| Usar responsive prefixes: `sm:`, `md:`, `lg:` | Escribir media queries manuales salvo en `@utility` |
| Componer clases: `class="flex items-center gap-2"` | Crear wrapper divs innecesarios |
| Leer `var(--dm-xxx, fallback)` en `@utility` para dark mode | Usar colores hex directos en utilities |
| Usar `@import "tailwindcss"` (v4) | Usar `@tailwind base/components/utilities` (v3) |
| Definir tokens en `@theme {}` | Crear un `tailwind.config.js` |
| Usar `.postcssrc.json` con `@tailwindcss/postcss` | Usar `postcss.config.js` con `tailwindcss` |

### 7.11 Breakpoints (Tailwind v4 defaults)

| Prefix | Min-width | Uso en el proyecto |
|--------|-----------|-----|
| `sm:` | 640px | Tablets pequeñas — kpi-grid 2 cols, POS stacking |
| `md:` | 768px | Tablets — sidebar se colapsa, tablas visibles |
| `lg:` | 1024px | Desktop — kpi-grid 4 cols, grid 2 cols, sidebar expandido |
| `xl:` | 1280px | Desktop grande — layouts anchos |
| `2xl:` | 1536px | Pantallas ultra anchas |

### 7.12 Patrones de layout comunes

```html
<!-- Página estándar -->
<div class="page-container">
  <app-page-header titulo="Productos" />
  <div class="card">...</div>
</div>

<!-- Grid de 2 columnas en desktop -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div class="card">...</div>
  <div class="card">...</div>
</div>

<!-- Formulario en diálogo -->
<form class="flex flex-col gap-4 p-4">
  <mat-form-field appearance="outline" class="w-full">...</mat-form-field>
</form>

<!-- Tabla responsiva -->
<div class="card overflow-x-auto">
  <table mat-table class="w-full">...</table>
</div>

<!-- KPI Dashboard -->
<div class="kpi-grid">
  <div class="kpi-card">
    <span class="kpi-label">Ventas hoy</span>
    <span class="kpi-value">{{ ventasHoy | currency }}</span>
    <span class="kpi-change" [class.positive]="cambio >= 0" [class.negative]="cambio < 0">
      {{ cambio >= 0 ? '+' : '' }}{{ cambio }}%
    </span>
  </div>
</div>
```

### 7.13 Colores semánticos para estados

```html
<!-- Estados de orden -->
<span class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">Completada</span>
<span class="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
<span class="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">Cancelada</span>

<!-- Activo/Inactivo -->
<span class="text-xs font-medium px-2 py-1 rounded-full"
      [class]="item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'">
  {{ item.activo ? 'Activo' : 'Inactivo' }}
</span>

<!-- KPI positivo/negativo -->
<span class="text-sm font-medium"
      [class]="valor >= 0 ? 'text-green-600' : 'text-red-600'">
  {{ valor >= 0 ? '+' : '' }}{{ valor }}%
</span>
```

---

## 8. Angular Material — convenciones de uso

> **Versión**: Angular Material **17.3** — tema prebuilt `indigo-pink`.
> Imports al estilo standalone (cada componente importa solo los módulos que necesita).

### 8.1 Tema y configuración global

```
Tema prebuilt: @angular/material/prebuilt-themes/indigo-pink.css
Tipografía:    @fontsource/roboto (300, 400, 500, 700)
Iconos:        material-icons (iconfont)
```

**Proveedores globales** (`app.config.ts`):

```typescript
provideAnimationsAsync(),                           // Animaciones Material
{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,           // appearance: outline en TODOS los form fields
  useValue: { appearance: 'outline' } },
```

> Con `MAT_FORM_FIELD_DEFAULT_OPTIONS` ya no es necesario repetir `appearance="outline"` en cada `<mat-form-field>`.

### 8.2 Módulos usados (25 módulos)

| Módulo | Import | Uso principal | Archivos |
|--------|--------|---------------|----------|
| `MatIconModule` | `@angular/material/icon` | Iconos en toda la app | ~30+ |
| `MatButtonModule` | `@angular/material/button` | Botones (raised, icon, flat, stroked) | ~28+ |
| `MatProgressSpinnerModule` | `@angular/material/progress-spinner` | Loading states `<mat-spinner>` | ~24+ |
| `MatDialogModule` | `@angular/material/dialog` | Diálogos CRUD, confirmación, cobro | ~22+ |
| `MatFormFieldModule` | `@angular/material/form-field` | Campos de formulario | ~18+ |
| `MatInputModule` | `@angular/material/input` | Inputs text, number, email | ~17+ |
| `MatSelectModule` | `@angular/material/select` | Dropdowns (categoría, proveedor, rol, etc.) | ~12 |
| `MatTableModule` | `@angular/material/table` | Tablas de datos (11 módulos con tabla) | 11 |
| `MatPaginatorModule` | `@angular/material/paginator` | Paginación debajo de tablas | 9 |
| `MatMenuModule` | `@angular/material/menu` | Menú de acciones por fila (`more_vert`) | 9 |
| `MatDividerModule` | `@angular/material/divider` | Separadores en detalles y diálogos | 8 |
| `MatCardModule` | `@angular/material/card` | Cards en dashboard y detalles | 7 |
| `MatChipsModule` | `@angular/material/chips` | Filtros por estado (chip-listbox + chip-option) | 5 |
| `MatTabsModule` | `@angular/material/tabs` | Vistas multi-tab (reportes, config, inventario) | 4 |
| `MatSlideToggleModule` | `@angular/material/slide-toggle` | Toggles booleanos (activo, impuesto incluido) | 3 |
| `MatDatepickerModule` | `@angular/material/datepicker` | Filtros de fecha (órdenes, reportes) | 2 |
| `MatNativeDateModule` | `@angular/material/core` | Adapter nativo para datepicker | 2 |
| `MatTooltipModule` | `@angular/material/tooltip` | Tooltips en botones de icono | 2 |
| `MatCheckboxModule` | `@angular/material/checkbox` | Checkboxes (devolución parcial) | 2 |
| `MatAutocompleteModule` | `@angular/material/autocomplete` | Búsqueda de productos en compras | 1 |
| `MatBadgeModule` | `@angular/material/badge` | Badge de conteo en POS (carrito) | 1 |
| `MatSidenavModule` | `@angular/material/sidenav` | Layout principal (shell responsive) | 1 |
| `MatToolbarModule` | `@angular/material/toolbar` | Header de la app | 1 |
| `MatListModule` | `@angular/material/list` | Items de navegación en sidebar | 1 |
| `MatSnackBar` | `@angular/material/snack-bar` | Toasts vía NotificationService | 1 |

**CDK usado:**
- `BreakpointObserver` / `Breakpoints` (`@angular/cdk/layout`) — detección responsive en shell
- `cdkFocusInitial` — auto-focus en diálogos (confirm-dialog, cliente-dialog POS)

### 8.3 Diálogos — patrones

#### Patrón A: Diálogo con datos (crear/editar)

Usado en: producto-form, categoria-form, almacen-form, cliente-form, devolucion, cerrar-turno, usuario-form, horario, confirm-dialog, cobrar-dialog.

```typescript
// Apertura desde el padre:
editar(item: Producto): void {
  const ref = this.dialog.open(ProductoFormDialogComponent, {
    width: '700px',
    data: { modo: 'editar', producto: item },
  });

  ref.afterClosed()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(resultado => {
      if (resultado) this.cargar();
    });
}

// Dentro del diálogo:
readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
readonly data = inject<{ modo: 'crear' | 'editar'; producto?: Producto }>(MAT_DIALOG_DATA);

guardar(): void {
  const obs$ = this.data.modo === 'crear'
    ? this.svc.crear(this.form.getRawValue())
    : this.svc.actualizar(this.data.producto!.id, this.form.getRawValue());

  obs$.subscribe({
    next: () => {
      this.notify.exito(this.data.modo === 'crear' ? 'Creado' : 'Actualizado');
      this.dialogRef.close(true);
    },
    error: () => this.notify.error('Error al guardar'),
  });
}
```

#### Patrón B: Diálogo sin datos (crear-only / acciones)

Usado en: compra-form, abrir-turno, ajuste, traslado, cancelar-orden, usuario-registro.

```typescript
readonly dialogRef = inject(MatDialogRef<CompraFormDialogComponent>);
// Sin MAT_DIALOG_DATA — el diálogo solo crea, no necesita datos previos
```

#### Anchos de diálogo por complejidad

| Ancho | Tipo de diálogo |
|-------|-----------------|
| `400px` | Ticket (POS recibo) |
| `450px` | Confirmaciones, turno abrir/cerrar, cancelar orden |
| `500px` | Formularios simples (categoría, almacén, ajuste, traslado) |
| `550px` | Cobrar (POS) |
| `600px` | Formularios medianos (cliente, proveedor) |
| `700px` | Formularios completos (producto, devolución) |
| `900px` | Formularios con tabla interna (compra con líneas) |
| default | Confirm dialog (sin ancho fijo) |

#### Opciones especiales

| Opción | Cuándo usar |
|--------|------------|
| `disableClose: true` | Solo en flujos críticos (cobrar en POS) donde el cierre accidental causa pérdida de datos |
| `data: { modo, item }` | Diálogos crear/editar que reutilizan el mismo componente |
| `cdkFocusInitial` | En el botón de acción primaria para a11y |

### 8.4 Tablas — patrón estándar

Todas las tablas siguen el mismo patrón consistente (11 módulos con tabla):

```html
<!-- Loading state -->
@if (cargando()) {
  <div class="flex justify-center p-8">
    <mat-spinner diameter="40" />
  </div>
}

@if (!cargando()) {
  <div class="overflow-x-auto">
    <table mat-table [dataSource]="items()" class="w-full">

      <ng-container matColumnDef="nombre">
        <th mat-header-cell *matHeaderCellDef>Nombre</th>
        <td mat-cell *matCellDef="let item">{{ item.nombre }}</td>
      </ng-container>

      <!-- Columna de acciones con menú -->
      <ng-container matColumnDef="acciones">
        <th mat-header-cell *matHeaderCellDef class="w-16"></th>
        <td mat-cell *matCellDef="let item">
          <button mat-icon-button [matMenuTriggerFor]="menu">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="editar(item)">
              <mat-icon>edit</mat-icon> Editar
            </button>
            <button mat-menu-item (click)="eliminar(item)" class="text-red-600">
              <mat-icon>delete</mat-icon> Eliminar
            </button>
          </mat-menu>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columnas"></tr>
      <tr mat-row *matRowDef="let row; columns: columnas"></tr>
    </table>
  </div>

  <!-- Empty state -->
  @if (items().length === 0) {
    <app-empty-state icono="inbox" mensaje="Sin resultados" />
  }

  <!-- Paginador -->
  @if (meta()) {
    <mat-paginator
      [length]="meta()!.total"
      [pageSize]="meta()!.limite"
      [pageIndex]="meta()!.pagina - 1"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)"
      showFirstLastButtons />
  }
}
```

**Reglas de tablas:**

| Regla | Detalle |
|-------|---------|
| Data source = signal | `[dataSource]="items()"` — siempre un signal, nunca `MatTableDataSource` |
| Sin MatSort | No se usa sorting en cliente; toda la ordenación es vía API |
| Clase `w-full` | Siempre `class="w-full"` en la tabla |
| Overflow | Wrapper con `class="overflow-x-auto"` para scroll horizontal en mobile |
| Empty state | Usar `<app-empty-state>` de shared/ cuando la lista sea vacía |
| Acciones | Menú contextual con `mat-icon-button` + `mat-menu` (icono `more_vert`) |
| Paginador | `showFirstLastButtons`, opciones `[10, 20, 50]` |

### 8.5 Notificaciones (MatSnackBar)

`NotificationService` envuelve `MatSnackBar` con 3 métodos: 

```typescript
// notification.service.ts
exito(msg)  → snack verde, 3s, acción "OK",     panelClass: ['snack-exito']
error(msg)  → snack rojo,  5s, acción "Cerrar",  panelClass: ['snack-error']
info(msg)   → snack default, 3s, acción "OK"
```

**Posición:** siempre `end` + `top` (esquina superior derecha).

**Estilos** definidos en `globals.css`:

```css
.snack-exito .mdc-snackbar__surface { background-color: #2e7d32 !important; }
.snack-exito .mdc-snackbar__label,
.snack-exito .mat-mdc-snack-bar-action { color: #fff !important; }

.snack-error .mdc-snackbar__surface { background-color: #c62828 !important; }
.snack-error .mdc-snackbar__label,
.snack-error .mat-mdc-snack-bar-action { color: #fff !important; }
```

### 8.6 Chips como filtros de estado

Patrón usado en: órdenes, entregas, inventario, turnos-caja, usuarios.

```html
<mat-chip-listbox (change)="filtrarEstado($event.value)" [value]="estadoFiltro">
  <mat-chip-option value="">Todos</mat-chip-option>
  <mat-chip-option value="PENDIENTE">Pendiente</mat-chip-option>
  <mat-chip-option value="COMPLETADA">Completada</mat-chip-option>
  <mat-chip-option value="CANCELADA">Cancelada</mat-chip-option>
</mat-chip-listbox>
```

### 8.7 Tabs para vistas multi-sección

Patrón usado en: reportes (6 tabs), configuración (2 tabs), inventario (2 tabs).

```html
<mat-tab-group>
  <mat-tab label="Existencias">
    <!-- Contenido tab 1 -->
  </mat-tab>
  <mat-tab label="Movimientos">
    <!-- Contenido tab 2 -->
  </mat-tab>
</mat-tab-group>
```

### 8.8 Form fields — convenciones

| Convención | Detalle |
|-----------|---------|
| **Appearance** | `outline` global vía `MAT_FORM_FIELD_DEFAULT_OPTIONS` en `app.config.ts` |
| **Ancho en diálogos** | `class="w-full"` para llenar el ancho del diálogo |
| **Ancho en filtros** | Tailwind: `class="w-36"`, `w-40"`, `w-48"`, `w-64"` según contenido |
| **Layout de filtros** | `class="flex flex-wrap items-end gap-3"` para fila de filtros |
| **Density compacta** | `class="density-compact"` — reduce altura a 40px (p.ej. filtros de reportes) |
| **Validación visual** | `@if (form.get('campo')?.hasError('required')) { <mat-error>...` |

### 8.9 Dark mode — overrides Material

Todos los overrides viven en `globals.css` dentro de `@media (prefers-color-scheme: dark)`.
Usan las variables semánticas `--dm-*` con `!important`:

| Componente Material | Variables usadas |
|-------------------|-----------------|
| Cards (`.mat-mdc-card`, `.mdc-card`) | `--dm-surface`, `--dm-text` |
| Toolbar | `--dm-surface`, `--dm-text` |
| Diálogos (`.mdc-dialog__surface`) | `--dm-surface`, `--dm-text` |
| Tablas (header, cell, row hover) | `--dm-surface`, `--dm-text`, `--dm-text-secondary`, `--dm-border`, `--dm-hover` |
| Form fields (outline, input, select) | `--dm-border`, `--dm-text` |
| Menús | `--dm-surface`, `--dm-text` |
| Tabs header | `--dm-surface` |
| Paginator | `--dm-surface`, `--dm-text` |
| Chips | `--dm-hover`, `--dm-text` |
| Divider | `--dm-border` |
| Snackbar | `#333` fijo |

### 8.10 Reglas de uso Material

| ✅ Hacer | ❌ No hacer |
|---------|-----------|
| Importar solo módulos usados en `imports[]` del componente | Importar módulos Material completos o crear barrel |
| Usar `MatDialog.open()` con `width` explícito | Dejar diálogos sin ancho (se ven mal en mobile) |
| Usar `takeUntilDestroyed()` en `afterClosed()` | Subscribirse a diálogos sin cleanup |
| Usar `mat-icon-button` + `mat-menu` para acciones de tabla | Poner múltiples botones inline en cada fila |
| Usar signals como data source `[dataSource]="items()"` | Usar `MatTableDataSource` (innecesario con paginación backend) |
| Notificar con `NotificationService` (exito/error/info) | Usar `MatSnackBar` directamente |
| Dark mode overrides en `globals.css` con `--dm-*` | Overrides en component.css (no se aplican globalmente) |
| `cdkFocusInitial` en diálogos para a11y | Dejar el focus sin gestionar |

---

## 9. Patrón CRUD estándar de un módulo

> Referencia para crear nuevos módulos. Basado en los 11 módulos implementados.
> Existen 3 tipos de módulo; cada uno con estructura distinta.

### 9.1 Tipos de módulo

| Tipo | Ejemplo | Archivos | Rutas | Características |
|------|---------|----------|-------|----------------|
| **CRUD simple** | proveedores, categorías, almacenes | list + form-dialog (6 archivos) | 1 ruta plana | Crear/editar vía MatDialog, eliminar con confirmación |
| **CRUD + extras** | productos, clientes | list + form-dialog (6 archivos) | 1 ruta plana | CRUD + toggleActivo, filtros avanzados, tabs en diálogo |
| **Transaccional** | órdenes, compras, entregas, turnos | list + detalle + action-dialogs (8-10 archivos) | 2 rutas (`/` + `/:id`) | Sin CRUD directo, detalle con acciones de dominio, filtros por estado |

### 9.2 Estructura de archivos

#### CRUD simple

```
features/proveedores/
├── proveedores.component.ts            ← Listado paginado
├── proveedores.component.html
├── proveedores.component.css
├── proveedor-form-dialog.component.ts  ← Diálogo crear/editar
├── proveedor-form-dialog.component.html
└── proveedor-form-dialog.component.css
```

#### Transaccional con detalle

```
features/ordenes/
├── ordenes.component.ts                ← Listado con filtros
├── ordenes.component.html
├── ordenes.component.css
├── orden-detalle.component.ts          ← Vista detalle (/:id)
├── orden-detalle.component.html
├── orden-detalle.component.css
├── cancelar-orden-dialog.component.ts  ← Diálogo de acción
├── cancelar-orden-dialog.component.html
├── devolucion-dialog.component.ts      ← Diálogo de acción
└── devolucion-dialog.component.html
```

### 9.3 Componente de listado — TypeScript

Estructura canónica (basada en `proveedores.component.ts`):

```typescript
// 1. Angular
import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
// 2. Material
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// 3. Servicios
import { ProveedoresService } from '../../core/services/proveedores.service';
import { NotificationService } from '../../core/services/notification.service';
// 4. Shared
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
// 5. Diálogo local
import { ProveedorFormDialogComponent } from './proveedor-form-dialog.component';
// 6. Tipos
import type { Proveedor, PaginacionMeta } from '../../core/models/api.model';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [ /* solo lo que se usa */ ],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.css',
})
export class ProveedoresComponent implements OnInit {
  // ── Inyecciones (private readonly) ──
  private readonly svc = inject(ProveedoresService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Signals de estado ──
  readonly items = signal<Proveedor[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);

  // ── Columnas de tabla ──
  readonly columnas = ['nombre', 'contacto', 'telefono', 'correo', 'activo', 'acciones'];

  // ── Paginación y búsqueda (propiedades simples) ──
  buscar = '';
  pagina = 1;
  limite = 20;

  // ── Lifecycle ──
  ngOnInit(): void { this.cargar(); }

  // ── Cargar datos ──
  cargar(): void {
    this.cargando.set(true);
    const params: Record<string, string | number> = {
      pagina: this.pagina,
      limite: this.limite,
    };
    if (this.buscar) params['buscar'] = this.buscar;

    this.svc.listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.datos);
          this.meta.set(res.meta);
          this.cargando.set(false);
        },
        error: () => {
          this.notify.error('Error al cargar proveedores');
          this.cargando.set(false);
        },
      });
  }

  // ── Handlers de búsqueda y paginación ──
  onBuscar(term: string): void {
    this.buscar = term;
    this.pagina = 1;
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pagina = ev.pageIndex + 1;
    this.limite = ev.pageSize;
    this.cargar();
  }

  // ── CRUD: Crear ──
  crear(): void {
    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      width: '600px',
      data: { modo: 'crear' },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ok => { if (ok) this.cargar(); });
  }

  // ── CRUD: Editar ──
  editar(item: Proveedor): void {
    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      width: '600px',
      data: { modo: 'editar', proveedor: item },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ok => { if (ok) this.cargar(); });
  }

  // ── CRUD: Eliminar ──
  eliminar(item: Proveedor): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar proveedor',
        mensaje: `¿Estás seguro de eliminar "${item.nombre}"?`,
      },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ok => {
        if (!ok) return;
        this.svc.eliminar(item.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => { this.notify.exito('Proveedor eliminado'); this.cargar(); },
            error: () => this.notify.error('Error al eliminar proveedor'),
          });
      });
  }
}
```

### 9.4 Componente de listado — template HTML

```html
<div class="page-container">
  <!-- 1. Header con botón de acción -->
  <app-page-header titulo="Proveedores" subtitulo="Gestión de proveedores" icono="local_shipping">
    <button mat-raised-button color="primary" (click)="crear()">
      <mat-icon>add</mat-icon> Nuevo proveedor
    </button>
  </app-page-header>

  <!-- 2. Card de búsqueda -->
  <div class="card mb-4">
    <app-search-input placeholder="Buscar proveedor..." (buscar)="onBuscar($event)" />
  </div>

  <!-- 3. Loading spinner -->
  @if (cargando()) {
    <div class="flex justify-center py-10">
      <mat-spinner diameter="40" />
    </div>
  } @else {
    <!-- 4. Card con tabla -->
    <div class="card overflow-x-auto">
      <table mat-table [dataSource]="items()" class="w-full">
        <!-- Columnas de datos... -->

        <!-- Columna de acciones (siempre última) -->
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="w-16"></th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Acciones">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="editar(p)">
                <mat-icon>edit</mat-icon> Editar
              </button>
              <button mat-menu-item (click)="eliminar(p)" class="!text-red-600">
                <mat-icon class="!text-red-600">delete</mat-icon> Eliminar
              </button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let row; columns: columnas" class="hover:bg-gray-50"></tr>
      </table>

      <!-- 5. Empty state -->
      @if (items().length === 0) {
        <app-empty-state icono="local_shipping" mensaje="No se encontraron proveedores"
          textoAccion="Crear proveedor" (accion)="crear()" />
      }

      <!-- 6. Paginador -->
      @if (meta()) {
        <mat-paginator [length]="meta()!.total" [pageSize]="meta()!.limite"
          [pageIndex]="meta()!.pagina - 1" [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)" showFirstLastButtons />
      }
    </div>
  }
</div>
```

### 9.5 Diálogo de formulario — TypeScript

```typescript
interface DialogData {
  modo: 'crear' | 'editar';
  proveedor?: Proveedor;       // nombre de la entidad cambia por módulo
}

@Component({ standalone: true, imports: [...], templateUrl, styleUrl })
export class ProveedorFormDialogComponent {
  // Inyecciones
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ProveedoresService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<ProveedorFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  // Estado de guardado
  readonly guardando = signal(false);

  // Formulario reactivo (fb.nonNullable.group)
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    nombreContacto: [''],
    telefono: [''],
    correo: ['', [Validators.email]],
    direccion: [''],
    rfc: ['', [Validators.maxLength(13)]],
    notas: [''],
  });

  // Getter de conveniencia
  get esEdicion(): boolean { return this.data.modo === 'editar'; }

  // Patch de datos en modo edición (constructor o ngOnInit)
  constructor() {
    if (this.esEdicion && this.data.proveedor) {
      this.form.patchValue({
        nombre: this.data.proveedor.nombre,
        nombreContacto: this.data.proveedor.nombreContacto ?? '',
        // ... etc.
      });
    }
  }

  // Guardar
  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const raw = this.form.getRawValue();

    // Construir payload (solo incluir campos opcionales si no están vacíos)
    const payload: Record<string, unknown> = { nombre: raw.nombre };
    if (raw.telefono) payload['telefono'] = raw.telefono;
    // ...

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.proveedor!.id, payload)
      : this.svc.crear(payload as { nombre: string });

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Proveedor actualizado' : 'Proveedor creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar proveedor');
      },
    });
  }
}
```

> **Nota:** Si el diálogo necesita cargar datos externos (ej: listas de categorías en `producto-form-dialog`), implementar `OnInit` y mover la carga/patch a `ngOnInit()`.

### 9.6 Diálogo de formulario — template HTML

```html
<!-- Título dinámico -->
<h2 mat-dialog-title>{{ esEdicion ? 'Editar' : 'Nuevo' }} proveedor</h2>

<!-- Contenido -->
<mat-dialog-content class="flex flex-col gap-4">
  <form [formGroup]="form" id="proveedorForm" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-2">

    <!-- Campo full-width -->
    <mat-form-field class="w-full">
      <mat-label>Nombre</mat-label>
      <input matInput formControlName="nombre" placeholder="Nombre del proveedor" />
      @if (form.controls.nombre.hasError('required')) {
        <mat-error>El nombre es obligatorio</mat-error>
      }
    </mat-form-field>

    <!-- Campos lado a lado (responsive) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <mat-form-field>
        <mat-label>Teléfono</mat-label>
        <input matInput formControlName="telefono" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Correo</mat-label>
        <input matInput formControlName="correo" type="email" />
        @if (form.controls.correo.hasError('email')) {
          <mat-error>Correo inválido</mat-error>
        }
      </mat-form-field>
    </div>

    <!-- Textarea -->
    <mat-form-field class="w-full">
      <mat-label>Dirección</mat-label>
      <textarea matInput formControlName="direccion" rows="2"></textarea>
    </mat-form-field>
  </form>
</mat-dialog-content>

<!-- Acciones -->
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close [disabled]="guardando()">Cancelar</button>
  <button mat-flat-button color="primary" type="submit" form="proveedorForm" [disabled]="guardando()">
    @if (guardando()) {
      <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>
    }
    {{ esEdicion ? 'Actualizar' : 'Crear' }}
  </button>
</mat-dialog-actions>
```

**Patrón clave:** El `<form>` tiene un atributo `id` y el botón Submit usa `form="proveedorForm"` (external submit). El botón Cancel usa `mat-dialog-close` para cerrar sin valor. El spinner es inline dentro del botón.

> **Nota:** `appearance="outline"` ya no es necesario por campo individual — se provee globalmente vía `MAT_FORM_FIELD_DEFAULT_OPTIONS` en `app.config.ts`.

### 9.7 Componente de detalle (transaccional)

Para módulos transaccionales con vista `/modulo/:id`:

```typescript
export class OrdenDetalleComponent implements OnInit {
  // Inyecta ActivatedRoute + Router además del servicio
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(OrdenesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // Signal del objeto completo + cargando arranca en TRUE
  readonly orden = signal<OrdenDetalle | null>(null);
  readonly cargando = signal(true);

  // Columnas para sub-tablas (detalles, pagos, etc.)
  readonly colDetalles = ['producto', 'cantidad', 'precioUnitario', 'descuento', 'subtotal'];
  readonly colPagos = ['metodo', 'monto', 'referencia', 'fecha'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);
  }

  cargar(id: string): void {
    this.cargando.set(true);
    this.svc.obtenerPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (o) => { this.orden.set(o); this.cargando.set(false); },
        error: () => { this.notify.error('Error al cargar'); this.cargando.set(false); },
      });
  }

  // Getters para visibilidad de acciones
  get puedeCancelar(): boolean { /* check estado */ }
  get puedeDevolver(): boolean { /* check estado */ }

  // Acciones de dominio (diálogo → servicio → recargar)
  cancelar(): void { /* ... */ }
  devolver(): void { /* ... */ }
  volver(): void { this.router.navigate(['/ordenes']); }
}
```

**Template del detalle:**

```html
<div class="page-container">
  @if (cargando()) {
    <div class="flex justify-center py-16"><mat-spinner diameter="48" /></div>
  } @else if (orden()) {
    <!-- Page header con botones de acción + volver -->
    <app-page-header [titulo]="'Orden ' + orden()!.numeroOrden" icono="receipt_long">
      <button mat-button (click)="volver()"><mat-icon>arrow_back</mat-icon> Volver</button>
      @if (puedeCancelar) {
        <button mat-raised-button color="warn" (click)="cancelar()">Cancelar orden</button>
      }
    </app-page-header>

    <!-- Grid de cards informativas -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card"><strong>Estado:</strong> <app-estado-badge ... /></div>
      <!-- más cards -->
    </div>

    <!-- Sub-tablas en cards -->
    <div class="card mb-6">
      <h3 class="card-title mb-3">Detalles</h3>
      <table mat-table [dataSource]="orden()!.detalles" class="w-full"> ... </table>
    </div>

    <!-- Secciones condicionales -->
    @if (orden()!.pagos.length > 0) {
      <div class="card mb-6"> ... </div>
    }
  }
</div>
```

### 9.8 Servicio del módulo

#### CRUD simple

```typescript
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Proveedor>> {
    return this.api.getPaginado<Proveedor>('proveedores', params);
  }

  obtenerPorId(id: string): Observable<ProveedorDetalle> {
    return this.api.get<ProveedorDetalle>(`proveedores/${id}`);
  }

  crear(data: ProveedorDto): Observable<Proveedor> {
    return this.api.post<Proveedor>('proveedores', data);
  }

  actualizar(id: string, data: Partial<ProveedorDto>): Observable<Proveedor> {
    return this.api.patch<Proveedor>(`proveedores/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`proveedores/${id}`);
  }
}
```

> **5 métodos estándar:** `listar`, `obtenerPorId`, `crear`, `actualizar`, `eliminar`.
> Todos delegan en `ApiService` que hace unwrap de `ApiResponse<T>`.

#### Transaccional (sin CRUD clásico)

```typescript
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  listar(params?)                              // listado paginado
  obtenerPorId(id)                             // detalle completo
  crear(payload)                               // crear orden de venta
  crearCotizacion(payload)                     // crear cotización
  confirmarCotizacion(id, payload)             // confirmar cotización → orden
  cancelar(id, dto)                            // cancelar con motivo
  devolver(id, payload)                        // devolución parcial/total
}
```

### 9.9 Registro de rutas

En `app.routes.ts`, dentro de los `children` del `ShellComponent`:

```typescript
// CRUD simple — una ruta plana
{
  path: 'proveedores',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () =>
    import('./features/proveedores/proveedores.component')
      .then(m => m.ProveedoresComponent),
},

// Transaccional — dos rutas hermanas (NO children anidados)
{
  path: 'ordenes',
  loadComponent: () =>
    import('./features/ordenes/ordenes.component')
      .then(m => m.OrdenesComponent),
},
{
  path: 'ordenes/:id',
  loadComponent: () =>
    import('./features/ordenes/orden-detalle.component')
      .then(m => m.OrdenDetalleComponent),
},
```

**Reglas:**
- Todas las rutas son `loadComponent` (lazy-loaded, standalone)
- Rutas de detalle (`/:id`) son **hermanas**, no hijas de la ruta de listado
- `canActivate: [roleGuard('ADMIN')]` solo en rutas restringidas por rol
- Sin guard para módulos accesibles por todos los roles autenticados

### 9.10 Registro en sidebar

En `sidebar.component.ts`:

```typescript
interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];   // Si se omite → visible para TODOS los autenticados
}

readonly navItems: NavItem[] = [
  { label: 'Dashboard',       icon: 'dashboard',       route: '/dashboard' },
  { label: 'Punto de Venta',  icon: 'point_of_sale',   route: '/pos',          roles: ['ADMIN', 'CAJERO'] },
  { label: 'Órdenes',         icon: 'receipt_long',    route: '/ordenes' },
  { label: 'Productos',       icon: 'inventory_2',     route: '/productos' },
  { label: 'Categorías',      icon: 'category',        route: '/categorias' },
  { label: 'Clientes',        icon: 'people',          route: '/clientes' },
  { label: 'Proveedores',     icon: 'handshake',       route: '/proveedores',  roles: ['ADMIN'] },
  // ... etc.
];
```

El template filtra con `@if (!item.roles || tieneRol(item.roles))` y usa `routerLinkActive="active-link"`.

### 9.11 Paso a paso — crear un módulo CRUD nuevo

1. **Crear 6 archivos** en `features/nombre/` (list × 3 + form-dialog × 3)
2. **Implementar servicio** en `core/services/` con los 5 métodos estándar
3. **Agregar tipos** en `core/models/api.model.ts` (DTO + interfaz de respuesta)
4. **Implementar el listado** siguiendo §9.3 + §9.4
5. **Implementar el diálogo** siguiendo §9.5 + §9.6
6. **Agregar ruta** en `app.routes.ts` dentro de los children del Shell
7. **Agregar item** en `sidebar.component.ts` con icono e ícono de Material Icons
8. **Verificar** con `ng build --configuration development`

### 9.12 Diferencias entre tipos de módulo

| Aspecto | CRUD simple | CRUD + extras | Transaccional |
|---------|------------|---------------|---------------|
| **Archivos** | 6 (list + form-dialog) | 6 (list + form-dialog con tabs) | 8-10 (list + detalle + action-dialogs) |
| **Rutas** | 1 (`/modulo`) | 1 (`/modulo`) | 2 (`/modulo` + `/modulo/:id`) |
| **Botón "Nuevo"** | Sí | Sí | No (items se crean desde otro flujo) |
| **Editar en lista** | Sí (MatDialog) | Sí (MatDialog) | No |
| **Eliminar en lista** | Sí (ConfirmDialog) | Sí (ConfirmDialog) | No |
| **Click en fila** | No | No | Navega a detalle |
| **Filtros extra** | Ninguno | Selectores avanzados | Chips de estado + date range |
| **Menú de fila** | Editar, Eliminar | Editar, Toggle, Eliminar | Ver detalle |
| **Empty state** | Con `textoAccion` + `(accion)` | Con `textoAccion` + `(accion)` | Solo `submensaje` (sin acción) |
| **Router** | No se inyecta | No se inyecta | Sí (para navegación a detalle) |
| **Servicio** | 5 métodos CRUD | 5 CRUD + extras | list + getById + acciones de dominio |

---

## 10. Manejo de estado y signals

**Filosofía:** este proyecto usa **Angular Signals** como mecanismo primario de reactividad. No existe ningún `BehaviorSubject`, `ReplaySubject` ni store externo (NgRx/Elf). RxJS se reserva exclusivamente para streams HTTP y debounced search.

### 10.1 Primitivas utilizadas — inventario real

| Primitiva | Importar de | Instancias | Dónde |
|-----------|-------------|------------|-------|
| `signal()` | `@angular/core` | **50+** | Todos los componentes y 2 servicios |
| `computed()` | `@angular/core` | **9** | `AuthService`(3), `PosComponent`(5), `CobrarDialogComponent`(1) |
| `effect()` | `@angular/core` | **1** | `RolDirective` |
| `toSignal()` | `@angular/core/rxjs-interop` | **1** | `ShellComponent` (BreakpointObserver) |
| `.asReadonly()` | (método de WritableSignal) | **1** | `AuthService` |
| `.set()` | (método de WritableSignal) | **~80** | Universal — es el ÚNICO método de mutación |
| `.update()` | (método de WritableSignal) | **0** | No se usa en ningún lugar |

### 10.2 Estado global — servicios con signals

Solo **dos** servicios manejan estado reactivo vía signals. El resto (`TokenService`, `InactividadService`, `ApiService`, etc.) son stateless o usan propiedades plain.

#### Patrón A: private → asReadonly + computed (AuthService)

```typescript
// auth.service.ts — PATRÓN GOLD STANDARD
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Signal privado — solo el servicio puede mutar */
  private readonly _usuario = signal<Usuario | null>(
    this.tokenService.getUsuarioGuardado(),
  );

  /** Exposición de solo lectura — componentes leen, no escriben */
  readonly usuario = this._usuario.asReadonly();

  /** Computed derivados del signal base */
  readonly estaAutenticado = computed(
    () => !!this._usuario() && !this.tokenService.estaExpirado(),
  );
  readonly esAdmin = computed(() => this._usuario()?.rol === 'ADMIN');
  readonly esCajero = computed(() => this._usuario()?.rol === 'CAJERO');

  /** Solo métodos del servicio mutan el signal */
  login(creds: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', creds).pipe(
      tap((res) => {
        this.tokenService.guardar(res.token, res.usuario);
        this._usuario.set(res.usuario);     // ← mutación controlada
      }),
    );
  }

  logout(): void {
    this.tokenService.limpiar();
    this._usuario.set(null);               // ← mutación controlada
    this.router.navigate(['/auth/login']);
  }
}
```

**Por qué este patrón:** encapsula la mutación. Ningún componente puede hacer `auth._usuario.set(...)` porque es `private`. Los `computed` derivan automáticamente — no hay que notificar manualmente.

#### Patrón B: signal público (TurnosService)

```typescript
// turnos.service.ts — signal público, mutado por tap()
@Injectable({ providedIn: 'root' })
export class TurnosService {
  readonly turnoActivo = signal<TurnoCaja | null>(null);

  obtenerActivo(): Observable<TurnoCaja | null> {
    return this.api.get<TurnoCaja>('turnos-caja/activo').pipe(
      tap((turno) => this.turnoActivo.set(turno)),  // ← sincroniza signal
    );
  }

  abrir(dto: AbrirTurnoDto): Observable<TurnoCaja> {
    return this.api.post<TurnoCaja>('turnos-caja/abrir', dto).pipe(
      tap((turno) => this.turnoActivo.set(turno)),
    );
  }

  cerrar(id: string, dto: CerrarTurnoDto): Observable<TurnoCaja> {
    return this.api.post<TurnoCaja>(`turnos-caja/${id}/cerrar`, dto).pipe(
      tap(() => this.turnoActivo.set(null)),
    );
  }
}
```

**Nota:** `turnoActivo` es un `WritableSignal` público. `PosComponent` lo referencia directamente: `readonly turnoActivo = this.turnosSvc.turnoActivo;`. Funciona porque solo el servicio muta vía `tap()`, pero idealmente debería usar `asReadonly()` como `AuthService`.

#### Servicios sin signals

| Servicio | Estrategia | Por qué |
|----------|-----------|---------|
| `TokenService` | `tokenEnMemoria` (plain string) + `sessionStorage` | No necesita reactividad — se lee sincrónicamente en interceptors |
| `InactividadService` | `ultimaActividad` (plain number) + `setInterval` | Corre fuera de zona Angular (`zone.runOutsideAngular`) para no disparar change detection |
| `ApiService` | Stateless | Solo envuelve `HttpClient` con prefijo de URL |
| `NotificationService` | Stateless | Solo abre `MatSnackBar` |

### 10.3 Estado local — patrones por tipo de componente

#### Tipo 1: Lista CRUD (productos, clientes, almacenes, proveedores, categorías)

```typescript
// Patrón estándar — 5-6 signals
export class ProductosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly busqueda = signal('');
  readonly pagina = signal(0);        // ← 0-based para MatPaginator
  readonly porPagina = signal(20);

  cargar(): void {
    this.cargando.set(true);
    const params = {
      pagina: this.pagina() + 1,      // ← API es 1-based
      porPagina: this.porPagina(),
    };
    if (this.busqueda()) params['buscar'] = this.busqueda();

    this.svc.listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.productos.set(res.datos);
          this.total.set(res.meta.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
```

#### Tipo 2: Componente complejo (PosComponent)

```typescript
// POS — 9 signals + 5 computed
export class PosComponent implements OnInit {
  // ─── Estado referenciado de servicio ───
  readonly turnoActivo = this.turnosSvc.turnoActivo;

  // ─── Signals de UI ─────────────────────
  readonly categorias = signal<CategoriaArbol[]>([]);
  readonly categoriaSeleccionada = signal<string | null>(null);
  readonly productos = signal<Producto[]>([]);
  readonly cargandoProductos = signal(false);

  // ─── Carrito (state puro) ──────────────
  readonly lineas = signal<LineaCarrito[]>([]);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly listaPrecio = signal<ListaPrecio>(1);
  readonly notas = signal('');

  // ─── Computed (5 derivaciones) ─────────
  readonly subtotal = computed(() =>
    this.lineas().reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0),
  );
  readonly totalDescuento = computed(() => /* reduce sobre lineas */ );
  readonly totalImpuesto = computed(() => /* reduce con cálculo de IVA */ );
  readonly total = computed(() => /* subtotal - descuento + impuesto */ );
  readonly totalItems = computed(() =>
    this.lineas().reduce((sum, l) => sum + l.cantidad, 0),
  );
}
```

#### Tipo 3: Dialog con formulario

```typescript
// Patrón dialog — signals solo para UI, FormGroup para datos
export class ProductoFormDialogComponent {
  readonly guardando = signal(false);
  readonly categorias = signal<Categoria[]>([]);   // datos para selects
  readonly form = this.fb.nonNullable.group({ ... });

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    // ... HTTP call ...
  }
}
```

**Regla:** los dialogs usan `signal()` para estado de UI (`guardando`, `cargando`, datos de selects) pero `FormGroup` para los datos del formulario. Nunca signals para campos de formulario.

### 10.4 computed() — cuándo y dónde

`computed()` solo se usa en **9 ocasiones**, concentradas en dos archivos:

| Ubicación | Señal derivada | Depende de |
|-----------|---------------|-----------|
| `AuthService` | `estaAutenticado` | `_usuario()` + `tokenService.estaExpirado()` |
| `AuthService` | `esAdmin` | `_usuario()?.rol` |
| `AuthService` | `esCajero` | `_usuario()?.rol` |
| `PosComponent` | `subtotal` | `lineas()` |
| `PosComponent` | `totalDescuento` | `lineas()` |
| `PosComponent` | `totalImpuesto` | `lineas()` |
| `PosComponent` | `total` | `lineas()` |
| `PosComponent` | `totalItems` | `lineas()` |
| `CobrarDialog` | `montoPagado` | `pagoUnico()` + form values |

**Cuándo usar `computed()`:**
- El valor se deriva **puramente** de otros signals (sin side effects)
- Se lee en el template o en otros computed
- En el POS, los 5 computed evitan recalcular totales manualmente en cada mutación del carrito

**Cuándo NO se usa (y está bien):**
- Los componentes lista no tienen computed porque no derivan valores — muestran el array directo
- Los dialogs usan `get` de TypeScript para cálculos simples sobre FormGroup (como `cambio`, `faltante` en `CobrarDialog`)

### 10.5 effect() — uso mínimo y controlado

Solo existe **1 effect** en toda la aplicación:

```typescript
// rol.directive.ts — directiva estructural *appRol
@Directive({ selector: '[appRol]', standalone: true })
export class RolDirective {
  private readonly auth = inject(AuthService);

  constructor() {
    // effect() en constructor → injection context automático
    effect(() => {
      this.auth.usuario();     // ← se suscribe al signal
      this.actualizar();       // ← muestra/oculta elemento del DOM
    });
  }

  private actualizar(): void {
    const usuario = this.auth.usuario();
    const tieneRol = !!usuario && this.rolesPermitidos.includes(usuario.rol);
    if (tieneRol && !this.mostrado) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.mostrado = true;
    } else if (!tieneRol && this.mostrado) {
      this.viewContainer.clear();
      this.mostrado = false;
    }
  }
}
```

**Por qué `effect()` aquí:** la directiva necesita ejecutar un side effect (manipular el DOM vía `ViewContainerRef`) cada vez que cambia el usuario. No hay valor derivado que devolver → `computed()` no aplica.

**Regla:** evitar `effect()` excepto para side effects genuinos que no pueden modelarse como `computed()`.

### 10.6 toSignal() — puente Observable → Signal

Solo existe **1 instancia**:

```typescript
// shell.component.ts — convierte BreakpointObserver a signal
export class ShellComponent implements OnInit, OnDestroy {
  private readonly bp = inject(BreakpointObserver);

  readonly isMobile = toSignal(
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(
      map((result) => result.matches),
    ),
    { initialValue: false },
  );
}
```

**Por qué `toSignal()` aquí:** `BreakpointObserver` emite un Observable perpetuo. `toSignal()` lo convierte para leer en el template como `@if (isMobile())` sin `| async`. El `{ initialValue: false }` evita `undefined`.

**Cuándo usar `toSignal()`:**
- Observable de larga vida (breakpoints, WebSocket, route params)
- Siempre proveer `initialValue` para evitar `Signal<T | undefined>`

**Cuándo NO:**
- Para HTTP requests puntuales → usar `.subscribe()` + `signal.set()` es más claro
- Este proyecto no usa `toSignal()` para HTTP porque necesita control fino de cargando/error

### 10.7 Mutaciones inmutables — .set() exclusivamente

El proyecto usa **exclusivamente `.set()`** para mutar signals. `.update()` no se usa nunca.

```typescript
// ─── Agregar al carrito ──────
this.lineas.set([
  ...lineasActuales,
  { productoId: producto.id, nombre: producto.nombre, cantidad: 1, ... },
]);

// ─── Modificar cantidad ──────
this.lineas.set(
  this.lineas().map((l) =>
    l.productoId === productoId ? { ...l, cantidad } : l,
  ),
);

// ─── Eliminar línea ──────────
this.lineas.set(
  this.lineas().filter((l) => l.productoId !== productoId),
);

// ─── Reset ───────────────────
this.lineas.set([]);
```

**Patrón común:** leer el valor actual con `this.signal()`, transformar inmutablemente con `map`/`filter`/spread, y pasar el nuevo array a `.set()`.

**¿Por qué no `.update()`?** Con `.set()` el código es más explícito y legible. `.update(prev => ...)` es equivalente pero el equipo prefiere separar la lectura de la escritura.

### 10.8 takeUntilDestroyed — suscripciones seguras

**Componentes de página (21+):** SIEMPRE usan `takeUntilDestroyed`:

```typescript
export class ProductosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  cargar(): void {
    this.svc.listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ ... });
  }

  eliminar(id: string): void {
    this.svc.eliminar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ ... });
  }
}
```

**Dialogs (modales):** NO necesitan `takeUntilDestroyed` porque:
- Se destruyen al cerrar → la suscripción se completa con el HTTP response
- Son modales sincrónicos — no persisten en background

```typescript
// ✅ Correcto en dialogs — sin takeUntilDestroyed
guardar(): void {
  this.svc.crear(this.form.getRawValue())
    .subscribe({
      next: (res) => this.dialogRef.close(res),
      error: () => this.guardando.set(false),
    });
}
```

**Regla:** usar `takeUntilDestroyed(this.destroyRef)` en todo `.subscribe()` de componentes que viven en rutas. Omitir en dialogs.

### 10.9 Subject para debounced search — único uso de RxJS para estado

Solo **2 instancias** de `Subject` existen, ambas para búsqueda con debounce:

```typescript
// pos.component.ts y cliente-dialog.component.ts
readonly busqueda$ = new Subject<string>();

ngOnInit(): void {
  this.busqueda$
    .pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((term) => {
      this.terminoBusqueda = term;
      this.cargarProductos();
    });
}
```

**Por qué `Subject` aquí:** los operadores `debounceTime` y `distinctUntilChanged` no tienen equivalente nativo en Signals. Este es el caso legítimo para RxJS.

**En el resto de componentes:** la búsqueda se maneja con un signal simple (`busqueda = signal('')`) y recargas explícitas, sin debounce.

### 10.10 FormGroup + signals — coexistencia

| Responsabilidad | Mecanismo | Ejemplo |
|----------------|-----------|---------|
| Datos del formulario | `FormGroup` (ReactiveFormsModule) | `form.get('nombre')?.value` |
| Estado de UI | `signal()` | `guardando = signal(false)` |
| Datos para selects | `signal()` | `categorias = signal<Cat[]>([])` |
| Validación | `FormGroup` validators | `Validators.required`, `Validators.min` |
| Valores derivados del form | TypeScript `get` | `get cambio(): number { ... }` |
| Valores derivados de signals | `computed()` | `montoPagado = computed(() => ...)` |

**Regla:** nunca crear un `signal()` para representar un campo de formulario. Los signals gestionan el **estado de UI** (cargando, guardando, listas de opciones), mientras que `FormGroup` gestiona los **datos ingresados por el usuario**.

```typescript
// ✅ CORRECTO — signals para UI, FormGroup para datos
readonly guardando = signal(false);
readonly proveedores = signal<Proveedor[]>([]);
readonly form = this.fb.nonNullable.group({
  nombre: ['', Validators.required],
  proveedorId: ['', Validators.required],
});

// ❌ INCORRECTO — nunca hacer esto
readonly nombre = signal('');
readonly proveedorId = signal('');
```

### 10.11 Inconsistencias conocidas

| Caso | Detalle | Impacto |
|------|---------|---------|
| **Paginación mixta** | `productos`, `clientes`, `almacenes` usan `pagina = signal(0)` + `porPagina = signal(20)`; `ordenes`, `inventario`, `entregas` usan `pagina = 1` (plain field) | Funcional pero inconsistente. Los nuevos módulos deben usar signals. |
| **TurnosService público** | `turnoActivo` es `WritableSignal` público (cualquier componente puede mutar). Debería usar `private + asReadonly()` como `AuthService`. | Bajo riesgo porque solo el servicio muta vía `tap()`. |
| **ShellComponent sin takeUntilDestroyed** | `router.events.subscribe()` en `ngOnInit` sin unsubscribe. | Sin impacto real — ShellComponent vive toda la sesión. Pero inconsistente con el patrón del resto. |

### 10.12 Reglas para nuevos desarrollos

| # | Regla |
|---|-------|
| 1 | **Signals para todo estado local** — `signal()` para datos, `cargando`, `busqueda`, `pagina`, etc. |
| 2 | **`computed()` solo para derivaciones puras** — totales, filtros, transformaciones sin side effects |
| 3 | **`effect()` solo como último recurso** — si necesitas side effects DOM. Preferir `computed()` + template binding |
| 4 | **`toSignal()` para observables perpetuos** — breakpoints, WebSocket. Siempre con `{ initialValue }` |
| 5 | **`.set()` siempre** — no usar `.update()`. Leer → transformar → `.set()` |
| 6 | **Mutaciones inmutables** — nunca `push()`, `splice()` en arrays de signals. Usar spread, `map`, `filter` |
| 7 | **`takeUntilDestroyed` en páginas** — en todo `.subscribe()` de componentes de ruta |
| 8 | **Sin takeUntilDestroyed en dialogs** — los modales se destruyen al cerrar, no persisten |
| 9 | **Servicios: private → asReadonly** — para signals globales, seguir patrón AuthService |
| 10 | **FormGroup para datos de formulario** — signals solo para estado de UI asociado |
| 11 | **Sin BehaviorSubject/stores** — no introducir NgRx, Elf, ni RxJS subjects para estado |
| 12 | **Subject solo para debounce** — si necesitas `debounceTime`/`distinctUntilChanged`, es válido |
| 13 | **Paginación siempre con signals** — `pagina = signal(0)`, `porPagina = signal(20)` |

---

## 11. Seguridad y buenas prácticas

> **Documento detallado:** ver `SEGURIDAD.md` en la raíz del proyecto para la explicación exhaustiva full-stack con justificación de cada decisión, flujos completos, diagramas y inventario de archivos de ambos proyectos (frontend + backend).

### 11.1 Arquitectura de seguridad — 4 capas

| Capa | Dónde | Qué protege |
|------|-------|-------------|
| **1. Nginx** | `Back_ERP/nginx/nginx.conf` + `Front_ERP-1/docker/nginx.conf` | Rate limiting por zona, security headers (CSP, HSTS, X-Frame-Options), bloqueo `/api-docs` en producción |
| **2. Express middleware** | `Back_ERP/src/middlewares/seguridad.ts` + `Back_ERP/src/app.ts` | Helmet, CORS restrictivo, HPP, Content-Type validation, ocultar tecnología, JSON body limit 10MB |
| **3. Lógica de negocio** | `Back_ERP/src/modulos/auth/` + `Back_ERP/src/middlewares/` | JWT verify + sesión DB por request, bcrypt 12 rounds, lockout 5 intentos, Zod validation, XSS sanitization |
| **4. Angular** | `Front_ERP-1/src/app/core/` | Token en memoria, guards, interceptors, auto-logout 30 min, APP_INITIALIZER, sanitización HTML automática |

### 11.2 Autenticación — resumen del flujo

```
Login → limitarLogin(5/15min) → Zod validate → bcrypt compare → lockout check
      → JWT sign(8h) → sesión en DB (SHA-256 del token) → response {token, usuario}
      → TokenService.guardar(memoria + sessionStorage) → _usuario.set()
```

**Archivos clave del flujo:**

| Rol | Archivo |
|-----|---------|
| Login UI | `src/app/features/auth/login.component.ts` |
| HTTP + estado | `src/app/core/services/auth.service.ts` |
| Token storage | `src/app/core/services/token.service.ts` |
| Inyectar Bearer | `src/app/core/interceptors/auth.interceptor.ts` |
| Backend auth | `Back_ERP/src/modulos/auth/auth.service.ts` |
| JWT verificar | `Back_ERP/src/middlewares/autenticar.ts` |

### 11.3 Almacenamiento del token

| Mecanismo | Ubicación | Propósito |
|-----------|-----------|-----------|
| `tokenEnMemoria` (variable privada) | `token.service.ts` | Almacenamiento primario — no accesible vía DOM |
| `sessionStorage['erp_tkn']` | `token.service.ts` | Fallback para recarga F5 — se limpia al cerrar pestaña |
| `sessionStorage['erp_usr']` | `token.service.ts` | Rehidratación de datos del usuario post-recarga |

**Expiración:** `estaExpirado()` decodifica el JWT client-side y devuelve `true` si `now >= exp - 60s` (margen de seguridad).

**Interceptor:** solo envía token a URLs que empiezan con `environment.apiUrl` — nunca a terceros.

### 11.4 Autorización RBAC — frontend

```typescript
// app.routes.ts — guards en rutas
{
  path: 'compras',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/compras/compras.component'),
},
{
  path: 'turnos-caja',
  canActivate: [roleGuard('ADMIN', 'CAJERO')],
  loadComponent: () => import('./features/turnos/turnos.component'),
},
```

```html
<!-- Template — directiva *appRol -->
<button *appRol="'ADMIN'">Solo Admin</button>
<mat-nav-list>
  <a *appRol="['ADMIN', 'CAJERO']" mat-list-item routerLink="/turnos-caja">
    Turnos de Caja
  </a>
</mat-nav-list>
```

**Mapa de protección:**

| Ruta | Guard | Roles permitidos |
|------|-------|-----------------|
| `/auth/login` | Ninguno | Pública |
| `/dashboard`, `/pos`, `/productos`, `/clientes`, `/categorias` | `authGuard` | Todos |
| `/ordenes`, `/inventario`, `/entregas` | `authGuard` | Todos |
| `/compras` | `roleGuard('ADMIN')` | Solo ADMIN |
| `/proveedores`, `/almacenes`, `/usuarios`, `/reportes`, `/configuracion` | `roleGuard('ADMIN')` | Solo ADMIN |
| `/turnos-caja` | `roleGuard('ADMIN', 'CAJERO')` | ADMIN o CAJERO |

### 11.5 Interceptors

#### Auth Interceptor (`auth.interceptor.ts`)

```typescript
// Solo inyecta token para requests al propio backend
if (!req.url.startsWith(environment.apiUrl)) return next(req);
if (tokenService.estaExpirado()) return next(req);  // no enviar token expirado

const authReq = req.clone({
  setHeaders: { Authorization: `Bearer ${token}` },
});
return next(authReq);
```

#### Error Interceptor (`error.interceptor.ts`)

| Status | Acción | Retry |
|--------|--------|-------|
| `0` | "Error de conexión. Verifica tu red." | No |
| `401` | Limpiar token → login → "Sesión expirada" | No |
| `403` | "No tienes permisos…" | No |
| `429` | "Demasiadas solicitudes…" | No |
| `502, 503, 504` | Reintenta (solo GET/HEAD/OPTIONS) | 2 reintentos, backoff 1s→2s |
| Otro | `err.error?.mensaje \|\| 'Error inesperado'` | No |

### 11.6 Gestión de sesiones

| Mecanismo | Archivo | Detalle |
|-----------|---------|---------|
| **Inactividad** | `inactividad.service.ts` | 30 min timeout, verifica cada 60s, throttle 2s. Corre fuera de NgZone. |
| **APP_INITIALIZER** | `app.config.ts` | `GET /auth/perfil` al arrancar → valida sesión contra backend |
| **Token expirado** | `token.service.ts` | `estaExpirado()` revisa `exp - 60s` |
| **Sesión en DB** | `Back_ERP/src/middlewares/autenticar.ts` | Cada request valida `sesion.activo && usuario.activo` en Prisma |
| **Revocación instant** | Backend | Admin desactiva sesión en DB → siguiente request falla |

### 11.7 Content Security Policy

CSP configurada en **3 capas** (defense in depth):

1. **Meta tag** en `src/index.html` — funciona sin servidor
2. **Frontend nginx** en `docker/nginx.conf` — header HTTP
3. **Backend Helmet** en `Back_ERP/src/app.ts` — header HTTP

```
default-src 'self';
script-src  'self';
style-src   'self' 'unsafe-inline';   ← requerido por Angular Material
font-src    'self' data:;
img-src     'self' data: blob:;
connect-src 'self';
object-src  'none';
frame-src   'none';
base-uri    'self';
form-action 'self';
worker-src  'self';
```

### 11.8 Reglas de seguridad para nuevos desarrollos

| # | Regla |
|---|-------|
| 1 | **Nunca `[innerHTML]`** — Angular sanitiza por defecto; no usar `bypassSecurityTrust*` |
| 2 | **Bearer en header** — nunca enviar token como query param ni en cookies |
| 3 | **Token solo al propio API** — el auth interceptor ya filtra por `environment.apiUrl` |
| 4 | **Guards en ambas capas** — toda ruta protegida en frontend (`roleGuard`) Y backend (`requerirRol`) |
| 5 | **Validar en el backend** — la validación frontend es UX, no seguridad. Zod es la puerta real |
| 6 | **Mensajes genéricos en auth** — nunca "usuario no encontrado" vs "contraseña incorrecta" |
| 7 | **`takeUntilDestroyed` en subscribes** — evitar memory leaks (ya documentado en §10.8) |
| 8 | **No `console.log` en producción** — solo permitido en `environment.ts` dev |
| 9 | **`environment.apiUrl` relativo en prod** — `/api/v1` (same-origin, sin CORS en producción) |
| 10 | **Sanitizar input en backend** — usar `sanitizarObjeto(dto)` antes de Prisma create/update |

### 11.9 Hallazgos y mejoras pendientes

| Severidad | Hallazgo | Acción |
|-----------|----------|--------|
| **MEDIA** | `auth.service.ts` (backend) no sanitiza `dto.nombre` en registro | Agregar `sanitizarObjeto(dto)` |
| **BAJA** | Frontend valida contraseña `minLength(6)`, backend exige `min(8)` | Sincronizar a `minLength(8)` |
| **BAJA** | Dockerfile frontend sin `USER nginx` explícito | Agregar `USER nginx` |
| **INFO** | `'unsafe-inline'` en style-src (requerido por Material) | Aceptado — limitación de Material |
| **INFO** | Sin refresh tokens (JWT 8h + inactividad 30min) | Aceptado — cubre turno laboral |

---

## 12. Testing y calidad

### 12.1 Estado actual — auditoría honesta

| Aspecto | Frontend | Backend |
|---------|----------|---------|
| **Test runner configurado** | ❌ No (Karma/Jest ausentes) | ⚠️ Jest 30 instalado pero sin archivos de test |
| **Archivos `*.spec.ts`** | 0 | 0 |
| **E2E** | ❌ No | ⚠️ `test-flujo-completo.sh` (curl, 391 líneas, solo valida status codes) |
| **ESLint** | ❌ No configurado | ❌ `"lint"` es solo `tsc --noEmit` |
| **Prettier** | ❌ No configurado | ❌ No configurado |
| **EditorConfig** | ❌ No existe | ❌ No existe |
| **CI/CD** | ❌ No hay workflows | ❌ El script `"ci"` pasa con `--passWithNoTests` |
| **Pre-commit hooks** | ❌ No (sin husky) | ❌ No (sin husky) |
| **TypeScript strict** | ✅ `strict: true` + Angular strict templates | ✅ `strict: true` + `noUnusedLocals/Parameters` |
| **Budgets** | ✅ initial < 750kb warn / < 1.5MB error | N/A |
| **`console.log`** | ✅ Solo 1 (`main.ts` bootstrap error) | ✅ Solo 2 (`env.ts` — antes de iniciar logger) |
| **TODO/FIXME/HACK** | ✅ 0 | ✅ 0 |
| **`@ts-ignore`** | ✅ 0 | ✅ 0 |

### 12.2 Uso de `any` — inventario real

**Frontend — 8 ocurrencias:**

| Archivo | Línea | Uso |
|---------|-------|-----|
| `cobrar-dialog.component.ts` | 153 | `as any[]` |
| `devolucion-dialog.component.ts` | 76 | `as any[]` |
| `entrega-detalle.component.ts` | 144 | `as any` |
| `abrir-turno-dialog.component.ts` | 75 | `as any` |
| `cerrar-turno-dialog.component.ts` | 52 | `as any` |
| `usuario-registro-dialog.component.ts` | 101 | `as any` |
| `compra-form-dialog.component.ts` | 102, 111 | `as any[]`, `as any` |

**Backend — 31 ocurrencias**, patrón recurrente: `req.query as any` en todos los controllers y `resultado.meta as any`. Es un gap sistémico de tipos entre Zod y la capa de servicio.

### 12.3 Lo que sí funciona como gate de calidad

Aunque no hay tests formales, el proyecto tiene gates implícitos:

| Gate | Herramienta | Qué previene |
|------|-------------|-------------|
| **TypeScript strict** | `tsc --noEmit` | Errores de tipos, null safety, parámetros no usados |
| **Angular strict templates** | `strictTemplates: true` | Bindings inválidos, propiedades inexistentes |
| **Build de producción** | `ng build` | Bundle budgets, imports rotos, dead code |
| **Prisma typed client** | `prisma generate` | Queries con campos inexistentes, tipos incorrectos en DB |
| **Zod validation** | Runtime | Datos de entrada inválidos (backend) |

### 12.4 Plan de testing — qué implementar y en qué orden

#### Prioridad 1: Linting y formateo (bajo esfuerzo, alto impacto)

```bash
# Frontend
ng add @angular-eslint/schematics
npm install -D prettier eslint-config-prettier

# Backend
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier

# Ambos
npm install -D husky lint-staged
npx husky init
```

Configuración recomendada:
- `@angular-eslint` con regla `@typescript-eslint/no-explicit-any: warn`
- Prettier: `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`
- husky pre-commit: `lint-staged` (format + lint solo archivos cambiados)
- husky pre-push: `tsc --noEmit` + `npm test`

#### Prioridad 2: Unit tests backend (medio esfuerzo, alto impacto)

```bash
# Ya tiene jest + supertest instalados. Falta:
# 1. Crear jest.config.ts con path aliases
# 2. Escribir tests para servicios críticos
```

**Servicios a testear primero (por riesgo de negocio):**

| Servicio | Tests mínimos | Por qué primero |
|----------|--------------|-----------------|
| `auth.service.ts` | Login exitoso, login fallido, lockout, horario | Seguridad — un bug aquí es crítico |
| `ordenes.service.ts` | Crear orden, calcular totales, cambiar estado | Dinero — afecta facturación directamente |
| `inventario.service.ts` | Movimiento stock, transferencia, ajuste | Integridad de datos — stock incorrecto = pérdidas |
| `compras.service.ts` | Crear compra, actualizar stock post-compra | Cadena de suministro — errores se propagan |
| sanitizar.ts | Strings con HTML/scripts | Seguridad — XSS prevention |

**Patrón de test recomendado (backend):**

```typescript
// __tests__/auth.service.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { prismaMock } from './helpers/prisma-mock';

describe('AuthService.login', () => {
  it('debe rechazar credenciales inválidas con mensaje genérico', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    await expect(authService.login(dto, ip, ua))
      .rejects.toThrow('Credenciales inválidas');
  });

  it('debe bloquear cuenta tras 5 intentos fallidos', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      ...mockUser, intentosFallidos: 4,
    });
    // ... verify bloqueadoHasta is set
  });
});
```

#### Prioridad 3: Tests de componente Angular (medio esfuerzo, medio impacto)

```bash
# Opción A: Karma + Jasmine (estándar Angular)
ng generate config karma

# Opción B: Jest (más rápido, sin browser)
npm install -D jest @angular-builders/jest @types/jest
```

**Componentes a testear primero:**

| Componente | Tests mínimos |
|-----------|--------------|
| `LoginComponent` | Validación form, submit, error display |
| `PosComponent` | Agregar/eliminar líneas, computed totales |
| `ConfirmDialogComponent` | Render, confirmar, cancelar |
| `PageHeaderComponent` | Input binding, botón acción |
| `MonedaPipe` | Formatos de moneda, edge cases |
| `RolDirective` | Mostrar/ocultar según rol |

**Patrón de test recomendado (Angular):**

```typescript
// login.component.spec.ts
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('debe deshabilitar el botón si el formulario es inválido', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBeTrue();
  });

  it('debe mostrar error del servidor', () => {
    // ...
  });
});
```

#### Prioridad 4: E2E con Playwright (alto esfuerzo, alto impacto)

```bash
# Frontend
npm install -D @playwright/test
npx playwright install
```

**Flujos E2E críticos:**

| Flujo | Pasos | Criticidad |
|-------|-------|-----------|
| **Login** | Abrir → credenciales → dashboard | Alta |
| **Venta POS** | Login → abrir turno → buscar producto → agregar → cobrar → ticket | Alta |
| **CRUD producto** | Login → productos → crear → editar → eliminar | Media |
| **Gestión orden** | Login → órdenes → crear → cambiar estado → ver detalle | Media |
| **Auto-logout** | Login → esperar 30 min → verificar redirect a login | Media |

#### Prioridad 5: CI/CD con GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd Front_ERP-1 && npm ci
      - run: cd Front_ERP-1 && npx ng lint
      - run: cd Front_ERP-1 && npx ng build --configuration production
      # - run: cd Front_ERP-1 && npx ng test --no-watch --code-coverage
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd Back_ERP && npm ci
      - run: cd Back_ERP && npm run typecheck
      - run: cd Back_ERP && npm test -- --coverage
      - run: cd Back_ERP && npm run build
```

### 12.5 Scripts existentes en package.json

**Frontend (`Front_ERP-1/package.json`):**

| Script | Comando | Propósito |
|--------|---------|-----------|
| `start` | `ng serve` | Desarrollo local |
| `build` | `ng build` | Build producción |
| `watch` | `ng build --watch --configuration development` | Build en watch mode |

**Backend (`Back_ERP/package.json`):**

| Script | Comando | Propósito |
|--------|---------|-----------|
| `dev` | `tsx watch src/server.ts` | Desarrollo con hot reload |
| `build` | `tsc` | Compilar a JS |
| `start` | `node dist/server.js` | Producción |
| `typecheck` | `tsc --noEmit` | Verificar tipos |
| `test` | `jest --passWithNoTests` | ⚠️ Pasa sin tests |
| `test:ci` | `jest --passWithNoTests --ci --coverage` | ⚠️ Pasa sin tests |
| `test:e2e` | `bash test-flujo-completo.sh` | E2E manual con curl |
| `ci` | `typecheck && test:ci && build` | ⚠️ Gate falso |
| `lint` | `tsc --noEmit` | Solo typechecking (no es lint real) |

### 12.6 Herramientas de calidad ya configuradas

| Herramienta | Archivo | Efecto |
|-------------|---------|--------|
| **TypeScript strict** | `tsconfig.json` (ambos) | `strict: true`, `noImplicitAny`, `noUnusedLocals`, `strictNullChecks` |
| **Angular strict** | `angular.json` | `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers` |
| **Angular budgets** | `angular.json` | initial < 750kb warn, < 1.5MB error; component styles < 8kb/12kb |
| **Prisma typed** | `schema.prisma` | Queries tipadas en tiempo de compilación |
| **Winston logger** | `logger.ts` | Logging estructurado — JSON en prod, colorizado en dev |

### 12.7 Checklist antes de commit (actualizada)

#### Obligatorio (gates actuales)

- [ ] `ng build --configuration development` sin errores (frontend)
- [ ] `npm run typecheck` sin errores (backend)
- [ ] No hay `console.log` nuevos (solo errores pre-logger en `env.ts` y `main.ts`)
- [ ] Los componentes usan `standalone: true`
- [ ] Los imports son mínimos (solo lo necesario por componente)

#### Patrones de código

- [ ] Todos los `subscribe()` en páginas tienen `takeUntilDestroyed(this.destroyRef)`
- [ ] Los dialogs NO usan `takeUntilDestroyed` (innecesario — ver §10.8)
- [ ] Los diálogos de formulario tienen `disableClose: true`
- [ ] Los botones de eliminación abren `ConfirmDialogComponent`
- [ ] Las tablas tienen `<app-empty-state>` para 0 resultados
- [ ] Los formularios muestran errores de validación visibles (`@if (field.errors?.['...'])`)
- [ ] Signals para estado de UI (`cargando`, `guardando`), FormGroup para datos
- [ ] Mutaciones inmutables con `.set()` (spread/map/filter, nunca push/splice)
- [ ] Paginación con signals: `pagina = signal(0)`, `porPagina = signal(20)`

#### Seguridad

- [ ] Nuevas rutas tienen guard en frontend Y middleware en backend
- [ ] Nuevos endpoints backend usan `validar(Schema)` antes del controller
- [ ] Datos de entrada sanitizados con `sanitizarObjeto(dto)` antes de Prisma
- [ ] Sin `[innerHTML]` ni `bypassSecurityTrust*`
- [ ] Sin `any` nuevos (los 8 existentes del frontend se pueden refactorizar incrementalmente)

#### Evitar

- [ ] No introducir `BehaviorSubject` / stores externos — usar signals
- [ ] No usar `.update()` en signals — usar `.set()` con lectura explícita
- [ ] No usar `NgModule` — todo es standalone
- [ ] No duplicar `appearance="outline"` en `mat-form-field` — ya es global vía `MAT_FORM_FIELD_DEFAULT_OPTIONS`

---

## 13. Checklist de lanzamiento

### Pre-producción ✅

- [x] Todos los módulos funcionales (15 features + auth)
- [x] shared/ con todos los componentes reutilizables (6 componentes, 5 pipes, 1 directiva)
- [x] Responsive verificado en 3 breakpoints (mobile, tablet, desktop)
- [x] Dark mode con `prefers-color-scheme: dark` (15+ overrides Material)
- [x] A11y: skip-nav, ARIA roles, focus-visible, cdkFocusInitial
- [x] Estilos de impresión (`@media print`)
- [x] PWA: service worker, manifest, 8 iconos, offline awareness
- [x] Build de producción sin errores
- [x] Bundle size dentro de budgets (initial < 750kb warning, < 1.5MB error; component < 8kb/12kb)
- [x] CSP headers configurados en Nginx + `index.html` meta tag (3 capas — ver §11.7)
- [x] Environment prod apuntando a `/api/v1` (relativo, mismo origen)
- [x] Docker multi-stage + Nginx con gzip + security headers
- [x] Favicon, meta tags y manifest actualizados
- [x] Tailwind CSS v4 con configuración CSS-first (sin `tailwind.config.js`)
- [x] Snackbar panelClasses (`snack-exito`/`snack-error`) estilizados en `globals.css`
- [x] `MAT_FORM_FIELD_DEFAULT_OPTIONS` con `appearance: 'outline'` global

### Documentación ✅

- [x] §1 — Estado actual del proyecto (dependencias, historial, resumen)
- [x] §2 — Arquitectura y estructura de carpetas (árbol completo, principios)
- [x] §3 — Plan de desarrollo por fases (6 fases completadas con detalle)
- [x] §4 — Componentes shared/ — referencia de interfaces y uso
- [x] §5 — Módulos feature/ — referencia de estructura, rutas, sidebar
- [x] §6 — Convenciones de código Angular (naming, estructura, reglas)
- [x] §7 — Tailwind CSS v4 (52 utility classes, tokens, dark mode, responsive)
- [x] §8 — Angular Material (25 módulos, dialog patterns, theme, notifications)
- [x] §9 — Patrón CRUD estándar (3 tipos de módulo, 12 subsecciones, código completo)
- [x] §10 — Signals y estado (50+ signals, 9 computed, takeUntilDestroyed, 13 reglas)
- [x] §11 — Seguridad (4 capas, RBAC, interceptors, CSP, sesiones) + `SEGURIDAD.md`
- [x] §12 — Testing y calidad (auditoría real, plan priorizado, checklist actualizado)
- [x] §13 — Checklist de lanzamiento (este archivo)

### Pendientes de calidad (ver §12.4)

- [ ] P1: Configurar ESLint (`@angular-eslint`) + Prettier + Husky pre-commit
- [ ] P2: Unit tests backend (auth, órdenes, inventario, sanitizar)
- [ ] P3: Tests de componente Angular (login, POS, pipes, directiva rol)
- [ ] P4: E2E con Playwright (login, venta POS, CRUD producto)
- [ ] P5: GitHub Actions CI/CD pipeline
- [ ] Corregir `minLength(6)` a `minLength(8)` en `login.component.ts` (ver §11.9)
- [ ] Agregar `sanitizarObjeto(dto)` en `auth.service.ts` backend (ver §11.9)
- [ ] Agregar `USER nginx` en Dockerfile frontend (ver §11.9)

### Fases completadas

| Fase | Commit | Contenido |
|------|--------|-----------|
| 1 — shared/ | `ebe51b3d` | 6 componentes + 5 pipes + 1 directiva |
| 2 — CRUD | `a240a3f4` | categorías, proveedores, almacenes, productos, clientes |
| 3 — Transaccional | `632402b8` | órdenes, compras, inventario, entregas, turnos-caja |
| 4 — POS | `9b0f0d08` | punto de venta completo con cobro, cliente, ticket |
| 5 — Administración | `f0272020` | usuarios, reportes con Chart.js, configuración |
| 6 — Pulido | `f57350ec` | PWA, dark mode, a11y, responsive, Docker producción |

### Commits de documentación

| Commit | Sección | Contenido |
|--------|---------|-----------|
| `d7f61a32` | §1,2,3,7,13 | Estado actual, arquitectura, Tailwind v4, checklist |
| `efee021e` | §8 | Angular Material — 25 módulos, dialogs, snackbar fix, form-field defaults |
| `d22d3ff7` | §9 | Patrón CRUD — 3 tipos de módulo, 12 subsecciones (+575 líneas) |
| `48582d5b` | §10 | Signals y estado — 12 subsecciones, inventario real (+411 líneas) |
| `339fe03d` | §11 | Seguridad full-stack — 9 subsecciones + `SEGURIDAD.md` (+1070 líneas) |
| `a96a4cea` | §12 | Testing y calidad — auditoría honesta, plan priorizado (+279 líneas) |

---

> **Documento completo.** Todas las secciones (1–13) han sido auditadas contra el código real y reescritas.  
> Total: ~2700 líneas de documentación técnica verificada.  
> Documento complementario: `SEGURIDAD.md` (909 líneas) — arquitectura de seguridad full-stack.
