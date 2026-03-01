import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComprasService } from '../../core/services/compras.service';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { CompraFormDialogComponent } from './compra-form-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha.pipe';
import type { Compra, Proveedor, PaginacionMeta, ApiPaginada } from '../../core/models/api.model';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatSelectModule,
    MatFormFieldModule, MatProgressSpinnerModule,
    PageHeaderComponent, SearchInputComponent,
    EmptyStateComponent, EstadoBadgeComponent,
    MonedaPipe, FechaCortaPipe,
  ],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.css',
})
export class ComprasComponent implements OnInit {
  private readonly svc = inject(ComprasService);
  private readonly proveedoresSvc = inject(ProveedoresService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Compra[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal(false);
  readonly columnas = ['numeroCompra', 'proveedor', 'total', 'recibida', 'numeroFactura', 'fecha', 'acciones'];

  buscar = '';
  pagina = 1;
  limite = 20;
  proveedorId = '';
  recibida = '';

  ngOnInit(): void {
    this.cargar();
    this.proveedoresSvc.listar({ limite: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.proveedores.set(res.datos));
  }

  cargar(): void {
    this.cargando.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.pagina,
      limite: this.limite,
    };
    if (this.buscar) params['buscar'] = this.buscar;
    if (this.proveedorId) params['proveedorId'] = this.proveedorId;
    if (this.recibida) params['recibida'] = this.recibida;

    this.svc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<Compra>) => {
          this.items.set(res.datos);
          this.meta.set(res.meta);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

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

  filtrarProveedor(id: string): void {
    this.proveedorId = id;
    this.pagina = 1;
    this.cargar();
  }

  filtrarRecibida(val: string): void {
    this.recibida = val;
    this.pagina = 1;
    this.cargar();
  }

  crear(): void {
    const ref = this.dialog.open(CompraFormDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      disableClose: true,
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.notify.exito('Compra creada');
          this.cargar();
        }
      });
  }

  verDetalle(compra: Compra): void {
    this.router.navigate(['/compras', compra.id]);
  }
}
