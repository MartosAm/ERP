/**
 * src/middlewares/requerirRol.ts
 * ------------------------------------------------------------------
 * Middleware de autorizacion basada en roles.
 * Verifica que el usuario autenticado (req.user) tenga uno de los
 * roles permitidos para acceder al endpoint.
 *
 * Debe usarse siempre DESPUES del middleware autenticar.
 *
 * Uso en routes:
 *   router.post('/', requerirRol('ADMIN'), asyncHandler(controller.crear));
 *   router.get('/', requerirRol('ADMIN', 'CAJERO'), asyncHandler(controller.listar));
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorAcceso } from '../compartido/errores';

/** Roles validos del sistema */
type Rol = 'ADMIN' | 'CAJERO' | 'REPARTIDOR';

/**
 * Fabrica de middleware que restringe acceso a los roles indicados.
 *
 * @param roles - Uno o mas roles permitidos para esta ruta
 * @returns Middleware de Express que valida el rol del usuario
 */
export const requerirRol =
  (...roles: Rol[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Rol)) {
      return next(new ErrorAcceso('No tiene permisos para esta operacion'));
    }
    next();
  };
