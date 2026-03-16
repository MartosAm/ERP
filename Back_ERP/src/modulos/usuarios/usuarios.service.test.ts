/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorNoEncontrado, ErrorNegocio } from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  usuario: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  sesion: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { CATEGORIAS: 300 },
  invalidarCacheModulo: jest.fn(),
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../compartido/paginacion', () => ({
  paginar: jest.fn().mockReturnValue({ skip: 0, take: 20 }),
  construirMeta: jest
    .fn()
    .mockReturnValue({ total: 0, pagina: 1, limite: 20, totalPaginas: 0 }),
}));

// Import AFTER mocks
import { UsuariosService } from './usuarios.service';

const empresaId = 'empresa-001';

const usuarioBase = {
  id: 'user-001',
  nombre: 'Juan Pérez',
  correo: 'juan@test.com',
  telefono: '5551234567',
  rol: 'CAJERO',
  activo: true,
  empresaId,
  horarioInicio: null,
  horarioFin: null,
  diasLaborales: [],
};

beforeEach(() => jest.clearAllMocks());

// ─── Obtener por ID ───────────────────────────────────────

describe('UsuariosService.obtenerPorId', () => {
  it('retorna usuario con conteos', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);
    const result = await UsuariosService.obtenerPorId('user-001', empresaId);
    expect(result.nombre).toBe('Juan Pérez');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      UsuariosService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('UsuariosService.actualizar', () => {
  it('actualiza nombre exitosamente', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);
    mockPrisma.usuario.update.mockResolvedValue({
      ...usuarioBase,
      nombre: 'Juan Actualizado',
    });

    const result = await UsuariosService.actualizar(
      'user-001',
      { nombre: 'Juan Actualizado' } as any,
      empresaId,
    );
    expect(result.nombre).toBe('Juan Actualizado');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      UsuariosService.actualizar('no-existe', { nombre: 'X' } as any, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Asignar Horario ──────────────────────────────────────

describe('UsuariosService.asignarHorario', () => {
  it('asigna horario a cajero exitosamente', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);
    mockPrisma.usuario.update.mockResolvedValue({
      ...usuarioBase,
      horarioInicio: '08:00',
      horarioFin: '17:00',
      diasLaborales: [1, 2, 3, 4, 5],
    });

    const result = await UsuariosService.asignarHorario(
      'user-001',
      {
        horarioInicio: '08:00',
        horarioFin: '17:00',
        diasLaborales: [1, 2, 3, 4, 5],
      } as any,
      empresaId,
    );
    expect(result.horarioInicio).toBe('08:00');
  });

  it('lanza ErrorNoEncontrado si usuario no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      UsuariosService.asignarHorario(
        'no-existe',
        { horarioInicio: '08:00' } as any,
        empresaId,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza asignar horario a ADMIN', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      ...usuarioBase,
      rol: 'ADMIN',
    });

    await expect(
      UsuariosService.asignarHorario(
        'user-001',
        { horarioInicio: '08:00', horarioFin: '17:00' } as any,
        empresaId,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Cambiar Estado ───────────────────────────────────────

describe('UsuariosService.cambiarEstado', () => {
  it('desactiva usuario con cierre de sesiones (transacción)', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);
    mockPrisma.$transaction.mockResolvedValue({ ...usuarioBase, activo: false });

    const result = await UsuariosService.cambiarEstado(
      'user-001',
      { activo: false } as any,
      'admin-001',
      empresaId,
    );
    expect(result.activo).toBe(false);
  });

  it('lanza ErrorNoEncontrado si usuario no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      UsuariosService.cambiarEstado(
        'no-existe',
        { activo: false } as any,
        'admin-001',
        empresaId,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza auto-desactivación', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);

    await expect(
      UsuariosService.cambiarEstado(
        'user-001',
        { activo: false } as any,
        'user-001', // mismo usuario
        empresaId,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('rechaza activar usuario ya activo', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({
      ...usuarioBase,
      activo: true,
    });

    await expect(
      UsuariosService.cambiarEstado(
        'user-001',
        { activo: true } as any,
        'admin-001',
        empresaId,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Cerrar Sesiones ──────────────────────────────────────

describe('UsuariosService.cerrarSesiones', () => {
  it('cierra todas las sesiones activas', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(usuarioBase);
    mockPrisma.sesion.updateMany.mockResolvedValue({ count: 3 });

    const result = await UsuariosService.cerrarSesiones('user-001', empresaId);
    expect(result.sesionesCerradas).toBe(3);
  });

  it('lanza ErrorNoEncontrado si usuario no existe', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      UsuariosService.cerrarSesiones('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('UsuariosService.listar', () => {
  it('retorna usuarios paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.usuario.findMany.mockResolvedValue([usuarioBase]);
    mockPrisma.usuario.count.mockResolvedValue(1);

    const result = await UsuariosService.listar(
      { pagina: 1, limite: 20 } as any,
      empresaId,
    );
    expect((result as any).datos).toHaveLength(1);
  });
});
