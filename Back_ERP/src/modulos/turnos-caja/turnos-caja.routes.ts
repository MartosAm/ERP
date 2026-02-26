/**
 * src/modulos/turnos-caja/turnos-caja.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de turnos de caja.
 *
 * Endpoints:
 *   POST /turnos-caja/abrir       -> Abrir turno
 *   POST /turnos-caja/:id/cerrar  -> Cerrar turno
 *   GET  /turnos-caja/activo      -> Turno activo del usuario
 *   GET  /turnos-caja/:id         -> Detalle de turno
 *   GET  /turnos-caja             -> Listar turnos
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { TurnosCajaController } from './turnos-caja.controller';
import { AbrirTurnoSchema, CerrarTurnoSchema, FiltroTurnosSchema } from './turnos-caja.schema';

const router = Router();

router.use(autenticar);

/**
 * @openapi
 * /turnos-caja/abrir:
 *   post:
 *     tags: [Turnos de Caja]
 *     summary: Abrir turno de caja
 *     description: |
 *       Abre un nuevo turno en una caja registradora.
 *       Solo puede haber un turno abierto por caja a la vez.
 *       El usuario no puede tener otro turno abierto en otra caja.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cajaRegistradoraId, montoApertura]
 *             properties:
 *               cajaRegistradoraId: { type: string }
 *               montoApertura: { type: number, minimum: 0, example: 500 }
 *               notas: { type: string }
 *     responses:
 *       201:
 *         description: Turno abierto exitosamente.
 *       409:
 *         description: Ya hay un turno abierto en esa caja.
 */
router.post(
  '/abrir',
  validar(AbrirTurnoSchema),
  asyncHandler(TurnosCajaController.abrir),
);

/**
 * @openapi
 * /turnos-caja/activo:
 *   get:
 *     tags: [Turnos de Caja]
 *     summary: Obtener turno activo del usuario
 *     description: Retorna el turno abierto del usuario autenticado, o null si no tiene.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Turno activo o null.
 */
router.get('/activo', asyncHandler(TurnosCajaController.turnoActivo));

/**
 * @openapi
 * /turnos-caja:
 *   get:
 *     tags: [Turnos de Caja]
 *     summary: Listar turnos de caja
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: abierto
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: cajaRegistradoraId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de turnos.
 */
router.get(
  '/',
  requerirRol('ADMIN'),
  validar(FiltroTurnosSchema, 'query'),
  asyncHandler(TurnosCajaController.listar),
);

/**
 * @openapi
 * /turnos-caja/{id}:
 *   get:
 *     tags: [Turnos de Caja]
 *     summary: Obtener turno por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle del turno.
 *       404:
 *         description: Turno no encontrado.
 */
router.get('/:id', asyncHandler(TurnosCajaController.obtenerPorId));

/**
 * @openapi
 * /turnos-caja/{id}/cerrar:
 *   post:
 *     tags: [Turnos de Caja]
 *     summary: Cerrar turno de caja
 *     description: |
 *       Cierra un turno abierto. Registra monto contado y calcula diferencia.
 *       Solo el usuario que abrio el turno o un ADMIN puede cerrarlo.
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
 *             required: [montoCierre]
 *             properties:
 *               montoCierre: { type: number, minimum: 0, example: 4850.50 }
 *               notas: { type: string }
 *     responses:
 *       200:
 *         description: Turno cerrado. Incluye diferencia calculada.
 *       404:
 *         description: Turno no encontrado.
 */
router.post(
  '/:id/cerrar',
  validar(CerrarTurnoSchema),
  asyncHandler(TurnosCajaController.cerrar),
);

export default router;
