import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  DestroyRef,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, catchError, of } from 'rxjs';

import { ProductosService } from '../../core/services/productos.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { ClientesService } from '../../core/services/clientes.service';
import { OrdenesService } from '../../core/services/ordenes.service';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';

import { CobrarDialogComponent } from './cobrar-dialog.component';
import { ClienteDialogComponent } from './cliente-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

// Components POS Atomic
import { PosToolbarComponent } from './components/pos-toolbar/pos-toolbar.component';
import { PosCategoriesComponent } from './components/pos-categories/pos-categories.component';
import { PosProductListComponent } from './components/pos-product-list/pos-product-list.component';
import { PosCartComponent } from './components/pos-cart/pos-cart.component';

// Models
import { LineaCarrito, ListaPrecio } from './models/pos.model';
import type {
  Producto,
  ProductoPOS,
  CategoriaArbol,
  Cliente,
  CrearOrdenDto,
  MetodoPago,
  OrdenCreada,
} from '../../core/models/api.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PosToolbarComponent,
    PosCategoriesComponent,
    PosProductListComponent,
    PosCartComponent
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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
  readonly productos = signal<ProductoPOS[]>([]); // Using ProductoPOS to be consistent
  readonly cargandoProductos = signal(false);

  // ─── Búsqueda ──────────────────────────────────────────────
  readonly busqueda$ = new Subject<string>();
  readonly terminoBusqueda = signal('');

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
        this.terminoBusqueda.set(term);
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
    // F4 → Buscar producto (focus handled within component now via prop/method if needed, but keeping global listener is okay)
    if (event.key === 'F4') {
        // Ideally we pass focus signal to toolbar
      event.preventDefault();
      const input = document.querySelector('app-pos-toolbar input') as HTMLElement;
      if (input) input.focus();
    }
    // Escape → Limpiar carrito (con confirmación si hay items)
    if (event.key === 'Escape' && this.lineas().length > 0) {
      event.preventDefault();
      this.limpiarCarrito();
    }
    
    // F9 -> Shortcut for Cobrar from cart button
    if (event.key === 'F9' && this.lineas().length > 0) {
        event.preventDefault();
        this.cobrar();
    }
  }

  // ─── Productos ─────────────────────────────────────────────
  cargarProductos(): void {
    this.cargandoProductos.set(true);
    const params: Record<string, string | number | boolean> = {
      limite: 50,
      activo: true,
    };
    if (this.terminoBusqueda()) params['buscar'] = this.terminoBusqueda();
    if (this.categoriaSeleccionada())
      params['categoriaId'] = this.categoriaSeleccionada()!;

    this.productosSvc
      .listar(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          // Casting needed if service returns generic Producto[]; ProductoPOS has extra fields. 
          // Assuming service response is compatible or we map it. 
          // For now, let's trust existing logic.
          this.productos.set(res.datos as any);
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
  
  onEnterSearch(term: string): void {
      this.buscarPorCodigo(term);
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
          this.terminoBusqueda.set(''); 
          // Also clear input in toolbar visually via signal binding
        }
      });
  }
  
  cambiarListaPrecio(lista: number): void {
      this.listaPrecio.set(lista as ListaPrecio);
  }

  // ─── Carrito ───────────────────────────────────────────────
  // Helper to handle adding plain Producto or ProductoPOS
  agregarProducto(producto: ProductoPOS): void {
      this.agregarAlCarrito(producto);
  }

  agregarAlCarrito(producto: ProductoPOS): void {
    const precio = this.getPrecioPOS(producto);
    const stock =
      producto.existencias && producto.existencias.length > 0
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

  actualizarCantidad(event: { id: string; delta: number }): void {
    const { id, delta } = event;
    const line = this.lineas().find(l => l.productoId === id);
    if (!line) return;
    
    const nuevaCantidad = line.cantidad + delta;

    if (nuevaCantidad <= 0) {
      this.eliminarLinea(id);
      return;
    }
    
    // Check stock if increasing
    if (delta > 0 && line.stockDisponible !== null && nuevaCantidad > line.stockDisponible) {
         this.notify.error(`Stock máximo alcanzado`);
         return;
    }

    this.lineas.set(
      this.lineas().map((l) => (l.productoId === id ? { ...l, cantidad: nuevaCantidad } : l)),
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
          this.notify.success('Venta registrada con éxito');
          // Resetear
          this.lineas.set([]);
          this.clienteSeleccionado.set(null);
          this.notas.set('');
          this.procesandoCobro.set(false);
          // Opcional: mostrar ticket -> this.dialog.open(TicketDialogComponent, { data: orden });
        },
        error: () => {
          this.notify.error('Error al registrar la venta');
          this.procesandoCobro.set(false);
        },
      });
  }
}
