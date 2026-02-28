# Front_ERP — Instrucciones de Desarrollo

> Guía de referencia para todo desarrollador que trabaje en el frontend del ERP/POS.

---

## 1. Propósito del Proyecto

Sistema **ERP/POS web** orientado a **PyMEs** (pequeña y mediana empresa).
Permite gestionar ventas en punto de venta, inventario, compras, clientes,
productos, entregas, reportes y administración de usuarios — todo desde el
navegador.

El frontend consume una API REST desarrollada en **Node.js + Express + Prisma**
que expone 13 módulos bajo el prefijo `/api/v1`.

---

## 2. Stack Tecnológico

| Capa            | Tecnología                                        |
| --------------- | ------------------------------------------------- |
| Framework       | **Angular 17** (standalone, NO SSR)               |
| UI Components   | **Angular Material 17.3**                         |
| Estilos         | **Tailwind CSS v4** (CSS‑first, PostCSS)          |
| State           | **Angular Signals** + servicios inyectables        |
| HTTP            | `HttpClient` con interceptores funcionales         |
| Gráficas        | **Chart.js 4** + **ng2-charts**                   |
| Fechas          | **Day.js**                                        |
| Lenguaje        | **TypeScript 5.3** (`strict: true`)               |

---

## 3. Arquitectura de Carpetas

```
src/app/
├── core/                  # Singletons, modelos, guards, interceptors
│   ├── guards/            # Functional CanActivateFn (authGuard, roleGuard)
│   ├── interceptors/      # Functional HttpInterceptorFn (auth, error)
│   ├── models/            # Interfaces TypeScript para la API
│   └── services/          # Servicios inyectables (@Injectable providedIn: root)
├── layout/                # Shell, Sidebar, Header
├── features/              # Un componente standalone por feature/página
│   ├── auth/
│   ├── dashboard/
│   ├── pos/
│   ├── productos/
│   ├── clientes/
│   ├── inventario/
│   ├── reportes/
│   └── configuracion/
├── shared/                # (reservado) Pipes, directivas, componentes reutilizables
├── app.routes.ts          # Rutas con lazy loading
├── app.config.ts          # ApplicationConfig (providers globales)
└── app.component.*        # Componente raíz
```

### Reglas de carpetas

- **core/** contiene todo lo que se instancia UNA sola vez en la app.
- **features/** contiene componentes standalone organizados por dominio.
- **shared/** es para elementos reutilizables que NO son singletons.
- **layout/** es exclusivo para la estructura visual (shell + navegación).

---

## 4. Patrones de Diseño

### 4.1 Standalone Components (sin NgModules)

Toda la app usa componentes standalone. **No existen NgModules**.

```typescript
@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, MatTableModule, ...],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent { }
```

### 4.2 Archivos Separados por Componente

Cada componente tiene **tres archivos**: `.ts`, `.html`, `.css`.
Usar `templateUrl` y `styleUrl` — **nunca** templates/estilos inline.

```
productos/
  productos.component.ts
  productos.component.html
  productos.component.css
```

### 4.3 Lazy Loading por Feature

Las rutas cargan componentes bajo demanda con `loadComponent`:

```typescript
{
  path: 'productos',
  loadComponent: () =>
    import('./features/productos/productos.component')
      .then(m => m.ProductosComponent),
}
```

### 4.4 Signals para Estado Reactivo

Usar `signal()`, `computed()`, y `toSignal()` para estado local y derivado.
Evitar `BehaviorSubject` cuando Signals sea suficiente.

```typescript
readonly productos = signal<Producto[]>([]);
readonly total     = computed(() => this.productos().length);
```

### 4.5 Guards e Interceptors Funcionales

Usar `CanActivateFn` y `HttpInterceptorFn` — **nunca** guards/interceptors de clase.

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaAutenticado() || inject(Router).createUrlTree(['/auth/login']);
};
```

### 4.6 Servicio HTTP Centralizado (`ApiService`)

Todas las llamadas pasan por `ApiService`, que:
- Construye la URL base (`environment.apiUrl`).
- Envuelve `HttpClient` con métodos genéricos: `get<T>`, `getPaginado<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`.
- Desenvuelve automáticamente `ApiResponse<T>` → `T`.

Los servicios de dominio (ej. `ProductosService`) **nunca** usan `HttpClient`
directamente — siempre delegan a `ApiService`.

### 4.7 Control Flow Moderno

Usar la sintaxis de control de flujo de Angular 17: `@if`, `@for`, `@switch`.
**No usar** `*ngIf`, `*ngFor`, `*ngSwitch`.

```html
@if (cargando()) {
  <mat-spinner />
} @else {
  @for (p of productos(); track p.id) {
    <mat-row>{{ p.nombre }}</mat-row>
  }
}
```

---

## 5. Fundamentos de Calidad de Código

### 5.1 TypeScript Estricto — Cero `any`

El proyecto compila con `"strict": true`. Está **prohibido** usar `any`.
Si el tipo no es conocido, define una interfaz en `core/models/api.model.ts`.

```typescript
// ❌ PROHIBIDO
subscribe((res: any) => { ... })

// ✅ CORRECTO
subscribe((res: ApiPaginada<Producto>) => { ... })
```

### 5.2 Interfaces para Toda Respuesta de API

Cada endpoint tiene su tipo correspondiente en `api.model.ts`:
- `ApiResponse<T>` — respuesta simple (`{ ok, datos, mensaje }`).
- `ApiPaginada<T>` — respuesta paginada (`{ ok, datos[], meta }`).
- Interfaces de dominio: `Producto`, `Cliente`, `Orden`, `TurnoCaja`, etc.

Cuando agregues un endpoint nuevo, **primero** define la interfaz,
**después** el servicio.

### 5.3 Retornos de Servicios Siempre Tipados

```typescript
// ❌ MAL
obtenerProductos(): Observable<unknown> { ... }

// ✅ BIEN
obtenerProductos(params: Record<string, string | number | boolean>): Observable<ApiPaginada<Producto>> { ... }
```

### 5.4 Inyección de Dependencias con `inject()`

Preferir `inject()` sobre inyección por constructor:

```typescript
private readonly api = inject(ApiService);
private readonly router = inject(Router);
```

### 5.5 Readonly para Propiedades Inmutables

Marcar como `readonly` toda propiedad que no se reasigna:

```typescript
readonly columnas = signal<string[]>(['nombre', 'sku', 'precio', 'acciones']);
private readonly api = inject(ApiService);
```

### 5.6 Nombres en Español

Los nombres de dominio (interfaces, propiedades de la API, rutas visibles)
se mantienen en español para coherencia con el backend:
`productos`, `clientes`, `ordenes`, `reportes`, `categorias`, `almacenes`.

Los identificadores técnicos de Angular pueden estar en español o inglés
según convenga la claridad (ej. `cargando`, `buscar`, `paginaActual`).

### 5.7 Manejo de Errores

Los errores HTTP se manejan globalmente en `errorInterceptor`.
Los componentes **no** necesitan bloques try/catch para HTTP salvo
que requieran lógica de UI específica ante el error.

Para errores de lógica local, usar `NotificationService`:

```typescript
this.notify.error('No se pudo cargar el producto');
this.notify.exito('Producto creado correctamente');
```

---

## 6. Comunicación con el Backend

### 6.1 Base URL

| Entorno      | URL                                 |
| ------------ | ----------------------------------- |
| Desarrollo   | `http://localhost:3001/api/v1`      |
| Producción   | `/api/v1` (proxy Nginx)             |

Definido en `environments/environment.ts` y `environment.prod.ts`.

### 6.2 Autenticación

- **JWT Bearer Token** almacenado en `localStorage`.
- `authInterceptor` lo adjunta a cada request automáticamente.
- `errorInterceptor` detecta `401` → cierra sesión y redirige a login.
- `authGuard` protege todas las rutas bajo el `ShellComponent`.

### 6.3 Formato de Respuestas

El backend siempre responde con:

```json
// Respuesta simple
{ "ok": true, "datos": { ... }, "mensaje": "..." }

// Respuesta paginada
{ "ok": true, "datos": [...], "meta": { "total": 100, "pagina": 1, "limite": 20, "totalPaginas": 5 } }
```

`ApiService` desenvuelve `.datos` automáticamente para respuestas simples.

### 6.4 Módulos del Backend (Endpoints)

| Módulo         | Ruta Base                | Métodos Principales                    |
| -------------- | ------------------------ | -------------------------------------- |
| Auth           | `/auth`                  | login, logout, perfil                  |
| Usuarios       | `/usuarios`              | CRUD, cambiar contraseña               |
| Productos      | `/productos`             | CRUD, búsqueda, paginación             |
| Categorías     | `/categorias`            | CRUD, árbol                            |
| Clientes       | `/clientes`              | CRUD, historial                        |
| Proveedores    | `/proveedores`           | CRUD                                   |
| Almacenes      | `/almacenes`             | CRUD                                   |
| Inventario     | `/inventario`            | existencias, movimientos, ajustes      |
| Compras        | `/compras`               | CRUD, recepción                        |
| Órdenes        | `/ordenes`               | CRUD, pagos, cancelar, devolver        |
| Entregas       | `/entregas`              | CRUD, asignar, completar               |
| Turnos Caja    | `/turnos-caja`           | abrir, cerrar, listar                  |
| Reportes       | `/reportes`              | dashboard, ventas, inventario, cajeros |

### 6.5 Flujo de un Request Típico

```
Componente
  → ServicioDominio (ej. ProductosService)
    → ApiService.getPaginado<Producto>('productos', params)
      → HttpClient.get(...)
        → authInterceptor (agrega Bearer token)
          → Backend
        ← errorInterceptor (maneja errores globales)
      ← ApiPaginada<Producto>
    ← Observable<ApiPaginada<Producto>>
  ← subscribe / toSignal
```

---

## 7. Tailwind CSS v4

### 7.1 Configuración

Tailwind v4 usa **configuración CSS-first** — no hay `tailwind.config.js`.

- **PostCSS plugin**: `.postcssrc.json` con `@tailwindcss/postcss`.
- **Entry point**: `src/styles/globals.css` con `@import "tailwindcss"`.
- **Design tokens**: definidos en `@theme {}` dentro de `globals.css`.

### 7.2 Design Tokens

```css
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

Se usan como clases utilitarias: `bg-primary`, `text-accent`, `border-warn`, etc.

### 7.3 Custom Utilities

Definir utilidades compuestas con `@utility` en `globals.css`:

```css
@utility page-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin-inline: auto;
}
```

Uso: `<div class="page-container">`.

### 7.4 Convenciones

- **Utility-first**: construir layouts con clases de Tailwind en el HTML.
- **`@utility`** para patrones repetitivos (ej. `card`, `kpi-grid`).
- **Component CSS** (`.component.css`) solo para estilos que Tailwind no cubre
  o para overrides de Angular Material.
- **No usar `@apply`** — en v4 se reemplaza con `@utility` o CSS puro.
- Los tokens de `@theme` generan automáticamente clases de Tailwind.

---

## 8. Guía para Crear una Nueva Feature

1. **Crear carpeta** en `features/<nombre>/`.
2. **Definir interfaz** en `core/models/api.model.ts` (si hay nuevos tipos).
3. **Crear servicio** en `core/services/<nombre>.service.ts` que use `ApiService`.
4. **Crear componente** (3 archivos: `.ts`, `.html`, `.css`) como standalone.
5. **Agregar ruta** en `app.routes.ts` con `loadComponent` (lazy loading).
6. **Agregar link** en `sidebar.component.ts` (array `navItems`).
7. **Verificar build**: `npx ng build --configuration development`.

---

## 9. Comandos de Desarrollo

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Servidor de desarrollo (puerto 4200)
npm start

# Build de producción
npm run build

# Lint (si se agrega ESLint)
npm run lint
```

> **Nota**: se usa `--legacy-peer-deps` porque `@angular-devkit/build-angular`
> tiene un `peerOptional` de Tailwind v2/v3 que no afecta la funcionalidad con v4.

---

## 10. Reglas de Commits y Calidad

- Todo código nuevo debe compilar sin errores (`ng build`).
- Cero `any` — si TypeScript infiere `any`, crea la interfaz correspondiente.
- Componentes siempre standalone con archivos separados (HTML, CSS, TS).
- Preferir Signals sobre BehaviorSubject para estado reactivo.
- Usar `@if`/`@for`/`@switch` (Angular 17) — nunca directivas estructurales legacy.
- Toda propiedad inyectada debe ser `private readonly`.
- Nombres de dominio en español, consistentes con el backend.
