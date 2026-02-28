/**
 * core/interceptors/error.interceptor.ts
 * ------------------------------------------------------------------
 * Interceptor global de errores HTTP.
 *
 * - Retry automático (2 intentos) para errores transitorios (0, 502, 503, 504)
 *   SOLO en métodos idempotentes (GET, HEAD, OPTIONS).
 * - 401 → limpia token y redirige a login (sin inyectar AuthService
 *   directamente para evitar dependencia circular).
 * - 403 → notificación de permisos.
 * - Otros → notificación con mensaje del backend.
 *
 * Solo actúa sobre URLs del backend propio.
 * ------------------------------------------------------------------
 */
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError, retry, timer } from 'rxjs';
import { TokenService } from '../services/token.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../../environments/environment';

/** Status codes que se consideran transitorios y merecen retry */
const STATUS_TRANSITORIOS = new Set([0, 502, 503, 504]);

/** Métodos HTTP idempotentes (seguros para retry) */
const METODOS_IDEMPOTENTES = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Máximo de reintentos para errores transitorios */
const MAX_REINTENTOS = 2;

/** Delay entre reintentos (ms) — backoff lineal: 1s, 2s */
const DELAY_BASE_MS = 1000;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  return next(req).pipe(
    // Retry solo para errores transitorios en métodos idempotentes
    retry({
      count: METODOS_IDEMPOTENTES.has(req.method) ? MAX_REINTENTOS : 0,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (STATUS_TRANSITORIOS.has(error.status)) {
          return timer(DELAY_BASE_MS * retryCount);
        }
        return throwError(() => error);
      },
    }),

    catchError((err: HttpErrorResponse) => {
      // Solo mostrar notificaciones para peticiones al backend propio
      if (req.url.startsWith(environment.apiUrl)) {
        if (err.status === 401) {
          // Limpiar token sin inyectar AuthService (evita circular dep)
          tokenService.limpiar();
          router.navigate(['/auth/login']);
          notify.error('Sesión expirada. Inicia sesión nuevamente.');
        } else if (err.status === 403) {
          notify.error('No tienes permisos para realizar esta acción.');
        } else if (err.status === 0) {
          notify.error('Error de conexión. Verifica tu red.');
        } else if (err.status === 429) {
          notify.error('Demasiadas solicitudes. Espera un momento.');
        } else {
          const mensaje =
            err.error?.mensaje || err.error?.message || 'Error inesperado';
          notify.error(mensaje);
        }
      }

      return throwError(() => err);
    }),
  );
};
