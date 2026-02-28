import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatDividerModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  @Input() collapsed = false;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Punto de Venta', icon: 'point_of_sale', route: '/pos', roles: ['ADMIN', 'CAJERO'] },
    { label: 'Productos', icon: 'inventory_2', route: '/productos' },
    { label: 'Categorías', icon: 'category', route: '/categorias' },
    { label: 'Inventario', icon: 'warehouse', route: '/inventario' },
    { label: 'Clientes', icon: 'people', route: '/clientes' },
    { label: 'Proveedores', icon: 'local_shipping', route: '/proveedores', roles: ['ADMIN'] },
    { label: 'Almacenes', icon: 'store', route: '/almacenes', roles: ['ADMIN'] },
    { label: 'Reportes', icon: 'bar_chart', route: '/reportes', roles: ['ADMIN'] },
    { label: 'Configuración', icon: 'settings', route: '/configuracion', roles: ['ADMIN'] },
  ];

  tieneRol(roles: string[]): boolean {
    const usuario = this.auth.usuario();
    return !!usuario && roles.includes(usuario.rol);
  }
}
