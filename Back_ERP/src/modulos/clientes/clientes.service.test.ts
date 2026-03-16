/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorNoEncontrado, ErrorNegocio } from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  cliente: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { CLIENTES: 120 },
  invalidarCacheModulo: jest.fn(),
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../compartido/paginacion', () => ({
  paginar: jest.fn().mockReturnValue({ skip: 0, take: 20 }),
  construirMeta: jest.fn().mockReturnValue({ total: 0, pagina: 1, limite: 20, totalPaginas: 0 }),
}));

jest.mock('../../compartido/sanitizar', () => ({
  sanitizarObjeto: jest.fn((obj: any) => obj),
}));

// Import service AFTER mocks
import { ClientesService } from './clientes.service';

const empresaId = 'empresa-001';

const clienteBase = {
  id: 'cli-001',
  nombre: 'Juan Pérez',
  telefono: '5551234567',
  correo: 'juan@test.com',
  limiteCredito: 5000,
  creditoUtilizado: 0,
  diasCredito: 30,
  activo: true,
  empresaId,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Crear ────────────────────────────────────────────────

describe('ClientesService.crear', () => {
  it('crea cliente exitosamente', async () => {
    mockPrisma.cliente.create.mockResolvedValue(clienteBase);

    const result = await ClientesService.crear(empresaId, {
      nombre: 'Juan Pérez',
      telefono: '5551234567',
    } as any);

    expect(result.nombre).toBe('Juan Pérez');
    expect(mockPrisma.cliente.create).toHaveBeenCalled();
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('ClientesService.obtenerPorId', () => {
  it('retorna cliente con relaciones', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(clienteBase);

    const result = await ClientesService.obtenerPorId('cli-001', empresaId);
    expect(result.nombre).toBe('Juan Pérez');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      ClientesService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('ClientesService.actualizar', () => {
  it('actualiza cliente exitosamente', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(clienteBase);
    mockPrisma.cliente.update.mockResolvedValue({ ...clienteBase, nombre: 'Juan Actualizado' });

    const result = await ClientesService.actualizar('cli-001', empresaId, { nombre: 'Juan Actualizado' } as any);
    expect(result.nombre).toBe('Juan Actualizado');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      ClientesService.actualizar('no-existe', empresaId, { nombre: 'X' } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Eliminar (soft delete) ──────────────────────────────

describe('ClientesService.eliminar', () => {
  it('desactiva cliente sin crédito pendiente', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue({ ...clienteBase, creditoUtilizado: 0 });
    mockPrisma.cliente.update.mockResolvedValue({});

    await ClientesService.eliminar('cli-001', empresaId);
    expect(mockPrisma.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { activo: false },
      }),
    );
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      ClientesService.eliminar('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza eliminar cliente con crédito pendiente', async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue({
      ...clienteBase,
      creditoUtilizado: 1500,
    });

    await expect(
      ClientesService.eliminar('cli-001', empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('ClientesService.listar', () => {
  it('retorna clientes paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.cliente.findMany.mockResolvedValue([clienteBase]);
    mockPrisma.cliente.count.mockResolvedValue(1);

    const result = await ClientesService.listar(empresaId, {
      pagina: 1,
      limite: 20,
      ordenarPor: 'nombre',
      direccionOrden: 'asc',
    } as any);

    expect((result as any).datos).toHaveLength(1);
  });

  it('retorna cache si disponible', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue({ datos: [clienteBase], meta: {} });

    const result = await ClientesService.listar(empresaId, {
      pagina: 1,
      limite: 20,
      ordenarPor: 'nombre',
      direccionOrden: 'asc',
    } as any);

    expect(mockPrisma.cliente.findMany).not.toHaveBeenCalled();
  });
});
