/**
 * src/server.ts
 * ------------------------------------------------------------------
 * Entry point de la aplicacion.
 * Levanta el servidor HTTP y maneja el apagado graceful.
 *
 * Responsabilidades:
 * - Verificar conectividad con la base de datos antes de aceptar trafico.
 * - Iniciar el servidor en el puerto configurado.
 * - Configurar timeouts HTTP para compatibilidad con load balancers.
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
// Verificar conectividad con la BD antes de aceptar trafico
// ------------------------------------------------------------------
const iniciar = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Conexion a base de datos verificada.');
  } catch (error) {
    logger.error('No se pudo conectar a la base de datos:', error);
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // Iniciar servidor HTTP
  // ------------------------------------------------------------------
  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor ERP/POS iniciado en puerto ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
    if (env.NODE_ENV !== 'production') {
      logger.info(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
    }
  });

  // ------------------------------------------------------------------
  // Timeouts HTTP — evitar 502 detras de Nginx / ALB
  // El keepAliveTimeout debe ser MAYOR que el idle timeout del proxy (60s).
  // headersTimeout debe ser mayor que keepAliveTimeout.
  // ------------------------------------------------------------------
  server.keepAliveTimeout = 61_000;
  server.headersTimeout = 62_000;

  // Timeout general por request: 30s (evita requests infinitos)
  server.setTimeout(30_000);

  // ------------------------------------------------------------------
  // Graceful shutdown
  // Cierra conexiones abiertas antes de terminar el proceso.
  // Docker envia SIGTERM al detener contenedores.
  // Ctrl+C envia SIGINT en desarrollo.
  // ------------------------------------------------------------------
  let cerrando = false;

  const cerrarServidor = async (senal: string): Promise<void> => {
    if (cerrando) return; // Evitar doble shutdown
    cerrando = true;

    logger.info(`Senal ${senal} recibida. Cerrando servidor...`);

    // Dejar de aceptar nuevas conexiones
    server.close(async () => {
      logger.info('Servidor HTTP cerrado (no mas conexiones nuevas).');

      try {
        // Desconectar Prisma para liberar el pool de conexiones
        await prisma.$disconnect();
        logger.info('Conexion a base de datos cerrada.');
      } catch (err) {
        logger.error('Error al desconectar Prisma:', err);
      }

      process.exit(0);
    });

    // Cerrar conexiones keep-alive activas tras un breve periodo de gracia
    setTimeout(() => {
      logger.warn('Cerrando conexiones keep-alive activas...');
      server.closeAllConnections();
    }, 5_000);

    // Si el servidor no cierra en 15 segundos, forzar salida
    setTimeout(() => {
      logger.error('Cierre forzado por timeout (15s).');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
  process.on('SIGINT', () => cerrarServidor('SIGINT'));
};

// ------------------------------------------------------------------
// Capturar errores globales no manejados
// ------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  // Proceso en estado indeterminado → salir de forma controlada
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// ------------------------------------------------------------------
// Arrancar la aplicacion
// ------------------------------------------------------------------
iniciar();
