/**
 * src/compartido/logger.ts
 * ------------------------------------------------------------------
 * Instancia de Winston configurada por entorno.
 * - development: formato colorizado en consola, nivel debug.
 * - production: formato JSON estructurado, nivel info.
 * - test: silenciado para no ensuciar la salida de Jest.
 *
 * Usar siempre logger.info/warn/error/debug en lugar de console.log.
 * ------------------------------------------------------------------
 */

import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, json } = winston.format;

/**
 * Formato legible para desarrollo.
 * Muestra timestamp, nivel y mensaje con colores en terminal.
 */
const formatoDesarrollo = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp: ts, level, message, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${message}${extras}`;
  }),
);

/**
 * Formato JSON estructurado para produccion.
 * Facilita la ingesta en herramientas de monitoreo.
 */
const formatoProduccion = combine(
  timestamp(),
  json(),
);

/**
 * Instancia unica de Winston.
 * Importar desde aqui en toda la aplicacion.
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  silent: env.NODE_ENV === 'test',
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? formatoProduccion : formatoDesarrollo,
    }),
  ],
});
