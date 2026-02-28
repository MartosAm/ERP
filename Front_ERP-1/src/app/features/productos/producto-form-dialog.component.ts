import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ProductosService } from '../../core/services/productos.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Producto, CategoriaArbol, Proveedor, TipoUnidad, CrearProductoDto } from '../../core/models/api.model';

interface DialogData {
  modo: 'crear' | 'editar';
  producto?: Producto;
}

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatTabsModule,
  ],
  templateUrl: './producto-form-dialog.component.html',
  styleUrl: './producto-form-dialog.component.css',
})
export class ProductoFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ProductosService);
  private readonly categoriaSvc = inject(CategoriasService);
  private readonly proveedorSvc = inject(ProveedoresService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly categorias = signal<CategoriaArbol[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);

  readonly tiposUnidad: { valor: TipoUnidad; etiqueta: string }[] = [
    { valor: 'PIEZA', etiqueta: 'Pieza' },
    { valor: 'METRO', etiqueta: 'Metro' },
    { valor: 'KILO', etiqueta: 'Kilo' },
    { valor: 'LITRO', etiqueta: 'Litro' },
    { valor: 'AREA', etiqueta: 'Área' },
    { valor: 'CAJA', etiqueta: 'Caja' },
    { valor: 'SERVICIO', etiqueta: 'Servicio' },
  ];

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    sku: [''],
    codigoBarras: [''],
    descripcion: [''],
    marca: [''],
    modelo: [''],
    categoriaId: [''],
    proveedorId: [''],
    tipoUnidad: ['PIEZA' as TipoUnidad],
    etiquetaUnidad: ['pz'],
    precioCosto: [0, [Validators.required, Validators.min(0)]],
    precioVenta1: [0, [Validators.required, Validators.min(0.01)]],
    precioVenta2: [null as number | null],
    precioVenta3: [null as number | null],
    impuestoIncluido: [true],
    tasaImpuesto: [0.16],
    rastrearInventario: [true],
    stockMinimo: [0],
    stockMaximo: [null as number | null],
    notas: [''],
  });

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  ngOnInit(): void {
    this.categoriaSvc.obtenerArbol().subscribe((cats) => this.categorias.set(cats));
    this.proveedorSvc.listar({ porPagina: 200 }).subscribe((res) => this.proveedores.set(res.datos));

    if (this.esEdicion && this.data.producto) {
      const p = this.data.producto;
      this.form.patchValue({
        nombre: p.nombre,
        sku: p.sku ?? '',
        codigoBarras: p.codigoBarras ?? '',
        descripcion: p.descripcion ?? '',
        marca: p.marca ?? '',
        categoriaId: p.categoria?.id ?? '',
        proveedorId: p.proveedor?.id ?? '',
        tipoUnidad: p.tipoUnidad,
        etiquetaUnidad: p.etiquetaUnidad,
        precioCosto: p.precioCosto ?? 0,
        precioVenta1: p.precioVenta1,
        precioVenta2: p.precioVenta2,
        precioVenta3: p.precioVenta3,
        impuestoIncluido: p.impuestoIncluido,
        tasaImpuesto: p.tasaImpuesto,
        rastrearInventario: p.rastrearInventario,
        stockMinimo: p.stockMinimo,
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();

    const payload: CrearProductoDto = {
      nombre: raw.nombre,
      precioCosto: raw.precioCosto,
      precioVenta1: raw.precioVenta1,
    };

    if (raw.sku) payload.sku = raw.sku;
    if (raw.codigoBarras) payload.codigoBarras = raw.codigoBarras;
    if (raw.descripcion) payload.descripcion = raw.descripcion;
    if (raw.marca) payload.marca = raw.marca;
    if (raw.modelo) payload.modelo = raw.modelo;
    if (raw.categoriaId) payload.categoriaId = raw.categoriaId;
    if (raw.proveedorId) payload.proveedorId = raw.proveedorId;
    if (raw.tipoUnidad !== 'PIEZA') payload.tipoUnidad = raw.tipoUnidad;
    if (raw.etiquetaUnidad !== 'pz') payload.etiquetaUnidad = raw.etiquetaUnidad;
    if (raw.precioVenta2 != null) payload.precioVenta2 = raw.precioVenta2;
    if (raw.precioVenta3 != null) payload.precioVenta3 = raw.precioVenta3;
    payload.impuestoIncluido = raw.impuestoIncluido;
    payload.tasaImpuesto = raw.tasaImpuesto;
    payload.rastrearInventario = raw.rastrearInventario;
    if (raw.stockMinimo) payload.stockMinimo = raw.stockMinimo;
    if (raw.stockMaximo != null) payload.stockMaximo = raw.stockMaximo;
    if (raw.notas) payload.notas = raw.notas;

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.producto!.id, payload)
      : this.svc.crear(payload);

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Producto actualizado' : 'Producto creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar producto');
      },
    });
  }
}
