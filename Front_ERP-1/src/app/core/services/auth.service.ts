/**
 * core/services/auth.service.ts
 * ------------------------------------------------------------------
 * Maneja login, logout y estado de usuario.
 * Delega almacenamiento de JWT a TokenService (memoria + sessionStorage).
 * Usa signals de Angular 17 para reactividad.
 * ------------------------------------------------------------------
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import type { LoginRequest, LoginResponse, Usuario } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  /** Signal reactivo del usuario actual */
  private readonly _usuario = signal<Usuario | null>(
    this.tokenService.getUsuarioGuardado(),
  );

  /** Señales publicas de solo lectura */
  readonly usuario = this._usuario.asReadonly();
  readonly estaAutenticado = computed(
    () => !!this._usuario() && !this.tokenService.estaExpirado(),
  );
  readonly esAdmin = computed(() => this._usuario()?.rol === 'ADMIN');
  readonly esCajero = computed(() => this._usuario()?.rol === 'CAJERO');

  /** Login: guarda token en memoria + sessionStorage vía TokenService */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credenciales).pipe(
      tap((res) => {
        this.tokenService.guardar(res.token, res.usuario);
        this._usuario.set(res.usuario);
      }),
    );
  }

  /** Logout: limpia token, usuario y redirige a login */
  logout(): void {
    this.tokenService.limpiar();
    this._usuario.set(null);
    this.router.navigate(['/auth/login']);
  }

  /** Token JWT actual (delegado a TokenService) */
  getToken(): string | null {
    return this.tokenService.getToken();
  }

  /**
   * Valida la sesión actual contra el backend.
   * Usado por APP_INITIALIZER al arrancar la app.
   * Retorna true si la sesión es válida, false si no.
   */
  validarSesion(): Observable<boolean> {
    const token = this.tokenService.getToken();

    // Sin token o token expirado → sesión inválida
    if (!token || this.tokenService.estaExpirado()) {
      this.limpiarSinRedirigir();
      return of(false);
    }

    // Validar contra backend
    return this.api.get<Usuario>('auth/perfil').pipe(
      tap((usuario) => {
        this._usuario.set(usuario);
        // Re-guardar usuario actualizado del backend
        this.tokenService.guardar(token, usuario);
      }),
      map(() => true),
      catchError(() => {
        this.limpiarSinRedirigir();
        return of(false);
      }),
    );
  }

  /** Limpia estado sin redirigir (para APP_INITIALIZER) */
  private limpiarSinRedirigir(): void {
    this.tokenService.limpiar();
    this._usuario.set(null);
  }
}
