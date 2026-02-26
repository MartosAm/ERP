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

// Prevenir multiples instancias en desarrollo (hot-reload)
if (env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}
