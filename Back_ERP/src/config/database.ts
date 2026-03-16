/**
 * src/config/database.ts
 * ------------------------------------------------------------------
 * Singleton de PrismaClient.
 * Multiples instancias agotan el pool de conexiones de PostgreSQL.
 * Este archivo garantiza una sola instancia en toda la aplicacion.
 *
 * En desarrollo, se guarda en globalThis para sobrevivir al hot-reload
 * de tsx/nodemon sin crear conexiones duplicadas.
 * ------------------------------------------------------------------
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../compartido/logger';

// Extender globalThis para almacenar la instancia en desarrollo
const globalParaPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Instancia unica de PrismaClient.
 * - En development: log de errores y warnings para depuracion.
 * - En production: solo errores para reducir ruido en logs.
 */
export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Corta consultas atascadas para evitar agotar workers y conexiones.
prisma.$use(async (params, next) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Prisma query timeout (${env.PRISMA_QUERY_TIMEOUT_MS}ms): ${params.model ?? 'Raw'}.${params.action}`,
        ),
      );
    }, env.PRISMA_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([next(params), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Prisma query timeout')) {
      logger.error({
        mensaje: 'Timeout en consulta Prisma',
        modelo: params.model,
        accion: params.action,
        timeoutMs: env.PRISMA_QUERY_TIMEOUT_MS,
      });
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
});

// Prevenir multiples instancias en desarrollo (hot-reload)
if (env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}
