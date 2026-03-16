/**
 * src/middlewares/limitarRates.ts
 * ------------------------------------------------------------------
 * Instancias de express-rate-limit para proteger endpoints criticos.
 * Cada tipo de ruta tiene su propio limitador con ventana y maximo
 * adecuados al caso de uso.
 *
 * El rate limit se aplica por IP del cliente.
 * En produccion, confiar en X-Forwarded-For de Nginx (app.set('trust proxy', 1)).
 * ------------------------------------------------------------------
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ApiResponse } from '../compartido/respuesta';
import { obtenerRedisClient } from '../config/redis';
import { logger } from '../compartido/logger';

const redisClient = obtenerRedisClient();

const storeDistribuido = redisClient
  ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:',
    })
  : undefined;

if (!storeDistribuido) {
  logger.warn('Rate limit usando MemoryStore (sin REDIS_URL).');
}

function crearLimiter(
  windowMs: number,
  max: number,
  mensaje: string,
) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: ApiResponse.fail(mensaje, 'RATE_LIMIT'),
    store: storeDistribuido,
    // Si Redis falla, no bloquear operaciones validas.
    passOnStoreError: true,
  });
}

/**
 * Limitador para el endpoint de login.
 * Maximo 5 intentos por IP en ventana de 15 minutos.
 * Previene ataques de fuerza bruta contra credenciales.
 */
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: ApiResponse.fail(
    'Demasiados intentos de login. Intente de nuevo en 15 minutos.',
    'RATE_LIMIT',
  ),
  store: storeDistribuido,
  passOnStoreError: true,
});

/**
 * Limitador general para rutas de la API.
 * Maximo 100 peticiones por IP por minuto.
 * Protege contra abuso general sin afectar uso normal del POS.
 */
export const limitarGeneral = crearLimiter(
  60 * 1000, // 1 minuto
  100,
  'Demasiadas peticiones. Intente de nuevo en un momento.',
);

/**
 * Limitador para registro publico.
 * Maximo 3 registros por IP por hora.
 * Previene creacion masiva de cuentas/empresas.
 */
export const limitarRegistro = crearLimiter(
  60 * 60 * 1000, // 1 hora
  3,
  'Demasiados registros. Intente de nuevo en una hora.',
);

/**
 * Limitador para cambio de PIN.
 * Maximo 5 intentos por IP en ventana de 15 minutos.
 * Protege contra fuerza bruta de PIN (4-6 digitos).
 */
export const limitarCambioPin = crearLimiter(
  15 * 60 * 1000, // 15 minutos
  5,
  'Demasiados intentos de cambio de PIN. Intente en 15 minutos.',
);
