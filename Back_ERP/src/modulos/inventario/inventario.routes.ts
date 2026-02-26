/**
 * src/modulos/inventario/inventario.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de inventario.
 *
 * Endpoints:
 *   POST /inventario/movimientos  -> Registrar movimiento (ADMIN)
 *   GET  /inventario/movimientos  -> Historial de movimientos
 *   GET  /inventario/existencias  -> Stock actual con filtros
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { InventarioController } from './inventario.controller';
import {
  CrearMovimientoSchema,
  FiltroMovimientosSchema,
  FiltroExistenciasSchema,
} from './inventario.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /inventario/movimientos:
 *   post:
 *     tags: [Inventario]
 *     summary: Registrar movimiento de inventario (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productoId, almacenId, tipoMovimiento, cantidad]
 *             properties:
 *               productoId: { type: string }
 *               almacenId: { type: string }
 *               almacenDestinoId: { type: string, description: Requerido para TRASLADO }
 *               tipoMovimiento: { type: string, enum: [ENTRADA, SALIDA, AJUSTE, TRASLADO] }
 *               cantidad: { type: number, minimum: 0.01 }
 *               costoUnitario: { type: number }
 *               motivo: { type: string }
 *     responses:
 *       201:
 *         description: Movimiento registrado con existencia actualizada
 *       422:
 *         description: Stock insuficiente o producto sin control de inventario
 */
router.post(
  '/movimientos',
  requerirRol('ADMIN'),
  validar(CrearMovimientoSchema),
  asyncHandler(InventarioController.registrarMovimiento),
);

/**
 * @openapi
 * /inventario/movimientos:
 *   get:
 *     tags: [Inventario]
 *     summary: Historial de movimientos con filtros
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: productoId
 *         schema: { type: string }
 *       - in: query
 *         name: almacenId
 *         schema: { type: string }
 *       - in: query
 *         name: tipoMovimiento
 *         schema: { type: string, enum: [ENTRADA, SALIDA, AJUSTE, TRASLADO] }
 *       - in: query
 *         name: fechaDesde
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista paginada de movimientos
 */
router.get(
  '/movimientos',
  validar(FiltroMovimientosSchema, 'query'),
  asyncHandler(InventarioController.listarMovimientos),
);

/**
 * @openapi
 * /inventario/existencias:
 *   get:
 *     tags: [Inventario]
 *     summary: Stock actual por almacen con filtros
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: almacenId
 *         schema: { type: string }
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *       - in: query
 *         name: stockBajo
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Lista de existencias con informacion de producto y almacen
 */
router.get(
  '/existencias',
  validar(FiltroExistenciasSchema, 'query'),
  asyncHandler(InventarioController.listarExistencias),
);

export default router;
