import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrdenesService } from '../../core/services/ordenes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CancelarOrdenDialogComponent } from './cancelar-orden-dialog.component';
import { DevolucionDialogComponent } from './devolucion-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { OrdenDetalle } from '../../core/models/api.model';

@Component({
  selector: 'app-orden-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatTableModule, MatDividerModule, MatProgressSpinnerModule,
    PageHeaderComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './orden-detalle.component.html',
  styleUrl: './orden-detalle.component.css',
})
export class OrdenDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(OrdenesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orden = signal<OrdenDetalle | null>(null);
  readonly cargando = signal(true);
  readonly colDetalles = ['producto', 'cantidad', 'precioUnitario', 'descuento', 'subtotal'];
  readonly colPagos = ['metodo', 'monto', 'referencia', 'fecha'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);
  }

  cargar(id: string): void {
    this.cargando.set(true);
    this.svc
      .obtenerPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (o: OrdenDetalle) => {
          this.orden.set(o);
          this.cargando.set(false);
        },
        error: () => {
          this.notify.error('Error al cargar la orden');
          this.cargando.set(false);
        },
      });
  }

  get puedeCancelar(): boolean {
    const o = this.orden();
    return !!o && ['PENDIENTE', 'EN_PROCESO', 'COTIZACION'].includes(o.estado);
  }

  get puedeDevolver(): boolean {
    const o = this.orden();
    return !!o && o.estado === 'COMPLETADA';
  }

  cancelar(): void {
    const o = this.orden();
    if (!o) return;

    const ref = this.dialog.open(CancelarOrdenDialogComponent, {
      width: '450px',
      disableClose: true,
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((motivo: string | undefined) => {
        if (!motivo) return;
        this.svc.cancelar(o.id, { motivoCancelacion: motivo })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notify.exito('Orden cancelada');
              this.cargar(o.id);
            },
            error: () => this.notify.error('Error al cancelar la orden'),
          });
      });
  }

  devolver(): void {
    const o = this.orden();
    if (!o) return;

    const ref = this.dialog.open(DevolucionDialogComponent, {
      width: '700px',
      disableClose: true,
      data: { orden: o },
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok: boolean | undefined) => {
        if (ok) {
          this.notify.exito('Devolución procesada');
          this.cargar(o.id);
        }
      });
  }

  volver(): void {
    this.router.navigate(['/ordenes']);
  }
}
