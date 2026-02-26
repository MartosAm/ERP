/**
 * src/compartido/asyncHandler.ts
 * ------------------------------------------------------------------
 * Wrapper que elimina el bloque try/catch repetitivo en cada metodo
 * de controller. Cualquier error lanzado por el handler async es
 * capturado automaticamente y entregado a next() para que lo procese
 * el middleware manejarErrores.
 *
 * Uso en routes:
 *   router.get('/', asyncHandler(MiController.listar));
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

/** Tipo para handlers async de Express */
type HandlerAsync = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Envuelve un handler async para capturar errores automaticamente.
 * Evita repetir try/catch en cada metodo del controller.
 *
 * @param fn - Funcion async del controller
 * @returns Handler de Express que propaga errores via next()
 */
export const asyncHandler =
  (fn: HandlerAsync) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
