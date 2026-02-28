/**
 * core/services/turnos.service.ts
 * ------------------------------------------------------------------
 * Servicio para apertura/cierre de turnos de caja.
 *
 * Endpoints:
 *   POST /turnos-caja/abrir       → abrir turno
 *   POST /turnos-caja/:id/cerrar  → cerrar turno
 *   GET  /turnos-caja/activo      → turno activo del usuario
 *   GET  /turnos-caja/:id         → detalle de turno
 *   GET  /turnos-caja             → listar turnos (ADMIN)
 * ------------------------------------------------------------------
 */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import type {
  TurnoCaja,
  AbrirTurnoDto,
  CerrarTurnoDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly api = inject(ApiService);

  /** Signal reactivo del turno activo */
  readonly turnoActivo = signal<TurnoCaja | null>(null);

  obtenerActivo(): Observable<TurnoCaja | null> {
    return this.api.get<TurnoCaja | null>('turnos-caja/activo').pipe(
      tap((turno: TurnoCaja | null) => this.turnoActivo.set(turno)),
    );
  }

  obtenerPorId(id: string): Observable<TurnoCaja> {
    return this.api.get<TurnoCaja>(`turnos-caja/${id}`);
  }

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<TurnoCaja>> {
    return this.api.getPaginado<TurnoCaja>('turnos-caja', params);
  }

  abrir(dto: AbrirTurnoDto): Observable<TurnoCaja> {
    return this.api.post<TurnoCaja>('turnos-caja/abrir', dto).pipe(
      tap((turno: TurnoCaja) => this.turnoActivo.set(turno)),
    );
  }

  cerrar(turnoId: string, dto: CerrarTurnoDto): Observable<TurnoCaja> {
    return this.api.post<TurnoCaja>(`turnos-caja/${turnoId}/cerrar`, dto).pipe(
      tap(() => this.turnoActivo.set(null)),
    );
  }
}
