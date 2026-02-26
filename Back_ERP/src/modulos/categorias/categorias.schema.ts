/**
 * src/modulos/categorias/categorias.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion de datos del modulo de categorias.
 *
 * Define la forma exacta que deben tener los DTOs de entrada para
 * crear, actualizar y filtrar categorias. El middleware validar()
 * aplica estos schemas automaticamente antes de llegar al controller.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Schema para crear una categoria nueva.
 * Campos obligatorios: nombre.
 * Campos opcionales: descripcion, padreId, colorHex, nombreIcono, orden.
 */
export const CrearCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  descripcion: z
    .string()
    .max(500, 'La descripcion no debe exceder 500 caracteres')
    .optional(),
  padreId: z.string().cuid().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex (#FF5733)')
    .optional(),
  nombreIcono: z.string().max(50).optional(),
  orden: z.number().int().min(0).optional(),
});

/**
 * Schema para actualizar una categoria existente.
 * Todos los campos son opcionales (PATCH semantico).
 */
export const ActualizarCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no debe exceder 100 caracteres')
    .optional(),
  descripcion: z
    .string()
    .max(500, 'La descripcion no debe exceder 500 caracteres')
    .nullish(),
  padreId: z.string().cuid().nullish(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex (#FF5733)')
    .nullish(),
  nombreIcono: z.string().max(50).nullish(),
  orden: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

/**
 * Schema para filtros de busqueda y paginacion en el listado.
 * Se aplica sobre req.query (strings que se coercionan a numeros/booleans).
 */
export const FiltroCategoriasSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  padreId: z.string().cuid().optional(),
  soloRaiz: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Tipos inferidos para uso en services y controllers
export type CrearCategoriaDto = z.infer<typeof CrearCategoriaSchema>;
export type ActualizarCategoriaDto = z.infer<typeof ActualizarCategoriaSchema>;
export type FiltroCategorias = z.infer<typeof FiltroCategoriasSchema>;
