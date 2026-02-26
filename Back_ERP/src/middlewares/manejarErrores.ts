/**
 * src/middlewares/manejarErrores.ts
 * ------------------------------------------------------------------
 * Middleware global de manejo de errores.
 * Unico lugar en la aplicacion donde se producen respuestas de error.
 *
 * Cubre los siguientes tipos de error:
 * - ZodError: errores de validacion de DTOs (400)
 * - Prisma P2002: violacion de constraint unique (409)
 * - Prisma P2025: registro no encontrado en update/delete (404)
 * - AppError: errores operacionales del sistema (status variable)
 * - Error generico: bugs no controlados (500)
 *
 * En produccion nunca expone stack traces ni detalles internos.
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../compartido/errores';
import { ApiResponse } from '../compartido/respuesta';
import { logger } from '../compartido/logger';
import { env } from '../config/env';

/**
 * Interfaz minima para detectar errores conocidos de Prisma
 * sin importar el namespace Prisma directamente.
 * Prisma lanza errores con la propiedad 'code' como string.
 */
interface ErrorPrismaConocido extends Error {
  code: string;
}

/**
 * Verifica si un error es un error conocido de Prisma.
 * Detecta la presencia de la propiedad 'code' que Prisma incluye
 * en PrismaClientKnownRequestError.
 */
const esErrorPrisma = (err: unknown): err is ErrorPrismaConocido =>
  err instanceof Error && 'code' in err && typeof (err as ErrorPrismaConocido).code === 'string';

/**
 * Middleware de error global. Debe ser el ULTIMO middleware registrado en app.ts.
 * Express lo identifica como error handler por tener 4 parametros.
 */
export const manejarErrores = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Registrar el error en el logger para depuracion
  logger.error({
    ruta: req.path,
    metodo: req.method,
    error: err instanceof Error ? err.message : String(err),
  });

  // 1. Errores de validacion Zod (schemas de DTOs)
  if (err instanceof ZodError) {
    res.status(400).json(
      ApiResponse.fail('Datos de entrada invalidos', 'VALIDATION_ERROR', err.flatten()),
    );
    return;
  }

  // 2. Errores conocidos de Prisma (BD)
  if (esErrorPrisma(err)) {
    // P2002: Violacion de constraint unique (SKU, correo, codigoBarras duplicado)
    if (err.code === 'P2002') {
      res.status(409).json(ApiResponse.fail('Registro duplicado', 'CONFLICT'));
      return;
    }
    // P2025: Registro no encontrado en update/delete
    if (err.code === 'P2025') {
      res.status(404).json(ApiResponse.fail('Registro no encontrado', 'NOT_FOUND'));
      return;
    }
    // P2003: Violacion de foreign key (referencia a registro inexistente)
    if (err.code === 'P2003') {
      res.status(400).json(ApiResponse.fail('Referencia a registro inexistente', 'BAD_REQUEST'));
      return;
    }
  }

  // 3. Errores operacionales del sistema (AppError y subclases)
  if (err instanceof AppError && err.esOperacional) {
    res.status(err.statusCode).json(ApiResponse.fail(err.mensaje, err.codigo));
    return;
  }

  // 4. Error no controlado: ocultar detalles en produccion
  const mensaje =
    env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : String(err);

  res.status(500).json(ApiResponse.fail(mensaje, 'INTERNAL_ERROR'));
};
