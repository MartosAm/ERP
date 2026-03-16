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
import { obtenerRedisClient } from '../config/redis';
import { logger } from '../compartido/logger';

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
const redisClient = obtenerRedisClient();

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
  return `idem:${scope}:${empresa}:${usuario}:${key}`;
}

function obtenerRedisActivo() {
  if (!redisClient || !redisClient.isOpen) return null;
  return redisClient;
}

async function obtenerEntrada(clave: string): Promise<EntradaIdempotencia | undefined> {
  const redis = obtenerRedisActivo();
  if (redis) {
    try {
      const raw = await redis.get(clave);
      if (!raw) return undefined;
      return JSON.parse(raw) as EntradaIdempotencia;
    } catch (error) {
      logger.error({ mensaje: 'Error leyendo idempotencia en Redis', error: String(error) });
    }
  }

  return cacheIdempotencia.get<EntradaIdempotencia>(clave);
}

async function guardarEntrada(clave: string, entrada: EntradaIdempotencia, ttlSegundos: number): Promise<void> {
  const redis = obtenerRedisActivo();
  if (redis) {
    try {
      await redis.set(clave, JSON.stringify(entrada), { EX: ttlSegundos });
      return;
    } catch (error) {
      logger.error({ mensaje: 'Error guardando idempotencia en Redis', error: String(error) });
    }
  }

  cacheIdempotencia.set<EntradaIdempotencia>(clave, entrada, ttlSegundos);
}

async function guardarPendienteSiNoExiste(
  clave: string,
  entrada: EntradaPendiente,
  ttlSegundos: number,
): Promise<boolean> {
  const redis = obtenerRedisActivo();
  if (redis) {
    try {
      const result = await redis.set(clave, JSON.stringify(entrada), { EX: ttlSegundos, NX: true });
      return result === 'OK';
    } catch (error) {
      logger.error({ mensaje: 'Error en lock idempotente Redis', error: String(error) });
    }
  }

  if (cacheIdempotencia.has(clave)) return false;
  cacheIdempotencia.set<EntradaIdempotencia>(clave, entrada, ttlSegundos);
  return true;
}

async function eliminarEntrada(clave: string): Promise<void> {
  const redis = obtenerRedisActivo();
  if (redis) {
    try {
      await redis.del(clave);
      return;
    } catch (error) {
      logger.error({ mensaje: 'Error eliminando idempotencia en Redis', error: String(error) });
    }
  }

  cacheIdempotencia.del(clave);
}

function responderDesdeEntrada(res: Response, existente: EntradaIdempotencia): void {
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
}

export function requerirIdempotencia(opciones: OpcionesIdempotencia) {
  const ttlSegundos = opciones.ttlSegundos ?? 300;
  const requerido = opciones.requerido ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      const raw = req.header('x-idempotency-key')?.trim();

      if (!raw) {
        if (requerido) {
          res.status(400).json(
            ApiResponse.fail('Header X-Idempotency-Key requerido', 'IDEMPOTENCY_KEY_REQUIRED'),
          );
          return;
        }
        next();
        return;
      }

      if (raw.length > MAX_LONGITUD_KEY) {
        res.status(400).json(
          ApiResponse.fail('X-Idempotency-Key excede longitud maxima', 'IDEMPOTENCY_KEY_INVALID'),
        );
        return;
      }

      const huella = construirHuella(req);
      const clave = construirClaveCache(opciones.scope, req, raw);
      const existente = await obtenerEntrada(clave);

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

        responderDesdeEntrada(res, existente);
        return;
      }

      const adquirido = await guardarPendienteSiNoExiste(
        clave,
        { estado: 'PENDIENTE', huella },
        ttlSegundos,
      );

      if (!adquirido) {
        // Si otro nodo/proceso gano la carrera, responder segun estado actual.
        const carrera = await obtenerEntrada(clave);
        if (!carrera) {
          res.status(409).json(
            ApiResponse.fail(
              'No se pudo adquirir lock de idempotencia para esta operacion',
              'IDEMPOTENCY_LOCK_FAILED',
            ),
          );
          return;
        }

        if (carrera.huella !== huella) {
          res.status(409).json(
            ApiResponse.fail(
              'La misma idempotency key no puede reutilizarse con otro payload',
              'IDEMPOTENCY_KEY_REUSED',
            ),
          );
          return;
        }

        responderDesdeEntrada(res, carrera);
        return;
      }

      const jsonOriginal = res.json.bind(res);

      res.json = ((cuerpo: unknown) => {
        const statusCode = res.statusCode;

        // Guardar respuestas estables para replay.
        if (statusCode >= 200 && statusCode < 500) {
          void guardarEntrada(
            clave,
            { estado: 'COMPLETADA', huella, statusCode, cuerpo },
            ttlSegundos,
          );
        } else {
          void eliminarEntrada(clave);
        }

        return jsonOriginal(cuerpo);
      }) as Response['json'];

      next();
    })().catch((error) => {
      logger.error({ mensaje: 'Error en middleware de idempotencia', error: String(error) });
      next(error);
    });
  };
}

// Utilidad de test para limpiar estado entre casos.
export function limpiarCacheIdempotenciaParaTests(): void {
  cacheIdempotencia.flushAll();
}

export function sembrarEntradaIdempotenciaParaTests(params: {
  scope: string;
  key: string;
  entrada: EntradaIdempotencia;
  empresaId?: string;
  usuarioId?: string;
  ttlSegundos?: number;
}): void {
  const empresaId = params.empresaId ?? 'sin-empresa';
  const usuarioId = params.usuarioId ?? 'anonimo';
  const ttlSegundos = params.ttlSegundos ?? 300;
  const clave = `idem:${params.scope}:${empresaId}:${usuarioId}:${params.key}`;
  cacheIdempotencia.set<EntradaIdempotencia>(clave, params.entrada, ttlSegundos);
}
