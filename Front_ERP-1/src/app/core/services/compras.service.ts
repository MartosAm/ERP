/**
 * core/services/compras.service.ts
 * ------------------------------------------------------------------
 * Gestión de órdenes de compra a proveedores.
 *
 * Endpoints:
 *   POST /compras              → crear orden de compra
 *   GET  /compras              → listar (paginado)
 *   GET  /compras/:id          → detalle
 *   POST /compras/:id/recibir  → marcar como recibida (ingresa inventario)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Compra,
  CompraDetalle,
  CompraCreada,
  CrearCompraDto,
  RecibirCompraDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Compra>> {
    return this.api.getPaginado<Compra>('compras', params);
  }

  obtenerPorId(id: string): Observable<CompraDetalle> {
    return this.api.get<CompraDetalle>(`compras/${id}`);
  }

  crear(data: CrearCompraDto): Observable<CompraCreada> {
    return this.api.post<CompraCreada>('compras', data);
  }

  recibir(id: string, data: RecibirCompraDto): Observable<Compra> {
    return this.api.post<Compra>(`compras/${id}/recibir`, data);
  }
}
