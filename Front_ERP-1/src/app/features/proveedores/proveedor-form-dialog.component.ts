import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Proveedor } from '../../core/models/api.model';

interface DialogData {
  modo: 'crear' | 'editar';
  proveedor?: Proveedor;
}

@Component({
  selector: 'app-proveedor-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './proveedor-form-dialog.component.html',
  styleUrl: './proveedor-form-dialog.component.css',
})
export class ProveedorFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ProveedoresService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<ProveedorFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    nombreContacto: [''],
    telefono: [''],
    correo: ['', [Validators.email]],
    direccion: [''],
    rfc: ['', [Validators.maxLength(13)]],
    notas: [''],
  });

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  constructor() {
    if (this.esEdicion && this.data.proveedor) {
      const p = this.data.proveedor;
      this.form.patchValue({
        nombre: p.nombre,
        nombreContacto: p.nombreContacto ?? '',
        telefono: p.telefono ?? '',
        correo: p.correo ?? '',
        direccion: p.direccion ?? '',
        rfc: p.rfc ?? '',
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

    const payload: Record<string, unknown> = { nombre: raw.nombre };
    if (raw.nombreContacto) payload['nombreContacto'] = raw.nombreContacto;
    if (raw.telefono) payload['telefono'] = raw.telefono;
    if (raw.correo) payload['correo'] = raw.correo;
    if (raw.direccion) payload['direccion'] = raw.direccion;
    if (raw.rfc) payload['rfc'] = raw.rfc;
    if (raw.notas) payload['notas'] = raw.notas;

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.proveedor!.id, payload)
      : this.svc.crear(payload as { nombre: string });

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Proveedor actualizado' : 'Proveedor creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar proveedor');
      },
    });
  }
}
