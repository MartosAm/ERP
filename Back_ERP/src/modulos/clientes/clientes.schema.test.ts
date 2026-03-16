/**
 * Tests unitarios: clientes.schema.ts
 * Valida schemas de creación, actualización y filtros de clientes.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CrearClienteSchema,
  ActualizarClienteSchema,
  FiltroClientesSchema,
} from './clientes.schema';

// ─── CrearClienteSchema ───────────────────────────────────

describe('CrearClienteSchema', () => {
  it('acepta cliente con datos mínimos (solo nombre)', () => {
    const result = CrearClienteSchema.safeParse({ nombre: 'Juan Pérez' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limiteCredito).toBe(0); // default
      expect(result.data.diasCredito).toBe(0);   // default
    }
  });

  it('acepta cliente completo', () => {
    const result = CrearClienteSchema.safeParse({
      nombre: 'María García',
      telefono: '5512345678',
      correo: 'maria@empresa.com',
      direccion: 'Av. Reforma 100, CDMX',
      rfc: 'GAGM900101ABC',
      limiteCredito: 5000,
      diasCredito: 30,
    });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta limiteCredito como string (Prisma Decimal)', () => {
    const result = CrearClienteSchema.safeParse({
      nombre: 'Cliente Coerce',
      limiteCredito: '10000.50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limiteCredito).toBe(10000.5);
    }
  });

  it('rechaza nombre menor a 2 caracteres', () => {
    const result = CrearClienteSchema.safeParse({ nombre: 'X' });
    expect(result.success).toBe(false);
  });

  it('rechaza correo inválido', () => {
    const result = CrearClienteSchema.safeParse({
      nombre: 'Test',
      correo: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza límite de crédito negativo', () => {
    const result = CrearClienteSchema.safeParse({
      nombre: 'Test',
      limiteCredito: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza días de crédito > 365', () => {
    const result = CrearClienteSchema.safeParse({
      nombre: 'Test',
      diasCredito: 400,
    });
    expect(result.success).toBe(false);
  });
});

// ─── ActualizarClienteSchema ──────────────────────────────

describe('ActualizarClienteSchema', () => {
  it('acepta body vacío (PATCH sin cambios)', () => {
    const result = ActualizarClienteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('acepta campos nullish para limpiar', () => {
    const result = ActualizarClienteSchema.safeParse({
      telefono: null,
      correo: null,
      direccion: null,
    });
    expect(result.success).toBe(true);
  });

  it('coerce: acepta limiteCredito como string', () => {
    const result = ActualizarClienteSchema.safeParse({
      limiteCredito: '3000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limiteCredito).toBe(3000);
    }
  });

  it('acepta cambio de estado activo', () => {
    const result = ActualizarClienteSchema.safeParse({ activo: false });
    expect(result.success).toBe(true);
  });
});

// ─── FiltroClientesSchema ─────────────────────────────────

describe('FiltroClientesSchema', () => {
  it('aplica defaults', () => {
    const result = FiltroClientesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagina).toBe(1);
      expect(result.data.limite).toBe(20);
    }
  });

  it('transforma conCredito "true" a boolean', () => {
    const result = FiltroClientesSchema.safeParse({ conCredito: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conCredito).toBe(true);
    }
  });

  it('acepta búsqueda por texto', () => {
    const result = FiltroClientesSchema.safeParse({ buscar: 'García' });
    expect(result.success).toBe(true);
  });
});
