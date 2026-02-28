/**
 * core/services/inactividad.service.ts
 * ------------------------------------------------------------------
 * Auto-logout por inactividad del usuario.
 *
 * Escucha eventos de interacción (mousemove, keydown, click, scroll,
 * touchstart) de forma throttled. Si no hay actividad durante
 * TIMEOUT_MS, ejecuta logout automático y muestra notificación.
 *
 * Se activa/desactiva según el estado de autenticación.
 * ------------------------------------------------------------------
 */
import { Injectable, inject, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { NotificationService } from './notification.service';

/** Tiempo de inactividad antes de logout (30 minutos) */
const TIMEOUT_MS = 30 * 60 * 1000;

/** Intervalo de verificación del timer (cada 60 s) */
const CHECK_INTERVAL_MS = 60 * 1000;

/** Eventos que reinician el timer de inactividad */
const EVENTOS_ACTIVIDAD: ReadonlyArray<keyof DocumentEventMap> = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];

@Injectable({ providedIn: 'root' })
export class InactividadService {
  private readonly auth = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly notify = inject(NotificationService);
  private readonly zone = inject(NgZone);

  private ultimaActividad = Date.now();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private activo = false;

  /** Throttle flag para no procesar cada evento */
  private throttled = false;

  /** Inicia la vigilancia de inactividad. Llamar tras login exitoso. */
  iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    this.ultimaActividad = Date.now();

    // Escuchar eventos fuera de Angular zone para no disparar change detection
    this.zone.runOutsideAngular(() => {
      EVENTOS_ACTIVIDAD.forEach((evento) => {
        document.addEventListener(evento, this.onActividad, { passive: true });
      });

      this.checkInterval = setInterval(() => this.verificar(), CHECK_INTERVAL_MS);
    });
  }

  /** Detiene la vigilancia. Llamar en logout. */
  detener(): void {
    if (!this.activo) return;
    this.activo = false;

    EVENTOS_ACTIVIDAD.forEach((evento) => {
      document.removeEventListener(evento, this.onActividad);
    });

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /** Handler throttled de actividad del usuario */
  private readonly onActividad = (): void => {
    if (this.throttled) return;
    this.throttled = true;
    this.ultimaActividad = Date.now();

    // Throttle de 2 segundos
    setTimeout(() => {
      this.throttled = false;
    }, 2000);
  };

  /** Verifica si el usuario ha estado inactivo demasiado tiempo */
  private verificar(): void {
    if (!this.activo) return;

    const inactivo = Date.now() - this.ultimaActividad;

    // También verificar si el token expiró
    if (inactivo >= TIMEOUT_MS || this.tokenService.estaExpirado()) {
      this.zone.run(() => {
        this.detener();
        this.notify.info(
          inactivo >= TIMEOUT_MS
            ? 'Sesión cerrada por inactividad.'
            : 'Sesión expirada.',
        );
        this.auth.logout();
      });
    }
  }
}
