/**
 * src/modulos/productos/productos.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de productos.
 *
 * Endpoints:
 *   GET    /productos               -> Listar con filtros y paginacion
 *   GET    /productos/codigo/:codigo -> Buscar por SKU/barras (POS)
 *   GET    /productos/:id           -> Detalle con existencias
 *   POST   /productos               -> Crear (solo ADMIN)
 *   PATCH  /productos/:id           -> Actualizar parcial (solo ADMIN)
 *   DELETE /productos/:id           -> Soft delete (solo ADMIN)
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { ProductosController } from './productos.controller';
import {
  CrearProductoSchema,
  ActualizarProductoSchema,
  FiltroProductosSchema,
} from './productos.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /productos:
 *   get:
 *     tags: [Productos]
 *     summary: Lista productos con filtros avanzados y paginacion
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *         description: Busca por nombre, SKU, codigo de barras o marca
 *       - in: query
 *         name: activo
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: categoriaId
 *         schema: { type: string }
 *       - in: query
 *         name: proveedorId
 *         schema: { type: string }
 *       - in: query
 *         name: destacado
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: stockBajo
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: ordenarPor
 *         schema: { type: string, enum: ['nombre', 'precioVenta1', 'creadoEn', 'sku'] }
 *       - in: query
 *         name: direccionOrden
 *         schema: { type: string, enum: ['asc', 'desc'] }
 *     responses:
 *       200:
 *         description: Lista paginada de productos
 */
router.get(
  '/',
  validar(FiltroProductosSchema, 'query'),
  asyncHandler(ProductosController.listar),
);

/**
 * @openapi
 * /productos/codigo/{codigo}:
 *   get:
 *     tags: [Productos]
 *     summary: Buscar producto por SKU o codigo de barras (POS scanner)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Producto encontrado con existencias
 *       404:
 *         description: Producto no encontrado
 */
router.get(
  '/codigo/:codigo',
  asyncHandler(ProductosController.buscarPorCodigo),
);

/**
 * @openapi
 * /productos/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Detalle de producto con existencias por almacen
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Producto con detalle completo
 *       404:
 *         description: Producto no encontrado
 */
router.get(
  '/:id',
  asyncHandler(ProductosController.obtenerPorId),
);

/**
 * @openapi
 * /productos:
 *   post:
 *     tags: [Productos]
 *     summary: Crear nuevo producto (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, nombre]
 *             properties:
 *               sku: { type: string }
 *               codigoBarras: { type: string }
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               categoriaId: { type: string }
 *               proveedorId: { type: string }
 *               precioVenta1: { type: number }
 *               precioCosto: { type: number }
 *     responses:
 *       201:
 *         description: Producto creado
 *       409:
 *         description: SKU o codigo de barras duplicado
 */
router.post(
  '/',
  requerirRol('ADMIN'),
  validar(CrearProductoSchema),
  asyncHandler(ProductosController.crear),
);

/**
 * @openapi
 * /productos/{id}:
 *   patch:
 *     tags: [Productos]
 *     summary: Actualizar producto parcialmente (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id',
  requerirRol('ADMIN'),
  validar(ActualizarProductoSchema),
  asyncHandler(ProductosController.actualizar),
);

/**
 * @openapi
 * /productos/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Desactivar producto (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:id',
  requerirRol('ADMIN'),
  asyncHandler(ProductosController.eliminar),
);

export default router;
