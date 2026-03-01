import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrdenesService } from '../../core/services/ordenes.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha.pipe';
import type { Orden, PaginacionMeta, EstadoOrden, ApiPaginada } from '../../core/models/api.model';

interface FiltroEstado {
  label: string;
  value: EstadoOrden | '';
}

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatChipsModule,
    MatFormFieldModule, MatDatepickerModule, MatInputModule,
    MatNativeDateModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, SearchInputComponent,
    EmptyStateComponent, EstadoBadgeComponent,
    MonedaPipe, FechaCortaPipe,
  ],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.css',
})
export class OrdenesComponent implements OnInit {
  private readonly svc = inject(OrdenesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Orden[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);
  readonly columnas = ['numeroOrden', 'cliente', 'estado', 'total', 'metodoPago', 'fecha', 'acciones'];

  buscar = '';
  pagina = 1;
  limite = 20;
  estadoFiltro: EstadoOrden | '' = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  readonly estados: FiltroEstado[] = [
    { label: 'Todas', value: '' },
    { label: 'Cotización', value: 'COTIZACION' },
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En proceso', value: 'EN_PROCESO' },
    { label: 'Completada', value: 'COMPLETADA' },
    { label: 'Cancelada', value: 'CANCELADA' },
    { label: 'Devuelta', value: 'DEVUELTA' },
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
    if (this.estadoFiltro) params['estado'] = this.estadoFiltro;
    if (this.fechaDesde) params['fechaDesde'] = this.fechaDesde.toISOString();
    if (this.fechaHasta) params['fechaHasta'] = this.fechaHasta.toISOString();

    this.svc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<Orden>) => {
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

  filtrarEstado(estado: EstadoOrden | ''): void {
    this.estadoFiltro = estado;
    this.pagina = 1;
    this.cargar();
  }

  filtrarFechas(): void {
    this.pagina = 1;
    this.cargar();
  }

  limpiarFechas(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.pagina = 1;
    this.cargar();
  }

  verDetalle(orden: Orden): void {
    this.router.navigate(['/ordenes', orden.id]);
  }
}
