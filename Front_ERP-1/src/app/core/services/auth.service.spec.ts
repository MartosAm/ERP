import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import type {
  LoginRequest,
  LoginResponse,
  RegistroPublicoDto,
  Usuario,
} from '../models/api.model';

describe('AuthService', () => {
  let service: AuthService;
  let api: jasmine.SpyObj<ApiService>;
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;

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
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', [
      'getUsuarioGuardado',
      'estaExpirado',
      'guardar',
      'limpiar',
      'getToken',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    tokenService.getUsuarioGuardado.and.returnValue(null);
    tokenService.estaExpirado.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api },
        { provide: TokenService, useValue: tokenService },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('login guarda token y usuario', (done) => {
    const credenciales: LoginRequest = {
      correo: 'admin@erp.com',
      contrasena: 'Password123',
    };
    const respuesta: LoginResponse = {
      token: 'jwt-abc',
      usuario: usuarioMock,
    };
    api.post.and.returnValue(of(respuesta));

    service.login(credenciales).subscribe({
      next: (res) => {
        expect(res).toEqual(respuesta);
        expect(api.post).toHaveBeenCalledWith('auth/login', credenciales);
        expect(tokenService.guardar).toHaveBeenCalledWith('jwt-abc', usuarioMock);
        expect(service.usuario()).toEqual(usuarioMock);
        done();
      },
      error: done.fail,
    });
  });

  it('logout limpia estado y navega a login', () => {
    service.logout();

    expect(tokenService.limpiar).toHaveBeenCalled();
    expect(service.usuario()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('estaAutenticado es false cuando no hay usuario', () => {
    expect(service.estaAutenticado()).toBeFalse();
  });

  it('validaSesion devuelve false si no hay token', (done) => {
    tokenService.getToken.and.returnValue(null);

    service.validarSesion().subscribe({
      next: (ok) => {
        expect(ok).toBeFalse();
        expect(tokenService.limpiar).toHaveBeenCalled();
        expect(api.get).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });

  it('validaSesion devuelve false si token esta expirado', (done) => {
    tokenService.getToken.and.returnValue('jwt-expirado');
    tokenService.estaExpirado.and.returnValue(true);

    service.validarSesion().subscribe({
      next: (ok) => {
        expect(ok).toBeFalse();
        expect(tokenService.limpiar).toHaveBeenCalled();
        expect(api.get).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });

  it('validaSesion devuelve true y refresca usuario cuando backend responde OK', (done) => {
    tokenService.getToken.and.returnValue('jwt-valido');
    tokenService.estaExpirado.and.returnValue(false);
    api.get.and.returnValue(of(usuarioMock));

    service.validarSesion().subscribe({
      next: (ok) => {
        expect(ok).toBeTrue();
        expect(api.get).toHaveBeenCalledWith('auth/perfil');
        expect(tokenService.guardar).toHaveBeenCalledWith('jwt-valido', usuarioMock);
        expect(service.usuario()).toEqual(usuarioMock);
        done();
      },
      error: done.fail,
    });
  });

  it('validaSesion devuelve false y limpia estado cuando backend falla', (done) => {
    tokenService.getToken.and.returnValue('jwt-valido');
    tokenService.estaExpirado.and.returnValue(false);
    api.get.and.returnValue(throwError(() => new Error('fallo backend')));

    service.validarSesion().subscribe({
      next: (ok) => {
        expect(ok).toBeFalse();
        expect(tokenService.limpiar).toHaveBeenCalled();
        expect(service.usuario()).toBeNull();
        done();
      },
      error: done.fail,
    });
  });

  it('registroPublico guarda token y usuario del alta inicial', (done) => {
    const dto: RegistroPublicoDto = {
      nombre: 'Juan',
      correo: 'juan@empresa.com',
      contrasena: 'Password123',
      nombreEmpresa: 'Empresa Nueva',
    };
    const respuesta: LoginResponse = {
      token: 'jwt-registro',
      usuario: usuarioMock,
    };
    api.post.and.returnValue(of(respuesta));

    service.registroPublico(dto).subscribe({
      next: (res) => {
        expect(res).toEqual(respuesta);
        expect(api.post).toHaveBeenCalledWith('auth/registro-publico', dto);
        expect(tokenService.guardar).toHaveBeenCalledWith('jwt-registro', usuarioMock);
        expect(service.usuario()).toEqual(usuarioMock);
        done();
      },
      error: done.fail,
    });
  });
});