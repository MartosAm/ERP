/**
 * core/interceptors/idempotency.interceptor.ts
 * ------------------------------------------------------------------
 * Agrega X-Idempotency-Key a requests mutables contra el backend propio.
 * Esto permite al backend deduplicar operaciones criticas en caso de
 * doble click, reenvio del navegador o reintentos manuales del usuario.
 * ------------------------------------------------------------------
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const METODOS_MUTABLES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  if (!METODOS_MUTABLES.has(req.method)) {
    return next(req);
  }

  if (req.headers.has('X-Idempotency-Key')) {
    return next(req);
  }

  const key = crypto.randomUUID();
  const clonado = req.clone({
    setHeaders: {
      'X-Idempotency-Key': key,
    },
  });

  return next(clonado);
};
