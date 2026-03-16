/**
 * Helpers para tests de rutas / controllers con supertest.
 * Monta un router en un Express mini con el middleware de errores real.
 */
import express, { Router, Request, Response, NextFunction } from 'express';
import { manejarErrores } from '../middlewares/manejarErrores';

/**
 * Crea una app Express mínima con el router dado, inyectando req.user.
 * Incluye el error handler real para que los errores se serialicen igual que en prod.
 */
export function crearAppTest(router: Router, user?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());

  // Inyectar req.user si se proporciona (simula autenticar middleware)
  if (user) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = user;
      next();
    });
  }

  app.use('/', router);
  app.use(manejarErrores);
  return app;
}
