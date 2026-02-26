/**
 * src/modulos/turnos-caja/turnos-caja.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de turnos de caja.
 * Extrae datos del request, llama al service, retorna ApiResponse.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { TurnosCajaService } from './turnos-caja.service';

export const TurnosCajaController = {

  /**
   * POST /api/v1/turnos-caja/abrir
   * Abre un nuevo turno de caja.
   */
  abrir: async (req: Request, res: Response): Promise<void> => {
    const turno = await TurnosCajaService.abrir(
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );

    res.status(201).json(ApiResponse.ok(turno, 'Turno de caja abierto'));
  },

  /**
   * POST /api/v1/turnos-caja/:id/cerrar
   * Cierra un turno de caja abierto.
   */
  cerrar: async (req: Request, res: Response): Promise<void> => {
    const turno = await TurnosCajaService.cerrar(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.rol,
    );

    res.json(ApiResponse.ok(turno, 'Turno de caja cerrado'));
  },

  /**
   * GET /api/v1/turnos-caja/activo
   * Obtiene el turno activo del usuario autenticado.
   */
  turnoActivo: async (req: Request, res: Response): Promise<void> => {
    const turno = await TurnosCajaService.obtenerTurnoActivo(req.user.usuarioId);

    res.json(ApiResponse.ok(turno));
  },

  /**
   * GET /api/v1/turnos-caja/:id
   * Obtiene un turno por ID.
   */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const turno = await TurnosCajaService.obtenerPorId(req.params.id);

    res.json(ApiResponse.ok(turno));
  },

  /**
   * GET /api/v1/turnos-caja
   * Lista turnos con filtros y paginacion.
   */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await TurnosCajaService.listar(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as any));
  },
};
