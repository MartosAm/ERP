/**
 * core/guards/role.guard.ts
 * ------------------------------------------------------------------
 * Functional guard que verifica el rol del usuario.
 * Uso: canActivate: [roleGuard('ADMIN')]
 * ------------------------------------------------------------------
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();

    if (usuario && roles.includes(usuario.rol)) {
      return true;
    }
    return router.createUrlTree(['/dashboard']);
  };
}
