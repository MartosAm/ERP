/**
 * src/modulos/compras/compras.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de compras a proveedor.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { ComprasService } from './compras.service';

export const ComprasController = {

  /**
   * POST /api/v1/compras
   * Crear orden de compra a proveedor.
   */
  crear: async (req: Request, res: Response): Promise<void> => {
    const compra = await ComprasService.crear(req.body, req.user.empresaId);

    res.status(201).json(ApiResponse.ok(compra, 'Compra creada exitosamente'));
  },

  /**
   * POST /api/v1/compras/:id/recibir
   * Recibir mercancia (ingresa inventario).
   */
  recibir: async (req: Request, res: Response): Promise<void> => {
    const compra = await ComprasService.recibir(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(compra, 'Mercancia recibida, inventario actualizado'));
  },

  /**
   * GET /api/v1/compras/:id
   * Obtener detalle de compra.
   */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const compra = await ComprasService.obtenerPorId(req.params.id, req.user.empresaId);

    res.json(ApiResponse.ok(compra));
  },

  /**
   * GET /api/v1/compras
   * Listar compras con filtros.
   */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await ComprasService.listar(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as any));
  },
};
