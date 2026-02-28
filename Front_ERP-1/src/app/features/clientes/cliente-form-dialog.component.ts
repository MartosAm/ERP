import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientesService } from '../../core/services/clientes.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Cliente, ClienteDto } from '../../core/models/api.model';

interface DialogData {
  modo: 'crear' | 'editar';
  cliente?: Cliente;
}

@Component({
  selector: 'app-cliente-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './cliente-form-dialog.component.html',
  styleUrl: './cliente-form-dialog.component.css',
})
export class ClienteFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(ClientesService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<ClienteFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    telefono: [''],
    correo: ['', [Validators.email]],
    direccion: [''],
    rfc: ['', [Validators.maxLength(13)]],
    notas: [''],
    limiteCredito: [0, [Validators.min(0)]],
    diasCredito: [0, [Validators.min(0)]],
  });

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  constructor() {
    if (this.esEdicion && this.data.cliente) {
      const c = this.data.cliente;
      this.form.patchValue({
        nombre: c.nombre,
        telefono: c.telefono ?? '',
        correo: c.correo ?? '',
        direccion: c.direccion ?? '',
        rfc: c.rfc ?? '',
        limiteCredito: c.limiteCredito,
        diasCredito: c.diasCredito,
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

    const payload: ClienteDto = { nombre: raw.nombre };
    if (raw.telefono) payload.telefono = raw.telefono;
    if (raw.correo) payload.correo = raw.correo;
    if (raw.direccion) payload.direccion = raw.direccion;
    if (raw.rfc) payload.rfc = raw.rfc;
    if (raw.notas) payload.notas = raw.notas;
    if (raw.limiteCredito > 0) payload.limiteCredito = raw.limiteCredito;
    if (raw.diasCredito > 0) payload.diasCredito = raw.diasCredito;

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.cliente!.id, payload)
      : this.svc.crear(payload);

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Cliente actualizado' : 'Cliente creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar cliente');
      },
    });
  }
}
