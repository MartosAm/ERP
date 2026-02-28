/**
 * core/services/dashboard.service.ts
 * ------------------------------------------------------------------
 * Servicio de dashboard. Solo obtiene KPIs en tiempo real.
 * Para reportes detallados, usar ReportesService.
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { DashboardData } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  obtenerKPIs(): Observable<DashboardData> {
    return this.api.get<DashboardData>('reportes/dashboard');
  }
}
