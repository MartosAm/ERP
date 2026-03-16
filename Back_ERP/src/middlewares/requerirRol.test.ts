/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { requerirRol } from './requerirRol';
import { manejarErrores } from './manejarErrores';

jest.mock('../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../config/env', () => ({
  env: { NODE_ENV: 'test', JWT_SECRET: 'test' },
}));

function crearApp(rol: string) {
  const app = express();

  // Inyectar req.user
  app.use((req, _res, next) => {
    (req as any).user = { usuarioId: 'u1', rol };
    next();
  });

  // Ruta protegida solo ADMIN
  app.get('/admin-only', requerirRol('ADMIN'), (_req, res) => {
    res.json({ ok: true });
  });

  // Ruta protegida ADMIN o CAJERO
  app.get('/admin-cajero', requerirRol('ADMIN', 'CAJERO'), (_req, res) => {
    res.json({ ok: true });
  });

  app.use(manejarErrores);
  return app;
}

describe('requerirRol middleware', () => {
  it('permite acceso si el rol coincide (ADMIN)', async () => {
    const res = await request(crearApp('ADMIN')).get('/admin-only');
    expect(res.status).toBe(200);
  });

  it('403 si el rol no coincide (CAJERO en ruta ADMIN)', async () => {
    const res = await request(crearApp('CAJERO')).get('/admin-only');
    expect(res.status).toBe(403);
  });

  it('403 para REPARTIDOR en ruta ADMIN', async () => {
    const res = await request(crearApp('REPARTIDOR')).get('/admin-only');
    expect(res.status).toBe(403);
  });

  it('permite CAJERO en ruta ADMIN+CAJERO', async () => {
    const res = await request(crearApp('CAJERO')).get('/admin-cajero');
    expect(res.status).toBe(200);
  });

  it('permite ADMIN en ruta ADMIN+CAJERO', async () => {
    const res = await request(crearApp('ADMIN')).get('/admin-cajero');
    expect(res.status).toBe(200);
  });

  it('403 sin req.user', async () => {
    const app = express();
    app.get('/admin-only', requerirRol('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(manejarErrores);

    const res = await request(app).get('/admin-only');
    expect(res.status).toBe(403);
  });
});
