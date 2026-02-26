/**
 * src/modulos/reportes/reportes.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de reportes.
 * Solo ADMIN. Todos los endpoints son GET (solo lectura).
 *
 * Endpoints:
 *   GET /reportes/dashboard       -> KPIs en tiempo real
 *   GET /reportes/ventas          -> Resumen de ventas por periodo
 *   GET /reportes/top-productos   -> Productos mas vendidos
 *   GET /reportes/metodos-pago    -> Desglose por metodo de pago
 *   GET /reportes/inventario      -> Inventario valorizado
 *   GET /reportes/cajeros         -> Rendimiento por cajero
 *   GET /reportes/entregas        -> Estadisticas de delivery
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { ReportesController } from './reportes.controller';
import { FiltroFechasSchema, TopProductosSchema } from './reportes.schema';

const router = Router();

// Todas las rutas requieren autenticacion + ADMIN
router.use(autenticar, requerirRol('ADMIN'));

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/dashboard:
 *   get:
 *     tags: [Reportes]
 *     summary: Dashboard con KPIs del negocio
 *     description: |
 *       Indicadores clave en tiempo real:
 *       - Ventas de hoy y del mes (total, cantidad, ticket promedio)
 *       - Ordenes pendientes de entrega
 *       - Productos con stock bajo
 *       - Sesiones activas y turnos abiertos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: KPIs actuales del negocio.
 */
router.get('/dashboard', asyncHandler(ReportesController.dashboard));

// ------------------------------------------------------------------
// Ventas
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/ventas:
 *   get:
 *     tags: [Reportes]
 *     summary: Resumen de ventas por periodo
 *     description: |
 *       Totales de ventas, descuentos, impuestos, ticket promedio.
 *       Incluye desglose por dia y conteo de cancelaciones.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         required: true
 *         schema: { type: string, format: date, example: "2026-01-01" }
 *       - in: query
 *         name: fechaHasta
 *         required: true
 *         schema: { type: string, format: date, example: "2026-01-31" }
 *     responses:
 *       200:
 *         description: Resumen de ventas del periodo.
 */
router.get(
  '/ventas',
  validar(FiltroFechasSchema, 'query'),
  asyncHandler(ReportesController.ventas),
);

// ------------------------------------------------------------------
// Top Productos
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/top-productos:
 *   get:
 *     tags: [Reportes]
 *     summary: Productos mas vendidos
 *     description: Top N productos por cantidad vendida y por ingresos.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Rankings de productos.
 */
router.get(
  '/top-productos',
  validar(TopProductosSchema, 'query'),
  asyncHandler(ReportesController.topProductos),
);

// ------------------------------------------------------------------
// Metodos de Pago
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/metodos-pago:
 *   get:
 *     tags: [Reportes]
 *     summary: Desglose de ventas por metodo de pago
 *     description: Total y porcentaje por cada metodo de pago utilizado.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Desglose por metodo de pago.
 */
router.get(
  '/metodos-pago',
  validar(FiltroFechasSchema, 'query'),
  asyncHandler(ReportesController.metodosPago),
);

// ------------------------------------------------------------------
// Inventario Valorizado
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/inventario:
 *   get:
 *     tags: [Reportes]
 *     summary: Inventario valorizado
 *     description: |
 *       Valor total del inventario a costo actual.
 *       Desglosado por almacen y por categoria.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Inventario valorizado.
 */
router.get('/inventario', asyncHandler(ReportesController.inventario));

// ------------------------------------------------------------------
// Rendimiento de Cajeros
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/cajeros:
 *   get:
 *     tags: [Reportes]
 *     summary: Rendimiento por cajero
 *     description: |
 *       Ordenes atendidas, total vendido, ticket promedio
 *       y cancelaciones por cada usuario cajero.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Estadisticas por cajero.
 */
router.get(
  '/cajeros',
  validar(FiltroFechasSchema, 'query'),
  asyncHandler(ReportesController.cajeros),
);

// ------------------------------------------------------------------
// Reporte de Entregas
// ------------------------------------------------------------------

/**
 * @openapi
 * /reportes/entregas:
 *   get:
 *     tags: [Reportes]
 *     summary: Estadisticas de entregas
 *     description: |
 *       Totales por estado, tasa de exito global
 *       y rendimiento por repartidor.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Estadisticas de delivery.
 */
router.get(
  '/entregas',
  validar(FiltroFechasSchema, 'query'),
  asyncHandler(ReportesController.entregas),
);

export default router;
