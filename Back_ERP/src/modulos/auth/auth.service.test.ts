/**
 * Tests unitarios: auth.service.ts
 * Valida la lógica de autenticación: registro, login (brute force, horario),
 * logout, cambio de PIN, y cálculo de expiración JWT.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoAutorizado,
  ErrorAcceso,
  ErrorNoEncontrado,
  ErrorConflicto,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sesion: {
    create: jest.fn(),
    update: jest.fn(),
  },
  empresa: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

jest.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key-for-testing',
    JWT_EXPIRES_IN: '8h',
    BCRYPT_SALT_ROUNDS: 4, // bajo para velocidad en tests
  },
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$04$hashedpassword'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

import { AuthService } from './auth.service';
import bcrypt from 'bcrypt';

const bcryptCompare = bcrypt.compare as jest.MockedFunction<any>;

// ─── Datos base ───────────────────────────────────────────

const empresaId = 'empresa-001';
const usuarioActivo = {
  id: 'user-001',
  nombre: 'Admin Test',
  correo: 'admin@test.com',
  hashContrasena: '$2b$04$hashedpassword',
  rol: 'ADMIN',
  activo: true,
  intentosFallidos: 0,
  bloqueadoHasta: null,
  avatarUrl: null,
  empresaId,
  horarioInicio: null,
  horarioFin: null,
  diasLaborales: [],
  empresa: { id: empresaId, nombre: 'Test Inc', activo: true },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Registro ─────────────────────────────────────────────

describe('AuthService.registrar', () => {
  const dtoRegistro = {
    nombre: 'Nuevo Cajero',
    correo: 'cajero@test.com',
    contrasena: 'Segura123',
    rol: 'CAJERO' as const,
  };

  it('registra usuario nuevo correctamente', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 'user-new',
      nombre: 'Nuevo Cajero',
      correo: 'cajero@test.com',
      rol: 'CAJERO',
      activo: true,
      creadoEn: new Date(),
    });

    const result = await AuthService.registrar(dtoRegistro, empresaId);

    expect(result.nombre).toBe('Nuevo Cajero');
    expect(result.rol).toBe('CAJERO');
    expect(mockPrisma.usuario.create).toHaveBeenCalled();
  });

  it('lanza ErrorConflicto si el correo ya existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(usuarioActivo);

    await expect(AuthService.registrar(dtoRegistro, empresaId))
      .rejects.toThrow(ErrorConflicto);
    await expect(AuthService.registrar(dtoRegistro, empresaId))
      .rejects.toThrow('Ya existe un usuario con ese correo');
  });
});

// ─── Registro Publico ────────────────────────────────────

describe('AuthService.registroPublico', () => {
  const dtoRegistroPublico = {
    nombreEmpresa: 'Empresa Nueva',
    nombre: 'Admin Nuevo',
    correo: 'nuevo-admin@test.com',
    contrasena: 'Segura123',
    telefono: '555-0101',
  };

  it('lanza ErrorConflicto si el correo ya existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(usuarioActivo);

    await expect(AuthService.registroPublico(dtoRegistroPublico))
      .rejects.toThrow(ErrorConflicto);
  });

  it('crea empresa + usuario admin y retorna token con sesion', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    const mockTx = {
      empresa: { create: jest.fn() },
      usuario: { create: jest.fn() },
    };

    mockTx.empresa.create.mockResolvedValue({
      id: 'emp-new',
      nombre: 'Empresa Nueva',
      telefono: '555-0101',
    });

    mockTx.usuario.create.mockResolvedValue({
      id: 'user-new-admin',
      empresaId: 'emp-new',
      nombre: 'Admin Nuevo',
      correo: 'nuevo-admin@test.com',
      rol: 'ADMIN',
      avatarUrl: null,
    });

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    mockPrisma.sesion.create.mockResolvedValue({ id: 'sesion-new' });
    mockPrisma.sesion.update.mockResolvedValue({});

    const result = await AuthService.registroPublico(
      dtoRegistroPublico,
      '127.0.0.1',
      'Jest-Agent',
    );

    expect(result.token).toBe('mock-jwt-token');
    expect(result.usuario.id).toBe('user-new-admin');
    expect(result.usuario.empresa.id).toBe('emp-new');
    expect(result.usuario.empresa.nombre).toBe('Empresa Nueva');

    expect(mockTx.empresa.create).toHaveBeenCalled();
    expect(mockTx.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'emp-new',
          rol: 'ADMIN',
          correo: 'nuevo-admin@test.com',
        }),
      }),
    );

    expect(mockPrisma.sesion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 'user-new-admin',
          token: '',
          direccionIp: '127.0.0.1',
          agenteUsuario: 'Jest-Agent',
          activo: true,
        }),
      }),
    );
    expect(mockPrisma.sesion.update).toHaveBeenCalled();
  });
});

// ─── Login ────────────────────────────────────────────────

describe('AuthService.login', () => {
  const dtoLogin = { correo: 'admin@test.com', contrasena: 'Admin12345' };

  it('login exitoso retorna token y usuario', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(usuarioActivo);
    bcryptCompare.mockResolvedValue(true as never);
    mockPrisma.usuario.update.mockResolvedValue(usuarioActivo);
    mockPrisma.sesion.create.mockResolvedValue({ id: 'sesion-001' });
    mockPrisma.sesion.update.mockResolvedValue({});

    const result = await AuthService.login(dtoLogin);

    expect(result.token).toBeDefined();
    expect(result.usuario.correo).toBe('admin@test.com');
    expect(result.usuario.empresa.nombre).toBe('Test Inc');
  });

  it('lanza ErrorNoAutorizado si usuario no existe (msg genérico)', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(ErrorNoAutorizado);
    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow('Credenciales invalidas');
  });

  it('lanza ErrorNoAutorizado si usuario está inactivo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      activo: false,
    });

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(ErrorNoAutorizado);
  });

  it('lanza ErrorNoAutorizado si empresa está desactivada', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      empresa: { id: empresaId, nombre: 'Test Inc', activo: false },
    });

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow('La empresa esta desactivada');
  });

  it('lanza ErrorAcceso si cuenta está bloqueada', async () => {
    const futuro = new Date(Date.now() + 30 * 60 * 1000); // 30min en el futuro
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      bloqueadoHasta: futuro,
    });

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(ErrorAcceso);
    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(/Cuenta bloqueada/);
  });

  it('incrementa intentosFallidos en contraseña incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      intentosFallidos: 2,
    });
    bcryptCompare.mockResolvedValue(false as never);
    mockPrisma.usuario.update.mockResolvedValue({});

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(ErrorNoAutorizado);

    // Verificar que se incrementó el contador
    const updateCall = mockPrisma.usuario.update.mock.calls[0][0] as any;
    expect(updateCall.data.intentosFallidos).toBe(3);
  });

  it('bloquea cuenta al alcanzar 5 intentos fallidos', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      intentosFallidos: 4, // próximo intento = 5 → bloqueo
    });
    bcryptCompare.mockResolvedValue(false as never);
    mockPrisma.usuario.update.mockResolvedValue({});

    await expect(AuthService.login(dtoLogin))
      .rejects.toThrow(ErrorNoAutorizado);

    const updateCall = mockPrisma.usuario.update.mock.calls[0][0] as any;
    expect(updateCall.data.intentosFallidos).toBe(5);
    expect(updateCall.data.bloqueadoHasta).toBeDefined();
  });

  it('resetea intentosFallidos en login exitoso', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      intentosFallidos: 3,
    });
    bcryptCompare.mockResolvedValue(true as never);
    mockPrisma.usuario.update.mockResolvedValue(usuarioActivo);
    mockPrisma.sesion.create.mockResolvedValue({ id: 'sesion-001' });
    mockPrisma.sesion.update.mockResolvedValue({});

    await AuthService.login(dtoLogin);

    // El primer update resetea intentos
    const updateCall = mockPrisma.usuario.update.mock.calls[0][0] as any;
    expect(updateCall.data.intentosFallidos).toBe(0);
    expect(updateCall.data.bloqueadoHasta).toBeNull();
  });

  it('valida horario laboral para usuario no ADMIN', async () => {
    const verificarSpy = jest
      .spyOn(AuthService, 'verificarHorarioLaboral')
      .mockImplementation(() => undefined);

    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      rol: 'CAJERO',
      horarioInicio: '08:00',
      horarioFin: '18:00',
      diasLaborales: [1, 2, 3, 4, 5],
    });
    bcryptCompare.mockResolvedValue(true as never);
    mockPrisma.usuario.update.mockResolvedValue(usuarioActivo);
    mockPrisma.sesion.create.mockResolvedValue({ id: 'sesion-001' });
    mockPrisma.sesion.update.mockResolvedValue({});

    await AuthService.login(dtoLogin);

    expect(verificarSpy).toHaveBeenCalledTimes(1);
    verificarSpy.mockRestore();
  });

  it('rechaza login de usuario no ADMIN fuera de horario', async () => {
    const verificarSpy = jest
      .spyOn(AuthService, 'verificarHorarioLaboral')
      .mockImplementation(() => {
        throw new ErrorAcceso('Acceso permitido de 08:00 a 18:00');
      });

    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      rol: 'REPARTIDOR',
      horarioInicio: '08:00',
      horarioFin: '18:00',
      diasLaborales: [1, 2, 3, 4, 5],
    });
    bcryptCompare.mockResolvedValue(true as never);

    await expect(AuthService.login(dtoLogin)).rejects.toThrow(ErrorAcceso);
    expect(mockPrisma.sesion.create).not.toHaveBeenCalled();

    verificarSpy.mockRestore();
  });
});

// ─── Verificar Horario ────────────────────────────────────

describe('AuthService.verificarHorarioLaboral', () => {
  it('permite acceso cuando no hay horario configurado', () => {
    expect(() => AuthService.verificarHorarioLaboral({
      horarioInicio: null,
      horarioFin: null,
      diasLaborales: [],
    })).not.toThrow();
  });

  it('permite acceso cuando horarioInicio es null', () => {
    expect(() => AuthService.verificarHorarioLaboral({
      horarioInicio: null,
      horarioFin: '18:00',
      diasLaborales: [],
    })).not.toThrow();
  });

  it('rechaza acceso en dia no permitido', () => {
    const diaActual = new Date().getDay();
    const diaDistinto = (diaActual + 1) % 7;

    expect(() => AuthService.verificarHorarioLaboral({
      horarioInicio: '08:00',
      horarioFin: '18:00',
      diasLaborales: [diaDistinto],
    })).toThrow(ErrorAcceso);
  });

  it('rechaza acceso fuera del horario permitido', () => {
    const ahora = new Date();
    const diaActual = ahora.getDay();
    const hora = ahora.getHours();

    // Construye una ventana futura que no contiene la hora actual.
    const inicio = String((hora + 1) % 24).padStart(2, '0') + ':00';
    const fin = String((hora + 2) % 24).padStart(2, '0') + ':00';

    expect(() => AuthService.verificarHorarioLaboral({
      horarioInicio: inicio,
      horarioFin: fin,
      diasLaborales: [diaActual],
    })).toThrow(/Acceso permitido/);
  });

  it('permite acceso en dia y horario validos', () => {
    const diaActual = new Date().getDay();

    expect(() => AuthService.verificarHorarioLaboral({
      horarioInicio: '00:00',
      horarioFin: '23:59',
      diasLaborales: [diaActual],
    })).not.toThrow();
  });
});

// ─── Perfil ───────────────────────────────────────────────

describe('AuthService.obtenerPerfil', () => {
  it('retorna perfil de usuario activo en su empresa', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      id: 'user-001',
      nombre: 'Admin Test',
      correo: 'admin@test.com',
      rol: 'ADMIN',
      telefono: null,
      avatarUrl: null,
      horarioInicio: null,
      horarioFin: null,
      diasLaborales: [],
      ultimoLoginEn: new Date(),
      creadoEn: new Date(),
      empresa: {
        id: empresaId,
        nombre: 'Test Inc',
        moneda: 'MXN',
        tasaImpuesto: 16,
      },
    });

    const perfil = await AuthService.obtenerPerfil('user-001', empresaId);

    expect(perfil.id).toBe('user-001');
    expect(perfil.empresa.nombre).toBe('Test Inc');
  });

  it('lanza ErrorNoEncontrado cuando no existe usuario activo', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);

    await expect(AuthService.obtenerPerfil('no-existe', empresaId))
      .rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Calcular Expiración JWT ──────────────────────────────

describe('AuthService.calcularExpiracionJWT', () => {
  it('parsea "8h" correctamente', () => {
    const exp = AuthService.calcularExpiracionJWT('8h');
    const diff = exp.getTime() - Date.now();
    // Debería ser ~8 horas (28800000ms) con margen de 5 segundos
    expect(diff).toBeGreaterThan(28795000);
    expect(diff).toBeLessThan(28805000);
  });

  it('parsea "30m" (minutos)', () => {
    const exp = AuthService.calcularExpiracionJWT('30m');
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(1795000);
    expect(diff).toBeLessThan(1805000);
  });

  it('parsea "1d" (día)', () => {
    const exp = AuthService.calcularExpiracionJWT('1d');
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(86395000);
    expect(diff).toBeLessThan(86405000);
  });

  it('parsea "3600s" (segundos)', () => {
    const exp = AuthService.calcularExpiracionJWT('3600s');
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(3595000);
    expect(diff).toBeLessThan(3605000);
  });

  it('fallback a 8 horas en formato inválido', () => {
    const exp = AuthService.calcularExpiracionJWT('invalid');
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(28795000);
    expect(diff).toBeLessThan(28805000);
  });
});

// ─── Logout ───────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('desactiva la sesión', async () => {
    mockPrisma.sesion.update.mockResolvedValue({});

    await AuthService.logout('sesion-001');

    expect(mockPrisma.sesion.update).toHaveBeenCalledWith({
      where: { id: 'sesion-001' },
      data: { activo: false },
    });
  });
});

// ─── Cambiar PIN ──────────────────────────────────────────

describe('AuthService.cambiarPin', () => {
  it('cambia PIN de usuario existente', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioActivo);
    mockPrisma.usuario.update.mockResolvedValue({});

    await AuthService.cambiarPin(
      { usuarioId: 'user-001', nuevoPin: '1234' },
      empresaId,
    );

    expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'user-001' },
      data: { hashPin: '$2b$04$hashedpassword' },
    });
  });

  it('lanza ErrorNoEncontrado si usuario no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      AuthService.cambiarPin({ usuarioId: 'no-existe', nuevoPin: '1234' }, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});
