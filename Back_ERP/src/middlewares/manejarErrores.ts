/**
 * src/middlewares/manejarErrores.ts
 * ------------------------------------------------------------------
 * Middleware global de manejo de errores.
 * Unico lugar en la aplicacion donde se producen respuestas de error.
 *
 * Cubre los siguientes tipos de error:
 * - SyntaxError: JSON malformado en body (400)
 * - PayloadTooLargeError: body excede el limite (413)
 * - ZodError: errores de validacion de DTOs (400)
 * - Prisma P2002: violacion de constraint unique (409)
 * - Prisma P2025: registro no encontrado en update/delete (404)
 * - Prisma P2003: violacion de foreign key (400)
 * - Prisma P2014: violacion de relacion requerida (400)
 * - Prisma P2024: timeout del pool de conexiones (503)
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
 * Verifica si el error es un SyntaxError de JSON malformado.
 * Express lanza SyntaxError con type='entity.parse.failed' al recibir JSON invalido.
 */
const esErrorJsonMalformado = (err: unknown): boolean =>
  err instanceof SyntaxError && 'type' in err && (err as any).type === 'entity.parse.failed';

/**
 * Verifica si el error es PayloadTooLarge (body excede el limite configurado).
 */
const esPayloadMuyGrande = (err: unknown): boolean =>
  err instanceof Error && 'type' in err && (err as any).type === 'entity.too.large';

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
  // Obtener request ID para correlacion
  const requestId = req.headers['x-request-id'] as string | undefined;

  // Registrar el error con contexto completo para depuracion
  logger.error({
    requestId,
    ruta: req.path,
    metodo: req.method,
    usuarioId: (req as any).usuario?.id,
    error: err instanceof Error ? err.message : String(err),
    stack: env.NODE_ENV !== 'production' && err instanceof Error ? err.stack : undefined,
  });

  // 0a. JSON malformado en body (SyntaxError del parser de Express)
  if (esErrorJsonMalformado(err)) {
    res.status(400).json(
      ApiResponse.fail('JSON malformado en el cuerpo de la peticion', 'BAD_REQUEST'),
    );
    return;
  }

  // 0b. Payload demasiado grande (excede limit de express.json)
  if (esPayloadMuyGrande(err)) {
    res.status(413).json(
      ApiResponse.fail('El cuerpo de la peticion excede el tamano maximo permitido', 'PAYLOAD_TOO_LARGE'),
    );
    return;
  }

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
    // P2014: Violacion de relacion requerida
    if (err.code === 'P2014') {
      res.status(400).json(ApiResponse.fail('Violacion de relacion requerida', 'BAD_REQUEST'));
      return;
    }
    // P2024: Timeout del pool de conexiones a la base de datos
    if (err.code === 'P2024') {
      res.status(503).json(ApiResponse.fail('Servicio temporalmente no disponible', 'SERVICE_UNAVAILABLE'));
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
