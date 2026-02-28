import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductosService } from '../../core/services/productos.service';
import type { Producto, PaginacionMeta, ApiPaginada } from '../../core/models/api.model';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  private readonly svc = inject(ProductosService);

  readonly productos = signal<Producto[]>([]);
  readonly meta = signal<PaginacionMeta | null>(null);
  readonly cargando = signal(false);
  readonly columnas = ['sku', 'nombre', 'categoria', 'precio', 'activo'];

  buscar = '';
  pagina = 1;
  limite = 20;

  ngOnInit(): void {
    this.cargar();
  }

  /** Buscar: resetea a primera página y recarga */
  onBuscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listar({ pagina: this.pagina, limite: this.limite, buscar: this.buscar }).subscribe({
      next: (res: ApiPaginada<Producto>) => {
        this.productos.set(res.datos);
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
}
