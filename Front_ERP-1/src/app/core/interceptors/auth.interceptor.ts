/**
 * core/interceptors/auth.interceptor.ts
 * ------------------------------------------------------------------
 * Functional interceptor (Angular 17). Agrega Bearer token a requests.
 *
 * Seguridad: solo adjunta el token a peticiones dirigidas al backend
 * propio (environment.apiUrl). Nunca se envía a CDNs, analytics, etc.
 * ------------------------------------------------------------------
 */
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenService } from '../services/token.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo adjuntar token a peticiones al backend propio
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  if (token && !tokenService.estaExpirado()) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
