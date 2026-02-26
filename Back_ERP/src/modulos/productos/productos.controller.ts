/**
 * src/modulos/productos/productos.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de productos.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { ProductosService } from './productos.service';
import type {
  CrearProductoDto,
  ActualizarProductoDto,
  FiltroProductos,
} from './productos.schema';

export const ProductosController = {

  /** GET /productos - Lista paginada con filtros avanzados */
  async listar(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroProductos;
    const { datos, meta } = await ProductosService.listar(
      req.user!.empresaId,
      filtros,
      req.user!.rol,
    );
    res.json(ApiResponse.ok(datos, 'Productos obtenidos', meta));
  },

  /** GET /productos/codigo/:codigo - Buscar por SKU o codigo de barras (POS) */
  async buscarPorCodigo(req: Request, res: Response): Promise<void> {
    const producto = await ProductosService.buscarPorCodigo(
      req.params.codigo!,
      req.user!.empresaId,
    );
    res.json(ApiResponse.ok(producto));
  },

  /** GET /productos/:id - Detalle con existencias */
  async obtenerPorId(req: Request, res: Response): Promise<void> {
    const producto = await ProductosService.obtenerPorId(
      req.params.id!,
      req.user!.empresaId,
      req.user!.rol,
    );
    res.json(ApiResponse.ok(producto));
  },

  /** POST /productos - Crear producto */
  async crear(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearProductoDto;
    const producto = await ProductosService.crear(req.user!.empresaId, dto);
    res.status(201).json(ApiResponse.ok(producto, 'Producto creado'));
  },

  /** PATCH /productos/:id - Actualizar parcial */
  async actualizar(req: Request, res: Response): Promise<void> {
    const dto = req.body as ActualizarProductoDto;
    const producto = await ProductosService.actualizar(
      req.params.id!,
      req.user!.empresaId,
      dto,
    );
    res.json(ApiResponse.ok(producto, 'Producto actualizado'));
  },

  /** DELETE /productos/:id - Soft delete */
  async eliminar(req: Request, res: Response): Promise<void> {
    await ProductosService.eliminar(req.params.id!, req.user!.empresaId);
    res.json(ApiResponse.ok(null, 'Producto eliminado'));
  },
};
