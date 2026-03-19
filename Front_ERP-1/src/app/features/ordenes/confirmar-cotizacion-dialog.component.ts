import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { MetodoPago } from '../../core/models/api.model';

const METODOS_PAGO: Array<{ value: MetodoPago; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta Débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CREDITO_CLIENTE', label: 'Crédito Cliente' },
];

@Component({
    selector: 'app-confirmar-cotizacion-dialog',
    imports: [
        ReactiveFormsModule, MatDialogModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './confirmar-cotizacion-dialog.component.html'
})
export class ConfirmarCotizacionDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<ConfirmarCotizacionDialogComponent>);
  readonly metodosPago = METODOS_PAGO;

  readonly form = this.fb.nonNullable.group({
    pagos: this.fb.array([this.crearPago()]),
  });

  get pagosArray(): FormArray {
    return this.form.get('pagos') as FormArray;
  }

  crearPago() {
    return this.fb.group({
      metodo: ['EFECTIVO' as MetodoPago, Validators.required],
      monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
      referencia: [''],
    });
  }

  agregarPago(): void {
    this.pagosArray.push(this.crearPago());
  }

  eliminarPago(index: number): void {
    this.pagosArray.removeAt(index);
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const pagos = this.form.getRawValue().pagos.map(p => ({
      metodo: p.metodo as MetodoPago,
      monto: Number(p.monto),
      ...(p.referencia ? { referencia: p.referencia } : {}),
    }));
    this.dialogRef.close(pagos);
  }
}
