/**
 * src/modulos/entregas/entregas.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de entregas / delivery.
 *
 * Endpoints:
 *   POST  /entregas               -> Crear entrega (ADMIN)
 *   GET   /entregas/mis-entregas   -> Entregas del repartidor actual
 *   GET   /entregas                -> Listar entregas
 *   GET   /entregas/:id            -> Detalle de entrega
 *   PATCH /entregas/:id/estado     -> Actualizar estado
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { EntregasController } from './entregas.controller';
import { CrearEntregaSchema, ActualizarEstadoSchema, FiltroEntregasSchema } from './entregas.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /entregas:
 *   post:
 *     tags: [Entregas]
 *     summary: Crear entrega para una orden (ADMIN)
 *     description: |
 *       Asigna una entrega a una orden completada.
 *       Opcionalmente puede asignar un repartidor.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordenId, direccionEntrega]
 *             properties:
 *               ordenId: { type: string }
 *               asignadoAId: { type: string }
 *               direccionEntrega: { type: string }
 *               programadaEn: { type: string, format: date-time }
 *               notas: { type: string }
 *     responses:
 *       201:
 *         description: Entrega creada.
 *       409:
 *         description: La orden ya tiene entrega.
 *       422:
 *         description: Orden no completada.
 */
router.post(
  '/',
  requerirRol('ADMIN'),
  validar(CrearEntregaSchema),
  asyncHandler(EntregasController.crear),
);

/**
 * @openapi
 * /entregas/mis-entregas:
 *   get:
 *     tags: [Entregas]
 *     summary: Entregas pendientes del repartidor actual
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de entregas pendientes asignadas.
 */
router.get(
  '/mis-entregas',
  asyncHandler(EntregasController.misEntregas),
);

/**
 * @openapi
 * /entregas:
 *   get:
 *     tags: [Entregas]
 *     summary: Listar entregas con filtros
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
 *         schema: { type: string, enum: [ASIGNADO, EN_RUTA, ENTREGADO, NO_ENTREGADO, REPROGRAMADO] }
 *       - in: query
 *         name: pendientes
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: asignadoAId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de entregas.
 */
router.get(
  '/',
  validar(FiltroEntregasSchema, 'query'),
  asyncHandler(EntregasController.listar),
);

/**
 * @openapi
 * /entregas/{id}:
 *   get:
 *     tags: [Entregas]
 *     summary: Detalle de entrega
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle de la entrega.
 *       404:
 *         description: Entrega no encontrada.
 */
router.get('/:id', asyncHandler(EntregasController.obtenerPorId));

/**
 * @openapi
 * /entregas/{id}/estado:
 *   patch:
 *     tags: [Entregas]
 *     summary: Actualizar estado de entrega
 *     description: |
 *       Transiciones validas:
 *       ASIGNADO -> EN_RUTA
 *       EN_RUTA -> ENTREGADO | NO_ENTREGADO | REPROGRAMADO
 *       REPROGRAMADO -> ASIGNADO | EN_RUTA
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
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [EN_RUTA, ENTREGADO, NO_ENTREGADO, REPROGRAMADO] }
 *               notas: { type: string }
 *               motivoFallo: { type: string }
 *               programadaEn: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *       422:
 *         description: Transicion de estado invalida.
 */
router.patch(
  '/:id/estado',
  validar(ActualizarEstadoSchema),
  asyncHandler(EntregasController.actualizarEstado),
);

export default router;
