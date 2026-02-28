/**
 * src/modulos/entregas/entregas.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de entregas / delivery.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { EntregasService } from './entregas.service';

export const EntregasController = {

  /**
   * POST /api/v1/entregas
   * Crear/asignar entrega a una orden.
   */
  crear: async (req: Request, res: Response): Promise<void> => {
    const entrega = await EntregasService.crear(req.body, req.user.empresaId);

    res.status(201).json(ApiResponse.ok(entrega, 'Entrega creada exitosamente'));
  },

  /**
   * PATCH /api/v1/entregas/:id/estado
   * Actualizar estado de entrega.
   */
  actualizarEstado: async (req: Request, res: Response): Promise<void> => {
    const entrega = await EntregasService.actualizarEstado(req.params.id, req.body, req.user.empresaId);

    res.json(ApiResponse.ok(entrega, 'Estado de entrega actualizado'));
  },

  /**
   * GET /api/v1/entregas/:id
   * Obtener detalle de entrega.
   */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const entrega = await EntregasService.obtenerPorId(req.params.id, req.user.empresaId);

    res.json(ApiResponse.ok(entrega));
  },

  /**
   * GET /api/v1/entregas
   * Listar entregas con filtros.
   */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await EntregasService.listar(req.query as any, req.user.empresaId);

    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as any));
  },

  /**
   * GET /api/v1/entregas/mis-entregas
   * Entregas asignadas al repartidor actual.
   */
  misEntregas: async (req: Request, res: Response): Promise<void> => {
    const entregas = await EntregasService.misEntregas(req.user.usuarioId);

    res.json(ApiResponse.ok(entregas));
  },
};
