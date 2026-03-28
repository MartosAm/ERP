/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorNoEncontrado, ErrorNegocio } from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  producto: { findFirst: jest.fn() },
  almacen: { findFirst: jest.fn() },
  existencia: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  movimientoInventario: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../compartido/paginacion', () => ({
  paginar: jest.fn().mockReturnValue({ skip: 0, take: 20 }),
  construirMeta: jest.fn().mockReturnValue({ total: 0, pagina: 1, limite: 20, totalPaginas: 0 }),
}));

// Import service AFTER mocks
import { InventarioService } from './inventario.service';

const empresaId = 'empresa-001';
const usuarioId = 'user-001';

const productoActivo = {
  id: 'prod-001',
  nombre: 'Aceite 1L',
  rastrearInventario: true,
  activo: true,
  empresaId,
};

const almacenPrincipal = {
  id: 'alm-001',
  nombre: 'Almacen Principal',
  esPrincipal: true,
  activo: true,
  empresaId,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Registrar Movimiento ─────────────────────────────────

describe('InventarioService.registrarMovimiento', () => {
  it('lanza ErrorNoEncontrado si producto no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(null);

    await expect(
      InventarioService.registrarMovimiento(empresaId, usuarioId, {
        productoId: 'no-existe',
        almacenId: 'alm-001',
        tipoMovimiento: 'ENTRADA',
        cantidad: 10,
      } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorNegocio si producto no rastrea inventario', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue({
      ...productoActivo,
      rastrearInventario: false,
    });

    await expect(
      InventarioService.registrarMovimiento(empresaId, usuarioId, {
        productoId: 'prod-001',
        almacenId: 'alm-001',
        tipoMovimiento: 'ENTRADA',
        cantidad: 10,
      } as any),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('lanza ErrorNoEncontrado si almacén no existe', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(null);

    await expect(
      InventarioService.registrarMovimiento(empresaId, usuarioId, {
        productoId: 'prod-001',
        almacenId: 'no-existe',
        tipoMovimiento: 'ENTRADA',
        cantidad: 10,
      } as any),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorNegocio si stock insuficiente para SALIDA', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);
    // Stock check happens inside $transaction, so mock it to execute the callback
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        existencia: {
          findUnique: jest.fn().mockResolvedValue({ id: 'ex-001', cantidad: 5 }),
          create: jest.fn(),
          update: jest.fn(),
        },
        movimientoInventario: { create: jest.fn() },
      };
      return cb(tx);
    });

    await expect(
      InventarioService.registrarMovimiento(empresaId, usuarioId, {
        productoId: 'prod-001',
        almacenId: 'alm-001',
        tipoMovimiento: 'SALIDA',
        cantidad: 100,
      } as any),
    ).rejects.toThrow('Stock insuficiente');
  });

  it('registra ENTRADA exitosamente con transacción', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const movimientoCreado = {
      id: 'mov-001',
      tipoMovimiento: 'ENTRADA',
      cantidad: 10,
      cantidadAnterior: 20,
      cantidadPosterior: 30,
    };
    mockPrisma.$transaction.mockResolvedValue(movimientoCreado);

    const result = await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001',
      almacenId: 'alm-001',
      tipoMovimiento: 'ENTRADA',
      cantidad: 10,
    } as any);

    expect(result).toEqual(movimientoCreado);
  });

  it('ejecuta ENTRADA sumando stock dentro de TX', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue({ id: 'ex-001', cantidad: 20 });
    mockTx.movimientoInventario.create.mockResolvedValue({ id: 'mov-001', cantidadPosterior: 30 });

    await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001', almacenId: 'alm-001', tipoMovimiento: 'ENTRADA', cantidad: 10,
    } as any);

    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 30 } }),
    );
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('ejecuta SALIDA restando stock dentro de TX', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue({ id: 'ex-001', cantidad: 50 });
    mockTx.movimientoInventario.create.mockResolvedValue({ id: 'mov-001', cantidadPosterior: 45 });

    await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001', almacenId: 'alm-001', tipoMovimiento: 'SALIDA', cantidad: 5,
    } as any);

    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 45 } }),
    );
  });

  it('ejecuta AJUSTE estableciendo cantidad directamente', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue({ id: 'ex-001', cantidad: 100 });
    mockTx.movimientoInventario.create.mockResolvedValue({ id: 'mov-001', cantidadPosterior: 30 });

    await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001', almacenId: 'alm-001', tipoMovimiento: 'AJUSTE', cantidad: 30,
    } as any);

    // AJUSTE establece la cantidad directamente, no suma
    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 30 } }),
    );
  });

  it('ejecuta TRASLADO restando origen y sumando destino', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue({ id: 'ex-001', cantidad: 40 });
    mockTx.movimientoInventario.create.mockResolvedValue({ id: 'mov-001' });

    await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001', almacenId: 'alm-001',
      tipoMovimiento: 'TRASLADO', cantidad: 10, almacenDestinoId: 'alm-002',
    } as any);

    // Origen: 40 - 10 = 30
    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 30 } }),
    );
    // Destino: upsert
    expect(mockTx.existencia.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ almacenId: 'alm-002', cantidad: 10 }),
        update: { cantidad: { increment: 10 } },
      }),
    );
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('lanza error en TRASLADO si stock insuficiente', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue({ id: 'ex-001', cantidad: 3 });

    await expect(
      InventarioService.registrarMovimiento(empresaId, usuarioId, {
        productoId: 'prod-001', almacenId: 'alm-001',
        tipoMovimiento: 'TRASLADO', cantidad: 10, almacenDestinoId: 'alm-002',
      } as any),
    ).rejects.toThrow('Stock insuficiente para traslado');
  });

  it('crea existencia si no existe al registrar ENTRADA', async () => {
    mockPrisma.producto.findFirst.mockResolvedValue(productoActivo);
    mockPrisma.almacen.findFirst.mockResolvedValue(almacenPrincipal);

    const mockTx = configurarTx();
    mockTx.existencia.findUnique.mockResolvedValue(null); // No existe
    mockTx.existencia.create.mockResolvedValue({ id: 'ex-new', cantidad: 0 });
    mockTx.movimientoInventario.create.mockResolvedValue({ id: 'mov-001' });

    await InventarioService.registrarMovimiento(empresaId, usuarioId, {
      productoId: 'prod-001', almacenId: 'alm-001', tipoMovimiento: 'ENTRADA', cantidad: 10,
    } as any);

    expect(mockTx.existencia.create).toHaveBeenCalledWith({
      data: { productoId: 'prod-001', almacenId: 'alm-001', cantidad: 0 },
    });
    // Posterior: 0 + 10 = 10
    expect(mockTx.existencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cantidad: 10 } }),
    );
  });
});

// ─── Helper para transacciones ────────────────────────────

function configurarTx() {
  const mockTx = {
    existencia: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    movimientoInventario: { create: jest.fn() },
    registroAuditoria: { create: jest.fn() },
  };
  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
  return mockTx;
}

// ─── Listar Existencias ───────────────────────────────────

describe('InventarioService.listarExistencias', () => {
  it('retorna existencias paginadas', async () => {
    const existencias = [
      { id: 'ex-001', cantidad: 50, producto: { nombre: 'Aceite', stockMinimo: 10 }, almacen: { nombre: 'Principal' } },
    ];
    mockPrisma.existencia.findMany.mockResolvedValue(existencias);
    mockPrisma.existencia.count.mockResolvedValue(1);

    const result = await InventarioService.listarExistencias(empresaId, {
      pagina: 1, limite: 50,
    } as any);

    expect((result as any).datos).toEqual(existencias);
  });

  it('filtra por almacenId', async () => {
    mockPrisma.existencia.findMany.mockResolvedValue([]);
    mockPrisma.existencia.count.mockResolvedValue(0);

    await InventarioService.listarExistencias(empresaId, {
      pagina: 1, limite: 20, almacenId: 'alm-001',
    } as any);

    const where = mockPrisma.existencia.findMany.mock.calls[0][0].where;
    expect(where.almacenId).toBe('alm-001');
  });

  it('filtra por búsqueda de nombre/SKU', async () => {
    mockPrisma.existencia.findMany.mockResolvedValue([]);
    mockPrisma.existencia.count.mockResolvedValue(0);

    await InventarioService.listarExistencias(empresaId, {
      pagina: 1, limite: 20, buscar: 'aceite',
    } as any);

    const where = mockPrisma.existencia.findMany.mock.calls[0][0].where;
    expect(where.producto.OR).toBeDefined();
    expect(where.producto.OR).toHaveLength(2);
  });

  it('filtra stock bajo (cantidad < stockMinimo)', async () => {
    const existencias = [
      { id: 'ex-001', cantidad: 5, producto: { nombre: 'Aceite', stockMinimo: 10 } },
      { id: 'ex-002', cantidad: 50, producto: { nombre: 'Harina', stockMinimo: 10 } },
      { id: 'ex-003', cantidad: 2, producto: { nombre: 'Azúcar', stockMinimo: 20 } },
    ];
    mockPrisma.existencia.findMany.mockResolvedValue(existencias);
    mockPrisma.existencia.count.mockResolvedValue(3);

    const result = await InventarioService.listarExistencias(empresaId, {
      pagina: 1, limite: 50, stockBajo: true,
    } as any);

    // Solo Aceite (5 < 10) y Azúcar (2 < 20) deben pasar el filtro
    expect((result as any).datos).toHaveLength(2);
    expect((result as any).datos[0].producto.nombre).toBe('Aceite');
    expect((result as any).datos[1].producto.nombre).toBe('Azúcar');
  });
});

// ─── Listar Movimientos ───────────────────────────────────

describe('InventarioService.listarMovimientos', () => {
  it('retorna movimientos paginados', async () => {
    const movimientos = [{ id: 'mov-001', tipoMovimiento: 'ENTRADA' }];
    mockPrisma.movimientoInventario.findMany.mockResolvedValue(movimientos);
    mockPrisma.movimientoInventario.count.mockResolvedValue(1);

    const result = await InventarioService.listarMovimientos(empresaId, {
      pagina: 1, limite: 20,
    } as any);

    expect((result as any).datos).toEqual(movimientos);
  });

  it('filtra por productoId', async () => {
    mockPrisma.movimientoInventario.findMany.mockResolvedValue([]);
    mockPrisma.movimientoInventario.count.mockResolvedValue(0);

    await InventarioService.listarMovimientos(empresaId, {
      pagina: 1, limite: 20, productoId: 'prod-001',
    } as any);

    const where = mockPrisma.movimientoInventario.findMany.mock.calls[0][0].where;
    expect(where.productoId).toBe('prod-001');
  });

  it('filtra por almacenId', async () => {
    mockPrisma.movimientoInventario.findMany.mockResolvedValue([]);
    mockPrisma.movimientoInventario.count.mockResolvedValue(0);

    await InventarioService.listarMovimientos(empresaId, {
      pagina: 1, limite: 20, almacenId: 'alm-001',
    } as any);

    const where = mockPrisma.movimientoInventario.findMany.mock.calls[0][0].where;
    expect(where.almacenId).toBe('alm-001');
  });

  it('filtra por tipoMovimiento', async () => {
    mockPrisma.movimientoInventario.findMany.mockResolvedValue([]);
    mockPrisma.movimientoInventario.count.mockResolvedValue(0);

    await InventarioService.listarMovimientos(empresaId, {
      pagina: 1, limite: 20, tipoMovimiento: 'ENTRADA',
    } as any);

    const where = mockPrisma.movimientoInventario.findMany.mock.calls[0][0].where;
    expect(where.tipoMovimiento).toBe('ENTRADA');
  });

  it('filtra por rango de fechas', async () => {
    mockPrisma.movimientoInventario.findMany.mockResolvedValue([]);
    mockPrisma.movimientoInventario.count.mockResolvedValue(0);

    const desde = new Date('2026-01-01');
    const hasta = new Date('2026-12-31');

    await InventarioService.listarMovimientos(empresaId, {
      pagina: 1, limite: 20, fechaDesde: desde, fechaHasta: hasta,
    } as any);

    const where = mockPrisma.movimientoInventario.findMany.mock.calls[0][0].where;
    expect(where.creadoEn.gte).toEqual(desde);
    expect(where.creadoEn.lte).toEqual(hasta);
  });
});
