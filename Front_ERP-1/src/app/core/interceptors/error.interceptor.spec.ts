import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { TokenService } from '../services/token.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../../environments/environment';

describe('errorInterceptor', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['limpiar']);
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['error']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: tokenService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('en 401 limpia sesion, redirige a login y notifica', (done) => {
    const req = new HttpRequest('GET', `${environment.apiUrl}/auth/perfil`);
    const error401 = new HttpErrorResponse({
      status: 401,
      error: { mensaje: 'No autorizado' },
    });

    const next = jasmine.createSpy('next').and.returnValue(throwError(() => error401));

    TestBed.runInInjectionContext(() => errorInterceptor(req, next)).subscribe({
      next: () => done.fail('Se esperaba error 401'),
      error: (err) => {
        expect(err).toBe(error401);
        expect(tokenService.limpiar).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
        expect(notificationService.error).toHaveBeenCalledWith('Sesión expirada. Inicia sesión nuevamente.');
        done();
      },
    });
  });

  it('en 403 solo notifica permisos insuficientes', (done) => {
    const req = new HttpRequest('GET', `${environment.apiUrl}/reportes`);
    const error403 = new HttpErrorResponse({
      status: 403,
      error: { mensaje: 'Forbidden' },
    });

    const next = jasmine.createSpy('next').and.returnValue(throwError(() => error403));

    TestBed.runInInjectionContext(() => errorInterceptor(req, next)).subscribe({
      next: () => done.fail('Se esperaba error 403'),
      error: (err) => {
        expect(err).toBe(error403);
        expect(tokenService.limpiar).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(notificationService.error).toHaveBeenCalledWith('No tienes permisos para realizar esta acción.');
        done();
      },
    });
  });
});