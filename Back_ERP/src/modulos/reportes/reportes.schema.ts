/**
 * src/modulos/reportes/reportes.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de reportes.
 *
 * Reportes disponibles:
 * 1. Resumen de ventas (diario, semanal, mensual)
 * 2. Productos mas vendidos (top N)
 * 3. Ventas por metodo de pago
 * 4. Inventario valorizado
 * 5. Rendimiento de cajeros
 * 6. Reporte de entregas
 * 7. Dashboard resumen (KPIs principales)
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Filtro de rango de fechas comun a todos los reportes.
 */
export const FiltroFechasSchema = z.object({
  fechaDesde: z
    .string({ required_error: 'fechaDesde es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  fechaHasta: z
    .string({ required_error: 'fechaHasta es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
}).refine(
  (data) => data.fechaDesde <= data.fechaHasta,
  { message: 'fechaDesde debe ser anterior o igual a fechaHasta' },
);

/**
 * Filtro para reporte de top productos.
 */
export const TopProductosSchema = z.object({
  fechaDesde: z
    .string({ required_error: 'fechaDesde es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  fechaHasta: z
    .string({ required_error: 'fechaHasta es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  limite: z.coerce.number().int().positive().max(50).default(10),
});

/** Tipos */
export type FiltroFechasDto = z.infer<typeof FiltroFechasSchema>;
export type TopProductosDto = z.infer<typeof TopProductosSchema>;
