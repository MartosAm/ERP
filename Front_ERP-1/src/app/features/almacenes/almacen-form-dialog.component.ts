import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Almacen } from '../../core/models/api.model';

interface DialogData {
  modo: 'crear' | 'editar';
  almacen?: Almacen;
}

@Component({
  selector: 'app-almacen-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
  ],
  templateUrl: './almacen-form-dialog.component.html',
  styleUrl: './almacen-form-dialog.component.css',
})
export class AlmacenFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(AlmacenesService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<AlmacenFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    direccion: [''],
    esPrincipal: [false],
  });

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  constructor() {
    if (this.esEdicion && this.data.almacen) {
      const a = this.data.almacen;
      this.form.patchValue({
        nombre: a.nombre,
        direccion: a.direccion ?? '',
        esPrincipal: a.esPrincipal,
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

    const payload: Record<string, unknown> = {
      nombre: raw.nombre,
      esPrincipal: raw.esPrincipal,
    };
    if (raw.direccion) payload['direccion'] = raw.direccion;

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.almacen!.id, payload)
      : this.svc.crear(payload as { nombre: string });

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Almacén actualizado' : 'Almacén creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar almacén');
      },
    });
  }
}
