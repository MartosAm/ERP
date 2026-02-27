/**
 * src/modulos/ordenes/ordenes.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para el modulo de ordenes / ventas / cotizaciones POS.
 *
 * Define validacion para:
 * - Creacion de orden (venta directa POS)
 * - Creacion de cotizacion (presupuesto sin comprometer stock)
 * - Confirmacion de cotizacion (convierte en venta)
 * - Cancelacion de orden
 * - Devolucion total o parcial
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
 * Schema para crear una cotizacion (presupuesto).
 * Similar a orden pero sin pagos (no se cobra) y sin requerir turno de caja.
 */
export const CrearCotizacionSchema = z.object({
  clienteId: z.string().optional(),
  detalles: z
    .array(DetalleOrdenSchema)
    .min(1, 'La cotizacion debe tener al menos un producto'),
  notas: z.string().max(500).optional(),
  validaHasta: z.string().optional(), // Fecha de vigencia "YYYY-MM-DD"
});

/**
 * Schema para confirmar una cotizacion (convertir en venta).
 * Se envian los pagos en este momento.
 */
export const ConfirmarCotizacionSchema = z.object({
  pagos: z
    .array(PagoSchema)
    .min(1, 'Debe incluir al menos un metodo de pago'),
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
 * Schema para devolucion total o parcial.
 */
const ItemDevolucionSchema = z.object({
  productoId: z.string({ required_error: 'productoId es obligatorio' }).min(1),
  cantidad: z
    .number({ required_error: 'La cantidad a devolver es obligatoria' })
    .positive('La cantidad debe ser mayor a 0'),
  motivo: z.string().max(500).optional(),
});

export const DevolucionSchema = z.object({
  items: z
    .array(ItemDevolucionSchema)
    .min(1, 'Debe incluir al menos un producto a devolver'),
  motivo: z
    .string({ required_error: 'El motivo de devolucion es obligatorio' })
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

/** Tipos exportados */
export type CrearOrdenDto = z.infer<typeof CrearOrdenSchema>;
export type CrearCotizacionDto = z.infer<typeof CrearCotizacionSchema>;
export type ConfirmarCotizacionDto = z.infer<typeof ConfirmarCotizacionSchema>;
export type CancelarOrdenDto = z.infer<typeof CancelarOrdenSchema>;
export type DevolucionDto = z.infer<typeof DevolucionSchema>;
export type FiltroOrdenesDto = z.infer<typeof FiltroOrdenesSchema>;
