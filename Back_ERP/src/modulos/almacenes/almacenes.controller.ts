/**
 * src/modulos/almacenes/almacenes.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de almacenes.
 * Extrae datos del request, invoca el service y retorna ApiResponse.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { AlmacenesService } from './almacenes.service';
import type {
  CrearAlmacenDto,
  ActualizarAlmacenDto,
  FiltroAlmacenes,
} from './almacenes.schema';

export const AlmacenesController = {

  /** GET /almacenes - Lista paginada con filtros */
  async listar(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroAlmacenes;
    const { datos, meta } = await AlmacenesService.listar(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Almacenes obtenidos', meta));
  },

  /** GET /almacenes/:id - Detalle por ID */
  async obtenerPorId(req: Request, res: Response): Promise<void> {
    const almacen = await AlmacenesService.obtenerPorId(
      req.params.id!,
      req.user!.empresaId,
    );
    res.json(ApiResponse.ok(almacen));
  },

  /** POST /almacenes - Crear almacen */
  async crear(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearAlmacenDto;
    const almacen = await AlmacenesService.crear(req.user!.empresaId, dto);
    res.status(201).json(ApiResponse.ok(almacen, 'Almacen creado'));
  },

  /** PATCH /almacenes/:id - Actualizar parcial */
  async actualizar(req: Request, res: Response): Promise<void> {
    const dto = req.body as ActualizarAlmacenDto;
    const almacen = await AlmacenesService.actualizar(
      req.params.id!,
      req.user!.empresaId,
      dto,
    );
    res.json(ApiResponse.ok(almacen, 'Almacen actualizado'));
  },

  /** DELETE /almacenes/:id - Soft delete */
  async eliminar(req: Request, res: Response): Promise<void> {
    await AlmacenesService.eliminar(req.params.id!, req.user!.empresaId);
    res.json(ApiResponse.ok(null, 'Almacen eliminado'));
  },
};
