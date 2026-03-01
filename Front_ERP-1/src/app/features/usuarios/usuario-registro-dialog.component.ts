import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-usuario-registro-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-green-600">person_add</mat-icon>
      Registrar usuario
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1">
        <mat-form-field appearance="outline">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombre" />
          @if (form.get('nombre')?.hasError('required') && form.get('nombre')?.touched) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput formControlName="correo" type="email" />
          @if (form.get('correo')?.hasError('email') && form.get('correo')?.touched) {
            <mat-error>Ingresa un correo válido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contraseña</mat-label>
          <input matInput formControlName="contrasena" type="password" />
          @if (form.get('contrasena')?.hasError('minlength') && form.get('contrasena')?.touched) {
            <mat-error>Mínimo 6 caracteres</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rol">
            <mat-option value="ADMIN">Admin</mat-option>
            <mat-option value="CAJERO">Cajero</mat-option>
            <mat-option value="REPARTIDOR">Repartidor</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teléfono (opcional)</mat-label>
          <input matInput formControlName="telefono" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || guardando()" (click)="guardar()">
        Registrar
      </button>
    </mat-dialog-actions>
  `,
})
export class UsuarioRegistroDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<UsuarioRegistroDialogComponent>);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['CAJERO', Validators.required],
    telefono: [''],
  });

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    const raw = this.form.getRawValue();
    this.authSvc
      .registrar({
        nombre: raw.nombre,
        correo: raw.correo,
        contrasena: raw.contrasena,
        rol: raw.rol as any,
        telefono: raw.telefono || undefined,
      })
      .subscribe({
        next: () => {
          this.notify.exito('Usuario registrado exitosamente');
          this.dialogRef.close(true);
        },
        error: () => {
          this.guardando.set(false);
          this.notify.error('Error al registrar usuario');
        },
      });
  }
}
