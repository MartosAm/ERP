/**
 * core/services/inventario.service.ts
 * ------------------------------------------------------------------
 * Gestión de inventario: existencias, movimientos, ajustes, traslados.
 *
 * Endpoints:
 *   GET  /inventario/existencias  → stock actual con filtros
 *   GET  /inventario/movimientos  → historial de movimientos
 *   POST /inventario/movimientos  → registrar movimiento (ajuste/traslado)
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  Existencia,
  MovimientoInventario,
  AjusteManualDto,
  TrasladoDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly api = inject(ApiService);

  consultarExistencias(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<Existencia>> {
    return this.api.getPaginado<Existencia>('inventario/existencias', params);
  }

  movimientos(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<MovimientoInventario>> {
    return this.api.getPaginado<MovimientoInventario>('inventario/movimientos', params);
  }

  ajusteManual(data: AjusteManualDto): Observable<MovimientoInventario> {
    return this.api.post<MovimientoInventario>('inventario/movimientos', {
      tipoMovimiento: 'AJUSTE',
      productoId: data.productoId,
      almacenId: data.almacenId,
      cantidad: data.cantidad,
      motivo: data.motivo,
    });
  }

  trasladar(data: TrasladoDto): Observable<MovimientoInventario> {
    return this.api.post<MovimientoInventario>('inventario/movimientos', {
      tipoMovimiento: 'TRASLADO',
      productoId: data.productoId,
      almacenId: data.almacenOrigenId,
      almacenDestinoId: data.almacenDestinoId,
      cantidad: data.cantidad,
      motivo: data.motivo,
    });
  }
}
