/**
 * core/services/ordenes.service.ts
 * ------------------------------------------------------------------
 * Servicio de órdenes/ventas/cotizaciones/devoluciones.
 *
 * Endpoints:
 *   POST /ordenes               → crear venta
 *   GET  /ordenes               → listar (paginado)
 *   GET  /ordenes/:id           → detalle
 *   POST /ordenes/cotizacion    → crear cotización
 *   POST /ordenes/:id/confirmar → confirmar cotización
 *   POST /ordenes/:id/cancelar  → cancelar orden
 *   POST /ordenes/:id/devolver  → devolución total/parcial
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Orden,
  OrdenDetalle,
  OrdenCreada,
  CrearOrdenDto,
  CrearCotizacionDto,
  ConfirmarCotizacionDto,
  CancelarOrdenDto,
  DevolucionDto,
  DevolucionResult,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Orden>> {
    return this.api.getPaginado<Orden>('ordenes', params);
  }

  obtenerPorId(id: string): Observable<OrdenDetalle> {
    return this.api.get<OrdenDetalle>(`ordenes/${id}`);
  }

  crear(payload: CrearOrdenDto): Observable<OrdenCreada> {
    return this.api.post<OrdenCreada>('ordenes', payload);
  }

  crearCotizacion(payload: CrearCotizacionDto): Observable<OrdenCreada> {
    return this.api.post<OrdenCreada>('ordenes/cotizacion', payload);
  }

  confirmarCotizacion(id: string, payload: ConfirmarCotizacionDto): Observable<OrdenCreada> {
    return this.api.post<OrdenCreada>(`ordenes/${id}/confirmar`, payload);
  }

  cancelar(id: string, dto: CancelarOrdenDto): Observable<Orden> {
    return this.api.post<Orden>(`ordenes/${id}/cancelar`, dto);
  }

  devolver(id: string, payload: DevolucionDto): Observable<DevolucionResult> {
    return this.api.post<DevolucionResult>(`ordenes/${id}/devolver`, payload);
  }
}
