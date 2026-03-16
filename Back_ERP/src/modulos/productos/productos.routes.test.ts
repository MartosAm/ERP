/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { Router } from 'express';
import { asyncHandler } from '../../compartido/asyncHandler';
import { validar } from '../../middlewares/validar';
import { requerirRol } from '../../middlewares/requerirRol';
import { crearAppTest } from '../../__tests__/helpers';
import { ErrorNoEncontrado, ErrorConflicto, ErrorNegocio } from '../../compartido/errores';
import {
  CrearProductoSchema,
  ActualizarProductoSchema,
  FiltroProductosSchema,
} from './productos.schema';

// ─── Mock ProductosService ────────────────────────────────

const mockService = {
  listar: jest.fn(),
  buscarPorCodigo: jest.fn(),
  obtenerPorId: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
  eliminar: jest.fn(),
};

jest.mock('./productos.service', () => ({ ProductosService: mockService }));

// ─── Build router (mirrors productos.routes.ts without autenticar) ──

function buildRouter() {
  const router = Router();

  router.get('/', validar(FiltroProductosSchema, 'query'), asyncHandler(async (req, res) => {
    const { datos, meta } = await mockService.listar(
      (req as any).user.empresaId,
      req.query,
      (req as any).user.rol,
    );
    res.json({ exito: true, datos, mensaje: 'Productos obtenidos', meta });
  }));

  router.get('/codigo/:codigo', asyncHandler(async (req, res) => {
    const producto = await mockService.buscarPorCodigo(
      req.params.codigo,
      (req as any).user.empresaId,
    );
    res.json({ exito: true, datos: producto, mensaje: 'OK', meta: null });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const producto = await mockService.obtenerPorId(
      req.params.id,
      (req as any).user.empresaId,
      (req as any).user.rol,
    );
    res.json({ exito: true, datos: producto, mensaje: 'OK', meta: null });
  }));

  router.post('/', requerirRol('ADMIN'), validar(CrearProductoSchema), asyncHandler(async (req, res) => {
    const producto = await mockService.crear((req as any).user.empresaId, req.body);
    res.status(201).json({ exito: true, datos: producto, mensaje: 'Producto creado', meta: null });
  }));

  router.patch('/:id', requerirRol('ADMIN'), validar(ActualizarProductoSchema), asyncHandler(async (req, res) => {
    const producto = await mockService.actualizar(
      req.params.id,
      (req as any).user.empresaId,
      req.body,
    );
    res.json({ exito: true, datos: producto, mensaje: 'Producto actualizado', meta: null });
  }));

  router.delete('/:id', requerirRol('ADMIN'), asyncHandler(async (req, res) => {
    await mockService.eliminar(req.params.id, (req as any).user.empresaId);
    res.json({ exito: true, datos: null, mensaje: 'Producto eliminado', meta: null });
  }));

  return router;
}

const adminUser = {
  usuarioId: 'admin-001',
  empresaId: 'empresa-001',
  sesionId: 'sesion-001',
  rol: 'ADMIN',
};

const cajeroUser = { ...adminUser, usuarioId: 'cajero-001', rol: 'CAJERO' };

const productoMock = {
  id: 'prod-001',
  sku: 'SKU001',
  nombre: 'Producto Test',
  precioVenta1: 100,
};

beforeEach(() => jest.clearAllMocks());

// ─── GET / (listar) ──────────────────────────────────────

describe('GET / (listar productos)', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — retorna lista paginada', async () => {
    mockService.listar.mockResolvedValue({
      datos: [productoMock],
      meta: { total: 1, pagina: 1, limite: 20, totalPaginas: 1 },
    });

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('200 — cajero también puede listar', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);
    mockService.listar.mockResolvedValue({ datos: [], meta: {} });

    const res = await request(appCajero).get('/');
    expect(res.status).toBe(200);
  });
});

// ─── GET /codigo/:codigo ─────────────────────────────────

describe('GET /codigo/:codigo', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — encuentra producto por SKU', async () => {
    mockService.buscarPorCodigo.mockResolvedValue(productoMock);

    const res = await request(app).get('/codigo/SKU001');

    expect(res.status).toBe(200);
    expect(res.body.datos.sku).toBe('SKU001');
  });

  it('404 — código no encontrado', async () => {
    mockService.buscarPorCodigo.mockRejectedValue(
      new ErrorNoEncontrado('Producto no encontrado'),
    );

    const res = await request(app).get('/codigo/NOEXISTE');
    expect(res.status).toBe(404);
  });
});

// ─── GET /:id ─────────────────────────────────────────────

describe('GET /:id', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — retorna detalle', async () => {
    mockService.obtenerPorId.mockResolvedValue(productoMock);

    const res = await request(app).get('/prod-001');

    expect(res.status).toBe(200);
    expect(res.body.datos.id).toBe('prod-001');
  });

  it('404 — producto no encontrado', async () => {
    mockService.obtenerPorId.mockRejectedValue(
      new ErrorNoEncontrado('Producto no encontrado'),
    );

    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
  });
});

// ─── POST / (crear) ──────────────────────────────────────

describe('POST / (crear producto)', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('201 — crea producto', async () => {
    mockService.crear.mockResolvedValue(productoMock);

    const res = await request(app)
      .post('/')
      .send({ sku: 'SKU001', nombre: 'Producto Test' });

    expect(res.status).toBe(201);
    expect(res.body.datos.sku).toBe('SKU001');
  });

  it('400 — falta nombre', async () => {
    const res = await request(app)
      .post('/')
      .send({ sku: 'SKU001' });

    expect(res.status).toBe(400);
  });

  it('400 — falta sku', async () => {
    const res = await request(app)
      .post('/')
      .send({ nombre: 'Producto Test' });

    expect(res.status).toBe(400);
  });

  it('409 — sku duplicado', async () => {
    mockService.crear.mockRejectedValue(
      new ErrorConflicto('Ya existe un producto con ese SKU'),
    );

    const res = await request(app)
      .post('/')
      .send({ sku: 'SKU001', nombre: 'Dup' });

    expect(res.status).toBe(409);
  });

  it('403 — cajero no puede crear', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);

    const res = await request(appCajero)
      .post('/')
      .send({ sku: 'SKU001', nombre: 'Test' });

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:id (actualizar) ─────────────────────────────

describe('PATCH /:id (actualizar)', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — actualiza parcialmente', async () => {
    mockService.actualizar.mockResolvedValue({ ...productoMock, nombre: 'Nuevo Nombre' });

    const res = await request(app)
      .patch('/prod-001')
      .send({ nombre: 'Nuevo Nombre' });

    expect(res.status).toBe(200);
    expect(res.body.datos.nombre).toBe('Nuevo Nombre');
  });

  it('404 — producto no encontrado', async () => {
    mockService.actualizar.mockRejectedValue(
      new ErrorNoEncontrado('Producto no encontrado'),
    );

    const res = await request(app)
      .patch('/no-existe')
      .send({ nombre: 'Nombre Válido' });

    expect(res.status).toBe(404);
  });

  it('403 — cajero no puede actualizar', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);

    const res = await request(appCajero)
      .patch('/prod-001')
      .send({ nombre: 'Nuevo Nombre' });

    expect(res.status).toBe(403);
  });
});

// ─── DELETE /:id (eliminar) ──────────────────────────────

describe('DELETE /:id (eliminar)', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — elimina producto', async () => {
    mockService.eliminar.mockResolvedValue(undefined);

    const res = await request(app).delete('/prod-001');

    expect(res.status).toBe(200);
    expect(res.body.datos).toBeNull();
  });

  it('404 — producto no encontrado', async () => {
    mockService.eliminar.mockRejectedValue(
      new ErrorNoEncontrado('Producto no encontrado'),
    );

    const res = await request(app).delete('/no-existe');
    expect(res.status).toBe(404);
  });

  it('422 — producto tiene existencias', async () => {
    mockService.eliminar.mockRejectedValue(
      new ErrorNegocio('No se puede eliminar un producto con existencias'),
    );

    const res = await request(app).delete('/prod-001');
    expect(res.status).toBe(422);
  });

  it('403 — cajero no puede eliminar', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);

    const res = await request(appCajero).delete('/prod-001');
    expect(res.status).toBe(403);
  });
});
