import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import type { DashboardData } from '../../core/models/api.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, CurrencyPipe, DatePipe,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonModule, MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashSvc = inject(DashboardService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<DashboardData | null>(null);
  readonly cargando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.dashSvc
      .obtenerKPIs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (kpis: DashboardData) => {
          this.data.set(kpis);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notify.error('No se pudieron cargar los KPIs');
        },
      });
  }
}
