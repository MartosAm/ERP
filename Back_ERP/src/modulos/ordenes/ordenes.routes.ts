/**
 * src/modulos/ordenes/ordenes.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de ordenes / ventas / cotizaciones POS.
 *
 * Endpoints:
 *   POST /ordenes                -> Crear orden de venta (POS)
 *   POST /ordenes/cotizacion     -> Crear cotizacion / presupuesto
 *   POST /ordenes/:id/confirmar  -> Confirmar cotizacion como venta
 *   POST /ordenes/:id/cancelar   -> Cancelar orden (solo ADMIN)
 *   POST /ordenes/:id/devolver   -> Devolucion total o parcial (ADMIN)
 *   GET  /ordenes/:id            -> Detalle de orden
 *   GET  /ordenes                -> Listar ordenes
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { OrdenesController } from './ordenes.controller';
import {
  CrearOrdenSchema,
  CrearCotizacionSchema,
  ConfirmarCotizacionSchema,
  CancelarOrdenSchema,
  DevolucionSchema,
  FiltroOrdenesSchema,
} from './ordenes.schema';

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

/* ---------------------------------------------------------- */
/*  COTIZACION                                                */
/* ---------------------------------------------------------- */

/**
 * @openapi
 * /ordenes/cotizacion:
 *   post:
 *     tags: [Ordenes]
 *     summary: Crear cotizacion / presupuesto
 *     description: |
 *       Crea una orden con estado COTIZACION. No descuenta stock
 *       ni requiere turno de caja abierto. Ideal para presupuestos
 *       que el cliente aprobara mas tarde.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [detalles]
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
 *               notas: { type: string }
 *               validaHasta: { type: string, format: date-time, description: Fecha de vigencia de la cotizacion }
 *     responses:
 *       201:
 *         description: Cotizacion creada (estado COTIZACION).
 *       400:
 *         description: Datos invalidos.
 */
router.post(
  '/cotizacion',
  validar(CrearCotizacionSchema),
  asyncHandler(OrdenesController.crearCotizacion),
);

/**
 * @openapi
 * /ordenes/{id}/confirmar:
 *   post:
 *     tags: [Ordenes]
 *     summary: Confirmar cotizacion como venta
 *     description: |
 *       Convierte una cotizacion (estado COTIZACION) en venta completada.
 *       Requiere turno de caja abierto. Valida stock disponible,
 *       descuenta inventario y registra pagos.
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
 *             required: [pagos]
 *             properties:
 *               pagos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [metodo, monto]
 *                   properties:
 *                     metodo: { type: string, enum: [EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA, CREDITO_CLIENTE] }
 *                     monto: { type: number }
 *                     referencia: { type: string }
 *     responses:
 *       200:
 *         description: Cotizacion confirmada, stock descontado.
 *       404:
 *         description: Cotizacion no encontrada.
 *       422:
 *         description: Stock insuficiente, sin turno abierto o credito excedido.
 */
router.post(
  '/:id/confirmar',
  validar(ConfirmarCotizacionSchema),
  asyncHandler(OrdenesController.confirmarCotizacion),
);

/* ---------------------------------------------------------- */
/*  CANCELAR / DEVOLVER                                       */
/* ---------------------------------------------------------- */

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

/**
 * @openapi
 * /ordenes/{id}/devolver:
 *   post:
 *     tags: [Ordenes]
 *     summary: Devolucion total o parcial (solo ADMIN)
 *     description: |
 *       Procesa una devolucion sobre una orden COMPLETADA.
 *       Reingresa los productos al inventario y libera credito proporcionalmente.
 *       Si se devuelven todos los items la orden cambia a DEVUELTA;
 *       si es parcial se mantiene como COMPLETADA con notas del detalle.
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
 *             required: [items, motivo]
 *             properties:
 *               motivo: { type: string, minLength: 5 }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productoId, cantidad, motivo]
 *                   properties:
 *                     productoId: { type: string }
 *                     cantidad: { type: number, minimum: 0.01 }
 *                     motivo: { type: string }
 *     responses:
 *       200:
 *         description: Devolucion procesada (tipo total o parcial).
 *       404:
 *         description: Orden no encontrada.
 *       422:
 *         description: Cantidad excede lo vendido o estado invalido.
 */
router.post(
  '/:id/devolver',
  requerirRol('ADMIN'),
  validar(DevolucionSchema),
  asyncHandler(OrdenesController.devolver),
);

export default router;
