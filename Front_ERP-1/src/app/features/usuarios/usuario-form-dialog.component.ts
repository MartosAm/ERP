import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UsuariosService } from '../../core/services/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import type { UsuarioAdmin, Rol } from '../../core/models/api.model';

@Component({
  selector: 'app-usuario-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-indigo-600">edit</mat-icon>
      Editar usuario
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rol">
            <mat-option value="ADMIN">Admin</mat-option>
            <mat-option value="CAJERO">Cajero</mat-option>
            <mat-option value="REPARTIDOR">Repartidor</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || guardando" (click)="guardar()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
})
export class UsuarioFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(UsuariosService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<UsuarioFormDialogComponent>);
  readonly data: UsuarioAdmin = inject(MAT_DIALOG_DATA);

  guardando = false;

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.nombre, [Validators.required, Validators.minLength(2)]],
    telefono: [this.data.telefono ?? ''],
    rol: [this.data.rol as string, Validators.required],
  });

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const raw = this.form.getRawValue();
    this.svc
      .actualizar(this.data.id, {
        nombre: raw.nombre,
        telefono: raw.telefono || undefined,
        rol: raw.rol as Rol,
      })
      .subscribe({
        next: () => {
          this.notify.exito('Usuario actualizado');
          this.dialogRef.close(true);
        },
        error: () => {
          this.guardando = false;
          this.notify.error('Error al actualizar');
        },
      });
  }
}
