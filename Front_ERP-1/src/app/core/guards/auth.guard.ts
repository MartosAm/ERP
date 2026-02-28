/**
 * core/guards/auth.guard.ts
 * ------------------------------------------------------------------
 * Functional guard (Angular 17). Redirige a login si no hay token
 * o si el JWT ya expiró.
 *
 * NO llama a logout() para evitar doble navegación. Solo limpia
 * estado y retorna UrlTree.
 * ------------------------------------------------------------------
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // estaAutenticado() ya incluye verificación de expiración
  if (auth.estaAutenticado()) {
    return true;
  }

  // Limpiar estado sin redirigir (el UrlTree se encarga)
  tokenService.limpiar();
  return router.createUrlTree(['/auth/login']);
};
