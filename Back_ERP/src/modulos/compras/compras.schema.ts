/**
 * src/modulos/compras/compras.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de compras a proveedor.
 *
 * Flujo: Crear compra -> Recibir mercancia (actualiza inventario).
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Detalle individual de una compra a proveedor.
 */
const DetalleCompraItemSchema = z.object({
  productoId: z.string({ required_error: 'productoId es obligatorio' }).min(1),
  cantidad: z
    .number({ required_error: 'La cantidad es obligatoria' })
    .positive('La cantidad debe ser mayor a 0'),
  costoUnitario: z
    .number({ required_error: 'El costo unitario es obligatorio' })
    .min(0, 'El costo no puede ser negativo'),
});

/**
 * Schema para crear una compra a proveedor.
 */
export const CrearCompraSchema = z.object({
  proveedorId: z
    .string({ required_error: 'proveedorId es obligatorio' })
    .min(1),
  numeroFactura: z.string().max(100).optional(),
  detalles: z
    .array(DetalleCompraItemSchema)
    .min(1, 'La compra debe tener al menos un producto'),
  notas: z.string().max(500).optional(),
});

/**
 * Schema para recibir mercancia (marca compra como recibida y entra inventario).
 */
export const RecibirCompraSchema = z.object({
  almacenId: z
    .string({ required_error: 'almacenId es obligatorio' })
    .min(1),
  notas: z.string().max(500).optional(),
});

/**
 * Schema de filtros para listar compras.
 */
export const FiltroComprasSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  proveedorId: z.string().optional(),
  recibida: z.enum(['true', 'false']).optional(),
  buscar: z.string().optional(),
});

/** Datos para crear compra */
export type CrearCompraDto = z.infer<typeof CrearCompraSchema>;

/** Datos para recibir mercancia */
export type RecibirCompraDto = z.infer<typeof RecibirCompraSchema>;

/** Filtros de consulta */
export type FiltroComprasDto = z.infer<typeof FiltroComprasSchema>;
