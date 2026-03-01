import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrdenesService } from '../../core/services/ordenes.service';
import { NotificationService } from '../../core/services/notification.service';
import type { OrdenDetalle, DetalleOrden } from '../../core/models/api.model';

interface DialogData {
  orden: OrdenDetalle;
}

@Component({
  selector: 'app-devolucion-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './devolucion-dialog.component.html',
})
export class DevolucionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(OrdenesService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<DevolucionDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.minLength(5)]],
    items: this.fb.array(
      this.data.orden.detalles.map((d: DetalleOrden) =>
        this.fb.group({
          seleccionado: [false],
          productoId: [d.productoId],
          productoNombre: [d.producto.nombre],
          cantidadMax: [d.cantidad],
          cantidad: [d.cantidad, [Validators.required, Validators.min(1)]],
          motivo: [''],
        }),
      ),
    ),
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  getItemGroup(i: number): FormGroup {
    return this.itemsArray.at(i) as FormGroup;
  }

  get haySeleccionados(): boolean {
    return this.itemsArray.controls.some(
      (c) => (c as FormGroup).get('seleccionado')?.value === true,
    );
  }

  guardar(): void {
    if (this.form.invalid || !this.haySeleccionados) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();
    const items = raw.items
      .filter((i: { seleccionado: boolean }) => i.seleccionado)
      .map((i: { productoId: string; cantidad: number; motivo: string }) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        motivo: i.motivo || raw.motivo,
      }));

    this.svc.devolver(this.data.orden.id, { motivo: raw.motivo, items }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al procesar la devolución');
      },
    });
  }
}
