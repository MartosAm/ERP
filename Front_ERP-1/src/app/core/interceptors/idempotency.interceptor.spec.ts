import { HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { idempotencyInterceptor } from './idempotency.interceptor';
import { environment } from '../../../environments/environment';

describe('idempotencyInterceptor', () => {
  it('agrega X-Idempotency-Key en metodos mutables al backend propio', (done) => {
    const req = new HttpRequest('POST', `${environment.apiUrl}/ordenes`, { total: 100 });
    const uuidSpy =
      spyOn(window.crypto, 'randomUUID').and.returnValue('11111111-1111-4111-8111-111111111111');

    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    idempotencyInterceptor(req, next).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.get('X-Idempotency-Key')).toBe('11111111-1111-4111-8111-111111111111');
        expect(uuidSpy).toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });

  it('no agrega header en metodos idempotentes (GET)', (done) => {
    const req = new HttpRequest('GET', `${environment.apiUrl}/productos`);

    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    idempotencyInterceptor(req, next).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('X-Idempotency-Key')).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });

  it('no agrega header cuando la URL no pertenece al backend propio', (done) => {
    const req = new HttpRequest('POST', 'https://api.externa.com/recurso', {});

    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    idempotencyInterceptor(req, next).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('X-Idempotency-Key')).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });

  it('respeta X-Idempotency-Key si ya viene definido por el cliente', (done) => {
    const req = new HttpRequest('PATCH', `${environment.apiUrl}/ordenes/1`, {
      estado: 'CANCELADA',
    }, {
      headers: new HttpHeaders({
        'X-Idempotency-Key': 'preexistente',
      }),
    });

    const randomUuidSpy = spyOn(window.crypto, 'randomUUID');
    const next = jasmine
      .createSpy('next')
      .and.callFake((forwarded: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: forwarded })));

    idempotencyInterceptor(req, next).subscribe({
      next: () => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.get('X-Idempotency-Key')).toBe('preexistente');
        expect(randomUuidSpy).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });
});