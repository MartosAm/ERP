/**
 * src/config/redis.ts
 * ------------------------------------------------------------------
 * Cliente Redis compartido para componentes distribuidos (rate limit,
 * cache entre replicas, etc.).
 *
 * Diseno:
 * - Si REDIS_URL no esta configurado, Redis queda deshabilitado.
 * - Si Redis falla, la app no cae; los componentes deben definir fallback.
 * ------------------------------------------------------------------
 */

import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from '../compartido/logger';

let clienteRedis: RedisClientType | null = null;

export function obtenerRedisClient(): RedisClientType | null {
  if (!env.REDIS_URL) return null;

  if (!clienteRedis) {
    clienteRedis = createClient({ url: env.REDIS_URL });

    clienteRedis.on('error', (error) => {
      logger.error({ mensaje: 'Redis error', error: String(error) });
    });

    clienteRedis.on('reconnecting', () => {
      logger.warn('Redis reconectando...');
    });
  }

  return clienteRedis;
}

export async function conectarRedis(): Promise<void> {
  const client = obtenerRedisClient();
  if (!client || client.isOpen) return;

  try {
    await client.connect();
    logger.info('Conexion Redis verificada.');
  } catch (error) {
    logger.error({ mensaje: 'No se pudo conectar a Redis. Se usaran fallbacks locales.', error: String(error) });
  }
}

export async function desconectarRedis(): Promise<void> {
  const client = obtenerRedisClient();
  if (!client || !client.isOpen) return;

  try {
    await client.quit();
    logger.info('Conexion Redis cerrada.');
  } catch (error) {
    logger.error({ mensaje: 'Error al cerrar Redis', error: String(error) });
  }
}
