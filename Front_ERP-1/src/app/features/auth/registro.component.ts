/**
 * features/auth/registro.component.ts
 * ------------------------------------------------------------------
 * Pantalla de auto-registro publico.
 * Crea una empresa nueva y su primer usuario ADMIN.
 * Despues del registro, redirige automaticamente al dashboard.
 *
 * Validaciones sincronizadas con el backend (RegistroPublicoSchema):
 * - Nombre: 2-100 caracteres
 * - Correo: formato email valido
 * - Contraseña: min 8 chars, 1 mayuscula, 1 minuscula, 1 numero
 * - Nombre empresa: 2-150 caracteres
 * - Telefono: 7-20 caracteres (opcional)
 * ------------------------------------------------------------------
 */

import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Validador custom: verifica que la contraseña cumpla requisitos de seguridad.
 * - Al menos una mayuscula
 * - Al menos una minuscula
 * - Al menos un numero
 */
function contrasenaSegura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  if (!valor) return null; // required se encarga de esto

  const errores: ValidationErrors = {};

  if (!/[A-Z]/.test(valor)) errores['sinMayuscula'] = true;
  if (!/[a-z]/.test(valor)) errores['sinMinuscula'] = true;
  if (!/[0-9]/.test(valor)) errores['sinNumero'] = true;

  return Object.keys(errores).length ? errores : null;
}

/**
 * Validador custom: confirmar contraseña debe coincidir.
 * Se aplica a nivel de grupo (cross-field validation).
 */
function confirmarContrasenaIgual(group: AbstractControl): ValidationErrors | null {
  const contrasena = group.get('contrasena')?.value;
  const confirmar = group.get('confirmarContrasena')?.value;

  if (!contrasena || !confirmar) return null;
  return contrasena === confirmar ? null : { contrasenasNoCoinciden: true };
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly ocultarPass = signal(true);
  readonly ocultarConfirmar = signal(true);
  readonly cargando = signal(false);
  readonly errorRegistro = signal<string | null>(null);

  /** Formulario con validación cross-field para confirmar contraseña */
  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8), contrasenaSegura]],
      confirmarContrasena: ['', [Validators.required]],
      nombreEmpresa: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      telefono: [''],
    },
    { validators: confirmarContrasenaIgual },
  );

  onRegistro(): void {
    // Marcar todos los campos como touched para mostrar errores
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorRegistro.set(null);

    const { confirmarContrasena, telefono, ...datos } = this.form.getRawValue();

    // Solo enviar teléfono si tiene valor
    const payload = {
      ...datos,
      ...(telefono ? { telefono } : {}),
    };

    this.auth
      .registroPublico(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify.exito('Cuenta creada exitosamente. ¡Bienvenido!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.cargando.set(false);
          const mensaje =
            err?.error?.error?.mensaje ??
            err?.error?.mensaje ??
            'Error al crear la cuenta. Intente de nuevo.';
          this.errorRegistro.set(mensaje);
        },
      });
  }

  /** Helpers para acceso sencillo en el template */
  get f() {
    return this.form.controls;
  }
}
