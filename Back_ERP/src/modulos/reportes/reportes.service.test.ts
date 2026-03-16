/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────

const mockPrisma = {
  orden: { aggregate: jest.fn(), count: jest.fn() },
  sesion: { count: jest.fn() },
  turnoCaja: { count: jest.fn() },
  compra: { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

const mockCache = { get: jest.fn(), set: jest.fn() };
jest.mock('../../config/cache', () => ({
  cache: mockCache,
  CacheTTL: { PRODUCTOS: 120 },
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Import AFTER mocks
import { ReportesService } from './reportes.service';

const empresaId = 'empresa-001';

// Helper: mock aggregate result
const aggrEmpty = {
  _sum: { total: null, montoDescuento: null, montoImpuesto: null },
  _count: { id: 0 },
  _avg: { total: null },
  _max: { total: null },
  _min: { total: null },
};

beforeEach(() => jest.clearAllMocks());

// ─── Dashboard ────────────────────────────────────────────

describe('ReportesService.dashboard', () => {
  it('retorna datos del cache si existen', async () => {
    const cached = { ventasHoy: { total: 100 } };
    mockCache.get.mockReturnValue(cached);

    const result = await ReportesService.dashboard(empresaId);
    expect(result).toBe(cached);
    expect(mockPrisma.orden.aggregate).not.toHaveBeenCalled();
  });

  it('ejecuta 12 consultas en paralelo y estructura el resultado', async () => {
    mockCache.get.mockReturnValue(null);

    // ventasHoy
    mockPrisma.orden.aggregate
      .mockResolvedValueOnce({
        _sum: { total: 5000 },
        _count: { id: 10 },
        _avg: { total: 500 },
      })
      // ventasMes
      .mockResolvedValueOnce({ _sum: { total: 50000 }, _count: { id: 100 } })
      // ventasMesAnterior
      .mockResolvedValueOnce({ _sum: { total: 40000 }, _count: { id: 80 } })
      // cotizaciones
      .mockResolvedValueOnce({ _sum: { total: 3000 }, _count: { id: 5 } })
      // devolucionesHoy
      .mockResolvedValueOnce({ _sum: { total: 200 }, _count: { id: 1 } })
      // devolucionesMes
      .mockResolvedValueOnce({ _sum: { total: 1500 }, _count: { id: 3 } });

    // ordenesPendientesEntrega
    mockPrisma.orden.count.mockResolvedValue(7);

    // productosStockBajo ($queryRaw call 1)
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ count: BigInt(12) }])
      // utilidadMes ($queryRaw call 2)
      .mockResolvedValueOnce([
        { ingresos: 45000, costo: 30000, utilidad: 15000 },
      ]);

    // sesionesActivas
    mockPrisma.sesion.count.mockResolvedValue(4);

    // turnosAbiertos
    mockPrisma.turnoCaja.count.mockResolvedValue(2);

    // comprasMes
    mockPrisma.compra.aggregate.mockResolvedValue({
      _sum: { total: 20000 },
      _count: { id: 15 },
    });

    const result = await ReportesService.dashboard(empresaId);

    expect(result.ventasHoy.total).toBe(5000);
    expect(result.ventasHoy.ticketPromedio).toBe(500);
    expect(result.ventasMes.total).toBe(50000);
    expect(result.ventasMes.variacionVsMesAnterior).toBe(25); // (50k-40k)/40k*100
    expect(result.cotizaciones.pendientes).toBe(5);
    expect(result.utilidad.margenPorcentaje).toBeGreaterThan(0);
    expect(result.productosStockBajo).toBe(12);
    expect(result.sesionesActivas).toBe(4);
    expect(result.turnosAbiertos).toBe(2);
    expect(result.generadoEn).toBeDefined();

    // Debe guardar en cache
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('dashboard'),
      expect.any(Object),
      60,
    );
  });
});

// ─── Ventas Resumen ───────────────────────────────────────

describe('ReportesService.ventasResumen', () => {
  const filtros = { fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' };

  it('retorna cache si existe', async () => {
    const cached = { periodo: filtros };
    mockCache.get.mockReturnValue(cached);

    const result = await ReportesService.ventasResumen(filtros as any, empresaId);
    expect(result).toBe(cached);
  });

  it('estructura resumen de ventas con utilidad y desglose diario', async () => {
    mockCache.get.mockReturnValue(null);

    // totales
    mockPrisma.orden.aggregate
      .mockResolvedValueOnce({
        ...aggrEmpty,
        _sum: { total: 100000, montoDescuento: 5000, montoImpuesto: 16000 },
        _count: { id: 200 },
        _avg: { total: 500 },
        _max: { total: 2000 },
        _min: { total: 50 },
      })
      // cancelaciones
      .mockResolvedValueOnce({ _sum: { total: 3000 }, _count: { id: 5 } })
      // devoluciones
      .mockResolvedValueOnce({ _sum: { total: 2000 }, _count: { id: 3 } })
      // cotizaciones
      .mockResolvedValueOnce({ _sum: { total: 8000 }, _count: { id: 10 } });

    // utilidad ($queryRaw)
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { ingresos: 90000, costo: 60000, utilidad: 30000 },
      ])
      // ventasPorDia
      .mockResolvedValueOnce([
        { fecha: '2024-01-01', total: 5000, cantidad: 10 },
        { fecha: '2024-01-02', total: 6000, cantidad: 12 },
      ]);

    const result = await ReportesService.ventasResumen(filtros as any, empresaId);

    expect(result.periodo.desde).toBe('2024-01-01');
    expect(result.totales.ventasBrutas).toBe(100000);
    expect(result.totales.cantidadOrdenes).toBe(200);
    expect(result.utilidad.margenPorcentaje).toBeGreaterThan(0);
    expect(result.cancelaciones.cantidad).toBe(5);
    expect(result.devoluciones.cantidad).toBe(3);
    expect(result.ventasPorDia).toHaveLength(2);
  });
});

// ─── Top Productos ────────────────────────────────────────

describe('ReportesService.topProductos', () => {
  const filtros = {
    fechaDesde: '2024-01-01',
    fechaHasta: '2024-01-31',
    limite: 10,
  };

  it('retorna top por cantidad e ingresos', async () => {
    mockCache.get.mockReturnValue(null);

    const topItem = {
      productoId: 'p1',
      nombre: 'Producto A',
      sku: 'SKU001',
      cantidadVendida: 50,
      ingresos: 25000,
    };

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([topItem])
      .mockResolvedValueOnce([topItem]);

    const result = await ReportesService.topProductos(filtros as any, empresaId);

    expect(result.porCantidad).toHaveLength(1);
    expect(result.porIngresos).toHaveLength(1);
    expect(result.porCantidad[0].nombre).toBe('Producto A');
  });
});

// ─── Métodos de Pago ──────────────────────────────────────

describe('ReportesService.metodosPago', () => {
  const filtros = { fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' };

  it('calcula porcentajes correctamente', async () => {
    mockCache.get.mockReturnValue(null);

    mockPrisma.$queryRaw.mockResolvedValue([
      { metodo: 'EFECTIVO', total: 6000, cantidad: 30 },
      { metodo: 'TARJETA', total: 4000, cantidad: 20 },
    ]);

    const result = await ReportesService.metodosPago(filtros as any, empresaId);

    expect(result.totalGeneral).toBe(10000);
    expect(result.desglose[0].porcentaje).toBe(60);
    expect(result.desglose[1].porcentaje).toBe(40);
  });
});

// ─── Inventario Valorizado ────────────────────────────────

describe('ReportesService.inventarioValorizado', () => {
  it('agrupa valor de inventario por almacén y categoría', async () => {
    mockCache.get.mockReturnValue(null);

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        {
          almacenId: 'a1',
          almacen: 'Principal',
          totalProductos: 50,
          totalUnidades: 500,
          valorTotal: 250000,
        },
      ])
      .mockResolvedValueOnce([
        {
          categoriaId: 'c1',
          categoria: 'Electrónicos',
          totalProductos: 20,
          totalUnidades: 200,
          valorTotal: 180000,
        },
      ]);

    const result = await ReportesService.inventarioValorizado(empresaId);

    expect(result.valorTotalGlobal).toBe(250000);
    expect(result.porAlmacen).toHaveLength(1);
    expect(result.porCategoria).toHaveLength(1);
    expect(result.generadoEn).toBeDefined();
  });
});

// ─── Rendimiento Cajeros ──────────────────────────────────

describe('ReportesService.rendimientoCajeros', () => {
  const filtros = { fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' };

  it('retorna rendimiento por cajero', async () => {
    mockCache.get.mockReturnValue(null);

    mockPrisma.$queryRaw.mockResolvedValue([
      {
        usuarioId: 'u1',
        nombre: 'Cajero 1',
        rol: 'CAJERO',
        totalOrdenes: 100,
        totalVendido: 50000,
        ticketPromedio: 500,
        cancelaciones: 2,
      },
    ]);

    const result = await ReportesService.rendimientoCajeros(
      filtros as any,
      empresaId,
    );

    expect(result.cajeros).toHaveLength(1);
    expect(result.cajeros[0].totalOrdenes).toBe(100);
    expect(result.periodo.desde).toBe('2024-01-01');
  });
});

// ─── Reporte Entregas ─────────────────────────────────────

describe('ReportesService.reporteEntregas', () => {
  const filtros = { fechaDesde: '2024-01-01', fechaHasta: '2024-01-31' };

  it('calcula tasa de éxito global y agrupa por repartidor', async () => {
    mockCache.get.mockReturnValue(null);

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { estado: 'ENTREGADO', cantidad: 80 },
        { estado: 'NO_ENTREGADO', cantidad: 10 },
        { estado: 'EN_CAMINO', cantidad: 10 },
      ])
      .mockResolvedValueOnce([
        {
          repartidorId: 'r1',
          nombre: 'Repartidor 1',
          entregadas: 40,
          noEntregadas: 5,
          tasaExito: 88.89,
        },
      ]);

    const result = await ReportesService.reporteEntregas(
      filtros as any,
      empresaId,
    );

    expect(result.totalEntregas).toBe(100);
    expect(result.tasaExitoGlobal).toBe(80);
    expect(result.porEstado).toHaveLength(3);
    expect(result.porRepartidor).toHaveLength(1);
  });
});
