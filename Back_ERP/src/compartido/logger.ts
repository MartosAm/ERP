/**
 * src/compartido/logger.ts
 * ------------------------------------------------------------------
 * Instancia de Winston configurada por entorno.
 * - development: formato colorizado en consola, nivel debug.
 * - production: formato JSON estructurado, nivel info.
 * - test: silenciado para no ensuciar la salida de Jest.
 *
 * El nivel se puede sobreescribir con LOG_LEVEL en .env sin redesplegar.
 *
 * Usar siempre logger.info/warn/error/debug en lugar de console.log.
 * ------------------------------------------------------------------
 */

import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, json, errors: errorsFormat } = winston.format;

/**
 * Determinar nivel de logging:
 * 1. Si LOG_LEVEL esta definido en env, usarlo (override explicito).
 * 2. Si no, usar 'debug' en development, 'info' en production.
 */
const nivelLog = env.LOG_LEVEL ?? (env.NODE_ENV === 'development' ? 'debug' : 'info');

/**
 * Formato legible para desarrollo.
 * Muestra timestamp, nivel y mensaje con colores en terminal.
 * Incluye stack traces de errores cuando estan disponibles.
 */
const formatoDesarrollo = combine(
  errorsFormat({ stack: true }),
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp: ts, level, message, stack, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const traza = stack ? `\n${stack}` : '';
    return `${ts} [${level}]: ${message}${extras}${traza}`;
  }),
);

/**
 * Formato JSON estructurado para produccion.
 * Facilita la ingesta en herramientas de monitoreo (ELK, Datadog, CloudWatch).
 * Serializa errores con stack trace incluido en el JSON.
 */
const formatoProduccion = combine(
  errorsFormat({ stack: true }),
  timestamp(),
  json(),
);

/**
 * Instancia unica de Winston.
 * Importar desde aqui en toda la aplicacion.
 */
export const logger = winston.createLogger({
  level: nivelLog,
  silent: env.NODE_ENV === 'test',
  defaultMeta: { servicio: 'erp-backend' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? formatoProduccion : formatoDesarrollo,
    }),
  ],
});
