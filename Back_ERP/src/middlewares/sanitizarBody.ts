/**
 * src/middlewares/sanitizarBody.ts
 * ------------------------------------------------------------------
 * Middleware global que sanitiza automaticamente todos los strings
 * del body contra XSS antes de que lleguen a los controllers.
 *
 * Se aplica despues de express.json() en app.ts para que el body
 * ya este parseado como objeto JS.
 *
 * Usa la misma libreria xss que sanitizar.ts pero de forma automatica
 * en vez de requerir llamadas manuales por modulo.
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizarObjeto } from '../compartido/sanitizar';

/**
 * Sanitiza req.body recursivamente: limpia todos los strings con xss()
 * para prevenir XSS almacenado en la base de datos.
 *
 * Seguro para arrays, objetos anidados, numeros, booleans y nulls.
 * Solo transforma strings — los demas tipos pasan sin cambio.
 */
export function sanitizarBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizarObjeto(req.body);
  }
  next();
}
