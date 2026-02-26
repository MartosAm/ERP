/**
 * src/modulos/proveedores/proveedores.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de proveedores.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { ProveedoresService } from './proveedores.service';
import type {
  CrearProveedorDto,
  ActualizarProveedorDto,
  FiltroProveedores,
} from './proveedores.schema';

export const ProveedoresController = {

  /** GET /proveedores */
  async listar(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroProveedores;
    const { datos, meta } = await ProveedoresService.listar(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Proveedores obtenidos', meta));
  },

  /** GET /proveedores/:id */
  async obtenerPorId(req: Request, res: Response): Promise<void> {
    const proveedor = await ProveedoresService.obtenerPorId(
      req.params.id!,
      req.user!.empresaId,
    );
    res.json(ApiResponse.ok(proveedor));
  },

  /** POST /proveedores */
  async crear(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearProveedorDto;
    const proveedor = await ProveedoresService.crear(req.user!.empresaId, dto);
    res.status(201).json(ApiResponse.ok(proveedor, 'Proveedor creado'));
  },

  /** PATCH /proveedores/:id */
  async actualizar(req: Request, res: Response): Promise<void> {
    const dto = req.body as ActualizarProveedorDto;
    const proveedor = await ProveedoresService.actualizar(
      req.params.id!,
      req.user!.empresaId,
      dto,
    );
    res.json(ApiResponse.ok(proveedor, 'Proveedor actualizado'));
  },

  /** DELETE /proveedores/:id */
  async eliminar(req: Request, res: Response): Promise<void> {
    await ProveedoresService.eliminar(req.params.id!, req.user!.empresaId);
    res.json(ApiResponse.ok(null, 'Proveedor eliminado'));
  },
};
