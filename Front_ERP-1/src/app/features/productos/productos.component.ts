import { Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductosService } from '../../core/services/productos.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';
import type { Producto } from '../../core/models/api.model';

@Component({
    selector: 'app-productos',
    imports: [
        CommonModule, CurrencyPipe,
        MatTableModule, MatPaginatorModule, MatButtonModule,
        MatIconModule, MatMenuModule, MatDialogModule,
        MatProgressSpinnerModule,
        PageHeaderComponent, SearchInputComponent, EmptyStateComponent,
        EstadoBadgeComponent, MonedaPipe,
    ],
    templateUrl: './productos.component.html',
    styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly svc = inject(ProductosService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas = ['sku', 'nombre', 'categoria', 'precio', 'stock', 'activo', 'acciones'];
  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly porPagina = signal(20);

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
        this.productos.set(res.datos);
        this.total.set(res.meta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notify.error('Error al cargar productos');
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
    this.dialog.open(ProductoFormDialogComponent, {
      width: '700px',
      data: { modo: 'crear' },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  editar(producto: Producto): void {
    this.dialog.open(ProductoFormDialogComponent, {
      width: '700px',
      data: { modo: 'editar', producto },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  eliminar(producto: Producto): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar producto',
        mensaje: `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar',
        color: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.svc.eliminar(producto.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito('Producto eliminado');
          this.cargar();
        },
        error: () => this.notify.error('Error al eliminar producto'),
      });
    });
  }

  toggleActivo(producto: Producto): void {
    this.svc.actualizar(producto.id, { activo: !producto.activo })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito(producto.activo ? 'Producto desactivado' : 'Producto activado');
          this.cargar();
        },
        error: () => this.notify.error('Error al actualizar producto'),
      });
  }
}
