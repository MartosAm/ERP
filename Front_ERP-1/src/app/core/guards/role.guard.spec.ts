import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let authService: { usuario: () => { rol: string } | null };
  let router: jasmine.SpyObj<Router>;
  let dashboardTree: UrlTree;

  beforeEach(() => {
    dashboardTree = { toString: () => '/dashboard' } as UrlTree;
    authService = { usuario: () => null };
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(dashboardTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('permite acceso cuando el rol esta autorizado', () => {
    authService.usuario = () => ({ rol: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard('ADMIN', 'CAJERO')({} as never, {} as never),
    );

    expect(result).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirige a dashboard cuando el rol no esta autorizado', () => {
    authService.usuario = () => ({ rol: 'REPARTIDOR' });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard('ADMIN')({} as never, {} as never),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(dashboardTree);
  });
});