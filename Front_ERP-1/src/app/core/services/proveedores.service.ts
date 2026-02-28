/**
 * core/services/proveedores.service.ts
 * ------------------------------------------------------------------
 * CRUD de proveedores.
 *
 * Endpoints:
 *   GET    /proveedores       → listar (paginado)
 *   GET    /proveedores/:id   → detalle
 *   POST   /proveedores       → crear
 *   PATCH  /proveedores/:id   → actualizar
 *   DELETE /proveedores/:id   → eliminar (soft delete)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Proveedor,
  ProveedorDetalle,
  ProveedorDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Proveedor>> {
    return this.api.getPaginado<Proveedor>('proveedores', params);
  }

  obtenerPorId(id: string): Observable<ProveedorDetalle> {
    return this.api.get<ProveedorDetalle>(`proveedores/${id}`);
  }

  crear(data: ProveedorDto): Observable<Proveedor> {
    return this.api.post<Proveedor>('proveedores', data);
  }

  actualizar(id: string, data: Partial<ProveedorDto>): Observable<Proveedor> {
    return this.api.patch<Proveedor>(`proveedores/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`proveedores/${id}`);
  }
}
