import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;
  let loginTree: UrlTree;

  beforeEach(() => {
    loginTree = { toString: () => '/auth/login' } as UrlTree;

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['estaAutenticado']);
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['limpiar']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(loginTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TokenService, useValue: tokenService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('permite acceso si la sesion esta activa', () => {
    authService.estaAutenticado.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(tokenService.limpiar).not.toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('limpia estado y redirige a login cuando no hay sesion', () => {
    authService.estaAutenticado.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(tokenService.limpiar).toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    expect(result).toBe(loginTree);
  });
});