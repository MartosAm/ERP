/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express, { Router } from 'express';
import { ZodError } from 'zod';
import { manejarErrores } from './manejarErrores';
import {
  AppError,
  ErrorPeticion,
  ErrorNoAutorizado,
  ErrorAcceso,
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../compartido/errores';

// Mock logger to suppress output
jest.mock('../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock env
jest.mock('../config/env', () => ({
  env: { NODE_ENV: 'test', JWT_SECRET: 'test' },
}));

function crearAppConError(error: unknown) {
  const app = express();
  app.use(express.json());
  app.get('/test', (_req, _res) => {
    throw error;
  });
  app.post('/test', (req, _res) => {
    throw error;
  });
  app.use(manejarErrores);
  return app;
}

// ─── AppError subclases ───────────────────────────────────

describe('manejarErrores — AppError subclases', () => {
  it('400 para ErrorPeticion', async () => {
    const app = crearAppConError(new ErrorPeticion('Datos invalidos'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.mensaje).toBe('Datos invalidos');
  });

  it('401 para ErrorNoAutorizado', async () => {
    const app = crearAppConError(new ErrorNoAutorizado('Token requerido'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('UNAUTHORIZED');
  });

  it('403 para ErrorAcceso', async () => {
    const app = crearAppConError(new ErrorAcceso('Sin permisos'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(403);
  });

  it('404 para ErrorNoEncontrado', async () => {
    const app = crearAppConError(new ErrorNoEncontrado('No encontrado'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(404);
  });

  it('409 para ErrorConflicto', async () => {
    const app = crearAppConError(new ErrorConflicto('Duplicado'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(409);
  });

  it('422 para ErrorNegocio', async () => {
    const app = crearAppConError(new ErrorNegocio('Operacion invalida'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
  });
});

// ─── ZodError ─────────────────────────────────────────────

describe('manejarErrores — ZodError', () => {
  it('400 con detalles de validacion', async () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['nombre'],
        message: 'Required',
      },
    ]);

    const app = crearAppConError(zodError);
    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDATION_ERROR');
  });
});

// ─── Prisma errors ────────────────────────────────────────

describe('manejarErrores — Errores Prisma', () => {
  it('409 para P2002 (unique violation)', async () => {
    const err = Object.assign(new Error('Unique violation'), { code: 'P2002' });
    const app = crearAppConError(err);
    const res = await request(app).get('/test');

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICT');
  });

  it('404 para P2025 (not found)', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    const app = crearAppConError(err);
    const res = await request(app).get('/test');

    expect(res.status).toBe(404);
  });

  it('400 para P2003 (foreign key)', async () => {
    const err = Object.assign(new Error('FK violation'), { code: 'P2003' });
    const app = crearAppConError(err);
    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
  });

  it('503 para P2024 (pool timeout)', async () => {
    const err = Object.assign(new Error('Pool timeout'), { code: 'P2024' });
    const app = crearAppConError(err);
    const res = await request(app).get('/test');

    expect(res.status).toBe(503);
  });
});

// ─── JSON malformado ──────────────────────────────────────

describe('manejarErrores — JSON malformado', () => {
  it('400 para JSON inválido en body', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test', (_req, res) => res.json({ ok: true }));
    app.use(manejarErrores);

    const res = await request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('BAD_REQUEST');
  });
});

// ─── Error genérico ───────────────────────────────────────

describe('manejarErrores — Error genérico', () => {
  it('500 para error no controlado', async () => {
    const app = crearAppConError(new Error('Unexpected'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.error.codigo).toBe('INTERNAL_ERROR');
  });
});
