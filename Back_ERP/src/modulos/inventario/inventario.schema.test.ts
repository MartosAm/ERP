/**
 * Tests unitarios: inventario.schema.ts
 * Valida schemas de movimientos de inventario con refinements.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CrearMovimientoSchema,
  FiltroMovimientosSchema,
  FiltroExistenciasSchema,
} from './inventario.schema';

const cuid1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';
const cuid2 = 'clyyyyyyyyyyyyyyyyyyyyyyyyy';

// ─── CrearMovimientoSchema ────────────────────────────────

describe('CrearMovimientoSchema', () => {
  it('acepta entrada válida', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'ENTRADA',
      cantidad: 50,
    });
    expect(result.success).toBe(true);
  });

  it('acepta salida con costo unitario', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'SALIDA',
      cantidad: 10,
      costoUnitario: 25.50,
      motivo: 'Venta directa',
    });
    expect(result.success).toBe(true);
  });

  it('acepta ajuste de inventario', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'AJUSTE',
      cantidad: 5,
      motivo: 'Conteo físico',
    });
    expect(result.success).toBe(true);
  });

  it('acepta traslado con almacenDestinoId', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid1,
      almacenDestinoId: cuid2,
      tipoMovimiento: 'TRASLADO',
      cantidad: 10,
    });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta cantidad y costoUnitario como strings', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'ENTRADA',
      cantidad: '25',
      costoUnitario: '18.50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidad).toBe(25);
      expect(result.data.costoUnitario).toBe(18.5);
    }
  });

  // Refinement: traslado sin destino
  it('rechaza traslado sin almacenDestinoId', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'TRASLADO',
      cantidad: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i: { path: (string | number)[] }) => i.path.join('.'));
      expect(paths).toContain('almacenDestinoId');
    }
  });

  // Refinement: origen = destino
  it('rechaza traslado con mismo almacén origen y destino', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid1,
      almacenDestinoId: cuid1,
      tipoMovimiento: 'TRASLADO',
      cantidad: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cantidad 0', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'ENTRADA',
      cantidad: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cantidad negativa', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'ENTRADA',
      cantidad: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tipo de movimiento inválido', () => {
    const result = CrearMovimientoSchema.safeParse({
      productoId: cuid1,
      almacenId: cuid2,
      tipoMovimiento: 'DEVOLUCION',
      cantidad: 5,
    });
    expect(result.success).toBe(false);
  });

  it('acepta los 4 tipos de movimiento', () => {
    for (const tipo of ['ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO']) {
      const data: Record<string, unknown> = {
        productoId: cuid1,
        almacenId: cuid1,
        tipoMovimiento: tipo,
        cantidad: 1,
      };
      if (tipo === 'TRASLADO') data.almacenDestinoId = cuid2;
      const result = CrearMovimientoSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});

// ─── FiltroMovimientosSchema ──────────────────────────────

describe('FiltroMovimientosSchema', () => {
  it('aplica defaults', () => {
    const result = FiltroMovimientosSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(1);
      expect(result.data.limite).toBe(20);
    }
  });

  it('acepta filtro por tipo de movimiento', () => {
    const result = FiltroMovimientosSchema.safeParse({
      tipoMovimiento: 'ENTRADA',
    });
    expect(result.success).toBe(true);
  });
});

// ─── FiltroExistenciasSchema ──────────────────────────────

describe('FiltroExistenciasSchema', () => {
  it('default limite es 50 (no 20)', () => {
    const result = FiltroExistenciasSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limite).toBe(50);
    }
  });

  it('transforma stockBajo "true" a boolean', () => {
    const result = FiltroExistenciasSchema.safeParse({ stockBajo: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stockBajo).toBe(true);
    }
  });
});
