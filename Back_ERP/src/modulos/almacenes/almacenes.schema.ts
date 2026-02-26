/**
 * src/modulos/almacenes/almacenes.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion de datos del modulo de almacenes.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/** Schema para crear un almacen */
export const CrearAlmacenSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  direccion: z.string().max(300).optional(),
  esPrincipal: z.boolean().default(false),
});

/** Schema para actualizar un almacen (PATCH) */
export const ActualizarAlmacenSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  direccion: z.string().max(300).nullish(),
  esPrincipal: z.boolean().optional(),
  activo: z.boolean().optional(),
});

/** Schema para filtros de listado */
export const FiltroAlmacenesSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Tipos inferidos
export type CrearAlmacenDto = z.infer<typeof CrearAlmacenSchema>;
export type ActualizarAlmacenDto = z.infer<typeof ActualizarAlmacenSchema>;
export type FiltroAlmacenes = z.infer<typeof FiltroAlmacenesSchema>;
