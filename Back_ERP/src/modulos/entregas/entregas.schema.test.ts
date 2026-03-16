/**
 * Tests unitarios: entregas.schema.ts
 * Valida schemas de creación, actualización de estado y filtros de entregas.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CrearEntregaSchema,
  ActualizarEstadoSchema,
  FiltroEntregasSchema,
} from './entregas.schema';

// ─── CrearEntregaSchema ───────────────────────────────────

describe('CrearEntregaSchema', () => {
  it('acepta entrega con datos mínimos', () => {
    const result = CrearEntregaSchema.safeParse({
      ordenId: 'cl-orden-123',
      direccionEntrega: 'Av. Reforma 100, Col. Centro',
    });
    expect(result.success).toBe(true);
  });

  it('acepta entrega completa', () => {
    const result = CrearEntregaSchema.safeParse({
      ordenId: 'cl-orden-123',
      asignadoAId: 'cl-repartidor-456',
      direccionEntrega: 'Av. Insurgentes 500, CDMX',
      programadaEn: '2026-03-15T10:00:00Z',
      notas: 'Entregar en recepción',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sin ordenId', () => {
    const result = CrearEntregaSchema.safeParse({
      direccionEntrega: 'Dirección válida aquí',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza dirección muy corta (< 5 chars)', () => {
    const result = CrearEntregaSchema.safeParse({
      ordenId: 'cl123',
      direccionEntrega: 'Abc',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin dirección', () => {
    const result = CrearEntregaSchema.safeParse({
      ordenId: 'cl123',
    });
    expect(result.success).toBe(false);
  });
});

// ─── ActualizarEstadoSchema ───────────────────────────────

describe('ActualizarEstadoSchema', () => {
  it('acepta cambio a EN_RUTA', () => {
    const result = ActualizarEstadoSchema.safeParse({ estado: 'EN_RUTA' });
    expect(result.success).toBe(true);
  });

  it('acepta cambio a ENTREGADO', () => {
    const result = ActualizarEstadoSchema.safeParse({ estado: 'ENTREGADO' });
    expect(result.success).toBe(true);
  });

  it('acepta cambio a NO_ENTREGADO con motivo', () => {
    const result = ActualizarEstadoSchema.safeParse({
      estado: 'NO_ENTREGADO',
      motivoFallo: 'No había nadie en el domicilio',
    });
    expect(result.success).toBe(true);
  });

  it('acepta REPROGRAMADO con fecha', () => {
    const result = ActualizarEstadoSchema.safeParse({
      estado: 'REPROGRAMADO',
      programadaEn: '2026-03-16T14:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('acepta todos los estados válidos', () => {
    for (const estado of ['EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO']) {
      const result = ActualizarEstadoSchema.safeParse({ estado });
      expect(result.success).toBe(true);
    }
  });

  it('rechaza estado ASIGNADO (solo se asigna al crear)', () => {
    const result = ActualizarEstadoSchema.safeParse({ estado: 'ASIGNADO' });
    expect(result.success).toBe(false);
  });

  it('rechaza estado PENDIENTE', () => {
    const result = ActualizarEstadoSchema.safeParse({ estado: 'PENDIENTE' });
    expect(result.success).toBe(false);
  });

  it('rechaza sin estado', () => {
    const result = ActualizarEstadoSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── FiltroEntregasSchema ─────────────────────────────────

describe('FiltroEntregasSchema', () => {
  it('aplica defaults', () => {
    const result = FiltroEntregasSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(1);
      expect(result.data.limite).toBe(20);
    }
  });

  it('acepta filtro por estado', () => {
    for (const estado of ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO']) {
      const result = FiltroEntregasSchema.safeParse({ estado });
      expect(result.success).toBe(true);
    }
  });

  it('acepta filtro por repartidor', () => {
    const result = FiltroEntregasSchema.safeParse({
      asignadoAId: 'cl-repartidor-123',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza estado inválido', () => {
    const result = FiltroEntregasSchema.safeParse({ estado: 'COMPLETADA' });
    expect(result.success).toBe(false);
  });
});
