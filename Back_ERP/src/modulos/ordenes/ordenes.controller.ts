/**
 * src/modulos/ordenes/ordenes.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de ordenes / ventas / cotizaciones POS.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { OrdenesService } from './ordenes.service';

export const OrdenesController = {

  /** POST /api/v1/ordenes -- Crear venta directa POS */
  crear: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.crear(
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );
    res.status(201).json(ApiResponse.ok(orden, 'Orden creada exitosamente'));
  },

  /** POST /api/v1/ordenes/cotizacion -- Crear cotizacion/presupuesto */
  crearCotizacion: async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await OrdenesService.crearCotizacion(
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );
    res.status(201).json(ApiResponse.ok(cotizacion, 'Cotizacion creada exitosamente'));
  },

  /** POST /api/v1/ordenes/:id/confirmar -- Confirmar cotizacion como venta */
  confirmarCotizacion: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.confirmarCotizacion(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );
    res.json(ApiResponse.ok(orden, 'Cotizacion confirmada como venta'));
  },

  /** POST /api/v1/ordenes/:id/cancelar -- Cancelar orden (solo ADMIN) */
  cancelar: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.cancelar(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );
    res.json(ApiResponse.ok(orden, 'Orden cancelada'));
  },

  /** POST /api/v1/ordenes/:id/devolver -- Devolucion total o parcial */
  devolver: async (req: Request, res: Response): Promise<void> => {
    const resultado = await OrdenesService.devolver(
      req.params.id,
      req.body,
      req.user.usuarioId,
      req.user.empresaId,
    );
    res.json(ApiResponse.ok(resultado, `Devolucion ${resultado.tipo} procesada`));
  },

  /** GET /api/v1/ordenes/:id -- Detalle de orden */
  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    const orden = await OrdenesService.obtenerPorId(
      req.params.id,
      req.user.empresaId,
    );
    res.json(ApiResponse.ok(orden));
  },

  /** GET /api/v1/ordenes -- Listar ordenes con filtros */
  listar: async (req: Request, res: Response): Promise<void> => {
    const resultado = await OrdenesService.listar(
      req.query as any,
      req.user.empresaId,
    );
    res.json(ApiResponse.ok(resultado.datos, 'OK', resultado.meta as any));
  },
};
