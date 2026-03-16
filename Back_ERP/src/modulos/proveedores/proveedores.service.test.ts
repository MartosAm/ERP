/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  proveedor: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { PROVEEDORES: 300 },
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
import { ProveedoresService } from './proveedores.service';

const empresaId = 'empresa-001';

const proveedorBase = {
  id: 'prov-001',
  nombre: 'Distribuidora Norte',
  nombreContacto: 'Carlos',
  telefono: '5551234567',
  correo: 'carlos@dist.com',
  activo: true,
  empresaId,
};

beforeEach(() => jest.clearAllMocks());

// ─── Crear ────────────────────────────────────────────────

describe('ProveedoresService.crear', () => {
  it('crea proveedor exitosamente', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(null);
    mockPrisma.proveedor.create.mockResolvedValue(proveedorBase);

    const result = await ProveedoresService.crear(empresaId, {
      nombre: 'Distribuidora Norte',
    } as any);
    expect(result.nombre).toBe('Distribuidora Norte');
  });

  it('lanza ErrorConflicto si nombre duplicado', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorBase);

    await expect(
      ProveedoresService.crear(empresaId, {
        nombre: 'Distribuidora Norte',
      } as any),
    ).rejects.toThrow(ErrorConflicto);
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('ProveedoresService.obtenerPorId', () => {
  it('retorna proveedor con conteos', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorBase);
    const result = await ProveedoresService.obtenerPorId(
      'prov-001',
      empresaId,
    );
    expect(result.nombre).toBe('Distribuidora Norte');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(null);
    await expect(
      ProveedoresService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('ProveedoresService.actualizar', () => {
  it('actualiza proveedor exitosamente', async () => {
    mockPrisma.proveedor.findFirst
      .mockResolvedValueOnce(proveedorBase) // existe
      .mockResolvedValueOnce(null); // nombre libre
    mockPrisma.proveedor.update.mockResolvedValue({
      ...proveedorBase,
      nombre: 'Nuevo Nombre',
    });

    const result = await ProveedoresService.actualizar(
      'prov-001',
      empresaId,
      { nombre: 'Nuevo Nombre' } as any,
    );
    expect(result.nombre).toBe('Nuevo Nombre');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(null);
    await expect(
      ProveedoresService.actualizar('no-existe', empresaId, {
        nombre: 'X',
      } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorConflicto si nombre duplicado', async () => {
    mockPrisma.proveedor.findFirst
      .mockResolvedValueOnce(proveedorBase)
      .mockResolvedValueOnce({ id: 'otro' });

    await expect(
      ProveedoresService.actualizar('prov-001', empresaId, {
        nombre: 'Otro Existente',
      } as any),
    ).rejects.toThrow(ErrorConflicto);
  });
});

// ─── Eliminar (soft delete) ──────────────────────────────

describe('ProveedoresService.eliminar', () => {
  it('desactiva proveedor sin productos', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue({
      ...proveedorBase,
      _count: { productos: 0 },
    });
    mockPrisma.proveedor.update.mockResolvedValue({});

    await ProveedoresService.eliminar('prov-001', empresaId);
    expect(mockPrisma.proveedor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } }),
    );
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(null);
    await expect(
      ProveedoresService.eliminar('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza eliminar proveedor con productos asociados', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue({
      ...proveedorBase,
      _count: { productos: 3 },
    });

    await expect(
      ProveedoresService.eliminar('prov-001', empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('ProveedoresService.listar', () => {
  it('retorna proveedores paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.proveedor.findMany.mockResolvedValue([proveedorBase]);
    mockPrisma.proveedor.count.mockResolvedValue(1);

    const result = await ProveedoresService.listar(empresaId, {
      pagina: 1,
      limite: 20,
      ordenarPor: 'nombre',
      direccionOrden: 'asc',
    } as any);
    expect((result as any).datos).toHaveLength(1);
  });
});
