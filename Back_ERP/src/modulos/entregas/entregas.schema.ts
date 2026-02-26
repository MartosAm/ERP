/**
 * src/modulos/entregas/entregas.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de entregas / delivery.
 *
 * Flujo de estados:
 *   ASIGNADO -> EN_RUTA -> ENTREGADO | NO_ENTREGADO | REPROGRAMADO
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Schema para crear/asignar una entrega a una orden.
 */
export const CrearEntregaSchema = z.object({
  ordenId: z
    .string({ required_error: 'ordenId es obligatorio' })
    .min(1),
  asignadoAId: z.string().optional(),
  direccionEntrega: z
    .string({ required_error: 'La direccion es obligatoria' })
    .min(5, 'La direccion debe tener al menos 5 caracteres')
    .max(500),
  programadaEn: z.string().optional(),
  notas: z.string().max(500).optional(),
});

/**
 * Schema para actualizar estado de entrega.
 */
export const ActualizarEstadoSchema = z.object({
  estado: z.enum(
    ['EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO'],
    { errorMap: () => ({ message: 'Estado invalido' }) },
  ),
  notas: z.string().max(500).optional(),
  motivoFallo: z.string().max(500).optional(),
  programadaEn: z.string().optional(),
});

/**
 * Schema de filtros para listar entregas.
 */
export const FiltroEntregasSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  estado: z
    .enum(['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO'])
    .optional(),
  asignadoAId: z.string().optional(),
  pendientes: z.enum(['true', 'false']).optional(),
});

/** Datos para crear entrega */
export type CrearEntregaDto = z.infer<typeof CrearEntregaSchema>;

/** Datos para actualizar estado */
export type ActualizarEstadoDto = z.infer<typeof ActualizarEstadoSchema>;

/** Filtros */
export type FiltroEntregasDto = z.infer<typeof FiltroEntregasSchema>;
