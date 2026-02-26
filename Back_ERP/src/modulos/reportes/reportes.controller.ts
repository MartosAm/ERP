/**
 * src/modulos/reportes/reportes.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de reportes.
 * Todos los endpoints son de solo lectura (GET).
 * Solo accesible para ADMIN.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { ReportesService } from './reportes.service';

export const ReportesController = {

  /**
   * GET /api/v1/reportes/dashboard
   * KPIs principales del negocio en tiempo real.
   */
  dashboard: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.dashboard(req.user.empresaId);

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/ventas
   * Resumen de ventas en rango de fechas.
   */
  ventas: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.ventasResumen(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/top-productos
   * Productos mas vendidos.
   */
  topProductos: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.topProductos(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/metodos-pago
   * Desglose por metodo de pago.
   */
  metodosPago: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.metodosPago(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/inventario
   * Inventario valorizado por almacen y categoria.
   */
  inventario: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.inventarioValorizado(req.user.empresaId);

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/cajeros
   * Rendimiento por cajero.
   */
  cajeros: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.rendimientoCajeros(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(datos));
  },

  /**
   * GET /api/v1/reportes/entregas
   * Estadisticas de delivery.
   */
  entregas: async (req: Request, res: Response): Promise<void> => {
    const datos = await ReportesService.reporteEntregas(
      req.query as any,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(datos));
  },
};
