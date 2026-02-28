# Guía de Desarrollo — Front ERP (Angular 17 + Tailwind CSS v4)

> Documento de referencia para el desarrollo completo del frontend del sistema ERP POS.
> Última actualización: 28 de febrero de 2026.

---

## Índice

1. [Estado actual del proyecto](#1-estado-actual-del-proyecto)
2. [Arquitectura y estructura de carpetas](#2-arquitectura-y-estructura-de-carpetas)
3. [Plan de desarrollo por fases](#3-plan-de-desarrollo-por-fases)
4. [Componentes shared/ pendientes](#4-componentes-shared-pendientes)
5. [Módulos feature/ por desarrollar](#5-módulos-feature-por-desarrollar)
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

### ✅ Completado

| Capa | Detalle |
|------|---------|
| **Core / Models** | `api.model.ts` — 968 líneas con **todas** las interfaces tipadas 1:1 con el backend (13 módulos, 55 endpoints) |
| **Core / Services** | 18 servicios: `api`, `auth`, `token`, `notification`, `inactividad`, `dashboard`, `reportes`, `productos`, `categorias`, `clientes`, `ordenes`, `inventario`, `turnos`, `almacenes`, `compras`, `entregas`, `proveedores`, `usuarios` |
| **Core / Utils** | `fecha.utils.ts`, `formato.utils.ts`, `tabla.utils.ts` |
| **Core / Guards** | `authGuard` (funcional), `roleGuard` (factory funcional) |
| **Core / Interceptors** | `authInterceptor` (JWT Bearer), `errorInterceptor` (retry + manejo global) |
| **Layout** | `ShellComponent` (sidebar + header + router-outlet), `HeaderComponent`, `SidebarComponent` |
| **Feature / auth** | `LoginComponent` — completo con formulario reactivo, signals, validación |
| **Feature / dashboard** | `DashboardComponent` — KPIs completos, 8 tarjetas, auto-refresh |
| **Tailwind v4** | Configuración CSS-first con `@theme` tokens, utilities personalizadas |
| **Seguridad** | CSP meta tag, XSS protection, auto-logout por inactividad (30 min), token en memoria |

### ⚠️ Parcial (solo listado, sin CRUD)

| Módulo | Estado |
|--------|--------|
| `features/productos/` | Tabla paginada con búsqueda. **Falta:** crear, editar, detalle, eliminar |
| `features/clientes/` | Tabla paginada con búsqueda. **Falta:** crear, editar, detalle, eliminar |

### ❌ Stubs (placeholder vacío)

| Módulo | Estado |
|--------|--------|
| `features/pos/` | Solo texto "en desarrollo" |
| `features/inventario/` | Solo texto "en desarrollo" |
| `features/reportes/` | Solo texto "en desarrollo" |
| `features/configuracion/` | Solo texto "en desarrollo" |

### 🚫 No existe aún

| Módulo / Componente | Descripción |
|---------------------|-------------|
| `features/categorias/` | CRUD completo de categorías |
| `features/proveedores/` | CRUD completo de proveedores |
| `features/almacenes/` | CRUD completo de almacenes |
| `features/compras/` | Gestión de órdenes de compra |
| `features/entregas/` | Gestión de entregas / delivery |
| `features/usuarios/` | Administración de usuarios |
| `features/turnos-caja/` | Apertura/cierre + historial de turnos |
| `shared/components/` | Carpeta vacía — 0 componentes reutilizables |
| `shared/pipes/` | Carpeta vacía — 0 pipes |
| `shared/directives/` | Carpeta vacía — 0 directivas |
| Rutas en `app.routes.ts` | Faltan 7 rutas (categorías, proveedores, almacenes, compras, entregas, usuarios, turnos) |

### 📦 Dependencias instaladas

```
Angular 17.3 (standalone)    Tailwind CSS v4      Angular Material 17.3
chart.js 4.4                 dayjs 1.11           @fontsource/roboto
material-icons               rxjs 7.8             zone.js 0.14
```

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
│   ├── components/            ← ⬜ Por desarrollar
│   ├── pipes/                 ← ⬜ Por desarrollar
│   └── directives/            ← ⬜ Por desarrollar
│
└── features/                  ← Módulos de la aplicación (lazy-loaded)
    ├── auth/                  ← ✅ Login
    ├── dashboard/             ← ✅ KPIs
    ├── pos/                   ← ❌ Punto de venta
    ├── productos/             ← ⚠️ Solo lista
    ├── clientes/              ← ⚠️ Solo lista
    ├── inventario/            ← ❌ Stub
    ├── reportes/              ← ❌ Stub
    ├── configuracion/         ← ❌ Stub
    ├── categorias/            ← 🚫 No existe
    ├── proveedores/           ← 🚫 No existe
    ├── almacenes/             ← 🚫 No existe
    ├── compras/               ← 🚫 No existe
    ├── entregas/              ← 🚫 No existe
    ├── usuarios/              ← 🚫 No existe
    └── turnos-caja/           ← 🚫 No existe
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

### Fase 1 — shared/ Infrastructure (Componentes reutilizables)

> **Objetivo:** Crear los building blocks que se reutilizarán en TODOS los módulos.
> **Prioridad:** MÁXIMA — sin estos, cada módulo reinventa la rueda.

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

### Fase 2 — Módulos CRUD simples (catálogos)

> **Objetivo:** Completar los módulos de catálogo base. Son los más simples y sientan el patrón.
> **Cada módulo incluye:** Listado paginado + Búsqueda + MatDialog crear/editar + Detalle + Eliminar con confirmación.

| # | Módulo | Rutas | MatDialogs | Notas |
|---|--------|-------|------------|-------|
| 2.1 | `categorias` | `/categorias` | Crear/Editar categoría | Vista de árbol jerárquico + tabla |
| 2.2 | `proveedores` | `/proveedores` | Crear/Editar proveedor | CRUD estándar |
| 2.3 | `almacenes` | `/almacenes` | Crear/Editar almacén | Toggle principal, gestión de stock |
| 2.4 | `productos` (upgrade) | `/productos`, `/productos/:id` | Crear/Editar producto | Agregar vista detalle, diálogos CRUD, filtros avanzados (categoría, proveedor, estado) |
| 2.5 | `clientes` (upgrade) | `/clientes`, `/clientes/:id` | Crear/Editar cliente | Agregar vista detalle (historial de órdenes), diálogos CRUD |

### Fase 3 — Módulos transaccionales

> **Objetivo:** Módulos que manejan transacciones de negocio con flujos más complejos.

| # | Módulo | Rutas | Componentes especiales |
|---|--------|-------|----------------------|
| 3.1 | `ordenes` | `/ordenes`, `/ordenes/:id` | Lista con filtros por estado + MatChips, detalle completo (detalles, pagos, entrega), acciones (cancelar, devolver) |
| 3.2 | `compras` | `/compras`, `/compras/:id` | Crear compra (selección de proveedor, productos, cantidades), detalle, botón "recibir mercancía" |
| 3.3 | `inventario` (upgrade) | `/inventario` | Tabs: Existencias · Movimientos. Diálogos: ajuste manual, traslado entre almacenes. Indicadores de stock bajo. |
| 3.4 | `entregas` | `/entregas`, `/entregas/:id` | Lista con filtros por estado, mapa conceptual de seguimiento, actualización de estado, vista repartidor |
| 3.5 | `turnos-caja` | `/turnos-caja` | Abrir turno (diálogo), cerrar turno (diálogo con montos), historial, detalle con diferencias |

### Fase 4 — POS (Punto de Venta)

> **Objetivo:** Pantalla principal de venta, full-screen, optimizada para táctil y teclado.
> **Es el módulo más complejo — necesita todo lo anterior terminado.**

| Zona | Funcionalidad |
|------|---------------|
| **Barra superior** | Búsqueda de producto (SKU/código/nombre), selector de precio (Lista 1/2/3) |
| **Panel izquierdo** | Grid de categorías rápidas → Grid de productos (imagen, nombre, precio) |
| **Panel derecho** | Carrito: líneas de venta con cantidad, precio, descuento, subtotal. Totales. |
| **Panel inferior** | Métodos de pago, campo de monto pagado, cálculo de cambio. Botón "Cobrar". |
| **Diálogos** | Selección de cliente, pago mixto, ticket/comprobante, apertura/cierre de turno |
| **Requisito previo** | Turno de caja abierto para poder vender |

### Fase 5 — Administración

| # | Módulo | Rutas | Funcionalidad |
|---|--------|-------|---------------|
| 5.1 | `usuarios` | `/usuarios`, `/usuarios/:id` | Listado, editar datos, asignar horario, activar/desactivar. Solo ADMIN. |
| 5.2 | `reportes` (upgrade) | `/reportes` | Tabs: Ventas · Top productos · Métodos de pago · Inventario · Cajeros · Entregas. Gráficas con Chart.js. Date range picker. |
| 5.3 | `configuracion` (upgrade) | `/configuracion` | Tabs: Perfil · Empresa · Cajas registradoras. Editar perfil, cambiar PIN. |

### Fase 6 — Pulido y producción

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

## 4. Componentes shared/ pendientes

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

## 5. Módulos feature/ por desarrollar

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
| **Sin `any`** | Prohibido. Usar tipos específicos o `unknown`. |
| **Sin `subscribe` sin cleanup** | Usar `takeUntilDestroyed(this.destroyRef)` antes de `.subscribe()`. |
| **Sin imports duplicados** | No importar módulos Angular Material completos, solo los módulos específicos. |
| **Signals para estado local** | Preferir `signal()` sobre variables mutables para estado del componente. |
| **Computed para derivados** | Usar `computed()` para valores derivados de signals. |
| **Readonly services** | Marcar inyecciones como `private readonly`. |
| **Type imports** | Usar `import type { X }` cuando solo se usa como tipo (no en runtime). |
| **Archivos separados** | Siempre `.ts`, `.html`, `.css` separados. Nunca inline templates/styles. |

---

## 7. Guía de estilos con Tailwind CSS v4

### 7.1 Configuración actual

Tailwind v4 usa **configuración CSS-first** (sin `tailwind.config.js`):

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #3f51b5;
  --color-accent: #ff4081;
  --color-warn: #f44336;
  --color-success: #4caf50;
  --color-surface: #ffffff;
  --color-bg: #fafafa;
  --color-text: #212121;
  --color-text-secondary: #757575;
}
```

### 7.2 Tokens de diseño

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#3f51b5` | Acciones principales, links activos, botones primarios |
| `--color-accent` | `#ff4081` | CTAs secundarios, badges de atención |
| `--color-warn` | `#f44336` | Errores, eliminaciones, alertas |
| `--color-success` | `#4caf50` | Confirmaciones, estados exitosos |
| `--color-bg` | `#fafafa` | Fondo general de la app |
| `--color-surface` | `#ffffff` | Fondo de cards, diálogos, tablas |
| `--sidebar-width` | `260px` | Ancho del sidebar |
| `--header-height` | `64px` | Alto del header |
| `--border-radius` | `8px` | Radio de bordes estándar |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.12)` | Sombra para cards |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Sombra para modales |

### 7.3 Utilities personalizadas

```css
@utility page-container { padding: 1.5rem; max-width: 80rem; margin-inline: auto; }
@utility card { background: white; border-radius: 0.5rem; box-shadow: var(--shadow-sm); padding: 1rem; border: 1px solid #f3f4f6; }
@utility card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
@utility card-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; }
@utility kpi-grid { display: grid; ... }
@utility kpi-card { ... }
@utility kpi-label { ... }
@utility kpi-value { ... }
```

### 7.4 Reglas de uso

| ✅ Hacer | ❌ No hacer |
|---------|-----------|
| Usar clases Tailwind en templates HTML | Escribir CSS custom para márgenes/paddings |
| Usar `@utility` para patrones repetidos (3+ veces) | Crear clases CSS sueltas en component.css |
| Usar `@theme` para colores y tokens del diseño | Hardcodear colores hex en templates |
| Usar responsive prefixes: `sm:`, `md:`, `lg:` | Escribir media queries manuales (excepto en `@utility`) |
| Componer clases: `class="flex items-center gap-2"` | Crear wrapper divs innecesarios para layout |
| Usar `@apply` SOLO en component.css cuando Tailwind no alcance | Usar `@apply` en globals.css |

### 7.5 Breakpoints (Tailwind v4 defaults)

| Prefix | Min-width | Uso |
|--------|-----------|-----|
| `sm:` | 640px | Tablets pequeñas |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop grande |
| `2xl:` | 1536px | Pantallas ultra anchas |

### 7.6 Patrones de layout comunes

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
```

### 7.7 Colores semánticos para estados

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

### 8.1 Módulos más usados

| Módulo | Import | Uso principal |
|--------|--------|---------------|
| `MatTableModule` | Tablas de datos | Listados paginados |
| `MatPaginatorModule` | Paginador | Debajo de tablas |
| `MatDialogModule` | Diálogos modales | CRUD create/edit, confirmación |
| `MatFormFieldModule` + `MatInputModule` | Campos de formulario | Todos los forms |
| `MatSelectModule` | Select dropdown | Selección de categoría, proveedor, etc. |
| `MatButtonModule` | Botones | Acciones |
| `MatIconModule` | Iconos Material | En toda la app |
| `MatSnackBarModule` | Notificaciones toast | Via NotificationService |
| `MatChipsModule` | Chips / badges | Estados, tags |
| `MatTabsModule` | Tabs | Reportes, configuración, inventario |
| `MatMenuModule` | Menús contextuales | Acciones de fila en tablas |
| `MatTooltipModule` | Tooltips | Botones de icono |
| `MatProgressSpinnerModule` | Spinner de carga | Loading states |
| `MatDatepickerModule` | Date picker | Filtros de reportes |
| `MatAutocompleteModule` | Autocomplete | Búsqueda de productos en POS |

### 8.2 Diálogos — patrón estándar

```typescript
// Desde el componente padre:
crear(): void {
  const ref = this.dialog.open(ProductoFormDialogComponent, {
    width: '600px',
    disableClose: true,
    data: { modo: 'crear' },
  });

  ref.afterClosed()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(resultado => {
      if (resultado) this.cargar();
    });
}

editar(producto: Producto): void {
  const ref = this.dialog.open(ProductoFormDialogComponent, {
    width: '600px',
    disableClose: true,
    data: { modo: 'editar', producto },
  });

  ref.afterClosed()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(resultado => {
      if (resultado) this.cargar();
    });
}

// Dentro del diálogo:
@Component({ /* ... */ })
export class ProductoFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
  readonly data = inject<{ modo: 'crear' | 'editar'; producto?: Producto }>(MAT_DIALOG_DATA);
  // ...
  
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
}
```

### 8.3 Tablas — patrón estándar

```html
<div class="card overflow-x-auto">
  <table mat-table [dataSource]="items()">
    <!-- Columnas -->
    <ng-container matColumnDef="nombre">
      <th mat-header-cell *matHeaderCellDef>Nombre</th>
      <td mat-cell *matCellDef="let item">{{ item.nombre }}</td>
    </ng-container>

    <!-- Columna de acciones -->
    <ng-container matColumnDef="acciones">
      <th mat-header-cell *matHeaderCellDef class="w-20">Acciones</th>
      <td mat-cell *matCellDef="let item">
        <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Acciones">
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
    <tr mat-row *matRowDef="let row; columns: columnas"
        class="hover:bg-gray-50 cursor-pointer"
        (click)="verDetalle(row)"></tr>
  </table>

  @if (items().length === 0) {
    <app-empty-state icono="inbox" mensaje="Sin resultados" />
  }

  @if (meta()) {
    <mat-paginator
      [length]="meta()!.total"
      [pageSize]="meta()!.limite"
      [pageIndex]="meta()!.pagina - 1"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)"
      showFirstLastButtons />
  }
</div>
```

---

## 9. Patrón CRUD estándar de un módulo

### Paso a paso para crear un módulo nuevo (ej: proveedores)

#### 1. Crear archivos de estructura

```
features/proveedores/
├── proveedores.component.ts       ← Listado
├── proveedores.component.html
├── proveedores.component.css
├── proveedor-form-dialog.component.ts  ← Crear/Editar
├── proveedor-form-dialog.component.html
└── proveedor-form-dialog.component.css
```

#### 2. Implementar el listado

- Inyectar servicio, dialog, notify, destroyRef
- Signals: `items`, `meta`, `cargando`
- Métodos: `cargar()`, `onBuscar()`, `onPage()`, `crear()`, `editar()`, `eliminar()`
- Template: `page-header` + `search-input` + tabla + paginador + `empty-state`

#### 3. Implementar el diálogo de formulario

- Inyectar `MAT_DIALOG_DATA`, `MatDialogRef`, servicio, notify
- Formulario reactivo con `FormBuilder`
- Modo `crear` | `editar` determinado por los datos inyectados
- Validaciones Zod-compatibles (required, minLength, email, etc.)
- Botón guardar con loading state

#### 4. Implementar confirmación de eliminación

- Usar `ConfirmDialogComponent` de shared
- Llamar `svc.eliminar()` solo si el usuario confirma
- Recargar lista después de eliminar

#### 5. Agregar ruta en app.routes.ts

```typescript
{
  path: 'proveedores',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () => import('./features/proveedores/proveedores.component')
    .then(m => m.ProveedoresComponent),
},
```

#### 6. Agregar item en sidebar

```typescript
{ label: 'Proveedores', icon: 'local_shipping', route: '/proveedores', roles: ['ADMIN'] },
```

---

## 10. Manejo de estado y signals

### 10.1 Estado local del componente

```typescript
// ✅ Correcto: signals para estado reactivo
readonly items = signal<Producto[]>([]);
readonly cargando = signal(false);
readonly seleccionado = signal<Producto | null>(null);

// ✅ Correcto: computed para valores derivados
readonly totalItems = computed(() => this.items().length);
readonly tieneSeleccion = computed(() => this.seleccionado() !== null);
```

### 10.2 Estado global (servicios)

```typescript
// En TurnosService — signal global del turno activo
readonly turnoActivo = signal<TurnoCaja | null>(null);

// En AuthService — signal global del usuario
private readonly _usuario = signal<Usuario | null>(null);
readonly usuario = this._usuario.asReadonly();
readonly esAdmin = computed(() => this._usuario()?.rol === 'ADMIN');
```

### 10.3 Subscripciones seguras

```typescript
// ✅ SIEMPRE usar takeUntilDestroyed
private readonly destroyRef = inject(DestroyRef);

this.svc.listar(params)
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({
    next: (res) => { ... },
    error: () => { ... },
  });

// ✅ ALTERNATIVA: async pipe en template (sin subscribe manual)
readonly items$ = this.svc.listar(params);
// En template: @for (item of items$ | async; track item.id)
```

---

## 11. Seguridad y buenas prácticas

| Práctica | Implementación |
|----------|---------------|
| **Token en memoria** | JWT se almacena en variable, sessionStorage solo como fallback |
| **CSP** | Content-Security-Policy en `index.html` meta tag |
| **XSS** | Angular sanitiza por defecto. No usar `[innerHTML]` sin sanitizar |
| **Auto-logout** | `InactividadService` cierra sesión tras 30 min sin actividad |
| **Token expirado** | `errorInterceptor` redirige a login en 401 |
| **RBAC** | `roleGuard` en rutas + `*appRol` en templates |
| **Retry idempotente** | `errorInterceptor` reintenta GET en errores transitorios (502, 503, 504) |
| **Sin secrets en frontend** | Solo `environment.apiUrl` como configuración |

---

## 12. Testing y calidad

### 12.1 Estrategia de testing

| Nivel | Herramienta | Qué testear |
|-------|-------------|-------------|
| Unit | Jasmine + Karma | Services (mocks de HttpClient), Utils, Pipes |
| Component | TestBed + ComponentFixture | Renderizado condicional, inputs/outputs, form validation |
| E2E | Playwright | Flujos críticos: login, crear venta, CRUD producto |

### 12.2 Checklist antes de commit

- [ ] `ng build --configuration development` sin errores
- [ ] No hay `any` en el código
- [ ] Todos los `subscribe()` tienen `takeUntilDestroyed()`
- [ ] Los diálogos tienen `disableClose: true` en formularios
- [ ] Los botones de eliminación usan `ConfirmDialog`
- [ ] Las tablas tienen `empty-state` para 0 resultados
- [ ] Los formularios tienen validación visible
- [ ] Los componentes usan `standalone: true`
- [ ] Los imports son mínimos (solo lo necesario)
- [ ] No hay console.log (excepto en environment.ts dev)

---

## 13. Checklist de lanzamiento

### Pre-producción

- [ ] Todos los módulos funcionales (13 features)
- [ ] shared/ con todos los componentes reutilizables
- [ ] Responsive verificado en 3 breakpoints
- [ ] A11y: tab navigation, ARIA labels, focus trap
- [ ] Build de producción sin warnings
- [ ] Bundle size dentro de budgets (initial < 500kb warning, < 1MB error)
- [ ] CSP headers configurados en Nginx
- [ ] Environment prod apuntando a `/api/v1`
- [ ] Docker + Nginx configurados
- [ ] Favicon y meta tags actualizados

### Módulos por completar (orden de prioridad)

1. **shared/ components** — Fase 1 (prereq para todo lo demás)
2. **POS** — Fase 4 (la pantalla más usada del sistema)
3. **Productos + Clientes** — Fase 2 (upgrade a CRUD completo)
4. **Órdenes** — Fase 3 (historial de ventas)
5. **Inventario** — Fase 3 (existencias y movimientos)
6. **Categorías + Proveedores + Almacenes** — Fase 2 (catálogos base)
7. **Compras + Entregas + Turnos** — Fase 3 (transacciones)
8. **Usuarios + Reportes + Configuración** — Fase 5 (admin)

---

> **Nota:** Este documento debe actualizarse conforme se completen las fases.
> Cada módulo completado debe marcarse con ✅ en la tabla de estado.
