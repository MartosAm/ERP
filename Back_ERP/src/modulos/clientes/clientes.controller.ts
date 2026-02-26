/**
 * src/modulos/clientes/clientes.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de clientes.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { ClientesService } from './clientes.service';
import type {
  CrearClienteDto,
  ActualizarClienteDto,
  FiltroClientes,
} from './clientes.schema';

export const ClientesController = {

  /** GET /clientes */
  async listar(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroClientes;
    const { datos, meta } = await ClientesService.listar(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Clientes obtenidos', meta));
  },

  /** GET /clientes/:id */
  async obtenerPorId(req: Request, res: Response): Promise<void> {
    const cliente = await ClientesService.obtenerPorId(
      req.params.id!,
      req.user!.empresaId,
    );
    res.json(ApiResponse.ok(cliente));
  },

  /** POST /clientes */
  async crear(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearClienteDto;
    const cliente = await ClientesService.crear(req.user!.empresaId, dto);
    res.status(201).json(ApiResponse.ok(cliente, 'Cliente creado'));
  },

  /** PATCH /clientes/:id */
  async actualizar(req: Request, res: Response): Promise<void> {
    const dto = req.body as ActualizarClienteDto;
    const cliente = await ClientesService.actualizar(
      req.params.id!,
      req.user!.empresaId,
      dto,
    );
    res.json(ApiResponse.ok(cliente, 'Cliente actualizado'));
  },

  /** DELETE /clientes/:id */
  async eliminar(req: Request, res: Response): Promise<void> {
    await ClientesService.eliminar(req.params.id!, req.user!.empresaId);
    res.json(ApiResponse.ok(null, 'Cliente eliminado'));
  },
};
