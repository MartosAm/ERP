/**
 * src/config/env.ts
 * ------------------------------------------------------------------
 * Validacion de variables de entorno al arranque de la aplicacion.
 * Usa Zod para garantizar que toda variable requerida esta presente
 * y tiene el formato correcto. Si falta alguna, el proceso termina
 * con un mensaje claro que identifica exactamente que falta.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

/**
 * Schema de validacion para process.env.
 * Cada campo corresponde a una variable de entorno obligatoria u opcional.
 * Los valores por defecto estan documentados junto a cada campo.
 */
const EnvSchema = z.object({
  /** URL de conexion a PostgreSQL (Prisma) */
  DATABASE_URL: z.string().url(),

  /** Secreto para firmar tokens JWT. Minimo 32 caracteres por seguridad. */
  JWT_SECRET: z.string().min(32),

  /** Puerto del servidor HTTP. Por defecto 3001 para no colisionar con Angular (4200). */
  PORT: z.coerce.number().default(3001),

  /** Entorno de ejecucion. Afecta logging, stack traces y comportamiento de cache. */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Rondas de salt para bcrypt. Rango seguro: 10-14. Mas alto = mas lento. */
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),

  /**
   * Origenes permitidos para CORS.
   * Acepta una URL unica o multiples separadas por comas.
   * Ej: "http://localhost:4200" o "https://app.com,https://admin.app.com"
   */
  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  /** Tiempo de expiracion del JWT. Formato: "8h", "1d", "30m". */
  JWT_EXPIRES_IN: z.string().default('8h'),

  /**
   * Nivel de logging. Permite ajustar la verbosidad sin redesplegar.
   * Valores: error, warn, info, http, verbose, debug, silly
   */
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional(),

  /**
   * Numero de proxies de confianza entre el cliente y el servidor.
   * 1 = un proxy (Nginx). 2 = CDN + Nginx. Afecta deteccion de IP real.
   */
  TRUST_PROXY: z.coerce.number().min(0).max(5).default(1),

  /** Timeout de request HTTP en milisegundos. Default: 30000 (30s). */
  REQUEST_TIMEOUT_MS: z.coerce.number().min(5000).max(120000).default(30000),
});

// Validar las variables de entorno al importar este modulo
const resultado = EnvSchema.safeParse(process.env);

if (!resultado.success) {
  // Mostrar exactamente que variables faltan o son invalidas
  console.error(
    'ERROR: Variables de entorno invalidas —',
    resultado.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const datosValidados = resultado.data;

// Advertencia si se usa CORS default en produccion
if (datosValidados.NODE_ENV === 'production' && datosValidados.CORS_ORIGIN === 'http://localhost:4200') {
  console.warn(
    'ADVERTENCIA: CORS_ORIGIN esta configurado a localhost en produccion. ' +
    'Establece la URL real del frontend en la variable CORS_ORIGIN.',
  );
}

/**
 * Parsear CORS_ORIGIN: si tiene comas, devolver array; si es una URL, devolver string.
 * Esto permite: CORS_ORIGIN="https://app.com,https://admin.app.com"
 */
export const corsOrigins: string | string[] = datosValidados.CORS_ORIGIN.includes(',')
  ? datosValidados.CORS_ORIGIN.split(',').map((s) => s.trim())
  : datosValidados.CORS_ORIGIN;

/** Variables de entorno validadas y tipadas. Importar desde aqui en toda la app. */
export const env = datosValidados;
