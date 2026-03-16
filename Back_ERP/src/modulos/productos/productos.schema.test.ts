/**
 * Tests unitarios: productos.schema.ts
 * Valida que los schemas Zod acepten datos correctos y rechacen datos inválidos.
 * Cubre especialmente el patrón z.coerce.number() para Prisma Decimal strings.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CrearProductoSchema,
  ActualizarProductoSchema,
  FiltroProductosSchema,
} from './productos.schema';

// ─── Datos válidos base ───────────────────────────────────

const productoValido = {
  sku: 'SKU-001',
  nombre: 'Aceite Vegetal 1L',
  precioCosto: 18.5,
  precioVenta1: 28,
};

// ─── CrearProductoSchema ──────────────────────────────────

describe('CrearProductoSchema', () => {
  it('acepta datos mínimos requeridos (sku + nombre)', () => {
    const result = CrearProductoSchema.safeParse({ sku: 'A1', nombre: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBe('A1');
      expect(result.data.precioVenta1).toBe(0); // default
      expect(result.data.tasaImpuesto).toBe(0.16); // default
      expect(result.data.tipoUnidad).toBe('PIEZA'); // default
    }
  });

  it('acepta datos completos', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      descripcion: 'Aceite de cocina',
      marca: 'La Patrona',
      precioVenta2: 25,
      tasaImpuesto: 0.08,
      stockMinimo: 10,
      rastrearInventario: true,
    });
    expect(result.success).toBe(true);
  });

  // BUG #6: Prisma Decimal serializa como string — z.coerce.number() debe aceptar
  it('coerce: acepta precios como strings (Prisma Decimal)', () => {
    const result = CrearProductoSchema.safeParse({
      sku: 'COERCE-01',
      nombre: 'Producto coerce',
      precioCosto: '18.50',
      precioVenta1: '28',
      precioVenta2: '25.00',
      tasaImpuesto: '0.16',
      stockMinimo: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precioCosto).toBe(18.5);
      expect(result.data.precioVenta1).toBe(28);
      expect(result.data.precioVenta2).toBe(25);
      expect(result.data.tasaImpuesto).toBe(0.16);
      expect(result.data.stockMinimo).toBe(10);
    }
  });

  it('rechaza sku vacío', () => {
    const result = CrearProductoSchema.safeParse({ sku: '', nombre: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rechaza nombre menor a 2 caracteres', () => {
    const result = CrearProductoSchema.safeParse({ sku: 'A1', nombre: 'X' });
    expect(result.success).toBe(false);
  });

  it('rechaza precio negativo', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      precioVenta1: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tasaImpuesto mayor a 1', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      tasaImpuesto: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tipoUnidad inválido', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      tipoUnidad: 'GALÓN',
    });
    expect(result.success).toBe(false);
  });

  it('acepta todos los tipoUnidad válidos', () => {
    const tipos = ['PIEZA', 'KILOGRAMO', 'LITRO', 'METRO', 'METRO_CUADRADO', 'CAJA', 'PAQUETE', 'SERVICIO'];
    for (const tipo of tipos) {
      const result = CrearProductoSchema.safeParse({ ...productoValido, tipoUnidad: tipo });
      expect(result.success).toBe(true);
    }
  });

  it('rechaza imagenUrl con formato inválido', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      imagenUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('acepta categoriaId como CUID válido', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      categoriaId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza categoriaId con formato inválido', () => {
    const result = CrearProductoSchema.safeParse({
      ...productoValido,
      categoriaId: '12345',
    });
    expect(result.success).toBe(false);
  });
});

// ─── ActualizarProductoSchema ─────────────────────────────

describe('ActualizarProductoSchema', () => {
  it('acepta body vacío (PATCH sin cambios)', () => {
    const result = ActualizarProductoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('acepta actualización parcial (solo nombre)', () => {
    const result = ActualizarProductoSchema.safeParse({ nombre: 'Nuevo nombre' });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta precios como strings en actualización', () => {
    const result = ActualizarProductoSchema.safeParse({
      precioCosto: '45.50',
      precioVenta1: '60',
      stockMinimo: '5',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.precioCosto).toBe(45.5);
      expect(result.data.precioVenta1).toBe(60);
      expect(result.data.stockMinimo).toBe(5);
    }
  });

  it('acepta nullish para limpiar campos opcionales', () => {
    const result = ActualizarProductoSchema.safeParse({
      descripcion: null,
      marca: null,
      precioVenta2: null,
      imagenUrl: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBeNull();
      expect(result.data.marca).toBeNull();
    }
  });

  it('rechaza nombre de 1 carácter', () => {
    const result = ActualizarProductoSchema.safeParse({ nombre: 'X' });
    expect(result.success).toBe(false);
  });
});

// ─── FiltroProductosSchema ────────────────────────────────

describe('FiltroProductosSchema', () => {
  it('aplica defaults cuando no se envía nada', () => {
    const result = FiltroProductosSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(1);
      expect(result.data.limite).toBe(20);
      expect(result.data.ordenarPor).toBe('nombre');
      expect(result.data.direccionOrden).toBe('asc');
    }
  });

  it('coerce: convierte query strings a números', () => {
    const result = FiltroProductosSchema.safeParse({ pagina: '3', limite: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(3);
      expect(result.data.limite).toBe(50);
    }
  });

  it('transforma activo "true" a boolean true', () => {
    const result = FiltroProductosSchema.safeParse({ activo: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activo).toBe(true);
    }
  });

  it('transforma activo "false" a boolean false', () => {
    const result = FiltroProductosSchema.safeParse({ activo: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activo).toBe(false);
    }
  });

  it('rechaza limite mayor a 100', () => {
    const result = FiltroProductosSchema.safeParse({ limite: '200' });
    expect(result.success).toBe(false);
  });

  it('rechaza pagina 0', () => {
    const result = FiltroProductosSchema.safeParse({ pagina: '0' });
    expect(result.success).toBe(false);
  });

  it('rechaza ordenarPor inválido', () => {
    const result = FiltroProductosSchema.safeParse({ ordenarPor: 'precio' });
    expect(result.success).toBe(false);
  });
});
