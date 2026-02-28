/**
 * core/services/productos.service.ts
 * ------------------------------------------------------------------
 * CRUD de productos + búsqueda por código (POS).
 *
 * Endpoints:
 *   GET    /productos              → listar (paginado)
 *   GET    /productos/codigo/:cod  → buscar por SKU/código de barras
 *   GET    /productos/:id          → detalle
 *   POST   /productos              → crear
 *   PATCH  /productos/:id          → actualizar
 *   DELETE /productos/:id          → eliminar (soft delete)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Producto,
  ProductoDetalle,
  ProductoPOS,
  CrearProductoDto,
  ActualizarProductoDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Producto>> {
    return this.api.getPaginado<Producto>('productos', params);
  }

  obtenerPorId(id: string): Observable<ProductoDetalle> {
    return this.api.get<ProductoDetalle>(`productos/${id}`);
  }

  buscarPorCodigo(codigo: string): Observable<ProductoPOS> {
    return this.api.get<ProductoPOS>(`productos/codigo/${encodeURIComponent(codigo)}`);
  }

  crear(data: CrearProductoDto): Observable<Producto> {
    return this.api.post<Producto>('productos', data);
  }

  actualizar(id: string, data: ActualizarProductoDto): Observable<Producto> {
    return this.api.patch<Producto>(`productos/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`productos/${id}`);
  }
}
