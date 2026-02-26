/**
 * src/modulos/clientes/clientes.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion del modulo de clientes.
 * Soporta control de credito (fiado) con limites y plazos.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/** Schema para crear un cliente */
export const CrearClienteSchema = z.object({
  nombre: z.string().min(2).max(150),
  telefono: z.string().max(20).optional(),
  correo: z.string().email('Correo invalido').optional(),
  direccion: z.string().max(300).optional(),
  rfc: z.string().max(13).optional(),
  notas: z.string().max(1000).optional(),
  limiteCredito: z.number().min(0).default(0),
  diasCredito: z.number().int().min(0).max(365).default(0),
});

/** Schema para actualizar cliente (PATCH) */
export const ActualizarClienteSchema = z.object({
  nombre: z.string().min(2).max(150).optional(),
  telefono: z.string().max(20).nullish(),
  correo: z.string().email('Correo invalido').nullish(),
  direccion: z.string().max(300).nullish(),
  rfc: z.string().max(13).nullish(),
  notas: z.string().max(1000).nullish(),
  limiteCredito: z.number().min(0).optional(),
  diasCredito: z.number().int().min(0).max(365).optional(),
  activo: z.boolean().optional(),
});

/** Schema para filtros de listado */
export const FiltroClientesSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  conCredito: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Tipos inferidos
export type CrearClienteDto = z.infer<typeof CrearClienteSchema>;
export type ActualizarClienteDto = z.infer<typeof ActualizarClienteSchema>;
export type FiltroClientes = z.infer<typeof FiltroClientesSchema>;
