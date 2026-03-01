import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventarioService } from '../../core/services/inventario.service';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { AjusteDialogComponent } from './ajuste-dialog.component';
import { TrasladoDialogComponent } from './traslado-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { Existencia, MovimientoInventario, Almacen, PaginacionMeta, ApiPaginada } from '../../core/models/api.model';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatTabsModule,
    MatIconModule, MatButtonModule, MatSelectModule,
    MatFormFieldModule, MatChipsModule, MatProgressSpinnerModule,
    PageHeaderComponent, SearchInputComponent,
    EmptyStateComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css',
})
export class InventarioComponent implements OnInit {
  private readonly svc = inject(InventarioService);
  private readonly almacenesSvc = inject(AlmacenesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // Existencias
  readonly existencias = signal<Existencia[]>([]);
  readonly metaExist = signal<PaginacionMeta | null>(null);
  readonly cargandoExist = signal(false);
  readonly colExistencias = ['producto', 'almacen', 'cantidad', 'stockMinimo', 'estado'];

  // Movimientos
  readonly movimientos = signal<MovimientoInventario[]>([]);
  readonly metaMov = signal<PaginacionMeta | null>(null);
  readonly cargandoMov = signal(false);
  readonly colMovimientos = ['fecha', 'tipo', 'producto', 'almacen', 'cantidad', 'anterior', 'posterior', 'usuario'];

  readonly almacenes = signal<Almacen[]>([]);

  buscarExist = '';
  paginaExist = 1;
  limiteExist = 20;
  almacenExist = '';
  soloStockBajo = false;

  paginaMov = 1;
  limiteMov = 20;
  almacenMov = '';
  tipoMov = '';

  tabActivo = 0;

  ngOnInit(): void {
    this.almacenesSvc.listar({ limite: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.almacenes.set(res.datos));

    this.cargarExistencias();
  }

  onTabChange(idx: number): void {
    this.tabActivo = idx;
    if (idx === 0) this.cargarExistencias();
    else this.cargarMovimientos();
  }

  // ── Existencias ──
  cargarExistencias(): void {
    this.cargandoExist.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.paginaExist,
      limite: this.limiteExist,
    };
    if (this.buscarExist) params['buscar'] = this.buscarExist;
    if (this.almacenExist) params['almacenId'] = this.almacenExist;
    if (this.soloStockBajo) params['stockBajo'] = true;

    this.svc.consultarExistencias(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<Existencia>) => {
          this.existencias.set(res.datos);
          this.metaExist.set(res.meta);
          this.cargandoExist.set(false);
        },
        error: () => this.cargandoExist.set(false),
      });
  }

  onBuscarExist(term: string): void {
    this.buscarExist = term;
    this.paginaExist = 1;
    this.cargarExistencias();
  }

  onPageExist(ev: PageEvent): void {
    this.paginaExist = ev.pageIndex + 1;
    this.limiteExist = ev.pageSize;
    this.cargarExistencias();
  }

  filtrarAlmacenExist(id: string): void {
    this.almacenExist = id;
    this.paginaExist = 1;
    this.cargarExistencias();
  }

  toggleStockBajo(): void {
    this.soloStockBajo = !this.soloStockBajo;
    this.paginaExist = 1;
    this.cargarExistencias();
  }

  esStockBajo(e: Existencia): boolean {
    return e.cantidad <= e.producto.stockMinimo;
  }

  // ── Movimientos ──
  cargarMovimientos(): void {
    this.cargandoMov.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.paginaMov,
      limite: this.limiteMov,
    };
    if (this.almacenMov) params['almacenId'] = this.almacenMov;
    if (this.tipoMov) params['tipoMovimiento'] = this.tipoMov;

    this.svc.movimientos(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<MovimientoInventario>) => {
          this.movimientos.set(res.datos);
          this.metaMov.set(res.meta);
          this.cargandoMov.set(false);
        },
        error: () => this.cargandoMov.set(false),
      });
  }

  onPageMov(ev: PageEvent): void {
    this.paginaMov = ev.pageIndex + 1;
    this.limiteMov = ev.pageSize;
    this.cargarMovimientos();
  }

  filtrarAlmacenMov(id: string): void {
    this.almacenMov = id;
    this.paginaMov = 1;
    this.cargarMovimientos();
  }

  filtrarTipoMov(tipo: string): void {
    this.tipoMov = tipo;
    this.paginaMov = 1;
    this.cargarMovimientos();
  }

  // ── Acciones ──
  abrirAjuste(): void {
    const ref = this.dialog.open(AjusteDialogComponent, {
      width: '500px',
      disableClose: true,
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.notify.exito('Ajuste registrado');
          this.cargarExistencias();
          if (this.tabActivo === 1) this.cargarMovimientos();
        }
      });
  }

  abrirTraslado(): void {
    const ref = this.dialog.open(TrasladoDialogComponent, {
      width: '500px',
      disableClose: true,
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.notify.exito('Traslado registrado');
          this.cargarExistencias();
          if (this.tabActivo === 1) this.cargarMovimientos();
        }
      });
  }
}
