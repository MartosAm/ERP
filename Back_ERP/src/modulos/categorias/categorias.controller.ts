/**
 * src/modulos/categorias/categorias.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de categorias.
 *
 * Responsabilidades exclusivas:
 * - Extraer datos del request (body, params, query, user)
 * - Invocar el service correspondiente
 * - Retornar la respuesta formateada con ApiResponse
 *
 * NO contiene logica de negocio ni accede a Prisma directamente.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { CategoriasService } from './categorias.service';
import type {
  CrearCategoriaDto,
  ActualizarCategoriaDto,
  FiltroCategorias,
} from './categorias.schema';

export const CategoriasController = {

  /**
   * GET /categorias
   * Lista categorias paginadas con filtros opcionales.
   */
  async listar(req: Request, res: Response): Promise<void> {
    const filtros = req.query as unknown as FiltroCategorias;
    const { datos, meta } = await CategoriasService.listar(
      req.user!.empresaId,
      filtros,
    );
    res.json(ApiResponse.ok(datos, 'Categorias obtenidas', meta));
  },

  /**
   * GET /categorias/arbol
   * Obtiene el arbol jerarquico de categorias activas.
   */
  async obtenerArbol(req: Request, res: Response): Promise<void> {
    const arbol = await CategoriasService.obtenerArbol(req.user!.empresaId);
    res.json(ApiResponse.ok(arbol, 'Arbol de categorias'));
  },

  /**
   * GET /categorias/:id
   * Obtiene una categoria por ID con subcategorias.
   */
  async obtenerPorId(req: Request, res: Response): Promise<void> {
    const categoria = await CategoriasService.obtenerPorId(
      req.params.id!,
      req.user!.empresaId,
    );
    res.json(ApiResponse.ok(categoria));
  },

  /**
   * POST /categorias
   * Crea una nueva categoria.
   */
  async crear(req: Request, res: Response): Promise<void> {
    const dto = req.body as CrearCategoriaDto;
    const categoria = await CategoriasService.crear(
      req.user!.empresaId,
      dto,
    );
    res.status(201).json(ApiResponse.ok(categoria, 'Categoria creada'));
  },

  /**
   * PATCH /categorias/:id
   * Actualiza parcialmente una categoria.
   */
  async actualizar(req: Request, res: Response): Promise<void> {
    const dto = req.body as ActualizarCategoriaDto;
    const categoria = await CategoriasService.actualizar(
      req.params.id!,
      req.user!.empresaId,
      dto,
    );
    res.json(ApiResponse.ok(categoria, 'Categoria actualizada'));
  },

  /**
   * DELETE /categorias/:id
   * Desactiva una categoria (soft delete).
   */
  async eliminar(req: Request, res: Response): Promise<void> {
    await CategoriasService.eliminar(req.params.id!, req.user!.empresaId);
    res.json(ApiResponse.ok(null, 'Categoria eliminada'));
  },
};
