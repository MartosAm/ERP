/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  producto: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  categoria: { findFirst: jest.fn() },
  proveedor: { findFirst: jest.fn() },
  almacen: { findFirst: jest.fn() },
  existencia: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { PRODUCTOS: 120 },
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

// Import service AFTER mocks are set up
import { ProductosService } from './productos.service';

const empresaId = 'empresa-001';

// Producto base para crear (cast as any because service receives Zod-parsed output with all defaults)
const crearDto = {
  sku: 'SKU-001',
  nombre: 'Producto Test',
  precioVenta1: 100,
  tipoUnidad: 'PIEZA',
  rastrearInventario: true,
  activo: true,
  destacado: false,
  etiquetaUnidad: 'pza',
  cantidadMinimaVenta: 1,
  incrementoVenta: 1,
  precioCosto: 0,
  impuestoIncluido: true,
  tasaImpuesto: 0.16,
  stockMinimo: 0,
} as any;

// Producto existente devuelto por Prisma
const productoExistente = {
  id: 'prod-001',
  sku: 'SKU-001',
  codigoBarras: null,
  nombre: 'Producto Test',
  precioVenta1: 100,
  activo: true,
  creadoEn: new Date(),
  empresaId,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Crear ────────────────────────────────────────────────

describe('ProductosService.crear', () => {
  it('crea producto exitosamente con existencia inicial', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue(null); // SKU no existe
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        producto: { create: jest.fn().mockResolvedValue(productoExistente) },
        almacen: { findFirst: jest.fn().mockResolvedValue({ id: 'alm-001' }) },
        existencia: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });

    const result = await ProductosService.crear(empresaId, crearDto);
    expect(result).toEqual(productoExistente);
    expect(mockPrisma.producto.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sku: 'SKU-001' } }),
    );
  });

  it('lanza ErrorConflicto si SKU ya existe', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue(productoExistente);

    await expect(
      ProductosService.crear(empresaId, crearDto),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('lanza ErrorConflicto si codigo de barras ya existe', async () => {
    mockPrisma.producto.findUnique
      .mockResolvedValueOnce(null)  // SKU libre
      .mockResolvedValueOnce({ id: 'otro' }); // Codigo barras duplicado

    await expect(
      ProductosService.crear(empresaId, { ...crearDto, codigoBarras: 'BAR-DUP' }),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('valida que la categoria pertenezca a la empresa', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue(null);
    mockPrisma.categoria.findFirst.mockResolvedValue(null); // No existe

    await expect(
      ProductosService.crear(empresaId, { ...crearDto, categoriaId: 'cat-999' }),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('valida que el proveedor pertenezca a la empresa', async () => {
    mockPrisma.producto.findUnique.mockResolvedValue(null);
    mockPrisma.proveedor.findFirst.mockResolvedValue(null); // No existe

    await expect(
      ProductosService.crear(empresaId, { ...crearDto, proveedorId: 'prov-999' }),
    ).rejects.toThrow(ErrorNegocio);
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('ProductosService.obtenerPorId', () => {
  it('retorna producto con existencias para ADMIN', async () => {
    const productoConExistencias = {
      ...productoExistente,
      precioCosto: 50,
      existencias: [{ id: 'e1', cantidad: 10, almacen: { id: 'a1', nombre: 'Principal', esPrincipal: true } }],
    };
    mockPrisma.producto.findFirst.mockResolvedValue(productoConExistencias);

    const result = await ProductosService.obtenerPorId('prod-001', empresaId, 'ADMIN');
    expect(result).toEqual(productoConExistencias);
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      ProductosService.obtenerPorId('no-existe', empresaId, 'ADMIN'),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Buscar por código ────────────────────────────────────

describe('ProductosService.buscarPorCodigo', () => {
  it('encuentra producto por SKU', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoExistente);

    const result = await ProductosService.buscarPorCodigo('SKU-001', empresaId);
    expect(result).toEqual(productoExistente);
  });

  it('lanza ErrorNoEncontrado si codigo no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      ProductosService.buscarPorCodigo('NO-EXISTE', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Actualizar ───────────────────────────────────────────

describe('ProductosService.actualizar', () => {
  it('actualiza parcialmente un producto', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoExistente);
    const productoActualizado = { ...productoExistente, nombre: 'Nuevo Nombre' };
    mockPrisma.producto.update.mockResolvedValue(productoActualizado);

    const result = await ProductosService.actualizar('prod-001', empresaId, { nombre: 'Nuevo Nombre' });
    expect(result.nombre).toBe('Nuevo Nombre');
  });

  it('lanza ErrorNoEncontrado si producto no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      ProductosService.actualizar('no-existe', empresaId, { nombre: 'X' }),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorConflicto si nuevo SKU ya existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoExistente);
    mockPrisma.producto.findUnique.mockResolvedValue({ id: 'otro-prod' }); // SKU duplicado

    await expect(
      ProductosService.actualizar('prod-001', empresaId, { sku: 'SKU-DUPLICADO' }),
    ).rejects.toThrow(ErrorConflicto);
  });

  it('lanza ErrorConflicto si nuevo codigo de barras ya existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue({ ...productoExistente, codigoBarras: 'BAR-001' });
    mockPrisma.producto.findUnique.mockResolvedValue({ id: 'otro-prod' });

    await expect(
      ProductosService.actualizar('prod-001', empresaId, { codigoBarras: 'BAR-DUP' }),
    ).rejects.toThrow(ErrorConflicto);
  });
});

// ─── Eliminar (soft delete) ──────────────────────────────

describe('ProductosService.eliminar', () => {
  it('desactiva producto (soft delete)', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue({
      ...productoExistente,
      _count: { detallesOrden: 2 },
    });
    mockPrisma.producto.update.mockResolvedValue({});

    await ProductosService.eliminar('prod-001', empresaId);

    expect(mockPrisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-001' },
        data: { activo: false },
      }),
    );
  });

  it('lanza ErrorNoEncontrado si producto no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      ProductosService.eliminar('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('ProductosService.listar', () => {
  it('retorna productos paginados', async () => {
    const { cache } = require('../../config/cache');
    cache.get.mockReturnValue(null); // Sin cache

    mockPrisma.producto.findMany.mockResolvedValue([productoExistente]);
    mockPrisma.producto.count.mockResolvedValue(1);

    const filtros = {
      pagina: 1,
      limite: 20,
      ordenarPor: 'nombre' as const,
      direccionOrden: 'asc' as const,
    };

    const result = await ProductosService.listar(empresaId, filtros, 'ADMIN');
    expect(result.datos).toHaveLength(1);
  });

  it('retorna cache si está disponible', async () => {
    const { cache } = require('../../config/cache');
    const cacheado = { datos: [productoExistente], meta: { total: 1 } };
    cache.get.mockReturnValue(cacheado);

    const filtros = {
      pagina: 1,
      limite: 20,
      ordenarPor: 'nombre' as const,
      direccionOrden: 'asc' as const,
    };

    const result = await ProductosService.listar(empresaId, filtros, 'ADMIN');
    expect(result).toEqual(cacheado);
    expect(mockPrisma.producto.findMany).not.toHaveBeenCalled();
  });
});
