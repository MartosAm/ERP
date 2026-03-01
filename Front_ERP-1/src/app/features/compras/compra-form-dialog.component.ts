import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ComprasService } from '../../core/services/compras.service';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { ProductosService } from '../../core/services/productos.service';
import { NotificationService } from '../../core/services/notification.service';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import type { Proveedor, Producto } from '../../core/models/api.model';

@Component({
  selector: 'app-compra-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatProgressSpinnerModule, MatDividerModule, MonedaPipe,
  ],
  templateUrl: './compra-form-dialog.component.html',
  styleUrl: './compra-form-dialog.component.css',
})
export class CompraFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ComprasService);
  private readonly proveedoresSvc = inject(ProveedoresService);
  private readonly productosSvc = inject(ProductosService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<CompraFormDialogComponent>);

  readonly guardando = signal(false);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly productos = signal<Producto[]>([]);

  readonly form = this.fb.nonNullable.group({
    proveedorId: ['', Validators.required],
    numeroFactura: [''],
    notas: [''],
    detalles: this.fb.array<FormGroup>([]),
  });

  ngOnInit(): void {
    this.proveedoresSvc.listar({ limite: 100, activo: true })
      .subscribe((res) => this.proveedores.set(res.datos));
    this.productosSvc.listar({ limite: 200, activo: true })
      .subscribe((res) => this.productos.set(res.datos));

    // Add initial empty row
    this.agregarLinea();
  }

  get detallesArray(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  getLinea(i: number): FormGroup {
    return this.detallesArray.at(i) as FormGroup;
  }

  agregarLinea(): void {
    this.detallesArray.push(
      this.fb.group({
        productoId: ['', Validators.required],
        cantidad: [1, [Validators.required, Validators.min(1)]],
        costoUnitario: [0, [Validators.required, Validators.min(0.01)]],
      }),
    );
  }

  eliminarLinea(i: number): void {
    this.detallesArray.removeAt(i);
  }

  get total(): number {
    return this.detallesArray.controls.reduce((sum, row) => {
      const r = row as FormGroup;
      const cant = r.get('cantidad')?.value || 0;
      const costo = r.get('costoUnitario')?.value || 0;
      return sum + cant * costo;
    }, 0);
  }

  guardar(): void {
    if (this.form.invalid || this.detallesArray.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      proveedorId: raw.proveedorId,
      detalles: (raw.detalles as any[]).map((d) => ({
        productoId: d.productoId as string,
        cantidad: d.cantidad as number,
        costoUnitario: d.costoUnitario as number,
      })),
    };
    if (raw.numeroFactura) payload['numeroFactura'] = raw.numeroFactura;
    if (raw.notas) payload['notas'] = raw.notas;

    this.svc.crear(payload as any).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al crear la compra');
      },
    });
  }
}
