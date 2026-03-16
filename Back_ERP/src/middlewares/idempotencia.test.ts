/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { requerirIdempotencia, limpiarCacheIdempotenciaParaTests } from './idempotencia';

function crearApp() {
  const app = express();
  app.use(express.json());

  let contador = 0;

  app.post(
    '/ventas',
    requerirIdempotencia({ scope: 'ordenes:crear', ttlSegundos: 60, requerido: true }),
    async (req, res) => {
      if (req.body?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, req.body.delayMs));
      }
      contador += 1;
      res.status(201).json({ exito: true, contador, body: req.body });
    },
  );

  return { app };
}

describe('idempotencia middleware', () => {
  beforeEach(() => {
    limpiarCacheIdempotenciaParaTests();
  });

  it('rechaza si falta X-Idempotency-Key cuando es requerido', async () => {
    const { app } = crearApp();

    const res = await request(app)
      .post('/ventas')
      .send({ monto: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('reproduce misma respuesta para misma key y mismo payload', async () => {
    const { app } = crearApp();

    const primero = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-123')
      .send({ monto: 100 });

    const segundo = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-123')
      .send({ monto: 100 });

    expect(primero.status).toBe(201);
    expect(segundo.status).toBe(201);
    expect(segundo.headers['x-idempotency-replayed']).toBe('true');
    expect(segundo.body.contador).toBe(1);
    expect(segundo.body).toEqual(primero.body);
  });

  it('rechaza reuso de key con payload diferente', async () => {
    const { app } = crearApp();

    await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-abc')
      .send({ monto: 100 });

    const res = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-abc')
      .send({ monto: 200 });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_REUSED');
  });

});
