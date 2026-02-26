/**
 * src/modulos/ordenes/ordenes.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de ordenes / ventas POS.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { OrdenesService } from './ordenes.service';

export const OrdenesController = {

  /**
   * POST /api/v1/ordenes
   * Crear una orden de venta (POS).
   */
  crear: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.crear(
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );

    res.status(201).json(ApiResponse.ok(orden, 'Orden creada exitosamente'));
  },

  /**
   * POST /api/v1/ordenes/:id/cancelar
   * Cancelar una orden (solo ADMIN).
   */
  cancelar: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.cancelar(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(orden, 'Orden cancelada'));
  },

  /**
   * GET /api/v1/ordenes/:id
   * Obtener detalle de una orden.
   */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.obtenerPorId(
      req.params.id,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(orden));
  },

  /**
   * GET /api/v1/ordenes
   * Listar ordenes con filtros.
   */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await OrdenesService.listar(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as any));
  },
};
