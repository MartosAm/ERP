/**
 * src/modulos/ordenes/ordenes.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de ordenes / ventas POS.
 *
 * Define validacion para:
 * - Creacion de orden (items, pagos, cliente)
 * - Cancelacion de orden
 * - Filtros de consulta
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * Item individual de una orden.
 * El precio se toma del catalogo; el cajero define cantidad y descuento.
 */
const DetalleOrdenSchema = z.object({
  productoId: z.string({ required_error: 'productoId es obligatorio' }).min(1),
  cantidad: z
    .number({ required_error: 'La cantidad es obligatoria' })
    .positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z
    .number({ required_error: 'El precio es obligatorio' })
    .min(0, 'El precio no puede ser negativo'),
  descuento: z.number().min(0).default(0),
});

/**
 * Pago individual. Para pagos mixtos se envian multiples pagos.
 */
const PagoSchema = z.object({
  metodo: z.enum(
    ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'CREDITO_CLIENTE'],
    { errorMap: () => ({ message: 'Metodo de pago invalido' }) },
  ),
  monto: z
    .number({ required_error: 'El monto del pago es obligatorio' })
    .positive('El monto debe ser mayor a 0'),
  referencia: z.string().optional(),
});

/**
 * Schema para crear una orden completa (venta POS).
 * Incluye items, pagos y opcionalmente cliente.
 */
export const CrearOrdenSchema = z.object({
  clienteId: z.string().optional(),
  detalles: z
    .array(DetalleOrdenSchema)
    .min(1, 'La orden debe tener al menos un producto'),
  pagos: z
    .array(PagoSchema)
    .min(1, 'Debe incluir al menos un metodo de pago'),
  notas: z.string().max(500).optional(),
});

/**
 * Schema para cancelar una orden.
 */
export const CancelarOrdenSchema = z.object({
  motivoCancelacion: z
    .string({ required_error: 'El motivo de cancelacion es obligatorio' })
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(500),
});

/**
 * Schema de filtros para listar ordenes.
 */
export const FiltroOrdenesSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  estado: z
    .enum(['COTIZACION', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA', 'DEVUELTA'])
    .optional(),
  clienteId: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  buscar: z.string().optional(),
});

/** Datos para crear orden */
export type CrearOrdenDto = z.infer<typeof CrearOrdenSchema>;

/** Datos para cancelar orden */
export type CancelarOrdenDto = z.infer<typeof CancelarOrdenSchema>;

/** Filtros de consulta */
export type FiltroOrdenesDto = z.infer<typeof FiltroOrdenesSchema>;
