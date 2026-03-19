/**
 * Tests unitarios: entregas.service.ts
 * Valida la lógica de negocio de entregas: creación, transiciones de estado,
 * y las reglas de validación sin tocar la base de datos.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorNoEncontrado, ErrorNegocio, ErrorConflicto, ErrorAcceso } from '../../compartido/errores';

// ─── Mock de Prisma ───────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockPrisma = {
  orden: { findFirst: jest.fn() },
  entrega: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  usuario: { findFirst: jest.fn() },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../config/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn() },
  CacheTTL: { PRODUCTOS: 300 },
  invalidarCacheModulo: jest.fn(),
}));

jest.mock('../../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../compartido/paginacion', () => ({
  paginar: ({ pagina, limite }: { pagina: number; limite: number }) => ({
    skip: (pagina - 1) * limite,
    take: limite,
  }),
  construirMeta: (total: number, { pagina, limite }: { pagina: number; limite: number }) => ({
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  }),
}));

// Import AFTER mocks
import { EntregasService } from './entregas.service';

// ─── Datos de prueba ──────────────────────────────────────

const empresaId = 'empresa-test-001';
const ordenCompletada = {
  id: 'orden-001',
  empresaId,
  estado: 'COMPLETADA',
  clienteId: 'cliente-001',
};
const entregaBase = {
  id: 'entrega-001',
  ordenId: 'orden-001',
  asignadoAId: 'rep-001',
  estado: 'ASIGNADO',
  notas: null,
};
const entregaConIncludes = {
  ...entregaBase,
  orden: { id: 'orden-001', numeroOrden: 'VTA-2026-00001', total: 100 },
  cliente: { id: 'cliente-001', nombre: 'Test', telefono: '555' },
  asignadoA: { id: 'rep-001', nombre: 'Repartidor' },
};

const actorAdmin = { usuarioId: 'admin-001', rol: 'ADMIN' };
const actorRepartidorAsignado = { usuarioId: 'rep-001', rol: 'REPARTIDOR' };
const actorRepartidorNoAsignado = { usuarioId: 'rep-999', rol: 'REPARTIDOR' };
const actorCajero = { usuarioId: 'caj-001', rol: 'CAJERO' };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Crear entrega ────────────────────────────────────────

describe('EntregasService.crear', () => {
  const dtoCrear = {
    ordenId: 'orden-001',
    direccionEntrega: 'Av. Reforma 100, CDMX',
  };

  it('crea entrega para orden completada', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompletada);
    mockPrisma.entrega.findUnique.mockResolvedValue(null);
    mockPrisma.entrega.create.mockResolvedValue(entregaConIncludes);

    const result = await EntregasService.crear(dtoCrear, empresaId);

    expect(result).toEqual(entregaConIncludes);
    expect(mockPrisma.orden.findFirst).toHaveBeenCalledWith({
      where: { id: 'orden-001', empresaId },
    });
  });

  it('lanza ErrorNoEncontrado si la orden no existe', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(null);

    await expect(EntregasService.crear(dtoCrear, empresaId))
      .rejects.toThrow(ErrorNoEncontrado);
  });

  it('lanza ErrorNegocio si la orden no está COMPLETADA', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue({
      ...ordenCompletada,
      estado: 'PENDIENTE',
    });

    await expect(EntregasService.crear(dtoCrear, empresaId))
      .rejects.toThrow(ErrorNegocio);
    await expect(EntregasService.crear(dtoCrear, empresaId))
      .rejects.toThrow('Solo se pueden asignar entregas a ordenes completadas');
  });

  it('lanza ErrorConflicto si la orden ya tiene entrega', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompletada);
    mockPrisma.entrega.findUnique.mockResolvedValue(entregaBase);

    await expect(EntregasService.crear(dtoCrear, empresaId))
      .rejects.toThrow(ErrorConflicto);
  });

  it('verifica repartidor si se proporciona asignadoAId', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompletada);
    mockPrisma.entrega.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      EntregasService.crear({ ...dtoCrear, asignadoAId: 'rep-invalid' }, empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);

    expect(mockPrisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'rep-invalid', rol: 'REPARTIDOR', activo: true },
    });
  });

  it('crea entrega con repartidor válido', async () => {
    mockPrisma.orden.findFirst.mockResolvedValue(ordenCompletada);
    mockPrisma.entrega.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.findFirst.mockResolvedValue({ id: 'rep-001', rol: 'REPARTIDOR', activo: true });
    mockPrisma.entrega.create.mockResolvedValue(entregaConIncludes);

    const result = await EntregasService.crear(
      { ...dtoCrear, asignadoAId: 'rep-001' },
      empresaId,
    );

    expect(result).toEqual(entregaConIncludes);
  });
});

// ─── Actualizar estado ────────────────────────────────────

describe('EntregasService.actualizarEstado', () => {
  it('permite ASIGNADO → EN_RUTA', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ASIGNADO' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'EN_RUTA' });

    const result = await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'EN_RUTA' },
      empresaId,
      actorAdmin,
    );

    expect(result.estado).toBe('EN_RUTA');
  });

  it('permite EN_RUTA → ENTREGADO (marca entregadaEn)', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'EN_RUTA' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'ENTREGADO' });

    await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'ENTREGADO' },
      empresaId,
      actorAdmin,
    );

    // Verificar que se envió entregadaEn
    const updateCall = mockPrisma.entrega.update.mock.calls[0][0] as any;
    expect(updateCall.data.entregadaEn).toBeInstanceOf(Date);
    expect(updateCall.data.estado).toBe('ENTREGADO');
  });

  it('permite EN_RUTA → NO_ENTREGADO con motivoFallo', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'EN_RUTA' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'NO_ENTREGADO' });

    await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'NO_ENTREGADO', motivoFallo: 'Nadie en casa' },
      empresaId,
      actorAdmin,
    );

    const updateCall = mockPrisma.entrega.update.mock.calls[0][0] as any;
    expect(updateCall.data.motivoFallo).toBe('Nadie en casa');
  });

  it('rechaza EN_RUTA → NO_ENTREGADO sin motivoFallo', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'EN_RUTA' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'NO_ENTREGADO' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow('Se requiere motivo');
  });

  it('permite EN_RUTA → REPROGRAMADO con fecha', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'EN_RUTA' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'REPROGRAMADO' });

    await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'REPROGRAMADO', programadaEn: '2026-03-15T10:00:00Z' },
      empresaId,
      actorAdmin,
    );

    const updateCall = mockPrisma.entrega.update.mock.calls[0][0] as any;
    expect(updateCall.data.programadaEn).toBeInstanceOf(Date);
  });

  it('rechaza REPROGRAMADO sin fecha', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'EN_RUTA' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'REPROGRAMADO' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow('Se requiere nueva fecha');
  });

  it('permite REPROGRAMADO → EN_RUTA (reintentar)', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'REPROGRAMADO' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'EN_RUTA' });

    const result = await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'EN_RUTA' },
      empresaId,
      actorAdmin,
    );

    expect(result.estado).toBe('EN_RUTA');
  });

  // Transiciones inválidas
  it('rechaza ASIGNADO → ENTREGADO (saltar EN_RUTA)', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ASIGNADO' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'ENTREGADO' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('rechaza ENTREGADO → cualquier estado (estado terminal)', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ENTREGADO' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'EN_RUTA' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('rechaza NO_ENTREGADO → ENTREGADO (estado terminal)', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'NO_ENTREGADO' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'ENTREGADO' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow(ErrorNegocio);
  });

  it('lanza ErrorNoEncontrado cuando entrega no existe', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue(null);

    await expect(
      EntregasService.actualizarEstado(
        'no-existe',
        { estado: 'EN_RUTA' },
        empresaId,
        actorAdmin,
      ),
    ).rejects.toThrow(ErrorNoEncontrado);
  });

  it('permite a REPARTIDOR actualizar su entrega asignada', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ASIGNADO', asignadoAId: 'rep-001' });
    mockPrisma.entrega.update.mockResolvedValue({ ...entregaConIncludes, estado: 'EN_RUTA' });

    const result = await EntregasService.actualizarEstado(
      'entrega-001',
      { estado: 'EN_RUTA' },
      empresaId,
      actorRepartidorAsignado,
    );

    expect(result.estado).toBe('EN_RUTA');
  });

  it('rechaza a REPARTIDOR que no tiene la entrega asignada', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ASIGNADO', asignadoAId: 'rep-001' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'EN_RUTA' },
        empresaId,
        actorRepartidorNoAsignado,
      ),
    ).rejects.toThrow(ErrorAcceso);
  });

  it('rechaza roles no permitidos para actualizar entregas', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue({ ...entregaBase, estado: 'ASIGNADO', asignadoAId: 'rep-001' });

    await expect(
      EntregasService.actualizarEstado(
        'entrega-001',
        { estado: 'EN_RUTA' },
        empresaId,
        actorCajero,
      ),
    ).rejects.toThrow(ErrorAcceso);
  });
});

// ─── Obtener por ID ───────────────────────────────────────

describe('EntregasService.obtenerPorId', () => {
  it('retorna entrega con includes', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue(entregaConIncludes);

    const result = await EntregasService.obtenerPorId('entrega-001', empresaId);
    expect(result).toEqual(entregaConIncludes);
  });

  it('lanza ErrorNoEncontrado si no existe', async () => {
    mockPrisma.entrega.findFirst.mockResolvedValue(null);

    await expect(
      EntregasService.obtenerPorId('no-existe', empresaId),
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});

// ─── Listar ───────────────────────────────────────────────

describe('EntregasService.listar', () => {
  it('retorna datos paginados', async () => {
    const entregas = [entregaConIncludes];
    mockPrisma.entrega.findMany.mockResolvedValue(entregas);
    mockPrisma.entrega.count.mockResolvedValue(1);

    const result = await EntregasService.listar(
      { pagina: 1, limite: 20 },
      empresaId,
    );

    expect((result as any).datos).toEqual(entregas);
    expect((result as any).meta.total).toBe(1);
    expect((result as any).meta.pagina).toBe(1);
  });
});
