import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { AbrirTurnoDialogComponent } from './abrir-turno-dialog.component';
import { CerrarTurnoDialogComponent } from './cerrar-turno-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { TurnoCaja, PaginacionMeta, ApiPaginada } from '../../core/models/api.model';

@Component({
  selector: 'app-turnos-caja',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatChipsModule,
    MatProgressSpinnerModule,
    PageHeaderComponent, EmptyStateComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './turnos-caja.component.html',
  styleUrl: './turnos-caja.component.css',
})
export class TurnosCajaComponent implements OnInit {
  private readonly svc = inject(TurnosService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<TurnoCaja[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly turnoActivo = signal<TurnoCaja | null>(null);
  readonly cargando = signal(false);
  readonly columnas = ['caja', 'usuario', 'estado', 'apertura', 'cierre', 'diferencia', 'ordenes', 'acciones'];

  pagina = 1;
  limite = 20;
  filtroAbierto = '';

  ngOnInit(): void {
    this.cargar();
    this.svc.obtenerActivo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => this.turnoActivo.set(turno),
        error: () => {},
      });
  }

  cargar(): void {
    this.cargando.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.pagina,
      limite: this.limite,
    };
    if (this.filtroAbierto) params['abierto'] = this.filtroAbierto;

    this.svc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<TurnoCaja>) => {
          this.items.set(res.datos);
          this.meta.set(res.meta);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  onPage(ev: PageEvent): void {
    this.pagina = ev.pageIndex + 1;
    this.limite = ev.pageSize;
    this.cargar();
  }

  filtrarEstado(val: string): void {
    this.filtroAbierto = val;
    this.pagina = 1;
    this.cargar();
  }

  abrirTurno(): void {
    const ref = this.dialog.open(AbrirTurnoDialogComponent, {
      width: '450px',
      disableClose: true,
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.notify.exito('Turno abierto');
          this.turnoActivo.set(this.svc.turnoActivo());
          this.cargar();
        }
      });
  }

  cerrarTurno(): void {
    const turno = this.turnoActivo();
    if (!turno) return;

    const ref = this.dialog.open(CerrarTurnoDialogComponent, {
      width: '450px',
      disableClose: true,
      data: { turno },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.notify.exito('Turno cerrado');
          this.turnoActivo.set(null);
          this.cargar();
        }
      });
  }

  verDetalle(turno: TurnoCaja): void {
    this.router.navigate(['/turnos-caja', turno.id]);
  }
}
