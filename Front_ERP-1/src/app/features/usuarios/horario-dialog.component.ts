import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { UsuariosService } from '../../core/services/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import type { UsuarioAdmin } from '../../core/models/api.model';

const DIAS = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
];

@Component({
    selector: 'app-horario-dialog',
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule,
        MatFormFieldModule, MatInputModule, MatButtonModule,
        MatIconModule, MatCheckboxModule,
    ],
    template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-blue-600">schedule</mat-icon>
      Horario de {{ data.nombre }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-3">
          <mat-form-field appearance="outline">
            <mat-label>Hora inicio</mat-label>
            <input matInput type="time" formControlName="horarioInicio" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hora fin</mat-label>
            <input matInput type="time" formControlName="horarioFin" />
          </mat-form-field>
        </div>

        <p class="text-sm font-medium text-gray-600 mb-1">Días laborales</p>
        <div class="flex flex-col gap-1">
          @for (dia of dias; track dia.value) {
            <mat-checkbox
              [checked]="isDiaSeleccionado(dia.value)"
              (change)="toggleDia(dia.value, $event.checked)">
              {{ dia.label }}
            </mat-checkbox>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="guardando" (click)="guardar()">
        Guardar horario
      </button>
    </mat-dialog-actions>
  `
})
export class HorarioDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(UsuariosService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<HorarioDialogComponent>);
  readonly data: UsuarioAdmin = inject(MAT_DIALOG_DATA);

  readonly dias = DIAS;
  guardando = false;

  diasSeleccionados: Set<number> = new Set(this.data.diasLaborales || []);

  readonly form = this.fb.nonNullable.group({
    horarioInicio: [this.data.horarioInicio ?? '08:00'],
    horarioFin: [this.data.horarioFin ?? '18:00'],
  });

  isDiaSeleccionado(dia: number): boolean {
    return this.diasSeleccionados.has(dia);
  }

  toggleDia(dia: number, checked: boolean): void {
    if (checked) {
      this.diasSeleccionados.add(dia);
    } else {
      this.diasSeleccionados.delete(dia);
    }
  }

  guardar(): void {
    this.guardando = true;
    const raw = this.form.getRawValue();
    this.svc
      .asignarHorario(this.data.id, {
        horarioInicio: raw.horarioInicio || undefined,
        horarioFin: raw.horarioFin || undefined,
        diasLaborales: Array.from(this.diasSeleccionados).sort(),
      })
      .subscribe({
        next: () => {
          this.notify.exito('Horario actualizado');
          this.dialogRef.close(true);
        },
        error: () => {
          this.guardando = false;
          this.notify.error('Error al actualizar horario');
        },
      });
  }
}
