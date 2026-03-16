/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validar } from './validar';
import { manejarErrores } from './manejarErrores';

jest.mock('../compartido/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../config/env', () => ({
  env: { NODE_ENV: 'test', JWT_SECRET: 'test' },
}));

const TestSchema = z.object({
  nombre: z.string().min(2),
  edad: z.number().int().positive(),
});

const QuerySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().default(20),
});

function crearApp() {
  const app = express();
  app.use(express.json());

  // body validation
  app.post('/test', validar(TestSchema), (req, res) => {
    res.json({ datos: req.body });
  });

  // query validation
  app.get('/test', validar(QuerySchema, 'query'), (req, res) => {
    res.json({ datos: req.query });
  });

  app.use(manejarErrores);
  return app;
}

describe('validar middleware', () => {
  const app = crearApp();

  it('pasa datos válidos en body', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nombre: 'Juan', edad: 30 });

    expect(res.status).toBe(200);
    expect(res.body.datos.nombre).toBe('Juan');
    expect(res.body.datos.edad).toBe(30);
  });

  it('400 para body inválido (nombre corto)', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nombre: 'J', edad: 30 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDATION_ERROR');
  });

  it('400 para body inválido (falta campo)', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nombre: 'Juan' });

    expect(res.status).toBe(400);
  });

  it('400 para body inválido (tipo incorrecto)', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nombre: 'Juan', edad: 'treinta' });

    expect(res.status).toBe(400);
  });

  it('coerce query params y aplica defaults', async () => {
    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body.datos.pagina).toBe(1);
    expect(res.body.datos.limite).toBe(20);
  });

  it('coerce query params numéricos', async () => {
    const res = await request(app).get('/test?pagina=3&limite=50');

    expect(res.status).toBe(200);
    expect(res.body.datos.pagina).toBe(3);
    expect(res.body.datos.limite).toBe(50);
  });
});
