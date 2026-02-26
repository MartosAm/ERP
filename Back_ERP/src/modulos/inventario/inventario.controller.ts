/**
 * src/modulos/inventario/inventario.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de inventario.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { InventarioService } from './inventario.service';
import type {
  CrearMovimientoDto,
  FiltroMovimientos,
  FiltroExistencias,
} from './inventario.schema';

export const InventarioController = {

  /** POST /inventario/movimientos - Registrar movimiento */
  async registrarMovimiento(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearMovimientoDto;
    const movimiento = await InventarioService.registrarMovimiento(
      req.user!.empresaId,
      req.user!.usuarioId,
      dto,
    );
    res.status(201).json(ApiResponse.ok(movimiento, 'Movimiento registrado'));
  },

  /** GET /inventario/movimientos - Historial de movimientos */
  async listarMovimientos(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroMovimientos;
    const { datos, meta } = await InventarioService.listarMovimientos(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Movimientos obtenidos', meta));
  },

  /** GET /inventario/existencias - Stock actual */
  async listarExistencias(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroExistencias;
    const { datos, meta } = await InventarioService.listarExistencias(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Existencias obtenidas', meta));
  },
};
