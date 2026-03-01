import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComprasService } from '../../core/services/compras.service';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { CompraDetalle, Almacen } from '../../core/models/api.model';

@Component({
  selector: 'app-compra-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatTableModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule,
    PageHeaderComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './compra-detalle.component.html',
  styleUrl: './compra-detalle.component.css',
})
export class CompraDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(ComprasService);
  private readonly almacenesSvc = inject(AlmacenesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly compra = signal<CompraDetalle | null>(null);
  readonly almacenes = signal<Almacen[]>([]);
  readonly cargando = signal(true);
  readonly recibiendo = signal(false);
  readonly colDetalles = ['producto', 'cantidad', 'costoUnitario', 'subtotal'];

  almacenSeleccionado = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);

    this.almacenesSvc.listar({ limite: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.almacenes.set(res.datos));
  }

  cargar(id: string): void {
    this.cargando.set(true);
    this.svc
      .obtenerPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c: CompraDetalle) => {
          this.compra.set(c);
          this.cargando.set(false);
        },
        error: () => {
          this.notify.error('Error al cargar la compra');
          this.cargando.set(false);
        },
      });
  }

  get esPendiente(): boolean {
    const c = this.compra();
    return !!c && !c.recibidaEn;
  }

  recibirMercancia(): void {
    const c = this.compra();
    if (!c || !this.almacenSeleccionado) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Recibir mercancía',
        mensaje: `¿Confirmas la recepción de la compra ${c.numeroCompra}? Se registrará el inventario en el almacén seleccionado.`,
        textoConfirmar: 'Recibir',
        color: 'primary',
      },
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.recibiendo.set(true);
        this.svc.recibir(c.id, { almacenId: this.almacenSeleccionado })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notify.exito('Mercancía recibida e inventario actualizado');
              this.recibiendo.set(false);
              this.cargar(c.id);
            },
            error: () => {
              this.notify.error('Error al recibir la mercancía');
              this.recibiendo.set(false);
            },
          });
      });
  }

  volver(): void {
    this.router.navigate(['/compras']);
  }
}
