/**
 * core/services/categorias.service.ts
 * ------------------------------------------------------------------
 * CRUD de categorías + árbol jerárquico.
 *
 * Endpoints:
 *   GET    /categorias         → listar (paginado)
 *   GET    /categorias/arbol   → árbol jerárquico
 *   GET    /categorias/:id     → detalle
 *   POST   /categorias         → crear
 *   PATCH  /categorias/:id     → actualizar
 *   DELETE /categorias/:id     → eliminar (soft delete)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Categoria,
  CategoriaDetalle,
  CategoriaArbol,
  CategoriaDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Categoria>> {
    return this.api.getPaginado<Categoria>('categorias', params);
  }

  obtenerArbol(): Observable<CategoriaArbol[]> {
    return this.api.get<CategoriaArbol[]>('categorias/arbol');
  }

  obtenerPorId(id: string): Observable<CategoriaDetalle> {
    return this.api.get<CategoriaDetalle>(`categorias/${id}`);
  }

  crear(data: CategoriaDto): Observable<Categoria> {
    return this.api.post<Categoria>('categorias', data);
  }

  actualizar(id: string, data: Partial<CategoriaDto>): Observable<Categoria> {
    return this.api.patch<Categoria>(`categorias/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`categorias/${id}`);
  }
}
