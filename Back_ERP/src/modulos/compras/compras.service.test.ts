/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorNoEncontrado, ErrorNegocio, ErrorPeticion } from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  proveedor: { findFirst: jest.fn() },
  producto: { findMany: jest.fn() },
  compra: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  almacen: { findFirst: jest.fn() },
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

// Import service AFTER mocks
import { ComprasService } from './compras.service';

const empresaId = 'empresa-001';
const usuarioId = 'user-001';

const proveedorActivo = {
  id: 'prov-001',
  nombre: 'Proveedor Test',
  activo: true,
};

const productoConStock = {
  id: 'prod-001',
  nombre: 'Aceite 1L',
  activo: true,
  precioCosto: 30,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Crear Compra ─────────────────────────────────────────

describe('ComprasService.crear', () => {
  it('lanza ErrorNoEncontrado si proveedor no existe', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(null);

    await expect(
      ComprasService.crear(
        {
          proveedorId: 'no-existe',
          detalles: [{ productoId: 'prod-001', cantidad: 10, costoUnitario: 30 }],
        } as any,
        empresaId,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza error si producto no existe o está inactivo', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorActivo);
    mockPrisma.producto.findMany.mockResolvedValue([]); // No encuentra ninguno

    await expect(
      ComprasService.crear(
        {
          proveedorId: 'prov-001',
          detalles: [{ productoId: 'prod-X', cantidad: 10, costoUnitario: 30 }],
        } as any,
        empresaId,
      ),
    ).rejects.toThrow();
  });

  it('crea compra exitosamente con transacción', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const compraCreada = {
      id: 'comp-001',
      numeroCompra: 'COMP-2026-00001',
      estado: 'PENDIENTE',
      total: 348,
    };
    mockPrisma.$transaction.mockResolvedValue(compraCreada);

    const result = await ComprasService.crear(
      {
        proveedorId: 'prov-001',
        detalles: [{ productoId: 'prod-001', cantidad: 10, costoUnitario: 30 }],
      } as any,
      empresaId,
    );

    expect(result).toEqual(compraCreada);
  });

  it('calcula subtotal, IVA 16% y total correctamente', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTx();
    mockTx.compra.findFirst.mockResolvedValue(null); // Sin compras previas
    mockTx.compra.create.mockResolvedValue({ id: 'comp-001' });

    await ComprasService.crear(
      {
        proveedorId: 'prov-001',
        detalles: [{ productoId: 'prod-001', cantidad: 10, costoUnitario: 30 }],
      } as any,
      empresaId,
    );

    const createCall = mockTx.compra.create.mock.calls[0][0] as any;
    expect(createCall.data.subtotal).toBe(300); // 10 * 30
    expect(createCall.data.montoImpuesto).toBe(48); // 300 * 0.16
    expect(createCall.data.total).toBe(348); // 300 + 48
  });

  it('genera número secuencial correcto cuando hay compras previas', async () => {
    mockPrisma.proveedor.findFirst.mockResolvedValue(proveedorActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTx();
    mockTx.compra.findFirst.mockResolvedValue({ numeroCompra: 'COMP-2026-00007' });
    mockTx.compra.create.mockResolvedValue({ id: 'comp-008' });

    await ComprasService.crear(
      {
        proveedorId: 'prov-001',
        detalles: [{ productoId: 'prod-001', cantidad: 5, costoUnitario: 20 }],
      } as any,
      empresaId,
    );

    const createCall = mockTx.compra.create.mock.calls[0][0] as any;
    expect(createCall.data.numeroCompra).toBe('COMP-2026-00008');
  });
});

// ─── Helper para transacciones ────────────────────────────

function configurarTx() {
  const mockTx = {
    compra: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    existencia: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    movimientoInventario: { create: jest.fn() },
    producto: { update: jest.fn() },
    registroAuditoria: { create: jest.fn() },
  };
  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
  return mockTx;
}

// ─── Recibir Compra ───────────────────────────────────────

describe('ComprasService.recibir', () => {
  it('lanza ErrorNoEncontrado si compra no existe', async () => {
    mockPrisma.compra.findFirst.mockResolvedValue(null);

    await expect(
      ComprasService.recibir('no-existe', { almacenId: 'alm-001' } as any, usuarioId, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza recibir compra ya recibida', async () => {
    mockPrisma.compra.findFirst.mockResolvedValue({
      id: 'comp-001',
      recibidaEn: new Date(),
      detalles: [],
    });

    await expect(
      ComprasService.recibir('comp-001', { almacenId: 'alm-001' } as any, usuarioId, empresaId),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('lanza ErrorNoEncontrado si almacén no existe', async () => {
    mockPrisma.compra.findFirst.mockResolvedValue({
      id: 'comp-001',
      recibidaEn: null,
      detalles: [{ productoId: 'prod-001', cantidad: 10, costoUnitario: 30 }],
    });
    mockPrisma.almacen.findFirst.mockResolvedValue(null);

    await expect(
      ComprasService.recibir('comp-001', { almacenId: 'no-existe' } as any, usuarioId, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('recibe compra: ingresa inventario y actualiza costo', async () => {
    const compra = {
      id: 'comp-001',
      recibidaEn: null,
      detalles: [
        { productoId: 'prod-001', cantidad: 10, costoUnitario: 30, producto: productoConStock },
      ],
    };
    mockPrisma.compra.findFirst.mockResolvedValue(compra);
    mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-001', activo: true });

    const mockTx = configurarTx();
    mockTx.compra.update.mockResolvedValue({ ...compra, recibidaEn: new Date() });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 20, almacenId: 'alm-001' });

    await ComprasService.recibir('comp-001', { almacenId: 'alm-001' } as any, usuarioId, empresaId);

    // Existencia actualizada: 20 + 10 = 30
    expect(mockTx.existencia.update).toHaveBeenCalledWith({
      where: { id: 'ex-001' },
      data: { cantidad: 30 },
    });
    // Movimiento de inventario creado
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(1);
    const movData = (mockTx.movimientoInventario.create.mock.calls[0][0] as any).data;
    expect(movData.tipoMovimiento).toBe('ENTRADA');
    expect(movData.cantidad).toBe(10);
    expect(movData.cantidadAnterior).toBe(20);
    expect(movData.cantidadPosterior).toBe(30);
    // Costo del producto actualizado
    expect(mockTx.producto.update).toHaveBeenCalledWith({
      where: { id: 'prod-001' },
      data: { precioCosto: 30 },
    });
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('crea existencia nueva si producto no estaba en almacén', async () => {
    const compra = {
      id: 'comp-001',
      recibidaEn: null,
      detalles: [
        { productoId: 'prod-001', cantidad: 5, costoUnitario: 25, producto: productoConStock },
      ],
    };
    mockPrisma.compra.findFirst.mockResolvedValue(compra);
    mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-001', activo: true });

    const mockTx = configurarTx();
    mockTx.compra.update.mockResolvedValue({ ...compra, recibidaEn: new Date() });
    mockTx.existencia.findFirst.mockResolvedValue(null); // No existe
    mockTx.existencia.create.mockResolvedValue({ id: 'ex-new', cantidad: 0 });

    await ComprasService.recibir('comp-001', { almacenId: 'alm-001' } as any, usuarioId, empresaId);

    expect(mockTx.existencia.create).toHaveBeenCalledWith({
      data: { productoId: 'prod-001', almacenId: 'alm-001', cantidad: 0 },
    });
    // Actualiza a 0 + 5 = 5
    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 5 } }),
    );
  });

  it('recibe compra con múltiples productos', async () => {
    const compra = {
      id: 'comp-001',
      recibidaEn: null,
      detalles: [
        { productoId: 'prod-001', cantidad: 10, costoUnitario: 30, producto: { ...productoConStock } },
        { productoId: 'prod-002', cantidad: 20, costoUnitario: 15, producto: { ...productoConStock, id: 'prod-002' } },
      ],
    };
    mockPrisma.compra.findFirst.mockResolvedValue(compra);
    mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-001', activo: true });

    const mockTx = configurarTx();
    mockTx.compra.update.mockResolvedValue({ ...compra, recibidaEn: new Date() });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });

    await ComprasService.recibir('comp-001', { almacenId: 'alm-001' } as any, usuarioId, empresaId);

    // Un movimiento y actualización por cada detalle
    expect(mockTx.existencia.update).toHaveBeenCalledTimes(2);
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(2);
    expect(mockTx.producto.update).toHaveBeenCalledTimes(2);
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('ComprasService.obtenerPorId', () => {
  it('retorna compra con detalles', async () => {
    const compraCompleta = {
      id: 'comp-001',
      numeroCompra: 'COMP-2026-00001',
      detalles: [],
      proveedor: { nombre: 'Proveedor Test' },
    };
    mockPrisma.compra.findFirst.mockResolvedValue(compraCompleta);

    const result = await ComprasService.obtenerPorId('comp-001', empresaId);
    expect(result.numeroCompra).toBe('COMP-2026-00001');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.compra.findFirst.mockResolvedValue(null);

    await expect(
      ComprasService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('ComprasService.listar', () => {
  it('retorna compras paginadas', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);

    mockPrisma.compra.findMany.mockResolvedValue([{ id: 'comp-001' }]);
    mockPrisma.compra.count.mockResolvedValue(1);

    const result = await ComprasService.listar(
      { pagina: 1, limite: 20 } as any,
      empresaId,
    );

    expect((result as any).datos).toHaveLength(1);
  });

  it('filtra por proveedorId', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);
    mockPrisma.compra.findMany.mockResolvedValue([]);
    mockPrisma.compra.count.mockResolvedValue(0);

    await ComprasService.listar(
      { pagina: 1, limite: 20, proveedorId: 'prov-001' } as any,
      empresaId,
    );

    const where = mockPrisma.compra.findMany.mock.calls[0][0].where;
    expect(where.proveedorId).toBe('prov-001');
  });

  it('filtra recibida=true (recibidaEn no es null)', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);
    mockPrisma.compra.findMany.mockResolvedValue([]);
    mockPrisma.compra.count.mockResolvedValue(0);

    await ComprasService.listar(
      { pagina: 1, limite: 20, recibida: 'true' } as any,
      empresaId,
    );

    const where = mockPrisma.compra.findMany.mock.calls[0][0].where;
    expect(where.recibidaEn).toEqual({ not: null });
  });

  it('filtra recibida=false (recibidaEn es null)', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);
    mockPrisma.compra.findMany.mockResolvedValue([]);
    mockPrisma.compra.count.mockResolvedValue(0);

    await ComprasService.listar(
      { pagina: 1, limite: 20, recibida: 'false' } as any,
      empresaId,
    );

    const where = mockPrisma.compra.findMany.mock.calls[0][0].where;
    expect(where.recibidaEn).toBeNull();
  });

  it('filtra por búsqueda en numeroCompra, numeroFactura y proveedor', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);
    mockPrisma.compra.findMany.mockResolvedValue([]);
    mockPrisma.compra.count.mockResolvedValue(0);

    await ComprasService.listar(
      { pagina: 1, limite: 20, buscar: 'COMP-2026' } as any,
      empresaId,
    );

    const where = mockPrisma.compra.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeDefined();
    expect(where.OR.length).toBeGreaterThanOrEqual(2);
  });
});
