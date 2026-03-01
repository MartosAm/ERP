/**
 * app.routes.ts — Rutas principales de la aplicación.
 * ------------------------------------------------------------------
 * Patron: lazy loading por feature. Cada feature se carga bajo demanda.
 * El ShellComponent envuelve todas las rutas autenticadas.
 *
 * Roles: ADMIN tiene acceso completo. CAJERO solo a dashboard, pos,
 * productos, inventario y clientes.
 * ------------------------------------------------------------------
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // --- Auth (sin layout) ---
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },

  // --- Rutas protegidas (con layout shell) ---
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pos.component').then((m) => m.PosComponent),
      },

      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos.component').then((m) => m.ProductosComponent),
      },

      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then((m) => m.InventarioComponent),
      },

      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes.component').then((m) => m.ClientesComponent),
      },

      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },

      // --- Órdenes ---
      {
        path: 'ordenes',
        loadComponent: () =>
          import('./features/ordenes/ordenes.component').then((m) => m.OrdenesComponent),
      },
      {
        path: 'ordenes/:id',
        loadComponent: () =>
          import('./features/ordenes/orden-detalle.component').then((m) => m.OrdenDetalleComponent),
      },

      // --- Compras (solo ADMIN) ---
      {
        path: 'compras',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/compras/compras.component').then((m) => m.ComprasComponent),
      },
      {
        path: 'compras/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/compras/compra-detalle.component').then((m) => m.CompraDetalleComponent),
      },

      // --- Entregas ---
      {
        path: 'entregas',
        loadComponent: () =>
          import('./features/entregas/entregas.component').then((m) => m.EntregasComponent),
      },
      {
        path: 'entregas/:id',
        loadComponent: () =>
          import('./features/entregas/entrega-detalle.component').then((m) => m.EntregaDetalleComponent),
      },

      // --- Turnos de caja ---
      {
        path: 'turnos-caja',
        canActivate: [roleGuard('ADMIN', 'CAJERO')],
        loadComponent: () =>
          import('./features/turnos-caja/turnos-caja.component').then((m) => m.TurnosCajaComponent),
      },
      {
        path: 'turnos-caja/:id',
        canActivate: [roleGuard('ADMIN', 'CAJERO')],
        loadComponent: () =>
          import('./features/turnos-caja/turno-detalle.component').then((m) => m.TurnoDetalleComponent),
      },

      // --- Solo ADMIN ---
      {
        path: 'proveedores',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
      },

      {
        path: 'almacenes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/almacenes/almacenes.component').then((m) => m.AlmacenesComponent),
      },

      {
        path: 'reportes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },

      {
        path: 'configuracion',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
      },
    ],
  },

  // --- Wildcard: redirigir a login (authGuard decide si puede ver dashboard) ---
  { path: '**', redirectTo: 'auth/login' },
];
