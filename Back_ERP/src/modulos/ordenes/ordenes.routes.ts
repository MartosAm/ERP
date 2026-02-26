/**
 * src/modulos/ordenes/ordenes.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de ordenes / ventas POS.
 *
 * Endpoints:
 *   POST /ordenes             -> Crear orden de venta
 *   POST /ordenes/:id/cancelar -> Cancelar orden (solo ADMIN)
 *   GET  /ordenes/:id         -> Detalle de orden
 *   GET  /ordenes             -> Listar ordenes
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { OrdenesController } from './ordenes.controller';
import { CrearOrdenSchema, CancelarOrdenSchema, FiltroOrdenesSchema } from './ordenes.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /ordenes:
 *   post:
 *     tags: [Ordenes]
 *     summary: Crear orden de venta (POS)
 *     description: |
 *       Crea una orden de venta completa. Requiere turno de caja abierto.
 *       Descuenta inventario, registra pagos y calcula totales automaticamente.
 *       Soporta pagos mixtos (efectivo + tarjeta, credito cliente, etc.)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [detalles, pagos]
 *             properties:
 *               clienteId: { type: string }
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productoId, cantidad, precioUnitario]
 *                   properties:
 *                     productoId: { type: string }
 *                     cantidad: { type: number, minimum: 0.01 }
 *                     precioUnitario: { type: number }
 *                     descuento: { type: number, default: 0 }
 *               pagos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [metodo, monto]
 *                   properties:
 *                     metodo: { type: string, enum: [EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA, CREDITO_CLIENTE] }
 *                     monto: { type: number }
 *                     referencia: { type: string }
 *               notas: { type: string }
 *     responses:
 *       201:
 *         description: Orden creada con detalles, pagos y stock descontado.
 *       400:
 *         description: Datos invalidos o stock insuficiente.
 *       422:
 *         description: Error de negocio (sin turno abierto, credito insuficiente, etc.)
 */
router.post(
  '/',
  validar(CrearOrdenSchema),
  asyncHandler(OrdenesController.crear),
);

/**
 * @openapi
 * /ordenes:
 *   get:
 *     tags: [Ordenes]
 *     summary: Listar ordenes con filtros
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [COTIZACION, PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA, DEVUELTA] }
 *       - in: query
 *         name: buscar
 *         schema: { type: string, description: Buscar por numero de orden o nombre de cliente }
 *       - in: query
 *         name: fechaDesde
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista paginada de ordenes.
 */
router.get(
  '/',
  validar(FiltroOrdenesSchema, 'query'),
  asyncHandler(OrdenesController.listar),
);

/**
 * @openapi
 * /ordenes/{id}:
 *   get:
 *     tags: [Ordenes]
 *     summary: Obtener detalle de orden
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle completo de la orden.
 *       404:
 *         description: Orden no encontrada.
 */
router.get('/:id', asyncHandler(OrdenesController.obtenerPorId));

/**
 * @openapi
 * /ordenes/{id}/cancelar:
 *   post:
 *     tags: [Ordenes]
 *     summary: Cancelar orden (solo ADMIN)
 *     description: |
 *       Cancela una orden completada. Devuelve stock al inventario
 *       y libera credito del cliente si se utilizo.
 *       Requiere motivo de cancelacion (auditoria).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivoCancelacion]
 *             properties:
 *               motivoCancelacion: { type: string, minLength: 5 }
 *     responses:
 *       200:
 *         description: Orden cancelada y stock devuelto.
 *       404:
 *         description: Orden no encontrada.
 */
router.post(
  '/:id/cancelar',
  requerirRol('ADMIN'),
  validar(CancelarOrdenSchema),
  asyncHandler(OrdenesController.cancelar),
);

export default router;
