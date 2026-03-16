/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { Router } from 'express';
import { asyncHandler } from '../../compartido/asyncHandler';
import { validar } from '../../middlewares/validar';
import { requerirRol } from '../../middlewares/requerirRol';
import { crearAppTest } from '../../__tests__/helpers';
import {
  ErrorNoEncontrado,
  ErrorNoAutorizado,
  ErrorConflicto,
} from '../../compartido/errores';
import { LoginSchema, RegistroSchema, CambiarPinSchema } from './auth.schema';

// ─── Mock AuthService ─────────────────────────────────────

const mockAuthService = {
  registrar: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  obtenerPerfil: jest.fn(),
  cambiarPin: jest.fn(),
};

jest.mock('./auth.service', () => ({ AuthService: mockAuthService }));

// ─── Build router (identical to auth.routes.ts minus autenticar + rate limit) ──

function buildRouter(user?: Record<string, unknown>) {
  const router = Router();

  // Public
  router.post('/login', validar(LoginSchema), asyncHandler(async (req, res) => {
    const resultado = await mockAuthService.login(req.body, req.ip, req.headers['user-agent']);
    res.json({ exito: true, datos: resultado, mensaje: 'Inicio de sesion exitoso', meta: null });
  }));

  // Protected (user injected by helper)
  router.post('/registro', requerirRol('ADMIN'), validar(RegistroSchema), asyncHandler(async (req, res) => {
    const usuario = await mockAuthService.registrar(req.body, (req as any).user.empresaId);
    res.status(201).json({ exito: true, datos: usuario, mensaje: 'Usuario registrado exitosamente', meta: null });
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    await mockAuthService.logout((req as any).user.sesionId);
    res.json({ exito: true, datos: null, mensaje: 'Sesion cerrada exitosamente', meta: null });
  }));

  router.get('/perfil', asyncHandler(async (req, res) => {
    const usuario = await mockAuthService.obtenerPerfil((req as any).user.usuarioId, (req as any).user.empresaId);
    res.json({ exito: true, datos: usuario, mensaje: 'OK', meta: null });
  }));

  router.post('/cambiar-pin', requerirRol('ADMIN'), validar(CambiarPinSchema), asyncHandler(async (req, res) => {
    await mockAuthService.cambiarPin(req.body, (req as any).user.empresaId);
    res.json({ exito: true, datos: null, mensaje: 'PIN actualizado exitosamente', meta: null });
  }));

  return router;
}

const adminUser = {
  usuarioId: 'admin-001',
  empresaId: 'empresa-001',
  sesionId: 'sesion-001',
  rol: 'ADMIN',
};

const cajeroUser = {
  ...adminUser,
  usuarioId: 'cajero-001',
  rol: 'CAJERO',
};

beforeEach(() => jest.clearAllMocks());

// ─── Login ────────────────────────────────────────────────

describe('POST /login', () => {
  const app = crearAppTest(buildRouter());

  it('200 — login exitoso', async () => {
    mockAuthService.login.mockResolvedValue({ token: 'abc123', usuario: { nombre: 'Admin' } });

    const res = await request(app)
      .post('/login')
      .send({ correo: 'admin@test.com', contrasena: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.datos.token).toBe('abc123');
  });

  it('400 — correo inválido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ correo: 'no-un-email', contrasena: 'Password123' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  it('400 — contraseña falta', async () => {
    const res = await request(app)
      .post('/login')
      .send({ correo: 'admin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  it('401 — credenciales inválidas', async () => {
    mockAuthService.login.mockRejectedValue(new ErrorNoAutorizado('Credenciales invalidas'));

    const res = await request(app)
      .post('/login')
      .send({ correo: 'admin@test.com', contrasena: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.exito).toBe(false);
  });
});

// ─── Registro (solo ADMIN) ────────────────────────────────

describe('POST /registro', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('201 — registra usuario exitosamente', async () => {
    mockAuthService.registrar.mockResolvedValue({ id: 'u1', nombre: 'Nuevo' });

    const res = await request(app)
      .post('/registro')
      .send({
        nombre: 'Nuevo Cajero',
        correo: 'nuevo@test.com',
        contrasena: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.exito).toBe(true);
  });

  it('400 — datos de entrada inválidos (sin correo)', async () => {
    const res = await request(app)
      .post('/registro')
      .send({ nombre: 'X', contrasena: 'Password123' });

    expect(res.status).toBe(400);
  });

  it('409 — correo duplicado', async () => {
    mockAuthService.registrar.mockRejectedValue(new ErrorConflicto('Ya existe un usuario con ese correo'));

    const res = await request(app)
      .post('/registro')
      .send({
        nombre: 'Dup',
        correo: 'dup@test.com',
        contrasena: 'Password123',
      });

    expect(res.status).toBe(409);
  });

  it('403 — cajero no puede registrar', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);

    const res = await request(appCajero)
      .post('/registro')
      .send({
        nombre: 'Nuevo',
        correo: 'nuevo@test.com',
        contrasena: 'Password123',
      });

    expect(res.status).toBe(403);
  });
});

// ─── Logout ───────────────────────────────────────────────

describe('POST /logout', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — cierra sesion', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    const res = await request(app).post('/logout');

    expect(res.status).toBe(200);
    expect(res.body.datos).toBeNull();
    expect(mockAuthService.logout).toHaveBeenCalledWith('sesion-001');
  });
});

// ─── Perfil ───────────────────────────────────────────────

describe('GET /perfil', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — retorna perfil del usuario', async () => {
    mockAuthService.obtenerPerfil.mockResolvedValue({
      id: 'admin-001',
      nombre: 'Admin',
      correo: 'admin@test.com',
    });

    const res = await request(app).get('/perfil');

    expect(res.status).toBe(200);
    expect(res.body.datos.nombre).toBe('Admin');
  });

  it('404 — usuario no encontrado', async () => {
    mockAuthService.obtenerPerfil.mockRejectedValue(new ErrorNoEncontrado('Usuario no encontrado'));

    const res = await request(app).get('/perfil');

    expect(res.status).toBe(404);
  });
});

// ─── Cambiar PIN (solo ADMIN) ─────────────────────────────

describe('POST /cambiar-pin', () => {
  const app = crearAppTest(buildRouter(), adminUser);

  it('200 — cambia pin exitosamente', async () => {
    mockAuthService.cambiarPin.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/cambiar-pin')
      .send({ usuarioId: 'clxyz1234567890abcdefgh', nuevoPin: '1234' });

    expect(res.status).toBe(200);
  });

  it('400 — pin con letras', async () => {
    const res = await request(app)
      .post('/cambiar-pin')
      .send({ usuarioId: 'clxyz1234567890abcdefgh', nuevoPin: 'abcd' });

    expect(res.status).toBe(400);
  });

  it('403 — cajero no puede cambiar pin', async () => {
    const appCajero = crearAppTest(buildRouter(), cajeroUser);

    const res = await request(appCajero)
      .post('/cambiar-pin')
      .send({ usuarioId: 'user-001', nuevoPin: '1234' });

    expect(res.status).toBe(403);
  });
});
