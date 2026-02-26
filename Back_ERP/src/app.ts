/**
 * src/app.ts
 * ------------------------------------------------------------------
 * Configuracion de la aplicacion Express.
 * Registra middlewares globales en el orden correcto y monta las rutas
 * de cada modulo bajo el prefijo /api/v1/.
 *
 * Orden de middlewares:
 * 1. Trazabilidad (X-Request-ID, X-Response-Time)
 * 2. Seguridad (helmet, cors, hpp, headers adicionales)
 * 3. Parsing (json, urlencoded) + validacion Content-Type
 * 4. Compresion
 * 5. Logging HTTP
 * 6. Rate limiting general
 * 7. Rutas de modulos
 * 8. Documentacion Swagger (deshabilitada en produccion)
 * 9. Manejo de errores (siempre al final)
 *
 * Este archivo NO hace listen(). Eso lo hace server.ts.
 * ------------------------------------------------------------------
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec, swaggerUiOptions, swaggerHabilitado } from './config/swagger';
import { limitarGeneral } from './middlewares/limitarRates';
import { manejarErrores } from './middlewares/manejarErrores';
import { ApiResponse } from './compartido/respuesta';
import {
  asignarRequestId,
  medirTiempoRespuesta,
  protegerParametros,
  headersSeguridad,
  validarContentType,
  ocultarTecnologia,
} from './middlewares/seguridad';

// -- Rutas de modulos --
import authRoutes from './modulos/auth/auth.routes';
import categoriasRoutes from './modulos/categorias/categorias.routes';
import almacenesRoutes from './modulos/almacenes/almacenes.routes';
import proveedoresRoutes from './modulos/proveedores/proveedores.routes';
import productosRoutes from './modulos/productos/productos.routes';
import clientesRoutes from './modulos/clientes/clientes.routes';
import inventarioRoutes from './modulos/inventario/inventario.routes';
import turnosCajaRoutes from './modulos/turnos-caja/turnos-caja.routes';
import ordenesRoutes from './modulos/ordenes/ordenes.routes';
import comprasRoutes from './modulos/compras/compras.routes';
import entregasRoutes from './modulos/entregas/entregas.routes';
import usuariosRoutes from './modulos/usuarios/usuarios.routes';
import reportesRoutes from './modulos/reportes/reportes.routes';

// ------------------------------------------------------------------
// Crear instancia de Express
// ------------------------------------------------------------------
const app = express();

// ------------------------------------------------------------------
// 1. Trazabilidad (primero, para que todos los logs tengan request ID)
// ------------------------------------------------------------------

// UUID unico por peticion para correlacion de logs
app.use(asignarRequestId);

// Medir tiempo de respuesta (header X-Response-Time)
app.use(medirTiempoRespuesta);

// ------------------------------------------------------------------
// 2. Seguridad HTTP
// ------------------------------------------------------------------

// Confiar en el primer proxy (Nginx en produccion)
app.set('trust proxy', 1);

// Ocultar headers que revelan tecnologia del servidor
app.use(ocultarTecnologia);

// Helmet: headers de seguridad (XSS, clickjacking, MIME sniffing, HSTS)
app.use(
  helmet({
    // Content Security Policy restrictiva para una API REST
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Permitir Swagger UI (inline scripts/styles necesarios)
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // Strict-Transport-Security: forzar HTTPS tras la primera visita (1 anio)
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Impedir que la API se cargue en un iframe
    frameguard: { action: 'deny' },
    // No permitir sniffing de MIME type
    noSniff: true,
    // Deshabilitar DNS prefetching
    dnsPrefetchControl: { allow: false },
    // Referrer-Policy (complementado en headersSeguridad)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);

// CORS: permitir requests desde el frontend Angular
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
    maxAge: 86400, // Cache preflight 24h (reduce OPTIONS requests)
  }),
);

// HTTP Parameter Pollution: toma ultimo valor en params duplicados
app.use(protegerParametros);

// Headers de seguridad adicionales (Permissions-Policy, X-Robots-Tag, etc.)
app.use(headersSeguridad);

// ------------------------------------------------------------------
// 3. Parsing del body + validacion Content-Type
// ------------------------------------------------------------------

// Validar Content-Type antes de parsear
app.use(validarContentType);

// JSON body (limite 10MB para importaciones masivas de productos)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ------------------------------------------------------------------
// 4. Compresion gzip/brotli en respuestas
// ------------------------------------------------------------------
app.use(compression());

// ------------------------------------------------------------------
// 5. Logger de peticiones HTTP
// ------------------------------------------------------------------
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ------------------------------------------------------------------
// 6. Rate limiting general (100 req/min por IP)
// ------------------------------------------------------------------
app.use('/api/', limitarGeneral);

// ------------------------------------------------------------------
// 7. Health check (no requiere autenticacion)
// ------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json(
    ApiResponse.ok({
      estado: 'activo',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  );
});

// ------------------------------------------------------------------
// 8. Rutas de modulos
// ------------------------------------------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categorias', categoriasRoutes);
app.use('/api/v1/almacenes', almacenesRoutes);
app.use('/api/v1/proveedores', proveedoresRoutes);
app.use('/api/v1/productos', productosRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/turnos-caja', turnosCajaRoutes);
app.use('/api/v1/ordenes', ordenesRoutes);
app.use('/api/v1/compras', comprasRoutes);
app.use('/api/v1/entregas', entregasRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);
app.use('/api/v1/reportes', reportesRoutes);

// ------------------------------------------------------------------
// 9. Documentacion Swagger (OpenAPI) - deshabilitada en produccion
// ------------------------------------------------------------------
if (swaggerHabilitado) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions),
  );

  // Endpoint para obtener la especificacion JSON (util para clientes)
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ------------------------------------------------------------------
// 10. Ruta 404 para endpoints no encontrados
// ------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json(ApiResponse.fail('Ruta no encontrada', 'NOT_FOUND'));
});

// ------------------------------------------------------------------
// 11. Manejo global de errores (SIEMPRE al final)
// ------------------------------------------------------------------
app.use(manejarErrores);

export default app;
