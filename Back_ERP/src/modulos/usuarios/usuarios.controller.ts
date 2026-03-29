/**
 * src/modulos/usuarios/usuarios.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de gestion de usuarios.
 * Solo accesible para ADMIN.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse, type MetaPaginacion } from '../../compartido/respuesta';
import { UsuariosService } from './usuarios.service';
import type { FiltroUsuariosDto } from './usuarios.schema';

export const UsuariosController = {

  /**
   * GET /api/v1/usuarios
   * Listar usuarios de la empresa.
   */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await UsuariosService.listar(
      req.query as unknown as FiltroUsuariosDto,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as MetaPaginacion));
  },

  /**
   * GET /api/v1/usuarios/:id
   * Detalle de un usuario.
   */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const usuario = await UsuariosService.obtenerPorId(
      req.params.id,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(usuario));
  },

  /**
   * PUT /api/v1/usuarios/:id
   * Actualizar datos basicos de un usuario.
   */
  actualizar: async (req: Request, res: Response): Promise<void> => {
    const usuario = await UsuariosService.actualizar(
      req.params.id,
      req.body,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(usuario, 'Usuario actualizado'));
  },

  /**
   * PUT /api/v1/usuarios/:id/horario
   * Asignar horario laboral y dias.
   */
  asignarHorario: async (req: Request, res: Response): Promise<void> => {
    const usuario = await UsuariosService.asignarHorario(
      req.params.id,
      req.body,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(usuario, 'Horario laboral asignado'));
  },

  /**
   * PATCH /api/v1/usuarios/:id/estado
   * Activar/desactivar usuario.
   */
  cambiarEstado: async (req: Request, res: Response): Promise<void> => {
    const usuario = await UsuariosService.cambiarEstado(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );

    const mensaje = req.body.activo ? 'Usuario reactivado' : 'Usuario desactivado';
    res.json(ApiResponse.ok(usuario, mensaje));
  },

  /**
   * POST /api/v1/usuarios/:id/cerrar-sesiones
   * Cerrar todas las sesiones activas de un usuario.
   */
  cerrarSesiones: async (req: Request, res: Response): Promise<void> => {
    const resultado = await UsuariosService.cerrarSesiones(
      req.params.id,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(resultado, 'Sesiones cerradas'));
  },
};
