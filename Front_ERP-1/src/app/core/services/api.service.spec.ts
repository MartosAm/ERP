import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import type { ApiPaginada } from '../models/api.model';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('get filtra params vacios/nulos y mapea datos de la respuesta', () => {
    const params = {
      pagina: 1,
      activo: true,
      vacio: '',
      nulo: null as unknown as string,
      indefinido: undefined as unknown as string,
    } as Record<string, string | number | boolean>;

    service.get<{ id: string }>('productos', params).subscribe((datos) => {
      expect(datos).toEqual({ id: 'p-1' });
    });

    const req = httpMock.expectOne((request) => request.method === 'GET' && request.url.endsWith('/productos'));
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('activo')).toBe('true');
    expect(req.request.params.has('vacio')).toBeFalse();
    expect(req.request.params.has('nulo')).toBeFalse();
    expect(req.request.params.has('indefinido')).toBeFalse();

    req.flush({
      exito: true,
      mensaje: 'OK',
      datos: { id: 'p-1' },
      meta: null,
    });
  });

  it('getPaginado devuelve la estructura paginada completa', () => {
    const respuesta: ApiPaginada<{ id: string }> = {
      exito: true,
      mensaje: 'OK',
      datos: [
        { id: 'a-1' },
        { id: 'a-2' },
      ],
      meta: {
        total: 2,
        pagina: 1,
        limite: 10,
        totalPaginas: 1,
        tieneSiguiente: false,
        tieneAnterior: false,
      },
    };

    service.getPaginado<{ id: string }>('almacenes').subscribe((res) => {
      expect(res).toEqual(respuesta);
      expect(res.meta.total).toBe(2);
    });

    const req = httpMock.expectOne((request) => request.method === 'GET' && request.url.endsWith('/almacenes'));
    req.flush(respuesta);
  });

  it('post, put, patch y delete mapean correctamente datos', () => {
    service.post<{ id: string }>('categorias', { nombre: 'Nueva' }).subscribe((res) => {
      expect(res).toEqual({ id: 'c-1' });
    });
    const postReq = httpMock.expectOne((request) => request.method === 'POST' && request.url.endsWith('/categorias'));
    expect(postReq.request.body).toEqual({ nombre: 'Nueva' });
    postReq.flush({ exito: true, mensaje: 'OK', datos: { id: 'c-1' }, meta: null });

    service.put<{ id: string }>('categorias/c-1', { nombre: 'Editada' }).subscribe((res) => {
      expect(res).toEqual({ id: 'c-1' });
    });
    const putReq = httpMock.expectOne((request) => request.method === 'PUT' && request.url.endsWith('/categorias/c-1'));
    expect(putReq.request.body).toEqual({ nombre: 'Editada' });
    putReq.flush({ exito: true, mensaje: 'OK', datos: { id: 'c-1' }, meta: null });

    service.patch<{ id: string }>('categorias/c-1', { activo: false }).subscribe((res) => {
      expect(res).toEqual({ id: 'c-1' });
    });
    const patchReq = httpMock.expectOne((request) => request.method === 'PATCH' && request.url.endsWith('/categorias/c-1'));
    expect(patchReq.request.body).toEqual({ activo: false });
    patchReq.flush({ exito: true, mensaje: 'OK', datos: { id: 'c-1' }, meta: null });

    service.delete<{ eliminado: boolean }>('categorias/c-1').subscribe((res) => {
      expect(res).toEqual({ eliminado: true });
    });
    const deleteReq = httpMock.expectOne((request) => request.method === 'DELETE' && request.url.endsWith('/categorias/c-1'));
    deleteReq.flush({ exito: true, mensaje: 'OK', datos: { eliminado: true }, meta: null });
  });
});