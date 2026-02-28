import { Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { AlmacenFormDialogComponent } from './almacen-form-dialog.component';
import type { Almacen } from '../../core/models/api.model';

@Component({
  selector: 'app-almacenes',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatMenuModule, MatDialogModule, MatChipsModule,
    MatProgressSpinnerModule,
    PageHeaderComponent, SearchInputComponent, EmptyStateComponent, EstadoBadgeComponent,
  ],
  templateUrl: './almacenes.component.html',
  styleUrl: './almacenes.component.css',
})
export class AlmacenesComponent implements OnInit {
  private readonly svc = inject(AlmacenesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas = ['nombre', 'direccion', 'esPrincipal', 'existencias', 'activo', 'acciones'];
  readonly almacenes = signal<Almacen[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly porPagina = signal(10);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const params: Record<string, string | number | boolean> = {
      pagina: this.pagina() + 1,
      porPagina: this.porPagina(),
    };
    if (this.busqueda()) params['buscar'] = this.busqueda();

    this.svc.listar(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.almacenes.set(res.datos);
        this.total.set(res.meta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notify.error('Error al cargar almacenes');
      },
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(0);
    this.cargar();
  }

  cambiarPagina(e: PageEvent): void {
    this.pagina.set(e.pageIndex);
    this.porPagina.set(e.pageSize);
    this.cargar();
  }

  crear(): void {
    this.dialog.open(AlmacenFormDialogComponent, {
      width: '500px',
      data: { modo: 'crear' },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  editar(almacen: Almacen): void {
    this.dialog.open(AlmacenFormDialogComponent, {
      width: '500px',
      data: { modo: 'editar', almacen },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  eliminar(almacen: Almacen): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar almacén',
        mensaje: `¿Eliminar "${almacen.nombre}"? Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar',
        color: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.svc.eliminar(almacen.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito('Almacén eliminado');
          this.cargar();
        },
        error: () => this.notify.error('Error al eliminar almacén'),
      });
    });
  }

  toggleActivo(almacen: Almacen): void {
    this.svc.actualizar(almacen.id, { activo: !almacen.activo })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito(almacen.activo ? 'Almacén desactivado' : 'Almacén activado');
          this.cargar();
        },
        error: () => this.notify.error('Error al actualizar almacén'),
      });
  }
}
