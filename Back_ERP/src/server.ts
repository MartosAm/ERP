/**
 * src/server.ts
 * ------------------------------------------------------------------
 * Entry point de la aplicacion.
 * Levanta el servidor HTTP y maneja el apagado graceful.
 *
 * Responsabilidades:
 * - Iniciar el servidor en el puerto configurado.
 * - Capturar senales del SO (SIGTERM, SIGINT) para cerrar conexiones
 *   de forma ordenada antes de terminar el proceso.
 * - Desconectar Prisma al apagar para liberar el pool de PostgreSQL.
 *
 * Este archivo NO contiene logica de rutas ni middlewares. Eso esta en app.ts.
 * ------------------------------------------------------------------
 */

import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './compartido/logger';

// ------------------------------------------------------------------
// Iniciar servidor HTTP
// ------------------------------------------------------------------
const server = app.listen(env.PORT, () => {
  logger.info(`Servidor ERP/POS iniciado en puerto ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
  logger.info(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
});

// ------------------------------------------------------------------
// Graceful shutdown
// Cierra conexiones abiertas antes de terminar el proceso.
// Docker envia SIGTERM al detener contenedores.
// Ctrl+C envia SIGINT en desarrollo.
// ------------------------------------------------------------------
const cerrarServidor = async (senal: string): Promise<void> => {
  logger.info(`Senal ${senal} recibida. Cerrando servidor...`);

  server.close(async () => {
    logger.info('Servidor HTTP cerrado.');

    // Desconectar Prisma para liberar el pool de conexiones
    await prisma.$disconnect();
    logger.info('Conexion a base de datos cerrada.');

    process.exit(0);
  });

  // Si el servidor no cierra en 10 segundos, forzar salida
  setTimeout(() => {
    logger.error('Cierre forzado por timeout (10s).');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
process.on('SIGINT', () => cerrarServidor('SIGINT'));

// Capturar errores no manejados para evitar crash silencioso
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
