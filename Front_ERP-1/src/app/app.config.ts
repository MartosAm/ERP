/**
 * app.config.ts — Configuración global de la app Angular 17 standalone.
 *
 * Provee:
 *  - Routing con view transitions
 *  - HTTP client con interceptors
 *  - Animaciones async
 *  - APP_INITIALIZER para validar sesión JWT al arranque
 */
import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom, of } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

/**
 * APP_INITIALIZER — Valida la sesión JWT con el backend antes de renderizar.
 * Si el token es inválido o expirado, limpia el estado para que el guard
 * redirija a login. NUNCA lanza error (la app siempre debe arrancar).
 */
function inicializarSesion(): () => Promise<boolean> {
  const auth = inject(AuthService);
  return () =>
    firstValueFrom(auth.validarSesion()).catch(() => {
      // Si algo falla (red, error inesperado), no bloquear bootstrap
      return false;
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
    ),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: inicializarSesion,
      multi: true,
    },
  ],
};
