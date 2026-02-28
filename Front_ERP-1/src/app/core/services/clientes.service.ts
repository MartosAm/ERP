/**
 * core/services/clientes.service.ts
 * ------------------------------------------------------------------
 * CRUD de clientes.
 *
 * Endpoints:
 *   GET    /clientes       → listar (paginado)
 *   GET    /clientes/:id   → detalle
 *   POST   /clientes       → crear
 *   PATCH  /clientes/:id   → actualizar
 *   DELETE /clientes/:id   → eliminar (soft delete)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Cliente,
  ClienteDetalle,
  ClienteDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Cliente>> {
    return this.api.getPaginado<Cliente>('clientes', params);
  }

  obtenerPorId(id: string): Observable<ClienteDetalle> {
    return this.api.get<ClienteDetalle>(`clientes/${id}`);
  }

  crear(data: ClienteDto): Observable<Cliente> {
    return this.api.post<Cliente>('clientes', data);
  }

  actualizar(id: string, data: Partial<ClienteDto>): Observable<Cliente> {
    return this.api.patch<Cliente>(`clientes/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`clientes/${id}`);
  }
}
