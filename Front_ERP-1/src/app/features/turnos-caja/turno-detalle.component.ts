import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnosService } from '../../core/services/turnos.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EstadoBadgeComponent } from '../../shared/components/estado-badge/estado-badge.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaHoraPipe } from '../../shared/pipes/fecha.pipe';
import type { TurnoCaja } from '../../core/models/api.model';

@Component({
  selector: 'app-turno-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatDividerModule, MatProgressSpinnerModule,
    PageHeaderComponent, EstadoBadgeComponent,
    MonedaPipe, FechaHoraPipe,
  ],
  templateUrl: './turno-detalle.component.html',
  styleUrl: './turno-detalle.component.css',
})
export class TurnoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(TurnosService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turno = signal<TurnoCaja | null>(null);
  readonly cargando = signal(true);

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
        next: (t: TurnoCaja) => {
          this.turno.set(t);
          this.cargando.set(false);
        },
        error: () => {
          this.notify.error('Error al cargar el turno');
          this.cargando.set(false);
        },
      });
  }

  get estaAbierto(): boolean {
    return !!this.turno() && !this.turno()!.cerradaEn;
  }

  get diferenciaClass(): string {
    const d = this.turno()?.diferencia;
    if (d == null) return '';
    if (d < 0) return 'text-red-600';
    if (d > 0) return 'text-green-600';
    return 'text-gray-600';
  }

  get diferenciaLabel(): string {
    const d = this.turno()?.diferencia;
    if (d == null) return '';
    if (d < 0) return 'Faltante';
    if (d > 0) return 'Sobrante';
    return 'Cuadre exacto';
  }

  volver(): void {
    this.router.navigate(['/turnos-caja']);
  }
}
