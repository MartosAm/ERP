import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProveedorFormDialogComponent } from './proveedor-form-dialog.component';
import type { Proveedor, PaginacionMeta, ApiPaginada } from '../../core/models/api.model';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatPaginatorModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatProgressSpinnerModule,
    PageHeaderComponent, SearchInputComponent,
    EmptyStateComponent, EstadoBadgeComponent,
  ],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.css',
})
export class ProveedoresComponent implements OnInit {
  private readonly svc = inject(ProveedoresService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Proveedor[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);
  readonly columnas = ['nombre', 'contacto', 'telefono', 'correo', 'productos', 'activo', 'acciones'];

  buscar = '';
  pagina = 1;
  limite = 20;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.svc
      .listar({ pagina: this.pagina, limite: this.limite, buscar: this.buscar })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiPaginada<Proveedor>) => {
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

  crear(): void {
    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { modo: 'crear' },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => { if (ok) this.cargar(); });
  }

  editar(item: Proveedor): void {
    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { modo: 'editar', proveedor: item },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => { if (ok) this.cargar(); });
  }

  eliminar(item: Proveedor): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar proveedor',
        mensaje: `¿Estás seguro de eliminar "${item.nombre}"?`,
      },
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.svc.eliminar(item.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notify.exito('Proveedor eliminado');
              this.cargar();
            },
            error: () => this.notify.error('Error al eliminar proveedor'),
          });
      });
  }
}
