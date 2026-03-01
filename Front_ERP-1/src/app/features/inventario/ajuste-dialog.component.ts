import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventarioService } from '../../core/services/inventario.service';
import { ProductosService } from '../../core/services/productos.service';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Producto, Almacen } from '../../core/models/api.model';

@Component({
  selector: 'app-ajuste-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './ajuste-dialog.component.html',
})
export class AjusteDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(InventarioService);
  private readonly productosSvc = inject(ProductosService);
  private readonly almacenesSvc = inject(AlmacenesService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<AjusteDialogComponent>);

  readonly guardando = signal(false);
  readonly productos = signal<Producto[]>([]);
  readonly almacenes = signal<Almacen[]>([]);

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    almacenId: ['', Validators.required],
    cantidad: [0, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.productosSvc.listar({ limite: 200, activo: true })
      .subscribe((res) => this.productos.set(res.datos));
    this.almacenesSvc.listar({ limite: 100, activo: true })
      .subscribe((res) => this.almacenes.set(res.datos));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();

    this.svc.ajusteManual({
      productoId: raw.productoId,
      almacenId: raw.almacenId,
      cantidad: raw.cantidad,
      motivo: raw.motivo,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al registrar el ajuste');
      },
    });
  }
}
