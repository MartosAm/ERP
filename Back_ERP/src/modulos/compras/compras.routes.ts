/**
 * src/modulos/compras/compras.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de compras a proveedor.
 *
 * Endpoints:
 *   POST /compras              -> Crear orden de compra
 *   POST /compras/:id/recibir  -> Recibir mercancia (ingresa inventario)
 *   GET  /compras/:id          -> Detalle de compra
 *   GET  /compras              -> Listar compras
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { ComprasController } from './compras.controller';
import { CrearCompraSchema, RecibirCompraSchema, FiltroComprasSchema } from './compras.schema';

const router = Router();

router.use(autenticar);
router.use(requerirRol('ADMIN'));

/**
 * @openapi
 * /compras:
 *   post:
 *     tags: [Compras]
 *     summary: Crear orden de compra a proveedor
 *     description: |
 *       Crea una orden de compra. NO afecta inventario hasta que se reciba.
 *       Genera numero secuencial COMP-YYYY-NNNNN.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proveedorId, detalles]
 *             properties:
 *               proveedorId: { type: string }
 *               numeroFactura: { type: string }
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productoId, cantidad, costoUnitario]
 *                   properties:
 *                     productoId: { type: string }
 *                     cantidad: { type: number }
 *                     costoUnitario: { type: number }
 *               notas: { type: string }
 *     responses:
 *       201:
 *         description: Compra creada.
 */
router.post(
  '/',
  validar(CrearCompraSchema),
  asyncHandler(ComprasController.crear),
);

/**
 * @openapi
 * /compras:
 *   get:
 *     tags: [Compras]
 *     summary: Listar compras con filtros
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: proveedorId
 *         schema: { type: string }
 *       - in: query
 *         name: recibida
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de compras.
 */
router.get(
  '/',
  validar(FiltroComprasSchema, 'query'),
  asyncHandler(ComprasController.listar),
);

/**
 * @openapi
 * /compras/{id}:
 *   get:
 *     tags: [Compras]
 *     summary: Detalle de compra
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle de la compra con productos.
 *       404:
 *         description: Compra no encontrada.
 */
router.get('/:id', asyncHandler(ComprasController.obtenerPorId));

/**
 * @openapi
 * /compras/{id}/recibir:
 *   post:
 *     tags: [Compras]
 *     summary: Recibir mercancia de compra
 *     description: |
 *       Marca la compra como recibida e ingresa productos al inventario (ENTRADA).
 *       Actualiza el precio de costo de cada producto al nuevo costo de compra.
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
 *             required: [almacenId]
 *             properties:
 *               almacenId: { type: string }
 *               notas: { type: string }
 *     responses:
 *       200:
 *         description: Compra recibida, inventario actualizado.
 *       422:
 *         description: Compra ya fue recibida.
 */
router.post(
  '/:id/recibir',
  validar(RecibirCompraSchema),
  asyncHandler(ComprasController.recibir),
);

export default router;
