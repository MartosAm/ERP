/**
 * src/modulos/turnos-caja/turnos-caja.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de turnos de caja.
 *
 * Define validacion para:
 * - Apertura de turno (monto de apertura + caja)
 * - Cierre de turno (monto contado)
 * - Filtros de consulta
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Schema para abrir un turno de caja.
 * Requiere el ID de la caja registradora y el monto de apertura (fondo).
 */
export const AbrirTurnoSchema = z.object({
  cajaRegistradoraId: z
    .string({ required_error: 'El ID de la caja es obligatorio' })
    .min(1, 'ID de caja invalido'),
  montoApertura: z
    .number({ required_error: 'El monto de apertura es obligatorio' })
    .min(0, 'El monto no puede ser negativo'),
  notas: z.string().max(500).optional(),
});

/**
 * Schema para cerrar un turno de caja.
 * Se registra el monto contado fisicamente; el sistema calcula la diferencia.
 */
export const CerrarTurnoSchema = z.object({
  montoCierre: z
    .number({ required_error: 'El monto de cierre es obligatorio' })
    .min(0, 'El monto no puede ser negativo'),
  notas: z.string().max(500).optional(),
});

/**
 * Schema de filtros para listar turnos de caja.
 */
export const FiltroTurnosSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  cajaRegistradoraId: z.string().optional(),
  usuarioId: z.string().optional(),
  abierto: z.enum(['true', 'false']).optional(),
});

/** Datos para abrir turno */
export type AbrirTurnoDto = z.infer<typeof AbrirTurnoSchema>;

/** Datos para cerrar turno */
export type CerrarTurnoDto = z.infer<typeof CerrarTurnoSchema>;

/** Filtros de consulta */
export type FiltroTurnosDto = z.infer<typeof FiltroTurnosSchema>;
