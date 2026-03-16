/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  almacen: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
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

jest.mock('../../compartido/sanitizar', () => ({
  sanitizarObjeto: jest.fn((obj: any) => obj),
}));

// Import AFTER mocks
import { AlmacenesService } from './almacenes.service';

const empresaId = 'empresa-001';

const almacenBase = {
  id: 'alm-001',
  nombre: 'Almacen Principal',
  esPrincipal: true,
  activo: true,
  empresaId,
};

beforeEach(() => jest.clearAllMocks());

// ─── Crear ────────────────────────────────────────────────

describe('AlmacenesService.crear', () => {
  it('crea almacén exitosamente', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(null); // nombre libre
    mockPrisma.almacen.create.mockResolvedValue(almacenBase);

    const result = await AlmacenesService.crear(empresaId, {
      nombre: 'Almacen Principal',
    } as any);
    expect(result.nombre).toBe('Almacen Principal');
  });

  it('lanza ErrorConflicto si nombre duplicado', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenBase);

    await expect(
      AlmacenesService.crear(empresaId, { nombre: 'Almacen Principal' } as any),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('desactiva principal anterior si nuevo es principal', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(null);
    mockPrisma.almacen.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.almacen.create.mockResolvedValue({
      ...almacenBase,
      id: 'alm-002',
    });

    await AlmacenesService.crear(empresaId, {
      nombre: 'Nuevo Principal',
      esPrincipal: true,
    } as any);

    expect(mockPrisma.almacen.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId }),
        data: { esPrincipal: false },
      }),
    );
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('AlmacenesService.obtenerPorId', () => {
  it('retorna almacén con conteos', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenBase);
    const result = await AlmacenesService.obtenerPorId('alm-001', empresaId);
    expect(result).toEqual(almacenBase);
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(null);
    await expect(
      AlmacenesService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('AlmacenesService.actualizar', () => {
  it('actualiza nombre exitosamente', async () => {
    mockPrisma.almacen.findFirst
      .mockResolvedValueOnce(almacenBase) // existe
      .mockResolvedValueOnce(null); // nombre libre
    mockPrisma.almacen.update.mockResolvedValue({
      ...almacenBase,
      nombre: 'Nuevo',
    });

    const result = await AlmacenesService.actualizar(
      'alm-001',
      empresaId,
      { nombre: 'Nuevo' } as any,
    );
    expect(result.nombre).toBe('Nuevo');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(null);
    await expect(
      AlmacenesService.actualizar('no-existe', empresaId, { nombre: 'X' } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorConflicto si nombre duplicado', async () => {
    mockPrisma.almacen.findFirst
      .mockResolvedValueOnce(almacenBase) // existe
      .mockResolvedValueOnce({ id: 'otro' }); // nombre ya existe

    await expect(
      AlmacenesService.actualizar('alm-001', empresaId, {
        nombre: 'Duplicado',
      } as any),
    ).rejects.toThrow(ErrorConflicto);
  });
});

// ─── Eliminar (soft delete) ──────────────────────────────

describe('AlmacenesService.eliminar', () => {
  it('desactiva almacén sin existencias', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue({
      ...almacenBase,
      esPrincipal: false,
      _count: { existencias: 0 },
    });
    mockPrisma.almacen.update.mockResolvedValue({});

    await AlmacenesService.eliminar('alm-001', empresaId);
    expect(mockPrisma.almacen.update).toHaveBeenCalled();
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue(null);
    await expect(
      AlmacenesService.eliminar('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza eliminar almacén principal', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue({
      ...almacenBase,
      esPrincipal: true,
      _count: { existencias: 0 },
    });

    await expect(
      AlmacenesService.eliminar('alm-001', empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('rechaza eliminar almacén con existencias', async () => {
    mockPrisma.almacen.findFirst.mockResolvedValue({
      ...almacenBase,
      esPrincipal: false,
      _count: { existencias: 5 },
    });

    await expect(
      AlmacenesService.eliminar('alm-001', empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('AlmacenesService.listar', () => {
  it('retorna almacenes paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.almacen.findMany.mockResolvedValue([almacenBase]);
    mockPrisma.almacen.count.mockResolvedValue(1);

    const result = await AlmacenesService.listar(empresaId, {
      pagina: 1,
      limite: 20,
    } as any);
    expect((result as any).datos).toHaveLength(1);
  });
});
