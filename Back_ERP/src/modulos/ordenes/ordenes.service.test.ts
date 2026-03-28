/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ErrorNoEncontrado,
  ErrorNegocio,
  ErrorPeticion,
} from '../../compartido/errores';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  turnoCaja: { findFirst: jest.fn() },
  producto: { findMany: jest.fn() },
  orden: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  cliente: { findFirst: jest.fn() },
  existencia: { findFirst: jest.fn(), update: jest.fn() },
  movimientoInventario: { create: jest.fn() },
  detalleOrden: { createMany: jest.fn() },
  pago: { createMany: jest.fn() },
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

// Import service AFTER mocks are set up
import { OrdenesService } from './ordenes.service';

const empresaId = 'empresa-001';
const usuarioId = 'user-001';

const turnoActivo = {
  id: 'turno-001',
  usuarioId,
  cajaRegistradoraId: 'caja-001',
  cajaRegistradora: { id: 'caja-001', nombre: 'Caja 1' },
  cerradaEn: null,
};

const productoConStock = {
  id: 'prod-001',
  nombre: 'Aceite 1L',
  precioCosto: 30,
  impuestoIncluido: true,
  tasaImpuesto: 0.16,
  rastrearInventario: true,
  activo: true,
  existencias: [{ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' }],
};

const crearOrdenDto = {
  detalles: [
    { productoId: 'prod-001', cantidad: 2, precioUnitario: 45.50, descuento: 0 },
  ],
  pagos: [
    { metodo: 'EFECTIVO' as const, monto: 91 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Crear Orden ──────────────────────────────────────────

describe('OrdenesService.crear', () => {
  it('lanza error si no hay turno de caja abierto', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId),
    ).rejects.toThrow('Debes abrir un turno de caja');
  });

  it('lanza error si producto no existe o está inactivo', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([]); // No encuentra productos

    await expect(
      OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId),
    ).rejects.toThrow('Uno o mas productos no existen');
  });

  it('lanza error si stock insuficiente', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([{
      ...productoConStock,
      existencias: [{ id: 'ex-001', cantidad: 1, almacenId: 'alm-001' }], // Solo 1 en stock
    }]);

    const dtoMucho = {
      detalles: [
        { productoId: 'prod-001', cantidad: 10, precioUnitario: 45.50, descuento: 0 },
      ],
      pagos: [{ metodo: 'EFECTIVO', monto: 455 }],
    };

    await expect(
      OrdenesService.crear(dtoMucho as any, usuarioId, empresaId),
    ).rejects.toThrow('Stock insuficiente');
  });

  it('lanza error si monto pagado es menor al total', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const dtoPagoCorto = {
      detalles: [
        { productoId: 'prod-001', cantidad: 2, precioUnitario: 45.50, descuento: 0 },
      ],
      pagos: [{ metodo: 'EFECTIVO', monto: 1 }], // Muy poco
    };

    await expect(
      OrdenesService.crear(dtoPagoCorto as any, usuarioId, empresaId),
    ).rejects.toThrow('Monto pagado');
  });

  it('requiere clienteId para pago a crédito', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const dtoCredito = {
      detalles: [
        { productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 },
      ],
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 45.50 }],
      // Sin clienteId
    };

    await expect(
      OrdenesService.crear(dtoCredito as any, usuarioId, empresaId),
    ).rejects.toThrow('Se requiere un cliente');
  });

  it('valida crédito insuficiente del cliente', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);
    mockPrisma.cliente.findFirst.mockResolvedValue({
      id: 'cli-001',
      limiteCredito: 10,    // Solo $10 de crédito
      creditoUtilizado: 5,  // Ya uso $5
    });

    const dtoCredito = {
      detalles: [
        { productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 },
      ],
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 45.50 }],
      clienteId: 'cli-001',
    };

    await expect(
      OrdenesService.crear(dtoCredito as any, usuarioId, empresaId),
    ).rejects.toThrow('Credito insuficiente');
  });
});

// ─── Cancelar Orden ───────────────────────────────────────

describe('OrdenesService.cancelar', () => {
  it('lanza ErrorNoEncontrado si orden no existe', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.cancelar('no-existe', { motivoCancelacion: 'Error' }, usuarioId, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza cancelar orden ya cancelada', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({ estado: 'CANCELADA' });

    await expect(
      OrdenesService.cancelar('ord-001', { motivoCancelacion: 'Error' }, usuarioId, empresaId),
    ).rejects.toThrow('ya esta cancelada');
  });

  it('rechaza cancelar orden devuelta', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({ estado: 'DEVUELTA' });

    await expect(
      OrdenesService.cancelar('ord-001', { motivoCancelacion: 'Error' }, usuarioId, empresaId),
    ).rejects.toThrow('No se puede cancelar una orden devuelta');
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('OrdenesService.obtenerPorId', () => {
  it('retorna orden con detalles', async () => {
    const ordenCompleta = {
      id: 'ord-001',
      numeroOrden: 'VTA-2026-00001',
      estado: 'COMPLETADA',
      detalles: [],
      pagos: [],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompleta);

    const result = await OrdenesService.obtenerPorId('ord-001', empresaId);
    expect(result.numeroOrden).toBe('VTA-2026-00001');
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Crear Cotización ─────────────────────────────────────

describe('OrdenesService.crearCotizacion', () => {
  it('lanza error si producto no existe', async () => {
    mockPrisma.producto.findMany.mockResolvedValue([]);

    await expect(
      OrdenesService.crearCotizacion(
        {
          detalles: [{ productoId: 'prod-X', cantidad: 1, precioUnitario: 10, descuento: 0 }],
        } as any,
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow('Uno o mas productos no existen');
  });

  it('crea cotización exitosamente con número secuencial', async () => {
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);
    mockPrisma.orden.findFirst.mockResolvedValue(null); // No hay cotizaciones previas

    const cotCreada = {
      id: 'cot-001',
      numeroOrden: 'COT-2026-00001',
      estado: 'COTIZACION',
      detalles: [],
    };
    mockPrisma.orden.create.mockResolvedValue(cotCreada);

    const result = await OrdenesService.crearCotizacion(
      {
        detalles: [{ productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 }],
      } as any,
      usuarioId,
      empresaId,
    );

    expect(result.estado).toBe('COTIZACION');
    // Verify secuencial number generation
    const createCall = mockPrisma.orden.create.mock.calls[0][0] as any;
    expect(createCall.data.numeroOrden).toMatch(/^COT-\d{4}-00001$/);
  });

  it('genera número secuencial correcto cuando hay cotizaciones previas', async () => {
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);
    mockPrisma.orden.findFirst.mockResolvedValue({ numeroOrden: 'COT-2026-00005' });
    mockPrisma.orden.create.mockResolvedValue({ id: 'cot-006', estado: 'COTIZACION' });

    await OrdenesService.crearCotizacion(
      {
        detalles: [{ productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 }],
      } as any,
      usuarioId,
      empresaId,
    );

    const createCall = mockPrisma.orden.create.mock.calls[0][0] as any;
    expect(createCall.data.numeroOrden).toMatch(/^COT-\d{4}-00006$/);
  });
});

// ─── Confirmar Cotización ─────────────────────────────────

describe('OrdenesService.confirmarCotizacion', () => {
  const pagosDto = { pagos: [{ metodo: 'EFECTIVO', monto: 91 }] };

  it('lanza error sin turno de caja abierto', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.confirmarCotizacion('cot-001', pagosDto as any, usuarioId, empresaId),
    ).rejects.toThrow('Debes abrir un turno de caja');
  });

  it('lanza ErrorNoEncontrado si cotización no existe', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.confirmarCotizacion('no-existe', pagosDto as any, usuarioId, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('rechaza confirmar si estado no es COTIZACION', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'ord-001',
      estado: 'COMPLETADA',
      detalles: [],
    });

    await expect(
      OrdenesService.confirmarCotizacion('ord-001', pagosDto as any, usuarioId, empresaId),
    ).rejects.toThrow('No se puede confirmar');
  });

  it('valida stock insuficiente al confirmar', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'cot-001',
      estado: 'COTIZACION',
      total: 91,
      detalles: [
        {
          productoId: 'prod-001',
          cantidad: 100, // Mucho más del stock
          producto: {
            nombre: 'Aceite',
            rastrearInventario: true,
            existencias: [{ id: 'ex-001', cantidad: 2 }],
          },
        },
      ],
    });

    await expect(
      OrdenesService.confirmarCotizacion('cot-001', pagosDto as any, usuarioId, empresaId),
    ).rejects.toThrow('Stock insuficiente');
  });

  it('valida monto pagado insuficiente', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'cot-001',
      estado: 'COTIZACION',
      total: 500,
      clienteId: null,
      detalles: [
        {
          productoId: 'prod-001',
          cantidad: 5,
          producto: {
            nombre: 'Aceite',
            rastrearInventario: true,
            existencias: [{ id: 'ex-001', cantidad: 50 }],
          },
        },
      ],
    });

    const pagoInsuficiente = { pagos: [{ metodo: 'EFECTIVO', monto: 1 }] };

    await expect(
      OrdenesService.confirmarCotizacion('cot-001', pagoInsuficiente as any, usuarioId, empresaId),
    ).rejects.toThrow('Monto pagado');
  });
});

// ─── Devolver ─────────────────────────────────────────────

describe('OrdenesService.devolver', () => {
  it('lanza ErrorNoEncontrado si orden no existe', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(null);

    await expect(
      OrdenesService.devolver(
        'no-existe',
        { motivo: 'Defecto', items: [{ productoId: 'p1', cantidad: 1 }] },
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('solo permite devolver ordenes COMPLETADA', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'ord-001',
      estado: 'CANCELADA',
    });

    await expect(
      OrdenesService.devolver(
        'ord-001',
        { motivo: 'Defecto', items: [{ productoId: 'p1', cantidad: 1 }] },
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow('Solo se pueden devolver ordenes con estado COMPLETADA');
  });

  it('rechaza producto que no pertenece a la orden', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'ord-001',
      estado: 'COMPLETADA',
      detalles: [
        { productoId: 'prod-001', cantidad: 2, producto: productoConStock },
      ],
      pagos: [],
    });

    await expect(
      OrdenesService.devolver(
        'ord-001',
        { motivo: 'Defecto', items: [{ productoId: 'prod-no-existente', cantidad: 1 }] },
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow('no pertenece a esta orden');
  });

  it('rechaza devolver más cantidad de la vendida', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({
      id: 'ord-001',
      estado: 'COMPLETADA',
      detalles: [
        { productoId: 'prod-001', cantidad: 2, subtotal: 91, precioCosto: 30, producto: productoConStock },
      ],
      pagos: [],
    });

    await expect(
      OrdenesService.devolver(
        'ord-001',
        { motivo: 'Defecto', items: [{ productoId: 'prod-001', cantidad: 10 }] },
        usuarioId,
        empresaId,
      ),
    ).rejects.toThrow('No se pueden devolver');
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('OrdenesService.listar', () => {
  it('retorna datos paginados con cache miss', async () => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null);

    const ordenes = [{ id: 'ord-001', numeroOrden: 'VTA-2026-00001' }];
    mockPrisma.orden.findMany.mockResolvedValue(ordenes);
    mockPrisma.orden.count.mockResolvedValue(1);

    const filtros = { pagina: 1, limite: 20 };
    const result = await OrdenesService.listar(filtros as any, empresaId);
    expect((result as any).datos).toEqual(ordenes);
  });

  it('retorna cache si está disponible', async () => {
    const { cache: mockCache } = require('../../config/cache');
    const cacheado = { datos: [], meta: { total: 0 } };
    mockCache.get.mockReturnValue(cacheado);

    const result = await OrdenesService.listar({ pagina: 1, limite: 20 } as any, empresaId);
    expect(result).toEqual(cacheado);
    expect(mockPrisma.orden.findMany).not.toHaveBeenCalled();
  });
});

// ─── Helper para transacciones ────────────────────────────

/**
 * Configura mockPrisma.$transaction para ejecutar la callback
 * recibida con un mock `tx` que tiene todos los métodos necesarios.
 */
function configurarTransaction() {
  const mockTx = {
    orden: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    detalleOrden: { createMany: jest.fn() },
    pago: { createMany: jest.fn() },
    existencia: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    movimientoInventario: { create: jest.fn() },
    cliente: { update: jest.fn() },
    registroAuditoria: { create: jest.fn() },
  };

  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

  return mockTx;
}

// ─── Crear Orden — Happy Paths ────────────────────────────

describe('OrdenesService.crear — transacción completa', () => {
  it('crea orden exitosamente con un producto (efectivo)', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null); // Sin ordenes previas
    const ordenCreada = {
      id: 'ord-new',
      numeroOrden: 'VTA-2026-00001',
      estado: 'COMPLETADA',
      total: 91,
    };
    mockTx.orden.create.mockResolvedValue(ordenCreada);
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ ...ordenCreada, detalles: [], pagos: [] });

    const result = await OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId);

    expect(result).toBeTruthy();
    expect(mockTx.orden.create).toHaveBeenCalledTimes(1);
    expect(mockTx.detalleOrden.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.pago.createMany).toHaveBeenCalledTimes(1);
    // Verifica que se descuenta inventario
    expect(mockTx.existencia.update).toHaveBeenCalledTimes(1);
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(1);
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('genera número secuencial correcto cuando hay ordenes previas', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue({ numeroOrden: 'VTA-2026-00042' });
    mockTx.orden.create.mockResolvedValue({ id: 'ord-43' });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-43' });

    await OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId);

    const createCall = mockTx.orden.create.mock.calls[0][0] as any;
    expect(createCall.data.numeroOrden).toBe('VTA-2026-00043');
  });

  it('calcula cambio cuando pago excede total', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({ id: 'ord-1' });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-1' });

    const dtoPagoExtra = {
      detalles: [{ productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 }],
      pagos: [{ metodo: 'EFECTIVO', monto: 50 }], // Paga de más
    };

    await OrdenesService.crear(dtoPagoExtra as any, usuarioId, empresaId);

    const createCall = mockTx.orden.create.mock.calls[0][0] as any;
    expect(createCall.data.cambio).toBeGreaterThan(0);
    expect(createCall.data.montoPagado).toBe(50);
  });

  it('asigna metodoPago MIXTO con varios pagos', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({ id: 'ord-mix' });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-mix' });

    const dtoMixto = {
      detalles: [{ productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 }],
      pagos: [
        { metodo: 'EFECTIVO', monto: 25 },
        { metodo: 'TARJETA', monto: 20.50 },
      ],
    };

    await OrdenesService.crear(dtoMixto as any, usuarioId, empresaId);

    const createCall = mockTx.orden.create.mock.calls[0][0] as any;
    expect(createCall.data.metodoPago).toBe('MIXTO');
  });

  it('no descuenta inventario si producto no rastrea inventario', async () => {
    const productoSinInventario = {
      ...productoConStock,
      rastrearInventario: false,
      existencias: [],
    };
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoSinInventario]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({ id: 'ord-no-inv' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-no-inv' });

    await OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId);

    // No debe tocar existencia ni movimientos
    expect(mockTx.existencia.findFirst).not.toHaveBeenCalled();
    expect(mockTx.existencia.update).not.toHaveBeenCalled();
    expect(mockTx.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('actualiza crédito del cliente cuando paga con CREDITO_CLIENTE', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]);
    mockPrisma.cliente.findFirst.mockResolvedValue({
      id: 'cli-001',
      limiteCredito: 1000,
      creditoUtilizado: 0,
    });

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({ id: 'ord-cred' });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-cred' });

    const dtoCredito = {
      detalles: [{ productoId: 'prod-001', cantidad: 1, precioUnitario: 45.50, descuento: 0 }],
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 45.50 }],
      clienteId: 'cli-001',
    };

    await OrdenesService.crear(dtoCredito as any, usuarioId, empresaId);

    expect(mockTx.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cli-001' },
      data: { creditoUtilizado: { increment: 45.50 } },
    });
  });

  it('lanza error de stock en TX si race condition reduce inventario', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock]); // Pre-check pasa con 50

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    // Pero dentro de TX, stock bajó a 0 (otro usuario vendió)
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 0, almacenId: 'alm-001' });

    await expect(
      OrdenesService.crear(crearOrdenDto as any, usuarioId, empresaId),
    ).rejects.toThrow('Stock insuficiente');
  });

  it('crea orden con múltiples productos y descuentos', async () => {
    const producto2 = {
      ...productoConStock,
      id: 'prod-002',
      nombre: 'Harina 1kg',
      precioCosto: 15,
      impuestoIncluido: false,
      tasaImpuesto: 0.16,
    };
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.producto.findMany.mockResolvedValue([productoConStock, producto2]);

    const mockTx = configurarTransaction();
    mockTx.orden.findFirst.mockResolvedValue(null);
    mockTx.orden.create.mockResolvedValue({ id: 'ord-multi' });
    mockTx.existencia.findFirst.mockResolvedValue({ id: 'ex-001', cantidad: 100, almacenId: 'alm-001' });
    mockTx.orden.findUnique.mockResolvedValue({ id: 'ord-multi' });

    const dtoMulti = {
      detalles: [
        { productoId: 'prod-001', cantidad: 3, precioUnitario: 45.50, descuento: 5 },
        { productoId: 'prod-002', cantidad: 2, precioUnitario: 25.00, descuento: 0 },
      ],
      pagos: [{ metodo: 'EFECTIVO', monto: 500 }],
    };

    await OrdenesService.crear(dtoMulti as any, usuarioId, empresaId);

    expect(mockTx.detalleOrden.createMany).toHaveBeenCalledTimes(1);
    const detalles = (mockTx.detalleOrden.createMany.mock.calls[0][0] as any).data;
    expect(detalles).toHaveLength(2);
    // Se descuenta inventario por cada producto que rastrea:
    // 2 llamas en re-verificación de stock + 2 en descuento = 4 total
    expect(mockTx.existencia.update).toHaveBeenCalledTimes(2);
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(2);
  });
});

// ─── Cancelar — Happy Path ────────────────────────────────

describe('OrdenesService.cancelar — transacción completa', () => {
  const ordenCompleta = {
    id: 'ord-001',
    estado: 'COMPLETADA',
    clienteId: null,
    detalles: [
      {
        productoId: 'prod-001',
        cantidad: 2,
        precioCosto: 30,
        producto: {
          ...productoConStock,
          existencias: [{ id: 'ex-001', cantidad: 48, almacenId: 'alm-001' }],
        },
      },
    ],
    pagos: [{ metodo: 'EFECTIVO', monto: 91 }],
  };

  it('cancela orden y devuelve stock al inventario', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompleta);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ ...ordenCompleta, estado: 'CANCELADA' });

    const result = await OrdenesService.cancelar(
      'ord-001', { motivoCancelacion: 'Error del cajero' }, usuarioId, empresaId,
    );

    expect(result.estado).toBe('CANCELADA');
    expect(mockTx.existencia.update).toHaveBeenCalledWith({
      where: { id: 'ex-001' },
      data: { cantidad: 50 }, // 48 + 2 devueltas
    });
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(1);
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('libera crédito del cliente al cancelar', async () => {
    const ordenConCredito = {
      ...ordenCompleta,
      clienteId: 'cli-001',
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 91 }],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenConCredito);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ ...ordenConCredito, estado: 'CANCELADA' });

    await OrdenesService.cancelar('ord-001', { motivoCancelacion: 'Error' }, usuarioId, empresaId);

    expect(mockTx.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cli-001' },
      data: { creditoUtilizado: { decrement: 91 } },
    });
  });

  it('no devuelve stock de productos sin rastreo de inventario', async () => {
    const ordenSinRastreo = {
      ...ordenCompleta,
      detalles: [
        {
          productoId: 'prod-001',
          cantidad: 2,
          precioCosto: 30,
          producto: { ...productoConStock, rastrearInventario: false, existencias: [] },
        },
      ],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenSinRastreo);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ ...ordenSinRastreo, estado: 'CANCELADA' });

    await OrdenesService.cancelar('ord-001', { motivoCancelacion: 'Error' }, usuarioId, empresaId);

    expect(mockTx.existencia.update).not.toHaveBeenCalled();
    expect(mockTx.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('no libera crédito si no hay pagos de crédito', async () => {
    const ordenSoloEfectivo = {
      ...ordenCompleta,
      clienteId: 'cli-001',
      pagos: [{ metodo: 'EFECTIVO', monto: 91 }],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenSoloEfectivo);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'CANCELADA' });

    await OrdenesService.cancelar('ord-001', { motivoCancelacion: 'Error' }, usuarioId, empresaId);

    expect(mockTx.cliente.update).not.toHaveBeenCalled();
  });
});

// ─── Confirmar Cotización — Happy Path ────────────────────

describe('OrdenesService.confirmarCotizacion — transacción completa', () => {
  const cotizacion = {
    id: 'cot-001',
    estado: 'COTIZACION',
    total: 91,
    clienteId: null,
    detalles: [
      {
        productoId: 'prod-001',
        cantidad: 2,
        precioCosto: 30,
        producto: {
          nombre: 'Aceite 1L',
          rastrearInventario: true,
          existencias: [{ id: 'ex-001', cantidad: 50, almacenId: 'alm-001' }],
        },
      },
    ],
  };

  it('confirma cotización como venta con descuento de inventario', async () => {
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue(cotizacion);

    const mockTx = configurarTransaction();
    const ordenFinal = { id: 'cot-001', estado: 'COMPLETADA', pagos: [] };
    mockTx.orden.findUnique.mockResolvedValue(ordenFinal);

    const result = await OrdenesService.confirmarCotizacion(
      'cot-001', { pagos: [{ metodo: 'EFECTIVO', monto: 91 }] } as any, usuarioId, empresaId,
    );

    expect(result!.estado).toBe('COMPLETADA');
    expect(mockTx.orden.update).toHaveBeenCalledTimes(1);
    expect(mockTx.pago.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.existencia.update).toHaveBeenCalledTimes(1);
    expect(mockTx.movimientoInventario.create).toHaveBeenCalledTimes(1);
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('actualiza crédito del cliente al confirmar con pago a crédito', async () => {
    const cotConCliente = { ...cotizacion, clienteId: 'cli-001' };
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue(cotConCliente);
    mockPrisma.cliente.findFirst.mockResolvedValue({
      id: 'cli-001',
      limiteCredito: 1000,
      creditoUtilizado: 0,
    });

    const mockTx = configurarTransaction();
    mockTx.orden.findUnique.mockResolvedValue({ id: 'cot-001', estado: 'COMPLETADA' });

    await OrdenesService.confirmarCotizacion(
      'cot-001',
      { pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 91 }] } as any,
      usuarioId,
      empresaId,
    );

    expect(mockTx.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cli-001' },
      data: { creditoUtilizado: { increment: 91 } },
    });
  });

  it('no descuenta stock de productos sin rastreo', async () => {
    const cotSinRastreo = {
      ...cotizacion,
      detalles: [{
        ...cotizacion.detalles[0],
        producto: { ...cotizacion.detalles[0].producto, rastrearInventario: false },
      }],
    };
    mockPrisma.turnoCaja.findFirst.mockResolvedValue(turnoActivo);
    mockPrisma.orden.findFirst.mockResolvedValue(cotSinRastreo);

    const mockTx = configurarTransaction();
    mockTx.orden.findUnique.mockResolvedValue({ id: 'cot-001', estado: 'COMPLETADA' });

    await OrdenesService.confirmarCotizacion(
      'cot-001', { pagos: [{ metodo: 'EFECTIVO', monto: 91 }] } as any, usuarioId, empresaId,
    );

    expect(mockTx.existencia.update).not.toHaveBeenCalled();
    expect(mockTx.movimientoInventario.create).not.toHaveBeenCalled();
  });
});

// ─── Devolver — Happy Paths ──────────────────────────────

describe('OrdenesService.devolver — transacción completa', () => {
  const ordenParaDevolver = {
    id: 'ord-001',
    estado: 'COMPLETADA',
    total: 91,
    notas: null,
    clienteId: null,
    detalles: [
      {
        productoId: 'prod-001',
        cantidad: 2,
        subtotal: 91,
        precioCosto: 30,
        producto: {
          ...productoConStock,
          existencias: [{ id: 'ex-001', cantidad: 48, almacenId: 'alm-001' }],
        },
      },
    ],
    pagos: [{ metodo: 'EFECTIVO', monto: 91 }],
  };

  it('procesa devolución total reingresando todo el stock', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenParaDevolver);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'DEVUELTA' });

    const result = await OrdenesService.devolver(
      'ord-001',
      { motivo: 'Producto defectuoso', items: [{ productoId: 'prod-001', cantidad: 2 }] },
      usuarioId, empresaId,
    );

    expect(result.tipo).toBe('TOTAL');
    expect(result.montoDevolucion).toBe(91);
    expect(mockTx.existencia.update).toHaveBeenCalledWith({
      where: { id: 'ex-001' },
      data: { cantidad: 50 }, // 48 + 2 devueltas
    });
    expect(mockTx.orden.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'DEVUELTA' }),
      }),
    );
    expect(mockTx.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('procesa devolución parcial sin cambiar estado', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenParaDevolver);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'COMPLETADA' });

    const result = await OrdenesService.devolver(
      'ord-001',
      { motivo: 'Uno defectuoso', items: [{ productoId: 'prod-001', cantidad: 1 }] },
      usuarioId, empresaId,
    );

    expect(result.tipo).toBe('PARCIAL');
    expect(result.montoDevolucion).toBe(45.5); // 91 * (1/2) proporción
    expect(mockTx.existencia.update).toHaveBeenCalledWith({
      where: { id: 'ex-001' },
      data: { cantidad: 49 }, // 48 + 1 devuelta
    });
    expect(mockTx.orden.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'COMPLETADA' }),
      }),
    );
  });

  it('libera crédito proporcionalmente en devolución parcial', async () => {
    const ordenCredito = {
      ...ordenParaDevolver,
      clienteId: 'cli-001',
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 91 }],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCredito);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'COMPLETADA' });

    await OrdenesService.devolver(
      'ord-001',
      { motivo: 'Uno defectuoso', items: [{ productoId: 'prod-001', cantidad: 1 }] },
      usuarioId, empresaId,
    );

    // Proporción: 45.5 / 91 = 0.5 → libera 91 * 0.5 = 45.5
    expect(mockTx.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cli-001' },
      data: { creditoUtilizado: { decrement: 45.5 } },
    });
  });

  it('libera crédito total en devolución total', async () => {
    const ordenCredito = {
      ...ordenParaDevolver,
      clienteId: 'cli-001',
      pagos: [{ metodo: 'CREDITO_CLIENTE', monto: 91 }],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCredito);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'DEVUELTA' });

    await OrdenesService.devolver(
      'ord-001',
      { motivo: 'Todo defectuoso', items: [{ productoId: 'prod-001', cantidad: 2 }] },
      usuarioId, empresaId,
    );

    expect(mockTx.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cli-001' },
      data: { creditoUtilizado: { decrement: 91 } },
    });
  });

  it('no modifica stock de productos sin rastreo de inventario', async () => {
    const ordenSinRastreo = {
      ...ordenParaDevolver,
      detalles: [
        {
          ...ordenParaDevolver.detalles[0],
          producto: { ...productoConStock, rastrearInventario: false, existencias: [] },
        },
      ],
    };
    mockPrisma.orden.findFirst.mockResolvedValue(ordenSinRastreo);

    const mockTx = configurarTransaction();
    mockTx.orden.update.mockResolvedValue({ estado: 'DEVUELTA' });

    await OrdenesService.devolver(
      'ord-001',
      { motivo: 'Defecto', items: [{ productoId: 'prod-001', cantidad: 2 }] },
      usuarioId, empresaId,
    );

    expect(mockTx.existencia.update).not.toHaveBeenCalled();
    expect(mockTx.movimientoInventario.create).not.toHaveBeenCalled();
  });
});

// ─── Listar — Filtros ─────────────────────────────────────

describe('OrdenesService.listar — filtros', () => {
  beforeEach(() => {
    const { cache: mockCache } = require('../../config/cache');
    mockCache.get.mockReturnValue(null); // Sin cache
    mockPrisma.orden.findMany.mockResolvedValue([]);
    mockPrisma.orden.count.mockResolvedValue(0);
  });

  it('aplica filtro por estado', async () => {
    await OrdenesService.listar({ pagina: 1, limite: 20, estado: 'COMPLETADA' } as any, empresaId);

    const where = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(where.estado).toBe('COMPLETADA');
  });

  it('aplica filtro por clienteId', async () => {
    await OrdenesService.listar({ pagina: 1, limite: 20, clienteId: 'cli-001' } as any, empresaId);

    const where = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(where.clienteId).toBe('cli-001');
  });

  it('aplica filtros de rango de fecha', async () => {
    await OrdenesService.listar({
      pagina: 1, limite: 20,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
    } as any, empresaId);

    const where = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(where.creadoEn.gte).toEqual(new Date('2026-01-01'));
    expect(where.creadoEn.lte).toEqual(new Date('2026-12-31'));
  });

  it('aplica filtro de búsqueda por texto', async () => {
    await OrdenesService.listar({ pagina: 1, limite: 20, buscar: 'VTA-2026' } as any, empresaId);

    const where = mockPrisma.orden.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeDefined();
    expect(where.OR).toHaveLength(2);
  });
});
