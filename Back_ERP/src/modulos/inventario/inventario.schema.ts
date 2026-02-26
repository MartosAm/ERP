/**
 * src/modulos/inventario/inventario.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion del modulo de inventario.
 *
 * Tipos de movimiento soportados:
 * - ENTRADA: Ingreso de mercancia (compra, devolucion de cliente)
 * - SALIDA: Egreso de mercancia (venta, merma, devolucion a proveedor)
 * - AJUSTE: Correccion manual por conteo fisico
 * - TRASLADO: Movimiento entre almacenes
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

const TipoMovimientoEnum = z.enum([
  'ENTRADA',
  'SALIDA',
  'AJUSTE',
  'TRASLADO',
]);

/** Schema para registrar un movimiento de inventario */
export const CrearMovimientoSchema = z.object({
  productoId: z.string().cuid(),
  almacenId: z.string().cuid(),
  almacenDestinoId: z.string().cuid().optional(),
  tipoMovimiento: TipoMovimientoEnum,
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  costoUnitario: z.number().min(0).optional(),
  motivo: z.string().max(500).optional(),
  referenciaId: z.string().optional(),
  referenciaTipo: z.string().max(50).optional(),
}).refine(
  (data) => {
    // Si es traslado, almacenDestinoId es obligatorio
    if (data.tipoMovimiento === 'TRASLADO' && !data.almacenDestinoId) {
      return false;
    }
    return true;
  },
  { message: 'Para traslados, almacenDestinoId es obligatorio', path: ['almacenDestinoId'] },
).refine(
  (data) => {
    // Almacen origen y destino no pueden ser iguales
    if (data.tipoMovimiento === 'TRASLADO' && data.almacenId === data.almacenDestinoId) {
      return false;
    }
    return true;
  },
  { message: 'Los almacenes de origen y destino deben ser diferentes', path: ['almacenDestinoId'] },
);

/** Schema para filtros de historial de movimientos */
export const FiltroMovimientosSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  productoId: z.string().cuid().optional(),
  almacenId: z.string().cuid().optional(),
  tipoMovimiento: TipoMovimientoEnum.optional(),
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
});

/** Schema para consultar existencias */
export const FiltroExistenciasSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(50),
  almacenId: z.string().cuid().optional(),
  buscar: z.string().max(100).optional(),
  stockBajo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Tipos inferidos
export type CrearMovimientoDto = z.infer<typeof CrearMovimientoSchema>;
export type FiltroMovimientos = z.infer<typeof FiltroMovimientosSchema>;
export type FiltroExistencias = z.infer<typeof FiltroExistenciasSchema>;
