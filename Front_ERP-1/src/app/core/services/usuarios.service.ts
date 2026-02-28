/**
 * core/services/usuarios.service.ts
 * ------------------------------------------------------------------
 * Gestión administrativa de usuarios (solo ADMIN).
 *
 * Endpoints:
 *   GET    /usuarios                     → listar (paginado)
 *   GET    /usuarios/:id                 → detalle
 *   PUT    /usuarios/:id                 → actualizar datos básicos
 *   PUT    /usuarios/:id/horario         → asignar horario laboral
 *   PATCH  /usuarios/:id/estado          → activar/desactivar
 *   POST   /usuarios/:id/cerrar-sesiones → forzar cierre de sesiones
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  UsuarioAdmin,
  UsuarioAdminDetalle,
  ActualizarUsuarioDto,
  AsignarHorarioDto,
  CambiarEstadoUsuarioDto,
  ApiPaginada,
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(params?: Record<string, string | number | boolean>): Observable<ApiPaginada<UsuarioAdmin>> {
    return this.api.getPaginado<UsuarioAdmin>('usuarios', params);
  }

  obtenerPorId(id: string): Observable<UsuarioAdminDetalle> {
    return this.api.get<UsuarioAdminDetalle>(`usuarios/${id}`);
  }

  actualizar(id: string, data: ActualizarUsuarioDto): Observable<UsuarioAdmin> {
    return this.api.put<UsuarioAdmin>(`usuarios/${id}`, data);
  }

  asignarHorario(id: string, data: AsignarHorarioDto): Observable<UsuarioAdmin> {
    return this.api.put<UsuarioAdmin>(`usuarios/${id}/horario`, data);
  }

  cambiarEstado(id: string, data: CambiarEstadoUsuarioDto): Observable<UsuarioAdmin> {
    return this.api.patch<UsuarioAdmin>(`usuarios/${id}/estado`, data);
  }

  cerrarSesiones(id: string): Observable<{ sesionesRevocadas: number }> {
    return this.api.post<{ sesionesRevocadas: number }>(`usuarios/${id}/cerrar-sesiones`, {});
  }
}
