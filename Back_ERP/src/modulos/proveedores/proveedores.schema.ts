/**
 * src/modulos/proveedores/proveedores.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion del modulo de proveedores.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/** Schema para crear un proveedor */
export const CrearProveedorSchema = z.object({
  nombre: z.string().min(2).max(150),
  nombreContacto: z.string().max(150).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email('Correo invalido').optional(),
  direccion: z.string().max(300).optional(),
  rfc: z.string().max(13).optional(),
  notas: z.string().max(1000).optional(),
});

/** Schema para actualizar proveedor (PATCH) */
export const ActualizarProveedorSchema = z.object({
  nombre: z.string().min(2).max(150).optional(),
  nombreContacto: z.string().max(150).nullish(),
  telefono: z.string().max(20).nullish(),
  correo: z.string().email('Correo invalido').nullish(),
  direccion: z.string().max(300).nullish(),
  rfc: z.string().max(13).nullish(),
  notas: z.string().max(1000).nullish(),
  activo: z.boolean().optional(),
});

/** Schema para filtros de listado */
export const FiltroProveedoresSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Tipos inferidos
export type CrearProveedorDto = z.infer<typeof CrearProveedorSchema>;
export type ActualizarProveedorDto = z.infer<typeof ActualizarProveedorSchema>;
export type FiltroProveedores = z.infer<typeof FiltroProveedoresSchema>;
