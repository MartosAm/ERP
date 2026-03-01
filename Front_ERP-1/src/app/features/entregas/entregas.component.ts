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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntregasService } from '../../core/services/entregas.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaCortaPipe, FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { Entrega, PaginacionMeta, EstadoEntrega, ApiPaginada } from '../../core/models/api.model';

interface FiltroEstado {
  label: string;
  value: EstadoEntrega | '' | 'PENDIENTES';
}

@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatChipsModule,
    MatProgressSpinnerModule,
    PageHeaderComponent, EmptyStateComponent, EstadoBadgeComponent,
    MonedaPipe, FechaCortaPipe, FechaHoraPipe,
  ],
  templateUrl: './entregas.component.html',
  styleUrl: './entregas.component.css',
})
export class EntregasComponent implements OnInit {
  private readonly svc = inject(EntregasService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Entrega[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);
  readonly columnas = ['orden', 'cliente', 'repartidor', 'estado', 'direccion', 'programada', 'acciones'];

  pagina = 1;
  limite = 20;
  estadoFiltro: EstadoEntrega | '' | 'PENDIENTES' = '';

  readonly estados: FiltroEstado[] = [
    { label: 'Todas', value: '' },
    { label: 'Pendientes', value: 'PENDIENTES' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'En ruta', value: 'EN_RUTA' },
    { label: 'Entregado', value: 'ENTREGADO' },
    { label: 'No entregado', value: 'NO_ENTREGADO' },
    { label: 'Reprogramado', value: 'REPROGRAMADO' },
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

    if (this.estadoFiltro === 'PENDIENTES') {
      params['pendientes'] = 'true';
    } else if (this.estadoFiltro) {
      params['estado'] = this.estadoFiltro;
    }

    this.svc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<Entrega>) => {
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

  filtrarEstado(estado: EstadoEntrega | '' | 'PENDIENTES'): void {
    this.estadoFiltro = estado;
    this.pagina = 1;
    this.cargar();
  }

  verDetalle(entrega: Entrega): void {
    this.router.navigate(['/entregas', entrega.id]);
  }
}
