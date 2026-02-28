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
import { ClientesService } from '../../core/services/clientes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import type { Cliente } from '../../core/models/api.model';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatMenuModule, MatDialogModule,
    MatProgressSpinnerModule,
    PageHeaderComponent, SearchInputComponent, EmptyStateComponent,
    EstadoBadgeComponent, MonedaPipe,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css',
})
export class ClientesComponent implements OnInit {
  private readonly svc = inject(ClientesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas = ['nombre', 'telefono', 'correo', 'credito', 'ordenes', 'activo', 'acciones'];
  readonly clientes = signal<Cliente[]>([]);
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
        this.clientes.set(res.datos);
        this.total.set(res.meta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notify.error('Error al cargar clientes');
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
    this.dialog.open(ClienteFormDialogComponent, {
      width: '600px',
      data: { modo: 'crear' },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  editar(cliente: Cliente): void {
    this.dialog.open(ClienteFormDialogComponent, {
      width: '600px',
      data: { modo: 'editar', cliente },
    }).afterClosed().subscribe((ok) => ok && this.cargar());
  }

  eliminar(cliente: Cliente): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Eliminar cliente',
        mensaje: `¿Eliminar "${cliente.nombre}"? Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar',
        color: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.svc.eliminar(cliente.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito('Cliente eliminado');
          this.cargar();
        },
        error: () => this.notify.error('Error al eliminar cliente'),
      });
    });
  }

  toggleActivo(cliente: Cliente): void {
    this.svc.actualizar(cliente.id, { activo: !cliente.activo })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notify.exito(cliente.activo ? 'Cliente desactivado' : 'Cliente activado');
          this.cargar();
        },
        error: () => this.notify.error('Error al actualizar cliente'),
      });
  }

  creditoDisponible(c: Cliente): number {
    return c.limiteCredito - c.creditoUtilizado;
  }
}
