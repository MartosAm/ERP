/**
 * src/middlewares/seguridad.ts
 * ------------------------------------------------------------------
 * Middleware de seguridad avanzada para la aplicacion Express.
 *
 * Reune protecciones adicionales a las que helmet proporciona:
 * - Prevencion de HTTP Parameter Pollution (hpp)
 * - Generacion de X-Request-ID para trazabilidad
 * - Header X-Response-Time para monitorear latencia
 * - Headers de seguridad adicionales (Permissions-Policy, etc.)
 * - Validacion de Content-Type en peticiones con body
 * - Ocultamiento de informacion del servidor
 *
 * Cada funcion se exporta individualmente para poder aplicarlas
 * en el orden correcto dentro de app.ts.
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import hpp from 'hpp';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../compartido/respuesta';

// ------------------------------------------------------------------
// 1. HTTP Parameter Pollution
// ------------------------------------------------------------------

/**
 * Protege contra ataques de contaminacion de parametros HTTP.
 * Cuando un query param se envia duplicado (?orden=asc&orden=desc),
 * hpp toma solo el ultimo valor en lugar de crear un array.
 * Se permite lista blanca para parametros que legitimamente aceptan arrays.
 */
export const protegerParametros = hpp({
  whitelist: [
    // Parametros que legitimamente aceptan multiples valores
    'categoriaId',
    'proveedorId',
    'almacenId',
    'estado',
  ],
});

// ------------------------------------------------------------------
// 2. X-Request-ID (trazabilidad)
// ------------------------------------------------------------------

/**
 * Asigna un identificador unico a cada peticion entrante.
 * Si el cliente ya envia X-Request-ID (por ejemplo, el API Gateway),
 * se respeta ese valor. Caso contrario, se genera un UUID v4.
 *
 * El ID se propaga en la respuesta para facilitar debugging y
 * correlacion de logs entre frontend y backend.
 */
export function asignarRequestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Disponible para loggers y otros middlewares
  req.headers['x-request-id'] = requestId;

  // Devolver al cliente para correlacion
  res.setHeader('X-Request-Id', requestId);

  next();
}

// ------------------------------------------------------------------
// 3. X-Response-Time
// ------------------------------------------------------------------

/**
 * Mide el tiempo de procesamiento de cada peticion y lo agrega
 * como header X-Response-Time en milisegundos.
 * Util para monitoreo de rendimiento y deteccion de endpoints lentos.
 *
 * Se intercepta res.writeHead() para inyectar el header justo antes
 * de que la respuesta se envie al cliente.
 */
export function medirTiempoRespuesta(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inicio = process.hrtime.bigint();

  // Guardar referencia original
  const writeHeadOriginal = res.writeHead;

  // Interceptar writeHead para agregar el header antes de enviar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).writeHead = function (...args: any[]) {
    const fin = process.hrtime.bigint();
    const duracionMs = Number(fin - inicio) / 1_000_000;
    res.setHeader('X-Response-Time', `${duracionMs.toFixed(2)}ms`);
    return (writeHeadOriginal as Function).apply(res, args);
  };

  next();
}

// ------------------------------------------------------------------
// 4. Headers de seguridad adicionales
// ------------------------------------------------------------------

/**
 * Agrega headers de seguridad complementarios a los que ya pone helmet.
 * Estos headers refuerzan la postura de seguridad en navegadores modernos.
 */
export function headersSeguridad(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Permissions-Policy: restringe APIs del navegador que la app NO necesita
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );

  // Evita que motores de busqueda indexen la API
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  // Referrer-Policy: no enviar referrer a origenes externos
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cache-Control por defecto para respuestas de la API (no cachear datos sensibles)
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.setHeader('Pragma', 'no-cache');

  next();
}

// ------------------------------------------------------------------
// 5. Validacion de Content-Type
// ------------------------------------------------------------------

/**
 * En peticiones con body (POST, PUT, PATCH), valida que el Content-Type
 * sea application/json. Rechaza otros formatos como text/plain o
 * multipart que podrian usarse para inyeccion.
 *
 * Se excluyen:
 * - Peticiones sin body (GET, DELETE, OPTIONS, HEAD)
 * - Peticiones a la ruta de documentacion Swagger
 * - Peticiones al health check
 */
export function validarContentType(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const metodosConBody = ['POST', 'PUT', 'PATCH'];

  // Solo validar en metodos que envian body
  if (!metodosConBody.includes(req.method)) {
    return next();
  }

  // Excluir rutas que no manejan JSON
  const rutasExcluidas = ['/api-docs', '/api/health'];
  if (rutasExcluidas.some((ruta) => req.path.startsWith(ruta))) {
    return next();
  }

  // Si no hay body, permitir (puede ser POST sin body)
  const contentLength = req.headers['content-length'];
  if (!contentLength || contentLength === '0') {
    return next();
  }

  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    res.status(415).json(
      ApiResponse.fail('Content-Type debe ser application/json', 'CONTENT_TYPE_INVALIDO'),
    );
    return;
  }

  next();
}

// ------------------------------------------------------------------
// 6. Prevencion de ataques de enumeracion
// ------------------------------------------------------------------

/**
 * Elimina headers que exponen informacion del stack tecnologico.
 * Complementa helmet.hidePoweredBy() ocultando cualquier header
 * residual que pueda filtrar la tecnologia del servidor.
 */
export function ocultarTecnologia(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}
