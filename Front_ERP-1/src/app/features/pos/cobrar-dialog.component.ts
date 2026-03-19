import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import type { MetodoPago } from '../../core/models/api.model';

interface CobrarData {
  total: number;
  clienteId?: string;
}

interface OpcionPago {
  value: MetodoPago;
  label: string;
  icon: string;
}

@Component({
    selector: 'app-cobrar-dialog',
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatDividerModule,
        MonedaPipe,
    ],
    templateUrl: './cobrar-dialog.component.html',
    styleUrl: './cobrar-dialog.component.css'
})
export class CobrarDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<CobrarDialogComponent>);
  readonly data: CobrarData = inject(MAT_DIALOG_DATA);

  readonly metodosPago: OpcionPago[] = [
    { value: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta débito', icon: 'credit_card' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta crédito', icon: 'credit_card' },
    { value: 'TRANSFERENCIA', label: 'Transferencia', icon: 'swap_horiz' },
    ...(this.data.clienteId
      ? [{ value: 'CREDITO_CLIENTE' as MetodoPago, label: 'Crédito cliente', icon: 'account_balance' }]
      : []),
  ];

  readonly pagoUnico = signal(true);

  readonly form = this.fb.nonNullable.group({
    metodo: ['EFECTIVO' as string, Validators.required],
    monto: [this.data.total, [Validators.required, Validators.min(0.01)]],
    referencia: [''],
  });

  readonly pagosMultiples = this.fb.array<FormGroup>([]);

  readonly montoPagado = computed(() => {
    if (this.pagoUnico()) {
      return this.form.get('monto')?.value ?? 0;
    }
    return this.pagosMultiples.controls.reduce(
      (sum, c) => sum + ((c as FormGroup).get('monto')?.value ?? 0), 0,
    );
  });

  get cambio(): number {
    const pagado = this.pagoUnico()
      ? (this.form.get('monto')?.value ?? 0)
      : this.pagosMultiples.controls.reduce(
          (sum, c) => sum + ((c as FormGroup).get('monto')?.value ?? 0), 0,
        );
    return Math.max(0, pagado - this.data.total);
  }

  get faltante(): number {
    const pagado = this.pagoUnico()
      ? (this.form.get('monto')?.value ?? 0)
      : this.pagosMultiples.controls.reduce(
          (sum, c) => sum + ((c as FormGroup).get('monto')?.value ?? 0), 0,
        );
    return Math.max(0, this.data.total - pagado);
  }

  get puedeCobrar(): boolean {
    return this.faltante <= 0;
  }

  // ─── Pago múltiple ─────────────────────────────────────
  activarPagoMultiple(): void {
    this.pagoUnico.set(false);
    this.pagosMultiples.clear();
    this.agregarPago();
  }

  activarPagoUnico(): void {
    this.pagoUnico.set(true);
    this.form.patchValue({ monto: this.data.total, metodo: 'EFECTIVO' });
  }

  agregarPago(): void {
    this.pagosMultiples.push(
      this.fb.group({
        metodo: ['EFECTIVO', Validators.required],
        monto: [this.faltante > 0 ? this.faltante : 0, [Validators.required, Validators.min(0.01)]],
        referencia: [''],
      }),
    );
  }

  eliminarPago(i: number): void {
    this.pagosMultiples.removeAt(i);
  }

  getPagoGroup(i: number): FormGroup {
    return this.pagosMultiples.at(i) as FormGroup;
  }

  // ─── Atajos de efectivo ────────────────────────────────
  setMontoExacto(): void {
    this.form.patchValue({ monto: this.data.total });
  }

  setMontoBillete(valor: number): void {
    this.form.patchValue({ monto: valor });
  }

  // ─── Cobrar ────────────────────────────────────────────
  confirmar(): void {
    if (this.pagoUnico()) {
      if (this.form.invalid || this.faltante > 0) {
        this.form.markAllAsTouched();
        return;
      }
      const raw = this.form.getRawValue();
      const pagos: Array<{ metodo: MetodoPago; monto: number; referencia?: string }> = [
        {
          metodo: raw.metodo as MetodoPago,
          monto: raw.monto,
          ...(raw.referencia ? { referencia: raw.referencia } : {}),
        },
      ];
      this.dialogRef.close({ pagos });
    } else {
      if (this.pagosMultiples.invalid || this.faltante > 0) {
        this.pagosMultiples.markAllAsTouched();
        return;
      }
      const pagos = (this.pagosMultiples.getRawValue() as any[]).map((p) => ({
        metodo: p.metodo as MetodoPago,
        monto: p.monto as number,
        ...(p.referencia ? { referencia: p.referencia as string } : {}),
      }));
      this.dialogRef.close({ pagos });
    }
  }
}
