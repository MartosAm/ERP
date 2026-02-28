/**
 * core/services/reportes.service.ts
 * ------------------------------------------------------------------
 * Reportes y estadísticas (solo ADMIN).
 * Separado de DashboardService para responsabilidad única.
 *
 * Endpoints:
 *   GET /reportes/dashboard      → KPIs en tiempo real
 *   GET /reportes/ventas         → resumen de ventas por periodo
 *   GET /reportes/top-productos  → productos más vendidos
 *   GET /reportes/metodos-pago   → desglose por método de pago
 *   GET /reportes/inventario     → inventario valorizado
 *   GET /reportes/cajeros        → rendimiento por cajero
 *   GET /reportes/entregas       → estadísticas de delivery
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  DashboardData,
  VentasResumen,
  TopProductosReporte,
  MetodosPagoReporte,
  InventarioValorizadoReporte,
  CajerosReporte,
  EntregasReporte,
  FiltroFechas,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<DashboardData> {
    return this.api.get<DashboardData>('reportes/dashboard');
  }

  ventas(filtro: FiltroFechas): Observable<VentasResumen> {
    return this.api.get<VentasResumen>('reportes/ventas', filtro);
  }

  topProductos(filtro: FiltroFechas & { limite?: number }): Observable<TopProductosReporte> {
    return this.api.get<TopProductosReporte>('reportes/top-productos', { ...filtro });
  }

  metodosPago(filtro: FiltroFechas): Observable<MetodosPagoReporte> {
    return this.api.get<MetodosPagoReporte>('reportes/metodos-pago', filtro);
  }

  inventario(): Observable<InventarioValorizadoReporte> {
    return this.api.get<InventarioValorizadoReporte>('reportes/inventario');
  }

  cajeros(filtro: FiltroFechas): Observable<CajerosReporte> {
    return this.api.get<CajerosReporte>('reportes/cajeros', filtro);
  }

  entregas(filtro: FiltroFechas): Observable<EntregasReporte> {
    return this.api.get<EntregasReporte>('reportes/entregas', filtro);
  }
}
