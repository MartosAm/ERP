/**
 * src/modulos/usuarios/usuarios.routes.ts
 * ------------------------------------------------------------------
 * Rutas REST del modulo de gestion de usuarios.
 * TODAS las rutas requieren rol ADMIN.
 *
 * Endpoints:
 *   GET    /usuarios                       -> Listar con filtros
 *   GET    /usuarios/:id                   -> Detalle
 *   PUT    /usuarios/:id                   -> Actualizar datos basicos
 *   PUT    /usuarios/:id/horario           -> Asignar horario laboral
 *   PATCH  /usuarios/:id/estado            -> Activar/desactivar
 *   POST   /usuarios/:id/cerrar-sesiones   -> Forzar cierre de sesiones
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { UsuariosController } from './usuarios.controller';
import {
  ActualizarUsuarioSchema,
  AsignarHorarioSchema,
  CambiarEstadoSchema,
  FiltroUsuariosSchema,
} from './usuarios.schema';

const router = Router();

// Todas las rutas requieren autenticacion + rol ADMIN
router.use(autenticar, requerirRol('ADMIN'));

// ------------------------------------------------------------------
// GET /usuarios - Listar usuarios
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios de la empresa
 *     description: |
 *       Lista todos los usuarios con filtros opcionales.
 *       Incluye conteo de sesiones activas y ordenes creadas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: rol
 *         schema: { type: string, enum: [ADMIN, CAJERO, REPARTIDOR] }
 *       - in: query
 *         name: activo
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: buscar
 *         schema: { type: string, description: Buscar por nombre, correo o telefono }
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios.
 */
router.get(
  '/',
  validar(FiltroUsuariosSchema, 'query'),
  asyncHandler(UsuariosController.listar),
);

// ------------------------------------------------------------------
// GET /usuarios/:id - Detalle de usuario
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Detalle de un usuario
 *     description: Incluye conteo de sesiones, ordenes, turnos y entregas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del usuario.
 *       404:
 *         description: Usuario no encontrado.
 */
router.get('/:id', asyncHandler(UsuariosController.obtenerPorId));

// ------------------------------------------------------------------
// PUT /usuarios/:id - Actualizar datos basicos
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios/{id}:
 *   put:
 *     tags: [Usuarios]
 *     summary: Actualizar datos de un usuario
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
 *             properties:
 *               nombre: { type: string }
 *               telefono: { type: string, nullable: true }
 *               avatarUrl: { type: string, format: uri, nullable: true }
 *               rol: { type: string, enum: [ADMIN, CAJERO, REPARTIDOR] }
 *     responses:
 *       200:
 *         description: Usuario actualizado.
 *       404:
 *         description: Usuario no encontrado.
 */
router.put(
  '/:id',
  validar(ActualizarUsuarioSchema),
  asyncHandler(UsuariosController.actualizar),
);

// ------------------------------------------------------------------
// PUT /usuarios/:id/horario - Asignar horario laboral
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios/{id}/horario:
 *   put:
 *     tags: [Usuarios]
 *     summary: Asignar horario laboral a un usuario
 *     description: |
 *       Define dias y horas en que el CAJERO o REPARTIDOR puede
 *       iniciar sesion. Fuera de ese horario, el login es rechazado.
 *
 *       Enviar horarioInicio/horarioFin como null para eliminar la restriccion.
 *       diasLaborales vacio = todos los dias permitidos.
 *
 *       Dias: 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sabado
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
 *             required: [horarioInicio, horarioFin, diasLaborales]
 *             properties:
 *               horarioInicio:
 *                 type: string
 *                 nullable: true
 *                 example: "08:00"
 *                 description: Hora de inicio en formato HH:MM. Null para sin restriccion.
 *               horarioFin:
 *                 type: string
 *                 nullable: true
 *                 example: "18:00"
 *                 description: Hora de fin en formato HH:MM. Null para sin restriccion.
 *               diasLaborales:
 *                 type: array
 *                 items: { type: integer, minimum: 0, maximum: 6 }
 *                 example: [1,2,3,4,5]
 *                 description: "Dias permitidos. 0=Dom 1=Lun 2=Mar 3=Mie 4=Jue 5=Vie 6=Sab"
 *     responses:
 *       200:
 *         description: Horario asignado exitosamente.
 *       404:
 *         description: Usuario no encontrado.
 *       422:
 *         description: No se puede asignar horario a ADMIN.
 */
router.put(
  '/:id/horario',
  validar(AsignarHorarioSchema),
  asyncHandler(UsuariosController.asignarHorario),
);

// ------------------------------------------------------------------
// PATCH /usuarios/:id/estado - Activar/desactivar
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios/{id}/estado:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Activar o desactivar un usuario
 *     description: |
 *       Al desactivar:
 *       - Todas las sesiones activas se invalidan inmediatamente
 *       - El usuario no puede hacer login
 *       - Sus peticiones en curso seran rechazadas
 *
 *       Al reactivar:
 *       - Se resetean intentos fallidos y bloqueo temporal
 *       - El usuario puede volver a iniciar sesion normalmente
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
 *             required: [activo]
 *             properties:
 *               activo: { type: boolean }
 *               motivo: { type: string, description: Motivo del cambio (auditoria) }
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *       404:
 *         description: Usuario no encontrado.
 *       422:
 *         description: No puedes desactivar tu propia cuenta / ya tiene ese estado.
 */
router.patch(
  '/:id/estado',
  validar(CambiarEstadoSchema),
  asyncHandler(UsuariosController.cambiarEstado),
);

// ------------------------------------------------------------------
// POST /usuarios/:id/cerrar-sesiones - Forzar cierre
// ------------------------------------------------------------------

/**
 * @openapi
 * /usuarios/{id}/cerrar-sesiones:
 *   post:
 *     tags: [Usuarios]
 *     summary: Cerrar todas las sesiones activas de un usuario
 *     description: Invalida todas las sesiones. El usuario debe volver a iniciar sesion.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sesiones cerradas. Retorna conteo.
 *       404:
 *         description: Usuario no encontrado.
 */
router.post(
  '/:id/cerrar-sesiones',
  asyncHandler(UsuariosController.cerrarSesiones),
);

export default router;
