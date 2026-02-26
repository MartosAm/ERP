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
import { ApiResponse } from '../compartido/respuesta';

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
});

/**
 * Limitador general para rutas de la API.
 * Maximo 100 peticiones por IP por minuto.
 * Protege contra abuso general sin afectar uso normal del POS.
 */
export const limitarGeneral = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: ApiResponse.fail(
    'Demasiadas peticiones. Intente de nuevo en un momento.',
    'RATE_LIMIT',
  ),
});
