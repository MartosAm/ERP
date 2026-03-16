import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { ProductosService } from '../../core/services/productos.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { ClientesService } from '../../core/services/clientes.service';
import { OrdenesService } from '../../core/services/ordenes.service';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { CobrarDialogComponent } from './cobrar-dialog.component';
import { ClienteDialogComponent } from './cliente-dialog.component';
import { TicketDialogComponent } from './ticket-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

import type {
  Producto,
  ProductoPOS,
  CategoriaArbol,
  Cliente,
  CrearOrdenDto,
  MetodoPago,
  OrdenCreada,
} from '../../core/models/api.model';

/** Línea individual del carrito POS */
export interface LineaCarrito {
  productoId: string;
  nombre: string;
  sku: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  imagenUrl: string | null;
  impuestoIncluido: boolean;
  tasaImpuesto: number;
  stockDisponible: number | null;
  tipoUnidad: string;
}

/** Tipo de precio seleccionable */
type ListaPrecio = 1 | 2 | 3;

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatMenuModule,
    MonedaPipe,
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
})
export class PosComponent implements OnInit {
  private readonly productosSvc = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly clientesSvc = inject(ClientesService);
  private readonly ordenesSvc = inject(OrdenesService);
  private readonly turnosSvc = inject(TurnosService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Estado turno ──────────────────────────────────────────
  readonly turnoActivo = this.turnosSvc.turnoActivo;

  // ─── Categorías y productos ────────────────────────────────
  readonly categorias = signal<CategoriaArbol[]>([]);
  readonly categoriaSeleccionada = signal<string | null>(null);
  readonly productos = signal<Producto[]>([]);
  readonly cargandoProductos = signal(false);

  // ─── Búsqueda ──────────────────────────────────────────────
  readonly busqueda$ = new Subject<string>();
  terminoBusqueda = '';

  // ─── Carrito ───────────────────────────────────────────────
  readonly lineas = signal<LineaCarrito[]>([]);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly listaPrecio = signal<ListaPrecio>(1);
  readonly notas = signal('');
  readonly procesandoCobro = signal(false);

  // ─── Computed del carrito ──────────────────────────────────
  readonly subtotal = computed(() =>
    this.lineas().reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0),
  );

  readonly totalDescuento = computed(() =>
    this.lineas().reduce((sum, l) => sum + l.descuento * l.cantidad, 0),
  );

  readonly totalImpuesto = computed(() =>
    this.lineas().reduce((sum, l) => {
      const base = (l.precioUnitario - l.descuento) * l.cantidad;
      if (l.impuestoIncluido) {
        return sum + (base - base / (1 + l.tasaImpuesto));
      }
      return sum + base * l.tasaImpuesto;
    }, 0),
  );

  readonly total = computed(() => {
    return this.lineas().reduce((sum, l) => {
      const base = (l.precioUnitario - l.descuento) * l.cantidad;
      if (l.impuestoIncluido) return sum + base;
      return sum + base + base * l.tasaImpuesto;
    }, 0);
  });

  readonly totalItems = computed(() =>
    this.lineas().reduce((sum, l) => sum + l.cantidad, 0),
  );

  // ─── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    // Cargar turno activo
    this.turnosSvc
      .obtenerActivo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // Cargar categorías
    this.categoriasSvc
      .obtenerArbol()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => this.categorias.set(cats));

    // Cargar productos iniciales
    this.cargarProductos();

    // Búsqueda con debounce
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        this.terminoBusqueda = term;
        this.cargarProductos();
      });
  }

  // ─── Teclado ───────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // F2 → Cobrar
    if (event.key === 'F2' && this.lineas().length > 0 && !this.procesandoCobro()) {
      event.preventDefault();
      this.cobrar();
    }
    // F4 → Buscar producto (focus)
    if (event.key === 'F4') {
      event.preventDefault();
      document.getElementById('pos-busqueda')?.focus();
    }
    // Escape → Limpiar carrito (con confirmación si hay items)
    if (event.key === 'Escape' && this.lineas().length > 0) {
      event.preventDefault();
      this.limpiarCarrito();
    }
  }

  // ─── Productos ─────────────────────────────────────────────
  cargarProductos(): void {
    this.cargandoProductos.set(true);
    const params: Record<string, string | number | boolean> = {
      limite: 50,
      activo: true,
    };
    if (this.terminoBusqueda) params['buscar'] = this.terminoBusqueda;
    if (this.categoriaSeleccionada())
      params['categoriaId'] = this.categoriaSeleccionada()!;

    this.productosSvc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.productos.set(res.datos);
          this.cargandoProductos.set(false);
        },
        error: () => this.cargandoProductos.set(false),
      });
  }

  seleccionarCategoria(catId: string | null): void {
    this.categoriaSeleccionada.set(catId === this.categoriaSeleccionada() ? null : catId);
    this.cargarProductos();
  }

  onBuscar(term: string): void {
    this.busqueda$.next(term);
  }

  // Buscar por código de barras / SKU (enter en input)
  buscarPorCodigo(codigo: string): void {
    if (!codigo.trim()) return;
    this.productosSvc
      .buscarPorCodigo(codigo.trim())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.notify.error('Producto no encontrado');
          return of(null);
        }),
      )
      .subscribe((producto) => {
        if (producto) {
          this.agregarAlCarrito(producto);
          this.terminoBusqueda = '';
        }
      });
  }

  // ─── Carrito ───────────────────────────────────────────────
  agregarProducto(producto: Producto): void {
    const precio = this.getPrecio(producto);
    const stock = this.getStockDisponible(producto);

    const lineasActuales = this.lineas();
    const existente = lineasActuales.find((l) => l.productoId === producto.id);

    if (existente) {
      // Verificar stock
      if (stock !== null && existente.cantidad >= stock) {
        this.notify.error(`Stock insuficiente para "${producto.nombre}"`);
        return;
      }
      this.lineas.set(
        lineasActuales.map((l) =>
          l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        ),
      );
    } else {
      if (stock !== null && stock <= 0) {
        this.notify.error(`Sin stock disponible para "${producto.nombre}"`);
        return;
      }
      this.lineas.set([
        ...lineasActuales,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          precioUnitario: precio,
          cantidad: 1,
          descuento: 0,
          imagenUrl: producto.imagenUrl,
          impuestoIncluido: producto.impuestoIncluido,
          tasaImpuesto: producto.tasaImpuesto,
          stockDisponible: stock,
          tipoUnidad: producto.etiquetaUnidad,
        },
      ]);
    }
  }

  agregarAlCarrito(producto: ProductoPOS): void {
    const precio = this.getPrecioPOS(producto);
    const stock =
      producto.existencias.length > 0
        ? producto.existencias.reduce((s, e) => s + e.cantidad, 0)
        : null;

    const lineasActuales = this.lineas();
    const existente = lineasActuales.find((l) => l.productoId === producto.id);

    if (existente) {
      if (stock !== null && existente.cantidad >= stock) {
        this.notify.error(`Stock insuficiente para "${producto.nombre}"`);
        return;
      }
      this.lineas.set(
        lineasActuales.map((l) =>
          l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        ),
      );
    } else {
      this.lineas.set([
        ...lineasActuales,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          precioUnitario: precio,
          cantidad: 1,
          descuento: 0,
          imagenUrl: producto.imagenUrl,
          impuestoIncluido: producto.impuestoIncluido,
          tasaImpuesto: producto.tasaImpuesto,
          stockDisponible: stock,
          tipoUnidad: producto.etiquetaUnidad,
        },
      ]);
    }
  }

  actualizarCantidad(productoId: string, cantidad: number): void {
    if (cantidad <= 0) {
      this.eliminarLinea(productoId);
      return;
    }
    this.lineas.set(
      this.lineas().map((l) => (l.productoId === productoId ? { ...l, cantidad } : l)),
    );
  }

  actualizarDescuento(productoId: string, descuento: number): void {
    this.lineas.set(
      this.lineas().map((l) =>
        l.productoId === productoId ? { ...l, descuento: Math.max(0, descuento) } : l,
      ),
    );
  }

  eliminarLinea(productoId: string): void {
    this.lineas.set(this.lineas().filter((l) => l.productoId !== productoId));
  }

  limpiarCarrito(): void {
    if (this.lineas().length === 0) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Limpiar carrito',
        mensaje: '¿Deseas descartar todos los productos del carrito?',
        textoConfirmar: 'Limpiar',
        color: 'warn',
      },
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (ok) {
          this.lineas.set([]);
          this.clienteSeleccionado.set(null);
          this.notas.set('');
        }
      });
  }

  // ─── Cliente ───────────────────────────────────────────────
  seleccionarCliente(): void {
    const ref = this.dialog.open(ClienteDialogComponent, { width: '500px' });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cliente: Cliente | undefined) => {
        if (cliente) this.clienteSeleccionado.set(cliente);
      });
  }

  quitarCliente(): void {
    this.clienteSeleccionado.set(null);
  }

  // ─── Precio ────────────────────────────────────────────────
  private getPrecio(p: Producto): number {
    switch (this.listaPrecio()) {
      case 2:
        return Number(p.precioVenta2 ?? p.precioVenta1);
      case 3:
        return Number(p.precioVenta3 ?? p.precioVenta1);
      default:
        return Number(p.precioVenta1);
    }
  }

  private getPrecioPOS(p: ProductoPOS): number {
    switch (this.listaPrecio()) {
      case 2:
        return Number(p.precioVenta2 ?? p.precioVenta1);
      case 3:
        return Number(p.precioVenta3 ?? p.precioVenta1);
      default:
        return Number(p.precioVenta1);
    }
  }

  private getStockDisponible(p: Producto): number | null {
    if (!p.rastrearInventario) return null;
    return p._count?.existencias ?? null;
  }

  // ─── Cobrar ────────────────────────────────────────────────
  cobrar(): void {
    if (this.procesandoCobro()) {
      return;
    }

    if (!this.turnoActivo()) {
      this.notify.error('Debes abrir un turno de caja para poder vender');
      return;
    }
    if (this.lineas().length === 0) return;

    const ref = this.dialog.open(CobrarDialogComponent, {
      width: '550px',
      disableClose: true,
      data: {
        total: this.total(),
        clienteId: this.clienteSeleccionado()?.id,
      },
    });

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (
          resultado:
            | { pagos: Array<{ metodo: MetodoPago; monto: number; referencia?: string }> }
            | undefined,
        ) => {
          if (resultado) this.procesarVenta(resultado.pagos);
        },
      );
  }

  private procesarVenta(
    pagos: Array<{ metodo: MetodoPago; monto: number; referencia?: string }>,
  ): void {
    if (this.procesandoCobro()) {
      return;
    }

    this.procesandoCobro.set(true);

    const payload: CrearOrdenDto = {
      detalles: this.lineas().map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        descuento: l.descuento,
      })),
      pagos,
    };
    if (this.clienteSeleccionado()) payload.clienteId = this.clienteSeleccionado()!.id;
    if (this.notas()) payload.notas = this.notas();

    this.ordenesSvc
      .crear(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orden: OrdenCreada) => {
          this.notify.exito(`Venta ${orden.numeroOrden} completada`);
          this.mostrarTicket(orden);
          // Limpiar carrito
          this.lineas.set([]);
          this.clienteSeleccionado.set(null);
          this.notas.set('');
          this.procesandoCobro.set(false);
        },
        error: () => {
          this.notify.error('Error al procesar la venta');
          this.procesandoCobro.set(false);
        },
      });
  }

  private mostrarTicket(orden: OrdenCreada): void {
    this.dialog.open(TicketDialogComponent, {
      width: '400px',
      data: { orden },
    });
  }

  // ─── Lista de precios ──────────────────────────────────────
  cambiarListaPrecio(lista: ListaPrecio): void {
    this.listaPrecio.set(lista);
    // Re-calcular precios de las líneas existentes
    // No cambiamos precios de items ya en carrito para evitar confusión
  }
}
