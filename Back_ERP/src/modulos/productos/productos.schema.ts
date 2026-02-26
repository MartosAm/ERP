/**
 * src/modulos/productos/productos.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para validacion del modulo de productos.
 *
 * El producto es la entidad mas compleja del catalogo: soporta
 * multi-precio, multi-unidad, codigo de barras y control de inventario.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

// Enum de tipos de unidad del schema Prisma
const TipoUnidadEnum = z.enum([
  'PIEZA',
  'KILOGRAMO',
  'LITRO',
  'METRO',
  'METRO_CUADRADO',
  'CAJA',
  'PAQUETE',
  'SERVICIO',
]);

/** Schema para crear un producto */
export const CrearProductoSchema = z.object({
  // Identificacion
  sku: z.string().min(1).max(50),
  codigoBarras: z.string().max(50).optional(),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(1000).optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),

  // Relaciones opcionales
  categoriaId: z.string().cuid().optional(),
  proveedorId: z.string().cuid().optional(),

  // Unidad de medida
  tipoUnidad: TipoUnidadEnum.default('PIEZA'),
  etiquetaUnidad: z.string().max(10).default('pza'),
  conversionUnidad: z.number().positive().optional(),
  cantidadMinimaVenta: z.number().positive().default(1),
  incrementoVenta: z.number().positive().default(1),

  // Precios
  precioCosto: z.number().min(0).default(0),
  precioVenta1: z.number().min(0).default(0),
  precioVenta2: z.number().min(0).optional(),
  precioVenta3: z.number().min(0).optional(),
  impuestoIncluido: z.boolean().default(true),
  tasaImpuesto: z.number().min(0).max(1).default(0.16),

  // Control de inventario
  rastrearInventario: z.boolean().default(true),
  stockMinimo: z.number().min(0).default(0),
  stockMaximo: z.number().min(0).optional(),

  // Otros
  activo: z.boolean().default(true),
  destacado: z.boolean().default(false),
  imagenUrl: z.string().url().optional(),
  notas: z.string().max(1000).optional(),
});

/** Schema para actualizar producto (PATCH) */
export const ActualizarProductoSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  codigoBarras: z.string().max(50).nullish(),
  nombre: z.string().min(2).max(200).optional(),
  descripcion: z.string().max(1000).nullish(),
  marca: z.string().max(100).nullish(),
  modelo: z.string().max(100).nullish(),
  categoriaId: z.string().cuid().nullish(),
  proveedorId: z.string().cuid().nullish(),
  tipoUnidad: TipoUnidadEnum.optional(),
  etiquetaUnidad: z.string().max(10).optional(),
  conversionUnidad: z.number().positive().nullish(),
  cantidadMinimaVenta: z.number().positive().optional(),
  incrementoVenta: z.number().positive().optional(),
  precioCosto: z.number().min(0).optional(),
  precioVenta1: z.number().min(0).optional(),
  precioVenta2: z.number().min(0).nullish(),
  precioVenta3: z.number().min(0).nullish(),
  impuestoIncluido: z.boolean().optional(),
  tasaImpuesto: z.number().min(0).max(1).optional(),
  rastrearInventario: z.boolean().optional(),
  stockMinimo: z.number().min(0).optional(),
  stockMaximo: z.number().min(0).nullish(),
  activo: z.boolean().optional(),
  destacado: z.boolean().optional(),
  imagenUrl: z.string().url().nullish(),
  notas: z.string().max(1000).nullish(),
});

/** Schema para filtros de listado de productos */
export const FiltroProductosSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  categoriaId: z.string().cuid().optional(),
  proveedorId: z.string().cuid().optional(),
  destacado: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  stockBajo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  ordenarPor: z
    .enum(['nombre', 'precioVenta1', 'creadoEn', 'sku'])
    .default('nombre'),
  direccionOrden: z.enum(['asc', 'desc']).default('asc'),
});

// Tipos inferidos
export type CrearProductoDto = z.infer<typeof CrearProductoSchema>;
export type ActualizarProductoDto = z.infer<typeof ActualizarProductoSchema>;
export type FiltroProductos = z.infer<typeof FiltroProductosSchema>;
