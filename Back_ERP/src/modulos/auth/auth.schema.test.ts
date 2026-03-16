/**
 * Tests unitarios: auth.schema.ts
 * Valida schemas de login, registro, registro público y cambio de PIN.
 */
import { describe, it, expect } from '@jest/globals';
import {
  LoginSchema,
  RegistroSchema,
  RegistroPublicoSchema,
  CambiarPinSchema,
} from './auth.schema';

// ─── LoginSchema ──────────────────────────────────────────

describe('LoginSchema', () => {
  it('acepta credenciales válidas', () => {
    const result = LoginSchema.safeParse({
      correo: 'admin@empresa.com',
      contrasena: 'Password123',
    });
    expect(result.success).toBe(true);
  });

  it('normaliza correo a minúsculas', () => {
    const result = LoginSchema.safeParse({
      correo: 'Admin@Empresa.COM',
      contrasena: 'Password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correo).toBe('admin@empresa.com');
    }
  });

  it('rechaza correo inválido', () => {
    const result = LoginSchema.safeParse({
      correo: 'not-an-email',
      contrasena: 'Password123',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña menor a 8 caracteres', () => {
    const result = LoginSchema.safeParse({
      correo: 'user@test.com',
      contrasena: 'Short1',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sin correo', () => {
    const result = LoginSchema.safeParse({ contrasena: 'Password123' });
    expect(result.success).toBe(false);
  });

  it('rechaza sin contraseña', () => {
    const result = LoginSchema.safeParse({ correo: 'user@test.com' });
    expect(result.success).toBe(false);
  });
});

// ─── RegistroSchema ───────────────────────────────────────

describe('RegistroSchema', () => {
  const registroValido = {
    nombre: 'Juan Pérez',
    correo: 'juan@empresa.com',
    contrasena: 'Segura123',
  };

  it('acepta registro mínimo (nombre + correo + contraseña)', () => {
    const result = RegistroSchema.safeParse(registroValido);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rol).toBe('CAJERO'); // default
    }
  });

  it('acepta registro completo con todos los campos', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      rol: 'REPARTIDOR',
      telefono: '5555555555',
      horarioInicio: '08:00',
      horarioFin: '18:00',
      diasLaborales: [1, 2, 3, 4, 5],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza contraseña sin mayúscula', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      contrasena: 'sinmayuscula1',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña sin minúscula', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      contrasena: 'SINMINUSCULA1',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña sin número', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      contrasena: 'SinNumero',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza rol inválido', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      rol: 'SUPERADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('acepta los 3 roles válidos', () => {
    for (const rol of ['ADMIN', 'CAJERO', 'REPARTIDOR']) {
      const result = RegistroSchema.safeParse({ ...registroValido, rol });
      expect(result.success).toBe(true);
    }
  });

  it('rechaza horario con formato inválido', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      horarioInicio: '8:00', // falta 0 leading
    });
    expect(result.success).toBe(false);
  });

  it('rechaza día laboral > 6', () => {
    const result = RegistroSchema.safeParse({
      ...registroValido,
      diasLaborales: [1, 2, 7],
    });
    expect(result.success).toBe(false);
  });

  it('normaliza nombre (trim) y correo (lowercase)', () => {
    const result = RegistroSchema.safeParse({
      nombre: '  María  ',
      correo: 'TEST@Email.COM',
      contrasena: 'Password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nombre).toBe('María');
      expect(result.data.correo).toBe('test@email.com');
    }
  });
});

// ─── RegistroPublicoSchema ────────────────────────────────

describe('RegistroPublicoSchema', () => {
  it('acepta auto-registro válido', () => {
    const result = RegistroPublicoSchema.safeParse({
      nombre: 'Pedro López',
      correo: 'pedro@nuevaempresa.com',
      contrasena: 'Empresa2026',
      nombreEmpresa: 'Mi Tienda S.A.',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sin nombre de empresa', () => {
    const result = RegistroPublicoSchema.safeParse({
      nombre: 'Pedro',
      correo: 'pedro@test.com',
      contrasena: 'Password123',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza nombre de empresa de 1 carácter', () => {
    const result = RegistroPublicoSchema.safeParse({
      nombre: 'Pedro',
      correo: 'pedro@test.com',
      contrasena: 'Password123',
      nombreEmpresa: 'X',
    });
    expect(result.success).toBe(false);
  });
});

// ─── CambiarPinSchema ─────────────────────────────────────

describe('CambiarPinSchema', () => {
  it('acepta PIN de 4 dígitos', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nuevoPin: '1234',
    });
    expect(result.success).toBe(true);
  });

  it('acepta PIN de 6 dígitos', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nuevoPin: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza PIN de 3 dígitos', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nuevoPin: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza PIN de 7 dígitos', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nuevoPin: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza PIN con letras', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nuevoPin: '12ab',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza usuarioId no-CUID', () => {
    const result = CambiarPinSchema.safeParse({
      usuarioId: 'not-a-cuid',
      nuevoPin: '1234',
    });
    expect(result.success).toBe(false);
  });
});
