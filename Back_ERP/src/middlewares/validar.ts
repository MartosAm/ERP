/**
 * src/middlewares/validar.ts
 * ------------------------------------------------------------------
 * Middleware de validacion con Zod.
 * Recibe un schema Zod y el target del request (body, query, params).
 * Reemplaza req[target] con los datos coercionados y validados.
 * Propaga el ZodError al errorHandler si la validacion falla.
 *
 * Uso en routes:
 *   router.post('/', validar(CrearProductoSchema), asyncHandler(controller.crear));
 *   router.get('/', validar(FiltrosSchema, 'query'), asyncHandler(controller.listar));
 * ------------------------------------------------------------------
 */

import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/** Propiedad del request que contiene los datos a validar */
type Objetivo = 'body' | 'query' | 'params';

/**
 * Fabrica de middleware que valida una parte del request con un schema Zod.
 *
 * @param schema - Schema Zod que define la forma esperada de los datos
 * @param objetivo - Donde buscar los datos: 'body' (default), 'query' o 'params'
 * @returns Middleware que valida y reemplaza los datos en el request
 */
export const validar =
  (schema: ZodSchema, objetivo: Objetivo = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req[objetivo]);

    if (!resultado.success) {
      // Propagar el ZodError para que manejarErrores lo formatee
      return next(resultado.error);
    }

    // Reemplazar con datos coercionados y tipados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[objetivo] = resultado.data;
    next();
  };
