/**
 * core/services/almacenes.service.ts
 * ------------------------------------------------------------------
 * CRUD de almacenes.
 *
 * Endpoints:
 *   GET    /almacenes       → listar (paginado)
 *   GET    /almacenes/:id   → detalle
 *   POST   /almacenes       → crear
 *   PATCH  /almacenes/:id   → actualizar
 *   DELETE /almacenes/:id   → eliminar (soft delete)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Almacen,
  AlmacenDetalle,
  AlmacenDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class AlmacenesService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Almacen>> {
    return this.api.getPaginado<Almacen>('almacenes', params);
  }

  obtenerPorId(id: string): Observable<AlmacenDetalle> {
    return this.api.get<AlmacenDetalle>(`almacenes/${id}`);
  }

  crear(data: AlmacenDto): Observable<Almacen> {
    return this.api.post<Almacen>('almacenes', data);
  }

  actualizar(id: string, data: Partial<AlmacenDto>): Observable<Almacen> {
    return this.api.patch<Almacen>(`almacenes/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`almacenes/${id}`);
  }
}
