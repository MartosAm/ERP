/**
 * core/services/entregas.service.ts
 * ------------------------------------------------------------------
 * Gestión de entregas / delivery.
 *
 * Endpoints:
 *   POST  /entregas              → crear entrega (ADMIN)
 *   GET   /entregas/mis-entregas → entregas del repartidor actual
 *   GET   /entregas              → listar (paginado)
 *   GET   /entregas/:id          → detalle
 *   PATCH /entregas/:id/estado   → actualizar estado
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Entrega,
  EntregaDetalle,
  EntregaRepartidor,
  CrearEntregaDto,
  ActualizarEstadoEntregaDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class EntregasService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Entrega>> {
    return this.api.getPaginado<Entrega>('entregas', params);
  }

  obtenerPorId(id: string): Observable<EntregaDetalle> {
    return this.api.get<EntregaDetalle>(`entregas/${id}`);
  }

  misEntregas(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<EntregaRepartidor>> {
    return this.api.getPaginado<EntregaRepartidor>('entregas/mis-entregas', params);
  }

  crear(data: CrearEntregaDto): Observable<Entrega> {
    return this.api.post<Entrega>('entregas', data);
  }

  actualizarEstado(id: string, data: ActualizarEstadoEntregaDto): Observable<Entrega> {
    return this.api.patch<Entrega>(`entregas/${id}/estado`, data);
  }
}
