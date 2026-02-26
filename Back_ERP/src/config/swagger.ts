/**
 * src/config/swagger.ts
 * ------------------------------------------------------------------
 * Configuracion centralizada de Swagger / OpenAPI 3.0.
 *
 * Genera la especificacion a partir de las anotaciones @openapi
 * en los archivos de rutas y los componentes globales definidos aqui.
 *
 * En produccion, la documentacion se desactiva automaticamente para
 * no exponer detalles internos de la API a terceros.
 * ------------------------------------------------------------------
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/**
 * Definiciones de tags usados para agrupar endpoints en Swagger UI.
 * Cada tag corresponde a un modulo funcional del ERP.
 */
const tags = [
  {
    name: 'Autenticacion',
    description: 'Login, logout, perfil y gestion de PINs de autorizacion',
  },
  {
    name: 'Categorias',
    description: 'CRUD jerarquico de categorias de productos',
  },
  {
    name: 'Almacenes',
    description: 'Gestion de almacenes/bodegas de la empresa',
  },
  {
    name: 'Proveedores',
    description: 'Directorio de proveedores y contactos',
  },
  {
    name: 'Productos',
    description: 'Catalogo de productos, precios, codigos de barras y SKU',
  },
  {
    name: 'Clientes',
    description: 'Directorio de clientes, credito y datos fiscales',
  },
  {
    name: 'Inventario',
    description: 'Movimientos de inventario, existencias y traslados entre almacenes',
  },
  {
    name: 'Compras',
    description: 'Ordenes de compra a proveedores (Fase 4)',
  },
  {
    name: 'Turnos de Caja',
    description: 'Apertura y cierre de turnos de caja registradora (Fase 4)',
  },
  {
    name: 'Ordenes',
    description: 'Ordenes de venta POS, detalle, pagos (Fase 4)',
  },
  {
    name: 'Entregas',
    description: 'Gestion de entregas a domicilio (Fase 4)',
  },
  {
    name: 'Reportes',
    description: 'Dashboard, ventas, inventario y reportes fiscales (Fase 5)',
  },
];

/**
 * Componentes reutilizables de la especificacion OpenAPI.
 * Incluye esquemas de respuesta estandar, esquema de error,
 * y el security scheme Bearer JWT.
 */
const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http' as const,
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Token JWT obtenido en POST /auth/login. Incluir como: Authorization: Bearer <token>',
    },
  },
  schemas: {
    /**
     * Estructura estandar de toda respuesta exitosa de la API.
     */
    RespuestaExitosa: {
      type: 'object' as const,
      properties: {
        ok: { type: 'boolean' as const, example: true },
        datos: {
          type: 'object' as const,
          description: 'Contenido de la respuesta (varia segun endpoint)',
        },
        meta: {
          type: 'object' as const,
          description: 'Metadatos de paginacion (solo en listados)',
          properties: {
            pagina: { type: 'integer' as const, example: 1 },
            limite: { type: 'integer' as const, example: 20 },
            total: { type: 'integer' as const, example: 150 },
            totalPaginas: { type: 'integer' as const, example: 8 },
          },
        },
      },
    },
    /**
     * Estructura estandar de toda respuesta de error.
     */
    RespuestaError: {
      type: 'object' as const,
      properties: {
        ok: { type: 'boolean' as const, example: false },
        mensaje: {
          type: 'string' as const,
          example: 'No autorizado. Token invalido o sesion expirada.',
        },
        codigo: { type: 'string' as const, example: 'NO_AUTORIZADO' },
        detalles: {
          type: 'array' as const,
          description: 'Errores de validacion Zod (solo en 400)',
          items: {
            type: 'object' as const,
            properties: {
              campo: { type: 'string' as const, example: 'correo' },
              mensaje: {
                type: 'string' as const,
                example: 'Formato de correo invalido',
              },
            },
          },
        },
      },
    },
  },
  /**
   * Respuestas reutilizables para codigos HTTP comunes.
   */
  responses: {
    NoAutorizado: {
      description: 'Token JWT faltante, invalido o sesion expirada.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RespuestaError' },
        },
      },
    },
    Prohibido: {
      description: 'El usuario no tiene permisos para esta operacion.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RespuestaError' },
        },
      },
    },
    NoEncontrado: {
      description: 'Recurso no encontrado.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RespuestaError' },
        },
      },
    },
    ValidacionFallida: {
      description: 'Error de validacion en los datos enviados.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RespuestaError' },
        },
      },
    },
    RateLimitExcedido: {
      description: 'Demasiadas peticiones. Intente de nuevo mas tarde.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RespuestaError' },
        },
      },
    },
  },
};

/**
 * Opciones para swagger-jsdoc.
 * Escanea los archivos .routes.ts de cada modulo para extraer
 * anotaciones @openapi y combinarlas con los componentes globales.
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ERP/POS API - Sistema para PyMEs',
      version: '1.0.0',
      description: [
        'API REST del sistema ERP/POS para PyMEs.',
        '',
        '## Autenticacion',
        'Todos los endpoints (excepto login) requieren un token JWT.',
        'Obtenerlo via `POST /auth/login` e incluirlo en el header:',
        '```',
        'Authorization: Bearer <token>',
        '```',
        '',
        '## Roles',
        '- **ADMIN**: Acceso total al sistema.',
        '- **CAJERO**: Operaciones de punto de venta y consultas basicas.',
        '',
        '## Respuestas',
        'Todas las respuestas siguen la estructura `{ ok, datos, meta?, mensaje?, codigo? }`.',
        'Ver los schemas `RespuestaExitosa` y `RespuestaError` para detalles.',
        '',
        '## Rate Limiting',
        '- General: 100 peticiones/minuto por IP.',
        '- Login: 5 intentos cada 15 minutos por IP.',
      ].join('\n'),
      contact: {
        name: 'Soporte ERP',
      },
      license: {
        name: 'Privada',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Servidor de desarrollo local',
      },
    ],
    tags,
    components,
    /**
     * Aplicar bearerAuth globalmente como default.
     * Endpoints publicos (login) deben declarar security: [] para excluirse.
     */
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modulos/**/*.routes.ts'],
};

/**
 * Especificacion OpenAPI generada. Se usa para alimentar swagger-ui-express.
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Opciones visuales para personalizar Swagger UI.
 * TopBar oculto, ordenado por tags, operaciones expandidas.
 */
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-size: 1.6em; }
  `,
  customSiteTitle: 'ERP/POS API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list' as const,
    filter: true,
    tagsSorter: 'alpha' as const,
    operationsSorter: 'method' as const,
    defaultModelsExpandDepth: 2,
  },
};

/**
 * Indica si la documentacion Swagger debe estar habilitada.
 * En produccion se desactiva para no exponer la API internamente.
 */
export const swaggerHabilitado = env.NODE_ENV !== 'production';
