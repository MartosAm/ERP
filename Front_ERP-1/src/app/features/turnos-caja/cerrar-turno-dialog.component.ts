import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';
import { TurnoCaja } from '../../core/models/api.model';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';

@Component({
  selector: 'app-cerrar-turno-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MonedaPipe,
  ],
  templateUrl: './cerrar-turno-dialog.component.html',
})
export class CerrarTurnoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TurnosService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<CerrarTurnoDialogComponent>);
  readonly data: { turno: TurnoCaja } = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    montoCierre: [0, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      montoCierre: raw.montoCierre,
    };
    if (raw.notas) payload['notas'] = raw.notas;

    this.svc.cerrar(this.data.turno.id, payload as any).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al cerrar el turno');
      },
    });
  }
}
