/**
 * src/modulos/proveedores/proveedores.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de proveedores.
 *
 * Endpoints:
 *   GET    /proveedores       -> Listar con filtros y paginacion
 *   GET    /proveedores/:id   -> Detalle por ID
 *   POST   /proveedores       -> Crear (solo ADMIN)
 *   PATCH  /proveedores/:id   -> Actualizar parcial (solo ADMIN)
 *   DELETE /proveedores/:id   -> Soft delete (solo ADMIN)
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { ProveedoresController } from './proveedores.controller';
import {
  CrearProveedorSchema,
  ActualizarProveedorSchema,
  FiltroProveedoresSchema,
} from './proveedores.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /proveedores:
 *   get:
 *     tags: [Proveedores]
 *     summary: Lista proveedores con filtros y paginacion
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
 *         description: Lista paginada de proveedores
 */
router.get(
  '/',
  validar(FiltroProveedoresSchema, 'query'),
  asyncHandler(ProveedoresController.listar),
);

/**
 * @openapi
 * /proveedores/{id}:
 *   get:
 *     tags: [Proveedores]
 *     summary: Detalle de un proveedor por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Proveedor encontrado
 *       404:
 *         description: Proveedor no encontrado
 */
router.get('/:id', asyncHandler(ProveedoresController.obtenerPorId));

/**
 * @openapi
 * /proveedores:
 *   post:
 *     tags: [Proveedores]
 *     summary: Crear nuevo proveedor (solo ADMIN)
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
 *               nombreContacto: { type: string }
 *               telefono: { type: string }
 *               correo: { type: string, format: email }
 *               direccion: { type: string }
 *               rfc: { type: string }
 *               notas: { type: string }
 *     responses:
 *       201:
 *         description: Proveedor creado
 *       409:
 *         description: Nombre duplicado
 */
router.post(
  '/',
  requerirRol('ADMIN'),
  validar(CrearProveedorSchema),
  asyncHandler(ProveedoresController.crear),
);

/**
 * @openapi
 * /proveedores/{id}:
 *   patch:
 *     tags: [Proveedores]
 *     summary: Actualizar proveedor parcialmente (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id',
  requerirRol('ADMIN'),
  validar(ActualizarProveedorSchema),
  asyncHandler(ProveedoresController.actualizar),
);

/**
 * @openapi
 * /proveedores/{id}:
 *   delete:
 *     tags: [Proveedores]
 *     summary: Desactivar proveedor (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:id',
  requerirRol('ADMIN'),
  asyncHandler(ProveedoresController.eliminar),
);

export default router;
