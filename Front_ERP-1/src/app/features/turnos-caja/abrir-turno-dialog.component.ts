import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';

interface CajaOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-abrir-turno-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './abrir-turno-dialog.component.html',
})
export class AbrirTurnoDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TurnosService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<AbrirTurnoDialogComponent>);

  readonly guardando = signal(false);
  readonly cajas = signal<CajaOption[]>([]);

  readonly form = this.fb.nonNullable.group({
    cajaRegistradoraId: ['', Validators.required],
    montoApertura: [0, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  ngOnInit(): void {
    // Load cajas from the turnos list API (we'll get them from existing data)
    // For now, we use a simple API call to get turnos with cajas info
    // Since there's no separate caja endpoint, we'll need to use the turnos API
    // In a real scenario, there would be a GET /cajas endpoint
    // For now we'll just let the user type the caja ID or we fetch from recent
    this.svc.listar({ limite: 50 }).subscribe((res) => {
      const cajaMap = new Map<string, string>();
      res.datos.forEach((t) => {
        cajaMap.set(t.cajaRegistradora.id, t.cajaRegistradora.nombre);
      });
      this.cajas.set(
        Array.from(cajaMap.entries()).map(([id, nombre]) => ({ id, nombre })),
      );
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      cajaRegistradoraId: raw.cajaRegistradoraId,
      montoApertura: raw.montoApertura,
    };
    if (raw.notas) payload['notas'] = raw.notas;

    this.svc.abrir(payload as any).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al abrir el turno');
      },
    });
  }
}
