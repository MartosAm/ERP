/**
 * src/modulos/clientes/clientes.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de clientes.
 *
 * Endpoints:
 *   GET    /clientes       -> Listar con filtros y paginacion
 *   GET    /clientes/:id   -> Detalle por ID
 *   POST   /clientes       -> Crear (ADMIN y CAJERO)
 *   PATCH  /clientes/:id   -> Actualizar parcial (solo ADMIN)
 *   DELETE /clientes/:id   -> Soft delete (solo ADMIN)
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { ClientesController } from './clientes.controller';
import {
  CrearClienteSchema,
  ActualizarClienteSchema,
  FiltroClientesSchema,
} from './clientes.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Lista clientes con filtros y paginacion
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
 *         description: Busca por nombre o telefono
 *       - in: query
 *         name: activo
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: conCredito
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Filtrar clientes con limite de credito mayor a 0
 *     responses:
 *       200:
 *         description: Lista paginada de clientes
 */
router.get(
  '/',
  validar(FiltroClientesSchema, 'query'),
  asyncHandler(ClientesController.listar),
);

/**
 * @openapi
 * /clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Detalle de un cliente por ID
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', asyncHandler(ClientesController.obtenerPorId));

/**
 * @openapi
 * /clientes:
 *   post:
 *     tags: [Clientes]
 *     summary: Crear nuevo cliente (ADMIN y CAJERO)
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
 *               telefono: { type: string }
 *               correo: { type: string, format: email }
 *               direccion: { type: string }
 *               rfc: { type: string }
 *               limiteCredito: { type: number }
 *               diasCredito: { type: integer }
 *     responses:
 *       201:
 *         description: Cliente creado
 */
router.post(
  '/',
  requerirRol('ADMIN', 'CAJERO'),
  validar(CrearClienteSchema),
  asyncHandler(ClientesController.crear),
);

/**
 * @openapi
 * /clientes/{id}:
 *   patch:
 *     tags: [Clientes]
 *     summary: Actualizar cliente parcialmente (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id',
  requerirRol('ADMIN'),
  validar(ActualizarClienteSchema),
  asyncHandler(ClientesController.actualizar),
);

/**
 * @openapi
 * /clientes/{id}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Desactivar cliente (solo ADMIN)
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:id',
  requerirRol('ADMIN'),
  asyncHandler(ClientesController.eliminar),
);

export default router;
