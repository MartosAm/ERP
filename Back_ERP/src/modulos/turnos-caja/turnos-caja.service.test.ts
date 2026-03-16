/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorNegocio,
  ErrorConflicto,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  turnoCaja: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  cajaRegistradora: { findFirst: jest.fn() },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { ALMACENES: 600 },
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
import { TurnosCajaService } from './turnos-caja.service';

const empresaId = 'empresa-001';
const usuarioId = 'user-001';

const cajaRegistradora = {
  id: 'caja-001',
  nombre: 'Caja 1',
  activo: true,
  empresaId,
};

const turnoAbierto = {
  id: 'turno-001',
  usuarioId,
  cajaRegistradoraId: 'caja-001',
  montoApertura: 500,
  cerradaEn: null,
  notas: null,
  cajaRegistradora,
  usuario: { id: usuarioId, nombre: 'Admin' },
};

beforeEach(() => jest.clearAllMocks());

// ─── Abrir Turno ──────────────────────────────────────────

describe('TurnosCajaService.abrir', () => {
  it('abre turno exitosamente', async () => {
    mockPrisma.cajaRegistradora.findFirst.mockResolvedValue(cajaRegistradora);
    mockPrisma.turnoCaja.findFirst
      .mockResolvedValueOnce(null) // no turno abierto en caja
      .mockResolvedValueOnce(null); // usuario sin turno abierto
    mockPrisma.turnoCaja.create.mockResolvedValue(turnoAbierto);

    const result = await TurnosCajaService.abrir(
      { cajaRegistradoraId: 'caja-001', montoApertura: 500 } as any,
      usuarioId,
      empresaId,
    );
    expect(result.montoApertura).toBe(500);
  });

  it('lanza ErrorNoEncontrado si caja no existe', async () => {
    mockPrisma.cajaRegistradora.findFirst.mockResolvedValue(null);

    await expect(
      TurnosCajaService.abrir(
        { cajaRegistradoraId: 'no-existe', montoApertura: 500 } as any,
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza si ya hay turno abierto en la caja', async () => {
    mockPrisma.cajaRegistradora.findFirst.mockResolvedValue(cajaRegistradora);
    mockPrisma.turnoCaja.findFirst.mockResolvedValueOnce(turnoAbierto); // caja ocupada

    await expect(
      TurnosCajaService.abrir(
        { cajaRegistradoraId: 'caja-001', montoApertura: 500 } as any,
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('rechaza si usuario ya tiene turno abierto en otra caja', async () => {
    mockPrisma.cajaRegistradora.findFirst.mockResolvedValue(cajaRegistradora);
    mockPrisma.turnoCaja.findFirst
      .mockResolvedValueOnce(null) // caja libre
      .mockResolvedValueOnce(turnoAbierto); // usuario con turno en otra caja

    await expect(
      TurnosCajaService.abrir(
        { cajaRegistradoraId: 'caja-001', montoApertura: 500 } as any,
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow(ErrorConflicto);
  });
});

// ─── Cerrar Turno ─────────────────────────────────────────

describe('TurnosCajaService.cerrar', () => {
  it('lanza ErrorNoEncontrado si turno no existe', async () => {
    mockPrisma.turnoCaja.findUnique.mockResolvedValue(null);

    await expect(
      TurnosCajaService.cerrar(
        'no-existe',
        { montoCierre: 1000 } as any,
        usuarioId,
        'ADMIN',
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza cerrar turno ya cerrado', async () => {
    mockPrisma.turnoCaja.findUnique.mockResolvedValue({
      ...turnoAbierto,
      cerradaEn: new Date(),
    });

    await expect(
      TurnosCajaService.cerrar(
        'turno-001',
        { montoCierre: 1000 } as any,
        usuarioId,
        'ADMIN',
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('rechaza cierre por usuario no propietario (no ADMIN)', async () => {
    mockPrisma.turnoCaja.findUnique.mockResolvedValue({
      ...turnoAbierto,
      ordenes: [],
    });

    await expect(
      TurnosCajaService.cerrar(
        'turno-001',
        { montoCierre: 1000 } as any,
        'otro-usuario',
        'CAJERO',
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('cierra turno exitosamente con cálculo de efectivo', async () => {
    mockPrisma.turnoCaja.findUnique.mockResolvedValue({
      ...turnoAbierto,
      ordenes: [
        {
          total: 100,
          cambio: 10,
          metodoPago: 'EFECTIVO',
          pagado: true,
          pagos: [{ metodo: 'EFECTIVO', monto: 100 }],
        },
      ],
    });
    mockPrisma.turnoCaja.update.mockResolvedValue({
      ...turnoAbierto,
      cerradaEn: new Date(),
      montoCierre: 600,
    });

    const result = await TurnosCajaService.cerrar(
      'turno-001',
      { montoCierre: 600 } as any,
      usuarioId,
      'ADMIN',
    );
    expect(result.cerradaEn).toBeTruthy();
  });
});

// ─── Obtener Turno Activo ─────────────────────────────────

describe('TurnosCajaService.obtenerTurnoActivo', () => {
  it('retorna el turno activo del usuario', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoAbierto);
    const result = await TurnosCajaService.obtenerTurnoActivo(usuarioId);
    expect(result).toEqual(turnoAbierto);
  });

  it('retorna null si no tiene turno activo', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(null);
    const result = await TurnosCajaService.obtenerTurnoActivo(usuarioId);
    expect(result).toBeNull();
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('TurnosCajaService.obtenerPorId', () => {
  it('retorna turno con detalles', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoAbierto);
    const result = await TurnosCajaService.obtenerPorId(
      'turno-001',
      empresaId,
    );
    expect(result).toEqual(turnoAbierto);
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(null);
    await expect(
      TurnosCajaService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('TurnosCajaService.listar', () => {
  it('retorna turnos paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.turnoCaja.findMany.mockResolvedValue([turnoAbierto]);
    mockPrisma.turnoCaja.count.mockResolvedValue(1);

    const result = await TurnosCajaService.listar(
      { pagina: 1, limite: 20 } as any,
      empresaId,
    );
    expect((result as any).datos).toHaveLength(1);
  });
});
