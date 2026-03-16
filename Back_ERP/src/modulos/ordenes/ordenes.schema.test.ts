/**
 * Tests unitarios: ordenes.schema.ts
 * Valida schemas de ventas POS, cotizaciones, devoluciones y filtros.
 * Cubre el patrón z.coerce.number() y validaciones de negocio.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CrearOrdenSchema,
  CrearCotizacionSchema,
  ConfirmarCotizacionSchema,
  CancelarOrdenSchema,
  DevolucionSchema,
  FiltroOrdenesSchema,
} from './ordenes.schema';

// ─── Datos base ───────────────────────────────────────────

const detalleValido = {
  productoId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  cantidad: 2,
  precioUnitario: 45.5,
  descuento: 0,
};

const pagoValido = {
  metodo: 'EFECTIVO' as const,
  monto: 91,
};

// ─── CrearOrdenSchema ─────────────────────────────────────

describe('CrearOrdenSchema', () => {
  it('acepta orden válida con 1 detalle y 1 pago', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [detalleValido],
      pagos: [pagoValido],
    });
    expect(result.success).toBe(true);
  });

  it('acepta orden con cliente y notas', () => {
    const result = CrearOrdenSchema.safeParse({
      clienteId: 'cl-client-123',
      detalles: [detalleValido],
      pagos: [pagoValido],
      notas: 'Pedido especial',
    });
    expect(result.success).toBe(true);
  });

  it('acepta pago mixto (2 métodos)', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [detalleValido],
      pagos: [
        { metodo: 'EFECTIVO', monto: 50 },
        { metodo: 'TARJETA_DEBITO', monto: 41, referencia: 'TXN-001' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta cantidades y precios como strings', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [{
        productoId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        cantidad: '3',
        precioUnitario: '45.50',
        descuento: '0',
      }],
      pagos: [{ metodo: 'EFECTIVO', monto: '136.50' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.detalles[0].cantidad).toBe(3);
      expect(result.data.detalles[0].precioUnitario).toBe(45.5);
      expect(result.data.pagos[0].monto).toBe(136.5);
    }
  });

  it('rechaza sin detalles (array vacío)', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [],
      pagos: [pagoValido],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin pagos', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [detalleValido],
      pagos: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cantidad negativa', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [{ ...detalleValido, cantidad: -1 }],
      pagos: [pagoValido],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza monto de pago negativo', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [detalleValido],
      pagos: [{ metodo: 'EFECTIVO', monto: -10 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza método de pago inválido', () => {
    const result = CrearOrdenSchema.safeParse({
      detalles: [detalleValido],
      pagos: [{ metodo: 'BITCOIN', monto: 91 }],
    });
    expect(result.success).toBe(false);
  });

  it('acepta los 5 métodos de pago válidos', () => {
    const metodos = ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'CREDITO_CLIENTE'];
    for (const metodo of metodos) {
      const result = CrearOrdenSchema.safeParse({
        detalles: [detalleValido],
        pagos: [{ metodo, monto: 91 }],
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── CrearCotizacionSchema ────────────────────────────────

describe('CrearCotizacionSchema', () => {
  it('acepta cotización sin pagos (solo detalles)', () => {
    const result = CrearCotizacionSchema.safeParse({
      detalles: [detalleValido],
    });
    expect(result.success).toBe(true);
  });

  it('acepta con fecha de vigencia', () => {
    const result = CrearCotizacionSchema.safeParse({
      detalles: [detalleValido],
      validaHasta: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sin productos', () => {
    const result = CrearCotizacionSchema.safeParse({ detalles: [] });
    expect(result.success).toBe(false);
  });
});

// ─── ConfirmarCotizacionSchema ────────────────────────────

describe('ConfirmarCotizacionSchema', () => {
  it('acepta pagos al confirmar cotización', () => {
    const result = ConfirmarCotizacionSchema.safeParse({
      pagos: [pagoValido],
    });
    expect(result.success).toBe(true);
  });

  it('acepta pago dividido', () => {
    const result = ConfirmarCotizacionSchema.safeParse({
      pagos: [
        { metodo: 'EFECTIVO', monto: 50 },
        { metodo: 'TARJETA_DEBITO', monto: 41, referencia: 'REF-123' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sin pagos', () => {
    const result = ConfirmarCotizacionSchema.safeParse({ pagos: [] });
    expect(result.success).toBe(false);
  });
});

// ─── CancelarOrdenSchema ──────────────────────────────────

describe('CancelarOrdenSchema', () => {
  it('acepta motivo válido', () => {
    const result = CancelarOrdenSchema.safeParse({
      motivoCancelacion: 'Cliente cambió de opinión',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza motivo muy corto (< 5 chars)', () => {
    const result = CancelarOrdenSchema.safeParse({
      motivoCancelacion: 'No',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin motivo', () => {
    const result = CancelarOrdenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── DevolucionSchema ─────────────────────────────────────

describe('DevolucionSchema', () => {
  it('acepta devolución válida', () => {
    const result = DevolucionSchema.safeParse({
      items: [{ productoId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', cantidad: 1 }],
      motivo: 'Producto defectuoso',
    });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta cantidad como string (Bug #5)', () => {
    const result = DevolucionSchema.safeParse({
      items: [{ productoId: 'cl123456789012345678901234', cantidad: '2' }],
      motivo: 'Devolucion parcial',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].cantidad).toBe(2);
    }
  });

  it('rechaza sin items', () => {
    const result = DevolucionSchema.safeParse({
      items: [],
      motivo: 'Motivo válido aquí',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza motivo muy corto', () => {
    const result = DevolucionSchema.safeParse({
      items: [{ productoId: 'cl123', cantidad: 1 }],
      motivo: 'No',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cantidad 0', () => {
    const result = DevolucionSchema.safeParse({
      items: [{ productoId: 'cl123', cantidad: 0 }],
      motivo: 'Motivo válido aquí',
    });
    expect(result.success).toBe(false);
  });
});

// ─── FiltroOrdenesSchema ──────────────────────────────────

describe('FiltroOrdenesSchema', () => {
  it('aplica defaults', () => {
    const result = FiltroOrdenesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(1);
      expect(result.data.limite).toBe(20);
    }
  });

  it('acepta filtro por estado', () => {
    const estados = ['COTIZACION', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA', 'DEVUELTA'];
    for (const estado of estados) {
      const result = FiltroOrdenesSchema.safeParse({ estado });
      expect(result.success).toBe(true);
    }
  });

  it('rechaza estado inválido', () => {
    const result = FiltroOrdenesSchema.safeParse({ estado: 'BORRADOR' });
    expect(result.success).toBe(false);
  });

  it('acepta filtro por rango de fechas', () => {
    const result = FiltroOrdenesSchema.safeParse({
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });
});
