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

  /** Origen permitido para CORS. URL del frontend Angular. */
  CORS_ORIGIN: z.string().url().default('http://localhost:4200'),

  /** Tiempo de expiracion del JWT. Formato: "8h", "1d", "30m". */
  JWT_EXPIRES_IN: z.string().default('8h'),
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

/** Variables de entorno validadas y tipadas. Importar desde aqui en toda la app. */
export const env = resultado.data;
