/**
 * core/services/notification.service.ts
 * ------------------------------------------------------------------
 * Servicio de notificaciones tipo toast con MatSnackBar.
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snack.open(mensaje, 'OK', {
      duration: 3000,
      panelClass: ['snack-exito'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  error(mensaje: string): void {
    this.snack.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snack-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  info(mensaje: string): void {
    this.snack.open(mensaje, 'OK', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
