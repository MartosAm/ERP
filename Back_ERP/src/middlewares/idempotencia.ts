/**
 * src/middlewares/idempotencia.ts
 * ------------------------------------------------------------------
 * Middleware para deduplicar requests mutables usando X-Idempotency-Key.
 *
 * Flujo:
 * 1. Cliente envia X-Idempotency-Key unico por operacion.
 * 2. Si llega el mismo key + misma huella, se reenvia la respuesta previa.
 * 3. Si llega el mismo key + huella distinta, se responde 409.
 * 4. Si una operacion con ese key sigue en proceso, se responde 409.
 * ------------------------------------------------------------------
 */

import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { ApiResponse } from '../compartido/respuesta';

interface EntradaPendiente {
  estado: 'PENDIENTE';
  huella: string;
}

interface EntradaCompletada {
  estado: 'COMPLETADA';
  huella: string;
  statusCode: number;
  cuerpo: unknown;
}

type EntradaIdempotencia = EntradaPendiente | EntradaCompletada;

interface OpcionesIdempotencia {
  /**
   * Nombre del scope para aislar keys entre endpoints.
   * Ejemplo: "ordenes:crear".
   */
  scope: string;
  /**
   * Tiempo de vida de la cache en segundos.
   */
  ttlSegundos?: number;
  /**
   * Si es true, exige header X-Idempotency-Key y devuelve 400 si falta.
   */
  requerido?: boolean;
}

const cacheIdempotencia = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: true,
});

const MAX_LONGITUD_KEY = 128;

function construirHuella(req: Request): string {
  const payload = JSON.stringify({
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body ?? null,
    usuarioId: req.user?.usuarioId ?? null,
    empresaId: req.user?.empresaId ?? null,
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

function construirClaveCache(scope: string, req: Request, key: string): string {
  const usuario = req.user?.usuarioId ?? 'anonimo';
  const empresa = req.user?.empresaId ?? 'sin-empresa';
  return `${scope}:${empresa}:${usuario}:${key}`;
}

export function requerirIdempotencia(opciones: OpcionesIdempotencia) {
  const ttlSegundos = opciones.ttlSegundos ?? 300;
  const requerido = opciones.requerido ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.header('x-idempotency-key')?.trim();

    if (!raw) {
      if (requerido) {
        res.status(400).json(
          ApiResponse.fail('Header X-Idempotency-Key requerido', 'IDEMPOTENCY_KEY_REQUIRED'),
        );
        return;
      }
      return next();
    }

    if (raw.length > MAX_LONGITUD_KEY) {
      res.status(400).json(
        ApiResponse.fail('X-Idempotency-Key excede longitud maxima', 'IDEMPOTENCY_KEY_INVALID'),
      );
      return;
    }

    const huella = construirHuella(req);
    const clave = construirClaveCache(opciones.scope, req, raw);
    const existente = cacheIdempotencia.get<EntradaIdempotencia>(clave);

    if (existente) {
      if (existente.huella !== huella) {
        res.status(409).json(
          ApiResponse.fail(
            'La misma idempotency key no puede reutilizarse con otro payload',
            'IDEMPOTENCY_KEY_REUSED',
          ),
        );
        return;
      }

      if (existente.estado === 'PENDIENTE') {
        res.status(409).json(
          ApiResponse.fail(
            'Ya existe una operacion en proceso con esta idempotency key',
            'IDEMPOTENCY_IN_PROGRESS',
          ),
        );
        return;
      }

      res.setHeader('X-Idempotency-Replayed', 'true');
      res.status(existente.statusCode).json(existente.cuerpo);
      return;
    }

    cacheIdempotencia.set<EntradaIdempotencia>(
      clave,
      { estado: 'PENDIENTE', huella },
      ttlSegundos,
    );

    const jsonOriginal = res.json.bind(res);

    res.json = ((cuerpo: unknown) => {
      const statusCode = res.statusCode;

      // Guardar respuestas estables para replay.
      if (statusCode >= 200 && statusCode < 500) {
        cacheIdempotencia.set<EntradaIdempotencia>(
          clave,
          { estado: 'COMPLETADA', huella, statusCode, cuerpo },
          ttlSegundos,
        );
      } else {
        cacheIdempotencia.del(clave);
      }

      return jsonOriginal(cuerpo);
    }) as Response['json'];

    next();
  };
}

// Utilidad de test para limpiar estado entre casos.
export function limpiarCacheIdempotenciaParaTests(): void {
  cacheIdempotencia.flushAll();
}
