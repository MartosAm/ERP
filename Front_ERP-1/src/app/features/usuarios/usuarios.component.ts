import {
  Component,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import { TiempoRelativoPipe } from '../../shared/pipes/tiempo-relativo.pipe';
import { UsuarioFormDialogComponent } from './usuario-form-dialog.component';
import { UsuarioRegistroDialogComponent } from './usuario-registro-dialog.component';
import { HorarioDialogComponent } from './horario-dialog.component';

import type { UsuarioAdmin, PaginacionMeta, Rol } from '../../core/models/api.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    EstadoBadgeComponent,
    FechaHoraPipe,
    TiempoRelativoPipe,
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  private readonly svc = inject(UsuariosService);
  private readonly authSvc = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<UsuarioAdmin[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);

  readonly columnas = ['nombre', 'correo', 'rol', 'activo', 'ultimoLogin', 'ordenes', 'acciones'] as const;

  buscar = '';
  pagina = 1;
  limite = 20;
  filtroRol: Rol | '' = '';
  filtroActivo: boolean | '' = '';

  // Chips de roles para filtrar
  readonly roles: Array<{ label: string; value: Rol | '' }> = [
    { label: 'Todos', value: '' },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Cajero', value: 'CAJERO' },
    { label: 'Repartidor', value: 'REPARTIDOR' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.pagina,
      limite: this.limite,
    };
    if (this.buscar) params['buscar'] = this.buscar;
    if (this.filtroRol) params['rol'] = this.filtroRol;
    if (this.filtroActivo !== '') params['activo'] = this.filtroActivo;

    this.svc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.datos);
          this.meta.set(res.meta);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  onBuscar(termino: string): void {
    this.buscar = termino;
    this.pagina = 1;
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pagina = ev.pageIndex + 1;
    this.limite = ev.pageSize;
    this.cargar();
  }

  filtrarRol(rol: Rol | ''): void {
    this.filtroRol = rol;
    this.pagina = 1;
    this.cargar();
  }

  filtrarActivo(val: boolean | ''): void {
    this.filtroActivo = val;
    this.pagina = 1;
    this.cargar();
  }

  // ─── Acciones ──────────────────────────────────────────────
  registrar(): void {
    const ref = this.dialog.open(UsuarioRegistroDialogComponent, {
      width: '500px',
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) this.cargar();
      });
  }

  editar(u: UsuarioAdmin): void {
    const ref = this.dialog.open(UsuarioFormDialogComponent, {
      width: '450px',
      data: u,
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) this.cargar();
      });
  }

  editarHorario(u: UsuarioAdmin): void {
    const ref = this.dialog.open(HorarioDialogComponent, {
      width: '450px',
      data: u,
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) this.cargar();
      });
  }

  toggleEstado(u: UsuarioAdmin): void {
    const accion = u.activo ? 'Desactivar' : 'Activar';
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: `${accion} usuario`,
        mensaje: `¿Deseas ${accion.toLowerCase()} a "${u.nombre}"?`,
        textoConfirmar: accion,
        color: u.activo ? 'warn' : 'primary',
      },
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.svc
            .cambiarEstado(u.id, { activo: !u.activo })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.notify.exito(`Usuario ${u.activo ? 'desactivado' : 'activado'}`);
                this.cargar();
              },
              error: () => this.notify.error('Error al cambiar estado'),
            });
        }
      });
  }

  cerrarSesiones(u: UsuarioAdmin): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Cerrar sesiones',
        mensaje: `¿Cerrar todas las sesiones activas de "${u.nombre}"? (${u._count.sesiones} sesiones)`,
        textoConfirmar: 'Cerrar sesiones',
        color: 'warn',
      },
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.svc
            .cerrarSesiones(u.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (res) => {
                this.notify.exito(`${res.sesionesRevocadas} sesiones cerradas`);
                this.cargar();
              },
              error: () => this.notify.error('Error al cerrar sesiones'),
            });
        }
      });
  }

  getDiasLabel(dias: number[]): string {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias.map((d) => labels[d] || '').join(', ');
  }

  getRolClass(rol: Rol): string {
    const map: Record<Rol, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      CAJERO: 'bg-blue-100 text-blue-800',
      REPARTIDOR: 'bg-amber-100 text-amber-800',
    };
    return map[rol] || 'bg-gray-100 text-gray-800';
  }
}
