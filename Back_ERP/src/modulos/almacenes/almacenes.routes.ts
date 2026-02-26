/**
 * src/modulos/almacenes/almacenes.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de almacenes.
 *
 * Endpoints:
 *   GET    /almacenes       -> Listar con filtros y paginacion
 *   GET    /almacenes/:id   -> Detalle por ID
 *   POST   /almacenes       -> Crear (solo ADMIN)
 *   PATCH  /almacenes/:id   -> Actualizar parcial (solo ADMIN)
 *   DELETE /almacenes/:id   -> Soft delete (solo ADMIN)
 *
 * Todas las rutas requieren autenticacion.
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { AlmacenesController } from './almacenes.controller';
import {
  CrearAlmacenSchema,
  ActualizarAlmacenSchema,
  FiltroAlmacenesSchema,
} from './almacenes.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /almacenes:
 *   get:
 *     tags: [Almacenes]
 *     summary: Lista almacenes con filtros y paginacion
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
 *       - in: query
 *         name: activo
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Lista paginada de almacenes
 */
router.get(
  '/',
  validar(FiltroAlmacenesSchema, 'query'),
  asyncHandler(AlmacenesController.listar),
);

/**
 * @openapi
 * /almacenes/{id}:
 *   get:
 *     tags: [Almacenes]
 *     summary: Detalle de un almacen por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Almacen encontrado
 *       404:
 *         description: Almacen no encontrado
 */
router.get('/:id', asyncHandler(AlmacenesController.obtenerPorId));

/**
 * @openapi
 * /almacenes:
 *   post:
 *     tags: [Almacenes]
 *     summary: Crear nuevo almacen (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *               direccion: { type: string }
 *               esPrincipal: { type: boolean }
 *     responses:
 *       201:
 *         description: Almacen creado
 *       409:
 *         description: Nombre duplicado
 */
router.post(
  '/',
  requerirRol('ADMIN'),
  validar(CrearAlmacenSchema),
  asyncHandler(AlmacenesController.crear),
);

/**
 * @openapi
 * /almacenes/{id}:
 *   patch:
 *     tags: [Almacenes]
 *     summary: Actualizar almacen parcialmente (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Almacen actualizado
 */
router.patch(
  '/:id',
  requerirRol('ADMIN'),
  validar(ActualizarAlmacenSchema),
  asyncHandler(AlmacenesController.actualizar),
);

/**
 * @openapi
 * /almacenes/{id}:
 *   delete:
 *     tags: [Almacenes]
 *     summary: Desactivar almacen (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Almacen desactivado
 *       422:
 *         description: No se puede eliminar (tiene existencias o es principal)
 */
router.delete(
  '/:id',
  requerirRol('ADMIN'),
  asyncHandler(AlmacenesController.eliminar),
);

export default router;
