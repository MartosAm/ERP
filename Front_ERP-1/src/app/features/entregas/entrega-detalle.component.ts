import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntregasService } from '../../core/services/entregas.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { EntregaDetalle, EstadoEntrega } from '../../core/models/api.model';

interface TransicionEstado {
  label: string;
  value: EstadoEntrega;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-entrega-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatDividerModule, MatProgressSpinnerModule,
    PageHeaderComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './entrega-detalle.component.html',
  styleUrl: './entrega-detalle.component.css',
})
export class EntregaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(EntregasService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly entrega = signal<EntregaDetalle | null>(null);
  readonly cargando = signal(true);
  readonly actualizando = signal(false);
  readonly mostrarFormEstado = signal(false);

  readonly estadoForm = this.fb.nonNullable.group({
    estado: ['EN_RUTA' as EstadoEntrega, Validators.required],
    notas: [''],
    motivoFallo: [''],
    programadaEn: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);
  }

  cargar(id: string): void {
    this.cargando.set(true);
    this.svc
      .obtenerPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e: EntregaDetalle) => {
          this.entrega.set(e);
          this.cargando.set(false);
        },
        error: () => {
          this.notify.error('Error al cargar la entrega');
          this.cargando.set(false);
        },
      });
  }

  get transicionesDisponibles(): TransicionEstado[] {
    const e = this.entrega();
    if (!e) return [];

    const mapa: Record<string, TransicionEstado[]> = {
      ASIGNADO: [
        { label: 'Iniciar ruta', value: 'EN_RUTA', icon: 'directions_car', color: 'primary' },
      ],
      EN_RUTA: [
        { label: 'Marcar entregado', value: 'ENTREGADO', icon: 'check_circle', color: 'primary' },
        { label: 'No entregado', value: 'NO_ENTREGADO', icon: 'cancel', color: 'warn' },
        { label: 'Reprogramar', value: 'REPROGRAMADO', icon: 'schedule', color: 'accent' },
      ],
      REPROGRAMADO: [
        { label: 'Reasignar', value: 'ASIGNADO', icon: 'person', color: 'primary' },
        { label: 'Iniciar ruta', value: 'EN_RUTA', icon: 'directions_car', color: 'primary' },
      ],
    };

    return mapa[e.estado] || [];
  }

  get puedeActualizar(): boolean {
    return this.transicionesDisponibles.length > 0;
  }

  seleccionarTransicion(t: TransicionEstado): void {
    this.estadoForm.patchValue({ estado: t.value });
    this.mostrarFormEstado.set(true);
  }

  get requiereMotivo(): boolean {
    return this.estadoForm.get('estado')?.value === 'NO_ENTREGADO';
  }

  get requiereFecha(): boolean {
    return this.estadoForm.get('estado')?.value === 'REPROGRAMADO';
  }

  actualizarEstado(): void {
    const e = this.entrega();
    if (!e) return;

    const raw = this.estadoForm.getRawValue();
    if (this.requiereMotivo && !raw.motivoFallo) {
      this.notify.error('El motivo es obligatorio para entregas no realizadas');
      return;
    }
    if (this.requiereFecha && !raw.programadaEn) {
      this.notify.error('La fecha de reprogramación es obligatoria');
      return;
    }

    this.actualizando.set(true);
    const payload: Record<string, string> = { estado: raw.estado };
    if (raw.notas) payload['notas'] = raw.notas;
    if (raw.motivoFallo) payload['motivoFallo'] = raw.motivoFallo;
    if (raw.programadaEn) payload['programadaEn'] = new Date(raw.programadaEn).toISOString();

    this.svc.actualizarEstado(e.id, payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify.exito('Estado actualizado');
          this.mostrarFormEstado.set(false);
          this.actualizando.set(false);
          this.cargar(e.id);
        },
        error: () => {
          this.notify.error('Error al actualizar el estado');
          this.actualizando.set(false);
        },
      });
  }

  volver(): void {
    this.router.navigate(['/entregas']);
  }
}
