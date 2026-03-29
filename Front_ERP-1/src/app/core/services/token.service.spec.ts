import { TestBed } from '@angular/core/testing';
import { TokenService, type JwtPayload } from './token.service';
import type { Usuario } from '../models/api.model';

function toBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function crearJwt(payload: JwtPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  return `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.firma`;
}

describe('TokenService', () => {
  let service: TokenService;

  const usuarioMock: Usuario = {
    id: 'u-1',
    nombre: 'Admin',
    correo: 'admin@erp.com',
    rol: 'ADMIN',
    avatarUrl: null,
    empresa: {
      id: 'e-1',
      nombre: 'Empresa Demo',
    },
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  it('guardar persiste token y usuario, y getToken devuelve token vigente', () => {
    service.guardar('jwt-token', usuarioMock);

    expect(service.getToken()).toBe('jwt-token');
    expect(sessionStorage.getItem('erp_tkn')).toBe('jwt-token');
    expect(service.getUsuarioGuardado()).toEqual(usuarioMock);
  });

  it('getToken rehidrata desde sessionStorage cuando no hay token en memoria', () => {
    sessionStorage.setItem('erp_tkn', 'jwt-storage');
    const servicioRehidratado = new TokenService();

    expect(servicioRehidratado.getToken()).toBe('jwt-storage');
  });

  it('limpiar elimina token y usuario de memoria/storage', () => {
    service.guardar('jwt-token', usuarioMock);
    service.limpiar();

    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('erp_tkn')).toBeNull();
    expect(sessionStorage.getItem('erp_usr')).toBeNull();
  });

  it('getUsuarioGuardado devuelve null si el JSON en storage es invalido', () => {
    sessionStorage.setItem('erp_usr', '{json-invalido');

    expect(service.getUsuarioGuardado()).toBeNull();
  });

  it('decodificar retorna payload valido si el token es correcto', () => {
    const ahora = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: 'u-1',
      rol: 'ADMIN',
      empresaId: 'e-1',
      sesionId: 's-1',
      iat: ahora,
      exp: ahora + 3600,
    };
    service.guardar(crearJwt(payload), usuarioMock);

    expect(service.decodificar()).toEqual(payload);
  });

  it('decodificar retorna null con token malformado', () => {
    service.guardar('token-invalido', usuarioMock);

    expect(service.decodificar()).toBeNull();
  });

  it('estaExpirado retorna true cuando no hay token', () => {
    expect(service.estaExpirado()).toBeTrue();
  });

  it('estaExpirado retorna false cuando expira en el futuro', () => {
    const ahora = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: 'u-1',
      rol: 'ADMIN',
      empresaId: 'e-1',
      sesionId: 's-1',
      iat: ahora,
      exp: ahora + 3600,
    };
    service.guardar(crearJwt(payload), usuarioMock);

    expect(service.estaExpirado()).toBeFalse();
  });

  it('estaExpirado retorna true cuando falta menos de 60s para expirar', () => {
    const ahora = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: 'u-1',
      rol: 'ADMIN',
      empresaId: 'e-1',
      sesionId: 's-1',
      iat: ahora,
      exp: ahora + 30,
    };
    service.guardar(crearJwt(payload), usuarioMock);

    expect(service.estaExpirado()).toBeTrue();
  });

  it('segundosRestantes devuelve valor positivo con token valido y -1 sin token', () => {
    expect(service.segundosRestantes()).toBe(-1);

    const ahora = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: 'u-1',
      rol: 'ADMIN',
      empresaId: 'e-1',
      sesionId: 's-1',
      iat: ahora,
      exp: ahora + 180,
    };
    service.guardar(crearJwt(payload), usuarioMock);

    expect(service.segundosRestantes()).toBeGreaterThan(0);
  });
});