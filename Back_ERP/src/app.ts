/**
 * src/app.ts
 * ------------------------------------------------------------------
 * Configuracion de la aplicacion Express.
 * Registra middlewares globales en el orden correcto y monta las rutas
 * de cada modulo bajo el prefijo /api/v1/.
 *
 * Orden de middlewares:
 * 1. Seguridad (helmet, cors)
 * 2. Parsing (json, urlencoded)
 * 3. Compresion
 * 4. Logging HTTP
 * 5. Rate limiting general
 * 6. Rutas de modulos
 * 7. Ruta de documentacion Swagger
 * 8. Manejo de errores (siempre al final)
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
import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './config/env';
import { limitarGeneral } from './middlewares/limitarRates';
import { manejarErrores } from './middlewares/manejarErrores';
import { ApiResponse } from './compartido/respuesta';

// ------------------------------------------------------------------
// Crear instancia de Express
// ------------------------------------------------------------------
const app = express();

// ------------------------------------------------------------------
// 1. Seguridad HTTP
// ------------------------------------------------------------------

// Confiar en el primer proxy (Nginx en produccion)
app.set('trust proxy', 1);

// Helmet: headers de seguridad (XSS, clickjacking, MIME sniffing)
app.use(helmet());

// CORS: permitir requests desde el frontend Angular
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ------------------------------------------------------------------
// 2. Parsing del body
// ------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// 3. Compresion gzip/brotli en respuestas
// ------------------------------------------------------------------
app.use(compression());

// ------------------------------------------------------------------
// 4. Logger de peticiones HTTP
// ------------------------------------------------------------------
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ------------------------------------------------------------------
// 5. Rate limiting general (100 req/min por IP)
// ------------------------------------------------------------------
app.use('/api/', limitarGeneral);

// ------------------------------------------------------------------
// 6. Health check (no requiere autenticacion)
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
// 7. Rutas de modulos (se registraran conforme se desarrollen)
// ------------------------------------------------------------------
// TODO Fase 2: app.use('/api/v1/auth', authRoutes);
// TODO Fase 3: app.use('/api/v1/categorias', categoriasRoutes);
// TODO Fase 3: app.use('/api/v1/almacenes', almacenesRoutes);
// TODO Fase 3: app.use('/api/v1/proveedores', proveedoresRoutes);
// TODO Fase 3: app.use('/api/v1/productos', productosRoutes);
// TODO Fase 4: app.use('/api/v1/clientes', clientesRoutes);
// TODO Fase 4: app.use('/api/v1/inventario', inventarioRoutes);
// TODO Fase 4: app.use('/api/v1/compras', comprasRoutes);
// TODO Fase 4: app.use('/api/v1/turnos-caja', turnosCajaRoutes);
// TODO Fase 4: app.use('/api/v1/ordenes', ordenesRoutes);
// TODO Fase 4: app.use('/api/v1/entregas', entregasRoutes);
// TODO Fase 5: app.use('/api/v1/reportes', reportesRoutes);

// ------------------------------------------------------------------
// 8. Documentacion Swagger (OpenAPI)
// ------------------------------------------------------------------
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP/POS API',
      version: '1.0.0',
      description: 'API REST del sistema ERP/POS para PyMEs',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Escanear archivos de rutas para extraer @openapi JSDoc
  apis: ['./src/modulos/**/*.routes.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ------------------------------------------------------------------
// 9. Ruta 404 para endpoints no encontrados
// ------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json(ApiResponse.fail('Ruta no encontrada', 'NOT_FOUND'));
});

// ------------------------------------------------------------------
// 10. Manejo global de errores (SIEMPRE al final)
// ------------------------------------------------------------------
app.use(manejarErrores);

export default app;
