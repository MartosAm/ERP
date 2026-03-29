import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../services/token.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let tokenService: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['getToken', 'estaExpirado']);

    TestBed.configureTestingModule({
      providers: [{ provide: TokenService, useValue: tokenService }],
    });
  });

  it('adjunta Authorization para requests al backend propio con token vigente', (done) => {
    tokenService.getToken.and.returnValue('jwt-token');
    tokenService.estaExpirado.and.returnValue(false);

    const req = new HttpRequest('GET', `${environment.apiUrl}/productos`);
    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.get('Authorization')).toBe('Bearer jwt-token');
        done();
      },
      error: done.fail,
    });
  });

  it('no adjunta Authorization cuando la URL no es del backend propio', (done) => {
    tokenService.getToken.and.returnValue('jwt-token');
    tokenService.estaExpirado.and.returnValue(false);

    const req = new HttpRequest('GET', 'https://cdn.example.com/file.js');
    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('Authorization')).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });

  it('no adjunta Authorization cuando el token esta expirado', (done) => {
    tokenService.getToken.and.returnValue('jwt-token');
    tokenService.estaExpirado.and.returnValue(true);

    const req = new HttpRequest('GET', `${environment.apiUrl}/productos`);
    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('Authorization')).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });
});