/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  categoria: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
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

jest.mock('../../compartido/sanitizar', () => ({
  sanitizarObjeto: jest.fn((obj: any) => obj),
}));

// Import AFTER mocks
import { CategoriasService } from './categorias.service';

const empresaId = 'empresa-001';

const categoriaBase = {
  id: 'cat-001',
  nombre: 'Bebidas',
  descripcion: null,
  padreId: null,
  orden: 0,
  activo: true,
  empresaId,
};

beforeEach(() => jest.clearAllMocks());

// ─── Crear ────────────────────────────────────────────────

describe('CategoriasService.crear', () => {
  it('crea categoría raíz exitosamente', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(null); // nombre libre
    mockPrisma.categoria.create.mockResolvedValue(categoriaBase);

    const result = await CategoriasService.crear(empresaId, {
      nombre: 'Bebidas',
    } as any);
    expect(result.nombre).toBe('Bebidas');
  });

  it('lanza ErrorConflicto si nombre duplicado en mismo padre', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(categoriaBase);

    await expect(
      CategoriasService.crear(empresaId, { nombre: 'Bebidas' } as any),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('valida que padre exista si se proporciona padreId', async () => {
    mockPrisma.categoria.findFirst
      .mockResolvedValueOnce(null) // nombre libre
      .mockResolvedValueOnce(null); // padre no existe

    await expect(
      CategoriasService.crear(empresaId, {
        nombre: 'Subcategoria',
        padreId: 'cat-999',
      } as any),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('CategoriasService.obtenerPorId', () => {
  it('retorna categoría con hijos', async () => {
    const conHijos = {
      ...categoriaBase,
      padre: null,
      hijos: [{ id: 'cat-002', nombre: 'Refrescos' }],
    };
    mockPrisma.categoria.findFirst.mockResolvedValue(conHijos);

    const result = await CategoriasService.obtenerPorId('cat-001', empresaId);
    expect(result.hijos).toHaveLength(1);
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(null);
    await expect(
      CategoriasService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('CategoriasService.actualizar', () => {
  it('actualiza nombre exitosamente', async () => {
    mockPrisma.categoria.findFirst
      .mockResolvedValueOnce(categoriaBase) // existe
      .mockResolvedValueOnce(null); // nombre libre
    mockPrisma.categoria.update.mockResolvedValue({
      ...categoriaBase,
      nombre: 'Lácteos',
    });

    const result = await CategoriasService.actualizar(
      'cat-001',
      empresaId,
      { nombre: 'Lácteos' } as any,
    );
    expect(result.nombre).toBe('Lácteos');
  });

  it('lanza ErrorNoEncontrado si categoría no existe', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(null);
    await expect(
      CategoriasService.actualizar('no-existe', empresaId, {
        nombre: 'X',
      } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('previene auto-referencia (padreId === id)', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(categoriaBase);

    await expect(
      CategoriasService.actualizar('cat-001', empresaId, {
        padreId: 'cat-001',
      } as any),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Eliminar ─────────────────────────────────────────────

describe('CategoriasService.eliminar', () => {
  it('desactiva categoría sin productos (con transacción)', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue({
      ...categoriaBase,
      _count: { productos: 0 },
    });
    mockPrisma.$transaction.mockResolvedValue(undefined);

    await CategoriasService.eliminar('cat-001', empresaId);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue(null);
    await expect(
      CategoriasService.eliminar('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza eliminar categoría con productos asociados', async () => {
    mockPrisma.categoria.findFirst.mockResolvedValue({
      ...categoriaBase,
      _count: { productos: 5 },
    });

    await expect(
      CategoriasService.eliminar('cat-001', empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Obtener Árbol ────────────────────────────────────────

describe('CategoriasService.obtenerArbol', () => {
  it('retorna categorías raíz con hijos', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    const arbol = [
      { ...categoriaBase, hijos: [{ id: 'cat-002', nombre: 'Refrescos' }] },
    ];
    mockPrisma.categoria.findMany.mockResolvedValue(arbol);

    const result = await CategoriasService.obtenerArbol(empresaId);
    expect(result).toHaveLength(1);
    expect(result[0].hijos).toHaveLength(1);
  });

  it('retorna cache si disponible', async () => {
    const { cache } = require('../../config/cache');
    const cacheado = [categoriaBase];
    cache.get.mockReturnValue(cacheado);

    const result = await CategoriasService.obtenerArbol(empresaId);
    expect(result).toEqual(cacheado);
    expect(mockPrisma.categoria.findMany).not.toHaveBeenCalled();
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('CategoriasService.listar', () => {
  it('retorna categorías paginadas', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null);

    mockPrisma.categoria.findMany.mockResolvedValue([categoriaBase]);
    mockPrisma.categoria.count.mockResolvedValue(1);

    const result = await CategoriasService.listar(empresaId, {
      pagina: 1,
      limite: 20,
    } as any);
    expect((result as any).datos).toHaveLength(1);
  });
});
