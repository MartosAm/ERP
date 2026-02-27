/**
 * src/modulos/categorias/categorias.routes.ts
 * ------------------------------------------------------------------
 * Definicion de rutas REST del modulo de categorias.
 *
 * Endpoints:
 *   GET    /categorias         -> Listar con filtros y paginacion
 *   GET    /categorias/arbol   -> Arbol jerarquico (para selectors UI)
 *   GET    /categorias/:id     -> Detalle por ID
 *   POST   /categorias         -> Crear (solo ADMIN)
 *   PATCH  /categorias/:id     -> Actualizar parcial (solo ADMIN)
 *   DELETE /categorias/:id     -> Soft delete (solo ADMIN)
 *
 * Todas las rutas requieren autenticacion.
 * Mutaciones restringidas a rol ADMIN.
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { asyncHandler } from '../../compartido/asyncHandler';
import { CategoriasController } from './categorias.controller';
import {
  CrearCategoriaSchema,
  ActualizarCategoriaSchema,
  FiltroCategoriasSchema,
} from './categorias.schema';

const router = Router();

// Todas las rutas de categorias requieren autenticacion
router.use(autenticar);

/**
 * @openapi
 * /categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Lista categorias con filtros y paginacion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *       - in: query
 *         name: activo
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: padreId
 *         schema: { type: string }
 *       - in: query
 *         name: soloRaiz
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Lista paginada de categorias
 */
router.get(
  '/',
  validar(FiltroCategoriasSchema, 'query'),
  asyncHandler(CategoriasController.listar),
);

/**
 * @openapi
 * /categorias/arbol:
 *   get:
 *     tags: [Categorias]
 *     summary: Arbol jerarquico de categorias activas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Arbol con categorias raiz y subcategorias
 */
router.get(
  '/arbol',
  asyncHandler(CategoriasController.obtenerArbol),
);

/**
 * @openapi
 * /categorias/{id}:
 *   get:
 *     tags: [Categorias]
 *     summary: Detalle de una categoria por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Categoria con subcategorias y conteo de productos
 *       404:
 *         description: Categoria no encontrada
 */
router.get(
  '/:id',
  asyncHandler(CategoriasController.obtenerPorId),
);

/**
 * @openapi
 * /categorias:
 *   post:
 *     tags: [Categorias]
 *     summary: Crear nueva categoria (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, minLength: 2, maxLength: 100 }
 *               descripcion: { type: string, maxLength: 500 }
 *               padreId: { type: string }
 *               colorHex: { type: string, pattern: '^#[0-9A-Fa-f]{6}$' }
 *               nombreIcono: { type: string, maxLength: 50 }
 *               orden: { type: integer, minimum: 0 }
 *     responses:
 *       201:
 *         description: Categoria creada exitosamente
 *       409:
 *         description: Ya existe una categoria con ese nombre
 */
router.post(
  '/',
  requerirRol('ADMIN'),
  validar(CrearCategoriaSchema),
  asyncHandler(CategoriasController.crear),
);

/**
 * @openapi
 * /categorias/{id}:
 *   patch:
 *     tags: [Categorias]
 *     summary: Actualizar categoria parcialmente (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               padreId: { type: string }
 *               colorHex: { type: string }
 *               nombreIcono: { type: string }
 *               orden: { type: integer }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: Categoria actualizada
 *       404:
 *         description: Categoria no encontrada
 */
router.patch(
  '/:id',
  requerirRol('ADMIN'),
  validar(ActualizarCategoriaSchema),
  asyncHandler(CategoriasController.actualizar),
);

/**
 * @openapi
 * /categorias/{id}:
 *   delete:
 *     tags: [Categorias]
 *     summary: Desactivar categoria (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:github.copilot.chat.mcpServersP
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Categoria desactivada
 *       404:
 *         description: Categoria no encontrada
 *       422:
 *         description: Tiene productos asociados, no se puede eliminar
 */
router.delete(
  '/:id',
  requerirRol('ADMIN'),
  asyncHandler(CategoriasController.eliminar),
);

export default router;
