import {
  Component,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';

import type { PerfilUsuario, UsuarioAdmin } from '../../core/models/api.model';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    FechaHoraPipe,
  ],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css',
})
export class ConfiguracionComponent implements OnInit {
  private readonly authSvc = inject(AuthService);
  private readonly usuariosSvc = inject(UsuariosService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly perfil = signal<PerfilUsuario | null>(null);
  readonly cargando = signal(false);

  readonly esAdmin = this.authSvc.esAdmin;

  // ─── Formulario Cambiar PIN ────────────────────────────────
  readonly pinForm = this.fb.nonNullable.group({
    usuarioId: ['', Validators.required],
    nuevoPin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    confirmarPin: ['', Validators.required],
  });

  // Lista de usuarios para seleccionar (solo ADMIN)
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  guardandoPin = false;

  ngOnInit(): void {
    this.cargarPerfil();
    if (this.esAdmin()) {
      this.cargarUsuarios();
    }
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.authSvc
      .obtenerPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.perfil.set(p);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  private cargarUsuarios(): void {
    this.usuariosSvc
      .listar({ limite: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.usuarios.set(res.datos));
  }

  cambiarPin(): void {
    if (this.pinForm.invalid) {
      this.pinForm.markAllAsTouched();
      return;
    }
    const raw = this.pinForm.getRawValue();
    if (raw.nuevoPin !== raw.confirmarPin) {
      this.notify.error('Los PINs no coinciden');
      return;
    }
    this.guardandoPin = true;
    this.authSvc
      .cambiarPin({ usuarioId: raw.usuarioId, nuevoPin: raw.nuevoPin })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify.exito('PIN actualizado exitosamente');
          this.pinForm.reset();
          this.guardandoPin = false;
        },
        error: () => {
          this.guardandoPin = false;
          this.notify.error('Error al cambiar PIN');
        },
      });
  }

  getDiasLabel(dias: number[]): string {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias.map((d) => labels[d] || '').join(', ') || 'No asignados';
  }
}
